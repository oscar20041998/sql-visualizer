# Contract: Format Error AI (Explain & Fix)

Two interfaces the feature depends on. The internal `FormatError` shape is the contract between the formatter-capture helper and the panel; the two AI contracts define the structured JSON the local model must return.

## 1. Internal: FormatError (capture → panel)

```ts
type FormatError = {
  message: string;                 // formatter message (non-empty)
  dialect: 'mysql' | 'postgresql' | 'sqlserver' | 'oracle';
  location?: { offset?: number; line?: number; column?: number };
  snippet?: string;                // SQL window around location
  sourceSql: string;               // full SQL that failed
  severity: 'error';
  occurredAt: string;              // ISO timestamp
};
```

Guarantee: when `location` is absent, `snippet` is also absent (no fabricated positions). The panel renders only the fields present.

## 2. Explain request/response

Request embeds: `error.message`, `error.dialect`, `error.snippet` (or `sourceSql`), and the full `sourceSql`.

Response (strict JSON, no prose/fence):

```json
{
  "explanation": "plain-language statement of what the error is",
  "rootCause": "plain-language statement of why it happened",
  "evidence": ["quoted SQL fragment or error text the answer relies on"]
}
```

Rules: `explanation` and `rootCause` non-empty; `evidence` ≥ 1 item, each quoting the actual SQL/error (grounding); never contradict the captured error; no SQL execution/perf advice.

## 3. Fix request/response

Request embeds: `error.message`, `error.dialect`, and the full `sourceSql`, plus an explicit instruction to make only the minimal syntax correction that preserves clauses, columns, and ordering.

Response (strict JSON):

```json
{
  "correctedSql": "the minimal corrected SQL"
}
```

Rules: `correctedSql` must be non-empty, differ from the input, and be a minimal, semantics-preserving change (FR-015). The client re-formats `correctedSql` before applying; if that re-format throws, the proposal is marked `invalid` and not applied.

## Validation responsibilities

- The client validates structure (non-empty fields, `evidence` array, `correctedSql` present) before rendering.
- The client validates fix viability by re-running the formatter on `correctedSql`.
- The panel surfaces `unavailable`/`error` states when the model is unreachable, times out, or returns malformed JSON.
