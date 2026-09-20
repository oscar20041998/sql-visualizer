# SQL VISUALIZER — ANALYSIS DASHBOARD IMPROVEMENT PROMPT

## ROLE

Act as a Principal Software Engineer, Senior Database Architect, Senior BA, Product Designer and Developer Experience Engineer with 20+ years of experience building enterprise developer tools, SQL analyzers and database platforms.

Improve the existing SQL Visualizer Analysis Dashboard shown in the provided screenshot.

Do NOT redesign the product from scratch. Preserve existing analysis logic, metrics, database support, findings, interactions and architecture wherever possible.

The goal is to transform the current dashboard from a collection of SQL counters into a professional **SQL Intelligence Dashboard** answering:

1. What is the current state of this SQL?
2. Why is it complex or risky?
3. Which structures contribute most?
4. Where are the important findings?
5. What should the developer inspect or improve next?

---

## 1. FIRST: AUDIT THE EXISTING REPOSITORY

Before coding, inspect:

- frontend framework
- current dashboard components
- design system/theme
- i18n architecture
- state management
- SQL analysis result model
- complexity calculation
- finding model
- chart libraries
- icon library
- reusable UI components
- database dialect abstraction
- existing object-type abstraction
- Ollama/AI abstraction

Trace:

SQL Analyzer → Analysis Result → Dashboard Adapter → UI

Do not guess.

Do not create a parallel analysis engine, design system or i18n system.

Reuse existing libraries and components.

---

# 2. CORE UX PRINCIPLE

Current dashboard answers:

> "What does this SQL contain?"

New dashboard must answer:

> "What matters, why does it matter, and what should I do next?"

Transform raw metrics into actionable information.

BAD:

    JOIN
    45

BETTER:

    JOIN
    45 operations
    +82 complexity contribution
    17% of total complexity

The UI must distinguish structural facts from interpreted findings.

Do NOT claim that a high count automatically means bad SQL.

Examples:

- More JOINs != automatically bad
- More CTEs != automatically bad
- More SQL lines != automatically bad
- More GROUP BY != automatically bad

Use terms such as:

- Structural complexity
- Potential impact
- Optimization opportunity
- Review recommended
- Detected

Avoid unsupported claims such as "definitely slow" or "will improve performance by X%".

---

# 3. FIX COMPLEXITY SCORE TRUST

The current dashboard appears to expose values such as:

- 100 / 100
- raw score such as 483
- denominator such as 95
- percentage such as 508%

This is confusing.

The primary UI MUST expose exactly one clear normalized score:

    COMPLEXITY
    82 / 100
    HIGH

Raw scoring can be secondary:

    Raw complexity: 483 pts

Do not expose confusing intermediate formulas in the primary UI.

Audit the source of the calculation. If the existing score is inconsistent, fix the data contract/calculation at the correct layer rather than hiding the inconsistency in the UI.

Important:

    Complexity != Risk
    Complexity != Correctness
    Complexity != Performance

Never fabricate Risk or Maintainability scores if the analyzer cannot support them.

---

# 4. NEW INFORMATION ARCHITECTURE

Reorganize the dashboard into this hierarchy:

1. SQL Header
2. SQL Health Summary
3. Structural Overview
4. Top Findings
5. Top Complexity Contributors
6. Detailed Analysis
7. Dependency Intelligence
8. AI Insights
9. Advanced Analysis Details

The user should understand the state of the SQL within 3–5 seconds.

---

# 5. SQL HEALTH SUMMARY

Create a strong top-level summary.

Conceptually:

    SQL HEALTH

    Complexity        82 / 100     HIGH

    🔴 2 Critical
    🟠 5 High
    🟡 8 Medium
    🔵 4 Info

If reliable metrics already exist, also show:

    Risk
    Maintainability
    Optimization Opportunity

If they do not exist, do not invent them.

The summary should be visually dominant but compact.

Replace the oversized gauge if it consumes too much space.

Prefer:

    82 / 100
    HIGH
    ████████████████░░░░

over a decorative gauge with little information.

---

# 6. STRUCTURAL OVERVIEW

