# AST Visitor Pattern - Developer Guide

## Overview

This guide explains how to extend the AST visitor pattern in `sqlAnalyzer_v2.ts` for future enhancements or custom metrics.

## Architecture

### Layer 1: Core Traversal (`traverseAST()`)

```typescript
traverseAST(node, callback, parent);
```

- Handles AST structure iteration
- Manages null/undefined safely
- Don't modify this unless you need different traversal order

### Layer 2: Visitor Functions

```typescript
function countXxxFromAST(ast): number {
  let count = 0;
  traverseAST(ast, (node) => {
    if (condition) count++;
  });
  return count;
}
```

- One visitor per metric type
- Simple, focused responsibility
- Easy to test independently

### Layer 3: Orchestrator (`computeMetricsFromAST()`)

```typescript
function computeMetricsFromAST(...): SqlMetrics {
  // Call all visitors
  // Implement fallback strategy
  // Return complete metrics object
}
```

- Coordinates all visitors
- Implements fallback logic
- Ensures complete result set

---

## Adding a New Metric

### Step 1: Create Visitor Function

```typescript
/**
 * Count [MetricName] via AST node inspection.
 * [Description of what it detects]
 */
function countXxxFromAST(ast: any): number {
  let count = 0;

  traverseAST(ast, (node) => {
    // Check for node type that indicates this metric
    if (node.type === 'xxxNode' || node.type === 'yyy') {
      count++;
    }
    // Optional: text-based fallback for robustness
    if (node.text && typeof node.text === 'string' && /\bPATTERN\b/i.test(node.text)) {
      count++;
    }
  });

  return count;
}
```

### Step 2: Update `SqlMetrics` Interface

```typescript
export interface SqlMetrics {
  // ... existing fields ...
  newMetric: number; // Add your metric
}
```

### Step 3: Integrate into Orchestrator

```typescript
function computeMetricsFromAST(...): SqlMetrics {
  // Call your visitor
  let newMetric = countXxxFromAST(ast);

  // Add fallback pattern matching
  const upper = sql.toUpperCase();
  if (newMetric === 0 && countPattern(upper, /\bPATTERN\b/g) > 0) {
    newMetric = countPattern(upper, /\bPATTERN\b/g);
  }

  return {
    // ... existing fields ...
    newMetric,
  };
}
```

### Step 4: Update Fallback Function

```typescript
function computeMetrics(...): SqlMetrics {
  const upper = sql.toUpperCase();
  return {
    // ... existing fields ...
    newMetric: countPattern(upper, /\bPATTERN\b/g),
  };
}
```

### Step 5: Test

```typescript
describe('New Metric', () => {
  test('detects pattern correctly', () => {
    const sql = 'SELECT ... [pattern] ... FROM ...';
    const result = computeMetricsFromAST(ast, ctes, tables, joins, sql);
    expect(result.newMetric).toBe(1);
  });

  test('falls back to regex if AST unavailable', () => {
    const emptyAst = {};
    const result = computeMetricsFromAST(emptyAst, [], [], [], sql);
    expect(result.newMetric).toBe(1);
  });
});
```

---

## Identifying Node Types

### Debugging AST Structure

```typescript
// In browser console or debug code:
const ast = parser.parse(sql);
console.log(JSON.stringify(ast, null, 2));

// Look for node patterns:
// - node.type: Primary identifier ('windowFunction', 'groupByClause', etc.)
// - node.text: Raw text content (useful for regex fallback)
// - node.keywords: Array of keyword nodes
// - node.isXxx: Boolean flags (isDistinct, isUnionAll, etc.)
// - node.xxxClause: Nested clause objects
```

### Common Node Type Patterns

```typescript
// SELECT variants
node.type === 'selectStatement';
node.type === 'select';
node.type === 'selectClause';

// Clauses
node.type === 'groupByClause';
node.type === 'orderByClause';
node.type === 'havingClause';
node.type === 'whereClause';

// Expressions
node.type === 'windowFunction';
node.type === 'overClause';
node.type === 'aggregateFunction';

// Set operations
node.type === 'unionClause';
node.type === 'union';

// Flags
node.isDistinct === true;
node.isUnionAll === true;
node.isRecursive === true;
```

### Testing Node Detection

