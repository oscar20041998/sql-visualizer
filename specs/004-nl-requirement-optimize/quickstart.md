# Quickstart: Requirement-Driven Query Optimization

## Prerequisites

- Local dev server running (`npm run dev`), or `npm run test` for automated checks.
- An AI provider configured in **Settings → AI Model Configuration** (local SGLang or a cloud provider) — same requirement as the existing Optimize feature.
- A query already analyzed in the Smart SQL Editor (Analyze must run before the requirement-input mode is usable, per FR-010).

## Manual validation scenarios

### Scenario 1 — Requirement produces a candidate query (US1)

1. Paste [demo_query7.sql](../../../src/sample/demo_query7.sql) into the Smart SQL Editor and click **Analyze**.
2. Open **Optimize**, switch to the new requirement-driven mode, and enter: "also include the product name for each order item, refer to table products".
3. Submit.
4. **Expected**: A candidate query is returned that joins `products` and adds the product name to the output columns; the analysis text explains what was added.

### Scenario 2 — Unresolvable table reference (US1, edge case)

1. With the same analyzed query, enter a requirement referencing a table not present in the query and not resolvable from documentation, e.g. "join it with table zzz_not_real".
2. **Expected**: The system reports that `zzz_not_real` could not be found, and does not fabricate a JOIN to it.

### Scenario 3 — Semantic-change confirmation gate (US2)

1. Repeat Scenario 1 to get a candidate that adds a table/column.
2. **Expected**: The candidate is labeled as a semantic change, with a visible summary (e.g. "+1 table: products", "+1 output column: product_name") before any Apply control is enabled.
3. Click **Apply**.
4. **Expected**: The editor immediately shows the candidate as the active query, in compare/diff mode against the original (reusing the existing spec-002 diff view).
5. Repeat steps 1–2 but click **Discard** instead.
6. **Expected**: The editor query is unchanged; reopening the modal does not silently resurface the discarded candidate as if still pending.

### Scenario 4 — Stale candidate invalidation (edge case, FR-009)

1. Repeat Scenario 1 to get a pending (not yet applied) candidate.
2. Before clicking Apply, manually edit the query text in the editor.
3. **Expected**: The pending candidate's Apply control is disabled/hidden with an explanatory note; the stale candidate is not applied over the newly edited query.

### Scenario 5 — Existing lint-driven optimizer unaffected (US3, regression check)

1. Run the existing automatic "Optimize" flow (lint/alert-driven, no requirement text entered) on any sample query, e.g. [demo_query1.sql](../../../src/sample/demo_query1.sql).
2. **Expected**: Behavior, suggestions, and the "never changes semantics" guarantee are identical to pre-feature behavior; no new confirmation prompts from this feature appear in that flow.

## Automated checks

- `npx vitest run` — add/extend unit tests for `buildRequirementChangeSummary` (table/join/column diff cases) and the new `aiService.ts` candidate-generation prompt/result parsing, following the existing test patterns in `src/lib/sql/*.test.ts` and `src/lib/ai/*.test.ts` (if present) or colocated alongside the modules per project convention.
- `npx tsc --noEmit` — verify no type errors across the new interfaces (`RequirementInput`, `CandidateQuery`, `SemanticChangeSummary`) and their usage sites.
