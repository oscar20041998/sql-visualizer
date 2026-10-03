# Prompt: Fix SQL Source Classification — TABLE vs CTE vs SUBQUERY

## Role

Act as a senior software engineer specializing in SQL parsing, AST/semantic analysis, symbol resolution, graph modeling, TDD, and safe refactoring of existing codebases.

You are working on an existing SQL Visualizer application.

Your goal is to fix incorrect classification of SQL sources, especially the confusion between physical database tables and CTEs.

---

# 1. Objective

Improve the SQL analysis pipeline so it correctly distinguishes:

- `TABLE` — physical database table
- `CTE` — Common Table Expression
- `SUBQUERY` — derived table / nested query
- `VIEW` — if supported by the current architecture
- `UNKNOWN` — unresolved source
- `ALIAS` — reference to another source, not an independent source node

Example:

```sql
WITH customer_orders AS (
    SELECT *
    FROM orders
)
SELECT *
FROM customer_orders;
```

Expected:

```text
orders          -> TABLE
customer_orders -> CTE
```

Incorrect:

```text
orders          -> TABLE
customer_orders -> TABLE
```

The fix must be semantic, not merely a UI styling change.

---

# 2. Critical Rule

DO NOT start coding immediately.

First inspect the existing codebase and understand:

1. SQL parser/library
2. AST representation
3. CTE representation
4. SELECT representation
5. FROM/JOIN extraction
6. Alias handling
7. Table detection
8. Source resolution
9. Semantic/domain model
10. Graph construction
11. Frontend rendering
12. Existing tests

Do not assume the architecture.

Do not rewrite the parser unless absolutely necessary.

Prefer a minimal, maintainable, backward-compatible change.

---

# 3. Required Workflow

Follow:

```text
INVESTIGATE
    ↓
UNDERSTAND
    ↓
DEFINE SEMANTIC MODEL
    ↓
DESIGN
    ↓
WRITE TESTS
    ↓
IMPLEMENT
    ↓
REFACTOR
    ↓
VERIFY
```

---

# 4. Phase 1 — Investigation

Inspect the repository and identify:

- Parser entry point
- AST model
- CTE extraction
- FROM/JOIN extraction
- Alias handling
- Table detection
- Source resolution
- Graph node creation
- Graph edge creation
- Node type definitions
- Frontend rendering
- Existing tests

Document the actual flow:

```text
SQL
 ↓
Parser
 ↓
AST
 ↓
Semantic Analysis
 ↓
Source Resolution
 ↓
Graph Model
 ↓
Frontend
```

Then provide:

### Current Architecture

Explain the real implementation.

### Root Cause

Identify exactly why a CTE can currently be classified as a TABLE.

Reference actual files/classes/methods/functions. Do not guess.

---

# 5. Phase 2 — Semantic Model

Prefer existing models when possible.

Conceptually:

```text
SqlSourceType
├── TABLE
├── CTE
├── SUBQUERY
├── VIEW
└── UNKNOWN
```

Aliases are not independent source types.

For:

```sql
FROM customer_orders co
```

resolve:

```text
source = customer_orders
type   = CTE
alias  = co
```

Do not create:

```text
customer_orders -> TABLE
co              -> TABLE
```

---

# 6. CTE Registration and Scope

For:

```sql
WITH customer_orders AS (
    SELECT *
    FROM orders
)
```

register:

```text
customer_orders -> CTE
```

in the appropriate query scope before resolving references.

Do not globally register CTE names as physical tables.

CTEs are scoped to their SQL statement/query context.

---

# 7. Source Resolution

For each `FROM` / `JOIN` source, resolve using semantic structure and scope.

Preferred conceptual order:

```text
1. Current-scope CTE
2. Valid parent-scope CTE, if supported
3. Derived table / subquery
4. Known view
5. Physical table
6. Unknown
```

Conceptually:

```text
resolveSource(source, scope):

    if source is a derived table:
        return SUBQUERY

    if scope contains source as CTE:
        return CTE

    if source is a known VIEW:
        return VIEW

    if source is a known physical TABLE:
        return TABLE

    return UNKNOWN
```

Use the actual parser/architecture of the project.

---

# 8. Forbidden Approaches

Never use naming-based heuristics such as:

```text
name.contains("cte")
name.startsWith("cte_")
```

A CTE may be named:

```text
customers
orders
data
result
summary
```

Classification must come from SQL structure and semantic scope.

---

# 9. CTE Dependencies

Support chained CTEs:

```sql
WITH orders_base AS (
    SELECT *
    FROM orders
),
customer_summary AS (
    SELECT customer_id, COUNT(*) AS total_orders
    FROM orders_base
    GROUP BY customer_id
)
SELECT *
FROM customer_summary;
```

Expected:

```text
orders           -> TABLE
orders_base      -> CTE
customer_summary -> CTE
```

Dependency:

```text
orders
   ↓
orders_base
   ↓
customer_summary
```

Do not create TABLE nodes for the CTEs.

---

# 10. CTE Aliases

