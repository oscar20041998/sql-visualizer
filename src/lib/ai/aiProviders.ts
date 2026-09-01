// Provider constants shared by the browser store and the server API route.
//
// This module deliberately has no 'use client' directive. store.ts is a client module, so
// anything exported from there becomes a client reference when a server file imports it — the
// value arrives as undefined on the server. Constants both sides need must live here instead.

export type AIProvider = 'ollama' | 'openai' | 'anthropic' | 'gemini';

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
};

/** Which environment variable holds each cloud provider's credential. */
export const ENV_VAR_BY_PROVIDER: Record<CloudProvider, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
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
};

/** Tokens reserved for the answer, per provider. */
export const DEFAULT_MAX_OUTPUT_TOKENS: Record<AIProvider, number> = {
  ollama: 1200,
  openai: 4096,
  anthropic: 4096,
  gemini: 8192,
};

export const CONTEXT_TOKENS_RANGE = { min: 512, max: 2000000 } as const;
export const MAX_OUTPUT_TOKENS_RANGE = { min: 128, max: 32768 } as const;

/**
 * Embedding model per provider, used by the query-history semantic search feature — it follows
 * whichever provider the user has configured for chat, so it needs one embedding model per
 * provider. Anthropic has no embeddings API, so it is intentionally excluded — callers must fall
 * back to another provider for that feature.
 */
export const DEFAULT_EMBEDDING_MODELS: Record<Exclude<AIProvider, 'anthropic'>, string> = {
  ollama: 'nomic-embed-text',
  openai: 'text-embedding-3-small',
  gemini: 'text-embedding-004',
};

/**
 * Embedding model for the Docs Consultant's retrieval step, which is always OpenAI regardless of
 * the user's configured chat provider (see docs-context/route.ts) — a single constant, not a
 * per-provider map, since only OpenAI is used here.
 */
export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';
