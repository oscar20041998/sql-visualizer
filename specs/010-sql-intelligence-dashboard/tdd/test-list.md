---
feature: 010-sql-intelligence-dashboard
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 29
planned_at: 216ac60
updated_at: 216ac60
suite_baseline: green
---

# Test List: SQL Intelligence Dashboard

## Outer loop: acceptance behaviors

One per acceptance criterion in `spec.md` — the numbered Given/When/Then scenarios of User Stories 1–7. 29 criteria yield 27 behaviors: US6.1+US6.4 and US7.1+US7.2 are merged pairs (a single bug fails each pair together). **Test level**: the stack profile records no acceptance runner (`acceptance: null`), so these run as integration tests — the composed `MetricsDashboardContent` rendered through the real app store under jsdom + Testing Library — not end-to-end browser tests. Each stays red until the feature works through that entry point.

| id  | behavior                                                                                                                              | traces                       | kind  | state   | test |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- | ----- | ------- | ---- |
| A1  | Analyzing a statement and opening the dashboard shows a health summary with exactly one primary complexity score as X / 100, a level label, and error/warning finding counts | US1.1, FR-001, FR-002, SC-001, SC-002 | example | DONE | `tests/unit/sqlMetricsDashboard.test.tsx::shows exactly one normalized score as X / 100 with a level label and error/warning counts (A1)`; analysis entry point: `tests/unit/query-input-analysis-state.test.tsx::clears a stale failure and stores the new result when a later analysis succeeds` |
| A2  | The raw complexity score is reachable only as secondary or advanced detail and never competes with the normalized score in the primary view | US1.2, FR-001, FR-027        | example | DONE | `tests/unit/sqlMetricsDashboard.test.tsx::keeps every raw or intermediate score value out of the primary health view (A2, primary clause)`, `::keeps the raw score, dynamic denominator, share and rule ids behind the disclosure and states what is unavailable` |
| A3  | When the analyzer does not reliably support risk or maintainability scoring, no such scores are displayed                              | US1.3, FR-003                | example | DONE | `tests/unit/sqlMetricsDashboard.test.tsx::never fabricates risk or maintainability scores (A3, U29)` |
| A4  | Re-analysis after a SQL edit refreshes the health summary in place, without a full page reload                                        | US1.4, FR-016                | example | DONE | `tests/unit/sqlMetricsDashboard.test.tsx::refreshes in place when a new analysis result arrives, with no reload (A4)`, `::shows the new result instead of a stale failure once a successful analysis arrives (A4, FR-016)`; entry-point republish: `tests/unit/query-input-analysis-state.test.tsx::records the failure in the store so the dashboard can show it and offer a retry` |
| A5  | A top findings area is visible without scrolling and lists the most severe findings first, following the analyzer's actual severity ordering | US2.1, FR-005, SC-004        | example | PENDING |      |
| A6  | Each displayed finding shows its occurrence count and every source location the analyzer knows                                        | US2.2, FR-005, FR-018        | example | PENDING |      |
| A7  | A finding type with no existing optimization function offers no optimize action — only actions that genuinely exist                   | US2.3, FR-005                | example | PENDING |      |
| A8  | Finding severities appear exactly as the analyzer reported them (error / warning), never invented or upgraded                          | US2.4, FR-005, FR-011        | example | PENDING |      |
| A9  | Complexity contributors are ranked by actual contribution descending — not SQL text order — each with its points and share of total   | US3.1, FR-006, SC-005        | example | PENDING |      |
| A10 | The detailed complexity breakdown shows count, impact and contribution share per category, consistent with the analyzer's raw scoring | US3.2, FR-007, SC-005        | example | PENDING |      |
| A11 | Activating a breakdown row that has source information reaches the related detailed analysis                                          | US3.3, FR-007, FR-017        | example | PENDING |      |
| A12 | A breakdown category without impact data displays no fabricated impact value                                                          | US3.4, FR-007, FR-012        | example | PENDING |      |
| A13 | All existing structural metrics remain available on the dashboard, organized into logical groups rather than an undifferentiated grid | US4.1, FR-004, SC-003        | example | PENDING |      |

