# Feature Specification: SQL Source Classification

**Feature Branch**: `duyvt7`

**Created**: 2026-09-20

**Status**: Draft

**Input**: User description: "Read and implement fixes for inconsistent SQL core logic when found. Requirements are in `docs/ui-prompts/20260919/fix-sql-source-classification-table-vs-cte.md`."

## Clarifications

### Session 2026-09-20

- Q: Without a database catalog or schema metadata, how should an unqualified source name that is not a CTE or derived query be classified? → A: Treat non-CTE, non-subquery direct source references as `TABLE`; use `UNKNOWN` only when the source expression cannot be resolved.
- Q: Should the relationship graph provide a separate filter for derived subquery sources, in addition to the existing CTE and physical-table filters? → A: Add separate filters for physical tables, CTEs, and derived subqueries.
- Q: When the same physical table or CTE is referenced with multiple aliases in one query scope, should the graph show one source node or one node per alias? → A: Show one node per distinct aliased source occurrence, retaining the same resolved source classification.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Identify SQL sources correctly (Priority: P1)

A developer analyzes a query that uses physical tables, common table expressions (CTEs), and derived queries. They need the resulting analysis to identify each source according to its SQL meaning so they can trust the displayed query structure.

**Why this priority**: Misidentifying a CTE as a physical table makes the core analysis inaccurate and causes every visualization and count based on that analysis to be misleading.

**Independent Test**: Analyze representative queries containing a physical table, one or more CTEs, and a derived query; confirm every source has the expected classification and no CTE reference is reported as a physical table.

**Acceptance Scenarios**:

1. **Given** a query defines `customer_orders` as a CTE over `orders`, **When** the developer analyzes `SELECT * FROM customer_orders`, **Then** `orders` is identified as a physical table and `customer_orders` is identified as a CTE.
2. **Given** a query references a CTE with an alias, **When** the developer analyzes the query, **Then** the CTE retains its CTE classification and the alias is represented as a distinct source occurrence rather than as a separate source category.
3. **Given** a query self-joins a physical table or CTE through distinct aliases, **When** the developer analyzes the query, **Then** each alias occurrence is represented as a distinct graph node with the same resolved source classification so the relationship remains visible.
4. **Given** a query references a schema-qualified physical table, **When** the developer analyzes the query, **Then** the source remains identified as a physical table and retains its full identifier.

---

### User Story 2 - Understand derived and dependent sources (Priority: P2)

A developer analyzes a complex query containing derived queries and CTEs that depend on other CTEs. They need the graph to distinguish these source categories and preserve the relationships between them.

**Why this priority**: Complex analytical SQL commonly layers CTEs and derived queries. Correct relationships are necessary to understand data flow and debug query behavior.

**Independent Test**: Analyze a query with multiple dependent CTEs and a derived source joined to a physical table; verify source classifications and dependency relationships match the query structure without duplicates.

**Acceptance Scenarios**:

1. **Given** a query joins a derived query in its `FROM` clause, **When** the developer analyzes it, **Then** the derived query is identified as a subquery source rather than as a physical table.
2. **Given** a second CTE reads from a first CTE, **When** the developer analyzes the query, **Then** both sources are identified as CTEs and their dependency is represented once.
3. **Given** a CTE joins a physical table, **When** the developer analyzes the query, **Then** the relationship is preserved and each endpoint keeps its own source classification.

---

### User Story 3 - Visually distinguish source categories (Priority: P3)

A developer views the relationship graph after analysis. They need to see whether a node is a physical table, CTE, or derived query without inferring its meaning from its name.

**Why this priority**: The visualization is only useful when it accurately communicates the semantic analysis beneath it.

**Independent Test**: Analyze a query containing all supported source categories and verify the graph labels, filters, and exported diagram identify CTEs and derived queries distinctly from physical tables.

**Acceptance Scenarios**:

1. **Given** an analysis contains physical-table, CTE, and derived-subquery nodes, **When** the developer selects the Tables, CTEs, or Subqueries graph filter, **Then** the filter returns only nodes in the selected category.
2. **Given** an analysis contains a derived query source, **When** the developer views or exports the graph, **Then** its subquery classification is visible and it is not labeled as a physical table.

### Edge Cases

