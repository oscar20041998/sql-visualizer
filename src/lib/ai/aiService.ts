// Adapter layer routing AI generation requests to the active provider (Ollama or a cloud API).
import type { AIModelConfig } from '../store';
import type { Locale } from '../i18n';
import {
  DEFAULT_CONTEXT_TOKENS,
  DEFAULT_MAX_OUTPUT_TOKENS,
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

/** Asks for a JSON payload so the UI can render objective / constraints / output as separate sections. */
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
  "tables": ["names of the tables or CTEs the query reads"]
}

Rules:
- Avoid SQL keywords in "objective" and "output"; describe the meaning instead.
- Expand technical expressions: DATE_SUB(NOW(), INTERVAL 30 DAY) becomes "the last 30 days", active = 1 becomes "only active accounts".
- Use an empty array when the query has no filters and no tables.`,
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
  "tables": ["tên các bảng hoặc CTE mà truy vấn đọc dữ liệu"]
}

Quy tắc:
- Tránh dùng từ khóa SQL trong "objective" và "output"; hãy diễn giải ý nghĩa.
- Diễn giải biểu thức kỹ thuật: DATE_SUB(NOW(), INTERVAL 30 DAY) thành "30 ngày gần nhất", active = 1 thành "chỉ các tài khoản đang hoạt động".
- Dùng mảng rỗng khi truy vấn không có điều kiện lọc hoặc không đọc bảng nào.`,
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
async function safeFetch(url: string, init: RequestInit, unreachableMessage: string): Promise<Response> {
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
  temperature: number;
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
    `Unable to reach Ollama server at ${url}. Ensure Ollama is running (ollama serve) and reachable from the browser.`
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
    `Unable to reach Ollama server at ${url}. Ensure Ollama is running (ollama serve) and reachable from the browser.`
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

/** Pulls the JSON object out of an answer that may be fenced or padded with prose. */
function extractJsonObject(text: string): unknown {
  const withoutFence = text.replace(/```(?:json)?/gi, '').trim();
  const start = withoutFence.indexOf('{');
  const end = withoutFence.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(withoutFence.slice(start, end + 1));
  } catch {
    return null;
  }
}

function asText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(' ');
  return '';
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
  signal?: AbortSignal;
}

export interface SqlOptimizationResult {
  optimizedSql: string;
  analysis: string;
  suggestions: string[];
  raw: string;
  structured: boolean;
  budget: AIBudgetReport;
}

const OPTIMIZE_SQL_STRUCTURED_PROMPT: Record<Locale, (sql: string) => string> = {
  en: (sql) => `Optimize the following SQL query for performance. Fix ONLY the specific issues listed below the query under "Linting alerts" (if that section is present) — every other clause, alias, formatting choice, and ordering must stay character-for-character identical to the original. Do not perform a general rewrite.

Return only a JSON object with exactly these keys, in this order:
{
  "analysis": "a short summary of what you changed and why, naming the specific issue(s) fixed",
  "suggestions": ["one specific improvement per issue actually fixed"],
  "optimized_sql": "the full SQL query with only the necessary changes applied"
}

SQL:
\`\`\`sql
${sql}
\`\`\`

Rules:
- If a "Linting alerts" section is provided above, only touch the clause(s) needed to resolve those specific alerts. Leave every unrelated part of the query untouched.
- If no linting alerts are provided, apply only the smallest set of high-confidence performance fixes and leave the rest of the query untouched.
- Do not change business logic or result semantics.
- Do not remove or add tables, columns, joins, filters, or grouping unless the same result set is preserved.
- Do not change NULL handling or DISTINCT semantics.
- Do not reformat, rename aliases, or reorder clauses that are not part of a fix.
- If the query has no fixable issues, return it unchanged and explain why in "analysis".`,
  vi: (sql) => `Tối ưu hóa truy vấn SQL sau đây về hiệu suất. CHỈ sửa những vấn đề cụ thể được liệt kê bên dưới truy vấn trong phần "Linting alerts" (nếu có) — mọi mệnh đề, bí danh, cách định dạng và thứ tự khác phải giữ nguyên tuyệt đối so với bản gốc. Không viết lại toàn bộ.

Chỉ trả về một đối tượng JSON với đúng các khóa sau, theo đúng thứ tự này:
{
  "analysis": "tóm tắt ngắn gọn những gì bạn đã thay đổi và lý do, nêu rõ (các) vấn đề đã sửa",
  "suggestions": ["mỗi cải tiến cụ thể tương ứng với từng vấn đề đã thực sự được sửa"],
  "optimized_sql": "toàn bộ truy vấn SQL với chỉ những thay đổi cần thiết được áp dụng"
}

SQL:
\`\`\`sql
${sql}
\`\`\`

Quy tắc:
- Nếu có phần "Linting alerts" ở trên, chỉ chạm vào (các) mệnh đề cần thiết để khắc phục những cảnh báo đó. Giữ nguyên mọi phần không liên quan.
- Nếu không có cảnh báo linting nào được cung cấp, chỉ áp dụng tập hợp nhỏ nhất các cải tiến hiệu suất đáng tin cậy và giữ nguyên phần còn lại.
- Không thay đổi logic nghiệp vụ hoặc ngữ nghĩa kết quả.
- Không loại bỏ hoặc thêm bảng, cột, phép nối, bộ lọc hoặc nhóm trừ khi vẫn giữ nguyên tập kết quả.
- Không thay đổi cách xử lý NULL hoặc ngữ nghĩa DISTINCT.
- Không định dạng lại, đổi tên bí danh, hay sắp xếp lại các mệnh đề không thuộc phần cần sửa.
- Nếu truy vấn không có vấn đề nào cần sửa, trả lại chính nó và giải thích lý do trong "analysis".`,
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
  contextBrief: string
): { prompt: string; report: AIBudgetReport; maxOutputTokens: number } {
  if (!sql.trim()) throw new AIServiceError('There is no SQL query to optimize.');

  const budget = resolveBudget(config);
  const systemTokens = estimateTokens(resolveSystemPrompt(config, {}) ?? '');
  const available = Math.max(128, budget.promptTokens - systemTokens);

  const brief = fitContextBrief(contextBrief, Math.floor(available * CONTEXT_BRIEF_BUDGET_RATIO));
  const briefTokens = estimateTokens(brief);
  const fitted = truncateSqlForBudget(sql, Math.max(128, available - briefTokens - 220));

  const buildPrompt = OPTIMIZE_SQL_STRUCTURED_PROMPT[locale] ?? OPTIMIZE_SQL_STRUCTURED_PROMPT.en;
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

/** Turns the model's raw answer into a {@link SqlOptimizationResult}, shared by both optimize calls. */
function parseSqlOptimization(sql: string, raw: string, report: AIBudgetReport): SqlOptimizationResult {
  if (!raw) throw new AIServiceError('The model returned an empty response. Try running it again.');

  const parsed = extractJsonObject(raw) as Record<string, unknown> | null;
  const optimizedSql = asText(parsed?.optimized_sql);
  const analysis = asText(parsed?.analysis);
  const suggestions = asList(parsed?.suggestions);

  if (!parsed || !optimizedSql) {
    return {
      optimizedSql: sql,
      analysis: raw,
      suggestions: [],
      raw,
      structured: false,
      budget: report,
    };
  }

  return {
    optimizedSql: optimizedSql || sql,
    analysis,
    suggestions,
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
  signal,
}: ExplainSqlOptions): Promise<SqlOptimizationResult> {
  const { prompt, report, maxOutputTokens } = prepareOptimizePrompt(sql, config, locale, contextBrief);

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
  { sql, config, locale = 'en', contextBrief = '', signal }: ExplainSqlOptions,
  onDelta: (text: string) => void
): Promise<SqlOptimizationResult> {
  const { prompt, report, maxOutputTokens } = prepareOptimizePrompt(sql, config, locale, contextBrief);

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

const FOLLOW_UP_SYSTEM_PROMPT: Record<Locale, string> = {
  en: 'You are a SQL expert answering follow-up questions about one specific query. Answer in plain language, stay grounded in the query and the verified parser facts, and say plainly when the query does not contain the answer. Be concise: a few sentences unless asked for detail.',
  vi: 'Bạn là chuyên gia SQL đang trả lời các câu hỏi tiếp theo về một truy vấn cụ thể. Hãy trả lời bằng tiếng Việt, ngôn ngữ đơn giản, chỉ dựa trên truy vấn và các dữ kiện đã được parser xác thực, và nói rõ khi truy vấn không chứa câu trả lời. Ngắn gọn: vài câu, trừ khi được yêu cầu chi tiết.',
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

/** Convenience wrapper for a free-form (unstructured) SQL explanation. */
export async function explainSqlWithAI(
  sql: string,
  config: AIModelConfig,
  locale: Locale = 'en'
): Promise<string> {
  const buildPrompt = EXPLAIN_SQL_PROMPT[locale] ?? EXPLAIN_SQL_PROMPT.en;
  return generateWithAI(config, { prompt: buildPrompt(sql) });
}
