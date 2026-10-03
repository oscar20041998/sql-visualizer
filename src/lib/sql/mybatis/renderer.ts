/**
 * SQL assembly (FR-007, FR-008): join the evaluated pieces into one SQL string.
 *
 * Cosmetic whitespace is normalised line by line: indentation and redundant
 * blank lines collapse, runs of spaces become one space, and every line is
 * trimmed. Whitespace inside string literals, quoted identifiers and SQL
 * comments is preserved verbatim. Nothing else about the statement is
 * rewritten — dialect-specific text passes through untouched (FR-033).
 */

/** Join the evaluated pieces and normalise the result's cosmetic whitespace. */
export function normaliseWhitespace(pieces: string[]): string {
  return normaliseSqlText(pieces.join(' '));
}

/**
 * Line-preserving whitespace normaliser, shared by the renderer and the legacy
 * parse surface: the statement keeps its line structure, so long queries stay
 * readable and golden fixtures compare line for line.
 */
export function normaliseSqlText(sql: string): string {
  let output = '';
  let lineStart = 0;
  let i = 0;
  const length = sql.length;
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;
  let pendingSpace = false;

  /** Emit one pending space unless the line is still empty, then clear it. */
  const flush = (): void => {
    if (pendingSpace && output.length > lineStart) output += ' ';
    pendingSpace = false;
  };

  while (i < length) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
        output += '\n';
        lineStart = output.length;
      } else {
        output += ch;
      }
      i += 1;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        output += '*/';
        i += 2;
        continue;
      }
      output += ch;
      i += 1;
      continue;
    }
    if (!inSingle && !inDouble && !inBacktick) {
      if (ch === '-' && next === '-') {
        flush();
        inLineComment = true;
        output += '--';
        i += 2;
        continue;
      }
      if (ch === '/' && next === '*') {
        flush();
        inBlockComment = true;
        output += '/*';
        i += 2;
        continue;
      }
    }
    if (!inDouble && !inBacktick && ch === "'") {
      // Doubled quote inside a literal: stay in the literal.
      if (inSingle && next === "'") {
        output += "''";
        i += 2;
        continue;
      }
      flush();
      inSingle = !inSingle;
      output += ch;
      i += 1;
      continue;
    }
    if (!inSingle && !inBacktick && ch === '"') {
      if (inDouble && next === '"') {
        output += '""';
        i += 2;
        continue;
      }
      flush();
      inDouble = !inDouble;
      output += ch;
      i += 1;
      continue;
    }
    if (!inSingle && !inDouble && ch === '`') {
      flush();
      inBacktick = !inBacktick;
      output += ch;
      i += 1;
      continue;
    }
    if (!inSingle && !inDouble && !inBacktick && (ch === ' ' || ch === '\t' || ch === '\r')) {
      pendingSpace = true;
      i += 1;
      continue;
    }
    if (!inSingle && !inDouble && !inBacktick && ch === '\n') {
      // Blank lines collapse; a line never starts or ends with a space.
      pendingSpace = false;
      if (output.length > lineStart) {
        output += '\n';
        lineStart = output.length;
      }
      i += 1;
      continue;
    }
    flush();
    output += ch;
    i += 1;
  }
  return output.trim();
}