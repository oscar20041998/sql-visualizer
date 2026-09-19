// Adapter layer routing AI generation requests to the active provider (Ollama or a cloud API).
import type { AIModelConfig } from '../store';
import type { Locale } from '../i18n';
import type { AnalysisResult } from '../sql/sqlAnalyzer';
import {
  DEFAULT_CONTEXT_TOKENS,
  DEFAULT_MAX_OUTPUT_TOKENS,
  DEFAULT_EMBEDDING_MODELS,
  type AIProvider,
  type CloudProvider,
} from './aiProviders';
import {
  buildContextBudget,
  estimateTokens,
  trimMessagesForBudget,
  truncateSqlForBudget,
} from './aiTokens';
import { fitContextBrief } from './aiSqlContext';

export type { CloudProvider };

const EXPLAIN_SQL_PROMPT: Record<Locale, (sql: string) => string> = {
  en: (sql) => `Explain the following SQL query in plain language:\n\n${sql}`,
  vi: (sql) => `Hãy giải thích truy vấn SQL sau đây bằng ngôn ngữ đơn giản, dễ hiểu:\n\n${sql}`,
};

/** Asks for a JSON payload so the UI can render a business-friendly query explanation in sections. */
const EXPLAIN_SQL_STRUCTURED_PROMPT: Record<Locale, (sql: string) => string> = {
  en: (sql) => `You translate SQL into plain business language for a reader who does not write SQL.

SQL query:
\`\`\`sql
${sql}
\`\`\`

Reply with ONLY a JSON object — no prose, no markdown fence — using exactly this shape:
{
  "objective": "one or two sentences describing the core goal of the query",
  "filters": ["every filter, timeframe, status, region or other constraint, one plain-language sentence each"],
  "output": "describe the columns and rows returned, plus sorting and row limits, in plain language",
  "tables": ["names of the tables or CTEs the query reads, with their apparent business role when it is supported by the query"],
  "field_meanings": ["field or output label: its likely business meaning and how the query uses it, in plain language"]
}

Rules:
- Avoid SQL keywords in "objective" and "output"; describe the meaning instead.
- Expand technical expressions: DATE_SUB(NOW(), INTERVAL 30 DAY) becomes "the last 30 days", active = 1 becomes "only active accounts".
- Explain every selected field, derived value, aggregate, grouping key, join key, and field used in a condition. Combine repeated uses of the same field into one clear item.
- Explain every condition, including JOIN, WHERE, HAVING, CASE, and null-handling conditions: name the field, translate operators and literal values, and state how the condition affects which data is included.
- Do not invent business definitions that cannot be supported by the SQL or verified facts. State that a name or code's exact meaning is unknown when necessary.
- Use an empty array only when the query has no filters, no tables, or no fields for that respective array.`,
  vi: (sql) => `Bạn diễn giải SQL thành ngôn ngữ nghiệp vụ dễ hiểu cho người không viết SQL. Toàn bộ nội dung trả về phải bằng tiếng Việt.

Truy vấn SQL:
\`\`\`sql
${sql}
\`\`\`

Chỉ trả về DUY NHẤT một đối tượng JSON — không thêm lời dẫn, không dùng khối markdown — theo đúng cấu trúc sau:
{
  "objective": "một đến hai câu mô tả mục tiêu chính của truy vấn",
  "filters": ["từng điều kiện lọc, khoảng thời gian, trạng thái, khu vực hoặc ràng buộc khác, mỗi phần tử là một câu dễ hiểu"],
  "output": "mô tả các cột và dòng dữ liệu trả về, kèm cách sắp xếp và giới hạn số dòng, bằng ngôn ngữ đơn giản",
  "tables": ["tên các bảng hoặc CTE mà truy vấn đọc dữ liệu, kèm vai trò nghiệp vụ có thể suy ra từ truy vấn"],
  "field_meanings": ["tên field hoặc nhãn đầu ra: ý nghĩa nghiệp vụ có thể suy ra và cách truy vấn sử dụng field đó, bằng ngôn ngữ dễ hiểu"]
}

Quy tắc:
- Tránh dùng từ khóa SQL trong "objective" và "output"; hãy diễn giải ý nghĩa.
- Diễn giải biểu thức kỹ thuật: DATE_SUB(NOW(), INTERVAL 30 DAY) thành "30 ngày gần nhất", active = 1 thành "chỉ các tài khoản đang hoạt động".
- Giải thích mọi field được chọn, giá trị tính toán, phép tổng hợp, field dùng để nhóm, khóa nối và field dùng trong điều kiện. Gộp các lần dùng lặp lại của cùng một field thành một mục rõ ràng.
- Giải thích mọi điều kiện, gồm điều kiện JOIN, WHERE, HAVING, CASE và xử lý NULL: nêu field, diễn giải toán tử và giá trị cố định, rồi cho biết điều kiện làm dữ liệu nào được chọn hoặc loại ra.
- Không tự đặt nghĩa nghiệp vụ nếu SQL hoặc dữ kiện đã xác thực không chứng minh được. Khi cần, nói rõ không xác định được ý nghĩa chính xác của tên hoặc mã.
- Chỉ dùng mảng rỗng khi truy vấn không có điều kiện, không đọc bảng hoặc không có field tương ứng.`,
};

export class AIServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export type AIRole = 'system' | 'user' | 'assistant';

export interface AIMessage {
  role: AIRole;
  content: string;
}

export interface AIGenerateRequest {
  /** Single-turn prompt. Ignored when `messages` is provided. */
  prompt?: string;
  /** Full conversation, oldest first. Takes precedence over `prompt` for multi-turn calls. */
  messages?: AIMessage[];
  systemPrompt?: string;
  /** Ask the provider to constrain its answer to a single JSON object. */
  jsonMode?: boolean;
  maxTokens?: number;
  signal?: AbortSignal;
}

/** Natural-language breakdown of a SQL query, rendered section by section by the UI. */
export interface SqlExplanation {
  objective: string;
  filters: string[];
  output: string;
  tables: string[];
  /** Business-friendly meanings for fields, expressions, and their use in the query. */
  fieldMeanings: string[];
  /** Untouched model answer, kept so the UI can always show something. */
  raw: string;
  /** False when the model ignored the JSON contract and `raw` is the only usable content. */
  structured: boolean;
  /** What had to be dropped to fit the model's context window. */
  budget: AIBudgetReport;
}

/** Tells the UI exactly what was sent, so silent truncation becomes visible. */
export interface AIBudgetReport {
  contextTokens: number;
  promptBudgetTokens: number;
  estimatedPromptTokens: number;
  sqlTruncated: boolean;
  omittedSqlLines: number;
  /** Older conversation turns dropped to make room. */
  droppedMessages: number;
  /** True when the local parser brief was too large to include. */
  contextBriefDropped: boolean;
}

function resolveSystemPrompt(config: AIModelConfig, request: AIGenerateRequest): string | undefined {
  return request.systemPrompt?.trim() || config.systemPrompt?.trim() || undefined;
}

/**
 * Normalises a request into an OpenAI-style message array. `messages` wins over `prompt`;
 * the system prompt is prepended unless the caller already supplied one.
 */
function resolveMessages(config: AIModelConfig, request: AIGenerateRequest): AIMessage[] {
  const systemPrompt = resolveSystemPrompt(config, request);
  const body = request.messages?.length
    ? request.messages.filter((message) => message.role !== 'system')
    : [{ role: 'user' as const, content: request.prompt ?? '' }];
  const explicitSystem = request.messages?.filter((message) => message.role === 'system') ?? [];

  if (explicitSystem.length) return [...explicitSystem, ...body];
  return systemPrompt ? [{ role: 'system', content: systemPrompt }, ...body] : body;
}

/** Wraps fetch so network failures become AIServiceError while aborts stay recognizable to callers. */
export async function safeFetch(url: string, init: RequestInit, unreachableMessage: string): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error;
    throw new AIServiceError(unreachableMessage);
  }
}

/**
 * Path appended to a provider's base URL. Bases are stored as the server root, so both
 * `https://api.openai.com` and a gateway like `https://gw.corp/openai` work unchanged; a
 * trailing version segment the user pasted is stripped first so `.../v1` does not become
 * `.../v1/v1/chat/completions`.
 */
const PROVIDER_PATHS: Record<AIProvider, string> = {
  ollama: '/v1/chat/completions',
  openai: '/v1/chat/completions',
  anthropic: '/v1/messages',
  gemini: '/v1beta',
};

