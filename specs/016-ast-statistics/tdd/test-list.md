---
feature: 016-ast-statistics
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 5
planned_at: 1fc60d0
updated_at: 1fc60d0
suite_baseline: green
---

# Test List: AST Statistics for Advanced Details

## Outer loop: acceptance behaviors

Each acceptance behavior must pass through the dashboard's real data path before it is marked `DONE`.

| id  | behavior                                                                                  | traces                         | layer       | kind    | state    | test                                                                   |
| --- | ----------------------------------------------------------------------------------------- | ------------------------------ | ----------- | ------- | -------- | ---------------------------------------------------------------------- |
| A1  | Advanced Details shows accurate AST structure statistics for each supported dialect.      | SC-001, FR-001, FR-002, FR-003 | component   | example | PENDING  | `tests/unit/sqlMetricsDashboard.test.tsx::shows AST statistics`        |
| A2  | Existing dashboard, analyzer, and query-input behavior remains regression-free.           | SC-002                         | integration | example | BASELINE | `npm test`                                                             |
| A3  | When AST statistics are unavailable, the dashboard remains usable and shows no fake rows. | SC-003, FR-004, FR-006         | component   | example | PENDING  | `tests/unit/sqlMetricsDashboard.test.tsx::keeps dashboard on fallback` |
| A4  | Advanced capability is supported only for a query with computed AST statistics.           | SC-004, FR-007                 | component   | example | PENDING  | `tests/unit/sqlMetricsDashboard.test.tsx::sets capability per query`   |
| A5  | The opt-in AST pass keeps dashboard analysis within the planned latency budget.           | SC-005                         | integration | example | PENDING  | `tests/unit/sqlMetricsDashboard.test.tsx::meets AST timing budget`     |
| A6  | AST statistics labels are available in both English and Vietnamese.                       | FR-008                         | component   | example | PENDING  | `tests/unit/sqlMetricsDashboard.test.tsx::renders both locales`        |

## Inner loop: unit behaviors

### `src/lib/codegen/parseSql.ts`

| id  | behavior                                                                                  | traces             | layer | kind    | state   | test                                                                    |
| --- | ----------------------------------------------------------------------------------------- | ------------------ | ----- | ------- | ------- | ----------------------------------------------------------------------- |
| U1  | Total node count equals the sum of typed AST node counts grouped by node type.            | FR-001, FR-003     | unit  | example | PENDING | `tests/unit/codegen/astStatistics.test.ts::counts typed AST nodes`      |
| U2  | Statement kind comes from the parsed AST.                                                 | FR-001, FR-003     | unit  | example | PENDING | `tests/unit/codegen/astStatistics.test.ts::reports statement kind`      |
| U3  | CTE count includes declarations and depth distinguishes nested WITH scopes from siblings. | FR-003             | unit  | example | PENDING | `tests/unit/codegen/astStatistics.test.ts::counts CTE nesting`          |
| U4  | Subquery depth counts nested query-expression boundaries independently of CTE roots.      | FR-003             | unit  | example | PENDING | `tests/unit/codegen/astStatistics.test.ts::counts subquery depth`       |
| U5  | Operator counts come from AST operator fields rather than SQL text matches.               | FR-001, FR-003     | unit  | example | PENDING | `tests/unit/codegen/astStatistics.test.ts::counts AST operators`        |
| U6  | Function counts include aggregate and window functions from AST function nodes.           | FR-001, FR-003     | unit  | example | PENDING | `tests/unit/codegen/astStatistics.test.ts::counts AST functions`        |
| U7  | Statistics are produced for MySQL, PostgreSQL, and SQL Server ASTs.                       | FR-002, SC-001     | unit  | example | PENDING | `tests/unit/codegen/parseSql.test.ts::computes supported dialect stats` |
| U8  | A successfully produced AST still supplies statistics when normalized fields are partial. | FR-001, FR-003     | unit  | example | PENDING | `tests/unit/codegen/parseSql.test.ts::keeps stats for partial model`    |
| U9  | Oracle, invalid, empty, and comment-only SQL produce unavailable statistics.              | FR-004, FR-006, I1 | unit  | example | PENDING | `tests/unit/codegen/parseSql.test.ts::returns unavailable stats`        |
| U10 | Multiple AST roots do not report statistics for only the first statement.                 | I2                 | unit  | example | PENDING | `tests/unit/codegen/parseSql.test.ts::rejects multiple roots for stats` |

