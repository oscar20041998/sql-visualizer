# SQL Visualizer - Feature Overview

A modern SQL analysis and visualization tool built with Next.js, React, and Tailwind CSS. Analyze complex SQL queries, visualize table relationships, measure query complexity, and explore Common Table Expressions (CTEs).

## 🆕 Version Update: Median-Based Complexity Evaluation

The latest update introduces adaptive complexity-level evaluation using a **median numeric baseline** from your locally stored score history.

### What changed

- Complexity levels are now derived from recent score distribution, not only fixed static bands.
- The engine computes a median from `complexityScoreList` and generates dynamic thresholds.
- Query levels adapt over time as more analysis results are collected.

### Adaptive level rules

- **LOW**: 0 to 50% of Median
- **MEDIUM**: 50% to 100% of Median
- **HIGH**: 100% to 200% of Median
- **SUPER HIGH**: > 200% of Median

### Why it matters

- Better reflects your real workload profile.
- Helps teams compare new queries against historical complexity patterns.
- Makes alerts more context-aware in environments with very simple or very complex SQL baselines.

## 🎯 Core Features

### 1. **Query Input** 📝

The starting point for all analysis. Supports both raw SQL and MyBatis XML imports.

**Capabilities:**

- **Dual Input Modes:**
  - Direct SQL paste for standard SQL queries
  - MyBatis XML file import with parameter resolution
- **Multi-Dialect Support:**
  - MySQL
  - PostgreSQL
  - SQL Server
  - Oracle
- **Syntax Preservation:** Maintains original SQL structure for analysis
- **Auto-Analysis Option:** Automatically analyze queries as you type
- **Sample Queries:** Load pre-built example queries for testing
- **Character/Line Counter:** Track query size metrics

**Use Cases:**

- Paste your production SQL for instant analysis
- Test different SQL dialects with the same query
- Import MyBatis configurations and dynamically generate SQL
- Understand query complexity before execution

---

### 2. **Relationship Graph Visualizer** 📊

Interactive visualization of table relationships and JOIN connections.

**Capabilities:**

- **Visual Graph Representation:**
  - Each table appears as a node
  - JOIN relationships shown as colored edges
  - Multiple layout options: Dagre (hierarchical), Force-Directed, Grid
  - Interactive zoom and pan controls
- **Color-Coded JOIN Types:**
  - Amber: LEFT JOIN
  - Green: RIGHT JOIN
  - Indigo: INNER JOIN
  - Pink: FULL OUTER JOIN
  - Red: CROSS JOIN
  - Purple: NATURAL JOIN
- **Node Interaction:**
  - Click to highlight table and direct connections
  - View join conditions and related tables
  - See table occurrence count (hits)
- **Extracted Tables Section:**
  - Complete list of all tables with clause information (FROM/JOIN)
  - Related table mapping
  - Hit count (how many times each table appears)
  - CSV export capability
- **Mermaid Export:**
  - Convert graph to Mermaid diagram syntax
  - Copy to clipboard for use in documentation/wikis
  - Compatible with Mermaid.js renderers
- **MiniMap Navigation:** Quick overview and navigation for large queries
- **Edge Style Options:** Smooth Bezier, Straight, Step curves

**Use Cases:**

- Understand complex multi-table query structure at a glance
- Identify unnecessary JOINs or missing relationships
- Document SQL architecture using Mermaid diagrams
- Verify table relationships in large queries
- Export visual diagrams for team documentation

---

### 3. **Metrics Dashboard with Complexity Scoring** 📈

Quantified complexity analysis and performance heuristics for your SQL queries.

**Capabilities:**

- **Real-Time Complexity Dashboard:**
  - Displays as you type in Query Input
  - Shows complexity level (LOW/MEDIUM/HIGH/SUPER HIGH) with color badge
  - Score progress bar (score / maximum possible)
  - Quick breakdown cards showing contributing factors
  - Instant linting alerts for anti-patterns

