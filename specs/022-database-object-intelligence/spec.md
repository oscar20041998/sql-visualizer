# Feature Specification: Database Object Intelligence

**Feature Branch**: `develop` (existing branch; no feature branch created)

**Created**: 2026-11-22

**Status**: Draft

**Input**: “Dùng hallmark để design tính năng này”, based on the [Database SQL Intelligence master prompt](../../docs/ui-prompts/20260920/sql-visualizer-database-intelligence-master.prompt.md). The user confirmed the full scope, only filling missing capabilities, preserving existing features without conflicts, and keeping the existing design system.

## Clarifications

### Session 2026-11-22

- Q: How can users supply multiple database object definitions for dependency and impact analysis? → A: Paste multiple definitions or import multiple files in one analysis session.
- Q: How long should objects in an analysis session remain available? → A: Keep them while navigating in the current application session; clear them when the application is closed or reloaded.
- Q: How should duplicate definitions for the same object and dialect be handled? → A: Notify the user and let them keep the existing definition or replace it with the new one.
- Q: When can the feature be released or the overall initiative considered complete if some object or dialect capabilities are incomplete? → A: Release incrementally with explicit limitations; complete the overall initiative only when target capabilities are validated or exclusions are approved by the user.
- Q: What confirmation is required before new AI actions send SQL to an external provider? → A: Show the provider and request cancellable confirmation before the first external send in each analysis session; preserve existing AI workflows.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Analyze a database object (Priority: P1)

A SQL developer chooses a database dialect, pastes or imports a database object, and receives an honest analysis of its type and supported structure in the existing workspace.

**Why this priority**: Object analysis is the foundation for understanding new object types without disrupting the existing query workflow.

**Independent Test**: Analyze representative supported and unsupported inputs for each dialect and verify that the displayed type, status, source, and available analysis match the evidence.

**Acceptance Scenarios**:

1. **Given** a supported view definition, **When** the user analyzes it, **Then** the workspace identifies the view, its dialect and available metadata, analyzes its query, and displays the actual analysis status.
2. **Given** a procedure, function, or trigger with partially supported constructs, **When** it is analyzed, **Then** supported details and extracted statements are shown alongside an explanation of what could not be analyzed.
3. **Given** ambiguous or unsupported input, **When** the user requests analysis, **Then** the application explains the limitation and does not present guessed object details as facts.
4. **Given** an ordinary SQL query, CTE, or MyBatis input already supported today, **When** the user follows the existing workflow, **Then** its existing behavior and results remain available.

### User Story 2 - Explore source, structure and findings (Priority: P1)

A developer inspects the object's source and available structure, selects an extracted statement, and navigates from a finding to supporting evidence when a location is known.

**Why this priority**: A developer must be able to verify analysis and understand exactly where a finding comes from.

**Independent Test**: Analyze a multi-statement object, inspect its source and statements, and follow a finding with a known source location.

**Acceptance Scenarios**:

1. **Given** a procedural object with extractable SQL, **When** the user selects an extracted statement, **Then** its source, available dependencies, findings and complexity are shown.
2. **Given** a finding with a source location, **When** the user opens it, **Then** the relevant source location or associated graph element is revealed.
3. **Given** an unsupported structure or unavailable location, **When** the user inspects the result, **Then** the limitation is visible and no fabricated detail is shown.

### User Story 3 - Explore dependencies and impact (Priority: P1)

A developer explores direct and indirect dependencies and sees which known objects could be affected by changing a selected object.

**Why this priority**: Understanding dependencies and potential impact is central to the requested intelligence experience.

**Independent Test**: Analyze a set of supplied object definitions with a multi-level dependency and a cycle; compare the graph, list and impact results with the known relationships.

**Acceptance Scenarios**:

1. **Given** known object references, **When** the user switches between graph and list, **Then** both views show the same relationships, direction, operation and available confidence.
2. **Given** a chain of known definitions, **When** the user requests impact for an object, **Then** direct and transitive dependents and their depth are distinguished as static relationships.
3. **Given** a dependency cycle or an unavailable definition, **When** dependencies are explored, **Then** the cycle or incomplete coverage is reported without infinite traversal or invented relationships.
4. **Given** multiple definitions pasted together or supplied in multiple files, **When** they are added to one analysis session, **Then** the user can explore relationships among those definitions.
5. **Given** definitions in an analysis session, **When** the user navigates to another page and returns, **Then** the definitions remain available; reloading or closing the application clears the session.
6. **Given** a definition that duplicates an object already in the session, **When** it is added, **Then** the user chooses whether to keep the existing definition or replace it before that object is analyzed.

