---
feature: 012-format-error-ai-diagnostics
planned_at: 8878435
---

# Cycle Log: SQL Format Error Diagnostics with AI

Append only. Newest last. Every entry's `red` block is the evidence that the test existed
and failed before the implementation. `/speckit-tdd-plan` writes the baseline entry only.

## Baseline

- suite: `npm test` -> 34 test files passed, 227 tests passed, 0 failed (27.15 s)
- commit: `8878435`
- recorded: cycle 0, before any change
- pre-existing reds: none — the suite is green, so every red recorded from here belongs to
  this feature's cycle and not to earlier breakage
- note: no cycle entry exists yet. The first entry is written by `/speckit-tdd-run` when
  the first behavior of the loop goes red.

## Cycle 1: U64 — applying a fix today replaces the whole editor value (characterization)

- test: `tests/unit/smart-sql-editor-format-error-page.test.tsx::replaces the whole editor value with the re-formatted proposal (characterization)` (new, characterization)
- red: none by design — a characterization baseline must pass against untouched code. The
  deliberate mutant confirmed the assertion is load-bearing:
  `npx vitest run tests/unit/smart-sql-editor-format-error-page.test.tsx -t "replaces the whole editor value with the re-formatted proposal"`
  with `src/app/smart-sql-editor/page.tsx` line 149 changed from `applied = format(sql, { language })`
  to `applied = sql`
  -> `AssertionError: expected 'select  a,  b from  t;' to be 'select\n  a,\n  b\nfrom\n  t;' // Object.is equality` (1 failed)
- green: no production change — the baseline is the shipped behavior. Mutant restored byte-for-byte
  (`git diff --stat src/app/smart-sql-editor/page.tsx` empty again).
  `npx vitest run tests/unit/smart-sql-editor-format-error-page.test.tsx` -> 2 passed;
  `npm test` -> 34 files, 227 tests
- refactor: none needed — the test reuses the page harness that already existed in this file and
  introduces no duplicated fixture; the only addition is the `apiRef` half of the editor contract
  the page already exposes.
- commit: **none**. The working tree carries 29 unrelated changes from earlier in this session
  (home/confluence/login feature work plus the SDD artifacts), and project rule 80-git says never
  commit automatically. Per-cycle commits stay pending an explicit go-ahead.
- notes:
  - The first run of this test failed on a polling `toHaveTextContent` assertion, which saw the
    editor element before the click's state update landed. That was a defect in my assertion, not
    in the code: it was replaced with an exact `toBe` against the editor's rendered SQL, which
    passes against the untouched page. Recorded because the log must not imply a red that did not
    happen for a behavior change — here nothing changed, so there is no red to record.
  - `U62` and `U63` are **BLOCKED**: they describe `SmartSQLEditor.handleFormatSQL`, which the page
    test cannot reach (the editor is mocked there) and the real editor reaches only through Monaco.
    The only in-scope seam would be a pure format-step module, and `plan.md` does not list one, so
    the blocker is reported rather than improvised (hard rule 6). Their acceptance behaviors `A1`
    and `A2` stay PENDING behind them.
  - The test list's `test` column for `U62`/`U63` named the page test file; that was wrong and is
    corrected to the editor's own test surface once the seam exists.

## Cycle 2: U8 — the captured error records the formatter as its location source

- test: `tests/unit/format-error.test.ts::records the formatter as the location source when a position is derivable (FR-019)` (new)
- red: `npx vitest run tests/unit/format-error.test.ts -t "records the formatter as the location source"`
  -> `AssertionError: expected undefined to be 'formatter' // Object.is equality` (1 failed)
- green: `src/lib/sql/formatError.ts` — added the optional `locationSource?: 'formatter' | 'ast-parser'`
  field and set it inside the existing conditional spread in `captureFormatError()`.
  `npx vitest run tests/unit/format-error.test.ts` -> 11 passed; `npm test` -> 34 files, 229 tests
- refactor: none needed — the field rides the conditional spread that already decided whether a
  location exists, so the two can never disagree; the doc comment on the field states that invariant.
- commit: none — see cycle 1 (unrelated uncommitted work; project rule 80-git forbids auto-commit).

## Cycle 3: U9 — the location source disappears together with the location

- test: `tests/unit/format-error.test.ts::omits the location source together with the location when no position is derivable (FR-019)` (new)
- red: none — the behavior already existed after cycle 2 (the field rides the same conditional
  spread), so the playbook's first-run rule applied. The deliberate mutant proved the assertion is
  load-bearing: `src/lib/sql/formatError.ts` moved `locationSource` out of the conditional spread
  so it was always set, and
  `npx vitest run tests/unit/format-error.test.ts -t "omits the location source together with the location"`
  -> `AssertionError: expected 'formatter' to be undefined` (1 failed). Mutant restored.
- green: no production change was needed; the test is a regression guard against a future change
  that sets the source unconditionally. `npx vitest run tests/unit/format-error.test.ts` -> 12 passed;
  `npm test` -> 34 files, 230 tests
- refactor: none needed.
- commit: none — see cycle 1.
- tasks: **T022 ticked** — it names `[U8] [U9]` and both are now `DONE`.

## Cycle 4: U10 — a formatter offset resolves to a region covering the offending line

- test: `tests/unit/format-error-region.test.ts::resolves a region covering the line that holds the formatter offset` (new)
- red: two steps, both recorded. First the symbol did not exist:
  `npx vitest run tests/unit/format-error-region.test.ts`
  -> `Error: Failed to resolve import "@/lib/sql/formatErrorRegion" from "tests/unit/format-error-region.test.ts". Does the file exist?`
  Then, after adding the minimal declaration the language needs (the `ErrorRegion` type plus a
  `resolveErrorRegion()` that returns `null`), the same command produced the assertion failure
  that is the actual red evidence:
  `-> AssertionError: expected null to be 'WHERE id = (;' // Object.is equality` (1 failed)
- green: `src/lib/sql/formatErrorRegion.ts` — the offset path only: expand the formatter's anchor
  offset to its line (`lineStartOffset` / `lineEndOffset`), derive the line numbers, and carry the
  source and slice. The line/column path (U11) and the AST fallback (U12) deliberately return
  `null` for now, so an error they cannot bound produces no applicable proposal (FR-020).
  `npx vitest run tests/unit/format-error-region.test.ts` -> 1 passed;
  `npm test` -> 35 files, 231 tests
- refactor: none taken. Noted for the audit: `lineNumberAt()` in the new module overlaps the
  private `lineColumnFromOffset()` in `src/lib/sql/formatError.ts` (offset -> 1-based line/column).
  Consolidating them means exporting an internal helper from a module whose behaviors are already
  `DONE`, so it is reported rather than folded into this cycle.
- commit: none — see cycle 1.

## Cycle 5: U11 — a line/column-only position resolves to a region too

- test: `tests/unit/format-error-region.test.ts::resolves a region when the formatter reports only a line and column` (new)
- red: `npx vitest run tests/unit/format-error-region.test.ts -t "resolves a region when the formatter reports only a line and column"`
  -> `AssertionError: expected null to be 'WHERE name = 'abc;' // Object.is equality` (1 failed)
- green: `src/lib/sql/formatErrorRegion.ts` gained `resolveAnchorOffset()`, which prefers the exact
  `offset` and otherwise converts the captured `line`/`column` through the **existing** helper
  `offsetFromLineColumn()` — that helper was already in `src/lib/sql/formatError.ts` for exactly
  this purpose and was only private, so it is now exported and reused rather than copied.
  `npx vitest run tests/unit/format-error-region.test.ts tests/unit/format-error.test.ts` -> 14 passed;
  `npm test` -> 35 files, 232 tests
- refactor: none. The cycle-4 duplication note is resolved by decision, not by code: `lineNumberAt()`
  converts a raw offset inside the region builder, while `lineColumnFromOffset()` serves the capture
  path and also returns a column that the region does not need. Merging them would compute an unused
  value and couple the new module to a DONE module's internals for no gain.
- commit: none — see cycle 1.

## Cycle 6: U13 — no reported position means no region

- test: `tests/unit/format-error-region.test.ts::resolves no region when the formatter reported no position at all` (new)
- red: **none — the test passed on the first run**, so the deliberate-mutant check replaced a red
  run. Mutant: `resolveAnchorOffset(error, sourceSql) ?? 0` in `src/lib/sql/formatErrorRegion.ts`,
  i.e. fabricating a position at the start of the SQL when the formatter reported none.
  `npx vitest run tests/unit/format-error-region.test.ts`
  -> `AssertionError: expected { Object (startOffset, endOffset, ...) } to be null` (1 failed,
  2 passed — only U13 goes red, U10/U11 unaffected). The mutant was then reverted exactly and
  `npm test` returned to 35 files, 233 tests, so the assertion is load-bearing.
- green: none needed. The behavior already existed as a side effect of cycles 4-5
  (`if (anchorOffset === undefined) return null;`) and this cycle pins it with a regression guard.
- refactor: none.
- commit: none — see cycle 1.

## Cycle 7: U15 — a position on the empty line after a trailing break yields no region

- list change (before the test): U15 read "Clamps the region to the SQL bounds and never returns an
  empty range" — two behaviors. Split, as the playbook requires for a compound item, into U15
  (never an empty range) and **U81** (stays inside the SQL bounds), both `PENDING`, both traced to
  FR-017. Reason: the clamping half is already satisfied by the line search and is a different
  assertion; folding them would let one green mean two things.
