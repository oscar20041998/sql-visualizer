import { describe, expect, it } from 'vitest';
import { captureFormatError } from '@/lib/sql/formatError';
import { resolveErrorRegion, type ErrorRegion } from '@/lib/sql/formatErrorRegion';
import { applyFormatFix, extractChange } from '@/lib/sql/formatFixScope';

/** The SQL as the user wrote it, with a doubled digit the model will collapse to one. */
const ORIGINAL_SQL = 'SELECT id FROM t WHERE a = 11';
/** The model's answer: the same statement with the doubled digit fixed. */
const PROPOSED_SQL = 'SELECT id FROM t WHERE a = 1';

/** A region covering one whole line, as the formatter would report it. */
function regionForLine(sql: string, line: number): ErrorRegion {
  const thrown = new Error(`Parse error at line ${line} column 1: token`);
  const error = captureFormatError(thrown, { sourceSql: sql, dialect: 'mysql' });
  const region = resolveErrorRegion(error, sql);
  if (region === null) throw new Error(`fixture resolved no region for line ${line}`);
  return region;
}

describe('extractChange', () => {
  it('confines a trailing-whitespace difference to that whitespace', () => {
    // The model only stripped the padding at the end of the second line; the change must cover the
    // padding alone, never the line break or the lines around it.
    const padding = '   ';
    const withPadding = `SELECT id\nFROM t${padding}\nWHERE a = 1`;
    const withoutPadding = 'SELECT id\nFROM t\nWHERE a = 1';
    const paddingStart = withPadding.indexOf('FROM t') + 'FROM t'.length;

    const change = extractChange(withPadding, withoutPadding);

    expect(change).toEqual({
      startOffset: paddingStart,
      endOffset: paddingStart + padding.length,
      originalFragment: padding,
      replacement: '',
    });
  });

  it('extracts the change as the longest common prefix plus a non-overlapping suffix', () => {
    const change = extractChange(ORIGINAL_SQL, PROPOSED_SQL);

    expect(change.originalFragment).toBe('1');
    expect(change.replacement).toBe('');
    expect(
      ORIGINAL_SQL.slice(0, change.startOffset) +
        change.replacement +
        ORIGINAL_SQL.slice(change.endOffset)
    ).toBe(PROPOSED_SQL);
  });
});

