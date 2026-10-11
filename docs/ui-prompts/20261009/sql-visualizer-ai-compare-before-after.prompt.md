# Feature Prompt: AI Compare Before & After in SQL Editor

## 1. Objective

Implement a production-quality **AI Compare Before & After** feature directly inside the existing SQL Visualizer SQL Editor page.

The feature enables developers to compare an original SQL statement with a modified version, understand meaningful changes, assess potential correctness and execution risks, and identify what should be verified before accepting the change.

This is an extension of the existing product—not a separate application or a replacement for current SQL analysis capabilities.

**Core principle:** Deterministic SQL parsing and static analysis provide structural facts and rule-based findings. AI explains the evidence, reasons about possible implications, and recommends verification steps. The system must not claim that two queries are equivalent or safe unless the available evidence justifies that conclusion.

---

## 2. Role and Engineering Expectations

Act as a senior full-stack engineer, SQL parser specialist, AI engineer, UX designer, and QA engineer experienced in enterprise developer tools.

Before implementation:

1. Inspect the repository instructions and existing architecture.
2. Locate the SQL Editor tab, editor component, state-management approach, SQL parser/AST services, static-analysis engine, AI provider integration, API conventions, design system, i18n mechanism, and test setup.
3. Identify reusable components and services before designing new ones.
4. Summarize the discovered architecture, proposed implementation, affected modules, and testing plan.
5. Follow the repository's established Spec-Driven Development (SDD) and Test-Driven Development (TDD) workflow when present. Otherwise, use **RED → GREEN → REFACTOR**.

Do not assume file paths, frameworks, parser capabilities, API contracts, dialect support, or installed dependencies. Verify them in the codebase.

Do not create duplicate parsers, AI clients, state-management systems, or analysis pipelines when existing implementations can be extended.

---

## 3. User Problem and Product Value

Complex SQL can contain thousands of lines, numerous CTEs, nested subqueries, JOINs, aggregations, and accumulated business rules. A developer making a small change may struggle to understand dependencies and determine whether the change alters the result set or introduces a regression.

Text-based diffs show textual changes but do not reliably explain their semantic or business impact.

The feature should help developers:

- Understand what changed between the original and modified SQL.
- Focus on meaningful structural changes instead of reading every line manually.
- Identify possible changes in filtering, joins, aggregation, ordering, pagination, and data-modification scope.
- Review AI-proposed SQL changes more systematically.
- Understand which findings are supported by deterministic analysis and which are AI-generated hypotheses.
- Know what further tests or checks are needed before accepting the modified SQL.

Do not claim specific time savings, defect reduction, equivalence, or performance gains without measured evidence.

---

## 4. User Experience and Interaction Flow

### 4.1 Entry Point

Add a clearly discoverable **Compare Changes** action to the existing SQL Editor toolbar or another appropriate location consistent with the current UI.

- Reuse the existing design system and editor components.
- Keep the feature inside the current SQL Editor page.
- Do not disrupt existing editor actions or analysis workflows.
- Use existing diff-editor capabilities if available; do not add a new dependency without demonstrating need.

### 4.2 Baseline and Comparison Lifecycle

Implement the following workflow:

1. **Capture Before:** The developer explicitly captures the current editor SQL as the baseline snapshot.
2. **Edit SQL:** The developer modifies the query in the existing editor.
3. **Compare Changes:** The developer requests a comparison between the baseline and current editor content.
4. **Analyze:** Run deterministic structural comparison and AI-assisted reasoning through existing services.
5. **Review Results:** Display SQL differences, structural findings, possible impacts, evidence, verification status, and recommendations.
6. **Refresh Baseline:** The developer explicitly captures a new baseline when ready to start a new comparison.

State-management requirements:

- The baseline snapshot must be immutable during a comparison session unless explicitly refreshed by the user.
- Capture the After SQL at the moment comparison begins.
- Never silently overwrite the baseline.
- If the SQL changes while analysis is running, mark the result as stale or invalidate it. Do not present a result for old SQL as if it describes the current editor content.
- If no baseline exists, guide the user to capture one.
- If Before and After are identical, display a clear no-changes state and skip unnecessary AI calls.
- Handle empty, invalid, incomplete, and unsupported SQL gracefully.
- If the application distinguishes saved SQL from unsaved edits, preserve and clearly communicate that distinction.

