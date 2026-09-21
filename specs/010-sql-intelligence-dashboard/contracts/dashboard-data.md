# Contract: Dashboard Data

**Producer**: `buildDashboardData(analysis: AnalysisResult, context: { locale: Locale; aiAvailable: boolean; inputMode: InputMode }): SqlAnalysisDashboardData` — a pure function in `src/lib/sql/dashboard/buildDashboardData.ts`.
**Consumers**: dashboard components (render-only; no analysis logic inside components).

1. **Deterministic & side-effect-free**: the same `AnalysisResult` always yields the same `SqlAnalysisDashboardData` — no localStorage access, no re-parsing, no re-linting, no network calls.
2. **Single authoritative score**: `health.complexity.normalizedScore` is the only score consumers render as primary; `rawScore` and legacy dynamic values appear only in `advanced` (Advanced Details) or explicit secondary detail.
3. **Findings**: grouped by `rule` from `detailedComplexity.lintingIssues` (plus MyBatis findings when `inputMode` is MyBatis); ordering = severity (`error` before `warning`) then occurrences descending; `locations` copied verbatim from `LintingIssue.location`; `actions` limited to capabilities that genuinely exist (`optimize` only where an optimization function exists for the rule).
4. **Contributors**: derived from `ComplexityScore.factors` / `scoreBreakdown`; sorted by points descending; `shareOfTotal` = points / raw total (guarded when the total is 0).
5. **Capabilities**: resolved via `capability.ts`; when a section is `unsupported`, consumers MUST render the unavailability message and MUST NOT render zero values for its data; when `partial`, the supported subset renders with a clear limitation note.
6. **Tabs**: only sections whose capability is not `unsupported` produce tabs — no empty tabs.
7. **i18n**: the adapter emits keys and identifiers only — never translated prose; components resolve text via `getT(locale)`.
8. **Object types**: `objectType: 'query'` today; the contract is additive — future analyzers (CTE / View / Procedure / Function / Trigger) extend the union without breaking consumers.

**Error handling**: missing `detailedComplexity` → complexity capability `partial` and the health summary shows its level/score-unavailable message; `analysisResult == null` → the dashboard renders its empty state (not an adapter concern); analysis failure → error state with retry via the existing store flow.