describe('applyFormatFix', () => {
  it('rejects stale first', () => {
    // The document moved on since the request, and the proposal is also identical to the snapshot
    // with no region at all: staleness decides, because it is evaluated first.
    const result = applyFormatFix({
      snapshotSql: ORIGINAL_SQL,
      currentSql: `${ORIGINAL_SQL} `,
      proposedSql: ORIGINAL_SQL,
      region: null,
    });

    expect(result).toEqual({ ok: false, reason: 'stale' });
  });

  it('rejects when no region was determined', () => {
    const result = applyFormatFix({
      snapshotSql: ORIGINAL_SQL,
      currentSql: ORIGINAL_SQL,
      proposedSql: PROPOSED_SQL,
      region: null,
    });

    expect(result).toEqual({ ok: false, reason: 'undetermined-region' });
  });

  it('rejects a change starting before the region', () => {
    // The model joined the line break, so the change is the break itself — it ends exactly where the
    // region begins, and reaches one character before it.
    const original = 'SELECT id\nFROM t';
    const proposed = 'SELECT id FROM t';

    const result = applyFormatFix({
      snapshotSql: original,
      currentSql: original,
      proposedSql: proposed,
      region: regionForLine(original, 2),
    });

    expect(result).toEqual({ ok: false, reason: 'out-of-range' });
  });

  it('rejects a change ending after the region', () => {
    // The model rewrote the end of the erroneous line and carried on into the next one, so the
    // change starts inside the region and runs past its end.
    const original = 'SELECT id\nFROM t\nWHERE a = 1';
    const proposed = 'SELECT id\nFROM t2\nWHERE a = 11';

    const result = applyFormatFix({
      snapshotSql: original,
      currentSql: original,
      proposedSql: proposed,
      region: regionForLine(original, 2),
    });

    expect(result).toEqual({ ok: false, reason: 'out-of-range' });
  });

  it('rejects a change outside the region entirely', () => {
    // The model fixed a different line altogether, so not one character of the change touches the
    // region that was resolved.
    const original = 'SELECT id\nFROM t\nWHERE a = 11';
    const proposed = 'SELECT id\nFROM t\nWHERE a = 1';

    const result = applyFormatFix({
      snapshotSql: original,
      currentSql: original,
      proposedSql: proposed,
      region: regionForLine(original, 2),
    });

    expect(result).toEqual({ ok: false, reason: 'out-of-range' });
  });

  it('accepts a change that exactly fills the region', () => {
    // The model rewrote the whole erroneous line, so the change begins on the region's first
    // character and ends on its last — containment is inclusive at both ends.
    const original = 'SELECT id\nFROM t\nWHERE a = 1';
    const proposed = 'SELECT id\nfrom users\nWHERE a = 1';

    const result = applyFormatFix({
      snapshotSql: original,
      currentSql: original,
      proposedSql: proposed,
      region: regionForLine(original, 2),
    });

    expect(result).toEqual({
      ok: true,
      sql: proposed,
      appliedRange: { startOffset: 10, endOffset: 16 },
    });
  });

  it('accepts a change inside the region', () => {
    // The model fixed one digit in the middle of a long erroneous line, so the change neither starts
    // at the region's first character nor reaches its last.
    const original = 'SELECT id\nFROM users WHERE a = 11 AND b = 2';
    const proposed = 'SELECT id\nFROM users WHERE a = 1 AND b = 2';

    const result = applyFormatFix({
      snapshotSql: original,
      currentSql: original,
      proposedSql: proposed,
      region: regionForLine(original, 2),
    });

    expect(result).toEqual({
      ok: true,
      sql: proposed,
      appliedRange: { startOffset: 32, endOffset: 33 },
    });
  });

  it('refuses a proposal that also edits a line outside the region', () => {
    // The model fixed the erroneous line *and* rewrote a later clause, so the single change it made
    // spans past the region. Those extra edits are never written: the proposal is refused instead.
    const original = 'SELECT id\nFROM users WHERE a = 11\nWHERE c = 3';
    const proposed = 'SELECT id\nFROM users WHERE a = 1\nWHERE c = 4';

    const result = applyFormatFix({
      snapshotSql: original,
      currentSql: original,
      proposedSql: proposed,
      region: regionForLine(original, 2),
    });

    expect(result).toEqual({ ok: false, reason: 'out-of-range' });
  });

  it('rejects an insertion that carries text past the region', () => {
    // The model rewrote the end of the erroneous line and carried on into a new clause. The change
    // itself is the single offending character, so its span sits inside the region — but the text it
    // writes in that character's place lands past the region's last character.
    const original = 'SELECT a,\n  b\nFROM (';
    const proposed = 'SELECT a,\n  b\nFROM users\nWHERE c = 1';

    const result = applyFormatFix({
      snapshotSql: original,
      currentSql: original,
      proposedSql: proposed,
      region: regionForLine(original, 3),
    });

    expect(result).toEqual({ ok: false, reason: 'out-of-range' });
  });

  it('writes nothing when the editor moved on', () => {
    // The user kept typing after the request. The proposal is otherwise perfectly applicable — its
    // change sits inside the region — so staleness is the only reason to refuse, and refusing means
    // writing nothing at all rather than merging the two versions.
    const original = 'SELECT id\nFROM users WHERE a = 11';
    const proposed = 'SELECT id\nFROM users WHERE a = 1';

    const result = applyFormatFix({
      snapshotSql: original,
      currentSql: `${original} -- the user kept typing`,
      proposedSql: proposed,
      region: regionForLine(original, 2),
    });

    expect(result).toEqual({ ok: false, reason: 'stale' });
  });

  it('reports no change for an identical proposal', () => {
    const result = applyFormatFix({
      snapshotSql: ORIGINAL_SQL,
      currentSql: ORIGINAL_SQL,
      proposedSql: ORIGINAL_SQL,
      region: regionForLine(ORIGINAL_SQL, 1),
    });

    expect(result).toEqual({ ok: false, reason: 'no-change' });
  });
});
