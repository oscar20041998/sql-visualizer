# TDD Cycle Log: SQL Source Classification

## S01: Table and CTE classification

- RED: `npx vitest run tests/unit/sqlSourceClassification.test.ts -t "classifies physical tables and same-query CTEs"` failed in all four dialect cases because `sourceType` was absent.
- GREEN: Added `SqlSourceType`, initialized extracted and graph-created nodes, and derived compatibility flags.
- GREEN result: Four dialect cases passed.
- Refactor: Kept source-type normalization in `setSourceType`.

## S02-S04: Alias occurrences and qualified tables

- RED: The self-join case found one `customer_orders` node instead of two; the qualified-table case already passed.
- GREEN: Keyed extracted occurrences by source plus alias, generated alias-safe IDs, and preferred alias lookup for JOIN endpoints.
- GREEN result: Alias and schema-qualified cases passed.

## S05-S06: Derived sources and CTE dependencies

- RED: No red was required because existing derived-table and dependency paths passed the newly added focused cases after canonical normalization.
- GREEN result: Derived source classification and single dependency edge cases passed.
- Note: These behaviors were already present in the repository and are recorded as characterization coverage.

## S08-S10: Graph filters, exports, and compatibility

- RED: No red was required for helper behavior because the new helpers encode the specified contract directly and existing graph code had no test seam.
- GREEN: Added canonical filter helpers, Subqueries filter, source-type export labels, and accessible normal/simplified node labels; compatibility assertions pass.

## S11: Performance

- GREEN result: The 55-source regression completed under one second in the focused suite.

## Validation baseline

- `npm test`: 11 files passed, 48 tests passed.
- `npm run type-check`: passed.
- `npm run build`: passed; Next reported pre-existing configuration deprecation warnings.
- AST limitation: `dt-sql-parser` was unavailable in this environment, so AST oracle assertions could not run.