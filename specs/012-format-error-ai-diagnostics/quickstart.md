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

### S5 — Fix with review-before-apply (FR-009/010/015, SC-005)
1. With an error open, click **Fix**.
2. Expect: a side-by-side before/after diff of the corrected SQL.
3. Click **Apply** → editor shows the corrected SQL and re-formatting succeeds.
4. Repeat and **Dismiss** → the original SQL is untouched.

### S6 — Stale proposal (FR-016)
1. Request a fix, then edit the SQL in the editor before applying.
2. Expect: on apply, the proposal is flagged stale and re-request is required (never applied).

### S7 — AI unavailable (FR-013)
1. Stop Ollama (or use an unreachable base URL).
2. Request **Explain**/**Fix**.
3. Expect: an actionable unavailable/retry state, no silent failure, no cloud fallback.