- test: `tests/unit/format-error-region.test.ts::resolves no region when the position resolves to an empty line` (new)
- red (first attempt, **invalid**): the test passed immediately, so the cause was investigated
  instead of being accepted. `captureFormatError` reads `offset` off the thrown value
  (`src/lib/sql/formatError.ts:71-75`), not from its options, so the first version of the test handed
  it `offset` in the options object and captured an error with **no** location at all — it was
  passing through U13's path, not the one it claimed to test. The test was rewritten to set
  `thrown.offset`, matching the existing `formatterErrorAt()` helper. Second run, the real red:
  `npx vitest run tests/unit/format-error-region.test.ts`
  -> `AssertionError: expected { Object (startOffset, endOffset, ...) } to be null` (1 failed,
  3 passed)
- green: `src/lib/sql/formatErrorRegion.ts` — `if (endOffset <= startOffset) return null;` after the
  line expansion. A formatter position equal to `sourceSql.length` on a SQL ending in `\n` resolved
  to the empty line after the break, producing `startOffset === endOffset`, which violates the
  data-model invariant `0 <= startOffset < endOffset <= sourceSql.length`. Yielding no region is the
  FR-020 degradation, not a fabricated one.
  `npx vitest run tests/unit/format-error-region.test.ts` -> 4 passed;
  `npx tsc --noEmit` -> clean; `npm test` -> 35 files, 234 tests
- refactor: `endLine: lineNumberAt(sourceSql, Math.max(startOffset, endOffset - 1))` became
  `lineNumberAt(sourceSql, endOffset - 1)`. The `Math.max` existed only to survive an empty range,
  which the new guard now rules out, so it was dead defensive code. `npm test` -> 35 files,
  234 tests after the move.
- commit: none — see cycle 1.

## Cycle 8: U16 — the region text is byte-identical to the slice it describes

- test: `tests/unit/format-error-region.test.ts::keeps the region text identical to the slice it describes on every path` (new)
- red: **none on the first run**, so the mutant check ran first and **failed to catch the mutant**:
  `snippet: sourceSql.slice(startOffset, endOffset + 1)` still gave 5 passed. Cause: the first
  version of the fixture put the broken token on the **last** line, so `endOffset === length` and
  `slice(start, length + 1)` is the same string as `slice(start, length)` — the assertion could not
  distinguish a wrong end from the right one. The test was rewritten over a new fixture,
  `SQL_WITH_INTERIOR_BROKEN_TOKEN` (`'SELECT id;\nFROM users;\nWHERE id = 1;'`), whose broken token sits
  on the middle line. Same mutant, same command:
  `npx vitest run tests/unit/format-error-region.test.ts`
  -> `AssertionError: expected 'FROM users;\n' to be 'FROM users;' // Object.is equality` (1 failed,
  4 passed). Mutant reverted exactly.
- green: none needed. `snippet: sourceSql.slice(startOffset, endOffset)` already held; the cycle
  pins the `ErrorRegion.snippet` field, which no earlier test read, and exercises both the offset
  path and the line/column path in one invariant.
  `npx vitest run tests/unit/format-error-region.test.ts` -> 5 passed;
  `npx tsc --noEmit` -> clean; `npm test` -> 35 files, 235 tests
- refactor: none.
- commit: none — see cycle 1.

## Cycle 9: U17 — a position on the first character starts the range at offset 0

- test: `tests/unit/format-error-region.test.ts::starts the range at offset 0 for a position on the first character` (new)
- red: **none on the first run** (6 passed), so the mutant check ran instead. Mutant:
  `lineEndOffset()` returning `lineBreak + 1`, i.e. swallowing the trailing line break into the
  region. `npx vitest run tests/unit/format-error-region.test.ts`
  -> `AssertionError: expected 'SELECT id;\n' to be 'SELECT id;' // Object.is equality` (1 failed,
  5 passed). Mutant reverted exactly.
- green: none needed; `lineStartOffset()`'s `if (offset <= 0) return 0;` already anchored the range at
  the first character.
  `npx tsc --noEmit` -> clean; `npm test` -> 35 files, 236 tests
- honesty note for the audit: the mutant was caught by the **line-text** assertion, not by
  `startOffset === 0` — at offset 0, `lastIndexOf('\n', -1)` and `lastIndexOf('\n', 0)` both yield
  `-1`, so the plausible off-by-one mutants around the start cannot be distinguished at this
  boundary. The start assertion documents the contract; the text assertion is what makes the test
  discriminating.
- refactor: none.
- commit: none — see cycle 1.

## Cycle 10: U18 — a position on the last character ends the range at the SQL length

- test: `tests/unit/format-error-region.test.ts::ends the range exactly at the SQL length for a position on the last character` (new)
- red: **none on the first run** (7 passed), so the mutant check ran. Mutant: `lineEndOffset()`
  returning `source.length - 1` when no line break follows, i.e. dropping the SQL's last character.
  `npx vitest run tests/unit/format-error-region.test.ts` -> 3 failed, including U18's own
  assertion: `AssertionError: expected 35 to be 36 // Object.is equality`. Mutant reverted exactly.
- green: none needed; `lineEndOffset()` already returned `source.length` for the final line, so a
  position on the last character yields a region ending exactly at the end of the SQL.
  `npx tsc --noEmit` -> clean; `npm test` -> 35 files, 237 tests
- refactor: the test file gained `formatterErrorAtOffset(sql, offset)` for positions that are not a
  token lookup (both boundaries of the SQL need an exact index), and `formatterErrorAt()` now
  delegates to it, so the thrown-error construction exists once. No assertion changed.
- commit: none — see cycle 1.

## Cycle 11: U81 — a position past the end of the SQL stays inside the SQL bounds

- test: `tests/unit/format-error-region.test.ts::keeps a position past the end of the SQL inside the SQL bounds` (new)
- red: **none on the first run** (8 passed), so the mutant check ran. Mutant: `lineEndOffset()`
  returning the reported `offset` instead of `source.length` when no line break follows — trusting a
  formatter position that lies outside the captured SQL. `npx vitest run tests/unit/format-error-region.test.ts`
  -> U81's own assertion: `AssertionError: expected 76 to be less than or equal to 36`. Mutant
  reverted exactly.
- green: none needed; the line search already clamps to `source.length`, and the snapshot this region
  describes is the SQL passed in, never a longer string.
  `npx tsc --noEmit` -> clean; `npm test` -> 35 files, 238 tests
- refactor: none.
- commit: none — see cycle 1.

## Cycle 12: U19 — the change is the common prefix plus a non-overlapping common suffix

- test: `tests/unit/format-fix-scope.test.ts::extracts the change as the longest common prefix plus a non-overlapping suffix` (new file)
- red, step 1 (**not a valid red**, recorded because it happened):
  `npx vitest run tests/unit/format-fix-scope.test.ts`
  -> `Error: Failed to resolve import "@/lib/sql/formatFixScope" from "tests/unit/format-fix-scope.test.ts". Does the file exist?`
  After the minimal declaration the language needs — the `SqlChange` interface and an
  `extractChange()` returning an empty change — the same command gave the assertion failure that is
  the actual red evidence:
  -> `AssertionError: expected '' to be '1' // Object.is equality` (1 failed)
- green: `src/lib/sql/formatFixScope.ts` — `sharedPrefixLength()` over both strings, then
  `sharedSuffixLength()` over the **remainders after the prefix**, so the two shared runs cannot
  overlap. The fixture (`'… WHERE a = 11'` -> `'… WHERE a = 1'`) is the case that makes the overlap
  real: a naive full-string suffix match returns 1, which yields `startOffset === endOffset === 31`
  and an empty `originalFragment`, reconstructing the original instead of the proposal.
  `npx vitest run tests/unit/format-fix-scope.test.ts` -> 1 passed;
  `npx tsc --noEmit` -> clean; `npm test` -> 36 files, 239 tests
- refactor: no existing prefix/suffix helper exists anywhere in `src/`, so nothing was duplicated
  (searched for `commonPrefix|commonSuffix|longestCommon|sharedPrefix` — the only hits are the two
  functions added here). Scoped `npx prettier --write` on the four feature files, then
  `npx prettier --check` clean and `npm test` -> 36 files, 239 tests.
- commit: none — see cycle 1.

## Cycle 13: U20 — an identical proposal is reported as `no-change`

- selection note: list order reaches the outer loop first (`A1`, `A2`, then `A6`). `A1`/`A2` are
  waiting on `U62`/`U63`, which are `BLOCKED` on a seam `plan.md` does not name, and `A6`'s panel
  units are still `PENDING`, so none of them can be closed. The first selectable behaviour was
  therefore `U20`, whose only dependency (`U19`) is `DONE`.
- test: `tests/unit/format-fix-scope.test.ts::reports no change for an identical proposal` (new)
- red, step 1 (**not a valid red**): `npx vitest run tests/unit/format-fix-scope.test.ts`
  -> `TypeError: applyFormatFix is not a function`
- deviation, recorded as it happened: the declaration added to let the test run also implemented the
  `no-change` rule, so the assertion passed on the first runnable attempt — a test-after. The rule
  was therefore reverted to a placeholder that returns a *different* verdict, and the red was taken
  from that state:
  `npx vitest run tests/unit/format-fix-scope.test.ts`
  -> `AssertionError: expected { ok: false, reason: 'stale' } to deeply equal { ok: false, reason: 'no-change' }` (1 failed, 1 passed)
- green: `src/lib/sql/formatFixScope.ts` — `applyFormatFix({ snapshotSql, proposedSql })` extracts the
  change and returns `{ ok: false, reason: 'no-change' }` when `isEmptyChange()` holds (zero-width
  span **and** empty replacement). `ApplyResult` and `ApplyFormatFixInput` are copied verbatim from
  the apply contract (§4), including the four rejection reasons, so the panel and the page will
  speak the same vocabulary. Any other input throws for now, so an unimplemented rule can never look
  like a verdict.
  `npx vitest run tests/unit/format-fix-scope.test.ts` -> 2 passed;
  `npx tsc --noEmit` -> clean; `npm test` -> 36 files, 240 tests
