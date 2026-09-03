// Retrieval step for the Docs Consultant chat: embeds the question and returns the closest
// feature-doc chunks as a context block, exactly like /api/ai/generate proxies chat completions.
//
// Embeddings use their own credential (OPENAI_EMBEDDING_API_KEY, falling back to OPENAI_API_KEY),
// separate from the chat-completion key the answer-generation step uses via /api/ai/generate.
// This mirrors gateways that scope a key to specific models: a key issued for
// text-embedding-3-large has no access to chat models and vice versa.
import { NextResponse } from 'next/server';
import { DEFAULT_BASE_URLS, DEFAULT_EMBEDDING_MODEL } from '@/lib/ai/aiProviders';
import { AIServiceError, generateEmbeddingsWithCloudKey } from '@/lib/ai/aiService';
import { parseEmbedInput, redactSecrets } from '@/lib/ai/aiRouteValidation';
import { buildDocsContext, findNClosest, type DocChunk } from '@/lib/ai/vectorStore';
import docsIndex from '@/lib/ai/docsIndex.json';

const MAX_QUESTION_LENGTH = 2000;
const TOP_N_MATCHES = 4;

interface DocsContextRequestBody {
  question?: unknown;
}

export async function POST(request: Request) {
  let body: DocsContextRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = parseEmbedInput(body.question);
  if (!parsed) {
    return NextResponse.json({ error: 'question must be a non-empty string.' }, { status: 400 });
  }
  const question = parsed[0].slice(0, MAX_QUESTION_LENGTH);

  const apiKey = (process.env.OPENAI_EMBEDDING_API_KEY || process.env.OPENAI_API_KEY)?.trim();
  if (!apiKey) {
    // 503 rather than 401: the deployment is misconfigured, the caller did nothing wrong.
    return NextResponse.json(
      {
        error:
          'OPENAI_EMBEDDING_API_KEY (or OPENAI_API_KEY) is not set on the server. Add it to .env and restart the dev server.',
      },
      { status: 503 }
    );
  }

  // Embeddings can go through an OpenAI-compatible gateway instead of api.openai.com directly
  // (e.g. a corporate AI portal) — same idea as AI_ALLOWED_BASE_URLS for the chat proxy, but this
  // one is server-only config, not something the browser can redirect.
  const embeddingBaseUrl = process.env.OPENAI_EMBEDDING_BASE_URL?.trim() || DEFAULT_BASE_URLS.openai;

  try {
    const [queryEmbedding] = await generateEmbeddingsWithCloudKey(
      apiKey,
      embeddingBaseUrl,
      DEFAULT_EMBEDDING_MODEL,
      [question],
      request.signal
    );

    const matches = findNClosest(queryEmbedding, docsIndex as DocChunk[], TOP_N_MATCHES);
    return NextResponse.json({
      context: buildDocsContext(matches),
      sources: matches.map((match) => ({ title: match.title, file: match.file })),
    });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      return new NextResponse(null, { status: 499 });
    }
    const message =
      error instanceof AIServiceError ? error.message : 'Documentation search failed on the server.';
    if (!(error instanceof AIServiceError)) console.error('[api/ai/docs-context]', error);
    return NextResponse.json({ error: redactSecrets(message) }, { status: 502 });
  }
}
