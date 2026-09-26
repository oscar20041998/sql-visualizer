import { describe, expect, it } from 'vitest';
import {
  buildExplainFormatErrorPrompt,
  buildFormatFixPrompt,
  describeAiFailure,
  FormatAiError,
  parseFormatExplanation,
  requestFormatExplanation,
  requestFormatFix,
} from '@/lib/ai/formatErrorAi';
import {
  jsonResponse,
  makeFormatError,
  makeOllamaConfig,
  throwingFetch,
  withStubbedFetch,
} from './helpers/format-error-fixtures';

describe('buildFormatFixPrompt', () => {
  it('confines the correction to the quoted region', () => {
    // A two-line query whose second line is the erroneous region, so the region text also appears
    // in the embedded SQL: only a labelled quote proves the region itself was sent.
    const sourceSql = 'SELECT id\nFROM (;';
    const error = makeFormatError({ sourceSql, location: { offset: 15, line: 2, column: 6 } });

    const prompt = buildFormatFixPrompt(error, {
      startOffset: 10,
      endOffset: 17,
      startLine: 2,
      endLine: 2,
      source: 'formatter',
      snippet: 'FROM (;',
      anchorOffset: 15,
    });

    expect(prompt).toMatch(/erroneous region[^\n]*FROM \(;/i);
    expect(prompt).toMatch(/confine every change to it/i);
  });
});

describe('buildExplainFormatErrorPrompt', () => {
  it('embeds the exact error message, the dialect and the failing SQL (grounding)', () => {
    const prompt = buildExplainFormatErrorPrompt(makeFormatError());

    expect(prompt).toContain('Parse error at token: ; at line 1 column 16');
    expect(prompt).toContain('mysql');
    expect(prompt).toContain('SELECT * FROM (;');
    expect(prompt).toContain('1:5');
  });

  it('asks for the strict explanation / rootCause / evidence JSON contract', () => {
    const prompt = buildExplainFormatErrorPrompt(makeFormatError());

    expect(prompt).toContain('"explanation"');
    expect(prompt).toContain('"rootCause"');
    expect(prompt).toContain('"evidence"');
  });

  it('forbids contradicting the formatter and performance advice', () => {
    const prompt = buildExplainFormatErrorPrompt(makeFormatError());

    expect(prompt).toMatch(/do not contradict/i);
    expect(prompt).toMatch(/performance/i);
  });

  it('omits the location line when the error has no position', () => {
    const prompt = buildExplainFormatErrorPrompt(
      makeFormatError({ location: undefined, snippet: undefined })
    );

    expect(prompt).not.toMatch(/Location:\s*\d/);
    expect(prompt).toContain('SELECT * FROM (;');
  });

  it('instructs the model to answer in Vietnamese when locale is vi, English otherwise', () => {
    const vi = buildExplainFormatErrorPrompt(makeFormatError(), 'vi');
    const en = buildExplainFormatErrorPrompt(makeFormatError(), 'en');

    expect(vi).toContain('Vietnamese');
    expect(vi).toContain('tiếng Việt');
    expect(en).toContain('in English');
    expect(en).not.toContain('Vietnamese');
  });
});

describe('parseFormatExplanation', () => {
  it('parses a strict JSON explanation payload', () => {
    const parsed = parseFormatExplanation(
      JSON.stringify({
        explanation: 'The parenthesis opened before the semicolon is never closed.',
        rootCause: 'The query ends with a delimiter while an expression is still open.',
        evidence: ['SELECT * FROM (;', 'Parse error at token: ;'],
      })
    );

    expect(parsed).not.toBeNull();
    expect(parsed?.explanation).toContain('parenthesis');
    expect(parsed?.rootCause).toContain('delimiter');
    expect(parsed?.evidence).toHaveLength(2);
  });

  it('tolerates a markdown fence and surrounding prose', () => {
    const parsed = parseFormatExplanation(
      'Here is the diagnosis:\n```json\n{"explanation":"a","rootCause":"b","evidence":["c"]}\n```'
    );

    expect(parsed).toEqual({ explanation: 'a', rootCause: 'b', evidence: ['c'] });
  });

  it('rejects a payload missing required fields', () => {
    expect(parseFormatExplanation(JSON.stringify({ explanation: 'only this' }))).toBeNull();
    expect(parseFormatExplanation(JSON.stringify({ explanation: 'a', rootCause: '' }))).toBeNull();
  });

  it('rejects a payload with no evidence (grounding is mandatory)', () => {
    expect(
      parseFormatExplanation(JSON.stringify({ explanation: 'a', rootCause: 'b', evidence: [] }))
    ).toBeNull();
  });

  it('returns null for non-JSON prose', () => {
    expect(parseFormatExplanation('I could not tell what went wrong.')).toBeNull();
  });
});

describe('describeAiFailure', () => {
  it('reports an unavailable state when the local model cannot be reached', () => {
    const failure = describeAiFailure(new Error('Failed to fetch'));

    expect(failure.kind).toBe('unavailable');
    expect(failure.retryable).toBe(true);
  });

  it('treats Ollama connection errors and timeouts as unavailable', () => {
    expect(describeAiFailure(new Error('Unable to reach Ollama server at http://x')).kind).toBe(
      'unavailable'
    );
    expect(
      describeAiFailure(Object.assign(new Error('aborted'), { name: 'TimeoutError' })).kind
    ).toBe('unavailable');
  });

  it('preserves an already-classified malformed failure instead of flattening it', () => {
    const failure = describeAiFailure(
      new FormatAiError({
        kind: 'malformed',
        message: 'The model returned an unusable answer.',
        retryable: true,
      })
    );

    expect(failure.kind).toBe('malformed');
    expect(failure.retryable).toBe(true);
  });

  it('falls back to a retryable generic error for an unrecognised cause', () => {
    const failure = describeAiFailure(new Error('Ollama request failed (500): internal error'));

    expect(failure.kind).toBe('error');
    expect(failure.retryable).toBe(true);
  });

  it('always produces a non-empty message', () => {
    for (const thrown of [undefined, null, 'boom', new Error('')]) {
      expect(describeAiFailure(thrown).message.length).toBeGreaterThan(0);
    }
  });
});

describe('requestFormatExplanation', () => {
  const config = makeOllamaConfig();

  it('posts to the local Ollama chat endpoint and parses the explanation', async () => {
    const calls: Array<{ url: string; body: { model?: string } }> = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url: String(url), body: JSON.parse(String(init.body)) });
      return jsonResponse({
        explanation: 'Unclosed parenthesis.',
        rootCause: 'The delimiter arrives mid-expression.',
        evidence: ['SELECT * FROM (;'],
      });
    }) as unknown as typeof fetch;

    const result = await withStubbedFetch(fetchImpl, () =>
      requestFormatExplanation(makeFormatError(), config)
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('http://localhost:11434/v1/chat/completions');
    expect(calls[0].body.model).toBe('qwen2.5-coder:7b');
    expect(result.explanation).toContain('Unclosed parenthesis');
    expect(result.evidence).toEqual(['SELECT * FROM (;']);
  });

  it('rejects an explanation whose evidence quotes SQL the editor never held', async () => {
    // The answer is well formed but describes a different query, so presenting it would show the
    // user a diagnosis of SQL that was never in the editor (FR-008).
    const fetchImpl = (async () =>
      jsonResponse({
        explanation: 'The join is missing its ON clause.',
        rootCause: 'A table is joined without a condition.',
        evidence: ['SELECT id FROM orders LEFT JOIN'],
      })) as unknown as typeof fetch;

    await expect(
      withStubbedFetch(fetchImpl, () => requestFormatExplanation(makeFormatError(), config))
    ).rejects.toMatchObject({ kind: 'malformed', retryable: true });
  });

  it('rejects with a described unavailable failure when the model is unreachable', async () => {
    await expect(
      withStubbedFetch(throwingFetch(), () => requestFormatExplanation(makeFormatError(), config))
    ).rejects.toMatchObject({ kind: 'unavailable', retryable: true });
  });

  it('rejects with a malformed failure when the model returns unusable JSON', async () => {
    const fetchImpl = (async () =>
      jsonResponse('I cannot help with that.', { raw: true })) as unknown as typeof fetch;

    await expect(
      withStubbedFetch(fetchImpl, () => requestFormatExplanation(makeFormatError(), config))
    ).rejects.toMatchObject({ kind: 'malformed', retryable: true });
  });

  it('rejects when the model answers with an incomplete JSON contract', async () => {
    const fetchImpl = (async () =>
      jsonResponse({ explanation: 'only this' })) as unknown as typeof fetch;

    await expect(
      withStubbedFetch(fetchImpl, () => requestFormatExplanation(makeFormatError(), config))
    ).rejects.toMatchObject({ kind: 'malformed' });
  });
});

describe('request shape (FR-021)', () => {
  const config = makeOllamaConfig();

  it('issues a single non-streaming request for each request', async () => {
    // One body that answers both contracts, so the same stub serves either call.
    const calls: Array<{ body: Record<string, unknown> }> = [];
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      calls.push({ body: JSON.parse(String(init.body)) });
      return jsonResponse({
        explanation: 'Unclosed parenthesis.',
        rootCause: 'The delimiter arrives mid-expression.',
        evidence: ['SELECT * FROM (;'],
        correctedSql: 'SELECT * FROM (1);',
      });
    }) as unknown as typeof fetch;

    await withStubbedFetch(fetchImpl, () => requestFormatExplanation(makeFormatError(), config));
    await withStubbedFetch(fetchImpl, () => requestFormatFix(makeFormatError(), config));

    // A streamed response would arrive in parts the parser cannot read, so the contract asks for
    // the whole answer in one response and both requests must say so explicitly.
    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call.body).toMatchObject({ stream: false });
    }
  });
});

