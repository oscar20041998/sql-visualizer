#!/usr/bin/env node
// Small-scale probe for using an OpenAI-compatible cloud gateway (gemini-embedding-2) as the
// RAG embedding model instead of local Ollama all-minilm. It embeds only the first
// TEST_CHUNK_COUNT chunks, measures real throughput / rate-limit (429) behaviour, then runs a
// sample optimization query against just those chunks to sanity-check retrieval quality.
// Nothing here touches the production index in src/lib/ai/data/. Run:
//   node --env-file-if-exists=.env scripts/test-gemini-embedding.mjs

import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SOURCE_PATH = path.join(ROOT, 'src', 'lib', 'ai', 'document_chunks.json');

const BASE_URL = (process.env.OPENAI_EMBEDDING_BASE_URL || '').replace(/\/+$/, '');
const API_KEY = process.env.OPENAI_EMBEDDING_API_KEY || '';
const MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'gemini-embedding-2';
const TEST_CHUNK_COUNT = Number(process.env.TEST_CHUNK_COUNT || 200);
const CONCURRENCY = Number(process.env.TEST_CONCURRENCY || 4);
const MAX_EMBED_CHARS = 2000;
const MAX_RETRIES = 5;

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
                body: JSON.stringify({ model: MODEL, input: text }),
            });
        } catch (error) {
            if (attempt === MAX_RETRIES) throw error;
            await sleep(500 * attempt);
            continue;
        }
        if (response.status === 429 || response.status >= 500) {
            rateLimitHits += 1;
            if (attempt === MAX_RETRIES) {
                throw new Error(`giving up after ${MAX_RETRIES} retries (last status ${response.status})`);
            }
            const retryAfter = Number(response.headers.get('retry-after')) || 0;
            await sleep(retryAfter ? retryAfter * 1000 : Math.min(8000, 400 * 2 ** attempt));
            continue;
        }
        if (!response.ok) {
            const detail = await response.text().catch(() => '');
            throw new Error(`embed failed (${response.status}): ${detail || response.statusText}`);
        }
        const data = await response.json();
        const embedding = data?.data?.[0]?.embedding;
        if (!Array.isArray(embedding)) throw new Error('unexpected embedding shape');
        return embedding;
    }
    throw new Error('unreachable');
}

async function mapWithConcurrency(items, limit, worker) {
    const results = new Array(items.length);
    let next = 0;
    async function run() {
        while (next < items.length) {
            const i = next++;
            results[i] = await worker(items[i], i);
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
    return results;
}

function cosine(a, b) {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i += 1) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

async function readFirstChunks(limit) {
    const records = [];
    const rl = createInterface({ input: createReadStream(SOURCE_PATH, { encoding: 'utf8' }), crlfDelay: Infinity });
    for await (const rawLine of rl) {
        const line = rawLine.trim().replace(/,$/, '');
        if (!line || line === '[' || line === ']') continue;
        let record;
        try {
            record = JSON.parse(line);
        } catch {
            continue;
        }
        const content = record.content;
        if (typeof content !== 'string' || !content.trim()) continue;
        records.push({
            sourceFile: record.source_file,
            chunkIndex: record.chunk_index,
            content,
        });
        if (records.length >= limit) break;
    }
    rl.close();
    return records;
}

async function main() {
    if (!BASE_URL || !API_KEY) {
        console.error('Set OPENAI_EMBEDDING_BASE_URL and OPENAI_EMBEDDING_API_KEY in .env first.');
        process.exitCode = 1;
        return;
    }

    console.log(`Model: ${MODEL}`);
    console.log(`Sampling first ${TEST_CHUNK_COUNT} chunks, concurrency=${CONCURRENCY}\n`);

    const records = await readFirstChunks(TEST_CHUNK_COUNT);
    console.log(`Loaded ${records.length} chunks. Embedding via gateway...`);

    const started = Date.now();
    let done = 0;
    let failures = 0;
    const vectors = await mapWithConcurrency(records, CONCURRENCY, async (record) => {
        try {
            const vec = await embedOne(record.content.slice(0, MAX_EMBED_CHARS));
            done += 1;
            if (done % 25 === 0) console.log(`  embedded ${done}/${records.length}...`);
            return vec;
        } catch (error) {
            failures += 1;
            console.warn(`  FAILED chunk ${record.sourceFile}#${record.chunkIndex}: ${error.message}`);
            return null;
        }
    });
    const elapsedSec = (Date.now() - started) / 1000;

    const ok = vectors.filter(Boolean);
    const dim = ok[0]?.length ?? 0;
    const perSec = ok.length / elapsedSec;

    console.log('\n=== THROUGHPUT ===');
    console.log(`Embedded OK       : ${ok.length}/${records.length}`);
    console.log(`Failures          : ${failures}`);
    console.log(`429/5xx retries   : ${rateLimitHits}`);
    console.log(`Dimension         : ${dim}`);
    console.log(`Elapsed           : ${elapsedSec.toFixed(1)}s`);
    console.log(`Rate              : ${perSec.toFixed(2)} chunks/sec`);
    if (perSec > 0) {
        const full = 81972 / perSec;
        console.log(`Projected 81,972  : ${(full / 60).toFixed(1)} min (${(full / 3600).toFixed(2)} h) at this rate`);
        console.log(`Projected size    : ${((81972 * dim * 4) / 1e6).toFixed(0)} MB embeddings.bin`);
    }

    if (ok.length < 5) {
        console.log('\nToo few vectors to test retrieval.');
        return;
    }

    // Retrieval sanity check against just this sample.
    const query =
        'PostgreSQL query performance optimization: avoid OR predicates that prevent index usage, ' +
        'rewrite with UNION or use appropriate indexes.';
    console.log('\n=== RETRIEVAL SANITY CHECK ===');
    console.log(`Query: ${query}\n`);
    const qVec = await embedOne(query);
    const scored = records
        .map((record, i) => ({ record, vec: vectors[i] }))
        .filter((entry) => entry.vec)
        .map((entry) => ({ record: entry.record, score: cosine(qVec, entry.vec) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    scored.forEach((hit, i) => {
        const snippet = hit.record.content.replace(/\s+/g, ' ').slice(0, 140);
        console.log(`#${i + 1} score=${hit.score.toFixed(3)} [${hit.record.sourceFile}#${hit.record.chunkIndex}]`);
        console.log(`    ${snippet}...\n`);
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
