---

description: "Task list for MyBatis XML to Pure SQL Normalization"
---

# Tasks: MyBatis XML to Pure SQL Normalization

**Input**: Design documents from `/specs/009-mybatis-sql-normalization/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/mybatis-conversion.md, contracts/query-input-mybatis-ui.md, quickstart.md

**Tests**: Included — the project constitution requires unit and integration tests for all new parser logic ("All new parser logic MUST include unit and integration tests (Vitest)"), and FR-041 requires a committed golden corpus with expected SQL. Test tasks are therefore part of the deliverable, not optional extras. Write a story's test task first and confirm it fails before implementing that story.

**Organization**: Tasks are grouped by user story. The five stories from spec.md are US1 (P1), US2 (P1), US3 (P1), US4 (P1) and US5 (P2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: `[US1]`…`[US5]` for user-story phases only; setup, foundational and polish tasks carry no story label
- Every task names the exact file path it touches and the requirement it satisfies

## Path Conventions

Single Next.js project: application code under `src/`, tests under `tests/`. Conversion library: `src/lib/sql/mybatis/`. Query Input route: `src/app/query-input/`. Golden corpus: `tests/fixtures/mybatis/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffolding every later task relies on — bounds, corpus convention, fixture loader, shared strings.

- [x] T001 [P] Create `src/lib/sql/mybatis/limits.ts` holding the conversion bounds (input-size ceiling, XML nesting-depth ceiling, fragment-nesting ceiling, expansion ceiling, foreach item ceiling) as named exports with a comment on why each exists, per FR-032 and SC-005.
- [x] T002 [P] Create `tests/fixtures/mybatis/README.md` documenting the fixture triple convention (`<case>.xml` + `<case>.params.json` + `<case>.expected.sql`), how a case declares its expected finding kinds, and the construct coverage checklist required by FR-041.
- [x] T003 [P] Create `tests/utils/mybatis-fixtures.ts` exposing the fixture loader used by the corpus runner: enumerate case names from `tests/fixtures/mybatis`, read the triple with `node:fs`, and export the SQL normaliser used for comparison, per research R14. Test-only helper — never imported by `src/`.
- [ ] T004 [P] Add the shared conversion strings to `src/locales/en.ts` and `src/locales/vi.ts`: findings panel title/description/clean-state message, severity labels (error/warning/info), unresolved-count badge, blocked-action reason, statement picker label/hint/option format, and the finding location format, per FR-029 and research R15. Both files must define identical keys.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The model, the safe XML read, the finding discipline and the conversion entry points that every user story extends.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 [P] Define the model, result and finding types in `src/lib/sql/mybatis/types.ts` covering data-model E1–E9 (MapperFile, MappedStatement, SqlFragment, the DynamicNode union, ParameterReference, ParameterSet, ResolutionResult, ConversionFinding) plus the severity and analysable/blocked unions. Types only — no behaviour.
- [x] T006 [P] Implement the safe XML read in `src/lib/sql/mybatis/xmlDocument.ts`: enforce the T001 bounds, neutralise or reject document-type and entity declarations before parsing, read through `DOMParser`, and expose accessors for element/attribute/text/CDATA content. Per FR-005, FR-006, FR-031, FR-032 and research R1.
- [x] T007 [P] Implement the mapper model builder in `src/lib/sql/mybatis/mapperModel.ts`: namespace, the statement table keyed by namespace + identifier + occurrence index, the fragment table, the mapper metadata captured for display, source positions, and `<selectKey>` kept aside from the statement body. Per data-model E1–E3, FR-002, FR-004, FR-009.
- [x] T008 [P] Implement the finding helper in `src/lib/sql/mybatis/findings.ts`: one finding per construct, deterministic ordering by position then kind, severity↔state consistency, and the mapping from finding kind to localisation key. Per data-model E9.
- [x] T009 Implement `parseMapperXml` and `listStatements` in `src/lib/sql/mybatis/conversion.ts` (contract entry points 1 and 2): file-level findings for unreadable input, bounds and a file without statements, plus the single-entry parse cache keyed on the XML text. Depends on T005–T008.
- [x] T010 Delegate `extractMyBatisParams` and `getConditionalParams` in `src/lib/sql/sqlAnalyzer.ts` to the new library while keeping their signatures and output shapes, so the existing parameter editor tests keep describing real behaviour. Per FR-026 and research R9.
- [ ] T011 [P] Add the bounds and hostile-input suite in `tests/unit/mybatis-safety.test.ts`: oversized input, document-type and entity declarations, deep nesting, repeated expansion, and the guarantee that no expression from a file is ever executed. Assert findings and bounds rather than timings. Per FR-031, FR-032 and quickstart S8.

