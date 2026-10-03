# Cycle Log: Query Input UX Improvement

Append only. Newest last. Every entry's `red` block is the evidence that the test
existed and failed before the implementation.

## Baseline

- suite: `npm test` -> 14 passed files, 67 passed tests (12.0s)
- commit: `1387357` (working tree already dirty: the `/speckit-implement` changes are uncommitted)
- recorded: cycle 0, before any change in this session

## Cycle 1: batch — US1/US2/US3 component tests (workflow, parameters, review)

- test: `tests/unit/query-input-workflow.test.tsx`, `tests/unit/query-input-parameters.test.tsx`,
  `tests/unit/query-input-review.test.tsx` (new, 19 tests) — covers A1–A8, A12 and U1–U5, U7–U9, U11, U12
- red: `npx vitest run tests/unit/query-input-workflow.test.tsx tests/unit/query-input-parameters.test.tsx tests/unit/query-input-review.test.tsx`
  -> `Test Files  3 failed (3)`, `Tests  16 failed | 3 passed (19)`
- green: the UI work across `src/app/query-input/**`, `src/components/ui/LintingAlerts.tsx` and
  `src/locales/{en,vi}.ts`. Suite -> 14 files, 67 passed; `npm run type-check` clean; `npm run build` succeeds.
- refactor: none recorded (formatting/lint fixes only)
- commit: none — see "Notes and deviations"
- notes: **granularity deviation.** This batch belongs to the `/speckit-implement` pass, which wrote
  three files and one red observation instead of one behavior per cycle. It is recorded once, as it
  happened, rather than reconstructed as 19 individual cycles. Not claimed as one-behavior-per-cycle.

## Cycle 2: U6 conditional marker stays visible next to the parameter name

- test: `tests/unit/query-input-parameters.test.tsx::keeps the conditional marker visible without replacing the parameter name or value` (new)
- baseline run: `npx vitest run tests/unit/query-input-parameters.test.tsx -t "keeps the conditional marker visible"`
  -> `Tests  1 passed | 6 skipped (7)` (characterization: the marker predates this feature)
- mutant: `ParameterConfig.tsx:132` `{conditionalParams[param] && (` -> `{false && conditionalParams[param] && (`
  -> `TestingLibraryElementError: Unable to find an element with the text: conditional.` (`1 failed | 6 skipped`)
- green: mutant restored exactly; suite `npm test` -> 68 passed
- refactor: none needed
- state: `BASELINE`
- commit: none

## Cycle 3: U10 secondary actions stay clickable while Analyze stays dominant

- test: `tests/unit/query-input-workflow.test.tsx::keeps the secondary actions clickable while the primary action stays dominant` (new)
- baseline run: `npx vitest run tests/unit/query-input-workflow.test.tsx -t "keeps the secondary actions clickable"`
  -> `Tests  1 passed | 6 skipped (7)`
- mutant: `ActionButtons.tsx:63` `onClick={onLoadSample}` -> `onClick={undefined}`
  -> `AssertionError: expected '' to contain 'WITH monthly_revenue'` (`1 failed | 6 skipped`)
- green: mutant restored exactly; suite -> 68 passed
- refactor: none needed
- state: `BASELINE`
- commit: none

## Cycle 4: U11 preview is read-only and mirrors the current SQL exactly

- test: `tests/unit/query-input-review.test.tsx::shows a read-only review state for direct SQL input` (strengthened: exact-content equality plus the editor `readOnly` contract exposed through the `@monaco-editor/react` double)
- baseline run: `npx vitest run tests/unit/query-input-review.test.tsx -t "shows a read-only review state"`
  -> `Tests  1 passed | 6 skipped (7)`
- mutant: `PreviewPanel.tsx:74` `readOnly: true` -> `readOnly: false`
  -> `Expected the element to have attribute:` (`1 failed | 6 skipped`)
- green: mutant restored exactly
- refactor: none needed
- state: `BASELINE`
- commit: none

## Cycle 5: U12 copy action writes the resolved SQL and confirms it

- test: `tests/unit/query-input-review.test.tsx::copies the resolved SQL to the clipboard and confirms it` (new; adds a `navigator.clipboard` interaction double in `beforeEach`)
- baseline run: `npx vitest run tests/unit/query-input-review.test.tsx -t "copies the resolved SQL"`
  -> `Tests  1 passed | 7 skipped (8)`
- mutant: `PreviewPanel.tsx` `handleCopy` — removed `navigator.clipboard.writeText(normalizedSql)`
  -> `AssertionError: expected "spy" to be called with arguments: [ Array(1) ]; Number of calls: 0` (`1 failed | 7 skipped`)
