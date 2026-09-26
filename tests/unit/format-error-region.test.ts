import { describe, expect, it } from 'vitest';
import { captureFormatError } from '@/lib/sql/formatError';
import { resolveErrorRegion } from '@/lib/sql/formatErrorRegion';

/** Multi-line query whose failing token sits on the third line. */
const SQL_WITH_BROKEN_TOKEN = 'SELECT id\nFROM users\nWHERE id = (;';
const BROKEN_TOKEN = ';';
/** The region a line-sized expansion must cover, without the line break. */
const OFFENDING_LINE = 'WHERE id = (;';
/**
 * Three-line query whose failing token sits on the **middle** line, so a region covering it has
 * text on both sides and neither of its boundaries coincides with the end of the SQL.
 */
const SQL_WITH_INTERIOR_BROKEN_TOKEN = 'SELECT id;\nFROM users;\nWHERE id = 1;';
const INTERIOR_BROKEN_TOKEN = 'users';

/**
 * Builds the error `sql-formatter` throws for a nearley parse failure: the thrown value carries
 * the offending token's character index, which is the exact position the formatter reports.
 */
function formatterErrorAt(sql: string, token: string) {
  return formatterErrorAtOffset(sql, sql.indexOf(token));
}

/** The same failure reported at an exact character index, including the boundaries of the SQL. */
function formatterErrorAtOffset(sql: string, offset: number) {
  const thrown = new Error('Parse error at token');
  (thrown as Error & { offset?: number }).offset = offset;
  return captureFormatError(thrown, { sourceSql: sql, dialect: 'mysql' });
}

describe('resolveErrorRegion', () => {
  it('resolves a region covering the line that holds the formatter offset', () => {
    const error = formatterErrorAt(SQL_WITH_BROKEN_TOKEN, BROKEN_TOKEN);

    const region = resolveErrorRegion(error, SQL_WITH_BROKEN_TOKEN);

    expect(
      region === null ? null : SQL_WITH_BROKEN_TOKEN.slice(region.startOffset, region.endOffset)
    ).toBe(OFFENDING_LINE);
  });

  it('resolves no region when the formatter reported no position at all', () => {
    // A non-`Error` throw carries neither an `offset` nor a "line N column M" message position.
    const error = captureFormatError('formatter exploded', {
      sourceSql: "SELECT * FROM users WHERE name = 'abc;",
      dialect: 'mysql',
    });

    expect(resolveErrorRegion(error, error.sourceSql)).toBeNull();
  });

  it('resolves no region when the position resolves to an empty line', () => {
    // A formatter that points past the last character of a SQL ending in a line break lands on the
    // empty line after it, which contains no text to correct.
    const sourceSql = 'SELECT id\n';
    const thrown = new Error('unexpected end of input');
    (thrown as Error & { offset?: number }).offset = sourceSql.length;
    const error = captureFormatError(thrown, { sourceSql, dialect: 'mysql' });

    expect(resolveErrorRegion(error, sourceSql)).toBeNull();
  });

  it('keeps the region text identical to the slice it describes on every path', () => {
    // The broken token sits on the middle line: a region at the end of the SQL could not tell a
    // wrong end offset from the right one, because both slices would be identical.
    const fromOffset = formatterErrorAt(SQL_WITH_INTERIOR_BROKEN_TOKEN, INTERIOR_BROKEN_TOKEN);
    const fromLineColumn = captureFormatError(
      new Error("Parse error at line 2 column 6: 'users'"),
      {
        sourceSql: SQL_WITH_INTERIOR_BROKEN_TOKEN,
        dialect: 'mysql',
      }
    );

    for (const error of [fromOffset, fromLineColumn]) {
      const region = resolveErrorRegion(error, SQL_WITH_INTERIOR_BROKEN_TOKEN);

      expect(region?.snippet).toBe(
        SQL_WITH_INTERIOR_BROKEN_TOKEN.slice(region?.startOffset ?? 0, region?.endOffset ?? 0)
      );
    }
  });

  it('starts the range at offset 0 for a position on the first character', () => {
    const error = formatterErrorAt(SQL_WITH_INTERIOR_BROKEN_TOKEN, 'SELECT');

    const region = resolveErrorRegion(error, SQL_WITH_INTERIOR_BROKEN_TOKEN);

    expect(region?.startOffset).toBe(0);
    expect(
      SQL_WITH_INTERIOR_BROKEN_TOKEN.slice(region?.startOffset ?? 0, region?.endOffset ?? 0)
    ).toBe('SELECT id;');
  });

  it('ends the range exactly at the SQL length for a position on the last character', () => {
    const lastCharacterOffset = SQL_WITH_INTERIOR_BROKEN_TOKEN.length - 1;
    const error = formatterErrorAtOffset(SQL_WITH_INTERIOR_BROKEN_TOKEN, lastCharacterOffset);

    const region = resolveErrorRegion(error, SQL_WITH_INTERIOR_BROKEN_TOKEN);

    expect(region?.endOffset).toBe(SQL_WITH_INTERIOR_BROKEN_TOKEN.length);
    expect(
      SQL_WITH_INTERIOR_BROKEN_TOKEN.slice(region?.startOffset ?? 0, region?.endOffset ?? 0)
    ).toBe('WHERE id = 1;');
  });

  it('keeps a position past the end of the SQL inside the SQL bounds', () => {
    // A formatter that reports a position beyond the captured SQL (a stale buffer, a parser
    // counting from a different string) must not produce a range that runs off the end.
    const pastTheEnd = SQL_WITH_INTERIOR_BROKEN_TOKEN.length + 40;
    const error = formatterErrorAtOffset(SQL_WITH_INTERIOR_BROKEN_TOKEN, pastTheEnd);

    const region = resolveErrorRegion(error, SQL_WITH_INTERIOR_BROKEN_TOKEN);

    expect(region?.endOffset).toBeLessThanOrEqual(SQL_WITH_INTERIOR_BROKEN_TOKEN.length);
    expect(region?.startOffset).toBeGreaterThanOrEqual(0);
    expect(region?.snippet).toBe(
      SQL_WITH_INTERIOR_BROKEN_TOKEN.slice(region?.startOffset ?? 0, region?.endOffset ?? 0)
    );
  });

  it('resolves a region when the formatter reports only a line and column', () => {
    // A lexer failure carries its position in the message and no `offset` property at all.
    const error = captureFormatError(
      new Error(`Parse error: Unexpected "'abc;" at line 2 column 12.\nSQL dialect used: "mysql".`),
      { sourceSql: "SELECT *\nFROM users\nWHERE name = 'abc;", dialect: 'mysql' }
    );

    const region = resolveErrorRegion(error, error.sourceSql);

    expect(
      region === null ? null : error.sourceSql.slice(region.startOffset, region.endOffset)
    ).toBe("WHERE name = 'abc;");
  });
});