- **Complexity Gauge:**
  - 0–100 complexity score with visual radial gauge
  - Color-coded severity: LOW (green) → MEDIUM (yellow) → HIGH (orange) → SUPER HIGH (red)
  - Percentage of maximum complexity
  - Interpretation guide

- **Detailed Complexity Breakdown:**
  - Keywords & Clauses analysis (FROM, WHERE, DISTINCT, GROUP BY, ORDER BY, HAVING, UNION, CTEs)
  - SELECT Field Complexity (raw fields, aliases, conditionals, subqueries, aggregates, functions)
  - JOIN Analysis (count and complexity per join type)
  - CTE & Subquery Analysis (depth tracking, usage analysis)
  - Window Function Analysis (OVER clauses, PARTITION BY, ranking functions)
  - Expandable/collapsible sections for detailed inspection

- **Complexity Factors Breakdown:**
  - Visualized as interactive bar chart
  - Individual metrics measured:
    - Number of JOINs
    - Subquery nesting depth
    - Window function usage
    - GROUP BY clauses
    - ORDER BY clauses
    - DISTINCT operations

- **Estimated Execution Cost:**
  - Client-side heuristic scoring
  - Based on query complexity, SQL dialect, and standard indexing assumptions
  - Relative performance guide (not absolute benchmark)
  - Factor-specific recommendations:
    - Join depth analysis
    - Subquery nesting assessment
    - Analytic function impact
    - Dialect-specific overhead

- **Interactive Tooltips:** Hover over metrics for exact values and recommendations
- **Per-Factor Recommendations:** Guidance for optimizing each complexity component

**Metrics Calculated:**

- `joinCount`: Number of JOIN operations
- `subqueryDepth`: Maximum nesting level of subqueries
- `windowFunctionCount`: Window function usage
- `groupByCount`: GROUP BY clause count
- `orderByCount`: ORDER BY clause count
- `distinctCount`: DISTINCT operation count
- `totalScore`: Cumulative complexity score (0+)
- `complexityLevel`: Severity level (LOW/MEDIUM/HIGH/SUPER HIGH)

**Complexity Level Interpretation:**

| Level          | Score Range | Interpretation                        | Recommendation                                           |
| -------------- | ----------- | ------------------------------------- | -------------------------------------------------------- |
| **LOW**        | 0-20        | Simple query, well-optimized          | No action needed, good for frequent execution            |
| **MEDIUM**     | 21-50       | Moderate complexity                   | Review indexes and join order                            |
| **HIGH**       | 51-100      | Complex query with optimization risks | Consider decomposition, review query plan                |
| **SUPER HIGH** | 101+        | Very complex, high risk               | Strong refactoring recommended, critical review required |

**Use Cases:**

- Identify bottlenecks in complex queries
- Compare query complexity before/after optimization
- Get recommendations for improving specific factors
- Estimate relative performance impact
- Benchmark against similar queries
- Prevent overly complex queries from reaching production
- Guide team code review discussions

---

### 3.5 **SQL Complexity Scoring Engine** 🎯

Comprehensive complexity analysis using a sophisticated weight matrix to identify performance risks.

**How Complexity Scoring Works:**

The scoring engine walks through your SQL query and assigns points to various constructs based on their architectural impact:

1. **Keyword Scoring** - Counts SQL keywords (FROM, WHERE, DISTINCT, GROUP BY, etc.)
2. **JOIN Analysis** - Evaluates each JOIN type and counts relationships
3. **SELECT Field Classification** - Analyzes each field's complexity level
4. **CTE Detection** - Scores WITH clauses and their relationships
5. **Window Function Analysis** - Detects OVER clauses and partition operations
6. **Subquery Analysis** - Tracks nesting depth and complexity
7. **Aggregation Tracking** - Counts aggregates and sorting operations

**Complexity Weight Matrix:**

