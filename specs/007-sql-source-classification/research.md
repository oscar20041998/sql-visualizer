# Phase 0 Research: SQL Source Classification

## R1: Canonical representation of source type

- **Decision**: Add one required semantic source-classification value to each graphable source occurrence, with `TABLE`, `CTE`, `SUBQUERY`, and `UNKNOWN` supported now. Treat `VIEW` as a future-compatible value only when existing semantic evidence establishes it.
- **Rationale**: `TableNode` currently combines optional `isCTE` and `isSubquery` booleans. That permits ambiguous combinations and forces UI consumers to infer a type. A discriminating source-type value gives every consumer one authoritative fact while existing flags can be kept temporarily only for compatibility during the migration.
- **Alternatives considered**: Keep both booleans and normalize precedence in every UI consumer was rejected because every new consumer could reintroduce inconsistency. A parallel graph domain object was rejected as unnecessary surface area for the existing `AnalysisResult.tables` contract.

## R2: Source resolution order without catalog metadata

- **Decision**: Resolve a source occurrence in this order: derived source expression → same-query CTE symbol in the applicable query scope → valid direct physical table reference → `UNKNOWN` for malformed or unresolvable source expressions.
- **Rationale**: There is no database catalog. A valid direct identifier must retain the product's practical table behavior, while CTE identity is known from the query itself and must take precedence. This is semantic scope resolution, not a source-name heuristic.
- **Alternatives considered**: Marking every direct identifier unknown without a catalog would break the expected `orders → TABLE` behavior. Inferring CTEs from name conventions is not semantically reliable.

## R3: Alias identity and graph nodes

- **Decision**: Preserve the underlying resolved source classification on every source occurrence, but use a distinct node identity for separately aliased occurrences in the same scope when graph relationships need to distinguish them.
- **Rationale**: A self-join needs two independently connectable nodes even though both occurrences resolve to the same table or CTE. Alias is therefore occurrence metadata, not an additional semantic source category.
- **Alternatives considered**: Merging all aliases by underlying source would collapse self-join endpoints. Introducing `ALIAS` as a source type would obscure actual table/CTE/subquery semantics.

## R4: CTE and dependency extraction integration

- **Decision**: Build the CTE symbol registry from existing CTE extraction before resolving graphable table references, and make graph-table construction apply the registry to every occurrence. Keep current CTE-dependency edge deduplication, but compare resolved node IDs rather than raw source names where aliases are present.
- **Rationale**: `extractTables()` currently rescans CTE names independently and keys tables by raw name. `extractCTEs()` separately owns authoritative CTE definitions and dependencies. Passing a registry from the latter into source resolution prevents CTE references from falling back to a table and keeps dependency facts coherent.
- **Alternatives considered**: A parser rewrite is broader and riskier than the defect warrants. Resolving only in ReactFlow leaves metrics, exports, AI consumers, and future UI with incorrect semantic facts.

## R5: AST cross-check scope

- **Decision**: Keep installed `dt-sql-parser` as a validation oracle in regression tests, not as a replacement runtime extraction pipeline. Exercise CTE/table, alias, derived-subquery, and schema-qualified fixtures for MySQL, PostgreSQL, SQL Server, and Oracle; record parser-specific unsupported grammar explicitly.
- **Rationale**: The constitution requires dual regex/AST validation and dialect documentation. The analyzer is currently a client-side heuristic and a full migration has wider risk than this classification fix.
- **Alternatives considered**: PostgreSQL-only tests and regex-only tests both violate the four-dialect AST cross-check requirement.

## R6: Graph presentation and accessibility

- **Decision**: Derive visible node labels, exported graph labels, and `All`/`Tables`/`CTEs`/`Subqueries` filters from canonical source type. Preserve existing interactive client components and ensure filters have clear accessible labels and keyboard operation.
- **Rationale**: The graph currently labels nodes only as CTE or TABLE and filters CTE versus non-CTE. That would visually classify subqueries as tables even after analyzer semantics are fixed.
- **Alternatives considered**: Styling-only changes do not make category available to filters or exports. A new page duplicates the established graph surface.

## R7: Performance and regression protection

- **Decision**: Keep source resolution linear over extracted occurrences plus a case-normalized CTE lookup map. Run focused unit tests, type check, full Vitest suite, and a 50+-source timing check before completion.
- **Rationale**: Repeated whole-list name scans can degrade large-query behavior; a scoped map avoids this while preserving `FlowCanvas` large-graph simplification.
- **Alternatives considered**: Adding workers or speculative memoization is unnecessary unless scoped resolution fails the performance budget.