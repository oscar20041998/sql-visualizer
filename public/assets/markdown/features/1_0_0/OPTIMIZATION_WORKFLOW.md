# Optimization Workflow 🚀

Step-by-step guide to optimize your SQL queries using the SQL Visualizer.

## Step 1: Baseline Analysis

1. Paste query into Query Input
2. Note the complexity score
3. Check linting alerts for obvious issues
4. Review Metrics Dashboard breakdown
5. Take a screenshot or note the baseline numbers

**Key Metrics to Record:**

- Total complexity score
- JOIN count and types
- Subquery depth
- Window function count
- Linting warnings count

## Step 2: Issue Identification

1. Look at highest-scoring factors in breakdown
2. Review Graph for unexpected relationships
3. Check CTE Analysis for unused or recursive CTEs
4. Identify which component contributes most to score
5. Use JOIN Analysis to review all join conditions

**Questions to Ask:**

- Which single factor contributes the most?
- Are there any unused CTEs?
- Are any JOINs overly complex?
- Is there deep nesting that could be flattened?
- Are all SELECT columns necessary?

## Step 3: Optimization

### For High JOIN Count

- Review join order (sometimes order matters for performance)
- Consider decomposition into separate queries
- Check each JOIN condition using JOIN Analysis
- Look for opportunities to reduce the number of JOINs

### For Deep Nesting

- Convert subqueries to CTEs for clarity
- Flatten structure using CTEs (WITH...AS syntax)
- Review field references to ensure optimization

### For Many Window Functions

- Group by PARTITION BY/ORDER BY patterns
- Identify duplicate window definitions
- Consider alternative approaches (GROUP BY, self-joins)

### For SELECT \* Usage

- Explicitly list needed columns
- Reduce data transfer overhead
- Improve query clarity

### For Missing WHERE

- Add filtering predicates
- Filter early to reduce working set
- Use indexes on WHERE columns

### For Unused CTEs

- Remove completely
- Quick optimization with immediate score reduction

## Step 4: Verification

1. Paste optimized query
2. Compare new complexity score with baseline
3. Verify Graph still shows correct relationships
4. Re-analyze Metrics Dashboard
5. Confirm linting warnings decreased
6. Test on actual database with EXPLAIN PLAN

**Comparison Metrics:**

- Score reduction percentage
- Specific factors that improved
- JOIN complexity changes
- Subquery depth reduction

## Troubleshooting Optimization

### Score Didn't Reduce

- Check that changes were actually applied
- Some optimizations reduce readability but not score (e.g., merging CTEs)
- Use EXPLAIN PLAN to verify actual performance improvement
- Score measures structural complexity, not performance

### New Linting Warnings

- Review what changed
- May have accidentally introduced anti-pattern
- Revert and try different approach

### Graph Looks Different

- Verify you didn't accidentally remove tables
- Check that JOIN conditions are still correct
- Use Mermaid export to compare visually

## Advanced: Performance Tuning Beyond Score

Remember: **High score ≠ slow execution, Low score ≠ fast execution**

For actual performance improvement:

1. Use EXPLAIN PLAN on target database
2. Look for full table scans
3. Verify index usage
4. Check JOIN order execution
5. Monitor actual query execution time

## Example Optimization Workflow

### Before: SUPER_HIGH (127 points)

```sql
SELECT o.id, c.name,
  (SELECT COUNT(*) FROM orders WHERE customer_id = c.id AND status = 'completed') as completed_count
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
ORDER BY o.created_at DESC;
```

**Issues:** Scalar subquery, multiple JOINs, SELECT \*-like behavior

### After: HIGH (68 points)

```sql
WITH completed_orders AS (
  SELECT customer_id, COUNT(*) as count
  FROM orders
  WHERE status = 'completed'
  GROUP BY customer_id
)
SELECT o.id, c.name, co.count as completed_count
FROM orders o
JOIN customers c ON o.customer_id = c.id
LEFT JOIN completed_orders co ON c.id = co.customer_id
WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
ORDER BY o.created_at DESC;
```

**Improvements:**

- Eliminated scalar subquery (score -10)
- Moved aggregation to CTE (more efficient)
- Reduced JOIN count (removed unnecessary joins)
- Score reduced by 59 points (46% improvement)

### After Further Optimization: MEDIUM (42 points)

```sql
SELECT o.id, c.name, COUNT(DISTINCT co.id) as completed_count
FROM orders o
JOIN customers c ON o.customer_id = c.id
LEFT JOIN orders co ON c.id = co.customer_id AND co.status = 'completed'
WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
GROUP BY o.id, c.name
ORDER BY o.created_at DESC;
```

**Further Improvements:**

- Simplified CTE into single join
- Used aggregate instead of separate CTE
- Score reduced further to MEDIUM
- Maintains same results with cleaner structure

---

## When to Stop Optimizing

- Score reaches target level (usually MEDIUM)
- Performance is acceptable (verified with EXPLAIN PLAN)
- Readability would suffer from further changes
- Team is comfortable with current complexity
- Cost of optimization exceeds benefit

## Continuous Improvement

- Run analysis regularly on production queries
- Identify high-complexity queries trending higher
- Schedule optimization work before they become critical
- Use historical complexity scores to track improvements
- Share best practices with team
