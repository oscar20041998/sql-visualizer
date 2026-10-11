# Feature Specification: SQL Before/After Comparison

**Feature Branch**: `017-sql-before-after-comparison`

**Created**: 2026-10-09

**Status**: Draft

**Input**: User description: "Add an AI-assisted Before/After SQL comparison to the existing SQL Editor so developers can inspect query changes, understand possible behavior and execution risks, review supporting evidence, and see what remains unverified before accepting a change."

## Clarifications

### Session 2026-10-09

- Q: How long should a captured Before query remain available without being recaptured? → A: Keep it for the current browser tab session, including reloads and in-app navigation; clear it when the tab closes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compare an edited query with an explicit baseline (Priority: P1)

As a developer changing a SQL statement, I want to capture the current query as Before and compare it with my edited query as After, so I can review what changed without losing my editor work.

**Why this priority**: A reliable, explicit comparison lifecycle is the foundation of the feature. Without a stable baseline and a captured After version, all explanations and findings could describe the wrong inputs.

**Independent Test**: Capture a baseline, make edits, start a comparison, and confirm the displayed versions match the captured baseline and the editor contents at comparison start. Open a new browser tab to capture a different baseline.

**Acceptance Scenarios**:

1. **Given** no baseline has been captured, **When** the developer opens comparison, **Then** the experience explains that a baseline must be captured before comparison.
2. **Given** a baseline has been captured, **When** the developer edits the SQL and starts comparison, **Then** the baseline remains unchanged and the current editor contents are used as After.
3. **Given** a comparison is running, **When** the developer changes the editor SQL, **Then** the resulting comparison is marked stale or withheld from presentation as current.
4. **Given** a baseline has been captured, **When** a later comparison starts in the same tab, **Then** the original captured SQL remains Before.
5. **Given** the developer closes comparison, **When** they return to the editor, **Then** their current SQL edits remain intact.
6. **Given** a baseline has been captured, **When** the developer reloads the page or navigates within the application in the same browser tab, **Then** the baseline remains available and unchanged.
7. **Given** the browser tab has been closed, **When** the developer starts a new tab, **Then** they must capture a new baseline before comparing.

### User Story 2 - Understand structural changes and evidence (Priority: P1)

As a developer reviewing a query change, I want to see the Before/After SQL differences and structural changes with their evidence, so I can focus on changes to projections, sources, joins, filters, grouping, ordering, pagination, and data-modification statements.

**Why this priority**: The central value is making meaningful SQL changes reviewable, not merely producing a textual summary.

**Independent Test**: Compare queries with representative changes to filters, joins, projections, and pagination; verify that only supported changes are reported and that each finding points to relevant SQL evidence when available.

**Acceptance Scenarios**:

1. **Given** the Before and After statements differ, **When** comparison completes, **Then** the developer can inspect both SQL versions and distinguish inserted, removed, and modified text.
2. **Given** a supported structural change is detected, **When** results are shown, **Then** the change summary identifies the affected SQL area and includes supporting evidence where available.
3. **Given** only formatting changes, **When** results are shown, **Then** formatting differences are distinguishable from detected structural changes, and no unsupported behavior claim is made.
4. **Given** identical Before and After SQL, **When** comparison starts, **Then** the developer sees a clear no-changes result and no speculative findings are presented.
5. **Given** a comparison completes, **When** results are ready, **Then** they are displayed in an openable and collapsible side panel; closing and reopening the panel preserves the result without rerunning analysis while its inputs remain current.

### User Story 3 - Review potential risks and verification needs (Priority: P1)

As a developer deciding whether to accept a SQL change, I want deterministic findings and AI explanations clearly distinguished, with uncertainty and recommended checks stated, so I can judge what is known and what still needs verification.

**Why this priority**: The feature must support safer human review without presenting hypotheses as proof or implying that analysis has executed the SQL.

