import { describe, expect, it } from 'vitest';
import {
  buildFormatFixPrompt,
  isStale,
  parseFormatFix,
  requestFormatFix,
  type FormatFixSnapshot,
} from '@/lib/ai/formatErrorAi';
import {
  jsonResponse,
  makeFormatError,
  makeOllamaConfig,
  throwingFetch,
  withStubbedFetch,
} from './helpers/format-error-fixtures';

describe('buildFormatFixPrompt', () => {
  it('embeds the error, the dialect and the full failing SQL', () => {
    const prompt = buildFormatFixPrompt(makeFormatError());

    expect(prompt).toContain('Parse error at token: ; at line 1 column 16');
    expect(prompt).toContain('mysql');
    expect(prompt).toContain('SELECT * FROM (;');
  });

  it('demands a minimal, semantics-preserving correction (FR-015)', () => {
    const prompt = buildFormatFixPrompt(makeFormatError());

    expect(prompt).toMatch(/minimal/i);
    expect(prompt).toMatch(/do not (change|alter|rewrite)/i);
    expect(prompt).toContain('"correctedSql"');
    // Every clause, column and ordering must be explicitly protected.
    expect(prompt).toMatch(/clause/i);
    expect(prompt).toMatch(/column/i);
    expect(prompt).toMatch(/order/i);
  });

  it('tells the model to return the SQL only, not an explanation', () => {
    const prompt = buildFormatFixPrompt(makeFormatError());

    expect(prompt).toMatch(/no explanation|only a json object/i);
  });
});

describe('parseFormatFix', () => {
  const originalSql = 'SELECT * FROM (;';

  it('parses a corrected SQL that differs from the original', () => {
    const parsed = parseFormatFix(
      JSON.stringify({ correctedSql: 'SELECT * FROM (SELECT 1) AS t;' }),
      originalSql
    );

    expect(parsed).toBe('SELECT * FROM (SELECT 1) AS t;');
  });

  it('tolerates a markdown fence around the JSON', () => {
    const parsed = parseFormatFix(
      '```json\n{"correctedSql":"SELECT * FROM (SELECT 1) AS t;"}\n```',
      originalSql
    );

    expect(parsed).toBe('SELECT * FROM (SELECT 1) AS t;');
  });

  it('rejects an identical correction — there is nothing to apply', () => {
    expect(parseFormatFix(JSON.stringify({ correctedSql: originalSql }), originalSql)).toBeNull();
  });

  it('rejects a correction that only differs by trailing whitespace', () => {
    expect(
      parseFormatFix(JSON.stringify({ correctedSql: `  ${originalSql}  ` }), originalSql)
    ).toBeNull();
  });

  it('rejects whitespace-only or missing correctedSql', () => {
    expect(parseFormatFix(JSON.stringify({ correctedSql: '   ' }), originalSql)).toBeNull();
    expect(parseFormatFix(JSON.stringify({ nope: 'x' }), originalSql)).toBeNull();
    expect(parseFormatFix('plain prose, no json', originalSql)).toBeNull();
  });
});

describe('isStale', () => {
  const snapshot: FormatFixSnapshot = {
    originalSql: 'SELECT * FROM (;',
    proposedSql: 'SELECT * FROM (SELECT 1) AS t;',
  };

  it('is not stale while the editor SQL still matches the request-time snapshot', () => {
    expect(isStale(snapshot, snapshot.originalSql)).toBe(false);
  });

  it('is stale once the editor SQL changes (FR-016)', () => {
    expect(isStale(snapshot, 'SELECT * FROM (; -- edited')).toBe(true);
  });

  it('is stale when the editor SQL is cleared', () => {
    expect(isStale(snapshot, '')).toBe(true);
  });

  it('tolerates a trailing newline the editor may have added', () => {
    expect(isStale(snapshot, `${snapshot.originalSql}\n`)).toBe(false);
  });
});

describe('requestFormatFix', () => {
  const config = makeOllamaConfig();

  it('returns the corrected SQL for a valid fix response', async () => {
    const fetchImpl = (async () =>
      jsonResponse({ correctedSql: 'SELECT * FROM (SELECT 1) t;' })) as unknown as typeof fetch;

    await expect(
      withStubbedFetch(fetchImpl, () => requestFormatFix(makeFormatError(), config))
    ).resolves.toBe('SELECT * FROM (SELECT 1) t;');
  });

  it('rejects with a malformed failure when the fix equals the original SQL', async () => {
    const fetchImpl = (async () =>
      jsonResponse({ correctedSql: 'SELECT * FROM (;' })) as unknown as typeof fetch;

    await expect(
      withStubbedFetch(fetchImpl, () => requestFormatFix(makeFormatError(), config))
    ).rejects.toMatchObject({ kind: 'malformed', retryable: true });
  });

  it('rejects with an unavailable failure when the model is unreachable', async () => {
    await expect(
      withStubbedFetch(throwingFetch(), () => requestFormatFix(makeFormatError(), config))
    ).rejects.toMatchObject({ kind: 'unavailable' });
  });

  it('never sends the request to a cloud provider (FR-014)', async () => {
    const urls: string[] = [];
    const fetchImpl = (async (url: string) => {
      urls.push(String(url));
      return jsonResponse({ correctedSql: 'SELECT * FROM (SELECT 1) t;' });
    }) as unknown as typeof fetch;

    await withStubbedFetch(fetchImpl, () => requestFormatFix(makeFormatError(), config));

    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('localhost:11434');
    expect(urls[0]).not.toMatch(/openai|anthropic|googleapis/);
  });
});
