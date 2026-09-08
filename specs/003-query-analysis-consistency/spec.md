# Feature Specification: Query Analysis Correctness & Output Consistency

**Feature Branch**: `003-query-analysis-consistency`

**Created**: 2026-09-08

**Status**: Draft

**Input**: User description: "kiểm tra và thực hiện nâng cấp tính năng phân tích câu truy vấn sau khi người dùng paste câu query và click nút phân tích. Kiểm tra các logic đã đúng chưa, phải đảm bảo các tính năng hiện tại vẫn làm việc đúng, đảm bảo các ouput phải đồng nhất và nhất quán, thể hiện rõ ràng các thông tin sau khi truy vấn" (Audit and upgrade the query analysis feature triggered when a user pastes a query and clicks the analyze button — verify the logic is correct, ensure existing features keep working, ensure outputs are uniform and consistent, and clearly present the resulting information.)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trustworthy analysis results on first click (Priority: P1)

A developer pastes a SQL query into the Query Input page, selects a dialect, and clicks "Analyze". They expect the resulting tables, JOIN relationships, CTEs, and metrics to accurately reflect what the query actually does — no missing tables, no dropped JOINs, no miscounted relationships — regardless of which SQL dialect or how the query is formatted (aliased/unaliased tables, comma-joins, derived tables, subqueries).

**Why this priority**: Every other screen (Metrics Dashboard, Graph Visualizer, CTE Analysis) is a presentation layer over this one analysis result. If the underlying analysis is wrong, every downstream view is wrong, silently, regardless of how well it is displayed.

**Independent Test**: Paste a representative set of queries per dialect (simple, JOIN-heavy, CTE-heavy, comma-join, derived-table/subquery-as-table) and confirm the analyze result's table count, JOIN count, and CTE count match manual inspection of each query.

**Acceptance Scenarios**:

1. **Given** a query with multiple explicit JOINs across aliased and unaliased tables, **When** the user clicks Analyze, **Then** every referenced table appears exactly once and every JOIN appears as a distinct relationship, with no table silently dropped or misattributed.
2. **Given** a query using comma-style joins (`FROM a, b WHERE a.id = b.id`) or a derived table (`FROM (SELECT ...) x`), **When** the user clicks Analyze, **Then** the derived/comma-joined tables are recognized as real tables and produce correct relationship edges, not a generic or duplicated placeholder entry.
3. **Given** a query with one or more CTEs that reference each other, **When** the user clicks Analyze, **Then** the CTE dependency relationships are captured without double-counting a pair that is both explicitly JOINed and implicitly referenced.
4. **Given** the same analyzed query, **When** the user views the Metrics Dashboard, Graph Visualizer, and CTE Analysis pages in turn, **Then** all three report the same table count and the same relationship/JOIN count for that query.

---

### User Story 2 - Consistent, unambiguous output across every analysis-consuming page (Priority: P1)

After an analysis completes, a developer navigates between the Metrics Dashboard, Graph Visualizer, and CTE Analysis pages. They expect the numbers and labels describing "how many tables / how many relationships / how many CTEs" to always agree with each other, using the same terminology, instead of one page saying "5 joins" and another implying a different count for the identical analyzed query.

**Why this priority**: Inconsistent counts across pages erode trust in the tool and make it unclear which number is authoritative, undermining the analysis even when the underlying parsing is correct.

**Independent Test**: Analyze one query, then visit each consuming page and record every displayed count/label describing tables, relationships, and CTEs; confirm they are identical and use consistent terminology (e.g., always "relationships" or always "joins", not a mix).

**Acceptance Scenarios**:

1. **Given** a completed analysis, **When** the user views any page that displays a relationship/JOIN count, **Then** that count is drawn from the single canonical count for the analyzed query, not independently recomputed per page.
2. **Given** a completed analysis, **When** the user views table or CTE counts on different pages, **Then** the same number is shown everywhere that count appears.
3. **Given** the user re-analyzes a modified version of the same query, **When** the new result is ready, **Then** every consuming page updates to the new counts — no page continues showing stale data from the previous analysis.

