---
feature: 010-sql-intelligence-dashboard
verdict: FAIL
standard: .specify/extensions/tdd/templates/tdd-test-quality-rubric.md
verified_at: 216ac60
behaviors: 69
proven: 0
likely: 23
test_after: 0
no_test: 42
not_applicable: 4
high_smells: 0
criteria_total: 29
criteria_covered: 0
mutation: deliberate mutants — 4 sampled, 4 caught (no mutation tool in profile)
suite: 103 passed, 0 failed, 18.1s
independent: false — audited by the session that wrote the tests (no subagent available)
---

# TDD Verification: SQL Intelligence Dashboard

**Verdict: FAIL.** The feature is mid-implementation: 42 of 69 behaviors — including every acceptance behavior A1–A27 — have no test yet, which fails closed on both NO_TEST behaviors and untested acceptance criteria. The 27 behaviors that exist were driven red-first with real recorded failures, but classify only as LIKELY because the session ran under `--no-commit` semantics, leaving no git history to corroborate ordering.

## Test-first evidence

| Behavior | Class | Evidence |
| -------- | ----- | -------- |
| U3–U9 | LIKELY | cycle 2 red recorded (6 failed / 1 passed, missing exports and fields); no commits exist to corroborate order |
| U10–U12 | LIKELY | cycle 3 red recorded (unresolved import); no commits |
| U13–U22 | LIKELY | cycle 4 red recorded (unresolved import); no commits |
| U23–U25 | LIKELY | cycle 5 red recorded (unresolved import); no commits |
| U1, U2, U26, U39 | NOT_APPLICABLE | characterization baselines — green against untouched code by definition |
| U27–U42 (15 remaining), A1–A27 | NO_TEST | PENDING — task phases 3–10 not yet implemented |

Existing tests: none modified (git status shows only new test files; the two modified files are source). No assertions removed, loosened, skipped or filtered; no coverage/mutation thresholds changed. No secrets found in tests or fixtures.

## Findings

| # | Severity | Finding | Evidence |
| - | -------- | ------- | -------- |
| 1 | HIGH | T001–T003 are ticked in tasks.md while their behaviors U1/U2/U26/U39 are state BASELINE (not DONE) — completion claims the tick rule does not recognize. Disclosed in cycle-log notes at tick time; still a finding. | `specs/010-sql-intelligence-dashboard/tasks.md:25-27` vs test-list states |
| 2 | MED | U9's "level derived only from the normalized score" clause asserts `getNormalizedLevel(result.normalizedScore)` — the function under test computes the expected value, so a band-mapping bug passes this line (currently saved only by U4–U6's independent pins). | `tests/unit/complexityNormalization.test.ts:94` |
| 3 | MED | U17's expected share uses the same division the implementation uses (`25 / 111`); the invariant the code does not compute — sum of shares ≈ 1 — is unpinned. | `tests/unit/dashboardData.test.ts` (U17 test) |
| 4 | LOW | U2 asserts linting messages equal `getT('en')` resources — pins the i18n wiring, but a typo inside the locale file would satisfy both sides. | `tests/unit/complexityScorer.baseline.test.ts` (U2 test) |
| 5 | LOW | Prompt tests use substring `toContain('82')`-style assertions that could match unintended text. | `tests/unit/dashboardAiPrompts.test.ts` (U23 test) |

No HIGH test smells. The smell pass covered all 8 new test files against the catalogue with the profile's conventions, exemplars (`tests/unit/SignInPage.test.tsx`) and helpers (`tests/utils/test-setup.ts`) open: naming, store seeding, `resetTestStorage`, `vi.mock('next/navigation')` and fixture style match the repository. Suite properties: deterministic, fast (new files add <100ms), isolated per file, failures name their behavior.

## Mutation results (deliberate mutants — no mutation tool in the profile)

| Mutant | Behavior | Caught | Evidence |
| ------ | -------- | ------ | -------- |
| `complexityScorer.ts` `getNormalizedLevel` `>=` → `>` at MEDIUM_MIN | U4 | Yes | `npx vitest run tests/unit/complexityNormalization.test.ts -t "resolves both sides of the LOW/MEDIUM boundary"` → 1 failed |
| `complexityScorer.ts` `normalizeScore` → constant 50 | U3 | Yes | `-t "maps a raw score of 0 to 0"` → 1 failed |
| `buildDashboardData.ts` severity sort inverted | U14 | Yes | `-t "groups findings by rule"` → 1 failed |
| `buildDashboardData.ts` zero-raw guard dropped | U17 | Yes | `-t "ranks contributors by points"` → 1 failed |

Sample: 4 of 23 DONE behaviors (the highest-risk ones: score boundary, curve, findings ordering, division guard). Not exhaustive. Every mutant was restored exactly; the full suite after restores: 21 files / 103 tests green.

## Traceability

- **Acceptance level: 0 of 29 criteria covered end to end** — A1–A27 are PENDING; tests through the real entry point (the composed dashboard) are phases 3+ work.
- Unit level (green): FR-001, FR-008, FR-028 (U3–U9); FR-013, FR-014, FR-015 (U10–U12); FR-004, FR-005, FR-006, FR-007, FR-009, FR-017, FR-026 (U13–U22); FR-019, FR-020 (U23–U25).
- No test yet: FR-002, FR-003, FR-011, FR-012, FR-016, FR-022, FR-023, FR-024, FR-025, FR-027 (UI phase).
- Tests tracing to nothing: none — every `traces` value resolves to a real spec id. Every test named in the test list's test column exists and ran green in the suite.

## What was not audited

- The 42 PENDING behaviors and all 29 acceptance criteria — not yet written; this report grades a feature mid-implementation, not a finished one.
- Mechanical mutation testing: no tool in the stack profile; deliberate mutants sampled 4 behaviors only.
- Coverage: no coverage command in the profile (recorded `null`); unmeasured.
- Independence: the auditor is the same session that wrote the tests (no fresh-context subagent available). One test file was re-read cold from disk; the others were assessed against their verbatim contents as written this session — treat the smell pass accordingly.
- Performance, visual layout, vi-locale rendering, and live AI service behavior: no automated coverage exists yet (manual legs in quickstart.md).