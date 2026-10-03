# Research: SQL Intelligence Dashboard

**Feature**: [spec.md](./spec.md) | **Date**: 2026-09-21

Phase 0 design decisions from the repository audit. Each entry records Decision / Rationale / Alternatives considered. The audit resolved every Technical Context unknown (no NEEDS CLARIFICATION remained); the decisions below pin the design choices the audit surfaced.

## R1 — Deterministic normalized complexity score (fixes the proven data-contract defect)

- **Decision**: Add a deterministic normalized score (0–100) computed inside `complexityScorer` from the raw score via a fixed saturation curve `normalized = round(100 × raw / (raw + k))` with a fixed calibration constant `k` placed in `COMPLEXITY_SCORER_CONSTANTS` (`src/app/common/sqlAnalyzerUtils.ts`), plus fixed level thresholds on the normalized scale (LOW < 25, MEDIUM 25–54, HIGH 55–79, SUPER_HIGH ≥ 80) using the analyzer's existing vocabulary. The current dynamic denominator (`maxScorePossible = max(median of localStorage score history, MIN_SAFE_MEDIAN)`), `percentageOfMax` and the dynamic `levelThresholds` remain available only as Advanced Details metadata and are removed from every primary complexity display on every surface.
- **Rationale**: The audit proved the defect: the denominator is user-history-dependent (irreproducible across users/sessions), yields "483 / 95"-style displays and percentages above 100%, and lets level boundaries drift per user — violating FR-001/FR-008 and the clarification that every complexity surface shows the normalized score. A saturation curve is monotonic, dialect- and history-independent, and degrades gracefully instead of capping abruptly; fixed thresholds keep the existing LOW/MEDIUM/HIGH/SUPER_HIGH vocabulary (FR-028).
- **Alternatives considered**: (a) Keep the dynamic median denominator but relabel it — rejected: still non-authoritative and irreproducible. (b) Normalize inside the UI/dashboard adapter — rejected: hides the defect at the wrong layer (FR-008) and leaves other surfaces inconsistent. (c) Linear `min(100, raw / MAX_RAW × 100)` — rejected: cliff at the cap. The curve constant and thresholds are calibrated in tasks against the existing weight matrix and locked by unit tests.

## R2 — Severity vocabulary for the Health Summary

- **Decision**: The Health Summary counts findings using the analyzer's actual severity vocabulary — `LintingIssue.severity: 'error' | 'warning'` — rendered with text labels plus color (error → red family, warning → amber family). No Critical/High/Medium/Info scale is invented.
- **Rationale**: FR-005/FR-023 and the spec's "never invent severity" rule; the audit found exactly two severities in the existing finding model.
- **Alternatives considered**: Introduce a richer severity scale in the analyzer — rejected: changes finding semantics (FR-024) and fabricates precision the analyzer does not have.

## R3 — Top Findings source, grouping and ordering

- **Decision**: Top Findings are built in the adapter from `AnalysisResult.detailedComplexity.lintingIssues` (the same rule set the shared `LintingAlerts` surface computes on the query-input and smart-editor pages), grouped by rule with occurrence counts, ordered errors-before-warnings then by occurrence count, each showing rule, message (why it matters), suggestion, and `location` when present. MyBatis findings merge in when the input mode is MyBatis.
- **Rationale**: Reuses the existing finding model and rule set (FR-005) and the already-computed result (FR-026) — the dashboard never re-lints SQL itself.
- **Alternatives considered**: Reuse the `LintingAlerts` component directly in the dashboard — rejected: it takes raw `sql` and recomputes findings on every render, violating FR-026 and duplicating work already stored in `analysisResult`.

## R4 — Complexity contributor ranking

- **Decision**: Contributors are derived in the adapter from the existing scoring structures — `DetailedComplexityScore.scoreBreakdown` (keyword categories including join types, CTEs, subqueries, window functions, select-field factors) and `ComplexityScore.factors` (`name / value / weight / contribution`) — ranked by contributed points descending with each contributor's share of the raw total.
- **Rationale**: Actual contribution data already exists in the computed result; no new scoring engine (the spec forbids a parallel analyzer).
- **Alternatives considered**: A new per-construct scorer — rejected: duplicate engine. Display in SQL syntax order — rejected: FR-006 requires actual-contribution ranking.

