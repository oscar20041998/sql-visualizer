# Entity-Based Extraction Refactoring - Implementation Complete

**Date:** 2026-06-27  
**Status:** ✅ COMPLETED  
**Approach:** Replaced AST-only traversal with `parser.getAllEntities()` as primary data source

---

## 🎯 Refactoring Overview

### Problem

- Manual AST traversal was unreliable for entity extraction
- `parser.getAllEntities()` was being called but results were not used
- Redundant AST traversal for tables, CTEs, and field mappings

### Solution

**Three-tier extraction strategy:**

1. **Primary (Entities):** Use `parser.getAllEntities()` for table/CTE/column metadata
2. **Secondary (AST):** Use AST for joins (not encoded in entities) and metrics
3. **Tertiary (Regex):** Fallback to regex-based extraction if parser unavailable

---

## 📝 Functions Added

### 1. `extractTablesFromEntities(entities: Entity[], cteNames: Set<string>): TableNode[]`

**Purpose:** Transform Entity objects to TableNode format  
**Source:** Entities with `type === 'Table'` or `'View'`  
**Data Flow:**

```typescript
Entity {
  id: string
  name: string
  alias: string | null
  columns: ColumnEntity[]  // ← Extract column names
}
  ↓
TableNode {
  id: string
  name: string
  alias?: string
  columns: string[]  // ← From entity.columns[].name
  isSubquery: boolean
  isCTE: boolean
}
```

### 2. `extractCTEsFromEntities(entities: Entity[], sql: string, ast: any): CTE[]`

**Purpose:** Transform CTE entities to application CTE format  
**Source:** Entities with `type === 'CTE'`  
**Data Flow:**

```typescript
Entity (type: 'CTE') {
  name: string
  alias: string | null
  columns: ColumnEntity[]  // ← CTE column references
}
  ↓
CTE {
  id: string
  name: string
  body: string           // ← Extracted from SQL
  fields: string[]       // ← From entity.columns[].name
  columnReferences: string[]  // ← Entity column data
  usageCount: number     // ← Counted from SQL
  isRecursive: boolean   // ← Detected from body
  nestedSubqueries: NestedSubquery[]
}
```

### 3. `extractMainQueryFieldsFromEntities(entities: Entity[], sql: string, tables: TableNode[], ctes: CTE[]): mainQueryFields[]`

**Purpose:** Map SELECT list fields to their sources  
**Source:** Entities + SELECT clause parsing  
**Data Flow:**

```typescript
SELECT clause analysis + Entity lookup
  ↓
mainQueryFields[] {
  field: string          // ← SELECT clause field
  alias: string          // ← AS clause alias
  origin: string         // ← Resolved source
  sourceTable: string    // ← Table/CTE name
  type: 'cte' | 'table' | 'expression'  // ← Determined via entity lookup
}
```

### 4. `extractCTEBody(sql: string, cteName: string): string`

**Purpose:** Extract CTE definition text from WITH clause  
**Used By:** `extractCTEsFromEntities()`  
**Algorithm:** Positional parsing with paren depth tracking

---

## 🔄 Modified Function: `analyseByAST()`

**Before:**

```typescript
const tables = extractTablesFromAST(ast, cleanSql, dialect);       // AST only
const joins = extractJoinsFromAST(ast, tables);                    // AST only
const ctes = extractCTEsFromAST(ast, cleanSql);                    // AST only
const mainQueryFields = extractMainQueryFieldsFromAST(...);        // AST only
```

**After:**

```typescript
// ✅ PRIMARY: Extract entities from parser
const entities: Entity[] = parserInstance.getAllEntities(cleanSql) || [];

// ✅ SECONDARY: Parse AST for joins and metrics
const ast = parserInstance.parse(cleanSql);

// Entity-based extraction (primary data source)
const cteNames = new Set<string>(
  entities.filter((e) => e.type === 'CTE').map((e) => e.name.toUpperCase())
);
const tables = extractTablesFromEntities(entities, cteNames); // ← Entities
const ctes = extractCTEsFromEntities(entities, cleanSql, ast); // ← Entities
const mainQueryFields = extractMainQueryFieldsFromEntities(entities, cleanSql, tables, ctes); // ← Entities

// AST-based extraction (supplements for relationships & metrics)
const joins = extractJoinsFromAST(ast, tables); // ← AST (needed)
const metrics = computeMetricsFromAST(ast, ctes, tables, joins, cleanSql); // ← AST (needed)
```

---

## 🗑️ Functions Removed

**Deleted (replaced by entity-based versions):**

1. ~~`extractCTEsFromAST()`~~ → `extractCTEsFromEntities()`
2. ~~`extractMainQueryFieldsFromAST()`~~ → `extractMainQueryFieldsFromEntities()`

**Kept (still needed for joins & metrics):**

- `extractTablesFromAST()` - Kept as fallback when entities insufficient
- `extractJoinsFromAST()` - No entity equivalent (joins not encoded in entities)
- `traverseAST()` - Still needed for join/metric extraction

---

## 📊 Data Flow Architecture