**Checkpoint**: Foundation ready — the model exists, files can be read safely and the legacy detection helpers delegate.

---

## Phase 3: User Story 1 - Analyze the SQL that a mapper file actually runs (Priority: P1) 🎯 MVP

**Goal**: A mapper file's statement becomes pure SQL that the existing analyzer accepts, and the Query Input page keeps working end to end with the new conversion path behind it.

**Independent Test**: Load a mapper file containing one plain SELECT and confirm the SQL offered for analysis is exactly that statement's body — no markup, metadata, CDATA, entity text or placeholder syntax — and that the existing query-input suites, analysis sections and dialect handling are unchanged. Per spec US1 and quickstart S1, S7.

### Tests for User Story 1 ⚠️

> Write these first and confirm they fail before implementing T017–T021.

- [ ] T012 [P] [US1] Add `tests/unit/mybatis-xml.test.ts` covering plain SELECT/INSERT/UPDATE/DELETE extraction, mapper-metadata exclusion, CDATA handling, character-entity decoding, XML comments not reaching the SQL, whitespace normalisation that preserves literal and comment whitespace, `<selectKey>` separation, and dialect pass-through for all four dialects. Per FR-004 to FR-009, FR-033, FR-038.
- [ ] T013 [US1] Add the corpus runner `tests/unit/mybatis-corpus.test.ts` using the T003 loader: for every case assert the normalised SQL against `<case>.expected.sql`, assert the expected finding kinds, and assert the leak invariants from data-model for every analysable result. Per FR-041, FR-005.
- [ ] T014 [P] [US1] Add corpus fixtures `simple-select`, `insert-statement`, `update-statement`, `delete-statement` under `tests/fixtures/mybatis/` (xml + params + expected sql).
- [ ] T015 [P] [US1] Add corpus fixtures `cdata-operators`, `escaped-entities`, `xml-comments`, `select-key` under `tests/fixtures/mybatis/`.
- [ ] T016 [P] [US1] Add dialect corpus fixtures `mysql-dialect`, `postgres-dialect`, `sqlserver-dialect`, `oracle-dialect` under `tests/fixtures/mybatis/`, each preserving dialect-specific syntax unchanged apart from whitespace.

### Implementation for User Story 1

- [x] T017 [US1] Implement reference detection and rendering in `src/lib/sql/mybatis/parameterResolver.ts`: prepared-value references resolved to a dialect-profile literal built from the supplied value, nested property paths, `#{name,jdbcType=…}` option parsing kept for diagnostics only, and the existing reference-own-name stand-in for an unsupplied value. Per FR-023, FR-025, FR-026 and research R3, R8.
- [x] T018 [US1] Implement SQL assembly in `src/lib/sql/mybatis/renderer.ts`: render a node list to SQL text, collapse only cosmetic whitespace, and preserve whitespace inside string literals, quoted identifiers and SQL comments. Per FR-007, FR-008.
- [x] T019 [US1] Implement `resolveStatement` in `src/lib/sql/mybatis/conversion.ts` (contract entry point 3): assemble the renderer output, the detected references, the findings and the analysable/blocked state into a `ResolutionResult`. Per data-model E8.
- [x] T020 [US1] Delegate `parseMyBatisXml` and `resolveMyBatisParams` in `src/lib/sql/sqlAnalyzer.ts` to the new pipeline while preserving their signatures, the `{ sql, params }` shape and today's behaviour for plain statements. Per FR-038 and research R9.
- [ ] T021 [US1] Wire the page in `src/app/query-input/page.tsx`: parse once per XML text with `useMemo`, resolve the selected statement whenever values change, feed `resolvedSql`, and derive the parameter list and its conditional set from the resolution result instead of a second scan. Per FR-026, FR-035, FR-036 and research R13.
- [ ] T022 [US1] Add the page-integration suite `tests/unit/mybatis-query-input.test.tsx` asserting that a plain mapper file renders pure SQL in the preview and that the empty, loading and error states behave as before, then run `npm test` to confirm the pre-existing query-input suites still pass. Per FR-037, SC-008.