- A CTE name matches the unqualified portion of a schema-qualified physical table; the two sources remain distinct.
- A recursive CTE refers to itself; it remains a CTE and does not become a physical-table node.
- A CTE is declared but never referenced by the main query; it remains classified correctly without creating duplicate relationships.
- The same source is referenced through multiple aliases; each alias occurrence remains separately visible for relationship accuracy while retaining the resolved classification of the underlying source.
- SQL that cannot be resolved confidently continues to be represented as unresolved rather than being incorrectly presented as a physical table.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST classify every independently represented SQL source as a physical table, CTE, derived subquery, supported view, or unresolved source before it is presented to downstream analysis consumers.
- **FR-002**: The system MUST resolve a reference to a CTE declared in the same query scope as a CTE, regardless of whether that reference has an alias.
- **FR-003**: The system MUST retain aliases as references to their resolved source classification rather than creating an alias source category; distinct alias occurrences in the same query scope MUST remain separately representable when needed to preserve source relationships, including self-joins.
- **FR-004**: The system MUST classify a derived query used as a source as a subquery source rather than as a physical table.
- **FR-005**: The system MUST preserve full schema-qualified source identifiers and classify them independently from similarly named CTEs.
- **FR-006**: The system MUST preserve existing explicit JOIN, comma-style relationship, CTE-dependency, and source-count behavior except where a prior source misclassification caused an incorrect result.
- **FR-007**: The system MUST represent each CTE-to-CTE dependency and each source relationship at most once in the analysis result.
- **FR-008**: The system MUST expose the resolved source classification to every graph and source-list presentation so physical tables, CTEs, and derived subqueries are visually distinguishable.
- **FR-008a**: The relationship graph MUST provide distinct filters for physical tables, CTEs, and derived subqueries, plus an unfiltered view of all source categories.
- **FR-009**: The system MUST classify a direct source reference that is not resolved as a same-query CTE or derived subquery as a physical table; it MUST report malformed or otherwise unresolvable source expressions as unresolved.
- **FR-010**: The system MUST preserve supported recursive CTE behavior by retaining recursive sources as CTEs.

### Key Entities *(include if feature involves data)*

- **SQL Source**: A query input relation independently represented in analysis, with a canonical identifier, display name, resolved classification, optional alias, and optional query scope.
- **CTE Definition**: A named query-local source, its query body, dependencies, usage information, and recursive status.
- **Derived Subquery Source**: A query expression used as a relation in a `FROM` or equivalent source position, represented separately from physical tables.
- **Source Alias**: A local reference name that resolves to an existing SQL Source and is not an independent source entity.
- **Source Relationship**: A deduplicated JOIN, implicit relationship, or CTE dependency between two resolved SQL Sources.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of regression queries containing a physical table and a same-query CTE classify each source correctly, including CTE references with aliases.
- **SC-002**: 100% of regression queries containing derived source queries classify those sources as subqueries rather than physical tables.
- **SC-003**: 100% of tested multi-CTE and recursive-CTE queries preserve their expected dependency relationships with no duplicate source occurrences or duplicate dependency edges; distinct aliases remain separately visible only when they represent distinct query occurrences.
- **SC-004**: 100% of tested schema-qualified physical-table references remain distinguishable from CTEs with matching unqualified names.
- **SC-005**: For supported query sizes of up to 50 sources, analysis completes within 1 second without regressing existing relationship counts for the established regression suite.
- **SC-006**: In usability validation, a developer can identify the category of every displayed source node without relying on the source name alone.
- **SC-007**: 100% of graph-category filter regression tests return only nodes with the selected physical-table, CTE, or derived-subquery classification.

## Assumptions

- The feature applies to the existing query-analysis and relationship-visualization flow; it does not add a new SQL dialect or a new analysis entry point.
- View classification is included only where the existing analysis can establish a view identity without a naming heuristic; otherwise the source remains unresolved or follows the established physical-source behavior.
- Without database catalog or schema metadata, a valid direct source reference that is not a same-query CTE or derived subquery is treated as a physical table; `UNKNOWN` is reserved for malformed or unresolvable source expressions.
- Existing supported dialect behavior for MySQL, PostgreSQL, SQL Server, and Oracle remains in scope and is verified with representative fixtures.
- The existing parser and analysis architecture will be extended minimally; a parser replacement is out of scope unless the current parser cannot provide the required semantic evidence.
- Aliases remain display and resolution metadata, not an independently visualized source category.
- A graph node represents a distinct source occurrence in query scope. Multiple occurrences of the same underlying source may be shown separately when their aliases are needed to preserve relationship meaning, such as a self-join.