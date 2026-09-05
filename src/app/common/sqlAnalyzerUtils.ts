/**
 * SQL Analyzer Constants
 * Centralized constants for colors, levels, regex patterns, and other repeated values
 */

// ─── Complexity Levels ────────────────────────────────────────────────────────
export const COMPLEXITY_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  SUPER_HIGH: 'SUPER_HIGH',
} as const;

export type ComplexityLevelType = (typeof COMPLEXITY_LEVELS)[keyof typeof COMPLEXITY_LEVELS];

// ─── Join Condition Complexity ────────────────────────────────────────────────
export const JOIN_CONDITION_COMPLEXITY = {
  SIMPLE: 'simple',
  COMPLEX: 'complex',
} as const;

export type JoinConditionComplexityType =
  (typeof JOIN_CONDITION_COMPLEXITY)[keyof typeof JOIN_CONDITION_COMPLEXITY];

// ─── Join Types ───────────────────────────────────────────────────────────────
export const JOIN_TYPES = {
  INNER: 'INNER JOIN',
  LEFT: 'LEFT JOIN',
  RIGHT: 'RIGHT JOIN',
  FULL_OUTER: 'FULL OUTER JOIN',
  CROSS: 'CROSS JOIN',
  NATURAL: 'NATURAL JOIN',
  RELATES_TO: 'RELATES TO',
  LATERAL: 'LATERAL JOIN',
} as const;

export type JoinTypeValue = (typeof JOIN_TYPES)[keyof typeof JOIN_TYPES];

// ─── SQL Keywords ─────────────────────────────────────────────────────────────
export const SQL_KEYWORDS = new Set([
  'WHERE',
  'ON',
  'SET',
  'SELECT',
  'WITH',
  'GROUP',
  'ORDER',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'UNION',
  'AND',
  'OR',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'FROM',
  'JOIN',
  'LEFT',
  'RIGHT',
  'FULL',
  'INNER',
  'CROSS',
  'NATURAL',
]);

// ─── SQL Operators ────────────────────────────────────────────────────────────
export const SQL_OPERATORS = {
  EQUALS: '=',
  NOT_EQUALS_1: '<>',
  NOT_EQUALS_2: '!=',
  LESS_THAN_EQUAL: '<=',
  GREATER_THAN_EQUAL: '>=',
  LESS_THAN: '<',
  GREATER_THAN: '>',
  AND: 'AND',
  OR: 'OR',
  IN: 'IN',
  LIKE: 'LIKE',
  BETWEEN: 'BETWEEN',
} as const;

// ─── Qualified identifier building blocks ─────────────────────────────────────
// A single identifier segment across all 4 supported dialects' quoting styles: MySQL
// `backtick`, PostgreSQL/Oracle "double quote", SQL Server [bracket], or a bare word.
// Each vendor quotes EVERY dot-separated segment of a schema-qualified name independently
// (e.g. `[dbo].[Users]`, `"schema"."table"`, `` `db`.`table` ``) — a single `[\w.]+` capture
// (the old approach) cannot span the closing-quote/dot/opening-quote sequence in the middle,
// so it silently truncated the match at the FIRST segment (capturing just "dbo"/"schema"/"db")
// and left the real table name dangling as unmatched text, dropping it from the graph entirely.
const IDENT_SEGMENT = '(?:`[^`]+`|"[^"]+"|\\[[^\\]]+\\]|[A-Za-z_][\\w$#]*)';
// One or more dot-joined identifier segments: `db`.`table`, "schema"."table", [dbo].[Table],
// schema.table, or a single unqualified name — covers every vendor's schema.table syntax.
const QUALIFIED_NAME = `${IDENT_SEGMENT}(?:\\.${IDENT_SEGMENT})*`;

