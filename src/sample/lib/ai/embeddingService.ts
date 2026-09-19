// Semantic-search helpers for the query history panel: turns SQL text into a vector via the
// configured AI provider, and scores similarity between vectors. Kept separate from
// aiService.ts (the raw provider adapters) the same way aiSqlContext.ts separates prompt
// building — this module is about embeddings-specific orchestration and math.
import type { AIModelConfig } from '../store';
import { embedWithAI } from './aiService';
import { DEFAULT_EMBEDDING_MODELS } from './aiProviders';

/** Embedding inputs have their own (usually smaller) token limits; keep requests small and cheap. */
const MAX_EMBED_CHARS = 4000;

/**
 * Embeds a piece of text for semantic search. Returns null instead of throwing so a failed
 * embedding (unreachable Ollama, missing API key, unsupported provider) never blocks the
 * feature that triggered it — callers just skip storing/using a vector for that entry.
 */
export async function tryEmbedText(
  text: string,
  config: AIModelConfig,
  signal?: AbortSignal
): Promise<{ vector: number[]; model: string } | null> {
  const trimmed = text.trim().slice(0, MAX_EMBED_CHARS);
  if (!trimmed) return null;

  try {
    const vector = await embedWithAI(config, trimmed, signal);
    // embedWithAI throws before this point for a provider without an embeddings API (Anthropic),
    // so config.provider is guaranteed to be a key of DEFAULT_EMBEDDING_MODELS here.
    const model = DEFAULT_EMBEDDING_MODELS[config.provider as keyof typeof DEFAULT_EMBEDDING_MODELS];
    return { vector, model };
  } catch {
    return null;
  }
}

/** Cosine similarity in [-1, 1]; 1 means identical direction (the usual semantic-search score). */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