- refactor: the misplaced `import type { ErrorRegion }` (written mid-file by a bad edit) was moved to
  the top of the module and `extractChange()` restored below the helpers; both were mechanical
  corrections of that edit, verified green afterwards.
- commit: none — see cycle 1.

## Cycle 14: U21 — a trailing-whitespace difference stays inside the whitespace

- list change (before the test): U21 read "Reports a change confined to trailing whitespace when
  only the final newline differs". The mutant check showed that wording is **not distinguishable at
  the extraction level**: with an empty shared suffix (a pure append), every plausible mutation —
  dropping the suffix bound, trusting the prefix limit, reporting to the end of the string — returns
  the same quadruple. Reworded to the form the same intent can be falsified on: a difference in
  trailing whitespace must be confined to that whitespace rather than widened to the whole line.
  Still FR-017, still `PENDING` until proven.
- test: `tests/unit/format-fix-scope.test.ts::confines a trailing-whitespace difference to that whitespace` (new)
- red, first run (a **real** red, and it was mine, not the code's): `npx vitest run tests/unit/format-fix-scope.test.ts`
  -> `AssertionError: expected { Object (startOffset, endOffset, ...) } to deeply equal { Object (startOffset, endOffset, ...) }` (1 failed)
  Cause: the fixture contained three padding spaces while the expectation said two — a miscount in
  the test, not a defect in `extractChange`. Corrected before any implementation change, by naming
  the padding (`const padding = '   '`) and deriving `endOffset` from `padding.length`, so the
  expectation cannot drift from the fixture again. Second run: 3 passed.
- green: none needed. The mutant check then proved the test load-bearing: dropping the shared suffix
  from `endOffset` (`originalSql.length - suffix` -> `originalSql.length`) failed **only** this
  test — `FAIL tests/unit/format-fix-scope.test.ts > extractChange > confines a trailing-whitespace
  difference to that whitespace` (1 failed, 2 passed) — because U19's fixture has an empty suffix and
  so cannot see that mutation at all. Mutant reverted exactly.
  `npx tsc --noEmit` -> clean; `npm test` -> 36 files, 241 tests
- refactor: none.
- commit: none — see cycle 1.

## Cycle 15: U22 — a stale document is rejected before any other reason

- test: `tests/unit/format-fix-scope.test.ts::rejects stale first` (new)
- red: `npx vitest run tests/unit/format-fix-scope.test.ts`
  -> `AssertionError: expected { ok: false, reason: 'no-change' } to deeply equal { ok: false, reason: 'stale' }` (1 failed, 3 passed)
  The fixture makes three rules true at once — the editor SQL moved on, the proposal is identical to
  the snapshot (so `no-change` also holds), and no region was resolved (so `undetermined-region`
  would hold too) — which is what makes this an ordering test rather than a staleness test.
- green: `src/lib/sql/formatFixScope.ts` — `if (currentSql !== snapshotSql) return { ok: false, reason: 'stale' };`
  as the first statement of `applyFormatFix`, before the change is extracted. FR-016.
  `npx vitest run tests/unit/format-fix-scope.test.ts` -> 4 passed;
  `npx tsc --noEmit` -> clean; `npm test` -> 36 files, 242 tests;
  `npx prettier --check` clean on both feature files
- refactor: the destructured parameter list grew to three names, so it was wrapped to one per line.
- commit: none — see cycle 1.

## Cycle 16: U23 — a proposal with no region is rejected as `undetermined-region`

- test: `tests/unit/format-fix-scope.test.ts::rejects when no region was determined` (new)
- red: `npx vitest run tests/unit/format-fix-scope.test.ts`
  -> `Error: applyFormatFix: only the no-change rule is implemented` (1 failed, 4 passed)
  A **throw**, not an assertion diff. That is deliberate and is why cycle 13 made the unimplemented
  path throw instead of returning a plausible verdict: an unimplemented rule must fail loudly rather
  than look like a decision. Recorded verbatim rather than dressed up as a comparison.
- green: `src/lib/sql/formatFixScope.ts` — `if (region === null) return { ok: false, reason: 'undetermined-region' };`
  as rule 2, after `stale` and before the change is extracted, exactly the contract's order. FR-020.
  `npx vitest run tests/unit/format-fix-scope.test.ts` -> 5 passed;
  `npx tsc --noEmit` -> clean; `npm test` -> 36 files, 243 tests
- refactor: none.
- commit: none — see cycle 1.

## Cycle 17: U24 — a change that starts before the region is `out-of-range`

- selection note: unchanged from cycle 13 — the outer-loop rows (`A1`, `A2`, `A6`) still cannot be
  closed, so the first selectable behaviour is the next inner one, `U24`.
- test: `tests/unit/format-fix-scope.test.ts::rejects a change starting before the region` (new)
- red: `npx vitest run tests/unit/format-fix-scope.test.ts`
  -> `Error: applyFormatFix: only the no-change rule is implemented` (1 failed, 5 passed)
  A throw-red again, for the same deliberate reason as cycle 16: rule 4 did not exist yet, and the
  unimplemented path refuses to invent a verdict.
- green: `src/lib/sql/formatFixScope.ts` — `if (change.startOffset < region.startOffset) return { ok: false, reason: 'out-of-range' };`
  placed after the `no-change` rule, per the contract's order. Only the **start** boundary is
  checked, so `U25` still has work of its own. FR-018.
  The fixture is `'SELECT id\nFROM t'` -> `'SELECT id FROM t'`, whose change is the line break at
  offset 9 with a region that starts at 10: the change *starts* before the region and *ends* exactly
  at its start, so the two containment failures cannot be confused.
  `npx vitest run tests/unit/format-fix-scope.test.ts` -> 6 passed;
  `npx tsc --noEmit` -> clean; `npm test` -> 36 files, 244 tests;
  `npx prettier --check` clean on both feature files
- refactor: none.
- commit: none — see cycle 1.

## Cycle 18: U25 — a change that ends after the region is `out-of-range`

- test: `tests/unit/format-fix-scope.test.ts::rejects a change ending after the region` (new)
- deviation, in full: the first version of this test was **my own miscalculation**, and the green step
  was taken against it before the error was found. The fixture was
  `'… FROM t\n…'` -> `'… FROM t, u\n…'`; running the same two helpers under Node showed the extracted
  change is `{ start: 16, end: 16, originalFragment: '' }` — a zero-width **insertion** exactly at the
  region's end boundary, because the shared suffix swallowed the whole remainder. That change *is*
  contained, so the test kept reaching the unimplemented path and the check I had added was never
  exercised. Sequence actually run, in order: implementation added -> focused run still throwing ->
  `node -e` reproduction of the extraction -> implementation **reverted** -> fixture corrected to
  `'SELECT id\nFROM t\nWHERE a = 1'` -> `'SELECT id\nFROM t2\nWHERE a = 11'` (change `[14, 27)`:
  starts inside the region, ends past it) -> red -> implementation re-applied.
- red: `npx vitest run tests/unit/format-fix-scope.test.ts`
  -> `Error: applyFormatFix: only the no-change rule is implemented` (1 failed, 6 passed)
- green: `src/lib/sql/formatFixScope.ts` — `if (change.endOffset > region.endOffset) return { ok: false, reason: 'out-of-range' };`
  completing rule 4. FR-018.
  `npx vitest run tests/unit/format-fix-scope.test.ts` -> 7 passed;
  `npx tsc --noEmit` -> clean; `npm test` -> 36 files, 245 tests;
  `npx prettier --check` clean on both feature files
- mutant check, already performed as the red above: the state without the end-boundary line — a guard
  that checks only the start, the most plausible mistake this behaviour exists to prevent — is what
  produced the throw. `U24`'s test cannot see that mutation, so this test is what pins the second
  boundary.
- refactor: none.
- commit: none — see cycle 1.

## Cycle 19: U26 — a change lying entirely outside the region is `out-of-range`

- test: `tests/unit/format-fix-scope.test.ts::rejects a change outside the region entirely` (new)
- red: **none on the first run** (8 passed) — the two boundary checks from cycles 17-18 already
  cover this case, so the mutant check is the evidence.
- mutant: `if (change.endOffset > region.endOffset) …` removed, i.e. a guard that only protects the
  start boundary. `npx vitest run tests/unit/format-fix-scope.test.ts` -> 2 failed, 6 passed:
  `× applyFormatFix > rejects a change ending after the region` and
  `× applyFormatFix > rejects a change outside the region entirely`. Mutant reverted exactly.
  Honesty note for the audit: this test is not the *only* witness for that mutation — `U25` fails
  with it too. Its value is the statement it makes to a future reader: a proposal that fixes a
  different line altogether is refused outright, which is the case users actually hit.
- green: none needed.
  `npx tsc --noEmit` -> clean; `npm test` -> 36 files, 246 tests;
  `npx prettier --check` clean on both feature files
- refactor: none.
- commit: none — see cycle 1.

## Cycle 20: U27 — a change that exactly fills the region is accepted

- test: `tests/unit/format-fix-scope.test.ts::accepts a change that exactly fills the region` (new)
- fixture discipline: after two miscalculated fixtures in cycles 14 and 18, the span was verified
  with `node -e` **before** the test was written. The first candidate (`'FROM t'` -> `'FROM users'`)
  was rejected on the spot — Node showed the change is only `[15, 16)`, a single character, because
  `'FROM '` is shared. The fixture used instead is `'SELECT id\nFROM t\nWHERE a = 1'` ->
  `'SELECT id\nfrom users\nWHERE a = 1'`, whose change Node confirms as `{ start: 10, end: 16,
  originalFragment: 'FROM t', replacement: 'from users' }` — exactly the second line's region.
- red: `npx vitest run tests/unit/format-fix-scope.test.ts`
  -> `Error: applyFormatFix: only the no-change rule is implemented` (1 failed, 8 passed)
- green: `src/lib/sql/formatFixScope.ts` — the throwing placeholder became rule 5:
  `snapshotSql.slice(0, change.startOffset) + change.replacement + snapshotSql.slice(change.endOffset)`,
  returned with `appliedRange` in the pre-apply coordinates of the snapshot, so the panel's audit
  line names the range of the original that was replaced. `U30` still owns the "snapshot, not the
  live editor" statement, and the re-format gate belongs to the caller (contract §4).
  `npx vitest run tests/unit/format-fix-scope.test.ts` -> 9 passed;
  `npx tsc --noEmit` -> clean; `npm test` -> 36 files, 247 tests
- mutant: the end-boundary check made strict (`>` -> `>=`), the classic off-by-one in containment.
  `npx vitest run tests/unit/format-fix-scope.test.ts` -> **1 failed**, and the only failure is this
  test: `AssertionError: expected { ok: false, reason: 'out-of-range' } to deeply equal { ok: true, …(2) }`.
  No other test can see that mutation, so this behaviour alone pins that containment is inclusive at
  both ends. Mutant reverted exactly.
- refactor: `npx prettier --write` on the guard (the splice line exceeded the print width), then
  `npx prettier --check` clean and the focused suite re-run -> 9 passed.
- commit: none — see cycle 1.

## Cycle 21: U28 — a change strictly inside the region is accepted

- test: `tests/unit/format-fix-scope.test.ts::accepts a change inside the region` (new)
- fixture discipline: the span was checked with `node -e` before writing the test. The fixture is
  `'SELECT id\nFROM users WHERE a = 11 AND b = 2'` -> the same with `a = 1`; Node reports the change
  as `{ start: 32, end: 33, originalFragment: '1' }` against a region of `[10, 42)` — both boundaries
  strictly interior, unlike `U27`'s exactly-filling change.
- red: **none on the first run** (10 passed) — the containment rules from cycles 17-18 already accept
  it, so the mutant check is the evidence.
- mutant: the over-strict mistake this behaviour exists to prevent — requiring the change to *fill*
  the region exactly:
  `if (change.startOffset !== region.startOffset || change.endOffset !== region.endOffset) return { ok: false, reason: 'out-of-range' };`
  `npx vitest run tests/unit/format-fix-scope.test.ts` -> **1 failed**, the only one being this test:
  `AssertionError: expected { ok: false, reason: 'out-of-range' } to deeply equal { ok: true, …(2) }`.
  Mutant reverted exactly.
- green: none needed.
  `npx tsc --noEmit` -> clean; `npm test` -> 36 files, 248 tests;
  `npx prettier --check` clean on both feature files
- refactor: none.
- commit: none — see cycle 1.

## Cycle 22: U29 — a proposal that also edits outside the region is refused

- list change (before the test): U29 read "Leaves every character outside the applied span
  byte-identical to the original". That wording is **not falsifiable** in this module: with a single
  extracted span the result is `snapshot[0,start) + replacement + snapshot[end,)` by construction,
  and no fixture can distinguish that from writing the model's whole document, because everything
  outside the span is shared text by definition. Reworded to the property a user can actually observe
  and a mutant can break: a proposal that edits a line outside the region is **refused**, and its
  extra edits are never written. Still FR-017.
- test: `tests/unit/format-fix-scope.test.ts::refuses a proposal that also edits a line outside the region` (new)
- fixture discipline: `node -e` first. For `'SELECT id\nFROM users WHERE a = 11\nWHERE c = 3'` ->
  `'… a = 1\nWHERE c = 4'` it reports `regionLine2: [10, 33]`, `change: { start: 32, end: 45,
  originalFragment: '1\nWHERE c = 3' }` — the change starts inside the region and swallows the whole
  third line, which is exactly the two-places-at-once situation.
- red: **none on the first run** (11 passed); the end-boundary rule from cycle 18 already refuses it,
  so the mutant check is the evidence.
- mutant: the end-boundary guard removed, i.e. an implementation that lets a change run past the
  region. `npx vitest run tests/unit/format-fix-scope.test.ts` -> 3 failed, 8 passed, the failures
  being `× rejects a change ending after the region`, `× rejects a change outside the region entirely`
  and `× refuses a proposal that also edits a line outside the region`. Mutant reverted exactly.
  Honesty note: this test is a second witness for that mutation, not a unique one.
- green: none needed.
  `npx tsc --noEmit` -> clean; `npm test` -> 36 files, 249 tests;
  `npx prettier --check` clean on both feature files
- refactor: none.
- commit: none — see cycle 1.

## Cycle 23: U30 — an editor that moved on gets nothing written, however good the fix is

- list change (before the test): U30 read "Splices into the request-time snapshot, not into whatever
  the editor holds afterwards". Analysis first: the `stale` rule fires before anything else, so
  whenever the two strings differ the guard returns `stale` and no splice happens at all — the choice
  of splice source is unobservable in this module and no fixture can separate it. Reworded to the
  part that is observable and worth protecting: a document that moved on receives **no write at
  all**, not a merge, even when the proposal would otherwise apply cleanly. Still FR-016.
- test: `tests/unit/format-fix-scope.test.ts::writes nothing when the editor moved on` (new)
- fixture discipline: `node -e` first, to make sure staleness is the *only* reason to refuse. For
  `'SELECT id\nFROM users WHERE a = 11'` -> `'… a = 1'` it reports `region: [10, 33]` and
  `change: [32, 33]`, so the change sits inside the region and the proposal is applicable. `U22`'s
  fixture deliberately made three reasons true at once (an ordering test); this one makes exactly one.
- red: **none on the first run** (12 passed) — the rule has existed since cycle 15, so the mutant
  check is the evidence.
- mutant: the `stale` rule removed. `npx vitest run tests/unit/format-fix-scope.test.ts` -> 2 failed,
  10 passed, and this test's own line is the one that matters:
  `AssertionError: expected { ok: true, …(2) } to deeply equal { ok: false, reason: 'stale' }` —
  without the rule the guard writes happily over SQL the user had just changed.
  `U22` is the other witness; the difference is that `U22`'s fixture would also be caught by the
  `no-change` rule, so it cannot show *this* danger on its own. Mutant reverted exactly.
  Deviation, recorded because it happened: the first attempt at this mutant also removed the
  `undetermined-region` rule. That was corrected **before** the run, so the run recorded above is the
  single-rule mutant, not the two-rule one.
- green: none needed.
  `npx tsc --noEmit` -> clean; `npm test` -> 36 files, 250 tests;
  `npx prettier --check` clean on both feature files
- refactor: none.
- commit: none — see cycle 1.



## Cycle 24: U43 — the fix prompt quotes the region and confines the model to it

- test: `tests/unit/format-error-ai.test.ts::confines the correction to the quoted region` (new)
- why this test needed a labelled quote: the region text is by definition a slice of the SQL, and the
  prompt already embeds the whole SQL — so `expect(prompt).toContain('FROM (;')` would have passed
  with no region block at all. The assertion is `/erroneous region[^\n]*FROM \(;/i`, which requires a
  line naming the region *and* carrying its text, plus `/confine every change to it/i` for the
  instruction. The fixture is a two-line query whose second line is the region, passed as a literal
  `ErrorRegion`: this is a prompt test, and region resolution belongs to `formatErrorRegion`, already
  covered by `U10`-`U18`.
- red: `npx vitest run tests/unit/format-error-ai.test.ts`
  -> `AssertionError: expected 'A SQL formatter failed to parse a que…' to match /erroneous region[^\n]*FROM \(;/i` (1 failed, 19 passed)
  A clean assertion red: `buildFormatFixPrompt` took one argument, so the region was simply ignored —
  no stub needed.
- green: `src/lib/ai/formatErrorAi.ts` — `buildFormatFixPrompt(error, region?)` gained an optional
  `ErrorRegion`; when present the prompt adds a line naming the region's line span and parser source
  with the region text verbatim, plus a rule telling the model to change only that region and return
  the rest byte for byte. When absent both additions are empty, so every existing prompt is
  unchanged. FR-019 / contract §3.
  One implementation correction along the way, recorded because the first green run failed: the
  region block was first written as label, newline, text, which the test's same-line regex rejects.
  The **implementation** was changed to a single line (`… from the formatter): FROM (;`), not the
  test — and that shape is also clearer for the model.
  `npx vitest run tests/unit/format-error-ai.test.ts` -> 20 passed;
  `npx tsc --noEmit` -> clean; `npm test` -> 36 files, 251 tests;
  `npx prettier --check` clean on both files
- note on a stale number, so the audit is not misled: the first background `npm test` was launched in
  the same batch as the still-failing focused run and reported `1 failed | 250 passed`; that was this
  test before the fix. The suite was re-run afterwards and is the `36 files, 251 tests` above.
- refactor: none.
- commit: none — see cycle 1.

## Cycle 25: U57 — the panel names the resolved region and the parser that supplied it

- test: `tests/unit/format-error-panel.test.tsx::names the resolved error region and the parser that supplied it` (new)
- test-side wiring: `Harness` gained an optional `region` prop, mirroring how `page.tsx` will pass the
  resolved region down. The region is a literal `ErrorRegion` — this is a rendering test, and
  resolution itself is covered by `U10`-`U18`.
- red: `npx vitest run tests/unit/format-error-panel.test.tsx`
  -> `Error: It looks like undefined was passed instead of a matcher. Did you do something like getByText(undefined)?` (1 failed, 22 passed)
  The label is an i18n key, so the missing behaviour surfaces as an `undefined` query rather than a
  not-found element. Recorded verbatim rather than dressed up as a not-found failure.
- green: `FormatErrorPanelProps` gained `region?: ErrorRegion | null`, and the location section now
  renders the region when present: label, line number (or range), and which parser supplied the
  position, in three separate elements so each is independently queryable. Three keys were added to
  **both** `src/locales/en.ts` and `src/locales/vi.ts` (`formatErrorRegionLabel`,
  `formatErrorRegionSourceFormatter`, `formatErrorRegionSourceAstParser`) — the repo keeps the two
  tables in step and there is no key-parity test, so this is convention, not enforcement.
  The line number is rendered as a bare number rather than the word "line", following the panel's
  existing `renderPosition()` pattern and keeping the region line readable in both locales; a
  regression run confirmed the bare number matches exactly one element in this fixture.
  `npx vitest run tests/unit/format-error-panel.test.tsx` -> 23 passed;
  `npx tsc --noEmit` -> clean; `npm test` -> 36 files, 252 tests
- mutant: the source ternary replaced by a hardcoded formatter label.
  `npx vitest run tests/unit/format-error-panel.test.tsx` ->
  `TestingLibraryElementError: Unable to find an element with the text: reported by the cross-check parser.`
  Mutant reverted exactly.
- formatting note, so the audit is not misled: `npx prettier --check` still fails on
  `src/locales/en.ts` and `src/locales/vi.ts`, but that debt is **pre-existing** — 11 differing lines
  in `en.ts` and 9 in `vi.ts`, none of them the keys added here (`Compare-Object` found 0 matches for
  `formatErrorRegion`). The file was deliberately **not** reformatted, to avoid unrelated churn; the
  component and its test are `prettier --check` clean.
- refactor: none.
- commit: none — see cycle 1.



## Cycle 26: U65 — a proposal that reaches outside the region never reaches the editor

- list change (before the test): U65 read "Applying a fix splices the region instead of replacing the
  whole value". A probe with `node -e` showed the positive case cannot falsify that here: when a
  proposal differs from the snapshot **only inside** the region, the splice reconstructs the proposal
  exactly (the `U19` invariant), so writing the splice and writing the model's whole document are the
  same string. Reworded to the case that is both observable and the actual risk: a proposal whose
  change reaches outside the region must never reach the editor. Still FR-017.
- new list item, added mid-cycle and **not** implemented here: **U82** — a probe found that a pure
  *insertion* at the region's edge is contained by span yet can carry arbitrary new text: for
  `'SELECT a,\n  b\nFROM ('` -> `'... FROM users\nWHERE c = 1'` the change is the in-bounds span
  `[19, 20)` while the replacement is `'users\nWHERE c = 1'`. The containment rule bounds the replaced
  span, not the inserted text. Recorded as `PENDING`, guard-level, so the fix lands in its own cycle.
- test: `tests/unit/smart-sql-editor-format-error-page.test.tsx::never writes a proposal that reaches outside the region` (new)
- test-side changes: the mocked editor now emits a multi-line `ERROR_SQL` **with a location** (the
  unclosed parenthesis on line 3), because without an anchor no region can be resolved and the guard
  would refuse for the wrong reason. The panel mock records the props it receives so a test can wait
  for the page's live `currentSql` to settle.
- red: `npx vitest run tests/unit/smart-sql-editor-format-error-page.test.tsx`
  -> `AssertionError: expected 'select\n  a,\n  b\nfrom\n  t;' to be '' // Object.is equality` (1 failed, 2 passed)
  The editor had received the model's whole rewritten statement.
- green: `src/app/smart-sql-editor/page.tsx` — `handleApplyFormatFix` now runs
  `applyFormatFix({ snapshotSql: error.sourceSql, currentSql, proposedSql, region: resolveErrorRegion(error, error.sourceSql) })`
  and writes `result.sql`; a refusal writes nothing and claims no success. The snapshot is the error's
  own `sourceSql`, because that is exactly the text the fix request embedded (contract §3). The
  panel-side notice for a refusal is `U58`/`U59` work; until then refusing is silent but safe.
  `npx vitest run tests/unit/smart-sql-editor-format-error-page.test.tsx` -> 2 passed;
  `npx tsc --noEmit` -> clean; `npm test` -> 36 files, 252 tests;
  `npx prettier --check` clean on both files
- **false green found by the mutant check, recorded in full**: the first green passed, and the mutant
  (treating the whole document as the region) **also** passed — the test was worthless. Cause: the
  test called `onSqlChange` directly and clicked Apply in the same tick, so the page had not
  re-rendered, the guard saw the sample query and returned `stale` — green for a reason that had
  nothing to do with containment. Fixed by waiting for `capturedPanelProps.currentSql` to become
  `ERROR_SQL` before clicking. With that fixed, the same mutant produced the intended failure:
  `AssertionError: expected 'select\n  a,\n  b\nfrom\n  t;' to be ''`. Mutant reverted exactly.
- **a baseline test was retired, not weakened**: `U64`'s characterization (`replaces the whole editor
  value with the re-formatted proposal`) started failing the moment the guard landed —
  `expected '' to be 'select\n  a,\n  b\nfrom\n  t;'` — because the behaviour it pins is the one
  FR-017 forbids. It was removed, with a comment in its place naming `U65` as its replacement, and its
  now-unused `FORMATTED_PROPOSED_FIX_SQL` constant went with it. The `U64` row keeps its `BASELINE`
  state and carries a note pointing at `U65`.
- refactor: dead constant removed with the retired test (above).
- commit: none — see cycle 1.
## Cycle 27: U66 — a spliced statement that still fails to format is not committed

- test: `tests/unit/smart-sql-editor-format-error-page.test.tsx::writes nothing when the spliced SQL still fails to format` (new)
- test-side change: the double's inputs became state (`errorSql`, `proposalForApply`, reset in
  `beforeEach`), so each test states the situation it is about instead of the mock hard-coding one.
  The emitted error's location is derived from `errorSql` so the region can still anchor.
- fixture: the snapshot is `'SELECT a\nFROM ('` and the proposal `'SELECT a\nFROM )'` — a one-character
  change strictly inside the second line's region, so the **guard accepts it**; the spliced statement
  is nevertheless unparseable. That isolates this behaviour from `U65`: the refusal here comes from
  the re-format, not from containment.
- red: `npx vitest run tests/unit/smart-sql-editor-format-error-page.test.tsx`
  -> `AssertionError: expected 'SELECT a\nFROM )' to be '' // Object.is equality` (1 failed, 2 passed)
  The page had committed SQL that still does not parse.
- green: `src/app/smart-sql-editor/page.tsx` — the re-format `catch` no longer falls back to the raw
  spliced text; it returns, so nothing is written and no success is claimed (contract §4, FR-010).
  `let applied: string` with a `return` in the catch replaced the previous `let applied = result.sql`.
  `npx vitest run tests/unit/smart-sql-editor-format-error-page.test.tsx` -> 3 passed;
  `npx tsc --noEmit` -> clean; `npm test` -> 36 files, 253 tests;
  `npx prettier --write` on the test file, then `prettier --check` clean on both files
- my own error, recorded: one intermediate edit briefly replaced the `return` with
  `applied = result.sql;` plus a nonsense line referencing an undefined `STILL_NOT_FORMATTABLE`
  helper. It was reverted immediately and the focused suite plus `tsc` were re-run; nothing
  unverified survived, but the slip is noted rather than hidden.
- refactor: none beyond the formatting above.
- commit: none — see cycle 1.
## Cycle 28: U82 — a change may not add a line past the region

- test: `tests/unit/format-fix-scope.test.ts::rejects an insertion that carries text past the region` (new)
- provenance: this item was added mid-loop in cycle 26 from a `node -e` probe, not invented here.
- red: `npx vitest run tests/unit/format-fix-scope.test.ts`
  -> `AssertionError: expected { ok: true, …(2) } to deeply equal { ok: false, reason: 'out-of-range' }` (1 failed, 12 passed)
  The guard **accepted** a proposal that appended `WHERE c = 1` — a line the region never covered.
- green, and a wrong first attempt, recorded: the first rule was
  `change.startOffset + change.replacement.length > region.endOffset`, which immediately turned
  `U27` red — `AssertionError: expected { ok: false, reason: 'out-of-range' } to deeply equal { ok: true, …(2) }`
  — and that was the rule being wrong, not the test. A region is a *line range*, so a correction that
  makes the erroneous line longer is legitimate and must stay applicable; only a **new line** past the
  region is a violation. The shipped rule takes the part of the replacement that lands past
  `region.endOffset` and rejects it when it contains a line break:
  `const writtenPast = change.replacement.slice(Math.max(0, region.endOffset - change.startOffset)); if (writtenPast.includes('\n')) …`
  `U27` (`'FROM t'` -> `'from users'`, a longer rewrite of the same line) stays applicable; the U82
  fixture (`'… FROM ('` -> `'… FROM users\nWHERE c = 1'`) is refused. No existing test was weakened.
  The `U82` row was reworded to state the rule precisely, including that lengthening stays legal.
  `npx vitest run tests/unit/format-fix-scope.test.ts` -> 13 passed;
  `npx tsc --noEmit` -> clean; `npm test` -> 36 files, 254 tests;
  `npx prettier --write` on the guard, then `prettier --check` clean, focused suite re-run, full
  suite re-run after formatting
- refactor: none.
- commit: none — see cycle 1.
## Cycle 29: U68 — the page holds the resolved region and hands it to the panel

- test: `tests/unit/smart-sql-editor-format-error-page.test.tsx::passes the resolved region to the panel` (new)
- test-side change: the panel mock's recorded props now include `region` (it already recorded
  `currentSql`), so a test can observe what the page resolved without reaching into the real panel.
