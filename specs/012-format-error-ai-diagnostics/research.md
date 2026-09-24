# Research: SQL Format Error Diagnostics with AI

Phase 0 output — resolves the design unknowns before Phase 1 artifacts.

## R1 — Capturing the sql-formatter error shape

- **Decision**: Wrap `format(sql, { language })` in a `captureFormatError()` helper (in `src/lib/sql/formatError.ts`) that catches the thrown object and normalizes it into a `FormatError` with `message`, `dialect`, and, when the formatter provides one, a character offset (`location.start`/`end`). When an offset exists, derive a short `snippet` (the surrounding SQL window) and a 1-based `line`/`column` from the offset; otherwise leave location/snippet undefined.
- **Rationale**: `sql-formatter` throws an `Error`-like object; its message is the reliable signal, while position data is optional and must not be fabricated. Deriving a snippet keeps the panel useful without re-parsing SQL (satisfies the "no new SQL parsing for location" assumption).
- **Alternatives considered**: Re-run `dt-sql-parser` to locate errors — rejected (extra dependency on a second parser, more code, and the formatter's own error is the source of truth).

## R2 — AI grounding for explain and fix

- **Decision**: Build two structured prompts (`explainFormatError`, `proposeFormatFix`) that embed the exact error message, the offending SQL, and the active dialect. The model replies with strict JSON (see contracts). The UI renders the model text verbatim but never overrides the captured error facts.
- **Rationale**: Constitution Principle IV requires AI outputs to be grounded in parser/formatter facts and never contradict them. Embedding the actual error + SQL in the prompt is the minimal, reliable grounding mechanism; a JSON contract makes the response renderable and testable.
- **Alternatives considered**: Free-form prose responses — rejected (harder to render the explanation/root-cause/fix as separate fields and harder to validate).

## R3 — Ollama invocation path

- **Decision**: Reuse the existing `aiService.ts` adapter. Ollama is called directly from the browser at the configured `baseUrls.ollama + /v1/chat/completions` (no key, no server proxy), reading `settings.aiConfig.ollamaModel` and token budgets. Explanation streams; fix is a single JSON response.
- **Rationale**: This is the established pattern for the app's Ollama support and satisfies "local only, no off-device SQL, no browser credentials" (Constitution V). No new endpoint or dependency is needed.
- **Alternatives considered**: Add a server API route to proxy Ollama — rejected (unnecessary; Ollama is already direct and local, and a proxy would add latency + a failure surface without a privacy benefit).

## R4 — Review-before-apply presentation (side-by-side)

- **Decision**: Render the proposed fix in Monaco `DiffEditor` (`renderSideBySide: true`), original on one side and corrected SQL on the other. Apply replaces the editor's SQL only on explicit user confirmation.
- **Rationale**: The editor already ships `DiffEditor` for the format before/after view, so the pattern and options are proven; a side-by-side diff makes the minimal change visually obvious (clarification Q3).
- **Alternatives considered**: Inline highlight (single corrected SQL with the changed region highlighted) — viable but more code for no clearer review; plain text — rejected (does not satisfy "change clearly distinguishable").

## R5 — Stale-proposal handling

- **Decision**: When a fix is requested, snapshot the editor SQL at request time. On apply, compare the snapshot to the current editor SQL; if they differ, mark the proposal `stale`, show a stale notice, and require re-request. Never apply a stale proposal.
- **Rationale**: Clarification Q2 — a proposal based on outdated SQL must not silently overwrite newer edits. A request-time snapshot comparison is simple, testable, and unambiguous.
- **Alternatives considered**: Apply anyway (rejected — data-loss risk); block editing while pending (rejected — poor UX).

## R6 — Panel state management

- **Decision**: Keep the panel's open/closed state and its error/diagnosis/fix state in local component state (`useState`/`useRef`), not the persisted Zustand store. The panel opens automatically on a format error and is manually toggleable.
- **Rationale**: The error is transient and tied to the current editing session; persisting it would contradict the app's session-only analysis-state convention. Local state keeps the change minimal.
- **Alternatives considered**: Add persisted store fields — rejected (adds migration surface for no user value).

## R7 — Empty-query guard

- **Decision**: Keep the existing `toast.error(t.emptyQueryError)` guard for empty input; it is a validation pre-check, not a format error, so it does not open the panel.
- **Rationale**: Matches the spec assumption; avoids treating a non-error as an error.
- **Alternatives considered**: Route empty input through the panel — rejected (wrong semantics).
