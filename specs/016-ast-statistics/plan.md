# Implementation Plan: AST Statistics for Advanced Details

**Branch**: `016-ast-statistics` (target from the feature spec; setup-plan currently resolves `015-sql-code-generator`) | **Date**: 2026-10-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/016-ast-statistics/spec.md`

## Summary

Compute honest AST statistics for the SQL shown in Advanced Details by reusing the existing `node-sql-parser` AST produced inside `src/lib/codegen/parseSql.ts`. Add an opt-in statistics result to that parse pipeline, calculate it from the same AST before normalization discards parser structure, and pass it from the dashboard caller into the pure `buildDashboardData` adapter. Keep regex metrics and unrelated analysis flows unchanged. Unsupported, invalid, empty, comment-only, or multi-root SQL has no AST statistics; Oracle remains unsupported. Advanced capability status is resolved per query.

## Technical Context

**Language/Version**: TypeScript 5, strict mode; React 19

**Primary Dependencies**: Next.js 15.5.18; existing `node-sql-parser` 5.4.0; existing `dt-sql-parser` 4.3.1 remains in dialect validation; Vitest 2.1.9

**Storage**: None. Statistics are transient derived data; do not persist SQL or ASTs.

**Testing**: Vitest. Extend `tests/unit/codegen/parseSql.test.ts` and `tests/unit/dashboardData.test.ts`; add focused statistics tests under `tests/unit/codegen`; cover capability and UI states in dashboard tests.

**Target Platform**: Existing Next.js 15 browser application

**Project Type**: Web application (Next.js App Router)

**Performance Goals**: Compute statistics from the single AST parse already performed by `parseSql`; do not run AST parsing in the regex editor-analysis path. Validate dashboard analysis against the existing 1-second constitution budget for queries with more than 50 tables and record AST-pass timing on supported fixtures.

**Constraints**: Reuse `parseSql`; do not add a parser or parse inside `buildDashboardData`. Support only grammars already mapped by the pipeline (MySQL, PostgreSQL, SQL Server); Oracle is unavailable. A parser failure must not throw through or change the regex dashboard result. The engine metadata continues to identify regex as the engine for existing analysis metrics.

**Scale/Scope**: One dashboard query and one AST root per statistics result. No changes to regex-derived metrics, SQL editing, persistence, code generation output, or views outside Advanced Details.

**Workflow Context**: The required `setup-plan.ps1 -Json` resolved branch and plan paths to feature 015, although the editor and request identify feature 016. This plan and its companion artifacts are explicitly scoped to `specs/016-ast-statistics`; do not modify feature 015 artifacts.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                              | Gate                       | Plan response                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Multi-Dialect SQL Analysis          | PASS WITH SCOPED EXCEPTION | Keep regex analysis and the existing `dt-sql-parser` dialect cross-check unchanged. Generate the new statistics only from the required existing `node-sql-parser` pipeline; validate supported grammars with AST fixtures and report Oracle unavailable. This feature does not claim that AST statistics cross-validate the regex metrics. The parser choice is constrained by FR-002 and avoids introducing another parser. |
| II. Interactive Visualization First    | PASS                       | Add the structural facts to the existing Advanced Details presentation; do not replace or alter ReactFlow visualizations.                                                                                                                                                                                                                                                                                                    |
| III. Real-Time Feedback Loop           | PASS                       | Scope the AST pass to dashboard data preparation. Do not add parser work to `analyzeSql` or the editor's frequent analysis path; refresh stats when dashboard SQL or dialect changes.                                                                                                                                                                                                                                        |
| IV. AI-Grounded Explanations           | PASS / NOT APPLICABLE      | No AI output or explanation is added. Statistics are derived directly from a parsed AST.                                                                                                                                                                                                                                                                                                                                     |
| V. Minimal Deployment Friction         | PASS                       | No service, credential, storage, or dependency is added.                                                                                                                                                                                                                                                                                                                                                                     |
| Quality: Testing and Type Safety       | PASS                       | Use typed statistics, strict TypeScript, and Vitest regression coverage for parser, adapter, failure, and UI behavior.                                                                                                                                                                                                                                                                                                       |
| Quality: Performance and Documentation | PASS                       | Reuse one AST parse per dashboard SQL/dialect input; document depth/count semantics and dialect limits; measure the supported fixture path against the existing 1-second analysis budget.                                                                                                                                                                                                                                    |

**Gate result**: Pass with the stated parser-scope exception. If Constitution I is interpreted to require `dt-sql-parser` specifically for every AST statistic, that conflicts with FR-002 and must be reconciled before implementation rather than silently adding a second parser.

## Project Structure

### Documentation (this feature)

```text
specs/016-ast-statistics/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── advanced-details-ast-statistics.md
└── tasks.md                 # Phase 2; not created by planning
```

### Source Code (repository root)

```text
src/
├── app/sql-metrics-dashboard/components/
│   ├── MetricsDashboardContent.tsx
│   └── AdvancedDetails.tsx
├── lib/codegen/
│   ├── model.ts
│   └── parseSql.ts
├── lib/sql/dashboard/
│   ├── types.ts
│   ├── buildDashboardData.ts
│   └── capability.ts
└── locales/
    ├── en.ts
    └── vi.ts

