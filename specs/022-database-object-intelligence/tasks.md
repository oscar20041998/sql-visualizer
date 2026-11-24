---
description: "Implementation tasks for Database Object Intelligence"
---

# Tasks: Database Object Intelligence

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [workspace contract](contracts/workspace.md), [validation matrix](contracts/validation-matrix.md), [quickstart.md](quickstart.md).

**Scope**: Add only verified missing capabilities; retain all current workflows. Existing `src/lib/sql/viewAnalyzer.ts`, `functionAnalyzer.ts`, `storeprocedureAnalyzer.ts`, and `triggerAnalyzer.ts` must be audited and reused where applicable, not duplicated. Proposed new paths below are targets, not permission to create parallel implementations if the audit finds an equivalent. Respect the user's existing approved Query Input design.

**TDD**: Use the traced behaviors in [tdd/test-list.md](tdd/test-list.md) and `.specify/memory/tdd-profile.md`. First characterize existing behavior against untouched code; record green baseline evidence rather than inventing RED. For each new behavior, write and run a focused failing test first, record valid RED in `tdd/cycle-log.md`, implement the smallest change, rerun GREEN, refactor and rerun. Do not mark test or implementation tasks complete without evidence. Test tasks below specify behavior batches; execute each batch one behavior at a time, not all tests ahead of all implementations. Record the full-suite result at completion.

**Format**: `[P]` means independently executable with disjoint files after stated prerequisites; `[USn]` identifies the story. Paths are repository-relative.

## Phase 1: Setup

- [X] T001 Record baseline commands and outputs for existing query, CTE, MyBatis, graph, history, settings, access and AI journeys in `specs/022-database-object-intelligence/quickstart.md`; identify missing runnable regression coverage without claiming unexecuted tests passed (FR-002, SC-003).
- [X] T002 Audit `src/lib/sql/viewAnalyzer.ts`, `src/lib/sql/functionAnalyzer.ts`, `src/lib/sql/storeprocedureAnalyzer.ts`, `src/lib/sql/triggerAnalyzer.ts`, `src/lib/sql/sqlAnalyzer.ts` and existing UI/tests; record reuse decisions and gaps in `specs/022-database-object-intelligence/research.md` (FR-001–003).
- [X] T003 Build an evidence-backed initial matrix in `specs/022-database-object-intelligence/contracts/capability-matrix.md` for query, CTE, view, procedure, function and trigger across all four dialects, with fixtures, tested construct scope, status or explicitly unknown pending investigation, limitations and dates; do not infer support from package availability (FR-001, SC-001).

## Phase 2: Foundational prerequisites

- [ ] T004 Add focused dialect cross-check tests in `tests/unit/sql-cross-check.test.ts` for supported and unsupported MySQL, PostgreSQL, SQL Server and Oracle cases, including regex/AST disagreement and explicit uncertainty (FR-001, constitution I).
- [ ] T005 Extend `src/lib/sql/dialectValidator.ts` and existing parser adapters as warranted by T004 so supported extraction is cross-checked across dialects; record unvalidated constructs as unsupported/partial rather than inventing agreement (depends on T004).
- [ ] T006 Add session lifecycle and revision-race tests in `tests/unit/object-intelligence-session.test.ts` for navigation, reload, sign-out/identity change, non-persistence and stale asynchronous results (FR-027, FR-029).
- [ ] T007 Define shared source, dialect, evidence, status, revision and session types in `src/lib/sql/objectIntelligenceTypes.ts`, reusing equivalent audited types; implement memory-only session lifecycle in `src/lib/store.ts` without adding definitions or consent to persisted `partialize` or history (depends on T006).
- [ ] T008 Add focused conservative identity tests in `tests/unit/object-intelligence-identity.test.ts` covering dialect, qualification, quoted identifiers, kind, unknown schema and ambiguous overloads (FR-030).
- [ ] T009 Implement evidenced identity comparison in `src/lib/sql/objectIntelligenceIdentity.ts`; unknown or ambiguous identities remain unresolved, never silently merged (depends on T008).

**Gate**: Complete inventory, baseline and shared prerequisites before story implementation. Parser gaps are release blockers for claims they affect, not a reason to block unrelated existing journeys.

## Phase 3: User Story 1 — Analyze a database object (P1, MVP)

