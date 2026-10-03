# Cycle Log: SQL Intelligence Dashboard

Append only. Newest last. Every entry's `red` block is the evidence that the test existed and failed before the implementation. Shape per `.specify/extensions/tdd/templates/tdd-test-list-template.md`.

## Baseline

- suite: `npm test` → 14 test files passed, 72 tests passed, 0 failed (13.77s)
- commit: `216ac60`
- recorded: cycle 0, before any change
- note: `dt-sql-parser` is unavailable in the test environment (regex fallback is used); per the stack profile, a skipped parser-dependent test is not red or green evidence for a behavior.

## Cycle 1: U1, U2, U26, U39 — characterization baselines (task batch T001–T003)

- test: `tests/unit/complexityScorer.baseline.test.ts` (3), `tests/unit/sqlMetricsDashboard.baseline.test.tsx` (3), `tests/unit/complexitySurfaces.baseline.test.tsx` (2) — new, characterization
- red: none by design (characterization is green against untouched code). One first-run failure was a test bug — the test read `scoreBreakdown.ctes.total` instead of the interface's `.totalScore`: `AssertionError: expected 17 to be NaN` — fixed before recording evidence, no production change.
- green: `npx vitest run <three baseline files>` → 8 passed, 0 failed
- refactor: none needed
- commit: none — session runs under `--no-commit` semantics (workspace rule: no automatic commits)
- notes: task-batched cycle (4 behaviors across 3 tasks); states remain BASELINE per the template. Ticking T001–T003 is a judgment call disclosed here: the tick rule keys on DONE, but these tasks' work is complete and green, and leaving them unticked would invite duplicate implementation.

## Cycle 2: U3–U9 — deterministic normalized score (T005/T006 → T007)

- test: `tests/unit/complexityNormalization.test.ts` (new)
- red: `npx vitest run tests/unit/complexityNormalization.test.ts` → 6 failed | 1 passed — `normalizeScore`/`getNormalizedLevel` not exported; `result.normalizedLevel`/`result.normalizedThresholds` undefined
- green: normalization constants (`NORMALIZED_SATURATION_K: 105`, fixed bands 25/55/80) in `src/app/common/sqlAnalyzerUtils.ts`; `normalizeScore`/`getNormalizedLevel`/`getNormalizedLevelList` + additive `DetailedComplexityScore` fields wired into `calculateQueryComplexity` in `src/lib/sql/complexityScorer.ts` → `npx vitest run tests/unit/complexityNormalization.test.ts tests/unit/complexityScorer.baseline.test.ts` → 10 passed, 0 failed
- refactor: none — pure addition; the raw-arithmetic baselines stayed green (FR-024 preserved)
- commit: none (`--no-commit`)

## Cycle 3: U10–U12 — capability resolution (T008 → T009)

- test: `tests/unit/dashboardCapability.test.ts` (new)
- red: batched run `npx vitest run tests/unit/dashboardCapability.test.ts tests/unit/dashboardData.test.ts tests/unit/dashboardAiPrompts.test.ts` → 3 test files failed, no tests ran — `Failed to resolve import "@/lib/sql/dashboard/capability"`
- green: created `src/lib/sql/dashboard/capability.ts` (query map with predicates/dependencies partial; non-query object types all-unsupported) → 3 passed
- refactor: none
- commit: none (`--no-commit`)

## Cycle 4: U13–U22 — dashboard data adapter (T010 → T011)

- test: `tests/unit/dashboardData.test.ts` (new; shared fixtures in `tests/utils/dashboardFixtures.ts`)
- red: same batched run — `Failed to resolve import "@/lib/sql/dashboard/buildDashboardData"`
- green: created `src/lib/sql/dashboard/types.ts` + `src/lib/sql/dashboard/buildDashboardData.ts` (pure adapter: health, findings grouping/order/actions incl. MyBatis merge, contributor ranking with zero-raw guard, structure groups covering all 17 SqlMetrics keys, capability-aware tabs, dependencies partial, advanced metadata) → 10 passed
- refactor: none
- commit: none (`--no-commit`)

## Cycle 5: U23–U25 — AI insight prompts (T012 → T013)

- test: `tests/unit/dashboardAiPrompts.test.ts` (new)
- red: same batched run — `Failed to resolve import "@/lib/sql/dashboard/aiPrompts"`
- green: created `src/lib/sql/dashboard/aiPrompts.ts` (vi/en explainComplexity, explainFinding, optimizationOpportunities; prompts forbid performance-improvement claims per FR-012) → 3 passed
- refactor: none
- commit: none (`--no-commit`)

## Cycle 6: U27, U29, U35 + A1–A4 — health summary, dashboard states, advanced details (T014 → T015)

