# Feature Specification: SQL Visualizer Baseline

**Feature Directory**: `specs/001-sql-visualizer-baseline/`
**Source**: https://github.com/oscar20041998/sql-visualizer (existing application; no additional feature brief was supplied)
**Status**: Draft

## Overview

This is the first tracked specification for the SQL Visualizer application. No new feature request accompanied this run beyond a link to the existing repository, so this document captures the **current, already-built product** as a baseline: the core analysis workspace, the AI-powered assistance features, and the access gate in front of them. Recording this baseline gives future specs (enhancements, fixes, AI feature changes) a shared reference for what already exists and why, so incremental specs can describe deltas instead of re-describing the whole app.

## User Scenarios & Testing

### User Story 1 - Analyze a SQL query end-to-end (Priority: P1)

A developer pastes a SQL query (or imports a MyBatis XML mapper) into the workspace, picks the SQL dialect it was written for, and immediately sees the query's complexity score, its table relationships, its JOIN conditions, and its CTE structure — without leaving the page or running the query against a real database.

**Why this priority**: This is the reason the product exists — every other feature (AI explainer, optimizer, chat) is built on top of this local analysis pipeline. Without it there is nothing to visualize or explain.

**Independent Test**: Paste a multi-JOIN, multi-CTE query for a supported dialect and confirm the complexity score, relationship graph, JOIN breakdown, and CTE tree all populate and stay in sync with the query text.

**Acceptance Scenarios**:
1. **Given** the query workspace is open, **When** a user pastes a valid SQL query and selects its dialect, **Then** the system parses it and displays a complexity score (0-100) with a breakdown of contributing factors (keywords, SELECT fields, JOINs, CTEs, subqueries, window functions).
2. **Given** a parsed query with multiple tables and JOINs, **When** the user opens the relationship graph, **Then** every table appears as a node and every JOIN appears as a color-coded edge connecting the correct tables.
3. **Given** a parsed query with at least one JOIN, **When** the user opens JOIN analysis, **Then** each JOIN condition is broken down by columns and operators involved.
4. **Given** a parsed query with one or more CTEs, **When** the user opens CTE analysis, **Then** each CTE is shown in a tree with its field origins and nested-subquery depth.
5. **Given** a metric card or subquery entry that references a source line, **When** the user activates it, **Then** the Smart SQL Editor scrolls to and highlights that exact line.
6. **Given** a MyBatis XML mapper is imported instead of raw SQL, **When** the import completes, **Then** the extracted query is analyzed identically to a pasted query.

---

### User Story 2 - Get AI explanations and optimization suggestions for a query (Priority: P2)

A developer who already has an analyzed query wants a plain-language explanation of what it does, or wants suggestions on how to make it faster, grounded in facts the local parser already verified (real tables, real joins, real CTEs) rather than in a hallucinated guess.

**Why this priority**: This is the product's main differentiator over a plain SQL formatter/visualizer, but it depends entirely on User Story 1's parser output, so it is valuable only once analysis exists.

**Independent Test**: With a query already analyzed, request an explanation and confirm a structured answer (objective, filters, output, referenced tables) streams in; then request optimization and confirm suggestions plus a rewritten query stream in and can be applied to the editor.

**Acceptance Scenarios**:
1. **Given** an analyzed query, **When** the user asks for an explanation, **Then** the system streams a structured answer covering objective, filters, output shape, field meanings, and referenced tables, rendering partial sections as they arrive rather than raw JSON.
2. **Given** a streamed explanation that never resolves into valid structured JSON, **When** streaming finishes, **Then** the UI falls back to a plain notice plus the raw answer in a collapsible section, rather than showing broken output.
3. **Given** an explanation is showing, **When** the user asks a follow-up question, **Then** the original SQL stays pinned as context and prior turns are trimmed as needed to fit the provider's context budget.
4. **Given** an analyzed query, **When** the user requests optimization, **Then** the editor locks read-only, local lint checks run first, and a streamed result (analysis, suggestions, optimized SQL) is produced grounded in the dialect-specific knowledge brief and the parser's verified facts.
5. **Given** a successful optimization result that changes the query, **When** it completes, **Then** the editor updates, diff view auto-enables, linting re-runs, and the number of auto-resolved lint alerts is shown.
6. **Given** the user has configured a local model (Ollama) or a cloud provider (OpenAI, Anthropic, Gemini), **When** any AI feature runs, **Then** cloud provider credentials are used only server-side and never exposed to the browser.

