// Turns a `sql-formatter` throw into a structured, renderable diagnostic.
//
// The formatter's error shape is not stable across its failure modes and is frequently huge:
// a nearley parser failure carries `offset` + `token`, while a lexer failure carries no position
// at all and embeds the position in the message text. Two rules follow from that (see
// specs/012-format-error-ai-diagnostics/contracts/format-error-ai-contract.md §1):
//   1. Never fabricate a position — no location means no location *and* no snippet.
//   2. Always leave a short, human-readable `message`, even when the raw one is a grammar dump.
import type { SqlDialect } from './sqlAnalyzer';

/**
 * SQL dialect labels the panel and the AI prompts speak. These mirror the four dialects the app
 * supports (`SqlDialect`) rather than sql-formatter's internal language names, so the same value
 * can be shown to the user and written into a prompt without a second lookup table.
 */
export type SqlFormatDialect = Extract<SqlDialect, 'mysql' | 'postgresql' | 'sqlserver' | 'oracle'>;

export interface FormatErrorLocation {
  /** Character index of the offending token, when the formatter reported one. */
  offset?: number;
  /** 1-based line, derived from `offset` or parsed out of the formatter message. */
  line?: number;
  /** 1-based column, derived from `offset` or parsed out of the formatter message. */
  column?: number;
}

/** A failed formatting attempt, normalized for display and for AI grounding. */
export interface FormatError {
  /** Short, single-paragraph formatter message. Never empty. */
  message: string;
  dialect: SqlFormatDialect;
  /** Absent when the formatter reported no usable position. */
  location?: FormatErrorLocation;
  /**
   * Which parser supplied `location` (FR-019). The formatter is the primary source; the AST
   * cross-check parser fills in when it reports none. Absent exactly when `location` is, so a
   * position is never attributed to a parser that did not produce it.
   */
  locationSource?: 'formatter' | 'ast-parser';
  /** SQL window around the location. Absent whenever `location` is absent. */
  snippet?: string;
  /** The full SQL that failed to format — the grounding source for the AI actions. */
  sourceSql: string;
  severity: 'error';
  /** ISO timestamp. */
  occurredAt: string;
}

export interface CaptureFormatErrorOptions {
  sourceSql: string;
  dialect: SqlFormatDialect;
  /** Injectable clock, so tests can assert a deterministic `occurredAt`. */
  now?: Date;
}

/** Characters of SQL kept on either side of the error location for the context snippet. */
const SNIPPET_RADIUS = 60;

/** Guard for nearley's grammar dump, which appends tens of KB after the real message. */
const MAX_MESSAGE_CHARS = 240;

/** `... at line 3 column 12` — the only position a lexer error exposes. */
const MESSAGE_POSITION_PATTERN = /\bline\s+(\d+)\s+column\s+(\d+)\b/i;

/**
 * Reads `offset` off an unknown thrown value. Nearley attaches it as an own property on a plain
 * `Error`, so a structural check is both necessary and sufficient here — there is no class to
 * test against.
 */
function readOffset(thrown: unknown): number | undefined {
  if (!thrown || typeof thrown !== 'object') return undefined;
  const raw = (thrown as { offset?: unknown }).offset;
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) return undefined;
  return Math.floor(raw);
}

