// Validates that pasted SQL syntax matches the dialect selected in the UI.
// Two complementary checks:
// 1. Signature scan — regex patterns for syntax that is essentially exclusive to one
//    dialect (works for all 4 dialects, including sqlserver/oracle which dt-sql-parser
//    does not have a grammar for). Runs on string-masked SQL so keywords inside string
//    literals don't cause false positives.
// 2. AST cross-check — for mysql/postgresql (the dialects dt-sql-parser can actually
//    parse), if the query fails to parse under the selected dialect but parses cleanly
//    under the other one, that is strong evidence of a mismatch. Runs on the ORIGINAL
//    (comment-stripped, unmasked) SQL — masking would blank string literals into spaces
//    and turn valid queries into parse errors, defeating the check.
//
// dt-sql-parser is loaded lazily via dynamic import() so its (large, ANTLR-based) bundle
// is code-split out of the query-input route's initial client JS.
import { stripSqlComments, maskSqlStringLiterals, type SqlDialect } from './sqlAnalyzer';

export interface DialectMismatch {
  detectedDialect: SqlDialect;
  detectedLabel: string;
  /** Language-neutral SQL construct that triggered detection (e.g. "ROWNUM", "TOP N"). */
  reason: string;
  /** Optional i18n key; when set, the UI should prefer the localized string over `reason`. */
  reasonKey?: string;
  sample: string;
}

export interface DialectValidationResult {
  valid: boolean;
  mismatches: DialectMismatch[];
}

export const DIALECT_LABELS: Record<SqlDialect, string> = {
  mysql: 'MySQL',
  postgresql: 'PostgreSQL',
  sqlserver: 'SQL Server',
  oracle: 'Oracle',
};

interface DialectSignature {
  pattern: RegExp;
  // `reason` is a language-neutral SQL construct/token (kept out of i18n on purpose —
  // "ROWNUM", "(+)", "::" etc. read the same in every locale).
  reason: string;
}

