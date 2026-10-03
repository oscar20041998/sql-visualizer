# Research: SQL Format Error Diagnostics with AI

Phase 0 output — resolves the design unknowns before Phase 1 artifacts.

## R1 — Capturing the sql-formatter error shape

- **Decision**: Wrap `format(sql, { language })` in a `captureFormatError()` helper (in `src/lib/sql/formatError.ts`) that catches the thrown object and normalizes it into a `FormatError` with `message`, `dialect`, and, when the formatter provides one, a character offset (or 1-based `line`/`column` parsed out of the message). When a position exists, derive a short `snippet` around it; otherwise leave location/snippet undefined and record `locationSource: 'formatter'`.
- **Rationale**: `sql-formatter` throws an `Error`-like object whose message is the reliable signal, while position data is optional and must never be fabricated. The formatter remains the **primary** source of truth; when it reports no usable position, the AST cross-check parser is the documented **fallback** source for the error region (clarification 2026-09-25, FR-019) rather than a contradiction of it.
- **Alternatives considered**: Treat `dt-sql-parser` as the primary locator — rejected (the formatter's own error is the signal the user just triggered, and reordering them would hide the real failure). Skip position capture entirely and only show the message — rejected (without a position there is no bounded region, so no fix can ever be applied safely, see R8).

## R2 — AI grounding for explain and fix

- **Decision**: Build two structured prompts (`explainFormatError`, `proposeFormatFix`) that embed the exact error message, the offending SQL, and the active dialect. The model replies with strict JSON (see contracts). The UI renders the model text verbatim but never overrides the captured error facts.
- **Rationale**: Constitution Principle IV requires AI outputs to be grounded in parser/formatter facts and never contradict them. Embedding the actual error + SQL in the prompt is the minimal, reliable grounding mechanism; a JSON contract makes the response renderable and testable.
- **Alternatives considered**: Free-form prose responses — rejected (harder to render the explanation/root-cause/fix as separate fields and harder to validate).

## R3 — Ollama invocation path

- **Decision**: Reuse the existing `aiService.ts` adapter. Ollama is called directly from the browser at the configured `baseUrls.ollama + /v1/chat/completions` (no key, no server proxy), reading `settings.aiConfig.ollamaModel` and token budgets. Both the explanation and the fix are **single complete JSON responses** — no streaming (clarification 2026-09-25, FR-021).
- **Rationale**: This is the app's established Ollama path and satisfies "local only, no off-device SQL" while never holding a browser credential (FR-011, Constitution §Security allows on-device calls). The panel conveys progress with explicit loading states and never reloads the page, which covers the intent of Constitution §III for an on-demand diagnostic; the deviation is recorded (see R13).
- **Alternatives considered**: Add a server API route to proxy Ollama — rejected (unnecessary; Ollama is already direct and local, and a proxy would add latency + a failure surface without a privacy benefit).

## R4 — Review-before-apply presentation (side-by-side)

- **Decision**: Render the proposed fix in Monaco `DiffEditor` (`renderSideBySide: true`), original on one side and corrected SQL on the other. Apply performs the **region-bounded splice** (R8/R9) and only on explicit user confirmation.
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

## R8 — Resolving the erroneous region (the replacement boundary)

- **Decision**: Add a pure `resolveErrorRegion(error, sourceSql)` in `src/lib/sql/formatErrorRegion.ts` returning a contiguous `{ startOffset, endOffset, startLine, endLine, source }` or `null`. Position resolution order: (1) the captured formatter location (offset, or line/column converted to an offset); (2) when absent, the AST cross-check parser's parse-error position for the same text, recorded as `source: 'ast-parser'` (FR-019); (3) otherwise `null` — never fabricated. The position is then expanded to the smallest **logical construct** that contains it: the statement span when the cross-check parser can delimit it, otherwise the affected line range. Both are clamped to the SQL bounds and never empty.
- **Rationale**: A whole-document boundary defeats the safety requirement; a single character or token cannot repair a multi-line broken construct (an unterminated string or comment spans lines). The statement is the smallest unit a correction may legitimately rewrite, and it matches the unit the AST cross-check already produces (Constitution §I). When the query cannot be parsed — precisely the failing case — the affected line range is the conservative fallback, still far narrower than the document.
- **Alternatives considered**: Whole document — rejected (reintroduces the wholesale-rewrite hazard the user reported). Single token — rejected (cannot fix multi-line constructs). Let the model supply the range — rejected (offsets from an LLM are unverifiable; the client already owns the boundary). Let the user drag-select the range — rejected (defeats the automation promise; reconsider only if SC-005 measurement shows the automatic region is too narrow in practice).

## R9 — Extracting the model's change and enforcing region containment

- **Decision**: In `src/lib/sql/formatFixScope.ts`, `extractChange(original, proposed)` computes the longest common prefix and the longest non-overlapping common suffix, yielding `{ startOffset, endOffset, originalFragment, replacement }`. `applyScopedFix({ original, change, region, snapshot, currentSql })` returns either `{ ok: true, sql, appliedRange }` or a typed rejection: `stale`, `no-change`, `undetermined-region`, `out-of-range`. The splice is `original.slice(0, start) + replacement + original.slice(end)`.
- **Rationale**: The extracted span is exactly what the model altered, so the guard tests observable model behaviour rather than intent. Splicing instead of assigning `proposedSql` guarantees byte-identical text outside the span even when the model reformatted unrelated parts, and the containment check turns that case into an explicit rejection (FR-018) instead of silent data loss. Prefix/suffix diff is O(n), deterministic, and exhaustively unit-testable without a DOM.
- **Alternatives considered**: Apply `proposedSql` wholesale — rejected (the reported hazard). Trust a model-supplied patch — rejected (unverifiable offsets). Diff the ASTs — rejected (there is no AST for a query that failed to parse). Formatting-based comparison of both texts — rejected (whitespace-only drift would block legitimate fixes and adds a user-facing option surface).

## R10 — Grounding the AI when the region comes from the AST fallback

- **Decision**: When the region was resolved from the cross-check parser, the fix prompt embeds the parser's error message, the dialect, the bounded region snippet, and an explicit instruction that any change must stay inside the quoted region. The response contract remains `{ correctedSql }`; grounding is additive, not a new field.
- **Rationale**: FR-019 requires parser-grounded requests. Handing the model exactly the bounded text reduces out-of-range output at the source, while R9's guard still enforces the invariant. The snippet keeps prompts small on long queries and makes the proposal auditable against the quoted region.
- **Alternatives considered**: Whole SQL only — rejected (already the previous behaviour and gives the model room to drift). Add a structured `region` field to the response — rejected (the client already knows the region, so an echoed value adds no information and one more failure mode).

## R11 — Behaviour when no region can be determined

- **Decision**: `region === null` keeps the Fix action unavailable, shows an explicit "erroneous region cannot be determined" notice, and offers a "request a new proposal" affordance that re-runs region resolution. If it is still undeterminable the notice persists and no proposal is ever applicable.
- **Rationale**: FR-020. Inventing a boundary would reintroduce the hazard, while a visible dead-end with a clear reason — and the still-available Explain action — is safe and actionable: the user can correct the reported token or ask the model what is wrong.
- **Alternatives considered**: Fall back to whole-document review-before-apply — rejected in clarification 2026-09-25 (reintroduces the risk). Let the model choose the range — rejected (unverifiable). Hide the Fix action silently — rejected (the user cannot tell why the capability is missing).

## R12 — Apply ordering and staleness granularity

- **Decision**: Keep FR-016's whole-document snapshot comparison and evaluate it **first** at apply time. Order: `stale` → `undetermined-region` → `no-change` → `out-of-range` → apply. A pending proposal never blocks editing.
- **Rationale**: Any intervening edit invalidating the proposal is the conservative, already-specified behaviour. Because the splice is region-bounded, an edit outside the region can never be silently preserved inside a proposal the user reviewed, so the conservative check costs nothing in safety and avoids extra state.
- **Alternatives considered**: Per-region staleness — rejected (an edit elsewhere would be silently preserved while the user believes the proposal covered the whole file). Optimistic version counters — rejected (more machinery, no benefit in a single-user editor).

## R13 — Constitution §III streaming deviation

- **Decision**: Keep single-response semantics for explain and fix (FR-021); record the deviation in the spec's Assumptions and in the plan's Complexity Tracking; raise the §III amendment outside this feature.
- **Rationale**: Both responses are small structured JSON rendered as discrete fields. Streaming would need a stream-friendly format plus a partial-JSON assembler, adding parser complexity to a diagnostic panel for no perceived latency gain, while explicit loading states already cover progress without a page reload.
- **Alternatives considered**: Stream partial JSON — rejected (raw fragments are not renderable and would surface parser noise). Stream the transport but render only the assembled result — rejected (pays the complexity cost for zero user-visible benefit). Drop the feature — rejected.