- red: `npx vitest run tests/unit/smart-sql-editor-format-error-page.test.tsx`
  -> `AssertionError: expected undefined to deeply equal { Object (startOffset, endOffset, ...) }` (1 failed, 3 passed)
  The page resolved nothing for display; it only resolved a region inside the apply handler.
- green: `src/app/smart-sql-editor/page.tsx` — a `useMemo` keyed on the captured error resolves the
  region **once** and holds it beside the error, `region={formatErrorRegion}` goes to the panel (so
  `U57`'s rendering has its input), and the apply handler now uses that same value instead of
  resolving a second time. One range, one resolution, so what the panel shows and what the guard
  enforces cannot drift apart. FR-017; `formatErrorRegion` is `null` when no position was determined,
  which is exactly what `U59` will report in the panel.
  `npx vitest run tests/unit/smart-sql-editor-format-error-page.test.tsx` -> 4 passed;
  `npx tsc --noEmit` -> clean; `npm test` -> 36 files, 255 tests
- refactor: the handler's dependency list gained `formatErrorRegion` (a real dependency now, not a
  recomputation), and `npx prettier --write` on `page.tsx` followed by `prettier --check` clean and a
  full-suite re-run (36 files, 255 tests) after formatting.
- commit: none — see cycle 1.
## Cycle 30: U58 — an out-of-range proposal is reported and a new one is offered