### User Story 4 - Review evidence-based complexity and findings (Priority: P2)

A developer reviews structural metrics and prioritized findings, with evidence and limitations, rather than unsupported performance claims.

**Why this priority**: Trustworthy findings help prioritize investigation without overstating runtime behavior.

**Independent Test**: Analyze a fixture with known statements, joins and a detectable issue and verify the counts, severity, evidence and source links.

**Acceptance Scenarios**:

1. **Given** a supported construct, **When** metrics and findings are displayed, **Then** each reported value is grounded in available analysis and findings distinguish facts, observations and recommendations.
2. **Given** missing structural evidence, **When** the result is displayed, **Then** unavailable metrics are identified as unavailable rather than replaced by invented values.

### User Story 5 - Request optional AI assistance safely (Priority: P2)

A developer explicitly requests an explanation, finding explanation, optimization, refactoring, dependency explanation, risk analysis or summary, and reviews any suggestion before applying it.

**Why this priority**: AI is useful when it augments evidence without replacing analysis or changing source without consent.

**Independent Test**: Request an explanation and a rewrite for a supported input, compare the proposed source with the original, and simulate unavailable AI.

**Acceptance Scenarios**:

1. **Given** completed deterministic analysis, **When** the user requests AI assistance, **Then** the response is identified as AI-generated and grounded in available object context and limitations.
2. **Given** a suggested rewrite, **When** it is displayed, **Then** original and suggested versions can be compared and the original remains unchanged until the user explicitly applies it.
3. **Given** an AI failure, **When** assistance cannot complete, **Then** existing deterministic results remain available and the user receives a meaningful recovery message.
4. **Given** a new AI action targeting an external provider, **When** SQL would first be sent in an analysis session, **Then** the user sees the provider and can confirm or cancel before transmission.

### User Story 6 - Use a cohesive and accessible workspace (Priority: P2)

A developer uses the expanded product in Vietnamese or English, across screen sizes, with a consistent premium workbench appearance and accessible controls.

**Why this priority**: New functionality must feel integrated and remain usable without consuming unnecessary workspace.

**Independent Test**: Complete an object-analysis journey in both languages using keyboard and pointer on desktop and a narrow viewport.

**Acceptance Scenarios**:

1. **Given** a selected object and dialect, **When** the workspace is displayed, **Then** object identity, dialect and analysis status are visible alongside relevant sections without hiding existing workflows.
2. **Given** a narrow viewport or keyboard navigation, **When** the user explores source, findings and dependencies, **Then** content and controls remain reachable, visible and usable.
3. **Given** a language, theme or accent choice, **When** the user moves through the new experience, **Then** it follows existing preferences and provides equivalent Vietnamese and English labels.

### User Story 7 - Preserve the existing product (Priority: P1)

An existing user continues using their current SQL analysis, visualization, AI, history and settings while new object analysis is introduced incrementally.

**Why this priority**: The user explicitly requires no loss or conflict with existing features.

**Independent Test**: Run existing user journeys and regression checks before and after each delivery stage, including query input, MyBatis, analysis results, navigation, history and settings.

**Acceptance Scenarios**:

1. **Given** an existing supported workflow, **When** the new feature is introduced, **Then** existing inputs, results, routes, preferences and controls continue to work as before.
2. **Given** a capability already present, **When** the feature is planned and delivered, **Then** it is reused or extended rather than duplicated, with any necessary compatibility change documented and verified.

### Edge Cases

