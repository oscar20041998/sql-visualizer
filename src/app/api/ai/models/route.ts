import { NextResponse } from 'next/server';
import { ENV_VAR_BY_PROVIDER, RETIRED_GEMINI_MODELS } from '@/lib/ai/aiProviders';
import { normalizeBaseUrl } from '@/lib/ai/aiService';
import { isCloudProvider, redactSecrets, resolveAllowedBaseUrl } from '@/lib/ai/aiRouteValidation';
import { requireAiSession } from '@/lib/sessionCookie';

interface ModelsRequestBody {
  provider?: unknown;
  baseUrl?: unknown;
}

function isChatCompletionModel(id: string): boolean {
  return (
    /^gpt-(4o|4\.1|4\.5|5)(-|$)/i.test(id) &&
    !/(embedding|audio|transcribe|tts|dall-e|moderation|realtime|search|computer|image|instruct)/i.test(
      id
    )
  );
}

export async function POST(request: Request) {
  const refused = requireAiSession(request, {
    route: '/api/ai/models',
    alwaysRefuseGuest: true,
  });
  if (refused) return refused;

  let body: ModelsRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!isCloudProvider(body.provider)) {
    return NextResponse.json({ error: 'Unsupported provider.' }, { status: 400 });
  }

  const resolvedBaseUrl = resolveAllowedBaseUrl(
    body.provider,
    body.baseUrl,
    // See /api/ai/generate: flags a Base URL pointed at this app itself rather than a provider.
    new URL(request.url).host
  );
  if (!resolvedBaseUrl.ok) {
    return NextResponse.json({ error: resolvedBaseUrl.error }, { status: 400 });
  }

  const apiKey = process.env[ENV_VAR_BY_PROVIDER[body.provider]]?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: `${ENV_VAR_BY_PROVIDER[body.provider]} is not set on the server.` },
      { status: 503 }
    );
  }

  const baseUrl = normalizeBaseUrl(resolvedBaseUrl.baseUrl);
  // Each provider's API key travels in its own header: Anthropic uses `x-api-key`, Gemini uses
  // `x-goog-api-key`, and only OpenAI-compatible endpoints take a `Bearer` token. Sending a Gemini
  // key as `Authorization: Bearer` makes Google reject it — the value is not an OAuth2 access
  // token and asserts no principal — with "API keys are not supported by this API".
  const headers: Record<string, string> =
    body.provider === 'anthropic'
      ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
      : body.provider === 'gemini'
        ? { 'x-goog-api-key': apiKey }
        : { Authorization: `Bearer ${apiKey}` };
  // The key rides in the header, so it stays out of the URL where it would land in access logs.
  const url =
    body.provider === 'gemini'
      ? `${baseUrl}/v1beta/models`
      : body.provider === 'aiportal'
        ? `${baseUrl}/jpe/models`
        : `${baseUrl}/v1/models`;

  try {
    const response = await fetch(url, { headers, signal: request.signal });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = (payload as { error?: { message?: string } } | null)?.error?.message;
      return NextResponse.json(
        { error: redactSecrets(message || `Model listing failed (${response.status}).`) },
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    const models: string[] =
      body.provider === 'gemini'
        ? (
            (
              payload as {
                models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
              }
            )?.models ?? []
          )
            // Only `generateContent` is required. Google's ListModels omits `streamGenerateContent`
            // from every model's method list even though streaming works on all of them, so requiring
            // it here filtered out every model and the picker came up empty.
            .filter((model) => model.supportedGenerationMethods?.includes('generateContent'))
            .map((model) => model.name?.replace(/^models\//, '') ?? '')
            .filter(Boolean)
            // ListModels still advertises shut-down models, which then fail with a 404 at generation
            // time. They are dropped here so the picker only ever offers IDs that can serve a request.
            .filter((id) => !RETIRED_GEMINI_MODELS.some((pattern) => pattern.test(id)))
        : ((payload as { data?: Array<{ id?: string }> })?.data ?? [])
            .map((model) => model.id ?? '')
            .filter((id) =>
              body.provider === 'openai'
                ? isChatCompletionModel(id)
                : body.provider !== 'aiportal' ||
                  !/(embedding|audio|transcribe|tts|image|moderation)/i.test(id)
            );

    return NextResponse.json({ models: [...new Set(models)].sort() });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      return new NextResponse(null, { status: 499 });
    }
    const message = error instanceof Error ? error.message : 'Unable to load provider models.';
    return NextResponse.json({ error: redactSecrets(message) }, { status: 502 });
  }
}
