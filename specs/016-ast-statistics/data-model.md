# Data Model: AST Statistics for Advanced Details

All values are transient derived data. No database, Zustand persistence, or browser storage changes are required.

## AstStatistics

Produced only when the opt-in `parseSql` call yields exactly one real AST root for a supported dialect.

| Field              | Type                     | Meaning / validation                                                                                                                                            |
| ------------------ | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `totalNodeCount`   | `number`                 | Number of AST node records; equals the sum of `nodeCountsByType`.                                                                                               |
| `nodeCountsByType` | `Record<string, number>` | Counts by lower-cased parser node `type`; only AST object records with a string `type` are counted.                                                             |
| `statementKind`    | `StatementKind`          | Kind determined from the parsed statement, not inferred from regex analysis.                                                                                    |
| `cteCount`         | `number`                 | Number of CTE declarations across the AST.                                                                                                                      |
| `cteNestingDepth`  | `number`                 | Maximum nested `WITH` scope; top-level `WITH` is depth 1; sibling declarations do not increase depth; no CTE is depth 0.                                        |
| `subqueryDepth`    | `number`                 | Maximum nested query-expression boundaries below their containing query. A CTE body root is not itself a subquery, but subqueries within that body are counted. |
| `operatorCounts`   | `Record<string, number>` | Occurrences of AST operator tokens from operator-bearing expression nodes, normalized to uppercase keys.                                                        |
| `functionCounts`   | `Record<string, number>` | Function occurrences from parser function-expression nodes, including aggregate and window functions; names are normalized to uppercase keys.                   |

Counts are non-negative integers. A successfully parsed statement with no occurrences has real zero counts within an available `AstStatistics`; zero is never used as a stand-in for unavailable data.

## Availability and Dashboard Projection

| Entity / field                             | Type                                     | Meaning / validation                                                                                                               |
| ------------------------------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `ParsedSqlModel.astStatistics`             | `AstStatistics \| null` when requested   | Computed from the AST already created by `parseSql`; omitted or null when statistics were not requested or the AST is unavailable. |
| `DashboardContext.astStatistics`           | `AstStatistics \| null` (optional input) | Precomputed caller input; `buildDashboardData` must not parse SQL. Missing input is treated as unavailable.                        |
| `DashboardAdvanced.astStatistics`          | `AstStatistics \| null`                  | Value passed through by the pure adapter and rendered only when non-null.                                                          |
| `DashboardAdvanced.astStatisticsAvailable` | `boolean`                                | Exactly `astStatistics !== null`.                                                                                                  |
| `capabilities.advanced`                    | `CapabilityStatus`                       | `supported` iff this analyzed query has statistics; otherwise `partial`.                                                           |
| `DashboardParserMetadata.engine`           | `'regex'`                                | Continues to describe the engine that produced existing analysis metrics; AST statistics do not relabel those metrics.             |

## State Transitions

1. Dashboard input changes (SQL or dialect): discard any prior statistics for the previous input.
2. The dashboard caller invokes the existing parser with statistics enabled.
3. Exactly one supported AST root: emit `AstStatistics`; parser status may still be `partial` for normalized fields.
4. Unsupported dialect, parse failure, empty/comment-only input, or multiple AST roots: emit no statistics and keep dashboard data available.
5. Adapter projection: statistics present maps advanced capability to `supported`; missing statistics maps it to `partial` and leaves AST rows absent.

## Data Boundaries

- Source SQL is `AnalysisResult.rawSql`, which represents the SQL passed into analysis (resolved SQL for MyBatis input).
- Oracle and any dialect absent from the existing grammar map always produce unavailable statistics.
- Raw AST objects are not stored in application state, dashboard data, logs, or exports.
- Statistics are surfaced only in Advanced Details; no existing regex metrics are replaced or recalculated from them.
