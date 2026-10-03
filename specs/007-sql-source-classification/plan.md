# Implementation Plan: SQL Source Classification

**Branch**: `duyvt7` | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-sql-source-classification/spec.md`

## Summary

Make source identity a semantic result of SQL analysis rather than an optional UI flag. The existing analyzer will resolve each source occurrence as `TABLE`, `CTE`, `SUBQUERY`, or `UNKNOWN`, resolving query-local CTE names before applying the direct-source table fallback. Graph construction and ReactFlow presentation will consume that canonical classification, add a derived-subquery filter, and preserve separately aliased occurrences for self-joins and other alias-sensitive relationships. No parser replacement, backend service, catalog, or dependency is added.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Next.js 15.5, React 19

**Primary Dependencies**: Existing `dt-sql-parser` AST cross-check, ReactFlow (`reactflow` / `@xyflow/react`), Zustand; no new dependency

**Storage**: N/A — analysis remains in the existing in-memory shared application state

**Testing**: Vitest unit and component/integration-style tests; TypeScript type check; existing build where practical

**Target Platform**: Existing web application in supported desktop and responsive browser layouts

**Project Type**: Single Next.js web application; client-side analysis and visualization feature

**Performance Goals**: Analyze and render representative queries with more than 50 source occurrences within 1 second; preserve the existing large-graph simplified-render threshold

**Constraints**: Support MySQL, PostgreSQL, SQL Server, and Oracle fixtures; use AST validation alongside existing regex analysis; do not add schema-catalog dependence, parser rewrite, external API, or naming-based CTE heuristic

**Scale/Scope**: One analysis contract (`AnalysisResult.tables`), one SQL analyzer module, and existing relationship-graph UI components; classification states are `TABLE`, `CTE`, `SUBQUERY`, and `UNKNOWN`, with `VIEW` only when supported by existing semantic evidence

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate / required evidence | Pre-design | Post-design |
|-----------|--------------------------|------------|-------------|
| I. Multi-Dialect SQL Analysis | Add four-dialect source-classification fixtures and AST cross-check expectations; document unsupported syntax rather than guessing | PASS | PASS — research requires AST-backed regression matrix |
| II. Interactive Visualization First | Preserve ReactFlow source nodes and make `TABLE`, `CTE`, and `SUBQUERY` visible and filterable | PASS | PASS — internal UI contract defines labels and filters |
| III. Real-Time Feedback Loop | Classification is derived inside the existing `analyzeSql` result, so existing analysis refresh propagation remains unchanged | PASS | PASS — no new async state or duplicate cache |
| IV. AI-Grounded Explanations | Keep source facts in the canonical analysis result so existing AI consumers can read verified parser facts | PASS | PASS — no direct AI-flow changes required |
| V. Minimal Deployment Friction | Reuse installed parser, graph, and test dependencies; no credentials or server component introduced | PASS | PASS |

**Quality gates**: TypeScript remains strict; any existing `any` parser boundary remains documented and is not expanded without justification. New SQL logic receives Vitest coverage including dialect-specific fixtures, and the performance fixture covers 50+ source occurrences. No constitutional violations require a complexity exception.

## Project Structure

### Documentation (this feature)

```text
specs/007-sql-source-classification/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── source-classification-ui.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── lib/
│   └── sql/
│       └── sqlAnalyzer.ts                         # Canonical source resolution and graph model
└── app/
    └── relationship-graph-visualizer/
        └── components/
            ├── GraphVisualizerContent.tsx         # Source-category filters and export labels
            ├── FlowCanvas.tsx                     # ReactFlow node adaptation
            └── TableNode.tsx                      # Visible source-type label

tests/
└── unit/
    ├── sqlSourceClassification.test.ts            # Semantic resolver regressions
    └── relationshipGraphSourceFilter.test.tsx     # Graph category behavior
```

**Structure Decision**: The existing single Next.js project is retained. Source semantics live in `src/lib/sql/sqlAnalyzer.ts`, already the canonical `AnalysisResult` producer. `GraphVisualizerContent.tsx`, `FlowCanvas.tsx`, and `TableNode.tsx` remain client components because they hold interactive filter/canvas state. No server component, API route, persistence layer, or new state store is needed; the existing Zustand-held analysis result remains the sole consumer contract.

## Complexity Tracking

*No violations — section intentionally left empty.*