```
SQL Input
  ↓
parseSqlWithDialect()
  ↓
  ├─ parserInstance.getAllEntities() ────────┐
  │                                            │
  │   ↓                                        │
  ├─ parserInstance.parse() (AST)  ────────┐ │
  │                                      │  │ │
  │                                      ↓  ↓ ↓
  │                          ┌──────────────────┐
  │                          │  ENTITY-BASED    │
  │                          │  EXTRACTION      │
  │                          ├──────────────────┤
  │                          │ extractTables... │
  │                          │ extractCTEs...   │
  │                          │ extractFields... │
  │                          └──────────────────┘
  │                                    ↓
  │                          [tables, ctes, mainQueryFields]
  │                                    ↑
  │                          ┌──────────────────┐
  │                          │   AST-BASED      │
  │                          │   EXTRACTION     │
  │                          ├──────────────────┤
  │                          │ extractJoins...  │
  │                          │ computeMetrics.. │
  │                          └──────────────────┘
  │                                    ↓
  │                          [joins, metrics]
  │                                    ↑
  │                                    │
  └────────────────────────────────────┘
                  ↓
         AnalysisResult {
           tables, joins, ctes, metrics,
           complexity, executionCost,
           mainQueryFields, dialect, rawSql
         }
```

---

## ✅ Contract Preservation

**100% intact - No changes to:**

```typescript
export interface AnalysisResult {
  tables: TableNode[];
  joins: JoinEdge[];
  ctes: CTE[];
  metrics: SqlMetrics;
  complexity: ComplexityScore;
  detailedComplexity?: DetailedComplexityScore;
  executionCost: ExecutionCostEstimate;
  mainQueryFields: {
    field: string;
    alias: string;
    origin: string;
    sourceTable: string;
    type: 'cte' | 'table' | 'expression';
  }[];
  dialect: SqlDialect;
  rawSql: string;
}
```

✅ All fields preserved  
✅ All types preserved  
✅ All interfaces preserved  
✅ Frontend consumers unchanged

---

## 🔍 Comparison: Old vs New

| Aspect              | Old (AST-only)                    | New (Entity-based)                              |
| ------------------- | --------------------------------- | ----------------------------------------------- |
| **Table Source**    | Manual AST traversal + heuristics | `parser.getAllEntities()` + type filtering      |
| **CTE Source**      | Manual AST traversal              | `parser.getAllEntities()` with `type === 'CTE'` |
| **Columns**         | Regex pattern matching            | Entity.columns array (structured)               |
| **Join Source**     | AST traversal (only source)       | AST traversal (only source)                     |
| **Field Mapping**   | AST + regex heuristics            | Entity lookup + validation                      |
| **Reliability**     | Lower (multiple heuristics)       | Higher (parser metadata)                        |
| **Performance**     | Single AST traversal              | Entities + selective AST traversal              |
| **Maintainability** | Complex                           | Clear separation of concerns                    |

---

## 🎯 Benefits

### 1. **Structured Data**

- Entity objects have well-defined schema
- Column references explicit and position-aware
- Reduced ambiguity in mapping

### 2. **Better Error Handling**

- Entity filtering by type (Table, View, CTE, Subquery)
- Clear distinction between entity types
- Reduced false positives

### 3. **Separation of Concerns**

- Entities: Table/CTE metadata
- AST: Join relationships & aggregate metrics
- Regex: Ultimate fallback only

### 4. **Future-Proof**

- Parser improvements automatically benefit extraction
- Easier to add new entity types
- Clear extension points for new metrics

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
describe('Entity-Based Extraction', () => {
  test('extractTablesFromEntities filters CTE names', () => {
    const entities = [/* ... */];
    const cteNames = new Set(['CTE1']);
    const result = extractTablesFromEntities(entities, cteNames);
    // Should not include CTE1
  });

  test('extractCTEsFromEntities maps columns correctly', () => {
    const entities = [{ type: 'CTE', columns: [...] }];
    const result = extractCTEsFromEntities(entities, sql, ast);
    // Should have columnReferences from entity.columns
  });

  test('extractMainQueryFieldsFromEntities resolves source tables', () => {
    // Test prefix matching: t.id → resolves to table
    // Test entity lookup: column_name → finds entity
  });
});
```

### Integration Tests

- Complex queries with CTEs + joins
- Multi-table selects with aliases
- Nested subqueries
- All SQL dialects (MySQL, PostgreSQL, SQL Server, Oracle)

---

## 📋 Compatibility

✅ **Backward Compatible**

- No API changes
- Same AnalysisResult structure
- Frontend works unchanged
- Fallback to regex if parser unavailable

✅ **Dialect Support**

- MySQL
- PostgreSQL
- SQL Server
- Oracle

---

## 🚀 Deployment

1. ✅ Code changes implemented
2. ✅ No breaking changes
3. ⏳ Unit tests needed
4. ⏳ Integration tests needed
5. ⏳ Code review
6. ⏳ Merge and deploy

---

## 📚 Related Documentation

- [AST_METRICS_REFACTORING.md](AST_METRICS_REFACTORING.md) - Metric extraction details
- [AST_VISITOR_DEVELOPER_GUIDE.md](AST_VISITOR_DEVELOPER_GUIDE.md) - Extension guide
- `src/lib/sqlAnalyzer_v2.ts` - Implementation