| A14 | An analysis type unsupported for the object communicates unavailability and never displays a zero implying "none found"               | US4.2, FR-013, SC-006        | example | PENDING |      |
| A15 | A partially supported analysis communicates its limitation clearly                                                                    | US4.3, FR-013                | example | PENDING |      |
| A16 | Only tabs supported for the analyzed object are shown, with no meaningless empty tabs                                                 | US4.4, FR-009                | example | PENDING |      |
| A17 | The advanced details area exposes the raw score, analyzer/parser metadata, rule identifiers and AST statistics where provided, without cluttering the default view | US4.5, FR-027 | example | PENDING |      |
| A18 | Activating the JOIN count metric opens the JOIN analysis view                                                                         | US5.1, FR-017, FR-010        | example | PENDING |      |
| A19 | Opening a finding shows its details                                                                                                   | US5.2, FR-017                | example | PENDING |      |
| A20 | Activating a finding's source location highlights the SQL source at that position                                                     | US5.3, FR-017, FR-018, SC-010 | example | PENDING |      |
| A21 | Selecting a CTE, where CTE analysis is supported, opens the CTE dependency graph                                                      | US5.4, FR-017, FR-010        | example | PENDING |      |
| A22 | Dashboard elements with no meaningful destination are not presented as interactive                                                    | US5.5, FR-017                | example | PENDING |      |
| A23 | AI explanations render visibly labeled as AI-generated, distinguishable from deterministic output, and consistent with the deterministic facts | US6.1, US6.4, FR-019, SC-011 | example | PENDING |      |
| A24 | An AI-proposed SQL change presents original versus suggested SQL with compare, copy and apply-as-new-version; applying creates a new, separate version with the original fully intact | US6.2, FR-020 | example | PENDING |      |
| A25 | With the AI service unavailable, every deterministic analysis feature keeps working normally                                          | US6.3, FR-021, SC-008        | example | PENDING |      |
| A26 | In either supported language every new or modified label renders in that language, updates on switch, keeps SQL technical terms untranslated, and no hard-coded strings exist | US7.1, US7.2, FR-022, SC-007 | example | PENDING |      |
| A27 | Longer English strings render completely without breaking the dashboard layout (jsdom proxy: full label rendering; visual leg is manual per quickstart.md step 6) | US7.3, FR-022 | example | PENDING |      |

## Inner loop: unit behaviors

Grouped by the component from `plan.md` that owns them. Characterization baselines come first: they capture what the code does today and must be green against untouched code before anything changes (brownfield rule).

### `src/lib/sql/complexityScorer.ts`

| id  | behavior                                                                                                                    | traces              | kind             | state    | test |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------- | -------- | ---- |
| U1  | For a fixed sample query the current raw totalScore equals the sum of its keyword, select-field, CTE, window-function and subquery subtotals (locks the weight matrix before any change) | FR-024, FR-026 | characterization | BASELINE | `tests/unit/complexityScorer.baseline.test.ts::keeps the raw total equal to the sum of its keyword, select-field, CTE, window-function and subquery subtotals` |
| U2  | The current linting pass reports SELECT * as a finding with rule id, message and suggestion for a sample containing it, and none for a sample without | FR-005, FR-024 | characterization | BASELINE | `tests/unit/complexityScorer.baseline.test.ts::reports SELECT * as a warning finding with rule, message, suggestion and location`, `::reports no SELECT * finding for a statement that lists its columns` |
| U3  | The normalized score is 0 for a raw score of 0 and rises monotonically toward but never beyond 100 as the raw score grows (sampled at raw 0, small, mid and very large — no property tool in the profile) | FR-001, US1.1 | example | DONE | `tests/unit/complexityNormalization.test.ts::maps a raw score of 0 to 0 and rises monotonically toward but never beyond 100` |
| U4  | Normalized 24 resolves to LOW and normalized 25 resolves to MEDIUM (both sides of the first threshold)                      | FR-001, FR-028      | example          | DONE     | `tests/unit/complexityNormalization.test.ts::resolves both sides of the LOW/MEDIUM boundary` |
| U5  | Normalized 54 resolves to MEDIUM and normalized 55 resolves to HIGH                                                         | FR-001, FR-028      | example          | DONE     | `tests/unit/complexityNormalization.test.ts::resolves both sides of the MEDIUM/HIGH boundary` |
| U6  | Normalized 79 resolves to HIGH and normalized 80 resolves to SUPER_HIGH                                                     | FR-001, FR-028      | example          | DONE     | `tests/unit/complexityNormalization.test.ts::resolves both sides of the HIGH/SUPER_HIGH boundary` |
| U7  | Identical SQL yields an identical normalized score and level with an empty localStorage history and with a populated one (history-independence) | FR-001, FR-008, SC-002 | example | DONE  | `tests/unit/complexityNormalization.test.ts::yields the same normalized score and level with an empty and a skewed score history` |
| U8  | Empty or whitespace-only SQL scores raw 0, normalized 0, level LOW and produces no linting issues                           | FR-001              | example          | DONE     | `tests/unit/complexityNormalization.test.ts::scores empty and whitespace-only SQL as raw 0, normalized 0, level LOW, with no linting issues` |
| U9  | The legacy dynamic fields (maxScorePossible, percentageOfMax) remain computed for Advanced Details and never feed the normalized level | FR-001, FR-027 | example | DONE | `tests/unit/complexityNormalization.test.ts::still computes maxScorePossible and percentageOfMax, and derives the normalized level only from the normalized score` |