**Independent Test**: Compare a query with a removed filter using mocked analysis and AI responses; verify the filter change is evidence-backed, AI implications are labeled as interpretations, verification recommendations are visible, and equivalence remains inconclusive absent sufficient evidence.

**Acceptance Scenarios**:

1. **Given** analysis detects a changed filter, join, aggregation, ordering, pagination, or write scope, **When** findings are shown, **Then** the developer sees the applicable evidence, potential impact, severity, and a recommended review action where supported.
2. **Given** AI explanation is available, **When** the developer reviews it, **Then** it answers what changed, why it may matter, possible affected behavior, evidence, assumptions, and next verification steps without inventing schema or execution facts.
3. **Given** the AI provider is unavailable or returns unusable content, **When** the comparison results are shown, **Then** deterministic findings remain available and the AI limitation is stated.
4. **Given** no sufficient evidence establishes equivalence, safety, or performance, **When** the results are shown, **Then** the respective statuses remain inconclusive, not verified, or not assessed rather than asserting a positive conclusion.
5. **Given** parsing is incomplete, invalid, or unsupported for some SQL, **When** the comparison completes, **Then** available findings are retained and the limitation is explained.

### Edge Cases

- Empty or comment-only Before or After SQL is handled with a clear status and no fabricated findings.
- A captured baseline remains available through reloads and in-app navigation in its browser tab, but a new tab requires a new capture.
- Invalid, incomplete, or dialect-unsupported SQL yields partial results or a clear limitation instead of a false structural conclusion.
- SQL text that changes during an in-flight comparison cannot be represented as a current result for newer editor contents.
- A very large SQL statement remains reviewable; any omitted analysis context is disclosed and does not support claims of completeness.
- A changed statement introduces or broadens UPDATE, DELETE, MERGE, or other supported write scope; the feature reports the detected change but never executes it.
- SQL comments, identifiers, literals, or other query content that resemble instructions are treated as input data, not instructions to the assistant.
- AI or analysis failure does not clear the captured baseline or the user's editor contents.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The comparison experience MUST be accessible from the existing SQL Editor without replacing or disrupting its current editing and analysis workflows.
- **FR-002**: The developer MUST explicitly capture a Before snapshot; the system MUST NOT silently create or replace the baseline.
- **FR-003**: A captured baseline MUST remain unchanged for the current browser tab session, including page reloads and in-app navigation, until the tab is closed.
- **FR-004**: The system MUST capture After from the current editor contents when comparison begins.
- **FR-005**: If editor contents change while a comparison is running or after its inputs are captured, the system MUST mark the result stale or prevent it from being presented as a result for the current SQL.
- **FR-006**: The comparison MUST provide a view of Before and After SQL and distinguish inserted, deleted, and modified text.
- **FR-007**: The system MUST report structural changes only when supported by its analysis, including applicable changes to projections, sources, joins and predicates, filters, grouping, ordering, distinctness, set operations, CTEs, subqueries, aggregations, window expressions, pagination, and supported data-modification statements.
- **FR-008**: The system MUST distinguish formatting-only differences from detected structural changes when it can do so reliably.
- **FR-009**: Each reported structural finding MUST include relevant evidence where available and MUST NOT invent counts, references, clauses, or impacts.
- **FR-010**: The system MUST distinguish deterministic structural findings from AI-generated explanations or hypotheses.
- **FR-011**: AI explanations MUST address plausible implications, affected behavior, supporting evidence, assumptions or limitations, and targeted verification recommendations when applicable.
- **FR-012**: The system MUST treat SQL and associated query content as untrusted input and MUST NOT allow embedded instructions to override the system's analysis behavior.
- **FR-013**: AI provider failure, timeout, or unusable output MUST NOT discard available deterministic comparison results; the limitation MUST be communicated to the developer.
- **FR-014**: The system MUST represent semantic equivalence, execution safety, performance assessment, and verification status as separate conclusions.
- **FR-015**: The system MUST NOT claim equivalence, safety, or performance improvement unless available evidence justifies that specific conclusion; otherwise it MUST use an inconclusive, not verified, or not assessed status.
- **FR-016**: When SQL is identical, the system MUST show a clear no-changes result and MUST NOT request unnecessary AI explanation.
- **FR-017**: Invalid, incomplete, unsupported, or partially analyzable SQL MUST produce an honest partial result or limitation and MUST NOT be presented as a complete structural assessment.
- **FR-018**: The comparison experience MUST remain analysis-only: it MUST NOT execute SQL, apply AI-generated edits, save or replace the user's SQL, or change the selected dialect automatically.
- **FR-019**: The experience MUST provide a clear path back to the editor without losing current edits and MUST communicate whether compared SQL reflects the current editor contents when applicable.
- **FR-020**: All new user-facing content MUST be available in English and Vietnamese.
- **FR-021**: Loading, no-baseline, no-changes, partial, stale, AI-unavailable, and error states MUST be communicated clearly and accessibly; severity MUST NOT be conveyed by color alone.
- **FR-022**: The system MUST avoid unnecessarily including credentials, sensitive parameters, or unrelated database content in AI analysis requests and logs.
- **FR-023**: Comparison results MUST appear in a toggleable side panel consistent with the existing SQL Editor error and AI Explainer panels; the panel MUST open when results are ready and preserve results when closed and reopened, unless the comparison becomes stale.

