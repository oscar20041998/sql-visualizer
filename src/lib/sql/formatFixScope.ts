// Decides whether a model's correction may be written, and if so exactly which characters it
// replaces (spec 012, FR-017). Pure and DOM-free so the safety guard can be exhaustively
// unit-tested.

import type { ErrorRegion } from './formatErrorRegion';

/** The model's actual delta against the SQL it was given (data-model §AIFixProposal.change). */
export interface SqlChange {
  /** 0-based, inclusive; always `<= endOffset`. */
  startOffset: number;
  /** 0-based, exclusive. */
  endOffset: number;
  /** The replaced text, byte-identical to `originalSql.slice(startOffset, endOffset)`. */
  originalFragment: string;
  /** The text to write in its place. */
  replacement: string;
}

/** How many characters the two strings share from the start. */
function sharedPrefixLength(original: string, proposed: string): number {
  const limit = Math.min(original.length, proposed.length);
  let shared = 0;
  while (shared < limit && original[shared] === proposed[shared]) shared += 1;
  return shared;
}

/** How many characters the two remainders share from the end. */
function sharedSuffixLength(original: string, proposed: string): number {
  const limit = Math.min(original.length, proposed.length);
  let shared = 0;
  while (
    shared < limit &&
    original[original.length - 1 - shared] === proposed[proposed.length - 1 - shared]
  ) {
    shared += 1;
  }
  return shared;
}

/** The verdict on a proposal, exactly as the apply contract defines it. */
export type ApplyResult =
  | { ok: true; sql: string; appliedRange: { startOffset: number; endOffset: number } }
  | { ok: false; reason: 'stale' | 'undetermined-region' | 'no-change' | 'out-of-range' };

export interface ApplyFormatFixInput {
  /** The SQL the model was given (request-time snapshot). */
  snapshotSql: string;
  /** The editor SQL at apply time; a difference from the snapshot means the document moved on. */
  currentSql: string;
  /** The corrected document the model returned. */
  proposedSql: string;
  /** The range the change must stay inside; `null` when none could be resolved. */
  region: ErrorRegion | null;
}

/** A change that writes nothing: no characters replaced by no characters. */
function isEmptyChange(change: SqlChange): boolean {
  return change.startOffset === change.endOffset && change.replacement === '';
}

export function extractChange(originalSql: string, proposedSql: string): SqlChange {
  // The suffix is measured on what is left after the prefix, so the two shared runs can never
  // overlap and swallow the characters that actually differ.
  const prefix = sharedPrefixLength(originalSql, proposedSql);
  const suffix = sharedSuffixLength(originalSql.slice(prefix), proposedSql.slice(prefix));
  const startOffset = prefix;
  const endOffset = originalSql.length - suffix;

  return {
    startOffset,
    endOffset,
    originalFragment: originalSql.slice(startOffset, endOffset),
    replacement: proposedSql.slice(startOffset, proposedSql.length - suffix),
  };
}

export function applyFormatFix({
  snapshotSql,
  currentSql,
  proposedSql,
  region,
}: ApplyFormatFixInput): ApplyResult {
  // Rule 1 of the apply contract: a document that moved on since the request invalidates every
  // other question, so this is evaluated before the change is even extracted.
  // Rule 1 of the apply contract: a document that moved on since the request invalidates every
  // other question, so this is evaluated before the change is even extracted.
  if (currentSql !== snapshotSql) return { ok: false, reason: 'stale' };

  // Rule 2: without a region there is no boundary to hold the change, and none is invented (FR-020).
  if (region === null) return { ok: false, reason: 'undetermined-region' };

  const change = extractChange(snapshotSql, proposedSql);
  if (isEmptyChange(change)) return { ok: false, reason: 'no-change' };

  // Rule 4: the change must be fully contained in the region. Each boundary is rejected rather than
  // clamped, so text the panel never flagged as erroneous is never rewritten (FR-018).
  if (change.startOffset < region.startOffset) return { ok: false, reason: 'out-of-range' };
  if (change.endOffset > region.endOffset) return { ok: false, reason: 'out-of-range' };
  // The two boundary checks bound what is *replaced*, which cannot see text a short change
  // *inserts*: a one-character change at the region's last character can carry a whole new clause
  // in its replacement. A region is a line range, so lengthening that line is legitimate (U27) —
  // what is not legitimate is the model adding a **line** past the region (FR-017).
  const writtenPast = change.replacement.slice(Math.max(0, region.endOffset - change.startOffset));
  if (writtenPast.includes('\n')) return { ok: false, reason: 'out-of-range' };

  // Rule 5: splice the change into the request-time snapshot. The editor is not written here — the
  // caller commits `sql` after re-formatting it (contract §4, FR-017).
  const sql =
    snapshotSql.slice(0, change.startOffset) +
    change.replacement +
    snapshotSql.slice(change.endOffset);
  return {
    ok: true,
    sql,
    appliedRange: { startOffset: change.startOffset, endOffset: change.endOffset },
  };
}
