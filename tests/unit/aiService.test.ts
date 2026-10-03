import { describe, expect, it, vi } from 'vitest';
import { generateWithCloudKey, resolveHintedTableReferences } from '@/lib/ai/aiService';
import type { AnalysisResult } from '@/lib/sql/sqlAnalyzer';

function makeAnalysisWithTables(names: string[]): AnalysisResult {
  return {
    tables: names.map((name, index) => ({ id: `t${index}`, name, columns: [] })),
  } as unknown as AnalysisResult;
}

describe('resolveHintedTableReferences', () => {
  it('resolves hints that match a known table name (case-insensitive)', () => {
    const analysis = makeAnalysisWithTables(['orders', 'customers']);
    const { resolved, unresolved } = resolveHintedTableReferences(['Orders', 'customers'], analysis);
    expect(resolved).toEqual(['Orders', 'customers']);
    expect(unresolved).toEqual([]);
  });

  it('reports hints that do not match any known table as unresolved', () => {
    const analysis = makeAnalysisWithTables(['orders']);
    const { resolved, unresolved } = resolveHintedTableReferences(['orders', 'shipping_addresses'], analysis);
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
        'gemini-2.5-flash',
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
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=test-api-key'
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
      new Response(
        JSON.stringify({ choices: [{ message: { content: 'Ready.' } }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    try {
      await generateWithCloudKey(
        'openai',
        'test-api-key',
        'gpt-5',
        'https://api.openai.com',
        {
          messages: [{ role: 'user', content: 'Reply briefly.' }],
          maxTokens: 128,
        }
      );

      const [, requestInit] = fetchMock.mock.calls[0];
      const requestBody = JSON.parse(String(requestInit?.body));
      expect(requestBody.max_completion_tokens).toBe(128);
      expect(requestBody.max_tokens).toBeUndefined();
    } finally {
      fetchMock.mockRestore();
    }
  });
});