**Goal**: Analyze one supplied object honestly while preserving existing query/CTE/MyBatis workflows.

**Independent test**: For each dialect, exercise representative supported, partial, unsupported and ambiguous inputs; verify type, confidence, metadata, source and limitations match evidence, and existing query/CTE/MyBatis still work.

### Tests

- [ ] T010 [P] [US1] Add detection/status tests in `tests/unit/object-intelligence-detection.test.ts` for selected/detected query, CTE, view, routine and trigger, malformed, dialect-mismatched and unsupported inputs (FR-004–005, SC-002).
- [ ] T011 [P] [US1] Add fixture-backed object analysis tests in `tests/unit/object-intelligence-analysis.test.ts` and `tests/fixtures/object-intelligence/` for four dialects, view metadata/query and routine/trigger metadata/body/limitations; mark unproven constructs unsupported (FR-006–008).
- [ ] T012 [P] [US1] Add single-object UI integration tests in `tests/unit/object-intelligence-workspace.test.tsx` for dialect, type, status, source, limitations and unchanged existing input workflows (FR-002, FR-004–005).

### Implementation

- [ ] T013 [US1] Extend the audited analyzers in `src/lib/sql/viewAnalyzer.ts`, `src/lib/sql/functionAnalyzer.ts`, `src/lib/sql/storeprocedureAnalyzer.ts` and `src/lib/sql/triggerAnalyzer.ts` only for fixture-proven missing constructs, retaining evidence and explicit unsupported details (T011).
- [ ] T014 [US1] Integrate detection, analyzer dispatch, metadata and cross-check provenance in `src/lib/sql/objectIntelligence.ts`, reusing `src/lib/sql/sqlAnalyzer.ts` for reliably extracted queries and the existing MyBatis conversion unchanged (T010–T011, T013).
- [ ] T015 [US1] Confirm the proposed additive entry and result layout with the user before visual changes; implement it in `src/app/query-input/page.tsx` and `src/app/query-input/components/ObjectIntelligencePanel.tsx`, preserving approved tabs, 50/50 input/review, current dialect control and existing functionality (T012, T014).
- [ ] T016 [US1] Update `specs/022-database-object-intelligence/contracts/capability-matrix.md` with actual passing fixture evidence and visible scope/limitations for each released cell; do not claim a matrix cell fully supported without evidence (SC-001–002).

## Phase 4: User Story 2 — Explore source, structure and findings (P1)

**Goal**: Select supported extracted statements and navigate to source-backed evidence.

**Independent test**: Use a multi-statement fixture to select a statement, inspect its results and open a known finding location; unavailable locations and unsupported structure remain explicit.

### Tests

- [ ] T017 [P] [US2] Add source-boundary and offset tests in `tests/unit/object-intelligence-source.test.ts` for extractable statements, original line/column mapping and uncertain boundaries (FR-009, FR-011).
- [ ] T018 [P] [US2] Add interaction tests in `tests/unit/object-intelligence-source-panel.test.tsx` for statement selection, line numbers, search, copy, expand/collapse, supported formatting and source/graph navigation, including unavailable evidence (FR-010–011, FR-016).

### Implementation

- [ ] T019 [US2] Extend `src/lib/sql/objectIntelligence.ts` and existing object analyzers to expose only proven statement boundaries, original ranges, query-analysis results and limitations (T017).
- [ ] T020 [US2] Implement source and structure controls in `src/app/query-input/components/ObjectSourcePanel.tsx`, wire them to `src/app/query-input/components/ObjectIntelligencePanel.tsx`, and reveal known source/graph evidence without fabricating missing locations (T018–T019).

## Phase 5: User Story 3 — Explore dependencies and impact (P1)

**Goal**: Ingest multiple definitions and explore evidenced dependencies and static reverse impact.

**Independent test**: Paste and import a chain with a cycle and missing definition; compare graph/list/impact, navigate away and back, reload, and resolve duplicate keep/replace without silent merges.

### Tests

