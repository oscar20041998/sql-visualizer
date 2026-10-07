// Locks down where AI requests are actually sent: the Base URL saved in Settings → the value the
// browser posts to the proxy → the outbound provider URL the server calls. Regression coverage for
// "AI calls appear to target localhost:4028": that host is only this app's own proxy route (the
// browser never sees the provider call because the credential is attached server-side), and a Base
// URL aimed at the app itself must be rejected with a message that names the fix.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as generatePOST } from '@/app/api/ai/generate/route';
import { POST as streamPOST } from '@/app/api/ai/generate/stream/route';
import { resolveAllowedBaseUrl } from '@/lib/ai/aiRouteValidation';
import { DEFAULT_BASE_URLS, type CloudProvider } from '@/lib/ai/aiProviders';
import { generateWithAI } from '@/lib/ai/aiService';
import { DEFAULT_AI_CONFIG } from '@/lib/store';

// The session gate itself is covered by guestEntitlement.test.ts; this file is about routing.
vi.mock('@/lib/sessionCookie', () => ({ requireAiSession: () => null }));

/** This app's dev origin — the value the original bug report mistook for a provider URL. */
const APP_HOST = 'localhost:4028';
/** An allow-listed OpenAI-compatible gateway, stored in Settings exactly like this. */
const GATEWAY_BASE_URL = 'https://aiportalapi.stu-platform.live/jpe';
const GEMINI_KEY = 'AIzaTestKeyForGemini0000000';

const CLOUD_PROVIDERS: CloudProvider[] = ['openai', 'anthropic', 'gemini'];

/** Shaped so every adapter finds its answer field and the route returns 200. */
const PROVIDER_RESPONSE: Record<CloudProvider, unknown> = {
  openai: { choices: [{ message: { content: 'ok' } }] },
  anthropic: { content: [{ type: 'text', text: 'ok' }] },
  gemini: { candidates: [{ content: { parts: [{ text: 'ok' }] } }] },
};

let savedAllowedBaseUrls: string | undefined;

beforeEach(() => {
  process.env.OPENAI_API_KEY = 'sk-test-openai';
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
  process.env.GEMINI_API_KEY = GEMINI_KEY;
  savedAllowedBaseUrls = process.env.AI_ALLOWED_BASE_URLS;
  // The routes log one info line per call; that would only be noise here.
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => {
  if (savedAllowedBaseUrls === undefined) delete process.env.AI_ALLOWED_BASE_URLS;
  else process.env.AI_ALLOWED_BASE_URLS = savedAllowedBaseUrls;
  vi.restoreAllMocks();
});

/** A Request the way Next.js hands it over: absolute URL, this app's host. */
function routeRequest(route: string, body: unknown): Request {
  return new Request(`http://${APP_HOST}${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function stubProviderFetch(provider: CloudProvider) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(PROVIDER_RESPONSE[provider]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

describe('resolveAllowedBaseUrl — Settings base URL', () => {
  it('defaults each cloud provider to its official root when Settings is blank', () => {
    for (const provider of CLOUD_PROVIDERS) {
      // A blank value is the documented fallback path, so it always resolves ok.
      expect(resolveAllowedBaseUrl(provider, '', APP_HOST)).toEqual({
        ok: true,
        baseUrl: DEFAULT_BASE_URLS[provider],
      });
      expect(resolveAllowedBaseUrl(provider, undefined, APP_HOST)).toEqual({
        ok: true,
        baseUrl: DEFAULT_BASE_URLS[provider],
      });
    }
  });

  it('accepts every official provider host as-is', () => {
    for (const provider of CLOUD_PROVIDERS) {
      const result = resolveAllowedBaseUrl(provider, DEFAULT_BASE_URLS[provider], APP_HOST);
      expect(result).toEqual({ ok: true, baseUrl: DEFAULT_BASE_URLS[provider] });
    }
  });

  it('rejects a Base URL aimed at the app itself and names the fix', () => {
    const result = resolveAllowedBaseUrl('openai', `http://${APP_HOST}`, APP_HOST);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // The message must distinguish "you pointed at the app" from a generic allow-list miss.
    expect(result.error).toContain(`points at this app (${APP_HOST})`);
    expect(result.error).toContain(DEFAULT_BASE_URLS.openai);
  });

  it('still rejects the app origin without selfHost, so no key can be redirected there', () => {
    // Defence in depth: even if a route forgets to pass selfHost, the host is not allow-listed.
    const result = resolveAllowedBaseUrl('openai', `http://${APP_HOST}`);
    expect(result.ok).toBe(false);
  });

  it('lets an operator allow-list the app host explicitly for a same-host gateway', () => {
    process.env.AI_ALLOWED_BASE_URLS = `http://${APP_HOST}`;
    // Allow-list wins over the self-host special case: an intentional setup keeps working.
    expect(resolveAllowedBaseUrl('openai', `http://${APP_HOST}`, APP_HOST).ok).toBe(true);
  });

  it('assumes https for a host pasted without a scheme', () => {
    expect(resolveAllowedBaseUrl('openai', 'api.openai.com', APP_HOST)).toEqual({
      ok: true,
      baseUrl: 'https://api.openai.com',
    });
  });
});

