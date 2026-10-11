# Prompt: Redesign and Fix AI Before/After SQL Comparison Results

## Objective

Improve the existing **Before / After SQL Compare** experience inside SQL Visualizer. The current screen is difficult to read, the structural comparison appears incorrect or too noisy, and the AI assessment after a SQL change is missing or not clearly rendered.

Treat this as a **product-quality UI and analysis-flow correction**, not merely a styling task. Inspect the actual implementation, identify the causes, and fix the end-to-end workflow while preserving existing functionality.

## Current Problems Observed

Use the supplied screenshot as evidence of the current UI problems:

1. The comparison screen shows a large SQL snippet with two adjacent line-number columns, but it is unclear which SQL is Before and which is After.
2. The SQL editor/diff region is cramped, clips content horizontally, and is too short for inspecting large queries.
3. The page jumps from a partial-analysis message and code snippet to a “Structural Changes” section, making it difficult to understand the comparison.
4. A structural finding such as `WITH clause changed` displays a very long raw SQL fragment. This overwhelms the screen and does not explain the actual change.
5. The structural findings do not clearly distinguish actual changes from parser limitations or false positives.
6. The screenshot says that analysis is static and SQL has not been executed, but no clear AI assessment is visible. The user cannot tell whether AI analysis ran, failed, was skipped, or was never connected to the UI.
7. The result does not provide a clear overall summary, evidence-based risk assessment, or next action.

Do not assume the root cause based on the screenshot alone. Inspect the code and trace the real data flow.

---

## 1. Mandatory Repository Investigation

Before changing code, inspect:

- The current SQL Editor page and comparison UI components.
- Baseline/Before snapshot state and current/After SQL state.
- The diff generation logic and line-number mapping.
- Existing SQL parser, AST comparison, structural analysis, and static-analysis services.
- The AI service/provider integration, prompt construction, request lifecycle, and response schema.
- API endpoints and frontend response mapping.
- Existing loading, error, empty, partial-result, and retry patterns.
- Design system, component library, responsive layout, and i18n conventions.
- Existing tests and fixtures.

Trace the complete flow:

`User action → Before/After capture → deterministic diff → structural findings → AI request → response validation → UI state → rendered AI assessment`

Identify exactly where the AI assessment is lost or hidden. Possible causes to investigate include an AI request that is never called, incorrect payload construction, provider errors swallowed by the UI, response-schema mismatches, invalid JSON, state updates not occurring, conditional rendering errors, or a response that contains only deterministic results. Do not guess; verify.

Before implementation, provide a brief diagnosis and a focused implementation plan. Then implement the fixes rather than stopping at the plan.

Reuse existing components and services. Do not add a second parser or a duplicate AI service.

---

## 2. Redesign the Information Hierarchy

Reorganize the result page around the developer's key questions:

1. What changed?
2. What could the change affect?
3. What did deterministic analysis detect?
4. What did AI assess?
5. What has actually been verified?
6. What should I do next?

Use this recommended information architecture, adapted to the existing design system.

### A. Comparison Header

At the top, show:

- `SQL Compare` or the existing localized page title.
- A clear Before/After state.
- Current comparison status: `Ready`, `Analyzing`, `Completed`, `Partial`, `Failed`, or `Stale`.
- The selected SQL dialect when available.
- A concise action area containing `Compare Changes` and an explicit `Capture New Baseline` or equivalent action.

Do not silently replace the baseline. Make it obvious which version is the original and which is the modified query.

### B. Summary of Changes

After a successful comparison, show a compact summary before the detailed SQL diff:

- Number of additions, deletions, and modifications only when those counts are actually available.
- Meaningful structural changes detected by the parser.
- A short plain-language summary.
- A clear no-changes state if the SQL is identical.

Avoid large decorative metric cards. Use compact, readable labels and prioritize meaningful information over raw counts.

### C. SQL Diff Viewer

Make the diff viewer the primary inspection area.

Requirements:

- Clearly label the panes **Before (Original)** and **After (Modified)**.
- Prefer a side-by-side diff on wide screens and a stacked or tabbed view on narrow screens.
- If the existing editor supports a reliable diff mode, reuse it.
- Show inserted, deleted, and modified lines with accessible visual indicators.
- Keep line numbers aligned and unambiguous. Never show two unlabeled line-number columns.
- Preserve syntax highlighting when supported.
- Support horizontal and vertical scrolling without clipping SQL.
- Give the viewer a useful responsive height based on the available viewport. Avoid a fixed small height that makes long queries painful to inspect.
- Keep the editor responsive for very large SQL statements.
- Add a unified diff option if it fits the existing component architecture.
- When a finding references a SQL line or AST node, allow the user to navigate to the relevant fragment when feasible.

