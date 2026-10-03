# Quickstart: AST Statistics for Advanced Details

## Prerequisites

- Node.js and npm supported by the repository.
- Dependencies installed with `npm install`.
- Run commands from the repository root.

## Automated Validation

Run the focused parser and dashboard tests:

```powershell
npm test -- tests/unit/codegen/parseSql.test.ts tests/unit/dashboardData.test.ts tests/unit/dashboardCapability.test.ts
```

Run type validation and the production build:

```powershell
npm run type-check
npm run build
```

The parser tests must cover MySQL, PostgreSQL, and SQL Server ASTs, including nested CTEs, a subquery, grouping, joins, operators, functions, and a window function. They must also prove unavailable results for Oracle, invalid/empty/comment-only SQL, and multiple AST roots. Dashboard tests must prove availability/capability mapping and no numeric placeholders on fallback.

## Browser Scenarios

1. Analyze a supported PostgreSQL or MySQL query with nested CTEs, a window function, a join, and grouping; open Advanced Details and confirm real node, depth, operator, and function counts are shown.
2. Analyze an Oracle query; confirm the dashboard remains usable, AST statistics are marked unavailable, and no AST numeric rows are rendered.
3. Analyze SQL rejected by `node-sql-parser` but tolerated by regex analysis; confirm existing dashboard metrics remain visible and advanced capability is `partial`.
4. Analyze MyBatis XML with parameters resolved; confirm any statistics describe the resolved SQL passed to `analyzeSql`, not the XML text.
5. Change SQL or dialect and confirm statistics from the previous input are not retained.

## Performance Check

Measure the opt-in parser/statistics pass on the existing code-generation fixtures and a representative query with more than 50 tables. Confirm the dashboard path remains within the constitution's 1-second analysis budget and that AST work is not added to the editor's general `analyzeSql` path.
