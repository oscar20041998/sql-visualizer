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

    const selectedErrors = makeParser(selectedDialect).validate(strippedSql);
    if (selectedErrors.length === 0) return null; // parses fine under the selected dialect

    const otherErrors = makeParser(otherDialect).validate(strippedSql);
    if (otherErrors.length === 0) {
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
