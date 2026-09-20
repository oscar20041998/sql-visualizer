# Quickstart Validation: SQL Source Classification

## Prerequisites

- Run commands from the repository root.
- Install the existing dependencies: `npm install`.
- Use Node.js compatible with the project’s existing Next.js 15 setup.

## Automated validation

1. Run focused source-classification tests:

   ```powershell
   npm test -- --run tests/unit/sqlSourceClassification.test.ts
   ```

2. Run relationship graph source-filter tests:

   ```powershell
   npm test -- --run tests/unit/relationshipGraphSourceFilter.test.tsx
   ```

3. Run the full regression suite and type check:

   ```powershell
   npm test
   npm run type-check
   ```

4. Run the project build when the environment supports it:

   ```powershell
   npm run build
   ```

Expected outcome: all tests and the type check pass. The source classification suite covers the four supported dialects. In this environment `dt-sql-parser` was unavailable, so AST cross-check assertions remain an explicit environment limitation and the passing cases use the regex analyzer path. See [data-model.md](./data-model.md) and [source-classification-ui.md](./contracts/source-classification-ui.md) for expected contracts.

## Manual graph validation

1. Start the application:

   ```powershell
   npm run dev
   ```

2. Analyze this query in the existing query input flow:

   ```sql
   WITH customer_orders AS (
     SELECT o.customer_id, o.id
     FROM orders o
   ),
   recent_customers AS (
     SELECT customer_id
     FROM customer_orders
   )
   SELECT c.id
   FROM customers c
   JOIN recent_customers rc ON rc.customer_id = c.id
   JOIN (
     SELECT customer_id
     FROM payments
   ) p ON p.customer_id = c.id;
   ```

3. Open Relationship Graph Visualizer and verify:
   - `orders`, `customers`, and `payments` display as **TABLE**.
   - `customer_orders` and `recent_customers` display as **CTE**.
   - The `p` derived source displays as **SUBQUERY**.
   - The graph has no alias-only semantic type.
   - **All**, **Tables**, **CTEs**, and **Subqueries** filters return only matching nodes and hide edges without two visible endpoints.

4. Analyze a self-join such as `employees manager JOIN employees report` using distinct aliases. Verify both occurrences remain separately visible, both are **TABLE**, and their relationship remains visible.

5. Repeat CTE/table, derived-source, schema-qualified-table, multi-CTE dependency, and recursive-CTE fixtures for MySQL, PostgreSQL, SQL Server, and Oracle. Record unsupported dialect grammar as an explicit test limitation rather than changing expected source type.

Validation note: automated analyzer and graph scenarios passed. Browser-based manual validation was not run in this session; the four-dialect AST oracle remains unavailable until `dt-sql-parser` can be loaded in the test environment.

## Performance validation

Run the 50+-source fixture from the source-classification test suite. Analysis and graph preparation must complete in under one second and retain the existing simplified graph rendering behavior for large node counts.