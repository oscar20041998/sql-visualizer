---
description: "Task list for Relationship Graph UX"
---

# Tasks: Relationship Graph UX

**Input**: Design documents from `/specs/019-graph-visualizer-ux/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/graph-view-ui.md](./contracts/graph-view-ui.md), [quickstart.md](./quickstart.md), [tdd/test-list.md](./tdd/test-list.md)

**Tests**: MANDATORY. Follow [tdd/test-list.md](./tdd/test-list.md). Write the failing test named in each story before that story's implementation tasks. Do not mark an implementation task complete because similar code already exists. Commands come from `.specify/memory/tdd-profile.md`: `npm test -- <file>` and `npm test`. Do not add a package and do not edit `src/lib/sql/sqlAnalyzer.ts`.

**Organization**: Tasks are grouped by user story. Within each story, test tasks come before implementation tasks.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to
- Include exact file paths in descriptions

## Path Conventions

Single Next.js app. Graph UI lives in `src/app/relationship-graph-visualizer/components/`. Locales live in `src/locales/`. Tests live in `tests/unit/`.

## Requirement coverage map

| Requirement | Tasks |
|---|---|
| FR-001, FR-002, FR-003 | T007, T008, T009, T010 |
| FR-004, FR-005 | T011, T012, T013 |
| FR-006, FR-007, FR-008, FR-009 | T014, T015, T016 |
| FR-010, FR-011 | T010, T017, T018, T019 |
| FR-012 | T017, T021, T022 |
| FR-013 | T017, T020 |
| FR-014 | T023, T024 |
| FR-015, FR-016 | T004, T005, T006, T011, T017, T021, T024 |
| FR-017, SC-007 | T007, T008, T025 |
| A1–A4, A24 | T007, T008, T009, T010 |
| A5–A8, A25 | T011, T012, T013 |
| A9–A13, A28 | T014, T015, T016 |
| A14–A18, A22, A23, A26, A29, A30 | T017, T018, T019, T020, T021, T022 |
| A19–A21 | T023, T024 |
| A27 | T004, T005, T006 |

## TDD order change

The previous task list implemented locales and several page behaviors before their tests existed. This revision renumbers from the old T003 onward so numeric order matches test-first execution:

- Old T003/T004 locale edits are now T005/T006 and wait for new T004.
- Old T005 types are now T003.
- Old T006–T009 are now T007–T010, and T007 also owns the old T023 50-source test.
- Old T010–T015 are now T011–T016.
- Old T016–T022 wait for new T017.
- Old T021/T022 are now T023/T024.
- Old T024/T025 are now T025/T026.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Lock the change boundary before any graph behavior changes.

- [X] T001 Confirm `package.json` has `reactflow` and no `dagre`, `elkjs`, or `d3-force` dependency, and record that this feature must not add one
- [X] T002 Confirm `src/lib/sql/sqlAnalyzer.ts` is out of scope by listing the graph fields this feature may only read: `tables`, `joins`, `rawSql`, `dialect`, `joinAnalysisDetails`, `metrics`, `complexity`, `ctes`

**Checkpoint**: No new dependency and no parser edit are allowed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, then a failing locale test, then both locale files.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Add the in-memory graph view types from `specs/019-graph-visualizer-ux/data-model.md` in `src/app/relationship-graph-visualizer/components/graphView.ts`: category filter, `includeNeighbors` defaulting to true, query fingerprint, and optional suggestion `relatedSourceIds`
- [X] T004 Add failing locale tests in `tests/unit/relationshipGraphLocales.test.ts` for A27, U21, and U22 in `specs/019-graph-visualizer-ux/tdd/test-list.md`, asserting English and Vietnamese keys for fit, rearrange, neighbor control, all three filter states, empty filter, image-export failure, and panel actions
- [X] T005 Add the English keys expected by `tests/unit/relationshipGraphLocales.test.ts` in `src/locales/en.ts`, and replace the misleading `CTE's Relationship` wording
- [X] T006 Add the same keys in `src/locales/vi.ts` with Vietnamese copy that matches `src/locales/en.ts`