**Checkpoint**: US1 is independently demonstrable — a plain mapper file analyses exactly like pasted SQL.

---

## Phase 4: User Story 2 - Get the SQL that the configured parameter values actually produce (Priority: P1)

**Goal**: Dynamic constructs contribute exactly the SQL the supplied values imply, with no leftover control markup, dangling connectives or trailing separators.

**Independent Test**: Configure values on a statement combining a guarded predicate block, a branch selector, an assignment block and list iteration, and confirm the resolved SQL contains exactly the clauses those values imply. Per spec US2 and quickstart S2.

### Tests for User Story 2 ⚠️

> Write these first and confirm they fail before implementing T027–T032.

- [ ] T023 [P] [US2] Add `tests/unit/mybatis-dynamic.test.ts` covering guarded constructs, branch selection including the fallback and the no-branch-matched case, wrappable clauses with zero/one/many conditions and leading connectives, assignment blocks with zero and multiple assignments, trimming wrappers with prefix/prefix-override/suffix/suffix-override, iteration with one/many/empty/unavailable collections and custom separators, nested constructs, and binding. Per FR-013 to FR-022.
- [ ] T024 [P] [US2] Add corpus fixtures `dynamic-where` (values supplied and none supplied), `choose-when-otherwise`, `choose-no-branch`, `nested-if` under `tests/fixtures/mybatis/`.
- [ ] T025 [P] [US2] Add corpus fixtures `update-set`, `set-empty`, `trim-wrapper`, `foreach-list` under `tests/fixtures/mybatis/`.
- [ ] T026 [P] [US2] Add corpus fixtures `foreach-empty`, `foreach-unresolved`, `nested-foreach`, `bind-variable`, `bind-unresolved` under `tests/fixtures/mybatis/`.

### Implementation for User Story 2

- [x] T027 [US2] Implement the safe condition evaluator in `src/lib/sql/mybatis/conditionEvaluator.ts`: tokenizer plus recursive-descent evaluator over the documented subset (property paths, literals, comparison operators, boolean combinators, null and empty checks, collection size/length) with no execution primitive anywhere in the module. Per FR-013, FR-031 and research R2.
- [x] T028 [US2] Implement the guarded constructs in `src/lib/sql/mybatis/dynamicEvaluator.ts`: `if` contributes or omits its children, `choose`/`when`/`otherwise` contributes exactly one branch, and an unevaluable condition keeps its guarded SQL and reports it. Per FR-013, FR-014, FR-015 and research R7.
- [x] T029 [US2] Implement the wrapper constructs in `src/lib/sql/mybatis/dynamicEvaluator.ts`: `where` emits its keyword only when something is contributed and strips a dangling leading connective, `set` emits SET only when an assignment applies and removes the trailing separator, `trim` applies prefix/prefix-override/suffix/suffix-override with the mapper's whitespace semantics. Per FR-016, FR-017, FR-018.
- [x] T030 [US2] Implement iteration in `src/lib/sql/mybatis/dynamicEvaluator.ts`: expand `foreach` from a collection supplied as a JSON array using item/index names, separator and wrapper characters; an unavailable collection contributes the wrapper with the collection's own name and reports it; an empty collection contributes an empty wrapper and reports the risk. Per FR-019 to FR-021 and research R5, R6.
- [x] T031 [US2] Implement `bind` in `src/lib/sql/mybatis/dynamicEvaluator.ts`: resolve a variable when its expression is computable from available values, otherwise report it, and never emit binding markup into the SQL. Per FR-022.
- [x] T032 [US2] Extend `resolveStatement` in `src/lib/sql/mybatis/conversion.ts` to evaluate the dynamic node tree and attach the evaluator's findings, keeping deterministic output for a given model, value set and dialect. Per data-model E4, E8.
- [ ] T033 [US2] Extend `tests/unit/mybatis-query-input.test.tsx` with dynamic-editing cases: filling a guarded value adds its predicate, clearing it removes the predicate and any now-empty clause, and the parameter list stays consistent with the rendered SQL. Per FR-026, FR-035.

