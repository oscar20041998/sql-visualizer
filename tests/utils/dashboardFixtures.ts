import type { AnalysisResult } from '@/lib/sql/sqlAnalyzer';
import type { DetailedComplexityScore, LintingIssue } from '@/lib/sql/complexityScorer';

/**
 * Shared fixtures for the SQL Intelligence Dashboard tests (specs/010-sql-intelligence-dashboard).
 * Pure data builders — no analysis is recomputed here; tests seed the store with these.
 */

/** Mixed-severity linting issues: one error rule occurring twice (with locations) and two warning rules. */
export const SAMPLE_LINTING_ISSUES: LintingIssue[] = [
  {
    rule: 'R-ERR-1',
    severity: 'error',
    message: 'error message one',
    suggestion: 'error fix one',
    location: 'Line 12: SELECT *',
  },
  {
    rule: 'R-ERR-1',
    severity: 'error',
    message: 'error message one',
    suggestion: 'error fix one',
    location: 'Line 40: SELECT *',
  },
  {
    rule: 'R-WARN-1',
    severity: 'warning',
    message: 'warning message one',
    suggestion: 'warning fix one',
  },
  {
    rule: 'R-WARN-2',
    severity: 'warning',
    message: 'warning message two',
    suggestion: 'warning fix two',
    location: 'Line 7: JOIN without condition',
  },
];

/** Breakdown is internally consistent: parts sum to `totalScore` (25+25+16+24+21 = 111). */
export function makeDetailedComplexity(
  overrides: Partial<DetailedComplexityScore> = {}
): DetailedComplexityScore {
  return {
    totalScore: 111,
    level: 'HIGH',
    levelLabel: 'High',
    levelThresholds: [],
    scoreBreakdown: {
      keywords: [
        { category: 'LEFT JOIN', count: 3, baseScore: 5, subtotal: 15 },
        { category: 'GROUP BY', count: 2, baseScore: 4, subtotal: 8 },
        { category: 'WHERE', count: 1, baseScore: 2, subtotal: 2 },
      ],
      selectFields: {
        complexityScore: 25,
        fieldCount: 10,
        avgComplexity: 2.5,
        factors: [
          { type: 'raw', count: 8, weight: 1, subtotal: 8 },
          { type: 'aggregate', count: 2, weight: 4, subtotal: 8 },
        ],
      },
      joins: { count: 3, totalScore: 15 },
      ctes: { count: 2, totalScore: 16 },
      subqueries: { count: 2, totalScore: 24 },
      windowFunctions: { count: 3, totalScore: 21 },
    },
    lintingIssues: SAMPLE_LINTING_ISSUES,
    maxScorePossible: 95,
    percentageOfMax: 117,
    // Deterministic presentation fields (raw 111 → round(100 × 111 / 216) = 51 → MEDIUM).
    normalizedScore: 51,
    normalizedLevel: 'MEDIUM',
    normalizedThresholds: [],
    ...overrides,
  };
}

export function makeAnalysisResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    tables: [
      { id: 't1', name: 'users', alias: 'u', columns: ['id', 'name'], sourceType: 'TABLE' },
      { id: 't2', name: 'orders', alias: 'o', columns: ['id', 'user_id'], sourceType: 'TABLE' },
      {
        id: 'c1',
        name: 'user_totals',
        columns: ['user_id', 'total'],
        sourceType: 'CTE',
        isCTE: true,
      },
    ],
    joins: [
      { id: 'j1', source: 'u', target: 'o', joinType: 'LEFT JOIN', condition: 'u.id = o.user_id' },
    ],
    joinAnalysisDetails: [],
    ctes: [
      {
        id: 'cte1',
        name: 'user_totals',
        body: 'SELECT user_id, SUM(amount) total FROM orders GROUP BY user_id',
        tables: ['orders'],
        fields: ['user_id', 'total'],
        usageCount: 1,
        dependencies: ['orders'],
        isRecursive: false,
        estimatedComplexity: 'LOW',
        isUnused: false,
        columnReferences: [],
        lineCount: 2,
        nestedSubqueries: [],
      },
    ],
    metrics: {
      windowFunctions: 3,
      groupBy: 2,
      orderBy: 1,
      distinct: 0,
      having: 0,
      where: 4,
      subqueryDepth: 2,
      subqueryCount: 2,
      conditionCount: 19,
      operationAndFunctionCount: 6,
      lineCount: 40,
      joinCount: 3,
      totalJoinCount: 4,
      cteCount: 1,
      tableCount: 2,
      selectFields: 10,
      finalSelectFieldCount: 8,
    },
    complexity: {
      level: 'HIGH',
      score: 111,
      maxScore: 95,
      factors: [
        { name: 'LEFT JOIN', value: 3, weight: 5, contribution: 15 },
        { name: 'CTE', value: 2, weight: 8, contribution: 16 },
      ],
    },
    detailedComplexity: makeDetailedComplexity(),
    executionCost: {
      label: 'High',
      score: 80,
      maxScore: 100,
      factors: [],
      recommendation: 'Review join conditions',
    },
    mainQueryFields: [
      { field: 'u.name', alias: 'name', origin: 'users', sourceTable: 'users', type: 'table' },
    ],
    dialect: 'mysql',
    rawSql: 'SELECT u.name FROM users u LEFT JOIN orders o ON u.id = o.user_id',
    structuralReport: {
      joinCount: 3,
      subqueryCount: 2,
      conditionCount: 19,
      operationAndFunctionCount: 6,
      lineCount: 40,
      joinLogicComplexity: {
        level: 'MEDIUM',
        score: 12,
        totalJoinConditions: 3,
        simpleConditions: 2,
        multiColumnConditions: 1,
        functionBasedConditions: 0,
        nonEquiConditions: 0,
      },
      allFields: [{ expression: 'u.name', alias: 'name', category: 'standard' }],
      allFieldsCount: 10,
      finalSelectFields: [{ expression: 'u.name', alias: 'name', category: 'standard' }],
      finalSelectFieldCount: 8,
      hasCTE: true,
      subqueries: [],
    },
    metricDetails: {
      subqueries: [],
      windowFunctions: [],
      groupBy: [],
      orderBy: [],
      distinct: [],
      conditions: [],
      opsAndFunctions: [],
    },
    hasCTE: true,
    ...overrides,
  };
}