### `src/lib/sql/dashboard/capability.ts`

| id  | behavior                                                                                                    | traces              | kind    | state   | test |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------- | ------- | ------- | ---- |
| U10 | A Query object resolves complexity, findings, structure, JOIN, CTE, SELECT and functions to supported       | FR-013, FR-014      | example | DONE | `tests/unit/dashboardCapability.test.ts::resolves the core analysis sections to supported for a query object (U10)` |
| U11 | A Query object resolves dependencies to partial and predicates to partial                                   | FR-013, FR-015      | example | DONE | `tests/unit/dashboardCapability.test.ts::resolves dependencies and predicates to partial for a query object (U11)` |
| U12 | Non-Query object types resolve their analysis sections to unsupported, which must render as a message, never a zero | FR-013, FR-014 | example | DONE | `tests/unit/dashboardCapability.test.ts::resolves every analysis section to unsupported for non-query object types (U12)` |

### `src/lib/sql/dashboard/buildDashboardData.ts`

| id  | behavior                                                                                                    | traces              | kind    | state   | test |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------- | ------- | ------- | ---- |
| U13 | health carries exactly one normalizedScore with level, rawScore only as a secondary field, and findingCounts by error/warning | FR-001, FR-002  | example | DONE | `tests/unit/dashboardData.test.ts::carries one normalized score with level, rawScore as secondary, and grouped error/warning counts (U13)` |
| U14 | Findings are grouped by rule with occurrence counts, ordered error-before-warning then occurrences descending, with locations copied verbatim | FR-005          | example | DONE | `tests/unit/dashboardData.test.ts::groups findings by rule with occurrences and verbatim locations, ordered error-first (U14)` |
| U15 | A rule without an existing optimization function gets no optimize action; viewSql appears only when a location exists; explainAi only when AI is available | FR-005, FR-017 | example | DONE | `tests/unit/dashboardData.test.ts::offers only real actions: viewSql with a location, explainAi with AI, optimize never without a function (U15)` |
| U16 | MyBatis findings merge into the finding list when the input mode is MyBatis                                 | FR-005              | example | DONE | `tests/unit/dashboardData.test.ts::merges MyBatis findings into the list only when the input mode is MyBatis (U16)` |
| U17 | Contributors are ranked by points descending with share = points / raw total, and a raw total of 0 yields an empty contributor list with no division and no fake zeros | FR-006, FR-007 | example | DONE | `tests/unit/dashboardData.test.ts::ranks contributors by points descending with shares of the raw total, empty at raw 0 (U17)` |
| U18 | Two adapter calls with the same AnalysisResult produce deep-equal output while touching no localStorage, network or parser (determinism, single computation) | FR-026, contract §1 | example | DONE | `tests/unit/dashboardData.test.ts::is deterministic and touches no storage (U18)` |
| U19 | A missing detailedComplexity resolves complexity capability to partial and fabricates no score values        | FR-013, FR-016      | example | DONE | `tests/unit/dashboardData.test.ts::downgrades to partial with no fabricated values when detailedComplexity is missing (U19)` |
| U20 | The structure groups contain every existing SqlMetrics key (zero-regression guard on metric availability)   | FR-004, SC-003      | example | DONE | `tests/unit/dashboardData.test.ts::keeps every existing SqlMetrics key in the structure groups (U20)` |
| U21 | detailTabs excludes unsupported sections and the dependencies tab carries its partial capability             | FR-009, FR-015      | example | DONE | `tests/unit/dashboardData.test.ts::emits tabs only for non-unsupported sections, dependencies partial (U21)` |
| U22 | A genuine zero (e.g. 0 window functions) renders as 0 while unsupported data is absent — the two remain distinguishable | FR-013, SC-006 | example | DONE | `tests/unit/dashboardData.test.ts::keeps a genuine zero metric present while unsupported data has no fake zero fields (U22)` |

### `src/lib/sql/dashboard/aiPrompts.ts`