export function normalizeBaseUrl(raw: string): string {
  return (raw ?? '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/(v1beta|v1)$/i, '');
}

/** Builds the full endpoint for a provider from its configured base URL. */
export function resolveProviderUrl(provider: AIProvider, baseUrl: string): string {
  const root = normalizeBaseUrl(baseUrl);
  if (!root) throw new AIServiceError(`Base URL is not configured for ${provider}.`);
  return `${root}${PROVIDER_PATHS[provider]}`;
}

/** Provider-agnostic payload, already resolved from config + request. */
export interface ProviderCall {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  signal?: AbortSignal;
}

function toProviderCall(config: AIModelConfig, request: AIGenerateRequest): ProviderCall {
  return {
    messages: resolveMessages(config, request),
    temperature: config.temperature,
    maxTokens: request.maxTokens,
    jsonMode: request.jsonMode,
    signal: request.signal,
  };
}

/**
 * Ollama through its OpenAI-compatible endpoint (`/v1/chat/completions`). Called straight from
 * the browser: it is a local server needing no credentials, and going direct keeps it working
 * when the model runs on the user's machine rather than the app server.
 */
async function callOllama(baseUrlRaw: string, model: string, call: ProviderCall): Promise<string> {
  if (!normalizeBaseUrl(baseUrlRaw)) throw new AIServiceError('Ollama base URL is not configured.');
  if (!model?.trim()) throw new AIServiceError('Ollama local model name is not configured.');
  const url = resolveProviderUrl('ollama', baseUrlRaw);

  const response = await safeFetch(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: call.signal,
      body: JSON.stringify({
        model,
        temperature: call.temperature,
        stream: false,
        ...(call.maxTokens ? { max_tokens: call.maxTokens } : {}),
        ...(call.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        messages: call.messages,
      }),
    },
    `Unable to reach Ollama server at ${url}. Ensure Ollama is running (ollama server) and reachable from the browser.`
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new AIServiceError(`Ollama request failed (${response.status}): ${detail || response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

/**
 * Parses an OpenAI-compatible SSE byte stream (`data: {...}` frames, terminated by
 * `data: [DONE]`), invoking `onDelta` for every content fragment as it arrives and returning
 * the full concatenated text once the stream ends. Shared by the direct Ollama call and the
 * cloud proxy, since the server normalises every provider's stream to this same shape.
 */
async function consumeOpenAiDeltaStream(response: Response, onDelta: (text: string) => void): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';

  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const chunk = JSON.parse(data);
        const delta: string = chunk.choices?.[0]?.delta?.content ?? '';
        if (delta) {
          full += delta;
          onDelta(delta);
        }
      } catch {
        /* a partial/malformed frame; the next read usually completes it */
      }
    }
  }

  return full;
}

/** Streaming counterpart of {@link callOllama}: same endpoint, `stream: true`. */
async function callOllamaStream(
  baseUrlRaw: string,
  model: string,
  call: ProviderCall,
  onDelta: (text: string) => void
): Promise<string> {
  if (!normalizeBaseUrl(baseUrlRaw)) throw new AIServiceError('Ollama base URL is not configured.');
  if (!model?.trim()) throw new AIServiceError('Ollama local model name is not configured.');
  const url = resolveProviderUrl('ollama', baseUrlRaw);

  const response = await safeFetch(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: call.signal,
      body: JSON.stringify({
        model,
        temperature: call.temperature,
        stream: true,
        ...(call.maxTokens ? { max_tokens: call.maxTokens } : {}),
        ...(call.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        messages: call.messages,
      }),
    },
    `Unable to reach Ollama server at ${url}. Ensure Ollama is running (ollama server) and reachable from the browser.`
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new AIServiceError(`Ollama request failed (${response.status}): ${detail || response.statusText}`);
  }

  return consumeOpenAiDeltaStream(response, onDelta);
}

async function callOpenAI(
  apiKey: string,
  modelId: string,
  baseUrl: string,
  call: ProviderCall
): Promise<string> {
  const response = await safeFetch(
    resolveProviderUrl('openai', baseUrl),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: call.signal,
      body: JSON.stringify({
        model: modelId,
        temperature: call.temperature,
        ...(call.maxTokens ? { max_tokens: call.maxTokens } : {}),
        ...(call.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        messages: call.messages,
      }),
    },
    'Unable to reach OpenAI API. Check the server network connection.'
  );

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new AIServiceError(
      `OpenAI request failed (${response.status}): ${detail?.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

/** Embeddings are OpenAI-only here, so this has no per-provider dispatch — just the one endpoint. */
async function callOpenAIEmbeddings(
  apiKey: string,
  baseUrl: string,
  modelId: string,
  input: string[],
  signal?: AbortSignal
): Promise<number[][]> {
  const response = await safeFetch(
    `${normalizeBaseUrl(baseUrl)}/v1/embeddings`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal,
      body: JSON.stringify({ model: modelId, input }),
    },
    'Unable to reach OpenAI API. Check the server network connection.'
  );

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new AIServiceError(
      `OpenAI embeddings request failed (${response.status}): ${detail?.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return (data.data ?? []).map((entry: { embedding: number[] }) => entry.embedding);
}

async function callAnthropic(
  apiKey: string,
  modelId: string,
  baseUrl: string,
  call: ProviderCall
): Promise<string> {
  // Anthropic takes the system prompt as a top-level field, not a message.
  const system = call.messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n');

  const response = await safeFetch(
    resolveProviderUrl('anthropic', baseUrl),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      signal: call.signal,
      body: JSON.stringify({
        model: modelId,
        max_tokens: call.maxTokens ?? 1024,
        temperature: call.temperature,
        ...(system ? { system } : {}),
        messages: call.messages.filter((message) => message.role !== 'system'),
      }),
    },
    'Unable to reach Anthropic API. Check the server network connection.'
  );

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new AIServiceError(
      `Anthropic request failed (${response.status}): ${detail?.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}

function buildGeminiV1Prompt(messages: AIMessage[]): string {
  return messages
    .map((message) => {
      if (message.role === 'system') return message.content;
      const prefix = message.role === 'assistant' ? 'Assistant:' : 'User:';
      return `${prefix} ${message.content}`;
    })
    .join('\n\n');
}

async function callGemini(
  apiKey: string,
  modelId: string,
  baseUrl: string,
  call: ProviderCall
): Promise<string> {
  const systemPrompt = call.messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n');

  const useGeminiV1 = modelId.startsWith('gemini-');

  if (useGeminiV1) {
    const promptText = buildGeminiV1Prompt(call.messages);
    const response = await safeFetch(
      `${resolveProviderUrl('gemini', baseUrl)}/v1/models/${encodeURIComponent(
        modelId
      )}:generateText?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: call.signal,
        body: JSON.stringify({
          prompt: { text: promptText },
          temperature: call.temperature,
          ...(call.maxTokens ? { maxOutputTokens: call.maxTokens } : {}),
        }),
      },
      'Unable to reach Google Gemini API. Check the server network connection.'
    );

    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      throw new AIServiceError(
        `Gemini request failed (${response.status}): ${detail?.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return (
      data.candidates?.[0]?.output ?? data.output?.[0]?.content?.[0]?.text ?? ''
    ).toString();
  }

  const response = await safeFetch(
    `${resolveProviderUrl('gemini', baseUrl)}/models/${encodeURIComponent(
      modelId
    )}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: call.signal,
      body: JSON.stringify({
        // Gemini calls the assistant role "model" and keeps the system prompt separate.
        contents: call.messages
          .filter((message) => message.role !== 'system')
          .map((message) => ({
            role: message.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: message.content }],
          })),
        ...(systemPrompt ? { systemInstruction: { parts: [{ text: systemPrompt }] } } : {}),
        generationConfig: {
          temperature: call.temperature,
          ...(call.maxTokens ? { maxOutputTokens: call.maxTokens } : {}),
          ...(call.jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    },
    'Unable to reach Google Gemini API. Check the server network connection.'
  );

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new AIServiceError(
      `Gemini request failed (${response.status}): ${detail?.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return (data.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('');
}

/**
 * Direct call to a local Ollama server's embeddings endpoint (no credential needed). Exported
 * (not just used via {@link embedWithAI}) so server-only routes can embed with a specific model
 * that isn't the user's configured chat/embedding provider — e.g. the Database AI Assistant's
 * RAG index, which was built with a fixed local model regardless of AIModelConfig.
 */
export async function callOllamaEmbed(baseUrlRaw: string, model: string, text: string, signal?: AbortSignal): Promise<number[]> {
  if (!normalizeBaseUrl(baseUrlRaw)) throw new AIServiceError('Ollama base URL is not configured.');
  const url = `${normalizeBaseUrl(baseUrlRaw)}/api/embeddings`;

  const response = await safeFetch(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({ model, prompt: text }),
    },
    `Unable to reach Ollama server at ${url}. Ensure Ollama is running (ollama server) and that ${model} is pulled.`
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new AIServiceError(
      `Ollama embeddings request failed (${response.status}): ${detail || response.statusText}. ` +
        `Pull the model first with "ollama pull ${model}".`
    );
  }

  const data = await response.json();
  const embedding = data.embedding;
  if (!Array.isArray(embedding)) throw new AIServiceError('Ollama returned no embedding vector.');
  return embedding;
}

async function callOpenAIEmbed(
  apiKey: string,
  modelId: string,
  baseUrl: string,
  text: string,
  signal?: AbortSignal
): Promise<number[]> {
  const response = await safeFetch(
    `${normalizeBaseUrl(baseUrl)}/v1/embeddings`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal,
      body: JSON.stringify({ model: modelId, input: text }),
    },
    'Unable to reach OpenAI API. Check the server network connection.'
  );

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new AIServiceError(
      `OpenAI embeddings request failed (${response.status}): ${detail?.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  const embedding = data.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) throw new AIServiceError('OpenAI returned no embedding vector.');
  return embedding;
}

async function callGeminiEmbed(
  apiKey: string,
  modelId: string,
  baseUrl: string,
  text: string,
  signal?: AbortSignal
): Promise<number[]> {
  const response = await safeFetch(
    `${normalizeBaseUrl(baseUrl)}/v1beta/models/${encodeURIComponent(modelId)}:embedContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({ content: { parts: [{ text }] } }),
    },
    'Unable to reach Google Gemini API. Check the server network connection.'
  );

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new AIServiceError(
      `Gemini embeddings request failed (${response.status}): ${detail?.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  const embedding = data.embedding?.values;
  if (!Array.isArray(embedding)) throw new AIServiceError('Gemini returned no embedding vector.');
  return embedding;
}

/**
 * Server-side entry point used by /api/ai/embed. The API key is supplied by the route from the
 * server environment, mirroring {@link generateWithCloudKey}. Anthropic has no embeddings API.
 */
export async function embedWithCloudKey(
  provider: CloudProvider,
  apiKey: string,
  modelId: string,
  baseUrl: string,
  text: string,
  signal?: AbortSignal
): Promise<number[]> {
  if (!apiKey?.trim()) {
    throw new AIServiceError(
      `No API key configured on the server for ${provider}. Set it in .env and restart the dev server.`
    );
  }
  if (!modelId?.trim()) throw new AIServiceError(`${provider} embedding model is not configured.`);

  switch (provider) {
    case 'openai':
      return callOpenAIEmbed(apiKey, modelId, baseUrl, text, signal);
    case 'gemini':
      return callGeminiEmbed(apiKey, modelId, baseUrl, text, signal);
    case 'anthropic':
      throw new AIServiceError('Anthropic has no embeddings API. Choose Ollama, OpenAI, or Gemini for this feature.');
    default:
      throw new AIServiceError(`Unsupported AI provider: ${provider}`);
  }
}

/** Route through which the browser reaches cloud embedding providers without holding their keys. */
export const AI_EMBED_PROXY_ENDPOINT = '/api/ai/embed';

/**
 * Turns text into an embedding vector using the provider configured in AIModelConfig, routing
 * exactly like {@link generateWithAI}: Ollama is called directly (local, no key), cloud
 * providers go through the server proxy so their key never reaches the browser.
 */
export async function embedWithAI(config: AIModelConfig, text: string, signal?: AbortSignal): Promise<number[]> {
  if (config.provider === 'ollama') {
    return callOllamaEmbed(config.baseUrls?.ollama ?? '', DEFAULT_EMBEDDING_MODELS.ollama, text, signal);
  }
  if (config.provider === 'anthropic') {
    throw new AIServiceError('Anthropic has no embeddings API. Switch to Ollama, OpenAI, or Gemini in Settings to use semantic search.');
  }

  const modelId = DEFAULT_EMBEDDING_MODELS[config.provider];
  const response = await safeFetch(
    AI_EMBED_PROXY_ENDPOINT,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        provider: config.provider,
        modelId,
        baseUrl: config.baseUrls?.[config.provider] ?? '',
        text,
      }),
    },
    'Unable to reach the app server to run the embedding request.'
  );

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new AIServiceError(data?.error || `Embedding request failed (${response.status}).`);
  }
  const embedding = data?.embedding;
  if (!Array.isArray(embedding)) throw new AIServiceError('The server returned no embedding vector.');
  return embedding;
}

/**
 * Reads a `text/event-stream` body and invokes `onFrame(event, data)` for each frame (the
 * `data:` lines of one block, joined; `event` defaults to `message` when the provider omits it).
 * Shared by the Anthropic and Gemini stream transforms, whose wire formats both use this shape.
 */
async function pumpSseFrames(
  upstream: ReadableStream<Uint8Array>,
  onFrame: (event: string, data: string) => void
): Promise<void> {
  const reader = upstream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let separatorIndex: number;
    while ((separatorIndex = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      let event = 'message';
      const dataLines: string[] = [];
      for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      if (dataLines.length) onFrame(event, dataLines.join('\n'));
    }
  }
}

const SSE_ENCODER = new TextEncoder();
/** A stream frame in the OpenAI-delta shape every client-side consumer expects. */
function encodeDeltaChunk(text: string): Uint8Array {
  return SSE_ENCODER.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
}
const SSE_DONE_CHUNK = SSE_ENCODER.encode('data: [DONE]\n\n');
/** An already-closed stream, used when a provider claims success but sends no body. */
function emptyByteStream(): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.close();
    },
  });
}

/** Streaming counterpart of {@link callOpenAI}. OpenAI's own SSE frames already match the
 * normalised shape, so the upstream body is passed straight through with no transform. */
async function callOpenAIStream(
  apiKey: string,
  modelId: string,
  baseUrl: string,
  call: ProviderCall
): Promise<ReadableStream<Uint8Array>> {
  const response = await safeFetch(
    resolveProviderUrl('openai', baseUrl),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: call.signal,
      body: JSON.stringify({
        model: modelId,
        temperature: call.temperature,
        stream: true,
        ...(call.maxTokens ? { max_tokens: call.maxTokens } : {}),
        ...(call.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        messages: call.messages,
      }),
    },
    'Unable to reach OpenAI API. Check the server network connection.'
  );

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new AIServiceError(
      `OpenAI request failed (${response.status}): ${detail?.error?.message || response.statusText}`
    );
  }

  return response.body ?? emptyByteStream();
}

/** Streaming counterpart of {@link callAnthropic}: re-emits `content_block_delta` events as
 * OpenAI-delta chunks so the client can use one parser for every provider. */
async function callAnthropicStream(
  apiKey: string,
  modelId: string,
  baseUrl: string,
  call: ProviderCall
): Promise<ReadableStream<Uint8Array>> {
  const system = call.messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n');

  const response = await safeFetch(
    resolveProviderUrl('anthropic', baseUrl),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      signal: call.signal,
      body: JSON.stringify({
        model: modelId,
        max_tokens: call.maxTokens ?? 1024,
        temperature: call.temperature,
        stream: true,
        ...(system ? { system } : {}),
        messages: call.messages.filter((message) => message.role !== 'system'),
      }),
    },
    'Unable to reach Anthropic API. Check the server network connection.'
  );

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new AIServiceError(
      `Anthropic request failed (${response.status}): ${detail?.error?.message || response.statusText}`
    );
  }
  if (!response.body) return emptyByteStream();

  const upstream = response.body;
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await pumpSseFrames(upstream, (event, data) => {
          if (event !== 'content_block_delta') return;
          try {
            const parsed = JSON.parse(data);
            const text = parsed?.delta?.text;
            if (typeof text === 'string' && text) controller.enqueue(encodeDeltaChunk(text));
          } catch {
            /* a malformed frame; skip it and keep reading */
          }
        });
      } catch (error) {
        controller.error(error);
        return;
      }
      controller.enqueue(SSE_DONE_CHUNK);
      controller.close();
    },
  });
}

/** Streaming counterpart of {@link callGemini}, using `streamGenerateContent`. Re-wraps each
 * frame's text into an OpenAI-delta chunk, same as the Anthropic transform above. */
async function callGeminiStream(
  apiKey: string,
  modelId: string,
  baseUrl: string,
  call: ProviderCall
): Promise<ReadableStream<Uint8Array>> {
  const systemPrompt = call.messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n');

  const response = await safeFetch(
    `${resolveProviderUrl('gemini', baseUrl)}/models/${encodeURIComponent(
      modelId
    )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: call.signal,
      body: JSON.stringify({
        contents: call.messages
          .filter((message) => message.role !== 'system')
          .map((message) => ({
            role: message.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: message.content }],
          })),
        ...(systemPrompt ? { systemInstruction: { parts: [{ text: systemPrompt }] } } : {}),
        generationConfig: {
          temperature: call.temperature,
          ...(call.maxTokens ? { maxOutputTokens: call.maxTokens } : {}),
          ...(call.jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    },
    'Unable to reach Google Gemini API. Check the server network connection.'
  );

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new AIServiceError(
      `Gemini request failed (${response.status}): ${detail?.error?.message || response.statusText}`
    );
  }
  if (!response.body) return emptyByteStream();

  const upstream = response.body;
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await pumpSseFrames(upstream, (_event, data) => {
          try {
            const parsed = JSON.parse(data);
            const text = (parsed?.candidates?.[0]?.content?.parts ?? [])
              .map((p: { text?: string }) => p.text ?? '')
              .join('');
            if (text) controller.enqueue(encodeDeltaChunk(text));
          } catch {
            /* a malformed frame; skip it and keep reading */
          }
        });
      } catch (error) {
        controller.error(error);
        return;
      }
      controller.enqueue(SSE_DONE_CHUNK);
      controller.close();
    },
  });
}

/**
 * Server-side entry point used by /api/ai/generate. The API key is supplied by the route from
 * the server environment, so it never reaches the client bundle or localStorage.
 */
export async function generateWithCloudKey(
  provider: CloudProvider,
  apiKey: string,
  modelId: string,
  baseUrl: string,
  call: ProviderCall
): Promise<string> {
  if (!apiKey?.trim()) {
    throw new AIServiceError(
      `No API key configured on the server for ${provider}. Set it in .env and restart the dev server.`
    );
  }
  if (!modelId?.trim()) throw new AIServiceError(`${provider} model ID is not configured.`);

  switch (provider) {
    case 'openai':
      return callOpenAI(apiKey, modelId, baseUrl, call);
    case 'anthropic':
      return callAnthropic(apiKey, modelId, baseUrl, call);
    case 'gemini':
      return callGemini(apiKey, modelId, baseUrl, call);
    default:
      throw new AIServiceError(`Unsupported AI provider: ${provider}`);
  }
}

/**
 * Server-side entry point used by /api/ai/docs-context. Embeddings-only, OpenAI-only — the API
 * key is supplied by the route from the server environment, same as {@link generateWithCloudKey}.
 */
export async function generateEmbeddingsWithCloudKey(
  apiKey: string,
  baseUrl: string,
  modelId: string,
  input: string[],
  signal?: AbortSignal
): Promise<number[][]> {
  if (!apiKey?.trim()) {
    throw new AIServiceError(
      'No API key configured on the server for openai. Set OPENAI_API_KEY in .env and restart the dev server.'
    );
  }
  if (!modelId?.trim()) throw new AIServiceError('Embedding model ID is not configured.');
  return callOpenAIEmbeddings(apiKey, baseUrl, modelId, input, signal);
}

/** Streaming counterpart of {@link generateWithCloudKey}, used by /api/ai/generate/stream. */
export async function generateWithCloudKeyStream(
  provider: CloudProvider,
  apiKey: string,
  modelId: string,
  baseUrl: string,
  call: ProviderCall
): Promise<ReadableStream<Uint8Array>> {
  if (!apiKey?.trim()) {
    throw new AIServiceError(
      `No API key configured on the server for ${provider}. Set it in .env and restart the dev server.`
    );
  }
  if (!modelId?.trim()) throw new AIServiceError(`${provider} model ID is not configured.`);

  switch (provider) {
    case 'openai':
      return callOpenAIStream(apiKey, modelId, baseUrl, call);
    case 'anthropic':
      return callAnthropicStream(apiKey, modelId, baseUrl, call);
    case 'gemini':
      return callGeminiStream(apiKey, modelId, baseUrl, call);
    default:
      throw new AIServiceError(`Unsupported AI provider: ${provider}`);
  }
}

/** Route through which the browser reaches cloud providers without holding their keys. */
export const AI_PROXY_ENDPOINT = '/api/ai/generate';

/** Streaming sibling of {@link AI_PROXY_ENDPOINT}: same body shape, an SSE response. */
export const AI_PROXY_STREAM_ENDPOINT = '/api/ai/generate/stream';

/** Posts to our own server, which attaches the provider key from its environment. */
async function callCloudViaProxy(config: AIModelConfig, request: AIGenerateRequest): Promise<string> {
  const call = toProviderCall(config, request);
  const response = await safeFetch(
    AI_PROXY_ENDPOINT,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: request.signal,
      body: JSON.stringify({
        provider: config.provider,
        modelId: config.modelId,
        baseUrl: config.baseUrls?.[config.provider] ?? '',
        messages: call.messages,
        temperature: call.temperature,
        maxTokens: call.maxTokens,
        jsonMode: call.jsonMode,
      }),
    },
    'Unable to reach the app server to run the AI request.'
  );

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new AIServiceError(data?.error || `AI request failed (${response.status}).`);
  }
  return data?.content ?? '';
}

/** Streaming sibling of {@link callCloudViaProxy}: the server normalises every cloud provider's
 * stream into the same OpenAI-delta SSE shape, so the parsing here is provider-agnostic. */
async function callCloudViaProxyStream(
  config: AIModelConfig,
  request: AIGenerateRequest,
  onDelta: (text: string) => void
): Promise<string> {
  const call = toProviderCall(config, request);
  const response = await safeFetch(
    AI_PROXY_STREAM_ENDPOINT,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: request.signal,
      body: JSON.stringify({
        provider: config.provider,
        modelId: config.modelId,
        baseUrl: config.baseUrls?.[config.provider] ?? '',
        messages: call.messages,
        temperature: call.temperature,
        maxTokens: call.maxTokens,
        jsonMode: call.jsonMode,
      }),
    },
    'Unable to reach the app server to run the AI request.'
  );

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new AIServiceError(data?.error || `AI request failed (${response.status}).`);
  }
  return consumeOpenAiDeltaStream(response, onDelta);
}

/** Routes a generation request to the provider configured in AIModelConfig. */
export async function generateWithAI(config: AIModelConfig, request: AIGenerateRequest): Promise<string> {
  if (config.provider === 'ollama') {
    return callOllama(
      config.baseUrls?.ollama ?? '',
      config.ollamaModel,
      toProviderCall(config, request)
    );
  }
  return callCloudViaProxy(config, request);
}

/**
 * Same as {@link generateWithAI}, but calls `onDelta` with each text fragment as it streams in
 * instead of waiting for the full answer. Still resolves with the complete concatenated text.
 */
export async function streamWithAI(
  config: AIModelConfig,
  request: AIGenerateRequest,
  onDelta: (text: string) => void
): Promise<string> {
  if (config.provider === 'ollama') {
    return callOllamaStream(
      config.baseUrls?.ollama ?? '',
      config.ollamaModel,
      toProviderCall(config, request),
      onDelta
    );
  }
  return callCloudViaProxyStream(config, request, onDelta);
}

/**
 * Escapes raw control characters that are only ever valid JSON when escaped, but that models
 * frequently stream unescaped inside long string values (most often literal newlines inside a
 * multi-line "optimized_sql" value). Left alone, a single raw newline inside a string is enough
 * to make `JSON.parse` throw and force the ugly "show the raw JSON" fallback.
 */
function escapeRawControlCharsInStrings(text: string): string {
  let result = '';
  let inString = false;
  let escapeNext = false;
  for (const ch of text) {
    if (escapeNext) {
      result += ch;
      escapeNext = false;
      continue;
    }
    if (ch === '\\') {
      result += ch;
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }
    if (inString && (ch === '\n' || ch === '\r' || ch === '\t')) {
      result += ch === '\n' ? '\\n' : ch === '\r' ? '\\r' : '\\t';
      continue;
    }
    result += ch;
  }
  return result;
}

/** Extracts balanced JSON-object candidates without being confused by prose or braces inside
 * quoted SQL snippets. Local models often wrap an otherwise-valid object in Markdown. */
function jsonObjectCandidates(text: string): string[] {
  const candidates: string[] = [];
  for (let start = text.indexOf('{'); start !== -1; start = text.indexOf('{', start + 1)) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < text.length; index += 1) {
      const character = text[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') inString = true;
      else if (character === '{') depth += 1;
      else if (character === '}' && --depth === 0) {
        candidates.push(text.slice(start, index + 1));
        break;
      }
    }
  }
  return candidates;
}

