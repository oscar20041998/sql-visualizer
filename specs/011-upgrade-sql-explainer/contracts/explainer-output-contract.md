# Explainer Output Contract

**Date**: 2026-09-21 | **Spec**: [../spec.md](../spec.md) | **Data model**: [../data-model.md](../data-model.md)

## Scope

This feature exposes no new network API or backend route. The contract below governs the **model-output JSON shape** the Explainer requests, the validation the client applies, and the **UI rendering order** in the Smart SQL Editor Explain panel. Provider routing, streaming transport, and the `/api/ai/*` proxy routes are unchanged.

## Model-Output JSON Shape

The model MUST reply with ONLY a JSON object — no prose, no markdown fence — using exactly these keys in this order:

```json
{
  "query_objective": "one or two sentences describing the core goal of the query",
  "result_bullets": ["each returned column/row aspect, sorting, and row limits — one plain-language bullet each"],
  "report_grain": "what a single result row represents, in plain language (always present)",
  "filter_categories": [
    { "category": "time range | status | region | other constraints", "items": ["one plain-language sentence per condition"] }
  ],
  "data_sources": [
    { "name": "table or CTE name", "purpose": "business purpose, or the literal string unknown" }
  ]
}
```

Values are strings and string-arrays only. Both English and Vietnamese prompts use this identical shape.

## Validation Rules

1. All five top-level keys present, in order; no extra top-level keys.
2. `query_objective` and `report_grain` are non-empty strings; `report_grain` never omitted.
3. `result_bullets` has ≥1 non-empty item.
4. `filter_categories` has ≥1 category with ≥1 non-empty item each; a filterless query yields a single category stating no filters.
5. `data_sources` has ≥1 entry with non-empty `name`; `purpose` is `unknown` when unsupported — never invented.
6. No banned content anywhere: CTE inner-logic description, join mechanics, execution logic, calculations, data lineage, performance analysis. (CTE name-plus-role entries are allowed per clarified FR-006.)
7. The `query_objective` (purpose) section's visible text alone measures within 500–1,500 characters (500–1,000 typical, up to 1,500 for complex queries); enforcement is validate-and-retry (1 attempt + up to 2 retries), closest-length fallback with a user-visible notice on exhaustion.
8. Any rule failure → `structured=false`: UI renders the raw answer with a visible "structured output unavailable" notice.

## UI Rendering Contract

Sections render in this fixed order with these presentations:

1. Query Objective — prose block.
2. What You Get Back — bullet list.
3. Report Grain — prose block, always present.
4. Filters & Constraints — grouped by category label, bullets per item.
5. Data Sources — `name` + `purpose` rows (`unknown` purposes visibly marked).

Clipboard copy and read-aloud narration follow the same section order. Contract violations render raw text + notice; the run is still recorded in history.