Support:

```sql
WITH customer_orders AS (
    SELECT *
    FROM orders
)
SELECT *
FROM customer_orders co
JOIN customers c
    ON co.customer_id = c.id;
```

Expected:

```text
orders          -> TABLE
customer_orders -> CTE
customers       -> TABLE

co -> alias/reference to customer_orders
c  -> alias/reference to customers
```

Aliases must resolve to their underlying semantic source.

---

# 11. Recursive CTE

If supported by the current parser, support:

```sql
WITH RECURSIVE employee_tree AS (
    SELECT id, manager_id
    FROM employees

    UNION ALL

    SELECT e.id, e.manager_id
    FROM employees e
    JOIN employee_tree et
        ON e.manager_id = et.id
)
SELECT *
FROM employee_tree;
```

Expected:

```text
employees     -> TABLE
employee_tree -> CTE
```

If the parser cannot reliably support recursive CTEs, document the limitation instead of creating a fragile workaround.

---

# 12. Derived Tables / Subqueries

Support:

```sql
SELECT *
FROM (
    SELECT *
    FROM orders
) recent_orders;
```

Expected:

```text
orders        -> TABLE
recent_orders -> SUBQUERY
```

Do not classify `recent_orders` as TABLE.

---

# 13. Qualified Tables

Preserve schema-qualified tables:

```sql
WITH customer_orders AS (
    SELECT *
    FROM sales.orders
)
SELECT *
FROM customer_orders;
```

Expected:

```text
sales.orders    -> TABLE
customer_orders -> CTE
```

Do not break existing schema/catalog/database handling.

---

# 14. Graph Model

The graph builder must consume the resolved semantic type.

Example:

```json
{
  "name": "customer_orders",
  "type": "CTE"
}
```

The frontend must not infer semantic type from the name.

The semantic/domain layer determines:

```text
TABLE
CTE
SUBQUERY
VIEW
UNKNOWN
```

The frontend renders the result.

---

# 15. UI Requirement

TABLE and CTE must be visually distinguishable.

Follow the existing design system.

For example:

```text
TABLE
- database/table icon
- existing table styling

CTE
- query/CTE icon
- distinct styling
- explicit CTE label

SUBQUERY
- derived-query styling
```

Do not redesign unrelated UI.

---

# 16. TDD Test Requirements

Create tests for at least:

### Test 1 — Simple CTE

```sql
WITH customer_orders AS (
    SELECT *
    FROM orders
)
SELECT *
FROM customer_orders;
```

Expected:

```text
orders          -> TABLE
customer_orders -> CTE
```

### Test 2 — CTE + Physical Table

```sql
WITH customer_orders AS (
    SELECT *
    FROM orders
)
SELECT *
FROM customer_orders
JOIN customers
    ON customer_orders.customer_id = customers.id;
```

Expected:

```text
orders          -> TABLE
customer_orders -> CTE
customers       -> TABLE
```

### Test 3 — Multiple CTEs

```sql
WITH a AS (
    SELECT *
    FROM orders
),
b AS (
    SELECT *
    FROM a
)
SELECT *
FROM b;
```

Expected:

```text
orders -> TABLE
a      -> CTE
b      -> CTE
```

### Test 4 — CTE Alias

```sql
WITH customer_orders AS (
    SELECT *
    FROM orders
)
SELECT *
FROM customer_orders co;
```

Expected:

```text
customer_orders -> CTE
co              -> alias/reference
orders          -> TABLE
```

### Test 5 — Derived Table

```sql
SELECT *
FROM (
    SELECT *
    FROM orders
) recent_orders;
```

Expected:

```text
orders        -> TABLE
recent_orders -> SUBQUERY
```

### Test 6 — CTE + Alias + JOIN

```sql
WITH customer_orders AS (
    SELECT *
    FROM orders
)
SELECT *
FROM customer_orders co
JOIN customers c
    ON co.customer_id = c.id;
```

Expected:

```text
orders          -> TABLE
customer_orders -> CTE
customers       -> TABLE
co              -> alias of customer_orders
c               -> alias of customers
```

### Test 7 — Recursive CTE

If supported:

```sql
WITH RECURSIVE employee_tree AS (
    SELECT id, manager_id
    FROM employees

    UNION ALL

    SELECT e.id, e.manager_id
    FROM employees e
    JOIN employee_tree et
        ON e.manager_id = et.id
)
SELECT *
FROM employee_tree;
```

Expected:

```text
employees     -> TABLE
employee_tree -> CTE
```

### Test 8 — Schema Qualified Table

```sql
WITH customer_orders AS (
    SELECT *
    FROM sales.orders
)
SELECT *
FROM customer_orders;
```

Expected:

```text
sales.orders    -> TABLE
customer_orders -> CTE
```

---

# 17. Regression Testing

Before implementation:

1. Run existing tests.
2. Identify parser tests.
3. Identify semantic-analysis tests.
4. Identify graph-generation tests.
5. Identify frontend rendering tests.

After implementation:

