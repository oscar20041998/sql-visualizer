# Best Practices 🎯

## Query Input Best Practices

- **Always select the correct SQL dialect** for accurate analysis
- **Use "Load Sample"** to test before analyzing your queries
- **Enable auto-analysis** for real-time feedback during editing
- **Watch the complexity score** as you build queries to avoid overly complex queries
- **Test different dialects** to understand dialect-specific behavior

## Complexity Scoring Best Practices

### Score < 20 (LOW)

- ✅ Generally well-optimized
- ✅ Good candidate for frequent execution
- ✅ Focus: Maintain index coverage
- **Actions:** No immediate optimization needed

### Score 21-50 (MEDIUM)

- ⚠️ Review query structure
- ⚠️ Verify appropriate indexes exist
- ⚠️ Check query plan for full table scans
- **Actions:** Consider index hints, column statistics, join order review

### Score 51-100 (HIGH)

- 🔴 High complexity detected
- 🔴 Likely to have performance issues at scale
- ⚠️ Consider: Decomposition into multiple queries
- **Actions:** Use materialized CTEs, implement result caching, add indexes on join columns
- **Target:** Try to reduce to MEDIUM before production

### Score 101+ (SUPER_HIGH)

- 🚨 Critical complexity
- 🚨 High risk of timeout/lock contention
- 🚨 Risk of full table scans
- **Actions:** REQUIRED significant query refactoring
- **Strategy:** Break into staging tables, use ETL approach, consider materialized views

## Refactoring Strategies by Complexity

### For HIGH Complexity

1. Break into smaller queries with intermediate results
2. Replace deep nesting with CTEs (use WITH...AS syntax)
3. Add explicit WHERE clauses to filter early
4. Verify JOIN conditions - avoid CROSS JOINs
5. Use window functions instead of subqueries where possible
6. Index columns used in JOIN conditions and WHERE clauses

### For SUPER_HIGH Complexity

1. Decompose into staged transformation queries
2. Use materialized views or temporary tables for intermediate steps
3. Consider ETL approach for complex transformations
4. Implement query result caching
5. Split analytical queries into separate scheduled jobs
6. Review and optimize every single JOIN condition

## Graph Visualization Best Practices

- Use Dagre layout for hierarchical dependencies (clear flow of data)
- Use Force-Directed for balanced relationship viewing (intuitive clustering)
- Use Grid for structured, organized table arrangement
- Use MiniMap to navigate large complex queries
- Identify isolated tables that may be unnecessary
- Export Mermaid diagrams for team documentation

## Metrics Dashboard Best Practices

- **Focus on factors with highest complexity scores first** (they have most impact)
- **Use recommendations as starting points** for optimization
- **Compare metrics before/after optimization** to verify improvements
- **Pay special attention to window functions and nested subqueries** (high point values)
- **Address linting warnings first** (they're quick wins)

## CTE Analysis Best Practices

- **Always review for unused CTEs** (unnecessary overhead, quick optimization)
- **Check recursive CTEs** for performance issues (can be expensive)
- **Use field origin mapping** to trace data transformations
- **Identify CTEs that reference many tables** (good candidates for materialization)
- **Look for redundant CTEs** that could be merged

## Settings Best Practices

- Choose dark theme for reduced eye strain during extended coding sessions
- Set auto-analyze if you edit queries frequently (real-time feedback)
- Save preferred graph layout for consistency across sessions
- Use your preferred language for UI comfort

## Linting & Anti-Pattern Prevention

- **Address all linting warnings** before deploying
- **Avoid SELECT \*** - always specify columns explicitly
- **Prevent deep nesting** by using CTEs (max 7 levels limit)
- **Never CROSS JOIN** unless absolutely intentional
- **Add WHERE clauses** to complex queries (filter early principle)

## Query Refactoring Checklist

When facing HIGH or SUPER_HIGH complexity:

- [ ] Review every JOIN - necessary and optimized?
- [ ] Look for missing WHERE clause - add filtering early
- [ ] Identify SELECT \* usage - specify columns explicitly
- [ ] Check for deep nesting - convert to CTEs
- [ ] Review window functions - can they be consolidated?
- [ ] Examine CTEs - any unused or redundant?
- [ ] Verify indexes on join columns
- [ ] Test EXPLAIN PLAN on actual database
- [ ] Compare metrics before/after changes
- [ ] Document optimization decisions

## Code Review Integration

- Use Complexity Dashboard in code review processes
- Share Mermaid diagrams in documentation
- Establish team standards based on complexity levels
- Train team members using Guidelines page
- Reference complexity metrics when discussing query changes
- Use JOIN Analysis to verify join correctness
- Check for unused CTEs as a quick optimization opportunity