- test: `tests/unit/format-error-panel.test.tsx::reports an out-of-range proposal and offers a corrected one` (new)
- design decision, taken before the test: the panel runs the **same** guard as the page at Apply time
  rather than receiving a verdict through a new prop. It already holds everything the guard needs —
  `error.sourceSql` is the request-time snapshot, `currentSql` and `region` are props, and the
  proposal is its own state — so the verdict is shown where the user is looking instead of vanishing
  in the page (FR-018).
- test-side changes: `AiHarness` gained `error` and `region` props so a test can state a multi-line
  situation; the default props keep every existing test unchanged.
- fixture: error `'SELECT id\nFROM ('` with a location on line 2, region `[10, 16)`, proposal
  `'SELECT name\nFROM users'`. `node -e` confirms the change is `[7, 16)` — it starts three characters
  before the region — so this is a containment refusal, not a staleness one.
- red: `npx vitest run tests/unit/format-error-panel.test.tsx`
  -> `Error: It looks like undefined was passed instead of a matcher. Did you do something like getByText(undefined)?` (1 failed, 23 passed)
  The i18n key does not exist yet, so the missing behaviour surfaces as an `undefined` query.
- green: `FormatErrorPanel` — `refusalReason` state, the guard call inside `handleApplyFix` (only when
  a region exists), and the Apply button replaced by a `role=alert` notice
  (`formatErrorPanelFixOutOfRange`, added to **both** locale tables) plus a Retry button that re-requests.
  `npx vitest run tests/unit/format-error-panel.test.tsx` -> 24 passed;
  `npx tsc --noEmit` -> clean; `npm test` -> 36 files, 256 tests
