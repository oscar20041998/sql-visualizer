# Feature Specification: Query Input UX Improvement

**Feature Branch**: `duyvt7`

**Created**: 2026-09-20

**Status**: Draft

**Input**: User description: "for docs\ui-prompts\20260920\improve-ux-ui.prompt.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Understand the query-analysis workflow at a glance (Priority: P1)

A developer opens the query input page to begin analysis and needs to understand the sequence of actions immediately without reading help text. They need to know what information to provide, how to configure required values, what SQL will be analyzed, and what issues need attention before they act.

**Why this priority**: This page is the entry point for repeated daily work. If the workflow is confusing or visually crowded, developers lose time and confidence before the actual analysis even starts.

**Independent Test**: Load the page with SQL input, parsed parameters, and warnings and confirm a user can identify the flow from input to configuration to review to action in under 5 seconds without prior training.

**Acceptance Scenarios**:

1. **Given** a developer is on the query input page, **When** they first scan the page, **Then** they can identify the required input area, parameter configuration area, resolved SQL area, and the primary action without hunting for controls.
2. **Given** the page contains a SQL input method selector, **When** the developer changes the active input method, **Then** the selected method is clearly distinguished and the underlying workflow remains unchanged.
3. **Given** a query is ready for analysis, **When** the developer reviews the page, **Then** the primary CTA is visually emphasized while secondary actions remain clearly subordinate.

---

### User Story 2 - Configure detected parameters without confusion (Priority: P1)

A developer analyzes a query whose parameter placeholders must be resolved before the final SQL can be used. They need a clear parameter section that shows which values are required, helps them search long lists, and keeps the parameter-to-SQL relationship obvious.

**Why this priority**: Parameter resolution is a core dependency of the analysis. Confusion here creates incorrect SQL or prevents analysis from starting.

**Independent Test**: Open a query with multiple detected parameters, search for one, update a value, and verify the final SQL still resolves correctly and the parameter list remains scannable and readable.

**Acceptance Scenarios**:

1. **Given** a query contains multiple detected parameters, **When** the developer opens the parameter section, **Then** they can clearly distinguish parameter names from their values and understand they are required to resolve the final SQL.
2. **Given** a large set of parameters, **When** the developer uses the search field, **Then** they can quickly locate relevant entries without losing context of the overall section.
3. **Given** a parameter value is updated, **When** the developer continues to the resolved SQL preview, **Then** the final SQL reflects the same underlying business behavior and the parameter section remains consistent with the query state.

---

### User Story 3 - Review final SQL and findings with confidence (Priority: P2)

A developer has completed the input and parameter steps and now needs to verify the generated SQL and review any issues reported by analysis. They need the SQL preview to be treated as the source of truth, and they need findings to be structured so that they can quickly understand what is wrong, how serious it is, and where to look.

**Why this priority**: This is where developers decide whether the query is ready to analyze and whether the findings require action. Poor presentation here undermines trust in the analysis result.

**Independent Test**: Load a resolved SQL statement with warnings and confirm the developer can scan severity, explanation, line references, and actionable guidance without excessive visual noise or information overload.

**Acceptance Scenarios**:

1. **Given** the query has been resolved, **When** the developer views the SQL output area, **Then** the generated SQL is visually prioritized as the final analyzed statement and remains easy to read at enterprise desktop sizes.
2. **Given** analysis findings exist, **When** the developer scans the findings list, **Then** they can understand each issue's type, severity, location, and summary without reading every technical detail at once.
3. **Given** a user expands a finding for more detail, **When** they inspect the item, **Then** the detailed explanation, example, and navigation actions are still available without losing the overall structure of the findings section.

---

### User Story 4 - Use the page on enterprise desktop workflows and in both supported languages (Priority: P3)

A developer works in a bilingual enterprise environment and expects the page to remain readable, accessible, and functional at common desktop sizes in both Vietnamese and English. They need the interface to preserve current business logic while improving readability and interaction quality.

**Why this priority**: This feature is used repeatedly in professional workflows, so clarity across language and layout conditions matters even when the core logic is unchanged.

**Independent Test**: Switch the interface language and resize the layout to common desktop widths, then verify the page is still structured, readable, keyboard-friendly, and fully functional.

**Acceptance Scenarios**:

1. **Given** the user is working in Vietnamese or English, **When** they view the page, **Then** the UI uses the existing i18n system and preserves the required terminology without hard-coded assumptions.
2. **Given** the app is used at 1024px, 1280px, 1440px, or 1920px widths, **When** the developer interacts with the page, **Then** the layout remains usable and the SQL area remains readable without the parameter list dominating the workspace.
3. **Given** a developer navigates the page with keyboard focus, **When** they interact with tabs, buttons, and inputs, **Then** focus states and labels remain clear and accessible without relying only on color cues.

### Edge Cases