/** Reads the raw formatter message, which may be absent for non-`Error` throws. */
function readRawMessage(thrown: unknown): string {
  if (typeof thrown === 'string') return thrown;
  if (thrown instanceof Error) return thrown.message;
  if (thrown && typeof thrown === 'object') {
    const message = (thrown as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return '';
}

/**
 * Collapses a raw formatter message to a readable summary. A nearley parser error appends its
 * entire grammar expectation tree (tens of KB) after the first line, and a lexer error appends the
 * dialect note; only the first non-empty line carries the actual diagnosis.
 */
function toReadableMessage(raw: string): string {
  const firstLine = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  const summary = (firstLine ?? raw).trim();
  if (!summary) return 'The formatter could not parse this SQL.';
  return summary.length > MAX_MESSAGE_CHARS ? `${summary.slice(0, MAX_MESSAGE_CHARS)}…` : summary;
}

/** 1-based line/column for a character index in `source`. */
function lineColumnFromOffset(source: string, offset: number): { line: number; column: number } {
  const clamped = Math.max(0, Math.min(offset, source.length));
  const before = source.slice(0, clamped);
  const line = (before.match(/\n/g)?.length ?? 0) + 1;
  const column = clamped - before.lastIndexOf('\n');
  return { line, column };
}

/** Character index for a 1-based line/column pair, clamped into range. */
export function offsetFromLineColumn(source: string, line: number, column: number): number {
  const lines = source.split('\n');
  const targetLine = Math.max(1, Math.min(line, lines.length));
  let offset = 0;
  for (let index = 0; index < targetLine - 1; index += 1) offset += lines[index].length + 1;
  const maxColumn = lines[targetLine - 1]?.length ?? 0;
  return Math.min(offset + Math.max(0, column - 1), source.length);
}

/** A short SQL window around `offset`, marked with `…` when it is a slice of a longer query. */
function buildSnippet(source: string, offset: number): string | undefined {
  if (!source) return undefined;
  const clamped = Math.max(0, Math.min(offset, source.length));
  const start = Math.max(0, clamped - SNIPPET_RADIUS);
  const end = Math.min(source.length, clamped + SNIPPET_RADIUS);
  const window = source.slice(start, end).replace(/\s+/g, ' ').trim();
  if (!window) return undefined;
  return `${start > 0 ? '…' : ''}${window}${end < source.length ? '…' : ''}`;
}

/**
 * Derives the error position and a matching snippet from the formatter's thrown value.
 *
 * Preference order: the structural `offset` (exact — nearley parser errors) → a `line N column M`
 * embedded in the message by the lexer (approximate, but still reported by the formatter itself).
 * When neither exists the location stays empty and no snippet is produced, per the contract's
 * "no fabricated positions" guarantee.
 */
export function deriveLocationAndSnippet(
  sourceSql: string,
  thrown: unknown
): { location: FormatErrorLocation; snippet?: string } {
  const offset = readOffset(thrown);
  if (offset !== undefined) {
    const { line, column } = lineColumnFromOffset(sourceSql, offset);
    return { location: { offset, line, column }, snippet: buildSnippet(sourceSql, offset) };
  }

  const match = MESSAGE_POSITION_PATTERN.exec(readRawMessage(thrown));
  if (match) {
    const line = Number.parseInt(match[1], 10);
    const column = Number.parseInt(match[2], 10);
    if (Number.isFinite(line) && Number.isFinite(column) && line >= 1 && column >= 1) {
      return {
        location: { line, column },
        snippet: buildSnippet(sourceSql, offsetFromLineColumn(sourceSql, line, column)),
      };
    }
  }

  return { location: {} };
}

/**
 * Normalizes a `sql-formatter` throw into a {@link FormatError}. Accepts `unknown` because the
 * formatter is free to throw a non-`Error` value, and a failed format attempt must still produce a
 * renderable report rather than a second failure.
 */
export function captureFormatError(
  thrown: unknown,
  { sourceSql, dialect, now }: CaptureFormatErrorOptions
): FormatError {
  const { location, snippet } = deriveLocationAndSnippet(sourceSql, thrown);
  const hasLocation = location.offset !== undefined || location.line !== undefined;

  return {
    message: toReadableMessage(readRawMessage(thrown)),
    dialect,
    ...(hasLocation ? { location, locationSource: 'formatter' as const } : {}),
    ...(snippet ? { snippet } : {}),
    sourceSql,
    severity: 'error',
    occurredAt: (now ?? new Date()).toISOString(),
  };
}

/** `line:column` when known, `@offset` as a fallback, `null` when the formatter gave no position. */
export function formatErrorPosition(error: FormatError): string | null {
  const { line, column, offset } = error.location ?? {};
  if (line !== undefined && column !== undefined) return `${line}:${column}`;
  if (offset !== undefined) return `@${offset}`;
  return null;
}
