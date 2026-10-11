---

description: "Executable task plan for AI SQL Comparison Results"
---

# Tasks: AI SQL Comparison Results

**Input**: Design documents from `/specs/018-ai-compare-results/`

**Prerequisites**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/comparison-ui-and-ai-contract.md`, `quickstart.md`, and `tdd/test-list.md`

**Tests**: Required. Feature 018 has a TDD test list and a mandatory `before_implement` TDD hook. Add one focused failing behavior test at a time, record its actual red result in `specs/018-ai-compare-results/tdd/cycle-log.md`, then implement the smallest change and record green/refactor evidence. Existing tests marked `BASELINE` in the test list are characterization coverage, not proof of test-first history.

**Organization**: Tasks are grouped by the three P1 user stories. Each story's pending tests precede implementation. The shared Next.js/Vitest setup already exists, so setup and foundational phases have no initialization work.

## Format: `[ID] [P?] [Story] Description`

- **[P]** marks work that can run in parallel without editing the same file or depending on unfinished work.
- **[Story]** maps the task to a user story in `spec.md`; setup, foundational, and polish tasks have no story label.
- Every task names its concrete file path. Test tasks also name the behavior ID from `tdd/test-list.md`.

## Phase 1: Setup

**Purpose**: Reuse the existing Next.js 15, TypeScript, Vitest, Monaco, locale, parser, and AI provider infrastructure. No project initialization, dependency installation, or configuration task is needed.

## Phase 2: Foundational

**Purpose**: No blocking infrastructure changes are needed. User stories build on the existing comparison snapshot, panel, parser services, and `streamWithAI` provider path; no new route, storage layer, parser, or dependency is planned.

---

## Phase 3: User Story 1 - Inspect a comparison clearly (Priority: P1) - MVP

**Goal**: Capture the main editor's original/current SQL pair, show a clear responsive full diff and summary, and keep comparison analysis-only.

**Independent Test**: In `tests/unit/query-input-sql-comparison.test.tsx`, load and edit editor SQL, run Compare, and assert the exact pair, summary, no-change/incomplete states, stale behavior, and unchanged editor contents. In `tests/unit/sqlComparisonPanel.test.tsx`, assert clear pane labels and accessible diff controls.

### Tests for User Story 1 - write and run each test before implementation

- [X] T001 [US1] Add the failing A2 component test for explicit Before/After labels and distinguishable diff changes in `tests/unit/sqlComparisonPanel.test.tsx`; record RED in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T002 [US1] Add the A16 component test for a summary that distinguishes no changes, text differences, structural findings, and limitations before detailed findings in `tests/unit/sqlComparisonPanel.test.tsx`; implement the summary and record red/green evidence in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T003 [US1] Add the A4 query-input characterization test for formatting-only SQL being distinct from structural findings in `tests/unit/query-input-sql-comparison.test.tsx`; record baseline evidence in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T004 [US1] Add the A5 query-input test proving identical editor SQL displays no changes, gives editor-only guidance, and makes no AI request in `tests/unit/query-input-sql-comparison.test.tsx`; record red/green evidence in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T005 [US1] Add the A17 query-input characterization test for editor source replacement/reset refreshing both compared sides in `tests/unit/query-input-sql-comparison.test.tsx`; record baseline evidence in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T006 [US1] Add the A19 query-input characterization test proving Compare and AI request do not execute SQL or mutate editor text in `tests/unit/query-input-sql-comparison.test.tsx`; record baseline evidence in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T007 [P] [US1] Add the U8 domain cases for empty and comment-only SQL pairs producing no fabricated findings in `tests/unit/sqlComparison.test.ts`; record red/green evidence in `specs/018-ai-compare-results/tdd/cycle-log.md`.

### Implementation for User Story 1

- [X] T008 [P] [US1] Implement explicit incomplete-pair handling for empty/comment-only input without fabricated changes or findings in `src/lib/sql/sqlComparison.ts`.
- [X] T009 [P] [US1] Verify the captured editor pair and dialect remain synchronized after source replacement/reset, identical SQL skips AI, and comparison preserves editor contents in `src/app/query-input/page.tsx`; existing handlers passed the new source/no-change/analysis-only integration tests.
- [X] T010 [P] [US1] Render explicit Before/After labels, ordered summary categories, and accessible inserted/deleted/modified diff cues in `src/app/smart-sql-editor/components/SqlComparisonPanel.tsx`; component tests cover the labels, summary order, and enabled Monaco diff indicators.
- [X] T011 [US1] Replace fixed-height/narrow side-by-side diff constraints with responsive Monaco options and a navigable full-SQL viewport in `src/app/smart-sql-editor/components/SqlComparisonPanel.tsx`; narrow/wide modes and viewport height are component-tested, and manual 8,000-line browser evidence plus caveats are recorded in T041.

**Checkpoint**: User Story 1 works independently with a stable editor snapshot, explicit no-change/incomplete states, and a readable responsive diff; baseline A1 and stale-result A14 tests remain green.

---

## Phase 4: User Story 2 - Understand concise structural findings (Priority: P1)

**Goal**: Show supported structural changes with concise evidence, explicit parser limitations, and conservative CTE matching.

**Independent Test**: Compare predicate/join, formatting, CTE, invalid, and dialect-specific fixtures. Confirm supported evidence remains visible, ambiguous matching is not reported as confirmed semantics, and long evidence can be expanded.

### Tests for User Story 2 - write and run each test before implementation

- [X] T012 [US2] Add the U9 domain test for ambiguous CTE matching to yield a scoped limitation rather than a broad confirmed clause change in `tests/unit/sqlComparison.test.ts`; record red/green evidence in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T013 [US2] Add the U10 dialect matrix cases for supported constructs and explicit unsupported parser coverage in `tests/unit/sqlComparison.test.ts`; record baseline evidence in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T014 [US2] Add the A6 query-input characterization test for concise filter findings with relevant Before/After evidence in `tests/unit/query-input-sql-comparison.test.tsx`; record baseline evidence in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T015 [US2] Add the A7 panel test for collapsed long evidence with full relevant evidence available on request in `tests/unit/sqlComparisonPanel.test.tsx`; record red/green evidence in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T016 [US2] Add the A8 query-input characterization test that ambiguous CTE changes disclose uncertainty without broad confirmed semantic findings in `tests/unit/query-input-sql-comparison.test.tsx`; record baseline evidence in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T017 [US2] Add the A9 query-input characterization test that partial dialect parsing remains explicit while supported findings stay visible in `tests/unit/query-input-sql-comparison.test.tsx`; record baseline evidence in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T018 [P] [US2] Add the U23 component test for bounded, expandable finding evidence in `tests/unit/sqlComparisonPanel.test.tsx`; record red/green evidence in `specs/018-ai-compare-results/tdd/cycle-log.md`.

### Implementation for User Story 2

- [X] T019 [P] [US2] Match CTEs only where existing analyzer evidence supports identity; otherwise retain text differences and mark structural coverage partial in `src/lib/sql/sqlComparison.ts`.
- [X] T020 [P] [US2] Bound collapsed finding excerpts and expose the complete relevant evidence without duplicating whole SQL clauses in `src/app/smart-sql-editor/components/SqlComparisonPanel.tsx`.
- [X] T021 [US2] Verify parser-supported dialect cross-checks and explicit capability/limitation results using the existing parser stack in `src/lib/sql/sqlComparison.ts`; the new matrix confirmed supported evidence and partial-state disclosures.

**Checkpoint**: User Story 2 reports supported facts precisely, keeps uncertain/parser-limited analysis visibly partial, and leaves full SQL inspectable in the diff.

---

## Phase 5: User Story 3 - Review AI assessment and verification state (Priority: P1)

**Goal**: Render a dedicated validated AI assessment with visible lifecycle, failure/retry, stale, and privacy behavior while retaining deterministic results.

**Independent Test**: Mock valid, malformed, unavailable, delayed, partial, and stale responses in `tests/unit/query-input-sql-comparison.test.tsx`; assert visible validated AI fields, correct lifecycle states, retry behavior, deterministic-result retention, and no sensitive error/log content.

### Tests for User Story 3 - write and run each test before implementation

- [X] T022 [US3] Add the A10 panel test for the visible not-started assessment and explicit request action in `tests/unit/sqlComparisonPanel.test.tsx`; implement the visible state and record red/green evidence in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T023 [US3] Add the failing A12 query-input test for validated AI summary, impact, evidence, assumptions, and verification fields attributed separately from deterministic findings in `tests/unit/query-input-sql-comparison.test.tsx`; record RED in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T024 [US3] Add the failing A13 query-input tests for unavailable and malformed outcomes, retry when available, and retained deterministic findings in `tests/unit/query-input-sql-comparison.test.tsx`; record RED in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T025 [US3] Add the failing A15 query-input test for a valid AI result displayed alongside partial deterministic-analysis limitations without upgraded verification claims in `tests/unit/query-input-sql-comparison.test.tsx`; covered by the shared partial-parser integration test and recorded in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T026 [US3] Add the failing A18 panel test distinguishing all eight AI states and only the actions supported in each state in `tests/unit/sqlComparisonPanel.test.tsx`; record RED in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T027 [US3] Add the failing A21 query-input test proving credential and sensitive SQL values are absent from provider errors and captured logs in `tests/unit/query-input-sql-comparison.test.tsx`; record RED in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T028 [P] [US3] Add the failing U18 AI-adapter test that sanitizes provider errors containing credentials or SQL in `tests/unit/sqlComparisonAi.test.ts`; record RED in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T029 [US3] Add the failing U24 component test for accessible lifecycle status and state-appropriate actions in `tests/unit/sqlComparisonPanel.test.tsx`; record RED in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T030 [US3] Add the failing U25 component test for English/Vietnamese comparison labels and AI lifecycle messages in `tests/unit/sqlComparisonPanel.test.tsx`; record RED in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T031 [US3] Add the failing U29 integration test that identical SQL does not dispatch an AI request in `tests/unit/query-input-sql-comparison.test.tsx`; record RED in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T032 [US3] Add the failing U30 integration test for empty/comment-only pairs showing incomplete status without fabricated findings in `tests/unit/query-input-sql-comparison.test.tsx`; record RED in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T033 [US3] Add the failing U31 integration test that comparison and AI request leave SQL unchanged and do not execute it in `tests/unit/query-input-sql-comparison.test.tsx`; record RED in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T034 [US3] Add the failing U32 integration test that provider failure preserves deterministic results in `tests/unit/query-input-sql-comparison.test.tsx`; record RED in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T035 [US3] Add the failing U33 integration test that user-visible provider errors omit sensitive SQL and credentials in `tests/unit/query-input-sql-comparison.test.tsx`; record RED in `specs/018-ai-compare-results/tdd/cycle-log.md`.

### Implementation for User Story 3

- [X] T036 [US3] Evolve the structured AI response contract to validate and return summary, impact hypotheses, grounded evidence, assumptions, limitations, and verification steps in `src/lib/ai/sqlComparisonAi.ts`.
- [X] T037 [US3] Sanitize comparison provider errors and logs so raw exception objects, prompt/SQL content, response bodies, and credentials are not exposed in `src/lib/ai/sqlComparisonAi.ts` and `src/app/query-input/page.tsx`.
- [X] T038 [US3] Bind each AI lifecycle transition to its captured run, preserve cancellation/stale guards, and retain deterministic findings through failure and retry in `src/app/query-input/page.tsx`.
- [X] T039 [US3] Render the dedicated accessible AI Assessment for not-started, analyzing, completed, partial, unavailable, failed, not-needed, and stale states in `src/app/smart-sql-editor/components/SqlComparisonPanel.tsx`.
- [X] T040 [US3] Add and verify English/Vietnamese strings for all new AI fields, lifecycle messages, and retry controls in `src/locales/en.ts` and `src/locales/vi.ts`.

**Checkpoint**: User Story 3 exposes validated assessment content and every applicable state, never applies stale/invalid output, preserves deterministic results, and does not leak sensitive error data.

---

## Phase 6: Polish & Cross-Cutting Validation

**Purpose**: Verify acceptance across the complete feature and record limitations/evidence.

- [X] T041 Run the 8,000-line and long-line responsive diff browser check from `specs/018-ai-compare-results/quickstart.md`; full line navigation and wrapping were manually observed, with viewport and Monaco teardown caveats recorded in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T042 Run the focused comparison Vitest command from `specs/018-ai-compare-results/quickstart.md` covering `tests/unit/sqlComparison.test.ts`, `tests/unit/sqlComparisonAi.test.ts`, `tests/unit/sqlComparisonPanel.test.tsx`, and `tests/unit/query-input-sql-comparison.test.tsx`; record results in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T043 Run `npm run type-check` and `npm run lint` from the repository root; resolve feature-caused failures and record results in `specs/018-ai-compare-results/tdd/cycle-log.md`.
- [X] T044 Run `npm test` and `npm run build` from the repository root; both passed and results are recorded in `specs/018-ai-compare-results/tdd/cycle-log.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No project setup is required; the existing application and test stack are reused.
- **Foundational (Phase 2)**: No separate foundational changes are required; existing comparison state and services are the shared base.
- **User Stories (Phases 3-5)**: Each story's tests must be written and shown RED before its implementation begins. Implement sequentially in priority order because the stories share the comparison panel and result contract.
- **Polish (Phase 6)**: Depends on the three user-story checkpoints.

