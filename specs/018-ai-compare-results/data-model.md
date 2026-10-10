# Data Model: AI SQL Comparison Results

**Feature**: [spec.md](spec.md)

## Editor Comparison Pair

Represents the exact input pair captured from the main SQL Editor when comparison begins.

| Field | Type | Validation / meaning |
|---|---|---|
| `runId` | string | Unique to one comparison run; binds deterministic and AI results together. |
| `beforeSql` | string | Original SQL returned by the main editor at capture time. Must contain a statement for a complete comparison. |
| `afterSql` | string | Current SQL returned by the main editor at the same capture time. Must contain a statement for a complete comparison. |
| `dialect` | `SqlDialect` | Selected dialect captured with the SQL pair; must not change during this run. |
| `startedAt` | ISO timestamp | Time the immutable pair was captured. |

**Lifecycle**: Created on explicit Compare action; unchanged for the run; superseded by a new comparison or marked stale when the editor's original SQL, current SQL, or dialect changes. It is not persisted.

## Comparison Result

One deterministic analysis result bound to an `Editor Comparison Pair`.

| Field | Type | Validation / meaning |
|---|---|---|
| `snapshot` | `Editor Comparison Pair` | Immutable source of every result and AI request. |
| `status` | `completed \| partial \| no_changes \| failed \| stale` | `no_changes` only when the compared SQL is identical; `partial` when parser/dialect support is incomplete; `stale` when the snapshot no longer represents current editor content. |
| `changes` | `Structural Change[]` | Textual/structural results limited to supported evidence; formatting-only and unknown-text differences remain distinguishable. |
| `findings` | `Finding[]` | Deterministic review findings, with any AI-derived interpretation separately attributed. |
| `assessment` | `Deterministic Assessment` | Separate equivalence, execution-safety, performance, static-analysis, execution-plan, and result-comparison states. AI cannot promote these statuses. |
| `limitations` | string[] | Parser, dialect, truncation, or verification limits affecting this result. |
| `ai` | `AI Assessment State` | AI state/content for this same snapshot only. |

## Structural Change and Evidence

| Field | Type | Validation / meaning |
|---|---|---|
| `kind` | enum | Supported clause/construct category, `formatting-only`, or `unknown`. |
| `summary` | string | Concise description; must not claim semantic impact without evidence. |
| `beforeValue` / `afterValue` | string or null | Matched structural values; null represents an added/removed construct. |
| `beforeEvidence` / `afterEvidence` | `Sql Evidence[]` | Source-side evidence with offsets and line/column where available. Collapsed UI excerpts are bounded; full SQL remains inspectable in the diff. |
| `support` | `supported \| partial \| unavailable` | Indicates whether parser evidence supports the finding or whether the UI must disclose a fallback/limitation. |

CTEs are matched by normalized identity only when the current analysis can identify them reliably. A whole `WITH` clause is not treated as one confirmed CTE change. If matching is unavailable, retain the text diff and mark the structural assessment partial or unsupported.

## Deterministic Assessment

The existing assessment dimensions remain separate and deterministic:

- `equivalence`: `equivalent`, `not_equivalent`, `inconclusive`, or `not_assessed`.
- `executionSafety`: `review_required`, `risk_detected`, `no_known_risk_detected`, or `not_assessed`.
- `performance`: `risk_detected`, `no_change_detected`, `not_verified`, or `not_assessed`.
- `staticAnalysis`: `completed`, `partial`, `failed`, or `not_run`.
- `resultComparison`: `not_performed` unless a future feature explicitly performs it.
- `executionPlan`: `not_available` unless plan data is actually supplied.

No SQL is executed by this feature. No positive semantic, safety, or performance claim is inferred merely from the absence of a finding.

## AI Assessment

An AI assessment is optional and belongs to one `runId` only.

| Field | Type | Validation / meaning |
|---|---|---|
| `status` | lifecycle enum | `not_started`, `analyzing`, `completed`, `partial`, `unavailable`, `failed`, `not_needed`, or `stale`; derived from request outcome, deterministic completeness, and snapshot freshness. |
| `summary` | string or null | Concise AI interpretation; displayed only after response validation. |
| `potentialCorrectnessImpact` | string or null | Possible behavior impact; hypothesis, not verified result. |
| `executionSafetyConcerns` | string or null | Possible write-scope or execution risk; not a blanket safety verdict. |
| `potentialPerformanceImpact` | string or null | Hypothesis only without plan/benchmark evidence. |
| `evidence` | string[] | At least one supplied SQL-grounded quote for a completed assessment; validate against the captured pair. |
| `assumptions` | string[] | Model assumptions, distinct from parser facts. |
| `verificationSteps` | string[] | Actionable review/test steps; not marked completed unless they actually ran. |
| `limitations` | string[] | Missing context, parser limitations, or AI input truncation. |

**State precedence**: stale snapshot overrides all other presentation states; identical SQL maps to `not_needed`; pending request maps to `analyzing`; provider configuration/network failures map to `unavailable`; invalid schema/evidence or other request errors map to `failed`; a valid AI response paired with partial deterministic analysis maps to `partial`; valid complete analysis maps to `completed`; no requested AI action maps to `not_started`.

## Relationships

- One `Editor Comparison Pair` produces one `Comparison Result`.
- One `Comparison Result` has zero or more structural changes and findings, one deterministic assessment, and zero or one AI assessment.
- Every evidence item and AI response is scoped to the pair's `runId`; data from another run must not be mixed into the result.