---

### User Story 3 - Ask general database questions and search past queries (Priority: P3)

A developer wants to ask free-form questions about SQL/database concepts (grounded in official vendor manuals when available), consult the app's own feature docs through a chat, and find a previously analyzed query again by describing what it did rather than remembering its exact text.

**Why this priority**: These are supporting/convenience features layered on the core workspace; valuable for daily use but not required for the app's primary analyze-and-explain loop to function.

**Independent Test**: Ask the Database AI Assistant a database question and confirm a grounded answer with source labels when a manual match exists; separately, save two distinct queries, search history using a paraphrase of one, and confirm it ranks above unrelated entries.

**Acceptance Scenarios**:
1. **Given** the Database AI Assistant page, **When** a user asks a database question, **Then** the system embeds the question, retrieves the nearest matching excerpts from the official manual corpus (SQL Server, MySQL, PostgreSQL, Oracle), and answers with source labels only when a real match is found.
2. **Given** the Docs Consultant Chat, **When** a user asks about an app feature, **Then** the answer is grounded in the closest chunks of the app's own feature documentation with citations shown.
3. **Given** a query has been analyzed, **When** analysis completes, **Then** the query and its embedding are saved to the server-side query history store.
4. **Given** existing history entries, **When** the user searches by meaning (not exact substring), **Then** results are ranked by semantic similarity rather than plain text match.
5. **Given** an AI response is on screen, **When** the user requests read-aloud, **Then** the response is spoken using the configured voice (browser speech synthesis or local Piper voice).

---

### User Story 4 - Reach the workspace only after signing in (Priority: P2)

Anyone opening the app lands on a login/landing page and cannot reach the query workspace until they authenticate, whether via the demo credentials or a supported social sign-in button.

**Why this priority**: Access control gates every other story; without it the workspace has no boundary, but it does not by itself deliver analysis value, so it ranks alongside — not above — the AI features it protects.

**Independent Test**: Attempt to open the workspace directly while signed out and confirm redirection to the login page; then sign in with the demo credentials and confirm the workspace becomes reachable.

**Acceptance Scenarios**:
1. **Given** a signed-out visitor, **When** they navigate to the workspace, **Then** they are presented with the login/landing page instead.
2. **Given** the login page, **When** the demo credentials are submitted, **Then** the visitor is granted access to the workspace.
3. **Given** the login page, **When** a Google or Microsoft sign-in button is available, **Then** selecting it initiates that provider's sign-in flow.
4. **Given** invalid credentials are submitted, **When** the form is submitted, **Then** access is denied and the visitor remains on the login page.

## Edge Cases

- What happens when the pasted SQL fails to parse for the selected dialect (syntax error, wrong dialect chosen)?
- What happens when a query has zero tables/JOINs/CTEs — do the graph, JOIN analysis, and CTE tree degrade to an empty/neutral state rather than erroring?
- What happens when an AI request is made while no provider (local or cloud) is reachable or configured?
- What happens when a streamed AI response is interrupted mid-stream (network drop)?
- What happens when the query history store or the manual/doc embedding index is unavailable — do AI features degrade gracefully instead of failing hard?
- What happens on re-import of the same MyBatis XML mapper — is a duplicate history entry created?
- What happens when a user reloads the page mid-session — is the analyzed query, chat state, and auth session preserved or lost?

## Requirements

### Functional Requirements