---

### User Story 3 - Clear feedback for edge-case and invalid input (Priority: P2)

A developer pastes an empty query, a malformed query, or a query with no JOINs/CTEs, and clicks Analyze. They expect a clear, specific message about what happened (empty input, format issue, dialect mismatch, parse failure, or a valid "no relationships found" zero-state) instead of a silent failure, a generic error, or a blank/confusing screen.

**Why this priority**: Correct handling of the common path (User Story 1/2) only matters if failures and edge cases are equally clear; this builds user confidence that a "0 tables" or "0 joins" result is a real answer, not a bug.

**Independent Test**: Submit an empty query, a query with obvious syntax errors, a query written for a different dialect than the one selected, and a valid query with no JOINs/CTEs; confirm each produces a distinct, specific, non-crashing message and that the "no relationships" case is visually distinguishable from an error.

**Acceptance Scenarios**:

1. **Given** an empty query, **When** the user clicks Analyze, **Then** the system shows a message telling the user to enter a query, and does not navigate away from the input page.
2. **Given** a query that fails to parse, **When** the user clicks Analyze, **Then** the system shows a specific parse-failure message and does not present partial/incorrect results as if they were complete.
3. **Given** a query written for a dialect different from the one selected, **When** the user clicks Analyze, **Then** the system flags the mismatch with the detected vs. selected dialect before running the analysis.
4. **Given** a valid, simple query with no JOINs and no CTEs, **When** the user clicks Analyze, **Then** the consuming pages clearly show a legitimate "no relationships/no CTEs" zero-state rather than an empty or broken-looking view.

### Edge Cases

- What happens when the query contains dialect-specific syntax not recognized by the parser (e.g., a PostgreSQL-only construct while MySQL is selected)? The system must flag the mismatch rather than silently mis-parsing it as zero tables/joins.
- How does the system handle extremely large queries (e.g., 50+ tables) — must the counts remain accurate and must the consuming pages remain responsive per the existing performance principle?
- What happens if the user clicks Analyze again while a previous analysis is still in progress? The system must not mix partial results from two overlapping runs.
- What happens when a table is referenced only through a derived subquery or comma-style join with no explicit alias? It must still be counted as a distinct table, not merged with another table or dropped.
- What happens when copy-pasted SQL contains invisible/curly-quote characters that look valid but aren't real SQL? The system must catch this before attempting a full parse and explain the specific formatting issue.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST correctly identify every table referenced in a query — including aliased tables, unaliased tables immediately followed by another JOIN, comma-style joins, and derived tables (subquery-as-table) — with no table silently dropped or merged with another.
- **FR-002**: The system MUST correctly identify every JOIN/relationship edge in a query, including explicit JOIN keywords, comma-style implicit joins, and CTE-to-CTE dependencies, without double-counting a pair connected by both an explicit JOIN and an implicit reference.
- **FR-003**: The system MUST expose one canonical count each for tables, relationships/JOINs, and CTEs per analyzed query, and every page that displays these counts MUST read from that canonical source rather than recomputing its own count.
- **FR-004**: All pages that consume an analysis result (Metrics Dashboard, Graph Visualizer, CTE Analysis, and any other current or future consumer) MUST display identical table/relationship/CTE counts for the same analyzed query.
- **FR-005**: All pages that consume an analysis result MUST use consistent terminology for the same concept (e.g., a single consistent term for "relationship" vs. "join" edges) rather than mixing labels across pages.
- **FR-006**: The system MUST validate query format (e.g., copy-paste artifacts, wrapping quotes, invisible characters) before attempting a full parse, and MUST report the specific issue found rather than a generic failure.
- **FR-007**: The system MUST validate that the query's detected SQL dialect is compatible with the user-selected dialect before analyzing, and MUST report the specific mismatch (detected vs. selected) when it is not.
- **FR-008**: The system MUST reject a query that fails to parse with a specific, non-crashing error message, and MUST NOT present partial or incorrect results as if the analysis succeeded.
- **FR-009**: The system MUST distinguish a legitimate "zero relationships / zero CTEs" result (valid simple query) from an error or failed-analysis state, using clear, distinct messaging/visual treatment for each.
- **FR-010**: When the user submits a new analysis, the system MUST NOT mix or blend results from a previous, still-in-flight analysis with the new one; only one analysis result may be active at a time.
- **FR-011**: When a new analysis completes, every consuming page MUST reflect the new result; no page may continue displaying counts or details from a prior analyzed query.
- **FR-012**: Any regression fix made to satisfy FR-001/FR-002 MUST be validated against all currently supported dialects (MySQL, PostgreSQL, SQL Server, Oracle) and MUST NOT change the previously-correct behavior for queries that already parse correctly today.
- **FR-013**: The system MUST maintain existing analyze-time performance characteristics (no new noticeable delay before results appear) after any correctness fixes are applied.

