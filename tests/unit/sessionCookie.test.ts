import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  decodeSession,
  encodeSession,
  readSession,
  buildSessionCookieValue,
  buildClearedSessionCookieValue,
  evaluateSession,
  SESSION_COOKIE_NAME,
} from '@/lib/sessionCookie';
import { signSessionValue } from '@/lib/sessionCrypto';
import {
  GuestNotEntitledError,
  isSessionRequiredResponse,
  readFailure,
} from '@/lib/ai/aiService';

const ORIGINAL_SECRET = process.env.SESSION_SECRET;

function requestWithCookie(value: string): Request {
  return new Request('http://localhost/api/ai/generate', {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${value}` },
  });
}

describe('session cookie — server-issued and signed (specs/013 US3)', () => {
  beforeEach(() => {
    // A stable key so a value signed in one call verifies in the next.
    process.env.SESSION_SECRET = 'test-secret';
  });

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = ORIGINAL_SECRET;
  });

  it('round-trips a session it signed itself', () => {
    const value = encodeSession('demo', 1_700_000_000_000);
    expect(decodeSession(value)).toEqual({ kind: 'demo', startedAt: 1_700_000_000_000 });
  });

  it('is HttpOnly so script cannot read or rewrite it', () => {
    const header = buildSessionCookieValue('demo', Date.now());
    expect(header).toContain('HttpOnly');
    // The whole reason the cookie is server-issued: the browser must not be able to author it.
    expect(buildClearedSessionCookieValue()).toContain('HttpOnly');
  });

  // The vulnerability that motivated the change: an unsigned JSON cookie let a caller claim
  // kind=demo and spend the operator's capacity. These cases must all yield "no session".
  it('refuses the old unsigned JSON cookie a caller could hand-write', () => {
    const forged = encodeURIComponent(JSON.stringify({ kind: 'demo', startedAt: Date.now() }));
    expect(decodeSession(forged)).toBeNull();
  });

  it('refuses a tampered kind on an otherwise valid cookie', () => {
    const value = encodeSession('guest', Date.now());
    const [payload, signature] = value.split('.');
    const swapped = encodeURIComponent(JSON.stringify({ kind: 'demo', startedAt: Date.now() }));
    expect(decodeSession(`${swapped}.${signature}`)).toBeNull();
    expect(payload).not.toBe(swapped);
  });

  it('refuses a value whose payload was edited after signing', () => {
    const value = encodeSession('guest', Date.now());
    const [, signature] = value.split('.');
    const edited = signSessionValue(
      encodeURIComponent(JSON.stringify({ kind: 'demo', startedAt: Date.now() }))
    );
    // Sanity: a legitimately signed demo value would verify, so this test is not vacuous.
    expect(decodeSession(edited)).toEqual({ kind: 'demo', startedAt: expect.any(Number) });
    // Mixing a real signature with a different payload must not verify.
    expect(decodeSession(`${encodeURIComponent(JSON.stringify({ kind: 'demo', startedAt: 1 }))}.${signature}`)).toBeNull();
  });

  it('refuses a cookie signed under a different key', () => {
    const value = encodeSession('demo', Date.now());
    process.env.SESSION_SECRET = 'a-different-secret';
    expect(decodeSession(value)).toBeNull();
  });

  it('refuses a signature belonging to another payload', () => {
    const other = signSessionValue('something-else');
    const [, signature] = other.split('.');
    expect(decodeSession(`${encodeSession('demo', Date.now()).split('.')[0]}.${signature}`)).toBeNull();
  });

  it('treats a missing or malformed cookie as no session, never a throw', () => {
    expect(decodeSession(undefined)).toBeNull();
    expect(decodeSession('')).toBeNull();
    expect(decodeSession('not-a-cookie')).toBeNull();
    expect(decodeSession('.')).toBeNull();
    expect(decodeSession('a.')).toBeNull();
  });

  it('reads a signed cookie off a real request header', () => {
    const value = encodeSession('social', 1_700_000_000_000);
    expect(readSession(requestWithCookie(value))).toEqual({
      kind: 'social',
      startedAt: 1_700_000_000_000,
    });
  });

  it('reads a signed cookie that sits among other cookies', () => {
    const value = encodeSession('demo', 1_700_000_000_000);
    const request = new Request('http://localhost', {
      headers: { cookie: `theme=dark; ${SESSION_COOKIE_NAME}=${value}; locale=vi` },
    });
    expect(readSession(request)).toEqual({ kind: 'demo', startedAt: 1_700_000_000_000 });
  });

  it('yields no session for a forged cookie in a request header', () => {
    const forged = encodeURIComponent(JSON.stringify({ kind: 'demo', startedAt: Date.now() }));
    expect(readSession(requestWithCookie(forged))).toBeNull();
  });

  // FR-014: a refused session must not reach the user as an opaque "HTTP 401".
  describe('isSessionRequiredResponse', () => {
    const refusal = { code: 'AI_SESSION_REQUIRED', sessionKind: 'guest' };

    it('recognises the server refusal', () => {
      expect(isSessionRequiredResponse(401, refusal)).toBe(true);
      expect(isSessionRequiredResponse(401, { code: 'AI_SESSION_REQUIRED' })).toBe(true);
    });

    it('does not mistake a genuine failure for a session refusal', () => {
      expect(isSessionRequiredResponse(500, refusal)).toBe(false);
      expect(isSessionRequiredResponse(401, { error: 'Provider unavailable' })).toBe(false);
      expect(isSessionRequiredResponse(401, null)).toBe(false);
      expect(isSessionRequiredResponse(401, 'not an object')).toBe(false);
    });
  });

  describe('readFailure', () => {
    const respond = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

    it('raises the guest refusal rather than the generic message', async () => {
      await expect(
        readFailure(respond(401, { code: 'AI_SESSION_REQUIRED', sessionKind: 'guest' }), 'fallback')
      ).rejects.toBeInstanceOf(GuestNotEntitledError);
    });

    it('surfaces the route message for any other failure', async () => {
      await expect(readFailure(respond(502, { error: 'Provider unreachable' }), 'fallback')).rejects.toThrow(
        'Provider unreachable'
      );
    });

    // A proxy or a crash can answer with HTML, so the body may not be JSON at all.
    it('falls back rather than throwing a parse error', async () => {
      await expect(readFailure(new Response('<html>502</html>', { status: 502 }), 'fallback')).rejects.toThrow(
        'fallback'
      );
    });
  });

/**
 * Route-level contract for `POST /api/session` (specs/013-guest-access-mode, US3).
 *
 * The cookie tests prove the value is signed. These prove the thing that actually closes the hole:
 * **the server decides what it hands out.** A correctly signed cookie for a credential the server
 * never verified would be worthless, so each case asserts on the `Set-Cookie` header, not only the
 * status — a cookie set to an empty value is still sent by the browser.
 */
describe('/api/session — the server issues, the client only asks', () => {
  const ORIGINAL_SECRET = process.env.SESSION_SECRET;
  const ORIGINAL_PASSWORD = process.env.DEMO_ADMIN_PASSWORD;

  beforeEach(() => {
    process.env.SESSION_SECRET = 'test-secret';
    process.env.DEMO_ADMIN_PASSWORD = 'correct-horse';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (ORIGINAL_SECRET === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = ORIGINAL_SECRET;
    if (ORIGINAL_PASSWORD === undefined) delete process.env.DEMO_ADMIN_PASSWORD;
    else process.env.DEMO_ADMIN_PASSWORD = ORIGINAL_PASSWORD;
  });

  const post = async (body: unknown) => {
    const { POST } = await import('@/app/api/session/route');
    return POST(
      new Request('http://localhost/api/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
    );
  };

  const setCookieOf = (response: Response) => response.headers.get('set-cookie');

  // A guest grants the least, so issuing one freely costs the operator nothing.
  it('issues a guest cookie with no credential at all', async () => {
    const response = await post({ kind: 'guest' });
    expect(response.status).toBe(200);
    expect(setCookieOf(response)).toContain('HttpOnly');
    expect(setCookieOf(response)).toContain('sqlv_session=');
  });

  it('refuses a wrong demo password and sets no cookie', async () => {
    const response = await post({ kind: 'demo', password: 'wrong' });
    expect(response.status).toBe(401);
    expect(setCookieOf(response)).toBeNull();
  });

  it('refuses a missing demo password', async () => {
    const response = await post({ kind: 'demo' });
    expect(response.status).toBe(401);
    expect(setCookieOf(response)).toBeNull();
  });

  it('issues a demo cookie only for the correct password', async () => {
    const response = await post({ kind: 'demo', password: 'correct-horse' });
    expect(response.status).toBe(200);
    expect(setCookieOf(response)).toContain('sqlv_session=');
  });

  it('never echoes the supplied credential back', async () => {
    const response = await post({ kind: 'demo', password: 'correct-horse' });
    expect(await response.text()).not.toContain('correct-horse');
  });

  describe('social sessions', () => {
    it('refuses a token the provider does not recognise', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })));
      const response = await post({ kind: 'social', provider: 'google', accessToken: 'fake' });
      expect(response.status).toBe(401);
      expect(setCookieOf(response)).toBeNull();
    });

    // Fail closed: an unreachable provider means the token is unverified, not presumed good.
    it('refuses when the provider cannot be reached at all', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw new Error('network down');
        })
      );
      const response = await post({ kind: 'social', provider: 'google', accessToken: 'token' });
      expect(response.status).toBe(401);
      expect(setCookieOf(response)).toBeNull();
    });

    it('issues the cookie only once the provider confirms the token', async () => {
      const providerFetch = vi.fn(async () => new Response('{}', { status: 200 }));
      vi.stubGlobal('fetch', providerFetch);
      const response = await post({ kind: 'social', provider: 'google', accessToken: 'good-token' });
      expect(response.status).toBe(200);
      expect(setCookieOf(response)).toContain('sqlv_session=');
      // The token must actually be presented, otherwise the "check" verifies nothing.
      expect(String(providerFetch.mock.calls[0][0])).toContain('googleapis.com');
    });
  });

  it('rejects an unknown session kind', async () => {
    for (const kind of ['admin', 'superuser', '', null, 1]) {
      const response = await post({ kind });
      expect(response.status).toBe(400);
      expect(setCookieOf(response)).toBeNull();
    }
  });

  it('rejects a malformed body without a 500', async () => {
    const { POST } = await import('@/app/api/session/route');
    const response = await POST(
      new Request('http://localhost/api/session', { method: 'POST', body: 'not json' })
    );
    expect(response.status).toBe(400);
  });

  it('clears the cookie on DELETE', async () => {
    const { DELETE } = await import('@/app/api/session/route');
    const cookie = setCookieOf(DELETE());
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Max-Age=0');
  });

  // The end-to-end property: whatever the server issues must verify, so the client's readSession
  // and the route's issue step cannot drift apart.
  it('issues cookies that decodeSession can verify', async () => {
    const response = await post({ kind: 'demo', password: 'correct-horse' });
    const value = setCookieOf(response)!.split(';')[0].split('=').slice(1).join('=');
    expect(decodeSession(value)).toEqual({ kind: 'demo', startedAt: expect.any(Number) });
  });
});

  // A forged or absent cookie must fail toward refusal, never toward access.
  it('refuses a guest and a missing session, and allows a verified identity', () => {
    const guest = { kind: 'guest', startedAt: 1 } as const;
    const demo = { kind: 'demo', startedAt: 1 } as const;

    expect(evaluateSession(guest, { alwaysRefuseGuest: true })).toEqual({
      allowed: false,
      reason: 'guest-not-entitled',
      sessionKind: 'guest',
    });
    expect(evaluateSession(null, {}).allowed).toBe(false);
    expect(evaluateSession(null, { allowAnonymous: true }).allowed).toBe(true);
    expect(evaluateSession(demo, { alwaysRefuseGuest: true }).allowed).toBe(true);
  });
});