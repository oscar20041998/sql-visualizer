---
feature: 018-ai-compare-results
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 15
planned_at: 2a69033
updated_at: 2a69033
suite_baseline: green
---

# Test List: AI SQL Comparison Results

Trace keys `US1-AS1` through `US3-AS6` identify the numbered acceptance scenarios in the three user stories in `spec.md`. `BASELINE` means an existing test pins the behavior and does not claim test-first history. `DONE` requires the behavior's evidence in the cycle log; `PENDING` indicates missing or incomplete evidence, not merely a missing test file.

## Outer loop: acceptance behaviors

| id | behavior | traces | layer | kind | state | test |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | Comparison shows the editor's original SQL as Before and the current SQL captured at run start as After. | US1-AS1, FR-001, FR-002, FR-003, SC-001 | integration | example | BASELINE | `tests/unit/query-input-sql-comparison.test.tsx::compares the SQL Editor original and current contents without a separate baseline capture` |
| A2 | The result labels both sides and makes inserted, deleted, and modified text distinguishable. | US1-AS2, FR-004 | component | example | DONE | `tests/unit/sqlComparisonPanel.test.tsx::labels both diff panes as Before and After` |
| A3 | An 8,000-line and long-line comparison remains fully inspectable by intentional scrolling at narrow and wide viewports. | US1-AS3, FR-005, SC-005 | E2E | example | MANUAL PARTIAL | Both views reached line 8,000 and the long final line wrapped at 811x500; no wide-viewport runner is available, and a Monaco disposal page error occurred during panel teardown/re-run. See T041 in `cycle-log.md`. |
| A4 | Formatting-only SQL changes are reported separately from structural changes. | US1-AS4, FR-006, SC-002 | integration | example | BASELINE | `tests/unit/query-input-sql-comparison.test.tsx::shows formatting-only changes separately from structural findings` |
| A5 | Identical SQL displays a no-changes result and does not request an unnecessary AI assessment. | US1-AS5, FR-014 | integration | example | DONE | `tests/unit/query-input-sql-comparison.test.tsx::shows no changes and does not request AI for identical editor SQL` |
| A6 | A supported filter or join change is identified with concise, relevant Before/After evidence. | US2-AS1, FR-007, FR-008 | integration | example | BASELINE | `tests/unit/query-input-sql-comparison.test.tsx::renders supported filter findings with relevant before and after evidence` |
| A7 | A long finding excerpt is summarized initially and the complete relevant evidence remains available on request. | US2-AS2, FR-007, FR-018, SC-005 | component | example | DONE | `tests/unit/sqlComparisonPanel.test.tsx::summarizes and expands long finding evidence` |
| A8 | An uncertain CTE match is identified as uncertain and is not presented as a confirmed broad semantic change. | US2-AS3, FR-007, FR-009 | integration | example | BASELINE | `tests/unit/query-input-sql-comparison.test.tsx::shows CTE matching limitations without a broad confirmed finding` |
| A9 | Partial or unsupported parsing is explicit while supported findings remain visible. | US2-AS4, FR-009, SC-004 | integration | example | BASELINE | `tests/unit/query-input-sql-comparison.test.tsx::keeps supported findings visible with partial parser coverage` |
| A10 | Before an AI request, the result says assessment has not started and offers the request action. | US3-AS1, FR-010 | component | example | DONE | `tests/unit/sqlComparisonPanel.test.tsx::shows the not-requested state and AI action` |
| A11 | While AI is running, progress is visible and streamed explanation text is identified as incomplete. | US3-AS2, FR-010, FR-011 | integration | example | BASELINE | `tests/unit/query-input-sql-comparison.test.tsx::shows streamed AI explanation text before the response completes` |
| A12 | A valid AI response renders its assessment, implications, evidence, assumptions, and verification steps as AI interpretation. | US3-AS3, FR-011, FR-013 | integration | example | DONE | `tests/unit/query-input-sql-comparison.test.tsx::renders validated AI assessment fields separately from deterministic findings` |
| A13 | An unavailable provider or invalid response has an explicit outcome and supported retry, while deterministic findings remain visible. | US3-AS4, FR-012, SC-004 | integration | example | DONE | `tests/unit/query-input-sql-comparison.test.tsx::shows unavailable and invalid AI outcomes with retry and retained findings` |
| A14 | Editing SQL during or after comparison marks the result stale and prevents an obsolete AI response from appearing current. | US3-AS5, FR-003, FR-015, SC-004 | integration | example | BASELINE | `tests/unit/query-input-sql-comparison.test.tsx::discards an AI response when the compared editor input becomes stale in flight` |
| A15 | A valid AI assessment can coexist with partial deterministic analysis without implying complete verification. | US3-AS6, FR-009, FR-011, FR-013, SC-004 | integration | example | DONE | `tests/unit/query-input-sql-comparison.test.tsx::keeps supported findings visible with partial parser coverage` |
| A16 | The summary distinguishes no changes, textual differences, structural findings, and analysis limitations before detailed findings. | FR-006, FR-008, SC-002 | component | example | DONE | `tests/unit/sqlComparisonPanel.test.tsx::renders comparison summary categories before detailed findings` |
| A17 | Switching or resetting the editor source updates the comparison pair instead of retaining an unrelated pair. | FR-001, FR-002, SC-001 | integration | example | BASELINE | `tests/unit/query-input-sql-comparison.test.tsx::refreshes both comparison sides after the editor source is replaced` |
| A18 | The AI section visibly distinguishes not requested, in progress, completed, partial, unavailable, failed, not needed, and stale states. | FR-010, SC-003 | component | example | DONE | `tests/unit/sqlComparisonPanel.test.tsx::renders each AI lifecycle state distinctly with only supported actions` |
| A19 | Comparing SQL or requesting AI does not execute SQL or change the editor contents. | FR-016, SC-007 | integration | example | BASELINE | `tests/unit/query-input-sql-comparison.test.tsx::leaves editor SQL unchanged and performs no execution during comparison` |
| A20 | New comparison content is available in English and Vietnamese and remains keyboard and assistive-technology accessible. | FR-017, SC-006 | component | example | DONE | `tests/unit/sqlComparisonPanel.test.tsx::renders comparison labels and AI states in English and Vietnamese`; keyboard dismissal/focus restoration is covered by U20. |
| A21 | Provider errors and logs do not expose credentials or sensitive SQL text. | FR-019, SC-008 | integration | example | DONE | `tests/unit/query-input-sql-comparison.test.tsx::sanitizes provider failures in visible errors and captured logs` |

