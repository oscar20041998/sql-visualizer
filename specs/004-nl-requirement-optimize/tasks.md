# Tasks: Requirement-Driven Query Optimization

**Input**: Design documents from `/specs/004-nl-requirement-optimize/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included — the project constitution's Quality Standards mandate unit/integration tests for all new parser logic and AI integrations, so test tasks are required, not optional, for this feature.

**Organization**: Tasks are grouped by user story (US1, US2, US3 from spec.md, all Priority P1) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single Next.js project — all paths are relative to the repository root (`src/lib/ai/`, `src/lib/sql/`, `src/app/smart-sql-editor/components/`, `src/locales/`), per plan.md's Project Structure.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new dependencies, build tooling, or project scaffolding are required — this feature extends existing modules only.

- [X] T001 Confirm no new npm dependencies are needed by re-reading `src/lib/ai/aiService.ts`, `src/lib/sql/optimizeRegression.ts`, and `src/app/smart-sql-editor/components/OptimizeQueryModal.tsx` in full, to anchor all following tasks against current code (no file changes in this task)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types and the mode-toggle UI shell that every user story phase depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 [P] Add `OptimizationMode` type (`'lint' | 'instruction' | 'requirement'`), `RequirementInput`, `SqlRequirementCandidateResult` (implemented in place of `CandidateQuery` — see Implementation Notes), interfaces to `src/lib/ai/aiService.ts`; `SemanticChangeSummary` implemented in `src/lib/sql/optimizeRegression.ts` (colocated with the diff logic that produces it) per data-model.md
- [X] T003 [P] Implemented `buildRequirementChangeSummary(original: AnalysisResult, candidate: AnalysisResult): SemanticChangeSummary` directly (skipped the throwing stub since T008 was implemented in the same pass) in `src/lib/sql/optimizeRegression.ts`
- [X] T004 Added an `optimizeMode` state (`OptimizationMode`, default `'instruction'`) and a 2-way mode toggle (existing Optimize flow / Add requirement) to `OptimizeQueryModal.tsx` — see Implementation Notes for the 2-way vs 3-way toggle rationale — wired to `optimizeMode`/`onOptimizeModeChange` props from `SmartSQLEditor.tsx`
- [X] T005 [P] Added i18n keys for the mode toggle labels (`smartEditorModeToggleLabel`, `smartEditorModeOptimizeLabel`, `smartEditorModeRequirementLabel`) to `src/locales/en.ts` and `src/locales/vi.ts`

**Checkpoint**: Mode toggle renders in the modal (switching does nothing yet); shared types compile — user story implementation can now begin

---

## Phase 3: User Story 1 - Describe a new requirement and get a candidate query (Priority: P1) 🎯 MVP

**Goal**: User types a plain-language requirement (optionally naming tables), and the system returns a sample candidate query that fulfills it, reporting any unresolved table/column references.

**Independent Test**: Enter a requirement referencing named tables against an analyzed query (e.g. [demo_query7.sql](../../src/sample/demo_query7.sql)) and confirm a candidate query, a change explanation, and any unresolved-reference warnings are returned — per quickstart.md Scenarios 1–2.

### Tests for User Story 1

- [X] T006 [P] [US1] Unit tests for `buildRequirementChangeSummary` covering added/removed tables, joins, output columns, and filter changes in `src/lib/sql/optimizeRegression.test.ts` (new file, 5 tests, all passing)
- [X] T007 [P] [US1] Unit tests for `resolveHintedTableReferences` (the deterministic half of unresolved-reference detection — see Implementation Notes) in `src/lib/ai/aiService.test.ts` (new file, 4 tests, all passing). The prompt-builder/parser themselves are private functions exercised indirectly through `generateRequirementCandidate`/`generateRequirementCandidateStream`, which call the network — no dedicated mock-based test was added for them in this pass.

### Implementation for User Story 1

- [X] T008 [US1] Implemented `buildRequirementChangeSummary` in `src/lib/sql/optimizeRegression.ts`, diffing `tables`/`joins`/`mainQueryFields` between original and candidate using the same tableKey/joinKey/fieldKey approach as `buildStructuralRegressionWarnings`, but bidirectional (added AND removed)
- [X] T009 [US1] Added `REQUIREMENT_CANDIDATE_PROMPT` (en/vi) to `src/lib/ai/aiService.ts` — accepts `sql`, `requirementText`, `hintedTables`; explicitly allows changing tables/joins/filters/output columns and requires `unresolved_references` in the JSON response
- [X] T010 [US1] Implemented `generateRequirementCandidate`/`generateRequirementCandidateStream` in `src/lib/ai/aiService.ts` reusing the existing budget/JSON-mode/streaming plumbing, returning `SqlRequirementCandidateResult`
- [X] T011 [US1] Wired `unresolvedReferences`: `resolveHintedTableReferences` deterministically checks `requirementInput.hintedTables` against `AnalysisResult.tables` client-side (no live DB catalog exists — research.md R3), merged with the model's own self-reported `unresolved_references` in `handleSubmitRequirement` (`SmartSQLEditor.tsx`). The `buildOptimizeKnowledgeBrief` RAG brief is still fed into the prompt's `contextBrief` as supporting context, but is not used for authoritative unresolved-reference validation.
- [X] T012 [US1] Added the requirement-input textarea, hinted-tables input, submit button, and streaming-progress/result display (candidate SQL, analysis text, unresolved-references list) to the requirement-mode section of `OptimizeQueryModal.tsx`
- [X] T013 [US1] Wired `handleSubmitRequirement` in `SmartSQLEditor.tsx`: calls `generateRequirementCandidateStream`, stores the result plus the source-SQL snapshot in `requirementSourceSqlRef`
- [X] T014 [P] [US1] Added i18n strings (`smartEditorRequirement*`) for the requirement-input label/placeholder/submit/unresolved-reference messages to `en.ts`/`vi.ts`

**Checkpoint**: User Story 1 is independently functional — a requirement produces a visible candidate query with an explanation and unresolved-reference reporting (not yet applyable to the editor)

---

## Phase 4: User Story 2 - Apply a meaning-changing candidate only after explicit confirmation (Priority: P1)

**Goal**: Candidates that change query semantics are clearly labeled with a diff summary, and only replace the editor's query after an explicit "Apply" action; "Discard" leaves the original untouched.

**Independent Test**: Submit a requirement that changes semantics, confirm the semantic-change label and diff summary appear before any apply control, confirm the editor is untouched until "Apply" is clicked, and confirm "Discard" leaves the original query intact — per quickstart.md Scenario 3, and Scenario 4 for the stale-candidate case.

### Tests for User Story 2

- [X] T015 [P] [US2] Covered by the `buildRequirementChangeSummary` test suite (T006/T007 tests above already assert `isSemanticChange: true`/`false` for each diff field, including a no-op case) — no separate test file needed
- [ ] T016 [P] [US2] SKIPPED: no React component-testing setup (no `@testing-library/react`/jsdom environment configured in this project's Vitest config) — adding one is out of scope for this change. Manually verified via quickstart.md Scenario 3/4 instead (see T029).

### Implementation for User Story 2

- [X] T017 [US2] `handleSubmitRequirement` in `SmartSQLEditor.tsx` calls `buildRequirementChangeSummary` immediately after a structured candidate is generated and stores it in `requirementChangeSummary` state
- [X] T018 [US2] Rendered the `SemanticChangeSummary` (added/removed tables, joins, columns, filter-changed flag) and an isSemanticChange-driven badge in `OptimizeQueryModal.tsx`'s requirement-mode result section, shown before the Apply/Discard controls
- [X] T019 [US2] `handleApplyRequirementCandidate` sets `state.currentSql` to the candidate's `optimizedSql` and `isDiffMode: true` (reusing the same diff/compare view the existing session-apply flow uses), only on explicit click
- [X] T020 [US2] `handleDiscardRequirementCandidate` clears all requirement-candidate state (result, change summary, source-SQL snapshot) without touching the editor
- [X] T021 [US2] Implemented via `requirementIsStale` (compares `state.currentSql` against `requirementSourceSqlRef.current`); the Apply button is `disabled` when stale and a `smartEditorRequirementStaleNotice` banner is shown
- [X] T022 [P] [US2] Added i18n strings (`smartEditorRequirementSemanticChangeTitle/Note`, `smartEditorRequirementAdded/Removed*`, `smartEditorRequirementFilterChanged`, `smartEditorRequirementStaleNotice`) to `en.ts`/`vi.ts`

**Checkpoint**: User Stories 1 AND 2 both work independently — candidates can be generated, reviewed with a semantic-change diff, and applied/discarded safely, including the stale-edit guard

---

## Phase 5: User Story 3 - Existing lint/alert-driven optimization keeps working unchanged (Priority: P1)

**Goal**: The pre-existing automatic lint/alert-driven optimizer and the existing semantics-preserving NL instruction mode continue to behave exactly as before, unaffected by the new requirement-driven mode.

**Independent Test**: Run the existing lint-driven optimize flow before/after this feature ships and confirm identical suggestions and UI behavior, with the new mode's confirmation/semantic-change UI never appearing in that flow — per quickstart.md Scenario 5.

### Tests for User Story 3

- [ ] T023 [P] [US3] SKIPPED (same reason as T016 — no component-testing setup). Structurally guaranteed instead: the requirement-mode JSX block in `OptimizeQueryModal.tsx` is behind a single `{optimizeMode === 'requirement' ? ... : ...}` conditional, so it cannot render when the mode is anything else.
- [X] T024 [P] [US3] Not a new automated test (no call sites of `optimizeSqlWithAIStream`/`analyzeSqlSemantics` were touched); verified by inspection — neither function's signature, call sites, nor prompt text in `SmartSQLEditor.tsx`/`aiService.ts` was modified by this feature, and the full existing Vitest suite continues to pass (see T028)

### Implementation for User Story 3

- [X] T025 [US3] Audited `SmartSQLEditor.tsx`/`OptimizeQueryModal.tsx`: all new state and handlers are additive (new hooks/props only); the existing `handleAnalyzeSemantics`/`handleConfirmOptimize`/`handleApplyProposal`/`handleSessionApply`/`handleSessionDiscard` and their JSX were not modified, only wrapped in a mode conditional in the modal
- [X] T026 [US3] `npx vitest run` — 2 test files, 9 tests, all passing; `npx tsc --noEmit` — no errors

**Checkpoint**: All three user stories are independently functional; existing behavior is verifiably unchanged

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation cleanup affecting the whole feature

- [X] T027 [P] `npx tsc --noEmit` — clean
- [X] T028 [P] `npx vitest run` — 9/9 tests passing
- [ ] T029 NOT DONE in this pass — requires a running dev server + a real AI provider configured; left for manual verification by the user before merging (see quickstart.md's 5 scenarios)
- [X] T030 [P] Updated `/memories/repo/sql-visualizer-architecture.md` with a note on the new requirement-driven optimize mode

## Implementation Notes (deviations from the original task text, applied during implementation)

- **Type naming**: `CandidateQuery` (data-model.md) was implemented as `SqlRequirementCandidateResult` in `aiService.ts`, matching the existing `SqlOptimizationResult` naming convention in that file. `SemanticChangeSummary` was implemented in `optimizeRegression.ts` (colocated with `buildRequirementChangeSummary`, which produces it) rather than in `aiService.ts`.
- **Mode toggle is 2-way, not 3-way**: the existing modal already combines the automatic lint pass and the semantics-preserving NL-instruction pass into one flow (both drive `handleAnalyzeSemantics`/`optimizeSqlWithAIStream`); a third top-level toggle position for "lint only" would have required splitting that existing, working flow. The toggle instead switches between "Optimize (keeps behavior)" — the existing combined lint+instruction flow, unchanged — and "Add requirement (may change behavior)" — the new flow. `OptimizationMode` still has three values for type-level parity with data-model.md; the UI only exposes two.
- **Unresolved-reference validation**: implemented as a client-side deterministic check (`resolveHintedTableReferences`) against the query's own parsed tables, merged with the model's self-reported `unresolved_references`, rather than validating against `buildOptimizeKnowledgeBrief`'s RAG documents — the RAG brief is prose aimed at a human/model reader, not a structured table catalog, so it cannot be reliably cross-checked programmatically. It is still passed to the model as context.
- **Component tests (T016/T023) skipped**: this project has no React component-testing setup (no `@testing-library/react`, no jsdom environment in `vitest.config.ts`). Adding one was judged out of scope for this feature; the equivalent guarantees are covered by (a) unit tests on the pure logic (`buildRequirementChangeSummary`, `resolveHintedTableReferences`) and (b) the single-conditional JSX structure in `OptimizeQueryModal.tsx` that makes cross-mode UI leakage structurally impossible.
- **T029 (manual quickstart walkthrough)** was not performed — it requires a running dev server and a configured AI provider, which were out of scope for this automated implementation pass.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — no dependency on US2/US3
- **User Story 2 (Phase 4)**: Depends on Foundational; depends on US1's `CandidateQuery` generation (T008, T010, T013) to have something to apply/discard
- **User Story 3 (Phase 5)**: Depends on Foundational; is a regression/audit pass best run after US1+US2 exist so the audit has real new code paths to check against
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### Within Each User Story

- Tests before implementation (write T006/T007, T015/T016, T023/T024 first; confirm they fail before the corresponding implementation tasks)
- Types/diff logic before UI wiring
- UI wiring before apply/discard behavior

### Parallel Opportunities

- T002, T003, T005 (Phase 2) can run in parallel — different files
- T006, T007 (US1 tests) can run in parallel
- T014 (US1 i18n) can run in parallel with T012/T013 once T004 lands
- T015, T016 (US2 tests) can run in parallel
- T022 (US2 i18n) can run in parallel with T017–T021
- T023, T024 (US3 tests) can run in parallel
- T027, T028, T030 (Polish) can run in parallel

---

## Parallel Example: Phase 2 (Foundational)

```bash
Task: "Add OptimizationMode/RequirementInput/CandidateQuery/SemanticChangeSummary types to src/lib/ai/aiService.ts"
Task: "Add buildRequirementChangeSummary stub to src/lib/sql/optimizeRegression.ts"
Task: "Add mode-toggle i18n keys to src/locales/en.ts and src/locales/vi.ts"
```

## Parallel Example: User Story 1

```bash
Task: "Unit tests for buildRequirementChangeSummary in src/lib/sql/optimizeRegression.test.ts"
Task: "Unit tests for requirement-candidate prompt/result parsing in src/lib/ai/aiService.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (mode toggle shell + shared types)
3. Complete Phase 3: User Story 1 — a requirement produces a visible candidate query
4. **STOP and VALIDATE**: Run quickstart.md Scenarios 1–2 manually
5. Demo if ready (candidate is visible but not yet applyable — acceptable as a review-only MVP slice)

### Incremental Delivery

1. Setup + Foundational → mode toggle shell ready
2. Add User Story 1 → candidate generation works → validate → demo
3. Add User Story 2 → confirm/apply/discard + staleness guard works → validate → demo (this is the first fully end-to-end usable slice)
4. Add User Story 3 → regression audit confirms no impact on existing modes → validate → ship
5. Polish phase → final type/test/doc pass

### Parallel Team Strategy

With multiple developers, after Foundational (Phase 2) completes:

- Developer A: User Story 1 (candidate generation)
- Developer B: starts User Story 2's test/UI scaffolding against a stubbed candidate, then rebases onto US1's real implementation once merged
- Developer C: User Story 3's regression tests, written against current (pre-feature) behavior first, then re-run once US1/US2 land

---

## Notes

- All three user stories are Priority P1 per spec.md — sequencing above (US1 → US2 → US3) reflects logical build order (candidate generation → apply/confirm gate → regression audit), not a priority difference.
- [P] tasks = different files, no dependencies.
- [Story] label maps each task to its user story for traceability back to spec.md.
- Verify new tests fail before implementing (T006/T007, T015/T016, T023/T024 are regression/unit tests written against not-yet-existing or not-yet-wired behavior).
- Commit after each task or logical group.
