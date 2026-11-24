# Cycle Log: Database Object Intelligence

Append-only evidence; newest entries last.

## Baseline

- Date: 2026-11-22.
- HEAD: `b6b1230`; feature planning artifacts are uncommitted.
- Command: `npm test`.
- Result: 87 test files passed, 844 tests passed; duration 82.46 seconds.
- Nonfatal Vite deprecation and test warnings were emitted. This does not establish browser, parser capability matrix, or performance evidence.
- No feature behavior cycle has completed yet.

## Cycle 1: A1 — view analysis workspace

- RED command: `npm test -- tests\unit\object-intelligence-workspace.test.tsx`
- RED result: 1 test failed: `Unable to find role="tab" and name "Database objects"`.
- GREEN change: added an icon tab and a preliminary single-view workspace using the existing SQL analyzer and `node-sql-parser`; results are explicitly partial. The existing five-tab assertion was updated to six with user approval.
- GREEN command: `npm test -- tests\unit\object-intelligence-workspace.test.tsx tests\unit\query-input-workflow.test.tsx tests\unit\codegen\TabNavigation.test.tsx` -> 3 files, 14 tests passed.
- Type-check: `npm run type-check` -> passed after updating the dashboard's input-mode mapping.
- Full suite: `npm test` -> 88 files, 845 tests passed. Nonfatal Vite and Next image warnings remain.
- Refactor: formatted the new panel, analyzer, acceptance test and tab component; reran the same focused command -> 3 files, 14 tests passed.
- Open design gate: the installed `dt-sql-parser` exposes no SQL Server or Oracle parser; the constitution requires `dt-sql-parser` AST cross-checks for all four dialects. Do not claim those dialects satisfy the gate without a compatible approach.
- The user chose incremental MySQL/PostgreSQL delivery with SQL Server/Oracle disclosed as unverified. The approved tab changed a pre-existing five-tab assertion; execution paused and the user explicitly approved updating it to six without removing existing tab behavior checks.

## Cycle 2: U11 — original query source location

- RED command: `npm test -- tests\unit\object-intelligence-source.test.ts`
- RED result: expected `SELECT id FROM orders`, received `AS SELECT id FROM ord` for a definition with leading whitespace.
- GREEN change: disable parser trimming so AST offsets refer to the original source.
- GREEN command: `npm test -- tests\unit\object-intelligence-source.test.ts tests\unit\object-intelligence-workspace.test.tsx` -> 2 files, 2 tests passed.
- Refactor: none needed. U11 remains pending because this case checks the sliced source but the broader line/column navigation behavior is not yet implemented.

## Cycle 3: U16 — draft across in-app navigation

- RED command: `npm test -- tests\unit\object-intelligence-session.test.tsx`
- RED result: expected the reopened workspace to contain the previously entered view; the field was empty.
- GREEN change: retain the draft in the existing in-memory store, outside persisted `partialize`; invalidate displayed results when the draft or dialect changes.
- GREEN command: `npm test -- tests\unit\object-intelligence-session.test.tsx tests\unit\object-intelligence-workspace.test.tsx tests\unit\object-intelligence-source.test.ts` -> 3 files, 3 tests passed.
- Refactor: none needed. U16 remains pending until actual in-app navigation is verified; sign-out/identity reset is the next required privacy behavior.

## Cycle 4: U17 — sign-out clears the draft

- RED command: `npm test -- tests\unit\object-intelligence-signout.test.tsx`
- RED result: the object draft still contained its SQL after sign-out instead of being empty.
- GREEN change: clear the draft on sidebar sign-out and social-session expiry.
- GREEN command: `npm test -- tests\unit\object-intelligence-signout.test.tsx tests\unit\object-intelligence-session.test.tsx tests\unit\guestAccess.test.tsx` -> 3 files, 20 tests passed.
- Refactor: none needed. U17 remains pending until identity change, reload/close and consent lifecycle are verified.

## Cycle 5: U17 — identity change clears the draft

- RED command: `npm test -- tests\unit\object-intelligence-identity-session.test.tsx`
- RED result: a second guest session saw the first guest session's view definition.
- GREEN change: associate the in-memory draft with its session identity, hide and clear it for another identity, and invalidate it on a cross-document storage change while the panel is open.
- GREEN command: `npm test -- tests\unit\object-intelligence-identity-session.test.tsx tests\unit\object-intelligence-session.test.tsx tests\unit\object-intelligence-signout.test.tsx tests\unit\object-intelligence-workspace.test.tsx` -> 4 files, 4 tests passed.
- Refactor: none needed. U17 remains pending for other identity/lifecycle cases and consent.

## Cycle 6: U5 — parser failures are not invalid SQL

- RED command: `npm test -- tests\unit\object-intelligence-parser-errors.test.ts`
- RED result: 1 test failed: an unexpected parser error resolved as `unsupported`/`syntax` instead of rejecting.
- GREEN change: report parser syntax errors as unsupported, but propagate other parser failures for the workspace error state.
- GREEN command: `npm test -- tests\unit\object-intelligence-parser-errors.test.ts tests\unit\object-intelligence-source.test.ts tests\unit\object-intelligence-workspace.test.tsx` -> 3 files, 4 tests passed, including actual malformed SQL.
- Refactor: fixed a mistakenly nested regression test after the first focused run; reran the same command successfully. U5 remains pending for empty input and actionable feedback.

## Cycle 7: U17 — identity change with the workspace closed

- RED command: `npm test -- tests\unit\object-intelligence-identity-session.test.tsx`
- RED result: 1 test failed: the first guest's draft remained in memory after starting a second guest session while the workspace was unmounted.
- GREEN change: guest-session start notifies the client store, which clears a draft belonging to another identity even when the workspace is closed.
- GREEN command: `npm test -- tests\unit\object-intelligence-identity-session.test.tsx tests\unit\object-intelligence-session.test.tsx tests\unit\object-intelligence-signout.test.tsx tests\unit\guestAccess.test.tsx` -> 4 files, 21 tests passed.
- Refactor: none. U17 remains pending for other identity types, cross-tab lifecycle, reload and consent.

## Cycle 8: U17 — cross-tab guest identity change

- RED command: `npm test -- tests\unit\object-intelligence-identity-session.test.tsx`
- RED result: 1 of 2 tests failed: the draft remained in memory after a guest-session storage event while the workspace was closed. An earlier run had an accidentally nested test and was not valid RED evidence.
- GREEN change: reuse the session-owner calculation and observe guest storage changes in the client store independently of the workspace.
- GREEN command: `npm test -- tests\unit\object-intelligence-identity-session.test.tsx tests\unit\object-intelligence-session.test.tsx tests\unit\object-intelligence-signout.test.tsx tests\unit\guestAccess.test.tsx` -> 4 files, 22 tests passed.
- Refactor: none. U17 remains pending for other identity types, cross-tab sign-out, reload and consent.

