# SQL Complexity Scoring Engine - Technical Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React/Next.js)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Query Input Page          Metrics Dashboard      Guidelines Page
│       (/)                   (/sql-metrics-...)     (/guideline)
│         │                          │                     │
│         └──────────────────────────┼─────────────────────┘
│                                    │
│         ┌──────────────────────────▼──────────────────────────┐
│         │       Complexity Scoring Components                 │
│         ├──────────────────────────────────────────────────────┤
│         │  • ComplexityDashboard.tsx    [Real-time Display]   │
│         │  • ComplexityBreakdown.tsx    [Detailed Analysis]   │
│         │  • LintingAlerts.tsx          [Anti-Pattern Detect] │
│         └──────────────────┬───────────────────────────────────┘
│                            │
│         ┌──────────────────▼──────────────────────────────────┐
│         │           Scoring Engine                            │
│         ├──────────────────────────────────────────────────────┤
│         │  complexityScorer.ts                                 │
│         │  • calculateQueryComplexity()                        │
│         │  • scoreKeywords()                                   │
│         │  • analyzeSelectFields()                             │
│         │  • scoreCTEs()                                       │
│         │  • scoreWindowFunctions()                            │
│         │  • scoreSubqueries()                                 │
│         │  • checkSelectAll()       [Linting]                │
│         │  • checkOtherLintingRules()  [Linting]             │
│         │  • getComplexityColor()    [UI Mapping]            │
│         │                                                      │
│         │  Complexity Weights Matrix                          │
│         │  • baseClauses                                       │
│         │  • joins                                             │
│         │  • aggregations                                      │
│         │  • advancedStructures                                │
│         │  • windowFunctions                                   │
│         │  • selectFieldTypes                                  │
│         └──────────────────┬───────────────────────────────────┘
│                            │
│         ┌──────────────────▼──────────────────────────────────┐
│         │         SQL Analysis Pipeline                       │
│         ├──────────────────────────────────────────────────────┤
│         │  sqlAnalyzer.ts                                      │
│         │  • analyzeSql()          [Main entry point]         │
│         │  • extractTables()                                   │
│         │  • extractJoins()                                    │
│         │  • extractCTEs()                                     │
│         │  • computeMetrics()                                  │
│         │  • computeComplexity()   [Legacy scoring]          │
│         │  • computeExecutionCost()                            │
│         └──────────────────┬───────────────────────────────────┘
│                            │
│         ┌──────────────────▼──────────────────────────────────┐
│         │         State Management (Zustand)                  │
│         ├──────────────────────────────────────────────────────┤
│         │  store.ts                                            │
│         │  • rawSql                                            │
│         │  • analysisResult                                    │
│         │  • dialect                                           │
│         │  • settings                                          │
│         └──────────────────────────────────────────────────────┘
│
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

### Query Analysis Flow

```
User Input (SQL)
      │
      ▼
QueryInputContent Component
      │
      ├─ Real-time as user types
      │  └─→ ComplexityDashboard
      │      ├─→ calculateQueryComplexity()
      │      ├─→ checkSelectAll()
      │      └─→ checkOtherLintingRules()
      │
      └─ On "Analyze" Button
         └─→ analyzeSql()
             ├─→ stripSqlComments()
             ├─→ extractTables()
             ├─→ extractJoins()
             ├─→ extractCTEs()
             ├─→ computeMetrics()
             ├─→ computeComplexity()      [Legacy]
             ├─→ calculateQueryComplexity()  [New Detailed]
             ├─→ computeExecutionCost()
             └─→ Store Result in Zustand
                 │
                 ▼
            Metrics Dashboard
            ├─→ ComplexityGauge        [Visual score]
            ├─→ MetricsBarChart        [Metrics viz]
            ├─→ ComplexityBreakdown    [Detailed]
            └─→ Execution Cost Display [Recommendations]
```

## Type System

### Core Types

```typescript
// Type: ComplexityLevel
type ComplexityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'SUPER HIGH';

// Interface: DetailedComplexityScore
interface DetailedComplexityScore {
  totalScore: number;
  level: ComplexityLevel;
  scoreBreakdown: {
    keywords: Array<{
      category: string;
      count: number;
      baseScore: number;
      subtotal: number;
    }>;
    selectFields: {
      complexityScore: number;
      fieldCount: number;
      avgComplexity: number;
    };
    joins: { count: number; totalScore: number };
    ctes: { count: number; totalScore: number };
    subqueries: { count: number; totalScore: number };
    windowFunctions: { count: number; totalScore: number };
  };
  lintingIssues: LintingIssue[];
  maxScorePossible: number;
  percentageOfMax: number;
}

// Interface: LintingIssue
interface LintingIssue {
  rule: string;
  severity: 'warning' | 'error';
  message: string;
  suggestion: string;
  location?: string;
}

// Type: SelectFieldComplexity
type SelectFieldType = 'raw' | 'alias' | 'conditional' | 'subquery' | 'aggregate' | 'function';

interface SelectFieldComplexity {
  field: string;
  type: SelectFieldType;
  complexity: number;
  reason: string;
}
```

## Component Hierarchy

