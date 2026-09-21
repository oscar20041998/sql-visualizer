# Feature Specification: SQL Intelligence Dashboard

**Feature Branch**: `duyvt7`

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: "requirement from docs\ui-prompts\20260920\sql-visualizer-analysis-dashboard-improvement.prompt.md — improve the existing SQL Visualizer analysis dashboard into a SQL Intelligence Dashboard that answers what state the SQL is in, why it is complex, which structures contribute most, where the important findings are, and what the developer should inspect or improve next, while preserving existing analysis logic, metrics, database support, findings, interactions and architecture."

## Clarifications

### Session 2026-09-21

- Q: Should the single normalized complexity score apply everywhere the product displays complexity, or only within the analysis dashboard? → A: Every surface that displays complexity shows the normalized score, with the raw score only as secondary detail.
- Q: When the AI suggests modified SQL and the developer chooses "Apply as New Version", what exactly must happen to the developer's original SQL? → A: The suggested SQL is applied as a new, separate version and the original SQL remains fully intact and recoverable.
- Q: Should the dashboard include an Advanced Details area that exposes the raw score together with analyzer and parser metadata, rule identifiers and AST statistics for power users? → A: Yes — include the full advanced view (raw score, analyzer/parser metadata, rule identifiers, AST statistics) behind progressive disclosure. *(Content later scoped by the 2026-09-21 advanced-details decision: only data the analyzer actually produces renders; AST statistics and parser metadata are marked not yet available.)*
- Q: Which level labels should accompany the normalized complexity score wherever it is displayed? → A: Reuse the analyzer's existing level vocabulary where present; otherwise Low / Medium / High / Very High, applied consistently.
- Q: Must the dashboard's AI insights cite the documentation excerpts they used? → A: Yes — every AI insight (complexity, finding and optimization) carries the retrieved documentation sources with their labels, reusing the existing source-citation pattern, consistent with the constitution's AI-grounding principle.
- Q: Should the advanced details area show only the data the analyzer produces today, or should the analyzer be extended to produce AST statistics and parser metadata? → A: Show only what exists — the raw score, the legacy dynamic scoring fields and rule identifiers; AST statistics and analyzer/parser metadata are explicitly marked not yet available and the section carries a partial capability.
- Q: What should happen to the dashboard's existing complexity gauge, level-range bar and hero card once the new health summary occupies the top slot? → A: Retire them from the default view — the health summary takes the top slot and the raw-score visuals live behind the advanced details disclosure.
- Q: When an analysis fails, should the dashboard's error state re-run the analysis itself, or send the developer back to the query-input page? → A: The dashboard re-runs the analysis of the current SQL itself — showing a loading state, then either the result or the error again.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trust the complexity verdict at a glance (Priority: P1)

A developer has just analyzed a SQL statement and opens the analysis dashboard. Today the dashboard behaves like a wall of SQL counters, and its complexity display shows several competing numbers at once — a capped-looking score, a raw point total, a denominator and a percentage that do not obviously agree — which undermines trust. The developer wants the first viewport to answer one question within seconds: "How complex is this SQL and how much should I care?" — a single normalized complexity score with a plain level label, plus a summary of how many findings exist at each severity.

**Why this priority**: The health summary and the single authoritative score are the anchor of the whole dashboard. Every other improvement — findings, contributors, drill-down — is interpreted through this verdict, and the current confusing score presentation is an active trust problem that degrades the product today.

**Independent Test**: Analyze any statement and inspect only the top of the dashboard: exactly one primary normalized complexity score (a value out of 100 with a level label) is shown, finding counts by severity are summarized, no competing score numbers appear in the primary view, and the raw score is reachable only as secondary detail.

**Acceptance Scenarios**:

1. **Given** an analyzed SQL statement, **When** the analysis dashboard opens, **Then** the first viewport presents a health summary containing exactly one primary complexity score expressed as a normalized value out of 100 with a level label, together with the count of findings at each severity.
2. **Given** the same analysis, **When** the developer looks for the underlying raw score, **Then** it is available as secondary detail and never competes with the normalized score in the primary view.
3. **Given** an analyzer that does not reliably support risk or maintainability scoring, **When** the health summary renders, **Then** no risk or maintainability score is invented or displayed.
4. **Given** the developer edits the SQL and re-analysis completes, **When** the dashboard refreshes, **Then** the health summary reflects the new state without a full page reload.

