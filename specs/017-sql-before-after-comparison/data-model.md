# Data Model: SQL Before/After Comparison

## BaselineSnapshot

The developer-captured SQL version used as the immutable Before input during the current browser-tab session.

| Field | Shape | Validation / behavior |
|---|---|---|
| `sql` | string | Exact editor text at explicit capture time; preserve comments, whitespace, and literals. Empty text may be captured but comparison reports an empty-input state. |
| `capturedAt` | ISO timestamp | Set when the developer captures the baseline. |
| `schemaVersion` | positive integer | Allows safe parsing or clearing of incompatible session-stored data after future model changes. |

The snapshot is stored only for the browser tab session. It survives reloads and in-app navigation in that tab and is not copied into long-lived settings, saved-query history, or server persistence. The captured snapshot stays fixed for the tab; closing the tab ends its lifetime.

## ComparisonSnapshot

An immutable input pair for one comparison request.

| Field | Shape | Validation / behavior |
|---|---|---|
| `runId` | unique string | Distinguishes concurrent or superseded requests; only the latest active run may publish results. |
| `beforeSql` | string | Exact SQL from the captured baseline. |
| `afterSql` | string | Exact editor text captured when Compare Changes is activated. |
| `dialect` | supported dialect enum | Active application dialect at comparison start; never changed by comparison. |
| `startedAt` | ISO timestamp | Captured at request start. |

The pair does not change while analysis runs. If editor SQL, baseline, or active dialect no longer matches the run's captured inputs, the result is stale and cannot be presented as current.

## StructuralChange

One deterministic difference supported by the analyzer/parser output.

| Field | Shape | Validation / behavior |
|---|---|---|
| `id` | stable string within a run | Identifies the change for display and tests. |
| `kind` | enumerated change type | Includes supported projection, source, join, filter, grouping, ordering, distinct/set-operation, CTE/subquery, aggregate/window, pagination, write-scope, formatting-only, or unknown/partial types. |
| `beforeEvidence` | zero or more evidence spans | References text and clause in Before; absent evidence is not fabricated. |
| `afterEvidence` | zero or more evidence spans | References text and clause in After; absent evidence is not fabricated. |
| `support` | `supported` / `partial` / `unavailable` | Communicates whether the parser output establishes this structural fact. |

Evidence spans preserve original SQL and may include 1-based line and column only when the source position is known.

## ComparisonFinding

A review item from deterministic rules or AI interpretation.

| Field | Shape | Validation / behavior |
|---|---|---|
| `id` | stable string within a run | Distinguishes findings. |
| `origin` | `deterministic` / `ai` | Shown explicitly so model interpretation is not confused with parser facts. |
| `category` | enumerated category | Examples: filtering, join, aggregation, pagination, write-scope, null-handling, duplicates, performance, uncertainty. |
| `severity` | `info` / `warning` / `high` / `critical` | Text label accompanies any color treatment. |
| `title`, `description` | non-empty strings | AI content is runtime-validated before display. |
| `evidence` | evidence spans or empty list | Empty evidence must be accompanied by a limitation or hypothesis label. |
| `potentialImpact` | optional string | A possibility, not a claim of observed behavior. |
| `recommendation` | optional string | Targeted next verification action. |
| `verificationStatus` | explicit enum | `not_verified`, `recommended`, or `verified_by_static_rule`; never implies database execution. |

## ComparisonAssessment

Separate dimensions that must not be collapsed into a single safe/equivalent score.

| Field | Allowed values / content |
|---|---|
| `equivalence` | `equivalent`, `not_equivalent`, `inconclusive`, `not_assessed`; default to `inconclusive` or `not_assessed` absent proof. |
| `executionSafety` | `review_required`, `risk_detected`, `no_known_risk_detected`, `not_assessed`; `no_known_risk_detected` is not a proof of safety. |
| `performance` | `risk_detected`, `no_change_detected`, `not_verified`, `not_assessed`; never report measured runtime without execution evidence. |
| `staticAnalysis` | `completed`, `partial`, `failed`, `not_run`. |
| `resultComparison` | `not_performed` for this analysis-only release. |
| `executionPlan` | `not_available` unless a separate authorized workflow later supplies one. |
| `limitations` | List of parser, context-budget, and evidence limitations. |

## ComparisonResult Lifecycle

`idle` → `analyzing` → `completed` / `partial` / `no_changes` / `failed`. Any input mutation that makes the snapshot obsolete transitions the displayed result to `stale`. A newer run supersedes an older run; an older response cannot overwrite it. AI failure is an optional substate of the result and does not erase deterministic findings. Closing/reopening the side panel changes visibility only and does not restart analysis.
