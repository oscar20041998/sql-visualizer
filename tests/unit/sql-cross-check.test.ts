import { describe, expect, it } from 'vitest';
import { locateSyntaxError } from '@/lib/sql/dialectValidator';

/** Three-line MySQL whose unclosed parenthesis sits at the end of the third line. */
const BROKEN_MYSQL = 'SELECT a,\n  b\nFROM (';

/**
 * Valid MySQL built from the constructs a stricter grammar is most likely to reject: a CTE, a
 * derived table, a correlated subquery in the select list and a string literal.
 */
const VALID_MYSQL = `WITH recent AS (
  SELECT id, name
  FROM users
  WHERE name = 'Ada'
)
SELECT u.id, (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
FROM users u
JOIN recent r ON r.id = u.id
LIMIT 10`;

/**
 * Oracle PL/SQL block whose subquery parenthesis is never closed. No grammar exists for PL-SQL, so
 * this position can only come from a structural scan - and a scan is not a parser, which is why the
 * result says where it came from.
 */
const ORACLE_UNCLOSED_PAREN = `BEGIN\n  SELECT COUNT(*) FROM (\nEND;`;

/** The unclosed parenthesis in {@link ORACLE_UNCLOSED_PAREN}: line 2, twenty-four characters in. */
const ORACLE_OPEN_PAREN = 29;

/** Every delimiter is matched, so nothing points anywhere. */
const ORACLE_BALANCED = `BEGIN\n  SELECT COUNT(*) FROM (SELECT 1 FROM dual);\nEND;`;

/** A closing delimiter with nothing open, which points at no opening delimiter at all. */
const ORACLE_STRAY_CLOSE = `BEGIN\n  SELECT COUNT(*) FROM users);\nEND;`;

/** Two unclosed delimiters, so only the last one would be a guess. */
const ORACLE_TWO_UNCLOSED = `BEGIN\n  SELECT COUNT(*) FROM (SELECT id FROM (\nEND;`;

describe('locateSyntaxError', () => {
  it('reports where the cross-check parser says the SQL goes wrong', async () => {
    // The position the parser reports, not one this test computes: the parser is the authority for
    // where a statement goes wrong, and the region is anchored on whatever it says (FR-019).
    expect(await locateSyntaxError(BROKEN_MYSQL, 'mysql')).toEqual({
      offset: 20,
      line: 3,
      column: 7,
      source: 'ast-parser',
    });
  });

  it('falls back to a structural scan for a dialect with no grammar', async () => {
    expect(await locateSyntaxError(ORACLE_UNCLOSED_PAREN, 'oracle')).toEqual({
      offset: ORACLE_OPEN_PAREN,
      line: 2,
      column: 24,
      source: 'heuristic',
    });
  });

  it('refuses to guess when the structure points at more than one place', async () => {
    // Each fixture is a different way of being unsure, and every one of them must produce no
    // position at all: a guess here becomes the line a correction is allowed to rewrite (FR-020).
    expect(await locateSyntaxError(ORACLE_BALANCED, 'oracle')).toBeNull();
    expect(await locateSyntaxError(ORACLE_STRAY_CLOSE, 'oracle')).toBeNull();
    expect(await locateSyntaxError(ORACLE_TWO_UNCLOSED, 'oracle')).toBeNull();
  });

  it('does not invent a position for SQL that parses', async () => {
    // A region anchored on a parser complaint about valid SQL would point the guard at a line the
    // user never broke, so "it parsed" has to stay `null` and yield no region at all (FR-020).
    expect(await locateSyntaxError(VALID_MYSQL, 'mysql')).toBeNull();
  });
});
