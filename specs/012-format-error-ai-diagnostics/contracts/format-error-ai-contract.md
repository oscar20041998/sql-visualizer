# Contract: Format Error AI (Explain & Fix)

Two interfaces the feature depends on. The internal `FormatError` shape is the contract between the formatter-capture helper and the panel; the two AI contracts define the structured JSON the local model must return.

## 1. Internal: FormatError (capture → panel)

```ts
type FormatError = {
  message: string;                 // parser message (non-empty)
  dialect: 'mysql' | 'postgresql' | 'sqlserver' | 'oracle';
  location?: { offset?: number; line?: number; column?: number };
  locationSource?: 'formatter' | 'ast-parser'; // which parser supplied the position
  snippet?: string;                // SQL window around location
  sourceSql: string;               // full SQL that failed
  severity: 'error';
  occurredAt: string;              // ISO timestamp
};
```

Guarantee: when `location` is absent, `snippet` and `locationSource` are also absent (no fabricated positions). The panel renders only the fields present. `dialect` always uses this canonical set — the formatter's `tsql`/`plsql` names and the AST parser's names are mapped to it before the value reaches the model or the contract.

## 2. Explain request/response

Request embeds: `error.message`, `error.dialect`, `error.snippet` (or `sourceSql`), and the full `sourceSql`. When the region came from the AST cross-check fallback, the parser's error message and the bounded region snippet are added to the grounding set (FR-019).

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

Request embeds: `error.message`, `error.dialect`, and the full `sourceSql`, plus an explicit instruction to make only the minimal syntax correction that preserves clauses, columns, and ordering. When a region was resolved, the request also quotes that region verbatim and instructs the model to confine every change to it (FR-019).

Response (strict JSON):

```json
{
  "correctedSql": "the minimal corrected SQL"
}
```

Rules: `correctedSql` must be non-empty, differ from the input, and be a minimal, semantics-preserving change (FR-015). The response is a **single complete document** — no streaming (FR-021). The client never writes `correctedSql` verbatim: it extracts the model's actual delta (§4) and splices only the allowed region.

## 4. Apply contract (client-side, region-bounded)

The AI returns a whole corrected document; the editor must still receive a **region-bounded splice**. These are pure functions (see research R8/R9) and the invariants are contractual:

```ts
// Longest common prefix + longest non-overlapping common suffix.
type SqlChange = {
  startOffset: number;       // 0-based, inclusive
  endOffset: number;         // 0-based, exclusive
  originalFragment: string;  // sql.slice(startOffset, endOffset)
  replacement: string;       // text the model put in its place
};

type ApplyResult =
  | { ok: true; sql: string; appliedRange: { startOffset: number; endOffset: number } }
  | { ok: false; reason: 'stale' | 'undetermined-region' | 'no-change' | 'out-of-range' };
```

Rules, evaluated in this order:

1. `stale` — the editor SQL no longer equals the request-time snapshot (FR-016). Nothing is written.
2. `undetermined-region` — no region could be resolved from the formatter or the AST cross-check parser; the panel reports it and offers a new proposal (FR-020).
3. `no-change` — the extracted change is empty (the model returned the input unchanged); the proposal is not applicable.
4. `out-of-range` — the change span is not fully contained in the region; the editor is left untouched, the panel reports that the proposal reaches beyond the error location and offers a retry (FR-018).
5. Otherwise apply `sql.slice(0, start) + replacement + sql.slice(end)` and record `appliedRange` (FR-017).

Invariants: the text outside `[startOffset, endOffset)` is byte-identical to the pre-apply SQL; the spliced result is re-formatted before being committed to the editor, and a failed re-format marks the proposal `invalid` and writes nothing; `Apply` is only reachable from an explicit user confirmation (FR-010).

## Validation responsibilities

- The client validates structure (non-empty fields, `evidence` array, `correctedSql` present) before rendering.
- The client validates fix viability by re-running the formatter on the **spliced** SQL.
- The client — not the model — owns the region: the model's text is evidence, the guard is policy. Every rejection is surfaced as a state, never as a silent partial apply.
- The panel surfaces `unavailable`/`error` states when the model is unreachable, times out, or returns malformed JSON.
