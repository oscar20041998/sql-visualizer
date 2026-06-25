# SQL Complexity Scoring Engine - Usage Guide

## Quick Start

### For Users

1. **Go to the Query Input page** (home page `/`)
2. **Paste your SQL query** into the textarea
3. **View the Complexity Dashboard** on the right side - it will show:
   - Current complexity level (LOW/MEDIUM/HIGH/SUPER HIGH)
   - Total score and percentage of maximum
   - Quick breakdown of contributing factors
   - Any linting warnings (anti-patterns detected)

4. **Click Analyze** to see detailed breakdown in the Metrics Dashboard
5. **Navigate to Metrics Dashboard** to see:
   - Complexity score gauge
   - Detailed complexity breakdown by category
   - Execution cost estimates
   - Actionable recommendations

### For Developers

#### Basic Complexity Calculation

```typescript
import { calculateQueryComplexity } from '@/lib/complexityScorer';

const sql = `SELECT * FROM orders WHERE status = 'active'`;
const score = calculateQueryComplexity(sql);

console.log(score.totalScore); // 5
console.log(score.level); // "LOW"
console.log(score.scoreBreakdown); // Detailed breakdown
console.log(score.lintingIssues); // Array of issues
```

#### Using Components

**Complexity Dashboard Component:**

```typescript
import ComplexityDashboard from '@/components/ui/ComplexityDashboard';

export function MyComponent() {
  return (
    <ComplexityDashboard
      sql={userQuery}
      showDetails={true}
    />
  );
}
```

**Complexity Breakdown Component:**

```typescript
import ComplexityBreakdown from '@/components/ui/ComplexityBreakdown';

export function DetailedView() {
  return (
    <ComplexityBreakdown sql={userQuery} />
  );
}
```

**Linting Alerts Component:**

```typescript
import LintingAlerts from '@/components/ui/LintingAlerts';

export function ValidationView() {
  return (
    <LintingAlerts
      sql={userQuery}
      compact={false}  // or true for condensed view
    />
  );
}
```

#### Accessing Detailed Scores from Analysis

```typescript
import { analyzeSql } from '@/lib/sqlAnalyzer';

const result = analyzeSql(sql, 'postgresql');

// Access detailed complexity scoring
if (result.detailedComplexity) {
  console.log(result.detailedComplexity.totalScore);
  console.log(result.detailedComplexity.scoreBreakdown.keywords);
  console.log(result.detailedComplexity.scoreBreakdown.selectFields);
  console.log(result.detailedComplexity.scoreBreakdown.joins);
  console.log(result.detailedComplexity.lintingIssues);
}
```

## Complexity Scoring Reference

### Score Range & Interpretation

| Level          | Score Range | Interpretation               | Recommendation                            |
| -------------- | ----------- | ---------------------------- | ----------------------------------------- |
| **LOW**        | 0-20        | Simple query, well-optimized | No action needed                          |
| **MEDIUM**     | 21-50       | Moderate complexity          | Review indexes, join order                |
| **HIGH**       | 51-100      | Complex query                | Consider decomposition, review query plan |
| **SUPER HIGH** | 101+        | Very complex, high risk      | Strong refactoring recommended            |

### Scoring Weight Matrix

#### Base Clauses

```
FROM          1 point
WHERE         2 points
DISTINCT      3 points
```

#### Aggregations & Sorting

```
GROUP BY      4 points
ORDER BY      3 points
HAVING        4 points
```

#### JOIN Types

```
INNER JOIN                4 points
LEFT JOIN / RIGHT JOIN    5 points
FULL OUTER JOIN          10 points
CROSS JOIN              10 points
NATURAL JOIN             5 points
```

#### Advanced Structures

```
WITH (CTE)               8 points each
Nested Subquery         12 points per nesting level
UNION / EXCEPT / INTERSECT  6 points each
```

#### Window Functions

