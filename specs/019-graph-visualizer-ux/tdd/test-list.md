---
feature: 019-graph-visualizer-ux
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 30
planned_at: a5a715d
updated_at: a5a715d
suite_baseline: green
---

# Test List: Relationship Graph UX

Acceptance criteria found in [spec.md](../spec.md): 21 acceptance scenarios plus 9 edge-case bullets. `suite_baseline: green` is copied from `.specify/memory/tdd-profile.md` (detected 2026-10-09, 574 tests). This planning step did not re-run the suite.

The stack has no acceptance, E2E, coverage, mutation, property, or approval runner. Outer behaviors use Vitest component tests under `tests/unit/*.test.tsx`, matching `tests/unit/SignInPage.test.tsx`. Inner behaviors use Vitest unit tests under `tests/unit/*.test.ts`. No new test harness and no Playwright spec.

`kind` is `example` unless marked `characterization`. Property and mutation tests are absent because those commands are `null` in the profile.

## Outer loop: acceptance behaviors

Each row is one acceptance scenario or edge case. Component tests are the real page entry point available in this stack. Where jsdom cannot prove pixels, contrast, or a React Flow frame, the automated assertion is named and the remainder is listed under ambiguous coverage.

| id | behavior | traces | layer | kind | state | test |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | Initial placement visibly follows hierarchical, force, or grid and compact, normal, or spacious spacing instead of one fixed grid | US1-AS1, FR-001, SC-001 | unit | example | DONE    | `tests/unit/relationshipGraphLayout.test.ts` |
| A2 | After a drag, selecting, deselecting, searching, or opening a detail view leaves the moved sources where the developer left them | US1-AS2, FR-002, SC-002 | unit | example | DONE    | `tests/unit/relationshipGraphLayout.test.ts` |
| A3 | Fit and rearrange stay on the graph page, frame or restore the selected arrangement, and a later selection does not undo that result | US1-AS3, FR-003 | component | example | DONE    | `tests/unit/relationshipGraphPage.test.tsx` |
| A4 | A different analyzed query gets a fresh arrangement and does not reuse the previous query's positions | US1-AS4, FR-002 | unit | example | DONE    | `tests/unit/relationshipGraphLayout.test.ts` |
| A5 | Every source on the map and in the source list shows its category as text, not only as color | US2-AS1, FR-004, SC-003 | component | example | DONE    | `tests/unit/relationshipGraphIdentity.test.tsx` |
| A6 | Relationship color identifies relationship type and does not replace the source-category label | US2-AS2, FR-005 | component | example | DONE    | `tests/unit/relationshipGraphIdentity.test.tsx` |
| A7 | A compact card still shows the source category | US2-AS3, FR-004, FR-017 | component | example | DONE    | `tests/unit/relationshipGraphIdentity.test.tsx` |
| A8 | An alias is shown separately from the source name and category | US2-AS4, FR-004 | component | example | DONE    | `tests/unit/relationshipGraphIdentity.test.tsx` |
| A9 | With neighbors off, a category filter shows only that category, only relationships whose both ends remain, and a category-only label | US3-AS1, FR-007, FR-009, SC-004 | unit | example | DONE    | `tests/unit/relationshipGraphVisibility.test.ts` |
| A10 | With neighbors on, a category filter keeps that category, each directly connected other-category source, and the relationship that connects them | US3-AS2, FR-008, SC-004 | unit | example | DONE    | `tests/unit/relationshipGraphVisibility.test.ts` |
| A11 | Shown counts describe the sources and relationships currently visible and do not present a hidden total as the filtered total | US3-AS3, FR-009, SC-004 | component | example | DONE    | `tests/unit/relationshipGraphPage.test.tsx` |
| A12 | The first category filter in a visit has the neighbor control on | US3-AS4, FR-006 | component | example | DONE    | `tests/unit/relationshipGraphPage.test.tsx` |
| A13 | A source hidden by a filter change is no longer selected and its details are not shown | US3-AS5 | component | example | DONE    | `tests/unit/relationshipGraphPage.test.tsx` |
| A14 | Search, fit, rearrange, category filter, neighbor control, suggestions, relationship details, extracted sources, and export actions have visible text in the active language | US4-AS1, FR-011, FR-015, FR-016, SC-005 | component | example | DONE    | `tests/unit/relationshipGraphPage.test.tsx` |
| A15 | Choosing a search match selects and reveals that source, and the source list has no second search field | US4-AS2, FR-010, SC-005 | component | example | DONE    | `tests/unit/relationshipGraphPage.test.tsx` |
| A16 | Open detail views scroll inside a shared area and do not push the map or its controls off the page | US4-AS3, FR-011, SC-005 | component | example | DONE    | `tests/unit/relationshipGraphPage.test.tsx` |
| A17 | Activating a suggestion that names a visible source or relationship selects it and shows its details | US4-AS4, FR-012 | component | example | DONE    | `tests/unit/relationshipGraphPage.test.tsx` |
| A18 | Keyboard travel reaches controls, search results, the source list, and dismiss actions, and the focused control is visible | US4-AS5, FR-016 | component | example | DONE    | `tests/unit/relationshipGraphPage.test.tsx` |
| A19 | Copied diagram text includes only the currently visible sources and relationships and names each source category | US5-AS1, FR-014, SC-006 | unit | example | DONE    | `tests/unit/relationshipGraphExport.test.ts` |
| A20 | Saving an image produces a file of the visible map, and its background follows the active light or dark appearance | US5-AS2, FR-014, SC-006 | component | example | DONE    | `tests/unit/relationshipGraphPage.test.tsx` |
| A21 | When an image cannot be produced, the page says the image is unavailable and diagram copy still works | US5-AS3, FR-014 | component | example | DONE    | `tests/unit/relationshipGraphPage.test.tsx` |
| A22 | With no analyzed result, the page explains that analysis is required and offers a way back to query input | Edge: no result | component | example | DONE    | `tests/unit/relationshipGraphPage.test.tsx` |
| A23 | One source and no relationships is shown without an error | Edge: single source | component | example | DONE    | `tests/unit/relationshipGraphPage.test.tsx` |
| A24 | A 50-source graph still shows category on compact cards and its arrangement finishes within 1 second | Edge: 50 sources, FR-017, SC-007 | unit | example | DONE    | `tests/unit/relationshipGraphLayout.test.ts` |
| A25 | Two sources that share a name but have different aliases stay distinguishable in the map, list, search, and details | Edge: shared name | component | example | DONE    | `tests/unit/relationshipGraphIdentity.test.tsx` |
| A26 | A missing or short condition is not shown as truncated, and a long condition remains fully available in details | Edge: condition, FR-013 | component | example | DONE    | `tests/unit/relationshipGraphPage.test.tsx` |
| A27 | English and Vietnamese labels, counts, suggestions, and details exist for the active language in both light and dark appearance | Edge: language and appearance, FR-015, FR-016, SC-007 | unit | example | DONE    | `tests/unit/relationshipGraphLocales.test.ts` |
| A28 | A category filter that matches nothing shows an empty filtered state, not an analysis failure | Edge: empty filter, FR-009 | component | example | DONE    | `tests/unit/relationshipGraphPage.test.tsx` |
| A29 | A suggestion can be dismissed by keyboard and without hover, including the control a touch device can use | Edge: dismiss, FR-016 | component | example | DONE    | `tests/unit/relationshipGraphPage.test.tsx` |
| A30 | Opening suggestions, relationship details, and the extracted list together does not hide the map controls | Edge: all panels, SC-005 | component | example | DONE    | `tests/unit/relationshipGraphPage.test.tsx` |

