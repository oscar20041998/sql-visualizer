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
import type { SqlDialect } from '../sql/sqlAnalyzer';
import { checkSelectAll, checkOtherLintingRules, type LintingIssue } from '../sql/complexityScorer';
import {
  callOllamaEmbed,
  generateWithAI,
  resolveBudget,
  safeFetch,
  streamWithAI,
  type AIMessage,
  type AIBudgetReport,
  AIServiceError,
} from './aiService';
import { DATABASE_KNOWLEDGE_EMBEDDING_MODEL } from './aiProviders';
import { estimateTokens, trimMessagesForBudget } from './aiTokens';
import { localizedPromptId, renderPrompt } from './prompts/render';
import {
  DATABASE_ASSISTANT_PROMPTS,
  databaseAssistantStaticParams,
  followUpSuggestionsParams,
} from './prompts/templates/databaseAssistant';

/** Retrieval settings for the RAG step; keep the corpus's own embedding model fixed regardless of the user's chat provider. */
const RAG_TOP_N = 5;

/** Older turns get at most this share of the remaining prompt budget. */
const HISTORY_BUDGET_RATIO = 0.6;

/** Pulls a JSON string array out of an answer that may be fenced or padded with prose. */
function extractJsonStringArray(text: string): string[] {
  const withoutFence = text.replace(/```(?:json)?/gi, '').trim();
  const start = withoutFence.indexOf('[');
  const end = withoutFence.lastIndexOf(']');
  if (start === -1 || end <= start) return [];
  try {
    const parsed = JSON.parse(withoutFence.slice(start, end + 1));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0
    );
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

export interface DatabaseKnowledgeContext {
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
 *
 * `dialect`, when given, asks the server to prefer excerpts from that vendor's manual (still
 * falling back to the overall best matches if that vendor has few close ones for this question).
 */
export async function fetchDatabaseKnowledgeContext(
  question: string,
  ollamaBaseUrl: string,
  signal?: AbortSignal,
  dialect?: SqlDialect
): Promise<DatabaseKnowledgeContext | null> {
  try {
    const embedding = await callOllamaEmbed(
      ollamaBaseUrl,
      DATABASE_KNOWLEDGE_EMBEDDING_MODEL,
      question,
      signal
    );

    const response = await safeFetch(
      '/api/ai/database-knowledge-context',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({ embedding, topN: RAG_TOP_N, dialect }),
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

const OPTIMIZE_KNOWLEDGE_HEADER: Record<Locale, string> = {
  en: 'Relevant official documentation excerpts for this dialect — ground index, rewrite, and configuration suggestions in these when they apply:',
  vi: 'Các đoạn trích tài liệu chính thức liên quan đến dialect này — hãy dựa vào đây khi đề xuất chỉ mục, viết lại truy vấn hoặc cấu hình, nếu phù hợp:',
};

/**
 * Builds a labeled knowledge-brief section for the Optimize flow: embeds a short description of
 * the query's dialect and its flagged linting issues, retrieves the closest official-manual
 * excerpts (biased toward the active dialect), and formats them as a prompt-ready block. Returns
 * `null` when retrieval finds nothing usable (missing Ollama/model/index, or no relevant match) —
 * callers should simply omit the section rather than treat this as an error.
 */
export async function buildOptimizeKnowledgeBrief({
  sql,
  dialect,
  lintIssues,
  locale = 'en',
  ollamaBaseUrl,
  signal,
}: {
  sql: string;
  dialect: SqlDialect;
  lintIssues: LintingIssue[];
  locale?: Locale;
  ollamaBaseUrl: string;
  signal?: AbortSignal;
}): Promise<{ brief: string; sources: DatabaseKnowledgeSource[] } | null> {
  const issueSummary = lintIssues.map((issue) => `${issue.rule}: ${issue.message}`).join('; ');
  const question = [
    `${dialect} SQL query performance optimization.`,
    issueSummary ? `Issues to fix: ${issueSummary}.` : '',
    `Query: ${sql.slice(0, 800)}`,
  ]
    .filter(Boolean)
    .join(' ');

  const knowledge = await fetchDatabaseKnowledgeContext(question, ollamaBaseUrl, signal, dialect);
  if (!knowledge?.context) return null;

  const header = OPTIMIZE_KNOWLEDGE_HEADER[locale] ?? OPTIMIZE_KNOWLEDGE_HEADER.en;
  return { brief: `${header}\n${knowledge.context}`, sources: knowledge.sources };
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
      renderPrompt(
        localizedPromptId(DATABASE_ASSISTANT_PROMPTS.system, this.locale),
        databaseAssistantStaticParams()
      )[0].content +
      (hasKnowledge
        ? renderPrompt(
            localizedPromptId(DATABASE_ASSISTANT_PROMPTS.knowledgeAddendum, this.locale),
            databaseAssistantStaticParams()
          )[0].content
        : '');
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
    {
      question,
      history = [],
      signal,
    }: { question: string; history?: AIMessage[]; signal?: AbortSignal },
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
  return new DatabaseAssistantService(config, locale).stream(
    { question, history, signal },
    onDelta
  );
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
    const prompt = renderPrompt(
      localizedPromptId(DATABASE_ASSISTANT_PROMPTS.followUpSuggestions, locale),
      followUpSuggestionsParams(question, answer)
    )[0].content;
    const raw = await generateWithAI(config, {
      prompt,
      jsonMode: true,
      maxTokens: 220,
      signal,
    });
    return extractJsonStringArray(raw).slice(0, 4);
  } catch {
    return [];
  }
}
