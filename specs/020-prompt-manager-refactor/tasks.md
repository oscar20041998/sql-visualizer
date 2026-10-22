---

description: "Task list template for feature implementation"
---

# Tasks: AI Prompt Management Refactor (Centralized Prompt Templates)

**Input**: Design documents from `/specs/020-prompt-manager-refactor/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md — all present

**Tests**: INCLUDED — explicitly requested by spec FR-011/FR-012/FR-013 and constitution Quality Standards (Vitest; characterization tests written BEFORE each migration; no network in unit tests).

**Organization**: Tasks are grouped by user story (US1 = parity/pilot P1, US2 = full centralization P2, US3 = language P3) so each story can be implemented, tested, and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Setup, Foundational, and Polish phases carry NO story label

## Path Conventions

Single-project web app (per plan.md Structure Decision): `src/` and `tests/` at the repository root; feature artifacts in `specs/020-prompt-manager-refactor/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Baseline recording and prompt-core scaffold — no behavior change, no prompt migration

- [X] T001 Record baseline results of `npm test`, `npm run type-check`, `npm run lint`, `npm run build` verbatim (research.md Decision 9) in `specs/020-prompt-manager-refactor/baseline-results.md`, listing each pre-existing failure as baseline debt that is never fixed in this feature (FR-016, SC-004)
- [X] T002 [P] Create the prompt core scaffold: `src/lib/ai/prompts/` with `PromptId`, `PromptEntry`, `ParamSchema` types and the empty registry map in `src/lib/ai/prompts/registry.ts`, the `renderPrompt(id, params)` signature stub in `src/lib/ai/prompts/render.ts`, and the `src/lib/ai/prompts/templates/` directory, exactly per `specs/020-prompt-manager-refactor/contracts/prompt-manager.md` and the plan.md Source Code tree

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Renderer with validated parameter filling plus the complete prompt inventory — EVERY user story needs both

**⚠️ CRITICAL**: No user story work (no prompt extraction, no migration) can begin until this phase is complete — FR-001 inventory must exist before any implementation file is modified

- [X] T003 [P] Write renderer behavior tests FIRST (expect RED against the T002 stub) in `tests/unit/promptRender.test.ts`: unknown prompt id, missing required parameter, optional default applied, empty-string value preserved, multiline SQL/XML with quotes/braces/backticks byte-identical, `{{` inside values never re-scanned, roles/order taken from the entry, no network/filesystem access — PLUS registry audit tests in `tests/unit/promptRegistry.test.ts` (every template placeholder belongs to its schema; every registered id resolves to exactly one entry). Behaviors: [U1][U2][U3][U4][U5][U6][U7][U8][U9][U10][U12][A6][A7][A8][A9][A10]
- [X] T004 Implement `renderPrompt` (lookup → validate required/defaults → single-pass fill → messages; actionable errors before any provider call; never log SQL/prompt payloads) in `src/lib/ai/prompts/render.ts` until `tests/unit/promptRender.test.ts` is GREEN (depends: T002, T003) [U1][U2][U3][U4][U5][U6][U7][U8][U9]
- [X] T005 [P] Perform the FR-001 audit and write `specs/020-prompt-manager-refactor/prompt-inventory.md`: one row per hard-coded prompt with ALL FR-001 fields (feature, location, message role, text reference, parameters, defaults, provider/model configuration, expected output format, output consumers, relevant tests) with migration status `discovered`, flagging locale-variant prompts and any language discrepancy for US3 (Stage 1 — no code changes)

**Checkpoint**: Foundation ready — renderer validated, full inventory recorded; pilot migration (US1) can begin

---
---

## Phase 3: User Story 1 - AI Features Behave Identically After Prompt Centralization (Priority: P1) 🎯 MVP

**Goal**: The pilot feature (format-error diagnostics) is migrated to the centralized prompt core with byte-identical outputs — proving the parity guarantee end-to-end

**Independent Test**: `npx vitest run tests/unit/promptParity.formatError.test.ts` passes BEFORE migration (characterization), stays GREEN AFTER migration (T008), and quickstart.md Scenario 2 (pilot) is green — messages, request settings, parsed result, and error behavior identical to baseline

### Tests for User Story 1 (write FIRST — must pass against the current implementation)

