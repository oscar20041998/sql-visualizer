// Validates that pasted SQL syntax matches the dialect selected in the UI.
// Two complementary checks:
// 1. Signature scan — regex patterns for syntax that is essentially exclusive to one
//    dialect (works for all 4 dialects, including sqlserver/oracle which dt-sql-parser
//    does not have a grammar for).
// 2. AST cross-check — for mysql/postgresql (the dialects dt-sql-parser can actually
//    parse), if the query fails to parse under the selected dialect but parses cleanly
//    under the other one, that is strong evidence of a mismatch.
import { MySQL, PostgreSQL } from 'dt-sql-parser';
import { stripSqlComments, maskSqlStringLiterals, type SqlDialect } from './sqlAnalyzer';

export interface DialectMismatch {
  detectedDialect: SqlDialect;
  detectedLabel: string;
  reason: string;
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
  reason: string;
}

// Each pattern below is chosen because it is either invalid or highly unusual outside
// of its dialect, keeping false positives low.
const DIALECT_SIGNATURES: Record<SqlDialect, DialectSignature[]> = {
  oracle: [
    { pattern: /\bROWNUM\b/i, reason: 'ROWNUM pseudo-column' },
    { pattern: /\bCONNECT\s+BY\b/i, reason: 'CONNECT BY clause' },
    { pattern: /\bFROM\s+DUAL\b/i, reason: 'DUAL table reference' },
    { pattern: /\(\s*\+\s*\)/, reason: '(+) Oracle outer-join operator' },
    { pattern: /\b\w+\.(NEXTVAL|CURRVAL)\b/i, reason: 'sequence NEXTVAL/CURRVAL reference' },
    { pattern: /\bMINUS\b/i, reason: 'MINUS set operator' },
  ],
  sqlserver: [
    { pattern: /\bSELECT\s+(DISTINCT\s+)?TOP\s+\d+\b/i, reason: 'SELECT TOP N clause' },
    { pattern: /\[[A-Za-z_][\w]*\]/, reason: 'bracketed [identifier]' },
    { pattern: /\bGETDATE\s*\(\)/i, reason: 'GETDATE() function' },
    { pattern: /@@(IDENTITY|ROWCOUNT|VERSION)\b/i, reason: 'system variable (e.g. @@IDENTITY)' },
    { pattern: /\bDECLARE\s+@\w+/i, reason: 'DECLARE @variable syntax' },
    { pattern: /\bOFFSET\s+\d+\s+ROWS\s+FETCH\s+NEXT\b/i, reason: 'OFFSET…FETCH NEXT paging' },
  ],
  mysql: [
    { pattern: /`[^`]+`/, reason: 'backtick-quoted identifier' },
    { pattern: /\bLIMIT\s+\d+\s*,\s*\d+\b/i, reason: 'LIMIT offset,count syntax' },
    { pattern: /\bAUTO_INCREMENT\b/i, reason: 'AUTO_INCREMENT keyword' },
    { pattern: /\bSTRAIGHT_JOIN\b/i, reason: 'STRAIGHT_JOIN keyword' },
  ],
  postgresql: [
    { pattern: /::[A-Za-z_][\w]*/, reason: '"::type" cast syntax' },
    { pattern: /\bILIKE\b/i, reason: 'ILIKE operator' },
    { pattern: /\bRETURNING\b/i, reason: 'RETURNING clause' },
    { pattern: /\$\d+\b/, reason: '$n positional parameter' },
  ],
};

function scanForSignatures(cleanedSql: string, selectedDialect: SqlDialect): DialectMismatch[] {
  const mismatches: DialectMismatch[] = [];

  (Object.keys(DIALECT_SIGNATURES) as SqlDialect[]).forEach((candidate) => {
    if (candidate === selectedDialect) return;

    for (const signature of DIALECT_SIGNATURES[candidate]) {
      const match = signature.pattern.exec(cleanedSql);
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

const AST_PARSERS: Partial<Record<SqlDialect, () => { validate(sql: string): unknown[] }>> = {
  mysql: () => new MySQL(),
  postgresql: () => new PostgreSQL(),
};

function crossCheckWithAst(
  cleanedSql: string,
  selectedDialect: SqlDialect
): DialectMismatch | null {
  const otherDialect: SqlDialect | null =
    selectedDialect === 'mysql' ? 'postgresql' : selectedDialect === 'postgresql' ? 'mysql' : null;
  if (!otherDialect) return null; // dt-sql-parser has no grammar for sqlserver/oracle

  try {
    const selectedErrors = AST_PARSERS[selectedDialect]!().validate(cleanedSql);
    if (selectedErrors.length === 0) return null; // parses fine under the selected dialect

    const otherErrors = AST_PARSERS[otherDialect]!().validate(cleanedSql);
    if (otherErrors.length === 0) {
      return {
        detectedDialect: otherDialect,
        detectedLabel: DIALECT_LABELS[otherDialect],
        reason: `parses cleanly as ${DIALECT_LABELS[otherDialect]} but not as ${DIALECT_LABELS[selectedDialect]}`,
        sample: '',
      };
    }
  } catch {
    // dt-sql-parser threw on this input — fall back to signature-only detection
  }

  return null;
}

/**
 * Checks whether `sql` looks like it was written for `selectedDialect`.
 * Returns any detected mismatches so the caller can warn the user before analysing.
 */
export function validateSqlDialect(
  sql: string,
  selectedDialect: SqlDialect
): DialectValidationResult {
  const trimmed = sql.trim();
  if (!trimmed) return { valid: true, mismatches: [] };

  const cleaned = maskSqlStringLiterals(stripSqlComments(trimmed));

  const mismatches = scanForSignatures(cleaned, selectedDialect);

  const astMismatch = crossCheckWithAst(cleaned, selectedDialect);
  if (astMismatch && !mismatches.some((m) => m.detectedDialect === astMismatch.detectedDialect)) {
    mismatches.push(astMismatch);
  }

  return { valid: mismatches.length === 0, mismatches };
}
