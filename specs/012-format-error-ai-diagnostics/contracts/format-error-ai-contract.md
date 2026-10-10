# Contract: Format Error AI (Combined Diagnosis & Fix)

The internal `FormatError` shape is the contract between the formatter-capture helper and the panel; one AI response contract defines the structured JSON the local model must return.

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

## 2. Combined request/response

Request embeds: `error.message`, `error.dialect`, and the bounded error-region snippet. The model is asked to return only a replacement fragment for that region, never the full query. The client splices this fragment into the captured source SQL for formatter validation and the existing region-bounded Apply guard. Including the cross-check parser's actual error findings in the prompt remains pending (T025/U44).

The panel exposes one action, **Giải thích và gợi ý sửa lỗi** (localized equivalently). One request returns strict JSON, no prose/fence:

```json
{
  "explanation": "plain-language statement of what the error is",
  "rootCause": "plain-language statement of why it happened",
  "evidence": ["quoted SQL fragment or error text the answer relies on"],
  "replacementSql": "only the corrected SQL for the error region",
  "replacementReason": "why this replacement fixes the syntax error"
}
```

Rules: `explanation` and `rootCause` non-empty; `evidence` ≥ 1 item, quoting the actual SQL/error (grounding); `replacementSql` and `replacementReason` are required for a usable correction; `replacementSql` contains only the bounded region. The model never returns a full query. Never contradict the captured error; no SQL execution/performance advice. The explanation and correction are requested together, not by separate requests.

The client parses diagnosis fields independently. Missing or invalid `replacementSql`/`replacementReason`, an out-of-region change, a refusal by the existing scoped-apply guard, or a formatter rejection MUST NOT discard a valid diagnosis. In that case the panel renders the diagnosis, displays the localized no-safe-replacement state, and offers neither Copy nor Apply. The client may expose Copy/Apply only after splicing `replacementSql` into the captured query, passing the scoped-apply guard, and validating the complete result.

## 3. Apply contract (client-side, region-bounded)

The model returns only a region replacement fragment. The client constructs a whole-query candidate, and the editor must still receive a **region-bounded splice**. These are pure functions (see research R8/R9) and the invariants are contractual:

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
4. `out-of-range` — the change span is not fully contained in the region; the editor is left untouched, the panel reports that the proposal reaches beyond the error location and offers a retry (FR-018). If a line-sized fallback region spans the whole document, also reject a proposal whose removed or inserted text exceeds half the document; a one-line boundary alone must not authorize a broad rewrite.
5. Otherwise apply `sql.slice(0, start) + replacement + sql.slice(end)` and record `appliedRange` (FR-017).

Invariants: the text outside `[startOffset, endOffset)` is byte-identical to the pre-apply SQL; the spliced result is re-formatted before being committed to the editor, and a failed re-format marks the proposal `invalid` and writes nothing; `Apply` is only reachable from an explicit user confirmation (FR-010).

## Validation responsibilities

- The client validates diagnosis structure (`explanation`, `rootCause`, and grounded `evidence`) independently from correction structure.
- The client validates correction structure (`replacementSql` and `replacementReason`) and retains a valid diagnosis when correction validation fails.
- The client validates fix viability by re-running the formatter on the **spliced** SQL.
- The client — not the model — owns the region: the model's text is evidence, the guard is policy. Every rejection is surfaced as a state, never as a silent partial apply.
- The panel surfaces `unavailable`/`error` states when the model is unreachable, times out, or returns malformed JSON.
