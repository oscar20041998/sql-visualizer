# TASK: Fix SQL Source Classification — TABLE vs CTE vs SUBQUERY

You are working on an existing SQL Visualizer application.

Your goal is to improve the SQL analysis and graph-building pipeline so that
the application can correctly distinguish between:

- Physical database tables
- CTEs (Common Table Expressions)
- Derived tables / subqueries
- Views, if supported by the current architecture
- Aliases
- Unknown sources

The primary issue is that CTEs are currently being confused with physical
tables in the generated SQL visualization graph.

This is NOT a UI-only problem.

The classification must be solved at the SQL parsing / semantic analysis /
source-resolution / graph-model layer, while the UI should only render the
semantic type provided by the domain model.

==================================================
# 1. PRIMARY OBJECTIVE
==================================================

Fix the source-resolution algorithm so that SQL sources are classified
according to SQL semantics and scope rather than naming conventions.

For example:

WITH customer_orders AS (
    SELECT
        customer_id,
        COUNT(*) AS order_count
    FROM orders
    GROUP BY customer_id
)
SELECT
    c.customer_id,
    c.order_count
FROM customer_orders c;

The current implementation may incorrectly produce:

orders          -> TABLE
customer_orders -> TABLE

The expected result is:

orders          -> TABLE
customer_orders -> CTE

The system must understand that `customer_orders` is a CTE defined by
the WITH clause and therefore must NOT be treated as a physical table.

==================================================
# 2. IMPORTANT ENGINEERING RULE
==================================================

DO NOT immediately modify code.

First inspect the existing codebase and understand:

1. SQL parser
2. SQL AST representation
3. CTE representation
4. FROM / JOIN extraction
5. Alias handling
6. Table detection logic
7. Source resolution logic
8. Semantic/domain model
9. Graph construction
10. Frontend graph rendering
11. Existing unit tests
12. Existing integration tests

Do not assume the current architecture.

Do not introduce a new architecture unless the existing architecture
cannot support the required behavior.

Prefer a minimal, maintainable and backward-compatible change.

==================================================
# 3. PHASE 1 — CODEBASE INVESTIGATION
==================================================

Before implementation, inspect the repository.

Identify:

- Where SQL is parsed
- Which SQL parser/library is being used
- How the AST is represented
- How WITH / CTE nodes are represented
- How SELECT statements are represented
- How FROM clauses are represented
- How JOIN clauses are represented
- How aliases are represented
- Where physical tables are detected
- Where graph nodes are created
- Where graph edges are created
- Where node types are defined
- How frontend receives source/node types
- Existing tests related to SQL parsing and graph generation

Then produce a concise report:

## Current Flow

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
Frontend Visualization