/**
 * SQL Query Complexity Scoring Engine
 * Comprehensive scoring based on keywords, window functions, SELECT fields, and linting rules
 */

export type ComplexityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'SUPER_HIGH';

export interface ComplexityWeights {
  baseClauses: Record<string, number>;
  joins: Record<string, number>;
  aggregations: Record<string, number>;
  advancedStructures: Record<string, number>;
  windowFunctions: Record<string, number>;
  selectFieldTypes: Record<string, number>;
}

export interface SelectFieldComplexity {
  field: string;
  type: 'raw' | 'alias' | 'conditional' | 'subquery' | 'aggregate' | 'function';
  complexity: number;
  reason: string;
}

export interface LintingIssue {
  rule: string;
  severity: 'warning' | 'error';
  message: string;
  suggestion: string;
  location?: string;
}

export interface DetailedComplexityScore {
  totalScore: number;
  level: ComplexityLevel;
  scoreBreakdown: {
    keywords: { category: string; count: number; baseScore: number; subtotal: number }[];
    selectFields: { complexityScore: number; fieldCount: number; avgComplexity: number };
    joins: { count: number; totalScore: number };
    ctes: { count: number; totalScore: number };
    subqueries: { count: number; totalScore: number };
    windowFunctions: { count: number; totalScore: number };
  };
  lintingIssues: LintingIssue[];
  maxScorePossible: number;
  percentageOfMax: number;
}

// ─── Complexity Weight Matrix ──────────────────────────────────────────────

export const COMPLEXITY_WEIGHTS: ComplexityWeights = {
  baseClauses: {
    FROM: 1,
    WHERE: 2,
    DISTINCT: 3,
  },
  aggregations: {
    GROUP_BY: 4,
    ORDER_BY: 3,
    HAVING: 4,
  },
  joins: {
    INNER_JOIN: 4,
    LEFT_JOIN: 5,
    RIGHT_JOIN: 5,
    FULL_OUTER_JOIN: 10,
    CROSS_JOIN: 10,
    NATURAL_JOIN: 5,
  },
  advancedStructures: {
    WITH_CTE: 8, // per CTE
    NESTED_SUBQUERY: 12, // per nesting level
    UNION: 6,
    EXCEPT: 6,
    INTERSECT: 6,
  },
  windowFunctions: {
    OVER: 6,
    ROW_NUMBER: 6,
    RANK: 6,
    DENSE_RANK: 6,
    LEAD: 6,
    LAG: 6,
    FIRST_VALUE: 6,
    LAST_VALUE: 6,
    NTH_VALUE: 6,
    PARTITION_BY: 3,
  },
  selectFieldTypes: {
    raw: 1, // e.g., t.column
    alias: 3, // e.g., t.column AS alias
    conditional: 5, // e.g., CASE WHEN ... THEN ... END
    subquery: 10, // e.g., (SELECT ...) AS sub
    aggregate: 4, // e.g., SUM(column), COUNT(*)
    function: 3, // e.g., UPPER(column), DATE_TRUNC(...)
  },
};

// ─── Score Thresholds ────────────────────────────────────────────────────

const COMPLEXITY_THRESHOLDS = {
  LOW: { min: 0, max: 20 },
  MEDIUM: { min: 21, max: 50 },
  HIGH: { min: 51, max: 100 },
  SUPER_HIGH: { min: 101, max: Infinity },
};

// ─── Linting Rules ──────────────────────────────────────────────────────

export function checkSelectAll(sql: string): LintingIssue[] {
  const issues: LintingIssue[] = [];
  const selectAllPattern = /SELECT\s+\*/gi;

  if (selectAllPattern.test(sql)) {
    issues.push({
      rule: 'SELECT_ALL',
      severity: 'warning',
      message: 'Anti-pattern detected: Avoid using `SELECT *` in large-scale systems.',
      suggestion:
        'Please explicitly define your projection columns to reduce I/O and network overhead.',
    });
  }

  return issues;
}