```
Page Layout
├── Query Input Page (/)
│   ├── QueryInputContent
│   │   ├── SQL Input Textarea
│   │   ├── MyBatis XML Input
│   │   ├── Dialect Selector
│   │   ├── Action Buttons (Analyze, Load Sample, Clear)
│   │   ├── Preview Panel
│   │   │   ├── SQL Preview
│   │   │   ├── Configuration Info
│   │   │   └─→ Complexity Analysis Section
│   │   │       ├─→ ComplexityDashboard
│   │   │       │   ├── Level Badge
│   │   │       │   ├── Score Progress Bar
│   │   │       │   ├── Quick Breakdown Cards
│   │   │       │   └── Linting Issues Display
│   │   │       └─→ LintingAlerts
│   │   │           ├── SELECT * Warning
│   │   │           ├── Deep Nesting Warning
│   │   │           ├── CROSS JOIN Warning
│   │   │           └── Missing WHERE Warning
│   │
├── Metrics Dashboard Page (/sql-metrics-dashboard)
│   ├── MetricsDashboardContent
│   │   ├── Header
│   │   ├── High Risk Alert (conditional)
│   │   ├── Complexity Hero + Gauge
│   │   ├── Metric Cards Grid
│   │   ├── Bar Chart + Execution Cost
│   │   ├── ComplexityBreakdown  [NEW]
│   │   │   ├── Keywords & Clauses Section
│   │   │   ├── SELECT Fields Section
│   │   │   ├── Joins Section
│   │   │   ├── CTEs Section
│   │   │   ├── Subqueries Section
│   │   │   ├── Window Functions Section
│   │   │   └── Score Interpretation
│   │   └── Complexity Factors Breakdown
│   │
└── Guidelines Page (/guideline)
    ├── GuidelineContent
    │   ├── How Scoring Works
    │   ├── Linting & Anti-Patterns
    │   ├── Complexity Weight Matrix
    │   ├── Complexity Level Classification
    │   └── Anti-Pattern Examples
```

## Scoring Algorithm

### Phase 1: Keyword Scoring

```typescript
function scoreKeywords(sql: string) {
  // 1. Count base clause keywords (FROM, WHERE, DISTINCT)
  //    Each match × weight = subtotal

  // 2. Count aggregation keywords (GROUP BY, ORDER BY, HAVING)
  //    Each match × weight = subtotal

  // 3. Count and score each JOIN type
  //    INNER: 4, LEFT/RIGHT: 5, CROSS/FULL: 10

  // 4. Count set operations (UNION, EXCEPT, INTERSECT)
  //    Each match × weight = subtotal

  return { keywords: [...], total: sum }
}
```

### Phase 2: SELECT Field Analysis

```typescript
function analyzeSelectFields(sql: string) {
  // 1. Extract SELECT clause
  // 2. Split by commas into individual fields
  // 3. For each field:
  //    - Classify type (raw/alias/conditional/subquery/aggregate/function)
  //    - Assign complexity points based on type
  // 4. Return array of SelectFieldComplexity objects

  return [
    { field: 'id', type: 'raw', complexity: 1, reason: 'Direct column' },
    { field: 'CASE WHEN...', type: 'conditional', complexity: 5, reason: 'CASE expression' },
    ...
  ]
}
```

### Phase 3: Advanced Structure Scoring

```typescript
function scoreCTEs(sql: string) {
  // Count WITH clauses (CTEs)
  // Each CTE × 8 points = subtotal
  return { count, total };
}

function scoreWindowFunctions(sql: string) {
  // Count OVER clauses: each × 6 points
  // Count PARTITION BY clauses: each × 3 points
  return { count, total };
}

function scoreSubqueries(sql: string) {
  // Count nested SELECT statements (depth > 1)
  // Each subquery × 12 points = total
  // Track max nesting depth
  return { count, maxDepth, total };
}
```

### Phase 4: Total Score & Level Assignment

```typescript
function calculateQueryComplexity(sql: string) {
  // Calculate components
  const keywordScore = scoreKeywords(sql).total;
  const selectScore = analyzeSelectFields(sql).reduce((s, f) => s + f.complexity, 0);
  const cteScore = scoreCTEs(sql).total;
  const windowScore = scoreWindowFunctions(sql).total;
  const subqueryScore = scoreSubqueries(sql).total;

  // Sum all scores
  const totalScore = keywordScore + selectScore + cteScore + windowScore + subqueryScore;

  // Determine level
  if (totalScore > 100) level = 'SUPER HIGH';
  else if (totalScore > 50) level = 'HIGH';
  else if (totalScore > 20) level = 'MEDIUM';
  else level = 'LOW';

  // Collect linting issues
  const lintingIssues = [...checkSelectAll(sql), ...checkOtherLintingRules(sql)];

  return {
    totalScore,
    level,
    scoreBreakdown: { keywords, selectFields, joins, ctes, subqueries, windowFunctions },
    lintingIssues,
    maxScorePossible: 250,
    percentageOfMax: (totalScore / 250) * 100,
  };
}
```

## State Management

### Zustand Store Structure

