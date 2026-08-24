# Metrics Dashboard with Complexity Scoring 📈

Quantified complexity analysis and performance heuristics for your SQL queries.

## Real-Time Complexity Dashboard

- Displays as you type in Query Input
- Shows complexity level (LOW/MEDIUM/HIGH/SUPER_HIGH) with color badge
- Score progress bar (score / maximum possible)
- Quick breakdown cards showing contributing factors
- Instant linting alerts for anti-patterns

## Complexity Gauge

- 0–100 complexity score with visual radial gauge
- Color-coded severity: LOW (green) → MEDIUM (yellow) → HIGH (orange) → SUPER_HIGH (red)
- Percentage of maximum complexity
- Interpretation guide

## Detailed Complexity Breakdown

- **Keywords & Clauses:** FROM, WHERE, DISTINCT, GROUP BY, ORDER BY, HAVING, UNION, CTEs
- **SELECT Field Complexity:** Raw fields, aliases, conditionals, subqueries, aggregates, functions
- **JOIN Analysis:** Count and complexity per join type
- **CTE & Subquery Analysis:** Depth tracking, usage analysis
- **Window Function Analysis:** OVER clauses, PARTITION BY, ranking functions
- **Expandable/collapsible sections:** Detailed inspection on demand

## Complexity Factors Breakdown

- Visualized as interactive bar chart
- Individual metrics measured:
  - Number of JOINs
  - Subquery nesting depth
  - Window function usage
  - GROUP BY clauses
  - ORDER BY clauses
  - DISTINCT operations

## Estimated Execution Cost

- Client-side heuristic scoring
- Based on query complexity, SQL dialect, and standard indexing assumptions
- Relative performance guide (not absolute benchmark)
- Factor-specific recommendations:
  - Join depth analysis
  - Subquery nesting assessment
  - Analytic function impact
  - Dialect-specific overhead

## Interactive Tooltips & Recommendations

- Hover over metrics for exact values and recommendations
- Per-factor recommendations for optimizing each complexity component

## Metrics Calculated

| Metric                | Description                                 |
| --------------------- | ------------------------------------------- |
| `joinCount`           | Number of JOIN operations                   |
| `subqueryDepth`       | Maximum nesting level of subqueries         |
| `windowFunctionCount` | Window function usage                       |
| `groupByCount`        | GROUP BY clause count                       |
| `orderByCount`        | ORDER BY clause count                       |
| `distinctCount`       | DISTINCT operation count                    |
| `totalScore`          | Cumulative complexity score (0+)            |
| `complexityLevel`     | Severity level (LOW/MEDIUM/HIGH/SUPER_HIGH) |

## Complexity Level Interpretation

| Level          | Score Range | Interpretation                        | Recommendation                                           |
| -------------- | ----------- | ------------------------------------- | -------------------------------------------------------- |
| **LOW**        | 0-20        | Simple query, well-optimized          | No action needed, good for frequent execution            |
| **MEDIUM**     | 21-50       | Moderate complexity                   | Review indexes and join order                            |
| **HIGH**       | 51-100      | Complex query with optimization risks | Consider decomposition, review query plan                |
| **SUPER_HIGH** | 101+        | Very complex, high risk               | Strong refactoring recommended, critical review required |

## Use Cases

- Identify bottlenecks in complex queries
- Compare query complexity before/after optimization
- Get recommendations for improving specific factors
- Estimate relative performance impact
- Benchmark against similar queries
- Prevent overly complex queries from reaching production
- Guide team code review discussions

## Tips

- Focus on factors with highest complexity scores first (they have most impact)
- Use recommendations as starting points for optimization
- Compare metrics before/after optimization to verify improvements
- Pay special attention to window functions and nested subqueries (high point values)
- Address linting warnings first (they're quick wins)
