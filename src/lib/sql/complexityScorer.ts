/**
 * SQL Query Complexity Scoring Engine
 * Comprehensive scoring based on keywords, window functions, SELECT fields, and linting rules
 */

import { getT, type Locale, type Translations } from '../i18n';
import { COMPLEXITY_SCORER_CONSTANTS } from '../../app/common/sqlAnalyzerUtils';

const SCORE_LIST_KEY = 'complexityScoreList';

export type ComplexityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'SUPER_HIGH';

type ComplexityLevelLabelKey =
  | 'complexityLow'
  | 'complexityMedium'
  | 'complexityHigh'
  | 'complexitySuperHigh';

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
  levelThresholds: ComplexityLevelItem[];
  scoreBreakdown: {
    keywords: { category: string; count: number; baseScore: number; subtotal: number }[];
    selectFields: {
      complexityScore: number;
      fieldCount: number;
      avgComplexity: number;
      factors?: {
        type: SelectFieldComplexity['type'];
        count: number;
        weight: number;
        subtotal: number;
      }[];
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
// These thresholds are used to categorize the overall complexity score into levels.
export function getComplexityLevelList(
  locale: Locale = 'en',
  definitions: ComplexityLevelDefinition[]
): ComplexityLevelItem[] {
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
export function generateComplexityDefinitions(
  median: number,
  locale: Locale = 'en'
): ComplexityLevelDefinition[] {
  const t = getT(locale);
  // Ensure median is at least MIN_SAFE_MEDIAN to avoid overly low thresholds
  const safeMedian = Math.max(median, COMPLEXITY_SCORER_CONSTANTS.MIN_SAFE_MEDIAN);

  const lowMax = Math.round(safeMedian * COMPLEXITY_SCORER_CONSTANTS.LOW_THRESHOLD_RATIO); // Half of Median
  const mediumMax = Math.round(safeMedian * COMPLEXITY_SCORER_CONSTANTS.MEDIUM_THRESHOLD_RATIO); // Median
  const highMax = Math.round(safeMedian * COMPLEXITY_SCORER_CONSTANTS.HIGH_THRESHOLD_RATIO); // Double Median

  return [
    { level: 'LOW', min: 0, max: lowMax, labelKey: 'complexityLow' },
    { level: 'MEDIUM', min: lowMax + 1, max: mediumMax, labelKey: 'complexityMedium' },
    { level: 'HIGH', min: mediumMax + 1, max: highMax, labelKey: 'complexityHigh' },
    { level: 'SUPER_HIGH', min: highMax + 1, max: Infinity, labelKey: 'complexitySuperHigh' },
  ];
}

/**
 * Calculates the median score from a list of scores and determines the corresponding complexity level.
 */
export function calculateScoredByMedian(scores: number[]): {
  median: number;
  level: ComplexityLevel;
  dynamicDefinitions: ComplexityLevelDefinition[];
} {
  if (!scores || scores.length === 0) {
    return { median: 0, level: 'LOW', dynamicDefinitions: generateComplexityDefinitions(0) };
  }

  // Remove noise & sort
  const sortedScores = [...scores].sort((a, b) => a - b);
  const len = sortedScores.length;
  const mid = Math.floor(len / 2);

  // Calculate median
  const median =
    len % 2 !== 0 ? sortedScores[mid] : (sortedScores[mid - 1] + sortedScores[mid]) / 2;

  // Initialize new dynamic thresholds based on the calculated median
  const dynamicDefinitions = generateComplexityDefinitions(median);

  // Determine the current level
  const level =
    dynamicDefinitions.find((item) => median >= item.min && median <= item.max)?.level || 'LOW';

  return { median, level, dynamicDefinitions };
}

function normalizeUniqueScores(scores: number[]): number[] {
  const validScores = scores.filter(
    (item): item is number => typeof item === 'number' && !isNaN(item)
  );
  return [...new Set(validScores)];
}

/**
 * Retrieves the list of complexity scores from localStorage, ensuring they are unique and valid numbers.
 */
export function getScoresFromLocalStorage(): number[] {
  try {
    const rawData = localStorage.getItem(SCORE_LIST_KEY);
    if (!rawData) {
      return [];
    }
    const parsed = JSON.parse(rawData);
    if (Array.isArray(parsed)) {
      return normalizeUniqueScores(parsed);
    }
    return [];
  } catch (error) {
    console.error('Error parsing scores from localStorage:', error);
    return [];
  }
}
// ─── Linting Rules ──────────────────────────────────────────────────────

function stripSqlNoise(sql: string, maskStringContents = true): string {
  let result = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < sql.length; index++) {
    const char = sql[index];
    const next = sql[index + 1];

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
        result += char;
      } else {
        result += ' ';
      }
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        result += '  ';
        index++;
      } else {
        result += char === '\n' ? '\n' : ' ';
      }
      continue;
    }

    if (inSingleQuote) {
      if (char === "'" && next === "'") {
        result += maskStringContents ? '  ' : "''";
        index++;
      } else if (char === "'") {
        inSingleQuote = false;
        result += maskStringContents ? ' ' : char;
      } else {
        result += maskStringContents && char !== '\n' ? ' ' : char;
      }
      continue;
    }

    if (inDoubleQuote) {
      if (char === '"' && next === '"') {
        result += maskStringContents ? '  ' : '""';
        index++;
      } else if (char === '"') {
        inDoubleQuote = false;
        result += maskStringContents ? ' ' : char;
      } else {
        result += maskStringContents && char !== '\n' ? ' ' : char;
      }
      continue;
    }

    if (inBacktick) {
      if (char === '`') {
        inBacktick = false;
        result += maskStringContents ? ' ' : char;
      } else {
        result += maskStringContents && char !== '\n' ? ' ' : char;
      }
      continue;
    }

    if (char === '-' && next === '-') {
      inLineComment = true;
      result += ' ';
      index++;
      continue;
    }

    if (char === '/' && next === '*') {
      inBlockComment = true;
      result += ' ';
      index++;
      continue;
    }

    if (char === "'") {
      inSingleQuote = true;
      result += maskStringContents ? ' ' : char;
      continue;
    }

    if (char === '"') {
      inDoubleQuote = true;
      result += maskStringContents ? ' ' : char;
      continue;
    }

    if (char === '`') {
      inBacktick = true;
      result += maskStringContents ? ' ' : char;
      continue;
    }

    result += char;
  }

  return result;
}