### Key Entities

- **Analysis Result**: The single, canonical output of one Analyze action for one query — its list of tables, list of relationships/JOINs (including inferred CTE dependencies), CTEs, and summary metrics (table count, relationship count, CTE count). This is the one source of truth every consuming page must read from.
- **Table Reference**: A distinct table (or derived/subquery-as-table, or CTE) participating in the query, uniquely identified regardless of whether it is aliased, comma-joined, or referenced via a derived subquery.
- **Relationship/JOIN Edge**: A connection between two table references — either an explicit JOIN (any type), an implicit comma-style join, or an inferred CTE-to-CTE dependency — counted exactly once per distinct pair.
- **Analysis Validation Outcome**: The result of the pre-analysis checks (format validity, dialect compatibility, parseability) that determines whether an Analyze click proceeds to a full analysis, is blocked with a specific message, or completes as an empty/zero-relationship result.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of representative test queries (covering aliased/unaliased tables, comma-joins, derived tables, multi-CTE dependencies, across all 4 supported dialects) produce table/relationship/CTE counts matching manual inspection.
- **SC-002**: 100% of pages that display a table, relationship, or CTE count for the same analyzed query show identical numbers, with zero discrepancies across Metrics Dashboard, Graph Visualizer, and CTE Analysis.
- **SC-003**: 100% of invalid or edge-case inputs (empty query, format issue, dialect mismatch, parse failure, zero-relationship valid query) produce a distinct, specific, non-crashing message appropriate to that case.
- **SC-004**: 0% of existing, currently-passing sample queries regress (produce different/incorrect counts) after the upgrade.
- **SC-005**: Analysis results for a newly submitted query fully replace the previous query's results on every consuming page within the same interaction, with no stale data visible.

## Assumptions

- This feature is an audit-and-correctness upgrade of the existing "paste query → click Analyze" flow (`src/app/query-input/page.tsx` → `analyzeSql` in `src/lib/sql/sqlAnalyzer.ts`) and its existing consumers (Metrics Dashboard, Graph Visualizer, CTE Analysis); it does not introduce a new page or a new entry point.
- "Correct" is scoped to what the project's regex/AST-based parser can verify today (per the project constitution's Multi-Dialect SQL Analysis principle) — not a full formal-semantics proof against every possible SQL construct in all four dialects.
- The canonical analysis result already lives in the shared app store (`analysisResult`); consuming pages are expected to read from it rather than maintain independent derived counts, and any page found doing otherwise is considered a defect under this feature.
- No new SQL dialects are added; the audit covers the four already-supported dialects (MySQL, PostgreSQL, SQL Server, Oracle).
- Existing sample queries under `src/sample/` and any known-good regression cases remain the baseline for "existing features still work correctly."