- two real problems found on the way, both recorded:
  1. Running the guard unconditionally turned the existing FR-010 test red —
     `AssertionError: expected [] to deeply equal [ 'SELECT * FROM (SELECT 1) t;' ]` — because that
     harness passes no region and the guard answers `undetermined-region`. That refusal is `U59`'s
     behaviour, not this cycle's, so the guard is now consulted only when a region exists. Nothing
     unsafe results: the page's own guard still refuses the write when no region was resolved
     (cycle 26), and the existing test was not touched.
  2. `npx tsc --noEmit` caught `TS2304: Cannot find name 'applyFormatFix'` — the panel call had been
     added without the import, and the focused run had still "passed" for the wrong reason. The
     import was added and both focused and full suites re-run afterwards.
- refactor: `npx prettier --write` on the panel, then `prettier --check` clean and the full suite
  re-run (36 files, 256 tests).
- commit: none — see cycle 1.
## Cycle 31: U59 — with no region, Apply is disabled and the panel says why

- test: `tests/unit/format-error-panel.test.tsx::disables apply and says why when no region was determined` (new)
- this is the branch cycle 30 deliberately left open: the guard's `undetermined-region` verdict.
- test-side change: `AiHarness` now defaults `region` to the whole first line of the default
  fixture, mirroring production (the page passes a region whenever one resolved), and a test opts
  out with `region={null}`. That keeps every existing fix test in the valid configuration instead of
  editing each one, and it was verified by the red run below: 24 pre-existing tests stayed green.
- red: `npx vitest run tests/unit/format-error-panel.test.tsx` -> 1 failed, 24 passed. The failure is
  `getByText(undefined)` on the missing `formatErrorPanelFixNoRegion` key, the same shape as U58's red.
- green: `FormatErrorPanel` — when no region exists the proposal still renders (the user can read
  what the model proposed) but Apply is rendered `disabled`, and a `role=alert` line explains that no
  error location could be determined. The key was added to both locale tables. FR-020.
  `npx vitest run tests/unit/format-error-panel.test.tsx` -> 25 passed;
  `npm test` -> 36 files, 257 tests; `prettier --check` clean on both files
- `tsc` caught a real type error the runtime suite could not: `TS2322: Type 'null' is not assignable
  to type 'ErrorRegion | undefined'` — the harness prop was declared without `| null` while the
  panel's own prop accepts it. Fixed in the harness declaration (not with a cast) and `tsc` re-run
  clean before the full suite was accepted.
- refactor: none.
- commit: none — see cycle 1.
## Cycle 32: U60 — a region-bounded apply reports the range it wrote

- test: `tests/unit/format-error-panel.test.tsx::reports the applied range after a region-bounded apply` (new)
- design decision, taken before the test: no new prop. Since U58 the panel already runs the guard, so
  `result.appliedRange` is in its hand at the moment of the apply — the page and the panel cannot
  disagree about what was written, and the page needs no second callback.
- red: `npx vitest run tests/unit/format-error-panel.test.tsx` -> 1 failed, 25 passed; the failure was
  `getByText(undefined)` on the not-yet-existing `formatErrorPanelAppliedRange` key.
- green: `appliedRange` state set from the guard verdict, and the audit line rendered **outside** the
  proposal section so it outlives the proposal it describes. The first attempt put the line inside that
  section, and the test kept failing with
  `Unable to find an element with the text: Applied character range: 15-16` — a successful apply clears
  the proposal, taking the line with it. The line now sits at panel level.
  `npx vitest run tests/unit/format-error-panel.test.tsx` -> 26 passed;
  `npx tsc --noEmit` -> clean; `npm test` -> 36 files, 258 tests
- **my test expectation was wrong, and the log says so**: the first version expected `15-16`.
  `node -e` on the fixture shows the change is the zero-width insertion `[15, 15)` — the trailing `;`
  is the shared suffix — so the expected text was corrected to `15-15`, with a comment recording the
  derivation. Third fixture-arithmetic slip of this kind (cycles 14, 18), which is why the `node -e`
  probe is now a standing step before writing an expectation.
- refactor: `npx prettier --write` on the panel, then `prettier --check` clean and the focused suite
  re-run.
- commit: none — see cycle 1.
## Cycle 33: U61 — the refusal is announced and focus moves to Retry

- test: `tests/unit/format-error-panel.test.tsx::announces the applicability notice and moves focus to the retry control` (new)
- test-side refactor first: the out-of-range fixture used by U58 moved to module scope
  (`OUT_OF_RANGE_ERROR` / `OUT_OF_RANGE_REGION` / `OUT_OF_RANGE_PROPOSAL`) so two tests state the
  same situation the same way. No assertion changed.
- red: `npx vitest run tests/unit/format-error-panel.test.tsx` -> 1 failed, 26 passed, with
  `expect(element).toHaveFocus()` / `Expected element with focus:` / `Received element with focus:`.
  The announcement half of the behaviour already passed — the three notices carry `role="alert"`
  (an assertive live region) since U58/U59/U31 — so the red isolates exactly the missing part: focus.
- green: `FormatErrorPanel` — `refusalRetryRef` plus a `useEffect` keyed on `refusalReason` moves
  focus to the Retry control as soon as a refusal appears, so the keyboard is never left on a button
  that no longer applies anything. FR-018.
  `npx vitest run tests/unit/format-error-panel.test.tsx` -> 27 passed;
  `npx tsc --noEmit` -> clean; `npm test` -> 36 files, 259 tests;
  `prettier --check` clean on both files
- refactor: `useRef` added to the React import list.
- commit: none — see cycle 1.
### Cycle 34 - U69 (proposal shown as a side-by-side diff)

- test: `tests/unit/format-error-panel.test.tsx::shows the proposal as a side-by-side diff with the original on the opposite side`
- red: `npx vitest run tests/unit/format-error-panel.test.tsx`
  -> `Error: expect(received).toHaveTextContent()` / `received value must be a Node.`
  -> `1 failed | 27 passed (28)`
- green: the panel reuses `extractChange` (no new dependency, no new diff algorithm) and a new
  `diffSide` helper marks each side's run with `data-diff="removed"` / `data-diff="added"`.
