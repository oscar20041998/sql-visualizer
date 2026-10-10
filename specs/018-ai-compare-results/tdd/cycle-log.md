# Cycle Log: AI SQL Comparison Results

Append-only TDD evidence. A behavior is not complete until its red, green, refactor, and final test evidence are recorded here.

## Baseline

- suite: `npm test` -> 63 files, 574 tests passed, 0 failed (recorded in `.specify/memory/tdd-profile.md` on 2026-10-09)
- feature cycle baseline: 2026-10-10; implementation changes for feature 018 had not started

## Cycle 1: A2 labels both diff panes as Before and After

- test: `tests/unit/sqlComparisonPanel.test.tsx::labels both diff panes as Before and After` (new)
- red: `npm test -- tests/unit/sqlComparisonPanel.test.tsx -t "labels both diff panes as Before and After"` -> `TestingLibraryElementError: Unable to find an element with the text: Before (Original).`
- green: `npm test -- tests/unit/sqlComparisonPanel.test.tsx -t "labels both diff panes as Before and After"` -> 1 passed, 0 failed
- refactor: none needed; the two localized labels fit directly into the existing diff panel, and no behavior-preserving cleanup was indicated
- final: `npm test -- tests/unit/sqlComparisonPanel.test.tsx` -> 8 passed, 0 failed; editor diagnostics -> no errors

## Baseline characterization: A4 formatting-only result

- test: `tests/unit/query-input-sql-comparison.test.tsx::shows formatting-only changes separately from structural findings` (new characterization test)
- baseline: `npm test -- tests/unit/query-input-sql-comparison.test.tsx -t "shows formatting-only changes separately from structural findings"` -> 1 passed, 0 failed; the actual comparator returned only `formatting-only`, and Query Input displayed its dedicated status without a structural finding
- production change: none; the behavior was already implemented in the comparator and panel

## Baseline characterization: A5 identical SQL

- test: `tests/unit/query-input-sql-comparison.test.tsx::shows no changes and does not request AI for identical editor SQL` (new characterization test)
- baseline: `npm test -- tests/unit/query-input-sql-comparison.test.tsx -t "shows no changes and does not request AI for identical editor SQL"` -> 1 passed, 0 failed; Query Input displayed the no-change state, omitted the AI action, and made no provider request
- production change: none; the existing comparator and page already skip AI for identical SQL

## A5 red: no-change source guidance

- test: `tests/unit/query-input-sql-comparison.test.tsx::shows no changes and does not request AI for identical editor SQL`
- red: `npm test -- tests/unit/query-input-sql-comparison.test.tsx -t "shows no changes and does not request AI for identical editor SQL"` -> 1 failed; the detail instructed users to update a separate `Before` baseline
- green: updated the English and Vietnamese detail to refer only to editing the editor SQL; focused A5 test passed (1/1)
- refactor: no further changes; comparison still uses the same captured editor snapshot and skips AI for identical SQL

## Baseline characterization: A6 filter evidence

- test: `tests/unit/query-input-sql-comparison.test.tsx::renders supported filter findings with relevant before and after evidence` (new characterization test)
- baseline: `npm test -- tests/unit/query-input-sql-comparison.test.tsx -t "renders supported filter findings with relevant before and after evidence"` -> 1 passed, 0 failed; the actual comparison result and page rendered the changed filter with both source excerpts
- production change: none; the existing comparator and panel already preserve concise filter evidence

## Baseline characterization: A17 source replacement

- test: `tests/unit/query-input-sql-comparison.test.tsx::refreshes both comparison sides after the editor source is replaced` (new characterization test)
- baseline: `npm test -- tests/unit/query-input-sql-comparison.test.tsx -t "refreshes both comparison sides after the editor source is replaced"` -> 1 passed, 0 failed; after a newly resolved editor source was loaded, Compare received the replacement as both original and current SQL
- test harness: added the Monaco default-export stub required by the MyBatis preview exercised by this source-replacement path
- production change: none; the existing page/editor source synchronization already resets both values

## Baseline characterization: A19 analysis-only behavior