```typescript
interface AppStore {
  // SQL Input
  rawSql: string;
  setRawSql: (sql: string) => void;

  myBatisXml: string;
  setMyBatisXml: (xml: string) => void;

  resolvedSql: string;
  setResolvedSql: (sql: string) => void;

  // Analysis Results
  analysisResult: AnalysisResult | null;
  setAnalysisResult: (result: AnalysisResult | null) => void;

  // Settings
  dialect: SqlDialect;
  setDialect: (dialect: SqlDialect) => void;

  settings: {
    locale: Locale;
    theme: 'light' | 'dark';
    // ... other settings
  };

  // UI State
  inputMode: 'sql' | 'mybatis';
  setInputMode: (mode: 'sql' | 'mybatis') => void;

  isAnalyzing: boolean;
  setIsAnalyzing: (analyzing: boolean) => void;
}
```

### Data Persistence

```
Browser Storage
└── localStorage
    ├── appStore_rawSql
    ├── appStore_dialect
    ├── appStore_settings
    └── appStore_analysisResult
```

## Performance Considerations

### Time Complexity Analysis

| Operation                    | Complexity | Notes                             |
| ---------------------------- | ---------- | --------------------------------- |
| `calculateQueryComplexity()` | O(n)       | Single pass through SQL string    |
| `scoreKeywords()`            | O(n)       | Regex matching entire string      |
| `analyzeSelectFields()`      | O(m)       | Where m = number of SELECT fields |
| `scoreSubqueries()`          | O(n)       | Single pass tracking parentheses  |
| `checkSelectAll()`           | O(n)       | Single regex match                |
| `checkOtherLintingRules()`   | O(n)       | Multiple regex passes             |

### Space Complexity Analysis

| Data Structure            | Complexity | Notes                                  |
| ------------------------- | ---------- | -------------------------------------- |
| `DetailedComplexityScore` | O(k)       | Where k = number of keyword categories |
| Component State           | O(1)       | Fixed props, no unbounded arrays       |
| Score Breakdown           | O(m)       | Where m = number of SELECT fields      |

### Optimization Opportunities

1. **Memoization**
   - Cache scoring results for identical SQL strings
   - Use React.memo for components that don't change often

2. **Lazy Evaluation**
   - Only calculate detailed breakdown when needed
   - Skip linting checks until user requests analysis

3. **Web Workers** (Future)
   - Move complex calculations to web worker
   - Prevent UI blocking for large queries

## Testing Strategy

### Unit Tests

```typescript
describe('calculateQueryComplexity', () => {
  test('scores simple SELECT as LOW', () => {
    const result = calculateQueryComplexity('SELECT * FROM users');
    expect(result.level).toBe('LOW');
  });

  test('detects SELECT * anti-pattern', () => {
    const result = calculateQueryComplexity('SELECT * FROM users');
    expect(result.lintingIssues.some((i) => i.rule === 'SELECT_ALL')).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('Query Analysis Pipeline', () => {
  test('end-to-end query analysis', () => {
    const sql = 'SELECT ... FROM ... JOIN ...';
    const result = analyzeSql(sql, 'postgresql');
    expect(result.detailedComplexity).toBeDefined();
    expect(result.detailedComplexity.totalScore).toBeGreaterThan(0);
  });
});
```

### Component Tests

```typescript
describe('ComplexityDashboard', () => {
  test('renders score correctly', () => {
    render(<ComplexityDashboard sql={testSql} />);
    expect(screen.getByText('Complexity Level')).toBeInTheDocument();
  });
});
```

## Security Considerations

### Input Validation

- SQL strings are analyzed but never executed
- Regex-based parsing is safe (no code execution)
- User input is never directly injected into commands

### Data Privacy

- Analysis happens entirely on client-side
- No data sent to external servers
- localStorage stores data locally

### XSS Prevention

- All user input sanitized before display
- React automatically escapes text content
- DOM operations use safe React patterns

## Browser Compatibility

| Browser | Support    | Notes                   |
| ------- | ---------- | ----------------------- |
| Chrome  | ✅ Full    | Modern regex support    |
| Firefox | ✅ Full    | Modern regex support    |
| Safari  | ✅ Full    | Modern regex support    |
| Edge    | ✅ Full    | Chromium-based          |
| IE 11   | ⚠️ Partial | Polyfills may be needed |

## Future Enhancement Paths

### Phase 2: AST-Based Analysis

```
Current:  Regex → Scoring
Future:   Regex → AST Parser (dt-sql-parser) → Scoring
```

### Phase 3: Historical Tracking

```
Store scores over time
│
└── Compare query evolution
└── Detect performance regressions
└── Build scoring baselines
```

### Phase 4: Machine Learning Integration

```
Train model on:
- Scores vs actual query times
- Anti-patterns vs failure rates
│
└── Predict actual performance
└── Recommend optimizations
```

### Phase 5: Multi-Database Support

```
Current: Generic scoring
Future:  Database-specific weights
  ├── MySQL optimizations
  ├── PostgreSQL-specific features
  ├── SQL Server specifics
  └── Oracle-specific tuning
```

---

**Architecture Document Version**: 1.0
**Last Updated**: 2025
**Status**: Current as of implementation