## R5 — Section capability model (supported / partial / unsupported)

- **Decision**: Introduce `CapabilityStatus = 'supported' | 'partial' | 'unsupported'`, resolved per section per object type in a pure `capability.ts`. For Query objects: complexity, findings, structure, JOIN, CTE, SELECT and functions = supported; dependencies = partial (direct CTE/table references exist; transitive counts, depth and cycles are not computed by the analyzer); predicates = partial (`metrics.conditionCount` exists; AND/OR split and maximum nesting depth are not in `AnalysisResult`). Non-Query object types (CTE / View / Procedure / Function / Trigger) = unsupported for now (their analyzer modules are placeholder files), so the reusable shell renders capability messages, never fake zeros.
- **Rationale**: FR-013/FR-014/FR-015; the audit confirmed predicate-depth and dependency-graph data are absent from the current result, and the object-type analyzers are empty placeholders.
- **Alternatives considered**: Compute AND/OR counts and nesting depth in the adapter from `rawSql` — rejected: presentation-layer parsing contradicts FR-026 and the analyzer-as-source-of-truth principle; that belongs in the analyzer as a later capability upgrade. Show `0` for missing data — rejected: the fake-zero anti-pattern the spec explicitly forbids.

## R6 — i18n keys

- **Decision**: All new strings are flat, typed keys in `src/locales/{en,vi}.ts` (e.g. `analysisHealthTitle`, `analysisFindingsTitle`, `analysisContributorsTitle`, `analysisCapabilityUnsupported`, `analysisAiInsightsTitle`) consumed via the existing `getT(locale)`; SQL technical terms (CTE, JOIN, GROUP BY, dialect names, rule IDs) remain untranslated.
- **Rationale**: FR-022 and the source prompt's "reuse the existing i18n architecture"; the audit found a flat typed-key schema (`TranslationKey = keyof typeof en`) — a nested `analysis.health.title` scheme would be a second i18n system.
- **Alternatives considered**: Nested semantic key namespaces — rejected: incompatible with the existing schema and typing.

## R7 — AI Insights grounding, labeling and safety

- **Decision**: AI Insights call the existing `aiService` (`AIGenerateRequest` with `jsonMode` where structured) through new vi/en prompt builders in `src/lib/sql/dashboard/aiPrompts.ts` (explain complexity, explain finding, optimization opportunities), grounded with the existing `fitContextBrief` parser-facts brief. Responses render in a visibly AI-labeled panel; deterministic sections never depend on them; failures degrade gracefully (FR-019/FR-021). SQL suggestions render as original-versus-suggested with compare / copy / apply-as-new-version; "apply" appends a new `QueryHistoryEntry` via the existing `/api/history` server route, leaving the original intact.
- **Rationale**: Clarification Q2 (separate new version, original recoverable); constitution IV (grounded, never contradicting parser facts) and V (Ollama default, server-proxied).
- **Alternatives considered**: Apply by overwriting editor content — rejected: violates never-silently-overwrite. A new versioning store — rejected: server-side history already exists and is the product's version record.

## R8 — Reuse of drill-down and graph destinations

- **Decision**: Drill-down reuses existing plumbing: `pendingEditorJump {sql, line}` for source highlighting, `beginNavigation('/cte-analysis')` for the CTE dependency graph, the relationship-graph route for table dependencies, and `metricDetails` line data (via the existing `MetricDetailDrawer`) for metric detail.
- **Rationale**: FR-017 and the spec assumption that drill-down destinations reuse existing views.
- **Alternatives considered**: A new in-dashboard source viewer — rejected: duplicates the editor and the existing jump mechanism.

## R9 — App-wide normalized score surfaces

- **Decision**: Every surface that displays complexity is updated to the normalized score + level: the dashboard hero/health summary, shared `components/ui/ComplexityDashboard` and `ComplexityBreakdown`, the guideline page's `ScoreWeightTable` context, and the smart-sql-editor before/after comparison panels.
- **Rationale**: Clarification Q1 (every complexity display) and SC-002.
- **Alternatives considered**: Dashboard-only — rejected by clarification.