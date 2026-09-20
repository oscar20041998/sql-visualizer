# Phase 1 Data Model: SQL Source Classification

## Scope

This feature changes the existing in-memory analysis contract. It introduces no persisted data, database schema, server endpoint, or external API.

## SourceType

| Value | Meaning | Resolution rule |
|-------|---------|-----------------|
| `TABLE` | Valid direct source reference treated as a physical table | The source is neither a derived expression nor a same-query CTE. |
| `CTE` | Common Table Expression defined in the applicable query scope | The normalized source reference matches a registered query-local CTE symbol. |
| `SUBQUERY` | Derived query used as a relation | The source position contains a nested query expression. |
| `UNKNOWN` | Malformed or unresolvable source expression | The analyzer cannot establish a valid direct, CTE, or derived source. |
| `VIEW` | Future-compatible view identity | Only emitted when existing semantic evidence supports it; catalog-free analysis does not infer it. |

## SQL Source Occurrence

This is the semantic evolution of the existing `TableNode` in `AnalysisResult.tables`.

| Field | Rule |
|-------|------|
| `id` | Unique graph-node identity for one source occurrence. Distinct aliases that preserve a self-join have distinct IDs. |
| `name` | Canonical resolved source name or stable derived-source display name. Schema qualification is retained. |
| `alias` | Optional local alias. It is metadata and never a source classification. |
| `sourceType` | Required canonical `SourceType`; all graph labels and filters use this field. |
| `columns` | Existing detected-column list. |
| legacy `isCTE` / `isSubquery` | Transitional compatibility fields only. If retained, they are computed from `sourceType`, never independently set. |

### Identity rules

1. A source occurrence is identified by query scope plus source position/alias, not only by source name.
2. Two unaliased references that represent the same graphable occurrence may be deduplicated by existing behavior.
3. Distinct aliases of the same physical table or CTE remain separate occurrences when needed to represent a relationship correctly.
4. A CTE source and a schema-qualified table with a matching final identifier remain distinct.

## CTE Definition and Symbol Registry

The existing `CTE` entity remains the authoritative definition record.

| Field | Existing role | Additional classification use |
|-------|---------------|-------------------------------|
| `name` | CTE identifier | Registered normalized key for source resolution in its query scope. |
| `body` | CTE query body | Scanned for table, CTE, and derived-source occurrences. |
| `dependencies` | Referenced CTE names | Produces deduplicated semantic CTE dependency relationships. |
| `isRecursive` | Recursive status | Recursive self-reference remains `CTE`, not `TABLE`. |

## Source Relationship

The existing `JoinEdge` remains the graph relationship entity.

| Field | Rule |
|-------|------|
| `source`, `target` | Refer to source-occurrence IDs, including distinct alias occurrences. |
| `joinType` | Continues to represent explicit join, implicit relationship, or `RELATES TO` CTE dependency. |
| uniqueness | Do not emit duplicate edges for the same semantic relationship; a real join takes precedence over an inferred CTE dependency between the same resolved endpoints. |

## State and data flow

```text
SQL input
  → comment-safe scan / existing parser validation
  → CTE definitions and scoped symbol registry
  → source occurrence extraction
  → semantic source resolution
  → graph nodes and deduplicated relationships
  → AnalysisResult.tables / AnalysisResult.joins
  → Zustand analysisResult
  → ReactFlow labels, export, and source-category filters
```

No asynchronous lifecycle or persisted state transition is added. A new analysis replaces the existing shared `analysisResult` through the established flow.