## Inner loop: unit behaviors
### `src/lib/sql/sqlComparison.ts`

| id | behavior | traces | layer | kind | state | test |
| --- | --- | --- | --- | --- | --- | --- |
| U1 | A changed filter is classified and includes the exact relevant Before/After evidence. | FR-007, SC-002 | unit | example | BASELINE | `tests/unit/sqlComparison.test.ts::reports filter and projection changes with exact source evidence` |
| U2 | A changed projection is classified independently from the filter change. | FR-007, SC-002 | unit | example | BASELINE | `tests/unit/sqlComparison.test.ts::reports filter and projection changes with exact source evidence` |
| U3 | Changed sources and joins are reported with the corresponding structural categories. | FR-007, SC-002 | unit | example | BASELINE | `tests/unit/sqlComparison.test.ts::reports changed sources, joins, grouping, ordering, and pagination` |
| U4 | Grouping, ordering, and pagination differences are reported with their own categories. | FR-007, SC-002 | unit | example | BASELINE | `tests/unit/sqlComparison.test.ts::reports changed sources, joins, grouping, ordering, and pagination` |
| U5 | Formatting-only differences produce a formatting category without structural findings. | FR-006, SC-002 | unit | example | BASELINE | `tests/unit/sqlComparison.test.ts::distinguishes formatting-only changes from structural changes` |
| U6 | Identical SQL produces no changes, no findings, and a skipped AI state. | FR-014 | unit | example | BASELINE | `tests/unit/sqlComparison.test.ts::reports identical SQL as no changes without requesting AI` |
| U7 | Invalid SQL preserves available facts and explicitly reports partial analysis. | FR-009 | unit | example | BASELINE | `tests/unit/sqlComparison.test.ts::retains available facts and reports partial results for invalid SQL` |
| U8 | Empty or comment-only input does not invent a comparable statement or findings. | FR-009 | unit | example | DONE | `tests/unit/sqlComparison.test.ts::reports an unavailable pair for empty and comment-only inputs` |
| U9 | CTEs that cannot be confidently matched produce a scoped limitation rather than an unrelated whole-clause change. | FR-007, FR-009 | unit | example | DONE | `tests/unit/sqlComparison.test.ts::keeps ambiguous CTE matching partial and evidence scoped` |
| U10 | Supported analysis is checked for the four application dialects, with unavailable parser coverage reported as partial. | FR-009, SC-002 | unit | example | BASELINE | `tests/unit/sqlComparison.test.ts::reports supported changes and parser limits by dialect` |

