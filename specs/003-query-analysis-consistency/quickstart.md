# Quickstart: Validating Query Analysis Correctness & Output Consistency

This guide describes how to manually and automatically verify the feature once
implemented. See [data-model.md](./data-model.md) for the `AnalysisResult` contract
and [research.md](./research.md) for the regression bug matrix being guarded against.

## Prerequisites

- Dev server running: `npm run dev` (default port from `next.config.mjs`)
- Test suite runnable: `npm test` (Vitest)

## Automated validation

1. Run the full unit/regression suite:

   ```powershell
   npm test
   ```

   Expect the existing `sqlAnalyzer`-related test files plus any new regression
   fixtures added for this feature (per the R2 bug matrix in research.md) to pass,
   with **zero** reductions in previously-passing assertions.

   The regression suite must also compare regex extraction with `dt-sql-parser`
   AST results for every supported dialect fixture; unsupported grammar cases must
   produce an explicit documented limitation and a dialect-specific test.

2. Run type checking (existing project convention — catches issues `get_errors`
   alone does not, per repo memory notes):

   ```powershell
   npx tsc --noEmit
   ```

## Manual end-to-end validation

1. Navigate to `/query-input`.
2. For each of the following representative queries (one per supported dialect —
   MySQL, PostgreSQL, SQL Server, Oracle), paste it, select the matching dialect, and
   click **Analyze**:
   - A query with an unaliased table immediately followed by another `JOIN`.
   - A comma-style join query with quoted/bracketed multi-segment names
     (e.g. `[MyDb].[dbo].[Customers]`, `"public"."orders"`).
   - A query with a derived table (`FROM (SELECT ...) x JOIN ...`).
   - A multi-CTE query where two CTEs are connected by both an explicit JOIN and an
     implicit reference.
3. After each Analyze, confirm on the **Metrics Dashboard**:
   - The referenced tables count matches manual inspection of the query.
   - The joins/relationships metric (`totalJoinCount`) matches manual inspection,
     with no double-counted CTE pairs.
    - The subquery count includes scalar, `IN`, `EXISTS`, derived, and
       `LATERAL/APPLY` forms; CTE count remains separate.
    - The maximum depth and each subquery's depth follow top-level = 1 semantics.
    - Each detected subquery shows a source line; activating it opens Smart SQL
       Editor at the matching line from the original SQL, including blank lines and
       comments. The parsed line may differ and is retained for diagnostics.
4. Navigate to **Relationship Graph Visualizer** for the same analyzed query and
   confirm the "all" relationship-filter count matches the Metrics Dashboard's count
   exactly.
5. Navigate to **CTE Analysis** for the same analyzed query and confirm the CTE count
   matches the number of CTEs actually defined in the query.
6. Repeat steps 2-5 for edge cases:
   - Empty query → expect a specific "enter a query" message, no navigation away.
   - Deliberately malformed query (e.g. unbalanced parens) → expect a specific parse
     error, not a partial/misleading result.
   - Query written in PostgreSQL syntax with **MySQL** selected as the dialect →
     expect a dialect-mismatch message naming both the detected and selected dialect.
   - A simple query with no JOINs and no CTEs → expect a clear zero-state (not an
     error-looking empty view) on all three consumer pages.
7. Re-analyze a second, different query without reloading the app; confirm all three
   consumer pages fully replace the previous query's numbers (no stale data left over
   from the prior analysis).

8. Validate a focused nested-subquery fixture containing a scalar subquery, `IN`,
   `EXISTS`, a derived table, a `LATERAL/APPLY` form where supported, and a nested
   SELECT inside a CTE. Confirm every form appears once in the canonical detail list,
   derived tables also appear as graph `Table Reference` nodes, and relationships are
   not duplicated.

9. Validate **Complexity Factors Breakdown** on the same analyzed query:
    - Confirm the gauge total/max values and breakdown total/max context use the same
       `DetailedComplexityScore`.
    - Confirm every displayed factor has a localized label, formula/count, raw
       contribution, and percentage; keyword JOIN scoring appears exactly once.
    - Confirm displayed contributions sum to the total score, and the subquery count
       matches `analysisResult.metrics.subqueryCount` with wrapper parentheses and
       nested CTE bodies.
    - Re-analyze a simple query with no CTEs, joins, subqueries, or window functions
       and confirm explicit zero factors are shown rather than an error state.

## Expected outcome

All manual scenarios above produce table/relationship/CTE counts that are (a)
correct per manual inspection of the query text, and (b) identical across all three
consumer pages for the same analyzed query — satisfying SC-001 through SC-005 in
[spec.md](./spec.md).
