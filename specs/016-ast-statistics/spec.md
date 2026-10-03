# Feature Specification: AST Statistics for Advanced Details

**Feature Branch**: `016-ast-statistics`

**Created**: 2026-10-03

**Status**: Draft

**Input**: Follow-up to `specs/010-sql-intelligence-dashboard` FR-027. That spec scoped the Advanced
Details section to "only data the analyzer actually produces", leaving AST statistics marked
unavailable. Parser/analyzer metadata has since been delivered (phase A, below). This spec covers the
remaining gap: **real AST statistics**.

## Why This Is a Separate Feature

Phase A (shipped) made the Advanced Details section honest by reporting what the regex engine really
is and how it is configured:

| Field                                                | Source                                                         |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| `engine`                                             | literal `regex` — the analyzer has no AST path today           |
| `dialect`                                            | `AnalysisResult.dialect`                                       |
| `keywordCount` / `patternCount`                      | `SQL_KEYWORDS.size` / `Object.keys(SQL_REGEX_PATTERNS).length` |
| `limits.maxColumns` / `limits.maxCteFieldReferences` | `SQL_ANALYZER_LIMITS`                                          |

What it deliberately did **not** do is fabricate AST statistics. `DashboardAdvanced.astStatisticsAvailable`
is still `false` and the section is honestly marked `partial`. Computing real AST statistics is a
materially different piece of work — it changes the parsing path, not the presentation — so it is scoped
here rather than folded into the metadata work.

## Current State (verified)

- `src/lib/sql/sqlAnalyzer.ts` parses with **regex** (`SQL_REGEX_PATTERNS`). It previously held a dead
  `require('dt-sql-parser')` whose result was never read; it has been removed.
- A **working AST pipeline already exists**: `src/lib/codegen/parseSql.ts` (feature 015) uses
  `node-sql-parser`'s `new Parser().astify(sql, { database: grammar })` and returns a normalized
  `ParsedSqlModel` with `parseStatus`, `diagnostics` and `statementKind`, multi-dialect via
  `GRAMMAR_BY_DIALECT`.
- `node-sql-parser` has **no Oracle grammar**, so Oracle cannot be AST-parsed today.

## Clarifications

- **Reuse, do not re-parse.** Read the existing `codegen/parseSql.ts` pipeline rather than introducing a
  second parser. `buildDashboardData.ts` is a pure adapter (U18 / FR-026 — no parsing, deterministic), so
  AST work must happen **upstream of** it, never inside it.
- **Fallback is mandatory.** `node-sql-parser` is strict and does not cover Oracle/T-SQL constructs the
  regex engine tolerates. A failed AST parse must degrade to "AST statistics unavailable", never break the
  dashboard.

### Session 2026-10-03

- Q: Should Advanced Details capability status be calculated for each analyzed query, or should it indicate feature-wide support even when the current query cannot be AST-parsed? → A: Per query: `supported` only when AST statistics were computed; otherwise `partial`.

## User Scenarios

### User Story 1 - A power user can see how complex a query actually is (Priority: P1)

As a developer triaging a slow query, I open Advanced Details and see real structural facts about the
statement — how many AST nodes it contains, how deeply subqueries and CTEs nest, how many grouping and
join operations appear — so I can tell a genuinely complex query from a merely long one.

**Independent Test**: Analyze a query with two nested CTEs and a window function; open Advanced Details and
confirm node counts, nesting depth and operation counts match the statement.

### User Story 2 - The section never invents data (Priority: P1)

As a developer, if AST statistics cannot be computed for my statement, I am told so explicitly rather than
shown a zero or an estimate.

**Independent Test**: Analyze an Oracle statement; confirm `astStatisticsAvailable` is false, the AST rows
are absent, and no numeric placeholder is rendered.

## Functional Requirements

- **FR-001**: AST statistics MUST be computed from a real parsed AST, never estimated or inferred from
  regex matches.
- **FR-002**: The system MUST reuse the existing `node-sql-parser` pipeline in
  `src/lib/codegen/parseSql.ts`; it MUST NOT introduce a second SQL parser.
- **FR-003**: Statistics MUST cover, at minimum: total node count, node counts grouped by node type,
  statement kind, CTE count and nesting depth, subquery depth, and operator/function counts.
- **FR-004**: When the AST cannot be produced (unsupported dialect, unparsable statement), the system MUST
  degrade to `astStatisticsAvailable: false` and MUST NOT block or alter the rest of the dashboard.
- **FR-005**: Parsing MUST NOT be introduced inside `buildDashboardData.ts`; that adapter stays a pure,
  deterministic function of its input (preserves U18 / FR-026).
- **FR-006**: Oracle MUST be reported as unsupported until a grammar exists — never silently approximated.
- **FR-007**: `capabilities.advanced` MUST be calculated per analyzed statement: it is `supported` only when
  AST statistics are computed for that statement, and `partial` otherwise.
- **FR-008**: Every new user-facing string MUST exist in both `en` and `vi` (SC-012 parity).

## Edge Cases

- MyBatis XML input (normalized to SQL before analysis) — statistics must describe the resolved SQL.
- Empty or comment-only SQL — report unavailable rather than zero.
- A statement the regex engine analyzes but `node-sql-parser` rejects — dashboard must stay fully usable.
- Oracle, and any dialect without a grammar — always unavailable.

## Success Criteria

- **SC-001**: AST statistics correct for every dialect the pipeline supports; verified against the existing
  code-generation fixture corpus.
- **SC-002**: Zero regression in the existing suite — all dashboard, analyzer and query-input tests keep
  their current intent.
- **SC-003**: No dashboard behavior change for any statement whose AST cannot be produced.
- **SC-004**: For each analyzed statement, `capabilities.advanced` is `supported` when AST statistics are
  computed and `partial` when they are unavailable; the UI reflects the status without hard-coded prose.
- **SC-005**: Parse time for the AST pass does not noticeably delay the dashboard.

## Out of Scope

- Replacing the regex analyzer with an AST analyzer across every metric.
- Oracle grammar support.
- Surfacing AST data anywhere outside Advanced Details.

## Dependencies

- `specs/015-sql-code-generator` — supplies `src/lib/codegen/parseSql.ts`, the AST pipeline to reuse.
- `specs/010-sql-intelligence-dashboard` — FR-027, whose "marked unavailable until computed" constraint
  this feature satisfies.