/** Pulls the JSON object out of an answer that may be fenced or padded with prose. Falls back to
 * a light repair pass (unescaped control chars, trailing commas) before giving up, since those
 * are the most common reasons a model's otherwise-good JSON answer fails to parse. */
function extractJsonObject(text: string): unknown {
  const withoutFence = text.replace(/```(?:json)?/gi, '').trim();
  for (const candidate of jsonObjectCandidates(withoutFence)) {
    try {
      return JSON.parse(candidate);
    } catch {
      try {
        const repaired = escapeRawControlCharsInStrings(candidate).replace(/,(\s*[}\]])/g, '$1');
        return JSON.parse(repaired);
      } catch {
        // Try the next balanced object, if model prose contained one before its actual payload.
      }
    }
  }
  return null;
}

function asText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(' ');
  return '';
}

function asExactText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(asText).filter(Boolean);
  const text = asText(value);
  if (!text) return [];
  // Some models answer with a single newline- or bullet-separated string.
  return text
    .split(/\r?\n|(?:^|\s)[-•*]\s+/)
    .map((line) => line.replace(/^[-•*\d.)\s]+/, '').trim())
    .filter(Boolean);
}

/** Share of the prompt budget the parser brief may occupy before it gets dropped. */
const CONTEXT_BRIEF_BUDGET_RATIO = 0.3;

/** Share of the prompt budget reserved for conversation history on follow-up turns. */
const HISTORY_BUDGET_RATIO = 0.4;

export interface ExplainSqlOptions {
  sql: string;
  config: AIModelConfig;
  locale?: Locale;
  /**
   * Verified facts from the local SQL parser (see buildSqlContextBrief). Injected into the
   * prompt so the model does not have to infer aliases and join shapes from raw text.
   */
  contextBrief?: string;
  /**
   * Free-form optimization goal typed by the user (e.g. "avoid a full table scan"). Optional —
   * when absent, the semantic-brief/optimize prompts behave exactly as before (lint-driven only).
   * When present, the model must still refuse any part of the request that would change the
   * query's result semantics rather than silently applying it (see SqlOptimizationResult.instructionStatus).
   */
  userInstruction?: string;
  signal?: AbortSignal;
}

export interface SqlOptimizationResult {
  optimizedSql: string;
  analysis: string;
  suggestions: string[];
  /** A narrowly scoped edit which must be explicitly approved in the editor before applying. */
  proposals: SqlOptimizationProposal[];
  /**
   * Set only when a `userInstruction` was supplied: whether the model applied it in full, applied
   * only a semantics-preserving subset, or refused it entirely because it could not be satisfied
   * without changing the query's result semantics.
   */
  instructionStatus?: 'applied' | 'partial' | 'refused';
  /** Plain-language explanation of `instructionStatus`, shown to the user when not 'applied'. */
  instructionNote?: string;
  /** Plain-language statement of whether/how the result set changed, so the user can judge the
   * rewrite before applying it — not folded into `analysis` so the UI can show it up front. */
  semanticImpact: string;
  raw: string;
  structured: boolean;
  budget: AIBudgetReport;
}

export interface SqlOptimizationProposal {
  id: string;
  location: string;
  issue: string;
  reason: string;
  recommendation: string;
  find: string;
  replace: string;
  semanticImpact: string;
}

/** One join/table relationship the model must treat as fixed before proposing any rewrite. */
export interface SqlSemanticRelationship {
  tables: string;
  description: string;
}

/**
 * The model's own understanding of a query's business purpose and relationships, gathered
 * *before* it is asked to optimize anything. Shown to the user for confirmation so an
 * optimize pass only proceeds once there is an explicit, reviewable statement of what must not
 * change — rather than the model silently "deciding" the semantics while also rewriting the SQL.
 */
export interface SqlSemanticBrief {
  purpose: string;
  relationships: SqlSemanticRelationship[];
  criticalFilters: string[];
  risks: string[];
  raw: string;
  structured: boolean;
  budget: AIBudgetReport;
}

const SEMANTIC_BRIEF_PROMPT: Record<Locale, (sql: string, userInstruction?: string) => string> = {
  en: (sql, userInstruction) => `Before any optimization, read the following SQL query and describe your understanding of it. Do not suggest or perform any changes here.

SQL:
\`\`\`sql
${sql}
\`\`\`
${userInstruction ? `
The user has asked for this optimization goal, in their own words: "${userInstruction}"
Keep this goal in mind while describing the query, but do not act on it yet — this step is read-only.
` : ''}
Return only a JSON object with exactly these keys:
{
  "purpose": "one or two sentences on the business goal of this query",
  "relationships": [{"tables": "the two tables/CTEs involved", "description": "what this join/relationship means and why it must be preserved"}],
  "critical_filters": ["every WHERE/HAVING condition, in plain language, that determines which rows are included or excluded"],
  "risks": ["specific ways a careless rewrite of this query could silently change its result set or business meaning"]
}

Rules:
- List every JOIN and every CTE-to-CTE dependency as a relationship, even ones that look removable.
- Do not omit a filter just because it looks redundant — state what it does.
- This is a read-only understanding step; "relationships" and "critical_filters" become the constraints a later optimization step must not violate.`,
  vi: (sql, userInstruction) => `Trước khi tối ưu hóa, hãy đọc truy vấn SQL sau và mô tả hiểu biết của bạn về nó. Không đề xuất hay thực hiện bất kỳ thay đổi nào ở bước này.

SQL:
\`\`\`sql
${sql}
\`\`\`
${userInstruction ? `
Người dùng đã nêu mục tiêu tối ưu hóa sau, bằng lời của họ: "${userInstruction}"
Hãy ghi nhớ mục tiêu này khi mô tả truy vấn, nhưng chưa hành động theo nó — bước này chỉ để hiểu, không thay đổi gì.
` : ''}
Chỉ trả về một đối tượng JSON với đúng các khóa sau:
{
  "purpose": "một đến hai câu về mục tiêu nghiệp vụ của truy vấn này",
  "relationships": [{"tables": "hai bảng/CTE liên quan", "description": "quan hệ JOIN này có ý nghĩa gì và vì sao phải giữ nguyên"}],
  "critical_filters": ["mọi điều kiện WHERE/HAVING, bằng ngôn ngữ dễ hiểu, quyết định dòng nào được giữ hoặc loại"],
  "risks": ["những cách cụ thể mà một bản viết lại bất cẩn có thể âm thầm thay đổi tập kết quả hoặc ý nghĩa nghiệp vụ"]
}

Quy tắc:
- Liệt kê mọi JOIN và mọi quan hệ phụ thuộc CTE-CTE như một relationship, kể cả những quan hệ trông như có thể loại bỏ.
- Không bỏ qua điều kiện lọc nào dù trông thừa — hãy nêu rõ nó làm gì.
- Đây là bước hiểu chỉ đọc; "relationships" và "critical_filters" sẽ trở thành ràng buộc mà bước tối ưu sau này không được vi phạm.`,
};

/** Builds the prompt + budget report for the semantic-brief pre-analysis call. */
function prepareSemanticBriefPrompt(
  sql: string,
  config: AIModelConfig,
  locale: Locale,
  contextBrief: string,
  userInstruction?: string
): { prompt: string; report: AIBudgetReport; maxOutputTokens: number } {
  if (!sql.trim()) throw new AIServiceError('There is no SQL query to analyze.');

  const budget = resolveBudget(config);
  const systemTokens = estimateTokens(resolveSystemPrompt(config, {}) ?? '');
  const available = Math.max(128, budget.promptTokens - systemTokens);

  const brief = fitContextBrief(contextBrief, Math.floor(available * CONTEXT_BRIEF_BUDGET_RATIO));
  const briefTokens = estimateTokens(brief);
  const fitted = truncateSqlForBudget(sql, Math.max(128, available - briefTokens - 220));

  const buildPrompt = SEMANTIC_BRIEF_PROMPT[locale] ?? SEMANTIC_BRIEF_PROMPT.en;
  const prompt = brief
    ? `${brief}\n\n${buildPrompt(fitted.sql, userInstruction)}`
    : buildPrompt(fitted.sql, userInstruction);

  const report: AIBudgetReport = {
    contextTokens: budget.contextTokens,
    promptBudgetTokens: budget.promptTokens,
    estimatedPromptTokens: systemTokens + estimateTokens(prompt),
    sqlTruncated: fitted.truncated,
    omittedSqlLines: fitted.omittedLines,
    droppedMessages: 0,
    contextBriefDropped: Boolean(contextBrief) && !brief,
  };

  return { prompt, report, maxOutputTokens: budget.maxOutputTokens };
}

function parseSemanticBrief(raw: string, report: AIBudgetReport): SqlSemanticBrief {
  if (!raw) throw new AIServiceError('The model returned an empty response. Try running it again.');

  const parsed = extractJsonObject(raw) as Record<string, unknown> | null;
  if (!parsed) {
    return {
      purpose: '',
      relationships: [],
      criticalFilters: [],
      risks: [],
      raw,
      structured: false,
      budget: report,
    };
  }

  const relationships = Array.isArray(parsed.relationships)
    ? parsed.relationships.flatMap((entry) => {
        if (!entry || typeof entry !== 'object') return [];
        const item = entry as Record<string, unknown>;
        const description = asText(item.description);
        if (!description) return [];
        return [{ tables: asText(item.tables), description }];
      })
    : [];

  return {
    purpose: asText(parsed.purpose),
    relationships,
    criticalFilters: asList(parsed.critical_filters),
    risks: asList(parsed.risks),
    raw,
    structured: true,
    budget: report,
  };
}

/**
 * Read-only pre-analysis step: asks the model to state a query's business purpose, every
 * join/CTE relationship, every filter, and the specific ways a careless rewrite could break it
 * — with no SQL change proposed yet. Meant to be shown to the user for confirmation before
 * {@link optimizeSqlWithAIStream} is ever called, and its `relationships`/`criticalFilters` are
 * then fed back into the optimize prompt as constraints the model already committed to.
 */
export async function analyzeSqlSemantics({
  sql,
  config,
  locale = 'en',
  contextBrief = '',
  userInstruction,
  signal,
}: ExplainSqlOptions): Promise<SqlSemanticBrief> {
  const { prompt, report, maxOutputTokens } = prepareSemanticBriefPrompt(
    sql,
    config,
    locale,
    contextBrief,
    userInstruction
  );

  const raw = (
    await generateWithAI(config, {
      prompt,
      jsonMode: true,
      maxTokens: maxOutputTokens,
      signal,
    })
  ).trim();

  return parseSemanticBrief(raw, report);
}

/** Renders a confirmed semantic brief as a prompt section the optimize call must not contradict. */
/** Keeps the confirmed-brief section from crowding out the SQL itself in small local context windows. */
const MAX_SEMANTIC_CONSTRAINT_ITEMS = 6;
const MAX_SEMANTIC_CONSTRAINT_LINE_CHARS = 140;

export function formatSemanticBriefForOptimizePrompt(brief: SqlSemanticBrief, locale: Locale = 'en'): string {
  if (!brief.structured) return '';
  const truncate = (text: string) =>
    text.length > MAX_SEMANTIC_CONSTRAINT_LINE_CHARS ? `${text.slice(0, MAX_SEMANTIC_CONSTRAINT_LINE_CHARS)}…` : text;

  const lines: string[] = [];
  const header =
    locale === 'vi'
      ? 'Ràng buộc đã xác nhận — KHÔNG vi phạm:'
      : 'Confirmed constraints — do NOT violate:';
  lines.push(header);
  for (const rel of brief.relationships.slice(0, MAX_SEMANTIC_CONSTRAINT_ITEMS)) {
    lines.push(`- ${rel.tables}: ${truncate(rel.description)}`);
  }
  for (const filter of brief.criticalFilters.slice(0, MAX_SEMANTIC_CONSTRAINT_ITEMS)) {
    lines.push(`- ${truncate(filter)}`);
  }
  return lines.join('\n');
}

const OPTIMIZE_SQL_STRUCTURED_PROMPT: Record<Locale, (sql: string, userInstruction?: string) => string> = {
  en: (sql, userInstruction) => `Optimize the following SQL query for performance. Fix ONLY the specific issues listed below the query under "Linting alerts" (if that section is present) — every other clause, alias, formatting choice, and ordering must stay character-for-character identical to the original. Do not perform a general rewrite.
${userInstruction ? `
The user additionally asked, in their own words: "${userInstruction}"
Apply this instruction ONLY to the extent it does not change which rows, tables, joins, filters, or output columns the query returns:
- If it can be fully satisfied without changing result semantics, apply it and set "instruction_status" to "applied".
- If only part of it can be applied without changing semantics, apply that part only and set "instruction_status" to "partial", explaining in "instruction_note" what was left out and why.
- If applying it would necessarily change the query's result semantics (e.g. it asks to drop a filter, change a JOIN's row inclusion, or remove an output column), do NOT apply that part — set "instruction_status" to "refused" and explain why in "instruction_note", proposing no change (or only a safe subset) instead.
` : ''}
Return only a JSON object with exactly these keys, in this order:
{
  "analysis": "a short summary of what you changed and why, naming the specific issue(s) fixed",
  "suggestions": ["one specific improvement per issue actually fixed"],
  "proposals": [{"id": "unique-short-id", "location": "clause and affected expression", "issue": "specific anti-pattern", "reason": "why it is costly or risky", "recommendation": "what this targeted change does", "find": "exact unique SQL text from the original to replace", "replace": "replacement SQL text", "semantic_impact": "why rows, columns, joins and aggregates stay unchanged"}],
  "semantic_impact": "plain-language statement of why the approved local changes preserve rows, columns, aggregates and relationships"${userInstruction ? `,
  "instruction_status": "\"applied\", \"partial\", or \"refused\" — see rules above",
  "instruction_note": "explanation shown to the user when instruction_status is not \"applied\""` : ''}
}

SQL:
\`\`\`sql
${sql}
\`\`\`

Rules:
- If a "Linting alerts" section is provided above, only touch the clause(s) needed to resolve those specific alerts. Leave every unrelated part of the query untouched.
- If no linting alerts are provided, apply only the smallest set of high-confidence performance fixes and leave the rest of the query untouched.
- Do not change business logic or result semantics.
- Never delete, merge, or rewrite a table, JOIN, WHERE/HAVING condition, CASE branch, subquery, or CTE that is not the specific target of a listed issue — this holds even when a bigger rewrite would look "cleaner". A correct fix for one flagged issue is almost always a small, local edit, not a rewrite of large parts of the query.
- Do not remove or add tables, columns, joins, filters, or grouping unless the same result set is preserved.
- Do not change NULL handling or DISTINCT semantics.
- Do not reformat, rename aliases, or reorder clauses that are not part of a fix.
- Each proposal must contain one exact, unique \`find\` snippet from the original and one narrow \`replace\` snippet. Never propose a full-query replacement.
- Before returning a proposal, verify it preserves every table, join relationship, filter condition, output column, NULL rule and DISTINCT/GROUP BY behavior. If this cannot be proven from the query, do not propose the change; explain the uncertainty in "analysis".
- If the query has no fixable issues, return an empty "proposals" array and explain why in "analysis".`,
  vi: (sql, userInstruction) => `Tối ưu hóa truy vấn SQL sau đây về hiệu suất. CHỈ sửa những vấn đề cụ thể được liệt kê bên dưới truy vấn trong phần "Linting alerts" (nếu có) — mọi mệnh đề, bí danh, cách định dạng và thứ tự khác phải giữ nguyên tuyệt đối so với bản gốc. Không viết lại toàn bộ.
${userInstruction ? `
Người dùng cũng đã yêu cầu thêm, bằng lời của họ: "${userInstruction}"
Chỉ áp dụng yêu cầu này trong phạm vi KHÔNG làm thay đổi những dòng, bảng, phép nối, điều kiện lọc hoặc cột đầu ra mà truy vấn trả về:
- Nếu có thể đáp ứng đầy đủ mà không đổi ngữ nghĩa kết quả, hãy áp dụng và đặt "instruction_status" là "applied".
- Nếu chỉ một phần có thể áp dụng mà không đổi ngữ nghĩa, chỉ áp dụng phần đó và đặt "instruction_status" là "partial", giải thích trong "instruction_note" phần nào đã bỏ qua và vì sao.
- Nếu áp dụng yêu cầu chắc chắn sẽ làm thay đổi ngữ nghĩa kết quả (ví dụ yêu cầu bỏ một điều kiện lọc, đổi loại JOIN làm thay đổi số dòng, hoặc bỏ một cột đầu ra), KHÔNG áp dụng phần đó — đặt "instruction_status" là "refused" và giải thích lý do trong "instruction_note", chỉ đề xuất không thay đổi (hoặc một phần an toàn) thay vào đó.
` : ''}
Chỉ trả về một đối tượng JSON với đúng các khóa sau, theo đúng thứ tự này:
{
  "analysis": "tóm tắt ngắn gọn những gì bạn đã thay đổi và lý do, nêu rõ (các) vấn đề đã sửa",
  "suggestions": ["mỗi cải tiến cụ thể tương ứng với từng vấn đề đã thực sự được sửa"],
  "proposals": [{"id": "ma-dinh-danh-ngan", "location": "mệnh đề và biểu thức bị ảnh hưởng", "issue": "anti-pattern cụ thể", "reason": "vì sao gây tốn chi phí hoặc rủi ro", "recommendation": "thay đổi cục bộ này thực hiện gì", "find": "đoạn SQL duy nhất, chính xác trong bản gốc cần thay", "replace": "đoạn SQL thay thế", "semantic_impact": "vì sao số dòng, cột, JOIN và aggregate không thay đổi"}],
  "semantic_impact": "giải thích vì sao các thay đổi cục bộ đã duyệt vẫn giữ nguyên số dòng, cột, aggregate và quan hệ"${userInstruction ? `,
  "instruction_status": "\"applied\", \"partial\", hoặc \"refused\" — xem quy tắc ở trên",
  "instruction_note": "giải thích hiển thị cho người dùng khi instruction_status không phải \"applied\""` : ''}
}

SQL:
\`\`\`sql
${sql}
\`\`\`

Quy tắc:
- Nếu có phần "Linting alerts" ở trên, chỉ chạm vào (các) mệnh đề cần thiết để khắc phục những cảnh báo đó. Giữ nguyên mọi phần không liên quan.
- Nếu không có cảnh báo linting nào được cung cấp, chỉ áp dụng tập hợp nhỏ nhất các cải tiến hiệu suất đáng tin cậy và giữ nguyên phần còn lại.
- Không thay đổi logic nghiệp vụ hoặc ngữ nghĩa kết quả.
- Tuyệt đối không xóa, gộp hay viết lại bất kỳ bảng, JOIN, điều kiện WHERE/HAVING, nhánh CASE, subquery hay CTE nào không phải là mục tiêu cụ thể của một vấn đề đã liệt kê — kể cả khi một bản viết lại lớn hơn trông "gọn gàng" hơn. Cách sửa đúng cho một vấn đề được gắn cờ gần như luôn là một chỉnh sửa nhỏ, cục bộ, không phải viết lại phần lớn truy vấn.
- Không loại bỏ hoặc thêm bảng, cột, phép nối, bộ lọc hoặc nhóm trừ khi vẫn giữ nguyên tập kết quả.
- Không thay đổi cách xử lý NULL hoặc ngữ nghĩa DISTINCT.
- Không định dạng lại, đổi tên bí danh, hay sắp xếp lại các mệnh đề không thuộc phần cần sửa.
- Mỗi proposal phải có đúng một đoạn \`find\` duy nhất, chính xác từ SQL gốc và một đoạn \`replace\` cục bộ. Tuyệt đối không đề xuất thay toàn bộ truy vấn.
- Trước khi trả proposal, hãy xác minh nó giữ nguyên mọi bảng, quan hệ JOIN, điều kiện lọc, cột đầu ra, quy tắc NULL và DISTINCT/GROUP BY. Nếu không thể chứng minh từ truy vấn, không đề xuất thay đổi đó; hãy nêu sự không chắc chắn trong "analysis".
- Nếu truy vấn không có vấn đề nào cần sửa, trả về mảng "proposals" rỗng và giải thích lý do trong "analysis".`,
};