// Each pattern below is chosen because it is either invalid or highly unusual outside
// of its dialect, keeping false positives low.
const DIALECT_SIGNATURES: Record<SqlDialect, DialectSignature[]> = {
  oracle: [
    { pattern: /\bROWNUM\b/i, reason: 'ROWNUM' },
    { pattern: /\bCONNECT\s+BY\b/i, reason: 'CONNECT BY' },
    { pattern: /\(\s*\+\s*\)/, reason: '(+)' },
    { pattern: /\b\w+\.(NEXTVAL|CURRVAL)\b/i, reason: 'NEXTVAL / CURRVAL' },
    { pattern: /\bMINUS\b/i, reason: 'MINUS' },
  ],
  sqlserver: [
    { pattern: /\bSELECT\s+(DISTINCT\s+)?TOP\s+\d+\b/i, reason: 'TOP N' },
    // Require a non-identifier char before '[' so array subscripts (e.g. arr[idx]) are
    // not mistaken for SQL Server bracketed [identifiers].
    { pattern: /(?<![\w)\]])\[[A-Za-z_]\w*\]/, reason: '[…]' },
    { pattern: /\bGETDATE\s*\(\)/i, reason: 'GETDATE()' },
    { pattern: /@@(IDENTITY|ROWCOUNT|VERSION)\b/i, reason: '@@' },
    { pattern: /\bDECLARE\s+@\w+/i, reason: 'DECLARE @' },
  ],
  mysql: [
    { pattern: /`[^`]+`/, reason: '`…`' },
    { pattern: /\bLIMIT\s+\d+\s*,\s*\d+\b/i, reason: 'LIMIT x,y' },
    { pattern: /\bAUTO_INCREMENT\b/i, reason: 'AUTO_INCREMENT' },
    { pattern: /\bSTRAIGHT_JOIN\b/i, reason: 'STRAIGHT_JOIN' },
  ],
  postgresql: [
    { pattern: /::[A-Za-z_]\w*/, reason: '::' },
    { pattern: /\bILIKE\b/i, reason: 'ILIKE' },
    { pattern: /\$\d+\b/, reason: '$n' },
  ],
};

function scanForSignatures(maskedSql: string, selectedDialect: SqlDialect): DialectMismatch[] {
  const mismatches: DialectMismatch[] = [];

  (Object.keys(DIALECT_SIGNATURES) as SqlDialect[]).forEach((candidate) => {
    if (candidate === selectedDialect) return;

    for (const signature of DIALECT_SIGNATURES[candidate]) {
      const match = signature.pattern.exec(maskedSql);
      if (match) {
        mismatches.push({
          detectedDialect: candidate,
          detectedLabel: DIALECT_LABELS[candidate],
          reason: signature.reason,
          sample: match[0].trim(),
        });
        break; // one signature hit per candidate dialect is enough signal
      }
    }
  });

  return mismatches;
}

async function crossCheckWithAst(
  strippedSql: string,
  selectedDialect: SqlDialect
): Promise<DialectMismatch | null> {
  const otherDialect: SqlDialect | null =
    selectedDialect === 'mysql' ? 'postgresql' : selectedDialect === 'postgresql' ? 'mysql' : null;
  if (!otherDialect) return null; // dt-sql-parser has no grammar for sqlserver/oracle

  try {
    const { MySQL, PostgreSQL } = await import('dt-sql-parser');
    const makeParser = (dialect: SqlDialect) =>
      dialect === 'mysql' ? new MySQL() : new PostgreSQL();
    const hasParseErrors = (dialect: SqlDialect) => {
      const errors: unknown[] = [];
      // `validate()` emits expected parser failures to the browser console. This is only a
      // dialect probe, so collect syntax errors through the parser's custom listener instead.
      makeParser(dialect).parse(strippedSql, (error: unknown) => errors.push(error));
      return errors.length > 0;
    };

    if (!hasParseErrors(selectedDialect)) return null; // parses fine under the selected dialect

    if (!hasParseErrors(otherDialect)) {
      return {
        detectedDialect: otherDialect,
        detectedLabel: DIALECT_LABELS[otherDialect],
        reason: 'syntax not valid for the selected dialect',
        reasonKey: 'dialectReasonAstParse',
        sample: '',
      };
    }
  } catch {
    // dt-sql-parser unavailable or threw on this input — fall back to signature-only detection
  }

  return null;
}

/**
 * Grammars `node-sql-parser` actually ships. `oracle` is absent on purpose: neither v5.4.0 nor
 * v4.18.0 has a PL-SQL grammar (both throw "plsql is not supported currently"), so Oracle is
 * never given a parser position (FR-019).
 */
const CROSS_CHECK_GRAMMARS: Partial<
  Record<SqlDialect, 'mysql' | 'postgresql' | 'transactsql'>
> = {
  mysql: 'mysql',
  postgresql: 'postgresql',
  sqlserver: 'transactsql',
};

/**
 * Where a position came from. `ast-parser` is a real grammar's verdict; `heuristic` is a structural
 * scan standing in for a grammar that does not exist, and the region and prompt say so (FR-019).
 */
export interface SyntaxErrorPosition {
  offset: number;
  line: number;
  column: number;
  source: 'ast-parser' | 'heuristic';
}

/**
 * Finds the single unclosed `(` in `sql`, if there is exactly one and no stray `)`.
 *
 * This is a structural scan, not a parser. It claims a position only when the imbalance points at
 * one character, and stays silent otherwise: a guessed position would anchor a correction to a line
 * the user never broke, which is worse than admitting the position is unknown (FR-020).
 */
function scanForUnclosedParen(sql: string): SyntaxErrorPosition | null {
  const openOffsets: number[] = [];
  for (let index = 0; index < sql.length; index += 1) {
    if (sql[index] === '(') {
      openOffsets.push(index);
    } else if (sql[index] === ')') {
      // A ')' with nothing open points at no delimiter, so nothing here is certain.
      if (openOffsets.length === 0) return null;
      openOffsets.pop();
    }
  }
  // Balanced (0) is not an error; more than one leftover '(' leaves several candidates.
  if (openOffsets.length !== 1) return null;

  const offset = openOffsets[0];
  const lineStart = sql.lastIndexOf('\n', offset - 1) + 1;
  return {
    offset,
    line: sql.slice(0, offset).split('\n').length,
    column: offset - lineStart + 1,
    source: 'heuristic',
  };
}

/**
 * Asks the cross-check parser where `sql` stops being valid, for the dialects that have a grammar.
 * Resolves `null` when the statement parses, when the dialect has no grammar, or when the parser
 * cannot run — a missing position must never become a fabricated one (FR-020).
 */
export async function locateSyntaxError(
  sql: string,
  dialect: SqlDialect
): Promise<SyntaxErrorPosition | null> {
  const grammar = CROSS_CHECK_GRAMMARS[dialect];
  // Oracle has no grammar in any available version, so a labelled structural scan stands in for it.
  if (!grammar) return dialect === 'oracle' ? scanForUnclosedParen(sql) : null;
  try {
    const { Parser } = await import('node-sql-parser');
    new Parser().astify(sql, { database: grammar });
    return null;
  } catch (error) {
    const start = (error as { location?: { start?: Omit<SyntaxErrorPosition, 'source'> } })
      .location?.start;
    return start
      ? { offset: start.offset, line: start.line, column: start.column, source: 'ast-parser' }
      : null;
  }
}

/**
 * Checks whether `sql` looks like it was written for `selectedDialect`.
 * Returns any detected mismatches so the caller can warn the user before analysing.
 */
export async function validateSqlDialect(
  sql: string,
  selectedDialect: SqlDialect
): Promise<DialectValidationResult> {
  const trimmed = sql.trim();
  if (!trimmed) return { valid: true, mismatches: [] };

  const stripped = stripSqlComments(trimmed);
  const masked = maskSqlStringLiterals(stripped);

  // Signature scan uses masked SQL (keywords inside string literals must not match);
  // the AST cross-check uses the unmasked SQL (masking would corrupt valid queries).
  const mismatches = scanForSignatures(masked, selectedDialect);

  // The AST cross-check lazy-loads the (heavy) dt-sql-parser, so only pay for it when the
  // cheap signature scan found nothing — a signature hit is already conclusive.
  if (mismatches.length === 0) {
    const astMismatch = await crossCheckWithAst(stripped, selectedDialect);
    if (astMismatch) mismatches.push(astMismatch);
  }

  return { valid: mismatches.length === 0, mismatches };
}
