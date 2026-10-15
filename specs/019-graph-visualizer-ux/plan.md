# Implementation Plan: Relationship Graph UX

**Branch**: `019-graph-visualizer-ux` | **Date**: 2026-10-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/019-graph-visualizer-ux/spec.md`

**Workflow Context**: `.specify/scripts/powershell/setup-plan.ps1 -Json` resolved `specs/018-ai-compare-results` because `.specify/feature.json` still pointed at that completed feature. This plan is scoped to the Relationship Graph UX spec from the current session. Feature 018 artifacts were not modified. `feature.json` now points at `specs/019-graph-visualizer-ux`. The working tree was on `develop` when planning started; no git branch was created because no `before_plan` hook is registered.

## Summary

Make the existing relationship graph honor saved layout and spacing, keep dragged positions until an explicit rearrange or a new analyzed query, and show source category as text on every card. Add a default-on neighbor control so a category filter can keep directly connected sources of other categories without changing the category-only rule. Replace icon-only graph actions with labeled controls, one search, a shared detail-panel budget, and exports that match the visible graph. No parser, scoring, or new runtime dependency.

## Technical Context

**Language/Version**: TypeScript 5 (strict), Next.js 15.5, React 19

**Primary Dependencies**: Existing `reactflow` 11.11.4, Zustand settings (`graphLayout`, `nodeSpacing`, `theme`, `locale`, `performanceMode`), `getT` locales, `JOIN_COLORS`. No `dagre`, `elkjs`, or `d3-force` package is installed. Do not add one.

**Storage**: N/A. Layout and spacing stay in the existing persisted settings. Node positions, category filter, and neighbor control are in-memory for the current analyzed query and page visit.

**Testing**: Vitest unit tests for pure layout, filter, and diagram-text helpers; update `tests/unit/relationshipGraphSourceFilter.test.tsx` only if a shared helper signature changes. Type-check with `npm run type-check`. Component tests only where the repo already renders graph helpers without a new test harness.

**Target Platform**: Existing desktop and laptop browser layouts, including 1366×768, light and dark appearance, English and Vietnamese.

**Project Type**: Single Next.js app. Client-only change to the relationship graph route.

**Performance Goals**: Initial arrangement of 50 sources completes within 1 second. Compact cards at the existing 50-source threshold still show category text. Selection, search, and panel toggles must not recompute layout.

**Constraints**: Do not change `analyzeSql`, source classification, or complexity scoring. Preserve category-only filtering when the neighbor control is off, matching the feature 007 contract. Do not persist dragged coordinates. Cloud credentials and query execution are out of scope.

**Scale/Scope**: `src/app/relationship-graph-visualizer/components/*`, `src/locales/en.ts`, `src/locales/vi.ts`. Settings already expose layout and spacing; this feature consumes them. No new route, API, or store version unless a type-only settings comment is required.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate / required evidence | Pre-design | Post-design |
|-----------|--------------------------|------------|-------------|
| I. Multi-Dialect SQL Analysis | No parser or dialect behavior change. Graph reads the existing `sourceType` and joins. | PASS | PASS — research keeps analyzer untouched |
| II. Interactive Visualization First | ReactFlow remains the graph. Fit, rearrange, selection, and join-condition drill-down stay on the page. Source-line jump is not added because `TableNode` and `JoinEdge` have no line field; metrics and CTE pages keep the existing line jump. | PASS WITH EXISTING GAP | PASS — design does not remove line jump elsewhere and does not invent parser lines |
| III. Real-Time Feedback Loop | Graph still renders the current in-memory analysis result. A new query fingerprint resets placement. No extra analysis on keystroke. | PASS | PASS |
| IV. AI-Grounded Explanations | Suggestions stay advisory and are not treated as parser facts. No AI prompt change. | PASS | PASS |
| V. Minimal Deployment Friction | No new dependency, credential, or server component. Hierarchical and force arrangements are deterministic in-repo layouts. | PASS | PASS — research rejects `dagre` / `d3-force` |
| Security & Privacy | No credential, history, or query-execution change. Exported diagram text and SVG contain only the visible analysis already on screen. | PASS | PASS |
| Quality Standards | New visualization behavior gets Vitest coverage. TypeScript stays strict. 50-source arrangement stays inside the 1 second budget. Layout helpers get a short comment on iteration limits and known non-physics force placement. | PASS | PASS |

No constitutional violation requires a complexity exception.

## Project Structure

### Documentation (this feature)

```text
specs/019-graph-visualizer-ux/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── graph-view-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md                 # not created by this command
```

### Source Code (repository root)

```text
src/app/relationship-graph-visualizer/components/
├── GraphVisualizerContent.tsx   # filter, neighbor control, labels, counts, search, panels, export
├── FlowCanvas.tsx               # layout application, position retention, fit/relayout handle
├── TableNode.tsx                # category text on full and compact cards; category chrome vs join color
├── LabeledEdge.tsx              # unchanged join-color edges; no layout ownership
├── SuggestionPanel.tsx          # keyboard-reachable dismiss; activate related source
├── JoinAnalysisPanel.tsx        # display names and full conditions
└── ExtractedTablesPanel.tsx     # share the panel height budget; no second page scroll owner

src/locales/en.ts
src/locales/vi.ts
tests/unit/relationshipGraphSourceFilter.test.tsx
tests/unit/relationshipGraphLayout.test.ts       # new pure layout/filter tests
```

**Structure Decision**: Keep one client page. Put pure layout and neighbor-filter rules in testable functions next to the graph components, not in `sqlAnalyzer.ts`. `FlowCanvas` owns placement. `GraphVisualizerContent` owns view state and passes already-filtered tables and joins down.

## Post-Design Constitution Check

Re-checked after [research.md](research.md), [data-model.md](data-model.md), and [contracts/graph-view-ui.md](contracts/graph-view-ui.md). All gates remain PASS. The feature 007 category-only edge rule remains available when the neighbor control is off. Visible counts no longer substitute `metrics.totalJoinCount` while a filter is active.

## Complexity Tracking

No violations. Section intentionally empty.
