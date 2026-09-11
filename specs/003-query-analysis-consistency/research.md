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

- **Decision**: Use `dt-sql-parser` as a mandatory test-time verification signal (not
  a runtime gate) for every supported dialect fixture in the regression matrix. Each
  fixture must compare regex-based extraction with the AST result for tables, joins,
  CTEs, and nested SELECT boundaries. Any construct not supported by the AST grammar
  must be listed as a dialect-specific limitation with a dedicated parser test rather
  than silently skipped.
- **Rationale**: Constitution Principle I requires dual regex+AST cross-checks;
  `dt-sql-parser` is already a project dependency used elsewhere for dialect
  validation (`validateSqlDialect`). Keeping the comparison in tests avoids adding
  runtime latency while making parser correctness failures visible before release.
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

## R5: Canonical nested-subquery detail and source-line mapping

- **Decision**: Extend the canonical nested-subquery detail contract with the total
  collection, per-item `depth`, `sourceLine` (1-based line in the original editor
  SQL), and `parsedLine` (1-based line in cleaned parser SQL). Derived subqueries are
  represented twice by design: one graph `Table Reference` and one `Nested Subquery`
  detail, with no duplicate relationship edge.
- **Rationale**: The dashboard already exposes subquery count/depth and the existing
  `useGoToSqlLine` flow supports editor navigation. Keeping both coordinates makes
  parser offsets auditable while ensuring user-facing navigation remains accurate
  when comments, blank lines, or formatting are removed for parsing.
- **Alternatives considered**: Using only cleaned-SQL lines was rejected because it
  can highlight the wrong editor line; using only graph nodes was rejected because it
  loses nested depth and detailed metric context.

## R6: Subquery form scope and depth semantics

- **Decision**: Count scalar, `IN`, `EXISTS`, derived-table, and `LATERAL/APPLY`
  nested `SELECT` constructs. CTEs retain a separate count; nested `SELECT` inside a
  CTE body counts as a subquery, while the CTE definition itself does not count again.
  Direct subqueries have depth 1 and each nested subquery increments depth by 1;
  grouping/function parentheses do not add depth.
- **Rationale**: This matches the existing recursive scanner's intended boundary
  semantics and prevents wrapper parentheses from inflating complexity metrics.

## R7: Complexity Factors Breakdown canonical contract

- **Decision**: Keep `DetailedComplexityScore` as the single source for both the
  Complexity Factors Breakdown and Complexity Gauge. The chart renders keyword,
  SELECT-field, CTE, subquery, and window-function factors from `scoreBreakdown`,
  while exposing total score, maximum score, percentage, formula, raw contribution,
  and localized labels. JOIN contribution remains represented by keyword subtotals;
  the dedicated `scoreBreakdown.joins` object is a reconciliation field, not another
  score to add.
- **Rationale**: Reusing scorer output prevents chart/gauge drift. Explicit tests can
  assert that displayed contributions sum to `totalScore`, while the dedicated JOIN
  object prevents relationship scoring from disappearing. Raw keys such as
  `GROUP_BY` and `INNER_JOIN` are implementation keys and must be localized.
- **Alternatives considered**: Recomputing chart values from `analysisResult.metrics`
  was rejected because it duplicates the scoring algorithm. Adding JOIN score twice
  was rejected because JOIN scoring already exists in keyword totals.

## R8: Complexity/subquery consistency boundary

- **Decision**: Compare the chart's subquery count against canonical
  `analysisResult.metrics.subqueryCount` and `metricDetails.subqueries` in tests. The
  chart may display the scorer's weighted contribution, but scorer parenthesis depth
  must not replace canonical parser depth.
- **Rationale**: Weighted complexity and structural parser facts answer different
  questions, but their count must agree for the same analyzed query. This prevents
  wrapper parentheses and dialect-specific formatting from changing the displayed
  subquery count unexpectedly.

**Output**: All NEEDS CLARIFICATION items from Technical Context resolved (none were
present — Technical Context was fully determinable from the existing codebase).
