# Feature Specification: Relationship Graph UX

**Feature Branch**: `019-graph-visualizer-ux`

**Created**: 2026-10-11

**Status**: Draft

**Input**: User description: "Đánh giá page Graph Visualize và customise UX/UI nếu cần: bố cục graph phải đúng với tùy chọn người dùng và không mất khi chọn node; lọc loại nguồn phải trung thực; loại nguồn phải nhìn thấy được tách khỏi màu quan hệ; thanh điều khiển gọn và có nhãn; xuất bản đồ khớp với những gì đang hiển thị."

## Clarifications

### Session 2026-10-11

- Q: Khi lọc theo loại nguồn, cạnh nối sang loại khác nên xử lý thế nào? → A: Giữ bộ lọc chỉ cùng loại, và thêm một công tắc hiện các nguồn được nối trực tiếp thuộc loại khác. Công tắc mặc định bật.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Arrange a readable relationship map (Priority: P1)

A developer opens the relationship graph for an analyzed query and needs the first arrangement to match the layout and spacing they already chose, then needs to move nodes without losing that arrangement when they inspect a table.

**Why this priority**: A map that ignores saved preferences or jumps back to a fixed grid every time a table is selected cannot be used to understand a complex query.

**Independent Test**: Set each available layout and spacing preference, open a multi-table query, drag two nodes, select another node, and confirm the dragged positions remain until the developer explicitly rearranges or analyzes a different query.

**Acceptance Scenarios**:

1. **Given** a developer has chosen a hierarchical, force, or grid arrangement and a compact, normal, or spacious spacing, **When** they open the relationship graph for a query, **Then** the initial placement visibly follows that choice rather than one fixed arrangement.
2. **Given** the developer drags one or more nodes, **When** they select or deselect a node, search for a table, or open a detail panel, **Then** the moved nodes stay where the developer left them.
3. **Given** the developer asks to fit the map or rearrange it, **When** the action completes, **Then** the visible sources fit the viewing area or return to the selected arrangement, and a later selection does not undo that result.
4. **Given** the developer analyzes a different query, **When** the new graph appears, **Then** it uses a fresh arrangement for that query and does not reuse positions from the previous query.

---

### User Story 2 - Recognize each source without guessing (Priority: P1)

A developer needs to tell whether a displayed source is a physical table, a CTE, a derived subquery, or an unresolved source without inferring that from its name or from the color of a relationship.

**Why this priority**: Misreading a CTE as a physical table makes the map misleading even when the underlying analysis is correct.

**Independent Test**: Analyze a query that contains a physical table, a CTE, a derived subquery, and, when available, an unresolved source; confirm every displayed card and list entry shows its category, including the compact view used for large maps.

**Acceptance Scenarios**:

1. **Given** a graph contains more than one source category, **When** the developer scans the map or the source list, **Then** each source shows its category as visible text, not only as color.
2. **Given** a relationship color legend is visible, **When** the developer compares it with source cards, **Then** relationship color communicates relationship type and does not replace the source-category label.
3. **Given** a large graph is shown in its compact view, **When** the developer looks at a compact card, **Then** the source category remains visible.
4. **Given** a source has an alias, **When** the developer inspects that source, **Then** the alias is shown separately from the source name and category.

---

### User Story 3 - Filter sources without hiding the relationships the label promises (Priority: P2)

A developer wants to focus on tables, CTEs, or derived subqueries, and also wants a clear choice about whether directly connected sources of another category stay on the map.

**Why this priority**: A filter labeled as a relationship view that silently drops every cross-category relationship hides the connections the developer opened the graph to see.

**Independent Test**: On a query with a CTE joined to a physical table, apply the CTE filter with the neighbor control on and off, and confirm the labels, visible sources, visible relationships, and counts match the control state.

**Acceptance Scenarios**:

1. **Given** the neighbor control is off, **When** the developer filters to one source category, **Then** only sources of that category remain, only relationships whose both ends are visible remain, and the filter label says that it shows only that category.
2. **Given** the neighbor control is on, **When** the developer filters to one source category, **Then** sources of that category remain and each directly connected source of another category remains, together with the relationship that connects them.
3. **Given** either control state, **When** the counts are shown, **Then** they describe the sources and relationships currently visible, and they do not present a hidden total as if it were the filtered total.
4. **Given** the neighbor control has not been changed in the session, **When** the developer first applies a category filter, **Then** the neighbor control is on.
5. **Given** a selected source is hidden by a filter change, **When** the map updates, **Then** the selection clears and the detail area no longer describes the hidden source.

---

### User Story 4 - Operate the graph without a crowded toolbar (Priority: P2)

A developer needs to search, inspect, review suggestions, review relationships, and review the extracted source list without decoding unlabeled icons or maintaining two separate searches.

**Why this priority**: The current page already contains the needed information, but the controls compete with the map and are hard to identify at a glance.

**Independent Test**: On a laptop-width screen, identify every primary graph action by its visible label, search once, open each detail view, and confirm the map remains visible.

**Acceptance Scenarios**:

1. **Given** the graph page is open, **When** the developer scans the controls, **Then** search, fit, rearrange, category filter, neighbor control, suggestions, relationship details, extracted sources, and export actions have visible text labels in the active language.
2. **Given** the developer searches for a source, **When** they choose a match, **Then** that source is selected and brought into view, and a second independent search is not required to find it in the source list.
3. **Given** one or more detail views are open, **When** the developer continues using the map, **Then** the map and its controls remain visible and the detail views scroll within a shared area instead of pushing the map off the screen.
4. **Given** a suggestion refers to a displayed source or relationship, **When** the developer activates that suggestion, **Then** the related source or relationship is selected and its details are shown.
5. **Given** the developer uses only a keyboard, **When** they move through controls, search results, source list, and dismiss actions, **Then** every control is reachable and shows a visible focus state.

---

### User Story 5 - Share the graph that is currently on screen (Priority: P3)

A developer needs to copy a diagram description or save an image of the graph they are looking at, including the active filter and neighbor state.

**Why this priority**: Sharing is useful only when the shared artifact matches the reviewed view.

**Independent Test**: Apply a filter, export both available share formats, and confirm the exported content contains the visible sources, visible relationships, and source categories, and that the image can be saved as a file.

**Acceptance Scenarios**:

1. **Given** a filtered graph is displayed, **When** the developer copies the diagram description, **Then** it includes only the currently visible sources and relationships and names each source category.
2. **Given** the same graph, **When** the developer saves an image, **Then** a file is produced from the visible map rather than only copied text, and its background follows the active light or dark appearance.
3. **Given** the image cannot be produced, **When** the developer requests it, **Then** the page explains that the image is unavailable and still allows the diagram description to be copied.

### Edge Cases

