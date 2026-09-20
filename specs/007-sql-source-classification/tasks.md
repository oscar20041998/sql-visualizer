---

description: "Task list for semantic SQL source classification and relationship graph presentation"
---

# Tasks: SQL Source Classification

**Input**: Design documents from `/specs/007-sql-source-classification/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [source-classification-ui.md](./contracts/source-classification-ui.md), [quickstart.md](./quickstart.md)

**Tests**: Required. The constitution requires Vitest coverage for parser and visualization behavior, four-dialect AST cross-checks, type safety, and a 50+-source performance regression.

**Organization**: Tasks are grouped by user story so each increment has an independent test path. All test tasks must be written and observed failing before their paired implementation task begins.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish fixtures and test utilities without introducing a second parser or a new dependency.

- [X] T001 Create four-dialect source-classification fixture and AST cross-check helpers in tests/unit/sqlSourceClassification.test.ts
- [X] T002 [P] Create relationship-graph source-filter render helpers and representative AnalysisResult fixtures in tests/unit/relationshipGraphSourceFilter.test.tsx

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the canonical source-occurrence contract used by every parser and graph task.

**⚠️ CRITICAL**: No user-story implementation may begin until this phase is complete.

- [X] T003 Add the canonical SqlSourceType union and required sourceType field to TableNode in src/lib/sql/sqlAnalyzer.ts
- [X] T004 Add centralized source-type compatibility helpers so legacy isCTE and isSubquery values derive only from sourceType in src/lib/sql/sqlAnalyzer.ts
- [X] T005 Add scoped CTE-symbol lookup and source-occurrence ID helper functions in src/lib/sql/sqlAnalyzer.ts
- [X] T006 Document source resolution precedence, alias occurrence identity, dialect limits, and legacy-flag derivation beside the helpers in src/lib/sql/sqlAnalyzer.ts
- [X] T007 Run the baseline analyzer and graph tests plus TypeScript type check, recording any pre-existing failures in specs/007-sql-source-classification/quickstart.md

**Checkpoint**: Every graphable source can carry one canonical classification, and subsequent work can resolve sources without UI-specific inference.

---

## Phase 3: User Story 1 - Identify SQL sources correctly (Priority: P1) 🎯 MVP

**Goal**: Correctly distinguish direct physical-table references from same-query CTE references while preserving aliases, schema-qualified identifiers, and self-join occurrences.

**Independent Test**: Analyze CTE/table fixtures for MySQL, PostgreSQL, SQL Server, and Oracle and confirm CTE references resolve as `CTE`, direct identifiers resolve as `TABLE`, schema-qualified names remain intact, and aliased self-join endpoints have distinct IDs with unchanged source type.

### Tests for User Story 1

- [X] T008 [US1] Add failing table-versus-CTE classification regression cases for MySQL, PostgreSQL, SQL Server, and Oracle in tests/unit/sqlSourceClassification.test.ts
- [X] T009 [US1] Add failing alias-occurrence, self-join, and schema-qualified table regression cases in tests/unit/sqlSourceClassification.test.ts
- [ ] T010 [US1] Add AST cross-check assertions and explicit unsupported-grammar reporting for the US1 dialect fixtures in tests/unit/sqlSourceClassification.test.ts

### Implementation for User Story 1

- [X] T011 [US1] Refactor direct FROM/JOIN source extraction to preserve distinct source occurrences and aliases in src/lib/sql/sqlAnalyzer.ts
- [X] T012 [US1] Resolve extracted direct source occurrences through the scoped CTE-symbol lookup before applying the `TABLE` fallback in src/lib/sql/sqlAnalyzer.ts
- [X] T013 [US1] Update graph-table construction and source lookup paths to use canonical sourceType and alias-safe node IDs in src/lib/sql/sqlAnalyzer.ts
- [X] T014 [US1] Update table and CTE counts plus existing graph edge resolution to consume canonical source occurrences without changing valid existing JOIN behavior in src/lib/sql/sqlAnalyzer.ts
- [X] T015 [US1] Run the focused US1 Vitest suite and TypeScript type check using tests/unit/sqlSourceClassification.test.ts and src/lib/sql/sqlAnalyzer.ts

**Checkpoint**: A physical table and a same-query CTE are semantically distinguishable, including aliased occurrences and schema-qualified tables, without relying on source names in the UI.

---

## Phase 4: User Story 2 - Understand derived and dependent sources (Priority: P2)

**Goal**: Classify derived relations as `SUBQUERY`, preserve CTE-to-CTE and CTE-to-table relationships, and prevent duplicate semantic edges.

**Independent Test**: Analyze a query with multiple dependent CTEs, a recursive CTE, and a derived source joined to a physical table; confirm source types and relationship edges match the query once each.

### Tests for User Story 2

- [X] T016 [US2] Add failing derived FROM, LATERAL/APPLY where supported, and nested CTE-source classification cases in tests/unit/sqlSourceClassification.test.ts
- [X] T017 [US2] Add failing multi-CTE dependency, recursive-CTE, and real-JOIN-versus-RELATES-TO deduplication cases in tests/unit/sqlSourceClassification.test.ts
- [ ] T018 [US2] Add AST cross-check assertions and documented dialect limitations for the US2 source fixtures in tests/unit/sqlSourceClassification.test.ts

### Implementation for User Story 2

- [X] T019 [US2] Update derived-table node creation to emit canonical SUBQUERY sourceType and derived compatibility values in src/lib/sql/sqlAnalyzer.ts
- [X] T020 [US2] Apply scoped CTE symbol resolution inside CTE-body source extraction while retaining recursive CTE references as CTE in src/lib/sql/sqlAnalyzer.ts
- [X] T021 [US2] Update buildGraphJoins and inferred CTE-dependency deduplication to compare resolved source-occurrence IDs and preserve real joins in src/lib/sql/sqlAnalyzer.ts
- [ ] T022 [US2] Ensure malformed or unresolvable source expressions emit UNKNOWN rather than an implicit TABLE in src/lib/sql/sqlAnalyzer.ts
- [X] T023 [US2] Run the focused US2 Vitest suite and TypeScript type check using tests/unit/sqlSourceClassification.test.ts and src/lib/sql/sqlAnalyzer.ts

**Checkpoint**: Derived sources, CTE dependencies, recursive CTEs, and relationship deduplication are semantically correct and independently testable.

---

## Phase 5: User Story 3 - Visually distinguish source categories (Priority: P3)

**Goal**: Make canonical source type visible and filterable in the existing relationship graph, including exports and accessible graph-node semantics.

**Independent Test**: Render a graph fixture containing TABLE, CTE, and SUBQUERY occurrences; verify labels and accessible names use sourceType, and each category filter returns only matching nodes and valid visible-endpoint edges.

### Tests for User Story 3

- [X] T024 [US3] Add failing TABLE, CTE, SUBQUERY, and All category-filter interaction tests in tests/unit/relationshipGraphSourceFilter.test.tsx
- [X] T025 [US3] Add failing node label, alias accessible-name, simplified-node accessibility, and exported graph source-type tests in tests/unit/relationshipGraphSourceFilter.test.tsx

### Implementation for User Story 3

- [X] T026 [US3] Replace CTE-versus-non-CTE filtering with All, Tables, CTEs, and Subqueries sourceType filters in src/app/relationship-graph-visualizer/components/GraphVisualizerContent.tsx
- [X] T027 [US3] Update graph relationship filtering and exported diagram labels to read canonical sourceType in src/app/relationship-graph-visualizer/components/GraphVisualizerContent.tsx
- [X] T028 [US3] Update normal and simplified ReactFlow node labels, icons or badges, and accessible names to expose sourceType and alias metadata in src/app/relationship-graph-visualizer/components/TableNode.tsx
- [X] T029 [US3] Update source-type adaptation passed from analysis nodes into ReactFlow node data without legacy boolean precedence in src/app/relationship-graph-visualizer/components/FlowCanvas.tsx
- [X] T030 [US3] Run the focused graph filter Vitest suite and TypeScript type check using tests/unit/relationshipGraphSourceFilter.test.tsx and src/app/relationship-graph-visualizer/components

**Checkpoint**: Developers can identify and filter physical-table, CTE, and derived-subquery nodes from semantic analysis facts rather than node names.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate all feature contracts, performance, compatibility, and documentation together.

- [X] T031 Add a 50+-source occurrence timing regression that covers analysis and graph-preparation input in tests/unit/sqlSourceClassification.test.ts
- [X] T032 Add regression coverage confirming legacy isCTE and isSubquery compatibility values always agree with sourceType in tests/unit/sqlSourceClassification.test.ts
- [X] T033 Run the full Vitest suite and TypeScript type check from package.json scripts
- [X] T034 Run the production build from package.json and address source-classification build or lint failures in src/lib/sql/sqlAnalyzer.ts and src/app/relationship-graph-visualizer/components
- [ ] T035 Execute every automated and manual scenario in specs/007-sql-source-classification/quickstart.md and record supported dialect limitations in specs/007-sql-source-classification/quickstart.md
- [X] T036 Review the final source-classification diff against specs/007-sql-source-classification/spec.md and specs/007-sql-source-classification/contracts/source-classification-ui.md, removing stale legacy classification branches

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately.
- **Foundational (Phase 2)**: Depends on T001-T002 and blocks all source-classification implementation.
- **US1 (Phase 3)**: Depends on T003-T006; it is the MVP and establishes direct-table/CTE semantics.
- **US2 (Phase 4)**: Depends on US1 source-occurrence resolution because derived sources and CTE dependency edges consume the same canonical IDs.
- **US3 (Phase 5)**: Depends on US1 and US2 because UI must consume final sourceType behavior for all categories.
- **Polish (Phase 6)**: Depends on the completed desired user-story phases.

### User Story Dependency Graph

```text
Setup → Foundational → US1 (P1) → US2 (P2) → US3 (P3) → Polish
```

### Parallel Opportunities

- T001 and T002 may run in parallel because they create separate test files.
- Within US1, T008-T010 are sequential additions to the same test file and complete before T011-T014 begins.
- Within US2, T016-T018 are sequential additions to the same test file and complete before T019-T022 begins.
- Within US3, T024 and T025 are sequential additions to the same test file and complete before T026-T029 begins.
- T031 and T032 are sequential additions to the same test file after US3.

## Parallel Execution Examples

### User Story 1

```text
Task: "Add failing table-versus-CTE classification regression cases for MySQL, PostgreSQL, SQL Server, and Oracle in tests/unit/sqlSourceClassification.test.ts"
Task: "Add failing alias-occurrence, self-join, and schema-qualified table regression cases in tests/unit/sqlSourceClassification.test.ts"
Task: "Add AST cross-check assertions and explicit unsupported-grammar reporting for the US1 dialect fixtures in tests/unit/sqlSourceClassification.test.ts"
```

These three behavior-focused tasks share one test file and should be completed sequentially before T011.

### User Story 2

```text
Task: "Add failing derived FROM, LATERAL/APPLY where supported, and nested CTE-source classification cases in tests/unit/sqlSourceClassification.test.ts"
Task: "Add failing multi-CTE dependency, recursive-CTE, and real-JOIN-versus-RELATES-TO deduplication cases in tests/unit/sqlSourceClassification.test.ts"
Task: "Add AST cross-check assertions and documented dialect limitations for the US2 source fixtures in tests/unit/sqlSourceClassification.test.ts"
```

### User Story 3

```text
Task: "Add failing TABLE, CTE, SUBQUERY, and All category-filter interaction tests in tests/unit/relationshipGraphSourceFilter.test.tsx"
Task: "Add failing node label, alias accessible-name, simplified-node accessibility, and exported graph source-type tests in tests/unit/relationshipGraphSourceFilter.test.tsx"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phases 1 and 2.
2. Complete T008-T015 for direct table/CTE classification.
3. Run the US1 focused suite and `npm run type-check`.
4. Validate the `orders` / `customer_orders` scenario before continuing.

### Incremental Delivery

1. Deliver US1 to establish correct direct table and CTE semantics.
2. Deliver US2 to add derived sources, dependency consistency, and recursive behavior.
3. Deliver US3 to expose all canonical source categories through graph labels, export, and filters.
4. Complete Phase 6 only after each story passes its independent test criteria.

## Notes

- Every task uses the required checkbox, task ID, optional parallel marker, story label where applicable, and exact target path.
- No new package, API, persistence layer, or parser rewrite is included.
- Tests must demonstrate red status before the matching source or graph behavior implementation is changed.