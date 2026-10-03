# Data Model: SQL Explainer Upgrade

**Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

No persistent storage — these are in-memory / wire shapes only. Field names are the canonical contract (see [contracts/explainer-output-contract.md](./contracts/explainer-output-contract.md)).

## Entities

### Structured Explanation (replaces current `SqlExplanation` content shape)

The five-section payload for one Explain run, plus fallbacks. All section text is plain business language (FR-002–FR-006); SQL keywords avoided in objective/result text.

| Field | Type | Required | Validation |
|---|---|---|---|
| `query_objective` | string | yes | 1–2 sentences; non-empty |
| `result_bullets` | string[] | yes | ≥1 item; each a plain-language bullet |
| `report_grain` | string | yes | Always present, never omitted (FR-004); single sentence stating what one result row represents |
| `filter_categories` | FilterCategory[] | yes | ≥1 category; a filterless query carries one category stating no filters (FR-005) |
| `data_sources` | DataSourceEntry[] | yes | ≥1 entry per table/CTE read (FR-006) |
| `raw` | string | yes | Untouched model answer, kept as fallback |
| `structured` | boolean | yes | False when the contract was violated → UI shows `raw` + notice (FR-011) |
| `budget` | AIBudgetReport | yes | Unchanged existing shape (context tokens, truncation flags) |

Length rule (FR-007): the `query_objective` (purpose) section's visible text alone MUST measure 500–1,500 characters (500–1,000 typical, up to 1,500 for complex queries); enforced by bounded validate-and-retry (1 + up to 2 retries), closest-length fallback with notice on exhaustion.

### Filter Category

| Field | Type | Required | Validation |
|---|---|---|---|
| `category` | string | yes | One of the structured groups (e.g. time range, status, region, other constraints); producer-chosen label when none fits, never empty |
| `items` | string[] | yes | ≥1 plain-language sentence per condition in the group |

### Data Source Entry

| Field | Type | Required | Validation |
|---|---|---|---|
| `name` | string | yes | Table or CTE name as read by the query |
| `purpose` | string | yes | Business purpose supported by the query/verified facts, else the literal marker `unknown` — never invented (FR-006, FR-010) |

CTE rule (clarified FR-006/FR-008): a CTE entry is name + one-phrase role only (e.g. `monthly_sales` + "a named step in this query: monthly totals"). Describing inner query logic inside `purpose` is a contract violation.

## Relationships

- One Structured Explanation → 1 `query_objective`, 1 `report_grain`, 1..n `result_bullets`, 1..n `filter_categories` (each 1..n `items`), 1..n `data_sources`.
- Grounding: `data_sources[].name` SHOULD match parser-identified tables/CTEs; contradictions with parser facts invalidate the payload (Constitution IV, FR-010).

## State transitions

`streaming` (partial sections may render) → `done-structured` (contract valid, length in budget) | `done-retried` (valid after retry) | `done-fallback` (contract violated or budget unmet after retries → `structured=false`, show `raw` + notice) | `error` (transport/validation failure → graceful message, run still recorded).
