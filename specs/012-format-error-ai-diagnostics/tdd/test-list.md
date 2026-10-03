---
feature: 012-format-error-ai-diagnostics
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 11
planned_at: 8878435
updated_at: 8878435
suite_baseline: green
---

# Test List: SQL Format Error Diagnostics with AI

Derived from `spec.md` (revised 2026-09-25), `plan.md`, `data-model.md`,
`contracts/format-error-ai-contract.md` and `research.md`.

Criterion ids: `spec.md` numbers its acceptance scenarios inside each user story and
gives them no ids, so this list refers to them as `US<n>-AS<m>` (story, scenario) and
traces the supporting requirement as `FR-###` / `SC-###`, which are the explicit ids the
spec does provide. No behavior here invents a requirement.

**Acceptance runner**: the stack profile records `acceptance: null` — this repository has
no browser E2E runner. The outer loop is therefore an **integration-level** acceptance
test driven through the real component entry point
(`tests/unit/smart-sql-editor-format-error-page.test.tsx`, the Smart SQL Editor page
composed with the panel and the editor), not a browser test. Every `A` row names the
runner that will host it; rows that cannot be observed at that level say so.

## Outer loop: acceptance behaviors

One per acceptance scenario in `spec.md`, in spec order.

| id  | behavior                                                                                         | traces        | kind    | state   | test                                                             |
| --- | ------------------------------------------------------------------------------------------------ | ------------- | ------- | ------- | ---------------------------------------------------------------- |
| A1  | Formatting valid SQL leaves it formatted, shows the success confirmation and opens no panel       | US1-AS1, FR-001 | example | PENDING | `tests/unit/smart-sql-editor-format-error-page.test.tsx::valid SQL formats with no panel` |
| A2  | Formatting invalid SQL opens the right-side panel and leaves the editor SQL unchanged              | US1-AS2, FR-005, FR-003 | example | PENDING | `tests/unit/smart-sql-editor-format-error-page.test.tsx::format error opens the panel beside the editor` |
| A3  | Closing the panel hides the report and reopening it shows the same error                          | US1-AS3, FR-004 | example | DONE    | `tests/unit/format-error-panel.test.tsx::closes and reopens from the toggle control, keeping the error available` |
| A4  | A format error with a position shows that location and a SQL snippet                             | US1-AS4, FR-006 | example | DONE    | `tests/unit/format-error-panel.test.tsx::shows the location and snippet when the formatter reported a position` |
| A5  | Requesting an explanation renders a plain-language explanation and a root cause                   | US2-AS1, FR-007 | example | DONE    | `tests/unit/format-error-panel.test.tsx::renders the explanation, root cause and evidence once ready` |
| A6  | The rendered explanation quotes the actual offending SQL and the actual error                     | US2-AS2, FR-008 | example | DONE | `tests/unit/format-error-ai.test.ts::rejects an explanation whose evidence quotes SQL the editor never held` |
| A7  | An unreachable local model yields an actionable unavailable/retry state, never a silent failure    | US2-AS3, FR-013 | example | DONE    | `tests/unit/format-error-panel.test.tsx::surfaces an actionable unavailable state when the local model is down` |
| A8  | Requesting a fix shows the corrected SQL side-by-side with the original, naming the region        | US3-AS1, FR-010, FR-017 | example | DONE | `tests/unit/format-error-panel.test.tsx::shows the proposal as a side-by-side diff with the original on the opposite side` |
| A9  | Applying a fix replaces only the SQL inside the captured error location and the result re-formats  | US3-AS2, FR-017 | example | DONE | `tests/unit/smart-sql-editor-format-error-page.test.tsx::applies a fix by writing back only the error region` |
| A10 | Dismissing a proposal leaves the editor SQL untouched                                             | US3-AS3, FR-010 | example | DONE    | `tests/unit/format-error-panel.test.tsx::leaves the SQL untouched when the proposal is dismissed` |
| A11 | A proposal that also changes SQL outside the error location is rejected and a corrected one is offered | US3-AS4, FR-018 | example | DONE | `tests/unit/smart-sql-editor-format-error-page.test.tsx::never writes a proposal that reaches outside the region` + `tests/unit/format-error-panel.test.tsx::reports an out-of-range proposal and offers a corrected one` |