- Empty, malformed, ambiguous, multiple-object, very large or dialect-mismatched input must yield actionable feedback without silently misclassifying it.
- Dynamic SQL, unresolved names, incomplete definitions and unsupported procedural syntax must be identified as incomplete analysis; uncertainty must propagate to dependencies, findings and impact.
- Definitions may be missing, duplicated, cyclic or refer to objects outside the supplied set; distinguish unresolved references from known objects and do not infer missing dependents.
- Failed or unavailable AI, a missing model, timeout, malformed response or excessive context must not erase deterministic results or silently apply a suggestion.
- Source text and imported files are untrusted; embedded instructions must not control AI behavior or expose secrets.
- Long SQL, large graphs, long translations and small screens must not make content or controls inaccessible; loading, empty, partial and error states must be understandable.
- Existing access restrictions and privacy choices continue to apply, including guest restrictions and explicitly enabled external AI providers.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Before implementation, the team MUST inventory existing capabilities and regression baselines, and maintain an evidence-backed object-type-by-dialect matrix marked supported, partial or unsupported; database availability alone MUST NOT be treated as implementation support.
- **FR-002**: The product MUST preserve existing query, CTE, MyBatis, dialect selection, analysis, visualization, findings, history, settings, access rules, routes and AI workflows; any necessary compatibility change MUST be documented and regression-tested.
- **FR-003**: The product MUST add or extend only missing capabilities from the master prompt and use existing equivalent capabilities wherever they already meet the need.
- **FR-004**: Users MUST be able to select MySQL, PostgreSQL, SQL Server or Oracle using the existing dialect choice, and choose or detect a query, CTE, view, procedure, function or trigger; MyBatis input MUST remain available.
- **FR-005**: The product MUST communicate detected object type and confidence, active dialect and full, partial or unsupported analysis status; ambiguous or unsupported cases MUST explain limitations without claiming complete support.
- **FR-006**: Within verified dialect support, view analysis MUST expose available name, schema, columns, source, query structure, dependencies and applicable findings.
- **FR-007**: Within verified dialect support, procedure and function analysis MUST expose available identity, parameters, return information, statements, control flow, dependencies and evidence-based complexity; unknown or unsupported constructs MUST be identified.
- **FR-008**: Within verified dialect support, trigger analysis MUST expose available identity, target, timing, event, enabled state, body, dependencies and supported side-effect or risk indicators without asserting unverified runtime behavior.
- **FR-009**: Extractable statements in procedural objects MUST be individually selectable and analyzed using existing query-analysis capabilities, with source locations where available.
- **FR-010**: The shared workspace MUST expose object identity, dialect, analysis status, overview, source, structure, dependencies, findings, complexity and optional AI insights as applicable; unavailable sections MUST say why.
- **FR-011**: Source exploration MUST provide line numbers, search, copy, expand/collapse, and formatting where supported, and distinguish object source from extracted statements when applicable.
- **FR-012**: The product MUST classify evidenced dependencies as read, write, call or reference when known, and identify object type, direction and confidence where available; unknowns MUST remain explicit.
- **FR-013**: Users MUST be able to inspect dependencies as an interactive graph and a searchable list representing the same known relationships, with source navigation where evidence permits.
- **FR-014**: For supplied and known object definitions, users MUST be able to inspect direct and transitive dependencies and static impact, including relationship direction and depth; cycles and incomplete coverage MUST be visible.
- **FR-015**: Complexity metrics MUST derive from available analysis evidence; unsupported counts MUST be unavailable rather than invented, and runtime performance MUST NOT be asserted without runtime evidence.
- **FR-016**: Findings MUST communicate severity, description, evidence, recommendation and confidence where available, distinguish deterministic facts from static observations and AI suggestions, and navigate to source or graph location when known.
- **FR-017**: Users MUST be able to explicitly request AI explanation, finding explanation, optimization, refactoring, dependency explanation, risk analysis and summary, subject to existing access controls and configuration.
- **FR-018**: AI assistance MUST use relevant analysis context, identify itself as AI-generated, disclose limitations, avoid unsupported claims and leave deterministic analysis as the source of truth.
- **FR-019**: Suggested SQL MUST support original-versus-suggestion comparison and copying; applying a suggestion MUST require an explicit user action and MUST NOT silently overwrite source.
- **FR-020**: AI failure MUST leave deterministic results usable and identify the failure and recovery option; provider configuration and selection MUST follow existing settings.
- **FR-021**: SQL and imported content MUST be treated as untrusted data; source instructions MUST NOT override analysis instructions, and secrets MUST NOT be disclosed in AI context.
- **FR-022**: The user MUST be informed whether analysis is local or uses an external AI provider; external transmission of SQL MUST require the user's enabled provider choice and existing authorization. For new AI actions, before the first external transmission in each analysis session, the product MUST identify the provider and request confirmation; cancellation MUST prevent transmission. Existing AI workflows MUST retain their current behavior.
- **FR-023**: Hallmark MUST guide the new experience within the existing design system, preserving theme, user-selected accent, current shell and approved Query Input behavior; design changes MUST be confirmed with the user during the design process.
- **FR-024**: New experiences MUST support Vietnamese and English, keyboard operation, visible focus, sufficient contrast, reduced motion and responsive desktop, tablet and mobile use, including accessible graph alternatives.
- **FR-025**: Loading, empty, partial, unsupported and error states MUST identify the affected stage, available results and appropriate next action.
- **FR-026**: The analysis experience MUST remain responsive for large objects and MUST NOT invoke AI on every edit, render or parameter change.
- **FR-027**: Existing authentication, privacy, history persistence and permissions MUST remain unchanged unless separately approved; the feature MUST NOT connect to or modify a live database as a side effect of static analysis.
- **FR-028**: Users MUST be able to supply multiple database object definitions in one analysis session by pasting them together or importing multiple files, so dependency and impact analysis can use the supplied definitions.
- **FR-029**: Supplied definitions in the analysis session MUST remain available across in-app navigation, MUST be cleared on application reload or close, and MUST NOT be added to persistent history merely because they were supplied.
- **FR-030**: When a supplied definition is identified as the same object in the same dialect as an existing session definition, the product MUST show the conflict and let the user keep the existing definition or replace it; it MUST NOT silently choose a version.