function getLineContext(sql: string, pattern: RegExp): string | undefined {
  const normalizedSql = sql.replace(/\r\n?|\u2028|\u2029/g, '\n');
  const cleanedSql = stripSqlNoise(normalizedSql);
  pattern.lastIndex = 0;
  const result = pattern.exec(cleanedSql);
  pattern.lastIndex = 0;

  if (!result || result.index === undefined) {
    return undefined;
  }

  const lineNumber = cleanedSql.slice(0, result.index).split('\n').length;
  return getLineContextByLineNumber(normalizedSql, lineNumber) ?? `${lineNumber}`;
}

function getNestedLineContext(sql: string, outerPattern: RegExp, nestedPattern: RegExp): string | undefined {
  const normalizedSql = sql.replace(/\r\n?|\u2028|\u2029/g, '\n');
  const cleanedSql = stripSqlNoise(normalizedSql);
  outerPattern.lastIndex = 0;
  const outerMatch = outerPattern.exec(cleanedSql);
  outerPattern.lastIndex = 0;
  if (!outerMatch || outerMatch.index === undefined) return undefined;

  nestedPattern.lastIndex = 0;
  const nestedMatch = nestedPattern.exec(outerMatch[0]);
  nestedPattern.lastIndex = 0;
  if (!nestedMatch || nestedMatch.index === undefined) return undefined;

  const absoluteIndex = outerMatch.index + nestedMatch.index;
  const lineNumber = cleanedSql.slice(0, absoluteIndex).split('\n').length;
  return getLineContextByLineNumber(normalizedSql, lineNumber) ?? `${lineNumber}`;
}

function getLineContextByLineNumber(sql: string, lineNumber: number): string | undefined {
  const normalizedSql = sql.replace(/\r\n?|\u2028|\u2029/g, '\n');
  const lines = normalizedSql.split('\n');
  const lineText = lines[Math.max(0, lineNumber - 1)]?.trim();

  return lineText ? `${lineNumber}: ${lineText}` : undefined;
}