**Checkpoint**: T004 is red before T005. It is green only after T005 and T006. Layout, filter, and canvas behavior are still unchanged.

---

## Phase 3: User Story 1 - Arrange a readable relationship map (Priority: P1) 🎯 MVP

**Goal**: Initial placement follows saved layout and spacing, dragged nodes stay put, and Fit / Rearrange are available on the page.

**Independent Test**: With hierarchical/spacious settings, open a multi-source query, drag a node, select another node, and confirm the drag remains until Rearrange or a different analyzed query.

### Tests for User Story 1

- [X] T007 [US1] Add failing tests in `tests/unit/relationshipGraphLayout.test.ts` for A1, A2, A4, A24, and U1–U11 in `specs/019-graph-visualizer-ux/tdd/test-list.md` before changing layout code: three layouts differ, spacing multipliers change gaps, coordinates are deterministic, drags survive selection, a new query fingerprint resets placement, and 50 sources arrange within 1 second

### Implementation for User Story 1

- [X] T008 [US1] Implement `computePlacements` and the placement-map rules in `src/app/relationship-graph-visualizer/components/graphLayout.ts` until `tests/unit/relationshipGraphLayout.test.ts` passes, using `specs/019-graph-visualizer-ux/research.md`
- [X] T009 [US1] Apply that placement map in `src/app/relationship-graph-visualizer/components/FlowCanvas.tsx`, write drags back from `onNodesChange`, and expose `fitView()` plus `relayout()` on `FlowCanvasHandle`
- [X] T010 [US1] Add labeled Fit and Rearrange buttons in `src/app/relationship-graph-visualizer/components/GraphVisualizerContent.tsx` that call the canvas handle and use the locale keys from `src/locales/en.ts`

**Checkpoint**: User Story 1 works with the existing category filter still category-only. T007 was red before T008.

---

## Phase 4: User Story 2 - Recognize each source without guessing (Priority: P1)

**Goal**: Every card and list row shows source category as text, and join color is not the category signal.

**Independent Test**: A fixture with TABLE, CTE, and SUBQUERY shows that text on full cards, compact cards, and the source list without using the source name.

### Tests for User Story 2

- [X] T011 [US2] Add failing component tests in `tests/unit/relationshipGraphIdentity.test.tsx` for A5–A8 and A25 in `specs/019-graph-visualizer-ux/tdd/test-list.md`: full and compact cards, list rows, and search results show category text; alias is separate from name; shared names with different aliases stay distinguishable; category text remains when relationship color is absent

### Implementation for User Story 2

- [X] T012 [P] [US2] Show `sourceType` text on both full and compact cards in `src/app/relationship-graph-visualizer/components/TableNode.tsx`, and use a category chrome color instead of the first incident join color
- [X] T013 [US2] Show the same category text for every source type in the inspector list and toolbar search results in `src/app/relationship-graph-visualizer/components/GraphVisualizerContent.tsx`, not only for CTE

**Checkpoint**: User Stories 1 and 2 both work. Join legend colors in `src/app/common/colorConstant.ts` stay relationship colors. T011 was red before T012.

---

## Phase 5: User Story 3 - Filter sources without hiding promised relationships (Priority: P2)

**Goal**: Category filter stays category-only when the neighbor control is off, and includes direct neighbors when it is on. Counts and labels match the visible graph.

**Independent Test**: CTE filter with neighbors on shows the CTE-to-table edge; with neighbors off that edge disappears; counts match the drawn items.

### Tests for User Story 3

- [X] T014 [US3] Add failing tests in `tests/unit/relationshipGraphVisibility.test.ts` for A9, A10, U12–U18, and U33 in `specs/019-graph-visualizer-ux/tdd/test-list.md`, and keep the characterization tests U19 and U20 green in `tests/unit/relationshipGraphSourceFilter.test.tsx`

### Implementation for User Story 3

