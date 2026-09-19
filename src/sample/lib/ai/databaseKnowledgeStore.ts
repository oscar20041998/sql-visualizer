// In-process nearest-neighbor search over the Database AI Assistant's RAG corpus: excerpts
// chunked from the official SQL Server, MySQL, PostgreSQL and Oracle manuals, pre-embedded
// offline (see scripts/build-database-knowledge-index.mjs). Server-only (uses node:fs) — never
// import this from a 'use client' file.
//
// ~82k chunks / ~120 MB of embeddings is too big to ship to the browser or re-parse per request,
// but fine to hold once in the Node server process: loaded lazily on first search and cached for
// the process lifetime, same idea as vectorStore.ts's docsIndex.json but reading the embeddings
// as a raw Float32Array view instead of JS number arrays (5-10x less memory and no JSON.parse
// cost for the numeric payload).
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'src', 'lib', 'ai', 'data');
const MANIFEST_PATH = path.join(DATA_DIR, 'databaseKnowledge.manifest.json');
const META_PATH = path.join(DATA_DIR, 'databaseKnowledge.meta.json');
const EMBEDDINGS_PATH = path.join(DATA_DIR, 'databaseKnowledge.embeddings.bin');

export interface DatabaseKnowledgeChunk {
  id: string;
  sourceFile: string;
  chunkIndex: number;
  content: string;
  section?: string;
  pageAnchor?: string;
}

export interface DatabaseKnowledgeMatch extends DatabaseKnowledgeChunk {
  /** 1 minus cosine similarity: 0 = identical direction, 2 = opposite. */
  distance: number;
}

interface Manifest {
  count: number;
  dim: number;
  embeddingModel: string;
  sourceFiles: string[];
  builtAt: string;
}

interface LoadedIndex {
  manifest: Manifest;
  meta: DatabaseKnowledgeChunk[];
  embeddings: Float32Array;
}

let cached: LoadedIndex | null = null;

/** Cheap existence check so callers can skip the (larger) load when the index was never built. */
export function isDatabaseKnowledgeIndexAvailable(): boolean {
  return existsSync(MANIFEST_PATH) && existsSync(META_PATH) && existsSync(EMBEDDINGS_PATH);
}

function load(): LoadedIndex {
  if (cached) return cached;
  if (!isDatabaseKnowledgeIndexAvailable()) {
    throw new Error(
      'Database knowledge index not found. Run "npm run build:database-knowledge-index" first ' +
        '(requires src/lib/ai/document_chunks.json).'
    );
  }

  const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const meta: DatabaseKnowledgeChunk[] = JSON.parse(readFileSync(META_PATH, 'utf8'));
  const buffer = readFileSync(EMBEDDINGS_PATH);
  const embeddings = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);

  if (meta.length !== manifest.count || embeddings.length !== manifest.count * manifest.dim) {
    throw new Error(
      'Database knowledge index files are inconsistent with the manifest. Rebuild with ' +
        '"npm run build:database-knowledge-index".'
    );
  }

  cached = { manifest, meta, embeddings };
  return cached;
}

/** The embedding model the corpus was built with — the query embedding MUST use the same one. */
export function getDatabaseKnowledgeEmbeddingModel(): string {
  return load().manifest.embeddingModel;
}

/**
 * Returns the `topN` chunks whose embeddings are closest (smallest cosine distance) to `query`.
 * Reads embeddings straight out of the shared Float32Array by offset instead of allocating a
 * per-candidate array, since this loop runs over all ~82k chunks on every question.
 */
export function findClosestDatabaseKnowledge(query: number[], topN: number): DatabaseKnowledgeMatch[] {
  const { meta, embeddings, manifest } = load();
  const { dim, count } = manifest;
  if (query.length !== dim) {
    throw new Error(
      `Query embedding has ${query.length} dimensions but the index expects ${dim}. ` +
        `Make sure the question was embedded with "${manifest.embeddingModel}".`
    );
  }

  let queryNorm = 0;
  for (let i = 0; i < dim; i += 1) queryNorm += query[i] * query[i];
  queryNorm = Math.sqrt(queryNorm);

  // Keep a small ascending-by-distance top-N buffer instead of sorting all ~82k candidates.
  const topIndices: number[] = [];
  const topDistances: number[] = [];

  for (let row = 0; row < count; row += 1) {
    const offset = row * dim;
    let dot = 0;
    let norm = 0;
    for (let i = 0; i < dim; i += 1) {
      const value = embeddings[offset + i];
      dot += query[i] * value;
      norm += value * value;
    }
    const denom = queryNorm * Math.sqrt(norm);
    const distance = denom === 0 ? 1 : 1 - dot / denom;

    if (topIndices.length < topN || distance < topDistances[topDistances.length - 1]) {
      let insertAt = topDistances.length;
      while (insertAt > 0 && topDistances[insertAt - 1] > distance) insertAt -= 1;
      topDistances.splice(insertAt, 0, distance);
      topIndices.splice(insertAt, 0, row);
      if (topDistances.length > topN) {
        topDistances.pop();
        topIndices.pop();
      }
    }
  }

  return topIndices.map((index, i) => ({ ...meta[index], distance: topDistances[i] }));
}

/** Human-friendly database name for a `converted_<vendor>-....md` source file. */
export function friendlyDatabaseName(sourceFile: string): string {
  const lower = sourceFile.toLowerCase();
  if (lower.includes('sql-server')) return 'SQL Server';
  if (lower.includes('mysql')) return 'MySQL';
  if (lower.includes('postgresql') || lower.includes('postgres')) return 'PostgreSQL';
  if (lower.includes('oracle')) return 'Oracle';
  return sourceFile;
}