/** Resolves the effective context budget for the active provider from the saved settings. */
export function resolveBudget(config: AIModelConfig) {
  return buildContextBudget(
    config.contextTokens?.[config.provider] ?? DEFAULT_CONTEXT_TOKENS[config.provider],
    config.maxOutputTokens?.[config.provider] ?? DEFAULT_MAX_OUTPUT_TOKENS[config.provider]
  );
}

/** Builds the prompt + budget report shared by the blocking and streaming explain calls. */
function prepareExplainPrompt(
  sql: string,
  config: AIModelConfig,
  locale: Locale,
  contextBrief: string
): { prompt: string; report: AIBudgetReport; maxOutputTokens: number } {
  if (!sql.trim()) throw new AIServiceError('There is no SQL query to explain.');

  const budget = resolveBudget(config);
  const systemTokens = estimateTokens(resolveSystemPrompt(config, {}) ?? '');
  const available = Math.max(128, budget.promptTokens - systemTokens);

  const brief = fitContextBrief(contextBrief, Math.floor(available * CONTEXT_BRIEF_BUDGET_RATIO));
  const briefTokens = estimateTokens(brief);
  const fitted = truncateSqlForBudget(sql, Math.max(128, available - briefTokens - 220));

  const buildPrompt = EXPLAIN_SQL_STRUCTURED_PROMPT[locale] ?? EXPLAIN_SQL_STRUCTURED_PROMPT.en;
  const prompt = brief ? `${brief}\n\n${buildPrompt(fitted.sql)}` : buildPrompt(fitted.sql);

  const report: AIBudgetReport = {
    contextTokens: budget.contextTokens,
    promptBudgetTokens: budget.promptTokens,
    estimatedPromptTokens: systemTokens + estimateTokens(prompt),
    sqlTruncated: fitted.truncated,
    omittedSqlLines: fitted.omittedLines,
    droppedMessages: 0,
    contextBriefDropped: Boolean(contextBrief) && !brief,
  };

  return { prompt, report, maxOutputTokens: budget.maxOutputTokens };
}