### Criterion coverage

All 11 acceptance scenarios have exactly one `A` behavior. Five are already proven green by
an existing test named in the row (`A3`, `A4`, `A5`, `A7`, `A10`). Six are `PENDING`:

- `A1` and `A2` need the format control itself driven through the page entry point; the existing page test emits the error through a prop, so `U62`/`U63` capture the current behavior first.
- `A6` (grounded explanation) is a cross-cutting claim: the prompt tests prove the grounding is sent, the panel test proves it is rendered, but nothing yet ties them in one composed test.
- `A8` was re-checked against its test: `format-error-panel.test.tsx::shows the proposal with Apply and Dismiss once ready` asserts the proposal section and the enabled actions, **not** the side-by-side presentation the criterion requires. It is therefore not credited, and the presentation itself is pinned by `U69`.
- `A9` and `A11` depend on the region-bounded apply that is not implemented yet.

### Requirements with no acceptance scenario

`FR-019` (AST cross-check fallback for the region), `FR-020` (no region ⇒ no applicable fix)
and `FR-021` (one complete response, no streaming) have no scenario of their own. They are
carried as inner behaviors `U11`, `U12`, `U20`, `U55` and `U41` rather than promoted to the

## Inner loop: unit behaviors

Grouped by the component that owns them in `plan.md`.

### `src/lib/sql/formatError.ts`

| id  | behavior                                                                                   | traces  | kind    | state   | test                                                        |
| --- | ------------------------------------------------------------------------------------------ | ------- | ------- | ------- | ----------------------------------------------------------- |
| U1  | Captures a non-empty, short message even when a non-`Error` value is thrown                 | FR-002  | example | DONE    | `tests/unit/format-error.test.ts::always produces a non-empty human-readable message` |
| U2  | Keeps a nearley grammar dump from filling the message                                      | FR-002  | example | DONE    | `tests/unit/format-error.test.ts::keeps the message readable when the formatter dumps a long nearley grammar` |
| U3  | Derives 1-based line/column plus a snippet from the formatter's character offset          | FR-002  | example | DONE    | `tests/unit/format-error.test.ts::derives a 1-based location, snippet and offset from a formatter offset` |
| U4  | Extracts line/column from the formatter message when no offset is present                  | FR-002  | example | DONE    | `tests/unit/format-error.test.ts::extracts the reported line/column from the formatter message when there is no offset` |
| U5  | Omits location and snippet when neither an offset nor a message position exists            | FR-002  | example | DONE    | `tests/unit/format-error.test.ts::omits the location and the snippet when the formatter gives no usable position` |
| U6  | Never fabricates a position when the message carries no line/column                        | FR-002  | example | DONE    | `tests/unit/format-error.test.ts::never fabricates a location when the message has no line/column` |
| U7  | `deriveLocationAndSnippet` returns an empty location when nothing is derivable              | FR-002  | example | DONE    | `tests/unit/format-error.test.ts::returns an empty location when neither offset nor message position exists` |
| U8  | Records `locationSource: 'formatter'` when the formatter supplied the position             | FR-019  | example | DONE    | `tests/unit/format-error.test.ts::records the formatter as the location source when a position is derivable (FR-019)` |
| U9  | Omits `locationSource` together with the location when no position is derivable             | FR-019  | example | DONE    | `tests/unit/format-error.test.ts::omits the location source together with the location when no position is derivable (FR-019)` |

### `src/lib/sql/formatErrorRegion.ts` (new)

