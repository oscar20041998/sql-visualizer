# SQL Visualizer - Feature Overview

A comprehensive SQL analysis and visualization tool built with Next.js, React, and Tailwind CSS. Analyze complex SQL queries, visualize table relationships, measure query complexity, and explore Common Table Expressions (CTEs).

## 🆕 Latest additions

- **Query History & Semantic Search** - Every analyzed query is saved and can be found again by describing what it does in plain language, not just by keyword.
- **Optimize SQL** - AI-suggested, targeted rewrites that fix only the issues the local linter already flagged, alongside the existing AI SQL Explainer.
- **Read Explanation Aloud** - Text-to-speech narration of an AI explanation or optimization, via a local (Piper) or cloud (OpenAI) speech engine.
- **Ask the Docs Consultant** - A chat panel on the Guideline page that answers "how do I use this app" questions grounded in this documentation set.
- **Dialect Mismatch Validation** - Query Input warns before analysis when selected syntax conflicts with the chosen dialect.

## 📁 Documentation folder guide

Each feature doc lives under `features/<folder>/`. Folders are named after what they group, not a version number:

| Folder | What it covers |
| --- | --- |
| `features/core-analysis-tools/` | The original analysis toolset: Query Input, Query History, Relationship Graph, JOIN Analysis, Metrics Dashboard, CTE Analysis, Settings, plus the guide-style docs (Best Practices, Optimization Workflow, Learning Path, Workflow Examples, Complexity Scoring). |
| `features/smart-editor-ai-assistant/` | The Smart SQL Editor and everything AI-assisted inside it: the Explainer, follow-up chat, per-CTE batch explain, Optimize SQL, and the Ollama local-model setup guide. |
| `features/voice-and-docs-support/` | Cross-cutting AI features that are not tied to one specific analysis panel: reading an explanation aloud (text-to-speech), and the Docs Consultant chat on the Guideline page. |

`internal-ai-prompt-specs/` (outside `features/`) holds raw AI prompt configurations that are not user-facing guides — including specs for SQL object analyzers (function/stored-procedure/trigger/view) whose backend logic exists but is **not yet wired into any page**. That folder is intentionally excluded from the documentation index and from anything meant to represent "what you can do in the app today."

## 🎯 Quick Feature Overview

### Core Analysis Tools

| Tool                   | Purpose                                                         | Link                                                |
| ---------------------- | --------------------------------------------------------------- | --------------------------------------------------- |
| **Query Input**        | Paste SQL or import MyBatis XML with multi-dialect support      | [Read More](features/core-analysis-tools/QUERY_INPUT.md)         |
| **Query History**      | Semantic search over previously analyzed queries                | [Read More](features/core-analysis-tools/QUERY_HISTORY_SEARCH.md) |
| **Smart SQL Editor**   | Format, compare, and edit SQL in a full-height Monaco editor    | [Read More](features/smart-editor-ai-assistant/SMART_SQL_EDITOR_AI.md) |
| **AI SQL Explainer**   | Explain SQL, ask follow-ups, batch-explain CTEs, and Optimize SQL | [Read More](features/smart-editor-ai-assistant/SMART_SQL_EDITOR_AI.md) |
| **Read Explanation Aloud** | Text-to-speech narration of an explanation or optimization  | [Read More](features/voice-and-docs-support/TEXT_TO_SPEECH.md) |
| **Ask the Docs Consultant** | Chat with an AI grounded in this documentation, from the Guideline page | [Read More](features/voice-and-docs-support/DOCS_CONSULTANT.md) |
| **Relationship Graph** | Interactive visualization of table relationships and JOINs      | [Read More](features/core-analysis-tools/RELATIONSHIP_GRAPH.md)  |
| **JOIN Analysis**      | Deep-dive analysis of JOIN conditions with complexity breakdown | [Read More](features/core-analysis-tools/JOIN_ANALYSIS.md)       |
| **Metrics Dashboard**  | Real-time complexity scoring (0-100) with detailed breakdowns   | [Read More](features/core-analysis-tools/METRICS_DASHBOARD.md)   |
| **CTE Analysis**       | Explore Common Table Expressions and field origins              | [Read More](features/core-analysis-tools/CTE_ANALYSIS.md)        |
| **Settings**           | Customize theme, language, analysis, and AI options             | [Read More](features/core-analysis-tools/SETTINGS.md)            |

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

- Start with [Learning Path](features/core-analysis-tools/LEARNING_PATH.md) for structured guidance
- Follow the [Workflow Examples](features/core-analysis-tools/WORKFLOW_EXAMPLES.md) for real scenarios
- Review [Best Practices](features/core-analysis-tools/BEST_PRACTICES.md) for do's and don'ts

### For Active Users