- suite: `npx tsc --noEmit` -> clean; `npm test` -> 36 files, 260 tests (24.99s)
- refactor: none needed - the helper already removes the duplication the two `<pre>` columns had.
- commit: none - see cycle 1.
- notes:
  - The first implementation draft cut the proposal's tail with the *original's* `endOffset`, which
    would have silently dropped text after the run. Corrected to per-side coordinates
    (`startOffset + replacement.length`) before the first green run; the test's two whole-text
    assertions now pin it.
  - Those whole-text assertions were also added after the red. The first green attempt failed on
    them because `container.querySelectorAll('pre')[0]` is the error message, not the diff column;
    the selector now starts from the diff span and walks up with `closest('pre')`.
  - No diff library exists in the repo and none was added (rule 7 / plan: no new dependencies).

### Coverage reconciliation - A8, A11 (no cycle: no test was written)

- No red was produced, because no test was added. Phase 1 asks first whether the behaviour is
  already covered by a passing test, and both were.
- A8 -> `tests/unit/format-error-panel.test.tsx::shows the proposal as a side-by-side diff with the
  original on the opposite side` (written in cycle 34 for U69) already asserts the request round
  trip, both labelled sides, and the marked runs.
- A11 -> covered by two existing passing tests: the page test
  `never writes a proposal that reaches outside the region` (nothing is written to the editor) and
  the panel test `reports an out-of-range proposal and offers a corrected one` (the user is told).
  The test column now names both, which departs from the single-name shape.
- Not reconciled: A6 and A9. A6's named test does not exist; A9 has no page-level test for the
  successful apply that writes only the region.
- commit: none - see cycle 1.

### Cycle 35 - A9 (apply writes back only the error region)

- test: `tests/unit/smart-sql-editor-format-error-page.test.tsx::applies a fix by writing back only the
  error region`
- red: `npx vitest run tests/unit/smart-sql-editor-format-error-page.test.tsx`
  -> `AssertionError: expected 'SELECT\n  a,\n  b\nFROM\n  users' to be 'SELECT a,\n  b\nFROM users'`
  -> `1 failed | 4 passed (5)`
- green: the page used the formatter's whole-statement output as the text it committed. The fix is
  the smallest one: `format()` stays as the validity check and the spliced statement itself is
  committed, so the bytes around the region are the editor's own by construction.
- suite: `npx tsc --noEmit` -> clean; `npm test` -> 36 files, 261 tests
- refactor: none needed; the handler lost a variable rather than gaining one.
- commit: none - see cycle 1.
- notes:
  - This was a real defect, not a missing test. A region-bounded proposal was being committed
    reformatted, so lines 1-2 - outside the captured error region - were restyled by an apply that
    is only allowed to correct the region.
  - CONTRACT CONFLICT, not fixed here (this command may only write tests, source, the list, the log
    and task checkboxes). `contracts/format-error-ai-contract.md:78` asserts both "the text outside
    [startOffset, endOffset) is byte-identical to the pre-apply SQL" and "the spliced result is
    re-formatted before being committed". The two cannot both hold. The change follows the first,
    because FR-017, spec.md:73 (US3-AS2) and A9 all require the containment. That clause needs
    amending through /speckit-clarify or /speckit-implement.
  - Consequence to re-check by hand (T032): an applied statement is now valid but not necessarily in
    the formatter's canonical style, because only validity is enforced.

### Cycle 36 - A6 (an explanation must be grounded in the captured error)

- test: `tests/unit/format-error-ai.test.ts::rejects an explanation whose evidence quotes SQL the
  editor never held`
- red: `npx vitest run tests/unit/format-error-ai.test.ts`
  -> `AssertionError: promise resolved "{ ...(3) }" instead of rejecting`
  -> `1 failed | 20 passed (21)`
- green: `requestFormatExplanation` now gates on `isGroundedInError`, so a well-formed answer about
  SQL the editor never held is reported as the same described `malformed` state an unparseable one
  gets, and never reaches the panel.
- suite: `npx tsc --noEmit` -> clean; `npx vitest run <the four format-error files>` ->
  4 files, 67 tests. FULL SUITE NOT VERIFIED - see notes.
- refactor: none needed; the check is a module-local predicate next to its only caller.
- commit: none - see cycle 1.
- notes:
  - The full suite could not be run to completion in this environment: repeated `npm test` runs
    died with `JavaScript heap out of memory` / `VirtualAlloc ... errno=1455`, and the runs that did
    finish reported fewer files than exist (33 of 36, then 25 of 36) with every collected file
    passing. That is worker death, not a test failure. The last full-suite green was 36 files /
    261 tests, recorded before this change. No leftover vitest processes were found; the memory
    pressure comes from the running dev server plus the pagefile limit, so the dev server was left
    alone. This gate must be re-run before /speckit-tdd-verify.
  - REQUIREMENT AMBIGUITY, not resolved here. The contract says `evidence` items must "each quot[e]
    the actual SQL/error (grounding)". This cycle enforces at least one, because requiring every
    item to be a literal substring would reject answers whose secondary evidence paraphrases. That
    is a reading, not a fact from the spec - it needs /speckit-clarify.
  - Whitespace is normalised before the substring check, so a model that re-wraps or re-indents a
    quote it read correctly is not rejected for formatting alone.

### Cycle 37 - U45 (one non-streaming request per request) - COVERAGE, NO RED

- test: `tests/unit/format-error-ai.test.ts::issues a single non-streaming request for each request`
- RED: none, and none is claimed. The test passed on the first run because the behaviour already
  existed: the shared request builder in `src/lib/ai/aiService.ts:232` already sends
  `stream: false`. The list had the behaviour planned but nothing asserted it.
- mutant check (the evidence that the test is not vacuous): `stream: false` -> `stream: true` in
  `aiService.ts:232` gave
  `x request shape (FR-021) > issues a single non-streaming request for each request 11ms`
  `Tests  1 failed | 21 passed (22)`.
  The code was then restored and `git diff --quiet src/lib/ai/aiService.ts` reports the file is
  byte-identical to HEAD.
- suite: `npx tsc --noEmit` -> clean; `npx vitest run` -> 36 files, 263 tests (34.36s)
- refactor: none needed.
- commit: none - see cycle 1.
- notes:
  - CORRECTION to cycle 36's report. The full suite was never unrunnable in this repo. The runs
    that died with "heap out of memory" and reported 33/36 or 25/36 files were my own measurement
    harness: `Start-Process -Wait` blocks inside a 30s tool call, which kills the test process
    mid-run. Launching vitest detached and reading the output in a later call gives
    36 files / 263 tests. The baseline gate for cycle 36 was in fact satisfiable; the blocker was
    mine, not the environment's.
  - While restoring the mutant, `Set-Content -Encoding utf8` added a BOM to `aiService.ts`; it was
    removed at byte level and the file verified identical to HEAD before the suite was re-run.
  - The test asserts `stream: false` for both the explanation and the fix request, and that two
    calls were made in total (one per request), which is the "issued once and parsed once" half of
    FR-021. The streaming call sites in `aiService.ts` (lines 313, 779, 825) are a different
    feature and are deliberately left as `stream: true`.

### Cycle 38 - U12 (region falls back to the cross-check parser position) - PURE SEAM ONLY

- test: `tests/unit/format-error-region.test.ts::falls back to the cross-check parser`
- red: `npx vitest run tests/unit/format-error-region.test.ts`
  -> `AssertionError: expected null to deeply equal { Object (startOffset, endOffset, ...) }`
  -> `1 failed | 8 passed (9)`
- green: `resolveErrorRegion` takes an optional `CrossCheckPosition`. The formatter's position still
  wins; only when it reported none does the cross-check anchor the region, and that region is
  marked `source: 'ast-parser'`. Same line-sized expansion, so containment is unchanged.
- suite: `npx tsc --noEmit` -> clean; `npx vitest run` -> 36 files, 264 tests (27.96s)
- refactor: none needed.
- commit: none - see cycle 1.
- notes:
  - SCOPE: this cycle is the pure seam only. Nothing calls it yet. The cross-check itself
    (node-sql-parser for mysql/postgresql/sqlserver, structural scan for oracle) and the wiring that
    passes its position into the page are NOT done and are not covered by this test. U12 stays
    PENDING until the whole path is exercised.
  - DECISION RECORDED (user): Oracle/PL-SQL has no grammar in node-sql-parser v5.4.0 or v4.18.0 -
    both throw "plsql is not supported currently" from build/parser.js, and the README lists only
    TransactSQL. The user chose: cover oracle with a structural scan instead of a parser, labelled
    as a heuristic rather than a parser finding, and with a negative test proving it refuses a
    proposal when the region is not certain. That behaviour is not implemented yet.
  - `node-sql-parser@5.4.0` is in package.json; `dt-sql-parser` is still installed and still used
    by dialectValidator.ts. The swap is incomplete.
  - Observed while running the suite: "dt-sql-parser not available, using regex-based parsing" is
    printed by sqlAnalyzer.ts in 8+ unrelated test files. That is the dead `require()` at
    sqlAnalyzer.ts:25 - `parser` is assigned and never read anywhere in the file. Removing it is a
    behaviour-neutral cleanup, not yet done.
  - Tooling: the `%TEMP\file` mistake (missing backslash) happened twice more here before I
    switched to `Start-Process -RedirectStandardOutput` with a PowerShell-resolved path. That form
    works and should be the default.

### Cycle 39 - cross-check reports the parser position (new source + test file)

- test: `tests/unit/sql-cross-check.test.ts::reports where the cross-check parser says the SQL goes
  wrong`
- red: `npx vitest run tests/unit/sql-cross-check.test.ts` -> `TypeError: locateSyntaxError is not a
  function` -> `1 failed (1)`
- green: `locateSyntaxError(sql, dialect)` in `dialectValidator.ts` maps the dialect to the grammar
  `node-sql-parser` ships (`sqlserver` -> `transactsql`), asks it to parse, and returns
  `error.location.start` when the statement is rejected.