```
OVER clause                    6 points
ROW_NUMBER, RANK, DENSE_RANK   6 points each
LEAD, LAG, FIRST_VALUE, etc    6 points each
PARTITION BY                   3 points
```

#### SELECT Field Complexity

```
Raw field (e.g., table.column)           1 point
Aliased/Expression field                 3 points
CASE WHEN conditional                    5 points
Scalar subquery                         10 points
Aggregate function (SUM, COUNT, etc)     4 points
Scalar function (UPPER, CAST, etc)       3 points
```

## Linting Rules

### 1. SELECT \* Anti-Pattern

**Rule ID:** `SELECT_ALL`
**Severity:** Warning
**Message:** "Anti-pattern detected: Avoid using `SELECT *` in large-scale systems"
**Why:** Forces database to retrieve all columns, increasing I/O and network overhead

**Bad:**

```sql
SELECT * FROM orders WHERE status = 'active';
```

**Good:**

```sql
SELECT id, customer_id, total_amount FROM orders WHERE status = 'active';
```

### 2. Deep Nesting

**Rule ID:** `DEEP_NESTING`
**Severity:** Warning
**Threshold:** 7+ levels of parentheses
**Why:** Deep nesting prevents index usage and complicates query optimization

**Bad:**

```sql
SELECT * FROM (SELECT * FROM (SELECT * FROM (SELECT ...))) ...
```

**Good:**

```sql
WITH step1 AS (SELECT ...),
     step2 AS (SELECT FROM step1 ...),
     step3 AS (SELECT FROM step2 ...)
SELECT FROM step3;
```

### 3. CROSS JOIN Risk

**Rule ID:** `CROSS_JOIN`
**Severity:** Warning
**Why:** CROSS JOIN produces Cartesian product, exponentially increasing row count

**Bad:**

```sql
SELECT * FROM customers CROSS JOIN products;
```

**Good:**

```sql
SELECT * FROM customers
INNER JOIN products ON customers.id = products.customer_id;
```

### 4. Missing WHERE Clause

**Rule ID:** `MISSING_WHERE`
**Severity:** Warning
**Conditions:** Complex query without WHERE clause
**Why:** May scan entire tables unnecessarily

**Bad:**

```sql
SELECT o.id, COUNT(*) as item_count
FROM orders o
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN customers c ON o.customer_id = c.id
GROUP BY o.id;
```

**Good:**

```sql
SELECT o.id, COUNT(*) as item_count
FROM orders o
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN customers c ON o.customer_id = c.id
WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY o.id;
```

## Real-World Examples

### Example 1: Simple E-commerce Query (LOW - 8 points)

```sql
SELECT
  id,
  order_number,
  total_amount
FROM orders
WHERE status = 'completed';
```

**Score Breakdown:**

- FROM: 1pt
- WHERE: 2pt
- SELECT fields (3 raw): 3pt
- **Total: 6pt → LOW**

### Example 2: Moderate Reporting Query (MEDIUM - 32 points)

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

**Score Breakdown:**

- FROM: 1pt
- WHERE: 2pt (2 conditions)
- INNER JOINs: 8pt (2 × 4)
- GROUP BY: 4pt
- ORDER BY: 3pt
- SELECT fields: 4pt (1 function, 1 raw, 2 raw)
- **Total: 22pt → MEDIUM**

**Recommendations:**

- Ensure indexes on join columns (o.customer_id, c.id, oi.order_id)
- Consider materializing aggregation with CTE for reuse
- Verify DATE_TRUNC column has index

### Example 3: Complex Analytics Query (HIGH - 68 points)