### `src/lib/sql/dashboard/buildDashboardData.ts`

| id  | behavior                                                                             | traces         | layer | kind    | state   | test                                                                     |
| --- | ------------------------------------------------------------------------------------ | -------------- | ----- | ------- | ------- | ------------------------------------------------------------------------ |
| U11 | The adapter deterministically projects supplied statistics without parsing SQL.      | FR-005         | unit  | example | PENDING | `tests/unit/dashboardData.test.ts::projects supplied AST statistics`     |
| U12 | Missing statistics set advanced capability to partial and keep AST rows unavailable. | FR-004, FR-007 | unit  | example | PENDING | `tests/unit/dashboardData.test.ts::keeps advanced partial without stats` |

### `src/app/sql-metrics-dashboard/components/AdvancedDetails.tsx`

| id  | behavior                                                                                     | traces         | layer     | kind    | state   | test                                                                  |
| --- | -------------------------------------------------------------------------------------------- | -------------- | --------- | ------- | ------- | --------------------------------------------------------------------- |
| U13 | Statistics rows render only when statistics exist; fallback renders no numeric placeholders. | FR-004, SC-003 | component | example | PENDING | `tests/unit/sqlMetricsDashboard.test.tsx::omits unavailable AST rows` |
| U14 | Every new statistics label renders correctly in English and Vietnamese.                      | FR-008         | component | example | PENDING | `tests/unit/sqlMetricsDashboard.test.tsx::localizes AST statistics`   |

### `src/app/sql-metrics-dashboard/components/MetricsDashboardContent.tsx`

| id  | behavior                                                                                 | traces | layer     | kind    | state   | test                                                                     |
| --- | ---------------------------------------------------------------------------------------- | ------ | --------- | ------- | ------- | ------------------------------------------------------------------------ |
| U15 | MyBatis statistics describe resolved SQL rather than the XML input.                      | I3     | component | example | PENDING | `tests/unit/sqlMetricsDashboard.test.tsx::uses resolved MyBatis SQL`     |
| U16 | Changing the analyzed SQL or dialect does not retain statistics from the previous query. | FR-007 | component | example | PENDING | `tests/unit/sqlMetricsDashboard.test.tsx::clears stale query statistics` |

## Invariants and edge cases still to place

- **I1**: Oracle and dialects without a grammar always have unavailable statistics; empty/comment-only and unparsable inputs also remain unavailable. Source: FR-004, FR-006, and the spec's Edge Cases.
- **I2**: If the parser returns multiple statement roots, statistics are unavailable rather than representing only the first root. Source: the single-root decision in `plan.md`.
- **I3**: MyBatis XML is normalized to resolved SQL before statistics are computed. Source: the spec's Edge Cases.

## Out of scope

- Oracle AST statistics: no grammar exists; verify the unavailable state instead.
- Replacing regex analysis or changing its existing metrics: this feature only adds AST statistics to Advanced Details.
- Browser E2E automation: the TDD profile records Vitest/jsdom and no acceptance/browser runner; the browser scenarios remain manual checks in `quickstart.md`.
- Mutation and property-based tools are unavailable/unverified in the profile. Use example tests; during the TDD run, apply deliberate mutants to the highest-risk statistics and fallback behaviors as required by the installed playbook.

## Verification commands

Copied from `.specify/memory/tdd-profile.md`:

- Single test: `npx vitest run {file} -t "{name}"`
- File: `npx vitest run {file}`
- Full suite: `npm test`
- Watch: `npx vitest`

## Baseline

- Suite: `npm test` -> 58 files passed, 492 tests passed, 0 failed.
- Recorded at: `1fc60d0`.
- Note: test output included a non-fatal Mermaid render warning; Vitest still exited successfully with all tests passing.