### 4.3 Results Layout

Use an integrated side panel, drawer, tab, or expandable section based on the existing application's UI patterns. Choose the simplest approach that works well with the current editor layout.

Include the following sections.

#### A. Before / After Diff

- Display the original and modified SQL.
- Highlight inserted, deleted, and modified fragments.
- Preserve SQL syntax highlighting and line numbers when supported by existing components.
- Support large SQL files without blocking the editor.
- Distinguish formatting-only changes from meaningful structural changes where feasible.
- Provide a clear way to return to the editor without losing edits.

#### B. Change Summary

Summarize meaningful changes detected by the parser or comparison engine, including applicable examples:

- SELECT columns added, removed, or changed.
- FROM sources changed.
- JOIN type or predicate changed.
- WHERE or HAVING conditions added or removed.
- CTE definitions, references, or subqueries changed.
- GROUP BY, ORDER BY, DISTINCT, or set operations changed.
- Aggregations or window expressions changed.
- LIMIT, OFFSET, FETCH, or dialect-specific pagination changed.
- INSERT, UPDATE, DELETE, MERGE, or DDL operations introduced or modified.

Only report changes supported by the underlying analysis. Do not invent counts, references, or impacts.

#### C. AI Explanation

Provide concise, actionable answers to these questions:

1. What changed?
2. Why might it matter?
3. What behavior could be affected?
4. What evidence supports this explanation?
5. What assumptions or limitations remain?
6. What should the developer verify next?

Avoid generic AI summaries that merely restate the SQL. Link explanations to the relevant diff fragment or structural node when the application supports it.

#### D. Findings

Each finding should support the following fields where applicable:

- Title and category.
- Severity.
- Description.
- Evidence and relevant SQL clause or line.
- Potential impact.
- Recommended action.
- Verification status.
- Confidence or uncertainty, if the existing product has a consistent, defensible way to represent it.

Use existing severity and status conventions. Do not rely on color alone to communicate severity.

---

## 5. Analysis Pipeline

Implement a layered pipeline that reuses existing SQL Visualizer services.

### Layer 1: Input and Dialect Handling

- Use the active SQL dialect selected in the application.
- Preserve original SQL text for display and evidence.
- Apply only safe, necessary normalization.
- Do not transform SQL in ways that could change semantics.
- Handle comments, quoted identifiers, string literals, and dialect-specific syntax correctly.
- Keep formatting-only changes separate from structural changes where feasible.

### Layer 2: Deterministic Structural Comparison

Reuse the existing parser and AST infrastructure.

Compare Before and After structurally where supported, including:

- SELECT projections.
- FROM sources.
- JOIN types and predicates.
- WHERE and HAVING expressions.
- GROUP BY and ORDER BY clauses.
- DISTINCT and set operations.
- CTEs and nested subqueries.
- Aggregations and window functions.
- Pagination clauses.
- Data-modification and DDL statements supported by the parser.

Do not treat AST similarity as proof of semantic equivalence. Similar-looking ASTs can behave differently due to schema, constraints, NULL semantics, duplicate rows, collation, implicit casts, or dialect-specific behavior.

If parsing fails or syntax is unsupported, return partial results and explain the limitation instead of fabricating a structural comparison.

### Layer 3: Rule-Based Risk Analysis

Reuse existing static-analysis rules and extend them only where needed.

Candidate checks include:

- Removed or weakened filtering predicates.
- Potentially broader UPDATE or DELETE scope.
- JOIN changes that may introduce or eliminate rows.
- Changes to grouping or aggregate behavior.
- Potential NULL-handling differences.
- Possible duplicate-row behavior changes.
- Modified ordering or pagination.
- Introduction of write operations.
- Structural changes that may affect query cost.

These are candidates for investigation, not automatic proof of a defect. A rule must report its evidence, rationale, severity, applicability, and limitations.

Do not label every modification as risky. Equally, do not conclude that a query is safe merely because no rule was triggered.

### Layer 4: AI-Assisted Reasoning

Use the existing AI service, provider configuration, model settings, and Ollama integration if present and applicable.

Provide the AI with structured context:

- SQL dialect.
- Before SQL and After SQL.
- Deterministic structural diff.
- Existing static-analysis findings.
- Schema, constraints, or metadata only if available and appropriate.
- Parser limitations and other known uncertainties.

