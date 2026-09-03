// Database AI Assistant service layer.
//
// This module is the single seam between the chat UI and "however the answer actually gets
// generated". Today it calls the same in-app AI providers as the rest of the app
// (generateWithAI -> Ollama direct / cloud proxy). Once the Spring + Calcite backend exposes its
// own database-aware endpoint (see docs/spring-backend-calcite), only DatabaseAssistantService's
// `ask()` implementation needs to change — callers (the page/component) keep the same
// request/response shape.
import type { AIModelConfig } from '../store';
import type { Locale } from '../i18n';
import { callOllamaEmbed, generateWithAI, resolveBudget, safeFetch, streamWithAI, type AIMessage, type AIBudgetReport, AIServiceError } from './aiService';
import { DATABASE_KNOWLEDGE_EMBEDDING_MODEL } from './aiProviders';
import { estimateTokens, trimMessagesForBudget } from './aiTokens';

const DATABASE_ASSISTANT_SYSTEM_PROMPT: Record<Locale, string> = {
  en: 'You are an expert database assistant embedded in SQL Visualizer. You can be asked about anything database-related: SQL across dialects (MySQL, PostgreSQL, SQL Server, Oracle), schema design, normalization, indexing, query performance/optimization, transactions, locking, replication, backups, migrations, NoSQL vs relational trade-offs, and security best practices. Answer clearly and practically, use short code blocks for SQL examples when helpful, and say plainly when something depends on the specific database engine or version.',
  vi: 'Bạn là trợ lý cơ sở dữ liệu chuyên nghiệp được tích hợp trong SQL Visualizer. Bạn có thể được hỏi bất cứ điều gì liên quan đến cơ sở dữ liệu: SQL trên nhiều dialect (MySQL, PostgreSQL, SQL Server, Oracle), thiết kế schema, chuẩn hóa dữ liệu, đánh chỉ mục, tối ưu hiệu năng truy vấn, transaction, khóa, replication, sao lưu, migration, so sánh NoSQL với quan hệ, và các thực hành bảo mật tốt nhất. Hãy trả lời bằng tiếng Việt một cách rõ ràng, thực tế, dùng khối mã ngắn cho ví dụ SQL khi cần, và nói rõ khi điều gì đó phụ thuộc vào loại/phiên bản cơ sở dữ liệu cụ thể.',
};

/** Appended to the system prompt only when retrieval actually found relevant excerpts. */
const DATABASE_KNOWLEDGE_ADDENDUM: Record<Locale, string> = {
  en: '\n\nSome official database manual excerpts (SQL Server, MySQL, PostgreSQL, and/or Oracle) relevant to the question are provided below as reference material. Prefer and cite this reference material when it applies; fall back to your general knowledge for anything it does not cover.',
  vi: '\n\nBên dưới là một số đoạn trích từ tài liệu chính thức của các hệ cơ sở dữ liệu (SQL Server, MySQL, PostgreSQL và/hoặc Oracle) liên quan đến câu hỏi, được cung cấp làm tài liệu tham khảo. Hãy ưu tiên và trích dẫn tài liệu này khi phù hợp; với những gì tài liệu không đề cập, hãy dùng kiến thức chung của bạn.',
};

/** Retrieval settings for the RAG step; keep the corpus's own embedding model fixed regardless of the user's chat provider. */
const RAG_TOP_N = 5;

/** Older turns get at most this share of the remaining prompt budget. */
const HISTORY_BUDGET_RATIO = 0.6;

/** Keeps follow-up suggestions grounded in the latest turn only, cheap enough to run after every answer. */
const FOLLOW_UP_SUGGESTIONS_PROMPT: Record<Locale, (question: string, answer: string) => string> = {
  en: (question, answer) => `Conversation so far:
Q: ${question}
A: ${answer}

Suggest exactly 4 diverse, short follow-up questions the user might naturally ask next. Cover different angles: a deeper dive into a detail just mentioned, a related database topic, a practical example, and a common pitfall or edge case. Each question must be under 12 words and phrased in English.

Reply with ONLY a JSON array of 4 strings — no prose, no markdown fence — e.g. ["...", "...", "...", "..."]`,
  vi: (question, answer) => `Cuộc trò chuyện cho đến nay:
Hỏi: ${question}
Đáp: ${answer}

Hãy gợi ý chính xác 4 câu hỏi tiếp theo ngắn gọn, đa dạng mà người dùng có thể tự nhiên muốn hỏi tiếp. Bao quát các góc độ khác nhau: đào sâu một chi tiết vừa đề cập, một chủ đề cơ sở dữ liệu liên quan, một ví dụ thực tế, và một lỗi/trường hợp đặc biệt thường gặp. Mỗi câu hỏi dưới 12 từ, bằng tiếng Việt.

Chỉ trả về DUY NHẤT một mảng JSON gồm 4 chuỗi — không thêm lời dẫn, không dùng khối markdown — ví dụ: ["...", "...", "...", "..."]`,
};

