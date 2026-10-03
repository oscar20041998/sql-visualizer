# Data Model: SQL Intelligence Dashboard

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-09-21

Entity view of the data this feature reads and produces. Existing models in `src/lib/sql/` are extended additively; new dashboard types live in `src/lib/sql/dashboard/types.ts` (contract: [contracts/dashboard-data.md](./contracts/dashboard-data.md)).

## Existing entities (reused)

### AnalysisResult (`src/lib/sql/sqlAnalyzer.ts`)
The single source of truth produced by `analyzeSql(sql, dialect, locale)`: `tables: TableNode[]`, `joins: JoinEdge[]`, `joinAnalysisDetails`, `ctes: CTE[]`, `metrics: SqlMetrics`, `complexity: ComplexityScore`, `detailedComplexity?: DetailedComplexityScore`, `executionCost`, `mainQueryFields`, `dialect`, `rawSql`, `structuralReport`, `metricDetails`, `hasCTE`.
**Additive change**: `detailedComplexity` gains `normalizedScore` (0–100), `normalizedLevel` and fixed `normalizedThresholds`; legacy dynamic fields (`maxScorePossible`, `percentageOfMax`, dynamic `levelThresholds`) remain as Advanced Details metadata only.

### ComplexityScore / DetailedComplexityScore (`complexityScorer.ts`)
- Raw score: `totalScore` = keyword + select-field + CTE + window-function + subquery scores.
- Levels: `ComplexityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'SUPER_HIGH'` (unchanged vocabulary, now mapped from fixed normalized thresholds).
- Contributor inputs: `ComplexityScore.factors[] {name, value, weight, contribution}` and `DetailedComplexityScore.scoreBreakdown` (keyword categories incl. join types, select-field factors, CTE/subquery/window-function subtotals).

### Finding — LintingIssue (`complexityScorer.ts`)
`{ rule: string; severity: 'warning' | 'error'; message: string; suggestion: string; location?: string }`. Grouped by rule in the adapter (occurrences = group size). MyBatis findings (`src/lib/sql/mybatis/findings.ts`) merge when the input mode is MyBatis.

### CTE / TableNode / JoinEdge / NestedSubquery / MetricDetailItem
Unchanged. `NestedSubquery.line` / `MetricDetailItem.line` power source drill-down; `CTE.dependencies`, `isRecursive`, `usageCount`, `isUnused` power CTE detail and direct dependencies.

### QueryHistoryEntry (`src/lib/queryHistory.ts`)
Server-persisted history entry. "Apply as New Version" appends a new entry; existing entries are never mutated.

### Analysis state lifetime (`src/lib/store.ts`) — decision
`analysisResult` is **session-only**: the store's `persist.migrate` explicitly drops it, so reloading `/sql-metrics-dashboard` returns to the empty state until a fresh analysis runs. `isAnalyzing` and `analysisError` are likewise runtime-only; `analysisError` is cleared by `setAnalysisResult` so a stale failure can never mask a successful analysis.

**Decision (kept as-is, not changed by this feature)**: remain ephemeral rather than persist the last result.
- Persisting would resurface an analysis of SQL the user may have since edited, i.e. stale metrics presented as current — the exact failure mode FR-016 / U27 forbids.
- It matches the committed store behavior, so persisting would be an out-of-scope behavior change.
- A serialized `AnalysisResult` is large and its shape drifts across versions (quota and migration risk).
- The empty state already gives actionable, localized guidance (`noMetrics` / `noMetricsHint` = "Analyze a query to see metrics"), covered by `tests/unit/sqlMetricsDashboard.baseline.test.tsx::renders the empty state guidance when no analysis result exists`.

Revisit only as an explicit product decision (e.g. persist with a visible "analysed at …" staleness marker), not silently.

## New entities (`src/lib/sql/dashboard/types.ts`)

### SqlAnalysisDashboardData
`{ objectType: 'query'; dialect; health: { complexity: { normalizedScore; level; rawScore? }; findingCounts: { error; warning } }; findings: DashboardFinding[]; contributors: ComplexityContributor[]; structure: { core: MetricGroup[]; advanced: MetricGroup[] }; detailTabs: DetailTab[]; dependencies: { direct: number; capability: CapabilityStatus }; capabilities: Record<DashboardSection, CapabilityStatus>; advanced: { rawScore; maxScorePossible; percentageOfMax; ruleIds } }`

### DashboardFinding
`{ rule; severity: 'error' | 'warning'; title; whyItMatters; suggestion; occurrences: number; locations?: string[]; actions: ('viewSql' | 'explainAi' | 'optimize')[] }` — actions include only what actually exists for the rule (`optimize` only where the product has an optimization function for it).

### ComplexityContributor
`{ construct: string; points: number; shareOfTotal: number }` — ranked by points descending; shares computed against the raw total.

### MetricGroup / DetailTab
`MetricGroup { key; metricKeys[] }` groups existing `SqlMetrics` into "core SQL structure" and "advanced SQL constructs". `DetailTab { section: DashboardSection; capability: CapabilityStatus }` — only non-unsupported sections become tabs.

### CapabilityStatus
`'supported' | 'partial' | 'unsupported'` — resolved per section per object type in `capability.ts`.

### DashboardSection
`'health' | 'findings' | 'complexity' | 'structure' | 'join' | 'cte' | 'predicates' | 'select' | 'functions' | 'dependencies' | 'ai' | 'advanced'`.

## Validation rules (from spec)
- `normalizedScore` ∈ [0, 100]; level derived only from fixed thresholds; identical on every complexity surface.
- Contributor shares are consistent with the raw total (tolerance locked in unit tests).
- Findings ordered error → warning, then occurrences descending; occurrence counts ≥ 1; locations only from analyzer data.
- Capability states never render fake zeros; a genuine zero remains distinguishable from unsupported.
- Every user-facing string resolved via i18n keys with complete vi + en entries.

## State transitions
- Re-analysis replaces `analysisResult` in the store; the dashboard re-derives `SqlAnalysisDashboardData` (skeleton while `isAnalyzing`; no stale metrics presented as current).
- AI suggestion → applied: appends a `QueryHistoryEntry` (new version); the editor loads the new version; the original remains in history.