| id  | behavior                                                                                    | traces  | kind              | state   | test                                                      |
| --- | ------------------------------------------------------------------------------------------- | ------- | ----------------- | ------- | --------------------------------------------------------- |
| U10 | Resolves a region from the formatter's character offset                                     | FR-017  | example           | DONE    | `tests/unit/format-error-region.test.ts::resolves a region covering the line that holds the formatter offset` |
| U11 | Resolves a region from line/column when the formatter supplied no offset                     | FR-017  | example           | DONE    | `tests/unit/format-error-region.test.ts::resolves a region when the formatter reports only a line and column` |
| U12 | Falls back to the AST cross-check parser's position and marks the source `ast-parser`       | FR-019  | example           | DONE | `tests/unit/format-error-region.test.ts::falls back to the cross-check parser` (plus `tests/unit/smart-sql-editor-format-error-page.test.ts::resolves the region from the cross-check parser when the formatter reports no position`) |
| U13 | Returns `null` when neither parser reports a position                                       | FR-020  | example           | DONE    | `tests/unit/format-error-region.test.ts::resolves no region when the formatter reported no position at all` |
| U14 | Returns `null` instead of throwing when the cross-check parser is unavailable               | FR-020  | example           | PENDING | `tests/unit/format-error-region.test.ts::returns null when the cross-check parser cannot run` |
| U15 | Never returns an empty range: a position that resolves to no characters yields no region       | FR-017  | example           | DONE    | `tests/unit/format-error-region.test.ts::returns no region when the position resolves to an empty line` |
| U16 | Returns a range whose text equals `sourceSql.slice(start, end)` on every resolution path     | FR-017  | example           | DONE    | `tests/unit/format-error-region.test.ts::region text matches the slice` |

### `src/lib/sql/formatFixScope.ts` (new)

| id  | behavior                                                                                   | traces  | kind              | state   | test                                                      |
| --- | ------------------------------------------------------------------------------------------ | ------- | ----------------- | ------- | --------------------------------------------------------- |
| U19 | Reports the model's span as the longest common prefix plus a non-overlapping common suffix  | FR-017  | example           | DONE    | `tests/unit/format-fix-scope.test.ts::extracts the change as the longest common prefix plus a non-overlapping suffix` |
| U20 | Reports no change when the proposal is identical to the original                            | FR-017  | example           | DONE    | `tests/unit/format-fix-scope.test.ts::reports no change for an identical proposal` |
| U21 | Confines a difference in trailing whitespace to that whitespace instead of the whole line    | FR-017  | example           | DONE    | `tests/unit/format-fix-scope.test.ts::confines a trailing-whitespace difference to that whitespace` |
| U22 | Rejects `stale` before evaluating any other reason                                         | FR-016  | example           | DONE    | `tests/unit/format-fix-scope.test.ts::rejects stale first` |
| U23 | Rejects `undetermined-region` when no region was resolved                                  | FR-020  | example           | DONE    | `tests/unit/format-fix-scope.test.ts::rejects when no region was determined` |
| U24 | Rejects `out-of-range` when the change starts before the region                             | FR-018  | example           | DONE    | `tests/unit/format-fix-scope.test.ts::rejects a change starting before the region` |
| U25 | Rejects `out-of-range` when the change ends after the region                                | FR-018  | example           | DONE    | `tests/unit/format-fix-scope.test.ts::rejects a change ending after the region` |
| U26 | Rejects `out-of-range` when the change lies entirely outside the region                     | FR-018  | example           | DONE    | `tests/unit/format-fix-scope.test.ts::rejects a change outside the region entirely` |
| U27 | Accepts a change that exactly fills the region                                              | FR-017  | example           | DONE    | `tests/unit/format-fix-scope.test.ts::accepts a change that exactly fills the region` |

### `src/lib/ai/formatErrorAi.ts`

