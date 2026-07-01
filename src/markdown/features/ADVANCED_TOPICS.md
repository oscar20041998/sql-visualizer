# Advanced Topics 📚

Deep-dive into advanced concepts and techniques.

## Understanding Complexity Scoring in Depth

The complexity scoring engine uses a multi-phase analysis approach:

### Phase 1: Keyword Scoring

Analyzes base SQL keywords (FROM, WHERE, GROUP BY, etc.)

- Counts frequency of each keyword
- Applies weights based on architectural impact
- Identifies anti-patterns

### Phase 2: JOIN Analysis

Categorizes each JOIN type and counts relationships

- Distinguishes between join types
- Evaluates join complexity (simple vs complex conditions)
- Identifies unnecessary joins

### Phase 3: SELECT Field Classification

Determines complexity of each selected expression

- Raw columns (simple)
- Computed expressions (medium)
- Subqueries (complex)
- Aggregates and functions

### Phase 4: Advanced Structure Detection

Identifies CTEs, subqueries, window functions

- CTE detection and dependency analysis
- Subquery nesting depth
- Window function patterns

### Phase 5: Total Calculation

Sums all components and assigns complexity level

- Weighted sum calculation
- Adaptive complexity level determination
- Threshold calculation

## Median-Based Complexity Evaluation

### Version Update: Adaptive Thresholds

The latest update introduces adaptive complexity-level evaluation using a **median numeric baseline** from your locally stored score history.

### What Changed

- Complexity levels are now derived from recent score distribution, not only fixed static bands
- The engine computes a median from `complexityScoreList`
- Dynamic thresholds are generated based on your data patterns
- Query levels adapt over time as more analysis results are collected

### Adaptive Level Rules

- **LOW:** 0 to 50% of Median
- **MEDIUM:** 50% to 100% of Median
- **HIGH:** 100% to 200% of Median
- **SUPER_HIGH:** > 200% of Median

### Why It Matters

- Better reflects your real workload profile
- Helps teams compare new queries against historical complexity patterns
- Makes alerts more context-aware in environments with very simple or very complex SQL baselines
- Adapts to your organization's typical query complexity

## CTE vs JOIN Optimization

### When to Use CTEs

**Good use cases:**

- Break down complex queries into logical steps
- Improve readability and maintainability
- Reuse the same logic multiple times
- Document intermediate transformations

**Performance considerations:**

- CTEs add 8 points to complexity score
- May be re-evaluated multiple times in some databases
- Use MATERIALIZED hint in PostgreSQL when expensive
- MySQL/SQL Server may have different re-evaluation patterns

### CTE Materialization

- **PostgreSQL:** Use `WITH ... AS MATERIALIZED (...)`
- **SQL Server:** Use `OPTION (MAXRECURSION N)` for recursive CTEs
- **MySQL:** CTEs are materialized by default in most versions
- **Oracle:** CTEs are typically materialized

### Alternative: Temporary Tables

For very expensive CTEs:

```sql
CREATE TEMP TABLE temp_result AS
SELECT ... FROM ... WHERE ...;

SELECT ... FROM temp_result ...;

DROP TABLE temp_result;
```

## Query Refactoring Patterns

### Pattern 1: Replace Scalar Subquery with JOIN

**Before (SUPER_HIGH):**

```sql
SELECT id, name,
  (SELECT COUNT(*) FROM orders WHERE customer_id = c.id) as order_count
FROM customers c;
```

**After (MEDIUM):**

```sql
SELECT c.id, c.name, COUNT(o.id) as order_count
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name;
```

### Pattern 2: Convert Deep Nesting to CTEs

**Before (HIGH):**

```sql
SELECT * FROM (
  SELECT * FROM (
    SELECT * FROM (
      SELECT ... FROM table1
    ) t1
  ) t2
) t3;
```

**After (MEDIUM):**

```sql
WITH level1 AS (SELECT ... FROM table1),
     level2 AS (SELECT ... FROM level1),
     level3 AS (SELECT ... FROM level2)
SELECT * FROM level3;
```

### Pattern 3: Window Functions vs GROUP BY

**Before (HIGH - with subquery):**

```sql
SELECT customer_id, order_id,
  (SELECT COUNT(*) FROM orders o2 WHERE o2.customer_id = o1.customer_id)
FROM orders o1;
```

**After (MEDIUM - with window):**

```sql
SELECT customer_id, order_id,
  COUNT(*) OVER (PARTITION BY customer_id) as customer_order_count
FROM orders;
```

## Multi-Dialect Optimization

### Dialect-Specific Features

**MySQL:**

- STRAIGHT_JOIN for join order hints
- USING clause for simple equi-joins
- Limited window function support (older versions)

**PostgreSQL:**

