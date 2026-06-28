/**
 * SQL Query Complexity Scoring Engine
 * Comprehensive scoring based on keywords, window functions, SELECT fields, and linting rules
 */

import { getT, type Locale, type Translations } from './i18n';

const SCORE_LIST_KEY = 'complexityScoreList';

export type ComplexityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'SUPER_HIGH';

type ComplexityLevelLabelKey =
  | 'complexityLow'
  | 'complexityMedium'
  | 'complexityHigh'
  | 'complexitySuper';

interface ComplexityLevelDefinition {
  level: ComplexityLevel;
  min: number;
  max: number;
  labelKey: ComplexityLevelLabelKey;
}

export interface ComplexityLevelItem {
  level: ComplexityLevel;
  label: string;
  min: number;
  max: number;
}

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
  levelLabel: string;
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

// const COMPLEXITY_LEVEL_DEFINITIONS: ComplexityLevelDefinition[] = [
//   { level: 'LOW', min: 0, max: 20, labelKey: 'complexityLow' },
//   { level: 'MEDIUM', min: 21, max: 50, labelKey: 'complexityMedium' },
//   { level: 'HIGH', min: 51, max: 100, labelKey: 'complexityHigh' },
//   { level: 'SUPER_HIGH', min: 101, max: Infinity, labelKey: 'complexitySuper' },
// ];

export function getComplexityLevelList(locale: Locale = 'en', definitions: ComplexityLevelDefinition[]): ComplexityLevelItem[] {
  const t = getT(locale);
  return definitions.map((item) => ({
    level: item.level,
    label: t[item.labelKey],
    min: item.min,
    max: item.max,
  }));
}

/**
 * Generates dynamic complexity level definitions based on the median score.
 * This allows for adaptive thresholds based on the distribution of scores.
 */
export function generateComplexityDefinitions(median: number, locale: Locale = 'en'): ComplexityLevelDefinition[] {
  const t = getT(locale);
  // Ensure median is at least 10 to avoid overly low thresholds
  const safeMedian = Math.max(median, 10);

  const lowMax = Math.round(safeMedian * 0.5);       // Half of Median
  const mediumMax = Math.round(safeMedian);           // Median
  const highMax = Math.round(safeMedian * 2);         // Double Median

  return [
    { level: 'LOW', min: 0, max: lowMax, labelKey: 'complexityLow' },
    { level: 'MEDIUM', min: lowMax + 1, max: mediumMax, labelKey: 'complexityMedium' },
    { level: 'HIGH', min: mediumMax + 1, max: highMax, labelKey: 'complexityHigh' },
    { level: 'SUPER_HIGH', min: highMax + 1, max: Infinity, labelKey: 'complexitySuper' },
  ];
}

/**
 * Hàm tính Median từ danh sách scores lấy từ localStorage và phân loại Level động
 */
export function calculateScoredByMedian(scores: number[]): { median: number; level: ComplexityLevel; dynamicDefinitions: ComplexityLevelDefinition[] } {
  if (!scores || scores.length === 0) {
    return { median: 0, level: 'LOW', dynamicDefinitions: generateComplexityDefinitions(0) };
  }

  // Khử nhiễu & sắp xếp
  const sortedScores = [...scores].sort((a, b) => a - b);
  const len = sortedScores.length;
  const mid = Math.floor(len / 2);  

  // Tính số trung vị (Median)
  const median = len % 2 !== 0 
    ? sortedScores[mid] 
    : (sortedScores[mid - 1] + sortedScores[mid]) / 2;

  // Khởi tạo các mốc khoảng cách MỚI dựa trên Median vừa tính
  const dynamicDefinitions = generateComplexityDefinitions(median);

  // Đối chiếu tìm Level hiện tại
  const level = dynamicDefinitions.find(
    (item) => median >= item.min && median <= item.max
  )?.level || 'LOW';

  return { median, level, dynamicDefinitions };
}

export function getScoresFromLocalStorage(): number[] {
  try {
    const rawData = localStorage.getItem(SCORE_LIST_KEY);
    if (!rawData) {
      return [];
    }
    const parsed = JSON.parse(rawData);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is number => typeof item === 'number' && !isNaN(item));
    }
    return [];
  } catch (error) {
    console.error('Error parsing scores from localStorage:', error);
    return [];
  }
}
// ─── Linting Rules ──────────────────────────────────────────────────────

export function checkSelectAll(sql: string, t: Translations = getT('en')): LintingIssue[] {
  const issues: LintingIssue[] = [];
  const selectAllPattern = /SELECT\s+\*/gi;

  if (selectAllPattern.test(sql)) {
    issues.push({
      rule: t.lintingSelectAll,
      severity: 'warning',
      message: t.lintingSelectAllMessage,
      suggestion: t.lintingSelectAllSuggestion,
    });
  }

  return issues;
}

