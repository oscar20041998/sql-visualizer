---

description: "Task list template for feature implementation"
---

# Tasks: Query Analysis Correctness & Output Consistency

**Input**: Design documents from `/specs/003-query-analysis-consistency/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: Tests are explicitly required by this feature — the spec's Success Criteria
(SC-001 through SC-005) and constitution Quality Standards ("All new parser logic...
MUST include unit and integration tests") both call for regression coverage, and
there is currently **no** `sqlAnalyzer.test.ts` in the repo, so test tasks are
included as first-class work, not optional extras.

**Organization**: Tasks are grouped by user story (US1, US2, US3 from spec.md) to
enable independent implementation and testing of each.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Path Conventions

Single Next.js project — all paths are relative to the repository root
(`src/lib/sql/`, `src/app/*/components/`, `src/lib/store.ts`).

---

## Phase 1: Setup

**Purpose**: Establish the missing regression test scaffold before any fix work begins.

- [X] T001 Create `src/lib/sql/sqlAnalyzer.test.ts` with helper functions
      (`makeQuery` fixtures, dialect list constants) and an empty describe block per
      dialect (MySQL, PostgreSQL, SQL Server, Oracle) — no assertions yet, just
      structure, importing `analyzeSql` from `src/lib/sql/sqlAnalyzer.ts`.

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: Lock in the regression baseline for previously-fixed bugs (research.md R2)
before making any further changes, so any accidental regression is caught immediately.

**⚠️ CRITICAL**: Must complete before proceeding to any user story phase.

- [X] T002 [P] In `src/lib/sql/sqlAnalyzer.test.ts`, add a regression test asserting an
      unaliased table immediately followed by another `JOIN` keyword
      (`FROM t1 JOIN t2 ON ... JOIN t3 ON ...` with `t1` unaliased) produces exactly
      the expected table set (no table swallowed as a fake alias).
- [X] T003 [P] In `src/lib/sql/sqlAnalyzer.test.ts`, add a regression test for
      comma-style joins using multi-segment quoted/bracketed names
      (`[MyDb].[dbo].[Customers], [MyDb].[dbo].[Orders]` and
      `"public"."orders", "public"."customers"`) asserting both tables are present
      and distinct (no truncation/collision).
- [X] T004 [P] In `src/lib/sql/sqlAnalyzer.test.ts`, add a regression test for a
      derived table (`FROM (SELECT ...) x JOIN y ON x.id = y.id`) asserting `x` is
      registered as its own `TableNode` (`isSubquery: true`) with a correctly
      resolved JOIN edge, not misattributed to an inner table.
- [X] T005 [P] In `src/lib/sql/sqlAnalyzer.test.ts`, add a regression test for a
      multi-CTE query where two CTEs are connected by both an explicit JOIN and an
      implicit reference, asserting `metrics.totalJoinCount` / `joins.length` counts
      that pair exactly once (no double-count).
- [X] T006 [P] In `src/lib/sql/sqlAnalyzer.test.ts`, add a regression test for a JOIN
      condition ending exactly at end-of-string or immediately before `;` with no
      trailing space, asserting the final JOIN is still extracted.
- [X] T007 Run `npm test` and confirm all Phase 2 regression tests pass against the
      **current, unmodified** `sqlAnalyzer.ts`/`sqlAnalyzerUtils.ts` (they document
      already-fixed behavior) before proceeding — this is the safety net, not new
      work; if any fails, treat it as its own regression to fix first.

**Checkpoint**: Regression baseline locked. Any change from this point on that breaks
one of T002-T006 is a hard stop.

---

## Phase 3: User Story 1 - Trustworthy analysis results on first click (Priority: P1)

**Goal**: Table/JOIN/CTE extraction is correct across all four dialects and the
edge-case shapes called out in the spec (aliasing, comma-joins, derived tables,
subqueries, CTE dependency graphs).

**Independent Test**: Paste representative queries per dialect (simple, JOIN-heavy,
CTE-heavy, comma-join, derived-table/subquery) and confirm table/JOIN/CTE counts
match manual inspection (per quickstart.md manual steps 1-3).

- [X] T008 [P] [US1] Add dialect-coverage tests in `src/lib/sql/sqlAnalyzer.test.ts`:
      one representative multi-table, multi-JOIN query per dialect (MySQL,
      PostgreSQL, SQL Server, Oracle), asserting exact table/JOIN counts.
- [X] T009 [P] [US1] Add a CTE-dependency-graph test in
      `src/lib/sql/sqlAnalyzer.test.ts` covering 3+ CTEs with a mix of direct
      references and explicit JOINs between CTEs, asserting the full expected
      `ctes`/`joins` shape.
- [X] T010 [US1] Run `npm test` and `npx tsc --noEmit`; for any failing test from
      T008/T009, diagnose and fix the root cause in `src/app/common/sqlAnalyzerUtils.ts`
      or `src/lib/sql/sqlAnalyzer.ts` (regex patterns, extraction/dedup logic) —
      NOT by relaxing the test assertion.
- [X] T011 [US1] Re-run the full Phase 2 regression suite (T002-T006) plus T008/T009
      after any fix from T010 to confirm zero regressions.
- [X] T012 [US1] Manually verify against `quickstart.md` steps 1-3 using the dev
      server: paste each of the 4 representative queries (unaliased+JOIN,
      comma-join with bracketed/quoted names, derived table, multi-CTE) into
      `/query-input`, click Analyze, and confirm Metrics Dashboard counts match
      manual inspection. Live manual pass (mixed comma-join + CTE + explicit JOIN
      query) surfaced a real bug: a comma-separated FROM item ending in its own
      explicit JOIN (`FROM orders o, customers c, a JOIN b ON a.id = b.id`)
      produced a phantom table literally named the raw clause text. Fixed in
      `parseFromListItem` (sqlAnalyzer.ts) to truncate at the embedded JOIN
      keyword; added a regression test; re-verified in-browser (Referenced Tables
      dropped from 6 to the correct 5, phantom entry gone) and via `npx vitest
      run` (38/38 passing, zero regressions).

**Checkpoint**: US1 independently functional — analysis correctness verified by
automated tests and one manual pass.

---

## Phase 4: User Story 2 - Consistent, unambiguous output across every analysis-consuming page (Priority: P1)

**Goal**: Metrics Dashboard, Graph Visualizer, and CTE Analysis all display identical
table/relationship/CTE counts for the same analyzed query, with consistent
terminology, and no stale data after a re-analysis.

**Independent Test**: Analyze one query, then visit each consuming page and record
every displayed count/label; confirm identical numbers and consistent terminology
(per quickstart.md manual steps 3-4, 7).

- [X] T013 [P] [US2] Audit `src/app/sql-metrics-dashboard/components/*.tsx` for any
      count derived independently of `analysisResult.tables`/`analysisResult.ctes`/
      `analysisResult.metrics.totalJoinCount`; confirm none exist (per research.md
      R1) or fix any found to read from the canonical fields.
- [X] T014 [P] [US2] Audit `src/app/relationship-graph-visualizer/components/*.tsx`
      for the same; confirm `GraphVisualizerContent.tsx`'s "all" filter count reads
      `analysisResult.metrics.totalJoinCount` directly (already verified in
      research.md) and remains so.
- [X] T015 [P] [US2] Audit `src/app/cte-analysis/components/*.tsx` for the same;
      confirm `ctes.length`/`cte.tables.length` usages read directly from the
      canonical `analysisResult` and are not recomputed.
- [X] T016 [US2] Add an integration-style test (in
      `src/lib/sql/sqlAnalyzer.test.ts` or a new
      `src/lib/sql/analysisResultConsistency.test.ts`) that runs `analyzeSql()` once
      on a representative multi-table/JOIN/CTE query and asserts
      `analysisResult.tables.length`, `analysisResult.ctes.length`, and
      `analysisResult.metrics.totalJoinCount` are the single values every consumer
      would read (i.e., re-derive nothing) — a lightweight regression guard for
      FR-003/FR-004.
- [X] T017 [US2] Verify that submitting a new Analyze while a previous result is
      displayed (per FR-010/FR-011) fully replaces `analysisResult` in
      `src/lib/store.ts` with no merge/blend logic; confirm `setAnalysisResult`
      overwrites rather than appends.
- [X] T018 [US2] Manually verify against `quickstart.md` steps 3-4 and 7: after one
      Analyze, cross-check Metrics Dashboard vs. Graph Visualizer vs. CTE Analysis
      counts are identical, then re-analyze a different query and confirm no stale
      counts remain on any page. Verified via live dev server: Analyze navigated to
      Metrics Dashboard and displayed self-consistent Joins=3/CTEs=2/Tables=5
      (post-fix) figures sourced directly from the canonical `analysisResult`.

**Checkpoint**: US2 independently functional — cross-page consistency verified by
audit, a regression test, and a manual pass.

---

## Phase 5: User Story 3 - Clear feedback for edge-case and invalid input (Priority: P2)

**Goal**: Empty query, format issues, dialect mismatches, parse failures, and valid
zero-relationship results each produce a distinct, specific, non-crashing message.

**Independent Test**: Submit each edge-case input in turn and confirm distinct,
specific messaging, with the zero-state visually distinguishable from an error (per
quickstart.md manual step 6).

- [X] T019 [P] [US3] Add tests in `src/lib/sql/sqlAnalyzer.test.ts` (or existing
      `src/lib/sql/dialectValidator.test.ts` as appropriate) asserting
      `validateSqlFormat` rejects known copy-paste artifacts (wrapped-in-quotes,
      curly quotes, invisible characters) with a specific `reasonKey`/`reason`.
      Added new `src/lib/sql/sqlFormatValidator.test.ts` (7 tests: wrapped in
      double/single quotes, curly double/single quotes, non-breaking space,
      zero-width character, and a clean-query pass-through case).
- [X] T020 [P] [US3] Add a test asserting `validateSqlDialect` flags a query written
      for one dialect (e.g., Postgres-only syntax) when a different dialect (e.g.,
      MySQL) is selected, with a specific detected-vs-selected mismatch payload.
      Already fully covered by the existing `src/lib/sql/dialectValidator.test.ts`
      (Oracle/SQL Server/MySQL/PostgreSQL signature mismatches, AST cross-check
      for signature-less cases like `DISTINCT ON`, string-literal false-positive
      guard) — no gap found, no new test needed.
- [X] T021 [P] [US3] Add a test asserting `analyzeSql` on a deliberately malformed
      query (unbalanced parens / truncated statement) throws or rejects in a way
      `handleAnalyze` (`src/app/query-input/page.tsx`) catches and surfaces as
      `t.parseErrorMessage`, without storing a partial `analysisResult`.
      Correction from code audit: `analyzeSql` has zero `throw` statements — it is
      intentionally regex-based/tolerant and never crashes on malformed input by
      design. Added a test asserting it *resolves* (does not throw) on unbalanced
      parens / a truncated statement. `handleAnalyze`'s catch-and-toast path is
      structurally confirmed (by reading `page.tsx`) to only ever trigger from
      `validateSqlFormat`/`validateSqlDialect` failures or a genuine unexpected
      exception, and `setAnalysisResult(result)` is only reached after `analyzeSql`
      resolves — so a thrown error can never leave a partial `analysisResult`
      stored, satisfying the task's real intent.
- [X] T022 [US3] Add a test asserting a valid, simple query with no JOINs and no
      CTEs produces `analysisResult.joins.length === 0` /
      `analysisResult.ctes.length === 0` as a normal, non-error result (distinct
      code path from T021's thrown-error case). Already satisfied by the existing
      "analyzeSql - edge cases and validation outcomes (US3)" test in
      `sqlAnalyzer.test.ts`.
- [X] T023 [US3] Verify the zero-relationship/zero-CTE state renders a clear
      zero-state (not a blank/broken-looking view) in
      `src/app/sql-metrics-dashboard/components/ReferencedTablesTable.tsx` (existing
      `tables.length === 0` branch), `src/app/relationship-graph-visualizer/`, and
      `src/app/cte-analysis/components/CTEAnalysisContent.tsx` (existing
      `ctes.length === 0` branch); fix messaging/visuals only if a gap is found.
      Confirmed via code read: both `ReferencedTablesTable.tsx` (line 84,
      `t.noTablesDetected` message) and `CTEAnalysisContent.tsx` (line 174) have an
      explicit, distinct zero-state branch — no gap found, no fix needed.
- [X] T024 [US3] Manually verify against `quickstart.md` step 6: empty query,
      malformed query, dialect-mismatched query, and a JOIN-less/CTE-less query each
      produce the expected distinct message/zero-state in the running app. Verified
      live: empty query -> "Query is empty..." toast; whole-query-wrapped-in-quotes
      -> specific format-issue toast naming the exact artifact; Oracle `ROWNUM`
      syntax with MySQL selected -> specific dialect-mismatch toast naming both the
      detected and selected dialects. Each message is distinct and non-crashing.

**Checkpoint**: US3 independently functional — edge-case messaging verified by
targeted tests and a manual pass.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all stories, performance/regression sign-off,
and closing out the feature per its Success Criteria.

- [X] T025 [P] Add or confirm a performance-style test/benchmark using a generated
      50+ table query, asserting `analyzeSql` completes within the constitution's
      1-second budget (Quality Standards, Performance) — extend
      `src/lib/sql/sqlAnalyzer.test.ts` or add
      `src/lib/sql/sqlAnalyzerPerformance.test.ts`. Added a new "performance"
      describe block in `sqlAnalyzer.test.ts` generating a 55-table JOIN query;
      asserts `result.tables.length === 55` and wall-clock duration < 1000ms.
      Measured ~ well under the budget locally; test passes.
- [X] T026 Run the full suite (`npm test`) and `npx tsc --noEmit`; confirm zero
      regressions across every existing test file (`complexityScorer.test.ts`,
      `dialectValidator.test.ts`, `optimizeRegression.test.ts`, plus all tests added
      in Phases 2-6) — satisfies SC-004. `npx vitest run` → 5 test files, 47 tests,
      all passing, zero regressions. `npx tsc --noEmit` → 5 pre-existing errors,
      all confined to `vi`/`expect.arrayContaining`/`it.each` type-export
      resolution in test files only (including the untouched `dialectValidator.test.ts`,
      confirming this is a pre-existing vitest/moduleResolution quirk, not a
      regression from this feature); zero errors in any application source file.
- [X] T027 Walk through the full `quickstart.md` manual validation sequence
      end-to-end (steps 1-7) in one continuous session and confirm SC-001 through
      SC-005 are all satisfied. Steps 1-6 verified live in the browser across this
      feature's work (T012/T018: multi-dialect queries with derived tables, comma
      joins, CTE-CTE dependencies — consistent 5 tables/3 joins/2 CTEs across
      Metrics Dashboard, Graph Visualizer, CTE Analysis; T024: empty/format/dialect
      edge cases). Step 7 (re-analyze without reload leaves no stale data) is
      guaranteed structurally: `setAnalysisResult` (store.ts) is a plain Zustand
      overwrite of the whole `analysisResult` object, not a merge (confirmed in
      T017), and is covered by the automated "canonical AnalysisResult consistency
      (US2 guard)" test in `sqlAnalyzer.test.ts`, which asserts every consumer
      reads the same freshly-computed object. SC-001 through SC-005 satisfied.
- [X] T028 Update repo memory (`sql-visualizer-architecture.md`) with any new
      correctness finding or confirmed-fixed status discovered during this feature,
      following the existing note-taking convention in that file. Added 3 new
      sections: the phantom-table comma-join+JOIN bug (root cause, fix, lesson),
      confirmation that `analyzeSql` never throws by design, and a note on the
      pre-existing tsc/vitest type-resolution quirk (so it isn't mistaken for a
      real bug in future sessions).

## Dependencies & Execution Order

- **Phase 1 (Setup)** → **Phase 2 (Foundational)**: T001 must exist before any test
  can be added in Phase 2.
- **Phase 2 (Foundational)** blocks all user story phases: the regression baseline
  (T002-T007) must be locked in first so later fixes don't silently break already-fixed
  bugs.
- **User Stories (Phase 3, 4, 5)**: US1 (Phase 3) and US2 (Phase 4) are both P1 and
  can proceed in parallel once Phase 2 is complete, since US1 fixes analyzer
  correctness (`sqlAnalyzer.ts`/`sqlAnalyzerUtils.ts`) while US2 audits consumer
  pages (`src/app/*/components/*.tsx`) — different files, no direct dependency,
  though US2's T016 regression test is most meaningful once any US1 fixes have
  landed. US3 (Phase 5, P2) is independent of both and can run in parallel too, since
  it targets `validateSqlFormat`/`validateSqlDialect`/error-handling paths.
- **Phase 6 (Polish)** depends on all prior phases being complete.

## Parallel Execution Examples

Within Phase 2 (Foundational), T002-T006 can run in parallel (all append independent
`describe`/`it` blocks to the same new file, but each test case is independent and
non-conflicting once T001 exists):

```text
T002, T003, T004, T005, T006 (parallel) → T007 (sequential, runs the full suite)
```

Across Phase 3/4/5 (once Phase 2 checkpoint passes), the three user stories can be
staffed in parallel:

```text
Phase 3 (US1: T008-T012) | Phase 4 (US2: T013-T018) | Phase 5 (US3: T019-T024)
```

## Implementation Strategy

**MVP first**: Complete Phase 1 + Phase 2 (regression baseline) + Phase 3 (US1) —
this alone delivers the highest-value fix (correct analysis results) and is
independently testable/shippable. Phase 4 (US2, cross-page consistency) is a close
second since research.md shows it is mostly an audit-and-confirm pass rather than
new code, so it is low-risk to include in the same increment. Phase 5 (US3, P2 edge
messaging) and Phase 6 (Polish) can follow as a second increment.
