# Research: AST Statistics for Advanced Details

## Decision 1: Reuse the Codegen AST Parse

**Decision**: Add an opt-in statistics option to `src/lib/codegen/parseSql.ts`. Compute statistics from the same `astify` result before normalization, and return the typed statistics alongside the normalized model.

**Rationale**: `parseSql` already selects a `node-sql-parser` grammar, catches parse errors, and produces a normalized `ParsedSqlModel`. It currently discards the raw AST after normalization, so statistics must be computed within that parse operation to avoid a second parser implementation or a second AST pass. Keep the option opt-in so existing code-generation calls do not traverse the AST unnecessarily.

**Alternatives considered**:

- Add a new parser implementation in the SQL analyzer: rejected by FR-002 and would duplicate dialect behavior.
- Parse inside `buildDashboardData`: rejected by FR-005 and would break adapter purity.
- Add parsing to `analyzeSql`: rejected because it would impose the AST pass on editor, AI, and other non-dashboard analysis calls.

## Decision 2: Compute Only for Dashboard Data

**Decision**: The dashboard caller requests statistics for the current `AnalysisResult.rawSql` and dialect, then supplies the nullable result through `DashboardContext` to `buildDashboardData`.

**Rationale**: The adapter remains a pure function of its inputs, while AST work is limited to the feature surface that displays it. `AnalysisResult.rawSql` is the SQL used for that analysis; MyBatis analysis uses resolved SQL before it reaches the dashboard. Statistics are recomputed when the dashboard's analyzed SQL or dialect changes.

**Alternatives considered**:

- Add AST statistics to every `AnalysisResult` created by `analyzeSql`: rejected because that function is used by editor and AI workflows that do not display Advanced Details.
- Store statistics in Zustand or browser storage: rejected because they are deterministic derived data and need no persistence.

## Decision 3: Supported Dialects and Failure Semantics

**Decision**: Use the grammar map already in `parseSql`: MySQL, PostgreSQL, and Transact-SQL. Return no statistics for Oracle, parser exceptions, empty/comment-only SQL, or multiple AST roots.

**Rationale**: The parser has no Oracle grammar and its current normalization chooses the first item when `astify` returns an array. Reporting only the first statement would misrepresent a multi-statement analysis. A nullable result is consistent with FR-004 and avoids fabricated zero values. A successfully produced AST can still yield statistics when normalized fields are marked `partial`, because the AST remains real and available.

**Alternatives considered**:

- Claim Oracle support using regex or another parser: rejected by FR-001 and FR-006.
- Report the first AST root for multi-statement input: rejected because it would not describe the entire analyzed input.

## Decision 4: AST Counting Semantics

**Decision**: Count typed AST object records, group by the lower-cased parser `type`, and define total node count as the sum of those groups. Count operator and function occurrences from AST node fields, not SQL text. Count every CTE declaration; measure nested `WITH` scopes separately from subquery-expression nesting.

**Rationale**: These definitions make counts deterministic, testable against AST fixtures, and independent of formatting, comments, regex heuristics, or rendered SQL length. CTE and subquery depth remain distinguishable instead of counting a CTE definition as a subquery by default.

**Alternatives considered**:

- Count all JavaScript objects and scalar values: rejected because parser metadata and wrapper objects are not SQL AST nodes.
- Infer function/operator counts from SQL text: rejected by FR-001.

## Decision 5: Capability and Presentation

**Decision**: Set AST availability from `astStatistics !== null`; set advanced capability to `supported` for that query only when available and `partial` otherwise. Keep `parser.engine` as `regex`, since it describes existing analyzer metrics.

**Rationale**: This follows the accepted clarification, FR-007, and the existing dashboard convention that partial capabilities do not display invented values. The UI renders statistics only when actual data exists.

## Decision 6: Validation and Performance

**Decision**: Add unit tests around parser stats and dashboard mapping, plus a presentation-state test for available/unavailable data. Validate the MySQL, PostgreSQL, and SQL Server grammars and Oracle fallback. Benchmark the opt-in AST pass on existing parser fixtures and a representative query above 50 tables against the constitution's one-second analysis budget.

**Rationale**: Existing focused tests are Vitest-based (`tests/unit/codegen/parseSql.test.ts`, `tests/unit/dashboardData.test.ts`, and `tests/unit/dashboardCapability.test.ts`). The opt-in path prevents cost from spreading to unrelated analysis. Existing code-generation tests include inline dialect fixtures and a demo SQL fixture; extend them rather than introducing a separate corpus.

## Constitution Note

The constitution names `dt-sql-parser` for regex/AST validation. This feature is explicitly constrained to reuse the existing `node-sql-parser` pipeline for new AST statistics. Preserve `dt-sql-parser` dialect-validation behavior and do not claim that the new statistics cross-validate existing regex metrics. The implementation plan records this scoped exception; if the constitution intends to prohibit `node-sql-parser` for any AST work, reconcile that policy before implementation.
