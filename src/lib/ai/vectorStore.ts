// In-process cosine-similarity store over precomputed doc-chunk embeddings.
//
// The corpus (public/assets/markdown/features/**) is small enough that a real vector database
// would be overkill: docsIndex.json is loaded once per server process and searched linearly.
// Mirrors the course's find_n_closest()/collection.query() pattern without the extra service.

export interface DocChunk {
  id: string;
  file: string;
  title: string;
  text: string;
  embedding: number[];
}

/** 1 minus cosine similarity: 0 means identical direction, 2 means opposite. */
export function cosineDistance(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 1;
  return 1 - dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Returns the n candidates with the smallest cosine distance to `query`, closest first. */
export function findNClosest<T extends { embedding: number[] }>(
  query: number[],
  candidates: T[],
  n: number
): (T & { distance: number })[] {
  return candidates
    .map((candidate) => ({ ...candidate, distance: cosineDistance(query, candidate.embedding) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, n);
}

/** Formats retrieved chunks into the text block handed to the LLM as context. */
export function buildDocsContext(matches: DocChunk[]): string {
  return matches
    .map((match) => `Source: ${match.title} (${match.file})\n${match.text}`)
    .join('\n\n');
}