- Use [Optimization Workflow](features/core-analysis-tools/OPTIMIZATION_WORKFLOW.md) for query improvement
- Reference [Best Practices](features/core-analysis-tools/BEST_PRACTICES.md) for guidelines
- Check [Workflow Examples](features/core-analysis-tools/WORKFLOW_EXAMPLES.md) for different scenarios

### For Advanced Users

- Deep-dive into [Complexity Scoring Engine](features/core-analysis-tools/COMPLEXITY_SCORING.md) for technical details
- Explore [Advanced Topics](features/core-analysis-tools/ADVANCED_TOPICS.md) for enterprise patterns
- Review [Best Practices](features/core-analysis-tools/BEST_PRACTICES.md) for optimization strategies

## 📋 Feature Documentation

All features are documented in separate, easy-to-read markdown files:

### Core Features

- [Query Input](features/core-analysis-tools/QUERY_INPUT.md) - SQL input and dialect selection
- [Query History & Semantic Search](features/core-analysis-tools/QUERY_HISTORY_SEARCH.md) - Find a past query by describing what it does
- [Relationship Graph Visualizer](features/core-analysis-tools/RELATIONSHIP_GRAPH.md) - Table relationship visualization
- [JOIN Analysis](features/core-analysis-tools/JOIN_ANALYSIS.md) - Deep JOIN condition analysis
- [Metrics Dashboard](features/core-analysis-tools/METRICS_DASHBOARD.md) - Complexity scoring and breakdown
- [CTE Analysis](features/core-analysis-tools/CTE_ANALYSIS.md) - Common Table Expression exploration
- [Settings & Preferences](features/core-analysis-tools/SETTINGS.md) - UI customization

### AI-Assisted Features

- [Smart SQL Editor & AI SQL Explainer](features/smart-editor-ai-assistant/SMART_SQL_EDITOR_AI.md) - Editing, explaining, follow-up chat, and Optimize SQL
- [Ollama Setup and Usage](features/smart-editor-ai-assistant/OLLAMA_SETUP_AND_USAGE.md) - Running a local model for a private workflow
- [Read Explanation Aloud](features/voice-and-docs-support/TEXT_TO_SPEECH.md) - Text-to-speech for AI explanations and optimizations
- [Ask the Docs Consultant](features/voice-and-docs-support/DOCS_CONSULTANT.md) - RAG chat about the app's own features, on the Guideline page

### Guides & Workflows

- [Best Practices](features/core-analysis-tools/BEST_PRACTICES.md) - Do's and don'ts for query optimization
- [Optimization Workflow](features/core-analysis-tools/OPTIMIZATION_WORKFLOW.md) - Step-by-step optimization guide
- [Workflow Examples](features/core-analysis-tools/WORKFLOW_EXAMPLES.md) - Real-world usage scenarios
- [Learning Path](features/core-analysis-tools/LEARNING_PATH.md) - Structured learning guide

### Technical Reference

- [Complexity Scoring Engine](features/core-analysis-tools/COMPLEXITY_SCORING.md) - Weight matrix and scoring details
- [Advanced Topics](features/core-analysis-tools/ADVANCED_TOPICS.md) - Enterprise patterns and customization

## 🛠️ Tool Overview

### Input & Configuration

| Tool            | Purpose                                                |
| --------------- | ------------------------------------------------------ |
| **Query Input** | Paste SQL or import MyBatis XML, select SQL dialect    |
| **Settings**    | Configure theme, language, graph layout, auto-analysis, AI provider |

### Analysis Tools

| Tool                   | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| **Relationship Graph** | Visualize table relationships and JOINs          |
| **JOIN Analysis**      | Detailed JOIN conditions and complexity analysis |
| **Metrics Dashboard**  | Measure complexity and performance heuristics    |
| **CTE Analysis**       | Deep-dive into CTEs and field origins            |

### AI Tools

| Tool                        | Purpose                                                     |
| ---------------------------- | ------------------------------------------------------------ |
| **AI SQL Explainer**        | Structured, plain-language explanation of the current query |
| **Optimize SQL**            | Targeted, linter-driven rewrite suggestions                  |
| **Follow-up Chat**          | Multi-turn Q&A about the explained query                     |
| **Read Explanation Aloud**  | Text-to-speech narration of an explanation or optimization   |
| **Ask the Docs Consultant** | Q&A about the app itself, grounded in this documentation     |

### Export/Integration

| Feature                 | Format            | Use Case                       |
| ----------------------- | ----------------- | ------------------------------- |
| Extracted Tables Export | CSV               | Spreadsheet analysis           |
| Mermaid Diagram Export  | Mermaid.js syntax | Documentation, wikis, diagrams |
| CTE SQL Copy            | Plain text        | Reuse in other queries         |

