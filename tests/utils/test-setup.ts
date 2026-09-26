import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { setDemoAuthenticated, type UserSession } from '@/lib/demoAuth';

afterEach(() => {
  cleanup();
});

export function resetTestStorage(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.clear();
  window.sessionStorage.clear();
}

/**
 * Installs a `fetch` stub that accepts the session request.
 *
 * Sessions are now minted by the server, so a test that wants a signed-in user has to stand in for
 * that server. Default is to accept; pass `ok: false` to model a rejected credential.
 */
export function stubSessionEndpoint(ok = true): void {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ ok }), {
      status: ok ? 200 : 401,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch;
}

/** Signs in as a demo user, standing in for the server that issues the session cookie. */
export async function signInAsDemoUser(): Promise<void> {
  stubSessionEndpoint(true);
  await setDemoAuthenticated('test-password');
}

/** Starts a social session, standing in for the server that verifies the provider token. */
export async function signInAsSocialUser(overrides: Partial<UserSession> = {}): Promise<void> {
  stubSessionEndpoint(true);
  const { setSocialSession } = await import('@/lib/demoAuth');
  await setSocialSession({
    provider: 'google',
    displayName: 'Test User',
    email: 'test@example.com',
    accessToken: 'test-token',
    expiry: Date.now() + 3600 * 1000,
    ...overrides,
  });
}
