/**
 * Server-verifiable session for the AI routes (specs/013-guest-access-mode, US3).
 *
 * The browser holds its own session marker, but the server cannot see it. Without a cookie the AI
 * routes have no proof of anything, so an anonymous caller could spend the operator's metered quota.
 *
 * The cookie is **minted and signed by the server** and is `HttpOnly`, so script cannot read or write
 * it (see {@link signSessionValue}). Its value carries only the session kind and start time — never an
 * email, display name, provider token or API key (FR-028).
 *
 * Note what this does and does not prove. The signature stops a caller from editing `kind` to
 * `demo`. It does not by itself make the app authenticated: minting a `demo` or `social` session
 * still requires the server to check something real, which it does in the `/api/session` route.
 */

import { signSessionValue, verifySessionValue } from '@/lib/sessionCrypto';
import { createLogger } from '@/lib/logging/logger';

export const SESSION_COOKIE_NAME = 'sqlv_session';

export type SessionKind = 'guest' | 'demo' | 'social' | 'none';

export interface ServerSession {
  kind: SessionKind;
  startedAt: number;
}

function isSessionKind(value: unknown): value is SessionKind {
  return value === 'guest' || value === 'demo' || value === 'social' || value === 'none';
}

function isServerSession(value: unknown): value is ServerSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<ServerSession>;
  return isSessionKind(session.kind) && typeof session.startedAt === 'number';
}

/**
 * Encodes a session into a signed cookie value. Server-only — a client cannot produce a value the
 * server will accept, which is the whole point.
 *
 * The JSON is percent-encoded so the value is safe inside a cookie header, then signed. Pure, so
 * the issuing route and any test can call it.
 */
export function encodeSession(kind: Exclude<SessionKind, 'none'>, startedAt: number): string {
  const payload = encodeURIComponent(JSON.stringify({ kind, startedAt } satisfies ServerSession));
  return signSessionValue(payload);
}

/**
 * Verifies and decodes a cookie value.
 *
 * A missing, unsigned, tampered or malformed value yields no session rather than a throw, so a bad
 * cookie can never produce a 500 or be used to probe the route (SC-004). Because the signature is
 * checked *before* the JSON is parsed, a forged value never reaches the parser at all.
 */
export function decodeSession(value: string | undefined): ServerSession | null {
  const payload = verifySessionValue(value);
  if (!payload) return null;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(payload));
    if (isServerSession(parsed)) return parsed;
  } catch {
    // A correctly signed but unparseable payload means a server/client version mismatch, not a call
    // worth surfacing; treat it as no session.
  }
  return null;
}

/**
 * Reads the session from the request's cookies. Server-only.
 *
 * Only the raw header value is tried: the value is signed, so it arrives exactly as issued. The old
 * decode-twice fallback is gone — that leniency existed to tolerate unsigned JSON, and keeping it
 * would let a caller smuggle a second, differently-encoded candidate past the signature check.
 */
export function readSession(request: Request): ServerSession | null {
  const header = request.headers.get('cookie') ?? '';
  const match = header.split(';').find((part) => part.trim().startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!match) return null;
  return decodeSession(match.trim().slice(SESSION_COOKIE_NAME.length + 1));
}

/**
 * Cookie attributes for the server-issued `Set-Cookie`.
 *
 * `httpOnly` is the point: the browser must not be able to rewrite the value, since the signature is
 * what makes it meaningful.
 */
export function sessionCookieOptions({ maxAge }: { maxAge?: number } = {}) {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(maxAge ? { maxAge } : {}),
  };
}

/** Renders the `Set-Cookie` header value. */
export function buildSessionCookieValue(kind: Exclude<SessionKind, 'none'>, startedAt: number): string {
  const { name, maxAge } = sessionCookieOptions(
    kind === 'social' ? { maxAge: 60 * 60 } : {}
  );
  return [
    `${name}=${encodeSession(kind, startedAt)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
    ...(maxAge ? [`Max-Age=${maxAge}`] : []),
  ].join('; ');
}

/** Renders a `Set-Cookie` value that clears the session on sign-out. */
export function buildClearedSessionCookieValue(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/** What {@link evaluateSession} allows. */
export type SessionVerdict =
  | { allowed: true }
  | { allowed: false; reason: 'no-session' | 'guest-not-entitled'; sessionKind: SessionKind };

/**
 * The decision the routes need: may this caller spend the operator's capacity?
 *
 * Separate from {@link readSession} so the ordering guarantee (FR-023) is explicit at the call site
 * — run this BEFORE reading a credential or calling a provider, so a refusal costs nothing.
 */
export function evaluateSession(
  session: ServerSession | null,
  options: { alwaysRefuseGuest?: boolean; allowAnonymous?: boolean } = {}
): SessionVerdict {
  if (session === null) {
    if (options.allowAnonymous) return { allowed: true };
    return { allowed: false, reason: 'no-session', sessionKind: 'none' };
  }
  if (session.kind === 'guest' && options.alwaysRefuseGuest) {
    return { allowed: false, reason: 'guest-not-entitled', sessionKind: 'guest' };
  }
  return { allowed: true };
}

/** The 401 body. `code` is a stable discriminator the client switches on (FR-024). */
export function refusalBody(verdict: Extract<SessionVerdict, { allowed: false }>) {
  return {
    error: 'Authentication required for this AI capability.',
    code: 'AI_SESSION_REQUIRED',
    sessionKind: verdict.sessionKind,
  };
}

/**
 * Reads the session, evaluates it, records a refusal if needed, and returns the 401 to send.
 *
 * Returns `null` when the caller may proceed. Call this first in the handler: the whole point is
 * that a refused request must not reach the credential read or the provider call (FR-023).
 *
 * Refusals are logged through the existing structured logger, never persisted, and never include
 * the prompt or any credential (FR-025, SC-009, SC-010).
 */
export function requireAiSession(
  request: Request,
  options: { route: string; alwaysRefuseGuest?: boolean; allowAnonymous?: boolean }
): Response | null {
  const session = readSession(request);
  const verdict = evaluateSession(session, options);
  if (verdict.allowed) return null;

  // Log the refusal for the operator: route, session kind and reason — never prompt content.
  createLogger('ai-session-guard').warn(
    `[${options.route}] refused (${verdict.reason}) sessionKind=${verdict.sessionKind}`
  );

  return Response.json(refusalBody(verdict), { status: 401 });
}