### Key Entities *(include if feature involves data)*

- **Baseline Snapshot**: The SQL version explicitly captured by the developer as the Before input; it remains fixed for the current browser tab session and is cleared when the tab closes.
- **Comparison Snapshot**: The immutable pair of Before and After SQL used for one comparison, together with the active SQL dialect and the analysis state.
- **Structural Change**: A detected difference in a supported SQL construct, accompanied by source evidence and any known analysis limitation.
- **Finding**: A deterministic rule result or AI interpretation describing a possible impact, with category, severity, evidence, recommended action, and verification state when available.
- **Comparison Assessment**: Separate statements of equivalence, execution safety, performance, and which verification activities were or were not performed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In all baseline lifecycle acceptance scenarios, Before remains the explicitly captured SQL and After matches the editor contents captured when comparison starts.
- **SC-002**: In all stale-input acceptance scenarios, results for superseded SQL are either withheld or visibly marked stale before users can mistake them for current results.
- **SC-003**: For each supported structural change exercised by the acceptance suite, the comparison reports the affected construct and evidence when available, without adding unsupported findings.
- **SC-004**: In all insufficient-evidence acceptance scenarios, equivalence, safety, performance, and verification statuses communicate uncertainty without an unsupported positive claim.
- **SC-005**: In all AI-failure acceptance scenarios, available deterministic results remain reviewable and the AI limitation is apparent.
- **SC-006**: All comparison workflow states and user-facing findings are available in both English and Vietnamese.
- **SC-007**: No comparison workflow acceptance scenario executes SQL or changes, saves, or overwrites the user's SQL without an explicit later user action.

## Assumptions

- The feature is for developers using the existing SQL Visualizer SQL Editor and its currently selected SQL dialect.
- The current parser and analysis capabilities vary by dialect and SQL construct; unsupported or incomplete analysis is reported instead of being approximated as certainty.
- AI explanations are advisory and may identify hypotheses, but deterministic evidence remains distinguishable from model interpretation.
- No schema catalog or live database execution is assumed to be available for comparison.
- The developer remains responsible for reviewing and accepting SQL changes; this feature does not establish correctness for every possible database state.
- Existing editor behavior and query contents remain under the developer's control throughout comparison.

## Out of Scope

- Automatically executing either SQL version or comparing results against a database.
- Automatically applying, saving, or accepting AI-generated SQL changes.
- Proving equivalence for all possible schemas, data, constraints, or database configurations.
- Replacing the application's general SQL analysis capabilities as part of this comparison feature.