- green: mutant restored exactly
- refactor: none needed
- state: `BASELINE`
- commit: none

## Cycle 6: A8 finding detail and actions stay available behind the expand toggle

- test: `tests/unit/query-input-review.test.tsx::keeps the finding detail and its actions available behind the expand toggle` (new)
- baseline run: `npx vitest run tests/unit/query-input-review.test.tsx -t "keeps the finding detail"`
  -> `Tests  1 passed | 8 skipped (9)`
- mutant: `LintingAlerts.tsx:241` `{isExpanded && ...}` -> `{true && ...}` (details rendered while collapsed)
  -> `TestingLibraryElementError: Found multiple elements with the text: Warning` at `query-input-review.test.tsx:176` (`1 failed | 8 skipped`)
- green: mutant restored exactly
- refactor: none needed
- state: `BASELINE`
- notes: asserted at the collapsible surface because the Query Input page renders the expanded
  (non-collapsible) findings list; the shared `LintingAlerts` component is the seam where T028's
  "keep expand/collapse intact" is observable.
- commit: none

## Cycle 7: A10 resolved SQL gets more workspace width than input and parameters

- test: `tests/unit/query-input-workflow.test.tsx::gives the resolved SQL more width than the input and parameter column` (new) — this behavior is new in this feature
- red: implementation temporarily reverted to the pre-feature layout (`xl:grid-cols-4`, both columns
  `xl:col-span-2`, preview `maxHeight: 500px`), then
  `npx vitest run tests/unit/query-input-workflow.test.tsx -t "gives the resolved SQL more width"`
  -> `AssertionError: expected null not to be null` (`1 failed | 7 skipped`)
- green: re-applied the workspace contract (`xl:grid-cols-12`, input `xl:col-span-5`, SQL
  `xl:col-span-7 xl:min-h-[560px]`) -> `Tests  1 passed | 7 skipped (8)`
- refactor: none — the restored layout was already the intended implementation
- notes: the red was produced by reverting existing implementation to its pre-change state, per the
  playbook's instruction for code that already exists. Red and green were both run and recorded here.
- commit: none

## Cycle 8: U5 filtering keeps the values already entered

- test: `tests/unit/query-input-parameters.test.tsx::offers a search field for large parameter sets and filters without changing the entered values` (strengthened: enters `42`, filters, asserts the field value and the store entry survive)
- baseline run: `npx vitest run tests/unit/query-input-parameters.test.tsx -t "offers a search field for large parameter sets"`
  -> `Tests  1 passed | 6 skipped (7)`
- mutant: `ParameterConfig.tsx:82` search `onChange` also called `onParamChange('customerId', '')`
  -> `Error: expect(element).toHaveValue(42)` at `query-input-parameters.test.tsx:127` (`1 failed | 6 skipped`)
- green: mutant restored exactly; suite `npm test` -> 14 files, 72 passed
- refactor: this cycle *is* the test-strengthening step (no production behavior changed)
- state: `BASELINE` for the strengthened assertion
- commit: none

## Notes and deviations

- **No commits.** `.clinerules/80-git` forbids committing unless explicitly requested, so the loop's
  green-only commit cadence was not applied; everything is left in the dirty tree. The repository
  convention (`git log`) is Conventional Commits if commits are later requested.
- **Cycles 2–6 and 8 are characterization tests (`BASELINE`).** The behavior they assert already
  existed in the codebase (most of it predating this feature) and was preserved by the refactor, so
  they were written to capture it and verified with deliberate mutants rather than a red→green of new
  code. None of them is claimed as test-first.
- **Cycle 1 is a batch**, not one-behavior-per-cycle. See the entry.
- **`tasks.md` carries no behavior markers** (`[U3]`-style), so the Phase 6 behavior→task mapping could
  not be applied. The `/speckit-implement` pass ticked its own tasks (`T001`–`T036`, `T039`); the three
  remaining tasks (`T016`, `T037`, `T038`) need a browser and are still open.
- **Pre-existing stack gap, not fixed:** `@testing-library/react` and `@testing-library/jest-dom` are
  present in `package-lock.json` and `node_modules` but missing from `package.json` devDependencies, so
  a plain `npm install` can prune them and break the suite.
- **U3 clause recorded as over-specified:** the plan line says the empty, active and loading states are
  "mutually exclusive"; the loading overlay intentionally renders over the page while the preview keeps
  its empty prompt, and no requirement in `spec.md` (FR-011) asks for exclusivity. The state tests
  assert each state is user-readable; the exclusivity clause is not asserted and not implemented.
