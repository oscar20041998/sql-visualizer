import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/ai/models/route';
import {
  generateWithAI,
  generateWithCloudKey,
  resolveHintedTableReferences,
} from '@/lib/ai/aiService';
import { DEFAULT_AI_CONFIG } from '@/lib/store';
import { DEFAULT_CHAT_MODELS, RETIRED_GEMINI_MODELS } from '@/lib/ai/aiProviders';
import type { AIModelConfig } from '@/lib/store';
import type { AnalysisResult } from '@/lib/sql/sqlAnalyzer';

/**
 * The provider's credential must travel in the header that provider documents. The regression these
 * tests lock down is Gemini being sent `Authorization: Bearer <api key>`: Google reads that as an
 * OAuth2 assertion, finds no principal, and answers "API keys are not supported by this API" —
 * which surfaced in Settings as an immediate failure when listing models.
 */

// The route refuses guests before it ever looks at a provider, so an authorized session is stubbed.
vi.mock('@/lib/sessionCookie', () => ({ requireAiSession: () => null }));

const GEMINI_KEY = 'AIzaSyTestKeyForGemini0000000';

/**
 * Shaped exactly like Google's real ListModels response: none of these models advertise
 * `streamGenerateContent`, because that endpoint is omitted from the method list even though
 * streaming works on all of them. Filtering on it is what emptied the picker.
 */
function geminiModelList(): Response {
  return new Response(
    JSON.stringify({
      models: [
        {
          name: 'models/gemini-3.8-flash',
          supportedGenerationMethods: [
            'generateContent',
            'countTokens',
            'createCachedContent',
            'batchGenerateContent',
          ],
        },
        {
          name: 'models/gemini-2.5-pro',
          supportedGenerationMethods: ['generateContent', 'countTokens'],
        },
        {
          name: 'models/gemini-2.0-flash',
          supportedGenerationMethods: ['generateContent'],
        },
        {
          name: 'models/text-embedding-004',
          supportedGenerationMethods: ['embedContent'],
        },
      ],
    }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  );
}

async function listModels(provider: string) {
  const fetchMock = vi.fn().mockResolvedValue(geminiModelList());
  vi.stubGlobal('fetch', fetchMock);

  const response = await POST(
    new Request('http://localhost/api/ai/models', {
      method: 'POST',
      body: JSON.stringify({ provider }),
    })
  );

  return { fetchMock, response };
}

beforeEach(() => {
  process.env.GEMINI_API_KEY = GEMINI_KEY;
  process.env.OPENAI_API_KEY = 'sk-test-openai';
  vi.unstubAllGlobals();
});

describe('GET /api/ai/models provider authentication', () => {
  it('sends a Gemini API key in x-goog-api-key, never as a Bearer token', async () => {
    const { fetchMock } = await listModels('gemini');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;

    expect(headers['x-goog-api-key']).toBe(GEMINI_KEY);
    expect(headers.Authorization).toBeUndefined();
    // Keeping the key out of the URL keeps it out of server and proxy access logs.
    expect(url).not.toContain(GEMINI_KEY);
    expect(url).not.toContain('key=');
  });

  it('lists models that support generateContent, even without streamGenerateContent advertised', async () => {
    const { response } = await listModels('gemini');
    const payload = (await response.json()) as { models: string[] };

    expect(response.status).toBe(200);
    // text-embedding-004 is embed-only and must stay out of the chat picker. The 2.x models are
    // gone too: ListModels keeps advertising them, but they answer generateContent with a 404.
    expect(payload.models).toEqual(['gemini-3.8-flash']);
  });

  it('never offers a Gemini model that has been shut down', () => {
    // The shutdown error tells users to move to gemini-3.1-pro-preview, which is itself shut down.
    // The blocklist follows the deprecation table, not that advice.
    for (const retired of ['gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-3.1-pro-preview']) {
      expect(RETIRED_GEMINI_MODELS.some((pattern) => pattern.test(retired))).toBe(true);
    }
    expect(RETIRED_GEMINI_MODELS.some((pattern) => pattern.test('gemini-3.8-flash'))).toBe(false);
  });

  it('keeps the Bearer token for OpenAI, which does take one', async () => {
    const { fetchMock } = await listModels('openai');
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;

    expect(headers.Authorization).toBe('Bearer sk-test-openai');
    expect(headers['x-goog-api-key']).toBeUndefined();
  });
});

function makeAnalysisWithTables(names: string[]): AnalysisResult {
  return {
    tables: names.map((name, index) => ({ id: `t${index}`, name, columns: [] })),
  } as unknown as AnalysisResult;
}

describe('resolveHintedTableReferences', () => {
  it('resolves hints that match a known table name (case-insensitive)', () => {
    const analysis = makeAnalysisWithTables(['orders', 'customers']);
    const { resolved, unresolved } = resolveHintedTableReferences(
      ['Orders', 'customers'],
      analysis
    );
    expect(resolved).toEqual(['Orders', 'customers']);
    expect(unresolved).toEqual([]);
  });

  it('reports hints that do not match any known table as unresolved', () => {
    const analysis = makeAnalysisWithTables(['orders']);
    const { resolved, unresolved } = resolveHintedTableReferences(
      ['orders', 'shipping_addresses'],
      analysis
    );
    expect(resolved).toEqual(['orders']);
    expect(unresolved).toEqual(['shipping_addresses']);
  });

  it('treats every hint as unresolved when there is no analysis', () => {
    const { resolved, unresolved } = resolveHintedTableReferences(['orders'], null);
    expect(resolved).toEqual([]);
    expect(unresolved).toEqual(['orders']);
  });

  it('ignores blank hints', () => {
    const analysis = makeAnalysisWithTables(['orders']);
    const { resolved, unresolved } = resolveHintedTableReferences(['', '  ', 'orders'], analysis);
    expect(resolved).toEqual(['orders']);
    expect(unresolved).toEqual([]);
  });
});

describe('generateWithCloudKey Gemini adapter', () => {
  it('uses generateContent for Gemini models and parses the candidate text', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    try {
      const answer = await generateWithCloudKey(
        'gemini',
        'test-api-key',
        'gemini-3.8-flash',
        'https://generativelanguage.googleapis.com',
        {
          messages: [
            { role: 'system', content: 'Return JSON.' },
            { role: 'user', content: 'Reply with ok true.' },
            { role: 'assistant', content: 'Previous response.' },
          ],
          temperature: 0.2,
          maxTokens: 128,
          jsonMode: true,
        }
      );

      expect(answer).toBe('{"ok":true}');
      expect(fetchMock).toHaveBeenCalledOnce();
      const [requestUrl, requestInit] = fetchMock.mock.calls[0];
      expect(requestUrl).toBe(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=test-api-key'
      );
      expect(JSON.parse(String(requestInit?.body))).toEqual({
        contents: [
          { role: 'user', parts: [{ text: 'Reply with ok true.' }] },
          { role: 'model', parts: [{ text: 'Previous response.' }] },
        ],
        systemInstruction: { parts: [{ text: 'Return JSON.' }] },
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 128,
          responseMimeType: 'application/json',
        },
      });
    } finally {
      fetchMock.mockRestore();
    }
  });
});