> **NOTE**: These are characterization tests captured from the pre-change implementation (FR-011). They must PASS before migration and must not be edited afterwards

- [X] T006 [P] [US1] Create characterization parity tests for the format-error feature in `tests/unit/promptParity.formatError.test.ts`: message snapshot (roles, ordering, exact bytes), request snapshot via `fetch` mock, response fixture → identical parsed result and UI-consumed fields, plus error/fallback path — all green against the CURRENT `src/lib/ai/formatErrorAi.ts` (FR-011, contracts/output-parity.md) [U13][A1][A2][A4]

### Implementation for User Story 1

- [X] T007 [US1] Extract the format-error prompt text verbatim (no wording, ordering, delimiter, or language changes) into `src/lib/ai/prompts/templates/formatError.ts` and register its `PromptEntry` + `ParamSchema` in `src/lib/ai/prompts/registry.ts`, parameterizing only genuinely dynamic values (FR-002, FR-003, FR-004; depends: T005) [U13]
- [X] T008 [US1] Migrate `src/lib/ai/formatErrorAi.ts` to obtain its prompt via `renderPrompt(...)` and remove the local hard-coded text, keeping `tests/unit/promptParity.formatError.test.ts` GREEN unchanged (depends: T006, T007) [U13]
- [X] T009 [US1] Record Stage-4 pilot evidence (old vs new rendered messages and provider requests, zero unexplained diffs) and set the format-error row to `migrated` then `verified` in `specs/020-prompt-manager-refactor/prompt-inventory.md` (depends: T008) [A1][A2][A4]

- [X] T035 [US1] Outer-loop gate: run acceptance behaviors [A1][A2][A4] end-to-end for the pilot (`tests/unit/promptParity.formatError.test.ts` message/request/result/error parity + renderer error-path suite, per quickstart Scenario 2) and require ALL GREEN before US1 is considered complete; record results in `specs/020-prompt-manager-refactor/validation-results.md`

**Checkpoint**: US1 independently testable — pilot feature byte-parity proven (MVP deliverable per Implementation Strategy)

---

## Phase 4: User Story 2 - Maintainer Edits Prompts in One Centralized, Validated Place (Priority: P2)

**Goal**: EVERY in-scope hard-coded prompt is extracted into `src/lib/ai/prompts/templates/` and registered, with validation catching bad parameters before any provider call, single-location edits working, and zero undocumented hard-coded prompts left

**Independent Test**: All `tests/unit/promptParity.*.test.ts` suites green for every migrated feature; `tests/unit/promptRegistry.test.ts` proves registry ↔ inventory completeness and placeholder audit; the SC-005 edit drill passes; repo-wide search finds extracted prompt texts only under `src/lib/ai/prompts/templates/`

### Tests for User Story 2 (write FIRST — each must pass against the current implementation before its migration)

- [X] T010 [P] [US2] Characterization parity tests (message/request snapshots, response fixture, error path) for `src/lib/ai/sqlComparisonAi.ts` in `tests/unit/promptParity.sqlComparison.test.ts` [U14]
- [X] T011 [P] [US2] Characterization parity tests for `src/lib/ai/databaseAssistant.ts` including system-message assembly with trimmed history AND streaming partial-response behavior in `tests/unit/promptParity.databaseAssistant.test.ts`. Behaviors: [U15][A3]
- [X] T012 [P] [US2] Characterization parity tests for the SQL Explainer / CTE / structured-explain prompts of `src/lib/ai/aiService.ts` in `tests/unit/promptParity.sqlExplainer.test.ts` [U16]
- [X] T013 [P] [US2] Characterization parity tests for the semantic-brief and optimize prompts of `src/lib/ai/aiService.ts` (incl. optional user-instruction parameter) in `tests/unit/promptParity.optimize.test.ts` [U17]
- [X] T014 [P] [US2] Characterization parity tests for the `DOCS_CONSULTANT_*` prompts of `src/lib/ai/aiService.ts`, covering both context and no-context composition, in `tests/unit/promptParity.docsConsultant.test.ts` [U18]
- [X] T015 [P] [US2] Characterization parity tests for every remaining inventory row (dashboard `src/lib/sql/dashboard/aiPrompts.ts` builders, SQL code generator, MyBatis/SQL conversion assistance) in `tests/unit/promptParity.<feature>.test.ts` files, one per feature (names per `specs/020-prompt-manager-refactor/prompt-inventory.md`) [U20]