```typescript
function traverseAndLog(ast: any, depth = 0) {
  if (!ast || typeof ast !== 'object') return;

  // Log this node's type
  if (ast.type) {
    console.log('  '.repeat(depth) + `Type: ${ast.type}`);
  }
  if (ast.text) {
    console.log('  '.repeat(depth) + `Text: ${ast.text.substring(0, 50)}`);
  }

  // Recurse
  if (Array.isArray(ast)) {
    ast.forEach((item) => traverseAndLog(item, depth + 1));
  } else {
    Object.keys(ast).forEach((key) => {
      traverseAndLog(ast[key], depth + 1);
    });
  }
}

// Usage:
traverseAndLog(ast);
```

---

## Handling Edge Cases

### Multiple Occurrences

```typescript
// Problem: Query has multiple GROUP BY in different scopes
SELECT (SELECT COUNT(*) FROM t GROUP BY x) FROM t GROUP BY y;

// Solution: Count them all
function countGroupByClausesFromAST(ast: any): number {
  let count = 0;
  traverseAST(ast, (node) => {
    // Counts both: one in subquery, one in main query
    if (node.type === 'groupByClause') {
      count++;
    }
  });
  return count;  // Returns 2 ✓
}
```

### Nested Structures

```typescript
// Problem: How to distinguish UNION from UNION ALL?
// Solution: Check multiple properties

if (node.type === 'unionClause' || node.type === 'union') {
  if (
    node.isUnionAll === true || // Flag check
    node.all === true || // Alternative flag
    (node.text && /UNION\s+ALL/i.test(node.text)) // Text check
  ) {
    unionAll++;
  } else {
    union++;
  }
}
```

### Avoiding Double-Counting

```typescript
// Problem: Same node visited multiple times
// Solution: Track visited nodes

function countXxxFromAST(ast: any): number {
  const visited = new Set<any>();
  let count = 0;

  traverseAST(ast, (node) => {
    if (node.type === 'targetType' && !visited.has(node)) {
      visited.add(node);
      count++;
    }
  });

  return count;
}
```

---

## Dialect-Specific Handling

### Different Node Types by Dialect

```typescript
function countXxxFromAST(ast: any, dialect?: SqlDialect): number {
  let count = 0;

  traverseAST(ast, (node) => {
    // MySQL uses one structure
    if (dialect === 'mysql' && node.type === 'mysql_specific_node') {
      count++;
    }
    // PostgreSQL uses another
    else if (dialect === 'postgresql' && node.type === 'pg_specific_node') {
      count++;
    }
    // Generic fallback
    else if (node.type === 'generic_node') {
      count++;
    }
  });

  return count;
}
```

### Updating Orchestrator

```typescript
function computeMetricsFromAST(
  ast: any,
  ctes: CTE[],
  tables: TableNode[],
  joins: JoinEdge[],
  sql: string,
  dialect?: SqlDialect
): SqlMetrics {
  // Pass dialect to visitors that need it
  let xxx = countXxxFromAST(ast, dialect);
  // ...
}
```

---

## Performance Optimization

### Lazy Visitor Pattern

```typescript
// Only traverse when needed
class MetricsVisitor {
  private cachedResults: Map<string, number> = new Map();

  countXxx(ast: any): number {
    if (this.cachedResults.has('xxx')) {
      return this.cachedResults.get('xxx')!;
    }

    let count = 0;
    traverseAST(ast, (node) => {
      if (node.type === 'xxx') count++;
    });

    this.cachedResults.set('xxx', count);
    return count;
  }
}
```

### Parallel Traversal (Advanced)

```typescript
// For very large ASTs, could implement parallel visitor
// But for typical queries, unnecessary overhead
// Stick with sequential traversal for simplicity
```

### Early Exit Optimization

```typescript
// If you only need to find first occurrence:
function hasXxx(ast: any): boolean {
  let found = false;
  const visitor = (node: any) => {
    if (!found && node.type === 'xxx') {
      found = true;
      // Note: Still traverses entire tree
      // Consider different approach if performance critical
    }
  };
  traverseAST(ast, visitor);
  return found;
}
```

---

## Testing Patterns

### Unit Test Template