- A query has no analyzed result: the page explains that analysis is required and offers a direct way back to query input.
- A query has one source and no relationships: the map shows that source and does not present an error.
- A query has 50 or more sources: the compact view still shows source category, and arrangement completes within the success target.
- Two occurrences share a name but have different aliases: both remain distinguishable in the map, list, search, and details.
- A relationship has no condition, or a condition longer than the preview: the full condition remains available from details, and a short condition is not shown as truncated.
- The active language is Vietnamese or English, and the appearance is light or dark: labels, counts, suggestions, and detail text remain readable and translated.
- Opening suggestions, relationship details, and the extracted list together does not hide the map controls.
- A category filter matches nothing: the page shows an empty filtered state, not a failure of analysis.
- Dismissing a suggestion is possible by keyboard and on a touch device, not only by hovering.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The initial graph arrangement MUST follow the developer's saved layout choice and spacing choice.
- **FR-002**: Manually moved sources MUST keep their positions until the developer explicitly fits or rearranges the map, or until a different analyzed query replaces the current one.
- **FR-003**: Fit and rearrange actions MUST be available on the graph page and MUST announce their result without requiring the developer to leave the page.
- **FR-004**: Every displayed source MUST show its category as text in the map card, the compact card, the source list, and the selected-source details.
- **FR-005**: Relationship color MUST identify relationship type only. Source category MUST remain identifiable when relationship color is absent or shared by several sources.
- **FR-006**: The graph MUST offer category filters for all sources, physical tables, CTEs, and derived subqueries, plus a neighbor control that is on by default.
- **FR-007**: With the neighbor control off, a category filter MUST show only sources of the selected category and only relationships whose both ends remain visible.
- **FR-008**: With the neighbor control on, a category filter MUST also show each source directly connected to a visible selected-category source, and the relationship that makes that connection.
- **FR-009**: Filter labels MUST state whether the view is unfiltered, category-only, or category-plus-direct-neighbors. Visible counts MUST match the sources and relationships on screen.
- **FR-010**: Search MUST select and reveal a matching visible source. The source list MUST reflect that same selection without a second search field.
- **FR-011**: Suggestions, relationship details, and the extracted source list MUST be openable from labeled controls and MUST share a bounded area that cannot push the map or its controls out of view.
- **FR-012**: Activating a suggestion that names a visible source or relationship MUST select that item and show its details.
- **FR-013**: Relationship details MUST show source display names and aliases, not internal identifiers, and MUST provide the full relationship condition.
- **FR-014**: The developer MUST be able to copy a diagram description of the current visible graph and save an image file of that same visible graph.
- **FR-015**: All new and changed labels, empty states, filter names, control names, and errors MUST be available in English and Vietnamese.
- **FR-016**: Text and controls MUST remain readable in both light and dark appearance, and every graph action MUST be usable by keyboard with a visible focus state.
- **FR-017**: A graph of up to 50 sources MUST become ready to inspect within 1 second of opening the page on a supported desktop or laptop browser, without dropping source-category labels.

### Key Entities

- **Graph View**: The current analyzed query's visible sources, visible relationships, layout choice, spacing choice, filter, and neighbor-control state.
- **Source Occurrence**: One displayed source, with display name, optional alias, category, and the developer's current position on the map.
- **Relationship**: A connection between two source occurrences, with a relationship type, optional condition, and the two ends it joins.
- **Graph Suggestion**: An advisory finding about the current query that can point to one or more visible sources or relationships.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of trials covering hierarchical, force, and grid arrangement at compact, normal, and spacious spacing, the initial map matches the selected preference.
- **SC-002**: In 100% of trials, dragging a node and then selecting another node, searching, or opening a detail view leaves the dragged position unchanged.
- **SC-003**: In a usability check with a query containing all supported source categories, a developer identifies every displayed source category without using the source name, including compact cards, in one pass.
- **SC-004**: In 100% of CTE-to-table filter trials, neighbor control off hides the cross-category relationship, and neighbor control on shows it; on-screen counts match the visible items in both states.
- **SC-005**: On a 1366×768 laptop viewport, the map controls remain visible while all detail views are open, and every primary action is identifiable by visible text without a tooltip.
- **SC-006**: 100% of exported diagram descriptions and saved images from a filtered view contain only the sources and relationships visible at export time, with each source category named in the diagram description.
- **SC-007**: A 50-source graph is ready to inspect within 1 second, and all new user-facing text appears correctly in both English and Vietnamese.

## Assumptions

- The existing layout choices are hierarchical, force, and grid. The existing spacing choices are compact, normal, and spacious. This feature makes those choices effective; it does not add a new arrangement type.
- Source categories remain physical table, CTE, derived subquery, and unresolved. A view is shown only when the current analysis already identifies one.
- The neighbor control defaults to on for a new visit to the graph page. Turning it off applies only to the current view session unless the product already persists similar view preferences.
- Visible counts replace the previous behavior of showing an unfiltered relationship total while a filter is active.
- Suggestions remain advisory. This feature does not change how query complexity is scored.
- Sharing uses the existing diagram-description format plus a saved image. It does not add a new collaboration or publishing destination.
- English and Vietnamese remain the only required languages.
- Desktop and laptop browsers are the supported surfaces. A phone-specific layout is out of scope.

## Out of Scope

- Changing how queries are parsed, scored, or classified.
- Adding a database catalog, new source category, or new analysis page.
- Redesigning the product's overall visual theme, navigation, or sign-in experience.
- Automatically rewriting a query from a graph suggestion.
- Collaborative editing, saved graph snapshots, or sharing to an external workspace.
