---
feature: 022-database-object-intelligence
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 24
planned_at: b6b1230
updated_at: b6b1230
suite_baseline: green
---

# Test List: Database Object Intelligence

This is a plan, not evidence that feature tests exist or pass. All paths below are proposed unless already present. The SHA identifies the current HEAD; feature artifacts are uncommitted. The current full-suite baseline is recorded in [cycle-log.md](cycle-log.md); T001 must also assess coverage of all critical journeys.

`USn.m` refers to acceptance scenario m in User Story n in [spec.md](../spec.md); `FR` and `SC` identifiers refer to that specification. Each A item maps to one scenario; individual assertions may be split into focused tests during execution without changing the trace. `integration` means Vitest/Testing Library through the application-facing interaction with side-effecting providers stubbed; it is not a claim of browser E2E coverage.

## Outer loop: acceptance behaviors

| ID | Behavior | Traces | Layer | Kind | State | Planned test / task |
|---|---|---|---|---|---|---|
| A1 | A supported view shows its dialect, available metadata, analyzed query and evidence-backed status. | US1.1, FR-005, FR-006 | integration | example | PENDING (initial partial view covered; analyzed dependencies and available metadata need verification) | `tests/unit/object-intelligence-workspace.test.tsx`, T012–T015 |
| A2 | A partially supported routine or trigger shows supported details and extracted statements with its limitations. | US1.2, FR-007, FR-008 | integration | example | PENDING (selected MySQL routines and trigger, and PostgreSQL function metadata covered; PostgreSQL bodies and broader dialects and constructs pending) | `tests/unit/object-intelligence-trigger-workspace.test.tsx`, T011–T015 |
| A3 | Ambiguous or unsupported input shows its limitation without presenting guessed object details as facts. | US1.3, FR-005, SC-002 | integration | example | PENDING | `tests/unit/object-intelligence-workspace.test.tsx`, T010–T015 |
| A4 | Existing query, CTE and MyBatis journeys retain their established results after object analysis is added. | US1.4, FR-002 | integration | example | PENDING | `tests/unit/query-input-workflow.test.tsx`, T001, T012, T028–T030 |
| A5 | Selecting an extracted statement shows its source and available dependencies, findings and complexity. | US2.1, FR-009, FR-010 | integration | example | PENDING | `tests/unit/object-intelligence-source-panel.test.tsx`, T017–T020 |
| A6 | Opening a finding with a known location reveals its source or associated graph element. | US2.2, FR-016 | integration | example | PENDING | `tests/unit/object-intelligence-source-panel.test.tsx`, T018–T020 |
| A7 | An unsupported structure or unavailable location is identified without fabricated detail. | US2.3, FR-010, FR-011 | integration | example | PENDING | `tests/unit/object-intelligence-source-panel.test.tsx`, T017–T020 |
| A8 | Graph and list display the same known relationships with direction, operation and available confidence. | US3.1, FR-012, FR-013 | integration | example | PENDING (qualified MySQL view/table read relationships covered; other operations, dialects, and graph parity/browser review pending) | `tests/unit/object-intelligence-graph.test.tsx`, T022–T027 |
| A9 | Static impact distinguishes direct and transitive dependents by depth for supplied definitions. | US3.2, FR-014, SC-004 | integration | example | PENDING (direct impact UI and transitive traversal unit fixture covered) | `tests/unit/object-intelligence-graph.test.tsx`, T022–T027 |
| A10 | A cycle or absent definition is reported without infinite traversal or invented relationships. | US3.3, FR-014, SC-004 | integration | example | PENDING (cycle UI and unresolved-edge unit fixture covered; broader cases pending) | `tests/unit/object-intelligence-graph.test.tsx`, T022–T027 |
| A11 | Multiple pasted definitions and multiple imported files participate in one dependency session. | US3.4, FR-028 | integration | example | PENDING (qualified MySQL/PostgreSQL table/view paste and MySQL file import covered; broader dialects, object kinds and browser review pending) | `tests/unit/object-intelligence-graph.test.tsx`, T021–T027 |
| A12 | Definitions survive in-app navigation but not a reload or application close. | US3.5, FR-029 | integration | example | PENDING | `tests/unit/object-intelligence-session.test.ts`, T006–T007, T023, T026; actual browser lifecycle T047 |
| A13 | A known duplicate requires the user to keep or replace before that object is analyzed. | US3.6, FR-030 | integration | example | PENDING (batch keep/replace/cancel covered; identification currently analyzes the incoming definition before presenting the choice) | `tests/unit/object-intelligence-graph.test.tsx`, T021, T024, T026–T027 |
| A14 | Supported complexity and findings distinguish evidence-backed facts, observations and recommendations. | US4.1, FR-015, FR-016 | integration | example | PENDING | `tests/unit/object-intelligence-findings-panel.test.tsx`, T031–T034 |
| A15 | A metric without structural evidence is unavailable rather than an invented value. | US4.2, FR-015 | integration | example | PENDING | `tests/unit/object-intelligence-findings-panel.test.tsx`, T031–T034 |
| A16 | Requested AI assistance is labeled and grounded in available object context and limitations. | US5.1, FR-017, FR-018 | integration | example | PENDING | `tests/unit/object-intelligence-ai-panel.test.tsx`, T036–T041 |
| A17 | A rewrite can be compared with the original and does not change it before explicit apply. | US5.2, FR-019, SC-008 | integration | example | PENDING | `tests/unit/object-intelligence-ai-panel.test.tsx`, T037, T041 |
| A18 | An AI failure leaves deterministic results usable and shows recovery guidance. | US5.3, FR-020, SC-008 | integration | example | PENDING | `tests/unit/object-intelligence-ai-panel.test.tsx`, T037, T041 |
| A19 | Before the first new external send, the user sees the provider and can confirm or cancel transmission. | US5.4, FR-022 | integration | example | PENDING | `tests/unit/object-intelligence-ai-consent.test.ts`, T035, T039–T040 |
| A20 | The workspace shows selected object identity, dialect, status and applicable sections without hiding existing workflows. | US6.1, FR-010, FR-023 | integration | example | PENDING | `tests/unit/object-intelligence-workspace.test.tsx`, T012, T015, T042–T046 |
| A21 | Source, findings and dependencies remain reachable on narrow viewports with keyboard or pointer. | US6.2, FR-024, SC-006 | integration | example | PENDING | `tests/unit/object-intelligence-accessibility.test.tsx`, `tests/unit/object-intelligence-responsive.test.tsx`, T042–T047; real browser review T047 |
| A22 | Existing language, theme and accent preferences are respected with equivalent Vietnamese and English labels. | US6.3, FR-024 | integration | example | PENDING | `tests/unit/object-intelligence-responsive.test.tsx`, T042–T047 |
| A23 | Existing inputs, results, routes, preferences and controls continue to work after introduction. | US7.1, FR-002, SC-003 | integration | example | PENDING | `tests/unit/query-input-workflow.test.tsx`, `tests/unit/AppLayout.test.tsx`, T001, T028–T030 |
| A24 | An existing equivalent capability is reused or extended without disrupting its observable behavior. | US7.2, FR-003 | integration | example | PENDING | `tests/unit/object-intelligence-analysis.test.ts`, T002, T011, T013–T014, T029–T030; design audit required |