## Cycle 9: U17 — social identity change with the workspace closed

- RED command: `npm test -- tests\unit\object-intelligence-identity-session.test.tsx`
- RED result: 1 of 3 tests failed: the first social user's draft remained in memory after a different user signed in.
- GREEN change: successful social sign-in publishes the same identity-change notification; a social identity takes precedence over any stale guest marker.
- GREEN command: `npm test -- tests\unit\object-intelligence-identity-session.test.tsx tests\unit\object-intelligence-session.test.tsx tests\unit\object-intelligence-signout.test.tsx tests\unit\guestAccess.test.tsx` -> 4 files, 23 tests passed.
- Refactor: none. U17 remains pending for demo login, cross-tab social/sign-out, reload and consent.

## Cycle 10: U17 — cross-tab social sign-out

- RED command: `npm test -- tests\unit\object-intelligence-identity-session.test.tsx`
- RED result: 1 of 4 tests failed: the social draft remained after its session was removed in another tab while the workspace was closed.
- GREEN change: also observe changes to the social-session storage key in the client store.
- GREEN command: `npm test -- tests\unit\object-intelligence-identity-session.test.tsx tests\unit\object-intelligence-session.test.tsx tests\unit\object-intelligence-signout.test.tsx tests\unit\guestAccess.test.tsx` -> 4 files, 24 tests passed.
- Refactor: none. U17 remains pending for demo identity, reload and consent.

## Cycle 11: U17 — social session ends with the workspace closed

- RED command: `npm test -- tests\unit\object-intelligence-identity-session.test.tsx`
- RED result: 1 of 5 tests failed: the social draft remained after the social session was cleared in the same tab while the workspace was closed.
- GREEN change: clearing an existing social session publishes the identity-change notification.
- GREEN command: `npm test -- tests\unit\object-intelligence-identity-session.test.tsx tests\unit\object-intelligence-session.test.tsx tests\unit\object-intelligence-signout.test.tsx tests\unit\guestAccess.test.tsx` -> 4 files, 25 tests passed.
- Refactor: none. U17 remains pending for guest/demo lifecycle, reload and consent.

## Regression checkpoint

- Before cycle 11: `npm run type-check` passed and `npm test` passed 93 files / 854 tests. The suite emitted existing nonfatal test warnings. Cycle 11 was verified with the focused command above; a subsequent full suite is still required.

## Cycle 12: U17 — guest session ends with the workspace closed

- RED command: `npm test -- tests\unit\object-intelligence-identity-session.test.tsx`
- RED result: 1 of 6 tests failed: the guest draft remained after its session was cleared while the workspace was closed.
- GREEN change: clearing an existing guest session publishes the identity-change notification.
- GREEN command: `npm test -- tests\unit\object-intelligence-identity-session.test.tsx tests\unit\object-intelligence-session.test.tsx tests\unit\object-intelligence-signout.test.tsx tests\unit\guestAccess.test.tsx` -> 4 files, 26 tests passed.
- Refactor: none. U17 remains pending for demo lifecycle, reload and consent.

## Cycle 13: U17 — demo sign-in after a guest session

- RED command: `npm test -- tests\unit\object-intelligence-identity-session.test.tsx`
- RED result: 1 of 7 tests failed: the guest draft remained after demo sign-in while the workspace was closed.
- GREEN change: successful demo sign-in publishes the identity-change notification and its marker takes precedence over a stale guest marker.
- GREEN command: `npm test -- tests\unit\object-intelligence-identity-session.test.tsx tests\unit\object-intelligence-session.test.tsx tests\unit\object-intelligence-signout.test.tsx tests\unit\guestAccess.test.tsx` -> 4 files, 27 tests passed.
- Refactor: none. U17 remains pending for demo sign-out, reload and consent.

## Cycle 14: U17 — demo sign-out with the workspace closed

- RED command: `npm test -- tests\unit\object-intelligence-identity-session.test.tsx`
- RED result: 1 of 8 tests failed: the demo draft remained after the demo session was cleared while the workspace was closed.
- GREEN change: clearing an existing demo marker publishes the identity-change notification.
- GREEN command: `npm test -- tests\unit\object-intelligence-identity-session.test.tsx tests\unit\object-intelligence-session.test.tsx tests\unit\object-intelligence-signout.test.tsx tests\unit\guestAccess.test.tsx` -> 4 files, 28 tests passed.
- Refactor: none. U17 remains pending for cross-tab demo, reload and consent.

## Cycle 15: U17 — cross-tab demo sign-out

- RED command: `npm test -- tests\unit\object-intelligence-identity-session.test.tsx`
- RED result: 1 of 9 tests failed: the demo draft remained after its marker was removed in another tab while the workspace was closed.
- GREEN change: observe changes to the demo marker in the client store.
- GREEN command: `npm test -- tests\unit\object-intelligence-identity-session.test.tsx tests\unit\object-intelligence-session.test.tsx tests\unit\object-intelligence-signout.test.tsx tests\unit\guestAccess.test.tsx` -> 4 files, 29 tests passed.
- Refactor: none. U17 remains pending for real browser reload/close and consent.

## Regression checkpoint after cycle 15

- `npm run type-check` -> passed.
- `npm test` -> 93 files and 859 tests passed, with nonfatal test warnings.
- `npm run build` -> passed; 25 static pages generated.
- This checkpoint does not complete the pending TDD behaviors, browser review or feature release gates.

## Cycle 16: A4 — preserve dashboard retry source after opening objects

- RED command: `npm test -- tests\unit\sqlMetricsDashboard.test.tsx -t "retries the MyBatis SQL after opening"`
- RED result: the dashboard retried stale raw SQL rather than resolved MyBatis SQL after switching to the new database-objects tab.
- GREEN change: retain the previous query input mode when entering the separate object workspace and use it for the existing dashboard.
- GREEN command: `npm test -- tests\unit\sqlMetricsDashboard.test.tsx tests\unit\query-input-workflow.test.tsx tests\unit\object-intelligence-workspace.test.tsx` -> 3 files, 30 tests passed; `npm run type-check` -> passed.
- Refactor: none. A4 remains pending for the full set of existing workflows.

## Cycle 17: U19 — a proven qualified view identity

- RED command: `npm test -- tests\unit\object-intelligence-identity.test.ts`
- RED result: the initial conservative comparator returned `unresolved` for two identical explicitly qualified view identities.
- GREEN change: identical, nonempty, explicitly qualified view identifiers in the same dialect are recognized without case folding.
- GREEN command: `npm test -- tests\unit\object-intelligence-identity.test.ts` -> 1 test passed.
- Refactor: none. U19 and T008–T009 remain pending for the other identity cases and integration.

## Cycle 18: U19 — dialect and kind boundaries