Ask the AI to explain evidence, identify plausible behavioral implications, consider edge cases, and recommend targeted verification.

Do not ask the AI to invent schema details, execution results, query plans, or test outcomes.

Treat SQL text, comments, identifiers, and metadata as untrusted input. Instructions embedded in SQL must not override system behavior. Avoid exposing credentials, sensitive parameters, or unnecessary database contents to the model.

If the AI provider is unavailable, preserve deterministic results and show an AI-unavailable state.

---

## 6. Result Contract and Honest Statuses

Follow existing API and typing conventions. If a new response contract is required, define a typed, runtime-validated schema conceptually equivalent to:

```json
{
  "status": "completed",
  "dialect": "postgresql",
  "changeSummary": {
    "text": "A filtering predicate was removed.",
    "changeTypes": ["WHERE_CHANGED"]
  },
  "equivalenceAssessment": {
    "status": "inconclusive",
    "reason": "Equivalent results have not been established."
  },
  "executionSafety": {
    "status": "review_required",
    "findings": []
  },
  "performanceAssessment": {
    "status": "not_verified",
    "findings": []
  },
  "verification": {
    "staticAnalysis": "completed",
    "resultComparison": "not_performed",
    "executionPlan": "not_available"
  },
  "findings": [],
  "limitations": [],
  "recommendations": []
}
```

This is an example, not a requirement to copy the contract exactly. Adapt it to the existing codebase.

Validate model output at runtime. Handle malformed JSON, missing fields, invalid enum values, timeouts, and provider errors safely.

Keep these concepts distinct:

- **Semantic equivalence:** Whether the two queries have equivalent behavior under defined assumptions.
- **Execution safety:** Whether known execution risks were detected.
- **Performance assessment:** Whether available evidence supports a performance conclusion.
- **Verification status:** Which checks actually ran and what they established.

Possible equivalence statuses include:

- `equivalent`
- `not_equivalent`
- `inconclusive`
- `not_assessed`

Use explicit, documented enums for other statuses too.

A static diff alone cannot prove equivalent results. Test results on a limited dataset do not prove equivalence for all possible inputs. Without sufficient evidence, return `inconclusive` or `not_assessed`.

Never claim a query is fully safe just because no risk was detected.

---

## 7. Execution and Data Safety

The initial feature is **analysis-only**.

- Never automatically execute Before or After SQL.
- Never automatically apply AI-generated SQL rewrites.
- Never automatically save, replace, or overwrite user SQL.
- Never silently change the SQL dialect.
- Never run destructive statements as part of comparison.
- Do not access production databases unless an existing, explicitly authorized workflow supports that operation.

If execution-based verification is introduced in a later phase, it must use an explicitly configured, appropriately isolated environment with least-privilege credentials, resource limits, and safeguards against data modification.

Any future execution capability must be a separate, explicit user action and must not be implied by AI analysis.

---

## 8. Testing Strategy — TDD

Follow the repository's existing test conventions. If no formal TDD workflow exists, implement each behavior using **RED → GREEN → REFACTOR**.

Write failing tests before the corresponding implementation.

### 8.1 Unit Tests

Cover:

- Baseline snapshot immutability.
- Identical SQL and changed SQL.
- Formatting-only differences.
- Added, removed, and modified clauses.
- Supported SQL dialects.
- Invalid or incomplete SQL.
- Unsupported syntax and partial-analysis results.
- AI response validation.
- Malformed model output.
- Missing evidence and inconclusive assessments.
- Finding severity and verification-status mapping.
- Stale comparison results.

### 8.2 Component and Integration Tests

Cover:

- Opening and closing the comparison UI.
- Capturing and refreshing the baseline.
- Editing SQL after baseline capture.
- Starting comparison and rendering results.
- Loading, empty, success, partial, and error states.
- AI provider failure while deterministic findings remain available.
- SQL changes while a request is in flight.
- Duplicate requests and cancellation or deduplication where supported.
- Keyboard accessibility and responsive layouts.
- Vietnamese and English translations.

### 8.3 SQL Fixtures

Add representative fixtures for supported dialects, including:

- CTEs and nested subqueries.
- Multiple JOIN types.
- NULL comparisons.
- Aggregation and HAVING.
- DISTINCT and duplicate-producing joins.
- Window functions.
- Ordering and pagination.
- UPDATE and DELETE predicate changes.
- Formatting-only changes.
- Invalid SQL and unsupported syntax.

