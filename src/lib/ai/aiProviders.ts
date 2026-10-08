// Provider constants shared by the browser store and the server API route.
//
// This module deliberately has no 'use client' directive. store.ts is a client module, so
// anything exported from there becomes a client reference when a server file imports it — the
// value arrives as undefined on the server. Constants both sides need must live here instead.

export type AIProvider = 'ollama' | 'openai' | 'anthropic' | 'gemini' | 'aiportal';

/** Cloud providers, whose credentials live in the server environment. */
export type CloudProvider = Exclude<AIProvider, 'ollama'>;

/**
 * Default API root per provider. The server root is stored, not the full endpoint path —
 * resolveProviderUrl appends the provider's versioned path. Overriding these is how you point
 * at an OpenAI-compatible gateway or a remote Ollama host.
 */
export const DEFAULT_BASE_URLS: Record<AIProvider, string> = {
  ollama: 'http://localhost:11434',
  openai: 'https://api.openai.com',
  anthropic: 'https://api.anthropic.com',
  gemini: 'https://generativelanguage.googleapis.com',
  aiportal: 'https://aiportalapi.stu-platform.live'
};

/** Which environment variable holds each cloud provider's credential. */
export const ENV_VAR_BY_PROVIDER: Record<CloudProvider, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
  aiportal: 'AI_PORTAL_API_KEY',
};

/**
 * Context window per provider, in tokens. These differ by two orders of magnitude, so a single
 * shared value would either throttle the cloud models or overrun a local one — hence one value
 * per provider, all persisted.
 *
 * Ollama's is deliberately conservative: the server default is commonly 4096 regardless of what
 * the model supports, and it truncates overflow silently. Raise it here only together with
 * OLLAMA_CONTEXT_LENGTH (or a Modelfile) on the server.
 */
export const DEFAULT_CONTEXT_TOKENS: Record<AIProvider, number> = {
  ollama: 4096,
  openai: 128000,
  anthropic: 200000,
  gemini: 1000000,
  aiportal: 1000000,
};

/** Tokens reserved for the answer, per provider. */
export const DEFAULT_MAX_OUTPUT_TOKENS: Record<AIProvider, number> = {
  ollama: 1200,
  openai: 4096,
  anthropic: 4096,
  gemini: 8192,
  aiportal: 8192,
};

export const CONTEXT_TOKENS_RANGE = { min: 512, max: 2000000 } as const;
export const MAX_OUTPUT_TOKENS_RANGE = { min: 128, max: 32768 } as const;

/**
 * Default chat model per provider.
 *
 * Two features generate SQL and then explain it — the Database AI Assistant and the Chatbot — so
 * the default has to be a model that is competent at both writing and reasoning over SQL. Each
 * value is pinned to a model that (a) works unauthenticated for Ollama via `ollama pull`, and
 * (b) for the cloud providers is a stable, generally-available ID rather than a preview or a
 * date-stamped alias, which are retired without notice.
 *
 * Ollama keeps its own field in the config (`ollamaModel`) because local deployments tag models
 * themselves; this map only covers `modelId`.
 */
export const DEFAULT_CHAT_MODELS: Record<AIProvider, string> = {
  ollama: 'qwen2.5-coder:3b',
  openai: 'gpt-4o',
  anthropic: 'claude-3-7-sonnet-20250219',
  gemini: 'gemini-3.8-flash',
  aiportal: 'GPT-6-Luna',
};

/**
 * Gemini models that have been shut down or withdrawn from new API keys.
 *
 * Google's `ListModels` keeps advertising these to existing callers long after they stop serving
 * requests, so they show up in the picker and only fail later with an opaque
 * "no longer available to new users" 404 — the user has to notice and repair it by hand. Filtering
 * them at the source keeps retired IDs out of the picker entirely.
 *
 * Note the shutdown message tells users to move to `gemini-3.1-pro-preview`, which is itself shut
 * down; the blocklist below follows the deprecation table rather than that advice.
 */
export const RETIRED_GEMINI_MODELS = [
  /^gemini-1\.5/,
  /^gemini-2\.0/,
  /^gemini-2\.5/,
  /^gemini-3-pro-preview/,
  /^gemini-3\.1-pro-preview/,
  /^gemini-3\.1-flash-lite-preview/,
] as const;

/**
 * Local Ollama chat model. Held separately from `DEFAULT_CHAT_MODELS.ollama` because Ollama's
 * model lives in its own config field and is written through a separate code path.
 */
export const DEFAULT_OLLAMA_MODEL = 'qwen2.5-coder:3b';

/**
 * Embedding model per provider, used by the query-history semantic search feature — it follows
 * whichever provider the user has configured for chat, so it needs one embedding model per
 * provider. Anthropic has no embeddings API, so it is intentionally excluded — callers must fall
 * back to another provider for that feature.
 */
export const DEFAULT_EMBEDDING_MODELS: Record<Exclude<AIProvider, 'anthropic'>, string> = {
  ollama: 'nomic-embed-text',
  openai: 'text-embedding-3-large',
  gemini: 'text-embedding-004',
  aiportal: 'text-embedding-3-small',
};

/**
 * Embedding model for the Docs Consultant's retrieval step, which is always OpenAI regardless of
 * the user's configured chat provider (see docs-context/route.ts) — a single constant, not a
 * per-provider map, since only OpenAI is used here.
 */
export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-large';

/**
 * Embedding model for the Database AI Assistant's RAG retrieval step (see
 * database-knowledge-context/route.ts). Always this specific local Ollama model, regardless of
 * the user's configured chat provider — the corpus (databaseKnowledge.*) was pre-embedded with
 * it, and any other model would produce vectors of the wrong dimension/space.
 */
export const DATABASE_KNOWLEDGE_EMBEDDING_MODEL = 'all-minilm';
