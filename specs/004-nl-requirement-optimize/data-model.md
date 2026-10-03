# Data Model: Requirement-Driven Query Optimization

All entities below are in-memory/runtime types (TypeScript interfaces), not persisted database tables — consistent with the existing AI Optimize feature, which keeps its results in component state / the Zustand store's non-persisted slice only.

## RequirementInput

The user's free-form description of new logic to add, entered in the Optimize modal's requirement mode.

| Field | Type | Notes |
|---|---|---|
| `text` | `string` | Required. The natural-language requirement, e.g. "add customer loyalty tier, refer to tables A, B, C". |
| `hintedTables` | `string[]` | Optional. Table/column names the user explicitly named; parsed client-side from `text` (simple heuristic extraction) and/or entered via an optional structured field. |

**Validation rules**: `text` must be non-empty after trim (FR-001). The query must already have an `AnalysisResult` (i.e. have been analyzed) before this mode is usable (FR-010).

## CandidateQuery

The sample query generated to satisfy a `RequirementInput`, associated with the original query it was derived from. Extends the existing `SqlOptimizationResult` shape from `aiService.ts` with fields specific to this mode.

| Field | Type | Notes |
|---|---|---|
| `originalSql` | `string` | Snapshot of the editor SQL at generation time — used for staleness detection (FR-009). |
| `optimizedSql` | `string` | The candidate query (reuses `SqlOptimizationResult.optimizedSql` naming for consistency). |
| `analysis` | `string` | Plain-language explanation of what was added/changed. |
| `unresolvedReferences` | `string[]` | Table/column names from the requirement that could not be matched against the known schema (FR-003). |
| `changeSummary` | `SemanticChangeSummary` | Structural diff vs. the original query (see below). |
| `raw` / `structured` / `budget` | same as `SqlOptimizationResult` | Reused as-is from the existing type. |

**State transitions**: `generating` → `ready` (candidate produced) → either `applied` (user clicked Apply) or `discarded` (user dismissed) or `stale` (original SQL edited before Apply — FR-009).

## SemanticChangeSummary

The set of differences between a `CandidateQuery` and the original query, computed by `buildRequirementChangeSummary(originalAnalysis, candidateAnalysis)` (see research.md R2).

| Field | Type | Notes |
|---|---|---|
| `addedTables` | `string[]` | Tables present in the candidate but not the original. |
| `removedTables` | `string[]` | Tables present in the original but not the candidate. |
| `addedJoins` / `removedJoins` | `string[]` | Human-readable join descriptions (`table A INNER JOIN table B ON ...`), diffed the same way `buildStructuralRegressionWarnings` already compares joins. |
| `addedColumns` / `removedColumns` | `string[]` | Output-column differences (`AnalysisResult.mainQueryFields`). |
| `filterChanged` | `boolean` | Whether WHERE/HAVING condition count or content differs. |
| `isSemanticChange` | `boolean` | `true` if any of the above arrays are non-empty or `filterChanged` is true (FR-005). |

## OptimizationMode

Discriminates which of the two optimize paths is active in the modal — a UI/state concept, not a persisted entity.

| Value | Behavior |
|---|---|
| `'lint'` | Existing automatic, lint/alert-driven optimization (FR-008) — unchanged. |
| `'instruction'` | Existing natural-language *style* instruction mode (spec 002) — semantics must never change. Unchanged. |
| `'requirement'` | New mode added by this feature — semantics MAY change, subject to explicit confirmation (FR-002, FR-006). |

**Relationships**: A `RequirementInput` produces exactly one active `CandidateQuery` at a time (a new submission replaces/discards the previous pending candidate, mirroring the existing `pendingOptimizeRef` single-slot pattern). A `CandidateQuery` always carries exactly one `SemanticChangeSummary`.
