---
feature: 008-query-input-ux
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 12
planned_at: 20260920
updated_at: 20260920
suite_baseline: green
---

# Test List: Query Input UX Improvement

## Outer loop: acceptance behaviors

Each behavior below maps to a user-visible acceptance criterion in `spec.md` and should be implemented as a red-first test before the corresponding UI work.

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| A1 | The page presents a clear workflow from input to parameter config to resolved SQL to analysis and clearly highlights the primary action | AC-1, FR-001, FR-003, SC-001, SC-002 | example | DONE | `tests/unit/query-input-workflow.test.tsx::exposes the workflow sections and keeps the input to parameters to review to findings order` |
| A2 | Switching input modes visibly updates the selected tab while preserving the underlying input workflow and behavior | AC-2, FR-004, FR-015 | example | DONE | `tests/unit/query-input-workflow.test.tsx::switches input modes without altering the underlying workflow`, `::marks the active input method through accessible tab semantics without relying on color alone` |
| A3 | The primary CTA remains visually dominant while secondary actions remain clearly subordinate | AC-3, FR-001, SC-002 | example | DONE | `tests/unit/query-input-workflow.test.tsx::renders the primary action as the only dominant CTA and explains it`, `::keeps the secondary actions clickable while the primary action stays dominant` |
| A4 | Parameter values are clearly named, searchable, and understood to be required to resolve the final SQL | AC-1, FR-006, FR-007, SC-003 | example | DONE | `tests/unit/query-input-parameters.test.tsx::labels every parameter field with the placeholder name and marks them as required to resolve SQL`, `::offers a search field for large parameter sets and filters without changing the entered values` |
| A5 | Updating a parameter value updates the final resolved SQL in the preview without breaking the parameter state | AC-3, FR-006, FR-007, SC-006 | example | DONE | `tests/unit/query-input-parameters.test.tsx::propagates an edited parameter value to the resolved SQL preview` |
| A6 | The resolved SQL area is clearly treated as the final statement that will be analyzed and remains readable in desktop layouts | AC-1, FR-008, FR-012, SC-004 | example | DONE | `tests/unit/query-input-review.test.tsx::treats the resolved SQL panel as the final statement to analyze`, `::shows a read-only review state for direct SQL input` |
| A7 | Analysis findings are readable by severity, summary, location, and issue type without expanding every item | AC-2, FR-009, FR-010, SC-005 | example | DONE | `tests/unit/query-input-review.test.tsx::scans findings by severity, summary and location without relying on color alone` |
| A8 | Expanding a finding keeps the detail and navigation actions available without disrupting the overview structure | AC-3, FR-009 | example | BASELINE | `tests/unit/query-input-review.test.tsx::keeps the finding detail and its actions available behind the expand toggle` |
| A9 | The page remains readable in both Vietnamese and English and uses the existing i18n system rather than hard-coded copy | US4-1, FR-013, SC-006 | example | DONE | `tests/unit/query-input-workflow.test.tsx::renders the Vietnamese workflow copy from the existing i18n resources` (visual legibility leg is manual: tasks.md T038) |
| A10 | The page remains usable at common desktop widths without the parameter section crowding the SQL workspace | US4-2, FR-012, SC-004 | example | DONE | `tests/unit/query-input-workflow.test.tsx::gives the resolved SQL more width than the input and parameter column` (cycle 7, red to green) |
| A11 | Keyboard focus state and labels remain clear for tabs, buttons, and fields without relying only on color | US4-3, FR-004, FR-015 | example | DONE | `tests/unit/query-input-workflow.test.tsx::supports arrow-key navigation between input methods`, `::marks the active input method through accessible tab semantics without relying on color alone` (focus-ring classes are not computed in jsdom) |
| A12 | Empty, loading, and error states explain the current condition without exposing raw technical details as the primary message | Edge cases, FR-011, SC-007 | example | DONE | `tests/unit/query-input-review.test.tsx::explains the empty state instead of leaving the review area blank`, `::communicates the loading state and disables the primary action while analyzing`, `::reports a missing query through the message, not a stack trace` |

## Inner loop: unit and component behaviors