/** Pulls a JSON string array out of an answer that may be fenced or padded with prose. */
function extractJsonStringArray(text: string): string[] {
  const withoutFence = text.replace(/```(?:json)?/gi, '').trim();
  const start = withoutFence.indexOf('[');
  const end = withoutFence.lastIndexOf(']');
  if (start === -1 || end <= start) return [];
  try {
    const parsed = JSON.parse(withoutFence.slice(start, end + 1));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  } catch {
    return [];
  }
}

export interface DatabaseAssistantOptions {
  question: string;
  config: AIModelConfig;
  locale?: Locale;
  /** Prior turns of this conversation, oldest first. Trimmed to fit the context window. */
  history?: AIMessage[];
  signal?: AbortSignal;
}

export interface DatabaseKnowledgeSource {
  sourceFile: string;
  section?: string;
  pageAnchor?: string;
}

export interface DatabaseAssistantAnswer {
  answer: string;
  budget: AIBudgetReport;
  /** Official manual excerpts the answer was grounded in, if any were found relevant. Empty when the local RAG index/Ollama embedding model is unavailable. */
  sources: DatabaseKnowledgeSource[];
}

interface DatabaseKnowledgeContext {
  context: string;
  sources: DatabaseKnowledgeSource[];
}

interface PreparedDatabaseAssistantRequest {
  budget: AIBudgetReport;
  messages: AIMessage[];
  maxTokens: number;
  sources: DatabaseKnowledgeSource[];
}

/**
 * Best-effort RAG retrieval over the 4-database-manual corpus: embeds the question with the
 * fixed local Ollama model the corpus was built with (independent of the user's chosen chat
 * provider), then asks the server to find the closest excerpts. Never throws — a missing/unpulled
 * Ollama model, an unbuilt index, or any network failure just means the assistant answers from
 * general knowledge only, exactly like before this feature existed.
 */
async function fetchDatabaseKnowledgeContext(
  question: string,
  ollamaBaseUrl: string,
  signal?: AbortSignal
): Promise<DatabaseKnowledgeContext | null> {
  try {
    const embedding = await callOllamaEmbed(ollamaBaseUrl, DATABASE_KNOWLEDGE_EMBEDDING_MODEL, question, signal);

    const response = await safeFetch(
      '/api/ai/database-knowledge-context',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({ embedding, topN: RAG_TOP_N }),
      },
      'Unable to reach the app server to search the database knowledge base.'
    );
    if (!response.ok) return null;

    const data = await response.json().catch(() => null);
    if (!data || typeof data.context !== 'string') return null;
    return { context: data.context, sources: Array.isArray(data.sources) ? data.sources : [] };
  } catch {
    return null;
  }
}

/**
 * Thin, swappable wrapper around the active AI provider for the Database AI Assistant chat.
 * Kept as a class (rather than a bare function) so a future backend-backed implementation can
 * be dropped in behind the same `ask()` contract — e.g. constructed with a base URL/auth token
 * instead of an `AIModelConfig`, without touching any calling component.
 */
export class DatabaseAssistantService {
  constructor(
    private readonly config: AIModelConfig,
    private readonly locale: Locale = 'en'
  ) {}

  private async prepareRequest({
    question,
    history = [],
    signal,
  }: {
    question: string;
    history?: AIMessage[];
    signal?: AbortSignal;
  }): Promise<PreparedDatabaseAssistantRequest> {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) throw new AIServiceError('There is no question to ask.');

    const knowledge = await fetchDatabaseKnowledgeContext(
      trimmedQuestion,
      this.config.baseUrls?.ollama ?? '',
      signal
    );
    const hasKnowledge = Boolean(knowledge?.context);

    const budget = resolveBudget(this.config);
    const systemPrompt =
      (DATABASE_ASSISTANT_SYSTEM_PROMPT[this.locale] ?? DATABASE_ASSISTANT_SYSTEM_PROMPT.en) +
      (hasKnowledge ? DATABASE_KNOWLEDGE_ADDENDUM[this.locale] ?? DATABASE_KNOWLEDGE_ADDENDUM.en : '');
    const available = Math.max(128, budget.promptTokens - estimateTokens(systemPrompt));
    const historyBudget = Math.floor(available * HISTORY_BUDGET_RATIO);

    const questionForModel = hasKnowledge
      ? `Reference material:\n${knowledge!.context}\n\nQuestion: ${trimmedQuestion}`
      : trimmedQuestion;

    const trimmed = trimMessagesForBudget(
      [...history, { role: 'user' as const, content: questionForModel }],
      historyBudget
    );

    const messages: AIMessage[] = [{ role: 'system', content: systemPrompt }, ...trimmed.messages];

    return {
      sources: knowledge?.sources ?? [],
      maxTokens: budget.maxOutputTokens,
      budget: {
        contextTokens: budget.contextTokens,
        promptBudgetTokens: budget.promptTokens,
        estimatedPromptTokens: estimateTokens(systemPrompt) + trimmed.estimatedTokens,
        sqlTruncated: false,
        omittedSqlLines: 0,
        droppedMessages: trimmed.droppedMessages,
        contextBriefDropped: false,
      },
      messages,
    };
  }

  async ask({
    question,
    history = [],
    signal,
  }: {
    question: string;
    history?: AIMessage[];
    signal?: AbortSignal;
  }): Promise<DatabaseAssistantAnswer> {
    const prepared = await this.prepareRequest({ question, history, signal });
    const answer = (
      await generateWithAI(this.config, {
        messages: prepared.messages,
        maxTokens: prepared.maxTokens,
        signal,
      })
    ).trim();

    if (!answer) throw new AIServiceError('The model returned an empty answer. Try asking again.');
    return { answer, sources: prepared.sources, budget: prepared.budget };
  }

  async stream(
    { question, history = [], signal }: { question: string; history?: AIMessage[]; signal?: AbortSignal },
    onDelta: (text: string) => void
  ): Promise<DatabaseAssistantAnswer> {
    const prepared = await this.prepareRequest({ question, history, signal });
    const answer = (
      await streamWithAI(
        this.config,
        { messages: prepared.messages, maxTokens: prepared.maxTokens, signal },
        onDelta
      )
    ).trim();

    if (!answer) throw new AIServiceError('The model returned an empty answer. Try asking again.');
    return { answer, sources: prepared.sources, budget: prepared.budget };
  }
}

/** Convenience wrapper so simple call sites don't need to construct the class themselves. */
export async function askDatabaseAssistant({
  question,
  config,
  locale = 'en',
  history,
  signal,
}: DatabaseAssistantOptions): Promise<DatabaseAssistantAnswer> {
  return new DatabaseAssistantService(config, locale).ask({ question, history, signal });
}

/** Streaming counterpart of {@link askDatabaseAssistant}, used by the live chat UI. */
export async function streamDatabaseAssistant(
  { question, config, locale = 'en', history, signal }: DatabaseAssistantOptions,
  onDelta: (text: string) => void
): Promise<DatabaseAssistantAnswer> {
  return new DatabaseAssistantService(config, locale).stream({ question, history, signal }, onDelta);
}

export interface FollowUpSuggestionsOptions {
  /** The user's question that produced `answer`. */
  question: string;
  /** The assistant's latest answer, used to keep suggestions on-topic. */
  answer: string;
  config: AIModelConfig;
  locale?: Locale;
  signal?: AbortSignal;
}

/**
 * Generates fresh, diverse follow-up question chips after each answer, so the conversation keeps
 * offering new directions instead of repeating the same static starter suggestions. Best-effort:
 * this is a UI nicety, so any failure (bad JSON, network, provider error) yields an empty list
 * instead of surfacing an error to the user.
 */
export async function suggestFollowUpQuestions({
  question,
  answer,
  config,
  locale = 'en',
  signal,
}: FollowUpSuggestionsOptions): Promise<string[]> {
  if (!question.trim() || !answer.trim()) return [];

  try {
    const buildPrompt = FOLLOW_UP_SUGGESTIONS_PROMPT[locale] ?? FOLLOW_UP_SUGGESTIONS_PROMPT.en;
    const raw = await generateWithAI(config, {
      prompt: buildPrompt(question, answer),
      jsonMode: true,
      maxTokens: 220,
      signal,
    });
    return extractJsonStringArray(raw).slice(0, 4);
  } catch {
    return [];
  }
}