- [X] T023 [US2] Add registry completeness and placeholder audit tests in `tests/unit/promptRegistry.test.ts`: every `{{placeholder}}` in every template belongs to that prompt's schema; every inventory row has ≥1 registry entry or a `deferred-risk` row carrying a specific output-contract risk (SC-002, SC-003) — written HERE, BEFORE any migration: RED until T007 and T016–T022 register every row, GREEN when the registry is complete. Behaviors: [U11]

- [X] T024 [US2] Extend `tests/unit/promptRender.test.ts` with error-path coverage for EVERY registered prompt id (enumerated dynamically from the registry): unknown id, missing required parameter, and template/schema mismatch all raise actionable errors with zero provider calls (SC-006) — written HERE, BEFORE any migration. Behaviors: [U1][U2][A6][A8]
### Implementation for User Story 2

- [X] T016 [P] [US2] Migrate `src/lib/ai/sqlComparisonAi.ts`: extract verbatim templates into `src/lib/ai/prompts/templates/sqlComparison.ts`, register entries, wire the service to `renderPrompt`, keep T010 GREEN (depends: T010) [U14]
- [X] T017 [P] [US2] Migrate `src/lib/ai/databaseAssistant.ts`: extract verbatim templates into `src/lib/ai/prompts/templates/databaseAssistant.ts`, register, wire system-message assembly to `renderPrompt`, keep T011 GREEN (depends: T011) [U15]
- [X] T018 [US2] Migrate the SQL Explainer / CTE / structured-explain prompt constants out of `src/lib/ai/aiService.ts` into `src/lib/ai/prompts/templates/sqlExplainer.ts`, wire `aiService.ts` to `renderPrompt`, keep T012 GREEN (depends: T012) [U16]
- [X] T019 [US2] Migrate the semantic-brief and optimize prompt constants of `src/lib/ai/aiService.ts` into `src/lib/ai/prompts/templates/optimize.ts` — runs AFTER T018 because both tasks edit `src/lib/ai/aiService.ts` — keep T013 GREEN (depends: T013, T018) [U17]
- [X] T020 [US2] Migrate the `DOCS_CONSULTANT_*` prompts of `src/lib/ai/aiService.ts` into `src/lib/ai/prompts/templates/docsConsultant.ts`, preserving context/no-context composition exactly, keep T014 GREEN (depends: T014, T019) [U18]
- [X] T021 [P] [US2] Migrate the dashboard builders in `src/lib/sql/dashboard/aiPrompts.ts` — extract literal texts into `src/lib/ai/prompts/templates/` per feature, parameterizing ONLY the dynamic segments (contributor lines, scores, locations), keep T015 GREEN (depends: T015) [U20]
- [X] T022 [US2] Migrate every remaining row of `specs/020-prompt-manager-refactor/prompt-inventory.md` (SQL code generator, MyBatis/SQL conversion, any others found in T005) — for each row: parity test first, then extract to `src/lib/ai/prompts/templates/`, register, wire the owning file under `src/`, keep its parity suite GREEN (depends: T015; row order free) (behavior ids U22+ assigned on test-list refresh once T005 names the owning files)
- [X] T025 [US2] Perform the single-location edit drill (SC-005): temporarily change one template's wording in `src/lib/ai/prompts/templates/`, confirm its parity test catches the diff and NO other file needed editing, revert, and record the evidence in `specs/020-prompt-manager-refactor/validation-results.md` (depends: T016–T022) [A5]
- [X] T026 [US2] Cleanup (Stage 6): remove now-unused hard-coded prompt constants from `src/lib/ai/aiService.ts`, `src/lib/ai/databaseAssistant.ts`, `src/lib/ai/formatErrorAi.ts`, `src/lib/ai/sqlComparisonAi.ts`, and `src/lib/sql/dashboard/aiPrompts.ts` ONLY after every reference is migrated and verified; repo-wide search proves prompt texts live only under `src/lib/ai/prompts/templates/`; update all inventory statuses to `verified` or `deferred-risk` with specific risk text (Q1; depends: T023, T024) [A15]