---

### User Story 2 - See what matters first (Priority: P1)

A developer wants the most important analysis findings immediately, not buried among equal-weight metric cards. The dashboard surfaces a prominent Top Findings area: findings ordered by the analyzer's actual severity, each showing its severity (with a text label, never color alone), title, category, how many times it occurs, why it matters, the source locations where the analyzer knows them, and only the actions that genuinely exist for that finding.

**Why this priority**: Findings are the actionable core of the dashboard — they tell the developer what to inspect or improve next. Without them being immediately visible, the dashboard remains a statistics page rather than an intelligence tool.

**Independent Test**: Analyze a statement that produces findings of mixed severities: the top findings area is visible without scrolling, is ordered from most to least severe according to the analyzer's own severity data, and each finding shows a severity label, title, occurrence count, why-it-matters text, source locations when known, and only real actions.

**Acceptance Scenarios**:

1. **Given** an analysis producing findings of mixed severities, **When** the dashboard renders, **Then** a top findings area is visible without scrolling and lists the most severe findings first, following the analyzer's actual severity ordering.
2. **Given** a finding that occurs multiple times, **When** it is displayed, **Then** its occurrence count and every source location the analyzer knows (for example, line references) are shown.
3. **Given** a finding type for which no optimization function exists in the product, **When** its actions are displayed, **Then** no optimization action is offered — only actions that exist, such as viewing the SQL or requesting an explanation.
4. **Given** severity data from the analyzer, **When** findings are ordered and labeled, **Then** no severity is invented or upgraded beyond what the analyzer reported.

---

### User Story 3 - Understand why the SQL is complex (Priority: P2)

A developer accepts the complexity verdict and immediately asks: "What makes this SQL complex?" The dashboard answers with a ranked view of the top complexity contributors — the constructs (for example, CTEs, JOINs, window functions, GROUP BY) that actually contribute the most complexity points — each showing its contribution in points and its share of total complexity, sorted by real contribution rather than by where the construct appears in the SQL text. A detailed breakdown (category, count, impact, contribution share) is available for deeper inspection.

**Why this priority**: This explains the verdict from User Story 1 and turns the score from an opaque number into an inspection plan. It is second priority because knowing the state (User Story 1) and the findings (User Story 2) already delivers standalone value without it.

**Independent Test**: Analyze a statement with varied constructs: the contributors area ranks constructs by actual contribution in descending order, shows points and percentage share for each, and the shares are consistent with the displayed complexity scoring; the detailed breakdown shows count, impact and contribution per category.

**Acceptance Scenarios**:

1. **Given** an analysis with per-construct complexity contributions, **When** the contributors area renders, **Then** contributors are ranked by actual contribution descending — not by their order of appearance in the SQL — each with its complexity points and its percentage share of total complexity.
2. **Given** the detailed complexity breakdown, **When** the developer views it, **Then** each category row shows its count, its complexity impact and its contribution share, consistent with the analyzer's raw scoring.
3. **Given** a breakdown category for which source information exists, **When** the developer activates the row, **Then** the related detailed analysis is reachable.
4. **Given** a category for which impact data does not exist, **When** the breakdown renders, **Then** no fabricated impact value is displayed.

---

### User Story 4 - Explore structure without noise (Priority: P2)

A developer wants to explore the statement's structure without wading through an undifferentiated grid of cards. Structural metrics are grouped logically — core SQL structure (tables, JOINs, CTEs, subqueries, predicates, selected columns, SQL length) and advanced SQL constructs (window functions, GROUP BY, ORDER BY, DISTINCT, functions, UNION, CASE expressions) — with deeper analyses (JOIN, CTE, predicates, SELECT projection, functions, dependencies) organized behind tabs. Only tabs the analyzed object actually supports are shown, and unsupported analyses say so plainly ("not available for this object type") instead of displaying fake zero values.

**Why this priority**: It preserves everything the dashboard already offers while removing noise and false signals. It is independently valuable (better organization and truthful capability reporting) and independently testable, but the dashboard already informs without it.

**Independent Test**: Analyze a statement and verify: every previously available metric is still present but grouped; only supported analysis tabs appear; an analysis type unsupported for the object communicates unavailability rather than showing zero; partially supported analyses communicate their limits.

