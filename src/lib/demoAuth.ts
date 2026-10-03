// Temporary client-side session management.
export const DEMO_AUTH_STORAGE_KEY = 'sqlvisualizer-demo-authenticated';
export const SOCIAL_AUTH_STORAGE_KEY = 'sqlvisualizer-user-session';

export interface UserSession {
  provider: 'google' | 'microsoft';
  displayName: string;
  email: string;
  avatarUrl?: string;
  accessToken: string;
  expiry: number; // Unix timestamp in ms
}

export interface AuthProviderConfig {
  clientId: string;
  authUrl: string;
  redirectUri: string;
  scopes: string[];
}

export interface OAuthCallbackPayload {
  accessToken?: string;
  expiresIn?: number;
  state?: string;
  error?: string;
  errorDescription?: string;
  profile?: { name: string; email: string; picture?: string };
}

export type AuthUIState = 'idle' | 'authenticating' | 'error';

function isUserSession(value: unknown): value is UserSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<UserSession>;
  return (
    (session.provider === 'google' || session.provider === 'microsoft') &&
    typeof session.displayName === 'string' &&
    typeof session.email === 'string' &&
    typeof session.accessToken === 'string' &&
    typeof session.expiry === 'number' &&
    Number.isFinite(session.expiry)
  );
}

/**
 * Whether a real identity is signed in.
 *
 * Deliberately excludes guests (specs/013-guest-access-mode). A guest may enter the workspace, so
 * mixing it into this predicate would answer "yes, signed in" for someone who is not — which made the
 * login page redirect an active guest straight back to `/login`, and would have let any caller-site
 * check use this as a stand-in for authentication. Guests are asked with {@link isGuestSession}.
 */
export function isDemoAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Check legacy admin
  if (window.localStorage.getItem(DEMO_AUTH_STORAGE_KEY) === 'true') {
    return true;
  }

  // 2. Check social session
  return getSocialSession() !== null;
}

// ─── Guest access ──────────────────────────────────────────────────────────────
// A guest is a marker on the existing session rather than a new session type, so it adds no
// lifecycle of its own and is cleared by the same sign-out path. It deliberately carries no
// identity fields — there is no account behind it.

export const GUEST_AUTH_STORAGE_KEY = 'sqlvisualizer-guest-session';

export interface GuestSession {
  /** Epoch ms when the guest session began. */
  startedAt: number;
  /** Display language at the moment the session started. */
  locale: 'en' | 'vi';
}

function isGuestSessionValue(value: unknown): value is GuestSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<GuestSession>;
  return (
    typeof session.startedAt === 'number' &&
    Number.isFinite(session.startedAt) &&
    (session.locale === 'en' || session.locale === 'vi')
  );
}

export function getGuestSession(): GuestSession | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(GUEST_AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isGuestSessionValue(parsed)) return parsed;
  } catch {
    // Treat malformed storage as "no guest session" rather than throwing.
  }
  clearGuestSession();
  return null;
}

export function setGuestSession(session: GuestSession): void {
  // A guest and a real identity are mutually exclusive: starting one discards the other, so a
  // stale social session is never silently restored alongside a guest marker.
  clearSocialSession();
  window.localStorage.removeItem(DEMO_AUTH_STORAGE_KEY);
  window.localStorage.setItem(GUEST_AUTH_STORAGE_KEY, JSON.stringify(session));
  // Fire-and-forget: the marker is what the interface reads, the cookie is what the server verifies.
  void persistGuestSessionCookie(session.startedAt);
}

export function clearGuestSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(GUEST_AUTH_STORAGE_KEY);
  clearSessionCookie();
}

/**
 * True only for a guest: an authenticated user is never a guest.
 *
 * Naming avoids colliding with the `isGuest` boolean a component holds, so importing both is
 * unambiguous at the call site.
 */
export function isGuestSession(): boolean {
  return getSocialSession() === null && getGuestSession() !== null;
}