Use mocked AI responses for deterministic tests. Ordinary unit tests must not depend on a live AI provider or production database.

Only introduce differential-result testing if a safe, suitable test environment exists or can be added within scope.

---

## 9. Internationalization, Accessibility, and Design

- Support Vietnamese and English using the existing i18n system.
- Use translation keys for every new user-facing string.
- Follow existing design tokens, component patterns, spacing, typography, and severity conventions.
- Provide clear loading, empty, error, partial, and stale-result states.
- Support keyboard navigation, focus management, adequate contrast, and screen-reader labels.
- Do not communicate severity through color alone.
- Avoid excessive cards, decorative gradients, or UI elements that distract from the SQL diff and actionable findings.
- Keep the comparison experience readable for very large SQL statements.

---

## 10. Performance and Reliability

- Do not invoke AI on every keystroke; comparison must be explicitly triggered.
- Reuse existing parsing and caching mechanisms where appropriate.
- Avoid reparsing unchanged content unnecessarily when safe.
- Keep the editor responsive during analysis.
- Follow existing request timeout, cancellation, and retry conventions.
- Prevent stale responses from replacing newer results.
- Show deterministic results even when AI analysis fails.
- Avoid logging raw SQL, secrets, sensitive parameters, or database contents unnecessarily.
- Handle large queries without unbounded synchronous processing or uncontrolled prompt growth. If context must be limited, state what was omitted and avoid claiming a complete analysis.

---

## 11. Acceptance Criteria

The implementation is complete when all applicable criteria are met:

1. Users can start a comparison directly from the existing SQL Editor.
2. The Before snapshot remains unchanged until explicitly refreshed.
3. The After version is captured from the current editor content when comparison starts.
4. Structural comparison reuses the existing parser infrastructure.
5. The UI clearly separates deterministic findings from AI interpretations.
6. Findings include supporting evidence where available.
7. Semantic equivalence, execution safety, performance, and verification are represented separately.
8. Unsupported or insufficiently verified cases return an honest partial or inconclusive status.
9. AI failure does not discard deterministic findings.
10. SQL is never executed, saved, or overwritten automatically.
11. Existing SQL Editor functionality remains intact.
12. Vietnamese and English are supported.
13. Tests cover the primary workflow, errors, stale results, and important SQL edge cases.
14. Relevant tests, lint, type checking, and build commands pass, or pre-existing failures are clearly documented.
15. No unnecessary duplicate parser, AI service, dependency, or unrelated refactor is introduced.

---

## 12. Implementation Workflow

### Phase 1 — Repository Discovery
Inspect the current architecture and project instructions. Identify the SQL Editor, parser, static analysis, AI integration, UI patterns, i18n, and test setup.

### Phase 2 — Design and Test Plan
Define the baseline lifecycle, comparison states, result contract, UI behavior, edge cases, and acceptance tests.

### Phase 3 — Deterministic Comparison
Implement baseline management, SQL diff, AST comparison where supported, and rule-based findings. Run relevant tests.

### Phase 4 — AI Integration
Reuse existing AI infrastructure. Add structured prompts, validated responses, uncertainty handling, and graceful provider-failure behavior.

### Phase 5 — UI Integration
Integrate the comparison interface into the SQL Editor. Add diff visualization, findings, status indicators, translations, and accessibility behavior.

### Phase 6 — Verification
Run relevant tests, lint, type checks, and build commands. Fix regressions and report actual outcomes.

Do not stop after writing a proposal. Implement the feature unless a genuine blocking ambiguity or missing prerequisite requires clarification. Keep changes scoped to this feature and preserve existing behavior.

---

## 13. Final Implementation Report

When finished, provide:

- Summary of implemented functionality.
- Files and components changed.
- Existing services reused.
- How baseline snapshots and stale results are handled.
- How structural analysis and AI reasoning are separated.
- Tests and validation commands actually executed, with results.
- Known limitations and unverified behavior.
- Any recommended follow-up work.

**Definition of success:** A developer can compare two SQL versions inside SQL Visualizer, understand meaningful changes and possible impacts, inspect supporting evidence, and see exactly what has—and has not—been verified before accepting a change.