**Acceptance Scenarios**:

1. **Given** an analyzed statement, **When** the structural overview renders, **Then** all existing structural metrics remain available, organized into logical groups rather than an undifferentiated card grid.
2. **Given** an analysis type that is unsupported for the analyzed object (for example, dependency analysis for an object type where it does not apply), **When** its section renders, **Then** it clearly communicates that the analysis is not available, and never displays a zero value implying "none found".
3. **Given** an analysis type with partial support, **When** its section renders, **Then** the limitation is communicated clearly.
4. **Given** the set of detailed analyses, **When** the tabs render, **Then** only tabs supported for the analyzed object are shown, with no meaningless empty tabs.
5. **Given** the developer wants deeper technical detail, **When** the advanced details area is opened, **Then** the raw complexity score, the legacy dynamic scoring fields and rule identifiers are shown without cluttering the default view, and AST statistics and parser metadata are marked as not yet available.

---

### User Story 5 - Navigate from insight to source (Priority: P3)

A developer who sees an interesting number or finding wants to reach its source or detail in one step: activating the JOIN count opens JOIN analysis, opening a finding shows its details, activating a finding's location highlights the SQL source at that position, selecting a CTE opens the CTE dependency graph, and asking for an explanation opens the AI insight panel. Anything without a meaningful destination is not presented as interactive.

**Why this priority**: Drill-down multiplies the value of every other section but is not required for the dashboard to inform. It is an enhancer with clear standalone testability.

**Independent Test**: Starting from a finding that has a source location, reach the highlighted SQL source in at most one interaction; from the JOIN metric reach JOIN analysis; from a CTE (where CTE analysis is supported) reach the CTE dependency graph.

**Acceptance Scenarios**:

1. **Given** the JOIN count metric, **When** the developer activates it, **Then** the JOIN analysis view is presented.
2. **Given** a finding, **When** the developer opens it, **Then** its details are shown.
3. **Given** a finding with a known source location, **When** the developer activates the location, **Then** the SQL source is highlighted at that position.
4. **Given** a CTE in an analyzed statement where CTE analysis is supported, **When** the developer selects the CTE, **Then** the CTE dependency graph is presented.
5. **Given** any dashboard element with no meaningful destination, **When** the dashboard renders, **Then** that element is not presented as interactive.

---

### User Story 6 - Get optional, clearly-labeled AI insight without risk (Priority: P3)

A developer wants a plain-language explanation of why the query is complex, what a finding means, or what optimization opportunities and refactorings might exist. The optional AI assistant provides this on demand. Its output is always visibly labeled as AI-generated and stays consistent with the deterministic analysis; the deterministic analysis remains the source of truth for parsing, counts, structure, complexity, findings, dependencies and locations. If the AI proposes a SQL change, the original and suggested SQL are presented side by side with compare, copy and "apply as new version" actions — the developer's SQL is never silently modified. If the AI service is unavailable, every deterministic feature keeps working normally.

**Why this priority**: AI is an optional enhancement layer on top of a self-sufficient deterministic dashboard. It must never block or dilute deterministic analysis, so it is deliberately lower priority than the deterministic experience.

**Independent Test**: With the AI service available, request an explanation of the complexity and of one finding: responses are visibly labeled as AI-generated and consistent with the deterministic facts. With the AI service unavailable, verify the full dashboard (metrics, findings, contributors, navigation) still works unchanged.

**Acceptance Scenarios**:

1. **Given** an available AI assistant, **When** the developer requests an explanation of the complexity or a finding, **Then** the response is visibly labeled as AI-generated and does not contradict the deterministic analysis.
2. **Given** an AI-proposed SQL change, **When** the suggestion is displayed, **Then** original and suggested SQL are both presented with compare, copy and apply-as-new-version actions, and applying creates a new, separate SQL version with the original fully intact and recoverable — never a silent overwrite.
3. **Given** an unavailable AI service, **When** the dashboard is used, **Then** all deterministic analysis, metrics, findings and navigation continue to work normally.
4. **Given** any AI-generated content, **When** it is displayed, **Then** it is clearly distinguishable from deterministic analysis output.

---

### User Story 7 - Use the dashboard in Vietnamese or English (Priority: P3)