describe('POST /api/ai/generate — outbound URL follows Settings', () => {
  it.each([
    {
      provider: 'openai' as const,
      baseUrl: 'https://api.openai.com',
      modelId: 'gpt-4o',
      expected: 'https://api.openai.com/v1/chat/completions',
    },
    {
      provider: 'anthropic' as const,
      baseUrl: 'https://api.anthropic.com',
      modelId: 'claude-3-7-sonnet-20250219',
      expected: 'https://api.anthropic.com/v1/messages',
    },
    {
      provider: 'gemini' as const,
      baseUrl: 'https://generativelanguage.googleapis.com',
      modelId: 'gemini-3.8-flash',
      expected: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${GEMINI_KEY}`,
    },
  ])(
    'calls the $provider provider URL stored in Settings, not the app',
    async (cases: {
      provider: CloudProvider;
      baseUrl: string;
      modelId: string;
      expected: string;
    }) => {
      const fetchMock = stubProviderFetch(cases.provider);

      const response = await generatePOST(
        routeRequest('/api/ai/generate', {
          provider: cases.provider,
          modelId: cases.modelId,
          baseUrl: cases.baseUrl,
          messages: [{ role: 'user', content: 'hi' }],
        })
      );

      expect(response.status).toBe(200);
      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(cases.expected);
    }
  );

  it('falls back to the official provider root when Settings holds no base URL', async () => {
    const fetchMock = stubProviderFetch('openai');

    const response = await generatePOST(
      routeRequest('/api/ai/generate', {
        provider: 'openai',
        modelId: 'gpt-4o',
        messages: [{ role: 'user', content: 'hi' }],
      })
    );

    expect(response.status).toBe(200);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
  });

  it('honours an allow-listed gateway root from Settings, path included', async () => {
    process.env.AI_ALLOWED_BASE_URLS = 'https://aiportalapi.stu-platform.live';
    const fetchMock = stubProviderFetch('openai');

    const response = await generatePOST(
      routeRequest('/api/ai/generate', {
        provider: 'openai',
        modelId: 'gpt-4o',
        baseUrl: GATEWAY_BASE_URL,
        messages: [{ role: 'user', content: 'hi' }],
      })
    );

    expect(response.status).toBe(200);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://aiportalapi.stu-platform.live/jpe/v1/chat/completions');
  });

  it('refuses a Base URL pointing at this app and never performs a request', async () => {
    const fetchMock = stubProviderFetch('openai');

    const response = await generatePOST(
      routeRequest('/api/ai/generate', {
        provider: 'openai',
        modelId: 'gpt-4o',
        baseUrl: `http://${APP_HOST}`,
        messages: [{ role: 'user', content: 'hi' }],
      })
    );

    expect(response.status).toBe(400);
    const payload = (await response.json()) as { error?: string };
    expect(payload.error).toContain(`points at this app (${APP_HOST})`);
    expect(payload.error).toContain(DEFAULT_BASE_URLS.openai);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/ai/generate/stream — same base URL validation as the non-stream route', () => {
  it('refuses a Base URL pointing at this app before any upstream call', async () => {
    const fetchMock = stubProviderFetch('openai');

    const response = await streamPOST(
      routeRequest('/api/ai/generate/stream', {
        provider: 'openai',
        modelId: 'gpt-4o',
        baseUrl: `http://${APP_HOST}`,
        messages: [{ role: 'user', content: 'hi' }],
      })
    );

    expect(response.status).toBe(400);
    const payload = (await response.json()) as { error?: string };
    expect(payload.error).toContain(`points at this app (${APP_HOST})`);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('generateWithAI — the browser forwards the Settings base URL', () => {
  it('posts config.baseUrls unchanged to the same-origin proxy', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ content: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await generateWithAI(
      {
        ...DEFAULT_AI_CONFIG,
        provider: 'openai',
        baseUrls: { ...DEFAULT_BASE_URLS, openai: GATEWAY_BASE_URL },
      },
      { messages: [{ role: 'user', content: 'hi' }] }
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    // Same-origin proxy by design: the server, not the browser, makes the provider call.
    expect(url).toBe('/api/ai/generate');
    const body = JSON.parse(String(init.body)) as { baseUrl?: string };
    expect(body.baseUrl).toBe(GATEWAY_BASE_URL);
  });
});