A16 and A30 share the panel-budget assertion. A30 stays a separate row because the spec lists it as its own edge case.

## Inner loop: unit behaviors

Written before the production function they describe. Component rows above are the outer loop; these rows lock the rules those screens depend on.

### `src/app/relationship-graph-visualizer/components/graphLayout.ts`

| id | behavior | traces | layer | kind | state | test |
| --- | --- | --- | --- | --- | --- | --- |
| U1 | Grid, hierarchical, and force placements differ for one branched fixture | A1, FR-001 | unit | example | DONE    | `tests/unit/relationshipGraphLayout.test.ts` |
| U2 | Compact, normal, and spacious gaps use multipliers 0.75, 1, and 1.35 | A1, FR-001 | unit | example | DONE    | `tests/unit/relationshipGraphLayout.test.ts` |
| U3 | The same layout, spacing, sources, and relationships return the same coordinates | A1 | unit | example | DONE    | `tests/unit/relationshipGraphLayout.test.ts` |
| U4 | Hierarchical placement moves sources with no incoming edge to the left and puts isolated sources in a separate band | A1 | unit | example | DONE    | `tests/unit/relationshipGraphLayout.test.ts` |
| U5 | Force placement starts from the grid seed and stops within 80 iterations | A1 | unit | example | DONE    | `tests/unit/relationshipGraphLayout.test.ts` |
| U6 | Arranging 50 sources finishes within 1 second and returns a coordinate for every source | A24, FR-017 | unit | example | DONE    | `tests/unit/relationshipGraphLayout.test.ts` |
| U7 | Selecting, searching, changing theme, changing performance mode, or toggling a panel does not replace stored coordinates | A2, FR-002 | unit | example | DONE    | `tests/unit/relationshipGraphLayout.test.ts` |
| U8 | A drag writes the new coordinates back for that source id | A2, FR-002 | unit | example | DONE    | `tests/unit/relationshipGraphLayout.test.ts` |
| U9 | Rearrange discards manual coordinates and applies the current layout and spacing | A3, FR-003 | unit | example | DONE    | `tests/unit/relationshipGraphLayout.test.ts` |
| U10 | A new raw SQL or dialect fingerprint does not reuse coordinates from the previous query | A4, FR-002 | unit | example | DONE    | `tests/unit/relationshipGraphLayout.test.ts` |
| U11 | The same fingerprint reuses coordinates, including after a filter hides and restores a still-known source | A2, A4 | unit | example | DONE    | `tests/unit/relationshipGraphLayout.test.ts` |

