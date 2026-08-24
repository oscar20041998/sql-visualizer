# Complexity Score Evaluation by Median Numeric

## Overview

The SQL Visualizer uses a **dynamic median-based thresholding system** to evaluate query complexity scores. Instead of using fixed thresholds, the system adapts complexity level boundaries based on historical score data, making it more accurate and fair across different types of queries.

---

## 1. Core Concepts

### Complexity Score

A numerical value (0+) assigned to a SQL query based on:

- Keywords and clauses (FROM, WHERE, JOIN, GROUP BY, etc.)
- SELECT field complexity (functions, subqueries, CASE expressions)
- Advanced structures (CTEs, window functions, nested subqueries)
- Joins (INNER, LEFT, RIGHT, FULL OUTER, CROSS)

### Median Numeric

The **middle value** in a sorted list of historical complexity scores. It serves as the baseline for calculating adaptive complexity level thresholds.

### Complexity Levels

- **LOW**: Simple queries with few clauses
- **MEDIUM**: Standard queries with moderate complexity
- **HIGH**: Complex queries with advanced features
- **SUPER_HIGH**: Extremely complex queries with multiple advanced features

---

## 2. How Median-Based Evaluation Works

### Step 1: Collect Historical Scores

```typescript
// All calculated scores are stored in localStorage
localStorage.setItem(SCORE_LIST_KEY, JSON.stringify([45, 67, 89, 102, 156, 198, ...]));
```

**Key Function**: `getScoresFromLocalStorage()`

- Retrieves stored scores from browser localStorage
- Filters out invalid/NaN values
- Returns unique scores to avoid duplicates

### Step 2: Calculate Median

```typescript
const scores = [45, 67, 89, 102, 156]; // sorted
const median = 89; // middle value (3rd element in array of 5)
```

**For even-length arrays**, the median is the average of the two middle values:

```typescript
const scores = [45, 67, 89, 102]; // sorted
const median = (67 + 89) / 2 = 78; // average of 2nd and 3rd elements
```

**Key Function**: `calculateScoredByMedian(scores)`

```typescript
const sortedScores = [...scores].sort((a, b) => a - b);
const len = sortedScores.length;
const mid = Math.floor(len / 2);
const median = len % 2 !== 0 ? sortedScores[mid] : (sortedScores[mid - 1] + sortedScores[mid]) / 2;
```

### Step 3: Generate Dynamic Thresholds

Based on the calculated median, complexity level boundaries are dynamically generated:

```typescript
function generateComplexityDefinitions(median) {
  const lowMax = Math.round(median * 0.5); // 50% of median
  const mediumMax = Math.round(median); // 100% of median
  const highMax = Math.round(median * 2); // 200% of median

  return [
    { level: 'LOW', min: 0, max: lowMax },
    { level: 'MEDIUM', min: lowMax + 1, max: mediumMax },
    { level: 'HIGH', min: mediumMax + 1, max: highMax },
    { level: 'SUPER_HIGH', min: highMax + 1, max: Infinity },
  ];
}
```

**Example with median = 100**:
| Level | Min | Max | Range |
|-------|-----|-----|-------|
| LOW | 0 | 50 | 0-50 |
| MEDIUM | 51 | 100 | 51-100 |
| HIGH | 101 | 200 | 101-200 |
| SUPER_HIGH | 201 | ∞ | 201+ |

### Step 4: Classify Query Score

```typescript
// Current query has score of 85
const currentScore = 85;
const definitions = generateComplexityDefinitions(100);

// Find matching level
const matchedLevel = definitions.find(
  (item) => currentScore >= item.min && currentScore <= item.max
);
// Result: MEDIUM (85 falls in 51-100 range)
```

---

## 3. Visual Representation

```
Median = 100
├─ LOW (0-50)
│  └─ Threshold: 50% of median
├─ MEDIUM (51-100)
│  └─ Threshold: 100% of median
├─ HIGH (101-200)
│  └─ Threshold: 200% of median
└─ SUPER_HIGH (201+)
   └─ Threshold: Above 200% of median
```

---

## 4. Adaptive Nature

### Why Median-Based?

1. **Self-Adjusting**: Thresholds adapt as more queries are analyzed
2. **Fair Distribution**: Complexity levels roughly reflect the distribution of actual queries
3. **Outlier Resistant**: Median is less affected by extremely high/low scores than average
4. **Context-Aware**: Different teams may have different query complexity norms

### Example Scenario

**Initial State** (first few queries):

```
Scores: [30, 45, 55]
Median: 45
Thresholds:
  - LOW: 0-22
  - MEDIUM: 23-45
  - HIGH: 46-90
  - SUPER_HIGH: 91+
```

**After Analysis** (many queries):

```
Scores: [15, 28, 45, 52, 68, 89, 102, 145, 198, 250]
Median: 78.5
Thresholds:
  - LOW: 0-39
  - MEDIUM: 40-78
  - HIGH: 79-157
  - SUPER_HIGH: 158+
```

The thresholds shift to better reflect the actual complexity distribution.

---

## 5. Implementation Flow in `calculateQueryComplexity()`

