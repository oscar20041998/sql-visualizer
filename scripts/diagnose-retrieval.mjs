#!/usr/bin/env node
// One-off diagnostic: embed a real optimize-style query with the same gateway model the index was
// built with, then report the closest distances in the ACTUAL rebuilt index. Tells us whether an
// empty {"content":""} is a genuine "nothing relevant" vs a model/space mismatch. Safe/read-only.
//   node --env-file-if-exists=.env scripts/diagnose-retrieval.mjs

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'src', 'lib', 'ai', 'data');

const BASE_URL = (process.env.OPENAI_EMBEDDING_BASE_URL || '').replace(/\/+$/, '');
const API_KEY = process.env.OPENAI_EMBEDDING_API_KEY || '';
const MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'gemini-embedding-2';

async function embed(text) {
    const res = await fetch(`${BASE_URL}/v1/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify({ model: MODEL, input: text.slice(0, 2000) }),
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text().catch(() => '')}`);
    return (await res.json()).data[0].embedding;
}

const manifest = JSON.parse(readFileSync(path.join(DATA, 'databaseKnowledge.manifest.json'), 'utf8'));
const meta = JSON.parse(readFileSync(path.join(DATA, 'databaseKnowledge.meta.json'), 'utf8'));
const buf = readFileSync(path.join(DATA, 'databaseKnowledge.embeddings.bin'));
const emb = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
const { dim, count } = manifest;
console.log(`Index: model=${manifest.embeddingModel} dim=${dim} count=${count} meta=${meta.length} floats=${emb.length} (expect ${count * dim})`);

const query =
    'oracle SQL query performance optimization. Issues to fix: deeply nested scalar subqueries, ' +
    'SELECT *, correlated subqueries. Query: WITH cte_raw_sales AS (SELECT s.transaction_id, ' +
    's.customer_id FROM sales_transactions s WHERE s.sale_date >= (SELECT MIN(start_date) FROM fiscal_calendar))';

const q = await embed(query);
console.log(`Query embedding dim=${q.length}`);

let qn = 0;
for (let i = 0; i < q.length; i++) qn += q[i] * q[i];
qn = Math.sqrt(qn);

const results = [];
for (let row = 0; row < count; row++) {
    const off = row * dim;
    let dot = 0;
    let n = 0;
    for (let i = 0; i < dim; i++) {
        const v = emb[off + i];
        dot += q[i] * v;
        n += v * v;
    }
    const denom = qn * Math.sqrt(n);
    const distance = denom === 0 ? 1 : 1 - dot / denom;
    results.push({ row, distance });
}
results.sort((a, b) => a.distance - b.distance);

console.log(`\nMin distance=${results[0].distance.toFixed(4)}  Max distance=${results[count - 1].distance.toFixed(4)}`);
console.log(`Chunks within 0.9 distance: ${results.filter((r) => r.distance <= 0.9).length}`);
console.log('\nTop 8 closest:');
for (let i = 0; i < 8; i++) {
    const r = results[i];
    const c = meta[r.row];
    const snippet = (c.content || '').replace(/\s+/g, ' ').slice(0, 90);
    console.log(`  dist=${r.distance.toFixed(4)} [${c.sourceFile}#${c.chunkIndex}] ${snippet}`);
}
