# Feature Specification: SQL Explainer Upgrade

**Feature Branch**: `duyvt7` (existing working branch; no new branch created by this command)

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: "Refactor the SQL Explainer feature. Goals: increase clarity and comprehension (easy to understand the purpose and outcome of the query); explanation length 500 to 1,000 characters; increase characteristic understanding of the query; enhance the user's ability to quickly grasp key insights; improve readability for Business Analysts and Developers; optimize for 30-second understanding; do not duplicate the Analyze feature; keep explanations concise and business-focused. Required sections: 1. Query Objective, 2. What You Get Back (bullet list), 3. Report Grain (mandatory), 4. Filters & Constraints (structured categories), 5. Data Sources (source + business purpose). Do NOT include: CTE explanations, join explanations, query execution logic, calculations, data lineage, performance analysis. Return structured JSON output suitable for UI rendering." (Source: `docs/ui-prompts/20260921/upgrade-sql-explainer.prompt.md`)

## Clarifications

### Session 2026-09-21

- Q: When a generated explanation falls outside the 500–1,000 character budget, how should the system enforce the length requirement? (FR-007) → A: Validate and retry — regenerate (up to a bounded number of attempts) until output fits 500–1,000 characters.
- Q: Since CTE explanations are banned but Data Sources must list tables "or CTEs," how should named query steps (CTEs) appear in Data Sources? (FR-006, FR-008) → A: List CTEs as named sources with role only — name plus a one-phrase role, no breakdown of inner query logic.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Business-readable explanation of any query (Priority: P1)

A Business Analyst pastes an unfamiliar SQL query into the Smart SQL Editor and runs Explain to learn, in plain language, what question the query answers and what its result means — without reading SQL.

**Why this priority**: This is the core value of the feature. If a non-SQL reader cannot understand purpose, result shape, grain, filters, and sources from the explanation alone, nothing else matters.

**Independent Test**: Run Explain on a multi-table, filtered, aggregate query. A reader shown only the explanation (not the SQL) can state the query's purpose, what each result row represents, which filters apply, and which data sources are read.

**Acceptance Scenarios**:

1. **Given** a SELECT query with JOINs, WHERE filters, and grouping, **When** the user runs Explain, **Then** the output contains all five sections (Query Objective, What You Get Back, Report Grain, Filters & Constraints, Data Sources) with content grounded in the query.
2. **Given** a completed structured explanation, **When** it is rendered, **Then** the five sections appear in the fixed order above with What You Get Back as a bullet list.
3. **Given** a model response that violates the JSON contract, **When** generation completes, **Then** the UI still shows the raw answer with a visible notice that structured output was unavailable.

---

### User Story 2 - Thirty-second key-insight grasp (Priority: P2)

A Developer triaging an unfamiliar report query runs Explain and, within about 30 seconds of reading, grasps the query's purpose, result grain, and key constraints.

**Why this priority**: The prompt file names 30-second understanding as the optimization target; length control (500–1,000 characters) is the mechanism. It depends on Story 1's structure being in place.

**Independent Test**: Timed comprehension check — a reader unfamiliar with the query reads only the explanation and answers "what question does this answer?", "what is one result row?", and "what filters apply?" within 30 seconds.

**Acceptance Scenarios**:

1. **Given** any supported SELECT query, **When** the explanation is produced, **Then** the combined human-readable content across all five sections measures between 500 and 1,000 characters.
2. **Given** a trivially simple query whose natural explanation falls below 500 characters, **When** the explanation is produced, **Then** the output expands with query-grounded detail (e.g. per-column result meaning, explicit no-filter statement) instead of inventing content.
3. **Given** a highly complex query whose natural explanation would exceed 1,000 characters, **When** the explanation is produced, **Then** the output stays within budget by summarizing rather than dropping any section.

---

### User Story 3 - Explainer and Analyze each have a clear job (Priority: P3)

A user wondering "what does this query mean?" versus "how does this query run?" gets a business-focused answer from Explain and an execution-focused answer from Analyze, with no confusing overlap.

**Why this priority**: Boundary-keeping. It protects the conciseness and business focus of Stories 1–2 by explicitly excluding execution topics, and guards the existing Analyze feature against behavior change.

**Independent Test**: Run both Explain and Analyze on the same complex query. The Explain output contains none of the banned topics, and the Analyze output is unchanged from current behavior.

**Acceptance Scenarios**:

1. **Given** a query with CTEs, JOINs, and calculations, **When** the user runs Explain, **Then** the output contains no CTE explanations, no join explanations, no execution logic, no calculations, no data lineage, and no performance analysis.
2. **Given** the upgraded Explainer, **When** the user runs the Analyze feature, **Then** Analyze behaves exactly as before (no output changes caused by this feature).

---

### Edge Cases

