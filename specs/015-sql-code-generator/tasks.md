# Tasks: SQL → Code Generator

**Input**: Design documents from `specs/015-sql-code-generator/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/code-generator-ui.md`, `quickstart.md`

**Tests**: Required by the feature brief. Write each behavior's Vitest tests before its implementation and confirm the tests fail for the expected reason.

**Organization**: Tasks are grouped by the six user stories in `spec.md`; every story has a standalone verification criterion.

## Phase 1: Setup

**Purpose**: Establish the feature module entry point without adding dependencies.

- [X] T001 Create the code-generation module barrel and export surface in `src/lib/codegen/index.ts`

---

## Phase 2: Foundational

**Purpose**: Define stable, framework-neutral contracts required by all user stories.

- [X] T002 Define SQL semantic model, classification, generation options, diagnostics, generated output, parser adapter, and renderer interfaces in `src/lib/codegen/model.ts`

**Checkpoint**: Shared types compile; no parser or UI behavior is implemented in this phase.

---

## Phase 3: User Story 1 - SQL to Entity Generation (Priority: P1) MVP

**Goal**: Parse supported CREATE TABLE definitions and render Java/JPA Entities with schema-backed identifiers, types, nullability, and names.

**Independent Test**: Feed MySQL, PostgreSQL, and SQL Server CREATE TABLE fixtures through the feature parser and verify a Java/JPA Entity has the correct table/column names, primary key, Java types, nullability, and length/precision metadata. Invalid and unsupported-dialect input must return diagnostics without guessed source.

### Tests for User Story 1

- [X] T003 [US1] Add failing route-composed acceptance tests A1-A4 for Java/JPA naming and Entity generation, nullability, relationship warnings, and invalid/ambiguous SQL in `tests/unit/query-input-code-generator.test.tsx`
- [X] T004 [P] [US1] Add parser unit tests U1-U3 for supported DDL normalization, Oracle rejection, and actionable invalid-SQL diagnostics in `tests/unit/codegen/parseSql.test.ts`
- [X] T005 [P] [US1] Add Entity-rendering tests U13-U14 for JPA annotations, primary keys, schema metadata, and nullability in `tests/unit/codegen/javaJpaRenderer.test.ts`
- [X] T006 [P] [US1] Add SQL type and naming tests U9-U12 for Java mappings, unknown types, aggregate types, and identifier conversions in `tests/unit/codegen/typeMapping.test.ts` and `tests/unit/codegen/naming.test.ts`

### Implementation for User Story 1

- [X] T007 [US1] Implement dialect adapter parsing and DDL-to-semantic-model normalization with explicit unsupported-dialect diagnostics in `src/lib/codegen/parseSql.ts`
- [X] T008 [US1] Implement centralized SQL type normalization and Java type mapping with explicit unknown-type diagnostics in `src/lib/codegen/typeMapping.ts`
- [X] T009 [US1] Implement shared identifier conversion while preserving SQL names and explicit aliases in `src/lib/codegen/naming.ts`
- [X] T010 [US1] Implement Java/JPA Entity rendering for supported single-column primary keys and schema-backed column metadata in `src/lib/codegen/javaJpaRenderer.ts`
- [X] T011 [US1] Run the focused Entity, DDL parsing, type-mapping, and naming tests and fix failures in `tests/unit/codegen/`

**Checkpoint**: US1 works independently for verified parser dialects; Oracle and unsupported AST forms show warnings and do not generate guessed source.

---

## Phase 4: User Story 3 - Multi-Language Code Generation (Priority: P1)

**Goal**: Make Java/JPA the only enabled MVP target while exposing a clear, extensible registry and communicating planned targets.

**Independent Test**: Verify Java/JPA is selectable, C#/EF Core, Python/SQLAlchemy, TypeScript/TypeORM, Go/GORM, and Kotlin/JPA are visibly marked unavailable/planned, and no unsupported target can invoke a renderer.

### Tests for User Story 3