export function checkOtherLintingRules(sql: string): LintingIssue[] {
  const issues: LintingIssue[] = [];
  const upper = sql.toUpperCase();

  // Deep nesting warning
  let maxDepth = 0;
  let depth = 0;
  for (const ch of sql) {
    if (ch === '(') {
      depth++;
      maxDepth = Math.max(maxDepth, depth);
    } else if (ch === ')') {
      depth--;
    }
  }
  if (maxDepth > 6) {
    issues.push({
      rule: 'DEEP_NESTING',
      severity: 'warning',
      message: `Deep nesting detected (${maxDepth} levels). This may degrade query optimization.`,
      suggestion: 'Consider refactoring using CTEs or breaking into smaller queries.',
    });
  }

  // Cross join warning
  if (/CROSS\s+JOIN/i.test(sql)) {
    issues.push({
      rule: 'CROSS_JOIN',
      severity: 'warning',
      message: 'CROSS JOIN produces Cartesian product. This can exponentially increase row counts.',
      suggestion:
        'Verify this is intentional. Consider adding proper join conditions to replace with INNER JOIN.',
    });
  }

  // Missing WHERE in large query
  if (
    upper.includes('FROM') &&
    !upper.includes('WHERE') &&
    (upper.match(/\b(SELECT|FROM|JOIN)\b/g) || []).length > 3
  ) {
    issues.push({
      rule: 'MISSING_WHERE',
      severity: 'warning',
      message: 'Complex query without WHERE clause. May scan entire tables unnecessarily.',
      suggestion: 'Add filtering predicates to reduce the working set.',
    });
  }

  return issues;
}

// ─── SELECT Field Complexity Analysis ────────────────────────────────────

