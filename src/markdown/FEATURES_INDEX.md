# SQL Visualizer - Feature Overview

A comprehensive SQL analysis and visualization tool built with Next.js, React, and Tailwind CSS. Analyze complex SQL queries, visualize table relationships, measure query complexity, and explore Common Table Expressions (CTEs).

## 🆕 Version 2.1: Enhanced with Deep JOIN Analysis

The latest update introduces:

- **Deep JOIN Analysis** - Detailed analysis of JOIN conditions with complexity breakdown
- **Adaptive Complexity Evaluation** - Median-based complexity thresholds that adapt to your workload
- **Multi-Dialect Support** - Complete support for MySQL, PostgreSQL, SQL Server, and Oracle

## 🎯 Quick Feature Overview

### Core Analysis Tools

| Tool                   | Purpose                                                         | Link                                        |
| ---------------------- | --------------------------------------------------------------- | ------------------------------------------- |
| **Query Input**        | Paste SQL or import MyBatis XML with multi-dialect support      | [Read More](features/QUERY_INPUT.md)        |
| **Relationship Graph** | Interactive visualization of table relationships and JOINs      | [Read More](features/RELATIONSHIP_GRAPH.md) |
| **JOIN Analysis**      | Deep-dive analysis of JOIN conditions with complexity breakdown | [Read More](features/JOIN_ANALYSIS.md)      |
| **Metrics Dashboard**  | Real-time complexity scoring (0-100) with detailed breakdowns   | [Read More](features/METRICS_DASHBOARD.md)  |
| **CTE Analysis**       | Explore Common Table Expressions and field origins              | [Read More](features/CTE_ANALYSIS.md)       |
| **Settings**           | Customize theme, language, and analysis options                 | [Read More](features/SETTINGS.md)           |

## 📊 Supported SQL Dialects

- **MySQL** (5.7+) - Including STRAIGHT_JOIN and USING clause
- **PostgreSQL** (9.6+) - Including LATERAL JOIN and advanced features
- **SQL Server** (2016+) - Including CROSS APPLY and OUTER APPLY
- **Oracle** (12c+) - Including OUTER JOIN variants and USING clause

Analysis adapts to dialect-specific features:

- Window functions
- CTE support
- JOIN variations
- Subquery handling

## 🎨 UI Features

- **Responsive Design** - Works on desktop, tablet, and mobile (optimized for desktop)
- **Dark/Light Mode** - Full theme support with persistent preference
- **Bilingual UI** - English and Vietnamese support
- **Keyboard Shortcuts** - Quick navigation and actions
- **Interactive Tooltips** - Hover for detailed information
- **Real-time Updates** - Instant feedback on analysis changes
- **Minimap Navigation** - Quick orientation in large graphs
- **Collapsible Sections** - Expand/collapse details on demand

## 🚀 Getting Started