A developer switches the application language between Vietnamese and English. Every new or modified user-facing dashboard string appears correctly in the selected language, through the existing translation architecture, with no hard-coded strings and no fallback that leaks one language into the other. SQL technical terms and identifiers (SQL, CTE, JOIN, GROUP BY, SELECT, DISTINCT, dialect names, rule identifiers) are never translated, and layouts tolerate the longer English strings.

**Why this priority**: A required quality gate for the product's bilingual audience, but not a new analytical capability — the dashboard already functions in a single language without it.

**Independent Test**: Switch the application between Vietnamese and English on an analyzed statement: every new or modified label renders in the selected language, technical SQL terms stay untranslated, and no layout breaks under English text expansion.

**Acceptance Scenarios**:

1. **Given** the dashboard rendered in either supported language, **When** the developer reviews all new or modified user-facing strings, **Then** each appears fully in the selected language with no hard-coded strings.
2. **Given** a language switch while the dashboard is open, **When** the dashboard re-renders, **Then** all labels update to the new language while SQL technical terms and identifiers remain untranslated.
3. **Given** longer English strings, **When** the dashboard renders, **Then** spacing, alignment and wrapping tolerate the text expansion without breaking the layout.

---

### Edge Cases

- An analysis result lacks a metric that a section would normally show (the analyzer does not compute it for this object or dialect): the metric is omitted or its unavailability is stated — it is never displayed as a zero that implies "none found", and a genuine zero remains distinguishable from an unsupported value.
- The normalized complexity score, the raw score, or contributor totals are found to be mutually inconsistent: the inconsistency is corrected in the analysis data at its source layer, not cosmetically hidden in the presentation.
- Very long metric values, very long finding titles, or a very large number of findings: the layout stays usable and the findings list stays responsive (for example, progressive or lazy presentation of long lists).
- Analysis is still running: skeleton placeholders are shown and no fake metric values are presented as if analysis had completed.
- No analysis exists yet: the dashboard shows guidance (no analysis available — analyze a SQL statement to view metrics) instead of empty sections.
- Analysis fails: a clear failure message with a retry action is shown (the retry re-runs the analysis of the current SQL from the dashboard), and no stale metrics are presented as current.
- The object parsed successfully but an analysis type is unsupported for that object type: a partial state message names what is unavailable and why.
- A finding has no known source location: no location is displayed — locations are never invented.
- The AI service is unavailable or returns nothing useful: deterministic analysis is unaffected and the AI area degrades gracefully.
- The developer switches language mid-session: all dashboard labels update without requiring re-analysis.
- A statement is very large (50+ tables): the dashboard presentation stays within the project's one-second responsiveness standard.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The product MUST present exactly one authoritative normalized complexity score (on a 0–100 scale) with a level label wherever complexity is displayed — in the analysis dashboard and in every other surface that shows complexity — and MUST relegate raw or intermediate scoring values to secondary detail. The predecessor score visuals (hero card, gauge, level range) MUST NOT remain in the default dashboard view; their raw values are reachable only through the advanced details disclosure.
- **FR-002**: The dashboard MUST present a health summary at the top of the analysis view containing the normalized complexity score and the count of findings by severity, compact enough that the statement's state is understandable within the first viewport.
- **FR-003**: The system MUST display additional health dimensions (risk, maintainability, optimization opportunity) ONLY where the analyzer reliably supports them, and MUST NOT fabricate unsupported scores.
- **FR-004**: The dashboard MUST preserve every metric and finding capability available in the existing analysis, presented in logically grouped sections (core SQL structure; advanced SQL constructs) instead of an undifferentiated grid of cards.
- **FR-005**: The dashboard MUST present a top findings area that is visible without scrolling, ordered by the analyzer's actual severity, where each finding displays — where available — severity with a text label, title, category, occurrence count, why-it-matters, source locations, and only actions that genuinely exist for that finding.
- **FR-006**: The dashboard MUST rank complexity contributors by actual contribution in descending order, showing each contributor's complexity points and its share of total complexity.
- **FR-007**: The detailed complexity breakdown MUST show, per category, the count, complexity impact and contribution share consistent with the analyzer's raw scoring, and MUST support drill-down to related detail where source information exists.
- **FR-008**: Where the complexity presentation is inconsistent with the underlying analysis data, the system MUST correct the data contract at the analysis source layer rather than hide the inconsistency in the UI.
- **FR-009**: Detailed analyses MUST be organized behind tabs (for example, Overview, Structure, JOIN, CTE, Predicates, SELECT, Functions, Dependencies); only tabs supported for the analyzed object MAY be shown, and unsupported analyses MUST NOT appear as empty tabs.
- **FR-010**: Where the analyzer supports them, the dashboard MUST expose JOIN detail (total and per-type JOIN counts, tables involved, maximum join chain), CTE detail (CTE count, maximum and average dependency depth, recursive CTE count, access to the dependency graph), predicate detail (predicate count, AND/OR condition counts, maximum nesting depth) and SELECT projection detail (output columns, computed expressions, aggregated columns, duplicate expressions, SELECT * usage).
- **FR-011**: The dashboard MUST distinguish structural facts (counts, structure) from interpreted findings, MUST NOT present a high count as automatically problematic, and MUST use supportable wording such as "structural complexity", "potential impact", "optimization opportunity" and "review recommended".
- **FR-012**: The dashboard MUST NOT display unsupported performance claims, including guaranteed speedups or percentage performance improvements.
- **FR-013**: Every advanced metric or section MUST carry a capability state (supported, partial, unsupported); an unsupported state MUST be communicated as unavailability for the analyzed object type and MUST NOT be displayed as a zero value.