### `src/lib/ai/sqlComparisonAi.ts`

| id | behavior | traces | layer | kind | state | test |
| --- | --- | --- | --- | --- | --- | --- |
| U11 | The prompt contains the exact snapshot and selected dialect and treats SQL text as untrusted data. | FR-011 | unit | example | BASELINE | `tests/unit/sqlComparisonAi.test.ts::grounds the prompt in immutable SQL and treats embedded instructions as untrusted data` |
| U12 | The prompt includes the supplied deterministic facts and analysis limitations. | FR-011 | unit | example | BASELINE | `tests/unit/sqlComparisonAi.test.ts::includes deterministic comparison facts and limitations in the AI prompt` |
| U13 | Only structured responses with SQL-grounded evidence are accepted; malformed and unsupported claims are rejected. | FR-011, FR-013 | unit | example | BASELINE | `tests/unit/sqlComparisonAi.test.ts::accepts only structured, non-empty responses grounded in supplied SQL` |
| U14 | Oversized SQL context is bounded and declares that truncation occurred. | FR-011 | unit | example | BASELINE | `tests/unit/sqlComparisonAi.test.ts::bounds oversized SQL context and declares truncation` |
| U15 | Both SQL markers fit within the configured prompt and output token budget. | FR-011 | unit | example | BASELINE | `tests/unit/sqlComparisonAi.test.ts::fits both SQL snapshots and the output reservation into the configured context window` |
| U16 | Partial stream extraction returns readable explanation text only when it is available. | FR-010 | unit | example | BASELINE | `tests/unit/sqlComparisonAi.test.ts::extracts readable partial explanation text while the JSON response streams` |
| U17 | The provider receives the caller's cancellation signal, and an already-aborted request is not dispatched. | FR-015 | unit | example | BASELINE | `tests/unit/sqlComparisonAi.test.ts::streams the configured provider response and passes cancellation through`; `::cancels before provider dispatch when the request signal is already aborted` |
| U18 | Provider failure details cannot leak credentials or sensitive SQL through surfaced errors or logging. | FR-019, SC-008 | unit | example | DONE | `tests/unit/sqlComparisonAi.test.ts::sanitizes provider errors containing credentials and SQL` |

### `src/app/smart-sql-editor/components/SqlComparisonPanel.tsx`

| id | behavior | traces | layer | kind | state | test |
| --- | --- | --- | --- | --- | --- | --- |
| U19 | The accessible panel launcher opens the captured diff and findings. | FR-003, FR-004, FR-017 | component | example | BASELINE | `tests/unit/sqlComparisonPanel.test.tsx::opens from the accessible rail launcher and renders the captured diff and findings` |
| U20 | Escape closes the panel and restores focus to the launcher. | FR-017 | component | example | BASELINE | `tests/unit/sqlComparisonPanel.test.tsx::dismisses on Escape and restores focus to the launcher` |
| U21 | Closing and reopening the panel preserves the displayed comparison result. | FR-003 | component | example | BASELINE | `tests/unit/sqlComparisonPanel.test.tsx::closes and reopens without discarding the result` |
| U22 | A stale result is identified as stale while its captured diff remains available. | FR-003, FR-015 | component | example | BASELINE | `tests/unit/sqlComparisonPanel.test.tsx::labels a result stale instead of presenting it as current` |
| U23 | Long evidence is collapsed without removing access to the relevant SQL evidence. | FR-007, FR-018 | component | example | DONE | `tests/unit/sqlComparisonPanel.test.tsx::summarizes and expands long finding evidence` |
| U24 | Every AI lifecycle state has distinct accessible status text and only the actions valid for that state. | FR-010, FR-012 | component | example | DONE | `tests/unit/sqlComparisonPanel.test.tsx::renders each AI lifecycle state distinctly with only supported actions` |
| U25 | All comparison labels and state messages are localized in both supported locales. | FR-017, SC-006 | component | example | DONE | `tests/unit/sqlComparisonPanel.test.tsx::renders comparison labels and AI states in English and Vietnamese` |

