import { describe, expect, it } from 'vitest';
import {
  buildExplainFormatErrorPrompt,
  buildFormatFixPrompt,
  describeAiFailure,
  FormatAiError,
  parseFormatExplanation,
  requestFormatExplanation,
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

  it('asks for explanation and a region-only replacement with its rationale in one JSON contract', () => {
    const prompt = buildExplainFormatErrorPrompt(makeFormatError());

    expect(prompt).toContain('"explanation"');
    expect(prompt).toContain('"rootCause"');
    expect(prompt).toContain('"evidence"');
    expect(prompt).toContain('"replacementSql"');
    expect(prompt).toContain('"replacementReason"');
    expect(prompt).not.toContain('"correctedSql"');
    expect(prompt).toMatch(/in one response/i);
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
    expect(prompt).toContain('Do not return a SQL correction');
    expect(prompt).not.toContain('SQL that failed to format:');
  });

  it('instructs the model to answer in Vietnamese when locale is vi, English otherwise', () => {
    const vi = buildExplainFormatErrorPrompt(makeFormatError(), 'vi');
    const en = buildExplainFormatErrorPrompt(makeFormatError(), 'en');

    expect(vi).toContain('Vietnamese');
    expect(vi).toContain('tiếng Việt');
    expect(vi).toContain('"replacementReason" fields in Vietnamese');
    expect(en).toContain('in English');
    expect(en).not.toContain('Vietnamese');
  });

  it('asks the model for only the corrected error region when one is known', () => {
    const prompt = buildExplainFormatErrorPrompt(makeFormatError(), 'en', {
      startOffset: 0,
      endOffset: 16,
      startLine: 1,
      endLine: 1,
      source: 'formatter',
      snippet: 'SELECT * FROM (;',
      anchorOffset: 15,
    });

    expect(prompt).toMatch(/return only the corrected replacement fragment/i);
    expect(prompt).toMatch(/do not repeat the full query/i);
  });

  it('derives the replacement range and omits unrelated SQL when no region is passed', () => {
    const sourceSql = 'SELECT id FROM users;\nSELECT * FROM (;';
    const error = makeFormatError({
      sourceSql,
      location: {
        offset: sourceSql.indexOf('('),
        line: 2,
        column: 15,
      },
      snippet: 'SELECT * FROM (;',
    });

    const prompt = buildExplainFormatErrorPrompt(error);

    expect(prompt).toContain('Replacement range: lines 2-2');
    expect(prompt).toContain('SELECT * FROM (');
    expect(prompt).not.toContain('SELECT id FROM users;');
    expect(prompt).toMatch(/replacementSql.*replacement fragment only/i);
  });
});