## Inner loop: focused behaviors

| ID | Behavior | Traces | Layer | Kind | State | Planned test / task |
|---|---|---|---|---|---|---|
| U1 | A dialect cross-check disagreement is reported rather than silently treated as agreement. | FR-001, FR-005 | unit | example | PENDING | `tests/unit/sql-cross-check.test.ts`, T004–T005 |
| U2 | An unvalidated cross-check produces partial or unsupported status for the affected construct. | FR-001, FR-005 | unit | example | PENDING | `tests/unit/sql-cross-check.test.ts`, T004–T005 |
| U3 | A dialect/object construct without verified support is not presented as fully supported. | FR-001, FR-005, SC-001 | unit | example | PENDING | `tests/unit/object-intelligence-detection.test.ts`, T003, T010, T016 |
| U4 | A user-selected object type or an evidenced detection identifies the active dialect and confidence. | FR-004, FR-005 | unit | example | PENDING | `tests/unit/object-intelligence-detection.test.ts`, T010, T014 |
| U5 | Empty or malformed input reports actionable feedback rather than a successful fabricated result. | FR-005, FR-025 | unit | example | PENDING | `tests/unit/object-intelligence-detection.test.ts`, T010, T014 |
| U6 | A dialect-mismatched construct reports uncertainty or unsupported syntax. | FR-005 | unit | example | PENDING | `tests/unit/object-intelligence-detection.test.ts`, T010, T014 |
| U7 | Supported view columns, identity and source reflect the supplied definition. | FR-006 | unit | example | PENDING | `tests/unit/object-intelligence-analysis.test.ts`, T011, T013–T014 |
| U8 | Supported procedure/function parameters, return information and control flow reflect source evidence. | FR-007 | unit | example | PENDING (selected MySQL parameters, function return type and body covered; control flow and other dialects pending) | `tests/unit/object-intelligence-function.test.ts`, T011, T013–T014 |
| U9 | Supported trigger target, timing, event and available enabled state reflect source evidence without runtime assertions. | FR-008 | unit | example | PENDING | `tests/unit/object-intelligence-analysis.test.ts`, T011, T013–T014 |
| U10 | An uncertain procedural statement boundary is reported instead of being analyzed as a complete statement. | FR-009 | unit | example | PENDING | `tests/unit/object-intelligence-source.test.ts`, T017, T019 |
| U11 | An extracted statement location maps to the original source line and column. | FR-009, FR-011 | unit | example | PENDING (source slicing covered; line/column pending) | `tests/unit/object-intelligence-source.test.ts`, T017, T019 |
| U12 | Source search reaches matching text. | FR-011 | component | example | PENDING | `tests/unit/object-intelligence-source-panel.test.tsx`, T018, T020 |
| U13 | Source copy preserves the selected object or extracted statement text. | FR-011 | component | example | PENDING | `tests/unit/object-intelligence-source-panel.test.tsx`, T018, T020 |
| U14 | Source expansion and collapse preserve the underlying source. | FR-011 | component | example | PENDING | `tests/unit/object-intelligence-source-panel.test.tsx`, T018, T020 |
| U15 | Formatting is offered only where supported and reports failure visibly. | FR-011, FR-025 | component | example | PENDING | `tests/unit/object-intelligence-source-panel.test.tsx`, T018, T020 |
| U16 | In-app navigation retains supplied definitions in the current document session. | FR-029 | integration | example | PENDING (remount covered; real navigation pending) | `tests/unit/object-intelligence-session.test.tsx`, T006–T007, T026 |
| U17 | Reload, close, sign-out or identity change clears session definitions and consent. | FR-027, FR-029 | integration | example | PENDING (same-tab identity changes and selected cross-tab changes covered in jsdom; browser lifecycle and consent pending) | `tests/unit/object-intelligence-signout.test.tsx`, `tests/unit/object-intelligence-identity-session.test.tsx`, T006–T007, T035, T040; browser lifecycle T047 |
| U18 | Merely importing definitions adds no source to persisted state, history, URLs or logs. | FR-027, FR-029 | integration | example | PENDING | `tests/unit/object-intelligence-session.test.ts`, T006–T007, T021, T026 |
| U19 | Different dialects, qualified schemas or object kinds do not silently merge. | FR-030 | unit | example | PENDING | `tests/unit/object-intelligence-identity.test.ts`, T008–T009 |
| U20 | Quoted names and ambiguous routine overloads are not equated without proven identity. | FR-030 | unit | example | PENDING | `tests/unit/object-intelligence-identity.test.ts`, T008–T009 |
| U21 | Duplicate keep retains the previous definition; replace uses the incoming definition after confirmation. | FR-030 | integration | example | PENDING | `tests/unit/object-intelligence-ingestion.test.ts`, T021, T024, T026 |
| U22 | Cancelling an import conflict leaves the existing session unchanged. | FR-030 | integration | example | PENDING | `tests/unit/object-intelligence-ingestion.test.ts`, T021, T024 |
| U23 | A file read failure identifies the affected file without silently discarding existing definitions. | FR-025, FR-028 | integration | example | PENDING (selected file-read failure covered; broader file/error cases pending) | `tests/unit/object-intelligence-graph.test.tsx`, T021, T024 |
| U24 | A delayed result for an older revision cannot overwrite newer source or analysis. | FR-019, FR-029 | integration | example | PENDING (single-object source edit and delayed analysis covered; multi-object and AI revisions remain pending) | `tests/unit/object-intelligence-session.test.tsx`, T006–T007, T026 |
| U25 | A dependency edge retains its evidenced source-to-target direction and operation. | FR-012 | unit | example | PENDING | `tests/unit/object-intelligence-dependencies.test.ts`, T022, T025 |
| U26 | An unresolved or ambiguous target remains explicitly unresolved. | FR-012, FR-014 | unit | example | PENDING | `tests/unit/object-intelligence-dependencies.test.ts`, T022, T025 |
| U27 | Cyclic traversal terminates and identifies the cycle. | FR-014, SC-004 | unit | example | PENDING | `tests/unit/object-intelligence-dependencies.test.ts`, T022, T025 |
| U28 | Reverse impact follows incoming edges only and preserves direct/transitive depth. | FR-014, SC-004 | unit | example | PENDING | `tests/unit/object-intelligence-dependencies.test.ts`, T022, T025 |
| U29 | A replaced definition invalidates dependent analysis, graph and stale AI output. | FR-014, FR-019, FR-030 | integration | example | PENDING | `tests/unit/object-intelligence-ingestion.test.ts`, T021, T026 |
| U30 | A reported complexity value matches known structural evidence rather than a runtime estimate. | FR-015 | unit | example | PENDING | `tests/unit/object-intelligence-findings.test.ts`, T031, T033 |
| U31 | Findings retain severity, evidence, recommendation and available confidence or location. | FR-016 | unit | example | PENDING | `tests/unit/object-intelligence-findings.test.ts`, T031, T033 |
| U32 | Each explicit AI action uses relevant verified facts and communicates missing context. | FR-017, FR-018 | unit | example | PENDING | `tests/unit/object-intelligence-ai-context.test.ts`, T036, T038 |
| U33 | Embedded instructions in SQL remain untrusted input and cannot override analysis instructions. | FR-021 | integration | example | PENDING | `tests/unit/object-intelligence-ai-context.test.ts`, T036, T038–T039 |
| U34 | Credentials and secrets are excluded from AI context and source/secret values are absent from logs. | FR-021, FR-027 | integration | example | PENDING | `tests/unit/object-intelligence-ai-context.test.ts`, T036, T038–T039 |
| U35 | Cancelling external-send confirmation causes zero provider requests. | FR-022 | integration | example | PENDING | `tests/unit/object-intelligence-ai-consent.test.ts`, T035, T039–T040 |
| U36 | Switching external providers requires confirmation for the new provider. | FR-022 | integration | example | PENDING | `tests/unit/object-intelligence-ai-consent.test.ts`, T035, T040 |
| U37 | Local AI and existing AI workflows retain their existing access and consent behavior. | FR-002, FR-022 | integration | example | PENDING | `tests/unit/object-intelligence-ai-consent.test.ts`, `tests/unit/aiService.test.ts`, T029, T035, T039–T040 |
| U38 | An unauthorized or guest-restricted AI action is rejected by the existing access policy. | FR-017, FR-022, FR-027 | integration | example | PENDING | `tests/unit/object-intelligence-ai-consent.test.ts`, T035, T039 |
| U39 | A stale suggestion cannot overwrite a newer source revision. | FR-019 | integration | example | PENDING | `tests/unit/object-intelligence-ai-panel.test.tsx`, T037, T041 |
| U40 | A suggestion can be copied without applying it to the original. | FR-019 | component | example | PENDING | `tests/unit/object-intelligence-ai-panel.test.tsx`, T037, T041 |
| U41 | Loading, empty, partial, unsupported and error states identify stage and next action. | FR-025 | component | example | PENDING | `tests/unit/object-intelligence-accessibility.test.tsx`, T042, T046 |
| U42 | Keyboard users can reach the same known relationships in the accessible list. | FR-024 | component | example | PENDING | `tests/unit/object-intelligence-accessibility.test.tsx`, T042, T046 |
| U43 | Editing, rendering or changing parameters does not automatically request AI. | FR-026 | integration | example | PENDING | `tests/unit/object-intelligence-ai-panel.test.tsx`, T037, T041; regression T048 |
| U44 | A large object remains responsive under the documented, measured baseline conditions. | FR-026 | integration | example | PENDING | `tests/unit/object-intelligence-responsiveness.test.ts`, T048–T049 |
| U45 | A changed approved input limit yields visible actionable feedback rather than silent truncation. | FR-025, FR-026 | integration | example | PENDING | `tests/unit/object-intelligence-responsiveness.test.ts`, T048–T049; only if a limit is approved |