- [X] T012 [US3] Add failing acceptance tests A10-A11 for planned targets and supported-query generation in `tests/unit/query-input-code-generator.test.tsx`, plus A12 for renderer extensibility in `tests/unit/codegen/rendererRegistry.test.ts`
- [X] T013 [P] [US3] Add registry and target-control tests U17-U18 for Java/JPA availability, planned target messaging, and configurable renderer resolution in `tests/unit/codegen/rendererRegistry.test.ts` and `tests/unit/codegen/GeneratorTargetControls.test.tsx`

### Implementation for User Story 3

- [X] T014 [US3] Implement a registry that resolves Java/JPA and rejects planned language/framework pairs without changing parser logic in `src/lib/codegen/rendererRegistry.ts`
- [X] T015 [US3] Add English and Vietnamese labels and planned/unavailable messages for every target in `src/locales/en.ts` and `src/locales/vi.ts`
- [X] T016 [US3] Implement accessible Java/JPA and unavailable-target controls using the registry in `src/app/query-input/components/GeneratorTargetControls.tsx`
- [X] T017 [US3] Run the focused registry and target-control tests and fix failures in `tests/unit/codegen/`

**Checkpoint**: Target selection is independently testable; only Java/JPA can generate source.

---

## Phase 5: User Story 5 - Code Preview and Export (Priority: P1)

**Goal**: Add the SQL → Code Generator input mode with isolated SQL input, Monaco preview, generate/replace, reset, copy, and download workflows.

**Independent Test**: Use the new tab to generate Java source, edit the generator's SQL without changing SQL in other modes, regenerate to replace the preview, reset the generator state, and copy/download exact source.

### Tests for User Story 5

- [X] T018 [US5] Add failing route-composed acceptance tests A17-A21 and A26 for Java preview, exact copy/download, regeneration replacement, reset, and mode-switch draft retention in `tests/unit/query-input-code-generator.test.tsx`
- [X] T019 [P] [US5] Add failing panel and tab tests U19-U22 for input isolation, generation diagnostics/options, accessible tab semantics, and keyboard navigation in `tests/unit/codegen/CodeGeneratorPanel.test.tsx` and `tests/unit/codegen/TabNavigation.test.tsx`

### Implementation for User Story 5

- [X] T020 [US5] Implement the isolated SQL editor, dialect/output controls, diagnostics, and Monaco Java preview in `src/app/query-input/components/CodeGeneratorPanel.tsx`
- [X] T021 [US5] Add the `code-generator` input mode to the shared mode types/store and accessible tab list, then render the dedicated panel without showing SQL Analyze/MyBatis panels in `src/lib/store.ts`, `src/app/query-input/page.tsx`, and `src/app/query-input/components/TabNavigation.tsx`
- [X] T022 [US5] Implement Generate/Regenerate replacement, Reset to the panel's initial SQL/options, clipboard Copy, and `.java` Download behavior in `src/app/query-input/components/CodeGeneratorPanel.tsx`
- [X] T023 [US5] Add English and Vietnamese labels, empty/loading/error states, and action feedback for the generator panel in `src/locales/en.ts` and `src/locales/vi.ts`
- [X] T024 [US5] Run the focused panel and tab tests and fix failures in `tests/unit/codegen/`

**Checkpoint**: US5 works with the US1 Java Entity renderer and preserves existing input-mode state and workflows.

---

## Phase 6: User Story 2 - SELECT Query to DTO/Projection Generation (Priority: P2)

**Goal**: Convert supported SELECT result shapes into Java DTOs/projections, preserving aliases and distinguishing aggregates and joins from Entities.

**Independent Test**: Generate DTOs for aliased columns, joins, grouped queries, aggregates, and computed fields; verify output fields and types, and ensure no DTO is annotated as an Entity.

### Tests for User Story 2