```typescript
describe('Visitor: countXxxFromAST', () => {
  // Setup
  let parser: any;

  beforeEach(() => {
    // Initialize parser
  });

  // Basic functionality
  test('counts single occurrence', () => {
    const sql = 'SELECT ... XXX ... FROM ...';
    const ast = parser.parse(sql);
    expect(countXxxFromAST(ast)).toBe(1);
  });

  test('counts multiple occurrences', () => {
    const sql = 'SELECT ... XXX ... FROM (SELECT XXX)';
    const ast = parser.parse(sql);
    expect(countXxxFromAST(ast)).toBe(2);
  });

  test('handles no occurrences', () => {
    const sql = 'SELECT * FROM table1';
    const ast = parser.parse(sql);
    expect(countXxxFromAST(ast)).toBe(0);
  });

  // Edge cases
  test('ignores XXX in comments', () => {
    const sql = 'SELECT * FROM t -- XXX comment\nWHERE id > 0';
    const ast = parser.parse(sql);
    expect(countXxxFromAST(ast)).toBe(0);
  });

  test('ignores XXX in string literals', () => {
    const sql = "SELECT 'XXX string' FROM t";
    const ast = parser.parse(sql);
    expect(countXxxFromAST(ast)).toBe(0);
  });

  // Nested contexts
  test('counts in nested subqueries', () => {
    const sql = 'SELECT XXX FROM (SELECT XXX FROM (SELECT XXX FROM t))';
    const ast = parser.parse(sql);
    expect(countXxxFromAST(ast)).toBe(3);
  });

  test('counts in CTEs', () => {
    const sql = 'WITH cte AS (SELECT XXX FROM t) SELECT * FROM cte';
    const ast = parser.parse(sql);
    expect(countXxxFromAST(ast)).toBe(1);
  });

  // Dialect-specific (if applicable)
  test('works with MySQL dialect', () => {
    const sql = 'SELECT ... XXX ...';
    const ast = new MySQL().parse(sql);
    expect(countXxxFromAST(ast)).toBe(1);
  });
});
```

---

## Troubleshooting

### Visitor Returns 0 for Complex Query

```typescript
// Debug: Log what nodes are visited
function countXxxFromAST_DEBUG(ast: any): number {
  let count = 0;
  traverseAST(ast, (node) => {
    console.log('Node type:', node.type, 'Text:', node.text?.substring(0, 30));
    if (node.type === 'xxx') count++;
  });
  return count;
}

// Run on problem query to see node types available
```

### Fallback Not Triggering

```typescript
// Check if regex is correct
const upper = sql.toUpperCase();
const matches = (upper.match(/\bPATTERN\b/g) || []).length;
console.log('Regex found:', matches); // Should match expected count
```

### Performance Degradation

```typescript
// Check traversal depth
function traversalDepth(node: any, depth = 0, maxDepth = 0): number {
  if (!node || typeof node !== 'object') return maxDepth;
  maxDepth = Math.max(maxDepth, depth);

  if (Array.isArray(node)) {
    node.forEach(
      (item) => (maxDepth = Math.max(maxDepth, traversalDepth(item, depth + 1, maxDepth)))
    );
  } else {
    Object.keys(node).forEach((key) => {
      maxDepth = Math.max(maxDepth, traversalDepth(node[key], depth + 1, maxDepth));
    });
  }

  return maxDepth;
}

// If maxDepth > 50, consider optimization
```

---

## Related Files

- [AST_METRICS_REFACTORING.md](AST_METRICS_REFACTORING.md) - Architecture overview
- [AST_METRICS_BEFORE_AFTER.md](AST_METRICS_BEFORE_AFTER.md) - Examples and comparisons
- [REFACTORING_COMPLETION_SUMMARY.md](REFACTORING_COMPLETION_SUMMARY.md) - Project status
- `src/lib/sqlAnalyzer_v2.ts` - Implementation
- `src/lib/complexityScorer.ts` - Uses SqlMetrics for scoring

---

## Quick Reference

### Add New Metric Checklist

- [ ] Create visitor function
- [ ] Test visitor independently
- [ ] Add field to SqlMetrics interface
- [ ] Integrate into computeMetricsFromAST()
- [ ] Add fallback to computeMetrics()
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update documentation
- [ ] Performance test
- [ ] Code review

### Common Mistakes to Avoid

- ❌ Modifying traverseAST() without reason
- ❌ Not handling null/undefined nodes
- ❌ Forgetting regex fallback
- ❌ Double-counting nested structures
- ❌ Not documenting node type assumptions
- ❌ Performance optimization too early
- ❌ Breaking backward compatibility

### Best Practices

- ✅ One visitor per metric
- ✅ Simple, focused logic
- ✅ Always provide fallback
- ✅ Document node type assumptions
- ✅ Test edge cases thoroughly
- ✅ Measure performance impact
- ✅ Keep fallback integrity