| id  | behavior                                                                                                    | traces              | kind    | state   | test |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------- | ------- | ------- | ---- |
| U23 | The explainComplexity prompt embeds the top contributors, normalized score and level, with distinct en and vi variants | FR-019, ai-insights §requests | example | DONE | `tests/unit/dashboardAiPrompts.test.ts::embeds top contributors, normalized score and level, with distinct vi/en variants (U23)` |
| U24 | The explainFinding prompt embeds the rule and message, plus the location when one exists                    | FR-019              | example | DONE | `tests/unit/dashboardAiPrompts.test.ts::embeds the rule and message, plus the location only when present (U24)` |
| U25 | The optimizationOpportunities prompt requests the documented JSON shape (items with title, rationale, optional suggestedSql) | FR-019, FR-020 | example | DONE | `tests/unit/dashboardAiPrompts.test.ts::requests the documented JSON shape with title, rationale and optional suggestedSql (U25)` |

### `src/app/sql-metrics-dashboard/components/MetricsDashboardContent.tsx`

| id  | behavior                                                                                                    | traces              | kind             | state    | test |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------- | ---------------- | -------- | ---- |
| U26 | The current section order, CTE navigation button and empty state render as they do today (captured before rewiring) | FR-024, SC-003 | characterization | BASELINE | `tests/unit/sqlMetricsDashboard.baseline.test.tsx::renders the current section order with the CTE navigation available when CTEs exist`, `::renders the empty state guidance when no analysis result exists`, `::hides the CTE navigation when the statement has no CTEs` |
| U27 | Loading renders skeletons with no metric values, empty renders guidance, and analysis failure renders an error message with a retry action — no stale metrics shown as current | FR-016 | example | DONE | `tests/unit/sqlMetricsDashboard.test.tsx::renders skeletons with no metric values while analysis runs`, `::shows the failure message and re-runs the analysis of the current SQL on retry (A4/FR-016)`, `::records the failure when the retried analysis rejects, staying in the error state`, `::re-runs the resolved MyBatis SQL rather than stale raw SQL (FR-016)`, `::does not offer a retry that would re-analyse SQL the dashboard does not have (FR-003, FR-016)`; empty guidance retained by `tests/unit/sqlMetricsDashboard.baseline.test.tsx::renders the empty state guidance when no analysis result exists` |
| U28 | Sections render in the order health → findings → contributors → structure/tabs → AI, and tabs plus actions are reachable and operable by keyboard with text labels | FR-002, FR-009, FR-025 | example | PENDING |      |

### `src/app/sql-metrics-dashboard/components/AnalysisHealthSummary.tsx`

| id  | behavior                                                                                                    | traces              | kind    | state   | test |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------- | ------- | ------- | ---- |
| U29 | The summary shows "X / 100" with a level text label and error/warning counts with text labels; no raw score, denominator or percentage appears in the primary view, and unsupported risk/maintainability scores are absent | FR-001, FR-002, FR-003, SC-002 | example | DONE | `tests/unit/sqlMetricsDashboard.test.tsx::shows exactly one normalized score as X / 100 with a level label and error/warning counts (A1)`, `::keeps every raw or intermediate score value out of the primary health view (A2, primary clause)`, `::never fabricates risk or maintainability scores (A3, U29)` |

### `src/app/sql-metrics-dashboard/components/TopFindings.tsx`

| id  | behavior                                                                                                    | traces              | kind    | state   | test |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------- | ------- | ------- | ---- |
| U30 | Findings render with severity text labels, titles, occurrence counts and locations; activating a location sets the editor jump so the SQL source is highlighted at that line | FR-005, FR-017, FR-018, SC-010 | example | PENDING |      |
| U31 | Opening a finding shows its details — why it matters and the suggestion                                     | FR-005, FR-017      | example | PENDING |      |

### `src/app/sql-metrics-dashboard/components/TopComplexityContributors.tsx`

| id  | behavior                                                                                                    | traces              | kind    | state   | test |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------- | ------- | ------- | ---- |
| U32 | Contributors render ranked by points with points and share labels, and breakdown rows carry count, impact and share; a row with source information drills into its detail | FR-006, FR-007, FR-017 | example | PENDING |      |

### `src/app/sql-metrics-dashboard/components/AnalysisTabs.tsx` (+ JOIN/CTE/Predicates/SELECT/Functions/Dependencies tab content)

| id  | behavior                                                                                                    | traces              | kind    | state   | test |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------- | ------- | ------- | ---- |
| U33 | Only supported tabs render, and unsupported or partial sections show their capability message — never a zero value | FR-009, FR-013, SC-006 | example | PENDING |      |
| U34 | Activating the JOIN metric opens the JOIN tab, and selecting a CTE navigates to the CTE dependency graph where CTE analysis is supported | FR-017, FR-010 | example | PENDING |      |