- RED command: `npm test -- tests\unit\object-intelligence-identity.test.ts`
- RED result: 1 of 2 tests failed because identities with different dialects returned `unresolved` instead of `different`.
- GREEN change: distinguish dialect and object-kind boundaries without comparing potentially ambiguous names.
- GREEN command: `npm test -- tests\unit\object-intelligence-identity.test.ts` -> 2 tests passed.
- Refactor: none. U19 and T008–T009 remain pending for qualified schemas and remaining cases.

## Cycle 19: A1 — supplied view schema in the workspace

- RED command: `npm test -- tests\unit\object-intelligence-workspace.test.tsx -t "shows the schema explicitly"`
- RED result: the qualified view analysis omitted its supplied `sales` schema from the result.
- Additional regression evidence before this cycle: the original workspace test now also asserts the detected `orders` table and passed using `npm test -- tests\unit\object-intelligence-workspace.test.tsx`. This is a characterization of existing behavior, not RED evidence.
- GREEN change: render explicitly supplied schema metadata using translated labels in the existing result details.
- GREEN command: `npm test -- tests\unit\object-intelligence-workspace.test.tsx tests\unit\object-intelligence-source.test.ts tests\unit\query-input-workflow.test.tsx` -> 3 files, 15 tests passed.
- Refactor: none. A1 remains pending for additional dialect fixtures and available metadata.

## Cycle 20: U7 — qualified simple view in PostgreSQL

- RED command: `npm test -- tests\unit\object-intelligence-source.test.ts`
- RED result: 1 of 4 tests failed: PostgreSQL returned `unsupported` for a simple qualified view while the MySQL fixture passed.
- Additional RED: the same command failed 2 of 5 tests after adding a PostgreSQL source-boundary case with an emoji comment and a trailing comment. An intervening nested-test error was a test setup error, not RED evidence.
- GREEN change: when the PostgreSQL AST lacks locations, use the existing `dt-sql-parser` view/select parse-tree boundary; reject its syntax errors and account for Unicode code-point offsets. Results remain partial because the query facts are still regex-derived and not cross-checked.
- GREEN command: `npm test -- tests\unit\object-intelligence-source.test.ts tests\unit\object-intelligence-parser-errors.test.ts tests\unit\object-intelligence-workspace.test.tsx` -> 3 files, 8 tests passed; `npm run type-check` -> passed.
- Refactor: fixed the parser token-property selection and an implicit test parameter type after initial failed verification; formatted the files and reran `npm test -- tests\unit\object-intelligence-source.test.ts tests\unit\object-intelligence-parser-errors.test.ts tests\unit\object-intelligence-workspace.test.tsx tests\unit\object-intelligence-identity.test.ts` -> 4 files, 10 tests passed. U7 remains pending for columns and other view forms.

## Cycle 21: U7 — explicitly declared view columns

- RED command: `npm test -- tests\unit\object-intelligence-view-columns.test.ts`
- RED result: both MySQL and PostgreSQL returned a partial view without the explicitly declared column names.
- GREEN change: return the complete declared column list when its parser representation is recognized; otherwise use `null` rather than inventing columns.
- GREEN command: `npm test -- tests\unit\object-intelligence-view-columns.test.ts tests\unit\object-intelligence-source.test.ts tests\unit\object-intelligence-workspace.test.tsx` -> 3 files, 9 tests passed; `npm run type-check` -> passed.
- Refactor: none. U7 remains pending for broader metadata, view forms and workspace display.

## Regression checkpoint after cycle 21

- `npm run type-check` -> passed; `npm test` -> 95 files and 868 tests passed.
- Default `npm run build` compiled but failed collecting page data because a `.next` chunk was missing while another Next.js dev server was running. The dev server was not stopped.
- Isolated build with `$env:DIST_DIR = '.next-build-04ec0cd5'; npm run build` -> passed; 25 static pages generated. Generated build files and config changes were cleaned afterward.
- The parser fixtures do not establish full dialect support or complete the remaining TDD behaviors.

## Cycle 22: A1 — view columns in the workspace

- User selected a minimal text list for view columns and offered to share a browser page for visual review.
- RED command: `npm test -- tests\unit\object-intelligence-workspace.test.tsx -t "shows explicitly declared view columns"`
- RED result: the result did not display either explicitly declared view column.
- GREEN change: render the proven declared columns as a minimal list; label an unavailable list explicitly in English and Vietnamese.
- GREEN command: `npm test -- tests\unit\object-intelligence-workspace.test.tsx tests\unit\object-intelligence-view-columns.test.ts tests\unit\object-intelligence-source.test.ts` -> 3 files, 10 tests passed; `npm run type-check` -> passed.
- Refactor: none. Visual review and the rest of A1 remain pending.
- Browser review: the first attempt encountered an internal server error after a shared `.next` build. The user restarted the dev server; the inspection page reached sign-in but the workspace was not reviewed. No browser acceptance is claimed.

## Cycle 23: A2 — user-provided MySQL trigger

- RED command: `npm test -- tests\unit\object-intelligence-trigger-workspace.test.tsx`
- RED result: the workspace reported the user's trigger as unsupported instead of showing its identity, timing, event, table and body.
- Inner RED command: `npm test -- tests\unit\object-intelligence-trigger.test.ts`
- Inner RED result: the trigger analyzer returned `null` instead of the expected MySQL metadata and body.
- GREEN change: parse a single MySQL trigger with the MySQL grammar and display its source-level facts and body as partial; retain view handling.
- GREEN command: `npm test -- tests\unit\object-intelligence-trigger-workspace.test.tsx tests\unit\object-intelligence-trigger.test.ts tests\unit\object-intelligence-workspace.test.tsx tests\unit\object-intelligence-source.test.ts tests\unit\object-intelligence-view-columns.test.ts` -> 5 files, 12 tests passed; `npm run type-check` -> passed.
- Refactor: none. The initial combined run exceeded the component test's 1-second async wait while the parser module loaded; the wait was extended to 30 seconds, without changing its assertions. A2/U9 remain pending for broader cases.

## Cycle 24: A2 — MySQL procedure workspace

- RED command: `npm test -- tests\unit\object-intelligence-trigger-workspace.test.tsx -t 'shows a MySQL procedure'`
- RED result: the workspace reported the procedure definition as unsupported instead of displaying its name, declared parameter and body.
- GREEN change: parse one MySQL procedure, preserve source text for its parameters and body, and display them as partial. Trigger and procedure reuse a single MySQL parse in the workspace.
- GREEN command: `npm test -- tests\unit\object-intelligence-trigger-workspace.test.tsx tests\unit\object-intelligence-trigger.test.ts tests\unit\object-intelligence-workspace.test.tsx` -> 3 files, 6 tests passed; `npm run type-check` -> passed.
- Refactor: shared grammar parsing and Unicode-safe source slicing. The initial green attempt showed a Testing Library whitespace-normalization mismatch; the body assertion now checks the exact original text. A2/U8 remain pending for broader routine behavior.
- Boundary characterization: `npm test -- tests\unit\object-intelligence-routine-boundaries.test.ts` -> 4 tests passed for qualified quoted names, Unicode, multi-statement bodies, selected malformed and multiple-input cases, and unsupported trigger dialect. These tests passed against the existing implementation and are not RED evidence.
- The user confirmed the minimal text-list presentation for routines and triggers. Browser visual review remains pending.

