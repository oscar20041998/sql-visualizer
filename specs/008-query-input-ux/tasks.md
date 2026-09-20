---

description: "Task list for Query Input UX improvement"
---

# Tasks: Query Input UX Improvement

**Input**: Design documents from `/specs/008-query-input-ux/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: INCLUDED — the UX work is intentionally presentation-only, but the feature still requires a validation pass via the repo’s standard checks (`npm run type-check`, `npm run lint`, and `npm run test`) plus the manual scenarios in [quickstart.md](./quickstart.md).

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single project (Next.js app router). Routes live in `src/app/**`; reusable UI lives in `src/app/query-input/components/**`; shared logic stays in `src/lib/**`; locale copy remains in `src/locales/**`.

## Requirement coverage map

| Requirement | Tasks |
|---|---|
| FR-001, FR-003, FR-004, FR-014 | T010, T011, T012, T013, T036 |
| FR-002, FR-015 | T001, T002, T003, T013, T024, T031 |
| FR-005, FR-006, FR-007 | T020, T021, T022, T023, T024 |
| FR-008, FR-009, FR-010 | T030, T031, T032, T033 |
| FR-011, FR-012, FR-013 | T004, T005, T034, T035 |
| SC-001 through SC-007 | T006, T014, T021, T023, T032, T034, T035, T036, T037 |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the current behavior baseline and lock the safe implementation boundary before styling changes.

- [x] T001 Capture the current Query Input screen behavior in `src/app/query-input/page.tsx` and its child components so the implementation preserves workflow order, state semantics, and navigation behavior exactly
- [x] T002 Record the baseline validation state by running `npm run type-check`, `npm run lint`, and `npm run test` before changing any UX styling or layout
- [x] T003 Confirm all proposed edits stay inside the existing app route and components in `src/app/query-input/**` plus the locale files in `src/locales/**`; no parser, analyzer, or API contract changes are allowed
- [x] T004 Review `src/locales/en.ts` and `src/locales/vi.ts` for existing Query Input terminology and confirm any new copy follows the repository’s i18n pattern rather than hard-coded strings

**Checkpoint**: The safe UX boundary is documented, the baseline is known, and no business logic has been changed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Prepare the structure and copy needed so every user story can refine the same page without changing the workflow itself.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 [P] Audit `src/app/query-input/page.tsx` and confirm the order of input → parameter resolution → SQL preview → analysis → findings remains unchanged before any styling work begins
- [x] T006 [P] Update the Query Input heading and supporting copy in `src/locales/en.ts` to reflect the clearer workflow language without changing existing business semantics
- [x] T007 [P] Update the matching translation keys in `src/locales/vi.ts` so the same workflow language stays aligned across both supported locales
- [x] T008 [P] Define the section hierarchy for the main page in `src/app/query-input/page.tsx`: header, tabs, left panel stack, right preview stack, and findings area remain visually distinct without altering any state logic
- [x] T009 Create a small shared visual contract in the Query Input route for grouping, spacing, border treatment, and semantic emphasis so all child components use one consistent hierarchy instead of competing card styles

**Checkpoint**: The page has a stable layout spine and the language keys are ready for the story-specific refinements.

---

## Phase 3: User Story 1 - Understand the query-analysis workflow at a glance (Priority: P1) 🎯 MVP

**Goal**: A developer can identify the sequence of actions immediately — input method, required configuration, resolved SQL, primary action — without hunting for controls.

**Independent Test**: Open the Query Input page, scan it at a typical desktop width, and confirm the user can identify the flow from input to config to review to action in under 5 seconds without reading help text.

### Tests for User Story 1 ⚠️

> **NOTE**: These tests must be written and fail before the UI implementation work in this story begins.

- [x] T010 [P] [US1] Add a failing component test in `tests/unit/query-input-workflow.test.tsx` asserting the page exposes the workflow sections, active tab state, parameter area, resolved SQL preview, and primary CTA in the correct order and with clear hierarchy
- [x] T011 [P] [US1] Add a failing tab interaction test in `tests/unit/query-input-workflow.test.tsx` verifying that switching among direct SQL, MyBatis import, and smart-editor modes updates the active state without altering the underlying workflow behavior
- [x] T012 [US1] Refine `src/app/query-input/components/Header.tsx` to make the page title, active analysis context, and dialect selector feel like a clear top-level shell rather than a competing tool bar
- [x] T013 [US1] Refine `src/app/query-input/components/TabNavigation.tsx` so the active input method is clearly distinguished, inactive modes feel secondary, and keyboard focus remains clear without depending on color alone
- [x] T014 [US1] Update `src/app/query-input/components/ActionButtons.tsx` so the Analyze action becomes the primary CTA, while Load Sample and Clear remain subordinate and visually obvious yet less dominant
- [x] T015 [US1] Update `src/app/query-input/page.tsx` to preserve the desktop-first workflow ordering while improving whitespace, section boundaries, and the visual separation of the left input/configuration area from the right preview area
- [ ] T016 [US1] Validate the page at 1024px, 1280px, 1440px, and 1920px and confirm the input flow remains readable, the page does not feel crowded, and the SQL preview remains comfortable to read

**Checkpoint**: US1 is independently demonstrable — the workflow is obvious and the primary action is visually dominant.

---

## Phase 4: User Story 2 - Configure detected parameters without confusion (Priority: P1)

**Goal**: Developers can understand that detected parameters are required to resolve the final SQL, locate values quickly, and keep the parameter section readable even with many entries.

**Independent Test**: Open a MyBatis query with several detected parameters, search for one, update a value, and confirm the resolved SQL preview and parameter state remain in sync without losing scanability.

### Tests for User Story 2 ⚠️

- [x] T017 [P] [US2] Add a failing component test in `tests/unit/query-input-parameters.test.tsx` asserting that parameter names are visually distinct from values, a search field exists for large parameter sets, and the section clearly indicates these values are required to resolve SQL
- [x] T018 [P] [US2] Add a failing interaction test in `tests/unit/query-input-parameters.test.tsx` verifying that updating a parameter value updates the displayed resolved SQL and keeps the parameter list in sync with the underlying state
- [x] T019 [US2] Review `src/app/query-input/components/ParameterConfig.tsx` and confirm the section communicates that placeholder values are required to materialize the final SQL before analysis
- [x] T020 [US2] Add parameter search/filter affordance inside the section in `src/app/query-input/components/ParameterConfig.tsx` so large parameter sets remain discoverable without changing the underlying parameter logic
- [x] T021 [US2] Strengthen the label/value hierarchy inside `src/app/query-input/components/ParameterConfig.tsx` so parameter names, conditional indicators, and their values are visually distinct and consistent with the rest of the page
- [x] T022 [US2] Confirm `src/app/query-input/components/MyBatisPanel.tsx` still communicates the current XML file/import state clearly and that the imported file metadata and removal action remain discoverable without introducing new workflow steps
- [x] T023 [US2] Verify the parameter changes still propagate to `resolvedSql` in `src/app/query-input/page.tsx` and the preview area reflects the same business behavior after editing

**Checkpoint**: US2 works independently — parameter configuration is clear, searchable, and tied to the final SQL preview.

---

## Phase 5: User Story 3 - Review final SQL and findings with confidence (Priority: P2)

**Goal**: The generated SQL is treated as the source of truth, and the findings section offers a quick way to understand issue type, severity, and navigation without visual overload.

**Independent Test**: Run analysis on a query with warnings and confirm a user can scan severity, explanation, location, and guidance without reading every row in depth.

### Tests for User Story 3 ⚠️

- [x] T024 [P] [US3] Add a failing preview-and-findings test in `tests/unit/query-input-review.test.tsx` asserting the resolved SQL is visually prioritized as the final statement and findings remain scannable by severity, summary, and location without losing expand/collapse behavior
- [x] T025 [P] [US3] Add a failing accessibility-and-state test in `tests/unit/query-input-review.test.tsx` verifying empty, loading, and resolved states communicate the current condition and keep the focus/errormessage semantics intact
- [x] T026 [US3] Refine `src/app/query-input/components/PreviewPanel.tsx` so the preview area is visually prioritized as the final SQL to be analyzed and remains readable at desktop widths
- [x] T027 [US3] Review `src/app/query-input/components/BottomAnalytics.tsx` and the existing linting alert surface to ensure issue severity, summary, and location remain easy to scan and do not become visually noisy
- [x] T028 [US3] Ensure the findings layout keeps the existing expand/collapse and navigation behavior intact while improving hierarchy, grouping, and spacing in the alert list
- [x] T029 [US3] Validate empty, loading, and resolved states in `src/app/query-input/page.tsx` so users always understand what is missing, what is happening, or what the system expects next
- [x] T030 [US3] Verify the visual system preserves the existing severity semantics without inventing new meanings or removing the current error/warning distinction

**Checkpoint**: US3 is independently functional — the final SQL and findings are structured for fast review and trust.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening for layout quality, locale quality, and validation evidence across the whole feature.

- [x] T031 [P] Check the Query Input route for unnecessary visual noise and reduce duplicate borders, low-contrast surfaces, and competing panel treatments while keeping the dark enterprise identity intact
- [x] T032 [P] Review `src/locales/en.ts` and `src/locales/vi.ts` for any newly introduced user-facing strings and confirm they remain routed through the existing i18n system
- [x] T033 [P] Review the final DOM structure and styling in `src/app/query-input/page.tsx`, `src/app/query-input/components/Header.tsx`, `src/app/query-input/components/TabNavigation.tsx`, `src/app/query-input/components/ParameterConfig.tsx`, `src/app/query-input/components/ActionButtons.tsx`, and `src/app/query-input/components/PreviewPanel.tsx` to ensure focus states, labels, and visual hierarchy remain accessible
- [x] T034 Run `npm run type-check` and resolve any TypeScript issues caused by the UX changes
- [x] T035 Run `npm run lint` and resolve all new warnings or errors introduced by the refactor
- [x] T036 Run `npm run test` and confirm the project still passes its repository-level regression checks
- [ ] T037 Execute the manual validation scenarios in [quickstart.md](./quickstart.md) and confirm each scenario still behaves the same while the UI is clearer
- [ ] T038 Validate the final page in both the English and Vietnamese locales and confirm no hard-coded text remains in the Query Input UI
- [x] T039 Review the final git diff for accidental files, debug code, unrelated changes, or formatting drift before considering the feature complete

**Checkpoint**: The feature is complete, the UI remains functionally identical, and the required evidence checks are green.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — **BLOCKS all user stories**
- **User Story 1 (Phase 3, P1)**: Starts after Foundational
- **User Story 2 (Phase 4, P1)**: Starts after Foundational; shares the parameter and MyBatis flow with US1 but should remain independently testable
- **User Story 3 (Phase 5, P2)**: Starts after Foundational; shares the preview and findings surface with US1 but should be validated independently
- **Polish (Phase 6)**: Depends on all desired stories being complete

### Critical path

```text
T001 → T002 → T003 → T004 → T005 → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017 → T018 → T019 → T020 → T021 → T022 → T023 → T024 → T028 → T029 → T030 → T031
```

### Shared-file constraints

| File | Tasks that touch it | Consequence |
|---|---|---|
| `src/app/query-input/page.tsx` | T001, T005, T008, T013, T019, T023 | Sequential — this is the central state and layout orchestration file |
| `src/app/query-input/components/Header.tsx` | T010 | Single owner |
| `src/app/query-input/components/TabNavigation.tsx` | T011 | Single owner |
| `src/app/query-input/components/ActionButtons.tsx` | T012 | Single owner |
| `src/app/query-input/components/ParameterConfig.tsx` | T015, T016, T017 | Sequential |
| `src/app/query-input/components/MyBatisPanel.tsx` | T018 | Single owner |
| `src/app/query-input/components/PreviewPanel.tsx` | T020 | Single owner |
| `src/app/query-input/components/BottomAnalytics.tsx` and alert surface | T021, T022 | Sequential |
| `src/locales/en.ts` / `src/locales/vi.ts` | T006, T007, T026 | Parallel where possible |

### Parallel opportunities

- **Phase 2**: T005, T006, and T007 are independent and can be done in parallel because they touch separate files and do not share mutable state.
- **Phase 3**: T010, T011, and T012 all edit different component files and can be implemented in parallel once the foundational sequence is complete.
- **Phase 4**: T015 and T016 can be done together, while T018 remains slightly separate because it touches the XML input panel and should be reviewed after the parameter logic is settled.
- **Phase 6**: T025, T026, and T027 are cross-cutting and can be reviewed in parallel as a final pass.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Confirm the page is clearer and the primary action is obvious without changing the query flow
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → page structure and i18n groundwork ready
2. + US1 → clearer flow and primary CTA
3. + US2 → parameter logic and readability improvements
4. + US3 → final SQL and findings scanability
5. + Polish → repo validation and final review

Each increment is additive and preserves the previous one without altering the business logic.

---

## Implementation notes (2026-09-20)

### What changed

| Area | File(s) | Notes |
|---|---|---|
| Shared visual contract (T009) | `src/app/query-input/components/QueryInputPanel.tsx` (new) | One panel shell (title/description/icon/badge/actions, 16/12 spacing, 8px radius, single border treatment) used by every section of the workflow. |
| Page structure (T008, T015) | `src/app/query-input/page.tsx` | Workspace is now `xl:grid-cols-12` — input/parameters `5`, resolved SQL `7` — and the fixed `maxHeight: 500px` on the preview column was removed so long SQL stays readable. Findings and tips sit below the workspace; the tab content is a single `role="tabpanel"`. |
| Header (T012) | `Header.tsx` | Adds the workflow spine (Input → Configure parameters → Review SQL → Analyze), `aria-expanded`/`aria-controls` and Escape/outside-click handling for the dialect disclosure. |
| Tabs (T013) | `TabNavigation.tsx` | WAI-ARIA tabs pattern (roving tabindex, arrow/Home/End), `aria-selected`, and a fourth tab for the existing `mybatis` mode so the active input method is never left unmarked after a file import. |
| CTA hierarchy (T014) | `ActionButtons.tsx` | Analyze is the only `data-variant="primary"` action (larger, ring focus, `aria-busy`, `aria-describedby` hint); Load Sample / Clear stay secondary. |
| Parameters (T019–T021) | `ParameterConfig.tsx` | Required-to-resolve hint, explicit `#{name}` label ↔ value pairing, conditional badge, count badge, and a search field that appears only for large sets (> 6). Empty state now explains the condition instead of rendering nothing. |
| MyBatis input (T022) | `MyBatisPanel.tsx` | Imported file name + removal action are visible next to the editor; dropzone and toast copy moved into i18n (previously hard-coded English). |
| Resolved SQL (T026) | `PreviewPanel.tsx` | Primary panel emphasis, "final SQL" description, accessible copy action, and an empty state that explains what is missing. |
| Findings (T027–T028, T030) | `BottomAnalytics.tsx`, `src/components/ui/LintingAlerts.tsx` | Findings region is labelled; severity is stated in words (Error/Warning) next to the icon and color; counts are summarised per severity; issues are ordered errors-first (stable); each removal button has an accessible name. Expand/collapse and rule semantics are unchanged. |
| Copy (T006, T007, T032) | `src/locales/en.ts`, `src/locales/vi.ts` | All new copy added to both locales; `vi.ts` is type-checked against the `en.ts` schema, so missing keys fail `npm run type-check`. |

### Evidence

- `npm run type-check` — pass.
- `npm run test` — 14 files / 67 tests pass (baseline: 11 files / 48 tests).
  - `tests/unit/query-input-workflow.test.tsx` (T010/T011), `tests/unit/query-input-parameters.test.tsx` (T017/T018), `tests/unit/query-input-review.test.tsx` (T024/T025).
  - Both test files were written first and confirmed failing before the UI work (red → green).
- `npm run lint` — no new errors or warnings introduced. Every file this feature touched except `page.tsx` is now fully lint-clean; the 3 remaining issues in `page.tsx` (2 unused imports and one long line inside `handleAnalyze`) and the 4 remaining long lines in `en.ts`/`vi.ts` (far from the edited block, in the metrics section) are byte-identical on the base commit. `LintingAlerts.tsx` lost ~60 pre-existing prettier errors as a side effect of the rewrite.
- `npm run build` — production build succeeds; `/query-input` is generated (20.2 kB).
- `git diff` reviewed: no debug code, no generated files, no unrelated files. Only the query-input route, the linting alert surface, the two locale files and the three new test files changed.

### Still manual (not executable in this environment)

- **T016** — verify 1024px / 1280px / 1440px / 1920px rendering in a browser (jsdom has no layout engine).
- **T037** — run the [quickstart.md](./quickstart.md) scenarios against `npm run dev` (SQL input, XML import, parameter resolution, findings, dialect switching, query history, navigation to the metrics dashboard).
- **T038** — confirm the final page visually in both Vietnamese and English (automated coverage: the Vietnamese workflow copy renders from the shared i18n resources in `query-input-workflow.test.tsx`).

### Known limitations / risks

- The tabs, panels and badges use the existing dark-theme tokens only; a visual pass in light theme is still required (part of T038).
- `@testing-library/react` and `@testing-library/jest-dom` are used by the existing tests and present in `package-lock.json`, but are missing from `package.json` devDependencies. `npm install` can prune them and break `npm run test`; this is pre-existing and was left untouched (a separate change should re-add them).

