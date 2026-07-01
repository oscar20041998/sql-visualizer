# JOIN Analysis 🔗

Deep-dive analysis into JOIN conditions with detailed complexity and structure breakdown.

## Capabilities

### Detailed JOIN Condition Analysis

For each JOIN in your query, shows:

- JOIN type (INNER, LEFT, RIGHT, FULL OUTER, CROSS, NATURAL)
- Complete ON condition text
- Columns involved in the condition
- Operators used (=, <>, >, <, IN, LIKE, BETWEEN, AND, OR)
- Complexity classification (Simple / Complex)
- Complexity score (0-5+)
- Equi-join status (Yes/No)

### Multi-Dialect Support

- **MySQL:** STRAIGHT_JOIN, USING clause
- **PostgreSQL:** LATERAL JOIN, USING clause
- **SQL Server:** CROSS APPLY, OUTER APPLY
- **Oracle:** USING clause, OUTER JOIN variants

### Collapsible JOIN Cards

- Expandable cards for each JOIN in your query
- Numbered for easy reference (#1, #2, #3, etc.)
- Color-coded by JOIN type (matches Relationship Graph)
- Expand individual cards or use "Expand All" / "Collapse All"

### Column & Operator Detection

- Automatically extracts all columns referenced in ON conditions
- Identifies all operators and logical connectors
- Shows joined table column references (table.column format)
- Displays in easy-to-scan badge format

### Complexity Assessment

- **Simple JOIN:** Single column equality condition (e.g., `a.id = b.id`)
- **Complex JOIN:** Multiple columns, AND/OR operators, non-equality conditions
- Numeric complexity score (0-5+) based on:
  - Number of columns involved
  - Number of operators
  - Type of operators (AND/OR increase complexity)

### Empty State Handling

- Clear messaging when query has no JOINs
- Helpful hint to guide users

## Integration

- **Location:** Between Smart Suggestions and Extracted Tables sections in Relationship Graph Visualizer
- **Data Source:** Automatically populated from JOIN analysis results
- **Real-Time Updates:** Refreshes whenever query is analyzed

## Use Cases

- Understand complex JOIN logic before optimization
- Identify which columns are actually joined (not just visual edges)
- Find opportunities to add or remove JOIN conditions
- Verify equi-join vs non-equi-join patterns
- Compare JOIN complexity across queries
- Debug unexpected JOIN behavior
- Document JOIN specifications for team reviews

## Benefits Over Relationship Graph

| Aspect                                                 | Relationship Graph | JOIN Analysis |
| ------------------------------------------------------ | ------------------ | ------------- |
| Shows which tables are connected                       | ✓                  | ✓             |
| Shows exactly HOW they're connected                    |                    | ✓             |
| Reveals columns involved without reading SQL           |                    | ✓             |
| Complexity assessment helps identify problematic JOINs |                    | ✓             |
| Operator detection finds AND/OR patterns               |                    | ✓             |

## Best Practices

- Review all JOIN conditions to ensure they're correct
- Watch for complex JOINs with multiple operators (may impact performance)
- Identify equi-joins (most common and efficient) vs non-equi-joins
- For optimization: complex JOINs are candidates for refactoring
- Document complex JOIN conditions in code reviews