## Regression checkpoint after cycle 24

- `npm test` -> 98 files, 876 tests passed before the additional parameter-free procedure characterization.
- `npm test -- tests\unit\object-intelligence-trigger-workspace.test.tsx tests\unit\object-intelligence-trigger.test.ts tests\unit\object-intelligence-routine-boundaries.test.ts tests\unit\object-intelligence-source.test.ts tests\unit\object-intelligence-view-columns.test.ts tests\unit\object-intelligence-workspace.test.tsx` -> 6 files, 18 tests passed, including the additional characterization.
- A prior run of that focused command timed out in two parser tests while the production build was competing for resources; the rerun after the build passed without changing the assertions.
- `npm run type-check` -> passed; isolated `DIST_DIR=.next-build-routines-04ec0cd5` production build -> passed, 25 static pages generated. Build-generated changes were restored and isolated output removed.
- A2, U8, U9 and the larger feature tasks remain pending; body statement analysis, other routine dialects, independent cross-checking and visual browser review have not been established.

## Cycle 25: U1 — view source disagreement

- RED command: `npm test -- tests\unit\sql-cross-check.test.ts -t 'does not present regex-only'`
- RED result: the regex-derived source list incorrectly included `ghost` from a string literal, and no disagreement was reported.
- GREEN change: compare the view query's regex-derived source names with the existing parser's table list; suppress the source list on disagreement, retaining partial status.
- GREEN command: `npm test -- tests\unit\sql-cross-check.test.ts tests\unit\object-intelligence-source.test.ts tests\unit\object-intelligence-view-columns.test.ts tests\unit\object-intelligence-workspace.test.tsx` -> 4 files, 15 tests passed; `npm run type-check` -> passed.
- Refactor: none. U1 and T004 remain pending for broader dialect/construct cases; agreement does not establish complete support.

## Cycle 26: A3 — explain disputed view sources

- RED command: `npm test -- tests\unit\object-intelligence-workspace.test.tsx -t 'explains why disputed'`
- RED result: the workspace displayed an empty list without explaining the source-detection disagreement.
- GREEN change: explain disagreement and unavailable comparison in both locales, and distinguish an empty detected source list. Other query facts remain explicitly preliminary.
- GREEN command: `npm test -- tests\unit\sql-cross-check.test.ts tests\unit\object-intelligence-source.test.ts tests\unit\object-intelligence-view-columns.test.ts tests\unit\object-intelligence-workspace.test.tsx tests\unit\object-intelligence-parser-errors.test.ts` -> 5 files, 17 tests passed; `npm run type-check` -> passed.
- Refactor: none. A3 remains pending for other unsupported and ambiguous shapes.

## Cycle 27: U11 — MySQL view query source range

- RED command: `npm test -- tests\unit\object-intelligence-source.test.ts -t 'maps the MySQL view query'`
- RED result: the query text was present but its original source range was absent.
- GREEN change: expose a validated, end-exclusive UTF-16 range and 1-based line/column when the view query has parser locations; otherwise retain an unavailable range.
- GREEN command: `npm test -- tests\unit\object-intelligence-source.test.ts tests\unit\sql-cross-check.test.ts tests\unit\object-intelligence-workspace.test.tsx` -> 3 files, 15 tests passed; `npm run type-check` -> passed.
- Refactor: none. U11 remains pending for PostgreSQL and procedural statements.

## Cycle 28: U11 — PostgreSQL view query source range

- RED command: `npm test -- tests\unit\object-intelligence-source.test.ts -t 'maps the PostgreSQL view query'`
- RED result: the PostgreSQL fallback extracted the query but returned no original source range.
- GREEN change: convert PostgreSQL grammar code-point offsets into an end-exclusive UTF-16 range and calculate original 1-based line and column.
- GREEN command: `npm test -- tests\unit\object-intelligence-source.test.ts tests\unit\sql-cross-check.test.ts tests\unit\object-intelligence-view-columns.test.ts tests\unit\object-intelligence-workspace.test.tsx tests\unit\object-intelligence-routine-boundaries.test.ts` -> 5 files, 23 tests passed; `npm run type-check` -> passed.
- Refactor: reuse one validated source range to extract both the query and its position. U11 remains pending for procedural statements and UI navigation.

## Regression checkpoint after cycle 28

- `npm test` -> 98 files, 881 tests passed; `npm run type-check` -> passed.
- The feature and mandatory TDD hook remain in progress. Dependency ingestion/impact, AI consent, procedural statement navigation, broader dialect coverage, real-browser review, performance and five-user evaluation are not complete.

## Cycle 29: A5 — select a MySQL procedure query

- The user confirmed a minimal text-button list for selecting statements.
- RED command: `npm test -- tests\unit\object-intelligence-trigger-workspace.test.tsx -t 'allows selecting'`
- RED result: the procedure body was displayed but no statement-selection button existed.
- Inner RED command: `npm test -- tests\unit\object-intelligence-routine-boundaries.test.ts -t 'extracts direct SELECT'`
- Inner RED result: the extraction stub returned no queries and incomplete status. One expected end column was corrected from 29 to 28 after measuring its UTF-16 position, before implementing the behavior.
- GREEN change: extract direct MySQL SELECT statements from grammar-backed routine body boundaries with UTF-16 source positions; expose selection and preliminary source analysis, preserving partial/incomplete status. Existing view source comparison is shared with selected queries.
- GREEN command: `npm test -- tests\unit\object-intelligence-trigger-workspace.test.tsx tests\unit\object-intelligence-routine-boundaries.test.ts tests\unit\object-intelligence-trigger.test.ts tests\unit\object-intelligence-workspace.test.tsx tests\unit\sql-cross-check.test.ts` -> 5 files, 19 tests passed; `npm run type-check` -> passed.
- Refactor: shared the existing view query source-analysis code; complex statements, nested control flow, PostgreSQL and full findings remain outside the established slice. A5/U10/U11 and associated tasks remain pending.
- Characterization: `npm test -- tests\unit\object-intelligence-routine-boundaries.test.ts -t 'marks non-SELECT'` -> passed for a body mixing SET, IF and a direct SELECT. The incomplete warning remains required.

## Cycle 30: U11 — navigate to a selected routine statement