| id  | behavior                                                                                   | traces  | kind    | state   | test                                                        |
| --- | ------------------------------------------------------------------------------------------ | ------- | ------- | ------- | ----------------------------------------------------------- |
| U31 | Explain prompt embeds the exact error message, the dialect and the failing SQL              | FR-008  | example | DONE    | `tests/unit/format-error-ai.test.ts::embeds the exact error message, the dialect and the failing SQL (grounding)` |
| U32 | Explain prompt forbids contradicting the formatter and forbids performance advice          | FR-008  | example | DONE    | `tests/unit/format-error-ai.test.ts::forbids contradicting the formatter and performance advice` |
| U33 | Explain prompt omits the location line when the error has no position                       | FR-008  | example | DONE    | `tests/unit/format-error-ai.test.ts::omits the location line when the error has no position` |
| U34 | Explain prompt answers in the active locale                                                | FR-007  | example | DONE    | `tests/unit/format-error-ai.test.ts::instructs the model to answer in Vietnamese when locale is vi, English otherwise` |
| U35 | Explanation parser accepts strict JSON, a fenced payload and surrounding prose               | FR-008  | example | DONE    | `tests/unit/format-error-ai.test.ts::tolerates a markdown fence and surrounding prose` |
| U36 | Explanation parser rejects missing fields, absent evidence and non-JSON prose               | FR-008  | example | DONE    | `tests/unit/format-error-ai.test.ts::rejects a payload with no evidence (grounding is mandatory)` |
| U37 | Failure classification maps unreachable and timeout to unavailable and preserves a classified malformed failure | FR-013 | example | DONE | `tests/unit/format-error-ai.test.ts::preserves an already-classified malformed failure instead of flattening it` |
| U38 | Fix prompt embeds the error, the dialect and the full failing SQL                            | FR-009  | example | DONE    | `tests/unit/format-error-ai-fix.test.ts::embeds the error, the dialect and the full failing SQL` |
| U39 | Fix prompt demands a minimal, semantics-preserving correction and SQL-only output           | FR-015  | example | DONE    | `tests/unit/format-error-ai-fix.test.ts::demands a minimal, semantics-preserving correction (FR-015)` |
| U40 | Fix parser rejects identical, whitespace-only and missing corrections                       | FR-009  | example | DONE    | `tests/unit/format-error-ai-fix.test.ts::rejects a correction that only differs by trailing whitespace` |
| U41 | Staleness is false while the editor matches the snapshot, true once it changes or is cleared, and tolerates a trailing newline | FR-016 | example | DONE | `tests/unit/format-error-ai-fix.test.ts::tolerates a trailing newline the editor may have added` |
| U42 | Neither AI request is ever sent to a cloud provider                                        | FR-014  | example | DONE    | `tests/unit/format-error-ai-fix.test.ts::never sends the request to a cloud provider (FR-014)` |
| U43 | Fix prompt quotes the resolved region and instructs the model to confine changes to it     | FR-019  | example | DONE    | `tests/unit/format-error-ai.test.ts::confines the correction to the quoted region` |

### `src/app/smart-sql-editor/components/FormatErrorPanel.tsx`

| id  | behavior                                                                                | traces  | kind    | state   | test                                                                  |
| --- | ----------------------------------------------------------------------------------------- | ------- | ------- | ------- | --------------------------------------------------------------------- |
| U46 | Renders the error summary, message, dialect and severity                                  | FR-006  | example | DONE    | `tests/unit/format-error-panel.test.tsx::renders the error summary, message, dialect and severity` |
| U47 | Shows location and snippet when a position exists and omits both when it does not         | FR-006  | example | DONE    | `tests/unit/format-error-panel.test.tsx::omits location and snippet entirely when the error has no position` |
| U48 | Hides the report body while closed and restores the same error on reopen                  | FR-004  | example | DONE    | `tests/unit/format-error-panel.test.tsx::does not render the report body when closed` |
| U49 | Toggles from the keyboard and exposes `aria-expanded` on the control                      | FR-004  | example | DONE    | `tests/unit/format-error-panel.test.tsx::toggles the report open by keyboard (Enter)` |
| U50 | Shows a loading state while an explanation or fix request is in flight                    | FR-012  | example | DONE    | `tests/unit/format-error-panel.test.tsx::shows a loading state while the explanation is in flight` |
| U51 | Renders the explanation, root cause and evidence once ready                              | FR-007  | example | DONE    | `tests/unit/format-error-panel.test.tsx::renders the explanation, root cause and evidence once ready` |
| U52 | Surfaces unavailable and malformed states instead of failing silently                     | FR-013  | example | DONE    | `tests/unit/format-error-panel.test.tsx::surfaces a malformed-answer state rather than failing silently` |
| U53 | Shows the proposal with Apply and Dismiss and copies the correction to the clipboard       | FR-010  | example | DONE    | `tests/unit/format-error-panel.test.tsx::copies the proposed correction to the clipboard` |
| U54 | Applies only after explicit confirmation and leaves the SQL untouched on dismiss         | FR-010  | example | DONE    | `tests/unit/format-error-panel.test.tsx::leaves the SQL untouched when the proposal is dismissed` |
| U55 | Flags a stale proposal, blocks Apply and announces it through `role="alert"`              | FR-016  | example | DONE    | `tests/unit/format-error-panel.test.tsx::announces the stale state through a role=alert` |
| U56 | Marks an unusable proposal invalid and never applies it                                  | FR-015  | example | DONE    | `tests/unit/format-error-panel.test.tsx::marks an unusable proposal invalid and never applies it` |
| U57 | Names the resolved error region and which parser supplied it                              | FR-017  | example | DONE    | `tests/unit/format-error-panel.test.tsx::names the resolved error region` |

