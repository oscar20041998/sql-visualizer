// Retrieval step for the Database AI Assistant's RAG grounding: given an already-computed
// question embedding (browser embeds via local Ollama — see databaseAssistant.ts), finds the
// closest excerpts in the official SQL Server/MySQL/PostgreSQL/Oracle manual corpus and returns
// them as a context block. No network call happens in this route; the ~200 MB index is loaded
// once (in-process cache) and searched in memory. Embedding stays local to the browser+Ollama,
// same trust boundary as every other Ollama call in this app (no credential involved).
import { NextResponse } from 'next/server';
import {
  findClosestDatabaseKnowledge,
  friendlyDatabaseName,
  isDatabaseKnowledgeIndexAvailable,
  type DatabaseKnowledgeMatch,
} from '@/lib/ai/databaseKnowledgeStore';

const DEFAULT_TOP_N = 5;
const MAX_TOP_N = 10;
const MAX_CONTENT_CHARS_PER_CHUNK = 1200;
/** Cosine distance beyond this is treated as "not actually relevant" (0 = identical, 2 = opposite). */
const MAX_RELEVANT_DISTANCE = 0.9;

interface DatabaseKnowledgeContextRequestBody {
  embedding?: unknown;
  topN?: unknown;
}

export interface DatabaseKnowledgeSource {
  sourceFile: string;
  section?: string;
  pageAnchor?: string;
}

function isValidEmbedding(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.every((n) => typeof n === 'number' && Number.isFinite(n));
}

function buildContext(matches: DatabaseKnowledgeMatch[]): string {
  return matches
    .map((match) => {
      const label = [friendlyDatabaseName(match.sourceFile), match.section, match.pageAnchor]
        .filter(Boolean)
        .join(' — ');
      const content = match.content.slice(0, MAX_CONTENT_CHARS_PER_CHUNK);
      return `Source: ${label}\n${content}`;
    })
    .join('\n\n');
}

export async function POST(request: Request) {
  let body: DatabaseKnowledgeContextRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!isValidEmbedding(body.embedding)) {
    return NextResponse.json({ error: 'embedding must be a non-empty array of finite numbers.' }, { status: 400 });
  }
  const topN = Math.min(MAX_TOP_N, Math.max(1, Number(body.topN) || DEFAULT_TOP_N));

  if (!isDatabaseKnowledgeIndexAvailable()) {
    // 503, not 500/404: the deployment is missing a build step, the caller did nothing wrong.
    return NextResponse.json(
      { error: 'Database knowledge index not built on the server. Run "npm run build:database-knowledge-index".' },
      { status: 503 }
    );
  }

  try {
    const allMatches = findClosestDatabaseKnowledge(body.embedding, topN);
    const matches = allMatches.filter((match) => match.distance <= MAX_RELEVANT_DISTANCE);

    if (matches.length === 0) {
      return NextResponse.json({ context: '', sources: [] });
    }

    const sources: DatabaseKnowledgeSource[] = matches.map((match) => ({
      sourceFile: friendlyDatabaseName(match.sourceFile),
      section: match.section,
      pageAnchor: match.pageAnchor,
    }));

    return NextResponse.json({ context: buildContext(matches), sources });
  } catch (error) {
    console.error('[api/ai/database-knowledge-context]', error);
    const message = error instanceof Error ? error.message : 'Database knowledge search failed on the server.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