- [X] T015 [US3] Implement `filterVisibleTables` in `src/app/relationship-graph-visualizer/components/graphVisibility.ts` without changing `filterTablesBySourceType` or `filterJoinsBySourceType` in `src/app/relationship-graph-visualizer/components/GraphVisualizerContent.tsx`
- [X] T016 [US3] Add the default-on neighbor control, state-specific filter labels, and visible source/relationship counts in `src/app/relationship-graph-visualizer/components/GraphVisualizerContent.tsx`; clear selection when the selected source becomes hidden

**Checkpoint**: User Story 3 is independently testable. T014 was red before T015. The feature 007 category-only test still passes.

---

## Phase 6: User Story 4 - Operate the graph without a crowded toolbar (Priority: P2)

**Goal**: One search, labeled actions, shared panel budget, suggestion navigation, and readable join details.

**Independent Test**: On a 1366×768 viewport, identify every primary action by visible text, search once, open all three detail views, and still see the toolbar and map.

### Tests for User Story 4

- [X] T017 [US4] Add failing component tests in `tests/unit/relationshipGraphPage.test.tsx` for A3, A11–A18, A20–A23, A26, A28–A30, and U23–U28 in `specs/019-graph-visualizer-ux/tdd/test-list.md` before editing the page controls: one search, visible labels, shared panel budget, suggestion activation, keyboard dismiss, join display names, full conditions, empty analysis, and empty filter

### Implementation for User Story 4

- [X] T018 [US4] Remove the inspector search field from `src/app/relationship-graph-visualizer/components/GraphVisualizerContent.tsx` and make the toolbar search select and reveal one visible source in the remaining list
- [X] T019 [US4] Replace `h-[calc(100vh-0px)]` and the fixed 280px/320px panel heights in `src/app/relationship-graph-visualizer/components/GraphVisualizerContent.tsx`, `src/app/relationship-graph-visualizer/components/SuggestionPanel.tsx`, and `src/app/relationship-graph-visualizer/components/ExtractedTablesPanel.tsx` with one shared height budget inside the `h-full` shell
- [X] T020 [P] [US4] Resolve relationship ends to display name plus alias, and append an ellipsis only when the condition exceeds the preview limit, in `src/app/relationship-graph-visualizer/components/JoinAnalysisPanel.tsx`
- [X] T021 [P] [US4] Make suggestion dismiss reachable without hover and add an activate action in `src/app/relationship-graph-visualizer/components/SuggestionPanel.tsx`
- [X] T022 [US4] Attach `relatedSourceIds` in `generateSuggestions` inside `src/app/relationship-graph-visualizer/components/GraphVisualizerContent.tsx` and select the first visible related source when a suggestion is activated

**Checkpoint**: User Story 4 does not require a second search or a tooltip to identify actions. T017 was red before T018.

---

## Phase 7: User Story 5 - Share the graph that is currently on screen (Priority: P3)

**Goal**: Diagram text and a saved SVG match the visible, filtered graph, including source categories and theme background.

**Independent Test**: Apply a category filter, copy the diagram, save the image, and confirm hidden sources are absent. If the SVG cannot be built, the page explains that and diagram copy still works.

### Tests for User Story 5

- [X] T023 [US5] Add failing tests in `tests/unit/relationshipGraphExport.test.ts` for A19–A21 and U29–U32 in `specs/019-graph-visualizer-ux/tdd/test-list.md`: filtered diagram text names visible categories and omits hidden ids; the image payload follows the theme and visible set; a missing SVG leaves diagram text available

### Implementation for User Story 5

- [X] T024 [US5] Download a theme-aware SVG file of the visible map from `src/app/relationship-graph-visualizer/components/GraphVisualizerContent.tsx`, show the locale failure message when the surface SVG is missing, and keep diagram copy available

**Checkpoint**: User Story 5 can be validated from the export actions without a new route. T023 was red before T024.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Run the profile commands and record the checks automation cannot prove.