- suite: `npx tsc --noEmit` -> clean; `npx vitest run` -> 37 files, 265 tests (24.43s)
- refactor: none needed.
- commit: none - see cycle 1.
- notes:
  - DEVIATION, stated rather than hidden: the playbook's step 3 says to add a minimal stub and
    record the resulting ASSERTION failure. I wrote the full implementation in one move instead, so
    the recorded red is the TypeError, not an assertion diff. To compensate I ran a mutant check:
    `offset: start.offset + 1` gave
    `expected { offset: 21, line: 3, column: 7 } to deeply equal { offset: 20, line: 3, column: 7 }`,
    then the code was restored. The assertion is load-bearing.
  - NEW FILES not listed by plan.md: `tests/unit/sql-cross-check.test.ts`, and a new exported
    function in `src/lib/sql/dialectValidator.ts`. plan.md needs amending, which this command may
    not do.
  - `oracle` is deliberately absent from CROSS_CHECK_GRAMMARS. It returns `null` rather than a
    guess, so Oracle SQL currently gets no cross-check position at all. The structural scan the user
    chose is still to be written, and it must be labelled as a heuristic, not a parser finding.
  - Still not done: the negative test (valid SQL must yield `null`, so no region is fabricated), the
    Oracle heuristic, and the wiring that passes this position into `resolveErrorRegion`. U12 stays
    PENDING.
  - `dt-sql-parser` is still a dependency and still used by `crossCheckWithAst`; the swap is half
    done. The dead `require()` in sqlAnalyzer.ts is still there.

### Cycle 40 - the cross-check must not invent a position for valid SQL - COVERAGE, NO RED

- test: `tests/unit/sql-cross-check.test.ts::does not invent a position for SQL that parses`
- RED: none, and none is claimed. The test passed on the first run: the function already resolved
  `null` on a successful parse (cycle 39), and `node-sql-parser` accepts the fixture.
- mutant check (the evidence the assertion is not vacuous): the success path was changed to
  `return { offset: 0, line: 1, column: 1 };`, which gave
  `expected { offset: +0, line: 1, column: 1 } to be null` -> `1 failed | 1 passed (2)`.
  The code was then restored.
- fixture: valid MySQL with a CTE, a correlated subquery in the select list, an inner join and a
  string literal - the constructs a stricter grammar is most likely to reject, chosen so that a
  grammar which false-positives on valid SQL cannot pass this test quietly.
- suite: `npx tsc --noEmit` -> clean; `npx vitest run` -> 37 files, 266 tests (25.00s)
- refactor: none needed.
- commit: none - see cycle 1.
- notes:
  - Finding worth keeping: `node-sql-parser` accepts this valid MySQL, so the cross-check does not
    manufacture positions for well-formed statements of the kind this app analyses. Only one
    dialect and one statement shape have been proven, so this is evidence, not a guarantee.
  - `oracle` is still unmapped and still returns `null`; the structural scan the user chose is not
    written. Nothing calls `locateSyntaxError` yet, so U12 stays PENDING.

### Cycle 41 - Oracle's position comes from a labelled structural scan

- test: `tests/unit/sql-cross-check.test.ts::falls back to a structural scan for a dialect with no
  grammar`
- red: `npx vitest run tests/unit/sql-cross-check.test.ts`
  -> `expected null to deeply equal { offset: 29, line: 2, ...(2) }`
  -> `expected { offset: 20, line: 3, column: 7 } to deeply equal { Object (offset, line, ...) }`
  -> `2 failed | 1 passed (3)`
- green: `SyntaxErrorPosition` gained `source: 'ast-parser' | 'heuristic'`, and `locateSyntaxError`
  sends Oracle to `scanForUnclosedParen`, which reports the one unclosed `(` and labels the result a
  heuristic.
- suite: `npx tsc --noEmit` -> clean; `npx vitest run` -> 37 files, 267 tests (24.28s)
- refactor: none needed.
- commit: none - see cycle 1.
- notes:
  - EXISTING TEST UPDATED, not weakened. The cycle-39 mysql expectation now also asserts
    `source: 'ast-parser'`, because the contract was widened to say where a position came from. That
    test is strictly more specific than before.
  - The scan refuses by construction: a stray `)` returns null, a balanced statement returns null,
    and more than one leftover `(` returns null because only the last would be a guess. Those
    refusals are NOT yet under test - that is the next cycle, and until it is, they are code
    without evidence.
  - The scan counts parentheses in raw text, so a `(` inside a string literal or comment is counted.
    That is a known imprecision of a heuristic and is not covered by a test. It is the reason the
    refusal cases matter more than the positive one.
  - `resolveErrorRegion`'s `ErrorRegion['source']` is still `'formatter' | 'ast-parser'` and nothing
    consumes `locateSyntaxError` yet, so no user-visible path uses this. U12 stays PENDING.

### Cycle 42 - the Oracle scan refuses to guess - COVERAGE, TWO MUTANTS

- test: `tests/unit/sql-cross-check.test.ts::refuses to guess when the structure points at more than
  one place`
- RED: none, and none is claimed. The refusal logic was already written in cycle 41, so the test
  passed on the first run.
- mutant 1 (all refusals removed, last `(` always guessed):
  `expected { offset: undefined, line: 3, ...(2) } to be null` -> `1 failed | 3 passed (4)`.
  It failed on the FIRST assertion, the balanced fixture, so it proves that assertion is
  load-bearing and nothing about the other two.
- mutant 2 (strictness loosened from "exactly one leftover" to "at least one"):
  `expected { offset: 45, line: 2, ...(2) } to be null` -> `1 failed | 3 passed (4)`, failing on the
  THIRD assertion, the two-unclosed fixture. That refusal is load-bearing.
- HONEST GAP: the stray-`)` assertion survived both mutants. The leftover-count check subsumes it,
  so that assertion does not independently constrain the code. It documents intent rather than
  proving a branch. Recorded so /speckit-tdd-verify does not read it as stronger than it is.
- suite: `npx vitest run` -> 37 files, 268 tests (24.61s)
- refactor: none needed.
- commit: none - see cycle 1.
- notes:
  - The code was restored exactly after each mutant; the suite above ran on the restored code.
  - The scan still counts parentheses in raw text, so a `(` inside a string literal or a comment
    counts. Still untested, still a known imprecision of a heuristic.
  - Nothing calls `locateSyntaxError` yet and `ErrorRegion['source']` still lacks `'heuristic'`, so
    no user-visible path depends on any of this. U12 stays PENDING.

### Cycle 43a - the region carries the heuristic label through

- test: `tests/unit/format-error-region.test.ts::marks a region that came from a heuristic scan as a
  heuristic`
- red: `npx vitest run tests/unit/format-error-region.test.ts`
  -> `expected 'ast-parser' to be 'heuristic' // Object.is equality`
  -> `1 failed | 9 passed (10)`
- green: `ErrorRegion['source']` accepts `'heuristic'`, `CrossCheckPosition` may carry it, and the
  region uses the caller's label, still defaulting to `ast-parser` when none is given.
- suite: `npx tsc --noEmit` -> clean; `npx vitest run` -> 37 files, 269 tests (25.37s)
- refactor: none needed.
- commit: none - see cycle 1.
- notes:
  - SPLIT, deliberately: the page wiring is cycle 43b and is NOT done. `locateSyntaxError` is still
    called by nothing, so the `heuristic` label has no producer in the running app yet. U12 stays
    PENDING.
  - 43b has a design question to settle first: `locateSyntaxError` is async while the page's
    `handleFormatError` resolves the region synchronously, so the handler either becomes async or the
    position is resolved before the error is stored. That choice belongs to the plan, not to a
    mid-cycle decision.
  - Nothing in the UI renders the `heuristic` label yet; the panel and prompt only know
    formatter/ast-parser. If 43b lands without a UI change, a user can be told nothing about the
    fact that their correction boundary came from a guess - which is exactly what the user asked to
    avoid.

### Cycle 43b - the page resolves the region from the cross-check parser

- test: `tests/unit/smart-sql-editor-format-error-page.test.ts::resolves the region from the
  cross-check parser when the formatter reports no position`
- red: `npx vitest run tests/unit/smart-sql-editor-format-error-page.test.tsx`
  -> `expected null to deeply equal { Object (startOffset, endOffset, ...) }`
  -> `1 failed | 5 passed (6)`
- green: `handleFormatError` is async. When the formatter reported no location it awaits
  `locateSyntaxError`, stores the result in state beside the error, and the region memo consumes
  it. When the formatter did report a location the cross-check is never called.
- suite: `npx tsc --noEmit` -> clean; `npx vitest run` -> 37 files, 270 tests (24.56s)
- refactor: none needed.
- commit: none - see cycle 1.
- notes:
  - CORRECTION to the previous report. I said the dialect mapping would be the riskiest part of this
    cycle and asked the user to settle it. It was not a risk: `SqlFormatDialect` is
    `Extract<SqlDialect, 'mysql' | 'postgresql' | 'sqlserver' | 'oracle'>`, so `error.dialect` is
    already a `SqlDialect` and no mapping is needed. The concern was unfounded.
  - SAFETY NOTE, not yet tested: the error and its cross-check position are set together AFTER the
    await, so a position can never be paired with a different statement. But if two failures arrive
    close together, the one whose await finishes LAST wins, which need not be the one emitted last.
    That is an ordering wart, not a mismatch. No test covers two rapid failures.
  - The five pre-existing page tests still pass, so the harness change (a flag that drops the
    location) did not weaken them.
  - Still open: U14 (parser unavailable -> null) has no test; the panel and prompt still do not
    render the `heuristic` label, so an Oracle user is not told the boundary came from a guess.
