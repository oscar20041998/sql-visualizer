// Server-side proxy for cloud AI providers.
//
// The browser never sees a provider key: it posts the prompt here and this route attaches the
// credential from the server environment. That is why Settings no longer has an API Key field —
// keys live in .env (OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY) and stay server-side.
// Ollama is not proxied: it needs no key and runs on the user's own machine.
import { NextResponse } from 'next/server';
import { AIServiceError, generateWithCloudKey, type AIMessage } from '@/lib/aiService';
import { DEFAULT_BASE_URLS, ENV_VAR_BY_PROVIDER, type CloudProvider } from '@/lib/aiProviders';

const VALID_ROLES = new Set(['system', 'user', 'assistant']);

interface GenerateRequestBody {
  provider?: string;
  modelId?: string;
  baseUrl?: unknown;
  messages?: unknown;
  temperature?: unknown;
  maxTokens?: unknown;
  jsonMode?: unknown;
}

/**
 * The base URL arrives from the browser, and this route attaches a real credential to the
 * outgoing request — so an unchecked value would let any caller redirect our API key to a host
 * they control. Only each provider's official host is trusted by default; extra hosts (an
 * internal LLM gateway, say) must be opted into server-side via AI_ALLOWED_BASE_URLS.
 */
/** A hostname, optionally with a port — what an allow-list entry must reduce to. */
const HOSTNAME_PATTERN = /^[a-z0-9.-]+(?::\d+)?$/i;

/**
 * Reads one host out of an AI_ALLOWED_BASE_URLS entry. Values get pasted in with array
 * brackets and quotes (`['https://gw/x']`), so those are stripped rather than silently
 * accepted as a hostname that can never match anything.
 */
function parseAllowListEntry(entry: string): string | null {
  const cleaned = entry.replace(/^[\s[\]'"`]+|[\s[\]'"`,]+$/g, '').trim();
  if (!cleaned) return null;

  try {
    // A bare "host:port" parses as a URL whose scheme is the host and whose host is empty, so
    // an empty host means this was not really a URL and must go through the hostname check.
    const host = new URL(cleaned).host;
    if (host) return host.toLowerCase();
  } catch {
    /* fall through to the bare-host check */
  }
  // Accept a bare host such as "gw.corp.example" or "gw.corp.example:8443".
  return HOSTNAME_PATTERN.test(cleaned) ? cleaned.toLowerCase() : null;
}

function allowedHosts(provider: CloudProvider): Set<string> {
  const hosts = new Set<string>();
  try {
    hosts.add(new URL(DEFAULT_BASE_URLS[provider]).host.toLowerCase());
  } catch {
    /* unreachable: the defaults are valid URLs */
  }

  for (const entry of (process.env.AI_ALLOWED_BASE_URLS ?? '').split(',')) {
    if (!entry.trim()) continue;
    const host = parseAllowListEntry(entry);
    if (host) hosts.add(host);
    // A silently ignored entry looks identical to a missing one, which is what made this hard
    // to diagnose in the first place.
    else console.warn(`[api/ai/generate] Ignoring unparseable AI_ALLOWED_BASE_URLS entry: ${entry}`);
  }
  return hosts;
}

type BaseUrlResolution =
  | { ok: true; baseUrl: string }
  | { ok: false; error: string };

/**
 * Validates the requested base URL. "Malformed" and "host not allow-listed" are different
 * problems with different fixes, so they get different messages — and the message names the
 * value actually received, since the stored value is the one thing the user cannot see.
 */
function resolveAllowedBaseUrl(provider: CloudProvider, requested: unknown): BaseUrlResolution {
  if (typeof requested !== 'string' || !requested.trim()) {
    return { ok: true, baseUrl: DEFAULT_BASE_URLS[provider] };
  }

  const raw = requested.trim();
  // Tolerate a base URL pasted without a scheme ("api.openai.com"): assume https rather than
  // rejecting it as malformed, which is the more likely intent.
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return {
      ok: false,
      error: `Base URL "${raw}" is not a valid URL. Use a form like https://api.openai.com in Settings → AI Model Configuration → Base URL.`,
    };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, error: `Base URL "${raw}" must use http or https, not ${parsed.protocol}` };
  }

  const allowed = allowedHosts(provider);
  if (!allowed.has(parsed.host.toLowerCase())) {
    return {
      ok: false,
      error:
        `Base URL host "${parsed.host}" is not allow-listed for ${provider}. ` +
        `Allowed right now: ${[...allowed].join(', ')}. ` +
        `Either set Base URL back to ${DEFAULT_BASE_URLS[provider]} in Settings, ` +
        `or add AI_ALLOWED_BASE_URLS=${parsed.origin} to .env and restart the server.`,
    };
  }

  return { ok: true, baseUrl: candidate };
}

function isCloudProvider(value: unknown): value is CloudProvider {
  return typeof value === 'string' && value in ENV_VAR_BY_PROVIDER;
}

/** Accepts only well-formed messages so a malformed body cannot reach the provider. */
function parseMessages(value: unknown): AIMessage[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const messages: AIMessage[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') return null;
    const { role, content } = entry as { role?: unknown; content?: unknown };
    if (typeof role !== 'string' || !VALID_ROLES.has(role)) return null;
    if (typeof content !== 'string') return null;
    messages.push({ role: role as AIMessage['role'], content });
  }
  return messages;
}

/**
 * Providers echo a partially masked form of the credential back in auth errors (OpenAI 401 says
 * `sk-D8J67*****FzZw`). Those messages are forwarded to the browser, so strip key-shaped tokens
 * first — the point of this route is that no part of a credential reaches the client.
 */
function redactSecrets(message: string): string {
  return message
    .replace(/\b(?:sk|rk|pk)-[A-Za-z0-9_*-]{4,}/g, '[redacted key]')
    .replace(/\bAIza[A-Za-z0-9_*-]{4,}/g, '[redacted key]');
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
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