- test: `tests/unit/query-input-sql-comparison.test.tsx::leaves editor SQL unchanged and performs no execution during comparison` (new characterization test)
- baseline: `npm test -- tests/unit/query-input-sql-comparison.test.tsx -t "leaves editor SQL unchanged and performs no execution during comparison"` -> 1 passed, 0 failed; the editor retained the compared SQL after Compare and AI review, and no network request was dispatched
- production change: none; the existing comparison/AI handlers do not execute or rewrite SQL

## U8 red: empty and comment-only inputs

- test: `tests/unit/sqlComparison.test.ts::reports an unavailable pair for empty and comment-only inputs`
- red: `npm test -- tests/unit/sqlComparison.test.ts -t "reports an unavailable pair for empty and comment-only inputs"` -> 1 failed; comment-only Before SQL was accepted and generated a fabricated projection change
- green: the existing empty-input guard now checks comment-stripped SQL before equality; focused test passed (1/1) and the full domain file passed (8/8)
- refactor: reused `stripSqlComments`; no additional abstraction was needed

## A16 red: comparison summary categories

- test: `tests/unit/sqlComparisonPanel.test.tsx::renders comparison summary categories before detailed findings`
- red: `npm test -- tests/unit/sqlComparisonPanel.test.tsx -t "renders comparison summary categories before detailed findings"` -> 1 failed; Testing Library could not find a region named `Comparison summary`, confirming the aggregate summary is absent
- green: localized the summary and rendered text-difference, structural-finding, and limitation status before the diff/details; the focused test passed (1/1) and the full panel file passed (9/9)
- refactor: no further changes; summary uses the existing comparison result and locale objects

## A3 component red: responsive diff viewport

- test: `tests/unit/sqlComparisonPanel.test.tsx::uses a viewport-sized diff with inline mode on narrow and side-by-side mode on wide screens`
- red: `npm test -- tests/unit/sqlComparisonPanel.test.tsx -t "uses a viewport-sized diff with inline mode on narrow and side-by-side mode on wide screens"` -> 1 failed; at 390px the diff still received `renderSideBySide: true`
- green: widened the drawer, made the diff height viewport-bounded, selected inline mode below 1200px, and explicitly enabled Monaco diff indicators; focused test passed (1/1) and the full panel file passed (10/10)
- browser validation: actual 8,000-line scrolling remains tracked by A3/T041; the verified profile has no E2E runner

## U9 red: ambiguous CTE matching

- test: `tests/unit/sqlComparison.test.ts::keeps ambiguous CTE matching partial and evidence scoped`
- red: `npm test -- tests/unit/sqlComparison.test.ts -t "keeps ambiguous CTE matching partial and evidence scoped"` -> 1 failed; parser incompleteness was reported, but no CTE identity/matching limitation was disclosed
- green: compared existing analyzer CTE identity sets, suppressed the broad `WITH` change when identities differ, and marked coverage partial; focused test passed (1/1) and full domain file passed (9/9)
- refactor: kept the behavior within the existing comparison pass and reused `AnalysisResult.ctes`

## Baseline characterization: U10 dialect matrix

- test: `tests/unit/sqlComparison.test.ts::reports supported changes and parser limits by dialect` (new characterization test)
- baseline: `npm test -- tests/unit/sqlComparison.test.ts -t "reports supported changes and parser limits by dialect"` -> 1 passed, 0 failed; filter changes remained visible for MySQL, PostgreSQL, SQL Server, and Oracle, and Oracle explicitly reported partial parser coverage
- observed capability: MySQL may also report partial analysis; the matrix requires a limitation whenever a result is partial rather than assuming unsupported coverage is complete
- production change: none; the existing analyzer/parser and dialect-validation paths already expose these outcomes

## A7/U23 red: expandable long evidence

- test: `tests/unit/sqlComparisonPanel.test.tsx::summarizes and expands long finding evidence`
- red: `npm test -- tests/unit/sqlComparisonPanel.test.tsx -t "summarizes and expands long finding evidence"` -> 1 failed; no full-evidence disclosure was present and the SQL excerpt rendered inline
- green: added a shared native `<details>` disclosure for long change and finding evidence, retained short excerpts inline, and localized the action; focused test passed (1/1) and full panel file passed (11/11)
- refactor: one local evidence renderer now keeps both evidence surfaces consistent; complete SQL remains available without a duplicate expanded block by default