- RED command: `npm test -- tests\unit\object-intelligence-trigger-workspace.test.tsx -t 'reveals the selected statement'`
- RED result: no control existed to reveal the selected statement in the original SQL input.
- GREEN change: focus the original textarea and select the proven, end-exclusive source range; add English and Vietnamese labels.
- GREEN command: `npm test -- tests\unit\object-intelligence-trigger-workspace.test.tsx tests\unit\object-intelligence-routine-boundaries.test.ts tests\unit\object-intelligence-workspace.test.tsx tests\unit\object-intelligence-session.test.tsx` -> 4 files, 16 tests passed; `npm run type-check` -> passed.
- Refactor: none. U11 remains pending for other statements and dialects.
- Trigger characterization: `npm test -- tests\unit\object-intelligence-trigger-workspace.test.tsx -t 'marks a trigger body'` -> passed for a direct SELECT INTO mixed with SET, with the incomplete warning visible.

## Regression checkpoint after cycle 30

- `npm test` -> 98 files, 886 tests passed; `npm run type-check` -> passed. Prettier check passed for the changed parser, panel and focused tests.
- No production build or real-browser review was run in this cycle. The broader feature and mandatory TDD hook remain incomplete; in particular, multi-object sessions, dependency/impact views, object-specific AI, broader dialects, and release validation remain pending.

## Cycle 31: CREATE TABLE in the object workspace

- The user requested all four dialects and confirmed the minimal text-list presentation.
- RED command: `npm test -- tests\unit\object-intelligence-workspace.test.tsx -t 'shows a pasted MySQL CREATE TABLE'`
- RED result: the workspace reported the valid MySQL table definition as unsupported. An initial run timed out during parser loading, so the asynchronous wait was extended before obtaining this valid failure.
- GREEN change: reuse the existing code-generation table model for a single MySQL CREATE TABLE and present its name, explicit schema and recognized column names/types as partial.
- GREEN command: `npm test -- tests\unit\object-intelligence-workspace.test.tsx tests\unit\object-intelligence-trigger-workspace.test.tsx` -> 2 files, 10 tests passed; `npm run type-check` -> passed.
- The first implementation rejected a single AST wrapped in an array by a trailing semicolon; corrected it before the successful run. Other dialects and broader metadata remain pending.

## Cycle 32: PostgreSQL CREATE TABLE

- RED command: `npm test -- tests\unit\object-intelligence-table.test.ts`
- RED result: the analyzer returned null for the PostgreSQL fixture.
- GREEN change: enable the existing PostgreSQL grammar and table model for the adapter.
- GREEN and final regression command: `npm test -- tests\unit\object-intelligence-table.test.ts tests\unit\object-intelligence-workspace.test.tsx tests\unit\codegen\parseSql.test.ts` -> 3 files, 24 tests passed; `npm run type-check` -> passed.
- Refactor: none.

## Cycle 33: SQL Server CREATE TABLE

- RED command: `npm test -- tests\unit\object-intelligence-table.test.ts`
- RED result: the SQL Server fixture returned null instead of table metadata; the PostgreSQL fixture passed. A prior test-nesting setup error was corrected before this valid RED.
- GREEN change: enable the existing TransactSQL grammar and table model for the adapter.
- GREEN and final regression command: `npm test -- tests\unit\object-intelligence-table.test.ts tests\unit\object-intelligence-workspace.test.tsx tests\unit\codegen\parseSql.test.ts` -> 3 files, 25 tests passed; `npm run type-check` -> passed.
- Refactor: none.

## Cycle 34: Decimal scale in table columns

- RED command: `npm test -- tests\unit\object-intelligence-table.test.ts`
- RED result: all three dialect fixtures displayed `DECIMAL(10)` instead of `DECIMAL(10,2)`. A prior nested-test setup error was corrected before this valid RED.
- GREEN change: retain the parser's scale in the shared column model and include it in the displayed type.
- GREEN and final regression command: `npm test -- tests\unit\object-intelligence-table.test.ts tests\unit\codegen\parseSql.test.ts tests\unit\object-intelligence-workspace.test.tsx` -> 3 files, 28 tests passed; `npm run type-check` -> passed. The first type check exposed a missing test parameter annotation, which was corrected.
- Refactor: none.

## CREATE TABLE regression checkpoint before Oracle

- Characterization checks reject selected malformed and multiple-statement examples in all three implemented dialects.
- `npm test` -> 99 files, 895 tests passed; `npm run type-check` -> passed.
- Oracle table analysis was unsupported at this checkpoint.

## Cycle 35: Oracle CREATE TABLE

- RED command: `npm test -- tests\unit\object-intelligence-table.test.ts -t 'extracts Oracle'`
- RED result: the Oracle fixture returned null instead of table metadata.
- The user approved evaluating and adding a suitable Oracle parser dependency.
- GREEN change: use the MIT-licensed `oracle-sql-parser` to parse a single statement, restrict recognized column types to `NUMBER` and `VARCHAR2`, and preserve the existing code generator's Oracle behavior.
- GREEN command: `npm test -- tests\unit\object-intelligence-table.test.ts` -> 9 tests passed; `npm run type-check` -> passed.
- Refactor: none. Quoted identifiers and other Oracle types remain unsupported pending evidence.

## Cycle 36: Oracle optional SQL terminator

- RED command: `npm test -- tests\unit\object-intelligence-table.test.ts -t 'without a terminal semicolon'`
- RED result: the parser rejected the otherwise supported definition without a semicolon.
- GREEN change: append a terminator for parsing when missing, retaining the single-statement guard.
- GREEN and final regression command: `npm test -- tests\unit\object-intelligence-table.test.ts tests\unit\codegen\parseSql.test.ts` -> 2 files, 28 tests passed; `npm run type-check` -> passed.
- Refactor: none.

## Cycle 37: Oracle DATE

- RED command: `npm test -- tests\unit\object-intelligence-table.test.ts -t 'recognizes Oracle DATE columns'`
- RED result: the supported DATE definition was returned as unavailable.
- GREEN change: render the Oracle parser's DATE type.
- GREEN and final regression command: `npm test -- tests\unit\object-intelligence-table.test.ts tests\unit\object-intelligence-workspace.test.tsx tests\unit\codegen\parseSql.test.ts` -> 3 files, 37 tests passed; `npm run type-check` -> passed.
- Refactor: none. Characterization tests additionally cover Oracle precision/scale, malformed and multiple statements, quoted identifiers and unsupported types.

## CREATE TABLE regression checkpoint after Oracle

- `npm test` -> 99 files, 901 tests passed; `npm run type-check` -> passed; focused Prettier check passed.
- All four dialects have partial, fixture-limited CREATE TABLE analysis. The wider feature and mandatory TDD hook remain incomplete.

## Cycle 38: MySQL ENUM values in the supplied table