Do not render only a truncated arbitrary section of SQL without explaining that it is a preview. The developer must be able to inspect the full diff.

### D. Structural Changes

Display concise, actionable findings instead of dumping entire SQL clauses into the page.

Each finding should show:

- Change title, such as `WHERE predicate removed` or `JOIN type changed`.
- Change category.
- Severity where justified by a defined rule.
- A short explanation.
- Before/After excerpts limited to the relevant fragment.
- The reason the change may matter.
- Evidence location or line references when available.
- A link/action to inspect the corresponding SQL fragment where feasible.

Provide expandable details for longer SQL excerpts. Truncate long excerpts in the collapsed state and preserve access to the full content in the expanded state.

Do not label an entire `WITH` clause as changed merely because formatting, whitespace, alias order, or unrelated CTE content differs. Compare CTEs and other AST nodes individually when supported. If the parser cannot confidently match structures, say so and fall back to a clearly labeled text diff.

Separate these concepts:

- Textual difference.
- Structural difference.
- Potential semantic impact.
- Confirmed behavior change.

They are not interchangeable.

---

## 3. Make AI Assessment a First-Class Result

The current UI does not clearly display an AI assessment. Fix the complete request-to-render pipeline.

### Required AI result section

Add a visible section titled **AI Assessment** or the localized equivalent. Its position should be easy to find after the summary and before or alongside detailed findings.

The section should render the actual validated AI response, including where available:

- **Overall assessment:** A concise, evidence-aware summary.
- **Potential correctness impact:** Possible changes to result rows, filters, joins, aggregation, NULL handling, ordering, or pagination.
- **Execution-safety concerns:** Relevant concerns such as a widened UPDATE/DELETE scope or an introduced write operation.
- **Potential performance impact:** Hypotheses only unless execution-plan or benchmark evidence exists.
- **Recommended verification:** Specific tests, edge cases, or checks.
- **Limitations:** Missing schema, parser limitations, unsupported constructs, lack of execution evidence, or other uncertainties.

Only show categories that are relevant or explicitly report that they were not assessed. Do not fill the section with generic prose.

### AI state handling

The UI must distinguish these states:

1. `Not started`: The user has not requested comparison.
2. `Analyzing`: The AI request is in progress.
3. `Completed`: A valid AI assessment was received.
4. `Partial`: Deterministic analysis or AI analysis succeeded only partially.
5. `Unavailable`: The provider is not configured or unavailable.
6. `Failed`: The request failed or the response could not be validated.
7. `Not needed`: The SQL is unchanged and no AI call is necessary.
8. `Stale`: The editor content changed after the analyzed snapshot was captured.

Never silently omit the AI section when the request fails. Show a concise, useful status and a retry action when retry is supported.

If deterministic comparison succeeds but AI fails, keep the deterministic results visible and mark the AI section as unavailable or failed.

If AI succeeds but structural analysis is partial, show the AI result with explicit parser limitations. Do not imply that the analysis is complete.

### Diagnose response-contract mismatches

Verify that:

- The backend actually calls the configured AI provider.
- The prompt includes the correct Before and After SQL and the deterministic diff.
- The provider response is parsed and validated.
- The backend response schema matches the frontend's expected schema.
- The UI state receives and stores the validated assessment.
- Conditional rendering checks the actual response shape.
- Errors are logged safely and exposed as actionable UI states without revealing secrets or sensitive SQL.

Do not invent a successful AI assessment in the UI or use hardcoded demo results in production.

---

## 4. Make the Analysis Accurate and Explainable

Use deterministic parsing and static analysis as the source of truth for structural facts. Use AI to explain those facts, reason about plausible implications, and suggest verification.

The AI must not claim semantic equivalence simply because the SQL looks similar. It must not claim a query is safe because no known issue was detected.

Represent these dimensions separately:

- **Structural diff:** What changed in the text or parsed structure?
- **Semantic assessment:** Could the change affect query behavior?
- **Execution safety:** Were potential execution risks detected?
- **Performance assessment:** Is there evidence for a performance conclusion?
- **Verification status:** Which checks actually ran?

Use explicit statuses, for example:

- Equivalence: `Equivalent`, `Not equivalent`, `Inconclusive`, `Not assessed`.
- Verification: `Verified by test`, `Static analysis only`, `Not verified`, `Partial`.
- Performance: `Evidence available`, `Potential impact`, `Not assessed`.

These are examples; adapt to existing conventions and avoid claiming verification that did not occur.

Do not label a query `Safe` as a blanket guarantee. Prefer a summary such as `No known issues detected by the checks performed`, with the checks and limitations listed.

