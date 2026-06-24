# SQL Visualizer - Feature Overview

A modern SQL analysis and visualization tool built with Next.js, React, and Tailwind CSS. Analyze complex SQL queries, visualize table relationships, measure query complexity, and explore Common Table Expressions (CTEs).

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

### 3. **Metrics Dashboard** 📈

Quantified complexity analysis and performance heuristics for your SQL queries.

**Capabilities:**

- **Complexity Gauge:**
  - 0–100 complexity score with visual radial gauge
  - Color-coded severity: LOW (green) → MEDIUM (yellow) → HIGH (orange) → SUPER HIGH (red)
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
- **Interactive Tooltips:** Hover over metrics for exact values and recommendations
- **Per-Factor Recommendations:** Guidance for optimizing each complexity component

**Metrics Calculated:**

- `joinCount`: Number of JOIN operations
- `subqueryDepth`: Maximum nesting level of subqueries
- `windowFunctionCount`: Window function usage
- `groupByCount`: GROUP BY clause count
- `orderByCount`: ORDER BY clause count
- `distinctCount`: DISTINCT operation count
- `hasUnionAll`: Whether query uses UNION/UNION ALL

**Use Cases:**

- Identify bottlenecks in complex queries
- Compare query complexity before/after optimization
- Get recommendations for improving specific factors
- Estimate relative performance impact
- Benchmark against similar queries

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

Customize appearance, language, and analysis behavior.

**Capabilities:**

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

### Graph Visualization

- Use Dagre layout for hierarchical dependencies
- Use Force-Directed for balanced relationship viewing
- Use MiniMap to navigate large complex queries

### Metrics Dashboard

- Focus on factors with highest complexity scores first
- Use recommendations as starting points for optimization
- Compare metrics before/after optimization

### CTE Analysis

- Always review for unused CTEs (unnecessary overhead)
- Check recursive CTEs for performance issues
- Use field origin mapping to trace data transformations

### Settings

- Choose theme based on environment (dark for low-light coding)
- Set auto-analyze if you edit queries frequently
- Save preferred graph layout for consistency

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

**Beginner:**

1. Load sample query
2. Explore Relationship Graph
3. Check Metrics Dashboard

**Intermediate:**

1. Paste your own query
2. Try different SQL dialects
3. Compare metrics
4. Export Mermaid diagram

**Advanced:**

1. Analyze complex multi-CTE queries
2. Optimize based on metrics
3. Use CTE Analysis for refactoring
4. Export and integrate into documentation
5. Compare before/after optimizations

---

_Last Updated: 2026-06-25_
_Version: 1.0_
_Built with Next.js 15, React 19, TypeScript, and Tailwind CSS_