Group existing metrics logically instead of presenting every metric as an equal card.

## SQL Structure

Show supported metrics such as:

- Tables
- JOINs
- CTEs
- Subqueries
- Predicates
- SELECT columns
- SQL lines

## Advanced SQL

Show supported metrics such as:

- Window functions
- GROUP BY
- ORDER BY
- DISTINCT
- SQL functions
- UNION
- CASE expressions

Preserve existing metrics.

Do not delete functionality merely because the layout changes.

---

# 7. TOP FINDINGS

Create a prominent section for the most important findings.

Each finding should show, where available:

- severity
- title
- category
- occurrence count
- why it matters
- source location
- available action

Example:

    🔴 HIGH
    Correlated Subquery

    2 occurrences

    Potential impact:
    Performance

    Locations:
    Line 218
    Line 341

    [View SQL]
    [Explain]

Only show [Optimize] when optimization functionality exists.

Order by the analyzer's actual severity/priority.

Do not invent severity.

---

# 8. TOP COMPLEXITY CONTRIBUTORS

Create a dedicated visualization answering:

> "What makes this SQL complex?"

Example:

    TOP COMPLEXITY CONTRIBUTORS

    CTE
    ███████████████████
    +144 pts
    30%

    JOIN
    ███████████
    +82 pts
    17%

    Window Functions
    █████████
    +72 pts
    15%

    GROUP BY
    ███
    +28 pts
    6%

Sort by actual contribution descending.

Do not display only SQL syntax order.

---

# 9. DETAILED COMPLEXITY BREAKDOWN

Keep the current detailed breakdown but improve it.

Use:

    CATEGORY             COUNT    IMPACT    CONTRIBUTION

    CTE                    18     +144       30%
    INNER JOIN             12      +48       10%
    LEFT JOIN               9      +45        9%
    WINDOW FUNCTION         9      +72       15%
    SUBQUERY                2      +24        5%

Allow drill-down where source information exists.

Do not fabricate impact values.

---

# 10. STRUCTURAL ANALYSIS TABS

Use progressive disclosure.

Recommended tabs:

    [Overview]
    [Structure]
    [JOIN]
    [CTE]
    [Predicates]
    [SELECT]
    [Functions]
    [Dependencies]

Only show tabs supported by the analyzed object.

Do not show meaningless empty tabs.

---

# 11. JOIN ANALYSIS

Where supported, expose:

- total JOINs
- INNER JOIN
- LEFT JOIN
- RIGHT JOIN
- FULL JOIN
- CROSS JOIN
- tables involved
- maximum JOIN chain

Potential deterministic findings may include:

- CROSS JOIN
- Cartesian-expansion risk
- unusually deep join chain
- missing/suspicious join condition

Only expose rules supported by the analyzer.

---

# 12. CTE ANALYSIS

Where supported, expose:

- CTE count
- maximum dependency depth
- average dependency depth
- recursive CTE count
- dependency graph

Example:

    CTE ANALYSIS

    CTEs                    18
    Maximum depth            7
    Average depth            3.2
    Recursive CTEs           1

    [Open CTE Dependency Graph]

Never invent depth data.

---

# 13. PREDICATE ANALYSIS

Instead of only:

    Conditions = 19

show, when available:

    PREDICATE ANALYSIS

    Predicates              19
    AND conditions           14
    OR conditions             5
    Maximum nesting depth     4

Potential deterministic findings:

- OR-heavy predicates
- function on column
- non-sargable expression
- duplicated predicate
- contradictory predicate
- complex CASE/WHEN

Only expose supported rules.

---

# 14. SELECT ANALYSIS

Improve:

    SELECT columns = 14

into a richer projection view when data exists:

    SELECT PROJECTION

    Output columns            14
    Computed expressions       5
    Aggregated columns         3
    Duplicate expressions      2
    SELECT *                   0

Do not classify a metric as a problem unless the analyzer supports that conclusion.

---

# 15. DEPENDENCY INTELLIGENCE

The dashboard must be future-proof for:

- Query
- CTE
- View
- Procedure
- Function
- Trigger

Where supported, expose:

    Direct dependencies
    Transitive dependencies
    Dependency depth
    Cycles
    Tables
    Views
    Functions
    Procedures

Example:

    DEPENDENCIES

    Direct dependencies       25
    Transitive dependencies   41
    Maximum depth              6
    Cycles                     0

    [Open Dependency Graph]

Do not display "0" when a feature is actually unsupported. Use capability state.

---

# 16. UNIFIED OBJECT-AWARE DASHBOARD

Create a reusable dashboard shell:

    SQL Analysis Workspace
      ├── Health
      ├── Findings
      ├── Complexity
      ├── Structure
      ├── Dependencies
      └── AI Insights

It must support:

    Query
    CTE
    View
    Procedure
    Function
    Trigger

Object-specific metrics should be plugged into the shared shell.

Do not redesign the dashboard again when View/Procedure/Function/Trigger analysis is added.

---

# 17. CAPABILITY STATES

Every advanced metric/section must support:

    supported
    partial
    unsupported

For unsupported:

    Dependency analysis
    Not available for this object type.

Do NOT show:

    Dependencies = 0

when the real state is unsupported.

For partial support, communicate it clearly.

---

# 18. OLLAMA AI INSIGHTS

AI is an optional intelligence layer.

Deterministic analysis remains the source of truth for:

- parsing
- counts
- structure
- complexity
- findings
- dependencies
- source locations

Ollama may provide:

- Explain query
- Explain finding
- Explain complexity
- Optimization opportunities
- Refactoring suggestions
- Dependency explanation
- Risk explanation
- Summary

Example:

    AI INSIGHTS

    Why is this query complex?

    The primary contributors are:
    - 18 CTEs
    - 45 JOIN operations
    - 9 window functions
    - 2 correlated subqueries

    [Explain]
    [Find Optimization Opportunities]
    [Suggest Refactoring]

AI suggestions MUST be visibly labeled as AI-generated.

If AI proposes SQL changes:

    ORIGINAL SQL
    ...

    SUGGESTED SQL
    ...

    [Compare]
    [Copy]
    [Apply as New Version]

Never automatically overwrite the original SQL.

If Ollama is unavailable, deterministic analysis must continue working normally.

---

# 19. VISUAL DESIGN

Preserve the existing dark developer-tool aesthetic.

Improve:

- information hierarchy
- spacing
- typography
- density
- alignment
- card grouping
- severity communication
- scanability

Use:

- dark enterprise theme
- subtle grid/background
- restrained borders
- cyan/blue primary accent
- semantic severity colors
- subtle hover/focus states

Avoid:

- excessive glow
- excessive gradients
- oversized decorative gauges
- marketing-style dashboard visuals
- unnecessary animation
- visual noise

Developer-tool information density is more important than decoration.

---

# 20. SEVERITY COLORS

Use consistently:

    Critical → red
    High     → orange/red
    Medium   → amber
    Low      → blue/neutral
    Info     → neutral/cyan
    Success  → green

Never rely on color alone.

Always include text labels such as:

    HIGH
    MEDIUM
    LOW

---

# 21. PROGRESSIVE DISCLOSURE

Default view:

    Health
    ↓
    Top Findings
    ↓
    Top Complexity Contributors

Expandable/detailed view:

    Structural Metrics
    Complexity Breakdown
    Dependency Analysis

Advanced view:

    Raw score
    analyzer metadata
    parser metadata
    rule identifiers
    AST statistics

Do not overwhelm the first viewport.

---

# 22. DRILL-DOWN

Make important metrics actionable.

Examples:

Click JOIN count → JOIN analysis.

Click finding → finding details.

Click finding location → highlight SQL source.

Click CTE → CTE dependency graph.

Click dependency → dependency details.

Click AI Explain → AI insight panel.

Only make something interactive if the destination/action is meaningful.

---

# 23. SOURCE LOCATIONS

Whenever source locations exist, expose them.

Example:

    Correlated Subquery
    Line 218
    Line 341

    [View in SQL]

Never invent source locations.

