// Server-side proxy for cloud AI providers.
//
// The browser never sees a provider key: it posts the prompt here and this route attaches the
// credential from the server environment. That is why Settings no longer has an API Key field —
// keys live in .env (OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY) and stay server-side.
// Ollama is not proxied: it needs no key and runs on the user's own machine.
import { NextResponse } from 'next/server';
import { AIServiceError, generateWithCloudKey } from '@/lib/ai/aiService';
import {
  clampNumber,
  isCloudProvider,
  parseMessages,
  redactSecrets,
  resolveAllowedBaseUrl,
} from '@/lib/ai/aiRouteValidation';

interface GenerateRequestBody {
  provider?: string;
  modelId?: string;
  baseUrl?: unknown;
  messages?: unknown;
  temperature?: unknown;
  maxTokens?: unknown;
  jsonMode?: unknown;
}

export async function POST(request: Request) {
  let body: GenerateRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!isCloudProvider(body.provider)) {
    return NextResponse.json(
      { error: `Unsupported provider for this route: ${String(body.provider)}` },
      { status: 400 }
    );
  }

  const messages = parseMessages(body.messages);
  if (!messages) {
    return NextResponse.json({ error: 'messages must be a non-empty array of {role, content}.' }, { status: 400 });
  }

  const modelId = typeof body.modelId === 'string' ? body.modelId.trim() : '';
  if (!modelId) {
    return NextResponse.json({ error: 'modelId is required.' }, { status: 400 });
  }

  const resolvedBaseUrl = resolveAllowedBaseUrl(body.provider, body.baseUrl);
  if (!resolvedBaseUrl.ok) {
    return NextResponse.json({ error: resolvedBaseUrl.error }, { status: 400 });
  }
  const baseUrl = resolvedBaseUrl.baseUrl;

  const envVar = ENV_VAR_BY_PROVIDER[body.provider];
  const apiKey = process.env[envVar]?.trim();
  if (!apiKey) {
    // 503 rather than 401: the deployment is misconfigured, the caller did nothing wrong.
    return NextResponse.json(
      { error: `${envVar} is not set on the server. Add it to .env and restart the dev server.` },
      { status: 503 }
    );
  }

  try {
    const content = await generateWithCloudKey(body.provider, apiKey, modelId, baseUrl, {
      messages,
      temperature: clampNumber(body.temperature, 0, 2, 0.1),
      maxTokens: clampNumber(body.maxTokens, 128, 16384, 1200),
      jsonMode: body.jsonMode === true,
      signal: request.signal,
    });
    return NextResponse.json({ content });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      // The browser cancelled; nothing to report back.
      return new NextResponse(null, { status: 499 });
    }
    const message = error instanceof AIServiceError ? error.message : 'The AI request failed on the server.';
    if (!(error instanceof AIServiceError)) console.error('[api/ai/generate]', error);
    return NextResponse.json({ error: redactSecrets(message) }, { status: 502 });
  }
}
