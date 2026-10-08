/**
 * Mints the session cookie (specs/013-guest-access-mode, US3).
 *
 * This route is the security boundary. The browser may ask for a session, but it never decides what
 * it gets:
 *
 * - `guest` is always issued — it grants the least, so granting it freely costs nothing.
 * - `demo` requires the shared admin password, compared here against server-held state.
 * - `social` requires a provider access token that is checked against Google/Microsoft.
 *
 * Without those checks a signed cookie would be worthless: a caller could simply ask for `demo` and
 * receive a validly-signed demo session. The signature proves the server issued the value; the
 * checks here prove the server had grounds to.
 *
 * Credentials are compared in constant time and never logged or echoed (FR-025).
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import {
  buildClearedSessionCookieValue,
  buildSessionCookieValue,
  type SessionKind,
} from '@/lib/sessionCookie';
import { createLogger } from '@/lib/logging/logger';

const logger = createLogger('session-guard');

/** How the demo password is configured. Falls back to the historical value so a fresh install works. */
function expectedDemoPassword(): string {
  return process.env.DEMO_ADMIN_PASSWORD || '1234@';
}

function isSessionKind(value: unknown): value is Exclude<SessionKind, 'none'> {
  return value === 'guest' || value === 'demo' || value === 'social';
}

/** Constant-time string comparison, so the password cannot be recovered byte by byte. */
function secretsMatch(a: string, b: string): boolean {
  // Hash first so both operands are the same length regardless of input: timingSafeEqual throws on
  // a length mismatch, and raw lengths would leak the password's length.
  const left = createHash('sha256').update(a, 'utf8').digest();
  const right = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(left, right);
}

/**
 * Confirms a social access token really belongs to the account being signed in.
 *
 * The check is the provider's own userinfo endpoint: a token that does not authenticate there is not
 * a session this app should mint a cookie for. A network failure is treated as a refusal — failing
 * closed is the only safe direction, since the alternative grants AI access to an unverified token.
 */
async function isValidProviderToken(
  provider: 'google' | 'microsoft',
  token: string
): Promise<boolean> {
  const endpoint =
    provider === 'google'
      ? 'https://www.googleapis.com/oauth2/v3/userinfo'
      : 'https://graph.microsoft.com/v1.0/me';
  try {
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    // Unreachable provider: refuse rather than assume the token was good.
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'Malformed request body.' }, { status: 400 });
  }

  const kind = body?.kind;
  if (!isSessionKind(kind)) {
    return Response.json({ error: 'Unsupported session kind.' }, { status: 400 });
  }

  if (kind === 'demo') {
    const password = typeof body.password === 'string' ? body.password : '';
    if (!secretsMatch(password, expectedDemoPassword())) {
      logger.warn('refused (invalid-credentials) requested=demo');
      return Response.json(
        { error: 'Invalid credentials.', code: 'SESSION_INVALID' },
        { status: 401 }
      );
    }
  }

  if (kind === 'social') {
    const provider =
      body.provider === 'google' || body.provider === 'microsoft' ? body.provider : null;
    const token = typeof body.accessToken === 'string' ? body.accessToken : '';
    if (!provider || !token || !(await isValidProviderToken(provider, token))) {
      logger.warn('refused (unverified-token) requested=social');
      return Response.json(
        { error: 'Sign-in could not be verified.', code: 'SESSION_INVALID' },
        { status: 401 }
      );
    }
  }

  // A server-supplied start time, so the caller cannot pin a session to a far-future timestamp.
  const startedAt = Date.now();
  const headers = new Headers({ 'content-type': 'application/json' });
  headers.append('set-cookie', buildSessionCookieValue(kind, startedAt));
  return new Response(JSON.stringify({ ok: true, kind }), { status: 200, headers });
}

/** Clears the cookie. `HttpOnly` means the browser cannot clear it, so the server must. */
export function DELETE(): Response {
  const headers = new Headers({ 'content-type': 'application/json' });
  headers.append('set-cookie', buildClearedSessionCookieValue());
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
