# Research: Relationship Graph UX

Phase 0 decisions from the current graph implementation and the resolved spec clarification. No Technical Context item remains `NEEDS CLARIFICATION`.

## 1. How should hierarchical, force, and grid layouts work without a new dependency?

**Decision**: Implement three deterministic placement functions in the graph UI module. Read `settings.graphLayout` (`dagre` | `force` | `grid`) and `settings.nodeSpacing` (`compact` | `normal` | `spacious`). Do not add `dagre`, `@dagrejs/dagre`, `elkjs`, or `d3-force`.

**Rationale**: `package.json` has `reactflow` 11.11.4 and no layout engine. Constitution V forbids avoidable dependencies. Fifty sources must arrange within 1 second, which a bounded in-repo pass can do. The settings labels already promise these three choices; the canvas currently ignores them and always uses one grid (`xGap` 380, `yGap` 320 in `FlowCanvas.computeLayout`).

**Rules**:

- Spacing multipliers apply to the base gaps: compact `0.75`, normal `1`, spacious `1.35`.
- Grid: keep the current connected-then-isolated grid, with gaps scaled by spacing.
- Hierarchical (`dagre` value): longest-path layering from sources with no incoming visible edge, left to right, isolated sources in a separate band. This matches the existing left-to-right diagram export. It is not a full Sugiyama implementation.
- Force: start from the grid seed and run a fixed iteration count (80 or fewer) of repulsion plus edge attraction. Same inputs must yield the same coordinates. Stop there; do not animate a live simulation.

**Alternatives considered**:

- Add `@dagrejs/dagre` for the hierarchical option only. Rejected because force would still be custom or require a second package, and the spec does not require textbook Dagre output.
- Rename settings to "grid only". Rejected because the settings page already offers three choices and the spec requires all three to be visible.

## 2. How can selection stop resetting dragged positions?

**Decision**: Keep a placement map keyed by analyzed-query fingerprint plus source id. Recompute it only when the fingerprint, layout choice, spacing choice, or an explicit rearrange changes. Selection, search, theme, performance mode, and panel toggles update node data in place and reuse stored coordinates. `onNodesChange` writes drag results back into that map.

**Rationale**: `FlowCanvas` rebuilds every node inside an effect that depends on `selectedNodeId` and assigns `computeLayout` positions each time. That discards drags. React Flow already emits position changes; the bug is the overwrite, not missing drag support.

**Fingerprint**: `analysisResult.rawSql` plus `analysisResult.dialect`. A different query gets a fresh arrangement. Re-rendering the same analysis does not. Filter changes do not reset positions of sources that remain visible.

**Fit / rearrange**: Extend `FlowCanvasHandle` with `fitView()` and `relayout()`. Fit uses the React Flow instance from `onInit`. Relayout clears the placement map and applies the current layout choice. Both are triggered by labeled buttons in the graph toolbar.

**Alternatives considered**:

- Persist positions in Zustand. Rejected. The spec keeps manual positions only until the next query or rearrange.
- Disable node dragging. Rejected. It removes the interaction the spec requires.

## 3. How should the neighbor control relate to the feature 007 filter contract?

**Decision**: Keep `filterTablesBySourceType` and `filterJoinsBySourceType` as the category-only helpers. Add `filterVisibleTables(tables, joins, filter, includeNeighbors)` for the page. Neighbor control defaults to on for a page visit and is not written to settings. When it is on and the filter is not `all`, visible sources are the selected category plus any source that shares an edge with one of those sources. Edges remain "both ends visible", so a neighbor-to-neighbor edge appears only when both neighbors are directly connected to the focus set. One-hop only: a table joined only to another table does not appear in a CTE focus just because that other table touches a CTE.

**Rationale**: The 2026-10-11 clarification chose a same-category filter plus a default-on neighbor toggle. `tests/unit/relationshipGraphSourceFilter.test.tsx` expects CTE filter joins to be empty under the category-only helper. Preserving that helper keeps the 007 contract testable. The page must not keep calling only that helper, or the new control cannot work.