**Checkpoint**: US2 is independently demonstrable — dynamic statements produce the SQL their values imply.

---

## Phase 5: User Story 3 - Reuse shared fragments instead of hand-copying them (Priority: P1)

**Goal**: Fragment references are expanded in full — local, nested and property-carrying — and anything the loaded file cannot satisfy stops safely with a finding.

**Independent Test**: Load a mapper file whose statement pulls in a fragment that itself pulls in another fragment with per-use values, and confirm the resolved SQL contains the fully expanded SQL with no reference or namespace qualification left behind. Per spec US3 and quickstart S3.

### Tests for User Story 3 ⚠️

> Write these first and confirm they fail before implementing T036–T038.

- [ ] T034 [P] [US3] Add `tests/unit/mybatis-fragments.test.ts` covering a simple local reference, a reference supplying per-use property values, nested references, a reference qualified by a namespace the file does not define, a self-referencing fragment, a mutual cycle, nesting beyond the depth limit, and a duplicate fragment declaration. Per FR-010, FR-011, FR-012.
- [ ] T035 [P] [US3] Add corpus fixtures `include-simple`, `include-nested-properties`, `include-in-namespace`, `include-dynamic-sql`, `include-cycle`, `unresolved-include` under `tests/fixtures/mybatis/`.

### Implementation for User Story 3

- [x] T036 [US3] Implement fragment expansion in `src/lib/sql/mybatis/fragmentResolver.ts`: replace a satisfiable reference with the referenced fragment's nodes, substitute the per-use property values the reference supplies (including where a nested reference passes them on), and detect self-reference, cycles, references outside the loaded file and nesting beyond the T001 ceiling. Per FR-010, FR-011, FR-012 and the `/speckit-clarify` single-file decision.
- [x] T037 [US3] Integrate expansion into `parseMapperXml` in `src/lib/sql/mybatis/conversion.ts` so includes are expanded before dynamic evaluation, resolved once per fragment so a fragment used many times is not re-expanded per use. Per research R13.
- [x] T038 [US3] Extend the state rules in `src/lib/sql/mybatis/conversion.ts` and `src/lib/sql/mybatis/findings.ts` so `MISSING_FRAGMENT`, `FRAGMENT_CYCLE` and `FRAGMENT_DEPTH` are error findings that block the affected statement and produce an empty SQL, while other statements in the same file stay analysable. Per FR-040 and the data-model state transitions.
- [ ] T039 [P] [US3] Add the mixed-file corpus fixture `mixed-convertibility` (one convertible statement and one blocked statement in the same file) under `tests/fixtures/mybatis/` and extend `tests/unit/mybatis-fragments.test.ts` to assert per-statement state: the satisfiable statement resolves to SQL while the unsatisfiable one is blocked with its error finding. Per the mixed-convertibility edge case, FR-012, FR-039, FR-040.

**Checkpoint**: US3 is independently demonstrable — shared fragments expand, and unsatisfiable ones stop safely.

---