/** Turns the model's raw answer into a {@link SqlExplanation}, shared by both explain calls. */
function parseSqlExplanation(raw: string, report: AIBudgetReport): SqlExplanation {
  if (!raw) throw new AIServiceError('The model returned an empty response. Try running it again.');

  const parsed = extractJsonObject(raw) as Record<string, unknown> | null;
  const objective = asText(parsed?.objective);
  const output = asText(parsed?.output);

  if (!parsed || (!objective && !output)) {
    return {
      objective: raw,
      filters: [],
      output: '',
      tables: [],
      fieldMeanings: [],
      raw,
      structured: false,
      budget: report,
    };
  }

  return {
    objective,
    filters: asList(parsed.filters),
    output,
    tables: asList(parsed.tables),
    fieldMeanings: asList(parsed.field_meanings),
    raw,
    structured: true,
    budget: report,
  };
}

/**
 * Turns SQL into a structured natural-language explanation using the provider and
 * parameters saved on the Settings page. Falls back to the plain model answer when
 * the model does not honour the JSON contract, so the user always sees something.
 *
 * The query and the parser brief are fitted to the model's context window before sending,
 * and whatever had to be dropped is reported back in `budget` so the UI can say so.
 */
export async function explainSqlStructured({
  sql,
  config,
  locale = 'en',
  contextBrief = '',
  signal,
}: ExplainSqlOptions): Promise<SqlExplanation> {
  const { prompt, report, maxOutputTokens } = prepareExplainPrompt(sql, config, locale, contextBrief);

  const raw = (
    await generateWithAI(config, {
      prompt,
      jsonMode: true,
      maxTokens: maxOutputTokens,
      signal,
    })
  ).trim();

  return parseSqlExplanation(raw, report);
}

/**
 * Streaming counterpart of {@link explainSqlStructured}: identical prompt and parsing, but
 * `onDelta` is called with each text fragment as it arrives so the UI can render the answer
 * in real time instead of waiting for the full JSON payload.
 */
export async function explainSqlStructuredStream(
  { sql, config, locale = 'en', contextBrief = '', signal }: ExplainSqlOptions,
  onDelta: (text: string) => void
): Promise<SqlExplanation> {
  const { prompt, report, maxOutputTokens } = prepareExplainPrompt(sql, config, locale, contextBrief);

  const raw = (
    await streamWithAI(
      config,
      {
        prompt,
        jsonMode: true,
        maxTokens: maxOutputTokens,
        signal,
      },
      onDelta
    )
  ).trim();

  return parseSqlExplanation(raw, report);
}