### User Story Dependencies

- **User Story 1 (P1)**: First MVP increment; uses the existing editor snapshot path and comparison result.
- **User Story 2 (P1)**: Follows User Story 1's stable snapshot/diff surface; extends deterministic findings and evidence.
- **User Story 3 (P1)**: Follows the stable deterministic comparison result and uses its captured snapshot/findings for AI assessment.

### Within Each User Story

- Execute test tasks in listed order, one test-list behavior at a time; record the actual failing output before production edits.
- Implement only enough to turn the selected behavior green, then run its focused file test before the next behavior.
- Existing `BASELINE` behaviors in `tdd/test-list.md` require no new test task unless a pending requirement extends them.
- Do not mark `A3` automated E2E coverage complete: `.specify/memory/tdd-profile.md` contains no verified E2E/acceptance runner; perform the documented browser check and retain the automation limitation unless a runner is established.

### Parallel Opportunities

- Within a story's test phase, only tasks marked `[P]` may be parallelized; they touch different test files.
- User-story implementation is intentionally sequential because stories share `SqlComparisonPanel`, comparison result types, and captured editor state.
- No dependency installation, parser addition, API route, or database work is parallel or required.

## Parallel Example: User Story 1

```text
T007: Add empty/comment-only domain cases in tests/unit/sqlComparison.test.ts
T003: Add formatting-only integration case in tests/unit/query-input-sql-comparison.test.tsx
```