| Category             | Construct                    | Weight           |
| -------------------- | ---------------------------- | ---------------- |
| **Base Clauses**     | FROM                         | 1 pt             |
|                      | WHERE                        | 2 pts            |
|                      | DISTINCT                     | 3 pts            |
| **Aggregations**     | GROUP BY                     | 4 pts            |
|                      | ORDER BY                     | 3 pts            |
|                      | HAVING                       | 4 pts            |
| **JOIN Types**       | INNER JOIN                   | 4 pts each       |
|                      | LEFT / RIGHT JOIN            | 5 pts each       |
|                      | FULL OUTER JOIN              | 10 pts           |
|                      | CROSS JOIN                   | 10 pts           |
|                      | NATURAL JOIN                 | 5 pts            |
| **Advanced**         | WITH (CTE)                   | 8 pts each       |
|                      | Nested Subquery              | 12 pts per level |
|                      | UNION / EXCEPT / INTERSECT   | 6 pts each       |
| **Window Functions** | OVER clause                  | 6 pts            |
|                      | PARTITION BY                 | 3 pts            |
|                      | ROW_NUMBER, RANK, DENSE_RANK | 6 pts each       |
| **SELECT Fields**    | Raw field (column)           | 1 pt             |
|                      | Aliased/Expression           | 3 pts            |
|                      | CASE WHEN conditional        | 5 pts            |
|                      | Scalar subquery              | 10 pts           |
|                      | Aggregate function           | 4 pts            |
|                      | Scalar function              | 3 pts            |

**Linting Rules (Anti-Pattern Detection):**

1. **SELECT \* Anti-Pattern** ⚠️
   - Severity: Warning
   - Why: Forces database to retrieve all columns, increasing I/O and network overhead
   - Fix: Explicitly define projection columns

2. **Deep Nesting** ⚠️
   - Threshold: 7+ levels of parentheses
   - Why: Defeats query optimizer, prevents index usage
   - Fix: Use CTEs to flatten structure

3. **CROSS JOIN Risk** ⚠️
   - Severity: Warning
   - Why: Produces Cartesian product, exponentially increases row count
   - Fix: Add proper join conditions or use INNER/LEFT JOIN

4. **Missing WHERE Clause** ⚠️
   - Condition: Complex query without WHERE
   - Why: May scan entire tables unnecessarily
   - Fix: Add filtering predicates to reduce working set

**Real-World Scoring Examples:**

**Example 1: Simple Query (LOW - 8 points)**

```sql
SELECT id, order_number, total_amount
FROM orders
WHERE status = 'completed';
```

- FROM: 1pt
- WHERE: 2pt
- SELECT fields (3 raw): 3pt
- Total: 6pt → **LOW** ✓

**Example 2: Moderate Reporting Query (MEDIUM - 38 points)**

```sql
SELECT
  DATE_TRUNC('month', o.created_at) as month,
  c.region,
  COUNT(DISTINCT o.id) as order_count,
  SUM(oi.quantity * oi.unit_price) as revenue
FROM orders o
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'completed'
  AND o.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
GROUP BY DATE_TRUNC('month', o.created_at), c.region
ORDER BY month DESC, revenue DESC;
```

- FROM: 1pt
- INNER JOINs: 8pt (2 × 4)
- WHERE: 2pt
- GROUP BY: 4pt
- ORDER BY: 3pt
- SELECT fields: 5pt (date function + raw + 2 aggregates)
- Total: 23pt → **MEDIUM** ⚠️

**Example 3: Complex Analytics Query (HIGH - 65+ points)**

```sql
WITH monthly_metrics AS (
  SELECT DATE_TRUNC('month', o.created_at) as month,
    c.region,
    COUNT(DISTINCT o.id) as orders,
    SUM(CASE WHEN o.status = 'completed'
        THEN oi.quantity * oi.unit_price ELSE 0 END) as revenue
  FROM orders o
  INNER JOIN order_items oi ON o.id = oi.order_id
  LEFT JOIN customers c ON o.customer_id = c.id
  WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 2 YEARS)
  GROUP BY DATE_TRUNC('month', o.created_at), c.region
)
SELECT r.month, r.region, r.orders, r.revenue
FROM monthly_metrics m
WHERE ROW_NUMBER() OVER (PARTITION BY m.region ORDER BY m.revenue DESC) <= 10;
```