/** Builds the prompt + budget report shared by the blocking and streaming optimize calls. */
function prepareOptimizePrompt(
  sql: string,
  config: AIModelConfig,
  locale: Locale,
  contextBrief: string,
  userInstruction?: string
): { prompt: string; report: AIBudgetReport; maxOutputTokens: number } {
  if (!sql.trim()) throw new AIServiceError('There is no SQL query to optimize.');

  const budget = resolveBudget(config);
  const systemTokens = estimateTokens(resolveSystemPrompt(config, {}) ?? '');
  const available = Math.max(128, budget.promptTokens - systemTokens);

  const brief = fitContextBrief(contextBrief, Math.floor(available * CONTEXT_BRIEF_BUDGET_RATIO));
  const briefTokens = estimateTokens(brief);
  const fitted = truncateSqlForBudget(sql, Math.max(128, available - briefTokens - 220));

  const buildPrompt = OPTIMIZE_SQL_STRUCTURED_PROMPT[locale] ?? OPTIMIZE_SQL_STRUCTURED_PROMPT.en;
  const prompt = brief
    ? `${brief}\n\n${buildPrompt(fitted.sql, userInstruction)}`
    : buildPrompt(fitted.sql, userInstruction);

  const report: AIBudgetReport = {
    contextTokens: budget.contextTokens,
    promptBudgetTokens: budget.promptTokens,
    estimatedPromptTokens: systemTokens + estimateTokens(prompt),
    sqlTruncated: fitted.truncated,
    omittedSqlLines: fitted.omittedLines,
    droppedMessages: 0,
    contextBriefDropped: Boolean(contextBrief) && !brief,
  };

  return { prompt, report, maxOutputTokens: budget.maxOutputTokens };
}

/** Turns the model's raw answer into a {@link SqlOptimizationResult}, shared by both optimize calls. */
/**
 * Schema-description phrases from OPTIMIZE_SQL_STRUCTURED_PROMPT (both locales). A weak/small
 * local model sometimes fills a JSON field with the field's own instructional description
 * instead of real content — this is indistinguishable from real text by shape alone, so it must
 * be matched literally and treated as "no answer" rather than shown to the user as if genuine.
 */
const OPTIMIZE_PLACEHOLDER_ECHOES = new Set(
  [
    'a short summary of what you changed and why, naming the specific issue(s) fixed',
    'one specific improvement per issue actually fixed',
    'clause and affected expression',
    'specific anti-pattern',
    'why it is costly or risky',
    'what this targeted change does',
    'why rows, columns, joins and aggregates stay unchanged',
    'plain-language statement of why the approved local changes preserve rows, columns, aggregates and relationships',
    'tóm tắt ngắn gọn những gì bạn đã thay đổi và lý do, nêu rõ (các) vấn đề đã sửa',
    'mỗi cải tiến cụ thể tương ứng với từng vấn đề đã thực sự được sửa',
    'mệnh đề và biểu thức bị ảnh hưởng',
    'anti-pattern cụ thể',
    'vì sao gây tốn chi phí hoặc rủi ro',
    'thay đổi cục bộ này thực hiện gì',
    'vì sao số dòng, cột, join và aggregate không thay đổi',
    'giải thích vì sao các thay đổi cục bộ đã duyệt vẫn giữ nguyên số dòng, cột, aggregate và quan hệ',
  ].map((phrase) => phrase.toLowerCase())
);

function dropPlaceholderEcho(text: string): string {
  return OPTIMIZE_PLACEHOLDER_ECHOES.has(text.trim().toLowerCase()) ? '' : text;
}

function parseSqlOptimization(sql: string, raw: string, report: AIBudgetReport): SqlOptimizationResult {
  if (!raw) throw new AIServiceError('The model returned an empty response. Try running it again.');

  const parsed = extractJsonObject(raw) as Record<string, unknown> | null;
  const optimizedSql = asText(parsed?.optimized_sql);
  const analysis = dropPlaceholderEcho(asText(parsed?.analysis));
  const suggestions = asList(parsed?.suggestions).filter((item) => !OPTIMIZE_PLACEHOLDER_ECHOES.has(item.trim().toLowerCase()));
  const semanticImpact = dropPlaceholderEcho(asText(parsed?.semantic_impact));
  const proposals = Array.isArray(parsed?.proposals)
    ? parsed.proposals.flatMap((proposal, index) => {
        if (!proposal || typeof proposal !== 'object') return [];
        const entry = proposal as Record<string, unknown>;
        const find = asExactText(entry.find);
        const replace = asExactText(entry.replace);
        if (!find || !replace || find === replace) return [];
        return [{
          id: asText(entry.id) || `proposal-${index + 1}`,
          location: dropPlaceholderEcho(asText(entry.location)),
          issue: dropPlaceholderEcho(asText(entry.issue)),
          reason: dropPlaceholderEcho(asText(entry.reason)),
          recommendation: dropPlaceholderEcho(asText(entry.recommendation)),
          find,
          replace,
          semanticImpact: dropPlaceholderEcho(asText(entry.semantic_impact)),
        }];
      })
    : [];

  if (!parsed) {
    return {
      optimizedSql: sql,
      analysis: raw,
      suggestions: [],
      proposals: [],
      semanticImpact: '',
      raw,
      structured: false,
      budget: report,
    };
  }

  const instructionStatusRaw = asText(parsed.instruction_status).toLowerCase();
  const instructionStatus =
    instructionStatusRaw === 'applied' || instructionStatusRaw === 'partial' || instructionStatusRaw === 'refused'
      ? instructionStatusRaw
      : undefined;
  const instructionNote = dropPlaceholderEcho(asText(parsed.instruction_note));

  return {
    optimizedSql: optimizedSql || sql,
    analysis,
    suggestions,
    proposals,
    instructionStatus,
    instructionNote: instructionNote || undefined,
    semanticImpact,
    raw,
    structured: true,
    budget: report,
  };
}

export async function optimizeSqlWithAI({
  sql,
  config,
  locale = 'en',
  contextBrief = '',
  userInstruction,
  signal,
}: ExplainSqlOptions): Promise<SqlOptimizationResult> {
  const { prompt, report, maxOutputTokens } = prepareOptimizePrompt(sql, config, locale, contextBrief, userInstruction);

  const raw = (
    await generateWithAI(config, {
      prompt,
      jsonMode: true,
      maxTokens: maxOutputTokens,
      signal,
    })
  ).trim();

  return parseSqlOptimization(sql, raw, report);
}

/**
 * Streaming counterpart of {@link optimizeSqlWithAI}: identical prompt and parsing, but
 * `onDelta` is called with each text fragment as it arrives. The JSON schema puts "analysis"
 * and "suggestions" ahead of "optimized_sql", so a live view of the raw stream shows the
 * model's reasoning before the rewritten query itself lands.
 */
export async function optimizeSqlWithAIStream(
  { sql, config, locale = 'en', contextBrief = '', userInstruction, signal }: ExplainSqlOptions,
  onDelta: (text: string) => void
): Promise<SqlOptimizationResult> {
  const { prompt, report, maxOutputTokens } = prepareOptimizePrompt(sql, config, locale, contextBrief, userInstruction);

  const raw = (
    await streamWithAI(
      config,
      {
        prompt,
        jsonMode: true,
        maxTokens: maxOutputTokens,
        signal,
      },
      onDelta
    )
  ).trim();

  return parseSqlOptimization(sql, raw, report);
}

/**
 * Which of the three optimize surfaces is active: the pre-existing automatic lint/alert-driven
 * pass, the pre-existing semantics-preserving natural-language instruction pass, or the new
 * requirement-driven pass (spec 004) which may change the query's result semantics.
 */
export type OptimizationMode = 'lint' | 'instruction' | 'requirement';

/** The user's free-form description of new logic to add to an analyzed query (spec 004 US1). */
export interface RequirementInput {
  text: string;
  /** Table/column names the user explicitly named as candidates to reference. */
  hintedTables?: string[];
}

/**
 * Result of a requirement-driven candidate generation call. Deliberately a simpler shape than
 * {@link SqlOptimizationResult} (no narrow `find`/`replace` proposals) — a requirement may
 * restructure the query broadly, so the whole candidate query is returned as one unit and
 * compared against the original via {@link buildRequirementChangeSummary} by the caller.
 */
export interface SqlRequirementCandidateResult {
  optimizedSql: string;
  analysis: string;
  /** Table/column names from the requirement that could not be resolved (FR-003). */
  unresolvedReferences: string[];
  raw: string;
  structured: boolean;
  budget: AIBudgetReport;
}

const REQUIREMENT_CANDIDATE_PROMPT: Record<
  Locale,
  (sql: string, requirementText: string, hintedTables: string[]) => string
> = {
  en: (sql, requirementText, hintedTables) => `The user wants to add a new requirement to the following SQL query. Unlike a normal optimization pass, you MAY change which tables, joins, filters, or output columns the query uses if that is what the requirement needs — but only to satisfy the stated requirement, nothing else.

SQL:
\`\`\`sql
${sql}
\`\`\`

Requirement, in the user's own words: "${requirementText}"
${hintedTables.length ? `The user specifically named these tables/columns to consider: ${hintedTables.join(', ')}.` : ''}

Reply with ONLY a JSON object — no prose, no markdown fence — using exactly this shape:
{
  "optimized_sql": "the full candidate query that satisfies the requirement",
  "analysis": "plain-language explanation of what was added or changed and why, compared to the original query",
  "unresolved_references": ["any table or column name from the requirement that you could not find evidence for in the SQL or the verified facts above, and therefore did not use"]
}

Rules:
- Only change what is needed to satisfy the stated requirement. Do not perform an unrelated general rewrite.
- Never invent a table or column name that does not appear in the SQL, the verified facts above, or the user's own hinted names — if you cannot resolve a needed reference, list it in "unresolved_references" and do not use it in "optimized_sql".
- If the requirement cannot be satisfied at all without an unresolvable reference, return the original query unchanged in "optimized_sql" and explain why in "analysis".
- "analysis" must clearly state which tables, joins, filters, or output columns were added, removed, or changed.`,
  vi: (sql, requirementText, hintedTables) => `Người dùng muốn thêm một yêu cầu mới vào truy vấn SQL sau đây. Khác với một lượt tối ưu hóa thông thường, bạn ĐƯỢC PHÉP thay đổi bảng, phép nối, điều kiện lọc hoặc cột đầu ra của truy vấn nếu yêu cầu cần như vậy — nhưng chỉ để đáp ứng đúng yêu cầu đã nêu, không hơn.

SQL:
\`\`\`sql
${sql}
\`\`\`

Yêu cầu, theo lời của người dùng: "${requirementText}"
${hintedTables.length ? `Người dùng đã nêu rõ các bảng/cột sau cần xem xét: ${hintedTables.join(', ')}.` : ''}

Chỉ trả về DUY NHẤT một đối tượng JSON — không thêm lời dẫn, không dùng khối markdown — theo đúng cấu trúc sau:
{
  "optimized_sql": "toàn bộ truy vấn mẫu đáp ứng yêu cầu",
  "analysis": "giải thích bằng ngôn ngữ dễ hiểu về những gì đã được thêm hoặc thay đổi và vì sao, so với truy vấn gốc",
  "unresolved_references": ["tên bảng hoặc cột trong yêu cầu mà bạn không tìm thấy bằng chứng trong SQL hoặc các dữ kiện đã xác thực ở trên, và do đó không sử dụng"]
}

Quy tắc:
- Chỉ thay đổi những gì cần thiết để đáp ứng yêu cầu đã nêu. Không viết lại toàn bộ một cách không liên quan.
- Tuyệt đối không tự đặt ra tên bảng hoặc cột không xuất hiện trong SQL, trong các dữ kiện đã xác thực ở trên, hoặc trong tên người dùng đã nêu — nếu không thể xác định một tham chiếu cần thiết, hãy liệt kê nó trong "unresolved_references" và không sử dụng nó trong "optimized_sql".
- Nếu yêu cầu hoàn toàn không thể đáp ứng được vì thiếu tham chiếu không xác định, hãy trả về truy vấn gốc không đổi trong "optimized_sql" và giải thích lý do trong "analysis".
- "analysis" phải nêu rõ những bảng, phép nối, điều kiện lọc hoặc cột đầu ra nào đã được thêm, loại bỏ hoặc thay đổi.`,
};