### `src/app/query-input/page.tsx`

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U1 | The page keeps the current workflow order and only changes presentation | FR-001, FR-015 | example | DONE | `tests/unit/query-input-workflow.test.tsx::exposes the workflow sections and keeps the input to parameters to review to findings order` |
| U2 | Resolved SQL updates when parameter values change and does not mutate business logic | FR-006, FR-008, SC-006 | example | DONE | `tests/unit/query-input-parameters.test.tsx::propagates an edited parameter value to the resolved SQL preview` |
| U3 | Empty state, active state, and loading state are mutually exclusive and user-readable | FR-011, SC-007 | example | DONE | `tests/unit/query-input-review.test.tsx::explains the empty state instead of leaving the review area blank`, `::communicates the loading state and disables the primary action while analyzing` (the mutually-exclusive clause was dropped; see cycle-log notes) |

### `src/app/query-input/components/ParameterConfig.tsx`

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U4 | Parameter names and values are visually separated and both remain accessible to screen readers | FR-006, FR-007 | example | DONE | `tests/unit/query-input-parameters.test.tsx::labels every parameter field with the placeholder name and marks them as required to resolve SQL` |
| U5 | Search/filter reduces the parameter list to matching values without changing the underlying parameter model | FR-007, SC-003 | example | DONE | `tests/unit/query-input-parameters.test.tsx::offers a search field for large parameter sets and filters without changing the entered values` (strengthened in cycle 8) |
| U6 | Conditional markers remain visible without obscuring the parameter name or value | FR-006 | example | BASELINE | `tests/unit/query-input-parameters.test.tsx::keeps the conditional marker visible without replacing the parameter name or value` (cycle 2) |

### `src/app/query-input/components/TabNavigation.tsx`

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U7 | The selected tab announces its active state through accessible semantics and remains visible to the user | FR-004 | example | DONE | `tests/unit/query-input-workflow.test.tsx::marks the active input method through accessible tab semantics without relying on color alone` |
| U8 | Switching tabs keeps the same underlying mode logic and does not introduce a new destructive flow | FR-004, FR-015 | example | DONE | `tests/unit/query-input-workflow.test.tsx::switches input modes without altering the underlying workflow`, `::supports arrow-key navigation between input methods` |

### `src/app/query-input/components/ActionButtons.tsx`

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U9 | The Analyze control is the most prominent interactive action in the layout | FR-001, SC-002 | example | DONE | `tests/unit/query-input-workflow.test.tsx::renders the primary action as the only dominant CTA and explains it` |
| U10 | Secondary actions remain clickable and present but are visually subordinate | FR-001, SC-002 | example | BASELINE | `tests/unit/query-input-workflow.test.tsx::keeps the secondary actions clickable while the primary action stays dominant` (cycle 3) |

### `src/app/query-input/components/PreviewPanel.tsx`

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U11 | The preview renders the current SQL as the source of truth and keeps the read-only state clear | FR-008, SC-004 | example | BASELINE | `tests/unit/query-input-review.test.tsx::shows a read-only review state for direct SQL input` (cycle 4) |
| U12 | Copy behavior remains available when SQL exists, and empty content shows a clear prompt instead of a blank state | FR-008, FR-011 | example | BASELINE | `tests/unit/query-input-review.test.tsx::copies the resolved SQL to the clipboard and confirms it` (cycle 5), `::explains the empty state instead of leaving the review area blank` |

## Invariants and edge cases still to place

- No raw stack traces become the primary message when parsing, validation, or analysis fails.
- Large parameter lists and many findings remain accessible without breaking the workflow or hiding the primary action.
- Locale changes keep behavior and copy aligned with the same structured workflow in both English and Vietnamese.

## Out of scope

- New analysis rules or parser logic changes: explicitly outside the UX scope in the feature plan.
- New persistence or backend APIs: no requirement exists in `spec.md` or `plan.md` for this feature.

## Verification commands

Copied verbatim from `.specify/memory/tdd-profile.md` at planning time:

- Single test: `npx vitest run {file} -t "{name}"`
- Full suite: `npm test`
- Coverage: not configured in the current profile (`null`)
- Mutation: not configured in the current profile (`null`)

---

## Consolidation and deviations

The inner-loop rows (U1 to U12) were implemented as tests inside the three consolidated files named
above rather than one file per component, because the behaviors are only observable through the page
(parameter and state wiring) or through one shared surface (the linting alerts). Every row above names
the real test that asserts it.

Cycle-by-cycle evidence, including the mutant checks that prove the characterization tests can fail,
is in cycle-log.md. Two deviations are recorded there: cycle 1 was a batch (19 tests written for a
single red observation during the implement pass, not one behavior per cycle), and U3's
"mutually exclusive" clause was dropped as over-specified by spec.md FR-011.