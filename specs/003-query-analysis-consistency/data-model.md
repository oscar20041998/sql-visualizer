# Phase 1 Data Model: Query Analysis Correctness & Output Consistency

This feature does not introduce new persisted entities. It documents the existing
`AnalysisResult` shape (already defined in `src/lib/sql/sqlAnalyzer.ts`) as the single
canonical contract every consuming page must read from, per FR-003/FR-004.

## AnalysisResult (existing, canonical — no schema change)

The one object produced per Analyze click and stored in `useAppStore`'s
`analysisResult`. All fields below already exist; this feature's job is to make sure
they are **correct** (US1) and that every consumer reads them **directly** (US2)
instead of recomputing.

| Field | Type | Description | Canonical for |
|-------|------|--------------|----------------|
| `tables` | `TableNode[]` | Every distinct table/derived-table/CTE reference found | Table count (`tables.length`) shown on Metrics Dashboard, Graph Visualizer |
| `joins` | `JoinEdge[]` | Every relationship edge (explicit JOIN + comma-join + inferred CTE dependency), deduped | Raw structural join count |
| `ctes` | `CTENode[]` | Every CTE with its own `tables` (CTE-local table references) | CTE count (`ctes.length`) on CTE Analysis page |
| `metrics.totalJoinCount` | `number` | `joins.length` post-dedup — the number that must match across all pages | "How many relationships" everywhere it's displayed |
| `metrics.joinCount` | `number` | Structural JOIN-keyword-only count (used for complexity scoring), intentionally NOT the same as `totalJoinCount` | Complexity/execution-cost scoring only — not a page-display consistency target |
| `metricDetails` | object | Per-metric drill-down detail, including the canonical `subqueries` collection plus ops/functions | Nested Subquery Analysis, drill-down panels |
| `complexity` | object | Complexity level/score derived from metrics | Complexity badge (all pages) |
| `structuralReport` | object | Regression-comparison-friendly summary (tables/joins/columns/flags) used by the Optimize flow's structural regression checks (002 feature) — untouched by this feature | N/A for this feature |

## NestedSubqueryDetail

The canonical `metricDetails.subqueries` collection is the authoritative source for
the Metrics Dashboard's subquery count, maximum depth, per-item depth, and
source-line navigation. The existing `NestedSubquery` shape is extended rather than
creating a second competing representation. `structuralReport.subqueries`, if kept
for compatibility with optimization consumers, MUST be a derived alias of the same
collection and MUST NOT be independently extracted.

| Field | Type | Rule | Consumer |
|---|---|---|---|
| `id` | `string` | Stable within one `AnalysisResult` | Detail list key |
| `depth` | `number` | Direct nested SELECT = 1; each nested SELECT adds 1; wrapper parentheses do not add depth | Per-item depth and max depth |
| `sourceLine` | `number` | 1-based line from original editor SQL, including comments and blank lines | Smart SQL Editor jump/highlight |
| `parsedLine` | `number` | 1-based line from cleaned SQL used by parser | Diagnostics and test oracle |
| `type` | `string` | Scalar, IN, EXISTS, FROM, LATERAL/APPLY, or dialect-specific equivalent | Metric detail label |
| `body` | `string` | Cleaned subquery body | Detail preview |
| `context` | `string` | Surrounding SQL clause | Detail explanation |

`metricDetails.subqueries` is the only page-level subquery detail source. The graph
may independently use `tables[].isSubquery === true` to create a derived-table node,
but that node is not another metric-detail record.

The total subquery count is the length of this collection. CTE definitions are
counted only in `ctes`; nested SELECTs inside CTE bodies are included in this
collection. A derived subquery may also appear in `tables` with `isSubquery: true`
for graph relationships; that dual representation MUST NOT create another join edge.

### Validation rules (from spec Functional Requirements)

- `tables` MUST contain exactly one entry per distinct table reference — no
  duplicates for the same physical/derived table, no dropped entries (FR-001).