### `src/app/query-input/page.tsx`

| id | behavior | traces | layer | kind | state | test |
| --- | --- | --- | --- | --- | --- | --- |
| U26 | The comparison snapshot uses the editor's original and current SQL at comparison start. | FR-001, FR-002, FR-003 | integration | example | BASELINE | `tests/unit/query-input-sql-comparison.test.tsx::compares the SQL Editor original and current contents without a separate baseline capture` |
| U27 | A displayed result becomes stale when the current editor SQL changes. | FR-003, FR-015 | integration | example | BASELINE | `tests/unit/query-input-sql-comparison.test.tsx::compares immutable editor snapshots, opens results, and marks later edits stale`; `::keeps the compared SQL snapshot visible and marks it stale after further editor changes` |
| U28 | An obsolete in-flight AI response is not rendered as the current assessment. | FR-015 | integration | example | BASELINE | `tests/unit/query-input-sql-comparison.test.tsx::discards an AI response when the compared editor input becomes stale in flight` |
| U29 | Identical SQL does not start an AI request. | FR-014 | integration | example | BASELINE | `tests/unit/query-input-sql-comparison.test.tsx::shows no changes and does not request AI for identical editor SQL` (A5 characterization) |
| U30 | Empty or comment-only pairs do not produce fabricated findings. | FR-009 | integration | example | DONE | `tests/unit/query-input-sql-comparison.test.tsx::shows the incomplete-pair state without findings` |
| U31 | Comparing or requesting AI does not execute SQL or mutate editor contents. | FR-016 | integration | example | BASELINE | `tests/unit/query-input-sql-comparison.test.tsx::leaves editor SQL unchanged and performs no execution during comparison` (A19 characterization) |
| U32 | Provider failure preserves deterministic results. | FR-012 | integration | example | DONE | `tests/unit/query-input-sql-comparison.test.tsx::shows unavailable and invalid AI outcomes with retry and retained findings` |
| U33 | Provider failure content is not exposed in user-facing errors or captured logs. | FR-019 | integration | example | DONE | `tests/unit/query-input-sql-comparison.test.tsx::sanitizes provider failures in visible errors and captured logs` |

## Invariants and edge cases still to place

- `A3` needs a browser-backed E2E mechanism to verify Monaco scrolling and responsive layout with 8,000 lines; the current profile records no E2E or acceptance command.
- The spec requires reset, reload, and source-switch behavior, but current integration tests cover initial editor content, remounting, formatting fixes, and edits only; `A17` adds the missing reset/replacement assertion.
- The 8,000-line check is manually exercised but remains partial until the Monaco teardown error is explained and a wide viewport is inspected; no automated browser runner is recorded in the profile.

## Out of scope

- Live database execution, query plans, or result-set comparisons; the spec explicitly keeps comparison analysis-only.
- Live provider credentials or external provider services in tests; the profile requires stubbed provider requests.
- Property, contract, approval, mutation, coverage, or browser-runner-specific commands; the profile records those capabilities as unavailable or unverified.

## Verification commands

Copied verbatim from `.specify/memory/tdd-profile.md`:

- Single test: `npm test -- tests/unit/sqlSourceClassification.test.ts`
- Full suite: `npm test`

The profile has no generic named-test filter or acceptance/E2E command recorded. Do not claim a behavior's test-first red until its focused test command is verified and the failure is captured in `tdd/cycle-log.md`.