- **FR-001**: The system MUST accept a pasted SQL query or an imported MyBatis XML mapper as input, with an explicit selection of the SQL dialect (MySQL, PostgreSQL, SQL Server, or Oracle).
- **FR-002**: The system MUST compute and display a complexity score (0-100) for the current query, broken down by contributing factors.
- **FR-003**: The system MUST visualize table relationships and JOIN connections as an interactive, color-coded graph.
- **FR-004**: The system MUST break down each JOIN condition by the columns and operators involved.
- **FR-005**: The system MUST display CTEs as a tree showing field origins and nested-subquery depth.
- **FR-006**: The system MUST let a user jump from a metric card or subquery entry directly to its source line in the editor.
- **FR-007**: The system MUST provide a multi-dialect SQL editor supporting formatting and an original-vs-edited diff view, kept in sync with live analysis.
- **FR-008**: The system MUST generate a structured, plain-language explanation of a query (objective, filters, output, field meanings, referenced tables) on request, streamed incrementally.
- **FR-009**: The system MUST fall back to an unstructured notice plus raw response when a streamed AI answer does not resolve into valid structured output.
- **FR-010**: The system MUST generate optimization suggestions and a rewritten query on request, grounded in the parser's verified facts and dialect-specific knowledge.
- **FR-011**: The system MUST support follow-up questions on an AI explanation, retaining the original query as pinned context.
- **FR-012**: The system MUST support at least one local model provider (Ollama) requiring no API key, and cloud providers (OpenAI, Anthropic, Gemini) whose credentials are never exposed to the browser.
- **FR-013**: The system MUST save every analyzed query to a persistent, server-side history store together with a semantic embedding.
- **FR-014**: The system MUST allow searching query history by meaning, ranking results by semantic similarity rather than exact substring match.
- **FR-015**: The system MUST answer general database questions, grounding responses in official vendor manual excerpts when a relevant match exists and labeling the source.
- **FR-016**: The system MUST answer questions about the app's own features, grounding responses in the app's feature documentation with citations.
- **FR-017**: The system MUST offer read-aloud of AI-generated text using a configurable voice.
- **FR-018**: The system MUST require authentication (demo credentials or a supported social sign-in) before granting access to the query workspace.
- **FR-019**: The system MUST deny workspace access when authentication fails or has not occurred.

## Key Entities

- **Query**: A single SQL statement (or MyBatis-imported statement) submitted for analysis; has raw text, dialect, complexity score, and derived structures (tables, JOINs, CTEs, subqueries).
- **Table Relationship / JOIN Edge**: A directed connection between two tables in a query, with a JOIN type, condition, and columns/operators involved.
- **CTE Node**: A named common table expression within a query, with its own field origins, nested subqueries, and nesting depth, related to a parent Query.
- **History Entry**: A saved record of a previously analyzed Query, including its text and semantic embedding, used for later semantic search.
- **AI Explanation / Optimization Result**: A structured AI response tied to a specific Query, containing either an explanation (objective/filters/output/tables) or optimization output (analysis/suggestions/optimized SQL).
- **Chat Conversation**: A sequence of user/assistant turns for either the Database AI Assistant or Docs Consultant Chat, persisted across page navigation for the session.
- **User Session**: The authenticated state granting access to the workspace, established via demo credentials or a social sign-in provider.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A user can go from pasting a valid query to seeing its complexity score, relationship graph, JOIN breakdown, and CTE tree without a page reload or manual refresh.
- **SC-002**: At least 4 SQL dialects (MySQL, PostgreSQL, SQL Server, Oracle) are supported by the analysis pipeline.
- **SC-003**: An AI explanation or optimization request begins streaming visible partial output before the full response completes.
- **SC-004**: A semantic history search returns the originally intended entry among the top results even when the search phrase does not share exact wording with the saved query's description.
- **SC-005**: 100% of AI features that use cloud providers keep provider credentials server-side, never observable from the browser.
- **SC-006**: An unauthenticated visitor is unable to reach any workspace analysis feature; 100% of workspace routes require a valid session.

## Assumptions

- No new feature work was specified beyond a link to the existing repository, so this baseline documents current, shipped behavior rather than proposing changes.
- "Demo credentials" and the exact login copy are treated as existing product behavior, not a requirement pinned by this spec.
- Streaming, embeddings, and provider proxying are described at the behavior level; specific model names, endpoints, and libraries are implementation detail owned by the codebase, not by this spec.
