# SQL Complexity Scoring Algorithm

## Overview
The complexity scoring system provides an objective, heuristic-based assessment of SQL query difficulty. It uses a **weighted keyword/construct matrix** calculated on the backend, while the **adaptive, median-based threshold evaluation** is performed on the frontend.

## 1. Scoring Methodology (Backend - Weighted Matrix)

The backend calculates the raw complexity score based on the detected SQL constructs.

| Construct Category | Construct | Weight (pts) |
| :--- | :--- | :--- |
| **Base Clauses** | FROM, WHERE | 1.0, 2.0 |
| | DISTINCT | 3.0 |
| **Join Types** | INNER JOIN | 4.0 |
| | LEFT/RIGHT JOIN | 5.0 |
| | FULL OUTER JOIN | 10.0 |
| | CROSS JOIN | 10.0 |
| **Aggregations** | GROUP BY, HAVING | 4.0 |
| **Advanced** | WITH (CTE) | 8.0 |
| | Nested Subquery (per level) | 12.0 |
| | UNION/EXCEPT/INTERSECT | 6.0 |
| **Window Fns** | OVER clause | 6.0 |
| | PARTITION BY | 3.0 |
| **Field Complexity**| Conditional (CASE WHEN) | 3.0 |
| | Scalar Subquery | 5.0 |
| | Aggregation Function | 2.0 |

## 2. Adaptive Threshold Evaluation (Frontend - Median-based)

To ensure complexity levels are meaningful to specific workloads, the frontend handles threshold adaptation:

1. **Storage**: Each analysis result is stored in the browser's `localStorage` (key: `sql_analysis_history`).
2. **Calculate Median**: The frontend reads history from `localStorage` and computes the **Median Score**.
3. **Dynamic Bands**: Thresholds are defined relative to this median:
   - **LOW**: 0 – 50% of Median
   - **MEDIUM**: 50% – 100% of Median
   - **HIGH**: 100% – 200% of Median
   - **SUPER HIGH**: > 200% of Median

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
const history = JSON.parse(localStorage.getItem('sql_analysis_history') || '[]');
const median = calculateMedian(history.map(h => h.rawScore));
const level = determineLevel(rawScore, median); // Apply dynamic bands
```

## 4. Linting Anti-Patterns (Qualitative Factor)
Linting rules are processed on both the backend and frontend to flag anti-patterns that increase risk regardless of the numeric score.