- [ ] T021 [P] [US3] Add multi-paste/file ingestion and conflict tests in `tests/unit/object-intelligence-ingestion.test.ts` for source provenance, per-file failures, known duplicate keep/replace, ambiguous identity and cancellation with no mutation (FR-028–030).
- [ ] T022 [P] [US3] Add relationship/traversal tests in `tests/unit/object-intelligence-dependencies.test.ts` for read/write/call/reference provenance, missing/ambiguous targets, chains, cycle-safe traversal and reverse impact depth (FR-012–014, SC-004).
- [ ] T023 [P] [US3] Add workspace integration tests in `tests/unit/object-intelligence-graph.test.tsx` for graph/list parity, search, direction, confidence, cycle/incomplete display, source navigation and session lifecycle (FR-013–014, FR-028–030).

### Implementation

- [ ] T024 [US3] Implement multi-definition splitting, multi-file intake, per-file errors and transactional conflict resolution in `src/lib/sql/objectIntelligenceIngestion.ts`, using the proven identity rules and leaving existing XML import intact (T021).
- [ ] T025 [US3] Implement evidenced object dependency edges and cycle-safe outgoing/reverse traversal in `src/lib/sql/objectIntelligenceDependencies.ts`; resolve only supplied known identities and mark unknown/ambiguous coverage (T022).
- [ ] T026 [US3] Extend `src/lib/store.ts` for session collection, conflict choices and affected-analysis/graph/AI invalidation on replace or edit; retain navigation persistence without browser storage, history, URL or source logs (T021, T024).
- [ ] T027 [US3] Add multiple input and conflict controls in `src/app/query-input/components/ObjectIntelligencePanel.tsx` and graph/searchable list/impact UI in `src/app/query-input/components/ObjectDependencyPanel.tsx`, reusing `src/app/relationship-graph-visualizer/components/FlowCanvas.tsx` where appropriate without treating JOIN edges as object dependencies (T023–T026).

## Phase 6: User Story 7 — Preserve the existing product (P1)

**Goal**: Continuously verify existing journeys and reuse rather than replace existing functionality.

**Independent test**: Run pre-change and post-change query, CTE, MyBatis, graph, navigation, history, settings, access and AI regression journeys and compare observable results.

### Tests

- [ ] T028 [P] [US7] Extend `tests/unit/query-input-workflow.test.tsx`, `tests/unit/AppLayout.test.tsx` and `tests/unit/query-history-page.test.tsx` only where needed to catch regressions introduced by additive object/session entry, shell navigation or history boundaries (FR-002–003).
- [ ] T029 [P] [US7] Extend `tests/unit/relationshipGraphPage.test.tsx`, `tests/unit/query-input-parameters.test.tsx`, `tests/unit/home-preferences.test.tsx`, `tests/unit/guestAccess.test.tsx` and `tests/unit/aiService.test.ts` where changed integration points require regression coverage; record before/after results in `specs/022-database-object-intelligence/quickstart.md` (SC-003).

### Implementation

- [ ] T030 [US7] Resolve feature-caused compatibility failures in touched existing `src/app/`, `src/components/WorkspaceLayout.tsx` and `src/lib/` integration points without changing intended routes, preferences, permissions, AI or persisted history; document any separately authorized change in `specs/022-database-object-intelligence/research.md` (T028–T029).

**Continuous gate**: Run applicable US7 regression checks after each subsequent story as well as here; this story may be tested independently against the existing product.

## Phase 7: User Story 4 — Review evidence-based complexity and findings (P2)

**Goal**: Present defensible complexity and findings, without invented counts or runtime claims.

**Independent test**: Analyze a fixture with known statements, joins and issue; verify counts, origin, severity, evidence, recommendation and source navigation, and distinguish unknown from zero.

### Tests

- [ ] T031 [P] [US4] Add fact/metric/finding tests in `tests/unit/object-intelligence-findings.test.ts` for evidenced counts, unsupported values, static versus runtime claims, severity, confidence and source range (FR-015–016).
- [ ] T032 [P] [US4] Add UI tests in `tests/unit/object-intelligence-findings-panel.test.tsx` for facts versus static observations versus AI suggestions, unavailable values and source navigation (FR-010, FR-015–016).

### Implementation

- [ ] T033 [US4] Extend `src/lib/sql/complexityScorer.ts` and `src/lib/sql/objectIntelligence.ts` only where required to derive metrics/findings from evidenced supported constructs; retain unknown rather than zero and propagate limitations (T031).
- [ ] T034 [US4] Add evidence-based metrics/findings presentation to `src/app/query-input/components/ObjectIntelligencePanel.tsx`, reusing existing components where suitable and integrating location navigation (T032–T033).