describe('parseFormatExplanation', () => {
  it('parses a strict JSON explanation payload', () => {
    const parsed = parseFormatExplanation(
      JSON.stringify({
        explanation: 'The parenthesis opened before the semicolon is never closed.',
        rootCause: 'The query ends with a delimiter while an expression is still open.',
        evidence: ['SELECT * FROM (;', 'Parse error at token: ;'],
        replacementSql: 'SELECT * FROM (SELECT 1) AS t;',
        replacementReason: 'The replacement closes the parenthesized table expression.',
      })
    );

    expect(parsed).not.toBeNull();
    expect(parsed?.explanation).toContain('parenthesis');
    expect(parsed?.rootCause).toContain('delimiter');
    expect(parsed?.evidence).toHaveLength(2);
    expect(parsed?.replacementSql).toBe('SELECT * FROM (SELECT 1) AS t;');
    expect(parsed?.replacementReason).toContain('closes the parenthesized');
  });

  it('keeps a valid diagnosis when replacement SQL is missing', () => {
    const parsed = parseFormatExplanation(
      JSON.stringify({
        explanation: 'The parenthesis is never closed.',
        rootCause: 'The query ends before the expression is complete.',
        evidence: ['SELECT * FROM (;'],
      })
    );

    expect(parsed).toMatchObject({
      explanation: 'The parenthesis is never closed.',
      replacementSql: null,
      replacementReason: null,
    });
  });

  it('tolerates a markdown fence and surrounding prose', () => {
    const parsed = parseFormatExplanation(
      'Here is the diagnosis:\n```json\n{"explanation":"a","rootCause":"b","evidence":["c"],"replacementSql":"SELECT 1;","replacementReason":"Completes the expression."}\n```'
    );

    expect(parsed).toEqual({
      explanation: 'a',
      rootCause: 'b',
      evidence: ['c'],
      replacementSql: 'SELECT 1;',
      replacementReason: 'Completes the expression.',
      correctedSql: null,
    });
  });

  it('rejects a payload missing required fields', () => {
    expect(parseFormatExplanation(JSON.stringify({ explanation: 'only this' }))).toBeNull();
    expect(
      parseFormatExplanation(
        JSON.stringify({
          explanation: 'a',
          rootCause: '',
          evidence: ['SELECT * FROM (;'],
          replacementSql: 'SELECT 1;',
          replacementReason: 'Completes the expression.',
        })
      )
    ).toBeNull();
  });

  it('rejects a payload with no evidence (grounding is mandatory)', () => {
    expect(
      parseFormatExplanation(
        JSON.stringify({
          explanation: 'a',
          rootCause: 'b',
          evidence: [],
          replacementSql: 'SELECT 1;',
          replacementReason: 'Completes the expression.',
        })
      )
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

  it('returns the explanation and locally reconstructed SQL from one region-fragment response', async () => {
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const sourceSql = 'SELECT id\nFROM (;';
    const error = makeFormatError({
      sourceSql,
      location: { offset: sourceSql.indexOf('('), line: 2, column: 6 },
      snippet: 'FROM (;',
    });
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url: String(url), body: JSON.parse(String(init.body)) });
      return jsonResponse({
        explanation: 'Unclosed parenthesis.',
        rootCause: 'The delimiter arrives mid-expression.',
        evidence: ['SELECT id FROM (;'],
        replacementSql: 'FROM (SELECT 1) AS t;',
        replacementReason: 'Closes the parenthesized table expression.',
      });
    }) as unknown as typeof fetch;

    const result = await withStubbedFetch(fetchImpl, () => requestFormatExplanation(error, config));

    expect(calls).toHaveLength(1);
    expect(JSON.stringify(calls[0].body)).toContain('replacementSql');
    expect(result.correctedSql).toBe('SELECT id\nFROM (SELECT 1) AS t;');
    expect(result.replacementSql).toBe('FROM (SELECT 1) AS t;');
  });

  it('parses a content-wrapped response with labeled Markdown evidence', async () => {
    const sourceSql = 'SELECT id\nFROM (;';
    const error = makeFormatError({
      sourceSql,
      location: { offset: sourceSql.indexOf('('), line: 2, column: 6 },
      snippet: 'FROM (;',
    });
    const content = JSON.stringify({
      explanation: 'The parenthesis is never closed.',
      rootCause: 'The opening parenthesis has no matching closing parenthesis.',
      evidence: [
        'Dòng lỗi: `Parse error at token: ; at line 1 column 16`',
        'SQL gốc: `SELECT * FROM (;`',
      ],
      replacementSql: 'FROM (SELECT 1) AS t;',
      replacementReason: 'Closes the parenthesized table expression.',
    });
    const fetchImpl = (async () => jsonResponse({ content })) as unknown as typeof fetch;

    const result = await withStubbedFetch(fetchImpl, () => requestFormatExplanation(error, config));

    expect(result.explanation).toBe('The parenthesis is never closed.');
    expect(result.correctedSql).toBe('SELECT id\nFROM (SELECT 1) AS t;');
  });

  it('reconstructs the full query from a region-only model correction', async () => {
    const sourceSql = 'SELECT id\nFROM users WHERE active = 0;';
    const correctedRegion = 'FROM users WHERE active = 1;';
    const error = makeFormatError({ sourceSql });
    const region = {
      startOffset: sourceSql.indexOf('FROM'),
      endOffset: sourceSql.length,
      startLine: 2,
      endLine: 2,
      source: 'formatter' as const,
      snippet: 'FROM users WHERE active = 0;',
      anchorOffset: sourceSql.indexOf('active'),
    };
    const fetchImpl = (async () =>
      jsonResponse({
        explanation: 'The predicate uses the wrong value.',
        rootCause: 'The active flag is set to zero.',
        evidence: ['FROM users WHERE active = 0;'],
        replacementSql: correctedRegion,
        replacementReason: 'Corrects the invalid predicate value.',
      })) as unknown as typeof fetch;

    const result = await withStubbedFetch(fetchImpl, () =>
      requestFormatExplanation(error, config, 'en', region)
    );

    expect(result.correctedSql).toBe('SELECT id\nFROM users WHERE active = 1;');
  });

  it('keeps a valid diagnosis when the region replacement fails formatter validation', async () => {
    const fetchImpl = (async () =>
      jsonResponse({
        explanation: 'The parenthesis is never closed.',
        rootCause: 'The query ends before the parenthesized expression is complete.',
        evidence: ['SELECT * FROM (;'],
        replacementSql: 'SELECT * FROM (',
        replacementReason: 'This would close the expression.',
      })) as unknown as typeof fetch;

    const result = await withStubbedFetch(fetchImpl, () =>
      requestFormatExplanation(makeFormatError(), config)
    );

    expect(result.explanation).toContain('parenthesis');
    expect(result.correctedSql).toBeNull();
  });

  it('keeps diagnosis but refuses a broad rewrite when a one-line region covers the query', async () => {
    const sourceSql = 'SELECT * FROM (;';
    const error = makeFormatError({ sourceSql });
    const fetchImpl = (async () =>
      jsonResponse({
        explanation: 'The parenthesis is never closed.',
        rootCause: 'The query ends before the expression is complete.',
        evidence: ['SELECT * FROM (;'],
        replacementSql: 'SELECT * FROM (SELECT 1) AS t;',
        replacementReason: 'Completes the parenthesized expression.',
      })) as unknown as typeof fetch;

    const result = await withStubbedFetch(fetchImpl, () => requestFormatExplanation(error, config));

    expect(result.explanation).toContain('parenthesis');
    expect(result.correctedSql).toBeNull();
  });

  it('derives a replacement region when the caller does not provide one', async () => {
    const sourceSql = 'SELECT id\nFROM (;';
    const error = makeFormatError({
      sourceSql,
      location: {
        offset: sourceSql.indexOf('('),
        line: 2,
        column: 6,
      },
      snippet: 'FROM (',
    });
    const fetchImpl = (async () =>
      jsonResponse({
        explanation: 'The opening parenthesis is never closed.',
        rootCause: 'The FROM expression is incomplete.',
        evidence: ['SELECT id FROM (;'],
        replacementSql: 'FROM (SELECT 1) AS t;',
        replacementReason: 'Completes the FROM expression.',
      })) as unknown as typeof fetch;

    const result = await withStubbedFetch(fetchImpl, () => requestFormatExplanation(error, config));

    expect(result.correctedSql).toBe('SELECT id\nFROM (SELECT 1) AS t;');
  });

  it('preserves diagnosis but rejects a full-query response instead of a region fragment', async () => {
    const sourceSql = 'SELECT id\nFROM users WHERE active = 0;';
    const error = makeFormatError({ sourceSql });
    const region = {
      startOffset: sourceSql.indexOf('FROM'),
      endOffset: sourceSql.length,
      startLine: 2,
      endLine: 2,
      source: 'formatter' as const,
      snippet: 'FROM users WHERE active = 0;',
      anchorOffset: sourceSql.indexOf('active'),
    };
    const fetchImpl = (async () =>
      jsonResponse({
        explanation: 'The predicate uses the wrong value.',
        rootCause: 'The active flag is set to zero.',
        evidence: ['SQL gốc: `FROM users WHERE active = 0;`'],
        replacementSql: 'SELECT id\nFROM users WHERE active = 1;',
        replacementReason: 'Corrects the invalid predicate value.',
      })) as unknown as typeof fetch;

    const result = await withStubbedFetch(fetchImpl, () =>
      requestFormatExplanation(error, config, 'en', region)
    );

    expect(result.explanation).toContain('predicate');
    expect(result.correctedSql).toBeNull();
  });

  it('posts to the local Ollama chat endpoint and parses the explanation', async () => {
    const sourceSql = 'SELECT id\nFROM (;';
    const error = makeFormatError({
      sourceSql,
      location: { offset: sourceSql.indexOf('('), line: 2, column: 6 },
      snippet: 'FROM (;',
    });
    const calls: Array<{ url: string; body: { model?: string } }> = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url: String(url), body: JSON.parse(String(init.body)) });
      return jsonResponse({
        explanation: 'Unclosed parenthesis.',
        rootCause: 'The delimiter arrives mid-expression.',
        evidence: ['SELECT id FROM (;'],
        replacementSql: 'FROM (SELECT 1) AS t;',
        replacementReason: 'Closes the parenthesized table expression.',
      });
    }) as unknown as typeof fetch;

    const result = await withStubbedFetch(fetchImpl, () => requestFormatExplanation(error, config));

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('http://localhost:11434/v1/chat/completions');
    expect(calls[0].body.model).toBe('qwen2.5-coder:3b');
    expect(result.explanation).toContain('Unclosed parenthesis');
    expect(result.evidence).toEqual(['SELECT id FROM (;']);
    expect(result.correctedSql).toBe('SELECT id\nFROM (SELECT 1) AS t;');
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

  it('keeps diagnosis when no safe replacement range can be derived', async () => {
    const fetchImpl = (async () =>
      jsonResponse({
        explanation: 'The SQL is syntactically incomplete.',
        rootCause: 'A required expression is missing.',
        evidence: ['Parse error at token: ;'],
        replacementSql: '',
        replacementReason: '',
      })) as unknown as typeof fetch;

    const result = await withStubbedFetch(fetchImpl, () =>
      requestFormatExplanation(makeFormatError({ location: undefined, snippet: undefined }), config)
    );
    expect(result.explanation).toContain('syntactically incomplete');
    expect(result.correctedSql).toBeNull();
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

  it('issues one non-streaming request containing both diagnosis and correction', async () => {
    const calls: Array<{ body: Record<string, unknown> }> = [];
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      calls.push({ body: JSON.parse(String(init.body)) });
      return jsonResponse({
        explanation: 'Unclosed parenthesis.',
        rootCause: 'The delimiter arrives mid-expression.',
        evidence: ['SELECT * FROM (;'],
        replacementSql: 'SELECT * FROM (1);',
        replacementReason: 'Completes the expression.',
      });
    }) as unknown as typeof fetch;

    const result = await withStubbedFetch(fetchImpl, () =>
      requestFormatExplanation(makeFormatError(), config)
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].body).toMatchObject({ stream: false });
    expect(JSON.stringify(calls[0].body)).toContain('replacementSql');
    expect(result.correctedSql).toBe('SELECT * FROM (1);');
  });
});