function analyzeSelectFields(sql: string): SelectFieldComplexity[] {
  const selectMatch = /SELECT\s+([\s\S]+?)\s+FROM/i.exec(sql);
  if (!selectMatch) return [];

  const fieldList = selectMatch[1];
  const fields = fieldList.split(',').map((f) => f.trim());

  return fields.map((field) => {
    if (field.match(/^\*$/)) {
      return {
        field: '*',
        type: 'raw',
        complexity: 1,
        reason: 'Unbounded column selection',
      };
    }

    // Check for scalar subquery
    if (/^\s*\(\s*SELECT/i.test(field)) {
      return {
        field,
        type: 'subquery',
        complexity: COMPLEXITY_WEIGHTS.selectFieldTypes.subquery,
        reason: 'Scalar subquery in SELECT',
      };
    }

    // Remove alias for analysis
    const withoutAlias = field.replace(/\s+AS\s+\w+$/i, '').trim();

    // Check for CASE expression (conditional)
    if (/\bCASE\b/i.test(withoutAlias)) {
      return {
        field,
        type: 'conditional',
        complexity: COMPLEXITY_WEIGHTS.selectFieldTypes.conditional,
        reason: 'CASE WHEN conditional expression',
      };
    }

    // Check for aggregate functions
    if (/\b(SUM|COUNT|AVG|MIN|MAX|GROUP_CONCAT|LISTAGG)\s*\(/i.test(withoutAlias)) {
      return {
        field,
        type: 'aggregate',
        complexity: COMPLEXITY_WEIGHTS.selectFieldTypes.aggregate,
        reason: 'Aggregate function',
      };
    }

    // Check for scalar functions
    if (
      /\b(UPPER|LOWER|TRIM|SUBSTR|LENGTH|DATE_TRUNC|ROUND|CAST|COALESCE|NULLIF)\s*\(/i.test(
        withoutAlias
      )
    ) {
      return {
        field,
        type: 'function',
        complexity: COMPLEXITY_WEIGHTS.selectFieldTypes.function,
        reason: 'Scalar function',
      };
    }

    // Check for aliased field
    if (/\s+AS\s+\w+$/i.test(field)) {
      return {
        field,
        type: 'alias',
        complexity: COMPLEXITY_WEIGHTS.selectFieldTypes.alias,
        reason: 'Aliased expression',
      };
    }

    // Check for complex expression (arithmetic, string ops, etc.)
    if (/[\+\-\*\/\|\|]/i.test(withoutAlias)) {
      return {
        field,
        type: 'alias',
        complexity: COMPLEXITY_WEIGHTS.selectFieldTypes.alias,
        reason: 'Complex expression',
      };
    }

    // Raw field reference
    return {
      field,
      type: 'raw',
      complexity: COMPLEXITY_WEIGHTS.selectFieldTypes.raw,
      reason: 'Direct column reference',
    };
  });
}

// ─── Keyword & Clause Scoring ──────────────────────────────────────────

function scoreKeywords(sql: string): {
  keywords: { category: string; count: number; baseScore: number; subtotal: number }[];
  total: number;
} {
  const upper = sql.toUpperCase();
  const keywords = [];
  let total = 0;

  // Base clauses
  for (const [keyword, weight] of Object.entries(COMPLEXITY_WEIGHTS.baseClauses)) {
    const pattern = new RegExp(`\\b${keyword}\\b`, 'g');
    const count = (upper.match(pattern) || []).length;
    if (count > 0) {
      const subtotal = count * weight;
      keywords.push({ category: keyword, count, baseScore: weight, subtotal });
      total += subtotal;
    }
  }

  // Aggregations
  for (const [keyword, weight] of Object.entries(COMPLEXITY_WEIGHTS.aggregations)) {
    const cleanKeyword = keyword.replace(/_/g, ' ');
    const pattern = new RegExp(`\\b${cleanKeyword}\\b`, 'g');
    const count = (upper.match(pattern) || []).length;
    if (count > 0) {
      const subtotal = count * weight;
      keywords.push({ category: keyword, count, baseScore: weight, subtotal });
      total += subtotal;
    }
  }

  // Joins
  for (const [joinType, weight] of Object.entries(COMPLEXITY_WEIGHTS.joins)) {
    const cleanJoin = joinType.replace(/_/g, ' ');
    const pattern = new RegExp(`\\b${cleanJoin}\\b`, 'g');
    const count = (upper.match(pattern) || []).length;
    if (count > 0) {
      const subtotal = count * weight;
      keywords.push({ category: joinType, count, baseScore: weight, subtotal });
      total += subtotal;
    }
  }

  // Set operations
  for (const op of ['UNION', 'EXCEPT', 'INTERSECT']) {
    const pattern = new RegExp(`\\b${op}\\b`, 'g');
    const count = (upper.match(pattern) || []).length;
    if (count > 0) {
      const weight =
        COMPLEXITY_WEIGHTS.advancedStructures[
          op as keyof typeof COMPLEXITY_WEIGHTS.advancedStructures
        ];
      const subtotal = count * weight;
      keywords.push({ category: op, count, baseScore: weight, subtotal });
      total += subtotal;
    }
  }

  return { keywords, total };
}

// ─── CTE Scoring ──────────────────────────────────────────────────────────

function scoreCTEs(sql: string): { count: number; total: number } {
  const withPattern = /\bWITH\b/gi;
  const cteMatches = sql.match(withPattern) || [];
  const count = cteMatches.length;
  const total = count * COMPLEXITY_WEIGHTS.advancedStructures.WITH_CTE;
  return { count, total };
}

// ─── Window Function Scoring ──────────────────────────────────────────────

function scoreWindowFunctions(sql: string): { count: number; total: number } {
  const overPattern = /\bOVER\s*\(/gi;
  const windowFunctions = sql.match(overPattern) || [];
  const count = windowFunctions.length;

  // Each OVER clause also likely includes PARTITION BY
  const partitionPattern = /\bPARTITION\s+BY\b/gi;
  const partitions = sql.match(partitionPattern) || [];

  let total = count * COMPLEXITY_WEIGHTS.windowFunctions.OVER;
  total += partitions.length * COMPLEXITY_WEIGHTS.windowFunctions.PARTITION_BY;

  return { count, total };
}

// ─── Nested Subquery Scoring ────────────────────────────────────────────

function scoreSubqueries(sql: string): { count: number; maxDepth: number; total: number } {
  let depth = 0;
  let maxDepth = 0;
  let selectCount = 0;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const nextTwo = sql.slice(i, i + 2);

    // Handle strings
    if (!inString && (ch === "'" || ch === '"' || ch === '`')) {
      inString = true;
      stringChar = ch;
    } else if (inString && ch === stringChar && sql[i - 1] !== '\\') {
      inString = false;
    }

    if (inString) continue;

    // Track parentheses
    if (ch === '(') {
      depth++;
      maxDepth = Math.max(maxDepth, depth);

      // Check if next non-whitespace token is SELECT
      const afterParen = sql.slice(i + 1).trimStart();
      if (/^SELECT\b/i.test(afterParen) && depth > 1) {
        // Subqueries are nested SELECT inside parentheses (not top-level)
        selectCount++;
      }
    } else if (ch === ')') {
      depth--;
    }
  }

  const subqueryLevels = Math.max(0, maxDepth - 1);
  const total = selectCount * COMPLEXITY_WEIGHTS.advancedStructures.NESTED_SUBQUERY;

  return { count: selectCount, maxDepth: subqueryLevels, total };
}

// ─── Main Complexity Calculation ────────────────────────────────────────

export function calculateQueryComplexity(sql: string): DetailedComplexityScore {
  const keywords = scoreKeywords(sql);
  const selectFields = analyzeSelectFields(sql);
  const ctes = scoreCTEs(sql);
  const windowFunctions = scoreWindowFunctions(sql);
  const subqueries = scoreSubqueries(sql);

  // Calculate SELECT field complexity
  const selectComplexityScore = selectFields.reduce((sum, field) => sum + field.complexity, 0);
  const selectFieldCount = selectFields.filter((f) => f.field !== '*').length;
  const avgSelectComplexity = selectFieldCount > 0 ? selectComplexityScore / selectFieldCount : 0;

  // Calculate total score
  let totalScore =
    keywords.total + selectComplexityScore + ctes.total + windowFunctions.total + subqueries.total;

  // Calculate max possible score (estimate for scaling)
  const maxScorePossible = 250; // Reasonable cap for very complex queries

  // Determine complexity level
  let level: ComplexityLevel = 'LOW';
  if (totalScore > 100) {
    level = 'SUPER_HIGH';
  } else if (totalScore > 50) {
    level = 'HIGH';
  } else if (totalScore > 20) {
    level = 'MEDIUM';
  }

  // Collect linting issues
  const lintingIssues = [...checkSelectAll(sql), ...checkOtherLintingRules(sql)];

  return {
    totalScore,
    level,
    scoreBreakdown: {
      keywords: keywords.keywords,
      selectFields: {
        complexityScore: selectComplexityScore,
        fieldCount: selectFieldCount,
        avgComplexity: avgSelectComplexity,
      },
      joins: {
        count: (sql.match(/\bJOIN\b/gi) || []).length,
        totalScore: keywords.keywords
          .filter((k) => k.category.includes('JOIN'))
          .reduce((sum, k) => sum + k.subtotal, 0),
      },
      ctes: {
        count: ctes.count,
        totalScore: ctes.total,
      },
      subqueries: {
        count: subqueries.count,
        totalScore: subqueries.total,
      },
      windowFunctions: {
        count: windowFunctions.count,
        totalScore: windowFunctions.total,
      },
    },
    lintingIssues,
    maxScorePossible,
    percentageOfMax: (totalScore / maxScorePossible) * 100,
  };
}

export function getComplexityColor(level: ComplexityLevel): {
  bg: string;
  text: string;
  border: string;
} {
  switch (level) {
    case 'LOW':
      return {
        bg: 'bg-green-50 dark:bg-green-950',
        text: 'text-green-700 dark:text-green-300',
        border: 'border-green-200 dark:border-green-800',
      };
    case 'MEDIUM':
      return {
        bg: 'bg-yellow-50 dark:bg-yellow-950',
        text: 'text-yellow-700 dark:text-yellow-300',
        border: 'border-yellow-200 dark:border-yellow-800',
      };
    case 'HIGH':
      return {
        bg: 'bg-orange-50 dark:bg-orange-950',
        text: 'text-orange-700 dark:text-orange-300',
        border: 'border-orange-200 dark:border-orange-800',
      };
    case 'SUPER_HIGH':
      return {
        bg: 'bg-red-50 dark:bg-red-950',
        text: 'text-red-700 dark:text-red-300',
        border: 'border-red-200 dark:border-red-800',
      };
  }
}
