# Internal Contract: Relationship Graph View

Not a network API. This is the UI contract between the current analysis result and the relationship graph page.

## Inputs

- `AnalysisResult.tables`, `joins`, `rawSql`, `dialect`, `ctes`, `metrics`, `complexity`, `joinAnalysisDetails`
- Settings: `graphLayout`, `nodeSpacing`, `theme`, `locale`, `performanceMode`
- No new analyzer fields

## Layout

| Setting value | Placement |
|---------------|-----------|
| `grid` | Connected sources in a grid, then isolated sources. Gaps scale with spacing. |
| `dagre` | Left-to-right layers by longest path over visible edges at arrange time. Not a third-party Dagre run. |
| `force` | Deterministic fixed-iteration attraction/repulsion seeded from the grid. |

Spacing: compact 0.75, normal 1, spacious 1.35 times the base gap.

Arrange when the query fingerprint, layout, spacing, or rearrange action changes. Do not arrange on selection.

`FlowCanvas` exposes:

- `fitView()` — frame the visible graph
- `relayout()` — discard manual positions and apply the current layout

## Filter

| Control | Sources | Relationships |
|---------|---------|----------------|
| All | All source types | Both ends visible |
| Category, neighbors off | Selected `TABLE`, `CTE`, or `SUBQUERY` only | Both ends in that set |
| Category, neighbors on (default) | Selected category plus direct edge neighbors | Both ends in that expanded set |

Labels must distinguish the three states in English and Vietnamese. On-screen source and relationship counts must match the visible sets. Do not show `metrics.totalJoinCount` as the relationship count while a category filter is active.

`filterTablesBySourceType` and `filterJoinsBySourceType` remain the category-only helpers. The page uses the neighbor-aware visible-set helper.

Changing the filter clears a selection that is no longer visible.

## Identity

- Edge color and the join legend encode `joinType` only.
- Full card, compact card, list, search result, and selected header show `sourceType` text.
- Alias is separate from name.
- Accessible name includes name, source type, and alias when present.
- Node chrome must not reuse join color as the category signal.

## Toolbar and details

Primary actions have visible text labels: search, fit, rearrange, category filter, neighbor control, suggestions, relationship details, extracted sources, diagram copy, image save, performance mode.

One search selects and reveals a visible source. The inspector list uses that selection and has no second search box.

Detail panels share one bounded region. Opening all of them must leave the toolbar and map visible at 1366×768.

Relationship details show display names, aliases, and the full condition. A short condition must not gain an ellipsis.

A suggestion with `relatedSourceIds` selects the first visible id and opens the relevant details. Dismiss is keyboard accessible.

## Export

- Diagram text: current visible sources and relationships, with each source category in the node label.
- Image: downloaded SVG of the visible map, background following light or dark theme.
- If SVG cannot be produced, an in-page message explains that, and diagram copy still works.
- Export must not include sources hidden by the current filter.

## Out of contract

- Parser or score changes
- Persisted node positions
- PNG, PDF, or remote sharing
- Source-line jump from a graph node
- Phone-specific layout
