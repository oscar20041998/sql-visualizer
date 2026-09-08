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
| `metricDetails` | object | Per-metric drill-down detail (subqueries, ops/functions, etc.) | Nested Subquery Analysis, drill-down panels |
| `complexity` | object | Complexity level/score derived from metrics | Complexity badge (all pages) |
| `structuralReport` | object | Regression-comparison-friendly summary (tables/joins/columns/flags) used by the Optimize flow's structural regression checks (002 feature) — untouched by this feature | N/A for this feature |

### Validation rules (from spec Functional Requirements)

- `tables` MUST contain exactly one entry per distinct table reference — no
  duplicates for the same physical/derived table, no dropped entries (FR-001).
- `joins` MUST contain exactly one edge per distinct connected pair, regardless of
  whether the connection arises from an explicit JOIN, comma-join, or inferred CTE
  dependency (FR-002).
- `metrics.totalJoinCount` MUST equal `joins.length` after dedup, and MUST be the
  only relationship count referenced by page-level display code (FR-003/FR-004).
- A validation outcome (see below) MUST precede a real `AnalysisResult` — no partial/
  guessed `AnalysisResult` may be produced from an unparseable or dialect-mismatched
  input (FR-008/FR-009).

## AnalysisValidationOutcome (conceptual, not a new type — describes existing pre-checks)

Represents the existing pre-analysis gate in `query-input/page.tsx`'s
`handleAnalyze`, formalized here for traceability to FR-006/FR-007/FR-008/FR-009:

| Stage | Function | Outcome on failure |
|-------|----------|---------------------|
| Format check | `validateSqlFormat(sql)` | Specific format-issue toast (e.g., wrapped-in-quotes, invisible chars); no analysis attempted |
| Dialect check | `validateSqlDialect(sql, dialect)` | Specific detected-vs-selected mismatch toast; no analysis attempted |
| Parse | `analyzeSql(sql, dialect, locale)` | Thrown/caught error → generic parse-error toast; no partial `AnalysisResult` stored |
| Success (zero relationships) | `analyzeSql` returns a valid result with `joins.length === 0` | A legitimate `AnalysisResult` is stored and displayed with an explicit zero-state, not treated as an error |

No new fields or types are required to satisfy this — the existing shape already
supports all four outcomes; this feature's job is ensuring the messaging/zero-state
distinction (FR-009) is visually and textually clear, and adding regression tests
that assert each stage is reached/reported correctly.