1. Navigate to [http://localhost:4028](http://localhost:4028)
2. Select your SQL dialect from the dropdown
3. Paste your SQL query or click "Load Sample"
4. Check the analysis results in the dashboard
5. Explore different tools to understand your query

## 📖 Comprehensive Documentation

### For Beginners

- Start with [Learning Path](features/LEARNING_PATH.md) for structured guidance
- Follow the [Workflow Examples](features/WORKFLOW_EXAMPLES.md) for real scenarios
- Review [Best Practices](features/BEST_PRACTICES.md) for do's and don'ts

### For Active Users

- Use [Optimization Workflow](features/OPTIMIZATION_WORKFLOW.md) for query improvement
- Reference [Best Practices](features/BEST_PRACTICES.md) for guidelines
- Check [Workflow Examples](features/WORKFLOW_EXAMPLES.md) for different scenarios

### For Advanced Users

- Deep-dive into [Complexity Scoring Engine](features/COMPLEXITY_SCORING.md) for technical details
- Explore [Advanced Topics](features/ADVANCED_TOPICS.md) for enterprise patterns
- Review [Best Practices](features/BEST_PRACTICES.md) for optimization strategies

## 📋 Feature Documentation

All features are documented in separate, easy-to-read markdown files:

### Core Features

- [Query Input](features/QUERY_INPUT.md) - SQL input and dialect selection
- [Relationship Graph Visualizer](features/RELATIONSHIP_GRAPH.md) - Table relationship visualization
- [JOIN Analysis](features/JOIN_ANALYSIS.md) - Deep JOIN condition analysis
- [Metrics Dashboard](features/METRICS_DASHBOARD.md) - Complexity scoring and breakdown
- [CTE Analysis](features/CTE_ANALYSIS.md) - Common Table Expression exploration
- [Settings & Preferences](features/SETTINGS.md) - UI customization

### Guides & Workflows

- [Best Practices](features/BEST_PRACTICES.md) - Do's and don'ts for query optimization
- [Optimization Workflow](features/OPTIMIZATION_WORKFLOW.md) - Step-by-step optimization guide
- [Workflow Examples](features/WORKFLOW_EXAMPLES.md) - Real-world usage scenarios
- [Learning Path](features/LEARNING_PATH.md) - Structured learning guide

### Technical Reference

- [Complexity Scoring Engine](features/COMPLEXITY_SCORING.md) - Weight matrix and scoring details
- [Advanced Topics](features/ADVANCED_TOPICS.md) - Enterprise patterns and customization

## 🛠️ Tool Overview

### Input & Configuration

| Tool            | Purpose                                                |
| --------------- | ------------------------------------------------------ |
| **Query Input** | Paste SQL or import MyBatis XML, select SQL dialect    |
| **Settings**    | Configure theme, language, graph layout, auto-analysis |

### Analysis Tools

| Tool                   | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| **Relationship Graph** | Visualize table relationships and JOINs          |
| **JOIN Analysis**      | Detailed JOIN conditions and complexity analysis |
| **Metrics Dashboard**  | Measure complexity and performance heuristics    |
| **CTE Analysis**       | Deep-dive into CTEs and field origins            |

### Export/Integration

| Feature                 | Format            | Use Case                       |
| ----------------------- | ----------------- | ------------------------------ |
| Extracted Tables Export | CSV               | Spreadsheet analysis           |
| Mermaid Diagram Export  | Mermaid.js syntax | Documentation, wikis, diagrams |
| CTE SQL Copy            | Plain text        | Reuse in other queries         |

## 🎯 Common Use Cases

### Code Review

Verify a complex query before production using Relationship Graph, JOIN Analysis, and Metrics Dashboard. See [Workflow Examples](features/WORKFLOW_EXAMPLES.md) for detailed steps.

### Performance Optimization

Identify and fix performance issues using complexity scores and recommendations. See [Optimization Workflow](features/OPTIMIZATION_WORKFLOW.md) for the complete process.

### Documentation

Generate visual architecture diagrams and export Mermaid syntax for team documentation. See [Workflow Examples](features/WORKFLOW_EXAMPLES.md) for examples.

### Learning/Training

Help new team members understand query structure and complexity patterns. See [Learning Path](features/LEARNING_PATH.md) for guidance.

### Database Migration

Assess multi-dialect compatibility and plan migration tasks. See [Advanced Topics](features/ADVANCED_TOPICS.md) for multi-dialect optimization.

## 📊 Complexity Levels

| Level          | Score Range | Meaning                 | Action                           |
| -------------- | ----------- | ----------------------- | -------------------------------- |
| **LOW**        | 0-20        | Simple, well-optimized  | No action needed                 |
| **MEDIUM**     | 21-50       | Moderate complexity     | Review and optimize if needed    |
| **HIGH**       | 51-100      | Complex with risks      | Consider refactoring             |
| **SUPER_HIGH** | 101+        | Very complex, high risk | Requires significant refactoring |

For detailed interpretation, see [Metrics Dashboard](features/METRICS_DASHBOARD.md) or [Best Practices](features/BEST_PRACTICES.md).

## 🌐 Language Support

- **English** - Full feature descriptions, complete guidelines
- **Vietnamese** - Complete UI translations including all new features
- Switch anytime in Settings → Preferences

## 🎓 Choose Your Learning Path

### I want to understand how to use this tool

→ Start with [Learning Path](features/LEARNING_PATH.md)

### I want to optimize a specific query

→ Go to [Optimization Workflow](features/OPTIMIZATION_WORKFLOW.md)

### I want to see real-world examples

→ Check [Workflow Examples](features/WORKFLOW_EXAMPLES.md)

### I want to understand complexity scoring

→ Read [Complexity Scoring Engine](features/COMPLEXITY_SCORING.md)

### I need best practices and guidelines

→ Review [Best Practices](features/BEST_PRACTICES.md)

### I want advanced customization

→ Explore [Advanced Topics](features/ADVANCED_TOPICS.md)

## 📝 Quick Start Checklist

- [ ] Load a sample query using "Load Sample" button
- [ ] Review complexity score in Metrics Dashboard
- [ ] Explore Relationship Graph with different layouts
- [ ] Check JOIN Analysis for join details
- [ ] Review CTE Analysis if query has CTEs
- [ ] Switch theme and language in Settings
- [ ] Export Mermaid diagram
- [ ] Read [Best Practices](features/BEST_PRACTICES.md) for guidelines

## 📞 Need Help?

- **Getting started?** → [Learning Path](features/LEARNING_PATH.md)
- **Optimizing a query?** → [Optimization Workflow](features/OPTIMIZATION_WORKFLOW.md)
- **Want examples?** → [Workflow Examples](features/WORKFLOW_EXAMPLES.md)
- **Technical details?** → [Complexity Scoring Engine](features/COMPLEXITY_SCORING.md)
- **Best practices?** → [Best Practices](features/BEST_PRACTICES.md)

---

_Last Updated: 2026-07-01_
_Version: 2.1 (Enhanced with Deep JOIN Analysis)_
_Built with Next.js 15, React 19, TypeScript, and Tailwind CSS_