describe('generateWithCloudKey OpenAI adapter', () => {
  it('uses the completion token parameter supported by GPT-5', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'Ready.' } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    try {
      await generateWithCloudKey('openai', 'test-api-key', 'gpt-5', 'https://api.openai.com', {
        messages: [{ role: 'user', content: 'Reply briefly.' }],
        maxTokens: 128,
      });

      const [, requestInit] = fetchMock.mock.calls[0];
      const requestBody = JSON.parse(String(requestInit?.body));
      expect(requestBody.max_completion_tokens).toBe(128);
      expect(requestBody.max_tokens).toBeUndefined();
    } finally {
      fetchMock.mockRestore();
    }
  });
});

/**
 * Every provider needs a usable model without the user visiting Settings — the Database AI
 * Assistant and the Chatbot read the stored config directly, so an empty model there fails the
 * request outright instead of prompting for one.
 */
describe('per-provider default chat models', () => {
  it('pins a distinct default for all four providers', () => {
    expect(DEFAULT_CHAT_MODELS).toEqual({
      ollama: 'qwen2.5-coder:7b',
      openai: 'gpt-4o',
      anthropic: 'claude-3-7-sonnet-20250219',
      gemini: 'gemini-3.8-flash',
    });
    // A shared value would mean switching provider silently kept the previous provider's model.
    expect(new Set(Object.values(DEFAULT_CHAT_MODELS)).size).toBe(4);
  });

  it('leaves the shipped config pointing at its provider default', () => {
    expect(DEFAULT_AI_CONFIG.ollamaModel).toBe(DEFAULT_CHAT_MODELS.ollama);
    expect(DEFAULT_AI_CONFIG.modelId).toBe(DEFAULT_CHAT_MODELS.openai);
  });

  it('falls back to the provider default when the stored model is blank', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    try {
      // Blanks reproduce a config persisted before the per-provider defaults existed.
      const config: AIModelConfig = {
        ...DEFAULT_AI_CONFIG,
        provider: 'ollama',
        ollamaModel: '   ',
      };
      await generateWithAI(config, { messages: [{ role: 'user', content: 'Hi' }] });

      const [, requestInit] = fetchMock.mock.calls[0];
      expect(JSON.parse(String(requestInit?.body)).model).toBe(DEFAULT_CHAT_MODELS.ollama);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
