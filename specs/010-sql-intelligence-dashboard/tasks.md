---
description: "Task list for SQL Intelligence Dashboard (TDD-bound by /speckit-tdd-plan)"
---

# Tasks: SQL Intelligence Dashboard

**Input**: Design documents from `/specs/010-sql-intelligence-dashboard/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, tdd/test-list.md

**Tests**: MANDATORY for this feature. Bound by `/speckit-tdd-plan` and the constitution's testing standard (Vitest unit + integration tests for all new logic and components). Every behavioral task carries its behavior id in brackets — `[A#]` / `[U#]` — against `tdd/test-list.md`; `/speckit-tdd-run` ticks a checkbox only when it can read a behavior id from the task, and `/speckit-implement` implements only what is still unticked. Every test MUST be observed failing (red) before its implementation task starts.

**Organization**: Tasks grouped by user story (independent implementation/testing per story); within each group, test tasks precede the implementation tasks for the same behaviors; characterization tasks run before anything changes the code they cover.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Behavior markers `[A#]`/`[U#]` reference `tdd/test-list.md`

## Phase 1: Setup (Characterization Baselines + Fixtures)

**Purpose**: Capture today's behavior of the code this feature will change, and build the shared test fixtures. Characterization tests must be green against untouched code before any change.

- [x] T001 [P] [U1] [U2] Characterization test: current complexityScorer raw scoring (weight-matrix subtotal conservation) and linting pass in `tests/unit/complexityScorer.baseline.test.ts` — must pass against untouched code
- [x] T002 [P] [U26] Characterization test: current MetricsDashboardContent section order, CTE navigation button and empty state in `tests/unit/sqlMetricsDashboard.baseline.test.tsx` — must pass against untouched code
- [x] T003 [P] [U39] Characterization test: current shared ComplexityDashboard score display in `tests/unit/complexitySurfaces.baseline.test.tsx` — must pass against untouched code
- [x] T004 [P] Create shared dashboard test fixtures in `tests/utils/dashboardFixtures.ts` (AnalysisResult samples: mixed-severity findings, contributors, CTEs with dependencies, MyBatis input mode, a 50-table sample, a minimal result without detailedComplexity)

**Checkpoint**: Baselines green; fixtures available for all later phases.

---

## Phase 2: Foundational (Score Contract + Adapter Layer — BLOCKS all user stories)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete — every dashboard section consumes these contracts.

- [x] T005 [U3] [U4] [U5] [U6] Test: normalized score mapping (0 → 0; monotonic, capped below 100) and level threshold boundaries (24/25, 54/55, 79/80) in `tests/unit/complexityNormalization.test.ts` — red first
- [x] T006 [U7] [U8] [U9] Test: history-independence of normalized score/level, empty-SQL scoring, and legacy dynamic fields remaining advanced-only in `tests/unit/complexityNormalization.test.ts` — red first
- [x] T007 Implementation: add normalization constants to `src/app/common/sqlAnalyzerUtils.ts` and the deterministic normalized score, fixed level thresholds and additive AnalysisResult fields in `src/lib/sql/complexityScorer.ts` + `src/lib/sql/sqlAnalyzer.ts` (the FR-008 data-contract fix at the analysis layer) — [U3] [U4] [U5] [U6] [U7] [U8] [U9]
- [x] T008 [U10] [U11] [U12] Test: capability resolution (query supported/partial map; non-query object types unsupported) in `tests/unit/dashboardCapability.test.ts` — red first
- [x] T009 Implementation: create `src/lib/sql/dashboard/capability.ts` — [U10] [U11] [U12]
- [x] T010 [U13] [U14] [U15] [U16] [U17] [U18] [U19] [U20] [U21] [U22] Test: buildDashboardData contract (health, findings grouping/order/actions, MyBatis merge, contributor ranking, determinism, missing detailedComplexity, metric coverage, tabs, genuine-zero vs unsupported) in `tests/unit/dashboardData.test.ts` — red first
- [x] T011 Implementation: create `src/lib/sql/dashboard/types.ts` + `src/lib/sql/dashboard/buildDashboardData.ts` — [U13]–[U22]
- [x] T012 [U23] [U24] [U25] Test: vi/en prompt builders for explainComplexity, explainFinding and optimizationOpportunities in `tests/unit/dashboardAiPrompts.test.ts` — red first
- [x] T013 Implementation: create `src/lib/sql/dashboard/aiPrompts.ts` — [U23] [U24] [U25]

**Checkpoint**: Score contract and adapter layer green; user story work can begin.

---

## Phase 3: User Story 1 — Trust the complexity verdict at a glance (Priority: P1) 🎯 MVP

**Goal**: One authoritative normalized score everywhere, with a compact health summary and proper dashboard states.
**Independent Test**: Analyze any statement; the dashboard's first viewport shows exactly one normalized score (X / 100 + level) with error/warning counts; raw score only as secondary detail.

- [x] T014 [A1] [A2] [A3] [A4] [U27] [U29] Test: health summary contents (one score + level + counts; raw secondary-only; no fabricated risk/maintainability; refresh on store update without reload) and loading/empty/error states in `tests/unit/sqlMetricsDashboard.test.tsx` — red first
- [x] T015 Implementation: create `src/app/sql-metrics-dashboard/components/AnalysisHealthSummary.tsx`; rewire `MetricsDashboardContent.tsx` (adapter-fed section order, skeleton/empty/error states) with new i18n keys in `src/locales/{en,vi}.ts` — [A1] [A2] [A3] [A4] [U27] [U29]
- [x] T016 [US1] Gate: acceptance behaviors [A1] [A2] [A3] [A4] green in the full suite before US1 is considered complete

**Checkpoint**: MVP delivers value — the state of any analyzed SQL is trustworthy at a glance.

---

## Phase 4: User Story 2 — See what matters first (Priority: P1)

**Goal**: Top findings immediately visible, ordered by the analyzer's actual severity, with real actions only.
**Independent Test**: Analyze a mixed-severity statement; the top findings area is visible without scrolling, errors before warnings, with occurrence counts and source locations.

- [ ] T017 [A5] [A6] [A7] [A8] [U30] [U31] Test: top findings visibility/order, occurrence counts and locations, real-actions-only, analyzer-exact severities in `tests/unit/sqlMetricsDashboard.test.tsx` — red first
- [ ] T018 Implementation: create `src/app/sql-metrics-dashboard/components/TopFindings.tsx` fed by the adapter's grouped findings — [A5] [A6] [A7] [A8] [U30] [U31]
- [ ] T019 [US2] Gate: acceptance behaviors [A5] [A6] [A7] [A8] green

---

## Phase 5: User Story 3 — Understand why the SQL is complex (Priority: P2)

**Goal**: Contributors ranked by actual contribution with the detailed breakdown.
**Independent Test**: Contributors ranked by points descending with shares consistent with the raw score shown in Advanced Details.

- [ ] T020 [A9] [A10] [A11] [A12] [U32] Test: contributor ranking, breakdown consistency, drill from a sourced row, no fabricated impact in `tests/unit/sqlMetricsDashboard.test.tsx` — red first
- [ ] T021 Implementation: create `src/app/sql-metrics-dashboard/components/TopComplexityContributors.tsx`; regroup `ComplexityFactorsBreakdown.tsx` under it — [A9] [A10] [A11] [A12] [U32]
- [ ] T022 [US3] Gate: acceptance behaviors [A9] [A10] [A11] [A12] green

---

## Phase 6: User Story 4 — Explore structure without noise (Priority: P2)

**Goal**: Grouped structural overview, capability-aware tabs, advanced details behind progressive disclosure.
**Independent Test**: All existing metrics still present but grouped; only supported tabs; unsupported sections show messages, never zeros.

- [ ] T023 [A13] [A14] [A15] [A16] [A17] [U28] [U33] [U35] Test: grouped metric coverage (zero regression), capability messaging, tab filtering, keyboard operability, advanced details disclosure in `tests/unit/sqlMetricsDashboard.test.tsx` — red first
- [ ] T024 Implementation: create `src/app/sql-metrics-dashboard/components/StructuralOverview.tsx`, `AnalysisTabs.tsx` (JOIN / CTE / Predicates / SELECT / Functions / Dependencies content from existing detail components) and `AdvancedDetails.tsx` — [A13] [A14] [A15] [A16] [A17] [U28] [U33] [U35]
- [ ] T025 [US4] Gate: acceptance behaviors [A13] [A14] [A15] [A16] [A17] green

---

## Phase 7: User Story 5 — Navigate from insight to source (Priority: P3)

**Goal**: Every meaningful number or finding reaches its source or detail in one step.
**Independent Test**: From a finding with a location, the SQL source is highlighted in at most one interaction; JOIN count opens JOIN analysis; a CTE opens the dependency graph.

- [ ] T026 [A18] [A19] [A20] [A21] [A22] [U34] Test: JOIN metric → JOIN tab, finding details, location → editor jump (`pendingEditorJump`), CTE → `/cte-analysis`, non-interactive for destination-less elements in `tests/unit/sqlMetricsDashboard.test.tsx` — red first
- [ ] T027 Implementation: wire drill-down in the dashboard components (editor jump, tab activation, `beginNavigation('/cte-analysis')`) — [A18] [A19] [A20] [A21] [A22] [U34]
- [ ] T028 [US5] Gate: acceptance behaviors [A18] [A19] [A20] [A21] [A22] green

---

## Phase 8: User Story 6 — Optional, clearly-labeled AI insight without risk (Priority: P3)

**Goal**: Labeled, grounded AI explanations and suggestions that never overwrite the developer's SQL.
**Independent Test**: With AI available, explanations are labeled and consistent with deterministic facts; with AI stopped, the whole deterministic dashboard still works.

- [ ] T029 [A23] [A24] [A25] [U36] [U37] [U38] Test: AI labeling/distinction, unavailable-state degradation, original-vs-suggested with compare/copy/apply-as-new-version (mocked `aiService` and history service; apply appends a new entry and never mutates the original) in `tests/unit/sqlMetricsDashboard.test.tsx` — red first
- [ ] T030 Implementation: create `src/app/sql-metrics-dashboard/components/AiInsights.tsx` calling `src/lib/ai/aiService.ts` via `src/lib/sql/dashboard/aiPrompts.ts`; apply-as-new-version appends a `QueryHistoryEntry` through `src/lib/queryHistory.ts` — [A23] [A24] [A25] [U36] [U37] [U38]
- [ ] T031 [US6] Gate: acceptance behaviors [A23] [A24] [A25] green

---

## Phase 9: User Story 7 — Use the dashboard in Vietnamese or English (Priority: P3)

**Goal**: Complete bilingual coverage with no hard-coded strings and untranslated SQL terms.
**Independent Test**: Switch vi ↔ en; every new label translates; SQL terms stay untranslated; English text renders completely.

- [ ] T032 [A26] [A27] [U41] [U42] Test: key completeness in both locales (typed schema), vi rendering with untranslated SQL terms, full English label rendering in `tests/unit/dashboardI18n.test.tsx` — red first
- [ ] T033 Implementation: complete all new dashboard keys in `src/locales/en.ts` and `src/locales/vi.ts`; remove any hard-coded strings from the new components — [A26] [A27] [U41] [U42]
- [ ] T034 [US7] Gate: acceptance behaviors [A26] [A27] green

---

## Phase 10: Polish (App-wide Surfaces + Final Validation)

**Purpose**: Normalize every remaining complexity surface and validate end to end.

- [ ] T035 [U40] Test: shared complexity surfaces (ComplexityDashboard, ComplexityBreakdown, guideline ScoreWeightTable context, smart-sql-editor comparison panels) show the normalized score with no dynamic denominator or >100% percentage in `tests/unit/complexitySurfaces.test.tsx` — red first
- [ ] T036 Implementation: update `src/components/ui/ComplexityDashboard.tsx`, `src/components/ui/ComplexityBreakdown.tsx`, the guideline ScoreWeightTable context and the smart-sql-editor comparison panels to the normalized score — [U40]
- [ ] T037 Run the full quickstart.md validation (8 manual end-to-end checks incl. the 50+ table performance check), plus `npm run type-check`, `npm run lint` and `npm test`
- [ ] T038 Final gate: all 27 acceptance behaviors [A1]–[A27] green and the full suite green before the feature is considered complete

---

## Dependencies & Execution Order

- **Phase 1 (Setup)**: no dependencies — start immediately; T001–T004 run in parallel.
- **Phase 2 (Foundational)**: depends on Phase 1; BLOCKS all user stories (score contract + adapter feed every section).
- **Phases 3–9 (User Stories)**: all depend on Phase 2; otherwise independent of each other — proceed in priority order (US1 → US2 → US3 → US4 → US5 → US6 → US7) or in parallel with separate staffing.
- **Phase 10 (Polish)**: depends on all user stories being complete.

### Within each user story

- The test task MUST be written and observed red before the implementation task starts.
- The gate task is checked only when that story's acceptance behaviors are green in the full suite.

### Parallel opportunities

- T001–T004 (different files); the seven user-story phases (different components) once Phase 2 is complete.

## Notes

- Behavior markers `[A#]`/`[U#]` are load-bearing: `/speckit-tdd-run` ticks a task only via its markers, so a behavioral task without one gets written twice.
- Characterization tasks (T001–T003) precede any task that changes the code they cover (T007, T015, T036).
- Parser-dependent tests may skip when `dt-sql-parser` is unavailable in the environment (regex fallback); a skip is not red or green evidence — see `tdd/test-list.md` and the stack profile.
- Manual validation legs (visual layout, viewport behavior, wall-clock performance) live in quickstart.md; they are not automated per the Out-of-scope section of `tdd/test-list.md`.

---

## Phase 11: TDD remediation (from tdd/verification.md — 2026-09-21)

> The verification verdict was **FAIL**: the feature is not done until the blocking gaps clear. The blocking gap — 42 behaviors with no test (all acceptance behaviors A1–A27 plus the remaining UI units) — is already tracked as T014–T038 and must be completed through the loop. The findings below are additional, ordered by severity.

- [ ] T039 [VERIFY-F1] Reconcile the T001–T003 ticks with the tick rule: either promote U1/U2/U26/U39 from BASELINE to DONE once their characterization tests are confirmed as the permanent regression net for the components they cover (T015/T036 change those components), or untick T001–T003 — decide once and record the decision in the test-list notes. Proof: test-list states and tasks.md checkboxes agree; `npm test` green.
- [ ] T040 [VERIFY-F2] Replace the self-derived level assertion at `tests/unit/complexityNormalization.test.ts:94` with an expectation computed independently from the fixed band table (not by calling `getNormalizedLevel`). Proof: `npx vitest run tests/unit/complexityNormalization.test.ts` green and the assertion no longer calls the function under test for its expected value.
- [ ] T041 [VERIFY-F3] Add the sum-of-shares ≈ 1 invariant (a value the adapter does not compute) to the U17 test in `tests/unit/dashboardData.test.ts`, alongside the existing pinned ratio. Proof: `npx vitest run tests/unit/dashboardData.test.ts` green.