---

# 24. EMPTY / LOADING / ERROR / PARTIAL STATES

Implement proper states.

Loading:

- skeletons
- no fake metrics

Empty:

    No analysis available.
    Analyze a SQL statement to view metrics.

Error:

    Analysis failed.
    The SQL analyzer could not process this input.
    [Retry]

Partial:

    Dependency analysis unavailable.
    This object was parsed successfully, but dependency
    analysis is not supported for this object type yet.

---

# 25. INTERNATIONALIZATION — REQUIRED

The application supports:

    Vietnamese (vi)
    English (en)

Reuse the existing i18n architecture.

Do NOT introduce another i18n system.

No hard-coded user-facing strings.

Use semantic keys such as:

    analysis.health.title
    analysis.metrics.joins
    analysis.metrics.ctes
    analysis.findings.title
    analysis.complexity.title
    analysis.dependencies.title
    analysis.ai.title
    analysis.actions.explain
    analysis.actions.optimize

Every new/modified user-facing string must have both VI and EN translations.

Do not use Vietnamese as English fallback or vice versa.

Do not translate:

- SQL
- CTE
- JOIN
- GROUP BY
- SELECT
- DISTINCT
- MySQL
- PostgreSQL
- SQL Server
- Oracle
- Ollama
- rule IDs
- technical identifiers

Test both languages.

Ensure layouts tolerate English text expansion.

---

# 26. DATA MODEL

Audit existing models first.

If a compatible model does not already exist, normalize the dashboard around a structure conceptually similar to:

```ts
interface SqlAnalysisDashboardData {
  objectType: DatabaseObjectType;
  dialect: DatabaseDialect;

  health?: {
    complexity?: Score;
    risk?: Score;
    maintainability?: Score;
    optimizationOpportunity?: Severity;
  };

  findings: Finding[];

  structure: {
    tables?: number;
    joins?: number;
    ctes?: number;
    subqueries?: number;
    predicates?: number;
    selectColumns?: number;
    functions?: number;
    windowFunctions?: number;
    groupBy?: number;
    orderBy?: number;
    distinct?: number;
  };

  complexity?: {
    normalizedScore: number;
    level: ComplexityLevel;
    rawScore?: number;
    contributors: ComplexityContributor[];
  };

  depth?: {
    cte?: number;
    subquery?: number;
    join?: number;
    dependency?: number;
  };

  dependencies?: {
    direct?: number;
    transitive?: number;
    cycles?: number;
  };

  capabilities: {
    complexity: CapabilityStatus;
    findings: CapabilityStatus;
    dependencies: CapabilityStatus;
    ai: CapabilityStatus;
  };
}
```

This is a conceptual target only.

If the repository already has an equivalent model, extend it instead of creating duplicates.

---

# 27. FINDING MODEL

Findings should distinguish:

- deterministic fact
- static analysis observation
- recommendation
- AI suggestion

Reuse the existing finding model if available.

Do not create a duplicate finding system.

---

# 28. COMPONENT ARCHITECTURE

Avoid one giant dashboard component.

Prefer reusable components such as:

    SqlAnalysisDashboard
      ├── AnalysisHeader
      ├── AnalysisHealthSummary
      ├── StructuralMetrics
      ├── TopFindings
      ├── ComplexityContributors
      ├── ComplexityBreakdown
      ├── DetailedAnalysis
      ├── DependencySummary
      ├── DependencyGraph
      ├── AIInsights
      └── AdvancedDetails

Use the project's existing naming conventions and components where applicable.

Business logic must remain outside presentation components.

---

# 29. PERFORMANCE

Do not recalculate SQL analysis inside UI render functions.

Prefer:

    Analyzer
      ↓
    Normalized analysis result
      ↓
    Dashboard adapter/selectors
      ↓
    UI

Reuse computed results.

Memoize derived presentation data where appropriate.

For large finding lists use lazy rendering, pagination or virtualization where necessary.

---

# 30. TESTING

Use the repository's existing TDD/testing conventions.

Add or update tests for:

## Complexity
- normalized score
- raw score
- level
- contributors
- contribution percentages