/** Builds the prompt + budget report shared by the blocking and streaming requirement-candidate calls. */
function prepareRequirementCandidatePrompt(
  sql: string,
  config: AIModelConfig,
  locale: Locale,
  contextBrief: string,
  requirementInput: RequirementInput
): { prompt: string; report: AIBudgetReport; maxOutputTokens: number } {
  if (!sql.trim()) throw new AIServiceError('There is no SQL query to add a requirement to.');
  if (!requirementInput.text.trim()) throw new AIServiceError('The requirement text is empty.');

  const budget = resolveBudget(config);
  const systemTokens = estimateTokens(resolveSystemPrompt(config, {}) ?? '');
  const available = Math.max(128, budget.promptTokens - systemTokens);

  const brief = fitContextBrief(contextBrief, Math.floor(available * CONTEXT_BRIEF_BUDGET_RATIO));
  const briefTokens = estimateTokens(brief);
  const fitted = truncateSqlForBudget(sql, Math.max(128, available - briefTokens - 220));

  const hintedTables = requirementInput.hintedTables ?? [];
  const buildPrompt = REQUIREMENT_CANDIDATE_PROMPT[locale] ?? REQUIREMENT_CANDIDATE_PROMPT.en;
  const prompt = brief
    ? `${brief}\n\n${buildPrompt(fitted.sql, requirementInput.text, hintedTables)}`
    : buildPrompt(fitted.sql, requirementInput.text, hintedTables);

  const report: AIBudgetReport = {
    contextTokens: budget.contextTokens,
    promptBudgetTokens: budget.promptTokens,
    estimatedPromptTokens: systemTokens + estimateTokens(prompt),
    sqlTruncated: fitted.truncated,
    omittedSqlLines: fitted.omittedLines,
    droppedMessages: 0,
    contextBriefDropped: Boolean(contextBrief) && !brief,
  };

  return { prompt, report, maxOutputTokens: budget.maxOutputTokens };
}

/** Turns the model's raw answer into a {@link SqlRequirementCandidateResult}. */
function parseRequirementCandidate(sql: string, raw: string, report: AIBudgetReport): SqlRequirementCandidateResult {
  if (!raw) throw new AIServiceError('The model returned an empty response. Try running it again.');

  const parsed = extractJsonObject(raw) as Record<string, unknown> | null;
  if (!parsed) {
    return {
      optimizedSql: sql,
      analysis: raw,
      unresolvedReferences: [],
      raw,
      structured: false,
      budget: report,
    };
  }

  const optimizedSql = asText(parsed.optimized_sql);
  return {
    optimizedSql: optimizedSql || sql,
    analysis: asText(parsed.analysis),
    unresolvedReferences: asList(parsed.unresolved_references),
    raw,
    structured: true,
    budget: report,
  };
}

/**
 * Generates a candidate query that satisfies a user-stated requirement (spec 004 US1). Unlike
 * {@link optimizeSqlWithAI}, the model is explicitly allowed to change tables/joins/filters/
 * output columns — the caller is responsible for computing a structural diff (see
 * `buildRequirementChangeSummary` in `src/lib/sql/optimizeRegression.ts`) and gating any editor
 * change behind explicit user confirmation (FR-005/FR-006).
 */
export async function generateRequirementCandidate({
  sql,
  config,
  locale = 'en',
  contextBrief = '',
  requirementInput,
  signal,
}: ExplainSqlOptions & { requirementInput: RequirementInput }): Promise<SqlRequirementCandidateResult> {
  const { prompt, report, maxOutputTokens } = prepareRequirementCandidatePrompt(
    sql,
    config,
    locale,
    contextBrief,
    requirementInput
  );

  const raw = (
    await generateWithAI(config, {
      prompt,
      jsonMode: true,
      maxTokens: maxOutputTokens,
      signal,
    })
  ).trim();

  return parseRequirementCandidate(sql, raw, report);
}

/** Streaming counterpart of {@link generateRequirementCandidate}. */
export async function generateRequirementCandidateStream(
  { sql, config, locale = 'en', contextBrief = '', requirementInput, signal }: ExplainSqlOptions & { requirementInput: RequirementInput },
  onDelta: (text: string) => void
): Promise<SqlRequirementCandidateResult> {
  const { prompt, report, maxOutputTokens } = prepareRequirementCandidatePrompt(
    sql,
    config,
    locale,
    contextBrief,
    requirementInput
  );

  const raw = (
    await streamWithAI(
      config,
      {
        prompt,
        jsonMode: true,
        maxTokens: maxOutputTokens,
        signal,
      },
      onDelta
    )
  ).trim();

  return parseRequirementCandidate(sql, raw, report);
}

/**
 * Deterministically checks the user's explicitly hinted table/column names against the tables
 * already known from the current analyzed query. There is no live schema catalog in this app
 * (see specs/004-nl-requirement-optimize/research.md R3), so this can only confirm/deny against
 * what the local parser already knows — anything else is left for the model to self-report via
 * `unresolvedReferences`, not authoritatively validated here.
 */
export function resolveHintedTableReferences(
  hintedTables: string[],
  analysis: AnalysisResult | null
): { resolved: string[]; unresolved: string[] } {
  const knownNames = new Set((analysis?.tables ?? []).map((table) => table.name.toLowerCase()));
  const resolved: string[] = [];
  const unresolved: string[] = [];
  for (const hint of hintedTables) {
    const trimmed = hint.trim();
    if (!trimmed) continue;
    if (knownNames.has(trimmed.toLowerCase())) resolved.push(trimmed);
    else unresolved.push(trimmed);
  }
  return { resolved, unresolved };
}

/** Counts how many times `needle` appears in `haystack` via plain substring split — the same
 * check the editor runs immediately before applying a proposal, so a proposal is only ever
 * considered valid when it can be applied unambiguously (exactly one match). */
export function countExactOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  return haystack.split(needle).length - 1;
}

/** A proposal is only safely applicable when its `find` text matches the given SQL exactly once. */
export function isProposalApplicable(sql: string, proposal: Pick<SqlOptimizationProposal, 'find'>): boolean {
  return countExactOccurrences(sql, proposal.find) === 1;
}

const REPAIR_PROPOSALS_PROMPT: Record<
  Locale,
  (sql: string, invalid: { issue: string; find: string; occurrences: number }[]) => string
> = {
  en: (sql, invalid) => `You previously proposed targeted SQL edits for the query below, but some of them cannot be applied because their "find" text does not match the ORIGINAL query exactly once (occurrences=0 means it was not found at all; occurrences>1 means it matched more than once and is ambiguous — a repeated expression like an aggregate reused in HAVING/ORDER BY is a common cause).

Re-emit ONLY the proposals listed below, corrected. Keep each one's original intent (the same issue/fix) — only correct "find"/"replace" so that:
- "find" is copied character-for-character from the SQL below (same whitespace, casing, line breaks).
- "find" occurs in the SQL EXACTLY ONCE. If the expression repeats, widen "find" to include enough surrounding text (a neighboring keyword, clause, alias, or operand) to make it unique.
- If a proposal genuinely cannot be made both valid and unique from this exact SQL, omit it from the output array entirely rather than guessing.

Original SQL:
\`\`\`sql
${sql}
\`\`\`

Proposals to correct:
${invalid.map((p, i) => `${i + 1}. issue: ${p.issue || '(none)'} | previous find (occurrences=${p.occurrences}): ${JSON.stringify(p.find)}`).join('\n')}

Return only a JSON object with exactly this key:
{"proposals": [{"id": "short id", "location": "clause and affected expression", "issue": "specific anti-pattern", "reason": "why it is costly or risky", "recommendation": "what this targeted change does", "find": "exact unique SQL text from the original", "replace": "replacement SQL text", "semantic_impact": "why rows, columns, joins and aggregates stay unchanged"}]}`,
  vi: (sql, invalid) => `Bạn đã đề xuất các thay đổi SQL cục bộ cho truy vấn bên dưới, nhưng một số đề xuất không thể áp dụng vì đoạn "find" không khớp CHÍNH XÁC MỘT LẦN với truy vấn GỐC (occurrences=0 nghĩa là không tìm thấy; occurrences>1 nghĩa là khớp nhiều lần nên không rõ ràng — nguyên nhân thường gặp là một biểu thức lặp lại, ví dụ hàm aggregate được dùng lại ở HAVING/ORDER BY).

Chỉ trả lại các đề xuất được liệt kê bên dưới, đã sửa. Giữ nguyên mục đích ban đầu của từng đề xuất (cùng vấn đề/cách sửa) — chỉ sửa "find"/"replace" sao cho:
- "find" được copy nguyên văn từng ký tự từ SQL bên dưới (giữ nguyên khoảng trắng, chữ hoa/thường, xuống dòng).
- "find" xuất hiện trong SQL ĐÚNG MỘT LẦN. Nếu biểu thức bị lặp lại, hãy mở rộng "find" để bao gồm đủ ngữ cảnh xung quanh (từ khóa lân cận, mệnh đề, alias, hoặc toán hạng) để nó trở nên duy nhất.
- Nếu một đề xuất thực sự không thể vừa hợp lệ vừa duy nhất từ SQL này, hãy bỏ hẳn nó khỏi mảng kết quả thay vì đoán bừa.

SQL gốc:
\`\`\`sql
${sql}
\`\`\`

Các đề xuất cần sửa:
${invalid.map((p, i) => `${i + 1}. issue: ${p.issue || '(không có)'} | find cũ (occurrences=${p.occurrences}): ${JSON.stringify(p.find)}`).join('\n')}

Chỉ trả về một đối tượng JSON với đúng khóa sau:
{"proposals": [{"id": "id ngắn", "location": "mệnh đề và biểu thức bị ảnh hưởng", "issue": "anti-pattern cụ thể", "reason": "vì sao gây tốn chi phí hoặc rủi ro", "recommendation": "thay đổi cục bộ này thực hiện gì", "find": "đoạn SQL chính xác và duy nhất từ bản gốc", "replace": "đoạn SQL thay thế", "semantic_impact": "vì sao số dòng, cột, join và aggregate không thay đổi"}]}`,
};

export interface RepairProposalsOptions {
  /** The exact current editor SQL every proposal's `find` must match against. */
  sql: string;
  proposals: SqlOptimizationProposal[];
  config: AIModelConfig;
  locale?: Locale;
  signal?: AbortSignal;
}

export interface RepairProposalsResult {
  /** Already-valid proposals plus any successfully repaired ones, in no particular order. */
  proposals: SqlOptimizationProposal[];
  /** Proposals that were invalid and could not be repaired — dropped rather than shown, since an
   * unresolvable `find` can never be applied safely. */
  droppedCount: number;
}

/**
 * Validates every proposal's `find` against the exact current SQL (must match exactly once) and,
 * for any that don't, asks the model to re-derive just those — using the original issue/reason as
 * context so the fix's intent survives the correction. Proposals still invalid after this single
 * repair pass (or if the repair call itself fails) are dropped rather than shown, so the UI never
 * offers an "Apply" button that is guaranteed to fail. Streams the model's raw answer through
 * `onDelta` as it arrives, same as the main optimize call, so the UI never looks frozen while
 * this second pass runs.
 */
