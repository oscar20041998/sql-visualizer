# SQL Complexity Scoring Algorithm

## Overview

The complexity scoring system provides a heuristic assessment of SQL query difficulty. The current frontend uses the weighted matrix and calculates adaptive median-based levels from browser `localStorage` under the key `complexityScoreList`. The Spring migration should calculate both the raw score and level server-side from the same versioned algorithm, then persist only the resulting history summary.

## 1. Scoring Methodology (Backend - Weighted Matrix)

The backend calculates the raw complexity score based on the detected SQL constructs.

| Construct Category   | Construct                   | Weight (pts) |
| :------------------- | :-------------------------- | :----------- |
| **Base Clauses**     | FROM, WHERE                 | 1.0, 2.0     |
|                      | DISTINCT                    | 3.0          |
| **Join Types**       | INNER JOIN                  | 4.0          |
|                      | LEFT/RIGHT JOIN             | 5.0          |
|                      | FULL OUTER JOIN             | 10.0         |
|                      | CROSS JOIN                  | 10.0         |
| **Aggregations**     | GROUP BY, HAVING            | 4.0          |
| **Advanced**         | WITH (CTE)                  | 8.0          |
|                      | Nested Subquery (per level) | 12.0         |
|                      | UNION/EXCEPT/INTERSECT      | 6.0          |
| **Window Fns**       | OVER clause                 | 6.0          |
|                      | PARTITION BY                | 3.0          |
| **Field Complexity** | Conditional (CASE WHEN)     | 3.0          |
|                      | Scalar Subquery             | 5.0          |
|                      | Aggregation Function        | 2.0          |

## 2. Adaptive Threshold Evaluation (Frontend - Median-based)

To ensure complexity levels are meaningful to specific workloads, the frontend handles threshold adaptation:

1. **Current storage**: The frontend keeps score history in browser `localStorage` (key: `complexityScoreList`). Query history is a separate feature and must not be treated as the source of scoring thresholds.
2. **Calculate Median**: The frontend reads history from `localStorage` and computes the **Median Score**.
3. **Dynamic Bands**: Thresholds are defined relative to this median:
   - **LOW**: 0 – 50% of Median
   - **MEDIUM**: 50% – 100% of Median
   - **HIGH**: 100% – 200% of Median

- **SUPER_HIGH**: > 200% of Median

This ensures that "High Complexity" always means "High relative to the queries this specific team typically writes," managed locally by the user.

## 3. Implementation Logic

### Backend (Score Calculation)

```java
// Returns raw score and factor list
public ComplexityScore calculateScore(SqlNode ast) {
    double totalScore = 0.0;
    // ... Traverse AST and sum contributions
    return new ComplexityScore(totalScore, factors);
}
```

### Frontend (Threshold Adaptation)

```typescript
const history = JSON.parse(localStorage.getItem('complexityScoreList') || '[]');
const median = calculateMedian(history.map((h) => h.rawScore));
const level = determineLevel(rawScore, median); // Apply dynamic bands
```

## Backend Contract

- Return `complexity.level`, `score`, `maxScore`, and itemized `factors` in every analysis response. Return `detailedComplexity` when the detailed scorer is enabled.
- Use `LOW`, `MEDIUM`, `HIGH`, and `SUPER_HIGH` consistently across the API, database check constraint, and UI. `VERY_HIGH` is not a valid value.
- Include an algorithm version in internal persistence or telemetry when scoring rules change. Recalculate historical scores in a deliberate migration; do not compare scores produced by different matrices as though they were equivalent.

## 4. Linting Anti-Patterns (Qualitative Factor)

Linting rules are processed on both the backend and frontend to flag anti-patterns that increase risk regardless of the numeric score.