## Findings
- severity ordering
- occurrence counts
- source locations
- deterministic vs AI origin

## Metrics
- correct values
- zero values
- missing values
- unsupported values

## Capabilities
- supported
- partial
- unsupported

## UI
- loading
- empty
- error
- partial
- drill-down
- responsive layout
- language switching

## i18n
- Vietnamese
- English
- no hard-coded UI strings

---

# 31. VISUAL VALIDATION

After implementation, inspect the dashboard visually.

Check:

- first-viewport hierarchy
- card density
- alignment
- spacing
- typography
- severity colors
- long metric values
- long finding titles
- Vietnamese layout
- English layout
- loading state
- empty state
- error state
- responsive behavior

Do not stop at "the application compiles".

---

# 32. IMPORTANT: DO NOT BREAK EXISTING ANALYSIS

This is primarily a dashboard improvement.

Do not change SQL parsing behavior unless necessary.

Do not change:

- SQL parser
- dialect behavior
- MyBatis resolution
- SQL normalization
- existing finding semantics
- existing complexity weights

unless the audit proves a defect that must be fixed.

If data is inconsistent, correct the data contract at the source.

---

# 33. ACCEPTANCE CRITERIA

The implementation is complete only when:

- The dashboard has a clear Health Summary.
- Complexity has one authoritative normalized score.
- Raw score is secondary.
- Existing metrics remain available.
- Metrics are grouped logically.
- Top findings are immediately visible.
- Complexity contributors are ranked by actual contribution.
- Findings can drill down to SQL source where supported.
- Unsupported metrics are not shown as fake zero values.
- Dependency analysis is future-proof.
- Query/CTE/View/Procedure/Function/Trigger can reuse the same dashboard shell.
- Ollama is optional and never blocks static analysis.
- AI output is clearly distinguished from deterministic analysis.
- AI never silently overwrites SQL.
- VI and EN both work.
- No new hard-coded UI strings exist.
- Existing libraries are reused.
- Existing functionality is preserved.
- No unnecessary dependencies are introduced.
- No unsupported performance claims are shown.
- The final UI looks like an enterprise-grade developer/database product.

---

# 34. IMPLEMENTATION ORDER

Follow this sequence:

### Phase 1
Repository and architecture audit.

### Phase 2
Audit and normalize analysis-result/dashboard data contract.

### Phase 3
Fix complexity score presentation/consistency.

### Phase 4
Implement Health Summary.

### Phase 5
Implement Structural Overview.

### Phase 6
Implement Top Findings.

### Phase 7
Implement Complexity Contributors + detailed breakdown.

### Phase 8
Implement drill-down and source navigation.

### Phase 9
Implement dependency-aware sections.

### Phase 10
Integrate AI Insights with existing Ollama abstraction.

### Phase 11
Responsive/accessibility/i18n hardening.

### Phase 12
Tests + visual regression/QA.

Do not attempt a massive rewrite in one step.

---

# 35. FINAL IMPLEMENTATION COMMAND

Audit the repository first.

Then implement the smallest coherent architecture that achieves this specification.

Do not guess existing architecture.

Do not replace libraries without evidence.

Do not create a second i18n system.

Do not create a second analyzer.

Do not remove existing metrics.

Do not fabricate unsupported metrics.

Do not fabricate performance improvements.

Do not make AI the source of truth.

Preserve backward compatibility.

At the end, report:

1. Files changed
2. Components added/updated
3. Data-model changes
4. Complexity-score changes
5. UI/UX changes
6. i18n changes
7. AI/Ollama changes
8. Tests added/updated
9. Known limitations
10. Future extension points for Query / CTE / View / Procedure / Function / Trigger

FINAL PRODUCT PRINCIPLE:

    SQL
      ↓
    Structural Analysis
      ↓
    Complexity
      ↓
    Findings
      ↓
    Impact
      ↓
    Explanation
      ↓
    Recommended Action
      ↓
    Optional AI Assistance

Build a **SQL Intelligence Dashboard**, not merely a page containing SQL statistics.