### `src/app/smart-sql-editor/components/SmartSQLEditor.tsx`

| id  | behavior                                                                                | traces  | kind              | state   | test                                                                          |
| --- | ----------------------------------------------------------------------------------------- | ------- | ----------------- | ------- | ----------------------------------------------------------------------------- |
| U62 | Formatting valid SQL applies the formatted SQL, keeps the success confirmation and emits no format error | FR-001 | characterization | BLOCKED — no seam: the page test mocks the editor and the real editor needs Monaco; `plan.md` lists no pure format-step module | `tests/unit/smart-sql-editor-format-error-page.test.tsx::formats valid SQL without emitting a format error` |
| U63 | Formatting invalid SQL leaves the editor SQL unchanged and emits a format error           | FR-005  | characterization | BLOCKED — same seam as U62 | `tests/unit/smart-sql-editor-format-error-page.test.tsx::emits a format error and leaves the SQL unchanged` |
| U64 | Applying a fix today replaces the whole editor value with the model's correction         | FR-010, FR-017 | characterization | BASELINE — test retired at U65: the revised spec forbids this behaviour, so the page no longer performs it; `U65` is its replacement |
| U65 | A proposal whose change reaches outside the region never reaches the editor                    | FR-017  | example           | DONE    | `tests/unit/smart-sql-editor-format-error-page.test.tsx::never writes a proposal that reaches outside the region` |
| U66 | Re-formats the spliced SQL and writes nothing when that re-format throws                  | FR-010  | example           | DONE    | `tests/unit/smart-sql-editor-format-error-page.test.tsx::writes nothing when the spliced SQL still fails to format` |

### `src/app/smart-sql-editor/page.tsx`

| id  | behavior                                                                                | traces  | kind    | state   | test                                                                     |
| --- | ----------------------------------------------------------------------------------------- | ------- | ------- | ------- | ------------------------------------------------------------------------ |
| U67 | Renders the error panel beside the editor after a format error is emitted                | FR-003  | example | DONE    | `tests/unit/smart-sql-editor-format-error-page.test.tsx::renders the error panel beside the editor after a format error is emitted` |
| U68 | Holds the resolved region beside the error and hands it to the panel                     | FR-017  | example | DONE    | `tests/unit/smart-sql-editor-format-error-page.test.tsx::passes the resolved region to the panel` |

## Invariants and edge cases still to place

- The dialect value that crosses the contract is always one of the four canonical names; `tsql`/`plsql` never leak into the model or the prompt. Traces to the `data-model.md` terminology rule; needs a contract-level test once one is named.
- Region resolution plus change-span extraction plus splice complete well under 50 ms for a 1000-line query (plan performance budget). Sampled as one example test, not a proven bound.
- No proposal is ever applicable without a bounded region (FR-017/FR-020 read together). Pinned by `U23`, `U27`, `U28` and `U59`; listed here until an acceptance-level test states it once.
- The splice targets the request-time snapshot, so an edit after the proposal was generated is never silently folded into the correction (FR-016). Pinned by `U22` and `U30`.

## Out of scope

- More than one format error per attempt: the spec assumes the formatter's first failure only; no requirement asks for a list.
- Cloud providers for explanation or fix: v1 is local-Ollama-only by assumption, and `FR-014` excludes them.
- Applying a fix with no resolvable region: `FR-020` requires that no applicable fix be offered, so there is nothing to test as an apply path.
- Auto-applying a proposal without review: forbidden by `FR-010`; the review gate itself is tested instead.
- `SC-005` (≥70% of common syntax errors fixed on the first proposal) and `SC-006` (satisfaction rating): outcome metrics, not unit behaviors. Their measurement harness is tasks T032/T033; until it exists they are recorded as unverified rather than faked with a test.
- Other editor features (import modes, format-success refactors, dashboards): separate specs and existing suites.