// ─── Regex Patterns ───────────────────────────────────────────────────────────
export const SQL_REGEX_PATTERNS = {
  // Extract CTEs from WITH clause
  CTE_EXTRACTION: /WITH\s+([\w\s,()]+?)\s+AS\s*\(/gi,

  // Extract FROM and JOIN tables. The negative lookahead stops the optional alias group from
  // swallowing the next clause keyword (e.g. `FROM t1 JOIN t2 ...` with no alias on t1 — without
  // it, "JOIN" gets captured as t1's alias and the scanner's position skips past it, so the next
  // `JOIN t2` is never found at all).
  TABLE_PATTERN: new RegExp(
    `(?:FROM|JOIN)\\s+(${QUALIFIED_NAME})(?:\\s+(?:AS\\s+)?(?!(?:ON|USING|WHERE|GROUP|ORDER|HAVING|LIMIT|UNION|JOIN|LEFT|RIGHT|INNER|FULL|CROSS|NATURAL|STRAIGHT_JOIN|LATERAL|SET|VALUES)\\b)(${IDENT_SEGMENT}))?`,
    'gi'
  ),

  // Column references with table prefix
  COLUMN_WITH_TABLE: /(\w+)\.(\w+)/g,

  // Column references (just the column name)
  COLUMN_ONLY: /\b(\w+)\b/g,

  // Operators in conditions
  OPERATORS: /(<>|!=|<=|>=|<|>|=|AND|OR|IN|LIKE|BETWEEN)/gi,

  // Equi-join detection
  EQUI_JOIN: /^\s*(\w+\.\w+\s*=\s*\w+\.\w+\s*(?:AND\s+\w+\.\w+\s*=\s*\w+\.\w+)*)\s*$/i,

  // Main query extraction (everything after WITH block)
  RECURSIVE_KEYWORD: /^RECURSIVE\s+/i,

  // CTE name extraction
  CTE_NAME: /^((?:`[^`]+`|"[^"]+"|\[[^\]]+\]|\w+))\s*/i,

  // AS keyword
  AS_KEYWORD: /^AS\s*/i,

  // Join condition parsing
  JOIN_CONDITION: /(\w+)\.(\w+)\s*([<>=!]+|IN|LIKE|BETWEEN)\s*(\w+)\.(\w+)/,

  // SELECT fields extraction
  SELECT_CLAUSE: /SELECT\s+([\s\S]+?)\s+FROM/i,

  // Join patterns (comprehensive)
  // The trailing lookahead marks where an ON condition ends. Its keyword alternatives (LEFT,
  // RIGHT, ORDER, GROUP, ...) must be followed by a word boundary (`\b`) — without it, a column
  // name that merely *starts with* one of them (order_id, group_id, left_amount, right_value...)
  // falsely satisfies the lookahead and truncates the captured condition mid-column-name.
  STANDARD_JOIN: new RegExp(
    `(LEFT\\s+(?:OUTER\\s+)?JOIN|RIGHT\\s+(?:OUTER\\s+)?JOIN|FULL\\s+(?:OUTER\\s+)?JOIN|INNER\\s+JOIN|CROSS\\s+JOIN|NATURAL\\s+JOIN|STRAIGHT_JOIN|JOIN)\\s+(${QUALIFIED_NAME})(?:\\s+(?:AS\\s+)?(${IDENT_SEGMENT}))?\\s+(?:ON\\s+([\\s\\S]+?))?(?=\\s*(?:(?:LEFT|RIGHT|INNER|FULL|CROSS|NATURAL|STRAIGHT|LATERAL|CROSS\\s+APPLY|OUTER\\s+APPLY|JOIN|WHERE|GROUP|ORDER|HAVING|LIMIT|UNION)\\b|;|$))`,
    'gi'
  ),

  USING_JOIN: new RegExp(
    `(LEFT\\s+(?:OUTER\\s+)?JOIN|RIGHT\\s+(?:OUTER\\s+)?JOIN|FULL\\s+(?:OUTER\\s+)?JOIN|INNER\\s+JOIN|JOIN)\\s+(${QUALIFIED_NAME})(?:\\s+(?:AS\\s+)?(${IDENT_SEGMENT}))?\\s+USING\\s*\\(\\s*([\\w\\s,]+)\\s*\\)`,
    'gi'
  ),

  LATERAL_JOIN: new RegExp(
    `LATERAL\\s+(?:LEFT\\s+(?:OUTER\\s+)?)?JOIN\\s+(${QUALIFIED_NAME})(?:\\s+(?:AS\\s+)?(${IDENT_SEGMENT}))?\\s+ON\\s+([\\s\\S]+?)(?=\\s*(?:(?:LEFT|RIGHT|INNER|FULL|CROSS|LATERAL|JOIN|WHERE|GROUP|ORDER|HAVING|LIMIT)\\b|$))`,
    'gi'
  ),

  APPLY_JOIN: new RegExp(
    `(CROSS\\s+APPLY|OUTER\\s+APPLY)\\s+(${QUALIFIED_NAME})(?:\\s+(?:AS\\s+)?(${IDENT_SEGMENT}))?`,
    'gi'
  ),

  // FROM clause extraction
  FROM_CLAUSE: new RegExp(`FROM\\s+(${QUALIFIED_NAME})(?:\\s+(?:AS\\s+)?(${IDENT_SEGMENT}))?`, 'i'),

  // SQL comments
  LINE_COMMENT: /--[^\n]*/g,
  BLOCK_COMMENT: /\/\*[\s\S]*?\*\//g,

  // WITH clause detection
  WITH_START: /^\s*WITH\s+/i,

  // Check for specific SQL features
  JOIN_KEYWORD: /\bJOIN\b/,
  SUBQUERY: /SELECT[\s\S]+?FROM[\s\S]+?SELECT/i,
  WINDOW_FUNCTION: /\bOVER\s*\(/,
  GROUP_BY: /\bGROUP\s+BY\b/,
  HAVING_CLAUSE: /\bHAVING\b/,
  WHERE_CLAUSE: /\bWHERE\b/,

  // SELECT/FROM/WHERE pattern for context
  CONTEXT_KEYWORD:
    /\b(WHERE|FROM|SELECT|JOIN|ON|HAVING|IN|EXISTS|NOT\s+EXISTS|NOT\s+IN|AND|OR|SET|VALUES)\s*$/i,

  // Whitespace
  WHITESPACE: /[\s,]/,

  // Numbers and strings
  NUMERIC: /^\d+$/,

  // CTE/Table alias recognition
  QUOTED_IDENTIFIER: /[`"\[\]]/g,
} as const;

// ─── Magic Numbers / Thresholds ───────────────────────────────────────────────
export const SQL_ANALYZER_LIMITS = {
  // Maximum columns to extract and display
  MAX_COLUMNS: 8,

  // Maximum field references to store in CTE
  MAX_CTE_FIELD_REFERENCES: 15,

  // Complexity score thresholds for conditions
  COMPLEXITY_SCORE_SIMPLE_THRESHOLD: 3,
  COMPLEXITY_SCORE_MULTIPLE_OPERATORS: 2,
  COMPLEXITY_SCORE_OR_OPERATOR: 2,
  COMPLEXITY_SCORE_MULTIPLE_COLUMNS: 1,
  COMPLEXITY_SCORE_MULTIPLE_CONDITIONS: 1,

  // CTE complexity scoring
  CTE_COMPLEXITY_SCORE_JOINS: 2,
  CTE_COMPLEXITY_SCORE_SUBQUERY: 3,
  CTE_COMPLEXITY_SCORE_WINDOW: 2,
  CTE_COMPLEXITY_SCORE_GROUP_BY: 1,
  CTE_COMPLEXITY_SCORE_HAVING: 1,
  CTE_COMPLEXITY_SCORE_WHERE: 1,
  CTE_COMPLEXITY_SCORE_LARGE_BODY_20: 2,
  CTE_COMPLEXITY_SCORE_MEDIUM_BODY_10: 1,

  // CTE complexity level thresholds
  CTE_COMPLEXITY_HIGH_THRESHOLD: 5,
  CTE_COMPLEXITY_MEDIUM_THRESHOLD: 2,

  // Maximum CTE count to prevent infinite loops
  MAX_CTE_COUNT: 100,

  // Nested subquery parsing limits
  MAX_SUBQUERY_DEPTH: 10,

  // Line count thresholds
  LARGE_BODY_LINE_COUNT: 20,
  MEDIUM_BODY_LINE_COUNT: 10,

  // Table size threshold
  LARGE_TABLE_SIZE: 2,

  // Complexity ratio thresholds for final level assignment
  COMPLEXITY_RATIO_SUPER_HIGH: 0.75,
  COMPLEXITY_RATIO_HIGH: 0.5,
  COMPLEXITY_RATIO_MEDIUM: 0.25,
} as const;

// ─── Color Constants (may be used for visualization) ────────────────────────
export const SQL_COLORS = {
  PRIMARY: '#6366f1',
  ACCENT: '#06b6d4',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  INFO: '#3b82f6',
  MUTED: 'var(--muted)',
  MUTED_FOREGROUND: 'var(--muted-foreground)',
} as const;

// ─── Nesting Levels / Depths ──────────────────────────────────────────────────
export const NESTING_LEVELS = {
  LEVEL_0: 0,
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3,
  LEVEL_4: 4,
} as const;

// ─── Context Types ────────────────────────────────────────────────────────────
export const SUBQUERY_CONTEXT = {
  WHERE: 'WHERE',
  FROM: 'FROM',
  SELECT: 'SELECT',
  JOIN: 'JOIN',
  ON: 'ON',
  HAVING: 'HAVING',
  IN: 'IN',
  EXISTS: 'EXISTS',
  SET: 'SET',
  VALUES: 'VALUES',
  UNKNOWN: 'UNKNOWN',
} as const;

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Get all operator symbols and keywords as a combined regex pattern
 */
export function getOperatorPattern(): RegExp {
  return /(<>|!=|<=|>=|<|>|=|AND|OR|IN|LIKE|BETWEEN)/gi;
}

/**
 * Check if a string is a SQL keyword
 */
export function isSqlKeyword(word: string): boolean {
  return SQL_KEYWORDS.has(word.toUpperCase());
}

/**
 * Convert join type keyword to normalized JoinType
 */
export function normalizeJoinType(rawJoinType: string): JoinTypeValue {
  const upper = rawJoinType.toUpperCase();

  if (upper.includes('LEFT')) return JOIN_TYPES.LEFT;
  if (upper.includes('RIGHT')) return JOIN_TYPES.RIGHT;
  if (upper.includes('FULL')) return JOIN_TYPES.FULL_OUTER;
  if (upper.includes('CROSS')) {
    return upper.includes('APPLY') ? JOIN_TYPES.RELATES_TO : JOIN_TYPES.CROSS;
  }
  if (upper.includes('NATURAL')) return JOIN_TYPES.NATURAL;
  if (upper.includes('STRAIGHT')) return JOIN_TYPES.INNER; // MySQL STRAIGHT_JOIN
  if (upper.includes('LATERAL')) return JOIN_TYPES.RELATES_TO;
  if (upper.includes('APPLY')) return JOIN_TYPES.RELATES_TO;
  if (upper.includes('OUTER') && !upper.includes('FULL')) return JOIN_TYPES.LEFT;

  return JOIN_TYPES.INNER; // Default
}

/**
 * Determine complexity level from score
 */
export function getComplexityLevelFromScore(
  score: number,
  highThreshold: number = SQL_ANALYZER_LIMITS.CTE_COMPLEXITY_HIGH_THRESHOLD,
  mediumThreshold: number = SQL_ANALYZER_LIMITS.CTE_COMPLEXITY_MEDIUM_THRESHOLD
): ComplexityLevelType {
  if (score >= highThreshold) return COMPLEXITY_LEVELS.HIGH;
  if (score >= mediumThreshold) return COMPLEXITY_LEVELS.MEDIUM;
  return COMPLEXITY_LEVELS.LOW;
}

/**
 * Determine join condition complexity
 */
export function getJoinConditionComplexity(score: number): JoinConditionComplexityType {
  return score >= SQL_ANALYZER_LIMITS.COMPLEXITY_SCORE_SIMPLE_THRESHOLD
    ? JOIN_CONDITION_COMPLEXITY.COMPLEX
    : JOIN_CONDITION_COMPLEXITY.SIMPLE;
}

// ─── Complexity Scorer Constants ──────────────────────────────────────────────
/**
 * Constants used by the complexity scoring engine (complexityScorer.ts)
 * Extracted to avoid magic numbers and improve maintainability
 */
export const COMPLEXITY_SCORER_CONSTANTS = {
  // Threshold Ratios for Dynamic Complexity Levels (based on median score)
  MIN_SAFE_MEDIAN: 10, // Minimum median to avoid overly low thresholds
  LOW_THRESHOLD_RATIO: 0.5, // LOW level threshold as % of median (50%)
  MEDIUM_THRESHOLD_RATIO: 1.0, // MEDIUM level threshold as % of median (100%)
  HIGH_THRESHOLD_RATIO: 2.0, // HIGH level threshold as % of median (200%)

  // Linting Rule Thresholds
  MAX_NESTING_DEPTH_WARNING: 6, // Threshold for deep nesting warning (triggers if > 6 levels)
  LARGE_QUERY_KEYWORD_THRESHOLD: 3, // Min SELECT/FROM/JOIN keywords to consider "large query"

  // CTE Parsing Limits
  MAX_CTE_PARSE_LIMIT: 100, // Maximum CTEs to count before stopping (safety limit)

  // SQL String Delimiters
  QUOTE_CHARACTERS: ["'", '"', '`'] as const,

  // SQL Aggregate Functions
  AGGREGATE_FUNCTIONS: ['SUM', 'COUNT', 'AVG', 'MIN', 'MAX', 'GROUP_CONCAT', 'LISTAGG'] as const,

  // SQL Scalar Functions
  SCALAR_FUNCTIONS: [
    'UPPER',
    'LOWER',
    'TRIM',
    'SUBSTR',
    'LENGTH',
    'DATE_TRUNC',
    'ROUND',
    'CAST',
    'COALESCE',
    'NULLIF',
  ] as const,
} as const;