tests/unit/
├── codegen/parseSql.test.ts
├── codegen/astStatistics.test.ts
├── dashboardData.test.ts
└── dashboardCapability.test.ts
```

**Structure Decision**: Extend the existing codegen parser model and dashboard data contract. `MetricsDashboardContent` requests opt-in stats for its current `AnalysisResult.rawSql` and passes the result as data to `buildDashboardData`; the adapter remains synchronous, deterministic, and parser-free. `AdvancedDetails` renders rows only when the result contains statistics. Keep translations in the existing English and Vietnamese locale modules.

## Design Decisions

- Add an optional parse option to `parseSql` so only the dashboard requests AST statistics. The parser computes statistics from the already-created AST before normalizing it; codegen callers retain current behavior and do not pay the traversal cost.
- Represent unavailable statistics as `null`, not an empty statistics object or numeric zeros. A valid AST with a partially normalized SELECT still supplies real AST statistics; only inability to produce an unambiguous single root AST makes them unavailable.
- Count AST nodes as object records with a string `type`; `totalNodeCount` equals the sum of `nodeCountsByType`. Count operator tokens from AST operator fields and function names from parser function-expression nodes, normalized for stable display.
- Count all CTE declarations. CTE nesting depth is the maximum nested `WITH` scope, where one top-level `WITH` level is depth 1 and sibling CTEs do not increase depth. Subquery depth counts nested query-expression boundaries below their containing query; CTE body roots are not themselves subqueries.
- Treat an AST array with more than one statement root as unavailable for this feature. The dashboard must not report stats for only the first statement when the regex result covers the submitted SQL as a whole.
- Set `capabilities.advanced` to `supported` only when statistics are present for this query; otherwise keep `partial`. Leave parser metadata's `engine: 'regex'` unchanged because it describes the source of existing analyzer metrics.
- Add translated labels for the statistics rows in both locales. Keep the existing unavailable state for unsupported or failed AST parsing and render no numeric placeholders.

## Post-Design Constitution Check

- AST-derived counts are isolated from regex-derived analysis facts; unsupported grammars are explicit and tested.
- Dashboard adapter purity is preserved by passing a precomputed nullable value as input.
- The opt-in parse path avoids adding AST cost to real-time editor and AI analysis flows.
- No new external API, data persistence, deployment requirement, or AI behavior is introduced.

**Post-design gate result**: Pass with the same scoped exception for the constitution's `dt-sql-parser` wording; existing dialect-validation behavior is unchanged.

## Complexity Tracking

| Exception                                                                                           | Why needed                                                                                                           | Simpler alternative rejected because                                                                                                |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| AST statistics use the existing `node-sql-parser` AST rather than adding a `dt-sql-parser` AST pass | FR-002 requires reuse of the working codegen parser, whose AST is already generated for supported dashboard dialects | A second parser would create competing grammar behavior, duplicate parse work, and violate the explicit no-second-parser constraint |