- RED command: `npm test -- tests\unit\object-intelligence-table.test.ts -t 'sample employee table'`
- RED result: the sample's twelve columns and decimal scale were recognized, but `gender` was displayed as `ENUM` without its declared values.
- GREEN change: render MySQL ENUM values from the parser's verified expression list, preserving escaping.
- GREEN command: `npm test -- tests\unit\object-intelligence-table.test.ts -t 'sample employee table'` -> 1 passed; `npm run type-check` -> passed.
- Refactor: formatted the analyzer; added characterization for escaped ENUM literals and the supplied sample through the workspace.
- Final regression command: `npm test -- tests\unit\object-intelligence-table.test.ts tests\unit\object-intelligence-workspace.test.tsx tests\unit\object-intelligence-trigger-workspace.test.tsx tests\unit\codegen\parseSql.test.ts` -> 4 files, 45 tests passed; `npm run type-check` -> passed.

## Cycle 39: U19 — distinct PostgreSQL schemas

- RED command: `npm test -- tests\unit\object-intelligence-identity.test.ts -t 'different explicitly named schemas'`
- RED result: two explicitly qualified PostgreSQL views in different schemas were reported unresolved instead of different.
- GREEN change: distinguish unquoted ASCII PostgreSQL view schemas only when their folded names are known to differ, retaining uncertainty for long or other identifiers.
- GREEN and final regression command: `npm test -- tests\unit\object-intelligence-identity.test.ts tests\unit\object-intelligence-identity-session.test.tsx tests\unit\object-intelligence-table.test.ts` -> 3 files, 28 tests passed; `npm run type-check` -> passed.
- Refactor: none. U19 and T008–T009 remain pending for broader identity cases and integration.

## U24 characterization: late single-object analysis

- Existing revision guard was characterized without inventing RED: `npm test -- tests\unit\object-intelligence-session.test.tsx tests\unit\object-intelligence-identity.test.ts tests\unit\object-intelligence-workspace.test.tsx` -> 3 files, 13 tests passed; `npm run type-check` -> passed.
- The test changes the source, completes the newer analysis, and then resolves the old request; the old result does not replace the new result. Multi-object and AI revision behavior remain pending.
- Subsequent full regression: `npm test` -> 99 files, 907 tests passed. The wider feature and mandatory TDD hook remain incomplete.

## Cycle 40: A2 — MySQL function workspace

- RED command: `npm test -- tests\unit\object-intelligence-trigger-workspace.test.tsx -t 'shows a MySQL function'`
- RED result: the workspace reported the fixture as unsupported instead of showing the function identity, parameter, return type and body.
- GREEN change: extend the existing function analyzer with parser-backed MySQL metadata and original source text, and integrate it with the existing routine panel and localized labels.
- GREEN command: `npm test -- tests\unit\object-intelligence-trigger-workspace.test.tsx -t 'shows a MySQL function'` -> 1 passed; `npm run type-check` -> passed.
- Refactor: formatted the implementation and added characterization for a qualified MySQL function, its direct SELECT, source navigation, and selected invalid/multiple definitions.
- Final regression command: `npm test -- tests\unit\object-intelligence-function.test.ts tests\unit\object-intelligence-trigger-workspace.test.tsx tests\unit\object-intelligence-routine-boundaries.test.ts tests\unit\object-intelligence-workspace.test.tsx tests\unit\sql-cross-check.test.ts` -> 5 files, 29 tests passed; `npm run type-check` -> passed.
- The supplied CTE query was separately characterized with source-name cross-check agreement. An initially nested test was corrected before the successful run; this is characterization, not fabricated RED evidence.
- Full regression: `npm test` -> 100 files, 912 tests passed.

## Cycle 41: U1/U2 — SQL Server source cross-check

- RED command: `npm test -- tests\unit\sql-cross-check.test.ts -t 'SQL Server query sources'`
- RED result: the cross-check threw `sqlserver is not supported currently` rather than using the available TransactSQL grammar.
- GREEN change: select the TransactSQL grammar for SQL Server source checks.
- GREEN and final regression command: `npm test -- tests\unit\sql-cross-check.test.ts tests\unit\object-intelligence-source.test.ts` -> 2 files, 14 tests passed; `npm run type-check` -> passed.
- Refactor: none. Broader SQL Server and Oracle cross-check coverage remains pending.

## Cycle 42: U2 — Oracle unavailable source cross-check

- RED command: `npm test -- tests\unit\sql-cross-check.test.ts -t 'marks Oracle source comparison unavailable'`
- RED result: the cross-check threw `oracle is not supported currently` rather than reporting unavailable comparison.
- GREEN change: return preliminary source names with `unavailable` comparison for Oracle without invoking an unsupported grammar.
- GREEN and final regression command: `npm test -- tests\unit\sql-cross-check.test.ts tests\unit\object-intelligence-source.test.ts tests\unit\object-intelligence-trigger-workspace.test.tsx` -> 3 files, 22 tests passed; `npm run type-check` -> passed.
- Refactor: none. This is not an Oracle AST verification; T004–T005 remain incomplete.
- Full regression after these changes: `npm test` -> 100 files, 914 tests passed. The wider feature and mandatory TDD hook remain incomplete.

## Cycle 43: A8 — evidenced object dependency workspace

- The user confirmed graph-first presentation with an accessible list, retaining the existing two-column workspace.
- RED command: `npm test -- tests\unit\object-intelligence-graph.test.tsx`
- RED result: the workspace has no `Add to session` action for the analyzed views. The initial acceptance test also included impact; the impact assertion is kept in a separate test so its behavior can be implemented independently.
- GREEN change: retain supported, qualified view definitions in a non-persisted owner-scoped session and display parser-cross-checked, resolved read relationships as a directed graph and accessible list. Duplicate exact identities require keep/replace; ambiguous case variants are rejected.
- GREEN command: `npm test -- tests\unit\object-intelligence-graph.test.tsx -t 'shows evidenced view dependencies'` -> 1 passed; `npm run type-check` -> passed. A first GREEN attempt exposed jsdom's missing `ResizeObserver`; a scoped test stub fixed that setup issue.
- Refactor: direction markers added; final regression checks pending. This is a limited view-only slice, not complete ingestion or dependency support.

## Cycle 44: A9 — direct reverse impact

- RED command: `npm test -- tests\unit\object-intelligence-graph.test.tsx -t 'shows reverse impact'`
- RED result: there was no impact action for a supplied view.
- GREEN change: traverse incoming resolved edges, preserve minimum depth, and display direct or transitive known dependents.
- GREEN command: `npm test -- tests\unit\object-intelligence-graph.test.tsx` -> 2 tests passed; `npm run type-check` -> passed.
- Refactor and broader traversal checks pending.

## Cycle 45: A10 — dependency cycle warning