### `src/app/relationship-graph-visualizer/components/graphVisibility.ts`

| id | behavior | traces | layer | kind | state | test |
| --- | --- | --- | --- | --- | --- | --- |
| U12 | Neighbors off returns the same sources and relationships as the category-only helpers | A9, FR-007 | unit | example | DONE    | `tests/unit/relationshipGraphVisibility.test.ts` |
| U13 | Neighbors on adds a source one edge away from the selected category and the edge that reaches it | A10, FR-008 | unit | example | DONE    | `tests/unit/relationshipGraphVisibility.test.ts` |
| U14 | A source two edges away from the selected category stays hidden | A10, FR-008 | unit | example | DONE    | `tests/unit/relationshipGraphVisibility.test.ts` |
| U15 | An edge appears only when both ends are in the visible set | A9, A10, FR-007 | unit | example | DONE    | `tests/unit/relationshipGraphVisibility.test.ts` |
| U16 | The all filter keeps every source category and every relationship whose both ends exist | FR-006 | unit | example | DONE    | `tests/unit/relationshipGraphVisibility.test.ts` |
| U17 | Visible counts come from the visible sets, not from `metrics.totalJoinCount` | A11, FR-009 | unit | example | DONE    | `tests/unit/relationshipGraphVisibility.test.ts` |
| U18 | A selected id that is no longer visible is cleared | A13 | unit | example | DONE    | `tests/unit/relationshipGraphVisibility.test.ts` |
| U19 | Category-only table filtering still returns only the selected canonical category | A9, FR-007 | unit | characterization | BASELINE | `tests/unit/relationshipGraphSourceFilter.test.tsx` |
| U20 | Category-only CTE filtering still returns no cross-category relationship | A9, FR-007 | unit | characterization | BASELINE | `tests/unit/relationshipGraphSourceFilter.test.tsx` |

### `src/locales/en.ts` and `src/locales/vi.ts`

| id | behavior | traces | layer | kind | state | test |
| --- | --- | --- | --- | --- | --- | --- |
| U21 | Every new graph label key exists in English and Vietnamese and is non-empty | A14, A27, FR-015, SC-007 | unit | example | DONE    | `tests/unit/relationshipGraphLocales.test.ts` |
| U22 | Filter labels can state all, category-only, and category-plus-direct-neighbors in both languages | A9, A10, FR-009 | unit | example | DONE    | `tests/unit/relationshipGraphLocales.test.ts` |

### `src/app/relationship-graph-visualizer/components/JoinAnalysisPanel.tsx`

| id | behavior | traces | layer | kind | state | test |
| --- | --- | --- | --- | --- | --- | --- |
| U23 | Relationship ends render display name and alias, not the internal source id | A8, A25, FR-013 | component | example | DONE    | `tests/unit/relationshipGraphPage.test.tsx` |
| U24 | A condition shorter than the preview limit has no added ellipsis | A26, FR-013 | component | example | DONE    | `tests/unit/relationshipGraphPage.test.tsx` |
| U25 | A condition longer than the preview, and an empty condition, still expose the full condition text | A26, FR-013 | component | example | DONE    | `tests/unit/relationshipGraphPage.test.tsx` |

