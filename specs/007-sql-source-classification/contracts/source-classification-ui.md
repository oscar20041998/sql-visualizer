# Internal Contract: Source Classification to Relationship Graph

## Purpose

Define the internal UI contract between the canonical SQL analysis result and the existing relationship graph. This is not a public network API.

## Analyzer output contract

Every graphable entry in `AnalysisResult.tables` MUST expose a canonical `sourceType` value:

```text
TABLE | CTE | SUBQUERY | UNKNOWN | VIEW
```

`VIEW` is reserved unless the current analysis has semantic evidence. `isCTE` and `isSubquery`, if still present for compatibility, MUST equal `sourceType === 'CTE'` and `sourceType === 'SUBQUERY'` respectively.

Each graph relationship in `AnalysisResult.joins` MUST reference IDs of source occurrences. Source IDs must distinguish alias occurrences where collapsing them would obscure a self-join or other relationship.

## Graph filter contract

| UI filter | Included node types | Edge behavior |
|-----------|---------------------|---------------|
| All | Every source type | Show edges whose endpoints are both visible. |
| Tables | `TABLE` | Show only edges whose endpoints are both visible table nodes. |
| CTEs | `CTE` | Show only edges whose endpoints are both visible CTE nodes. |
| Subqueries | `SUBQUERY` | Show only edges whose endpoints are both visible subquery nodes. |

`UNKNOWN` and future `VIEW` values remain visible in **All**. A dedicated filter for them is out of scope unless a product requirement adds one.

## Display contract

1. Every normal-detail node presents its canonical source type as visible text.
2. Every node’s accessible name includes its source name, source type, and alias when present.
3. Exported graph text uses the canonical source type, not legacy boolean precedence.
4. Simplified large-graph node mode still exposes source type through an accessible label or equivalent non-visual text when the compact visual card omits the badge.

## Compatibility contract

Consumers must not classify a source from its name, alias, or absence of an old boolean flag. They must read `sourceType`. Existing consumers of `isCTE` / `isSubquery` migrate in the same change or use derived compatibility values only.