- **FR-014**: The dashboard MUST be a reusable shell (health, findings, complexity, structure, dependencies, AI insights) able to present analysis for Query objects now and CTE, View, Procedure, Function and Trigger objects later without redesigning the dashboard.
- **FR-015**: Where supported, dependency intelligence MUST expose direct dependency count, transitive dependency count, maximum dependency depth and cycle count, with access to a dependency graph view.
- **FR-016**: The dashboard MUST implement loading (skeletons, no fake metrics), empty (guidance to analyze a statement), error (a clear message with a retry action that re-runs the analysis of the current SQL from the dashboard, showing the loading state again while it runs) and partial (analysis-type unavailability) states.
- **FR-017**: The dashboard MUST provide drill-down where a meaningful destination exists (metric → its detailed analysis; finding → finding details; finding location → highlighted SQL source; CTE → CTE dependency graph; AI explain → insight panel) and MUST NOT present elements as interactive when no meaningful destination exists.
- **FR-018**: Source locations MUST be displayed whenever the analyzer provides them and MUST NEVER be invented.
- **FR-019**: AI insight MUST be an optional layer: deterministic analysis remains the source of truth for parsing, counts, structure, complexity, findings, dependencies and source locations; all AI output MUST be visibly labeled as AI-generated; and where documentation indexes are available, every AI insight (complexity, finding and optimization) MUST cite the retrieved excerpts with their source labels, reusing the product's existing citation pattern.
- **FR-020**: AI-proposed SQL changes MUST be presented as original versus suggested SQL with compare, copy and apply-as-new-version actions; applying MUST create a new, separate SQL version that leaves the original fully intact and recoverable, and the system MUST NEVER silently overwrite the developer's SQL.
- **FR-021**: AI unavailability MUST NOT degrade or block any deterministic analysis capability.
- **FR-022**: Every new or modified user-facing string MUST be available in both Vietnamese and English through the existing translation architecture, with no hard-coded user-facing strings; SQL technical terms and identifiers MUST NOT be translated.
- **FR-023**: Severity MUST be communicated with consistent semantic colors together with text labels; color MUST NEVER be the only severity signal.
- **FR-024**: The improvement MUST NOT change existing SQL parsing behavior, dialect behavior, MyBatis resolution, SQL normalization, finding semantics or complexity weights, unless a defect is proven — in which case the fix MUST be made at the correct layer.
- **FR-025**: The dashboard MUST remain usable across the supported viewport sizes and MUST be fully operable by keyboard with visible focus states.
- **FR-026**: Analysis results MUST be computed once per analysis and reused by the dashboard presentation (no recomputation in the presentation layer), and large finding lists MUST remain responsive through progressive or lazy presentation.
- **FR-027**: The dashboard MUST provide an advanced details view behind progressive disclosure, exposing the raw complexity score, the legacy dynamic scoring fields (denominator and percentage) and rule identifiers; AST statistics and analyzer/parser metadata are not produced by the analyzer today and MUST be shown as explicitly unavailable (the section carries a partial capability), never as fabricated values.
- **FR-028**: The complexity level label MUST reuse the analyzer's existing level vocabulary where one exists; where none exists, the levels MUST be Low, Medium, High and Very High, applied consistently wherever complexity is displayed.