## Verification commands

Copied verbatim from `.specify/memory/tdd-profile.md` at planning time, so this file is
readable on its own:

- Single test: `npx vitest run <file> -t "<name>"`
- Single file: `npx vitest run <file>`
- Full suite: `npm test`
- Watch: `npx vitest`
- Coverage, mutation, property, acceptance and contract runners: **not available** — the
  profile records them as `null`. Consequences: the two invariants above are sampled as
  example tests instead of property tests, and the outer loop is an integration test at
  the page component rather than a browser E2E test.

## Profile note

The profile was detected at `d50bc78`; the repository is now at `8878435`, and
`package.json` changed in between (`f950865`). The suite command still works
(`npm test` -> 34 files, 227 tests, 27.15 s, green), so the profile was used as recorded;
`/speckit-tdd-setup refresh` is recommended before the loop so the stale counts inside it
are corrected.

| U58 | Reports an out-of-range proposal and offers a corrected proposal                         | FR-018  | example | DONE    | `tests/unit/format-error-panel.test.tsx::reports an out-of-range proposal and offers a corrected one` |
| U59 | Disables Apply and states that no erroneous region could be determined                     | FR-020  | example | DONE    | `tests/unit/format-error-panel.test.tsx::disables apply and says why when no region was determined` |
| U60 | Reports the applied range after a successful region-bounded apply                         | FR-017  | example | DONE    | `tests/unit/format-error-panel.test.tsx::reports the applied range` |
| U61 | Announces applicability notices in the live region and moves focus to the retry control   | FR-018  | example | DONE    | `tests/unit/format-error-panel.test.tsx::announces the applicability notice and moves focus to the retry control` |
| U69 | Renders the proposal in a side-by-side diff with the original on the opposite side          | US3-AS1, FR-010 | example | DONE | `tests/unit/format-error-panel.test.tsx::shows the proposal as a side-by-side diff with the original on the opposite side` |

| U44 | Fix and explain prompts carry the cross-check parser's findings when the region came from it | FR-019 | example | PENDING | `tests/unit/format-error-ai.test.ts::grounds the request in the cross-check parser findings` |
| U45 | Both requests are issued once as a non-streaming call and parsed once                      | FR-021  | example | DONE | `tests/unit/format-error-ai.test.ts::issues a single non-streaming request for each request` |

| U28 | Accepts a change strictly inside the region                                                 | FR-017  | example           | DONE    | `tests/unit/format-fix-scope.test.ts::accepts a change inside the region` |
| U29 | Refuses a proposal that also edits text outside the region instead of writing those edits   | FR-017  | example           | DONE    | `tests/unit/format-fix-scope.test.ts::refuses a proposal that also edits a line outside the region` |
| U30 | Writes nothing at all when the editor moved on since the request, even for an applicable fix | FR-016 | example          | DONE    | `tests/unit/format-fix-scope.test.ts::writes nothing when the editor moved on` |

| U17 | A position on the first character yields a range starting at offset 0                       | FR-017  | example           | DONE    | `tests/unit/format-error-region.test.ts::starts the range at offset 0 for a position on the first character` |
| U18 | A position on the last character yields a range ending exactly at the SQL length            | FR-017  | example           | DONE    | `tests/unit/format-error-region.test.ts::ends the range exactly at the SQL length for a position on the last character` |
| U81 | Keeps the range inside the SQL bounds when the reported position lies past the end of the SQL | FR-017 | example         | DONE    | `tests/unit/format-error-region.test.ts::keeps a position past the end of the SQL inside the bounds` |
| U82 | Refuses a change whose replacement would add a line past the region (lengthening the region's own line stays legal) | FR-017 | example | DONE | `tests/unit/format-fix-scope.test.ts::rejects an insertion that carries text past the region` |

outer loop, so the 1:1 criterion mapping above stays exact.