## Non-automated and release evidence

These are not simulated as passing Vitest acceptance tests. Keep each pending until its evidence is recorded.

| ID | Evidence | Traces | Layer | State | Task |
|---|---|---|---|---|---|
| V1 | Compare baseline and post-change critical journeys; document authorized compatibility changes. | FR-002, SC-003 | integration/manual review | PENDING | T001, T028–T030, T051 |
| V2 | User confirms Hallmark style; review keyboard/pointer, both locales/themes and responsive viewports on a real browser with permission. | FR-023, FR-024, SC-006 | browser/manual review | PENDING | T015, T044, T047 |
| V3 | At least four of five target users complete the four SC-005 tasks unaided. | SC-005 | usability review | PENDING | T052 |
| V4 | Analysis plus graph rendering for a supported >50-table query completes within one second on the specified single-GPU reference machine; record fixture, hardware and timing. | SC-007 | performance benchmark | PENDING | T050 |
| V5 | Every matrix cell has tested scope and accurate supported/partial/unsupported status; each master-prompt target is validated or explicitly excluded by user approval. | FR-001, SC-001, SC-009 | evidence audit | PENDING | T003, T016, T053 |

## Execution and task synchronization

- Start with T001–T003: characterize existing behavior on untouched code; pull applicable T028–T029 cases forward before changing their integration points. A green existing-behavior test is baseline evidence, not a fabricated RED. Record its result before touching the relevant code.
- For each new behavior, first write one outer acceptance test where feasible, run it to a valid RED, then complete its focused unit/component cycles; record actual RED, GREEN and refactor output in `tdd/cycle-log.md`. Existing applicable tests can be reused after verifying they assert the required behavior.
- Tests and implementation in the matching tasks are interleaved by behavior: T004→T005, T006→T007, T008→T009; then each story's test tasks precede their corresponding implementation tasks. Do not complete a batch task until all applicable cases pass and evidence is recorded.
- A1–A24 describe intended outer tests, not proof of end-to-end execution. Browser, device lifecycle, performance and user-review evidence requires V2–V4; the profile has no verified acceptance/E2E, performance, coverage or mutation runner. Do not mark those gates passed from jsdom alone.
- Maintain regression gates throughout; new session and AI actions never replace or weaken existing query, MyBatis, authorization, history or provider tests.

