---

description: "Task list for query analysis correctness, nested-subquery parsing, and output consistency"
---

# Tasks: Query Analysis Correctness & Output Consistency

**Input**: Design documents from `/specs/003-query-analysis-consistency/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: Required. The specification, constitution, and quickstart require Vitest unit/integration coverage, four-dialect regression coverage, AST cross-checks, source-line mapping tests, and a 50-table performance check.

**Organization**: Tasks are grouped by user story so each increment has an independent test path. All tasks are initially unchecked and use repository-relative file paths.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the regression and AST-test scaffolding before parser changes.

- [X] T001 Create or update `src/lib/sql/sqlAnalyzer.test.ts` with shared dialect fixtures for MySQL, PostgreSQL, SQL Server, and Oracle, plus helpers for extracting canonical tables, joins, CTEs, and subquery details.
- [X] T002 [P] Add an AST comparison helper in `src/lib/sql/sqlAnalyzer.test.ts` that invokes the installed `dt-sql-parser` APIs per dialect and reports unsupported grammar cases explicitly instead of silently skipping them.
- [X] T003 [P] Add a source-line fixture helper in `src/lib/sql/sqlAnalyzer.test.ts` that preserves comments, blank lines, and formatting in the original SQL while also producing the cleaned parser SQL expected by `analyzeSql`.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Lock the canonical analysis contract and historical regression baseline before user-story work.

- [X] T004 Define the canonical nested-subquery detail shape in `src/lib/sql/sqlAnalyzer.ts`, including `depth`, `sourceLine`, `parsedLine`, `type`, `body`, and `context`; keep `metricDetails.subqueries` as the single page-level source.
- [X] T005 Update `AnalysisResult.rawSql` construction in `src/lib/sql/sqlAnalyzer.ts` to retain the original editor SQL, while retaining cleaned SQL only for parser offsets and `parsedLine` calculations.
- [X] T006 [P] Add concise inline comments near nested-subquery extraction in `src/lib/sql/sqlAnalyzer.ts` covering depth semantics, dialect-specific behavior, source-line mapping, and known parser limitations.
- [X] T007 [P] Add baseline regression tests in `src/lib/sql/sqlAnalyzer.test.ts` for unaliased tables before JOINs, quoted/bracketed comma joins, derived tables, CTE edge deduplication, and JOINs ending at EOF or semicolon.
- [X] T008 Run `npm test` and `npx tsc --noEmit` against the baseline tests before changing extraction behavior; record any pre-existing test-only TypeScript resolution failures without weakening assertions.

**Checkpoint**: The canonical contract, original/cleaned SQL distinction, AST helper, and historical regression fixtures are in place.

## Phase 3: User Story 1 - Trustworthy Analysis Results (Priority: P1)

**Goal**: Correctly parse tables, relationships, CTE dependencies, and all specified nested-subquery forms across supported dialects.

**Independent Test**: Run the US1 parser test suite with representative four-dialect queries and confirm counts, depths, source lines, and AST comparisons.

- [X] T009 [P] [US1] Add parser tests in `src/lib/sql/sqlAnalyzer.test.ts` for scalar, `IN`, `EXISTS`, derived-table, and `LATERAL/APPLY` nested SELECT forms, including nested SELECTs inside CTE bodies.
- [X] T010 [P] [US1] Add depth tests in `src/lib/sql/sqlAnalyzer.test.ts` proving direct subqueries are depth 1, nested SELECTs increment depth, wrapper/function parentheses do not increment depth, and `metrics.subqueryDepth` equals the maximum detail depth.
- [X] T011 [P] [US1] Add source-coordinate tests in `src/lib/sql/sqlAnalyzer.test.ts` proving `sourceLine` points to the original SQL with comments/blank lines and `parsedLine` points to cleaned SQL.
- [X] T012 [P] [US1] Add four-dialect AST cross-check tests in `src/lib/sql/sqlAnalyzer.test.ts` for table, JOIN, CTE, and nested-SELECT boundaries; document every dialect grammar limitation in the test fixture.
- [X] T013 [US1] Refine nested-subquery scanning in `src/lib/sql/sqlAnalyzer.ts` to recognize all clarified forms, preserve depth semantics, and emit canonical `NestedSubquery` records with both line coordinates.
- [X] T014 [US1] Update subquery type/context inference in `src/lib/sql/sqlAnalyzer.ts` and `src/app/common/sqlAnalyzerUtils.ts` so scalar, IN, EXISTS, FROM, LATERAL, and APPLY details use stable labels across dialects.
- [X] T015 [US1] Populate `metricDetails.subqueries` from the single extracted collection in `src/lib/sql/sqlAnalyzer.ts`, set `metrics.subqueryCount` to its length, and set `metrics.subqueryDepth` to its maximum depth or zero.
- [X] T016 [US1] Preserve derived subquery graph nodes and deduplicate their relationships in `src/lib/sql/sqlAnalyzer.ts`, ensuring dual representation does not create duplicate `JoinEdge` records.
- [X] T017 [US1] Re-run the baseline and US1 test suites with `npm test` and `npx tsc --noEmit`; fix parser root causes without relaxing regression or AST assertions.

**Checkpoint**: US1 produces correct canonical parser facts and is independently verified across dialects and subquery forms.

## Phase 4: User Story 2 - Consistent Dashboard and Navigation Output (Priority: P1)

**Goal**: Metrics Dashboard, Graph Visualizer, CTE Analysis, and Smart Editor navigation consume one canonical result with consistent labels and no stale data.

**Independent Test**: Analyze one query containing all supported subquery forms, compare all page counts/details, activate every source-line detail, then re-analyze a second query without reload.

- [X] T018 [P] [US2] Update `src/app/sql-metrics-dashboard/components/NestedSubqueryAnalysis.tsx` to read `analysisResult.metricDetails.subqueries`, display total count, maximum depth, per-item depth/type, and both source-coordinate values.
- [X] T019 [P] [US2] Update `src/app/sql-metrics-dashboard/components/MetricCardsGrid.tsx` and `src/app/sql-metrics-dashboard/components/MetricsBarChart.tsx` to keep subquery count/depth labels tied to canonical metrics and avoid independent recomputation.
- [X] T020 [P] [US2] Add or update localized labels in `src/locales/en.ts` and `src/locales/vi.ts` for source line, parsed line, subquery type, maximum depth, and canonical relationship terminology.
- [X] T021 [US2] Wire `src/app/sql-metrics-dashboard/components/NestedSubqueryAnalysis.tsx` through `src/lib/useGoToSqlLine.ts` so clicks use `sourceLine` and highlight the matching line in the Smart SQL Editor without a page reload.
- [X] T022 [P] [US2] Audit `src/app/relationship-graph-visualizer/components/*.tsx` and `src/app/cte-analysis/components/*.tsx` to confirm table, relationship, and CTE counts come from canonical `analysisResult` fields and derived subquery nodes do not alter displayed relationship totals.
- [X] T023 [US2] Update `src/app/sql-metrics-dashboard/components/NestedSubqueryAnalysis.tsx` and any compatibility path using `structuralReport.subqueries` so it reads the canonical `metricDetails.subqueries` collection only, with any legacy field treated as a derived alias.
- [X] T024 [US2] Add an integration-style test in `src/lib/sql/analysisResultConsistency.test.ts` covering canonical table, relationship, CTE, subquery count, depth, and source-line values consumed by all analysis pages.
- [X] T025 [US2] Verify `setAnalysisResult` in `src/lib/store.ts` fully replaces prior analysis and add a regression test for re-analysis while a previous result is displayed, ensuring no stale counts or details remain.
- [ ] T026 [US2] Perform the manual cross-page and Smart Editor jump validation from `specs/003-query-analysis-consistency/quickstart.md` using representative queries with comments, blank lines, derived tables, and nested CTE subqueries.

**Checkpoint**: US2 has one canonical display contract, consistent terminology, accurate source-line navigation, and no stale cross-page state.

## Phase 5: User Story 3 - Clear Edge-Case and Invalid-Input Feedback (Priority: P2)

**Goal**: Empty, malformed, dialect-mismatched, zero-relationship, and overlapping analyses produce distinct, non-crashing outcomes.

**Independent Test**: Submit each edge-case query through `/query-input` and confirm the expected message, state transition, and absence of partial results.

- [X] T027 [P] [US3] Add validation tests in `src/lib/sql/sqlFormatValidator.test.ts` and `src/lib/sql/dialectValidator.test.ts` for empty input, wrapping quotes, invisible characters, curly quotes, and detected-vs-selected dialect mismatch.
- [X] T028 [P] [US3] Add malformed-input tests in `src/lib/sql/sqlAnalyzer.test.ts` and `src/app/query-input/page.tsx` coverage notes proving parse failure cannot store a partial `analysisResult` and is distinct from a valid zero-subquery/zero-relationship result.
- [X] T029 [US3] Add an analysis-run guard or cancellation test around `src/app/query-input/page.tsx` and `src/lib/store.ts` so overlapping Analyze actions cannot blend results or leave an older result visible after the newer run completes.
- [X] T030 [US3] Verify and, only if needed, improve zero-state rendering in `src/app/sql-metrics-dashboard/components/ReferencedTablesTable.tsx`, `src/app/relationship-graph-visualizer/`, and `src/app/cte-analysis/components/CTEAnalysisContent.tsx` so valid zero values are not presented as errors.
- [ ] T031 [US3] Run the manual edge-case validation in `specs/003-query-analysis-consistency/quickstart.md` and capture expected behavior for empty, malformed, dialect-mismatched, and simple valid queries.

**Checkpoint**: US3 has distinct validation/error/zero-state behavior and safe overlapping-analysis handling.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify performance, documentation, type safety, and full regression coverage.

- [X] T032 [P] Add or update the 50+ table performance test in `src/lib/sql/sqlAnalyzer.test.ts`, asserting analysis and relationship graph data complete within 1 second.
- [X] T033 [P] Add parser limitation and dialect behavior notes to `src/lib/sql/sqlAnalyzer.ts` and `src/app/common/sqlAnalyzerUtils.ts` inline comments where the implementation has non-obvious boundaries.
- [X] T034 Run the full suite with `npm test` and type checking with `npx tsc --noEmit`; confirm all existing and new tests pass, recording only known pre-existing test-type resolution issues.
- [ ] T035 Execute all seven scenarios plus the nested-subquery scenario from `specs/003-query-analysis-consistency/quickstart.md` and confirm SC-001 through SC-005 and SC-002a are satisfied.

## Phase 7: User Story 2 Extension - Complexity Factors Breakdown (Priority: P1)

**Purpose**: Complete the chart-specific correctness and completeness work defined in the updated plan and data model.

**Independent Test**: Analyze a large CTE/JOIN/subquery query and a simple zero-factor query; confirm the chart and gauge reconcile, labels are localized, and no factor is omitted or double-counted.

- [X] T036 [P] [US2] Add `src/lib/sql/complexityScorer.test.ts` coverage proving displayed factor contributions reconcile to `DetailedComplexityScore.totalScore`, including JOIN, CTE, subquery, SELECT-field, and window-function factors.
- [X] T037 [P] [US2] Add zero-factor and wrapper-parenthesis cases to `src/lib/sql/complexityScorer.test.ts`, asserting zero-safe percentage behavior and subquery count agreement with `analysisResult.metrics.subqueryCount`.
- [X] T038 [US2] Update `src/app/sql-metrics-dashboard/components/ComplexityFactorsBreakdown.tsx` to display total score, maximum score, percentage of maximum, formula/count, raw contribution, and normalized percentage for every factor.
- [X] T039 [US2] Add localized keyword-category mappings in `src/locales/en.ts` and `src/locales/vi.ts`, and update `src/app/sql-metrics-dashboard/components/ComplexityFactorsBreakdown.tsx` so keys such as `GROUP_BY`, `INNER_JOIN`, and `WITH_CTE` are not shown as raw labels.
- [X] T040 [US2] Reconcile JOIN display data in `src/lib/sql/complexityScorer.ts` and `src/app/sql-metrics-dashboard/components/ComplexityFactorsBreakdown.tsx` so JOIN contribution appears exactly once and the dedicated `scoreBreakdown.joins` field is used only as a consistency check.
- [X] T041 [US2] Add a canonical subquery consistency assertion between `src/lib/sql/complexityScorer.ts`, `src/lib/sql/sqlAnalyzer.ts`, and `src/app/sql-metrics-dashboard/components/ComplexityFactorsBreakdown.tsx`; weighted complexity may differ, but the displayed subquery count must match parser facts.
- [X] T042 [US2] Replace the `as any` CSS containment cast in `src/app/sql-metrics-dashboard/components/ComplexityFactorsBreakdown.tsx` with a type-safe style declaration or a documented, justified alternative.
- [ ] T043 [US2] Perform the Complexity Factors Breakdown manual validation in `specs/003-query-analysis-consistency/quickstart.md`, including a large CTE/JOIN query and a simple zero-factor query.

## Dependencies & Execution Order

- Phase 1 must complete before Phase 2 because tests need shared fixtures and AST helpers.
- Phase 2 blocks all user stories because the canonical contract and regression baseline must be stable first.
- US1 should complete before US2 because dashboard integration depends on the finalized nested-subquery collection, although US2 consumer audits can begin after T007.
- US3 can proceed in parallel with US2 after Phase 2 because it targets validation and run-state handling, not the parser detail UI.
- Phase 6 depends on US1, US2, and US3.
- Phase 7 depends on the completed canonical score and metric contracts from US1 and US2, and is the final chart-specific completion gate.

```text
Phase 1 → Phase 2 → US1 → US2 → Phase 6
                   └──→ US3 ──┘
```

## Parallel Execution Examples

Within Phase 1: `T002`, `T003` can run in parallel after `T001`.

Within Phase 2: `T006` and `T007` can run in parallel after the contract tasks `T004` and `T005`.

Within US1: `T009`, `T010`, `T011`, and `T012` can run in parallel before parser implementation `T013`.

Within US2: `T018`, `T019`, `T020`, and `T022` can run in parallel after `T015`; `T021`, `T023`, and `T024` depend on the canonical collection wiring.

Within US3: `T027`, `T028`, and `T030` can run in parallel; `T029` depends on the observed run-state behavior.

## Implementation Strategy

**MVP**: Phase 1 + Phase 2 + US1. This delivers correct, tested parser output for all clarified subquery forms and preserves the graph representation.

**Increment 2**: US2. This makes the Metrics Dashboard, Graph Visualizer, CTE Analysis, Smart Editor navigation, and Complexity Factors Breakdown consume canonical results consistently.

**Increment 3**: US3 + Phase 6. This completes invalid-input handling, concurrency protection, performance verification, and full sign-off.
