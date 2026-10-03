---
feature: 013-guest-access-mode
started_at: 9ee579317e9cc5a0dffee10b89131bc1e23ebb0a
---

# TDD Cycle Log: Guest Access Mode

Append only. Never edit a past entry. Each entry records one behavior: the test, the **observed**
red output, what turned it green, the resulting suite counts, the refactor step, and the commit.

---

## Baseline

Recorded before the first cycle, so a later failure can be attributed correctly.

| field | value |
|---|---|
| commit | `9ee579317e9cc5a0dffee10b89131bc1e23ebb0a` |
| branch | `duyvt7` |
| command | `npm test` (`npx vitest run`) |
| result | **green** |
| test files | 39 passed / 39 |
| tests | 282 passed / 282 |
| duration | 28.93s |
| typecheck | `npm run type-check` green at plan time |

Notes:

- The suite includes two untracked test files from earlier unrelated work
  (`tests/unit/side-panel-tab.test.tsx`, `tests/unit/guideline-light-theme-colors.test.tsx`), so the
  282 count is *this* working tree, not commit `9ee5793`.
- The profile's `suite_seconds` of 9.19s is stale; 28.93s is the measured baseline on this machine.
- No cycle has been run. This file has no red evidence yet, by design.

---

## Cycle 1 — U1 `isLockedForGuest` leaves a non-ai capability unlocked

| field | value |
|---|---|
| behavior | U1 |
| test | `tests/unit/guestEntitlement.test.ts` → `U1 leaves a non-ai capability unlocked whatever provider is selected` |
| red command | `npx vitest run tests/unit/guestEntitlement.test.ts` |
| red output | `TypeError: isLockedForGuest is not a function` (after the structural skeleton existed — see notes) |
| green by | Adding `isLockedForGuest` to `src/lib/capabilities.ts`, returning false for `non-ai` and short-circuiting the other non-shared cases before the `config` branch. |
| suite after | **40 files / 283 tests passed**, 29.73s — no regression against the 282-test baseline |
| typecheck | `npm run type-check` green |
| refactor | None needed. The predicate is a flat guard chain with no duplication and no second responsibility. |
| commit | **none — `--no-commit` mode** (see notes) |

Notes:

- **The first red was not accepted as evidence.** The initial run failed with
  `Failed to resolve import "@/lib/capabilities"`, which is a load error, not a behavioral failure —
  it would have been satisfied by an empty stub. The structural skeleton (types only, T001) was
  created first, and the loop was re-run to obtain a red on the behavior itself
  (`isLockedForGuest is not a function`). Both outputs are recorded above in order.
- **No commit was made.** The working tree still carries unrelated uncommitted changes
  (`src/app/query-input/page.tsx`, five `src/app/smart-sql-editor/**` files,
  `SidePanelTab.tsx`, two test files) that are not mine. Committing at green would have captured
  them. The loop ran with `--no-commit` semantics; the tree is deliberately left dirty and is
  reported as such.
- The implementation deliberately covers the whole guard chain rather than only the `non-ai` case.
  That is the one deviation from "the smallest change": the alternative was a
  `return aiConfig.provider !== LOCAL_PROVIDER` one-liner that would have satisfied U1 while
  encoding the wrong default for the four `providerSource` cases. Since those are separate
  behaviors (U6-U9) with their own tests, keeping them explicit now avoids a silent inversion
  later. No behavior is claimed here beyond U1 — U6-U9 remain PENDING and untested.

