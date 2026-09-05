// Catches copy-paste artifacts that make pasted text look like "valid" SQL to the regex-based
// analyzer but are not actually valid SQL — e.g. the whole query wrapped in the quotes added
// when copying out of Excel/CSV or a JSON/string dump, or typographic "smart quotes"/invisible
// characters from a word processor silently breaking string-literal parsing.
import { stripSqlComments } from './sqlAnalyzer';

export interface SqlFormatIssue {
  /** i18n key for the user-facing message. */
  reasonKey: string;
  /** Language-neutral fallback if the key is somehow missing from the locale. */
  reason: string;
  sample: string;
}

export interface SqlFormatValidationResult {
  valid: boolean;
  issue: SqlFormatIssue | null;
}

const WRAPPING_QUOTE_PAIRS: Array<[string, string]> = [
  ['"', '"'],
  ["'", "'"],
  ['`', '`'],
];

// Characters that look like ASCII SQL syntax but are not: curly quotes stop string literals
// from being recognised as such, non-breaking/zero-width spaces silently break tokenization.
const SUSPICIOUS_CHAR_PATTERNS: Array<{ pattern: RegExp; reasonKey: string; reason: string }> = [
  { pattern: /[\u201C\u201D]/, reasonKey: 'sqlFormatCurlyDoubleQuote', reason: 'curly double quote (\u201C \u201D)' },
  { pattern: /[\u2018\u2019]/, reasonKey: 'sqlFormatCurlySingleQuote', reason: 'curly single quote (\u2018 \u2019)' },
  { pattern: /\u00A0/, reasonKey: 'sqlFormatNonBreakingSpace', reason: 'non-breaking space' },
  { pattern: /[\u200B\u200C\u200D\uFEFF]/, reasonKey: 'sqlFormatZeroWidthChar', reason: 'zero-width character' },
];

/**
 * Detects the entire query being wrapped in a single pair of matching quote characters — a
 * valid SQL statement always starts with a keyword, never a quote, so this is a strong signal
 * the text was copied out of Excel/CSV/JSON rather than pasted as real SQL.
 */
function detectWrappingQuotes(trimmedSql: string): SqlFormatIssue | null {
  if (trimmedSql.length < 2) return null;
  const first = trimmedSql[0];
  const last = trimmedSql[trimmedSql.length - 1];

  for (const [open, close] of WRAPPING_QUOTE_PAIRS) {
    if (first === open && last === close) {
      return {
        reasonKey: 'sqlFormatWrappedInQuotes',
        reason: `entire query wrapped in ${open}\u2026${close}`,
        sample: trimmedSql.length > 40 ? `${trimmedSql.slice(0, 40)}\u2026` : trimmedSql,
      };
    }
  }
  return null;
}

function detectSuspiciousCharacters(sql: string): SqlFormatIssue | null {
  for (const { pattern, reasonKey, reason } of SUSPICIOUS_CHAR_PATTERNS) {
    const match = pattern.exec(sql);
    if (!match || match.index === undefined) continue;
    const start = Math.max(0, match.index - 15);
    const end = Math.min(sql.length, match.index + 15);
    return { reasonKey, reason, sample: sql.slice(start, end) };
  }
  return null;
}

/**
 * Best-effort hygiene check for pasted SQL, meant to run before the regex-based analyzer —
 * which has no real grammar and will happily "succeed" on garbage input like a whole query
 * wrapped in quotes. Returns the first issue found (wrapping quotes take priority since they
 * invalidate the entire query, not just one token).
 */
export function validateSqlFormat(sql: string): SqlFormatValidationResult {
  const trimmed = stripSqlComments(sql).trim();
  if (!trimmed) return { valid: true, issue: null };

  const issue = detectWrappingQuotes(trimmed) ?? detectSuspiciousCharacters(trimmed);
  return { valid: issue === null, issue };
}