- RED command: `npm test -- tests\unit\object-intelligence-graph.test.tsx -t 'reports a dependency cycle'`
- RED result: replacing a view with a cyclic reference updated the definitions but no cycle warning appeared.
- GREEN change: detect cycles in resolved directed edges and show a localized warning; reverse traversal remains cycle-safe.
- GREEN and final regression command: `npm test -- tests\unit\object-intelligence-graph.test.tsx tests\unit\object-intelligence-dependencies.test.ts` -> 2 files, 4 tests passed; `npm run type-check` -> passed.
- Characterization: the reverse traversal returns direct and transitive dependents by minimum depth and terminates on a cyclic graph. Broader ingestion and dependency scope remains pending.

## Cycle 46: U26 — unresolved reference in the dependency graph

- RED command: `npm test -- tests\unit\object-intelligence-dependencies.test.ts -t 'missing referenced object'`
- RED result: the dependency model dropped the missing reference instead of retaining an unresolved edge.
- GREEN change: retain unresolved references as dashed graph edges/nodes and show the same references in the list; unresolved nodes do not contribute to known reverse impact or cycle detection.
- GREEN command: `npm test -- tests\unit\object-intelligence-dependencies.test.ts tests\unit\object-intelligence-graph.test.tsx` -> 2 files, 7 tests passed; `npm run type-check` -> passed.
- Characterization checks confirm duplicate keep, explicit replacement, non-persistence and sign-out clearing for the tested session; no full lifecycle claim.

## Cycle 47: A8 — qualified table as a dependency target

- RED command: `npm test -- tests\unit\object-intelligence-graph.test.tsx -t 'supplied qualified table'`
- RED result: the analyzed table had no action to add it to the session.
- GREEN change: extend the owner-scoped collection to include qualified MySQL/PostgreSQL tables as possible view-read targets; retain incomplete status because table constraints are not fully analyzed.
- GREEN command: `npm test -- tests\unit\object-intelligence-graph.test.tsx tests\unit\object-intelligence-dependencies.test.ts` -> 2 files, 8 tests passed; `npm run type-check` -> passed.
- Refactor: name the shared session entity for objects rather than views and format the touched graph files.
- Final regression: `npm test -- tests\unit\object-intelligence-graph.test.tsx tests\unit\object-intelligence-dependencies.test.ts tests\unit\object-intelligence-workspace.test.tsx tests\unit\object-intelligence-session.test.tsx tests\unit\object-intelligence-identity-session.test.tsx tests\unit\object-intelligence-signout.test.tsx` -> 6 files, 27 tests passed; `npm run type-check` -> passed; `npm test` -> 102 files, 922 tests passed.

## Cycle 48: A11 — MySQL batch source boundaries

- RED command: `npm test -- tests\unit\object-intelligence-ingestion.test.ts -t 'original source ranges'`
- RED result: the batch boundary API reports unsupported for two ordinary MySQL definitions instead of returning source-backed ranges.
- GREEN change: use the MySQL parser's DDL contexts and convert its code-point offsets to JavaScript source offsets, rejecting parser errors.
- GREEN command: `npm test -- tests\unit\object-intelligence-ingestion.test.ts -t 'original source ranges'` -> 1 test passed.
- Refactor/final regression: convert code-point offsets using a shared linear offset map; MySQL routine/Unicode and malformed-input characterization passed in the 7-file, 40-test regression recorded in Cycle 54.

## Cycle 49: A11 — add pasted definitions to a dependency session

- RED command: `npm test -- tests\unit\object-intelligence-graph.test.tsx -t 'multiple pasted definitions'`
- RED result: no action exists for adding multiple pasted definitions.
- GREEN change: analyze a MySQL batch of qualified tables/views and atomically add it to the ephemeral dependency session; reject unsupported or conflicting definitions without mutation.
- GREEN command: `npm test -- tests\unit\object-intelligence-graph.test.tsx -t 'multiple pasted definitions'` -> 1 test passed; `npm run type-check` -> passed.
- Refactor/final regression: share batch handling with file ingestion and PostgreSQL; targeted regression is recorded in Cycle 54.

## Cycle 50: A13/U22 — transactional batch duplicate resolution

- RED command: `npm test -- tests\unit\object-intelligence-graph.test.tsx -t 'duplicate batch transaction'`
- RED result: a duplicated definition is rejected without offering keep, replace or cancel.
- GREEN change: stage the entire batch, ask for a choice on each proven duplicate, and only update the session after all choices; cancellation leaves it untouched.
- GREEN command: `npm test -- tests\unit\object-intelligence-graph.test.tsx -t 'duplicate batch transaction'` -> 1 test passed; `npm run type-check` -> passed.
- Refactor/final regression: added keep and malformed-batch characterization; targeted regression is recorded in Cycle 54.

## Cycle 51: A11 — multiple SQL files with provenance

- RED command: `npm test -- tests\unit\object-intelligence-graph.test.tsx -t 'imports multiple SQL files'`
- RED result: there is no SQL-file input for the object session.
- GREEN change: read multiple `.sql` files, retain their complete original texts, labels and definition ranges in memory, and process them through the same staged batch flow.
- GREEN command: `npm test -- tests\unit\object-intelligence-graph.test.tsx -t 'imports multiple SQL files'` -> 1 test passed; `npm run type-check` -> passed.
- Refactor/final regression: added file-read failure characterization and stale-import test in Cycle 52; targeted regression is recorded in Cycle 54.

## Cycle 52: U24 — file import across identity changes

- RED command: `npm test -- tests\unit\object-intelligence-graph.test.tsx -t 'in-flight file import'`
- RED result: an import begun before sign-out was added after the same account signed back in.
- GREEN change: invalidate all in-flight and staged work on identity-change events, including when the same owner later signs in again.
- GREEN command: `npm test -- tests\unit\object-intelligence-graph.test.tsx -t 'in-flight file import'` -> 1 test passed; `npm run type-check` -> passed.
- Final regression: `npm test -- tests\unit\object-intelligence-ingestion.test.ts tests\unit\object-intelligence-graph.test.tsx tests\unit\object-intelligence-dependencies.test.ts tests\unit\object-intelligence-workspace.test.tsx tests\unit\object-intelligence-session.test.tsx tests\unit\object-intelligence-identity-session.test.tsx tests\unit\object-intelligence-signout.test.tsx` -> 7 files, 37 tests passed.

## Cycle 53: A11 — PostgreSQL batch source boundaries

- RED command: `npm test -- tests\unit\object-intelligence-ingestion.test.ts -t 'multiple PostgreSQL definitions'`
- RED result: the batch boundary API reports unsupported for two ordinary PostgreSQL definitions.
- GREEN change: use the PostgreSQL parser's statement contexts and the shared source range conversion.
- GREEN command: `npm test -- tests\unit\object-intelligence-ingestion.test.ts -t 'multiple PostgreSQL definitions'` -> 1 test passed; `npm run type-check` -> passed.
- Refactor/final regression: PostgreSQL dollar-quoted routine/Unicode boundary characterization passed in the targeted regression recorded in Cycle 54; routine batch import remains unsupported.