- Empty or whitespace-only SQL: show a validation message; do not call generation.
- Non-SELECT or unparsable SQL: show a graceful message; never fabricate section content — unsupported claims are marked unknown or left empty, not invented.
- Parser facts vs. model claims disagree: parser facts win (Constitution principle IV); model-only claims are labeled unknown.
- Model ignores the JSON contract mid-stream or at completion: fall back to the raw answer with a user-visible notice; still record the run in history.
- Query has no filters or no grouping: the Filters & Constraints section states this explicitly ("no filters") and Report Grain is still stated (e.g. one row per result row, or a single summary row).
- Both locales (English, Vietnamese): identical five-section structure and the same 500–1,000 character budget.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Explainer MUST return exactly five sections in this fixed order: 1. Query Objective, 2. What You Get Back, 3. Report Grain, 4. Filters & Constraints, 5. Data Sources.
- **FR-002**: Query Objective MUST be one to two plain-language sentences describing the query's core goal, avoiding SQL keywords in favor of business meaning.
- **FR-003**: What You Get Back MUST be a bullet list describing the returned columns and rows, plus sorting and row limits, in plain language.
- **FR-004**: Report Grain MUST always be present and MUST state what a single result row represents (e.g. "one row per customer per month") in plain language.
- **FR-005**: Filters & Constraints MUST group conditions into structured categories (such as time range, status, region, and other constraints); a query with no filters MUST state that explicitly rather than omitting the section.
- **FR-006**: Data Sources MUST list each table or CTE the query reads together with its business purpose; any purpose not supported by the query or verified facts MUST be marked unknown, never invented. A CTE entry MUST contain only its name plus a one-phrase role (e.g. "monthly_sales, a named step in this query: monthly totals"); describing a CTE's inner query logic counts as a banned CTE explanation under FR-008.
- **FR-007**: The combined human-readable content across all five sections MUST measure between 500 and 1,000 characters in both supported locales. Length is enforced by validating each generated explanation and regenerating (up to a bounded number of retry attempts) until the output fits the budget; if all attempts fail, the closest-length attempt is shown with a user-visible notice.
- **FR-008**: The Explainer MUST NOT include CTE explanations, join explanations, query execution logic, calculations, data lineage, or performance analysis. "CTE explanation" means describing a CTE's inner query logic; a name-plus-role Data Sources entry per FR-006 is explicitly NOT a CTE explanation.
- **FR-009**: The Explainer MUST NOT duplicate the Analyze feature's responsibilities; execution and performance content stays in Analyze, whose behavior MUST remain unchanged.
- **FR-010**: Explanations MUST stay grounded in locally verified parser facts (tables, JOINs, CTE structure) and MUST never contradict the parser; unverifiable model claims MUST be marked unknown.

- **FR-011**: The structured output MUST use a stable JSON shape with fixed keys and order, string and string-array values only, suitable for UI rendering; contract violations MUST degrade to the raw answer with a user-visible notice.
- **FR-012**: English and Vietnamese outputs MUST share the identical five-section structure and character budget.

### Key Entities *(include if feature involves data)*

- **Structured Explanation**: The five-section JSON payload for one Explain run — objective, result bullets, grain statement, categorized filters, source entries — plus the raw model answer kept as fallback.
- **Report Grain Statement**: A single plain-language sentence declaring what one result row represents; always required, never omitted.
- **Filter Category**: A named group (e.g. time range, status, region, other constraints) containing one plain-language sentence per condition in that group.
- **Data Source Entry**: A table or CTE name paired with its business purpose as supported by the query, or marked unknown when support is lacking.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Across a sample of 10 representative queries (simple, filtered, aggregated, multi-table, CTE-based), at least 9 produce all five sections with content grounded in the query.
- **SC-002**: 100% of sampled explanations measure 500–1,000 characters of human-readable content in both English and Vietnamese.
- **SC-003**: First-time readers unfamiliar with the queries answer purpose, grain, and filter questions from the explanation alone within 30 seconds for at least 8 of 10 sampled queries.
- **SC-004**: Zero occurrences of banned topics (CTE/join explanations, execution logic, calculations, lineage, performance analysis) across all sampled Explainer outputs.
- **SC-005**: Business Analyst and Developer reviewers confirm the explanations read as business-focused and non-overlapping with Analyze output for the sampled queries.

## Assumptions

- The existing generation pipeline (provider routing, streaming, context-budget handling, history) is reused; only the prompt contract, response parsing/validation, and result rendering change.
- The local parser brief (tables, JOINs, CTE structure) continues to feed explanation grounding per Constitution principle IV (AI-Grounded Explanations).
- "Characters" means user-visible characters, excluding JSON syntax, section labels, and whitespace-only padding.
- Streaming behavior is preserved: sections may render progressively, but the final assembled output MUST still satisfy FR-001–FR-007.
- Follow-up chat, read-aloud speech, and the CTE batch panel are out of scope unless the schema change forces adaptation; any forced adaptation is identified during planning.
- "Analyze feature" means the existing query/plan analysis surfaces; their behavior is unchanged by this feature.

