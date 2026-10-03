# Advanced Details AST Statistics Contract

## Boundary

This is an internal dashboard data/UI contract. It adds no network endpoint or persisted schema. The caller supplies a precomputed `AstStatistics | null` value to `buildDashboardData`; the adapter remains deterministic and must not invoke a parser.

## Data Contract

When available, statistics contain:

- Total AST node count and counts grouped by parser node type.
- Parsed statement kind.
- CTE count and maximum CTE nesting depth.
- Maximum subquery depth.
- Operator and function counts grouped by normalized token/name.

`totalNodeCount` must equal the sum of all node-type counts. Counts are derived only from the AST returned by the existing `node-sql-parser` pipeline. The raw AST is not exposed to UI components.

## Availability Contract

- One AST root from a supported grammar produces statistics, including when normalized fields are partial.
- Oracle, unsupported dialects, empty/comment-only SQL, parse failures, and multiple AST roots produce `null` statistics.
- Unavailable statistics are represented by `astStatisticsAvailable: false`; numeric statistic rows are omitted, not rendered as zeros or estimates.
- `capabilities.advanced` is `supported` only for a query with statistics; otherwise it is `partial`.
- `advanced.parser.engine` remains `regex` for existing analyzer facts.

## UI and Localization Contract

`AdvancedDetails` renders statistic rows only when `advanced.astStatistics` is non-null. All new row labels and availability text must be present in both `src/locales/en.ts` and `src/locales/vi.ts`. Existing dashboard content and its usability are unchanged when statistics are unavailable.

## Source and Test Ownership

- AST extraction: `src/lib/codegen/parseSql.ts` and its parser tests.
- Data projection and capability: `src/lib/sql/dashboard/buildDashboardData.ts` and dashboard unit tests.
- Presentation and localization: `src/app/sql-metrics-dashboard/components/AdvancedDetails.tsx` and locale modules.
