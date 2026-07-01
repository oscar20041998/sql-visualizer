# SQL Complexity Scoring Engine 🎯

Comprehensive complexity analysis using a sophisticated weight matrix to identify performance risks.

## How It Works

The scoring engine walks through your SQL query and assigns points to various constructs based on their architectural impact:

1. **Keyword Scoring** - Counts SQL keywords (FROM, WHERE, DISTINCT, GROUP BY, etc.)
2. **JOIN Analysis** - Evaluates each JOIN type and counts relationships
3. **SELECT Field Classification** - Analyzes each field's complexity level
4. **CTE Detection** - Scores WITH clauses and their relationships
5. **Window Function Analysis** - Detects OVER clauses and partition operations
6. **Subquery Analysis** - Tracks nesting depth and complexity
7. **Aggregation Tracking** - Counts aggregates and sorting operations

## Complexity Weight Matrix

| Category             | Construct                    | Weight           |
| -------------------- | ---------------------------- | ---------------- |
| **Base Clauses**     | FROM                         | 1 pt             |
|                      | WHERE                        | 2 pts            |
|                      | DISTINCT                     | 3 pts            |
| **Aggregations**     | GROUP BY                     | 4 pts            |
|                      | ORDER BY                     | 3 pts            |
|                      | HAVING                       | 4 pts            |
| **JOIN Types**       | INNER JOIN                   | 4 pts each       |
|                      | LEFT / RIGHT JOIN            | 5 pts each       |
|                      | FULL OUTER JOIN              | 10 pts           |
|                      | CROSS JOIN                   | 10 pts           |
|                      | NATURAL JOIN                 | 5 pts            |
| **Advanced**         | WITH (CTE)                   | 8 pts each       |
|                      | Nested Subquery              | 12 pts per level |
|                      | UNION / EXCEPT / INTERSECT   | 6 pts each       |
| **Window Functions** | OVER clause                  | 6 pts            |
|                      | PARTITION BY                 | 3 pts            |
|                      | ROW_NUMBER, RANK, DENSE_RANK | 6 pts each       |
| **SELECT Fields**    | Raw field (column)           | 1 pt             |
|                      | Aliased/Expression           | 3 pts            |
|                      | CASE WHEN conditional        | 5 pts            |
|                      | Scalar subquery              | 10 pts           |
|                      | Aggregate function           | 4 pts            |
|                      | Scalar function              | 3 pts            |

## Linting Rules (Anti-Pattern Detection)

### 1. SELECT \* Anti-Pattern ⚠️

- **Severity:** Warning
- **Why:** Forces database to retrieve all columns, increasing I/O and network overhead
- **Fix:** Explicitly define projection columns

### 2. Deep Nesting ⚠️

- **Threshold:** 7+ levels of parentheses
- **Why:** Defeats query optimizer, prevents index usage
- **Fix:** Use CTEs to flatten structure

### 3. CROSS JOIN Risk ⚠️

- **Severity:** Warning
- **Why:** Produces Cartesian product, exponentially increases row count
- **Fix:** Add proper join conditions or use INNER/LEFT JOIN

### 4. Missing WHERE Clause ⚠️

- **Condition:** Complex query without WHERE
- **Why:** May scan entire tables unnecessarily
- **Fix:** Add filtering predicates to reduce working set

## Real-World Scoring Examples

### Example 1: Simple Query (LOW - 8 points)

```sql
SELECT id, order_number, total_amount
FROM orders
WHERE status = 'completed';
```

**Breakdown:**

- FROM: 1pt
- WHERE: 2pt
- SELECT fields (3 raw): 3pt
- **Total: 6pt → LOW** ✓

### Example 2: Moderate Reporting Query (MEDIUM - 38 points)

```sql
SELECT
  DATE_TRUNC('month', o.created_at) as month,
  c.region,
  COUNT(DISTINCT o.id) as order_count,
  SUM(oi.quantity * oi.unit_price) as revenue
FROM orders o
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'completed'
  AND o.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
GROUP BY DATE_TRUNC('month', o.created_at), c.region
ORDER BY month DESC, revenue DESC;
```

**Breakdown:**

- FROM: 1pt
- INNER JOINs: 8pt (2 × 4)
- WHERE: 2pt
- GROUP BY: 4pt
- ORDER BY: 3pt
- SELECT fields: 5pt (date function + raw + 2 aggregates)
- **Total: 23pt → MEDIUM** ⚠️

### Example 3: Complex Analytics Query (HIGH - 65+ points)

```sql
WITH monthly_metrics AS (
  SELECT DATE_TRUNC('month', o.created_at) as month,
    c.region,
    COUNT(DISTINCT o.id) as orders,
    SUM(CASE WHEN o.status = 'completed'
        THEN oi.quantity * oi.unit_price ELSE 0 END) as revenue
  FROM orders o
  INNER JOIN order_items oi ON o.id = oi.order_id
  LEFT JOIN customers c ON o.customer_id = c.id
  WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 2 YEARS)
  GROUP BY DATE_TRUNC('month', o.created_at), c.region
)
SELECT r.month, r.region, r.orders, r.revenue
FROM monthly_metrics m
WHERE ROW_NUMBER() OVER (PARTITION BY m.region ORDER BY m.revenue DESC) <= 10;
```

**Breakdown:**

- CTEs: 8pt
- INNER JOIN: 4pt
- LEFT JOIN: 5pt
- WHERE: 2pt
- GROUP BY: 4pt
- WINDOW OVER: 6pt
- PARTITION BY: 3pt
- CASE WHEN: 5pt
- Aggregates: 8pt
- **Total: 45pt → HIGH** 🔴

## Understanding Complexity Scoring

### What Affects Score Most

1. **Number of JOINs** (biggest impact) - Each JOIN adds 4-10 points
2. **Nested Subqueries** (high impact) - Each level adds 12 points
3. **Window Functions** (significant impact) - Each OVER clause adds 6 points
4. **CTEs** (medium impact) - Each WITH clause adds 8 points
5. **Aggregations & Sorting** (lower impact) - GROUP BY, ORDER BY each add 3-4 points

### Important Notes

⚠️ **Score Does NOT Predict Actual Performance**

High complexity score indicates structural complexity, not necessarily slow execution. Use score as:

- Guide for query review and maintainability
- Red flag for potentially problematic queries
- Relative comparison between similar queries
- **NOT** as absolute performance prediction (use EXPLAIN PLAN for actual performance)

### When High Score is Acceptable

- Complex analytical/reporting queries are intentionally complex
- Business logic requires multiple joins and transformations
- Score is high but query has been optimized and tested
- Use refactoring checklist to confirm it's well-optimized

## Advanced: Customizing Complexity Weights

For teams with specific standards, you can customize the weight matrix in `src/lib/complexityScorer.ts`:

```typescript
const COMPLEXITY_WEIGHTS = {
  baseClauses: { from: 1, where: 2, distinct: 3, ... },
  joins: { inner: 4, left: 5, full: 10, ... },
  // Adjust weights to match your organization's standards
};
```

## Multi-Dialect Performance Comparison

1. Paste query → Check score
2. Change dialect in Settings → Compare score
3. Identify dialect-specific performance characteristics
4. Optimize for target database