## Unresolved measurement and scope boundaries

- The exact SC-007 reference machine and benchmark harness are not established. T050 remains blocked until they are available; no timing has been measured.
- FR-026 does not define large-object fixture sizes or a numeric responsiveness threshold. T048 derives a measured baseline; any behavior-changing input cap requires user approval. U44 and conditional U45 cannot be finalized earlier.
- The capability matrix and current full-suite baseline are not yet established. Each dialect/construct case is finalized from the audit and executable fixtures, not from assumptions. Three spec-quality checklist items remain unchecked.
- SC-005 requires real target users. Visual/browser checks require permission; no browser is currently shared. No live database, real SQL, secret or third-party AI request is required by this test plan.
- Matrix/audit and user-design sign-off cannot be fully proven by unit tests. Existing features that already satisfy a behavior should be characterized, not rewritten to manufacture RED.

## Verification commands

Copied from `.specify/memory/tdd-profile.md`:

- Single: `npm test -- tests/unit/sqlSourceClassification.test.ts`
- File: `npm test -- tests/unit/sqlSourceClassification.test.ts`
- Suite: `npm test`
- Coverage, mutation, acceptance, property, approval and contract runners: not configured or verified in the profile.

For a selected feature test file, use the same verified file-runner pattern with its actual path, for example `npm test -- tests\unit\object-intelligence-detection.test.ts`. Record the exact command and output actually run; no tests were run in this planning step.
