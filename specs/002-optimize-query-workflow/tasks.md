---

description: "Task list template for feature implementation"
---

# Tasks: Optimize Query Workflow Redesign

**Input**: Design documents from `/specs/002-optimize-query-workflow/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: A minimal set of unit-test tasks are included for pure logic (structural regression, prompt formatting) per the project constitution's testing standard for AI integrations. No component-level UI test tasks are included — the repo has no `@testing-library/react`/jsdom harness set up, and adding one is out of scope for this feature.

**Organization**: Tasks are grouped by user story (US1–US4, all mapped from `spec.md`) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- File paths are relative to the repository root

## Path Conventions

Single Next.js project — `src/` at repository root (see plan.md Project Structure). No `backend/`/`frontend/` split.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the i18n scaffolding shared by every later phase.

- [ ] T001 [P] Add new locale keys to `src/locales/en.ts` for: modal title/close, natural-language instruction input label/placeholder/submit, instruction-refused message, session-level Apply/Discard button labels.
- [ ] T002 [P] Add matching Vietnamese locale keys to `src/locales/vi.ts` for the same keys added in T001.

**Checkpoint**: New locale keys compile and are importable via `getT(locale)`.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the modal container and the extracted regression-check module that every user story renders into or depends on. Must complete before any user story phase.

- [ ] T003 Extract `buildStructuralRegressionWarnings` out of `src/app/smart-sql-editor/components/SmartSQLEditor.tsx` into a new pure module `src/lib/sql/optimizeRegression.ts` (same logic, same `Translations` param), and update `SmartSQLEditor.tsx` to import it from there.
- [ ] T004 Create `src/app/smart-sql-editor/components/OptimizeQueryModal.tsx`: a modal shell (`role="dialog"`, `aria-modal="true"`, backdrop click, Escape-to-close) following the existing pattern in `src/app/smart-sql-editor/components/AiFeatureAnnouncement.tsx`, accepting `isOpen`, `onClose`, and a content `children`/props region (no analysis content moved yet).
- [ ] T005 In `src/app/smart-sql-editor/components/SmartSQLEditor.tsx`, add an `isModalOpen` state and wire it to the existing "Analyze & Optimize" button (open on click) and to `OptimizeQueryModal`'s `onClose`, without yet moving the inline analysis JSX.

**Checkpoint**: An empty modal opens/closes correctly from the existing button; no visual/behavioral change to the analysis content yet.

## Phase 3: User Story 1 - Review optimization analysis in a focused modal (Priority: P1) 🎯 MVP

**Goal**: All optimization analysis (semantic brief, structural warnings, suggestions, proposals) renders inside the modal instead of the inline page panel.

**Independent Test**: Trigger an optimization on any analyzed query; confirm all analysis output renders inside `OptimizeQueryModal` and can be closed/reopened without losing the last result.

- [ ] T006 [US1] Move the "Step 1: semantic brief review" JSX block (purpose/relationships/critical filters/risks, expand/collapse, confirm/cancel buttons) from `SmartSQLEditor.tsx` into `OptimizeQueryModal.tsx`, passed down via props (`semanticPhase`, `semanticBrief`, `semanticError`, handlers).
- [ ] T007 [US1] Move the "AI Optimize progress/results" JSX block (streaming text, structural warnings, `analysis`/`semanticImpact`, proposals list, suggestions, knowledge sources) from `SmartSQLEditor.tsx` into `OptimizeQueryModal.tsx`, passed down via props.
- [ ] T008 [US1] Verify/adjust `OptimizeQueryModal.tsx` layout so incremental stream updates (`optimizeStreamRaw`) re-render inside a scrollable modal region without shifting the editor page behind the backdrop.
- [ ] T009 [US1] Wire `OptimizeQueryModal`'s close (button/backdrop/Escape) in `SmartSQLEditor.tsx` to abort the in-flight `optimizeAbortRef` controller (reusing `handleCancelSemanticReview`/existing abort logic) without discarding an already-completed `optimizeResult`.
- [ ] T010 [US1] Ensure `semanticBrief`/`optimizeResult` state in `SmartSQLEditor.tsx` persists across modal close/reopen (only cleared on a new "Analyze & Optimize" run, not on close), so reopening without re-running still shows the last result.
- [ ] T011 [P] [US1] Add unit tests in `src/lib/sql/optimizeRegression.test.ts` for the extracted `buildStructuralRegressionWarnings` (table/join/filter/column identity cases), covering the logic moved in T003.

**Checkpoint**: User Story 1 is independently functional — analysis fully lives in the modal, closing/reopening behaves correctly.

## Phase 4: User Story 2 - Optimize using a natural-language instruction without changing meaning (Priority: P1)

**Goal**: Users can type a free-form optimization instruction; the AI must ground its understanding in the semantic brief first and must never silently change query semantics to satisfy the instruction.

**Independent Test**: Submit a natural-language instruction against a known query; confirm the semantic brief appears before any rewrite, and confirm a semantics-changing instruction is refused or flagged rather than silently applied.

- [ ] T012 [US2] Add a natural-language instruction input (textarea + submit button, using T001/T002 locale keys) inside `OptimizeQueryModal.tsx`, enabled once a semantic brief exists.
- [ ] T013 [US2] Extend `analyzeSqlSemantics(...)` in `src/lib/ai/aiService.ts` to accept an optional `userInstruction: string` parameter and fold it into the Step-1 semantic-brief prompt so the brief reflects what the user is asking for.
- [ ] T014 [US2] Extend `optimizeSqlWithAIStream(...)` in `src/lib/ai/aiService.ts` so the confirmed semantic brief (via `formatSemanticBriefForOptimizePrompt`) and the user's natural-language instruction are both passed as explicit prompt constraints, with instructions that literal requests altering tables/joins/filters/output columns must be refused rather than applied.
- [ ] T015 [US2] In `OptimizeQueryModal.tsx`, render an explicit "instruction refused" state (distinct from a normal proposal list) when the AI's `analysis`/`semanticImpact` indicates the request was not applied due to a semantic conflict.
- [ ] T016 [US2] In `SmartSQLEditor.tsx`, thread the typed instruction from T012 through `handleAnalyzeSemantics`/`handleConfirmOptimize` into the new `aiService.ts` parameters from T013/T014, tagging the run's trigger source (`automatic` vs `instruction`) for T015's rendering.
- [ ] T017 [P] [US2] Add a unit test in `src/lib/ai/aiService.test.ts` verifying the optimize prompt built via `formatSemanticBriefForOptimizePrompt` plus a supplied `userInstruction` includes both the confirmed brief constraints and the instruction text.
- [ ] T018 [P] [US2] Add a unit test in `src/lib/sql/optimizeRegression.test.ts` simulating an instruction-driven rewrite that drops a WHERE filter, asserting `buildStructuralRegressionWarnings` flags it.

**Checkpoint**: User Story 2 is independently functional on top of US1's modal — natural-language instructions work and cannot silently change semantics.

## Phase 5: User Story 3 - Confirm before any change is applied (Priority: P1)

**Goal**: No AI-optimized SQL replaces the editor content without an explicit user confirmation action, regardless of trigger source.

**Independent Test**: Run an optimization to completion; confirm the editor's original query is untouched until "Apply" is clicked, and confirm "Discard"/closing leaves the original query intact and the discarded result unusable afterward.

- [ ] T019 [US3] Add session-level "Apply"/"Confirm" and "Discard"/"Cancel" actions in `OptimizeQueryModal.tsx` for a completed optimization result (distinct from the existing per-proposal "Apply" button already in the proposals list).
- [ ] T020 [US3] Audit `SmartSQLEditor.tsx` so `state.currentSql` is only mutated via the T019 session-level Apply action or an explicit per-proposal Apply — never automatically when `optimizePhase` becomes `'done'`.
- [ ] T021 [US3] On Discard or modal close without confirming, clear `optimizeResult`/pending proposals in `SmartSQLEditor.tsx` so a stale result cannot be re-surfaced or applied on a later modal open.
- [ ] T022 [US3] In `OptimizeQueryModal.tsx`, ensure structural regression warnings (from T007) render directly adjacent to the T019 confirm action so the decision to apply is always informed.

**Checkpoint**: User Story 3 is independently functional — confirmation is mandatory and discard is reliable.

## Phase 6: User Story 4 - See an immediate before/after comparison in the editor (Priority: P2)

**Goal**: Confirming an optimization immediately switches the editor into compare/diff mode against the original query.

**Independent Test**: Confirm an optimization proposal and verify the editor immediately enters `DiffEditor` compare mode showing original vs. optimized, with no extra navigation step.

- [ ] T023 [US4] In `SmartSQLEditor.tsx`, on the T019 session-level Apply confirmation, automatically set `state.isDiffMode = true` (reusing the existing `handleToggleDiffMode`/diff-mode state) instead of requiring a manual "Compare" click.
- [ ] T024 [US4] Verify `DiffEditor` (`original={state.originalSql}`, `modified={state.currentSql}`) reflects the newly applied query immediately after T023, and that the modal closes or steps back after Apply so the diff is visible without extra interaction.
- [ ] T025 [US4] Confirm that exiting diff mode afterward retains the applied (optimized) query as the active `state.currentSql` going forward (no reversion).

**Checkpoint**: All user stories complete — full modal-based, natural-language, confirm-gated, diff-on-apply optimize workflow is in place.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all stories.

- [ ] T026 [P] Reconcile any additional locale strings discovered during T004–T025 into `src/locales/en.ts` and `src/locales/vi.ts` (beyond the initial set from T001/T002).
- [ ] T027 Run `npm run type-check` and `npm run lint`; fix any issues in touched files (`SmartSQLEditor.tsx`, `OptimizeQueryModal.tsx`, `aiService.ts`, `optimizeRegression.ts`, locale files).
- [ ] T028 Run `npm test` (Vitest) and confirm `optimizeRegression.test.ts` and `aiService.test.ts` pass alongside existing suites.
- [ ] T029 Manually walk through all 4 scenarios in [quickstart.md](./quickstart.md) against the dev server (`npm run dev`) and confirm expected behavior for each.

## Dependencies & Execution Order

- **Phase 1 (Setup)** → no dependencies; T001/T002 can run in parallel.
- **Phase 2 (Foundational)** → depends on Phase 1 completing (locale keys available); blocks all user story phases (T004 modal shell and T003 extracted module are consumed by every story).
- **Phase 3 (US1)** → depends on Phase 2. No dependency on other stories.
- **Phase 4 (US2)** → depends on Phase 3 (renders inside the modal built in US1; needs the semantic-brief UI from T006 to attach the instruction input to).
- **Phase 5 (US3)** → depends on Phase 3 (needs the modal's proposal/result rendering from T007) and logically follows US2 since confirmation applies to both automatic and instruction-driven results; can be implemented once T007/T012–T016 exist.
- **Phase 6 (US4)** → depends on Phase 5 (T019's Apply action is the trigger for T023's diff-mode switch).
- **Phase 7 (Polish)** → depends on all prior phases.

Story priority order for delivery: US1 → US2 → US3 → US4 (matches spec.md priorities; US1/US2/US3 are all P1 but US1 must land first as the structural container, per spec.md's "Why this priority" notes).

## Parallel Execution Examples

- Phase 1: T001 and T002 (different files: `en.ts` vs `vi.ts`).
- Phase 3: T011 can run in parallel with T006–T010 (different file: `optimizeRegression.test.ts` vs `SmartSQLEditor.tsx`/`OptimizeQueryModal.tsx`).
- Phase 4: T017 and T018 can run in parallel with each other (different test files) once T013/T014 land.
- Phase 7: T026 can run in parallel with T027 (different files).

## Implementation Strategy

**MVP first**: Complete Phase 1 → Phase 2 → Phase 3 (US1) and stop there for an initial review — this alone delivers the modal-based reorganization (spec's core structural request) without the natural-language/confirm/diff additions.

**Incremental delivery**: Add Phase 4 (US2) next for the natural-language capability with its semantics guarantee, then Phase 5 (US3) to lock in the confirmation gate, then Phase 6 (US4) for the immediate diff view, then Phase 7 to polish and validate everything end-to-end.