- [X] T025 [US2] Add failing route-composed acceptance tests A5-A8 for aliased, aggregate, joined, and grouped SELECT DTO output in `tests/unit/query-input-code-generator.test.tsx`
- [X] T026 [P] [US2] Add failing SELECT-normalization and DTO-rendering tests U4, U7-U8 for aliases, joins, grouping, aggregate types, computed expressions, and non-Entity output in `tests/unit/codegen/parseSql.test.ts` and `tests/unit/codegen/javaJpaRenderer.test.ts`

### Implementation for User Story 2

- [X] T027 [P] [US2] Extend semantic parsing to normalize SELECT fields, aliases, source tables, joins, grouping, ordering, and expression kinds in `src/lib/codegen/parseSql.ts`
- [X] T028 [P] [US2] Add deterministic Java type inference rules for supported aggregate expressions and retain warnings for unprovable types in `src/lib/codegen/typeMapping.ts`
- [X] T029 [US2] Implement Java DTO/projection rendering using aliases and the shared naming/type utilities in `src/lib/codegen/javaJpaRenderer.ts`
- [X] T030 [US2] Run the focused SELECT parsing, DTO rendering, and type-inference tests and fix failures in `tests/unit/codegen/`

**Checkpoint**: US2 independently generates query-result objects; SELECT aggregates and joins never silently become Entities.

---

## Phase 7: User Story 4 - SQL Classification and Type Inference (Priority: P2)

**Goal**: Classify DDL, entity-like SELECT, DTO, aggregate SELECT, joined SELECT, DML, and unknown input deterministically before selecting a renderer.

**Independent Test**: Provide CREATE TABLE, plain SELECT, SELECT JOIN, GROUP BY/aggregate SELECT, INSERT, UPDATE, DELETE, invalid SQL, and unsupported syntax; verify the classification, rationale, generation availability, and warnings for each.

### Tests for User Story 4

- [X] T031 [US4] Add failing route-composed acceptance tests A13-A16 and classifier unit tests U6-U8 for DDL, SELECT shapes, grouped aggregates, DML recommendations, and UNKNOWN input in `tests/unit/query-input-code-generator.test.tsx` and `tests/unit/codegen/classifySql.test.ts`

### Implementation for User Story 4

- [X] T032 [US4] Implement AST-fact-based classification, confidence, rationale, recommended output, and user-choice requirements in `src/lib/codegen/classifySql.ts`
- [X] T033 [US4] Connect classification results to panel recommendations and blocking/ambiguous diagnostics without invoking a renderer for DML or UNKNOWN in `src/app/query-input/components/CodeGeneratorPanel.tsx`
- [X] T034 [US4] Run the focused classifier and panel-classification tests and fix failures in `tests/unit/codegen/`

**Checkpoint**: Every supported statement is classified before generation; unsupported or insufficient evidence blocks guessed output.

---

## Phase 8: User Story 6 - SQL Relationship and Constraint Handling (Priority: P2)

**Goal**: Generate safe owning-side Java/JPA mappings only from explicit foreign-key metadata and warn when cardinality or composite-key details are insufficient.

**Independent Test**: Parse DDL with a foreign key, unique foreign key, and composite foreign key; verify only explicit owning-side mappings are generated, unique metadata is handled conservatively, and unsupported cases produce warnings without cascades or invented inverse collections.

### Tests for User Story 6

- [X] T035 [US6] Add failing route-composed acceptance tests A23-A24 and parser constraint tests for explicit foreign keys and composite-key diagnostics in `tests/unit/query-input-code-generator.test.tsx` and `tests/unit/codegen/parseSql.test.ts`
- [X] T036 [P] [US6] Add failing relationship-rendering tests U15-U16 for owning-side mappings, assumption warnings, and no invented cascade/inverse relationships in `tests/unit/codegen/javaJpaRenderer.test.ts`

### Implementation for User Story 6

- [X] T037 [US6] Normalize explicit primary, unique, and foreign-key constraints and preserve referenced table/column names in `src/lib/codegen/parseSql.ts`
- [X] T038 [US6] Render only safe owning-side JPA relationships and emit diagnostics for composite or insufficient metadata in `src/lib/codegen/javaJpaRenderer.ts`
- [X] T039 [US6] Run the focused constraint and relationship tests and fix failures in `tests/unit/codegen/`