function getMaxDepthLineContext(sql: string): string | undefined {
  const normalizedSql = sql.replace(/\r\n?|\u2028|\u2029/g, '\n');
  let depth = 0;
  let maxDepth = 0;
  let maxDepthLine = 1;
  let lineNumber = 1;

  for (const ch of normalizedSql) {
    if (ch === '\n') {
      lineNumber++;
      continue;
    }

    if (ch === '(') {
      depth++;
      if (depth > maxDepth) {
        maxDepth = depth;
        maxDepthLine = lineNumber;
      }
    } else if (ch === ')') {
      depth = Math.max(0, depth - 1);
    }
  }

  return maxDepth > 0 ? getLineContextByLineNumber(normalizedSql, maxDepthLine) : undefined;
}

export function checkSelectAll(sql: string, locale: Locale = 'en'): LintingIssue[] {
  const issues: LintingIssue[] = [];
  const selectAllPattern = /SELECT\s+\*/gi;
  const t = getT(locale);

  if (selectAllPattern.test(sql)) {
    issues.push({
      rule: t.lintingSelectAll,
      severity: 'warning',
      message: t.lintingSelectAllMessage,
      suggestion: t.lintingSelectAllSuggestion,
      location: getLineContext(sql, /SELECT\s+\*/i) ?? 'SELECT *',
    });
  }

  return issues;
}

