# Data Model: Query Input UX Improvement

## Overview

This feature does not introduce a new backend data model or domain object. It improves the presentation and organization of the existing UI state used by the Query Input workflow.

## Core Entities

### QueryInputSession
**Purpose:** Represents the current working state of a query-analysis session for a single user action.

**Fields:**
- inputMode: `sql` | `mybatis` | `import-xml` | `smart-editor`
- dialect: active SQL dialect selected by the user
- rawSql: direct SQL string entered by the user
- myBatisXml: XML string for MyBatis input
- resolvedSql: final SQL after parameter resolution
- myBatisParams: map of parameter name to value
- detectedParams: array of extracted parameter names
- conditionalParams: map of conditional parameter names to conditional expressions
- isAnalyzing: current loading status for analysis
- analysisResult: current parser output for downstream screens

**Relationships:**
- A `QueryInputSession` owns the source SQL or XML that becomes `resolvedSql` for analysis.
- `myBatisParams` is the runtime input that resolves `myBatisXml` into `resolvedSql`.
- `analysisResult` is derived after the user triggers the query analysis action.

### DetectedParameter
**Purpose:** Represents a single runtime parameter required to materialize final SQL.

**Fields:**
- name: extracted placeholder or parameter identifier
- value: user-provided value
- conditional: whether the parameter belongs to an XML conditional block
- source: underlying MyBatis source expression

**Validation rules:**
- Parameter names are read from the existing XML parsing logic and must not be redefined by the UI.
- Values remain user-editable but must preserve the existing extraction and formatting behavior.

### ResolvedSql
**Purpose:** The final SQL generated from the active input and parameter values, which is then analyzed.

**Fields:**
- content: final SQL string before analysis
- source: `rawSql` or `resolvedSql` from MyBatis depending on current input mode
- lineCount: derived from SQL content, used for preview and navigation

**Behavior:**
- The SQL preview must be treated as the single source of truth for the currently selected input mode.
- The editor remains read-only in the preview for the final generated SQL.

### AnalysisFinding
**Purpose:** Represents a warning, recommendation, or issue surfaced by the analyzer.

**Fields:**
- type: issue code or category
- severity: existing severity semantics from the analyzer
- summary: brief explanation suitable for quick scanning
- location: line or context reference where the issue was detected
- recommendation: optional guidance or remediation text
- expanded: user-state toggle for detailed inspection

**Validation rules:**
- Existing severity meaning must remain unchanged.
- No new severity level is introduced by the UI.
- The interaction behavior for expand/collapse and navigation is preserved.

## State Transitions

1. User selects an input mode.
2. The page loads or maintains the current SQL or XML draft.
3. MyBatis parameters are extracted and mapped when XML changes.
4. The user edits parameter values.
5. Resolved SQL is recalculated and presented in the preview area.
6. User triggers analysis.
7. Analyst output is saved to `analysisResult` and findings are displayed.

## UI Contracts

The UI must preserve the current state contracts exposed by the Zustand store and child components, particularly:
- `inputMode`
- `dialect`
- `rawSql`
- `myBatisXml`
- `resolvedSql`
- `myBatisParams`
- `analysisResult`
- `isAnalyzing`

This feature improves presentation only; it does not change the data contract or create a separate state architecture.
