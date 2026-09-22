# Tasks: SQL Explainer Upgrade

**Input**: Design documents from `/specs/011-upgrade-sql-explainer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/explainer-output-contract.md, quickstart.md

**Tests**: MANDATORY under TDD — required by constitution ("AI integrations MUST include unit and integration tests (Vitest)"). Every behavior below carries its test-list id in brackets (e.g. `[U1]`); `/speckit-tdd-run` ticks a task only when it can read a behavior id from it. Test tasks are written FIRST and must FAIL before implementation.

**Organization**: Tasks grouped by user story; each story is an independently testable increment. FR/SC traceability noted per task.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths in every description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Green baseline + validation sample used by all later acceptance checks.

- [ ] T001 Establish green baseline: run `npm test` and `npm run type-check` in repo root, record pass/fail counts before any change (spec SC baseline; plan Constitution Check reference)
- [ ] T002 [P] Build the 10-query validation sample list (simple, filtered, aggregated, multi-table, CTE-based) from `src/sample/*.sql` in `specs/011-upgrade-sql-explainer/validation-sample.md` for SC-001…SC-005 measurement

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: New five-section contract core in the service layer — blocks ALL user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 Contract + validation unit tests [U1,U2,U3,U4,U5,U6,U7,U8,U9,U10,U11,U12,U13,U14,U15,U18] in `tests/unit/explainerContract.test.ts` (new file; FAIL first): new 5-key shape parse/validate per `contracts/explainer-output-contract.md` rules 1–6, key order, missing-grain/extra-key/empty-bullets/empty-items rejections, filterless single-category, `unknown` purpose marker, CTE name-plus-role allowed vs inner-logic violation, parser-contradiction rejection, 499/500/1000/1001 boundaries, counter exclusions, banned-topic detection (FR-001–FR-006, FR-008, FR-010–FR-011)
- [ ] T004 Replace `SqlExplanation` type + `EXPLAIN_SQL_STRUCTURED_PROMPT` (en/vi) with the five-key contract [U1] (`query_objective`, `result_bullets[]`, `report_grain`, `filter_categories[]`, `data_sources[]`) in `src/lib/ai/aiService.ts` (FR-001, FR-011–FR-012)
- [ ] T005 Implement payload validator [U2,U3,U4,U6,U8,U10,U18] + `countHumanChars` counter [U11,U12,U13,U14,U15] (visible text only, per Assumptions) in `src/lib/ai/aiService.ts` (depends on T004; FR-007 counting rule, FR-010 parser-grounding check)
- [ ] T006 [P] Add five section labels + fallback/retry/length notices [U30] (en/vi) in `src/locales/en.ts` and `src/locales/vi.ts` (FR-011 notice, FR-012 parity)

**Checkpoint**: `npx vitest run tests/unit/explainerContract.test.ts` green — contract core ready, story work can begin.

---

## Phase 3: User Story 1 - Business-readable explanation of any query (Priority: P1) 🎯 MVP

**Goal**: Explain runs return and render all five sections in fixed order, grounded in parser facts, degrading to raw + notice on contract violation.

**Independent Test**: Run Explain on a multi-table, filtered, aggregate query; a reader shown only the explanation states purpose, per-row meaning, filters, and sources. Contract-violating stub renders raw + notice.

### Tests for User Story 1 (write FIRST, FAIL before implementation)

- [ ] T007 [P] [US1] Panel rendering tests [U21,U22,U23,U24,U25] in `tests/unit/AiSqlExplainer.test.tsx` (new file; FAIL first): five sections in contract order, What You Get Back as bullets, Report Grain always present, filter-group headings, `unknown` purpose marking, raw + "structured output unavailable" notice on `structured=false` (FR-001–FR-006, FR-011)

### Implementation for User Story 1

- [ ] T008 [US1] Render five sections in fixed order [U21,U22,U23,U24] (bullets for What You Get Back, grouped Filters & Constraints, name+purpose Data Sources) in `src/app/smart-sql-editor/components/AiSqlExplainer.tsx` (depends on T004; FR-001–FR-006)
- [ ] T009 [US1] Wire structured fallback [U25] (raw + visible notice, run still recorded) through streaming completion in `src/app/smart-sql-editor/components/AiSqlExplainer.tsx` (depends on T008; FR-011, Edge Cases)
- [ ] T010 [US1] Follow the new section order in clipboard `toPlainText` [U28] in `src/app/smart-sql-editor/components/AiSqlExplainer.tsx` and narration `buildSpeechScript` [U29] in `src/lib/ai/aiSpeech.ts` (depends on T008; research Decision 4)
- [ ] T011 [US1] Ground Data Sources against parser facts [U9,U10] (tables/CTEs from `AnalysisResult`), mark unsupported purposes `unknown`, never contradict parser, in `src/lib/ai/aiService.ts` (depends on T005; FR-006, FR-010)
- [ ] T021 [US1] Outer-loop acceptance green [A1,A2,A3,A9]: panel-level tests proving five-section grounded output, fixed-order bullets, raw+notice fallback, and Vietnamese parity (depends on T008–T011; US1 acceptance gate)

**Checkpoint**: quickstart Scenario 1 + 4 pass — five sections render grounded and ordered; fallback path verified.

---

## Phase 4: User Story 2 - Thirty-second key-insight grasp (Priority: P2)

**Goal**: Every explanation fits the 500–1,000 human-character budget via bounded validate-and-retry, preserving streaming UX.

**Independent Test**: Simple and complex queries both produce 500–1,000 chars with no section dropped; exhaustion shows closest-length output + length notice.

### Tests for User Story 2 (write FIRST, FAIL before implementation)

- [ ] T012 [P] [US2] Length-budget tests [U16,U17] in `tests/unit/explainerLengthBudget.test.ts` (new file; FAIL first): retry-until-fit within 1+2 attempts, closest-length + notice on exhaustion (FR-007; boundary counting covered by [U11–U15] in T003)

### Implementation for User Story 2

- [ ] T013 [US2] Implement validate-and-retry loop [U16,U17] (1 attempt + up to 2 retries with length-steering follow-up, closest-length fallback with notice) around structured generation in `src/lib/ai/aiService.ts` (depends on T005, T011; FR-007 per clarification)
- [ ] T014 [US2] Extend partial-section extraction [U26] to the new keys so progressive streaming render works during retries in `src/app/smart-sql-editor/components/AiSqlExplainer.tsx` (depends on T008, T013; research Decision 3, Assumptions streaming preserved)
- [ ] T015 [US2] Wire length-exhaustion notice [U27] (names the 500–1,000 budget) into the panel fallback path in `src/app/smart-sql-editor/components/AiSqlExplainer.tsx` (depends on T009, T013; FR-007, FR-011)
- [ ] T022 [US2] Outer-loop acceptance green [A4,A5,A6]: panel-level tests proving in-budget output, grounded expansion of trivial queries, and summarization of complex queries without dropped sections (depends on T013–T015; US2 acceptance gate)

**Checkpoint**: quickstart Scenario 2 + 5 pass — budget holds, streaming intact, both locales identical.

---

## Phase 5: User Story 3 - Explainer and Analyze each have a clear job (Priority: P3)

**Goal**: Explain output provably excludes all six banned topics (prompt + validation + render), and Analyze behaviour is byte-identical.

**Independent Test**: Same CTE + JOIN + calculation query through Explain and Analyze — Explain has zero banned topics; Analyze diff vs baseline is empty.

### Tests for User Story 3 (write FIRST, FAIL before implementation)

- [ ] T016 [P] [US3] Boundary tests [U18,U19,U20] in `tests/unit/explainerBoundary.test.ts` (new file; FAIL first): six banned topics rejected per section, empty/whitespace SQL rejected without generation, unparsable SQL yields no invented sections (FR-008, Edge Cases; CTE name-vs-explain line covered by [U7,U8] in T003)

### Implementation for User Story 3

- [ ] T017 [US3] Encode the six banned topics plus the CTE name-vs-explain line as prompt rules + validator rejections [U18,U8] in `src/lib/ai/aiService.ts` (depends on T005; FR-008 per clarified FR-006/FR-008)
- [ ] T018 [US3] Add empty/unparsable-SQL guards [U19,U20] (validation message, no generation call, no invented sections) in `src/lib/ai/aiService.ts` (depends on T005; Edge Cases)
- [ ] T019 [US3] Snapshot-verify Analyze surfaces unchanged [A8] after the refactor (record pre-change outputs, diff post-change) — no Analyze code edits (FR-009)
- [ ] T023 [US3] Outer-loop acceptance green [A7,A8]: panel-level tests proving zero banned topics on a CTE/JOIN/calculation query and byte-identical Analyze output (depends on T017–T019; US3 acceptance gate)

**Checkpoint**: quickstart Scenario 3 passes — zero banned topics in Explain, Analyze unchanged.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Full-sample acceptance, quality gates, reviewer confirmation.

- [ ] T020 Run full 10-query validation sample in both locales; score SC-001…SC-005 in `specs/011-upgrade-sql-explainer/validation-results.md` (depends on T021–T023 acceptance gates; quickstart Success Mapping)
- [ ] T024 [P] Run `npm test`, `npm run type-check`, `npm run lint` in repo root; fix all failures (constitution Testing + Type Safety gates)
- [ ] T025 [P] Add inline comments to the new prompt contract, validator, and retry logic covering algorithm, dialect notes, and known limitations in `src/lib/ai/aiService.ts` (constitution Documentation rule)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — starts immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (T003→T004→T005 contract chain; T006 parallel).
- **User Stories (Phases 3–5)**: All depend on Foundational completion; then proceed in priority order P1 → P2 → P3 (T013 needs T011 grounding; T014 needs T008 render + T013 retry).
- **Polish (Phase 6)**: Depends on all three story phases.

### User Story Dependencies

- **US1 (P1)**: After Foundational only — MVP, no story dependencies.
- **US2 (P2)**: After Foundational + US1 render path (streaming fallback T008/T009 reused by T014).
- **US3 (P3)**: After Foundational; T016 extends the T005 validator; T017 is read-only verification.

### Within Each User Story

- Test task FIRST (FAIL), then implementation, then checkpoint validation.
- Service contract (T004/T005) before panel render (T008); render before retry-streaming (T014).

### Parallel Opportunities

- T002 ∥ T001 (different outputs, no shared files); T006 ∥ T004/T005 (locales vs service).
- T007 ∥ T003-family (separate new test files, contract spec as shared input).
- T012 ∥ T013-prep reads; T019 ∥ T020 (verification vs comments, different concerns).
- US phases are sequential by design (P1 render feeds P2 streaming; P2 loop feeds P3 boundary validation) — parallel team execution NOT recommended here despite shared-foundation independence.

---

## Parallel Example: Foundational + US1 Tests

```bash
# One batch — separate files, shared contract input, no writes collide:
Task: "Contract + validation unit tests in tests/unit/explainerContract.test.ts (T003)"
Task: "Panel rendering tests in tests/unit/AiSqlExplainer.test.tsx (T007)"
Task: "Five section labels + notices in src/locales/en.ts and src/locales/vi.ts (T006)"
```

## Parallel Example: Polish

```bash
# Verification and documentation touch different concerns:
Task: "Run npm test, type-check, lint in repo root (T019)"
Task: "Inline comments for prompt contract, validator, retry in src/lib/ai/aiService.ts (T020)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup (T001–T002) → 2. Phase 2 Foundational (T003–T006) → 3. Phase 3 US1 (T007–T011, T021) → **STOP and VALIDATE**: quickstart Scenarios 1 + 4; a grounded five-section Explainer is demoable.

### Incremental Delivery

1. Setup + Foundational → contract core green. 2. + US1 → MVP demo. 3. + US2 → length guarantee demo. 4. + US3 → boundary proof (zero banned topics, Analyze diff empty). 5. Polish → SC-001…SC-005 scored on the 10-query sample.

---

## Notes

- FR/SC traceability is inline per task; contract rules reference `contracts/explainer-output-contract.md` rules 1–8.
- Retry bound is fixed at 1 + 2 (research Decision 5) — do not re-tune inside implementation tasks.
- Analyze code is read-only for this feature (T017 verifies, never edits).
- Commit after each task or logical group; stop at any checkpoint to validate the story independently.