## Phase 6: User Story 4 - Be told what could not be resolved instead of being handed wrong SQL (Priority: P1)

**Goal**: Every unresolved construct is visible with enough context to act, the two reference forms behave differently, and analysis is withheld only when no trustworthy statement could be produced.

**Independent Test**: Load a mapper file whose statement contains one resolvable and one unresolvable construct, and confirm the resolvable behaviour is honoured, the unresolvable one is unchanged apart from a finding that names it, and the primary action is disabled with a reason when the statement cannot be produced at all. Per spec US4 and quickstart S4, S5, S9.

### Tests for User Story 4 ⚠️

> Write these first and confirm they fail before implementing T043–T046.

- [ ] T040 [P] [US4] Add `tests/unit/mybatis-parameters.test.ts` covering prepared-value rendering, an unsupplied prepared value, a raw substitution that is supplied and one that is not, nested paths, option metadata (`#{name,jdbcType=VARCHAR}`), values containing quotes and backslashes, and the guarantee that neither reference form survives into the SQL. Per FR-023 to FR-025, FR-028.
- [ ] T041 [P] [US4] Add corpus fixtures `substitution-identifier`, `unsupplied-parameter`, `unresolved-condition`, `malformed-xml`, `no-statement`, `oversized-input`, `hostile-entities` under `tests/fixtures/mybatis/`, each declaring the finding kinds it expects.
- [ ] T042 [US4] Add `tests/unit/mybatis-query-input.test.tsx` cases for the findings surface and the gate: findings visible on an analysable statement, the primary action disabled with its reason on a blocked statement, no partial SQL rendered in the preview, and the mixed-statement file where one statement is blocked while the other stays analysable. Per FR-029, FR-030, FR-040.

### Implementation for User Story 4

- [ ] T043 [US4] Implement `src/app/query-input/components/ConversionFindings.tsx` on the existing `QueryInputPanel` shell: findings grouped by severity with a textual severity label, the construct and its location per entry, an explicit clean-state message when there are no findings, and the blocking explanation when the statement is blocked. Per FR-027, FR-029 and contracts/query-input-mybatis-ui.md.
- [ ] T044 [US4] Add the per-kind finding messages and the location format to `src/locales/en.ts` and `src/locales/vi.ts`, keeping both key sets identical. Per FR-029, research R15.
- [ ] T045 [US4] Extend `src/app/query-input/components/ActionButtons.tsx` with an optional blocked reason: keep the primary action's existing markers, hint text and loading behaviour, and add the disabled state plus `aria-describedby` wiring only when a reason is supplied. Per contracts/query-input-mybatis-ui.md.
- [ ] T046 [US4] Gate analysis in `src/app/query-input/page.tsx`: refuse analysis with the blocking reason whenever the selected statement is blocked, keep findings visible and analysis available when it is analysable, and render `ConversionFindings` directly after the MyBatis input panel without disturbing the heading order the workflow suite asserts. Per FR-039, FR-040 and research R11, R12.
- [ ] T047 [US4] Confirm the unresolvable-construct behaviour end to end in `tests/unit/mybatis-query-input.test.tsx`: an unevaluable condition keeps its guarded SQL and reports it, an unavailable collection keeps the wrapper and reports it, and each produces exactly one finding. Per FR-014, FR-020, FR-028.

**Checkpoint**: US4 is independently demonstrable — the developer sees what was not resolved, and analysis is withheld only when it must be.

---

## Phase 7: User Story 5 - Pick the statement to analyze when one file defines several (Priority: P2)

**Goal**: A file defining several statements is discoverable and selectable, and the analyzed SQL is always exactly one statement.

**Independent Test**: Load a file defining several statements, confirm they are listed, switch the selection, and confirm the analyzed SQL becomes only the newly selected statement's SQL without re-importing the file. Per spec US5 and quickstart S6.

### Tests for User Story 5 ⚠️

> Write these first and confirm they fail before implementing T049–T051.

