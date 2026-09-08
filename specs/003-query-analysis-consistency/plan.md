# Implementation Plan: Query Analysis Correctness & Output Consistency

**Branch**: `003-query-analysis-consistency` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-query-analysis-consistency/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Audit and harden the existing "paste query → click Analyze" flow so table/JOIN/CTE
extraction (`analyzeSql` in `src/lib/sql/sqlAnalyzer.ts`) is correct across all four
supported dialects and edge cases (aliasing, comma-joins, derived tables, CTE
dependencies), and so every consuming page (Metrics Dashboard, Graph Visualizer, CTE
Analysis) reads the same canonical counts/labels from the single `analysisResult` in
the Zustand store rather than recomputing its own numbers. No new dialects, pages, or
entry points are introduced — this is a correctness/consistency fix-and-verify pass
over existing functionality, validated with regression tests per dialect.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Next.js 15.5 (App Router), React 19

**Primary Dependencies**: `dt-sql-parser` (AST cross-check), Zustand (`useAppStore`), ReactFlow (Graph Visualizer), existing regex-based analyzer in `src/lib/sql/sqlAnalyzer.ts` / `sqlAnalyzerUtils.ts`

**Storage**: N/A (client-side analysis only; no new persistence)

**Testing**: Vitest (unit tests per dialect/edge case in `src/lib/sql/*.test.ts`)

**Target Platform**: Web (browser), existing Next.js app

**Project Type**: Web application (single Next.js project, no frontend/backend split)

**Performance Goals**: Analysis of queries with up to 50 tables completes within 1 second (existing constitution requirement, must not regress)

**Constraints**: No new noticeable latency vs. current analyze flow; must not change previously-correct results for queries that already parse correctly today (zero regressions)

**Scale/Scope**: Fixes are scoped to `src/lib/sql/sqlAnalyzer.ts`, `src/lib/sql/sqlAnalyzerUtils.ts`, and the 3 consuming pages (`sql-metrics-dashboard`, `relationship-graph-visualizer`, `cte-analysis`); no new pages or routes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|-----------|-------|--------|
| I. Multi-Dialect SQL Analysis | Fixes must be verified across MySQL/PostgreSQL/SQL Server/Oracle; regex extraction changes should be cross-checked against `dt-sql-parser` AST output where feasible | PASS — planned research task covers per-dialect regression tests |
| II. Interactive Visualization First | No visualization changes planned; existing ReactFlow-based Graph Visualizer is only made to read consistent data, not redesigned | PASS (no violation, no new visual components needed) |
| III. Real-Time Feedback Loop | Existing streaming/incremental update behavior on the Smart SQL Editor is untouched by this feature | PASS (out of scope, not modified) |
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
existing analysis engine (`src/lib/sql/sqlAnalyzer.ts` / `sqlAnalyzerUtils.ts`) and
audits the three existing consumer pages under `src/app/` to ensure they all read
counts from the single `analysisResult` object in `src/lib/store.ts` instead of
deriving their own. Contracts/ is omitted — this feature has no external API surface;
its "contract" is the shape of the internal `AnalysisResult` type already defined in
`sqlAnalyzer.ts`, which is documented in data-model.md instead.

## Complexity Tracking

*No violations — section intentionally left empty.*
