# CTE Analysis 🔗

Deep-dive analysis into Common Table Expressions (CTEs/WITH clauses) and field origin mapping.

## Capabilities

### CTE Detection & Listing

- Each WITH...AS() block identified as a separate CTE
- Expandable cards showing CTE body SQL
- Referenced tables and fields listed
- Usage tracking and statistics

### CTE Status Indicators

- **Recursive CTEs:** Identified and flagged with warning
- **Unused CTEs:** Highlighted in amber (performance issue)
- **Nested subqueries:** Count and depth analysis

### CTE Metadata Display

- Referenced tables count
- Selected fields count
- Line count of CTE body
- Usage frequency in main query
- Estimated complexity per CTE

### Field Origin Mapping

"Main Query Field Origins" table shows where each final SELECT field comes from:

- CTE reference
- Base table
- Computed expression
- Color-coded origin badges for quick identification

### Copy CTE SQL

- One-click copy of individual CTE body to clipboard
- Reuse CTEs in other queries

### Bulk Operations

- "Expand All" / "Collapse All" to scan or hide all CTE bodies at once

### Issue Detection

- Identifies unused CTEs (potential optimization opportunity)
- Flags recursive CTEs
- Detects field reference patterns

## CTE Statistics Shown

- Total CTEs in query
- Count of unused CTEs
- Count of recursive CTEs
- Average CTE complexity
- Dependencies between CTEs

## Use Cases

- Audit and optimize CTE usage
- Identify unused CTEs that can be removed
- Find field origins for complex multi-CTE queries
- Extract individual CTEs for reuse
- Understand CTE dependency chains
- Optimize recursive CTE performance

## Best Practices

### When to Use CTEs

✓ **Good use cases:**

- Break down complex queries into logical steps
- Improve readability and maintainability
- Reuse the same logic multiple times
- Document intermediate transformations

✗ **Avoid when:**

- Single simple SELECT from one table
- CTE is only used once and isn't complex
- Performance is critical (CTEs may be re-evaluated)

### Optimization Tips

- Always review for unused CTEs (unnecessary overhead, quick optimization)
- Check recursive CTEs for performance issues (can be expensive)
- Use field origin mapping to trace data transformations
- Identify CTEs that reference many tables (good candidates for materialization)
- Look for redundant CTEs that could be merged

### CTE vs JOIN Optimization

- CTEs add complexity score (8pt each) but improve readability
- Consider materializing CTEs for reuse
- Use MATERIALIZED hint in PostgreSQL when CTE is expensive
- MySQL/SQL Server may re-evaluate CTEs on each reference

### Copy and Test Individual CTEs

1. Expand the CTE card you want to test
2. Click "Copy CTE SQL"
3. Paste into a new query editor
4. Test and optimize independently
5. Confirm improvements work in the full query

## Advanced: CTE Refactoring

When facing complex multi-CTE queries:

1. Use CTE Analysis to understand dependencies
2. Identify which CTEs have highest complexity scores
3. Test simplified versions individually using Copy CTE
4. Gradually optimize without breaking functionality
5. Compare metrics before/after changes
