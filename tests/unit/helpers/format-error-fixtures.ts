// Shared fixtures for the spec-012 format-error AI tests.
import type { AIModelConfig } from '@/lib/store';
import type { FormatError } from '@/lib/sql/formatError';

export function makeFormatError(overrides: Partial<FormatError> = {}): FormatError {
  return {
    message: 'Parse error at token: ; at line 1 column 16',
    dialect: 'mysql',
    location: { offset: 4, line: 1, column: 5 },
    snippet: 'SELECT * FROM (…',
    sourceSql: 'SELECT * FROM (;',
    severity: 'error',
    occurredAt: '2026-09-23T10:00:00.000Z',
    ...overrides,
  };
}

/** A fully-populated local-Ollama config, so tests never depend on store defaults drifting. */
export function makeOllamaConfig(overrides: Partial<AIModelConfig> = {}): AIModelConfig {
  return {
    provider: 'ollama',
    baseUrls: {
      ollama: 'http://localhost:11434',
      openai: 'https://api.openai.com',
      anthropic: 'https://api.anthropic.com',
      gemini: 'https://generativelanguage.googleapis.com',
    },
    ollamaModel: 'qwen2.5-coder:7b',
    modelId: 'gpt-4o',
    temperature: 0.2,
    systemPrompt: '',
    contextTokens: { ollama: 8192, openai: 8192, anthropic: 8192, gemini: 8192 },
    maxOutputTokens: { ollama: 2048, openai: 2048, anthropic: 2048, gemini: 2048 },
    batchConcurrency: 1,
    ...overrides,
  };
}

/**
 * Builds the OpenAI-compatible response Ollama's `/v1/chat/completions` returns. Pass an object to
 * have it JSON-encoded into `content` (the strict-JSON contract), or `{ raw: true }` to send prose.
 */
export function jsonResponse(content: unknown, options: { raw?: boolean } = {}): Response {
  const text =
    options.raw || typeof content === 'string' ? String(content) : JSON.stringify(content);
  return new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), {
    status: 200,
  });
}

/** A fetch stub that fails at the network layer, like a stopped Ollama server. */
export function throwingFetch(): typeof fetch {
  return (async () => {
    throw new Error('Failed to fetch');
  }) as unknown as typeof fetch;
}

/**
 * Replaces `globalThis.fetch` for the duration of one test, restoring the original afterwards.
 * `aiService` calls the global `fetch`, so this is the seam the feature's requests go through.
 */
export function withStubbedFetch<T>(fetchImpl: typeof fetch, run: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  return run().finally(() => {
    globalThis.fetch = original;
  });
}