/**
 * Starts a demo session.
 *
 * The password is sent to the server because the server is what verifies it: a client-side check
 * would leave the cookie forgeable by anyone who read the source (research.md R6, R8).
 *
 * Resolves to whether the server accepted the credentials, so the caller can surface a real failure
 * instead of appearing signed in with no AI access.
 */
export function setDemoAuthenticated(password: string): Promise<boolean> {
  return persistDemoSessionCookie(password, Date.now()).then((granted) => {
    // The marker is written only when the server agreed. Writing it first would show a signed-in UI
    // for credentials the server never accepted.
    if (granted) window.localStorage.setItem(DEMO_AUTH_STORAGE_KEY, 'true');
    return granted;
  });
}

/**
 * Asks the server to mint the session cookie, and clears it on sign-out.
 *
 * The cookie is `HttpOnly` and signed, so it cannot be written from the browser any more — this
 * request is the only way to obtain one. The localStorage marker still records that a session was
 * started; the cookie is what the AI routes verify.
 *
 * Returns whether the server issued a session. A `false` result is not an error to hide: the local
 * session remains valid for the workspace, only the AI capability is unavailable.
 */
async function requestSession(
  body: Record<string, unknown>
): Promise<boolean> {
  if (typeof fetch === 'undefined') return false;
  try {
    const response = await fetch('/api/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // The cookie is HttpOnly, so it must be stored by the browser itself.
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    return response.ok;
  } catch {
    // Offline or the route is unavailable: the workspace still works, the AI gate stays shut.
    return false;
  }
}

/** Starts a guest session: the browser marker plus a server-issued cookie. */
export async function persistGuestSessionCookie(startedAt: number): Promise<boolean> {
  return requestSession({ kind: 'guest', startedAt });
}

/**
 * Starts a demo session. The password is verified by the server, which is the only reason the cookie
 * means anything (research.md R6, R8).
 */
export async function persistDemoSessionCookie(password: string, startedAt: number): Promise<boolean> {
  return requestSession({ kind: 'demo', password, startedAt });
}

/** Starts a social session, after the server has confirmed the provider token. */
export async function persistSocialSessionCookie(
  provider: 'google' | 'microsoft',
  accessToken: string,
  startedAt: number
): Promise<boolean> {
  return requestSession({ kind: 'social', provider, accessToken, startedAt });
}

/** Removes the session cookie on sign-out. The browser cannot clear it, so the server must. */
export function clearSessionCookie(): void {
  if (typeof fetch === 'undefined') return;
  // Fire-and-forget: sign-out must complete even if the request cannot be made.
  void fetch('/api/session', { method: 'DELETE', credentials: 'same-origin' }).catch(() => {});
}

export function clearDemoAuthenticated(): void {
  window.localStorage.removeItem(DEMO_AUTH_STORAGE_KEY);
  clearSocialSession();
  // Sign-out ends a guest session too — it is the same session, not a parallel one (FR-019).
  clearGuestSession();
}

export function getSocialSession(): UserSession | null {
  if (typeof window === 'undefined') return null;

  const sessionStr = window.localStorage.getItem(SOCIAL_AUTH_STORAGE_KEY);
  if (!sessionStr) return null;

  try {
    const parsed: unknown = JSON.parse(sessionStr);
    if (isUserSession(parsed) && Date.now() < parsed.expiry) return parsed;
  } catch {
    // Treat malformed local storage as an unauthenticated session.
  }

  clearSocialSession();
  return null;
}

export function clearSocialSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SOCIAL_AUTH_STORAGE_KEY);
}

/**
 * Starts a social session, after the server has confirmed the provider token.
 *
 * Resolves to whether the server accepted it. The token is verified server-side, so a hand-written
 * localStorage entry cannot produce a working AI cookie.
 */
export async function setSocialSession(session: UserSession): Promise<boolean> {
  const granted = await persistSocialSessionCookie(session.provider, session.accessToken, Date.now());
  if (granted) window.localStorage.setItem(SOCIAL_AUTH_STORAGE_KEY, JSON.stringify(session));
  return granted;
}