- [X] T036 [US2] Outer-loop gate: run acceptance behaviors [A3][A5][A6][A7][A8][A9][A10][A15] (all `tests/unit/promptParity.*.test.ts` suites, `tests/unit/promptRender.test.ts`, `tests/unit/promptRegistry.test.ts`, edit drill, cleanup search — quickstart Scenarios 2–5 and 7) and require ALL GREEN before US2 is considered complete; record results in `specs/020-prompt-manager-refactor/validation-results.md`

**Checkpoint**: All prompts centralized and validated — every parity suite green, registry ↔ inventory complete, zero undocumented hard-coded prompts
---

## Phase 5: User Story 3 - Language Behavior Preserved and Synchronized (Priority: P3)

**Goal**: Locale behavior is provably unchanged for every locale-variant prompt, and every language discrepancy is documented — with ZERO language behavior changes shipped (Clarification Q2)

**Independent Test**: `npx vitest run tests/unit/promptParity.locales.test.ts` green for `en` and `vi`; every discrepancy appears in the inventory with a proposal; existing conversation-history tests still green

### Tests for User Story 3

- [X] T027 [P] [US3] Add locale parity tests covering every locale-variant prompt in BOTH `en` and `vi` in `tests/unit/promptParity.locales.test.ts`: messages identical to the per-locale baseline, and no feature starts or stops following the application language (FR-009, SC-007) [A11][A12]

### Implementation for User Story 3

- [X] T028 [US3] Audit each in-scope feature's language behavior against the existing i18n mechanism (`src/i18n.ts`, `src/locales/en.ts`, `src/locales/vi.ts`) and document every discrepancy (feature, prompt, affected behavior, smallest backward-compatible proposal, proposed tests) in `specs/020-prompt-manager-refactor/prompt-inventory.md` — make ZERO language behavior changes (FR-010, Q2) [A13]
- [X] T029 [US3] Verify conversation-history storage format and content are unchanged by running the existing history suites (`tests/unit/dbAssistantChatHistoryHelpers.test.ts` and related tests) and record results in `specs/020-prompt-manager-refactor/validation-results.md` [U21][A14]

- [X] T037 [US3] Outer-loop gate: run acceptance behaviors [A11][A12][A13][A14] (`tests/unit/promptParity.locales.test.ts` en+vi, inventory discrepancy review, history suites — quickstart Scenario 5) and require ALL GREEN before US3 is considered complete; record results in `specs/020-prompt-manager-refactor/validation-results.md`

**Checkpoint**: Language guarantees proven — parity in both locales, discrepancies documented, history format untouched

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Whole-feature verification and reporting across all stories

- [X] T030 [P] Run the full gates `npm test`, `npm run type-check`, `npm run lint`, `npm run build` and append actual results with a comparison against `specs/020-prompt-manager-refactor/baseline-results.md` proving zero NEW failures (SC-004, FR-016) [A17]
- [X] T031 Execute quickstart.md Scenarios 1–7 end-to-end and record every outcome in `specs/020-prompt-manager-refactor/validation-results.md` (inventory complete, parity green, renderer safety, edit drill, locale parity, full gate, cleanup completeness) [A15][A17]
- [X] T032 [P] Review the final `git diff` against the out-of-scope list — no prompt-wording improvements, no JSON/schema/field renames, no markdown-section changes, no provider/model/setting changes, no UI changes, no unrelated refactoring — and record findings in `specs/020-prompt-manager-refactor/validation-results.md` (SC-008) [A16]
- [X] T033 [P] Add inline comments documenting registry/renderer semantics, parameter rules, locale handling, and known limitations in `src/lib/ai/prompts/registry.ts` and `src/lib/ai/prompts/render.ts` (constitution Quality Standards → Documentation)
- [X] T034 Produce the completion report — files changed, prompts migrated with final statuses, tests executed with actual results, any remaining hard-coded prompts with their documented risks, unresolved compatibility risks — in `specs/020-prompt-manager-refactor/completion-report.md` (FR-017) [A15]

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — starts immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (renderer + inventory are universal prerequisites; FR-001 inventory must exist before any implementation file changes)
- **User Story 1 (Phase 3)**: Depends on Foundational only — no dependencies on US2/US3 → MVP
- **User Story 2 (Phase 4)**: Depends on Foundational; benefits from US1 (pilot proves the pattern) but is independently testable
- **User Story 3 (Phase 5)**: Depends on Foundational; locale tests are strongest after US2 migrations, but T027–T029 only read behavior and can start earlier if needed
- **Polish (Phase 6)**: Depends on all stories being complete

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational — proves output parity for the pilot feature (MVP)
- **US2 (P2)**: Starts after Foundational — migrates everything else; US1 pilot is a recommended precedent, not a hard blocker
- **US3 (P3)**: Starts after Foundational — verifies locale behavior and documents discrepancies; no behavior changes