**Counts and labels**: When a filter is active, show the visible source count and visible relationship count, not `metrics.totalJoinCount`. Labels must say all, category only, or category plus connected sources. Existing strings such as `CTE's Relationship` are replaced.

**Alternatives considered**:

- Change `filterJoinsBySourceType` to include neighbors always. Rejected. It would silently break the 007 test and remove the off state.
- Persist the toggle in settings. Rejected. The spec limits it to the current visit unless a similar preference already exists. None does.

## 4. How should source category stay distinct from join color?

**Decision**: Edge stroke and legend keep `JOIN_COLORS` / `getJoinColor`. Every full card, compact card, source list row, and selected-source header shows `sourceType` as text, including `TABLE`, `SUBQUERY`, `UNKNOWN`, and `VIEW` when present. Compact mode must not drop the badge. Node chrome uses a small category palette, not the first incident join color.

**Rationale**: `getTableColor` currently paints a node from the first join that touches it, so join color and source identity compete. Feature 007 already requires category text on normal cards and an accessible name in compact mode; this feature makes the compact badge visible. Sidebar and search results currently badge only `CTE`.

**Alternatives considered**:

- Leave node color join-based and rely on text only. Rejected for the map, where text is small and join color still reads as identity. Text remains mandatory either way.
- Recolor edges by source type. Rejected. The spec reserves relationship color for relationship type.

## 5. How should sharing match the visible graph?

**Decision**: Diagram text stays `buildMermaidDiagram(visibleTables, visibleJoins)`, which already prints `[sourceType]`. Image save downloads an SVG file of the visible React Flow surface with the active theme background. If the surface SVG is missing, show an in-page message and leave diagram copy available. Do not copy SVG markup as the only image action, and do not rasterize to PNG.

**Rationale**: Copy Chart today serializes SVG text or falls back to a color summary. The spec asks for a saved image file. SVG needs no canvas dependency and keeps theme colors. PNG would add encoding work without a spec requirement for a bitmap.

**Alternatives considered**:

- PNG via canvas. Rejected for dependency and fidelity risk around foreignObject labels.
- Server-side render. Rejected. The graph is client-only and no export endpoint exists.

## 6. How should the toolbar and panels meet the laptop viewport?

**Decision**: One search in the toolbar selects a source and asks the canvas to reveal it. Remove the second search in the inspector; the list follows the same selection. Panel toggles, fit, rearrange, neighbor control, and export actions get visible locale labels, not only `title`. Suggestions, join analysis, and extracted tables share one bottom region capped so the toolbar and map stay on screen. Replace fixed 280px and 320px panel heights and the page's `100vh` height with the shell's `h-full` budget. Dismiss controls stay visible to keyboard and touch, not hover-only.

**Rationale**: The page root uses `h-[calc(100vh-0px)]` inside `AppLayout`'s `h-full` main, which overflows the footer. Child panels declare their own fixed heights inside a `45vh` cap, so three open panels still fight the map. `fitView`, `autoLayout`, and `exportGraph` locale keys exist and are unused.

**Suggestion activation**: Extend the suggestion object with optional related source ids. Activating a suggestion selects the first visible related source and opens the matching detail. Suggestions that cannot name a source still open their panel. Do not change scoring thresholds.

**Join details**: Resolve `joinEdge.source` and `joinEdge.target` to display name plus alias before rendering. Show the full condition. Truncate with an ellipsis only when the string exceeds the preview limit.

**Alternatives considered**:

- Collapse the inspector by default. Not required. The spec's failure is unlabeled controls and panel overflow, not the inspector's existence.
- New design system or page shell. Rejected. This is a refinement of the current graph route.

## Summary

All layout, filter, identity, export, and viewport questions are resolved with existing React Flow, Zustand settings, and locale files. Implementation must not modify the SQL analyzer.