- CTEs: 8pt
- INNER JOIN: 4pt
- LEFT JOIN: 5pt
- WHERE: 2pt
- GROUP BY: 4pt
- WINDOW OVER: 6pt
- PARTITION BY: 3pt
- CASE WHEN: 5pt
- Aggregates: 8pt
- Total: 45pt → **HIGH** 🔴

**Use Cases:**

- Prevent overly complex queries from reaching production
- Guide code review with objective complexity metrics
- Identify refactoring opportunities before performance issues occur
- Educate team members on query complexity best practices
- Track complexity trends in your codebase

---

### 4. **CTE Analysis** 🔗

Deep-dive analysis into Common Table Expressions (CTEs/WITH clauses) and field origin mapping.

**Capabilities:**

- **CTE Detection & Listing:**
  - Each WITH...AS() block identified as a separate CTE
  - Expandable cards showing CTE body SQL
  - Referenced tables and fields listed
  - Usage tracking and statistics
- **CTE Status Indicators:**
  - Recursive CTEs: Identified and flagged with warning
  - Unused CTEs: Highlighted in amber (performance issue)
  - Nested subqueries: Count and depth analysis
- **CTE Metadata Display:**
  - Referenced tables count
  - Selected fields count
  - Line count of CTE body
  - Usage frequency in main query
  - Estimated complexity per CTE
- **Field Origin Mapping:**
  - "Main Query Field Origins" table shows where each final SELECT field comes from:
    - CTE reference
    - Base table
    - Computed expression
  - Color-coded origin badges for quick identification
- **Copy CTE SQL:**
  - One-click copy of individual CTE body to clipboard
  - Reuse CTEs in other queries
- **Bulk Operations:**
  - "Expand All" / "Collapse All" to scan or hide all CTE bodies at once
- **Issue Detection:**
  - Identifies unused CTEs (potential optimization opportunity)
  - Flags recursive CTEs
  - Detects field reference patterns

**CTE Statistics Shown:**

- Total CTEs in query
- Count of unused CTEs
- Count of recursive CTEs
- Average CTE complexity
- Dependencies between CTEs

**Use Cases:**

- Audit and optimize CTE usage
- Identify unused CTEs that can be removed
- Find field origins for complex multi-CTE queries
- Extract individual CTEs for reuse
- Understand CTE dependency chains
- Optimize recursive CTE performance

---

### 5. **Settings & Preferences** ⚙️

- **Theme Switching:**
  - Dark mode (default)
  - Light mode
  - Persistent settings (survives page refresh)
  - Quick toggle via Moon/Sun button in sidebar
- **Language Support:**
  - English (en)
  - Vietnamese (vi)
  - All UI text and labels translated
  - Quick toggle via Globe button in sidebar
- **Graph Visualization Options:**
  - **Layout Algorithms:**
    - Dagre: Hierarchical layout for clear flow
    - Force-Directed: Organic spacing based on relationships
    - Grid: Structured grid arrangement
  - **Edge Style:**
    - Smooth Bezier: Curved connections
    - Straight: Direct lines
    - Step: Staircase pattern
- **Auto-Analyze Setting:**
  - Enable/disable automatic analysis on paste
  - When enabled: Results update instantly as you type
  - When disabled: Manual "Analyze" button required
- **Sidebar State:**
  - Collapsible sidebar for more screen space
  - Collapse/expand toggle with keyboard shortcut
  - Persistent state preference

**Localization:**

- All UI elements, buttons, labels translated
- Feature descriptions in both languages
- Guidelines available in both English and Vietnamese

**Use Cases:**

- Prefer dark theme for reduced eye strain
- Switch language for team collaboration
- Optimize graph layout for query type (hierarchical vs organic)
- Control analysis trigger behavior
- Adapt UI to workspace preferences
- Adjust sidebar for more/less screen real estate

---

## 🛠️ Tool Overview

### Input & Configuration

