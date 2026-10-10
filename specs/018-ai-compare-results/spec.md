# Feature Specification: AI SQL Comparison Results

**Feature Branch**: `018-ai-compare-results`

**Created**: 2026-10-10

**Status**: Draft

**Input**: User description: `docs/ui-prompts/20261009/sql-visualizer-ai-compare-ui-fix.prompt.md`, adapted to use the main SQL Editor's original and current SQL as the sole Before/After source.

## Clarifications

### Session 2026-10-10

- Q: What minimum SQL size must remain fully inspectable without clipping for this feature to pass acceptance? → A: At least 8,000 lines.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inspect a comparison clearly (Priority: P1)

As a developer reviewing an edited query, I want to understand which SQL is Before and which is After, inspect the complete differences, and quickly see the important changes, so I can judge the modification without losing my editor work.

**Why this priority**: Clear and trustworthy comparison is the foundation for every structural or AI explanation.

**Independent Test**: Load a query in the SQL Editor, edit it, compare, and verify that the original and current editor contents are labeled and shown consistently in both compare views, with a concise summary and inspectable full diff.

**Acceptance Scenarios**:

1. **Given** a query is loaded in the main SQL Editor, **When** the developer edits it and compares, **Then** Before is the editor's original SQL and After is the current SQL captured when comparison starts.
2. **Given** a comparison result is displayed, **When** the developer inspects the diff, **Then** Before and After are unmistakably labeled and inserted, deleted, or modified text is distinguishable.
3. **Given** a query contains at least 8,000 lines or has long lines, **When** the developer inspects the diff, **Then** the full SQL remains available through intentional scrolling and is not silently clipped or replaced by an unexplained excerpt.
4. **Given** SQL differs only in formatting, **When** deterministic analysis completes, **Then** formatting differences are identified separately from supported structural changes.
5. **Given** SQL is identical, **When** comparison completes, **Then** the developer sees a clear no-changes state and no unnecessary AI assessment is presented as having run.

### User Story 2 - Understand concise structural findings (Priority: P1)

As a developer, I want structural findings to identify the relevant SQL change with concise evidence and honest parser limitations, so I can distinguish a real supported change from formatting noise or uncertain analysis.

**Why this priority**: Large raw clause dumps and false-positive findings obscure the change and can lead to incorrect conclusions.

**Independent Test**: Compare representative changes to filters, joins, CTEs, and formatting; verify that findings identify supported changes, provide relevant excerpts, and disclose incomplete or unsupported analysis.

**Acceptance Scenarios**:

1. **Given** a supported predicate or join change, **When** results are shown, **Then** the finding identifies the changed area and provides concise Before/After evidence where available.
2. **Given** a finding contains a long SQL excerpt, **When** the result first appears, **Then** the excerpt is summarized and the full relevant evidence remains available on request.
3. **Given** a CTE or other construct cannot be confidently matched, **When** analysis reports the difference, **Then** it explains the limitation and does not present an entire unrelated clause as a confirmed semantic change.
4. **Given** parsing is incomplete or unsupported for the selected dialect, **When** results are shown, **Then** partial coverage is explicit and available supported findings remain visible.

### User Story 3 - Review AI assessment and verification state (Priority: P1)

As a developer, I want a dedicated AI assessment that uses the same compared SQL and deterministic findings, with clear progress, outcome, and retry behavior, so I can see what the AI actually assessed and what still needs verification.

**Why this priority**: An absent or ambiguous AI result leaves the developer unable to tell whether interpretation was requested, completed, or failed.

**Independent Test**: Use mocked valid, malformed, unavailable, delayed, and stale AI responses; verify that each outcome is visible, valid content is rendered, and deterministic findings remain available when AI fails.

**Acceptance Scenarios**:

1. **Given** a comparison has completed and AI has not been requested, **When** the developer reviews the result, **Then** the AI section indicates that assessment has not started and offers the supported action to request it.
2. **Given** an AI request is running, **When** the developer reviews the comparison, **Then** an analyzing state is visible and any streamed explanation is clearly identified as incomplete.
3. **Given** a valid AI response is received, **When** the request completes, **Then** the dedicated AI section displays the validated assessment, relevant implications, evidence, assumptions, and recommended verification steps.
4. **Given** the provider is unavailable or the response is invalid, **When** the request ends, **Then** the AI section states the actual outcome and offers retry when supported, while deterministic findings remain visible.
5. **Given** SQL changes after a comparison or while AI is responding, **When** results are shown, **Then** older results are identified as stale and are not presented as current; an obsolete AI response is not applied to newer SQL.
6. **Given** deterministic analysis is partial but AI returns a valid assessment, **When** results are shown, **Then** both the AI assessment and the parser limitation are visible without implying complete verification.

### Edge Cases