These two test tasks can be prepared independently; tasks touching the same test file stay sequential.

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Reuse current project infrastructure; complete no-op Setup and Foundational phases.
2. Complete User Story 1 with failing tests first, then editor-pair correctness, incomplete/no-change handling, summary, and responsive diff.
3. Validate the US1 checkpoint independently, including the documented 8,000-line browser check where available.
4. Continue to structural findings (US2) and AI lifecycle/privacy (US3) without weakening earlier story tests.

### Incremental Delivery

1. Deliver US1 as the comparison MVP: stable original/current pair, clear summary, and full diff.
2. Add US2 findings with scoped evidence and parser limitations; verify independently.
3. Add US3 validated AI assessment and lifecycle/privacy states; verify independently.
4. Run the focused suite and final type-check, lint, full suite, and build gates.

## Notes

- All test tasks are mandatory because the feature has an explicit TDD test list and the implementation workflow requires red-green-refactor evidence.
- The profile's exact recorded single-test example is `npm test -- tests/unit/sqlSourceClassification.test.ts`; focused feature commands are documented in `specs/018-ai-compare-results/quickstart.md`.
- Do not claim a test is RED/GREEN/DONE or tick its behavior complete without actual command output and corresponding evidence in `specs/018-ai-compare-results/tdd/cycle-log.md`.
