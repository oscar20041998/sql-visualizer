# Implementation Plan: Query Analysis Correctness & Output Consistency

**Branch**: `003-query-analysis-consistency` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-query-analysis-consistency/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Audit and harden the existing "paste query → click Analyze" flow so table/JOIN/CTE and
nested-subquery extraction (`analyzeSql` in `src/lib/sql/sqlAnalyzer.ts`) is correct
across all four supported dialects and edge cases. Preserve the dual representation
of derived subqueries: graph consumers receive a `Table Reference`, while metric
details receive a `Nested Subquery` with count, depth, original-editor source line,
and cleaned-parser line. Every consumer continues to read the canonical
`analysisResult` rather than recomputing counts. The Metrics Dashboard's Complexity
Factors Breakdown is also in scope: its formulas, labels, contributions, and
percentages must reconcile with the same `DetailedComplexityScore` used by the gauge.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Next.js 15.5 (App Router), React 19

**Primary Dependencies**: `dt-sql-parser` (mandatory AST cross-check), Zustand (`useAppStore`), ReactFlow (Graph Visualizer), Monaco line-navigation flow (`src/lib/useGoToSqlLine.ts`), existing regex-based analyzer in `src/lib/sql/sqlAnalyzer.ts` and `src/app/common/sqlAnalyzerUtils.ts`

**Storage**: N/A (client-side analysis only; no new persistence)

**Testing**: Vitest unit/integration-style tests covering all four dialects, nested-subquery forms, AST cross-checks, source-line mapping, canonical consumer counts, Complexity Factors Breakdown reconciliation and localization, and the 50-table performance budget

**Target Platform**: Web (browser), existing Next.js app

**Project Type**: Web application (single Next.js project, no frontend/backend split)

**Performance Goals**: Analysis of queries with up to 50 tables completes within 1 second (existing constitution requirement, must not regress)

**Constraints**: Analysis of queries with up to 50 tables MUST remain within 1 second; must not change previously-correct results for queries that already parse correctly; source-line navigation MUST use the original editor SQL while parser offsets may use cleaned SQL

**Scale/Scope**: Fixes are scoped to `src/lib/sql/sqlAnalyzer.ts`, `src/lib/sql/complexityScorer.ts`, `src/app/common/sqlAnalyzerUtils.ts`, `src/app/query-input`, `src/lib/useGoToSqlLine.ts`, and the consuming areas (`sql-metrics-dashboard`, `relationship-graph-visualizer`, `cte-analysis`); no new pages or routes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|-----------|-------|--------|
| I. Multi-Dialect SQL Analysis | Fixes must be verified across MySQL/PostgreSQL/SQL Server/Oracle, and every supported regression fixture must be cross-checked against `dt-sql-parser` AST output; unsupported grammar cases must be explicitly documented and tested per dialect | PASS after design — research and test plan make the AST comparison an explicit gate |
| II. Interactive Visualization First | Preserve ReactFlow graph nodes for derived tables and provide direct source-line drill-down from nested-subquery metric details | PASS |
| III. Real-Time Feedback Loop | A completed analysis replaces the canonical result; the Complexity Factors Breakdown and gauge refresh from the same completed score; source-line navigation uses the current Smart SQL Editor query | PASS after design |
| IV. AI-Grounded Explanations | Not applicable — this feature does not touch AI explanation/optimize flows | N/A |
| V. Minimal Deployment Friction | No new dependencies, providers, or server-side credentials introduced | PASS |

No violations requiring justification. Complexity Tracking section left empty.

## Project Structure

### Documentation (this feature)

```text
specs/003-query-analysis-consistency/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
# Option 1: Single project (existing Next.js app, no new project created)
src/
├── lib/
│   └── sql/
│       ├── sqlAnalyzer.ts          # analyzeSql() — canonical analysis entry point
│       ├── sqlAnalyzer.test.ts     # existing/expanded per-dialect regression tests
│       └── optimizeRegression.ts   # unrelated, untouched by this feature
├── app/
│   └── common/
│       └── sqlAnalyzerUtils.ts     # regex patterns, extraction helpers
├── lib/
│   └── store.ts                    # analysisResult (single canonical source of truth)
└── app/
    ├── query-input/                # Analyze button entry point (unchanged flow)
    ├── sql-metrics-dashboard/      # consumer — must read canonical counts
    ├── relationship-graph-visualizer/  # consumer — must read canonical counts
    └── cte-analysis/               # consumer — must read canonical counts
```

**Structure Decision**: No new project or route is created. This feature modifies the
existing analysis engine and its canonical `AnalysisResult` contract, adds the
source-line mapping needed by the existing `useGoToSqlLine` flow, and audits the
three existing consumer areas. Contracts/ is omitted because there is no external
API surface; the internal analysis and UI contract is documented in data-model.md.

## Implementation Approach

1. Establish AST-backed regression fixtures for all four dialects and the historical
    table/JOIN defects before changing extraction code.
2. Refine nested-subquery extraction to cover scalar, `IN`, `EXISTS`, derived,
    `LATERAL/APPLY`, and nested-CTE-body `SELECT` forms; preserve depth semantics and
    emit both original-editor and cleaned-parser line coordinates. Keep the original
    editor SQL available as `AnalysisResult.rawSql` for navigation.
3. Make `metricDetails.subqueries` the single canonical `Nested Subquery` collection.
    Keep derived subqueries as graph `Table Reference` nodes while exposing the same
    construct through metric details; deduplicate graph relationships independently
    from detail records and expose any legacy structural alias from that collection.
4. Update the Metrics Dashboard and Smart Editor jump path to consume canonical
    details, then verify stale-result replacement, labels, zero states, and performance.
5. Add concise inline comments documenting the extraction algorithm, dialect-specific
   behavior, source-line mapping, and known limitations as required by the constitution.
6. Normalize the Complexity Factors Breakdown contract: use localized keyword labels,
    define one canonical contribution total, expose score/max/percentage context, and
    test that JOIN and subquery factors are neither omitted nor double-counted.

## Complexity Tracking

*No violations — section intentionally left empty.*
