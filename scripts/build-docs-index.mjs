#!/usr/bin/env node
// Offline indexing job for the Docs Consultant RAG chat: chunks the app's own feature docs
// (public/assets/markdown/features/**), embeds each chunk via OpenAI, and writes
// src/lib/ai/docsIndex.json.
//
// Deliberately not part of `npm run build` — embedding is a paid, occasional step. Rerun manually
// whenever docs under public/assets/markdown/features/ change:
//   npm run build:docs-index

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MARKDOWN_ROOT = path.join(ROOT, 'public', 'assets', 'markdown');
const DOCS_DIR = path.join(MARKDOWN_ROOT, 'features');
const OUTPUT_PATH = path.join(ROOT, 'src', 'lib', 'ai', 'docsIndex.json');
const EMBEDDING_MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 20;

/** No dotenv dependency: this script runs outside the Next.js server, which loads .env itself. */
function loadEnvFile() {
  let content;
  try {
    content = readFileSync(path.join(ROOT, '.env'), 'utf8');
  } catch {
    return;
  }
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

function walkMarkdownFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walkMarkdownFiles(full));
    else if (entry.endsWith('.md')) files.push(full);
  }
  return files;
}

/** Splits `content` at lines starting with `marker` (e.g. "## "). Text before the first match
 *  (the H1 title / intro) becomes one section with an empty title. */
function splitOnHeading(content, marker) {
  const sections = [];
  let current = { title: '', body: [] };

  for (const line of content.split('\n')) {
    if (line.startsWith(marker)) {
      if (current.body.length) sections.push({ title: current.title, body: current.body.join('\n') });
      current = { title: line.slice(marker.length).trim(), body: [] };
    } else {
      current.body.push(line);
    }
  }
  if (current.body.length) sections.push({ title: current.title, body: current.body.join('\n') });
  return sections;
}

/** The `# Title` line, used as the fallback title for the intro chunk (the text before the first
 *  `## ` heading has no heading of its own otherwise, and the file path is a poor citation label). */
function extractH1Title(content) {
  const match = content.match(/^#\s+(.+?)\s*$/m);
  return match ? match[1].trim() : '';
}

/** Splits on `## ` headings; a section that itself contains `### ` subsections with substantial
 *  content is split further, since those are independently meaningful (confirmed in
 *  BEST_PRACTICES.md's score-tier blocks and COMPLEXITY_SCORING.md's numbered rules/examples). */
function chunkMarkdown(content, relativeFile) {
  const h1Title = extractH1Title(content);
  const sections = splitOnHeading(content, '## ');
  const chunks = [];

  for (const section of sections) {
    if (/\n### /.test(`\n${section.body}`)) {
      for (const sub of splitOnHeading(section.body, '### ')) {
        chunks.push({ title: sub.title || section.title, body: sub.body });
      }
    } else {
      chunks.push({ title: section.title, body: section.body });
    }
  }

  return chunks
    .map((chunk) => ({ file: relativeFile, title: chunk.title || h1Title, text: chunk.body.trim() }))
    .filter((chunk) => chunk.text.length > 0);
}

async function embedBatch(apiKey, baseUrl, input) {
  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/v1/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input }),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(
      `OpenAI embeddings request failed (${response.status}): ${detail?.error?.message || response.statusText}`
    );
  }
  const data = await response.json();
  return data.data.map((entry) => entry.embedding);
}

async function main() {
  loadEnvFile();
  const apiKey = (process.env.OPENAI_EMBEDDING_API_KEY || process.env.OPENAI_API_KEY)?.trim();
  if (!apiKey) {
    console.error(
      'OPENAI_EMBEDDING_API_KEY (or OPENAI_API_KEY) is not set. Add a real key to .env before running this script.'
    );
    process.exitCode = 1;
    return;
  }
  const baseUrl = process.env.OPENAI_EMBEDDING_BASE_URL?.trim() || 'https://api.openai.com';

  const files = walkMarkdownFiles(DOCS_DIR);
  const chunks = files.flatMap((file) => {
    const relativeFile = path.relative(MARKDOWN_ROOT, file).replace(/\\/g, '/');
    return chunkMarkdown(readFileSync(file, 'utf8'), relativeFile);
  });
  console.log(`Chunked ${files.length} files into ${chunks.length} chunks.`);

  const indexed = [];
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const embeddings = await embedBatch(apiKey, baseUrl, batch.map((chunk) => chunk.text));
    batch.forEach((chunk, j) => {
      indexed.push({
        id: `${chunk.file}#${indexed.length}`,
        file: chunk.file,
        title: chunk.title || chunk.file,
        text: chunk.text,
        embedding: embeddings[j],
      });
    });
    console.log(`Embedded ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length} chunks.`);
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(indexed, null, 2));
  console.log(`Wrote ${indexed.length} chunks to ${path.relative(ROOT, OUTPUT_PATH)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