**Checkpoint**: Relationship output is traceable to explicit DDL; no cardinality, cascade, fetch, or inverse collection is invented.

---

## Phase 9: Polish and Cross-Cutting Validation

**Purpose**: Validate performance, accessibility, localization, and compatibility with existing SQL Visualizer workflows.

- [X] T040 [P] Add the U23 100-relationship generation fixture and verify the 2-second preview target in `tests/unit/codegen/performance.test.ts`
- [X] T041 [P] Execute the manual DDL, DTO, unsupported-dialect, reset, copy/download, and keyboard-navigation scenarios and record results in `specs/015-sql-code-generator/quickstart.md`
- [X] T042 Run the full Vitest suite, `npm run type-check`, and `npm run build`; smoke-check Explain, Analyze, Optimize, and Visualize remain available through `src/app/query-input/page.tsx` and record any deviations in `specs/015-sql-code-generator/quickstart.md`

---

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Requires the module entry point; blocks all user stories.
- **US1 (Phase 3)**: Requires shared model types; establishes DDL parsing, type/naming utilities, and the Java/JPA Entity renderer.
- **US3 (Phase 4)**: Requires the Java renderer; adds the extensible renderer registry and supported/planned target UX.
- **US5 (Phase 5)**: Requires US1 generation and US3 target controls; integrates the new input mode and preview/export workflow.
- **US2 (Phase 6)**: Requires US1 model, type mapping, and renderer; can proceed in parallel with US3/US5 after US1 if files are assigned independently.
- **US4 (Phase 7)**: Requires the parsed DDL/SELECT facts from US1/US2; gates the UI's final automatic output selection.
- **US6 (Phase 8)**: Requires US1 DDL parsing and Entity rendering; schedule after US2 to avoid concurrent edits to the shared parser and renderer modules.
- **Polish (Phase 9)**: Requires all desired user stories to be integrated.

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2; no other story dependency. This is the MVP foundation.
- **US3 (P1)**: Depends on US1's Java/JPA renderer for registry availability.
- **US5 (P1)**: Depends on US1 generation and US3 target controls.
- **US2 (P2)**: Depends on US1's shared semantic model and Java renderer; otherwise independent of US3/US5.
- **US4 (P2)**: Depends on the DDL/SELECT semantic facts from US1/US2.
- **US6 (P2)**: Depends on US1's DDL model; scheduled after US2 because both extend the parser/renderer files.

### Parallel Opportunities

- **US1**: T003–T006 are independent tests in separate files. After those fail as expected, T008 and T009 can proceed in parallel with T007; T010 waits for parser/model/type/naming contracts.
- **US3**: T012 and T013 can be authored in parallel because they cover separate registry and UI-control contracts.
- **US5**: T018 and T019 can be authored in parallel because panel behavior and tab keyboard behavior use different test files.
- **US2**: T025 and T026 can be authored in parallel. After test interfaces are fixed, T027 and T028 can proceed in parallel; T029 uses their outputs.
- **US4**: T031 is one focused classifier test task; implementation and panel integration are sequential.
- **US6**: T035 and T036 can be authored in parallel; after the contract is fixed, T037 and T038 touch separate parser and renderer files.
- **Polish**: T040's fixture/measurement and T041's manual scenarios can run independently before T042's full validation gate.

## Parallel Example: User Story 1

```text
After T002, author in parallel:
T003 DDL parser tests: tests/unit/codegen/parseSql.test.ts
T004 Entity renderer tests: tests/unit/codegen/javaJpaRenderer.test.ts
T005 type mapping tests: tests/unit/codegen/typeMapping.test.ts
T006 naming tests: tests/unit/codegen/naming.test.ts

After tests fail as expected, implement T007/T008/T009 in their separate source files; then implement T010 and run T011.
```