| Tool            | Purpose                                                |
| --------------- | ------------------------------------------------------ |
| **Query Input** | Paste SQL or import MyBatis XML, select SQL dialect    |
| **Settings**    | Configure theme, language, graph layout, auto-analysis |

### Analysis Tools

| Tool                   | Purpose                                       |
| ---------------------- | --------------------------------------------- |
| **Relationship Graph** | Visualize table relationships and JOINs       |
| **Metrics Dashboard**  | Measure complexity and performance heuristics |
| **CTE Analysis**       | Deep-dive into CTEs and field origins         |

### Export/Integration

| Feature                 | Format            | Use Case                       |
| ----------------------- | ----------------- | ------------------------------ |
| Extracted Tables Export | CSV               | Spreadsheet analysis           |
| Mermaid Diagram Export  | Mermaid.js syntax | Documentation, wikis, diagrams |
| CTE SQL Copy            | Plain text        | Reuse in other queries         |

---

## 📊 Supported SQL Dialects

- **MySQL** (5.7+)
- **PostgreSQL** (9.6+)
- **SQL Server** (2016+)
- **Oracle** (12c+)

Analysis adapts to dialect-specific features:

- Window functions
- CTE support
- JOIN variations
- Subquery handling

---

## 🎨 UI Features

- **Responsive Design:** Works on desktop, tablet, and mobile (optimized for desktop)
- **Dark/Light Mode:** Full theme support with persistent preference
- **Bilingual UI:** English and Vietnamese support
- **Keyboard Shortcuts:** Quick navigation and actions
- **Interactive Tooltips:** Hover for detailed information
- **Real-time Updates:** Instant feedback on analysis changes
- **Minimap Navigation:** Quick orientation in large graphs
- **Collapsible Sections:** Expand/collapse details on demand

---

## 📈 Use Case Scenarios

### Scenario 1: Code Review

_Reviewer needs to verify a complex query before production_

1. Paste query in Query Input
2. Check Relationship Graph for unexpected JOINs
3. Review Metrics Dashboard for complexity spikes
4. Export Mermaid diagram for team discussion
5. Check CTE Analysis for unused CTEs

### Scenario 2: Performance Optimization

_DBA optimizing slow query_

1. Load original query
2. Review Metrics Dashboard for bottlenecks
3. Check CTE Analysis for optimization opportunities
4. Copy unused CTEs out via CTE Analysis
5. Paste optimized version and compare metrics

### Scenario 3: Documentation

_Team documenting SQL architecture_

1. Paste all major queries into tool
2. Export Mermaid diagrams for each
3. Build documentation with visual SQL architecture
4. Include complexity metrics in spec
5. Reference CTE analysis for data flow

### Scenario 4: Learning/Training

_New team member understanding codebase_

1. Load production queries
2. Use Relationship Graph to understand connections
3. Expand CTEs in CTE Analysis to see data transformations
4. Review Guidelines (?) for best practices
5. Ask questions about high-complexity queries

### Scenario 5: Dialect Migration

_Migrating queries to different database_

1. Load query from source dialect
2. Change SQL dialect in settings
3. Check Metrics Dashboard for changes
4. Review Relationship Graph (should be same)
5. Export Mermaid and CTE info for migration planning

---

## 🚀 Getting Started