1. Run all existing tests.
2. Run all new CTE tests.
3. Run regression tests.
4. Verify TABLE behavior.
5. Verify JOIN behavior.
6. Verify aliases.
7. Verify nested queries.
8. Verify schema-qualified tables.

Never remove an existing test simply to make the implementation pass.

---

# 18. Performance

Avoid repeatedly traversing the entire AST.

Prefer:

```text
Parse SQL
    ↓
Build semantic context
    ↓
Register CTEs
    ↓
Resolve sources
    ↓
Build graph
```

Use symbol tables, maps, sets, scopes, or memoization where justified.

Do not introduce premature optimization.

---

# 19. Backward Compatibility

Preserve existing behavior for:

- Simple tables
- Schema-qualified tables
- JOINs
- Multiple JOINs
- Aliases
- Nested SELECTs
- Existing SQL dialects
- Existing graph relationships
- Existing frontend behavior

Only change behavior where the current classification is semantically incorrect.

---

# 20. Implementation Constraints

1. Reuse the existing SQL parser.
2. Reuse existing domain models where possible.
3. Do not rewrite the entire parser.
4. Do not solve semantic classification only in the UI.
5. Do not use naming heuristics.
6. Do not introduce unnecessary dependencies.
7. Keep the change backward-compatible.
8. Keep the implementation testable.
9. Separate parsing, semantic resolution, graph construction, and rendering.
10. Keep the change focused on this problem.
11. Do not modify unrelated functionality.

---

# 21. Required Execution Order

## Phase A — Investigation

```text
Inspect repository
    ↓
Understand parser
    ↓
Understand AST
    ↓
Understand source resolution
    ↓
Identify root cause
```

## Phase B — Design

```text
Define semantic types
    ↓
Define CTE scope
    ↓
Define source resolution
    ↓
Define graph behavior
```

## Phase C — TDD

```text
Write failing tests
    ↓
RED
```

## Phase D — Implementation

```text
Implement minimal solution
    ↓
GREEN
```

## Phase E — Refactor

```text
Improve design
    ↓
Remove duplication
    ↓
Improve readability
```

## Phase F — Verification

```text
Unit tests
    ↓
Integration tests
    ↓
Regression tests
    ↓
Graph verification
    ↓
Final review
```

---

# 22. Stop Before Coding

Before modifying code, provide:

## Investigation Result

### Current Architecture
Explain the real data flow.

### Root Cause
Identify exactly why TABLE and CTE are confused.

### Proposed Solution
Explain the semantic-resolution approach.

### Files To Change
List expected files/modules and why.

### Test Plan
List tests to add or modify.

### Impact Analysis
Identify possible regression areas.

### Risks
Explain parser/dialect limitations.

Only after this analysis should implementation begin.

---

# 23. Acceptance Criteria

The implementation is complete only when:

- [ ] CTEs are classified as `CTE`.
- [ ] Physical tables remain `TABLE`.
- [ ] Derived tables are classified as `SUBQUERY`.
- [ ] Views are classified correctly if supported.
- [ ] Aliases do not create duplicate source nodes.
- [ ] CTE aliases resolve correctly.
- [ ] Multiple CTEs work.
- [ ] CTE-to-CTE dependencies work.
- [ ] Recursive CTEs work if supported.
- [ ] Schema-qualified tables still work.
- [ ] Existing JOIN behavior is preserved.
- [ ] Existing SQL behavior is preserved.
- [ ] Unit tests cover classification.
- [ ] Regression tests pass.
- [ ] TABLE and CTE are visually distinguishable.
- [ ] Classification happens in the semantic/domain layer.
- [ ] No naming-based heuristic is introduced.
- [ ] No unnecessary parser rewrite is introduced.
- [ ] No unnecessary dependency is introduced.
- [ ] Performance remains acceptable.

---

# 24. Final Report

After implementation, provide:

## Root Cause
What caused the classification bug?

## Solution
What changed?

## Architecture
Where does source classification now happen?

## Tests
What tests were added?

## Regression
Did all existing tests pass?

## Files Changed
List modified files and their purpose.

## Limitations
List unsupported SQL dialect/parser cases.

## Example Result

For:

```sql
WITH customer_orders AS (
    SELECT *
    FROM orders
)
SELECT *
FROM customer_orders;
```

the semantic graph should be:

```text
┌───────────────┐
│ orders        │
│ TYPE: TABLE   │
└───────┬───────┘
        │
        ▼
┌──────────────────────┐
│ customer_orders      │
│ TYPE: CTE            │
└──────────────────────┘
```

---

# Final Principle

The objective is NOT merely to change the color or icon of CTE nodes.

The objective is to make SQL Visualizer semantically understand:

```text
TABLE
CTE
SUBQUERY
VIEW
ALIAS
UNKNOWN
```

The visualization must represent the semantic model.

Priorities:

1. Semantic correctness
2. Backward compatibility
3. Maintainability
4. Testability
5. Performance

Do not sacrifice semantic correctness for a quick UI fix.
