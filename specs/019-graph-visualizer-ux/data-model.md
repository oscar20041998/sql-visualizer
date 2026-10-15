# Phase 1 Data Model: Relationship Graph UX

No persisted schema, API payload, or analyzer entity is added. This model describes view state and the existing analysis fields the graph is allowed to read.

## Existing entities used as-is

### Source occurrence

Read from `AnalysisResult.tables`. Do not add fields in this feature.

| Field | Use |
|-------|-----|
| `id` | Stable key for placement, selection, and edges |
| `name` | Display name |
| `alias` | Shown separately when present |
| `sourceType` | `TABLE`, `CTE`, `SUBQUERY`, `UNKNOWN`, or `VIEW` |
| `columns` | Existing column preview |

### Relationship

Read from `AnalysisResult.joins`.

| Field | Use |
|-------|-----|
| `id` | Detail identity |
| `source`, `target` | Source-occurrence ids. Render names, not these ids, in details |
| `joinType` | Edge color and legend only |
| `condition` | Full text in details; preview may truncate only past the limit |

### Saved preferences

Already on `AppSettings`. This feature reads them and does not add keys.

| Field | Values | Effect |
|-------|--------|--------|
| `graphLayout` | `dagre`, `force`, `grid` | Initial and rearrange placement |
| `nodeSpacing` | `compact`, `normal`, `spacious` | Gap multiplier |
| `theme` | `dark`, `light` | Canvas and export background |
| `locale` | `en`, `vi` | Labels |
| `performanceMode` | boolean | Existing compact rendering; category text still required |

## Graph view

In-memory UI state for one visit to the relationship graph.

| Field | Rule |
|-------|------|
| `queryFingerprint` | `rawSql` + dialect of the current analysis. Change resets placements. |
| `categoryFilter` | `all`, `table`, `cte`, or `subquery`. Default `all`. |
| `includeNeighbors` | Boolean. Default `true` on each new visit. Not persisted. Ignored while filter is `all`. |
| `placements` | Map of source id to `{ x, y }` for the current fingerprint. |
| `selectedSourceId` | Null when the selected source is not visible. |
| `searchQuery` | Single toolbar query. Inspector list does not have its own query. |
| Open panels | Suggestions, relationship details, extracted sources. Independent booleans inside one height budget. |

### Visibility rules

1. Filter `all`: every source, every relationship whose ends exist.
2. Neighbor control off: sources whose `sourceType` matches the filter. Relationships whose both ends are in that set.
3. Neighbor control on: the category set plus every source one edge away from that set. Relationships whose both ends are in the resulting set.
4. A source two hops away is not a neighbor.
5. `UNKNOWN` and `VIEW` stay visible in `all` only, unless they are a direct neighbor of the focused category while the control is on.
6. Visible counts equal the sizes of those two visible sets.

### Placement rules

1. Missing placement for a visible source is computed from the current layout and spacing.
2. Drag updates that source's placement.
3. Selection, highlight, theme, and performance mode do not recompute placements.
4. Layout or spacing change, explicit rearrange, or fingerprint change replaces placements.
5. Fit changes the viewport only.

## Graph suggestion

Existing advisory object, plus optional navigation targets. Scoring inputs stay unchanged.

| Field | Rule |
|-------|------|
| `id`, `severity`, `title`, `detail` | Unchanged |
| `relatedSourceIds` | Optional ids of sources the finding names. Activation selects the first id that is currently visible. |
| Dismiss | Allowed by pointer and keyboard. Dismissal lasts for the page visit. |

## State transitions

```text
visit page
  -> includeNeighbors = true, filter = all, placements empty

analysis fingerprint changes
  -> clear placements, clear selection if needed
  -> arrange with current layout and spacing

toggle neighbor or category
  -> recompute visible sets
  -> clear selection if hidden
  -> keep placements

drag source
  -> update that placement

relayout
  -> replace placements

fit
  -> viewport only

leave page
  -> discard placements, filter, and neighbor control
```

## Validation

- A visible relationship must reference two visible source ids.
- Display name lookup must fall back to the source id only if the occurrence was removed from the analysis, and that fallback must not be the normal selected-node path.
- Exported diagram text and SVG must be built from the visible sets, not the unfiltered analysis, when a filter is active.