### Key Entities *(include if feature involves data)*

- **Analysis Dashboard Data**: The normalized, object-aware presentation view of one analysis result — the analyzed object type and dialect, health scores, structural metrics, complexity (normalized score, level, raw score, contributors), detailed analyses, dependency data and capability states. Derived from the existing analysis result; not a parallel analysis engine.
- **Finding**: An interpreted observation produced by the analyzer — severity, title, category, occurrence count, why-it-matters, source locations, and origin (deterministic static analysis versus AI suggestion).
- **Complexity Score**: One normalized score (0–100) with a level label; level labels reuse the analyzer's existing vocabulary where present, otherwise Low / Medium / High / Very High; the underlying raw score is secondary; the score is explained by its contributors.
- **Complexity Contributor**: A SQL construct (for example, CTE, JOIN type, window function, GROUP BY) with the complexity points it contributes and its share of total complexity.
- **Capability State**: The supported / partial / unsupported status attached to each advanced metric or section for the analyzed object type.
- **Database Object Type**: The kind of analyzed object the dashboard shell can present — Query, CTE, View, Procedure, Function, Trigger.
- **Dependency Summary**: Direct and transitive dependency counts, maximum dependency depth and cycle count, for objects where dependency analysis is supported.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer viewing the dashboard's first viewport can state the SQL's complexity level and its highest-severity finding within 5 seconds (validated in review sessions against the first-viewport hierarchy).
- **SC-002**: 100% of complexity displays across all product surfaces show exactly one normalized score; zero conflicting multi-value score presentations (score, denominator, raw total and percentage competing) remain anywhere complexity is displayed.
- **SC-003**: Zero regression in analysis capability — every metric, finding type and interaction available before the improvement remains available after it (verified by a before/after comparison on a reference set of statements).
- **SC-004**: For every analyzed statement that produces findings, the highest-severity finding is visible without scrolling.
- **SC-005**: For every analyzed statement, the displayed contributor ranking is ordered by actual contribution and the contributor shares are arithmetically consistent with the displayed complexity scoring.
- **SC-006**: Zero occurrences of unsupported capabilities displayed as fake zero values, across all analysis sections and object types.
- **SC-007**: 100% of new and modified user-facing strings have complete Vietnamese and English translations, with zero hard-coded user-facing strings (verified by a string audit).
- **SC-008**: With the AI service completely unavailable, 100% of deterministic analysis features remain functional.
- **SC-009**: For large statements (50+ tables), the dashboard presentation completes within 1 second of analysis completion, consistent with the project's performance standard.
- **SC-010**: A developer can navigate from any displayed finding to its highlighted SQL source in at most 2 interactions.
- **SC-011**: 100% of AI-originated content is visibly labeled as AI-generated, with zero unlabeled AI output.

## Assumptions

- The existing analyzer (parsing, metrics, findings, dialect support, complexity computation) remains the source of truth; this feature reorganizes and presents its output, correcting data-contract inconsistencies only where a defect is proven.
- Risk, maintainability and optimization-opportunity scores are displayed only if the analyzer already reliably supports them; building new scoring engines for them is out of scope for this feature.
- Dependency analysis beyond what the analyzer currently supports, and object types beyond Query, are future work; this feature delivers the reusable dashboard shell and capability-state plumbing so those additions require no dashboard redesign.
- Drill-down destinations (SQL source highlighting, JOIN and CTE graphs, dependency graph) reuse existing views; redesigning those destination views is out of scope.
- The optional AI layer reuses the product's existing local AI assistant (Ollama); introducing new AI providers is out of scope for this feature.
- Bilingual support reuses the existing translation architecture and its current Vietnamese/English language set; no second translation system is introduced.
- The existing dark developer-tool visual language is preserved; the improvement refines hierarchy, density, grouping and severity communication rather than rebranding.
- The dashboard is a developer tool used primarily on desktop-class screens; it must remain usable on smaller viewports, but mobile-first design is out of scope.
- Performance for large statements follows the project constitution's responsiveness standard for large queries.