### Key Entities

- **Database object**: User-supplied query, CTE, view, procedure, function or trigger, with source, selected dialect, available identity and analysis status.
- **Analysis session**: The collection of definitions supplied for dependency and impact analysis, retained only for the current application session.
- **Analysis result**: Evidenced metadata, extracted statements, structural information, metrics, limitations and findings for an object.
- **Dependency**: A known or unresolved relationship between objects, with operation, direction, evidence and confidence where available.
- **Finding**: A severity-ranked fact or observation with supporting evidence, location, confidence and recommendation when available.
- **AI insight**: A clearly labeled interpretation or proposed change tied to the relevant analysis, with user-controlled application.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For every object type and dialect combination, the released capability matrix records supported, partial or unsupported status backed by representative validation evidence; no unverified combination is presented as fully supported.
- **SC-002**: In representative full, partial, unsupported and ambiguous input scenarios, 100% of results show the correct status and do not present unsupported information as confirmed.
- **SC-003**: All existing critical query, CTE, MyBatis, graph, history, settings and AI regression journeys pass before release, with any authorized behavior change separately documented.
- **SC-004**: For reference datasets containing a known multi-level dependency chain, cycle and missing definition, users can distinguish direct, transitive, cyclic and unknown relationships in both dependency views and impact results.
- **SC-005**: In a usability review of at least five target users, at least four can identify the object, find a source-backed finding, explore a dependency and distinguish AI output from deterministic analysis without assistance.
- **SC-006**: Across representative desktop, tablet and mobile sizes, all primary actions and source content remain reachable in both languages using keyboard and pointer; no content is permanently clipped.
- **SC-007**: For an existing supported query with more than 50 tables, analysis and relationship-graph rendering complete within one second on the project's specified single-GPU reference machine; measurement setup and results are recorded.
- **SC-008**: In AI failure and suggested-rewrite scenarios, deterministic results remain accessible and source changes occur only after explicit user action in every tested case.
- **SC-009**: An incremental release may disclose partial or unsupported capabilities, but the overall initiative is complete only when each target capability in the master prompt has validation evidence or an explicit user-approved exclusion.

## Assumptions

- The master prompt is the target product vision, not a claim that every dialect/object combination is already supported. The capability inventory decides what is missing and which limitations remain visible.
- Initial evidence confirms that Query Input already calls existing SQL analysis, MyBatis resolution and history functions; the existing query analyzer describes its main path as regex-based, with separate parser-based capabilities elsewhere. A full baseline and capability audit are required before claiming coverage.
- Impact is limited to object definitions available to the analysis; absent schema or object definitions do not imply absence of dependents. Static analysis does not execute supplied SQL.
- Existing local and explicitly enabled cloud AI configurations and guest permissions remain intact. Hallmark design follows the locked product system, including both themes and the user's selected accent.
- Delivery is incremental; a partial capability is acceptable in a release only when labeled accurately and existing functionality remains intact. Overall completion requires validation of each target capability or an explicit user-approved exclusion, not mock or invented analysis.
