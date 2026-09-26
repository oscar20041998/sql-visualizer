import { describe, expect, it } from 'vitest';
import { format } from 'sql-formatter';
import {
  captureFormatError,
  deriveLocationAndSnippet,
  type SqlFormatDialect,
} from '@/lib/sql/formatError';

/** The message sql-formatter produces for a nearley parser failure (no `offset`/`token`). */
const LEXER_MESSAGE =
  'Parse error: Unexpected "\'abc;" at line 1 column 34.\nSQL dialect used: "mysql".';

const FORMATTER_LANGUAGES: Record<SqlFormatDialect, string> = {
  mysql: 'mysql',
  postgresql: 'postgresql',
  sqlserver: 'tsql',
  oracle: 'plsql',
};

describe('captureFormatError', () => {
  it('captures the formatter message, dialect, source SQL and severity', () => {
    const sql = 'SELECT * FROM (;';
    const error = captureFormatError(new Error('Parse error at token: ; at line 1 column 16'), {
      sourceSql: sql,
      dialect: 'mysql',
    });

    expect(error.message.length).toBeGreaterThan(0);
    expect(error.message).toContain('Parse error');
    expect(error.dialect).toBe('mysql');
    expect(error.sourceSql).toBe(sql);
    expect(error.severity).toBe('error');
    expect(Number.isNaN(Date.parse(error.occurredAt))).toBe(false);
  });

  it('derives a 1-based location, snippet and offset from a formatter offset', () => {
    const sql = 'SELECT *\nFROM users\nWHERE id = (;';
    const thrown = new Error('Parse error at token: ;');
    (thrown as Error & { offset?: number }).offset = sql.indexOf(';');

    const error = captureFormatError(thrown, { sourceSql: sql, dialect: 'postgresql' });

    expect(error.location).toBeDefined();
    expect(error.location?.offset).toBe(sql.indexOf(';'));
    expect(error.location?.line).toBe(3);
    expect(error.location?.column).toBeGreaterThanOrEqual(1);
    expect(error.snippet).toBeTruthy();
  });

  it('records the formatter as the location source when a position is derivable (FR-019)', () => {
    const sql = 'SELECT *\nFROM users\nWHERE id = (;';
    const thrown = new Error('Parse error at token: ;');
    (thrown as Error & { offset?: number }).offset = sql.indexOf(';');

    const error = captureFormatError(thrown, { sourceSql: sql, dialect: 'mysql' });

    expect(error.locationSource).toBe('formatter');
  });

  it('omits the location and the snippet when the formatter gives no usable position', () => {
    // A non-`Error` throw carries neither `offset` nor a parseable `line N column M`.
    const error = captureFormatError('formatter exploded', {
      sourceSql: "SELECT * FROM users WHERE name = 'abc;",
      dialect: 'mysql',
    });

    expect(error.location).toBeUndefined();
    expect(error.snippet).toBeUndefined();
    expect(error.message).toBe('formatter exploded');
  });

  it('omits the location source together with the location when no position is derivable (FR-019)', () => {
    const error = captureFormatError('formatter exploded', {
      sourceSql: "SELECT * FROM users WHERE name = 'abc;",
      dialect: 'mysql',
    });

    expect(error.location).toBeUndefined();
    expect(error.locationSource).toBeUndefined();
  });

  it('never fabricates a location when the message has no line/column', () => {
    const error = captureFormatError(new Error('Dialect mysql does not support X.'), {
      sourceSql: 'SELECT 1;',
      dialect: 'mysql',
    });

    expect(error.location).toBeUndefined();
    expect(error.snippet).toBeUndefined();
  });

  it('always produces a non-empty human-readable message, even for a non-Error throw', () => {
    for (const thrown of [undefined, null, 'boom', 42, {}, new Error('')]) {
      const error = captureFormatError(thrown, { sourceSql: 'SELECT 1;', dialect: 'mysql' });
      expect(error.message.trim().length).toBeGreaterThan(0);
    }
  });

  it('keeps the message readable when the formatter dumps a long nearley grammar', () => {
    const grammarDump = [
      'Parse error at token: ; at line 1 column 16',
      'Unexpected DELIMITER token: {"type":"DELIMITER","raw":";","text":";","start":15}. Instead, I was expecting to see one of the following:',
      '',
      'A ")" based on:',
      '    parenthesis → "(" expressions_or_clauses ● ")"',
      ...Array.from({ length: 120 }, (_, index) => `    rule_${index} → ● token_${index}`),
    ].join('\n');

    const error = captureFormatError(new Error(grammarDump), {
      sourceSql: 'SELECT * FROM (;',
      dialect: 'mysql',
    });

    expect(error.message).toContain('Parse error at token: ; at line 1 column 16');
    expect(error.message.length).toBeLessThan(400);
  });

  it('extracts the reported line/column from the formatter message when there is no offset', () => {
    const error = captureFormatError(new Error(LEXER_MESSAGE), {
      sourceSql: "SELECT * FROM users WHERE name = 'abc;",
      dialect: 'sqlserver',
    });

    expect(error.message).toContain('line 1 column 34');
    expect(error.dialect).toBe('sqlserver');
    expect(error.location).toEqual({ line: 1, column: 34 });
    expect(error.snippet).toBeTruthy();
  });

  it('derives a 1-based line/column from the exact offset sql-formatter reports', () => {
    for (const dialect of Object.keys(FORMATTER_LANGUAGES) as SqlFormatDialect[]) {
      const sql = 'SELECT * FROM (;';
      let thrown: unknown;
      try {
        format(sql, { language: FORMATTER_LANGUAGES[dialect] as never });
      } catch (error) {
        thrown = error;
      }

      const error = captureFormatError(thrown, { sourceSql: sql, dialect });
      expect(error.message).toContain('Parse error');
      expect(error.dialect).toBe(dialect);
      // Verified against sql-formatter 15.8.2: `offset = 4` (after `SELECT `) and the offending
      // `;` token at index 15, i.e. line 1 column 16 — identical across all four dialects.
      expect(error.location?.offset).toBe(4);
      expect(error.location?.line).toBe(1);
      expect(error.location?.column).toBe(5);
      expect(error.snippet).toBeTruthy();
    }
  });
});

describe('deriveLocationAndSnippet', () => {
  it('suggests a location extracted from the message when no offset is available', () => {
    const sql = 'SELECT a,\nFROM t;';
    const derived = deriveLocationAndSnippet(sql, new Error('Parse error at line 2 column 1.'));

    expect(derived.location.line).toBe(2);
    expect(derived.location.column).toBe(1);
    expect(derived.snippet).toBeTruthy();
  });

  it('returns an empty location when neither offset nor message position exists', () => {
    const derived = deriveLocationAndSnippet('SELECT 1;', new Error('Something went wrong.'));

    expect(derived.location).toEqual({});
    expect(derived.snippet).toBeUndefined();
  });
});
