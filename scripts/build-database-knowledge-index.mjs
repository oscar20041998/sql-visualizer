#!/usr/bin/env node
// Offline indexing job for the Database AI Assistant's RAG corpus: chunks are pre-extracted from
// the official SQL Server, MySQL, PostgreSQL and Oracle manuals (src/lib/ai/document_chunks.json,
// ~500 MB, source of the `content`/`metadata` fields only) and re-embedded HERE with a local
// Ollama model, then packed into a form the app can load and search cheaply:
//   - databaseKnowledge.meta.json        text + metadata for every chunk, no embeddings (small)
//   - databaseKnowledge.embeddings.bin   every embedding concatenated as raw Float32 bytes
//   - databaseKnowledge.manifest.json    { count, dim, embeddingModel, sourceFiles, builtAt }
//
// The embeddings baked into document_chunks.json are IGNORED and recomputed here on purpose:
// they were produced by whatever pipeline built that dump (unknown exact model/pooling), and
// re-embedding a known sample with Ollama's "all-minilm" did not reproduce them (cosine distance
// ~0.84 against itself — essentially unrelated vectors despite matching dimensionality). Since
// the app can only query the index with a model it can actually run again at question time, the
// corpus has to be embedded with that SAME model, or search results are meaningless. Ollama is
// used because it is already the app's local/no-key embedding path (see aiProviders.ts).
//
// Not part of `npm run build`: document_chunks.json is a large user-provided artifact, and this
// re-embeds ~82k chunks locally (~20-30 min via Ollama's batch endpoint). Rerun manually whenever
// document_chunks.json changes or the embedding model choice changes:
//   npm run build:database-knowledge-index

import { createReadStream, existsSync, mkdirSync, writeFileSync, openSync, writeSync, closeSync } from 'node:fs';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SOURCE_PATH = path.join(ROOT, 'src', 'lib', 'ai', 'document_chunks.json');
const OUTPUT_DIR = path.join(ROOT, 'src', 'lib', 'ai', 'data');

const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/+$/, '');
/** Must match DATABASE_KNOWLEDGE_EMBEDDING_MODEL in src/lib/ai/aiProviders.ts. */
const EMBEDDING_MODEL = 'all-minilm';
const BATCH_SIZE = 64;
/** MiniLM's effective context is ~256 tokens; longer input is wasted cost with no retrieval benefit. */
const MAX_EMBED_CHARS = 2000;
const MAX_RETRIES = 3;

async function embedBatch(input) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: EMBEDDING_MODEL, input }),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`Ollama embed request failed (${response.status}): ${detail || response.statusText}`);
      }
      const data = await response.json();
      if (!Array.isArray(data.embeddings) || data.embeddings.length !== input.length) {
        throw new Error('Ollama returned an unexpected embeddings shape.');
      }
      return data.embeddings;
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
      console.warn(`Embed batch attempt ${attempt} failed (${error.message}); retrying...`);
    }
  }
  throw new Error('unreachable');
}

async function main() {
  if (!existsSync(SOURCE_PATH)) {
    console.error(`Not found: ${path.relative(ROOT, SOURCE_PATH)}. Place the raw dump there first.`);
    process.exitCode = 1;
    return;
  }

  const pingResponse = await fetch(`${OLLAMA_BASE_URL}/api/tags`).catch(() => null);
  if (!pingResponse?.ok) {
    console.error(`Cannot reach Ollama at ${OLLAMA_BASE_URL}. Start it ("ollama server") first.`);
    process.exitCode = 1;
    return;
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const embeddingsPath = path.join(OUTPUT_DIR, 'databaseKnowledge.embeddings.bin');
  const embeddingsFd = openSync(embeddingsPath, 'w');

  const meta = [];
  const sourceFiles = new Set();
  let dim = 0;
  let count = 0;
  let pendingRecords = [];

  async function flushBatch() {
    if (pendingRecords.length === 0) return;
    const inputs = pendingRecords.map((record) => record.content.slice(0, MAX_EMBED_CHARS) || record.content);
    const embeddings = await embedBatch(inputs);
    for (let i = 0; i < pendingRecords.length; i += 1) {
      const embedding = embeddings[i];
      if (dim === 0) dim = embedding.length;
      writeSync(embeddingsFd, Buffer.from(Float32Array.from(embedding).buffer));
      meta.push(pendingRecords[i].metaEntry);
      sourceFiles.add(pendingRecords[i].metaEntry.sourceFile);
      count += 1;
    }
    pendingRecords = [];
    if (count % (BATCH_SIZE * 20) < BATCH_SIZE) console.log(`Embedded ${count} chunks...`);
  }

  const rl = createInterface({ input: createReadStream(SOURCE_PATH, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const rawLine of rl) {
    const line = rawLine.trim().replace(/,$/, '');
    if (!line || line === '[' || line === ']') continue;

    let record;
    try {
      record = JSON.parse(line);
    } catch {
      continue; // Skip stray/partial lines rather than aborting the whole rebuild.
    }
    const content = record.content;
    if (typeof content !== 'string' || !content.trim()) continue;

    const metadata = record.metadata || {};
    pendingRecords.push({
      content,
      metaEntry: {
        id: record.id ?? `${record.source_file}#${record.chunk_index}`,
        sourceFile: record.source_file,
        chunkIndex: record.chunk_index,
        content,
        section: metadata.section,
        pageAnchor: metadata.page_anchor,
      },
    });

    if (pendingRecords.length >= BATCH_SIZE) await flushBatch();
  }
  await flushBatch();
  closeSync(embeddingsFd);

  if (count === 0) {
    console.error('No valid chunks found in document_chunks.json — nothing written.');
    process.exitCode = 1;
    return;
  }

  writeFileSync(path.join(OUTPUT_DIR, 'databaseKnowledge.meta.json'), JSON.stringify(meta));
  writeFileSync(
    path.join(OUTPUT_DIR, 'databaseKnowledge.manifest.json'),
    JSON.stringify(
      {
        count,
        dim,
        embeddingModel: EMBEDDING_MODEL,
        sourceFiles: [...sourceFiles],
        builtAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  console.log(`Wrote ${count} chunks (dim=${dim}) to ${path.relative(ROOT, OUTPUT_DIR)}/`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