## Cycle 54: A11 — PostgreSQL batch workspace

- RED command: `npm test -- tests\unit\object-intelligence-graph.test.tsx -t 'PostgreSQL pasted table'`
- RED result: the pasted-definitions action is disabled for PostgreSQL.
- GREEN change: route PostgreSQL batches through PostgreSQL splitting and the existing analyzers with the same conflict and session safeguards.
- GREEN command: `npm test -- tests\unit\object-intelligence-graph.test.tsx -t 'PostgreSQL pasted table'` -> 1 test passed; `npm run type-check` -> passed.
- Refactor: share range conversion and batch processing across the two supported dialects; provide explicit scope and per-file errors.
- Final targeted regression: `npm test -- tests\unit\object-intelligence-ingestion.test.ts tests\unit\object-intelligence-graph.test.tsx tests\unit\object-intelligence-dependencies.test.ts tests\unit\object-intelligence-workspace.test.tsx tests\unit\object-intelligence-session.test.tsx tests\unit\object-intelligence-identity-session.test.tsx tests\unit\object-intelligence-signout.test.tsx` -> 7 files, 40 tests passed; `npm run type-check` -> passed.
- Full regression: `npm test` -> 103 files, 935 tests passed.

## Cycle 55: A11 — explicit default schema for unqualified names

- RED command: `npm test -- tests\unit\object-intelligence-graph.test.tsx -t 'explicitly entered default schema'`
- RED result: there is no control for the user to enter a default schema.
- GREEN change: let the user provide a default for unqualified object/reference names, preserve original SQL, and mark assumption-based relationships and incomplete coverage.
- GREEN command: `npm test -- tests\unit\object-intelligence-graph.test.tsx -t 'explicitly entered default schema'` -> 1 test passed; `npm run type-check` -> passed.
- Refactor: propagate default-schema assumptions into graph edges and their accessible list, retain source text and expose the syntax limit in both locales.
- Sample characterization initially compared the textarea's normalized LF value to the CRLF file on disk and failed; the corrected assertion compares the preserved source with the browser textarea value. File imports retain their own original text separately.
- Final targeted regression: `npm test -- tests\unit\object-intelligence-ingestion.test.ts tests\unit\object-intelligence-graph.test.tsx tests\unit\object-intelligence-dependencies.test.ts tests\unit\object-intelligence-workspace.test.tsx tests\unit\object-intelligence-session.test.tsx tests\unit\object-intelligence-identity-session.test.tsx tests\unit\object-intelligence-signout.test.tsx` -> 7 files, 43 tests passed, including the supplied employee table and invalid-schema rejection; `npm run type-check` -> passed.

## Cycle 56: U19 — different object kinds in single-object input

- RED command: `npm test -- tests\unit\object-intelligence-graph.test.tsx -t 'different object kinds'`
- RED result: a view and table with the same qualified name were treated as a replaceable duplicate instead of an ambiguous identity.
- GREEN change: reject same-name collisions across table/view kinds instead of offering a replacement.
- GREEN command: `npm test -- tests\unit\object-intelligence-graph.test.tsx -t 'different object kinds'` -> 1 test passed; `npm run type-check` -> passed.
- Refactor: also show an assumption warning during conflict review when the matching identity depends on a default schema.
- Final regression: `npm test` -> 103 files, 939 tests passed; `npm run type-check` -> passed.

## Cycle 57: A19/U35 — confirm external object AI request

- RED command: `npm test -- tests\unit\object-intelligence-ai-panel.test.tsx -t 'asks before sending'`
- RED result: no object AI action or external-send confirmation is available.
- GREEN change: add an explicit, metadata-only explanation action, cancellable provider/origin confirmation and use the existing AI generation route and guest restriction.
- GREEN command: `npm test -- tests\unit\object-intelligence-ai-panel.test.tsx -t 'asks before sending'` -> 1 test passed; `npm run type-check` -> passed.
- Refactor/final regression: pending provider-switch, privacy and stale-request checks.

## Cycle 58: A8 — SQL Server table in the dependency session

- RED command: `npm test -- tests\unit\object-intelligence-graph.test.tsx -t 'SQL Server table with a qualified identity'`
- RED result: an analyzed qualified SQL Server table is rejected by the session adapter.
- GREEN change: permit verified table analyses for all four dialects while retaining the existing MySQL/PostgreSQL-only view gate.
- GREEN command: `npm test -- tests\unit\object-intelligence-graph.test.tsx -t 'SQL Server table with a qualified identity'` -> 1 test passed. The accompanying type-check found a missing test annotation; after fixing it, `npm run type-check` passed.
- Refactor/final regression: pending Oracle and regression checks.

## Cycle 59: U34 — AI context field allowlist

- RED command: `npm test -- tests\unit\object-intelligence-ai-panel.test.tsx -t 'additional untrusted fields'`
- RED result: an extra source field on the input facts object was serialized into the outgoing AI prompt.
- GREEN change: construct the outgoing fact object from an explicit field allowlist rather than serializing the input object.
- GREEN command: `npm test -- tests\unit\object-intelligence-ai-panel.test.tsx -t 'additional untrusted fields'` -> 1 test passed; `npm run type-check` -> passed.
- Refactor/final regression: pending.

## Cycle 60: A2 — PostgreSQL SQL function metadata

- RED command: `npm test -- tests\unit\object-intelligence-trigger-workspace.test.tsx -t 'PostgreSQL SQL function'`
- RED result: the workspace reports unsupported instead of showing the function's parser-backed metadata and body.
- GREEN change: read the dollar-quoted literal from the PostgreSQL parser's identifier/string-constant subtree, preserving original source and marking the unanalyzed body partial. An initial attempt incorrectly assumed a direct string-constant child and remained RED; the corrected subtree passed.
- GREEN command: `npm test -- tests\unit\object-intelligence-trigger-workspace.test.tsx -t 'PostgreSQL SQL function'` -> 1 test passed.
- Refactor/characterization: exercised a quoted, tagged PostgreSQL procedure with Unicode, and rejection of mismatched tags, multiple top-level statements, `RETURNS TABLE` and an unsupported language. These were post-implementation characterization tests, not separate RED cycles.
- Final targeted regression: `npm test -- tests\unit\object-intelligence-routine-boundaries.test.ts tests\unit\object-intelligence-trigger-workspace.test.tsx tests\unit\object-intelligence-ai-panel.test.tsx tests\unit\object-intelligence-graph.test.tsx tests\unit\promptRegistry.test.ts` -> 5 files, 50 tests passed; `npm run type-check` -> passed. This is not a full-suite result.