- [ ] T048 [P] [US5] Add corpus fixtures `multi-statement` and `duplicate-identifiers` (statements sharing an identifier across namespaces) under `tests/fixtures/mybatis/`, and extend `tests/unit/mybatis-xml.test.ts` with `listStatements` assertions: document order, type and identifier per option, distinct keys for colliding identifiers, and no concatenation when each is resolved. Per FR-002, FR-003, FR-009.
- [ ] T049 [US5] Add `tests/unit/mybatis-query-input.test.tsx` cases for the picker: absent for a single-statement file, present with one option per statement otherwise, and switching the selection replaces the resolved SQL. Per FR-003, US5 acceptance scenarios.

### Implementation for User Story 5

- [ ] T050 [US5] Implement `src/app/query-input/components/StatementPicker.tsx` as a labelled native select rendered inside the MyBatis input panel body: one option per statement labelled with its type and identifier (plus the occurrence index only when identifiers repeat), hidden when the file defines a single statement. Per FR-003 and research R10.
- [ ] T051 [US5] Wire selection state in `src/app/query-input/page.tsx`: default to the first statement in document order, reset the selection when the XML text changes, re-resolve the newly selected statement without re-importing the file, and keep the picker out of the workflow step list. Per FR-003, FR-035 and contracts/query-input-mybatis-ui.md.
- [ ] T052 [US5] Add the picker's option-label format string to `src/locales/en.ts` and `src/locales/vi.ts` if T004 did not already cover it, and confirm both locale files keep identical key sets. Per FR-029.

**Checkpoint**: All five stories are independently functional — each statement of a file can be analysed on its own.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Qualities that span the stories — documentation, static checks, performance evidence, accessibility and the convergence audit.