## Phase 8: User Story 5 — Request optional AI assistance safely (P2)

**Goal**: Offer explicit, evidence-grounded AI actions with provider-specific consent and user-controlled rewrites.

**Independent test**: Stub providers; request explanation/rewrite, cancel/confirm external transmission, switch provider, compare/copy/apply, simulate failure and verify deterministic results remain intact.

### Tests

- [ ] T035 [P] [US5] Add stubbed request tests in `tests/unit/object-intelligence-ai-consent.test.ts` for local/external choice, first-send confirmation per session/provider, cancellation with zero sends, provider switch, sign-out/reload, existing guest/authorization policy and unchanged existing AI flows (FR-020, FR-022, FR-027).
- [ ] T036 [P] [US5] Add grounding and safety tests in `tests/unit/object-intelligence-ai-context.test.ts` for all seven requested actions, bounded context, untrusted instructions, secret exclusion, citation/limitations where available and no source/secret logging (FR-017–018, FR-021).
- [ ] T037 [P] [US5] Add interaction tests in `tests/unit/object-intelligence-ai-panel.test.tsx` for explicit requests, no automatic AI calls on edits or parameter changes, AI labeling, streaming where supported, failure/recovery, original/suggestion compare and copy, explicit apply and stale revision rejection (FR-019–020, FR-026, SC-008).

### Implementation

- [ ] T038 [US5] Extend existing prompt registry in `src/lib/ai/prompts/registry.ts` and add grounded action templates in `src/lib/ai/prompts/templates/objectIntelligence.ts`; use bounded verified facts and treat SQL as untrusted data (T036).
- [ ] T039 [US5] Integrate new action requests through `src/lib/ai/aiService.ts` and existing `src/app/api/ai/generate/route.ts` authorization/provider policy, ensuring no client-to-cloud credentials, unintended sends or source/secret logging (T035–T036, T038).
- [ ] T040 [US5] Add provider-scoped ephemeral confirmation in `src/lib/store.ts` and `src/app/query-input/components/ObjectAiPanel.tsx`; cancellation sends nothing, provider changes re-confirm, and existing AI workflows stay unchanged (T035, T039).
- [ ] T041 [US5] Add explicit actions, AI attribution, failure recovery and safe revision-bound comparison/copy/apply to `src/app/query-input/components/ObjectAiPanel.tsx`, reusing existing comparison and incremental/streaming behavior where available (T037, T040).

## Phase 9: User Story 6 — Cohesive and accessible workspace (P2)

**Goal**: Deliver a Hallmark-guided, bilingual, responsive and accessible experience in the existing design system.

**Independent test**: Complete the object-analysis, evidence and dependency journey in Vietnamese and English using keyboard and pointer on desktop and a narrow viewport.

### Tests

- [ ] T042 [P] [US6] Add accessibility, status and localization tests in `tests/unit/object-intelligence-accessibility.test.tsx` for keyboard/focus, graph-list alternative, stage-specific loading/empty/partial/unsupported/error states and both locales (FR-023–025).
- [ ] T043 [P] [US6] Add responsive/theme/reduced-motion tests in `tests/unit/object-intelligence-responsive.test.tsx` for reachable controls, light/dark and selected accent where testable; record actual browser checks separately (FR-024, SC-006).

### Implementation

- [ ] T044 [US6] Review proposed Hallmark layout and interaction choices with the user for confirmation before final presentation; record their decisions in `specs/022-database-object-intelligence/research.md`, preserve `design.md`, current shell and approved Query Input UX (FR-023).
- [ ] T045 [US6] Add equivalent labels, limitation messages and recovery actions to `src/locales/en.ts` and `src/locales/vi.ts` using existing localization conventions (T042).
- [ ] T046 [US6] Finish responsive keyboard-operable panels, visible focus, contrast and reduced motion in `src/app/query-input/components/ObjectIntelligencePanel.tsx`, `src/app/query-input/components/ObjectSourcePanel.tsx`, `src/app/query-input/components/ObjectDependencyPanel.tsx` and `src/app/query-input/components/ObjectAiPanel.tsx`; make all states and accessible graph alternatives usable (T042–T045).
- [ ] T047 [US6] With user permission, review changed surfaces across desktop/tablet/mobile, themes and locales, run the applicable Hallmark static/render sweep, and obtain user style confirmation; record outcomes and any limitations in `specs/022-database-object-intelligence/quickstart.md` (SC-006).