### `src/app/relationship-graph-visualizer/components/SuggestionPanel.tsx`

| id | behavior | traces | layer | kind | state | test |
| --- | --- | --- | --- | --- | --- | --- |
| U26 | Activating a suggestion selects the first related source that is currently visible | A17, FR-012 | component | example | DONE    | `tests/unit/relationshipGraphPage.test.tsx` |
| U27 | A suggestion with no visible related source does not select a hidden source | A17, FR-012 | component | example | DONE    | `tests/unit/relationshipGraphPage.test.tsx` |
| U28 | Dismiss is a reachable control without a hover-only class | A29, FR-016 | component | example | DONE    | `tests/unit/relationshipGraphPage.test.tsx` |

### `src/app/relationship-graph-visualizer/components/GraphVisualizerContent.tsx`

| id | behavior | traces | layer | kind | state | test |
| --- | --- | --- | --- | --- | --- | --- |
| U29 | Diagram text for a filtered visible set names each visible source category and omits hidden source ids | A19, FR-014, SC-006 | unit | example | DONE    | `tests/unit/relationshipGraphExport.test.ts` |
| U30 | Existing diagram text already names a canonical source category | A19 | unit | characterization | BASELINE | `tests/unit/relationshipGraphSourceFilter.test.tsx` |
| U31 | The image payload uses the active theme background and only visible source ids | A20, FR-014 | unit | example | DONE    | `tests/unit/relationshipGraphExport.test.ts` |
| U32 | A missing surface SVG returns an unavailable result and leaves the diagram text intact | A21, FR-014 | unit | example | DONE    | `tests/unit/relationshipGraphExport.test.ts` |
| U33 | The neighbor control's initial value is on and is not written to saved settings | A12, FR-006 | unit | example | DONE    | `tests/unit/relationshipGraphVisibility.test.ts` |

## Invariants and edge cases still to place

None. Every spec edge case has an id above.

## Out of scope

- Parser, scoring, and source-classification changes: spec out of scope, and `src/lib/sql/sqlAnalyzer.ts` is not a test subject.
- Phone layout: spec assumptions.
- PNG, PDF, remote sharing, and persisted node positions: contract out of scope.
- Source-line jump from a graph node: no line field on graph nodes; not added by this feature.
- Measured color-contrast ratio: not specified as a numeric criterion and no contrast command exists in the profile.
- A new Dagre or force-library snapshot: research forbids those dependencies, so tests must not expect third-party coordinates.

## Ambiguous or partially automated

- FR-003 "announce their result" is not specified as a separate status message. A3 asserts the actions stay on the page and the arrangement result remains after selection. Do not invent an aria-live string.
- A3 visual framing and A16/A30/SC-005 at 1366×768 cannot be proven by jsdom layout. Automated tests assert the shared bounded region, the absence of a `100vh` page shell, and visible labels. Pixel fit stays in [quickstart.md](../quickstart.md).
- A27 light/dark readability is automated only as translated strings plus theme background on the export payload. Visual contrast stays manual.
- A18 and A29 can assert keyboard reachability and a non-hover dismiss control. They cannot prove a physical touch device.
- Profile `acceptance` is null, so there is no browser E2E layer for these rows.

## Verification commands

Copied from `.specify/memory/tdd-profile.md`:

- Single test: `npm test -- tests/unit/sqlSourceClassification.test.ts`
- File: `npm test -- tests/unit/sqlSourceClassification.test.ts`
- Full suite: `npm test`
- Watch: null
- Coverage: null
- Mutation: null
- Acceptance: null

Feature files use the same `npm test -- <file>` form as the recorded file command:

- `npm test -- tests/unit/relationshipGraphLayout.test.ts`
- `npm test -- tests/unit/relationshipGraphVisibility.test.ts`
- `npm test -- tests/unit/relationshipGraphLocales.test.ts`
- `npm test -- tests/unit/relationshipGraphIdentity.test.tsx`
- `npm test -- tests/unit/relationshipGraphPage.test.tsx`
- `npm test -- tests/unit/relationshipGraphExport.test.ts`
- `npm test -- tests/unit/relationshipGraphSourceFilter.test.tsx`
