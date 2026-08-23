// Server-side proxy for cloud embedding providers, mirroring /api/ai/generate: the browser
// posts text here and this route attaches the credential from the server environment so it
// never reaches the client bundle or localStorage. Ollama is not proxied — it runs locally and
// needs no key.
import { NextResponse } from 'next/server';
import { AIServiceError, embedWithCloudKey } from '@/lib/ai/aiService';
import { ENV_VAR_BY_PROVIDER } from '@/lib/ai/aiProviders';
import { isCloudProvider, redactSecrets, resolveAllowedBaseUrl } from '@/lib/ai/aiRouteValidation';

interface EmbedRequestBody {
  provider?: string;
  modelId?: string;
  baseUrl?: unknown;
  text?: unknown;
}

export async function POST(request: Request) {
  let body: EmbedRequestBody;
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

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return NextResponse.json({ error: 'text is required.' }, { status: 400 });
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
    return NextResponse.json(
      { error: `${envVar} is not set on the server. Add it to .env and restart the dev server.` },
      { status: 503 }
    );
  }

  try {
    const embedding = await embedWithCloudKey(body.provider, apiKey, modelId, baseUrl, text, request.signal);
    return NextResponse.json({ embedding });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      return new NextResponse(null, { status: 499 });
    }
    const message = error instanceof AIServiceError ? error.message : 'The embedding request failed on the server.';
    if (!(error instanceof AIServiceError)) console.error('[api/ai/embed]', error);
    return NextResponse.json({ error: redactSecrets(message) }, { status: 502 });
  }
}