## Baseline characterization: A8 CTE uncertainty in Query Input

- test: `tests/unit/query-input-sql-comparison.test.tsx::shows CTE matching limitations without a broad confirmed finding` (new characterization test)
- baseline: focused A8 command -> 1 passed, 0 failed; actual comparator output remained partial, the CTE identity limitation was visible, and no broad confirmed `WITH` finding was rendered
- production change: none in this cycle; the conservative CTE behavior was implemented and validated in U9

## Baseline characterization: A9 partial parser results

- test: `tests/unit/query-input-sql-comparison.test.tsx::keeps supported findings visible with partial parser coverage` (new characterization test)
- baseline: focused A9 command -> 1 passed, 0 failed; the page displayed partial status and parser limitation while retaining the supported filter finding
- production change: none; the comparator and panel already preserve supported findings alongside parser limitations

## A10 red: visible not-requested AI assessment

- test: `tests/unit/sqlComparisonPanel.test.tsx::shows the not-requested state and AI action`
- red: focused A10 command -> 1 failed; Testing Library could not find an accessible region named `AI Assessment` before a request
- green: kept the section visible for every result, localized the not-requested/not-needed messages and assessment heading, and moved the request action inside; focused test passed (1/1), full panel passed (12/12)
- refactor: preserved the existing request lifecycle fields; the panel derives the initial display state from the captured comparison result

## A12 red: structured AI assessment fields

- test: `tests/unit/query-input-sql-comparison.test.tsx::renders validated AI assessment fields separately from deterministic findings`
- red: focused A12 command -> 1 failed; React rejected the structured AI result because the page/panel contract accepted only a string explanation
- green: `npm test -- tests/unit/query-input-sql-comparison.test.tsx -t "renders validated AI assessment fields separately from deterministic findings"` -> 1 passed
- implementation: adapter schema validates structured impact hypotheses, SQL-grounded evidence, assumptions, limitations, and checks; page binds the payload to the current captured run; panel renders each field with localized labels

## A13 red: retry after provider and response failures

- test: `tests/unit/query-input-sql-comparison.test.tsx::shows unavailable and invalid AI outcomes with retry and retained findings`
- red: focused Vitest command -> 1 failed; the panel exposed no accessible retry button after an unavailable result
- green: focused A13 command -> 1 passed; unavailable and malformed results each offered retry, successful retry rendered the assessment, and deterministic findings stayed visible
- implementation: added localized retry action for unavailable, malformed, and failed statuses

## A15 red: partial parser coverage with AI assessment

- test: `tests/unit/query-input-sql-comparison.test.tsx::keeps supported findings visible with partial parser coverage`
- red: test setup first used a mismatched dialect, then a non-page run ID that correctly triggered the stale-response guard; both fixture mismatches were corrected before treating the behavioral red as evidence
- green: corrected focused A15 command -> 1 passed; valid assessment and parser limitation rendered together, partial AI state was visible, and deterministic verification remained not verified
- implementation: page preserves partial comparison status on a valid AI response; panel shows localized partial-state notice

## A18 red: distinguish AI lifecycle states

- test: `tests/unit/sqlComparisonPanel.test.tsx::renders each AI lifecycle state distinctly with only supported actions`
- red: focused panel command -> 1 failed; completed assessment content lacked a distinct accessible completion status
- green: focused panel command -> 1 passed; all eight lifecycle states and their valid actions were distinct
- implementation: added localized completion status; retry remains limited to retryable errors, with request/cancel/no-action states preserved

## U18 red: sanitize provider exception details

- test: `tests/unit/sqlComparisonAi.test.ts::sanitizes provider errors containing credentials and SQL`
- red: focused adapter command -> 1 failed; `SqlComparisonAiError.message` exposed the bearer token and SQL literal from the mocked provider exception
- green: focused adapter command -> 1 passed; sanitized error retained `unavailable` classification without either secret
- implementation: provider error kind is classified locally; callers receive a fixed generic message rather than the original provider exception

## A21 red: keep provider failures private in the UI

