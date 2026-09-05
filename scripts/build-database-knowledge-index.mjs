#!/usr/bin/env node
// Offline indexing job for the Database AI Assistant's RAG corpus: chunks are pre-extracted from
// the official SQL Server, MySQL, PostgreSQL and Oracle manuals (src/lib/ai/document_chunks.json,
// ~500 MB, source of the `content`/`metadata` fields only) and re-embedded HERE with a cloud
// OpenAI-compatible embedding model (gemini-embedding-2 via the aiportal gateway), then packed
// into a form the app can load and search cheaply:
//   - databaseKnowledge.meta.json        text + metadata for every chunk, no embeddings (small)
//   - databaseKnowledge.embeddings.bin   every embedding concatenated as raw Float32 bytes
//   - databaseKnowledge.manifest.json    { count, dim, embeddingModel, sourceFiles, builtAt }
//
// The query side MUST embed with the SAME model (the /api/ai/database-knowledge-context route
// embeds server-side with OPENAI_EMBEDDING_*), or cosine search is meaningless. The embeddings
// baked into document_chunks.json are ignored on purpose (unknown source pipeline/model).
//
// Requires these in .env (gitignored):
//   OPENAI_EMBEDDING_BASE_URL=https://aiportalapi.stu-platform.live/use
//   OPENAI_EMBEDDING_API_KEY=sk-...
//   OPENAI_EMBEDDING_MODEL=gemini-embedding-2
//
// Not part of `npm run build`: re-embeds ~82k chunks through the gateway (hours; rate-limit aware).
// Rerun manually whenever document_chunks.json or the embedding model changes:
//   npm run build:database-knowledge-index

import { createReadStream, existsSync, mkdirSync, writeFileSync, openSync, writeSync, closeSync } from 'node:fs';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SOURCE_PATH = path.join(ROOT, 'src', 'lib', 'ai', 'document_chunks.json');
const OUTPUT_DIR = path.join(ROOT, 'src', 'lib', 'ai', 'data');

const BASE_URL = (process.env.OPENAI_EMBEDDING_BASE_URL || '').replace(/\/+$/, '');
const API_KEY = process.env.OPENAI_EMBEDDING_API_KEY || '';
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'gemini-embedding-2';
/** Chunks embedded in parallel. Higher = faster but more likely to hit gateway rate limits. */
const CONCURRENCY = Number(process.env.EMBED_CONCURRENCY || 8);
/** Embedded and flushed to disk one block at a time to bound memory (3072 floats/chunk). */
const BLOCK_SIZE = Number(process.env.EMBED_BLOCK_SIZE || 256);
/** gemini-embedding-2 handles long input; longer than this is wasted cost with little retrieval gain. */
const MAX_EMBED_CHARS = 2000;
const MAX_RETRIES = 6;

let rateLimitHits = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedOne(text) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    let response;
    try {
      response = await fetch(`${BASE_URL}/v1/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
      });
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
      await sleep(Math.min(10000, 500 * 2 ** attempt));
      continue;
    }
    if (response.status === 429 || response.status >= 500) {
      rateLimitHits += 1;
      if (attempt === MAX_RETRIES) throw new Error(`giving up after ${MAX_RETRIES} retries (last status ${response.status})`);
      const retryAfter = Number(response.headers.get('retry-after')) || 0;
      await sleep(retryAfter ? retryAfter * 1000 : Math.min(15000, 500 * 2 ** attempt));
      continue;
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`embed failed (${response.status}): ${detail || response.statusText}`);
    }
    const data = await response.json();
    const embedding = data?.data?.[0]?.embedding;
    if (!Array.isArray(embedding)) throw new Error('unexpected embedding shape from gateway');
    return embedding;
  }
  throw new Error('unreachable');
}

/** Embeds a block in parallel (bounded by CONCURRENCY) while preserving input order; failures become null. */
async function embedBlock(records) {
  const vectors = new Array(records.length);
  let next = 0;
  async function run() {
    while (next < records.length) {
      const i = next++;
      try {
        vectors[i] = await embedOne(records[i].content.slice(0, MAX_EMBED_CHARS) || records[i].content);
      } catch (error) {
        console.warn(`  FAILED ${records[i].metaEntry.id}: ${error.message} (dropping this chunk)`);
        vectors[i] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, records.length) }, run));
  return vectors;
}

async function main() {
  if (!BASE_URL || !API_KEY) {
    console.error('Set OPENAI_EMBEDDING_BASE_URL and OPENAI_EMBEDDING_API_KEY in .env first.');
    process.exitCode = 1;
    return;
  }
  if (!existsSync(SOURCE_PATH)) {
    console.error(`Not found: ${path.relative(ROOT, SOURCE_PATH)}. Place the raw dump there first.`);
    process.exitCode = 1;
    return;
  }

  // Fail fast if the gateway/key/model is wrong before streaming ~500 MB.
  try {
    const probe = await embedOne('connectivity probe');
    console.log(`Gateway OK: ${EMBEDDING_MODEL} returns dim=${probe.length}. Concurrency=${CONCURRENCY}.`);
  } catch (error) {
    console.error(`Cannot embed via ${BASE_URL} with model ${EMBEDDING_MODEL}: ${error.message}`);
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
  let dropped = 0;
  let block = [];
  const started = Date.now();

  async function flushBlock() {
    if (block.length === 0) return;
    const vectors = await embedBlock(block);
    for (let i = 0; i < block.length; i += 1) {
      const embedding = vectors[i];
      if (!embedding) {
        dropped += 1;
        continue;
      }
      if (dim === 0) dim = embedding.length;
      writeSync(embeddingsFd, Buffer.from(Float32Array.from(embedding).buffer));
      meta.push(block[i].metaEntry);
      sourceFiles.add(block[i].metaEntry.sourceFile);
      count += 1;
    }
    block = [];
    const rate = count / ((Date.now() - started) / 1000);
    console.log(`Embedded ${count} chunks (${dropped} dropped, ${rateLimitHits} retries, ${rate.toFixed(1)}/s)...`);
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
    block.push({
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

    if (block.length >= BLOCK_SIZE) await flushBlock();
  }
  await flushBlock();
  closeSync(embeddingsFd);

  if (count === 0) {
    console.error('No chunks embedded - nothing written.');
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

  const mins = ((Date.now() - started) / 60000).toFixed(1);
  console.log(`Wrote ${count} chunks (dim=${dim}, ${dropped} dropped) to ${path.relative(ROOT, OUTPUT_DIR)}/ in ${mins} min`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