- `joins` MUST contain exactly one edge per distinct connected pair, regardless of
  whether the connection arises from an explicit JOIN, comma-join, or inferred CTE
  dependency (FR-002).
- `metrics.totalJoinCount` MUST equal `joins.length` after dedup, and MUST be the
  only relationship count referenced by page-level display code (FR-003/FR-004).
- The nested-subquery collection MUST include every scalar, `IN`, `EXISTS`, derived,
  and `LATERAL/APPLY` nested SELECT. Its `sourceLine` MUST be based on original SQL,
  while `parsedLine` may be based on cleaned SQL.
- `metrics.subqueryCount` MUST equal the nested-subquery collection length, and
  `metrics.subqueryDepth` MUST equal the maximum `depth` (or zero when empty).
- A validation outcome (see below) MUST precede a real `AnalysisResult` — no partial/
  guessed `AnalysisResult` may be produced from an unparseable or dialect-mismatched
  input (FR-008/FR-009).

## Complexity Factors Breakdown Contract

`ComplexityFactorsBreakdown` consumes the same `DetailedComplexityScore` instance as
`ComplexityGauge`. It presents scoring facts and MUST NOT implement a second scoring
algorithm.

| Display field | Source | Validation rule |
|---|---|---|
| Total score | `detailedComplexity.totalScore` | Equals the sum of displayed factor contributions |
| Maximum score | `detailedComplexity.maxScorePossible` | Uses the same denominator as the gauge |
| Percentage | `detailedComplexity.percentageOfMax` | Equals total divided by maximum, with zero-denominator handling |
| Keyword factors | `scoreBreakdown.keywords` | Category keys are localized; JOIN contribution appears once |
| SELECT fields | `scoreBreakdown.selectFields` | Shows field count, type formula, score, and contribution |
| CTEs | `scoreBreakdown.ctes` | Shows count and weighted contribution |
| Subqueries | `scoreBreakdown.subqueries` | Count reconciles with `analysisResult.metrics.subqueryCount` |
| Window functions | `scoreBreakdown.windowFunctions` | Shows count and weighted contribution |

The dedicated `scoreBreakdown.joins` object is a reconciliation view of JOIN
scoring, not an extra contribution to add to `totalScore`, because JOIN subtotals
are already present in `scoreBreakdown.keywords`. The chart MUST distinguish count,
weight/formula, contribution, and percentage.

- The Complexity Factors Breakdown MUST consume `DetailedComplexityScore` without
  recomputing scores, and displayed contributions MUST reconcile to `totalScore`.
- Complexity keyword labels MUST be localized; raw scorer keys such as `GROUP_BY`,
  `INNER_JOIN`, and `WITH_CTE` MUST NOT be the only user-facing labels.

## AnalysisValidationOutcome (conceptual, not a new type — describes existing pre-checks)

Represents the existing pre-analysis gate in `query-input/page.tsx`'s
`handleAnalyze`, formalized here for traceability to FR-006/FR-007/FR-008/FR-009:

| Stage | Function | Outcome on failure |
|-------|----------|---------------------|
| Format check | `validateSqlFormat(sql)` | Specific format-issue toast (e.g., wrapped-in-quotes, invisible chars); no analysis attempted |
| Dialect check | `validateSqlDialect(sql, dialect)` | Specific detected-vs-selected mismatch toast; no analysis attempted |
| Parse | `analyzeSql(sql, dialect, locale)` | Parse/validation failure → specific parse-error toast; no partial `AnalysisResult` stored |
| Success (zero relationships) | `analyzeSql` returns a valid result with `joins.length === 0` | A legitimate `AnalysisResult` is stored and displayed with an explicit zero-state, not treated as an error |

The existing shape is extended only for the nested-subquery detail coordinates and
the original-vs-cleaned line mapping. No persisted schema or external API is added.