- test: `tests/unit/query-input-sql-comparison.test.tsx::sanitizes provider failures in visible errors and captured logs`
- green: focused integration command -> 1 passed; generic unavailable status appeared, deterministic finding remained, and spies captured no console error/warning containing the raw message

## U25 red: localize structured AI fields

- test: `tests/unit/sqlComparisonPanel.test.tsx::renders comparison labels and AI states in English and Vietnamese`
- green: focused locale and empty-pair command -> both tests passed; Vietnamese field labels, statuses, and retry control rendered correctly
- coverage: added localized labels for summary, hypotheses, SQL evidence, assumptions, verification, limitations, partial/completed states, and retries

## U30 red: empty/comment-only editor pair

- test: `tests/unit/query-input-sql-comparison.test.tsx::shows an incomplete-pair state without findings for comment-only current SQL`
- green: focused locale and empty-pair command -> 1 passed; comment-only After SQL produced partial status with no findings or AI request

## U24 green: accessible lifecycle status and actions

- test: `tests/unit/sqlComparisonPanel.test.tsx::renders each AI lifecycle state distinctly with only supported actions`
- green: focused A18 panel command -> 1 passed; all lifecycle notices expose `role="status"` where applicable and actions are state constrained

## Cross-cutting validation

- T042: focused four-suite command -> 4 test files, 56 tests passed
- T043: `npm run type-check` -> passed
- T043: `npm run lint` -> failed on existing unrelated lint errors in other modules; changed feature files have no lint errors (targeted Next lint reported only existing warnings in `page.tsx` and its integration test)
- first T044 full suite -> 2 stale-state assertions failed because the AI subsection reused the comparison-level stale message; separating those announcements with a dedicated localized AI-stale message
- formatting: Prettier applied to the changed TypeScript, locale, and test files

## T041 browser validation: 8,000-line and long-line diff

- environment: authenticated integrated browser at `http://localhost:4029/query-input`, viewport 811x500; Playwright Chromium is unavailable in this environment
- fixture: main Smart SQL Editor original remained `SELECT * FROM table LIMIT 10;`; current SQL was an 8,000-line MySQL statement, with a 1,200-character final predicate after the long-line pass; editor reported 8,000 lines and 168,072 current characters
- main editor compare view: Before/After panes rendered, Ctrl+End navigated to line 8,000, and the final predicate remained visible. The long final line wrapped through the diff viewport rather than being clipped.
- Before/After panel: reran comparison and confirmed the same original/current pair, both pane labels, summary, and line-8,000 navigation; local full SQL remained available even though AI context is bounded. Result explicitly stated that SQL had not been executed.
- caveats: only the available 811x500 viewport was inspected, not a separate wide viewport. Closing the panel and rerunning after SQL edits emitted the browser page error `TextModel got disposed before DiffEditorWidget model got reset`; the result UI remained rendered, but clean Monaco teardown/re-run is not established. This is recorded as a runtime issue, not an automation limitation.
- outcome: manual full-length and wrapping behavior observed; A3 remains partially verified pending wide-viewport coverage and resolution/classification of the Monaco disposal error.

## T044 final validation

- `npm test` -> 68 test files, 651 tests passed, 0 failed
- `npm run type-check` -> passed
- `npm run build` -> passed; emitted the existing Next.js configuration warnings noted during build
- `npm run lint` -> repository-wide run remains failed by unrelated existing lint errors; changed feature files had no lint errors and targeted lint reported only existing warnings in the query-input page and its integration test
- A15/T025 is implemented by `tests/unit/query-input-sql-comparison.test.tsx::keeps supported findings visible with partial parser coverage`, which verifies the valid AI assessment, visible parser limitation, partial AI lifecycle state, and `not verified` deterministic status; its combined A9/A15 purpose is now reflected in `test-list.md` and `tasks.md`.
- mandatory Companion after-implement hook: attempted the prescribed `python3 .specify/extensions/companion/scripts/write-context.py ...` command; skipped per hook graceful-degradation rules because `python3` is unavailable in this environment, so `.specify/.spec-context.json` was not updated.
- optional TDD verification hook: audit completed and recorded in `verification.md`; mutation testing is unavailable per the verified TDD profile.