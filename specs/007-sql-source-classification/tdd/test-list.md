# TDD Test List: SQL Source Classification

Each behavior must complete a red-green-refactor cycle before its paired implementation task is marked complete.

| ID | Layer | Behavior | Traceability |
|----|-------|-----------|--------------|
| S01 | unit | A direct physical table and same-query CTE are classified as `TABLE` and `CTE` across MySQL, PostgreSQL, SQL Server, and Oracle fixtures. | US1-S1, FR-001, FR-002, SC-001 |
| S02 | unit | CTE aliases retain `CTE` classification and distinct aliased occurrences remain separately identifiable. | US1-S2, FR-003 |
| S03 | unit | Self-joined table or CTE aliases produce distinct source-occurrence IDs with the same source type. | US1-S3, FR-003 |
| S04 | unit | Schema-qualified physical identifiers remain intact and are not confused with same-named CTEs. | US1-S4, FR-005, SC-004 |
| S05 | unit | Derived `FROM` sources are classified as `SUBQUERY`, including supported LATERAL/APPLY forms and nested CTE sources. | US2-S1, FR-004, SC-002 |
| S06 | unit | CTE-to-CTE dependencies, recursive CTE references, and CTE-to-table relationships retain their classifications and are emitted once. | US2-S2, US2-S3, FR-006, FR-007, FR-010, SC-003 |
| S07 | unit | Malformed or unresolvable source expressions use `UNKNOWN` instead of an implicit `TABLE`. | Edge Cases, FR-009 |
| S08 | component | Relationship graph filters All, Tables, CTEs, and Subqueries include only matching nodes and edges with visible endpoints. | US3-S1, FR-008a, SC-007 |
| S09 | component | Normal and simplified graph nodes, aliases, and exported labels expose canonical source type and accessible source metadata. | US3-S2, FR-008, SC-006 |
| S10 | unit | Legacy `isCTE` and `isSubquery` compatibility values always agree with canonical `sourceType`. | UI contract, FR-001, FR-008 |
| S11 | unit | Analysis and graph preparation for 50 or more source occurrences completes within the planned one-second regression budget. | SC-005 |

## Planned Test Files

- `tests/unit/sqlSourceClassification.test.ts`: S01-S07, S10-S11
- `tests/unit/relationshipGraphSourceFilter.test.tsx`: S08-S09