---
description: 'Task list for SQL Format Error Diagnostics with AI'
---

# Tasks: SQL Format Error Diagnostics with AI

**Input**: Design documents from `/specs/012-format-error-ai-diagnostics/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/format-error-ai-contract.md, quickstart.md

**Tests**: **Mandatory, not optional** — required by the project constitution (Quality Standards: new parser logic and AI integrations MUST include Vitest unit/integration tests) and by the spec's safety requirement that a fix never rewrites SQL outside the error region. Every test must be observed **failing** before its implementation. Behaviors, states and the load-bearing `[U#]`/`[A#]` markers come from `tdd/test-list.md`; `/speckit-tdd-run` drives the loop and ticks them.

**TDD markers**: every open task below carries the behavior id(s) from `tdd/test-list.md` that it must implement or prove, in the form `[U12]`. A task with no marker is not behavioral (verification, docs or measurement work) and is never ticked by the loop.

**Organization**: Tasks grouped by user story (US1/US2/US3). IDs T001–T014 are the delivered first pass and keep their original numbering for traceability; the 2026-09-25 clarifications (FR-017…FR-021) add T017+. The first pass's remaining items (its T015/T016: verification and quickstart S1–S7) are re-expressed as T030/T031 with the updated scope.

**Status snapshot**: 14 first-pass tasks (T001–T014) are complete in the working tree. The region-bounded apply (FR-017/FR-018/FR-020) is **not implemented** and is the critical path: today `FormatErrorPanel` applies the model's whole `correctedSql` through `setSql`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 / US2 / US3 (spec.md user stories)
- Exact file paths in every description
- `[X]` = done, `[ ]` = pending

## Path Conventions

Single Next.js app: `src/app/`, `src/lib/`, `src/locales/` and `tests/unit/` at the repository root.

## Phase 1: Setup (Shared Surface)

**Purpose**: i18n surface for the panel and its states (no scaffolding needed — the project exists).

- [x] T001 Add i18n keys for the format-error panel and AI action states (title, toggle/close, explain, fix, loading, ready, unavailable, error, stale, invalid, apply, dismiss, retry) to `src/locales/en.ts` and `src/locales/vi.ts`
- [x] T017 [P] Add i18n keys for the error-region display, applicability states (out-of-range, region-undetermined), the applied-range audit line and the new-proposal affordance to `src/locales/en.ts` and `src/locales/vi.ts` [U57] [U58] [U59] [U60] [U61]

---

## Phase 2: Foundational (Blocking Prerequisites) — error region + scoped-apply primitives

**Purpose**: The pure, DOM-free modules that decide _what may change_ and _how_ it is written. Everything in US3 depends on them.

**⚠️ CRITICAL**: no US3 work until this phase is complete.

- [x] T002 Create the `FormatError` model plus `captureFormatError()` and `deriveLocationAndSnippet()` helpers in `src/lib/sql/formatError.ts` per `data-model.md` and `research.md` R1
- [x] T003 [P] Add unit tests for `captureFormatError()` (error with location, error without location → no fabricated snippet, non-empty message) in `tests/unit/format-error.test.ts`
- [ ] T018 [P] Write failing tests for `resolveErrorRegion()` — offset → region, line/column → offset, AST-parser fallback, undeterminable → `null`, region text equals `sourceSql.slice(start, end)`, bounds clamped — in `tests/unit/format-error-region.test.ts` (per `data-model.md` `ErrorRegion`, `research.md` R8) [U10] [U11] [U12] [U13] [U14] [U15] [U16] [U17] [U18]
- [x] T019 [P] Write failing tests for `extractChange()` + `applyScopedFix()` — prefix/suffix span, `no-change`, `out-of-range` (both sides and fully outside), `stale`, `undetermined-region`, byte-identical text outside the span, splice result — in `tests/unit/format-fix-scope.test.ts` (per `contracts/format-error-ai-contract.md` §4, `research.md` R9) [U19] [U20] [U21] [U22] [U23] [U24] [U25] [U26] [U27] [U28] [U29] [U30]
- [ ] T020 Implement `resolveErrorRegion()` with the formatter → AST cross-check fallback order and construct-sized expansion in `src/lib/sql/formatErrorRegion.ts` (FR-017, FR-019) [U10] [U11] [U12] [U13] [U14] [U15] [U16] [U17] [U18]
- [x] T021 [P] Implement `extractChange()` + `applyScopedFix()` with the ordered rejections `stale → undetermined-region → no-change → out-of-range` in `src/lib/sql/formatFixScope.ts` (FR-017, FR-018, `research.md` R12) [U19] [U20] [U21] [U22] [U23] [U24] [U25] [U26] [U27] [U28] [U29] [U30]
- [x] T022 [P] Extend `FormatError` with `locationSource: 'formatter' | 'ast-parser'`, record it in `captureFormatError()`, and extend `tests/unit/format-error.test.ts` (`data-model.md`) [U8] [U9]

**Checkpoint**: region resolution and the scoped-apply guard are green; US3 can start.

---

## Phase 3: User Story 1 - Format errors surface in a toggleable error panel (Priority: P1) 🎯 MVP (delivered)

**Goal**: Replace the toast-only format failure with a structured, toggleable right-side error panel; format success behavior stays unchanged. Region awareness is added on top of the delivered panel.

**Independent Test**: Paste broken SQL → Format → the right-side panel opens with the error, names the error region (or reports that none could be determined) and toggles; valid SQL → no panel and success toast only (quickstart S1–S3, S10).

### Tests for User Story 1 ⚠️

> Write these first; confirm they FAIL before implementation.

- [x] T004 [P] [US1] Write failing tests for `FormatErrorPanel` (renders summary/message, omits location/snippet when absent, toggle open/close) in `tests/unit/format-error-panel.test.tsx`
- [x] T023 [US1] Write failing tests for the undetermined-region notice and the disabled Apply state in `tests/unit/format-error-panel.test.tsx` (FR-020) [U59]

### Implementation for User Story 1

- [x] T005 [P] [US1] Create the `FormatErrorPanel` component (toggleable, right-side dock, severity + message + optional location/snippet) in `src/app/smart-sql-editor/components/FormatErrorPanel.tsx`
- [x] T006 [US1] Capture format errors in `handleFormatSQL` via `captureFormatError()`, emit them through a new `onFormatError` prop, and keep the editor SQL unchanged on failure (keep the success toast and empty-query guard) in `src/app/smart-sql-editor/components/SmartSQLEditor.tsx`
- [x] T007 [US1] Hold `formatError` state and compose `FormatErrorPanel` beside the editor (right side, responsive) in `src/app/smart-sql-editor/page.tsx`
- [x] T024 [US1] Resolve the region when an error is captured, hold `errorRegion` beside `formatError`, and render the undetermined-region notice in `src/app/smart-sql-editor/page.tsx` and `src/app/smart-sql-editor/components/FormatErrorPanel.tsx` (FR-019, FR-020) [U59] [U68]

---

## Phase 4: User Story 2 - AI explains the error and its root cause (Priority: P2) (delivered)

**Goal**: From the panel, request a plain-language, grounded explanation + root cause via local Ollama, now also grounded in the resolved region and — when the formatter had no position — the AST parser's findings.

**Independent Test**: With an error open and Ollama running → Explain → grounded explanation appears; with Ollama stopped → unavailable/retry state (quickstart S4, S7, S9, S11).

### Tests for User Story 2 ⚠️

- [x] T008 [P] [US2] Write failing tests for the explain prompt builder and response parser (strict JSON, non-empty `explanation`/`rootCause`, `evidence` array) in `tests/unit/format-error-ai.test.ts`

### Implementation for User Story 2

- [x] T009 [US2] Implement `explainFormatError` prompt builder and response parser (embeds error message + dialect + SQL; parses `explanation`/`rootCause`/`evidence`) reusing `aiService` for the local Ollama call in `src/lib/ai/formatErrorAi.ts`
- [x] T010 [US2] Add the "Explain" action and its loading/ready/unavailable/error states (render explanation, root cause, evidence) to `src/app/smart-sql-editor/components/FormatErrorPanel.tsx`
- [ ] T025 [US2] Ground the explain and fix prompts with the bounded region snippet and, when the position came from the cross-check parser, its error findings; assert the grounding in `tests/unit/format-error-ai.test.ts` and implement in `src/lib/ai/formatErrorAi.ts` (FR-019, `research.md` R10) [U43] [U44]

---

## Phase 5: User Story 3 - AI proposes a fix the user can review and apply (Priority: P3) — region-bounded apply (revised)

**Goal**: Request a minimal correction, review it side-by-side, and apply **only** the erroneous region; out-of-region proposals are rejected, undeterminable regions block the fix, and stale proposals are never applied.

**Independent Test**: Error → Fix → side-by-side diff naming the region → Apply → only the region changed and re-formatting succeeds; a proposal that reformats the rest of the query is rejected with a retry; Dismiss leaves the SQL untouched; edit-then-apply → stale (quickstart S5, S6, S8, S10, S12).

### Tests for User Story 3 ⚠️

- [x] T011 [P] [US3] Write failing tests for the fix prompt builder, response parser, and stale detection (`correctedSql` required/different, minimal-fix instruction present, `isStale` when SQL changed) in `tests/unit/format-error-ai.test.ts`
- [x] T026 [US3] Write failing tests for the applicability states and the region-bounded apply — the proposal renders in a side-by-side diff with the original, out-of-range blocks and offers a retry, undetermined-region disables Apply, the applied range is reported, the live region announces the notice and focus moves to the retry control, text outside the region is byte-identical — in `tests/unit/format-error-panel.test.tsx` (FR-017, FR-018, FR-020) [U57] [U58] [U59] [U60] [U61] [U69]

### Implementation for User Story 3

- [x] T012 [US3] Implement `proposeFormatFix` prompt builder, response parser (`correctedSql`), and `isStale()` snapshot comparison in `src/lib/ai/formatErrorAi.ts`
- [x] T013 [US3] Add the "Fix" action (side-by-side DiffEditor before/after, Apply/Dismiss, stale and invalid states, re-format on apply) to `src/app/smart-sql-editor/components/FormatErrorPanel.tsx` — **apply behaviour superseded by T028**
- [ ] T036 [US3] [P] Write characterization tests for the code this change rewrites: `handleFormatSQL` formats valid SQL without emitting an error, leaves invalid SQL unchanged and emits one, and the current apply path replaces the whole editor value — in `tests/unit/smart-sql-editor-format-error-page.test.tsx`. These are baselines: they must pass against the untouched code before any behavior change. [U62] [U63] [U64]
- [x] T027 [US3] [P] Re-format the **spliced** SQL before committing it to the editor; mark the proposal `invalid` and write nothing when the re-format throws, covered in `tests/unit/smart-sql-editor-format-error-page.test.tsx` and implemented in `src/app/smart-sql-editor/components/SmartSQLEditor.tsx` (`contracts/format-error-ai-contract.md` §4) [U66]
- [X] T028 [US3] Replace the whole-document apply path (`setSql(proposedSql)`) with `applyScopedFix()` plus the `appliedRange` audit line in `src/app/smart-sql-editor/page.tsx`, `src/app/smart-sql-editor/components/SmartSQLEditor.tsx` and `src/app/smart-sql-editor/components/FormatErrorPanel.tsx` (FR-017, FR-010; supersedes the apply behaviour of T013) [U65] [U30] [U60] [A9]
- [X] T029 [US3] [P] Render the applicability states — out-of-range, region-undetermined, and the new-proposal affordance — in `src/app/smart-sql-editor/components/FormatErrorPanel.tsx` (FR-018, FR-020) [U57] [U58] [U59] [U61] [A11]

---

## Phase 5b: Acceptance gate (outer loop) — one task per acceptance criterion

**Purpose**: the acceptance test for a criterion must be green before its story is considered complete. Each is driven through the real entry point — the Smart SQL Editor page composed with the editor and the panel (`tests/unit/smart-sql-editor-format-error-page.test.tsx`), the highest level this repository can run without a browser E2E runner.

- [ ] T037 [US1] Acceptance test: formatting valid SQL leaves it formatted and opens no panel [A1] — `tests/unit/smart-sql-editor-format-error-page.test.tsx::valid SQL formats with no panel` (US1-AS1)
- [ ] T038 [US1] Acceptance test: formatting invalid SQL opens the right-side panel and leaves the editor SQL unchanged [A2] — `tests/unit/smart-sql-editor-format-error-page.test.tsx::format error opens the panel beside the editor` (US1-AS2)
- [X] T039 [US2] Acceptance test: the rendered explanation quotes the actual offending SQL and error [A6] — `tests/unit/smart-sql-editor-format-error-page.test.tsx::explanation is grounded in the captured error` (US2-AS2)
- [X] T040 [US3] Acceptance test: applying a fix replaces only the SQL inside the captured error location and the result re-formats [A9] — `tests/unit/smart-sql-editor-format-error-page.test.tsx::apply changes only the error region` (US3-AS2)
- [X] T041 [US3] Acceptance test: a proposal that also changes SQL outside the error location is rejected and a corrected one is offered [A11] — `tests/unit/smart-sql-editor-format-error-page.test.tsx::out-of-range proposal is rejected` (US3-AS4)
- [x] T042 [US1] Confirm the already-green acceptance test for "close and reopen keeps the error" stays green through the region change [A3] — `tests/unit/format-error-panel.test.tsx::closes and reopens from the toggle control, keeping the error available` (US1-AS3)
- [x] T043 [US1] Confirm the already-green acceptance test for "a position renders location and snippet" stays green [A4] — `tests/unit/format-error-panel.test.tsx::shows the location and snippet when the formatter reported a position` (US1-AS4)
- [x] T044 [US2] Confirm the already-green acceptance test for "explanation and root cause render" stays green [A5] — `tests/unit/format-error-panel.test.tsx::renders the explanation, root cause and evidence once ready` (US2-AS1)
- [x] T045 [US2] Confirm the already-green acceptance test for "unavailable local model shows an actionable state" stays green [A7] — `tests/unit/format-error-panel.test.tsx::surfaces an actionable unavailable state when the local model is down` (US2-AS3)
- [X] T046 [US3] Add the acceptance test for "the fix is presented side-by-side before applying" [A8] — `tests/unit/format-error-panel.test.tsx::shows the proposal in a side-by-side diff with the original` (US3-AS1)
- [x] T047 [US3] Confirm the already-green acceptance test for "dismiss leaves the SQL untouched" stays green [A10] — `tests/unit/format-error-panel.test.tsx::leaves the SQL untouched when the proposal is dismissed` (US3-AS3)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, verification, measurement and documentation follow-ups.

- [x] T014 [P] Add accessibility polish (keyboard toggle, `aria-expanded`, visible focus, ARIA live region for loading/error) to `src/app/smart-sql-editor/components/FormatErrorPanel.tsx`
- [x] T030 [P] Extend accessibility to the new states: announce applicability notices in the live region and move focus to the new-proposal affordance in `src/app/smart-sql-editor/components/FormatErrorPanel.tsx` [U61]
- [x] T031 Run `npm run type-check`, `npm run lint` and `npm run test` and fix any failures — type-check clean; the feature's own files are lint-clean after a prettier fix; the repo-wide prettier debt (~74 files) is pre-existing and left out of scope (see cycle-log)
- [ ] T032 Run the `quickstart.md` scenarios S1–S12 end-to-end and record the outcomes (replaces the first pass's open quickstart task, which covered S1–S7 only)
- [ ] T033 [P] Build a per-dialect broken-SQL fixture corpus and a repeatable measurement command for SC-005 (≥70% first-proposal fix success) in `tests/fixtures/format-error/` and `scripts/measure-format-fix-success.mjs`
- [x] T034 Rewrite SC-003, SC-005 and SC-006 in `specs/012-format-error-ai-diagnostics/spec.md` so each success criterion is measurable (or explicitly reclassify it as a post-launch metric) and re-validate `specs/012-format-error-ai-diagnostics/checklists/requirements.md` — done 2026-09-25: SC-003/SC-005 made measurable, SC-006's 4/5 rating reclassified as a post-launch metric, checklist back to 16/16

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup; BLOCKS US1's region task and all of US3
- **User Stories (Phase 3–5)**: depend on Foundational; US1/US2 are delivered and only need the region extension, US3 is the critical path
- **Polish (Phase 6)**: depends on all desired stories

### User Story Dependencies

- **US1 (P1)**: after T020 (region resolution) and T017 (keys)
- **US2 (P2)**: after T020 (region + parser findings) and T017
- **US3 (P3)**: after T020 + T021 + T022 (all Foundational tasks)

### Within Each User Story

- Tests written first and FAIL, then implementation
- Pure modules before component wiring
- Story complete and independently testable before moving on

### Parallel Opportunities

- T003 (done), T018, T019 and T022 can be written in parallel (separate test files)
- T020 and T021 in parallel (`formatErrorRegion.ts` vs `formatFixScope.ts`)
- T017, T025, T027, T029, T030, T033, T035 are independent of each other once their inputs exist
- T027 (editor re-format) and T029 (panel states) in parallel — different files
- T031/T032 verification after T028 and T029

---

## Implementation Strategy

### MVP of this revision (safety increment)

1. Phase 2 (T018–T022) — region resolution + scoped-apply guard, all green
2. Phase 5 (T026–T029) — region-bounded apply with the applicability states
3. STOP and validate independently: broken SQL → Fix → Apply touches only the region (quickstart S5, S8)

The already-delivered US1/US2 behaviour stays untouched throughout, so the increment can ship on its own.

### Incremental Delivery

1. Setup keys (T017) → Foundational (T018–T022) → region shown in US1 (T023, T024)
2. US2 parser-grounded prompts (T025)
3. US3 region-bounded apply (T026–T029)
4. Polish, full quickstart validation, and the measurement/documentation follow-ups (T030–T035)

---

## Notes

- [P] tasks = different files, no dependency on incomplete tasks
- [Story] label maps to spec.md user stories for traceability
- Tests included per the constitution's Quality Standards (Vitest unit/integration) and because the region's safety guard must be proven by tests, not by inspection
- Commit after each task or logical group
- Avoid same-file conflicts: `formatErrorAi.ts` and `FormatErrorPanel.tsx` are touched across stories — complete each story before editing the shared files for the next
- The error panel, its region and the proposal are session-only (no persisted store state)

- [ ] T035 [P] Raise the Constitution §III streaming amendment issue and link it from the Assumptions section of `specs/012-format-error-ai-diagnostics/spec.md` and the Complexity Tracking table of `specs/012-format-error-ai-diagnostics/plan.md`