describe('resolveErrorRegion with a cross-check position', () => {
  it('marks a region that came from a heuristic scan as a heuristic', () => {
    // Oracle has no grammar, so its position is a structural guess. The region has to carry that
    // fact forward: the panel and the prompt both read this field to tell the user how sure the
    // correction boundary is (FR-019).
    const sql = SQL_WITH_BROKEN_TOKEN;
    const error = captureFormatError(new Error('Parse error: unbalanced parenthesis'), {
      sourceSql: sql,
      dialect: 'oracle',
    });

    const region = resolveErrorRegion(error, sql, {
      offset: sql.indexOf(BROKEN_TOKEN),
      line: 3,
      column: 13,
      source: 'heuristic',
    });

    expect(region?.source).toBe('heuristic');
  });

  it('falls back to the cross-check parser', () => {
    // sql-formatter reports no position for this failure, so the cross-check parser is the only
    // thing that can anchor a region — and the region has to say where its position came from.
    const sql = SQL_WITH_BROKEN_TOKEN;
    const error = captureFormatError(new Error('Parse error: unbalanced parenthesis'), {
      sourceSql: sql,
      dialect: 'oracle',
    });

    const region = resolveErrorRegion(error, sql, {
      offset: sql.indexOf(BROKEN_TOKEN),
      line: 3,
      column: 13,
    });

    const lineStart = sql.indexOf(OFFENDING_LINE);
    expect(region).toEqual({
      startOffset: lineStart,
      endOffset: lineStart + OFFENDING_LINE.length,
      startLine: 3,
      endLine: 3,
      source: 'ast-parser',
      snippet: OFFENDING_LINE,
      anchorOffset: sql.indexOf(BROKEN_TOKEN),
    });
  });
});