Do not execute SQL automatically. Do not automatically apply AI rewrites, save SQL, or overwrite the baseline.

---

## 5. Improve Long-SQL Readability

The feature must work for SQL statements containing thousands of lines.

- Avoid rendering full SQL fragments repeatedly in every finding.
- Use concise excerpts and expandable details.
- Use a diff viewer or virtualized rendering if the current editor technology supports it.
- Avoid rendering an entire 7,000–8,000-line SQL string multiple times in ordinary DOM text blocks.
- Keep the diff and findings in separate scroll regions only if the interaction remains clear.
- Do not let long evidence blocks push the AI assessment far down the page.
- Consider collapsible sections for detailed findings, parser diagnostics, and raw model output.
- Keep the summary and AI assessment easy to reach.
- Preserve copy/select behavior for SQL snippets.
- Make overflow and scroll behavior intentional rather than relying on accidental clipping.

Do not add virtualization or a new editor dependency without checking whether the current stack already supports an appropriate solution.

---

## 6. Visual Design Requirements

Follow the existing SQL Visualizer design system. Aim for an enterprise developer-tool interface that is dense but readable.

- Establish a clear typographic hierarchy.
- Use consistent spacing and section headings.
- Use severity colors sparingly and consistently.
- Avoid giant raw text blocks, excessive borders, and redundant cards.
- Keep Before/After labels visible while scrolling where appropriate.
- Ensure contrast and keyboard accessibility.
- Support Vietnamese and English through the existing i18n system.
- Avoid hardcoded user-facing strings.
- Provide clear loading skeletons or progress indicators consistent with the existing application.

Do not redesign unrelated areas of SQL Visualizer.

---

## 7. Testing Requirements — TDD

Write failing tests first, then implement using `RED → GREEN → REFACTOR`, unless the repository already defines a different TDD workflow.

### Unit tests

- Before snapshot remains unchanged until explicitly refreshed.
- Identical SQL skips unnecessary AI analysis.
- Structural comparison reports relevant clause changes accurately.
- Formatting-only changes are not incorrectly reported as major semantic changes.
- Long evidence excerpts are summarized and can be expanded.
- Valid AI response is rendered.
- Malformed or unexpected AI response produces an error state.
- AI provider unavailable preserves deterministic results.
- Partial parser results are represented honestly.
- Stale responses are not shown as current.
- Missing baseline, empty SQL, and invalid SQL are handled.
- No fake AI result is shown when no AI response exists.

### Integration/component tests

- Before and After labels are unambiguous.
- Diff panes and line numbers are rendered correctly.
- The AI assessment appears after a successful response.
- Loading, success, partial, unavailable, failed, unchanged, and stale states render correctly.
- Retry invokes the real existing request path.
- Long SQL and long findings remain usable.
- Vietnamese and English translations work.
- Existing SQL Editor behavior remains intact.

Use mocked AI responses in automated tests. Do not require a live AI service or production database for normal unit tests.

### Manual verification

Use at least these scenarios:

1. A small query with one WHERE predicate removed.
2. A query with an INNER JOIN changed to LEFT JOIN.
3. A query with only formatting changes.
4. A query with multiple CTEs.
5. A very large SQL query.
6. An AI provider timeout or invalid response.
7. SQL edited again while a comparison is in progress.

---

## 8. Acceptance Criteria

The feature is considered fixed only when:

1. The Before and After SQL versions are unmistakably labeled.
2. The diff viewer is readable, responsive, and does not clip SQL unintentionally.
3. Structural findings are concise and show relevant evidence rather than dumping huge SQL blocks.
4. Structural analysis distinguishes actual changes from parser limitations and formatting differences where feasible.
5. A valid AI response is visibly rendered in a dedicated AI Assessment section.
6. AI failure, missing configuration, malformed responses, and partial analysis are shown explicitly.
7. Deterministic findings remain visible when AI fails.
8. No fake or hardcoded AI assessment is displayed in production.
9. Verification and performance claims reflect only checks that actually ran.
10. The workflow remains analysis-only and never executes or overwrites SQL automatically.
11. Vietnamese and English are supported.
12. Relevant tests, lint, type checks, and build commands pass, or existing failures are documented accurately.

---

## 9. Implementation Deliverables

After implementation, report:

- Root causes identified from the existing code.
- UI and interaction changes made.
- Why the structural comparison was inaccurate or confusing and how it was corrected.
- Why the AI assessment was not displayed and how the data flow was fixed.
- Files and components changed.
- Tests added and commands actually run.
- Actual test/build results.
- Remaining limitations, especially any inability to prove semantic equivalence without schema or execution evidence.

Do not stop after proposing a design. Inspect the implementation, fix the underlying issues, and verify the complete flow end to end.
