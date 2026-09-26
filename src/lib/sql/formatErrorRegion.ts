// Resolves the contiguous SQL range a correction is allowed to touch — the replacement boundary
// (spec 012, FR-017). Pure and DOM-free so the safety guard can be exhaustively unit-tested.
import { offsetFromLineColumn, type FormatError } from './formatError';

/** The range, in the captured SQL, that a proposal's change must stay inside. */
export interface ErrorRegion {
  /** 0-based, inclusive; always `< endOffset`. */
  startOffset: number;
  /** 0-based, exclusive; `<= sourceSql.length`. */
  endOffset: number;
  /** 1-based inclusive line numbers, for display and for the prompt. */
  startLine: number;
  endLine: number;
  /**
   * Which parser supplied the anchor position. `heuristic` is not a parser at all: it is a
   * structural stand-in for a grammar that does not exist, and the UI and prompt say so.
   */
  source: 'formatter' | 'ast-parser' | 'heuristic';
  /** The region text, byte-identical to the slice it describes. */
  snippet: string;
  /** The reported error position inside the region (display/debug only). */
  anchorOffset: number;
}

/** First character index of the line that contains `offset`, excluding the line break. */
function lineStartOffset(source: string, offset: number): number {
  if (offset <= 0) return 0;
  const lineBreak = source.lastIndexOf('\n', offset - 1);
  return lineBreak === -1 ? 0 : lineBreak + 1;
}

/** First character index after the line that contains `offset`, excluding the line break. */
function lineEndOffset(source: string, offset: number): number {
  const lineBreak = source.indexOf('\n', offset);
  return lineBreak === -1 ? source.length : lineBreak;
}

/** 1-based line number of the character at `offset`. */
function lineNumberAt(source: string, offset: number): number {
  return source.slice(0, Math.max(0, offset)).split('\n').length;
}

/**
 * The reported position as a character index, preferring the formatter's exact `offset` and falling
 * back to the line/column a lexer failure embeds in its message. `undefined` when the formatter
 * reported no position at all, which is where the AST cross-check fallback (FR-019) will plug in.
 */
function resolveAnchorOffset(error: FormatError, sourceSql: string): number | undefined {
  const { offset, line, column } = error.location ?? {};
  if (offset !== undefined) return offset;
  if (line !== undefined && column !== undefined)
    return offsetFromLineColumn(sourceSql, line, column);
  return undefined;
}

/**
 * A position reported by the AST cross-check parser (FR-019). `node-sql-parser` reports character
 * offsets alongside line/column, but a caller with only a line/column can still supply those.
 */
export interface CrossCheckPosition {
  offset?: number;
  line: number;
  column: number;
  /** Defaults to `ast-parser` when the caller does not say where the position came from. */
  source?: 'ast-parser' | 'heuristic';
}

/**
 * Turns a captured format error into the range a correction may touch.
 *
 * The anchor is the formatter's reported position, and the region is the affected line — the
 * conservative expansion, which can never widen into a neighbouring statement. When the formatter
 * reported no position at all, `crossCheckPosition` is the only thing that can anchor a region;
 * a region that came from there is marked `ast-parser` so the prompt can say so (FR-019). With
 * neither, no region is produced, so no proposal becomes applicable (FR-020).
 */
export function resolveErrorRegion(
  error: FormatError,
  sourceSql: string,
  crossCheckPosition?: CrossCheckPosition | null
): ErrorRegion | null {
  const formatterAnchor = resolveAnchorOffset(error, sourceSql);
  const usesCrossCheck = formatterAnchor === undefined && crossCheckPosition != null;
  const anchorOffset =
    formatterAnchor ??
    (crossCheckPosition?.offset ??
      (crossCheckPosition
        ? offsetFromLineColumn(sourceSql, crossCheckPosition.line, crossCheckPosition.column)
        : undefined));
  if (anchorOffset === undefined) return null;

  const startOffset = lineStartOffset(sourceSql, anchorOffset);
  const endOffset = lineEndOffset(sourceSql, anchorOffset);
  // A position on the empty line after a trailing break covers no text, and the invariant
  // `startOffset < endOffset` (data-model §ErrorRegion) has nothing to describe. Yield no region
  // rather than fabricate one (FR-020).
  if (endOffset <= startOffset) return null;

  return {
    startOffset,
    endOffset,
    startLine: lineNumberAt(sourceSql, startOffset),
    endLine: lineNumberAt(sourceSql, endOffset - 1),
    source: usesCrossCheck
      ? (crossCheckPosition?.source ?? 'ast-parser')
      : (error.locationSource ?? 'formatter'),
    snippet: sourceSql.slice(startOffset, endOffset),
    anchorOffset,
  };
}