### `src/app/sql-metrics-dashboard/components/AdvancedDetails.tsx`

| id  | behavior                                                                                                    | traces              | kind    | state   | test |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------- | ------- | ------- | ---- |
| U35 | Raw score, analyzer/parser metadata, rule identifiers and AST statistics render behind progressive disclosure and are absent from the default view | FR-027, FR-001 | example | DONE | `tests/unit/sqlMetricsDashboard.test.tsx::keeps the raw score, dynamic denominator, share and rule ids behind the disclosure and states what is unavailable` |

### `src/app/sql-metrics-dashboard/components/AiInsights.tsx`

| id  | behavior                                                                                                    | traces              | kind    | state   | test |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------- | ------- | ------- | ---- |
| U36 | AI output renders only inside a visibly labeled AI panel while deterministic sections render independently of AI state | FR-019, SC-011     | example | PENDING |      |
| U37 | With AI unavailable the panel shows its unavailable state and every deterministic section still renders     | FR-021, SC-008      | example | PENDING |      |
| U38 | Suggested SQL renders original versus suggested with compare, copy and apply-as-new-version; apply appends a new history entry (mocked history service) and never mutates the original | FR-020, US6.2 | example | PENDING |      |

### `src/components/ui/ComplexityDashboard.tsx` (+ ComplexityBreakdown, guideline ScoreWeightTable, smart-sql-editor comparison panels)

| id  | behavior                                                                                                    | traces              | kind             | state    | test |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------- | ---------------- | -------- | ---- |
| U39 | The shared ComplexityDashboard's current score display is captured before it is changed                     | FR-024, SC-003      | characterization | BASELINE | `tests/unit/complexitySurfaces.baseline.test.tsx::shows the current raw score over the dynamic denominator with a percentage of max` |
| U40 | Every shared complexity surface renders the normalized score with level and no dynamic denominator or >100% percentage in its primary display | FR-001, SC-002 | example | PENDING |      |

### `src/locales/en.ts` / `src/locales/vi.ts`

| id  | behavior                                                                                                    | traces              | kind    | state   | test |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------- | ------- | ------- | ---- |
| U41 | Every new dashboard key exists in both en and vi with non-empty values (typed schema keeps them in sync)    | FR-022, SC-007      | example | PENDING |      |
| U42 | Rendering with the vi locale shows Vietnamese labels while SQL technical terms (CTE, JOIN, GROUP BY, dialect names, rule ids) remain untranslated | FR-022 | example | PENDING |      |

### `src/app/query-input/page.tsx` (analysis entry point)

| id  | behavior                                                                                                    | traces              | kind    | state   | test |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------- | ------- | ------- | ---- |
| U43 | The entry point that runs the analysis publishes the store state the dashboard renders from: `isAnalyzing` while in flight, `analysisError` on failure (and no navigation to a dashboard that has no result), and `analysisResult` with the error cleared on success | FR-016, US1.4 | example | DONE | `tests/unit/query-input-analysis-state.test.tsx::shows the loading state while the analysis is in flight`, `::records the failure in the store so the dashboard can show it and offer a retry`, `::clears a stale failure and stores the new result when a later analysis succeeds` |

## Invariants and edge cases still to place

- None unplaced: the 50+ table performance expectation (SC-009) is structurally covered by U18 (pure, single-pass adapter) and validated manually per quickstart.md step 8 — see Out of scope.

## Out of scope

- Transitive dependency counts, dependency depth and cycles: the analyzer does not compute them (FR-015 "where supported"); a later analyzer capability upgrade, not this feature.
- AND/OR predicate split and maximum predicate nesting depth: not present in `AnalysisResult` (the predicates section is deliberately partial).
- Non-Query object analysis (CTE / View / Procedure / Function / Trigger): their analyzer modules are placeholders; this feature delivers the shell and capability states only (FR-014).
- Wall-clock performance test for 50+ table queries: timing assertions are flaky in CI; validated manually per quickstart.md step 8 against SC-009.
- Visual layout/legibility at real viewport sizes (spacing, focus rings, first-viewport pixels): jsdom cannot compute layout; manual legs per quickstart.md (convention carried over from specs/008-query-input-ux).
- New AI providers or client-side AI credentials: out of scope per spec assumptions.

## Verification commands

Copied verbatim from `.specify/memory/tdd-profile.md` at planning time, so this file is readable on its own:

- Single test: `npx vitest run {file} -t "{name}"`
- Single file: `npx vitest run {file}`
- Full suite: `npm test`
- Watch: `npx vitest`
- Coverage / mutation / acceptance / property / contract: none recorded in the profile (`null`) — do not guess commands for them.