## 🎯 Common Use Cases

### Code Review

Verify a complex query before production using Relationship Graph, JOIN Analysis, and Metrics Dashboard. See [Workflow Examples](features/core-analysis-tools/WORKFLOW_EXAMPLES.md) for detailed steps.

### Performance Optimization

Identify and fix performance issues using complexity scores and recommendations, or let **Optimize SQL** propose a targeted fix. See [Optimization Workflow](features/core-analysis-tools/OPTIMIZATION_WORKFLOW.md) for the complete process.

### Documentation

Generate visual architecture diagrams and export Mermaid syntax for team documentation. See [Workflow Examples](features/core-analysis-tools/WORKFLOW_EXAMPLES.md) for examples.

### Learning/Training

Help new team members understand query structure and complexity patterns, or point them at **Ask the Docs Consultant** for self-serve Q&A. See [Learning Path](features/core-analysis-tools/LEARNING_PATH.md) for guidance.

### Database Migration

Assess multi-dialect compatibility and plan migration tasks. See [Advanced Topics](features/core-analysis-tools/ADVANCED_TOPICS.md) for multi-dialect optimization.

## 📊 Complexity Levels

| Level          | Score Range | Meaning                 | Action                           |
| -------------- | ----------- | ----------------------- | -------------------------------- |
| **LOW**        | 0-20        | Simple, well-optimized  | No action needed                 |
| **MEDIUM**     | 21-50       | Moderate complexity     | Review and optimize if needed    |
| **HIGH**       | 51-100      | Complex with risks      | Consider refactoring             |
| **SUPER_HIGH** | 101+        | Very complex, high risk | Requires significant refactoring |

For detailed interpretation, see [Metrics Dashboard](features/core-analysis-tools/METRICS_DASHBOARD.md) or [Best Practices](features/core-analysis-tools/BEST_PRACTICES.md).

## 🌐 Language Support

- **English** - Full feature descriptions, complete guidelines
- **Vietnamese** - Complete UI translations including all new features
- Switch anytime in Settings → Preferences

## 🎓 Choose Your Learning Path

### I want to understand how to use this tool

→ Start with [Learning Path](features/core-analysis-tools/LEARNING_PATH.md), or ask [the Docs Consultant](features/voice-and-docs-support/DOCS_CONSULTANT.md) directly

### I want to optimize a specific query

→ Go to [Optimization Workflow](features/core-analysis-tools/OPTIMIZATION_WORKFLOW.md), or try **Optimize SQL** in the [Smart SQL Editor](features/smart-editor-ai-assistant/SMART_SQL_EDITOR_AI.md)

### I want to see real-world examples

→ Check [Workflow Examples](features/core-analysis-tools/WORKFLOW_EXAMPLES.md)

### I want to understand complexity scoring

→ Read [Complexity Scoring Engine](features/core-analysis-tools/COMPLEXITY_SCORING.md)

### I need best practices and guidelines

→ Review [Best Practices](features/core-analysis-tools/BEST_PRACTICES.md)

### I want advanced customization

→ Explore [Advanced Topics](features/core-analysis-tools/ADVANCED_TOPICS.md)

## 📝 Quick Start Checklist

- [ ] Load a sample query using "Load Sample" button
- [ ] Review complexity score in Metrics Dashboard
- [ ] Explore Relationship Graph with different layouts
- [ ] Check JOIN Analysis for join details
- [ ] Review CTE Analysis if query has CTEs
- [ ] Switch theme and language in Settings
- [ ] Try AI SQL Explainer, then Optimize SQL, on a real query
- [ ] Export Mermaid diagram
- [ ] Read [Best Practices](features/core-analysis-tools/BEST_PRACTICES.md) for guidelines

## 📞 Need Help?

- **Getting started?** → [Learning Path](features/core-analysis-tools/LEARNING_PATH.md)
- **Optimizing a query?** → [Optimization Workflow](features/core-analysis-tools/OPTIMIZATION_WORKFLOW.md)
- **Want examples?** → [Workflow Examples](features/core-analysis-tools/WORKFLOW_EXAMPLES.md)
- **Technical details?** → [Complexity Scoring Engine](features/core-analysis-tools/COMPLEXITY_SCORING.md)
- **Best practices?** → [Best Practices](features/core-analysis-tools/BEST_PRACTICES.md)
- **Anything else about the app?** → [Ask the Docs Consultant](features/voice-and-docs-support/DOCS_CONSULTANT.md) on the Guideline page

---

_Last Updated: 2026-08-22_
_Version: 2.3 (Optimize SQL, Read-Aloud, and the Docs Consultant chat)_
_Built with Next.js 15, React 19, TypeScript, and Tailwind CSS_