## Phase 10: Polish and release gates

- [ ] T048 Add focused large-object and no-per-edit-AI tests in `tests/unit/object-intelligence-responsiveness.test.ts`; establish measurable fixture sizes and responsiveness thresholds from observed baseline, obtain approval for any behavior-changing input limits, and report actionable failures or partial results (FR-026).
- [ ] T049 Optimize feature-caused responsiveness issues in `src/lib/sql/objectIntelligence.ts` and affected `src/app/query-input/components/` only as needed for T048; preserve incremental feedback and avoid automatic AI calls.
- [ ] T050 Define and run reproducible >50-table analysis-plus-render benchmark against the specified single-GPU reference machine; record hardware, fixture, boundaries, cold/warm runs and actual timings in `specs/022-database-object-intelligence/quickstart.md`; ≤1 second is required, never claim a pass without a run (SC-007).
- [ ] T051 Run targeted and full regression, then `npm run type-check` and `npm run build` sequentially; record exact commands, outputs and unresolved failures in `specs/022-database-object-intelligence/quickstart.md` (SC-003).
- [ ] T052 Conduct a documented review with at least five target users: at least four must independently identify the object, find source-backed evidence, explore a dependency and distinguish AI output; record results in `specs/022-database-object-intelligence/quickstart.md` (SC-005).
- [ ] T053 Update user-facing capability/limitations and privacy documentation in `README.md` and `specs/022-database-object-intelligence/contracts/capability-matrix.md`; identify any unsupported master-prompt targets and obtain explicit user approval for exclusions before declaring the overall initiative complete (SC-001, SC-009).

## Dependencies and execution order

- Setup T001–T003 → foundation T004–T009. Cross-check tests precede cross-check implementation; session and identity tests precede their implementation.
- US1 depends on foundation; US2 depends on US1's analysis and panel; US3 depends on foundation plus US1 integration. US4 depends on US1 and US2's evidence navigation. US5 depends on US1's results and foundation's session/revision model. US6 integrates the delivered US1–US5 surfaces. US7 establishes independent regression coverage and runs throughout all slices.
- US2 and US3 have conceptually separate tests after US1, but serialize edits to shared `ObjectIntelligencePanel.tsx`, `objectIntelligence.ts` or `store.ts`. US4 and US5 tests can be prepared independently once prerequisites exist; serialize shared-file integration. Final gates depend on all applicable story work; do not substitute a partial release for overall completion.
- Pull forward the applicable characterization cases from T028–T029 before modifying each existing integration point; rerun them after each relevant slice. T030 addresses any feature-caused regression after the relevant change.
- Each test behavior has its own RED → GREEN → REFACTOR sequence; prerequisites and tests precede corresponding implementation. `[P]` applies only to disjoint task files with prerequisites met; fixture/shared files must not be edited concurrently.

### Parallel examples by story

- US1: T010, T011 and T012 can be written independently after foundation.
- US2: T017 and T018 can be written independently after US1.
- US3: T021, T022 and T023 can be written independently after US1; T024 and T025 follow their respective RED tests and touch distinct modules.
- US7: T028 and T029 may run in parallel only when T029 selects files disjoint from T028.
- US4: T031 and T032 can be written independently after US2.
- US5: T035, T036 and T037 can be written independently after US1/session prerequisites.
- US6: T042 and T043 can be written independently after relevant surfaces exist.

## Implementation strategy

1. Establish baseline, inventory and foundation; audit existing analyzers before adding logic.
2. Deliver US1 as the MVP with honest supported/partial/unsupported states and unchanged legacy journeys; verify independently and disclose limitations.
3. Add source navigation and multi-definition dependency/impact slices, continually run US7 regressions, then deliver grounded findings and explicitly requested AI.
4. Confirm Hallmark direction with the user, complete accessible/localized presentation and execute release gates. Incremental releases may disclose incomplete support; complete the initiative only with evidence for every target or user-approved exclusions.