- test: `tests/unit/sqlMetricsDashboard.test.tsx` (new); `tests/unit/sqlMetricsDashboard.baseline.test.tsx` updated for the retired hero/gauge visuals
- red: not captured verbatim — this cycle spanned a context boundary, so the initial red run for the health-summary batch was not recorded in this log. Disclosed rather than reconstructed.
- green: `AnalysisHealthSummary.tsx` + `AdvancedDetails.tsx` created; `MetricsDashboardContent.tsx` rewired onto `buildDashboardData` with skeleton/empty/error states and the raw score/denominator/rule ids moved behind progressive disclosure; new i18n keys in `src/locales/{en,vi}.ts`; store gained `analysisError` → `npm test` 22 files / 111 tests green, `npm run type-check` clean
- refactor: none
- commit: none (`--no-commit`)

## Cycle 7: U27/U43 completion — retry SQL source and real entry-point state (T014/T015 follow-up)

Two user-visible integration gaps found after the dashboard rewiring: retry re-analysed the wrong SQL for MyBatis/XML input, and no real entry point published `analysisError`, so the dashboard error/retry state was reachable only in unit tests.

- test: `tests/unit/sqlMetricsDashboard.test.tsx` (3 added) + `tests/unit/query-input-analysis-state.test.tsx` (new)
- red (1/2): `npx vitest run tests/unit/sqlMetricsDashboard.test.tsx` → **3 failed | 8 passed** — retry called `analyzeSql` with stale `rawSql` instead of `resolvedSql`; retry stayed enabled with no SQL to re-run (smart-editor mode); a stale `analysisError` still rendered after a successful analysis arrived
- green (1/2): `setAnalysisResult` now clears `analysisError` (`src/lib/store.ts`); `MetricsDashboardContent` derives `sqlToReanalyze` from `inputMode` (mybatis/import-xml → `resolvedSql`, else `rawSql`) and disables retry via `canRetry` when that SQL is empty → **11 passed**
- red (2/2): `npx vitest run tests/unit/query-input-analysis-state.test.tsx` → **1 failed | 2 passed** — `analysisError` stayed `null` after a rejected analysis (loading and success paths already green)
- green (2/2): `src/app/query-input/page.tsx` now clears `analysisError` at run start and publishes the failure message in the `.catch` handler instead of only toasting → **3 passed**; batched `npx vitest run` over the 4 query-input files + 2 dashboard files → **6 files / 41 tests passed**
- verification: `npm test` → **23 files / 117 tests passed, 0 failed**; `npm run type-check` clean
- refactor: none
- commit: none (`--no-commit`)
- notes:
  - SQL-source parity is deliberate: `query-input`'s `sqlToAnalyze` (smart-editor → editor ref, `sql` → `rawSql`, else `resolvedSql`) and the dashboard's `sqlToReanalyze` now agree, so retry re-runs exactly what was analysed.
  - `SmartSQLEditor` intentionally does **not** publish `analysisError`: its analyses are internal comparison runs whose SQL never reaches the store, so a dashboard retry could only re-analyse an empty string. It keeps its own inline error UI, and the dashboard's disabled-retry guard covers the case if an error is ever set from that mode.
  - A throwaway probe (created, run, deleted) confirmed the real pipeline end to end: `analyzeSql` → `buildDashboardData` yields `normalizedScore 22 / LOW` for a real multi-join query, and reproduced `maxScorePossible 10 < rawScore 29` → `percentageOfMax 290`. That >100% value is the documented legacy dynamic-denominator defect (research.md R1) now confined to Advanced Details, so it is deliberately **not** clamped — clamping would hide the very artifact the normalized score exists to replace.

## Suite state after this session

- `npm test` → 23 test files passed, 117 tests passed, 0 failed (20.72s); `npm run type-check` clean.
- Baseline was 14 files / 72 tests: +9 files / +45 tests, zero regressions.
- US1 (Phase 3) is green: A1–A4 DONE, U27/U29/U35 DONE, U43 added and DONE.

## Lint state (input for T037)

- Every file this feature added or changed is lint-clean: `npx next lint --file …` over the 17 source/test files → **✔ No ESLint warnings or errors**. New files were formatted with `npx prettier --write` (prettier-only changes; suite re-run green afterwards).
- `npm run lint` still exits non-zero because of **pre-existing repo-wide debt** in files this feature never touched — e.g. `src/lib/sql/sqlAnalyzer.ts` (~20 prettier errors + a forbidden `require()`), `src/lib/sql/sqlFormatValidator.ts` (prettier + `no-misleading-character-class`), `src/components/auth/SignInPanel.tsx`, `src/app/sql-metrics-dashboard/components/MetricCardsGrid.tsx`.
- Three flagged lines sit in files this feature does modify but are **not** in its diff, so they were deliberately left alone rather than reformatted (minimal-change rule): `src/lib/store.ts:243,267`, `src/app/query-input/page.tsx:218` (prettier) and `page.tsx:19,22` (unused `parseMyBatisXml` / `SqlDialect` imports).
- Consequence: T037's `npm run lint` leg cannot go green from this feature alone. Clearing the repo-wide debt is a separate, unrelated cleanup and should be its own task rather than folded into this feature's diff.