## Parallel Example: User Story 2

```text
After US1, author in parallel:
T025 SELECT normalization tests: tests/unit/codegen/parseSql.test.ts
T026 DTO rendering tests: tests/unit/codegen/javaJpaRenderer.test.ts

After expected failures, normalize SELECT ASTs (T027) and aggregate types (T028); render DTOs (T029), then run T030.
```

## Parallel Example: User Story 6

```text
After US1 and US2, author in parallel:
T035 foreign-key parser tests: tests/unit/codegen/parseSql.test.ts
T036 relationship renderer tests: tests/unit/codegen/javaJpaRenderer.test.ts

After expected failures, implement parser normalization (T037) and safe relationship rendering (T038), then run T039.
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational phases.
2. Complete US1 and validate Java/JPA Entity generation independently.
3. Complete US3 and US5 to expose a usable Java-only generator tab with preview/export.
4. Stop and validate the MVP before adding DTO, expanded classification, and relationship behavior.

### Incremental Delivery

1. US1 delivers deterministic DDL-to-Entity generation.
2. US3 and US5 make the generator target and workflow usable in the existing app.
3. US2 adds SELECT-to-DTO generation.
4. US4 completes classification for all specified SQL categories and unsupported inputs.
5. US6 adds explicit-FK relationship mappings with conservative warnings.
6. Polish verifies the performance target, quickstart flows, and existing feature compatibility.

## Scope Notes

- Java/JPA is the only enabled MVP target; other languages/frameworks are represented as planned/unavailable, not implemented renderers.
- DML classification is required, but DML repository methods and full service/controller scaffolding are not defined in the accepted MVP contract and are not tasks here. If those are required for release one, revise the spec to define the target backend framework and generated API behavior before implementation.
- Oracle grammar is unavailable in the current parser dependencies. This task list requires an explicit unsupported-dialect warning and no guessed code; full Oracle generation remains a known follow-up to FR-001.

---

## Phase 10: TDD Verification Remediation

**Purpose**: Resolve audit findings recorded in `tdd/verification.md`; do not rewrite historical red evidence.

- [ ] T043 [TDD-VERIFY] Reconcile FR-001's Oracle parsing requirement with the documented unsupported-dialect boundary across `spec.md`, `plan.md`, and `tdd/test-list.md`; verify the chosen behavior with `npx vitest run tests/unit/codegen/parseSql.test.ts tests/unit/query-input-code-generator.test.tsx`
- [ ] T044 [TDD-VERIFY] Append a truthful evidence correction for U16, U23, and U28 without rewriting earlier cycle-log entries; classify test-after/characterization evidence accurately and rerun `npx vitest run tests/unit/codegen/javaJpaRenderer.test.ts tests/unit/codegen/performance.test.ts tests/unit/codegen/parseSql.test.ts`
- [ ] T045 [TDD-VERIFY] Map every active A/U behavior ID to its test and implementation task in `tasks.md`, including A27, A28, and U29-U32; verify no active behavior is unmapped
- [ ] T046 [TDD-VERIFY] Resolve SC-004 by defining supported Java/JPA and MyBatis dependency versions or revising the criterion, then add a compile check for representative generated Entity, DTO, and mapper files
- [ ] T047 [TDD-VERIFY] Define a representative SQL corpus and measurement protocol for SC-001, SC-002, SC-003, SC-005, and SC-007; record measured results or revise unsupported targets
- [ ] T048 [TDD-VERIFY] Add or record explicit regression smoke evidence for Explain, Analyze, Optimize, and Visualize against SC-008; verify the route flows and update `quickstart.md`
- [ ] T049 [TDD-VERIFY] Refresh `.specify/memory/tdd-profile.md` with the current suite size/runtime and reverify its single-test and suite commands
- [ ] T050 [TDD-VERIFY] Strengthen the renderer-extension contract so an added target receives target-appropriate options without changing parsing/classification; verify with `npx vitest run tests/unit/codegen/rendererRegistry.test.ts`