- The original or current editor SQL is empty or contains only comments; comparison reports that a complete pair is unavailable and does not invent findings.
- The user switches SQL source, reloads a query, or resets the editor; the displayed Before/After pair follows the main editor's actual original/current state and does not retain an unrelated comparison source.
- SQL changes while deterministic analysis or AI interpretation is in flight; superseded results are discarded or marked stale.
- A query has at least 8,000 lines, very long lines, or many findings; full SQL remains inspectable without repeating huge raw clauses throughout the result page.
- A provider times out, is not configured, returns malformed structured content, or returns content without SQL-grounded evidence.
- A provider error contains credentials or sensitive SQL text; user-facing errors and application logs do not expose that content.
- A comparison has no structural changes, only formatting changes, or unsupported syntax for the selected dialect.
- An UPDATE, DELETE, MERGE, or other write statement has a changed scope; the change is reported for review and is never executed automatically.
- SQL comments, literals, identifiers, and parameters contain text that resembles instructions or sensitive values.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The comparison MUST use the main SQL Editor's original SQL as Before and its current SQL at comparison start as After; it MUST NOT use a separate, unsynchronized SQL source.
- **FR-002**: The Before version MUST remain stable while the developer edits the current SQL; any explicit replacement or reset of the editor's source MUST be reflected consistently in both comparison views.
- **FR-003**: Each comparison MUST represent one immutable Before/After pair and the selected dialect; later editor changes MUST mark that result stale or prevent it from appearing current.
- **FR-004**: The result MUST identify Before (Original) and After (Modified) unambiguously and provide a complete, readable diff with distinguishable inserted, deleted, and modified text.
- **FR-005**: The diff MUST support inspection of full statements, including long lines and statements of at least 8,000 lines, without unexplained clipping or silent truncation; its layout MUST remain usable on narrow and wide screens.
- **FR-006**: A comparison summary MUST precede detailed findings and distinguish no changes, textual differences, supported structural changes, and analysis limitations.
- **FR-007**: Structural findings MUST be limited to evidence supported by the analysis; they MUST provide concise relevant excerpts and preserve access to longer evidence without repeating entire SQL clauses in the collapsed result.
- **FR-008**: The system MUST distinguish textual differences, structural findings, potential semantic impact, execution-safety concerns, performance hypotheses, and checks actually performed.
- **FR-009**: When parsing is partial, unsupported, invalid, or uncertain, the result MUST state that limitation and MUST NOT imply complete structural analysis.
- **FR-010**: The result MUST include a dedicated AI Assessment section that is visible for every comparison outcome, including not requested, in progress, completed, partial, unavailable, failed, not needed, and stale states as applicable.
- **FR-011**: AI assessment MUST use the exact Before/After pair for the comparison and its available deterministic findings; valid assessment content MUST be visibly rendered and attributable to AI interpretation rather than deterministic fact.
- **FR-012**: The AI section MUST communicate provider or response failure explicitly and provide a retry action when retry is available; AI failure MUST NOT hide or clear deterministic results.
- **FR-013**: AI explanations MUST distinguish evidence from hypotheses and state assumptions, relevant limitations, and targeted verification recommendations when available; they MUST NOT assert semantic equivalence, execution safety, or performance improvement without sufficient evidence.
- **FR-014**: Identical SQL MUST produce a clear no-changes outcome and MUST NOT trigger an unnecessary AI request.
- **FR-015**: A result or AI response for superseded SQL MUST NOT be presented as current; changing the editor during an in-flight request MUST prevent the obsolete response from replacing the current result.
- **FR-016**: The workflow MUST remain analysis-only: it MUST NOT execute SQL, apply an AI rewrite, or replace the user's SQL without a separate explicit user action.
- **FR-017**: All new labels, summaries, findings, and state messages MUST be available in English and Vietnamese and remain accessible to keyboard and assistive-technology users.
- **FR-018**: The comparison MUST avoid rendering large SQL clauses repeatedly in ordinary finding text; the developer MUST retain a way to copy or select the compared SQL and relevant evidence.
- **FR-019**: AI/provider errors and logs MUST NOT expose credentials or sensitive SQL text; user-facing errors MUST communicate the failure without echoing full query contents.

### Key Entities *(include if feature involves data)*

- **Editor Comparison Pair**: The original SQL and current SQL from the main editor, captured together with the active dialect when comparison begins.
- **Comparison Result**: The immutable pair and dialect associated with deterministic findings, limitations, and comparison status.
- **AI Assessment**: The validated interpretation associated with a particular comparison result, with its lifecycle status, evidence, assumptions, limitations, and verification recommendations.
- **Structural Finding**: A supported SQL construct change with category, concise evidence, known uncertainty, and potential impact where justified.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In every comparison acceptance scenario, both displayed SQL versions match the main editor's original/current pair captured when comparison begins.
- **SC-002**: In all supported WHERE, JOIN, projection, CTE, and formatting test cases, the result distinguishes supported structural changes from formatting-only changes and reports parser uncertainty explicitly.
- **SC-003**: All eight AI lifecycle states defined by the feature are distinguishable in the result UI, and a valid mocked response becomes visible after request completion.
- **SC-004**: In provider-unavailable, malformed-response, partial-analysis, and stale-response scenarios, deterministic findings remain available and no unsupported AI result is shown as current.
- **SC-005**: An 8,000-line comparison remains fully inspectable, while collapsed findings do not repeat entire long SQL clauses.
- **SC-006**: All new user-facing comparison content and states render in both English and Vietnamese.
- **SC-007**: No acceptance scenario executes SQL or modifies the main editor contents as a side effect of comparing or requesting an AI assessment.
- **SC-008**: In provider error scenarios, no credential or sensitive SQL content is exposed in user-facing errors or application logs.

## Assumptions

- The main SQL Editor's original SQL is the intended Before version; the current contents at comparison start are the intended After version. A separate baseline-capture action is not part of this workflow.
- Existing deterministic SQL analysis and configured AI-provider workflows remain the sources of structural facts and AI interpretation; the feature does not require a live database or schema catalog.
- SQL analysis and AI explanations are advisory; developers remain responsible for validating SQL against their database and requirements.
- Existing selected SQL dialect is authoritative for a comparison; comparison does not change it automatically.
- AI may be requested separately from deterministic comparison; when it has not been requested, the result must say so rather than implying it ran.

## Out of Scope

- Executing either SQL statement or comparing live database result sets or execution plans.
- Proving semantic equivalence for all schemas, data, constraints, or database configurations.
- Automatically accepting, applying, saving, or rewriting SQL based on an AI response.
- Replacing general SQL analysis or adding a separate parser or AI service.