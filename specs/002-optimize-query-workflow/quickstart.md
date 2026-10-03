# Quickstart: Optimize Query Workflow Redesign

## Prerequisites

- Local dev server running: `npm run dev` (see [package.json](../../package.json))
- An AI provider configured in Settings (Ollama local, or a cloud provider with a server-side key) — the optimize flow requires this regardless of trigger source
- A SQL query pasted or imported into the Smart SQL Editor with at least one table and one JOIN, so structural regression checks have something to compare

## Validation Scenario 1 — Modal-only analysis (User Story 1)

1. Paste a multi-JOIN query into the editor and select its dialect.
2. Click "Analyze & Optimize".
3. **Expect**: A modal opens; the semantic brief, and later the optimize stream/proposals, render only inside the modal — no analysis content appears in the surrounding editor page.
4. Close the modal via the close button. **Expect**: editor query unchanged, no partial state left behind.
5. Reopen the modal (without re-running). **Expect**: the last analysis result is still visible.

## Validation Scenario 2 — Natural-language instruction preserves semantics (User Story 2)

1. With the same query, open the modal and type an instruction, e.g. "shorten this query without changing what it returns".
2. **Expect**: a semantic brief (purpose, relationships, critical filters) appears before any rewritten SQL.
3. Try an instruction that implies a semantic change, e.g. "remove the WHERE clause to see all rows".
4. **Expect**: the system does not silently apply it — it either refuses that part with an explanation, or the structural regression check flags a missing filter as a warning before any confirmation is possible.

## Validation Scenario 3 — Confirmation gate (User Story 3)

1. Let an optimization run to completion (automatic or instruction-based).
2. **Expect**: the editor's original query is untouched at this point.
3. Click "Discard"/close the modal. **Expect**: editor query still unchanged.
4. Re-run, and this time click "Apply"/"Confirm". **Expect**: only now does the editor query change.

## Validation Scenario 4 — Immediate compare view (User Story 4)

1. Following a confirmed optimization from Scenario 3.
2. **Expect**: the editor automatically switches to diff/compare mode (`DiffEditor`), showing original vs. optimized side by side, with no extra click required to see the diff.
3. Exit diff mode. **Expect**: the optimized query remains the active query.

## Automated checks

- `npm test` (Vitest) — run structural regression / proposal-validity unit tests under `src/lib/ai/*.test.ts` and `src/lib/sql/*.test.ts` (existing + new cases for the natural-language instruction path).
- `npm run type-check` — TypeScript strict-mode check across the modified/new files.
- `npm run lint` — ESLint check.