### Within Each User Story

- Characterization tests MUST be written and GREEN against the current implementation BEFORE each migration (FR-011 — baseline precedes refactoring)
- Extract/register templates before wiring the consuming service
- Migration keeps the story's parity suite GREEN unmodified; any diff stops the migration (FR-018)
- Inventory status updates come last per feature (`migrated → verified`)
- Tasks touching the SAME file are sequential: T018 → T019 → T020 (all edit `src/lib/ai/aiService.ts`)

### Parallel Opportunities

- Setup: T002 ∥ (after T001 or concurrently — different files)
- Foundational: T003 ∥ T005 (test file vs inventory doc)
- US1: T006 runs alone first (characterization), then T007 → T008 sequential (same feature)
- US2 tests: T010 ∥ T011 ∥ T012 ∥ T013 ∥ T014 ∥ T015 ∥ T023 ∥ T024 (different test files; T023/T024 written BEFORE migrations and stay red until registrations complete)
- US2 migrations: T016 ∥ T017 ∥ T021 (different source files); T018/T019/T020 sequential on `aiService.ts`
- Polish: T030 ∥ T032 ∥ T033

---

## Parallel Example: User Story 2

```bash
# Wave 1 — all characterization suites in parallel (different test files):
Task: "T010 characterization parity tests for sqlComparisonAi in tests/unit/promptParity.sqlComparison.test.ts"
Task: "T011 characterization parity tests for databaseAssistant in tests/unit/promptParity.databaseAssistant.test.ts"
Task: "T012 characterization parity tests for sqlExplainer prompts in tests/unit/promptParity.sqlExplainer.test.ts"
Task: "T013 characterization parity tests for optimize prompts in tests/unit/promptParity.optimize.test.ts"
Task: "T014 characterization parity tests for docsConsultant prompts in tests/unit/promptParity.docsConsultant.test.ts"
Task: "T015 characterization parity tests for remaining inventory rows in tests/unit/promptParity.<feature>.test.ts"

# Wave 2 — independent-file migrations in parallel (aiService.ts tasks stay sequential):
Task: "T016 migrate sqlComparisonAi.ts"
Task: "T017 migrate databaseAssistant.ts"
Task: "T021 migrate dashboard aiPrompts.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (baseline recorded, scaffold created)
2. Complete Phase 2: Foundational (renderer GREEN + complete inventory) — CRITICAL gate
3. Complete Phase 3: US1 — pilot feature migrated with byte-parity proven
4. **STOP and VALIDATE**: `npx vitest run tests/unit/promptRender.test.ts tests/unit/promptParity.formatError.test.ts` + quickstart Scenario 2
5. Demo: one feature centrally editable, outputs provably unchanged

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → parity proven for pilot → **MVP checkpoint**
3. US2 → feature-by-feature migrations (each keeps its own parity suite green) → full centralization
4. US3 → locale verification + discrepancy documentation
5. Polish → full gates, quickstart scenarios, diff review, completion report

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done: Developer A = US1 (pilot); Developer B = US2 wave-1 test writing (T010–T015); Developer C = US3 locale test scaffolding (T027)
3. After US1 pilot proves the pattern, US2 migrations fan out across independent files
4. Everyone converges on Polish

---

## Notes

- [P] = different files, no dependencies; [Story] label ties each task to its user story for traceability
- Tests are INCLUDED because the spec explicitly requires them (FR-011/FR-012/FR-013) and the constitution mandates tests for AI integrations
- Baselines and characterization tests are NEVER edited to make failing tests pass (FR-018 — stop and escalate instead)
- Commit after each task or logical group; stop at any checkpoint to validate the story independently
- Avoid: vague tasks, same-file conflicts (see sequential chain T018→T019→T020), cross-story dependencies that break independence
