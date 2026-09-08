# Phase 0 Research: Query Analysis Correctness & Output Consistency

## R1: Current cross-page count sourcing (verified via code audit)

- **Decision**: All three consumer pages already read counts from the single
  `analysisResult` object (`tables.length`, `ctes.length`, `metrics.totalJoinCount`)
  rather than recomputing their own aggregates. No page currently derives an
  independent count from raw SQL or a separate calculation.
- **Rationale**: Confirmed by direct grep audit:
  - `sql-metrics-dashboard`: `MetricCardsGrid.tsx`/`MetricsBarChart.tsx` read
    `metrics.totalJoinCount`; `ReferencedTablesOverview.tsx`/`ReferencedTablesTable.tsx`
    read `tables.length` directly.
  - `relationship-graph-visualizer`: `GraphVisualizerContent.tsx` reads
    `analysisResult.metrics.totalJoinCount` for the "all" filter state and
    `filteredJoins.length` only when the user has applied a relationship-type filter
    (an intentional, clearly-labeled subset, not an inconsistency).
  - `cte-analysis`: `CTEAnalysisContent.tsx`/`CTECard.tsx` read `ctes.length` and
    `cte.tables.length` (per-CTE table count, a different metric by design, not a
    duplicate of the global table count).
- **Implication for FR-003/FR-004**: The consistency requirement is already
  structurally satisfied today. The actual risk is not divergent count *sourcing* but
  divergent count *correctness* — if `metrics.totalJoinCount`/`tables.length` are
  wrong at the source (`analyzeSql`), every page reproduces the same wrong number
  consistently. Work should focus on correctness of extraction (US1), with FR-003/
  FR-004 enforced as a regression guard (tests asserting all three pages render the
  same numbers for one analyzed query) rather than a rewrite of page logic.
- **Alternatives considered**: Introducing a shared `useAnalysisSummary()` hook to
  centralize count derivation was considered, but rejected as unnecessary — there is
  no current divergence to fix structurally; adding an abstraction layer here would
  be over-engineering for a problem that doesn't exist yet in the codebase.

## R2: Known historical correctness defects (from prior fixes, still relevant as regression baselines)

- **Decision**: Treat the following previously-fixed bug classes as the required
  regression test matrix for FR-001/FR-002/FR-012, since each was a real, shipped
  defect in this exact analyzer:
  1. Unaliased table immediately followed by another `JOIN` keyword being swallowed
     as a fake alias (`TABLE_PATTERN` reserved-keyword exclusion).
  2. Comma-style joins with multi-segment quoted/bracketed names
     (`[MyDb].[dbo].[Customers]`, `"public"."orders"`) truncated to their first
     segment, causing table collisions/drops.
  3. Derived tables (subquery-as-table) not registered as `TableNode`s, causing
     misattributed JOIN edges.
  4. CTE pairs connected by both a real JOIN and an implicit reference being
     double-counted in `metrics.totalJoinCount` / `buildGraphJoins`.
  5. JOIN terminator lookahead requiring `\s+` instead of `\s*`, dropping a query's
     final JOIN when it ended at EOF or immediately before `;`.
- **Rationale**: These are documented, verified-fixed defects (see repo memory
  `sql-visualizer-architecture.md`); a regression suite covering each ensures FR-012
  ("MUST NOT change the previously-correct behavior") is enforced going forward, and
  gives concrete, non-speculative acceptance tests for US1.
- **Alternatives considered**: Writing entirely new synthetic edge cases without
  anchoring to known-fixed bugs was considered, but anchoring to real historical
  defects is more valuable — it directly protects against regressions of bugs that
  have already bitten this codebase once.

## R3: AST cross-check availability (`dt-sql-parser`)

- **Decision**: Use `dt-sql-parser` as a secondary verification signal in tests only
  (not a runtime gate) for the regression matrix in R2 — i.e., for each regression
  fixture, assert the regex-based `analyzeSql` table/JOIN count is consistent with
  what an AST parse of the same fixture would produce, where the dialect's grammar
  in `dt-sql-parser` supports the construct.
- **Rationale**: Constitution Principle I requires dual regex+AST cross-checks;
  `dt-sql-parser` is already a project dependency used elsewhere for dialect
  validation (`validateSqlDialect`). Using it as a test-time oracle (rather than
  adding a new runtime AST-parse path into `analyzeSql`, which would be a much larger
  change) satisfies the constitutional requirement without expanding scope beyond
  what this feature's spec calls for.
- **Alternatives considered**: Making `analyzeSql` call `dt-sql-parser` at runtime for
  every analysis was rejected as out of scope — the spec only requires *outputs* to
  be correct and consistent, not a new dual-engine runtime architecture; that would
  be a separate, much larger feature.

## R4: Performance regression risk

- **Decision**: No performance-sensitive rewrite is planned; fixes are targeted regex/
  extraction corrections, not algorithmic changes. Existing 1-second/50-table budget
  (constitution Quality Standards) remains the acceptance bar, verified by an existing
  or new benchmark-style test using a generated 50+ table query.
- **Rationale**: Regex fixes (adding lookahead exclusions, paren-depth-aware scanning
  already exist as prior art) are O(n) style changes, not complexity-class changes.
- **Alternatives considered**: N/A — no alternative approach needed since this is a
  non-issue given the scope of planned fixes.

**Output**: All NEEDS CLARIFICATION items from Technical Context resolved (none were
present — Technical Context was fully determinable from the existing codebase).