```typescript
export function calculateQueryComplexity(sql, locale = 'en') {
  // 1. Calculate component scores
  const keywords = scoreKeywords(sql);
  const selectFields = analyzeSelectFields(sql);
  const ctes = scoreCTEs(sql);
  const windowFunctions = scoreWindowFunctions(sql);
  const subqueries = scoreSubqueries(sql);

  // 2. Sum all components for total score
  const totalScore =
    keywords.total + selectFields.total + ctes.total + windowFunctions.total + subqueries.total;

  // 3. Get historical scores from localStorage
  const scoreList = getScoresFromLocalStorage(); // [45, 67, 89, ...]

  // 4. Calculate median and generate thresholds
  const dataScoreAnalysis = calculateScoredByMedian(scoreList);
  // Returns: { median: 67, level: 'MEDIUM', dynamicDefinitions: [...] }

  // 5. Get localized level list
  const levelList = getComplexityLevelList(locale, dataScoreAnalysis.dynamicDefinitions);

  // 6. Find matching level for current query
  const matchedLevel =
    levelList.find((item) => totalScore >= item.min && totalScore <= item.max) || levelList[0];

  // 7. Store current score for future median calculations
  const updatedScoreList = [...scoreList, totalScore];
  localStorage.setItem(SCORE_LIST_KEY, JSON.stringify(updatedScoreList));

  return {
    totalScore,
    level: matchedLevel.level,
    levelLabel: matchedLevel.label,
    maxScorePossible: dataScoreAnalysis.median,
    percentageOfMax: (totalScore / dataScoreAnalysis.median) * 100,
    // ... other breakdown data
  };
}
```

---

## 6. Key Functions Reference

### `calculateScoredByMedian(scores)`

**Purpose**: Calculate median and generate dynamic thresholds
**Input**: Array of historical complexity scores
**Output**:

```typescript
{
  median: number;           // Calculated median value
  level: ComplexityLevel;   // Complexity level of the median
  dynamicDefinitions: ComplexityLevelDefinition[];
}
```

### `generateComplexityDefinitions(median)`

**Purpose**: Create threshold boundaries based on median
**Input**: Median score value, locale
**Output**: Array of level definitions with min/max ranges

### `getComplexityLevelList(locale, definitions)`

**Purpose**: Convert definitions to user-friendly level items
**Input**: Locale ('en'|'vi'), definitions array
**Output**: Array with labels translated to selected language

### `getScoresFromLocalStorage()`

**Purpose**: Retrieve all historical scores
**Output**: Array of unique, valid complexity scores

---

## 7. localStorage Structure

### Storage Key

```typescript
const SCORE_LIST_KEY = 'complexityScoreList';
```

### Storage Format

```json
[
  45, // Score from first analyzed query
  67, // Score from second query
  89, // Score from third query
  102,
  156,
  198
]
```

### Data Persistence

- Scores persist across browser sessions
- Clearing browser localStorage resets the data
- Each new query appends its score to the list
- Duplicates are automatically removed

---

## 8. Practical Examples

### Example 1: Simple Query

```sql
SELECT id, name FROM users WHERE id = 1;
```

- Keywords: FROM(1), WHERE(2) = 3 points
- SELECT fields: raw (2 × 1) = 2 points
- **Total Score**: 5 → **Level: LOW**

### Example 2: Complex Query

```sql
SELECT
  u.id,
  u.name,
  COUNT(*) as order_count,
  SUM(o.total) as total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active'
GROUP BY u.id, u.name
HAVING COUNT(*) > 5
ORDER BY total_spent DESC;
```

- Keywords: FROM(1), LEFT_JOIN(5), WHERE(2), GROUP_BY(4), HAVING(4), ORDER_BY(3) = 19 points
- SELECT fields: raw(2), aggregate(2 × 4) = 10 points
- JOIN analysis: 1 join = 5 points
- **Total Score**: ~34 → **Level: MEDIUM or HIGH** (depends on median)

### Example 3: Extremely Complex Query

```sql
WITH customer_orders AS (
  SELECT
    c.id,
    ROW_NUMBER() OVER (PARTITION BY c.country ORDER BY o.date) as rn,
    (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
  FROM customers c
  LEFT JOIN orders o ON c.id = o.customer_id
  WHERE c.status = 'active'
)
SELECT * FROM customer_orders WHERE rn = 1;
```

- CTEs: 1 × 8 = 8 points
- Keywords: 20+ points
- Window functions: OVER + PARTITION_BY = 9 points
- Subquery: 1 × 12 = 12 points
- **Total Score**: 50+ → **Level: HIGH or SUPER_HIGH**

---

## 9. Best Practices

### For Users

1. **Analyze Multiple Queries**: Build up a representative score history for accurate median calculation
2. **Review Score Breakdown**: Check component scores to understand complexity factors
3. **Optimize High-Complexity Queries**: Focus on queries rated HIGH or SUPER_HIGH

### For Developers

1. **Monitor localStorage**: Periodically check if stored scores need archiving
2. **Reset When Needed**: Clear scores if analyzing a new project with different complexity patterns
3. **Validate Scores**: Use `normalizeUniqueScores()` to ensure data quality
4. **Consider Cache**: For performance, consider caching median calculations

---

## 10. Configuration & Edge Cases

### Minimum Median Threshold

```typescript
const safeMedian = Math.max(median, 10);
```

Ensures thresholds don't become too small when analyzing very simple queries.

### Empty Score History

```typescript
if (!scores || scores.length === 0) {
  return { median: 0, level: 'LOW', dynamicDefinitions: generateComplexityDefinitions(0) };
}
```

System gracefully handles first-run scenario by using fixed thresholds.

### Score Uniqueness

```typescript
const uniqueScores = [...new Set(validScores)];
```

Prevents duplicate scores from skewing the median calculation.

---

## 11. Summary

The **median-based complexity evaluation** is a sophisticated system that:

✅ **Adapts** to the query patterns of your specific project  
✅ **Improves** accuracy as more queries are analyzed  
✅ **Resists** outliers through median calculation  
✅ **Distributes** complexity levels fairly  
✅ **Persists** historical data for consistent evaluation

This approach makes the complexity scoring system both **scientifically sound** and **practically useful** for real-world SQL optimization workflows.