export function checkOtherLintingRules(sql: string, locale: Locale = 'en'): LintingIssue[] {
  const issues: LintingIssue[] = [];
  const sanitizedSql = stripSqlNoise(sql);
  const commentFreeSql = stripSqlNoise(sql, false);
  const upper = sanitizedSql.toUpperCase();
  const t = getT(locale);

  // Deep nesting warning
  let maxDepth = 0;
  let depth = 0;
  for (const ch of sanitizedSql) {
    if (ch === '(') {
      depth++;
      maxDepth = Math.max(maxDepth, depth);
    } else if (ch === ')') {
      depth--;
    }
  }
  if (maxDepth > COMPLEXITY_SCORER_CONSTANTS.MAX_NESTING_DEPTH_WARNING) {
    issues.push({
      rule: t.lintingDeepNesting,
      severity: 'warning',
      message: t.lintingDeepNestingMessage,
      suggestion: t.lintingDeepNestingSuggestion,
      location: getMaxDepthLineContext(sql) ?? `${maxDepth} levels`,
    });
  }

  // Cross join warning
  if (/CROSS\s+JOIN/i.test(sanitizedSql)) {
    issues.push({
      rule: t.lintingCrossJoin,
      severity: 'warning',
      message: t.lintingCrossJoinMessage,
      suggestion: t.lintingCrossJoinSuggestion,
      location: getLineContext(sql, /CROSS\s+JOIN/i) ?? 'CROSS JOIN',
    });
  }

  // Distinct/deduplication warning
  if (/\bDISTINCT\b/i.test(sanitizedSql) || /\bCOUNT\s*\(\s*DISTINCT\b/i.test(sanitizedSql)) {
    issues.push({
      rule: t.lintingDistinct,
      severity: 'warning',
      message: t.lintingDistinctMessage,
      suggestion: t.lintingDistinctSuggestion,
      location: getLineContext(sql, /\bDISTINCT\b/i) ?? 'distinct/deduplication',
    });
  }

  // OR predicate warning
  if (/\bOR\b/i.test(sanitizedSql) && /\b(WHERE|JOIN|HAVING|ON)\b/i.test(upper)) {
    issues.push({
      rule: t.lintingOrPredicate,
      severity: 'warning',
      message: t.lintingOrPredicateMessage,
      suggestion: t.lintingOrPredicateSuggestion,
      location: getLineContext(sql, /\bOR\b/i) ?? 'WHERE/HAVING predicate',
    });
  }

  // IN/NOT IN subquery warning
  if (/\b(?:NOT\s+)?IN\b\s*\(\s*SELECT\b/i.test(sanitizedSql)) {
    issues.push({
      rule: t.lintingInSubquery,
      severity: 'warning',
      message: t.lintingInSubqueryMessage,
      suggestion: t.lintingInSubquerySuggestion,
      location: getLineContext(sql, /\b(?:NOT\s+)?IN\b\s*\(\s*SELECT\b/i) ?? 'IN/NOT IN subquery',
    });
  }

  // Function applied to a column in a filtering/joining/grouping clause. Keep the
  // clause and function in the same match so a function in SELECT is not reported.
  const functionOnColumnPattern =
    /\b(?:WHERE|HAVING|ON)\b[^;\n]*\b(?:DATE|TRIM|LOWER|UPPER|SUBSTRING|CHAR_LENGTH|REPLACE)\s*\(\s*[A-Z_][\w$.]*|\bGROUP\s+BY\b(?:(?!\b(?:SELECT|FROM|WHERE|HAVING|JOIN|ORDER\s+BY|LIMIT|UNION)\b)[\s\S])*?\b(?:DATE|TRIM|LOWER|UPPER|SUBSTRING|CHAR_LENGTH|REPLACE)\s*\(\s*[A-Z_][\w$.]*/i;
  if (functionOnColumnPattern.test(sanitizedSql)) {
    issues.push({
      rule: t.lintingFunctionOnColumn,
      severity: 'warning',
      message: t.lintingFunctionOnColumnMessage,
      suggestion: t.lintingFunctionOnColumnSuggestion,
      location: getNestedLineContext(
        sql,
        functionOnColumnPattern,
        /\b(?:DATE|TRIM|LOWER|UPPER|SUBSTRING|CHAR_LENGTH|REPLACE)\s*\(/i
      ),
    });
  }

  const additionalRules: Array<{
    pattern: RegExp;
    rule: string;
    message: string;
    suggestion: string;
  }> = [
    {
      pattern: /\bUNION\b(?!\s+ALL\b)/i,
      rule: t.lintingUnionDedup,
      message: t.lintingUnionDedupMessage,
      suggestion: t.lintingUnionDedupSuggestion,
    },
    {
      pattern: /(?:=|<>|!=)\s*NULL\b|\bNULL\s*(?:=|<>|!=)/i,
      rule: t.lintingNullComparison,
      message: t.lintingNullComparisonMessage,
      suggestion: t.lintingNullComparisonSuggestion,
    },
    {
      pattern: /\bLIKE\s*['"]%/i,
      rule: t.lintingLeadingWildcard,
      message: t.lintingLeadingWildcardMessage,
      suggestion: t.lintingLeadingWildcardSuggestion,
    },
    {
      pattern: /\bHAVING\b(?![^;\n]*\b(?:COUNT|SUM|AVG|MIN|MAX|GROUP_CONCAT|STRING_AGG)\s*\()[^;\n]+/i,
      rule: t.lintingNonAggregateHaving,
      message: t.lintingNonAggregateHavingMessage,
      suggestion: t.lintingNonAggregateHavingSuggestion,
    },
    {
      pattern: /\bSELECT\b(?:(?!\bFROM\b)[\s\S])*?\(\s*SELECT\b/i,
      rule: t.lintingScalarSubquery,
      message: t.lintingScalarSubqueryMessage,
      suggestion: t.lintingScalarSubquerySuggestion,
    },
    {
      pattern: /\(\s*SELECT\b(?:(?!\)\s*(?:AS\s+)?[\w$]+)[\s\S])*?\bORDER\s+BY\b/i,
      rule: t.lintingSubqueryOrderBy,
      message: t.lintingSubqueryOrderByMessage,
      suggestion: t.lintingSubqueryOrderBySuggestion,
    },
  ];

  for (const candidate of additionalRules) {
    const searchableSql = candidate.rule === t.lintingLeadingWildcard ? commentFreeSql : sanitizedSql;
    if (candidate.pattern.test(searchableSql)) {
      issues.push({
        rule: candidate.rule,
        severity: 'warning',
        message: candidate.message,
        suggestion: candidate.suggestion,
        location:
          candidate.rule === t.lintingLeadingWildcard
            ? getLineContextByLineNumber(
                sql,
                searchableSql.slice(0, searchableSql.search(candidate.pattern)).split(/\r\n?|\n/).length
              )
            : getLineContext(sql, candidate.pattern),
      });
    }
  }

  // Missing WHERE in large query
  if (
    upper.includes('FROM') &&
    !upper.includes('WHERE') &&
    (upper.match(/\b(SELECT|FROM|JOIN)\b/g) || []).length >
      COMPLEXITY_SCORER_CONSTANTS.LARGE_QUERY_KEYWORD_THRESHOLD
  ) {
    issues.push({
      rule: t.lintingMissingWhere,
      severity: 'warning',
      message: t.lintingMissingWhereMessage,
      suggestion: t.lintingMissingWhereSuggestion,
      location: getLineContext(sql, /FROM\b/i) ?? 'missing WHERE clause',
    });
  }

  return issues;
}

// ─── SELECT Field Complexity Analysis ────────────────────────────────────

function analyzeSelectFields(
  sql: string,
  t: Translations = getT('en'),
  mainQuerySql?: string
): SelectFieldComplexity[] {
  const mainQuery = mainQuerySql ?? extractMainQuery(sql);
  const mainSelectClause = extractSelectClauses(mainQuery)[0];
  const fields = mainSelectClause ? splitSelectFields(mainSelectClause) : [];

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
    const aggregateFuncsPattern = new RegExp(
      `\\b(${COMPLEXITY_SCORER_CONSTANTS.AGGREGATE_FUNCTIONS.join('|')})\\s*\\(`,
      'i'
    );
    if (aggregateFuncsPattern.test(withoutAlias)) {
      return {
        field,
        type: 'aggregate',
        complexity: COMPLEXITY_WEIGHTS.selectFieldTypes.aggregate,
        reason: t.complexityFieldReasonAggregate,
      };
    }

    // Check for scalar functions
    const scalarFuncsPattern = new RegExp(
      `\\b(${COMPLEXITY_SCORER_CONSTANTS.SCALAR_FUNCTIONS.join('|')})\\s*\\(`,
      'i'
    );
    if (scalarFuncsPattern.test(withoutAlias)) {
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

function isSqlWordBoundary(text: string, start: number, length: number): boolean {
  const before = start <= 0 ? ' ' : text[start - 1];
  const after = start + length >= text.length ? ' ' : text[start + length];
  return !/[A-Z0-9_]/i.test(before) && !/[A-Z0-9_]/i.test(after);
}

function extractMainQuery(sql: string): string {
  const withMatch = /^\s*WITH\b/i.exec(sql);
  if (!withMatch) return sql.trim();

  let position = withMatch[0].length;
  let cteCount = 0;

  while (position < sql.length && cteCount < 100) {
    while (position < sql.length && /\s/.test(sql[position])) position++;
    if (/^RECURSIVE\b/i.test(sql.slice(position))) position += 'RECURSIVE'.length;

    const cteMatch = /^[A-Za-z_][\w$]*(?:\s*\([^)]*\))?\s+AS\s*\(/i.exec(sql.slice(position));
    if (!cteMatch) break;
    position += cteMatch[0].length;

    let depth = 1;
    while (position < sql.length && depth > 0) {
      const character = sql[position];
      if (character === "'" || character === '"' || character === '`') {
        const quote = character;
        position++;
        while (position < sql.length) {
          if (sql[position] === quote && sql[position + 1] === quote) {
            position += 2;
            continue;
          }
          if (sql[position] === quote) {
            position++;
            break;
          }
          position++;
        }
        continue;
      }
      if (character === '(') depth++;
      else if (character === ')') depth--;
      position++;
    }

    while (position < sql.length && /\s/.test(sql[position])) position++;
    if (sql[position] !== ',') break;
    position++;
    cteCount++;
  }

  return sql.slice(position).trim();
}

function extractSelectClauses(sql: string): string[] {
  const clauses: string[] = [];
  const upper = sql.toUpperCase();
  let depth = 0;

  for (let index = 0; index < sql.length; index++) {
    const character = sql[index];

    if (character === "'" || character === '"' || character === '`') {
      const quote = character;
      index++;
      while (index < sql.length) {
        if (sql[index] === quote && sql[index + 1] === quote) {
          index += 2;
          continue;
        }
        if (sql[index] === quote) break;
        index++;
      }
      continue;
    }

    if (character === '(') {
      depth++;
      continue;
    }
    if (character === ')') {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (!upper.startsWith('SELECT', index) || !isSqlWordBoundary(upper, index, 6)) continue;

    const selectDepth = depth;
    let clauseIndex = index + 6;
    let clause = '';

    while (clauseIndex < sql.length) {
      const clauseCharacter = sql[clauseIndex];

      if (clauseCharacter === "'" || clauseCharacter === '"' || clauseCharacter === '`') {
        const quote = clauseCharacter;
        clause += clauseCharacter;
        clauseIndex++;
        while (clauseIndex < sql.length) {
          clause += sql[clauseIndex];
          if (sql[clauseIndex] === quote && sql[clauseIndex + 1] === quote) {
            clause += sql[clauseIndex + 1] || '';
            clauseIndex += 2;
            continue;
          }
          if (sql[clauseIndex] === quote) {
            clauseIndex++;
            break;
          }
          clauseIndex++;
        }
        continue;
      }

      if (clauseCharacter === '(') {
        depth++;
        clause += clauseCharacter;
        clauseIndex++;
        continue;
      }
      if (clauseCharacter === ')') {
        depth = Math.max(0, depth - 1);
        clause += clauseCharacter;
        clauseIndex++;
        continue;
      }

      if (
        depth === selectDepth &&
        upper.startsWith('FROM', clauseIndex) &&
        isSqlWordBoundary(upper, clauseIndex, 4)
      ) {
        break;
      }

      clause += clauseCharacter;
      clauseIndex++;
    }

    const normalizedClause = clause.trim();
    if (normalizedClause) clauses.push(normalizedClause);
    index = clauseIndex;
  }

  return clauses;
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

    if (COMPLEXITY_SCORER_CONSTANTS.QUOTE_CHARACTERS.includes(ch as any)) {
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

  while (pos < len && count < COMPLEXITY_SCORER_CONSTANTS.MAX_CTE_PARSE_LIMIT) {
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
      if (COMPLEXITY_SCORER_CONSTANTS.QUOTE_CHARACTERS.includes(ch as any)) {
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
    if (!inString && COMPLEXITY_SCORER_CONSTANTS.QUOTE_CHARACTERS.includes(ch as any)) {
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
  locale: Locale = 'en',
  mainQuerySql?: string
): DetailedComplexityScore {
  const t = getT(locale);
  const keywords = scoreKeywords(sql);
  const selectFields = analyzeSelectFields(sql, t, mainQuerySql);
  const ctes = scoreCTEs(sql);
  const windowFunctions = scoreWindowFunctions(sql);
  const subqueries = scoreSubqueries(sql);

  // Calculate SELECT field complexity
  const selectComplexityScore = selectFields.reduce((sum, field) => sum + field.complexity, 0);
  const selectFieldCount = selectFields.length;
  const avgSelectComplexity = selectFieldCount > 0 ? selectComplexityScore / selectFieldCount : 0;
  const selectFieldFactors = Array.from(
    selectFields.reduce((factors, field) => {
      const existing = factors.get(field.type);
      if (existing) {
        existing.count++;
        existing.subtotal += field.complexity;
      } else {
        factors.set(field.type, {
          type: field.type,
          count: 1,
          weight: field.complexity,
          subtotal: field.complexity,
        });
      }
      return factors;
    }, new Map<SelectFieldComplexity['type'], { type: SelectFieldComplexity['type']; count: number; weight: number; subtotal: number }>()).values()
  );
  const scoreList = getScoresFromLocalStorage();

  // Calculate total score
  let totalScore =
    keywords.total + selectComplexityScore + ctes.total + windowFunctions.total + subqueries.total;

  // Calculate max possible score (estimate for scaling)
  const dataScoreAnalyis = calculateScoredByMedian(scoreList); // Reasonable cap for very complex queries
  const scoreBaseline = Math.max(
    dataScoreAnalyis.median,
    COMPLEXITY_SCORER_CONSTANTS.MIN_SAFE_MEDIAN
  );

  const levelList = getComplexityLevelList(locale, dataScoreAnalyis.dynamicDefinitions);
  // Determine complexity level from the level definition list.
  const matchedLevel =
    levelList.find((item) => totalScore >= item.min && totalScore <= item.max) || levelList[0];
  const level = matchedLevel.level;

  // Collect linting issues
  const lintingIssues = [...checkSelectAll(sql, locale), ...checkOtherLintingRules(sql, locale)];

  // Store the score in localStorage for future median calculations
  const updatedScoreList = normalizeUniqueScores([...scoreList, totalScore]);
  try {
    localStorage.setItem(SCORE_LIST_KEY, JSON.stringify(updatedScoreList));
  } catch (error) {
    // Storage may be unavailable (private mode, quota exceeded, disabled) — analysis must not fail because of this.
    console.error('Error saving scores to localStorage:', error);
  }

  return {
    totalScore,
    level,
    levelLabel: matchedLevel.label,
    levelThresholds: levelList,
    scoreBreakdown: {
      keywords: keywords.keywords,
      selectFields: {
        complexityScore: selectComplexityScore,
        fieldCount: selectFieldCount,
        avgComplexity: avgSelectComplexity,
        factors: selectFieldFactors,
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
    maxScorePossible: scoreBaseline,
    percentageOfMax: (totalScore / scoreBaseline) * 100,
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
