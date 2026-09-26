# Quickstart: Validating SQL Format Error Diagnostics with AI

End-to-end scenarios that prove the feature works. Prerequisites assume the app's existing Ollama setup (see `docs/…/OLLAMA_SETUP_AND_USAGE.md` and Settings → AI Model Configuration).

## Prerequisites

1. `npm install` (already present in this repo).
2. Ollama running locally with a model installed (e.g. `ollama run qwen2.5-coder:7b`).
3. In **Settings → AI Model Configuration**: provider = **Ollama**, base URL = `http://localhost:11434`, local model name = the installed tag.

## Run

```bash
npm run dev        # http://localhost:4028
npm run test       # unit tests
npm run type-check # TypeScript strict
```

Navigate to the Smart SQL Editor.

## Scenarios

### S1 — Format success is unchanged (regression guard, FR-001 / SC-002)
1. Load the "simple" sample query.
2. Click **Format SQL**.
3. Expect: SQL is formatted, a success toast appears, and **no** error panel opens.

### S2 — Format failure opens the toggleable panel (FR-002/003/004/005)
1. Type invalid SQL, e.g. `SELECT * FROM (` (an unclosed parenthesis — sql-formatter's parser rejects this and throws). Note: `SELECT FROM WHERE ;` is **not** a good test case — sql-formatter 15.x is lenient and will happily "format" it without throwing, so it won't trigger the panel.
2. Click **Format SQL**.
3. Expect: the right-side panel opens showing the error summary/message; the editor's SQL is unchanged.
4. Click the toggle to close, then reopen — the error is still shown.

### S3 — Error shows a location/snippet when available (FR-006)
1. Use a query with a mid-query syntax error.
2. Click **Format SQL**.
3. Expect: when the formatter reports a position, the panel shows a line/column and a snippet.

### S4 — Explain (FR-007/008, SC-004)
1. With an error open, click **Explain**.
2. Expect: a loading state, then a plain-language explanation + root cause that references the actual SQL/error.

### S5 — Fix with review-before-apply, applied only inside the error region (FR-009/010/015/017, SC-005)
1. With an error open, click **Fix**.
2. Expect: a side-by-side before/after diff of the corrected SQL, and the panel naming the region it is allowed to change.
3. Click **Apply**.
4. Expect: **only** the erroneous region changed — diff the editor text against the pre-apply text and confirm every character outside the region is identical; the panel reports the applied range.
5. Click **Format SQL** → it now succeeds.
6. Repeat and **Dismiss** → the original SQL is untouched.

### S6 — Stale proposal (FR-016)
1. Request a fix, then edit the SQL in the editor before applying.
2. Expect: on apply, the proposal is flagged stale and re-request is required (never applied).

### S7 — AI unavailable (FR-013)
1. Stop Ollama (or use an unreachable base URL).
2. Request **Explain**/**Fix**.
3. Expect: an actionable unavailable/retry state, no silent failure, no cloud fallback.

### S8 — Proposal reaching beyond the region is rejected (FR-018)
1. Request a fix where the model also reformats unrelated parts of the query (a local model that rewrites the whole file reproduces this; otherwise stub `aiService` in a test).
2. Expect: the panel reports the proposal as out-of-range, **Apply** writes nothing, the editor stays byte-identical, and a "request a corrected proposal" affordance is offered.

### S9 — Region resolved by the AST cross-check fallback (FR-019)
1. Use a query whose formatter failure carries no usable position (e.g. an unterminated string literal) — the panel shows no line/column.
2. Click **Fix**.
3. Expect: the panel resolves a region from the AST cross-check parser, names it, and the request is grounded with the parser's findings.

### S10 — No region can be determined (FR-020)
1. Reproduce a failure where neither parser reports a position (unit test: a thrown non-`Error` value is the deterministic path).
2. Click **Fix**.
3. Expect: the panel states that the erroneous region cannot be determined, **Apply** is unavailable, **Explain** still works, and a new proposal can be requested.

### S11 — One complete response, explicit loading states (FR-021)
1. Request **Explain**/**Fix** and watch the panel.
2. Expect: a loading state, then the complete result rendered at once; the page never reloads.

### S12 — On-device request, no browser credential (FR-011/FR-014, SC-007)
1. Inspect the network tab while requesting **Explain**/**Fix**.
2. Expect: requests target the configured local Ollama endpoint only, no cloud host is contacted, and no credential is stored in or sent from the browser.

## Measurements (SC-001 / SC-004 / SC-005)

- **SC-001 (<1s to panel)**: time the Format click → panel open, excluding AI.
- **SC-004 (<30s explanation)**: time **Explain** → rendered result on the local machine.
- **SC-005 (≥70% of common syntax errors fixed by the first proposal)**: not automatable yet — a per-dialect fixture corpus plus a repeatable measurement task is carried into `/speckit-tasks`. Until that harness exists, record a manual spot-check and treat SC-005 as unverified.