- No SQL has been entered yet, no file is uploaded, or no parameters are detected; the page clearly explains what is missing and what the user should do next.
- A file upload succeeds or fails; the interface clearly reflects the current state without disrupting the user workflow.
- A query has many parameters or many warnings; the page prioritizes the most relevant data while keeping the underlying content accessible.
- The system is parsing, resolving, or analyzing; loading states communicate progress without implying fake or misleading percentages.
- The user is in a dark-theme or light-theme environment; the page remains readable, consistent, and professional without becoming visually noisy.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST present the query input page as a clear workflow from input to configuration to resolved SQL to analysis and findings, with the primary action visually emphasized.
- **FR-002**: The system MUST retain all current input methods, SQL analysis behavior, parsing behavior, parameter extraction behavior, warning detection, dialect support, and navigation without altering business logic or API contracts.
- **FR-003**: The system MUST provide a clear, scannable header for the page that communicates the purpose of the screen, the active analysis context, and the key secondary actions without making them visually compete with the primary workflow.
- **FR-004**: The system MUST improve input-method tab usability so the active method is clearly identifiable, inactive methods remain secondary, and all keyboard and hover affordances remain accessible.
- **FR-005**: The system MUST present MyBatis XML upload and current file state as an explicit input condition, including file identity and removal action, while preserving upload, drag-and-drop, size, and parsing behavior.
- **FR-006**: The system MUST make the parameter section readable and structured so developers can understand that detected parameters are values required to resolve the final SQL, even when many parameters are present.
- **FR-007**: The system MUST expose parameter search or filtering within the section context so developers can locate entries quickly without disrupting the workflow or changing parameter logic.
- **FR-008**: The system MUST treat the resolved SQL area as the source of truth for the final SQL that will be analyzed, with stronger hierarchy and cleaner surrounding presentation than the current editor container alone.
- **FR-009**: The system MUST structure analysis findings as a dedicated section that supports rapid scanning of issue type, severity, summary, and location while preserving the existing behavior for expand/collapse and navigation.
- **FR-010**: The system MUST preserve the existing severity semantics and use visual differentiation primarily as a signal for issue seriousness, without inventing new levels or replacing core meaning.
- **FR-011**: The system MUST provide clear empty, loading, and error states that explain what is missing, what is happening, or what the user can do next without exposing raw technical stack traces as the primary message.
- **FR-012**: The system MUST support a desktop-first responsive layout that keeps the SQL editor comfortable to read and prevents the parameter panel from dominating the horizontal space at common enterprise widths.
- **FR-013**: The system MUST use the existing i18n mechanism and remain compatible with both Vietnamese and English interface languages without hard-coded user-facing text in UI components.
- **FR-014**: The system MUST keep the dark enterprise visual identity, reduce unnecessary visual noise, and prioritize clarity, structure, and developer productivity over decorative novelty.
- **FR-015**: The system MUST preserve all existing actions, state semantics, and data flows while improving only the presentation, grouping, hierarchy, and interaction clarity of the input-analysis page.

### Key Entities *(include if feature involves data)*

- **Query Input Session**: The developer's working state for a new or existing SQL analysis, including the selected input method, parse state, and current analysis context.
- **Detected Parameter**: A resolved placeholder or runtime value required to materialize the final SQL, with a name, value, and source context.
- **Resolved SQL**: The final SQL statement generated from the input and parameter values before analysis execution.
- **Analysis Finding**: A warning, recommendation, or issue surfaced by the analyzer, with a type, severity, summary, location, and optional detail.
- **Upload State**: The current MyBatis XML file or input source, including identity, metadata, and removal state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can identify the main workflow of the page and the primary action within 5 seconds of landing on the page in a typical enterprise desktop scenario.
- **SC-002**: At least 95% of users can locate the primary query-analysis action and parameter configuration area without searching through the page.
- **SC-003**: A developer can scan a page with many detected parameters and identify the relevant parameter they need within a short, supported interaction time without losing context of the section.
- **SC-004**: The resolved SQL area remains clearly identifiable as the final SQL to be analyzed across the supported desktop widths and theme modes.
- **SC-005**: The analysis findings section allows a developer to understand issue type, severity, summary, and location in a quick scan without needing to expand every item.
- **SC-006**: The page remains fully functional for direct SQL input, MyBatis XML upload, smart editor flow, parameter editing, SQL resolution, and warning navigation in both Vietnamese and English modes.
- **SC-007**: The improved interface reduces visual clutter and cognitive overload while preserving all existing business logic, API contracts, and SQL analysis behavior.

## Assumptions

- The page remains a desktop-first enterprise developer workflow, with broader mobile support as a secondary consideration rather than a primary design target.
- Existing SQL parsing, analysis, parameter extraction, and warning-generation logic remain the source of truth and are not redefined as part of this UX work.
- The project already has established UI primitives and theming, so the improvement should build on those patterns rather than introducing a new design system.
- The existing i18n framework is the single source of truth for all new user-facing strings.
- The redesign focuses on hierarchy, layout, and usability improvements, not functional expansion or business-rule changes.
