// Shared request validation for the AI proxy routes (/api/ai/generate and its /stream sibling).
// Both routes attach a real server-side credential to the outgoing request, so this validation
// is security-sensitive: it must not diverge between the two routes.
import { DEFAULT_BASE_URLS, ENV_VAR_BY_PROVIDER, type CloudProvider } from './aiProviders';
import type { AIMessage } from './aiService';

export const VALID_ROLES = new Set(['system', 'user', 'assistant']);

/**
 * The base URL arrives from the browser, and the route attaches a real credential to the
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

export type BaseUrlResolution = { ok: true; baseUrl: string } | { ok: false; error: string };

/**
 * Validates the requested base URL. "Malformed" and "host not allow-listed" are different
 * problems with different fixes, so they get different messages — and the message names the
 * value actually received, since the stored value is the one thing the user cannot see.
 */
export function resolveAllowedBaseUrl(provider: CloudProvider, requested: unknown): BaseUrlResolution {
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

export function isCloudProvider(value: unknown): value is CloudProvider {
  return typeof value === 'string' && value in ENV_VAR_BY_PROVIDER;
}

/** Accepts only well-formed messages so a malformed body cannot reach the provider. */
export function parseMessages(value: unknown): AIMessage[] | null {
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
 * first — the point of these routes is that no part of a credential reaches the client.
 */
export function redactSecrets(message: string): string {
  return message
    .replace(/\b(?:sk|rk|pk)-[A-Za-z0-9_*-]{4,}/g, '[redacted key]')
    .replace(/\bAIza[A-Za-z0-9_*-]{4,}/g, '[redacted key]');
}

export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