- [ ] T053 [P] Document each module in `src/lib/sql/mybatis/*.ts` with a header comment stating the algorithm, the MyBatis semantics it implements and its known limitations (the iteration stand-in's visibility to the analyzer, the dialect-profile extension point, the supported condition subset), per research R2, R3, R5 and the constitution's documentation standard.
- [ ] T054 [P] Run `npm run format` and `npm run lint` over the files added or changed by this feature (`src/lib/sql/mybatis/**`, `src/app/query-input/**`, `src/locales/en.ts`, `src/locales/vi.ts`, `tests/unit/mybatis-*.ts*`, `tests/utils/mybatis-fixtures.ts`) and clear every finding, keeping the repo's Prettier configuration, no new `any` and no `console.log`.
- [ ] T055 Add the performance evidence to `tests/unit/mybatis-safety.test.ts`: a generated document of roughly 200 statements and a pathological document, asserting conversion stays inside the SC-005 bounds and that bounded input terminates without exhausting the runtime.
- [ ] T056 [P] Add the formatting-insensitivity corpus fixture `formatting-invariance` — the same statement written on one line and spread across lines with different indentation and CDATA boundaries — asserting equivalent SQL, per SC-013 and FR-008.
- [ ] T057 [P] Add `tests/unit/mybatis-query-input.axe.test.tsx` following the existing `tests/unit/SignInPage.axe.test.tsx` pattern, asserting the new surfaces raise no detectable WCAG 2.1 A/AA violations: the picker is programmatically labelled, finding severity is textual, and the blocked action's reason is linked to the button. Per contracts/query-input-mybatis-ui.md.
- [ ] T058 Run the full validation set — `npm test`, `npm run type-check`, plus the quickstart S9 and S10 walkthroughs in both interface languages — and record the observed results against SC-004, SC-007 and SC-008 in the Definition of Done section of `specs/009-mybatis-sql-normalization/quickstart.md`.
- [ ] T059 Convergence audit: walk FR-001 to FR-042 and SC-001 to SC-013 against the implemented code, the corpus and the suite output; record any requirement not covered as a new task in `specs/009-mybatis-sql-normalization/tasks.md` before the feature is called complete, per the constitution's governance rule and the Spec Kit convergence step.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: no dependencies — start immediately.
- **Phase 2 Foundational**: depends on Setup — **blocks every user story**.
- **Phase 3 US1**: depends on Foundational. This is the MVP.
- **Phase 4 US2**, **Phase 5 US3**, **Phase 6 US4**: depend on and extend US1's rendering path.
- **Phase 7 US5**: depends on Foundational for the model and US1 for the page wiring.
- **Phase 8 Polish**: depends on the stories you intend to ship.

### User Story Dependencies (stated honestly)

US1 is the base: it creates `resolveStatement` and the page wiring every other story extends. US2 and US3 add node kinds to the same evaluator, so their library work is sequential in practice (US2 before US3, because a fragment may contain dynamic constructs). US4's library-side work (reference forms and reporting) is independent of US2/US3 and can run in parallel with them once US1 is done; its UI work only needs US1's wiring. US5 needs the model (Foundational) and the page (US1), and is otherwise independent.

Each story still satisfies the "independently testable" rule: the checkpoint after each phase is demonstrable on its own, and no story's tests depend on a later story.

### Within Each User Story

- Test tasks first; confirm they fail before the implementation tasks of that story.
- Model and library code before page wiring.
- Library-level tasks before component tasks.
- Complete a story's checkpoint before starting the next priority.

### Parallel Opportunities

- Phase 1: T001–T004 are all `[P]` (separate files).
- Phase 2: T005–T008 and T011 are `[P]`; T009 depends on T005–T008; T010 depends on T005–T007.
- US1: tests and fixtures T012, T014, T015, T016 are `[P]`; T013 depends on T003; implementation T017 → T018 → T019 → T020 → T021 → T022 is sequential.
- US2: fixtures T024, T025, T026 and the suite T023 are `[P]`; T027 → T028 → T029 → T030 → T031 → T032 are sequential because they share `dynamicEvaluator.ts` (except T027, a separate file).
- US3: T034 and T035 are `[P]`; T036 → T037 → T038 sequential; T039 `[P]`.
- US4: T040, T041 are `[P]`; T043/T044/T045 touch different files and can be split, but T046 depends on all three; T042 and T047 depend on T046.
- US5: T048 `[P]`; T050 → T051 sequential (T051 depends on T050); T052 `[P]` with T049.
- Polish: T053, T054, T056, T057 are `[P]`; T055, T058, T059 come last.

---

## Parallel Example: User Story 1

```bash
# Launch the test and fixture tasks of US1 together (different files):
Task: "Add tests/unit/mybatis-xml.test.ts covering extraction, CDATA, entities, comments and dialect pass-through"
Task: "Add corpus fixtures simple-select, insert-statement, update-statement, delete-statement"
Task: "Add corpus fixtures cdata-operators, escaped-entities, xml-comments, select-key"
Task: "Add dialect corpus fixtures mysql-dialect, postgres-dialect, sqlserver-dialect, oracle-dialect"

# Then the implementation chain, one file at a time:
Task: "Implement reference detection and rendering in src/lib/sql/mybatis/parameterResolver.ts"
Task: "Implement SQL assembly in src/lib/sql/mybatis/renderer.ts"
Task: "Implement resolveStatement in src/lib/sql/mybatis/conversion.ts"
```

## Parallel Example: User Story 2

```bash
# Test and fixtures first:
Task: "Add tests/unit/mybatis-dynamic.test.ts"
Task: "Add corpus fixtures dynamic-where, choose-when-otherwise, choose-no-branch, nested-if"
Task: "Add corpus fixtures update-set, set-empty, trim-wrapper, foreach-list"
Task: "Add corpus fixtures foreach-empty, foreach-unresolved, nested-foreach, bind-variable, bind-unresolved"

# The condition evaluator is a separate file and can start immediately; the evaluator tasks share one file and must be sequential:
Task: "Implement the safe condition evaluator in src/lib/sql/mybatis/conditionEvaluator.ts"
Task: "Implement guarded constructs in src/lib/sql/mybatis/dynamicEvaluator.ts"
```

---

## Implementation Strategy

### MVP first (User Story 1 only)

1. Phase 1 Setup — bounds, corpus convention, fixture loader, shared strings.
2. Phase 2 Foundational — model, safe read, finding discipline, conversion entry, delegating detection helpers.
3. Phase 3 US1 — plain statements convert to pure SQL and the page keeps working.
4. **STOP and VALIDATE**: run `npm test` and the quickstart S1/S7 checks; the pre-existing query-input suites must be green.
5. That is a shippable increment: mapper files stop sending markup into the analyzer.

### Incremental delivery

1. Setup + Foundational → foundation ready.
2. US1 → validate → demo (MVP).
3. US2 → validate → demo (dynamic statements become trustworthy).
4. US3 → validate → demo (shared fragments expand).
5. US4 → validate → demo (findings and the analysis gate arrive).
6. US5 → validate → demo (multi-statement files become selectable).
7. Polish → documentation, static checks, performance evidence, accessibility, convergence audit.

### Parallel team strategy

After Foundational completes: one developer takes US1 (the base), a second can prepare US4's library-side reference work, a third can prepare corpus fixtures for US2/US3 since they are pure data files. Once US1 lands, US2 and US4 proceed in parallel, US3 follows US2, and US5 can proceed at any point after US1.

---

## Notes

- `[P]` marks tasks touching different files with no unmet dependency; tasks sharing a file (notably `dynamicEvaluator.ts`, `conversion.ts` and `page.tsx`) are deliberately sequential.
- Every task names its requirement, so `/speckit-implement` can verify coverage and `/speckit-converge` can spot an unmet clause.
- Test tasks are part of the deliverable here: the constitution requires tests for new parser logic and FR-041 requires the corpus with expected SQL.
- The corpus is data, not code — adding a case means adding three files under `tests/fixtures/mybatis/` and nothing else.
- Do not weaken the reference-own-name stand-ins (prepared and raw forms) to satisfy a fixture: they are the accepted clarification's behaviour, and a fixture that disagrees with them is a wrong fixture.
- Commit after each task or coherent group; never commit with a red suite.

---

## Requirement traceability

| Requirements | Tasks |
|--------------|-------|
| FR-001 (input modes) | T021, T046 |
| FR-002, FR-003 (statement separation and selection) | T007, T009, T048, T050, T051 |
| FR-004 (`selectKey` never merged) | T007, T012, T015 |
| FR-005, FR-006, FR-007, FR-008 (pure SQL, entities, preserved text, whitespace) | T006, T012, T013, T015, T018, T056 |
| FR-009 (identity retained, kept out of SQL) | T007, T012 |
| FR-010, FR-011, FR-012 (fragments, properties, cycles) | T034, T035, T036, T037, T038, T039 |
| FR-013 to FR-022 (dynamic semantics) | T023 to T032, T047 |
| FR-023 to FR-026 (references, one parameter source of truth) | T010, T017, T021, T040 |
| FR-027 to FR-030 (reporting and actionable messages) | T004, T008, T041, T043, T044, T045, T046 |
| FR-031, FR-032 (untrusted input, bounded work) | T001, T006, T011, T055 |
| FR-033 (dialect preserved) | T012, T016, T017 |
| FR-034 (no MyBatis knowledge downstream) | T019, T020, T021, T058 |
| FR-035 (live re-resolution) | T021, T033, T051 |
| FR-036, FR-037, FR-038 (preserved workflow and inputs) | T010, T012, T020, T021, T022, T058 |
| FR-039, FR-040 (analysable versus blocked) | T038, T042, T045, T046 |
| FR-041 (committed corpus) | T002, T003, T013, T014, T015, T016, T024, T025, T026, T035, T039, T041, T048, T056 |
| FR-042 (structural conversion) | T006, T007, T027, T028, T029, T030, T031, T032, T053 |
| SC-001 to SC-013 | T013, T055, T056, T057, T058, T059 |






