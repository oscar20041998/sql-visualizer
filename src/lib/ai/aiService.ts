// Adapter layer routing AI generation requests to the active provider (Ollama or a cloud API).
import type { AIModelConfig } from '../store';
import type { Locale } from '../i18n';
import type { AnalysisResult } from '../sql/sqlAnalyzer';
import {
  DEFAULT_CHAT_MODELS,
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
import { getCapability, isLockedForGuest } from '../capabilities';
import { isGuestSession } from '../demoAuth';
import { localizedPromptId, renderPrompt } from './prompts/render';
import {
  SQL_EXPLAINER_PROMPTS,
  explainCteParams,
  explainSqlParams,
  explainSqlStructuredParams,
} from './prompts/templates/sqlExplainer';
import { SEMANTIC_BRIEF_PROMPTS, semanticBriefParams } from './prompts/templates/semanticBrief';
import { OPTIMIZE_PROMPTS, optimizeSqlStructuredParams } from './prompts/templates/optimize';
import { REQUIREMENT_PROMPTS, requirementCandidateParams } from './prompts/templates/requirement';
import { REPAIR_PROMPTS, repairProposalsParams } from './prompts/templates/repair';
import { FOLLOW_UP_PROMPTS } from './prompts/templates/followUp';
import {
  DOCS_CONSULTANT_PROMPTS,
  docsConsultantNoContextParams,
  docsConsultantSystemParams,
} from './prompts/templates/docsConsultant';

export type { CloudProvider };

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

/** Validated result of one Explain run: the five-section payload plus fallback and budget info. */
export interface SqlExplanation {
  /** The five-section payload in contract key order (FR-001). */
  sections: ExplainerSections;
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

function resolveSystemPrompt(
  config: AIModelConfig,
  request: AIGenerateRequest
): string | undefined {
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

/**
 * The server's refusal marker (see `refusalBody` in sessionCookie.ts). The route answers a refused
 * caller with this code so the client can tell "you need an account" apart from a malformed request.
 */
const SESSION_REQUIRED_CODE = 'AI_SESSION_REQUIRED';

/**
 * Whether a failed response is the session gate rather than a genuine failure.
 *
 * This is the second line of defence, not the first: a guest is normally blocked before any request
 * is made. It matters for the cases the early check cannot cover — a session that expired, a cookie
 * that stopped verifying, or client state that disagrees with the server. Without it those surface as
 * an opaque "HTTP 401" and the user concludes the feature is broken (FR-014).
 */
export function isSessionRequiredResponse(status: number, payload: unknown): boolean {
  if (status !== 401) return false;
  return (
    typeof payload === 'object' &&
    payload !== null &&
    (payload as { code?: unknown }).code === SESSION_REQUIRED_CODE
  );
}

/** Wraps fetch so network failures become AIServiceError while aborts stay recognizable to callers. */
export async function safeFetch(
  url: string,
  init: RequestInit,
  unreachableMessage: string
): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error;
    throw new AIServiceError(unreachableMessage);
  }
}

/**
 * Reads a failed response, preferring the session refusal over the route's generic message.
 *
 * Always throws, so the caller cannot forget to handle it.
 */
export async function readFailure(response: Response, fallbackMessage: string): Promise<never> {
  const payload = await response.json().catch(() => null);
  if (isSessionRequiredResponse(response.status, payload)) {
    throw new GuestNotEntitledError();
  }
  const detail = (payload as { error?: unknown } | null)?.error;
  throw new AIServiceError(typeof detail === 'string' && detail.trim() ? detail : fallbackMessage);
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
  aiportal: '/jpe/responses',
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
    throw new AIServiceError(
      `Ollama request failed (${response.status}): ${detail || response.statusText}`
    );
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
async function consumeOpenAiDeltaStream(
  response: Response,
  onDelta: (text: string) => void
): Promise<string> {
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
    throw new AIServiceError(
      `Ollama request failed (${response.status}): ${detail || response.statusText}`
    );
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
        ...openAiTokenLimit(modelId, call.maxTokens),
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

function openAiTokenLimit(modelId: string, maxTokens?: number): Record<string, number> {
  if (!maxTokens) return {};
  return modelId.toLowerCase().startsWith('gpt-5')
    ? { max_completion_tokens: maxTokens }
    : { max_tokens: maxTokens };
}

function responsesRequestBody(modelId: string, call: ProviderCall, stream = false) {
  return {
    model: modelId,
    input: call.messages.map(({ role, content }) => ({ role, content })),
    ...(call.maxTokens ? { max_output_tokens: call.maxTokens } : {}),
    ...(call.jsonMode ? { text: { format: { type: 'json_object' } } } : {}),
    ...(stream ? { stream: true } : {}),
  };
}

function extractResponsesText(payload: {
  output_text?: unknown;
  output?: Array<{ content?: Array<{ type?: string; text?: unknown }> }>;
}): string {
  if (typeof payload.output_text === 'string') return payload.output_text;
  return (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === 'output_text' && typeof part.text === 'string')
    .map((part) => part.text as string)
    .join('');
}

async function callAIPortalResponses(
  apiKey: string,
  modelId: string,
  baseUrl: string,
  call: ProviderCall
): Promise<string> {
  const response = await safeFetch(
    resolveProviderUrl('aiportal', baseUrl),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: call.signal,
      body: JSON.stringify(responsesRequestBody(modelId, call)),
    },
    'Unable to reach AI Portal API. Check the server network connection.'
  );

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    const error = detail?.error;
    const message = typeof error === 'string' ? error : error?.message;
    throw new AIServiceError(
      `AI Portal request failed (${response.status}): ${message || response.statusText}`
    );
  }

  return extractResponsesText(await response.json());
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
  return (data.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? '')
    .join('');
}

/**
 * Direct call to a local Ollama server's embeddings endpoint (no credential needed). Exported
 * (not just used via {@link embedWithAI}) so server-only routes can embed with a specific model
 * that isn't the user's configured chat/embedding provider — e.g. the Database AI Assistant's
 * RAG index, which was built with a fixed local model regardless of AIModelConfig.
 */
export async function callOllamaEmbed(
  baseUrlRaw: string,
  model: string,
  text: string,
  signal?: AbortSignal
): Promise<number[]> {
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
      throw new AIServiceError(
        'Anthropic has no embeddings API. Choose Ollama, OpenAI, or Gemini for this feature.'
      );
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
export async function embedWithAI(
  config: AIModelConfig,
  text: string,
  signal?: AbortSignal
): Promise<number[]> {
  assertGuestEntitled(config, 'ai-embedding');
  if (config.provider === 'ollama') {
    return callOllamaEmbed(
      config.baseUrls?.ollama ?? '',
      DEFAULT_EMBEDDING_MODELS.ollama,
      text,
      signal
    );
  }
  if (config.provider === 'anthropic') {
    throw new AIServiceError(
      'Anthropic has no embeddings API. Switch to Ollama, OpenAI, or Gemini in Settings to use semantic search.'
    );
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
  if (!Array.isArray(embedding))
    throw new AIServiceError('The server returned no embedding vector.');
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
  return SSE_ENCODER.encode(
    `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`
  );
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
        ...openAiTokenLimit(modelId, call.maxTokens),
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

async function callAIPortalResponsesStream(
  apiKey: string,
  modelId: string,
  baseUrl: string,
  call: ProviderCall
): Promise<ReadableStream<Uint8Array>> {
  const response = await safeFetch(
    resolveProviderUrl('aiportal', baseUrl),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: call.signal,
      body: JSON.stringify(responsesRequestBody(modelId, call, true)),
    },
    'Unable to reach AI Portal API. Check the server network connection.'
  );

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    const error = detail?.error;
    const message = typeof error === 'string' ? error : error?.message;
    throw new AIServiceError(
      `AI Portal request failed (${response.status}): ${message || response.statusText}`
    );
  }
  if (!response.body) return emptyByteStream();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await pumpSseFrames(response.body!, (event, data) => {
          if (data === '[DONE]') return;
          const payload = JSON.parse(data);
          const type = payload.type ?? event;
          if (type === 'response.output_text.delta' && typeof payload.delta === 'string') {
            controller.enqueue(encodeDeltaChunk(payload.delta));
          } else if (type === 'response.failed' || type === 'error') {
            const message =
              payload.error?.message ?? payload.response?.error?.message ?? payload.message;
            throw new AIServiceError(message || 'AI Portal streaming request failed.');
          }
        });
        controller.enqueue(SSE_DONE_CHUNK);
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
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
    case 'aiportal':
      return callAIPortalResponses(apiKey, modelId, baseUrl, call);
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
    case 'aiportal':
      return callAIPortalResponsesStream(apiKey, modelId, baseUrl, call);
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
async function callCloudViaProxy(
  config: AIModelConfig,
  request: AIGenerateRequest
): Promise<string> {
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

// ─── Guest entitlement (specs/013-guest-access-mode) ────────────────────────────
// A guest may use AI running on their own machine but not the operator's shared cloud capacity.
// This is the single seam every AI call site funnels through, so a new feature cannot reach a
// cloud provider while a guest is signed in by accident. The server refuses independently
// (see src/app/api/ai/*); this is the early, friendly failure that avoids a wasted round trip
// and lets the interface show the locked explanation instead of a generic error (FR-011, FR-013).

/** Thrown when a guest attempts a capability that needs the operator's capacity. */
export class GuestNotEntitledError extends AIServiceError {
  constructor() {
    super('This AI feature requires an account. Sign in to unlock it.');
    this.name = 'GuestNotEntitledError';
  }
}

function assertGuestEntitled(config: AIModelConfig, capabilityId: string): void {
  if (typeof window === 'undefined') return; // Server-side: the route guard already refused.
  if (!isGuestSession()) return;
  const capability = getCapability(capabilityId);
  // An unknown id must not silently allow a request; treat it as shared so the server still decides.
  if (!capability) return;
  // No early exit for a local provider: ollama is the default, so allowing it would leave nearly
  // every AI feature open to a guest (see isLockedForGuest).
  if (isLockedForGuest(capability, config)) {
    throw new GuestNotEntitledError();
  }
}

/**
 * The model actually sent to the provider.
 *
 * A config written before the per-provider defaults existed — or one whose model was cleared — would
 * otherwise reach the provider as an empty string and fail with an opaque 404. Falling back to the
 * curated default keeps the Chatbot and the Database AI Assistant working without a settings visit.
 */
function resolveModel(config: AIModelConfig): string {
  const model =
    config.provider === 'ollama'
      ? config.ollamaModel
      : config.modelId || DEFAULT_CHAT_MODELS[config.provider];
  return model.trim() || DEFAULT_CHAT_MODELS[config.provider];
}

/** Routes a generation request to the provider configured in AIModelConfig. */
export async function generateWithAI(
  config: AIModelConfig,
  request: AIGenerateRequest
): Promise<string> {
  assertGuestEntitled(config, 'ai-generation');
  if (config.provider === 'ollama') {
    return callOllama(
      config.baseUrls?.ollama ?? '',
      resolveModel(config),
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
  assertGuestEntitled(config, 'ai-generation');
  if (config.provider === 'ollama') {
    return callOllamaStream(
      config.baseUrls?.ollama ?? '',
      resolveModel(config),
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
/** Explain favors parser facts more than other AI operations, without sacrificing fitting SQL. */
const EXPLAIN_CONTEXT_BRIEF_BUDGET_RATIO = 0.4;

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
   * Parser-identified table and CTE names, used to ground the explanation's data sources
   * (FR-010, Constitution IV). When provided, every returned data source must match one of
   * these names; a mismatch marks the payload unstructured. Optional — when absent, the
   * grounding check is skipped.
   */
  knownSources?: string[];
  /**
   * Free-form optimization goal typed by the user (e.g. "avoid a full table scan"). Optional —
   * when absent, the semantic-brief/optimize prompts behave exactly as before (lint-driven only).
   * When present, the model must still refuse any part of the request that would change the
   * query's result semantics rather than silently applying it (see SqlOptimizationResult.instructionStatus).
   */
  userInstruction?: string;
  signal?: AbortSignal;
}

/** Input for a text-only explanation of one CTE and its direct inputs. */
export interface ExplainCteOptions {
  cteName: string;
  cteSql: string;
  dependencyContext?: string;
  config: AIModelConfig;
  locale?: Locale;
  signal?: AbortSignal;
}

/** A user-readable CTE explanation; raw provider output is retained only for diagnostics. */
export interface CteExplanation {
  text: string;
  raw: string;
  /** True when a provider ignored the text-only request and returned JSON we converted to prose. */
  usedJsonFallback: boolean;
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

  const rendered = renderPrompt(
    localizedPromptId(SEMANTIC_BRIEF_PROMPTS.brief, locale),
    semanticBriefParams(fitted.sql, userInstruction, locale)
  )[0].content;
  const prompt = brief ? `${brief}\n\n${rendered}` : rendered;

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

export function formatSemanticBriefForOptimizePrompt(
  brief: SqlSemanticBrief,
  locale: Locale = 'en'
): string {
  if (!brief.structured) return '';
  const truncate = (text: string) =>
    text.length > MAX_SEMANTIC_CONSTRAINT_LINE_CHARS
      ? `${text.slice(0, MAX_SEMANTIC_CONSTRAINT_LINE_CHARS)}…`
      : text;

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

  const structuredExplainId = localizedPromptId(SQL_EXPLAINER_PROMPTS.explainSqlStructured, locale);
  const promptOverhead = estimateTokens(
    renderPrompt(structuredExplainId, explainSqlStructuredParams(''))[0].content
  );
  const contentBudget = Math.max(128, available - promptOverhead);
  const briefBudget = Math.floor(contentBudget * EXPLAIN_CONTEXT_BRIEF_BUDGET_RATIO);
  const sqlTokens = estimateTokens(sql);
  const sqlBudget =
    sqlTokens <= contentBudget ? sqlTokens : Math.max(128, contentBudget - briefBudget);
  const fitted = truncateSqlForBudget(sql, sqlBudget);
  const remainingBriefBudget = Math.max(0, contentBudget - estimateTokens(fitted.sql));
  const brief = fitContextBrief(contextBrief, Math.min(briefBudget, remainingBriefBudget), {
    truncate: true,
  });
  const rendered = renderPrompt(structuredExplainId, explainSqlStructuredParams(fitted.sql))[0]
    .content;
  const prompt = brief ? `${brief}\n\n${rendered}` : rendered;

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

/** One named condition group inside Filters & Constraints (FR-005). */
export interface ExplainerFilterCategory {
  category: string;
  items: string[];
}

/** One table or CTE read by the query, paired with its business purpose (FR-006). */
export interface ExplainerDataSource {
  name: string;
  purpose: string;
}

/** The validated five-section payload of one Explain run, in contract key order. */
export interface ExplainerSections {
  query_objective: string;
  result_bullets: string[];
  report_grain: string;
  filter_categories: ExplainerFilterCategory[];
  data_sources: ExplainerDataSource[];
}

/** Result of validating a model answer against the explainer output contract. */
export interface ExplainerPayload {
  sections: ExplainerSections;
  raw: string;
  structured: boolean;
}

/** Fixed key order of the explainer output contract (plan Decision 1). */
const EXPLAINER_CONTRACT_KEYS = [
  'query_objective',
  'result_bullets',
  'report_grain',
  'filter_categories',
  'data_sources',
] as const;

/**
 * Validates a model answer against the five-section explainer contract
 * (`contracts/explainer-output-contract.md` rules 1–6) and returns the parsed
 * payload. Contract violations degrade to `structured: false` with the raw
 * answer preserved, so the UI can always show something (FR-011).
 *
 * When `knownSources` is provided (the parser-identified table/CTE names), every
 * payload data source must match one of them case-insensitively; a payload naming
 * a source the parser never found contradicts the parser and is unstructured
 * (FR-010, Constitution IV).
 */
export function parseExplainerPayload(raw: string, knownSources?: string[]): ExplainerPayload {
  const parsed = extractJsonObject(raw) as Record<string, unknown> | null;
  const keys = parsed ? Object.keys(parsed) : [];
  const shapeOk =
    !!parsed &&
    keys.length === EXPLAINER_CONTRACT_KEYS.length &&
    EXPLAINER_CONTRACT_KEYS.every((key, index) => keys[index] === key);
  if (!shapeOk || !parsed) {
    return {
      sections: {
        query_objective: '',
        result_bullets: [],
        report_grain: '',
        filter_categories: [],
        data_sources: [],
      },
      raw,
      structured: false,
    };
  }

  const categories = asFilterCategories(parsed.filter_categories);
  const sources = asDataSources(parsed.data_sources);
  const sections: ExplainerSections = {
    query_objective: asText(parsed.query_objective),
    result_bullets: asList(parsed.result_bullets),
    report_grain: asText(parsed.report_grain),
    filter_categories: categories ?? [],
    data_sources: sources ?? [],
  };
  const contentOk =
    sections.query_objective !== '' &&
    sections.result_bullets.length > 0 &&
    sections.report_grain !== '' &&
    categories !== null &&
    sources !== null;

  return {
    sections,
    raw,
    structured:
      contentOk && !payloadHasBannedTopic(sections) && matchesParserSources(sections, knownSources),
  };
}

/** True when every payload source name matches a parser-identified name (case-insensitive). */
function matchesParserSources(sections: ExplainerSections, knownSources?: string[]): boolean {
  if (!knownSources || knownSources.length === 0) return true;
  const known = new Set(knownSources.map((name) => name.toLowerCase()));
  return sections.data_sources.every((source) => known.has(source.name.toLowerCase()));
}

/**
 * Counts the human-readable characters of the "purpose" section (the query
 * objective) alone, whitespace-collapsed. Per the product clarification, the
 * 500–1,500 character budget applies to the objective only — the other four
 * sections are concise and not counted (FR-007).
 */
export function countObjectiveChars(sections: ExplainerSections): number {
  return sections.query_objective.replace(/\s+/g, ' ').trim().length;
}

/** True when the objective's human-readable count is within the 500–1,500 budget (FR-007; up to 1,500 for complex queries). */
export function isWithinLengthBudget(count: number): boolean {
  return count >= 500 && count <= 1500;
}

/** Parses one filter category, returning null when it violates the contract. */
function asFilterCategory(value: unknown): ExplainerFilterCategory | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const category = asText(record.category);
  const rawItems = record.items;
  if (!category || !Array.isArray(rawItems) || rawItems.length === 0) return null;
  const items = asList(rawItems);
  if (items.length === 0) return null;
  return { category, items };
}

/** Parses the filter-category array, returning null when any entry violates the contract. */
function asFilterCategories(value: unknown): ExplainerFilterCategory[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const parsed = value.map(asFilterCategory);
  return parsed.every(Boolean) ? (parsed as ExplainerFilterCategory[]) : null;
}

/** Parses one data-source entry, returning null when it violates the contract. */
function asDataSource(value: unknown): ExplainerDataSource | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const name = asText(record.name);
  const purpose = asText(record.purpose);
  if (!name || !purpose) return null;
  return { name, purpose };
}

/** Parses the data-source array, returning null when any entry violates the contract. */
function asDataSources(value: unknown): ExplainerDataSource[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const parsed = value.map(asDataSource);
  return parsed.every(Boolean) ? (parsed as ExplainerDataSource[]) : null;
}

/**
 * Word-boundary detectors for the six banned topic families (FR-008): CTE inner
 * logic, join mechanics, execution steps, calculation expressions, data lineage,
 * performance analysis. Applied to every prose field of the payload so banned
 * content degrades the whole answer to the raw fallback. Sorting is deliberately
 * NOT banned — FR-003 requires describing sorting in plain language.
 */
const BANNED_TOPIC_PATTERNS: RegExp[] = [
  /\bcte\s+(?:is\s+)?(?:built|works|reads)/i,
  /\bjoin(?:s|ed|ing)?\s+(?:with|on|to|the)\b/i,
  /\b(?:groups?|grouped|sums?|filtered?)\s+\w+/i,
  /\bsum\s*\(/i,
  /\blineage\b/i,
  /\b(?:performance|query\s+plan|index\s+scan)\b/i,
];

function containsBannedTopic(text: string): boolean {
  return BANNED_TOPIC_PATTERNS.some((pattern) => pattern.test(text));
}

/** True when any prose field of the payload carries banned-topic content. */
function payloadHasBannedTopic(sections: ExplainerSections): boolean {
  const prose: string[] = [
    sections.query_objective,
    sections.report_grain,
    ...sections.result_bullets,
    ...sections.filter_categories.flatMap((category) => [category.category, ...category.items]),
    ...sections.data_sources.map((source) => `${source.name} ${source.purpose}`),
  ];
  return prose.some(containsBannedTopic);
}

/** Turns the model's raw answer into a {@link SqlExplanation}, shared by both explain calls. */
function toSqlExplanation(
  raw: string,
  report: AIBudgetReport,
  knownSources?: string[]
): SqlExplanation {
  if (!raw) throw new AIServiceError('The model returned an empty response. Try running it again.');

  const payload = parseExplainerPayload(raw, knownSources);
  return {
    sections: payload.sections,
    raw: payload.raw,
    structured: payload.structured,
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
export async function explainSqlStructured(
  { sql, config, locale = 'en', contextBrief = '', knownSources, signal }: ExplainSqlOptions,
  generateFn: typeof generateWithAI = generateWithAI
): Promise<SqlExplanation> {
  const { prompt, report, maxOutputTokens } = prepareExplainPrompt(
    sql,
    config,
    locale,
    contextBrief
  );

  // FR-007 (per clarification): validate each attempt's human-readable length and
  // regenerate with a length-steering hint, up to 1 attempt + MAX_LENGTH_RETRIES
  // retries; after exhaustion the last attempt falls through to the caller's
  // structured/unstructured handling (U17 adds the closest-length notice).
  const MAX_LENGTH_RETRIES = 2;
  const LENGTH_STEERING_HINT =
    'The previous answer did not fit the required length for the query objective. Produce the same JSON shape with "query_objective" alone measuring between 500 and 1,500 characters: expand grounded detail when too short, summarize when too long. Keep the other sections concise.';

  let raw = '';
  let activePrompt = prompt;
  for (let attempt = 0; attempt <= MAX_LENGTH_RETRIES; attempt++) {
    raw = (
      await generateFn(config, {
        prompt: activePrompt,
        jsonMode: true,
        maxTokens: maxOutputTokens,
        signal,
      })
    ).trim();
    const payload = parseExplainerPayload(raw, knownSources);
    if (payload.structured && isWithinLengthBudget(countObjectiveChars(payload.sections))) break;
    if (attempt < MAX_LENGTH_RETRIES) activePrompt = `${prompt}\n\n${LENGTH_STEERING_HINT}`;
  }

  return toSqlExplanation(raw, report, knownSources);
}

/**
 * Streaming counterpart of {@link explainSqlStructured}: identical prompt and parsing, but
 * `onDelta` is called with each text fragment as it arrives so the UI can render the answer
 * in real time instead of waiting for the full JSON payload.
 */
export async function explainSqlStructuredStream(
  { sql, config, locale = 'en', contextBrief = '', knownSources, signal }: ExplainSqlOptions,
  onDelta: (text: string) => void
): Promise<SqlExplanation> {
  const { prompt, report, maxOutputTokens } = prepareExplainPrompt(
    sql,
    config,
    locale,
    contextBrief
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

  return toSqlExplanation(raw, report, knownSources);
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

  const rendered = renderPrompt(
    localizedPromptId(OPTIMIZE_PROMPTS.optimizeSqlStructured, locale),
    optimizeSqlStructuredParams(fitted.sql, userInstruction, locale)
  )[0].content;
  const prompt = brief ? `${brief}\n\n${rendered}` : rendered;

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
 * Schema-description phrases from the optimize template (both locales, see
 * `src/lib/ai/prompts/templates/optimize.ts`). A weak/small
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

function parseSqlOptimization(
  sql: string,
  raw: string,
  report: AIBudgetReport
): SqlOptimizationResult {
  if (!raw) throw new AIServiceError('The model returned an empty response. Try running it again.');

  const parsed = extractJsonObject(raw) as Record<string, unknown> | null;
  const optimizedSql = asText(parsed?.optimized_sql);
  const analysis = dropPlaceholderEcho(asText(parsed?.analysis));
  const suggestions = asList(parsed?.suggestions).filter(
    (item) => !OPTIMIZE_PLACEHOLDER_ECHOES.has(item.trim().toLowerCase())
  );
  const semanticImpact = dropPlaceholderEcho(asText(parsed?.semantic_impact));
  const proposals = Array.isArray(parsed?.proposals)
    ? parsed.proposals.flatMap((proposal, index) => {
        if (!proposal || typeof proposal !== 'object') return [];
        const entry = proposal as Record<string, unknown>;
        const find = asExactText(entry.find);
        const replace = asExactText(entry.replace);
        if (!find || !replace || find === replace) return [];
        return [
          {
            id: asText(entry.id) || `proposal-${index + 1}`,
            location: dropPlaceholderEcho(asText(entry.location)),
            issue: dropPlaceholderEcho(asText(entry.issue)),
            reason: dropPlaceholderEcho(asText(entry.reason)),
            recommendation: dropPlaceholderEcho(asText(entry.recommendation)),
            find,
            replace,
            semanticImpact: dropPlaceholderEcho(asText(entry.semantic_impact)),
          },
        ];
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
    instructionStatusRaw === 'applied' ||
    instructionStatusRaw === 'partial' ||
    instructionStatusRaw === 'refused'
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
  const { prompt, report, maxOutputTokens } = prepareOptimizePrompt(
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
  const { prompt, report, maxOutputTokens } = prepareOptimizePrompt(
    sql,
    config,
    locale,
    contextBrief,
    userInstruction
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
  const rendered = renderPrompt(
    localizedPromptId(REQUIREMENT_PROMPTS.candidate, locale),
    requirementCandidateParams(fitted.sql, requirementInput.text, hintedTables, locale)
  )[0].content;
  const prompt = brief ? `${brief}\n\n${rendered}` : rendered;

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
function parseRequirementCandidate(
  sql: string,
  raw: string,
  report: AIBudgetReport
): SqlRequirementCandidateResult {
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
}: ExplainSqlOptions & {
  requirementInput: RequirementInput;
}): Promise<SqlRequirementCandidateResult> {
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
  {
    sql,
    config,
    locale = 'en',
    contextBrief = '',
    requirementInput,
    signal,
  }: ExplainSqlOptions & { requirementInput: RequirementInput },
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
export function isProposalApplicable(
  sql: string,
  proposal: Pick<SqlOptimizationProposal, 'find'>
): boolean {
  return countExactOccurrences(sql, proposal.find) === 1;
}

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

  const budget = resolveBudget(config);
  const fitted = truncateSqlForBudget(sql, Math.max(128, Math.floor(budget.promptTokens * 0.6)));
  const prompt = renderPrompt(
    localizedPromptId(REPAIR_PROMPTS.proposals, locale),
    repairProposalsParams(
      fitted.sql,
      invalidProposals.map((proposal) => ({
        issue: proposal.issue,
        find: proposal.find,
        occurrences: countExactOccurrences(sql, proposal.find),
      })),
      locale
    )
  )[0].content;

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
  const systemPrompt = renderPrompt(localizedPromptId(FOLLOW_UP_PROMPTS.system, locale), {})[0]
    .content;
  const available = Math.max(128, budget.promptTokens - estimateTokens(systemPrompt));

  // Reserve room for the query anchor first: without it later turns lose their subject.
  const historyBudget = Math.floor(available * HISTORY_BUDGET_RATIO);
  const anchorBudget = Math.max(128, available - historyBudget - estimateTokens(question) - 120);

  const brief = fitContextBrief(
    contextBrief,
    Math.floor(anchorBudget * CONTEXT_BRIEF_BUDGET_RATIO)
  );
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
async function fetchDocsContext(
  question: string,
  signal?: AbortSignal
): Promise<DocsContextResponse> {
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
    // A guest is normally blocked before the request; this covers a session that expired or a
    // cookie that stopped verifying, so it shows the locked explanation rather than "HTTP 401".
    if (isSessionRequiredResponse(response.status, data)) throw new GuestNotEntitledError();
    throw new AIServiceError(data?.error || `Documentation search failed (${response.status}).`);
  }
  return { context: data?.context ?? '', sources: data?.sources ?? [] };
}

function buildDocsConsultantMessages(
  question: string,
  context: string,
  locale: Locale
): AIMessage[] {
  // The context/no-context BRANCH selects which registered entry to render; both are system
  // messages, and the retrieved-documentation heading is part of the `system` entry's own text.
  const systemMessage = context
    ? renderPrompt(
        localizedPromptId(DOCS_CONSULTANT_PROMPTS.system, locale),
        docsConsultantSystemParams(context)
      )[0]
    : renderPrompt(
        localizedPromptId(DOCS_CONSULTANT_PROMPTS.noContext, locale),
        docsConsultantNoContextParams()
      )[0];
  return [
    systemMessage,
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
  const prompt = renderPrompt(
    localizedPromptId(SQL_EXPLAINER_PROMPTS.explainSql, locale),
    explainSqlParams(sql)
  )[0].content;
  return generateWithAI(config, { prompt });
}

function readableCteJsonFallback(raw: string): string | null {
  const parsed = extractJsonObject(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const payload = parsed as Record<string, unknown>;
  const lines = [
    payload.summary,
    payload.query_objective,
    ...(Array.isArray(payload.details) ? payload.details : []),
    ...(Array.isArray(payload.result_bullets) ? payload.result_bullets : []),
    payload.report_grain,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim());

  if (lines.length === 0) {
    const collectText = (value: unknown, depth = 0): void => {
      if (depth > 3) return;
      if (typeof value === 'string' && value.trim()) {
        lines.push(value.trim());
      } else if (Array.isArray(value)) {
        value.forEach((item) => collectText(item, depth + 1));
      } else if (value && typeof value === 'object') {
        Object.values(value).forEach((item) => collectText(item, depth + 1));
      }
    };
    collectText(payload);
  }

  return lines.length ? lines.join('\n') : null;
}

/**
 * Explains one CTE without applying the full-query JSON contract. CTEs naturally describe joins,
 * aggregation, and dependencies, so forcing the full-query rules here creates false fallbacks.
 */
export async function explainCteWithAI(
  { cteName, cteSql, dependencyContext = '', config, locale = 'en', signal }: ExplainCteOptions,
  generate: typeof generateWithAI = generateWithAI
): Promise<CteExplanation> {
  if (!cteSql.trim()) throw new AIServiceError('There is no CTE SQL to explain.');

  const prompt = renderPrompt(
    localizedPromptId(SQL_EXPLAINER_PROMPTS.explainCte, locale),
    explainCteParams(cteName, cteSql, dependencyContext, locale)
  )[0].content;
  const raw = (
    await generate(config, {
      prompt,
      jsonMode: false,
      signal,
    })
  ).trim();

  if (!raw) throw new AIServiceError('The model returned an empty CTE explanation.');

  const fallback = readableCteJsonFallback(raw);
  return { text: fallback ?? raw, raw, usedJsonFallback: Boolean(fallback) };
}