1. **Visit the Application**
   - Navigate to [http://localhost:4028](http://localhost:4028)
   - Or open the deployed version

2. **Try Query Input**
   - Click "Load Sample" for a pre-built complex query
   - Or paste your own SQL
   - Select appropriate SQL dialect

3. **Explore Tools**
   - Click through navigation tabs to see each feature
   - Use sidebar to switch between analysis views

4. **Customize**
   - Adjust theme and language in Settings
   - Configure graph layout preferences
   - Enable auto-analysis if desired

5. **Export Results**
   - Export table relationships as CSV
   - Copy Mermaid diagram syntax
   - Extract CTE SQL for reuse

---

## 🎯 Best Practices

### Query Input

- Always select the correct SQL dialect for accurate analysis
- Use "Load Sample" to test before analyzing your queries
- Enable auto-analysis for real-time feedback during editing
- Watch the complexity score as you build queries to avoid overly complex queries

### Complexity Scoring Best Practices

**Score < 20 (LOW)**

- ✅ Generally well-optimized
- ✅ Good candidate for frequent execution
- ✅ Focus: Maintain index coverage
- Actions: No immediate optimization needed

**Score 21-50 (MEDIUM)**

- ⚠️ Review query structure
- ⚠️ Verify appropriate indexes exist
- ⚠️ Check query plan for full table scans
- Actions: Consider index hints, column statistics, join order review

**Score 51-100 (HIGH)**

- 🔴 High complexity detected
- 🔴 Likely to have performance issues at scale
- ⚠️ Consider: Decomposition into multiple queries
- Actions: Use materialized CTEs, implement result caching, add indexes on join columns
- Target: Try to reduce to MEDIUM before production

**Score 101+ (SUPER HIGH)**

- 🚨 Critical complexity
- 🚨 High risk of timeout/lock contention
- 🚨 Risk of full table scans
- Actions: REQUIRED significant query refactoring
- Strategy: Break into staging tables, use ETL approach, consider materialized views

### Refactoring Strategies by Complexity

**For HIGH Complexity:**

1. Break into smaller queries with intermediate results
2. Replace deep nesting with CTEs (use WITH...AS syntax)
3. Add explicit WHERE clauses to filter early
4. Verify JOIN conditions - avoid CROSS JOINs
5. Use window functions instead of subqueries where possible
6. Index columns used in JOIN conditions and WHERE clauses

**For SUPER HIGH Complexity:**

1. Decompose into staged transformation queries
2. Use materialized views or temporary tables for intermediate steps
3. Consider ETL approach for complex transformations
4. Implement query result caching
5. Split analytical queries into separate scheduled jobs
6. Review and optimize every single JOIN condition

### Graph Visualization

- Use Dagre layout for hierarchical dependencies (clear flow of data)
- Use Force-Directed for balanced relationship viewing (intuitive clustering)
- Use Grid for structured, organized table arrangement
- Use MiniMap to navigate large complex queries
- Identify isolated tables that may be unnecessary

### Metrics Dashboard

- Focus on factors with highest complexity scores first (they have most impact)
- Use recommendations as starting points for optimization
- Compare metrics before/after optimization to verify improvements
- Pay special attention to window functions and nested subqueries (high point values)
- Address linting warnings first (they're quick wins)

### CTE Analysis

- Always review for unused CTEs (unnecessary overhead, quick optimization)
- Check recursive CTEs for performance issues (can be expensive)
- Use field origin mapping to trace data transformations
- Identify CTEs that reference many tables (good candidates for materialization)
- Look for redundant CTEs that could be merged

### Settings

- Choose dark theme for reduced eye strain during extended coding sessions
- Set auto-analyze if you edit queries frequently (real-time feedback)
- Save preferred graph layout for consistency across sessions
- Use your preferred language for UI comfort

### Linting & Anti-Pattern Prevention

- Address all linting warnings before deploying
- Avoid SELECT \* - always specify columns explicitly
- Prevent deep nesting by using CTEs (max 7 levels limit)
- Never CROSS JOIN unless absolutely intentional
- Add WHERE clauses to complex queries (filter early principle)

---

## 🚀 Optimization Workflow

### Step 1: Baseline Analysis

1. Paste query into Query Input
2. Note the complexity score
3. Check linting alerts for obvious issues
4. Review Metrics Dashboard breakdown

### Step 2: Issue Identification

1. Look at highest-scoring factors in breakdown
2. Review Graph for unexpected relationships
3. Check CTE Analysis for unused or recursive CTEs
4. Identify which component contributes most to score

### Step 3: Optimization

1. For high JOIN count: Review join order, consider decomposition
2. For deep nesting: Convert to CTEs, flatten structure
3. For many window functions: Group by PARTITION BY/ORDER BY
4. For SELECT \*: Explicitly list needed columns
5. For missing WHERE: Add filtering predicates

### Step 4: Verification

1. Paste optimized query
2. Compare new complexity score with baseline
3. Verify Graph still shows correct relationships
4. Re-analyze Metrics Dashboard
5. Confirm linting warnings decreased

---

## 📊 Understanding Complexity Scores

### What Affects Score Most

1. **Number of JOINs** (biggest impact) - Each JOIN adds 4-10 points
2. **Nested Subqueries** (high impact) - Each level adds 12 points
3. **Window Functions** (significant impact) - Each OVER clause adds 6 points
4. **CTEs** (medium impact) - Each WITH clause adds 8 points
5. **Aggregations & Sorting** (lower impact) - GROUP BY, ORDER BY each add 3-4 points

### Score Does NOT Predict Actual Performance

⚠️ Important Note: High complexity score indicates structural complexity, not necessarily slow execution. Use score as:

- Guide for query review and maintainability
- Red flag for potentially problematic queries
- Relative comparison between similar queries
- **NOT** as absolute performance prediction (use EXPLAIN PLAN for actual performance)

### When High Score is Acceptable

- Complex analytical/reporting queries are intentionally complex
- Business logic requires multiple joins and transformations
- Score is high but query has been optimized and tested
- Use refactoring checklist to confirm it's well-optimized

---

## 📝 Advanced Topics

### Understanding Complexity Scoring in Depth

The complexity scoring engine uses a multi-phase analysis approach:

1. **Phase 1: Keyword Scoring** - Analyzes base SQL keywords (FROM, WHERE, GROUP BY, etc.)
2. **Phase 2: JOIN Analysis** - Categorizes each JOIN type and counts relationships
3. **Phase 3: SELECT Field Classification** - Determines complexity of each selected expression
4. **Phase 4: Advanced Structure Detection** - Identifies CTEs, subqueries, window functions
5. **Phase 5: Total Calculation** - Sums all components and assigns complexity level

### Customizing Complexity Weights

For teams with specific standards, you can customize the weight matrix in `src/lib/complexityScorer.ts`:

```typescript
const COMPLEXITY_WEIGHTS = {
  baseClauses: { from: 1, where: 2, distinct: 3, ... },
  joins: { inner: 4, left: 5, full: 10, ... },
  // Adjust weights to match your organization's standards
};
```

### Multi-Dialect Performance Comparison

1. Paste query → Check score
2. Change dialect in Settings → Compare score
3. Identify dialect-specific performance characteristics
4. Optimize for target database

### CTE vs JOIN Optimization

- CTEs add complexity score (8pt each) but improve readability
- Consider materializing CTEs for reuse
- Use MATERIALIZED hint in PostgreSQL when CTE is expensive
- MySQL/SQL Server may re-evaluate CTEs on each reference

### Query Refactoring Checklist

When facing HIGH or SUPER HIGH complexity:

- [ ] Review every JOIN - necessary and optimized?
- [ ] Look for missing WHERE clause - add filtering early
- [ ] Identify SELECT \* usage - specify columns explicitly
- [ ] Check for deep nesting - convert to CTEs
- [ ] Review window functions - can they be consolidated?
- [ ] Examine CTEs - any unused or redundant?
- [ ] Verify indexes on join columns
- [ ] Test EXPLAIN PLAN on actual database
- [ ] Compare metrics before/after changes
- [ ] Document optimization decisions

---

## 📝 Advanced Tips

### Multi-Dialect Comparison

- Analyze same query with different dialects
- Compare metrics to understand dialect performance differences
- Optimize for target database features

### CTE Refactoring

- Copy individual CTEs using CTE Analysis
- Test simplified versions of complex CTEs
- Gradually optimize without breaking functionality

### Documentation

- Export Mermaid diagrams for architecture docs
- Include Metrics Dashboard screenshots for RFC discussions
- Link to CTE Analysis for data lineage documentation

### Performance Tuning

- Use Metrics to identify complexity hotspots
- Correlate high complexity with slow execution times
- Test optimizations and compare metric improvements

---

## 🔄 Workflow Examples

### Quick Audit (5 minutes)

1. Paste query → Check Metrics → Review CTE Analysis → Done

### Deep Analysis (15 minutes)

1. Paste query → Explore Graph → Review all metrics → Export Mermaid → Export tables

### Optimization Work (30+ minutes)

1. Baseline metrics → Identify bottlenecks → Optimize → Compare metrics → Export results

### Team Review (20 minutes)

1. Load query → Export Mermaid → Discuss Graph in meeting → Review CTE origins → Document findings

---

## 🌐 Language Support

### English

- Full feature descriptions
- Complete guidelines
- All UI labels

### Vietnamese (Tiếng Việt)

- Các tính năng đầy đủ
- Hướng dẫn sử dụng
- Tất cả nhãn giao diện

---

## 📞 Support

### Guidelines

- Visit **Guideline** page for detailed feature walkthroughs
- Includes step-by-step instructions for each tool
- Contains tips and best practices

### Example Queries

- Use "Load Sample" in Query Input
- Provides multi-join, CTE-heavy query for exploration

### Settings

- Customize UI to your preferences
- Explore different graph layouts

---

## 🎓 Learning Path

### Beginner

1. **Get Started**
   - Load sample query via "Load Sample" button
   - Observe complexity score in real-time
   - Explore Relationship Graph visualization
   - Check Metrics Dashboard for overall metrics

2. **Understand Complexity**
   - Notice the complexity level badge (LOW/MEDIUM/HIGH/SUPER HIGH)
   - Read linting alerts and understand the warnings
   - Look at the complexity breakdown to see which factors contribute most

3. **First Steps**
   - Try different SQL dialects and see how score changes
   - Paste simple queries to see LOW scores
   - Paste complex queries to see HIGH scores

### Intermediate

1. **Active Analysis**
   - Paste your own SQL queries
   - Use the complexity score as a guide for query quality
   - Review suggested optimizations in Metrics Dashboard
   - Compare metrics for different query approaches

2. **Visualize Relationships**
   - Explore Relationship Graph for table connections
   - Click nodes to see join conditions
   - Use different layout algorithms
   - Export Mermaid diagram

3. **Optimize with Scores**
   - Identify high-scoring queries in your codebase
   - Use Metrics Dashboard breakdown to find bottlenecks
   - Refactor using the optimization checklist
   - Compare before/after scores

### Advanced

1. **Complex Query Analysis**
   - Analyze complex multi-CTE queries
   - Use CTE Analysis for field origin mapping
   - Identify unused or problematic CTEs
   - Extract and optimize individual CTEs

2. **Performance Tuning**
   - Correlate complexity scores with actual execution times
   - Use Metrics to identify index optimization opportunities
   - Review linting violations systematically
   - Document optimization decisions

3. **Team Integration**
   - Use Complexity Dashboard in code review processes
   - Share Mermaid diagrams in documentation
   - Establish team standards based on complexity levels
   - Train team members using Guidelines page

4. **Enterprise Practices**
   - Customize complexity weights for your organization
   - Establish complexity budgets for different query types
   - Use scores in database governance policies
   - Track complexity metrics over time for trend analysis

---

## 📚 Documentation & Resources

### Built-in Resources

- **Guideline Page** - Complete walkthroughs and best practices
- **Sample Queries** - Load pre-built examples via "Load Sample"
- **Complexity Documentation** - See COMPLEXITY_SCORING_IMPLEMENTATION.md for technical details
- **Architecture Guide** - See COMPLEXITY_SCORING_ARCHITECTURE.md for system design

### Getting Help

- Hover over any metric or score for detailed tooltips
- Check the Guidelines page for step-by-step instructions
- Review example queries in Query Input
- Customize settings to match your preferences

---

_Last Updated: 2026-06-26_
_Version: 2.0 (Enhanced with Comprehensive Complexity Scoring)_
_Built with Next.js 15, React 19, TypeScript, and Tailwind CSS_