export async function repairInvalidProposals(
  { sql, proposals, config, locale = 'en', signal }: RepairProposalsOptions,
  onDelta: (text: string) => void = () => {}
): Promise<RepairProposalsResult> {
  const validProposals = proposals.filter((proposal) => isProposalApplicable(sql, proposal));
  const invalidProposals = proposals.filter((proposal) => !isProposalApplicable(sql, proposal));

  if (invalidProposals.length === 0) {
    return { proposals: validProposals, droppedCount: 0 };
  }

  const buildPrompt = REPAIR_PROPOSALS_PROMPT[locale] ?? REPAIR_PROPOSALS_PROMPT.en;
  const budget = resolveBudget(config);
  const fitted = truncateSqlForBudget(sql, Math.max(128, Math.floor(budget.promptTokens * 0.6)));
  const prompt = buildPrompt(
    fitted.sql,
    invalidProposals.map((proposal) => ({
      issue: proposal.issue,
      find: proposal.find,
      occurrences: countExactOccurrences(sql, proposal.find),
    }))
  );

  try {
    const raw = (
      await streamWithAI(
        config,
        {
          prompt,
          jsonMode: true,
          maxTokens: budget.maxOutputTokens,
          signal,
        },
        onDelta
      )
    ).trim();

    const parsed = extractJsonObject(raw) as Record<string, unknown> | null;
    const rawRepaired = Array.isArray(parsed?.proposals) ? parsed!.proposals : [];
    const repaired = rawRepaired.flatMap((proposal, index) => {
      if (!proposal || typeof proposal !== 'object') return [];
      const entry = proposal as Record<string, unknown>;
      const find = asExactText(entry.find);
      const replace = asExactText(entry.replace);
      if (!find || !replace || find === replace) return [];
      if (countExactOccurrences(sql, find) !== 1) return []; // still invalid — drop, don't guess
      return [
        {
          id: asText(entry.id) || `repaired-proposal-${index + 1}`,
          location: dropPlaceholderEcho(asText(entry.location)),
          issue: dropPlaceholderEcho(asText(entry.issue)),
          reason: dropPlaceholderEcho(asText(entry.reason)),
          recommendation: dropPlaceholderEcho(asText(entry.recommendation)),
          find,
          replace,
          semanticImpact: dropPlaceholderEcho(asText(entry.semantic_impact)),
        },
      ];
    });

    return {
      proposals: [...validProposals, ...repaired],
      droppedCount: invalidProposals.length - repaired.length,
    };
  } catch {
    // Repair call itself failed (network/abort/parse) — fall back to dropping the invalid ones
    // rather than surfacing proposals that are already known not to apply.
    return { proposals: validProposals, droppedCount: invalidProposals.length };
  }
}

const FOLLOW_UP_SYSTEM_PROMPT: Record<Locale, string> = {
  en: 'You are a SQL expert answering any question about one specific query. Explain the query’s intent, fields, expressions, filters, joins, returned data, and likely business impact in plain language suitable for non-technical staff. Stay grounded in the SQL and verified parser facts. Clearly distinguish what the query proves from a reasonable inference, and say when an exact business definition or answer is not present. Give detail when the question calls for it; otherwise be concise.',
  vi: 'Bạn là chuyên gia SQL đang trả lời mọi câu hỏi về một truy vấn cụ thể. Hãy giải thích mục đích, field, biểu thức, điều kiện, phép nối, dữ liệu trả về và tác động nghiệp vụ có thể suy ra từ truy vấn bằng tiếng Việt dễ hiểu cho cả người không chuyên. Chỉ dựa trên SQL và các dữ kiện đã được parser xác thực. Phân biệt rõ điều truy vấn chứng minh được với suy luận hợp lý, và nói rõ khi truy vấn không có định nghĩa nghiệp vụ hoặc câu trả lời chính xác. Trả lời chi tiết khi câu hỏi cần; các trường hợp khác giữ ngắn gọn.',
};

export interface FollowUpOptions {
  question: string;
  sql: string;
  config: AIModelConfig;
  locale?: Locale;
  contextBrief?: string;
  /** Prior turns of this conversation, oldest first. Trimmed to fit the context window. */
  history?: AIMessage[];
  signal?: AbortSignal;
}

export interface FollowUpAnswer {
  answer: string;
  budget: AIBudgetReport;
}

/**
 * Multi-turn follow-up about the query being explained. The query is pinned into the first
 * turn so it survives history trimming, then older exchanges are dropped oldest-first once
 * the conversation outgrows the context window.
 */
export async function askFollowUp({
  question,
  sql,
  config,
  locale = 'en',
  contextBrief = '',
  history = [],
  signal,
}: FollowUpOptions): Promise<FollowUpAnswer> {
  if (!question.trim()) throw new AIServiceError('There is no question to ask.');

  const budget = resolveBudget(config);
  const systemPrompt = `${FOLLOW_UP_SYSTEM_PROMPT[locale] ?? FOLLOW_UP_SYSTEM_PROMPT.en}`;
  const available = Math.max(128, budget.promptTokens - estimateTokens(systemPrompt));

  // Reserve room for the query anchor first: without it later turns lose their subject.
  const historyBudget = Math.floor(available * HISTORY_BUDGET_RATIO);
  const anchorBudget = Math.max(128, available - historyBudget - estimateTokens(question) - 120);

  const brief = fitContextBrief(contextBrief, Math.floor(anchorBudget * CONTEXT_BRIEF_BUDGET_RATIO));
  const fitted = truncateSqlForBudget(sql, Math.max(128, anchorBudget - estimateTokens(brief)));

  const anchor: AIMessage = {
    role: 'user',
    content: [
      'This conversation is about the following SQL query.',
      '```sql',
      fitted.sql,
      '```',
      brief,
    ]
      .filter(Boolean)
      .join('\n'),
  };

  const trimmed = trimMessagesForBudget(
    [...history, { role: 'user' as const, content: question }],
    historyBudget
  );

  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
    anchor,
    { role: 'assistant', content: 'Understood. Ask me anything about this query.' },
    ...trimmed.messages,
  ];

  const answer = (
    await generateWithAI(config, { messages, maxTokens: budget.maxOutputTokens, signal })
  ).trim();

  if (!answer) throw new AIServiceError('The model returned an empty answer. Try asking again.');

  return {
    answer,
    budget: {
      contextTokens: budget.contextTokens,
      promptBudgetTokens: budget.promptTokens,
      estimatedPromptTokens:
        estimateTokens(systemPrompt) + estimateTokens(anchor.content) + trimmed.estimatedTokens,
      sqlTruncated: fitted.truncated,
      omittedSqlLines: fitted.omittedLines,
      droppedMessages: trimmed.droppedMessages,
      contextBriefDropped: Boolean(contextBrief) && !brief,
    },
  };
}

const DOCS_CONSULTANT_SYSTEM_PROMPT: Record<Locale, string> = {
  en: "You are the SQL Visualizer documentation assistant. Answer only about the app's existing features using the retrieved documentation below. Treat the retrieved documentation as relevant and synthesize its direct answer. Answer in English, with at most three short sentences. Do not add unrelated features, generic database advice, alternatives, or follow-up questions.",
  vi: 'Bạn là trợ lý tài liệu của SQL Visualizer. Chỉ trả lời về các tính năng hiện có của ứng dụng dựa vào tài liệu được truy xuất bên dưới. Hãy coi tài liệu được truy xuất là liên quan và diễn giải câu trả lời trực tiếp. Trả lời bằng tiếng Việt, tối đa ba câu ngắn. Không thêm tính năng không liên quan, lời khuyên cơ sở dữ liệu chung, phương án thay thế hoặc câu hỏi tiếp theo.',
};

const DOCS_CONSULTANT_NO_CONTEXT_PROMPT: Record<Locale, string> = {
  en: 'The current SQL Visualizer documentation does not cover this.',
  vi: 'Tài liệu SQL Visualizer hiện tại chưa đề cập nội dung này.',
};

export interface DocSource {
  title: string;
  file: string;
}

interface DocsContextResponse {
  context: string;
  sources: DocSource[];
}

export interface DocsConsultantOptions {
  question: string;
  config: AIModelConfig;
  locale?: Locale;
  signal?: AbortSignal;
}

export interface DocsConsultantAnswer {
  answer: string;
  sources: DocSource[];
}

/** Retrieval step: embeds the question server-side and returns the closest doc chunks as context. */
async function fetchDocsContext(question: string, signal?: AbortSignal): Promise<DocsContextResponse> {
  const response = await safeFetch(
    '/api/ai/docs-context',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({ question }),
    },
    'Unable to reach the app server to search the documentation.'
  );

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new AIServiceError(data?.error || `Documentation search failed (${response.status}).`);
  }
  return { context: data?.context ?? '', sources: data?.sources ?? [] };
}

function buildDocsConsultantMessages(
  question: string,
  context: string,
  locale: Locale
): AIMessage[] {
  const basePrompt = DOCS_CONSULTANT_SYSTEM_PROMPT[locale] ?? DOCS_CONSULTANT_SYSTEM_PROMPT.en;
  const noContextPrompt =
    DOCS_CONSULTANT_NO_CONTEXT_PROMPT[locale] ?? DOCS_CONSULTANT_NO_CONTEXT_PROMPT.en;
  return [
    {
      role: 'system',
      content: context ? `${basePrompt}\n\nRetrieved documentation:\n${context}` : noContextPrompt,
    },
    // Keep the user message free of retrieved content: Ollama receives exactly the typed question.
    { role: 'user', content: question },
  ];
}

/**
 * RAG loop for the Docs Consultant chat: embed the question, retrieve the closest feature-doc
 * chunks, then hand that context to whichever provider the user has configured — mirrors
 * {@link askFollowUp}'s shape but anchors on retrieved documentation instead of a pasted SQL query.
 */
export async function askDocsConsultant({
  question,
  config,
  locale = 'en',
  signal,
}: DocsConsultantOptions): Promise<DocsConsultantAnswer> {
  if (!question.trim()) throw new AIServiceError('There is no question to ask.');

  const { context, sources } = await fetchDocsContext(question, signal);
  const messages = buildDocsConsultantMessages(question, context, locale);

  const budget = resolveBudget(config);
  const answer = (
    await generateWithAI(config, { messages, maxTokens: budget.maxOutputTokens, signal })
  ).trim();

  if (!answer) throw new AIServiceError('The model returned an empty answer. Try asking again.');

  return { answer, sources };
}

/** Streaming counterpart of {@link askDocsConsultant}: same retrieval + prompt, but calls
 *  `onDelta` with each text fragment as it streams in instead of waiting for the full answer. */
export async function streamDocsConsultant(
  { question, config, locale = 'en', signal }: DocsConsultantOptions,
  onDelta: (text: string) => void
): Promise<DocsConsultantAnswer> {
  if (!question.trim()) throw new AIServiceError('There is no question to ask.');

  const { context, sources } = await fetchDocsContext(question, signal);
  const messages = buildDocsConsultantMessages(question, context, locale);

  const budget = resolveBudget(config);
  const answer = (
    await streamWithAI(config, { messages, maxTokens: budget.maxOutputTokens, signal }, onDelta)
  ).trim();

  if (!answer) throw new AIServiceError('The model returned an empty answer. Try asking again.');

  return { answer, sources };
}

/** Convenience wrapper for a free-form (unstructured) SQL explanation. */
export async function explainSqlWithAI(
  sql: string,
  config: AIModelConfig,
  locale: Locale = 'en'
): Promise<string> {
  const buildPrompt = EXPLAIN_SQL_PROMPT[locale] ?? EXPLAIN_SQL_PROMPT.en;
  return generateWithAI(config, { prompt: buildPrompt(sql) });
}