export function checkOtherLintingRules(sql: string, t: Translations = getT('en')): LintingIssue[] {
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
      rule: t.lintingDeepNesting,
      severity: 'warning',
      message: t.lintingDeepNestingMessage,
      suggestion: t.lintingDeepNestingSuggestion,
      location: `${maxDepth} levels`,
    });
  }

  // Cross join warning
  if (/CROSS\s+JOIN/i.test(sql)) {
    issues.push({
      rule: t.lintingCrossJoin,
      severity: 'warning',
      message: t.lintingCrossJoinMessage,
      suggestion: t.lintingCrossJoinSuggestion,
    });
  }

  // Missing WHERE in large query
  if (
    upper.includes('FROM') &&
    !upper.includes('WHERE') &&
    (upper.match(/\b(SELECT|FROM|JOIN)\b/g) || []).length > 3
  ) {
    issues.push({
      rule: t.lintingMissingWhere,
      severity: 'warning',
      message: t.lintingMissingWhereMessage,
      suggestion: t.lintingMissingWhereSuggestion,
    });
  }

  return issues;
}

// ─── SELECT Field Complexity Analysis ────────────────────────────────────

function analyzeSelectFields(sql: string, t: Translations = getT('en')): SelectFieldComplexity[] {
  const selectMatch = /SELECT\s+([\s\S]+?)\s+FROM/i.exec(sql);
  if (!selectMatch) return [];

  const fieldList = selectMatch[1];
  const fields = splitSelectFields(fieldList);

  return fields.map((field) => {
    if (field.match(/^\*$/)) {
      return {
        field: '*',
        type: 'raw',
        complexity: 1,
        reason: t.complexityFieldReasonUnboundedSelection,
      };
    }

    // Check for scalar subquery
    if (/^\s*\(\s*SELECT/i.test(field)) {
      return {
        field,
        type: 'subquery',
        complexity: COMPLEXITY_WEIGHTS.selectFieldTypes.subquery,
        reason: t.complexityFieldReasonScalarSubquery,
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
        reason: t.complexityFieldReasonCaseWhen,
      };
    }

    // Check for aggregate functions
    if (/\b(SUM|COUNT|AVG|MIN|MAX|GROUP_CONCAT|LISTAGG)\s*\(/i.test(withoutAlias)) {
      return {
        field,
        type: 'aggregate',
        complexity: COMPLEXITY_WEIGHTS.selectFieldTypes.aggregate,
        reason: t.complexityFieldReasonAggregate,
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
        reason: t.complexityFieldReasonScalarFunction,
      };
    }

    // Check for aliased field
    if (/\s+AS\s+\w+$/i.test(field)) {
      return {
        field,
        type: 'alias',
        complexity: COMPLEXITY_WEIGHTS.selectFieldTypes.alias,
        reason: t.complexityFieldReasonAliasedExpression,
      };
    }

    // Check for complex expression (arithmetic, string ops, etc.)
    if (/[\+\-\*\/\|\|]/i.test(withoutAlias)) {
      return {
        field,
        type: 'alias',
        complexity: COMPLEXITY_WEIGHTS.selectFieldTypes.alias,
        reason: t.complexityFieldReasonComplexExpression,
      };
    }

    // Raw field reference
    return {
      field,
      type: 'raw',
      complexity: COMPLEXITY_WEIGHTS.selectFieldTypes.raw,
      reason: t.complexityFieldReasonDirectColumn,
    };
  });
}

function splitSelectFields(fieldList: string): string[] {
  const fields: string[] = [];
  let current = '';
  let depth = 0;
  let quote: string | null = null;

  for (let i = 0; i < fieldList.length; i++) {
    const ch = fieldList[i];
    const next = fieldList[i + 1];

    if (quote) {
      current += ch;
      if (ch === quote) {
        if (next === quote) {
          current += next;
          i++;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      current += ch;
      continue;
    }

    if (ch === '(') {
      depth++;
      current += ch;
      continue;
    }

    if (ch === ')') {
      depth = Math.max(0, depth - 1);
      current += ch;
      continue;
    }

    if (ch === ',' && depth === 0) {
      const trimmed = current.trim();
      if (trimmed) fields.push(trimmed);
      current = '';
      continue;
    }

    current += ch;
  }

  const tail = current.trim();
  if (tail) fields.push(tail);
  return fields;
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
  let specificJoinCount = 0;
  for (const [joinType, weight] of Object.entries(COMPLEXITY_WEIGHTS.joins)) {
    const cleanJoin = joinType.replace(/_/g, ' ');
    const pattern = new RegExp(`\\b${cleanJoin}\\b`, 'g');
    const count = (upper.match(pattern) || []).length;
    if (count > 0) {
      const subtotal = count * weight;
      keywords.push({ category: joinType, count, baseScore: weight, subtotal });
      total += subtotal;
      specificJoinCount += count;
    }
  }

  // Bare JOIN (without explicit type) inherits INNER JOIN weight.
  const totalJoinCount = (upper.match(/\bJOIN\b/g) || []).length;
  const bareJoinCount = Math.max(0, totalJoinCount - specificJoinCount);
  if (bareJoinCount > 0) {
    const weight = COMPLEXITY_WEIGHTS.joins.INNER_JOIN;
    const subtotal = bareJoinCount * weight;
    keywords.push({ category: 'JOIN', count: bareJoinCount, baseScore: weight, subtotal });
    total += subtotal;
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
  const count = countCteDefinitions(sql);
  const total = count * COMPLEXITY_WEIGHTS.advancedStructures.WITH_CTE;
  return { count, total };
}

function countCteDefinitions(sql: string): number {
  const withMatch = /^\s*WITH\s+/i.exec(sql);
  if (!withMatch) return 0;

  const len = sql.length;
  let pos = withMatch[0].length;
  let count = 0;

  function skipWhitespaceAndCommas(): void {
    while (pos < len && /[\s,]/.test(sql[pos])) pos++;
  }

  function skipQuoted(startQuote: string): void {
    pos++;
    while (pos < len) {
      if (sql[pos] === startQuote && sql[pos + 1] === startQuote) {
        pos += 2;
      } else if (sql[pos] === startQuote) {
        pos++;
        break;
      } else {
        pos++;
      }
    }
  }

  while (pos < len && count < 100) {
    skipWhitespaceAndCommas();
    if (pos >= len) break;

    const recursiveMatch = /^RECURSIVE\s+/i.exec(sql.slice(pos));
    if (recursiveMatch) pos += recursiveMatch[0].length;

    const nameMatch = /^(?:"[^"]+"|`[^`]+`|\[[^\]]+\]|\w+)\s*/i.exec(sql.slice(pos));
    if (!nameMatch) break;
    pos += nameMatch[0].length;

    const asMatch = /^AS\s*/i.exec(sql.slice(pos));
    if (!asMatch) break;
    pos += asMatch[0].length;

    if (sql[pos] !== '(') break;
    pos++;
    count++;

    let depth = 1;
    while (pos < len && depth > 0) {
      const ch = sql[pos];
      if (ch === "'" || ch === '"' || ch === '`') {
        skipQuoted(ch);
        continue;
      }
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      pos++;
    }

    let lookahead = pos;
    while (lookahead < len && /\s/.test(sql[lookahead])) lookahead++;
    if (lookahead >= len || sql[lookahead] !== ',') break;
    pos = lookahead + 1;
  }

  return count;
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
      if (/^SELECT\b/i.test(afterParen) && depth >= 1) {
        // Any SELECT inside parentheses is treated as a subquery.
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

export function calculateQueryComplexity(
  sql: string,
  locale: Locale = 'en'
): DetailedComplexityScore {
  const t = getT(locale);
  const keywords = scoreKeywords(sql);
  const selectFields = analyzeSelectFields(sql, t);
  const ctes = scoreCTEs(sql);
  const windowFunctions = scoreWindowFunctions(sql);
  const subqueries = scoreSubqueries(sql);

  // Calculate SELECT field complexity
  const selectComplexityScore = selectFields.reduce((sum, field) => sum + field.complexity, 0);
  const selectFieldCount = selectFields.filter((f) => f.field !== '*').length;
  const avgSelectComplexity = selectFieldCount > 0 ? selectComplexityScore / selectFieldCount : 0;
  const scoreList = getScoresFromLocalStorage();

  // Calculate total score
  let totalScore =
    keywords.total + selectComplexityScore + ctes.total + windowFunctions.total + subqueries.total;

  // Calculate max possible score (estimate for scaling)
  const dataScoreAnalyis = calculateScoredByMedian(scoreList); // Reasonable cap for very complex queries

  const levelList = getComplexityLevelList(locale, dataScoreAnalyis.dynamicDefinitions);
  // Determine complexity level from the level definition list.
  const matchedLevel =
    levelList.find((item) => totalScore >= item.min && totalScore <= item.max) || levelList[0];
  const level = matchedLevel.level;

  // Collect linting issues
  const lintingIssues = [...checkSelectAll(sql, t), ...checkOtherLintingRules(sql, t)];

  // Store the score in localStorage for future median calculations
  scoreList.push(totalScore);
  localStorage.setItem(SCORE_LIST_KEY, JSON.stringify(scoreList));

  return {
    totalScore,
    level,
    levelLabel: matchedLevel.label,
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
    maxScorePossible: dataScoreAnalyis.median,
    percentageOfMax: (totalScore / dataScoreAnalyis.median) * 100,
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