- LATERAL JOIN for correlated subqueries
- Advanced window functions
- MATERIALIZED keyword for CTEs

**SQL Server:**

- CROSS APPLY / OUTER APPLY for correlated subqueries
- Top N per group queries
- Limited CTE complexity

**Oracle:**

- PARTITION BY clause in aggregates
- Advanced window functions
- Hierarchical queries with CONNECT BY

### Multi-Dialect Comparison Workflow

1. Load query in SQL Visualizer
2. Check score with MySQL dialect
3. Switch to PostgreSQL and compare
4. Switch to SQL Server and compare
5. Identify dialect-specific syntax
6. Optimize for target database

## Performance Tuning Beyond Score

**Important:** Complexity score does NOT predict actual performance.

### Integration with EXPLAIN PLAN

1. Get complexity score in SQL Visualizer
2. Run EXPLAIN PLAN on target database
3. Look for full table scans (red flag)
4. Verify index usage
5. Check join order execution
6. Correlate findings with complexity score

### Index Strategy Optimization

Use complexity metrics to identify indexing opportunities:

- Columns in JOIN conditions → candidate for indexing
- Columns in WHERE clauses → candidate for indexing
- ORDER BY columns → consider composite indexes
- GROUP BY columns → may benefit from indexes

### Query Plan Analysis

1. Use EXPLAIN (MySQL): `EXPLAIN SELECT ...`
2. Use EXPLAIN ANALYZE (PostgreSQL): `EXPLAIN ANALYZE SELECT ...`
3. Use SET STATISTICS IO (SQL Server): `SET STATISTICS IO ON`
4. Use AUTOTRACE (Oracle): `SET AUTOTRACE ON`

## Customizing Complexity Weights

For teams with specific standards, customize `src/lib/complexityScorer.ts`:

```typescript
const COMPLEXITY_WEIGHTS = {
  baseClauses: {
    from: 1,
    where: 2,
    distinct: 3,
    // Adjust to your standards
  },
  joins: {
    inner: 4,
    left: 5,
    right: 5,
    full: 10,
    cross: 10,
    natural: 5,
    // Customize per your team's concerns
  },
  // ... more customization
};
```

## Building a Knowledge Base

### Document Your Patterns

Create internal documentation with:

- Common query patterns and their complexity
- Optimization techniques that worked
- Anti-patterns specific to your organization
- Dialect-specific gotchas

### Share Across Team

- Export Mermaid diagrams for architecture docs
- Create complexity budgets for different query types
- Establish team standards
- Track metrics over time

### Continuous Learning

- Review high-complexity queries regularly
- Ask why they're complex
- Document the reasons
- Find optimization opportunities
- Share findings with team

## Monitoring and Compliance

### Set Up Complexity Budgets

Define acceptable complexity for different scenarios:

- **Real-time queries:** Target LOW-MEDIUM
- **Reporting queries:** Target MEDIUM-HIGH
- **Batch processing:** HIGH-SUPER_HIGH acceptable
- **Critical queries:** Should target LOW

### Track Metrics Over Time

- Collect scores for all queries
- Track improvements over time
- Identify regressions early
- Use trends to guide optimization priorities

### Automated Compliance

- Integrate complexity scores into CI/CD
- Block deployment of SUPER_HIGH queries
- Generate compliance reports
- Alert on regression in key metrics

## Enterprise Integration

### For Large Organizations

1. **Standardize weights** across teams
2. **Create complexity policies** for different query types
3. **Implement governance** using automated checks
4. **Build dashboards** tracking organizational metrics
5. **Train teams** on standards and best practices
6. **Review regularly** and adjust policies as needed

### For Multiple Databases

- Run multi-dialect analysis on shared queries
- Document dialect-specific considerations
- Create migration runbooks
- Test compatibility matrix

## Troubleshooting Common Issues

### Score Doesn't Match Performance

- Complexity score measures structural complexity, not actual performance
- Use EXPLAIN PLAN for actual performance analysis
- Different databases may execute same query differently
- Indexes significantly impact actual performance

### Dialect Changes Affect Score

- Different dialects have different capabilities
- Some constructs are more expensive in different databases
- Window functions may work differently
- CTE materialization varies by database

### Query Performs Well Despite High Score

- Complexity score is not absolute performance predictor
- Well-optimized complex queries can perform fine
- Indexes and statistics matter significantly
- Use EXPLAIN PLAN to understand why it performs well

---

## References

For detailed technical information:

- See [COMPLEXITY_SCORING.md](COMPLEXITY_SCORING.md) for weight matrix details
- See [BEST_PRACTICES.md](BEST_PRACTICES.md) for optimization guidelines
- See [OPTIMIZATION_WORKFLOW.md](OPTIMIZATION_WORKFLOW.md) for step-by-step process