```sql
WITH monthly_metrics AS (
  SELECT
    DATE_TRUNC('month', o.created_at) as month,
    c.region,
    COUNT(DISTINCT o.id) as orders,
    SUM(CASE WHEN o.status = 'completed' THEN oi.quantity * oi.unit_price ELSE 0 END) as revenue,
    AVG(o.total_amount) as avg_order_value
  FROM orders o
  INNER JOIN order_items oi ON o.id = oi.order_id
  LEFT JOIN customers c ON o.customer_id = c.id
  WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 2 YEARS)
  GROUP BY DATE_TRUNC('month', o.created_at), c.region
),
ranked_regions AS (
  SELECT
    month,
    region,
    orders,
    revenue,
    ROW_NUMBER() OVER (PARTITION BY month ORDER BY revenue DESC) as rank,
    LAG(revenue) OVER (PARTITION BY region ORDER BY month) as prev_revenue
  FROM monthly_metrics
)
SELECT
  r.month,
  r.region,
  r.orders,
  r.revenue,
  CASE
    WHEN r.prev_revenue IS NULL THEN NULL
    ELSE ROUND((r.revenue - r.prev_revenue) / r.prev_revenue * 100, 2)
  END as growth_pct
FROM ranked_regions r
WHERE r.rank <= 10
ORDER BY r.month DESC, r.rank ASC;
```

**Score Breakdown:**

- CTEs: 16pt (2 × 8)
- FROM: 1pt
- INNER JOIN: 4pt
- LEFT JOIN: 5pt
- WHERE: 2pt
- GROUP BY: 4pt
- Window functions: 12pt (OVER 6 + PARTITION BY 3 + LAG 3)
- ORDER BY: 3pt
- SELECT fields: 6pt (CASE + function + etc)
- **Total: 53pt → HIGH**

**Recommendations:**

- ✅ Good use of CTEs for readability
- Consider materialized view for `monthly_metrics` if reused
- Add index on (region, month) for LAG window
- Monitor memory usage during window function processing
- Break into separate queries if execution time >10 seconds

## Tips for Query Optimization

### Score < 20 (LOW)

✓ Generally well-optimized
✓ Good candidate for frequent execution
✓ Focus: Maintain index coverage

### Score 21-50 (MEDIUM)

⚠ Review query structure
⚠ Verify appropriate indexes exist
⚠ Check query plan for full table scans
✓ Consider: Index hints, column statistics

### Score 51-100 (HIGH)

⚠⚠ High complexity detected
⚠⚠ Likely to have performance issues at scale
✓ Action: Consider decomposition into multiple queries
✓ Action: Use materialized CTEs or temporary tables
✓ Action: Implement query result caching

### Score 101+ (SUPER HIGH)

🚨 Critical complexity
🚨 High risk of timeout/lock contention
✓ Required: Significant query refactoring
✓ Required: Break into smaller queries
✓ Required: Implement staging tables or ETL approach

## Integration with Your Workflow

### In Query Input Page

- See real-time complexity as you type
- Get anti-pattern warnings immediately
- Use scores to decide if query needs refactoring before analysis

### In Metrics Dashboard

- Review detailed breakdown of score components
- See how each SQL construct contributes to complexity
- Get specific optimization recommendations

### In Guidelines Page

- Reference the full weight matrix
- Learn scoring methodology
- See best practices and anti-pattern examples

## FAQ

**Q: Why does my simple query have a medium score?**
A: Check for:

- Many SELECT fields (each function/CASE adds points)
- Multiple JOINs (each JOIN adds points)
- Multiple GROUP BY/ORDER BY clauses
- Use the breakdown to see which parts contribute most

**Q: Can I adjust the scoring weights?**
A: Yes, edit the `COMPLEXITY_WEIGHTS` constant in `src/lib/complexityScorer.ts` to match your organization's standards.

**Q: Is this score a reliable performance predictor?**
A: The score indicates structural complexity, not actual performance. Use it as:

- Guide for query review
- Red flag for potentially problematic queries
- Relative comparison between similar queries
- NOT as absolute performance prediction (use EXPLAIN PLAN for that)

**Q: Should I always aim for LOW complexity?**
A: Not necessarily. Some complex queries are necessary and well-designed. Use the score as a starting point for review, not a hard limit.

---

**Last Updated**: 2025
**Version**: 1.0