- [X] T025 Run `npm test -- tests/unit/relationshipGraphLayout.test.ts tests/unit/relationshipGraphVisibility.test.ts tests/unit/relationshipGraphLocales.test.ts tests/unit/relationshipGraphIdentity.test.tsx tests/unit/relationshipGraphPage.test.tsx tests/unit/relationshipGraphExport.test.ts tests/unit/relationshipGraphSourceFilter.test.tsx` and then `npm test` from the repository root
  - 2026-10-15: feature command 7 files / 43 tests passed; full `npm test` 74 files / 691 tests, 0 failed; `npm run type-check` 0 errors. Evidence and the two fixes (stale `sqlComparisonPanel` assertions, `graphLayout.ts` narrowing) recorded in [tdd/cycle-log.md](./tdd/cycle-log.md).
- [ ] T026 Walk the manual checks in `specs/019-graph-visualizer-ux/quickstart.md` for 1366×768 pixel fit, light/dark contrast, and touch dismiss, and record any gap against `specs/019-graph-visualizer-ux/tdd/test-list.md` before calling the feature done
  - 2026-10-15 status: automated portions done — light/dark contrast measured and recorded in [tdd/verification.md](./tdd/verification.md) (found: light-theme node name/chip text fails WCAG AA), non-hover/keyboard dismiss proven by A29/U28, shared 45vh panel budget proven by A16/A30. **Remaining for a human/browser walk**: 1366×768 pixel fit, physical touch-device dismiss, and a decision on the light-theme node heading contrast gap.

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) → Foundational (Phase 2) → user stories → Polish
- T004 must fail before T005 and T006
- T007 must fail before T008
- T011 must fail before T012
- T014 must fail before T015
- T017 must fail before T018
- T023 must fail before T024
- US2 card work in `TableNode.tsx` may proceed beside US1 `FlowCanvas.tsx` only after T011 is red
- US3 integrates after US1 so a filtered list does not reset placements
- US4 page edits follow US1 and US3 because they share `GraphVisualizerContent.tsx`
- US5 follows US3 so export cannot leak hidden sources

### User Story Dependencies

- **US1 (P1)**: After Phase 2. No dependency on other stories. MVP.
- **US2 (P1)**: After Phase 2. List badges follow US1 only because they edit the same page file
- **US3 (P2)**: After Phase 2. Integrates with the page after US1
- **US4 (P2)**: After US1 and US3 page edits
- **US5 (P3)**: After US3 visible-set behavior

### Parallel Opportunities

- T005 and T006 after T004 is red
- T012 with T009 after T011 is red
- T020 with T021 after T017 is red
- Do not edit `tests/unit/relationshipGraphLayout.test.ts` from two tasks at once

---

## Parallel Example: User Story 1

```text
T006 tests/unit/relationshipGraphLayout.test.ts
T007 tests/unit/relationshipGraphLayout.test.ts
T008 src/app/relationship-graph-visualizer/components/graphLayout.ts
```

T008 starts only after T007 has failed for the missing behavior. T009 waits for T008. T010 waits for T009.

## Parallel Example: User Story 4

```text
T020 src/app/relationship-graph-visualizer/components/JoinAnalysisPanel.tsx
T021 src/app/relationship-graph-visualizer/components/SuggestionPanel.tsx
```

Both wait until T017 is red.
---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phase 1 and Phase 2
2. Complete T006–T009
3. Stop and validate the independent test for US1
4. Demo a map that follows Settings and does not jump when a node is selected

### Incremental Delivery, including the red locale test
2. Complete T007–T010
1. US1 layout retention
2. US2 category text
3. US3 neighbor filter
4. US4 toolbar and details
5. US5 export
6. Profile suite command and manual viewport notes

---

## Notes

- Every task uses the checklist format: checkbox, ID, optional `[P]`, story label only on story phases, and a file path
- Do not persist dragged positions or the neighbor toggle
- Do not show `metrics.totalJoinCount` as the relationship count while a category filter is active
- Do not implement a behavior before its named test is failing for the right reason
- Commit after each story checkpoint
