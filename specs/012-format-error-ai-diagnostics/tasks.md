---
description: "Task list for SQL Format Error Diagnostics with AI"
---

# Tasks: SQL Format Error Diagnostics with AI

**Input**: Design documents from `/specs/012-format-error-ai-diagnostics/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/format-error-ai-contract.md, quickstart.md

**Tests**: Included — required by the project constitution (Quality Standards: new AI integrations and components MUST include Vitest unit/integration tests). Write tests first and confirm they fail before implementing.

**Organization**: Tasks grouped by user story (US1/US2/US3) for independent implementation, testing, and MVP delivery.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: US1 / US2 / US3 (spec.md user stories)
- Exact file paths in every description

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared i18n surface for the new panel and its states (no code scaffolding needed — the Next.js project already exists).

- [X] T001 Add i18n keys for the format-error panel and AI action states (title, toggle/close, explain, fix, loading, ready, unavailable, error, stale, invalid, apply, dismiss, retry) to `src/locales/en.ts` and `src/locales/vi.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The structured error model every story depends on (capture → panel → AI grounding).

**⚠️ CRITICAL**: No user story work until this phase is complete.

- [X] T002 Create the `FormatError` model plus `captureFormatError()` and `deriveLocationAndSnippet()` helpers (message, dialect, optional location/snippet, sourceSql, severity, occurredAt) in `src/lib/sql/formatError.ts` per `data-model.md` and `research.md` R1
- [X] T003 [P] Add unit tests for `captureFormatError()` (error with location, error without location → no fabricated snippet, non-empty message) in `tests/unit/format-error.test.ts`

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 - Format errors surface in a toggleable error panel (Priority: P1) 🎯 MVP

**Goal**: Replace the toast-only format failure with a structured, toggleable right-side error panel; format success behavior stays unchanged.

**Independent Test**: Paste broken SQL → Format → the right-side panel opens with the error and toggles; valid SQL → no panel and success toast only (quickstart S1–S3).

### Tests for User Story 1 ⚠️

> Write these first; confirm they FAIL before implementation.

- [X] T004 [P] [US1] Write failing tests for `FormatErrorPanel` (renders summary/message, omits location/snippet when absent, toggle open/close) in `tests/unit/format-error-panel.test.tsx`

### Implementation for User Story 1

- [X] T005 [P] [US1] Create the `FormatErrorPanel` component (toggleable, right-side dock, severity + message + optional location/snippet) in `src/app/smart-sql-editor/components/FormatErrorPanel.tsx`
- [X] T006 [US1] Capture format errors in `handleFormatSQL` via `captureFormatError()`, emit them through a new `onFormatError` prop, and keep the editor SQL unchanged on failure (keep the success toast and empty-query guard) in `src/app/smart-sql-editor/components/SmartSQLEditor.tsx`
- [X] T007 [US1] Hold `formatError` state and compose `FormatErrorPanel` beside the editor (right side, responsive) in `src/app/smart-sql-editor/page.tsx`

---

## Phase 4: User Story 2 - AI explains the error and its root cause (Priority: P2)

**Goal**: From the panel, request a plain-language, grounded explanation + root cause via local Ollama.

**Independent Test**: With an error open and Ollama running → Explain → grounded explanation appears; with Ollama stopped → unavailable/retry state (quickstart S4, S7).

### Tests for User Story 2 ⚠️

> Write these first; confirm they FAIL before implementation.

- [X] T008 [P] [US2] Write failing tests for the explain prompt builder and response parser (strict JSON, non-empty `explanation`/`rootCause`, `evidence` array) in `tests/unit/format-error-ai.test.ts`

### Implementation for User Story 2

- [X] T009 [US2] Implement `explainFormatError` prompt builder and response parser (embeds error message + dialect + SQL; parses `explanation`/`rootCause`/`evidence`) reusing `aiService` for the local Ollama call in `src/lib/ai/formatErrorAi.ts`
- [X] T010 [US2] Add the "Explain" action and its loading/ready/unavailable/error states (render explanation, root cause, evidence) to `src/app/smart-sql-editor/components/FormatErrorPanel.tsx`

---

## Phase 5: User Story 3 - AI proposes a fix the user can review and apply (Priority: P3)

**Goal**: From the panel, request a minimal, semantics-preserving fix shown side-by-side (before/after) and applied only on explicit confirmation; stale proposals are rejected.

**Independent Test**: Error → Fix → side-by-side diff → Apply → corrected SQL re-formats; Dismiss leaves SQL; edit-then-apply → stale (quickstart S5, S6).

### Tests for User Story 3 ⚠️

> Write these first; confirm they FAIL before implementation.

- [X] T011 [P] [US3] Write failing tests for the fix prompt builder, response parser, and stale detection (`correctedSql` required/different, minimal-fix instruction present, `isStale` when SQL changed) in `tests/unit/format-error-ai.test.ts`

### Implementation for User Story 3

- [X] T012 [US3] Implement `proposeFormatFix` prompt builder, response parser (`correctedSql`), and `isStale()` snapshot comparison in `src/lib/ai/formatErrorAi.ts`
- [X] T013 [US3] Add the "Fix" action (side-by-side DiffEditor before/after, Apply/Dismiss, stale and invalid states, re-format on apply) to `src/app/smart-sql-editor/components/FormatErrorPanel.tsx`

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, verification, and end-to-end validation.

- [X] T014 [P] Add accessibility polish (keyboard toggle, `aria-expanded`, visible focus, ARIA live region for loading/error) to `src/app/smart-sql-editor/components/FormatErrorPanel.tsx`
- [X] T015 Run `npm run type-check`, `npm run lint`, and `npm run test` and fix any failures
- [ ] T016 Run the `quickstart.md` scenarios S1–S7 end-to-end and confirm expected outcomes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup; BLOCKS all user stories
- **User Stories (Phase 3–5)**: depend on Foundational; proceed P1 → P2 → P3 (or in parallel if staffed)
- **Polish (Phase 6)**: depends on all desired stories

### User Story Dependencies

- **US1 (P1)**: after Foundational; no story deps (panel + capture)
- **US2 (P2)**: after Foundational; extends the US1 panel with Explain
- **US3 (P3)**: after Foundational; extends the US1 panel with Fix

### Within Each User Story

- Tests written first and FAIL, then implementation
- Model/helpers before UI wiring
- Story complete and independently testable before moving on

### Parallel Opportunities

- T003 (foundational test) parallel with T002
- T004/T005 within US1 (test file + panel component) in parallel
- T008/T009 (test + prompt builder) and T011/T012 in parallel per story
- T014 (a11y) parallel with T015/T016 verification

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (T001) + Phase 2 (T002–T003)
2. Phase 3 (T004–T007)
3. STOP and VALIDATE US1 independently (quickstart S1–S3)
4. Demo the panel

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → test → demo (MVP)
3. US2 → test → demo
4. US3 → test → demo
5. Polish + full quickstart validation

---

## Notes

- [P] tasks = different files, no dependency on incomplete tasks
- [Story] label maps to spec.md user stories for traceability
- Tests included per the constitution's Quality Standards (Vitest unit/integration)
- Commit after each task or logical group
- Avoid same-file conflicts: `formatErrorAi.ts` and `FormatErrorPanel.tsx` are touched across US2/US3 — complete each story before editing the shared files for the next
- The error panel is session-only (no persisted store state)