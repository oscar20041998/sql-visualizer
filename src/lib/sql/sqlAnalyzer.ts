// Backend integration point: Replace this entire module with actual dt-sql-parser calls
// when integrating with a real parsing backend or when dt-sql-parser is fully initialized.

import {
  calculateQueryComplexity as scoreQueryComplexity,
  type DetailedComplexityScore,
} from './complexityScorer';
import { getT, type Translations } from '../i18n';
import {
  SQL_KEYWORDS,
  SQL_REGEX_PATTERNS,
  SQL_ANALYZER_LIMITS,
  ComplexityLevelType,
  normalizeJoinType,
  getJoinConditionComplexity,
  getComplexityLevelFromScore,
} from '../../app/common/sqlAnalyzerUtils';

// Import dt-sql-parser for AST-based SQL parsing with dialect support
let parser: any = null;
try {
  parser = require('dt-sql-parser');
} catch (e) {
  console.warn('dt-sql-parser not available, using regex-based parsing');
}

export type SqlDialect = 'mysql' | 'postgresql' | 'sqlserver' | 'oracle';

export type JoinType =
  | 'INNER JOIN'
  | 'LEFT JOIN'
  | 'RIGHT JOIN'
  | 'FULL OUTER JOIN'
  | 'CROSS JOIN'
  | 'NATURAL JOIN'
  | 'RELATES TO'
  | 'LATERAL JOIN';

export interface TableNode {
  id: string;
  name: string;
  alias?: string;
  columns: string[];
  isSubquery?: boolean;
  isCTE?: boolean;
}

export interface JoinEdge {
  id: string;
  source: string;
  target: string;
  joinType: JoinType;
  condition: string;
}

export interface NestedSubquery {
  id: string;
  depth: number;
  body: string;
  tables: string[];
  fields: string[];
  lineCount: number;
  /** 1-based line number (within AnalysisResult.rawSql) where this subquery starts — lets the UI jump to it in the editor. */
  line: number;
  hasJoins: boolean;
  hasAggregation: boolean;
  context: string; // surrounding keyword context (WHERE, FROM, SELECT, etc.)
  // Dashboard display properties
  expression?: string; // Alias for body - full subquery SQL text
  nestingLevel?: number; // Alias for depth - level in nesting hierarchy
  type?: string; // Subquery type: IN, EXISTS, FROM, SCALAR, etc.
  analysis?: string; // Optional analysis notes
  content?: string; // Alternative to expression
}

export interface CTE {
  id: string;
  name: string;
  body: string;
  tables: string[];
  fields: string[];
  usageCount: number;
  dependencies: string[];
  isRecursive: boolean;
  estimatedComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  isUnused: boolean;
  columnReferences: string[];
  lineCount: number;
  nestedSubqueries: NestedSubquery[];
}

export interface SqlMetrics {
  windowFunctions: number;
  groupBy: number;
  orderBy: number;
  distinct: number;
  having: number;
  where: number;
  subqueryDepth: number;
  subqueryCount: number;
  conditionCount: number;
  operationAndFunctionCount: number;
  lineCount: number;
  joinCount: number;
  /** Canonical relationship count for the Metrics Dashboard and Graph Visualizer: every edge in
   * `AnalysisResult.joins` (table–table + table–CTE JOINs plus inferred CTE–CTE dependencies),
   * deduped so the same pair is never counted twice. Keep both UIs on this field so their
   * displayed counts always match. */
  totalJoinCount: number;
  cteCount: number;
  tableCount: number;
  selectFields: number;
  finalSelectFieldCount: number;
}

export interface JoinLogicComplexity {
  level: ComplexityLevelType;
  score: number;
  totalJoinConditions: number;
  simpleConditions: number;
  multiColumnConditions: number;
  functionBasedConditions: number;
  nonEquiConditions: number;
}

export interface JoinConditionAnalysis {
  columns: string[];
  operators: string[];
  complexity: 'simple' | 'complex';
  isEquiJoin: boolean;
  isNaturalJoin: boolean;
  complexity_score: number;
}

export interface QueryFieldProjection {
  expression: string;
  alias: string;
  category: 'standard' | 'window' | 'calculated';
}

export interface StructuralAnalysisReport {
  joinCount: number;
  subqueryCount: number;
  conditionCount: number;
  operationAndFunctionCount: number;
  lineCount: number;
  joinLogicComplexity: JoinLogicComplexity;
  allFields: QueryFieldProjection[];
  allFieldsCount: number;
  finalSelectFields: QueryFieldProjection[];
  finalSelectFieldCount: number;
  hasCTE: boolean;
  subqueries?: NestedSubquery[]; // Detailed list of detected subqueries with analysis
}

// Itemized detail behind the scalar metric-card counts, used by the "click to see detail" modal.
export interface MetricDetailItem {
  id: string;
  snippet: string;
  clause: string;
  scope: string;
  /** 1-based line number (within AnalysisResult.rawSql) where this item starts — lets the UI jump to it in the editor. */
  line: number;
}

export interface MetricDetailsReport {
  windowFunctions: MetricDetailItem[];
  groupBy: MetricDetailItem[];
  orderBy: MetricDetailItem[];
  distinct: MetricDetailItem[];
  conditions: MetricDetailItem[];
  opsAndFunctions: MetricDetailItem[];
}

export interface ComplexityScore {
  level: ComplexityLevelType;
  score: number;
  maxScore: number;
  factors: { name: string; value: number; weight: number; contribution: number }[];
}

export interface ExecutionCostEstimate {
  label: string;
  score: number;
  maxScore: number;
  factors: { name: string; impact: 'low' | 'medium' | 'high'; note: string }[];
  recommendation: string;
}

export interface AnalysisResult {
  tables: TableNode[];
  joins: JoinEdge[];
  joinAnalysisDetails?: Array<{
    id: string;
    joinEdge: JoinEdge;
    analysis: JoinConditionAnalysis;
  }>;
  ctes: CTE[];
  metrics: SqlMetrics;
  complexity: ComplexityScore;
  detailedComplexity?: DetailedComplexityScore; // New: detailed scoring breakdown
  executionCost: ExecutionCostEstimate;
  mainQueryFields: {
    field: string;
    alias: string;
    origin: string;
    sourceTable: string;
    type: 'cte' | 'table' | 'expression';
  }[];
  dialect: SqlDialect;
  rawSql: string;
  structuralReport: StructuralAnalysisReport;
  metricDetails: MetricDetailsReport;
  hasCTE: boolean;
}

export async function analyzeSql(
  sql: string,
  dialect: SqlDialect,
  locale: string = 'en'
): Promise<AnalysisResult> {
  // Strip all SQL comments before scanning
  const stripped = stripSqlComments(sql);
  // Backend integration point: Replace with dt-sql-parser AST traversal
  const cleaned = stripped.trim();
  const extractedTables = extractTables(cleaned);
  const extractedJoins = extractJoins(cleaned, extractedTables);
  const ctes = extractCTEs(cleaned);
  const tables = buildGraphTables(extractedTables, ctes);
  const joins = buildGraphJoins(extractedJoins, tables, ctes);
  // Structural metrics must be based on SQL joins only (exclude graph-only RELATES TO edges).
  const structuralReport = buildStructuralAnalysisReport(cleaned, sql, ctes, extractedJoins);
  
  // Itemized detail behind the metric-card counts, for the detail modal
  const metricDetails = buildMetricDetails(cleaned, ctes);

  const metrics = computeMetrics(cleaned, ctes, extractedTables, structuralReport, metricDetails, joins.length);
  const complexity = computeComplexity(metrics);
  const t = getT(locale as 'en' | 'vi');
  const executionCost = computeExecutionCost(metrics, complexity, dialect, t);
  const mainQuery = extractMainQuery(cleaned);
  const mainQueryFields = extractMainQueryFields(mainQuery, ctes, tables);

  // New: Calculate detailed complexity score using the comprehensive scoring engine
  const detailedComplexity = await scoreQueryComplexity(
    cleaned,
    locale as 'en' | 'vi',
    mainQuery
  );

  // Analyze all joins with deep analysis
  const joinAnalysisDetails = analyzeAllJoins(cleaned, tables);

  return {
    tables,
    joins,
    joinAnalysisDetails,
    ctes,
    metrics,
    complexity,
    detailedComplexity,
    executionCost,
    mainQueryFields,
    dialect,
    rawSql: cleaned,
    structuralReport,
    metricDetails,
    hasCTE: ctes.length > 0,
  };
}

function toNodeId(name: string): string {
  return `table-${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
}

function buildGraphTables(baseTables: TableNode[], ctes: CTE[]): TableNode[] {
  const tables: TableNode[] = baseTables.map((t) => ({ ...t }));
  const byName = new Map<string, TableNode>();

  tables.forEach((table) => {
    byName.set(table.name.toLowerCase(), table);
  });

  ctes.forEach((cte) => {
    const key = cte.name.toLowerCase();
    const existing = byName.get(key);
    if (existing) {
      existing.isCTE = true;
      if (!existing.columns.length && cte.fields.length) {
        existing.columns = cte.fields.slice(0, SQL_ANALYZER_LIMITS.MAX_COLUMNS);
      }
      return;
    }

    const node: TableNode = {
      id: toNodeId(cte.name),
      name: cte.name,
      columns: cte.fields.slice(0, SQL_ANALYZER_LIMITS.MAX_COLUMNS),
      isCTE: true,
    };
    tables.push(node);
    byName.set(key, node);
  });

  return tables;
}

function buildGraphJoins(baseJoins: JoinEdge[], tables: TableNode[], ctes: CTE[]): JoinEdge[] {
  const joins: JoinEdge[] = [...baseJoins];
  const cteNames = new Set(ctes.map((cte) => cte.name.toLowerCase()));
  const byName = new Map<string, TableNode>();

  tables.forEach((table) => {
    byName.set(table.name.toLowerCase(), table);
  });

  function ensureNode(name: string): TableNode {
    const key = name.toLowerCase();
    const existing = byName.get(key);
    if (existing) return existing;

    const node: TableNode = {
      id: toNodeId(name),
      name,
      columns: [],
      isCTE: cteNames.has(key),
    };
    tables.push(node);
    byName.set(key, node);
    return node;
  }

  // Any edge (of any join type, either direction) already represents this pair's relationship —
  // used to avoid adding a duplicate "RELATES TO" edge when a real JOIN already connects two CTEs.
  const connectedPairs = new Set<string>(
    joins.flatMap((join) => [`${join.source}->${join.target}`, `${join.target}->${join.source}`])
  );

  ctes.forEach((cte) => {
    const source = ensureNode(cte.name);
    const relatedNames = new Set<string>(cte.dependencies);

    relatedNames.forEach((name) => {
      if (!name || name.toLowerCase() === cte.name.toLowerCase()) return;
      if (!cteNames.has(name.toLowerCase())) return;

      const target = ensureNode(name);
      const pairKey = `${source.id}->${target.id}`;
      if (connectedPairs.has(pairKey)) return;

      joins.push({
        id: `rel-${source.id}-${target.id}`,
        source: source.id,
        target: target.id,
        joinType: 'RELATES TO',
        condition: '',
      });
      connectedPairs.add(pairKey);
      connectedPairs.add(`${target.id}->${source.id}`);
    });
  });

  return joins;
}

// ─── Regex-based extraction (client-side heuristic) ──────────────────────────

function extractTables(sql: string): TableNode[] {
  const tables: Map<string, TableNode> = new Map();

  // Extract CTEs first to mark them
  const cteNames = new Set<string>();
  const cteRegex = SQL_REGEX_PATTERNS.CTE_EXTRACTION;
  let cteMatch;
  while ((cteMatch = cteRegex.exec(sql)) !== null) {
    const names = cteMatch[1].split(',').map((n) => n.trim().split(/\s+/)[0]);
    names.forEach((n) => cteNames.add(n.toUpperCase()));
  }

  // FROM and JOIN table extraction
  const tablePattern = SQL_REGEX_PATTERNS.TABLE_PATTERN;
  let match;
  while ((match = tablePattern.exec(sql)) !== null) {
    const rawName = match[1].replace(SQL_REGEX_PATTERNS.QUOTED_IDENTIFIER, '');
    const alias = match[2]?.replace(SQL_REGEX_PATTERNS.QUOTED_IDENTIFIER, '');
    const normalizedName = rawName.toUpperCase();
    if (SQL_KEYWORDS.has(normalizedName) || normalizedName.length === 0) continue;
    const key = rawName.toUpperCase();
    if (!tables.has(key)) {
      tables.set(key, {
        id: `table-${rawName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        name: rawName,
        alias:
          alias && !SQL_KEYWORDS.has(alias.toUpperCase()) && alias.toUpperCase() !== normalizedName
            ? alias
            : undefined,
        columns: extractColumnsForTable(sql, alias || rawName),
        isCTE: cteNames.has(key),
      });
    }
  }

  return Array.from(tables.values());
}

function extractColumnsForTable(sql: string, tableRef: string): string[] {
  const cols: string[] = [];
  const pattern = new RegExp(`\\b${tableRef}\\.(\\w+)`, 'gi');
  let m;
  while ((m = pattern.exec(sql)) !== null) {
    if (!cols.includes(m[1])) cols.push(m[1]);
  }
  return cols.slice(0, SQL_ANALYZER_LIMITS.MAX_COLUMNS);
}

function analyzeJoinCondition(condition: string): JoinConditionAnalysis {
  // Parse JOIN condition to extract metadata
  const columns: string[] = [];
  const operators: Set<string> = new Set();

  // Extract column references (table.column or just column)
  const columnRegex = /(\w+)\.(\w+)|\b(\w+)\b/g;
  let match;
  while ((match = columnRegex.exec(condition)) !== null) {
    if (match[1] && match[2]) {
      columns.push(`${match[1]}.${match[2]}`);
    }
  }

  // Extract operators
  const operatorMatches = condition.match(SQL_REGEX_PATTERNS.OPERATORS);
  if (operatorMatches) {
    operatorMatches.forEach((op) => operators.add(op.toUpperCase()));
  }

  // Check if it's an equi-join (uses = operator only)
  const isEquiJoin = SQL_REGEX_PATTERNS.EQUI_JOIN.test(condition);

  // Check if it's a natural join
  const isNaturalJoin = false; // Would be indicated by NATURAL JOIN keyword

  // Calculate complexity score
  let complexity_score = 0;
  if (operators.size > 1)
    complexity_score += SQL_ANALYZER_LIMITS.COMPLEXITY_SCORE_MULTIPLE_OPERATORS; // Multiple operators
  if (operators.has('OR')) complexity_score += SQL_ANALYZER_LIMITS.COMPLEXITY_SCORE_OR_OPERATOR; // OR makes it more complex
  if (columns.length > 2) complexity_score += SQL_ANALYZER_LIMITS.COMPLEXITY_SCORE_MULTIPLE_COLUMNS; // More than 2 columns
  if (operatorMatches && operatorMatches.length > 1)
    complexity_score += SQL_ANALYZER_LIMITS.COMPLEXITY_SCORE_MULTIPLE_CONDITIONS; // Multiple conditions

  const complexity = getJoinConditionComplexity(complexity_score);

  return {
    columns,
    operators: Array.from(operators),
    complexity,
    isEquiJoin,
    isNaturalJoin,
    complexity_score,
  };
}

function extractJoins(sql: string, tables: TableNode[]): JoinEdge[] {
  const joins: JoinEdge[] = [];

  // Enhanced pattern to support all SQL dialects:
  // MySQL: STRAIGHT_JOIN, USING
  // PostgreSQL: USING, LATERAL JOIN
  // SQL Server: CROSS APPLY, OUTER APPLY
  // Oracle: USING
  const joinPatterns = [
    SQL_REGEX_PATTERNS.STANDARD_JOIN,
    SQL_REGEX_PATTERNS.USING_JOIN,
    SQL_REGEX_PATTERNS.LATERAL_JOIN,
    SQL_REGEX_PATTERNS.APPLY_JOIN,
  ];

  let idx = 0;
  const fromMatch = SQL_REGEX_PATTERNS.FROM_CLAUSE.exec(sql);
  const fromTable = fromMatch ? fromMatch[1].replace(SQL_REGEX_PATTERNS.QUOTED_IDENTIFIER, '') : '';

  // Track all matched joins to avoid duplicates
  const processedPositions = new Set<number>();

  // Process each pattern
  for (const pattern of joinPatterns) {
    pattern.lastIndex = 0; // Reset regex
    let match;

    while ((match = pattern.exec(sql)) !== null) {
      // Skip if we've already processed this position
      if (processedPositions.has(match.index)) continue;
      processedPositions.add(match.index);

      let rawJoinType = '';
      let joinedTable = '';
      let tableAlias = '';
      let condition = '';

      if (match[1] && match[1].toUpperCase().includes('APPLY')) {
        // CROSS APPLY / OUTER APPLY pattern
        rawJoinType = match[1].replace(/\s+/g, ' ').toUpperCase().trim();
        joinedTable = match[2].replace(SQL_REGEX_PATTERNS.QUOTED_IDENTIFIER, '');
        tableAlias = match[3] || '';
        condition = ''; // APPLY doesn't have ON clause in same way
      } else if (match[4] && match[4].match(/^\s*[\w\s,]+\s*$/)) {
        // USING clause pattern
        rawJoinType = match[1].replace(/\s+/g, ' ').toUpperCase().trim();
        joinedTable = match[2].replace(SQL_REGEX_PATTERNS.QUOTED_IDENTIFIER, '');
        tableAlias = match[3] || '';
        condition = `USING (${match[4]})`; // Keep USING info in condition
      } else if (match[1] && match[1].toUpperCase().includes('LATERAL')) {
        // LATERAL JOIN pattern
        rawJoinType = 'LATERAL JOIN';
        joinedTable = match[1].replace(SQL_REGEX_PATTERNS.QUOTED_IDENTIFIER, '');
        tableAlias = match[2] || '';
        condition = match[3]?.trim() || '';
      } else {
        // Standard JOIN pattern
        rawJoinType = match[1].replace(/\s+/g, ' ').toUpperCase().trim();
        joinedTable = match[2].replace(SQL_REGEX_PATTERNS.QUOTED_IDENTIFIER, '');
        tableAlias = match[3] || '';
        condition = match[4]?.trim() || '';
      }

      // Normalize join type using helper
      const joinType = normalizeJoinType(rawJoinType);

      // Find source table from condition or use previous table
      let sourceTable = fromTable;
      if (
        condition &&
        !condition.toUpperCase().includes('USING') &&
        !condition.toUpperCase().includes('APPLY')
      ) {
        const condParts = condition.match(SQL_REGEX_PATTERNS.JOIN_CONDITION);
        if (condParts) {
          const t1 = condParts[1];
          const t2 = condParts[4];
          const t1Node = tables.find(
            (t) =>
              t.alias?.toLowerCase() === t1.toLowerCase() ||
              t.name.toLowerCase() === t1.toLowerCase()
          );
          const t2Node = tables.find(
            (t) =>
              t.alias?.toLowerCase() === t2.toLowerCase() ||
              t.name.toLowerCase() === t2.toLowerCase()
          );
          if (t1Node && t2Node) {
            sourceTable = t1Node.name;
          }
        }
      }

      const sourceNode = tables.find((t) => t.name.toLowerCase() === sourceTable.toLowerCase());
      const targetNode = tables.find((t) => t.name.toLowerCase() === joinedTable.toLowerCase());

      if (sourceNode && targetNode && sourceNode.id !== targetNode.id) {
        joins.push({
          id: `join-${idx++}`,
          source: sourceNode.id,
          target: targetNode.id,
          joinType,
          condition,
        });
      }
    }
  }

  return joins;
}

export function analyzeAllJoins(
  sql: string,
  tables: TableNode[]
): Array<{
  id: string;
  joinEdge: JoinEdge;
  analysis: JoinConditionAnalysis;
}> {
  // Extract all joins and provide deep analysis for each
  const joins = extractJoins(sql, tables);

  return joins.map((join) => ({
    id: join.id,
    joinEdge: join,
    analysis: analyzeJoinCondition(join.condition),
  }));
}

export function maskSqlStringLiterals(sql: string): string {
  let masked = '';

  for (let index = 0; index < sql.length; index++) {
    const character = sql[index];
    if (character !== "'") {
      masked += character;
      continue;
    }

    const quote = character;
    masked += ' ';
    index++;
    while (index < sql.length) {
      if (sql[index] === quote && sql[index + 1] === quote) {
        masked += '  ';
        index += 2;
      } else if (sql[index] === quote) {
        masked += ' ';
        break;
      } else {
        masked += sql[index] === '\n' ? '\n' : ' ';
      }
      index++;
    }
  }

  return masked;
}

function countCteSourceReferences(sql: string, cteNames: Set<string>): Map<string, number> {
  const counts = new Map<string, number>();
  cteNames.forEach((name) => counts.set(name, 0));

  const sourcePattern =
    /\b(?:FROM|JOIN)\s+((?:`[^`]+`|"[^"]+"|\[[^\]]+\]|[\w.]+))/gi;
  const sourceSql = maskSqlStringLiterals(sql);
  let match: RegExpExecArray | null;

  while ((match = sourcePattern.exec(sourceSql)) !== null) {
    const name = match[1].replace(SQL_REGEX_PATTERNS.QUOTED_IDENTIFIER, '').toLowerCase();
    if (counts.has(name)) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  return counts;
}

function extractCTEs(sql: string): CTE[] {
  const ctes: CTE[] = [];

  // Check if SQL starts with WITH (case-insensitive, allowing leading whitespace/comments)
  const withStartMatch = SQL_REGEX_PATTERNS.WITH_START.exec(sql);
  if (!withStartMatch) return ctes;

  // Use a depth-aware parser to extract each CTE name and its body
  // This correctly handles nested parentheses (subqueries inside CTEs)
  const rawCtes: { name: string; body: string }[] = [];

  let pos = withStartMatch[0].length; // position right after "WITH "
  const len = sql.length;

  while (pos < len) {
    // Skip whitespace and commas between CTEs
    while (pos < len && SQL_REGEX_PATTERNS.WHITESPACE.test(sql[pos])) pos++;
    if (pos >= len) break;

    // Check for RECURSIVE keyword
    const recursiveMatch = SQL_REGEX_PATTERNS.RECURSIVE_KEYWORD.exec(sql.slice(pos));
    if (recursiveMatch) pos += recursiveMatch[0].length;

    // Read CTE name (word characters)
    const nameMatch = SQL_REGEX_PATTERNS.CTE_NAME.exec(sql.slice(pos));
    if (!nameMatch) break;
    const cteName = nameMatch[1].replace(SQL_REGEX_PATTERNS.QUOTED_IDENTIFIER, '');
    pos += nameMatch[0].length;

    // Expect "AS"
    const asMatch = SQL_REGEX_PATTERNS.AS_KEYWORD.exec(sql.slice(pos));
    if (!asMatch) break;
    pos += asMatch[0].length;

    // Expect opening parenthesis
    if (pos >= len || sql[pos] !== '(') break;
    pos++; // skip '('

    // Now read until matching closing parenthesis, tracking depth
    let depth = 1;
    const bodyStart = pos;
    while (pos < len && depth > 0) {
      const ch = sql[pos];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      // Handle string literals to avoid counting parens inside strings
      else if (ch === "'" || ch === '"' || ch === '`') {
        const quote = ch;
        pos++;
        while (pos < len && sql[pos] !== quote) {
          if (sql[pos] === '\\') pos++; // skip escaped char
          pos++;
        }
      }
      if (depth > 0) pos++;
    }
    const body = sql.slice(bodyStart, pos).trim();
    pos++; // skip closing ')'

    rawCtes.push({ name: cteName, body });

    // After the closing paren, skip whitespace then check if next is ',' (another CTE) or SELECT/other (end of WITH block)
    let lookahead = pos;
    while (lookahead < len && /\s/.test(sql[lookahead])) lookahead++;
    if (lookahead >= len || sql[lookahead] !== ',') {
      // No more CTEs — we've reached the main query
      break;
    }
    // comma found — continue to next CTE
    pos = lookahead + 1;
  }

  // Extract the main query: everything after the last CTE closing paren
  const mainQuery = extractMainQuery(sql);
  const cteNames = new Set(rawCtes.map((cte) => cte.name.toLowerCase()));
  const mainQueryUsage = countCteSourceReferences(mainQuery, cteNames);
  const dependenciesByCte = new Map<string, string[]>();

  rawCtes.forEach((cte) => {
    const references = countCteSourceReferences(cte.body, cteNames);
    const dependencies = Array.from(references.entries())
      .filter(([name, count]) => name !== cte.name.toLowerCase() && count > 0)
      .map(([name]) => rawCtes.find((candidate) => candidate.name.toLowerCase() === name)!.name);
    dependenciesByCte.set(cte.name.toLowerCase(), dependencies);
  });

  const usedCtes = new Set<string>();
  const markDependenciesUsed = (name: string) => {
    if (usedCtes.has(name)) return;
    usedCtes.add(name);
    (dependenciesByCte.get(name) ?? []).forEach((dependency) =>
      markDependenciesUsed(dependency.toLowerCase())
    );
  };

  mainQueryUsage.forEach((count, name) => {
    if (count > 0) markDependenciesUsed(name);
  });

  rawCtes.forEach((raw, i) => {
    const name = raw.name;
    const body = raw.body;
    const tables = extractTables(body).map((t) => t.name);
    const fieldsWithAlias = extractSelectFields(body);
    const fields = fieldsWithAlias.map((f) => f.field); // Convert objects to strings for CTE

    // Column references from SELECT clause
    const colRefs: string[] = [];
    const selectPart = SQL_REGEX_PATTERNS.SELECT_CLAUSE.exec(body);
    if (selectPart) {
      const parts = selectPart[1].split(',').map((p) => p.trim());
      parts.forEach((p) => {
        const clean = p.replace(/\s+AS\s+\w+/i, '').trim();
        if (clean && !colRefs.includes(clean)) colRefs.push(clean);
      });
    }

    const normalizedName = name.toLowerCase();
    const usageCount = mainQueryUsage.get(normalizedName) ?? 0;
    const dependencies = dependenciesByCte.get(normalizedName) ?? [];
    const isRecursive = (countCteSourceReferences(body, cteNames).get(normalizedName) ?? 0) > 0;

    // Estimated complexity based on body characteristics
    const upperBody = body.toUpperCase();
    const hasJoins = SQL_REGEX_PATTERNS.JOIN_KEYWORD.test(upperBody);
    const hasSubquery = SQL_REGEX_PATTERNS.SUBQUERY.test(body);
    const hasWindow = SQL_REGEX_PATTERNS.WINDOW_FUNCTION.test(upperBody);
    const hasGroupBy = SQL_REGEX_PATTERNS.GROUP_BY.test(upperBody);
    const hasHaving = SQL_REGEX_PATTERNS.HAVING_CLAUSE.test(upperBody);
    const hasWhere = SQL_REGEX_PATTERNS.WHERE_CLAUSE.test(upperBody);
    const bodyLines = body.split('\n').length;
    let complexityScore = 0;
    if (hasJoins) complexityScore += SQL_ANALYZER_LIMITS.CTE_COMPLEXITY_SCORE_JOINS;
    if (hasSubquery) complexityScore += SQL_ANALYZER_LIMITS.CTE_COMPLEXITY_SCORE_SUBQUERY;
    if (hasWindow) complexityScore += SQL_ANALYZER_LIMITS.CTE_COMPLEXITY_SCORE_WINDOW;
    if (hasGroupBy) complexityScore += SQL_ANALYZER_LIMITS.CTE_COMPLEXITY_SCORE_GROUP_BY;
    if (hasHaving) complexityScore += SQL_ANALYZER_LIMITS.CTE_COMPLEXITY_SCORE_HAVING;
    if (hasWhere) complexityScore += SQL_ANALYZER_LIMITS.CTE_COMPLEXITY_SCORE_WHERE;
    if (bodyLines > SQL_ANALYZER_LIMITS.LARGE_BODY_LINE_COUNT)
      complexityScore += SQL_ANALYZER_LIMITS.CTE_COMPLEXITY_SCORE_LARGE_BODY_20;
    if (bodyLines > SQL_ANALYZER_LIMITS.MEDIUM_BODY_LINE_COUNT)
      complexityScore += SQL_ANALYZER_LIMITS.CTE_COMPLEXITY_SCORE_MEDIUM_BODY_10;
    const estimatedComplexity = getComplexityLevelFromScore(complexityScore) as
      | 'LOW'
      | 'MEDIUM'
      | 'HIGH';

    // A CTE is used when the main query references it directly or through a used CTE.
    const isUnused = !usedCtes.has(normalizedName);

    // Extract nested subqueries within this CTE body
    const cteBodyOffset = Math.max(0, sql.indexOf(body));
    const nestedSubqueries = extractNestedSubqueries(body, `cte-${i}`, sql, cteBodyOffset);

    ctes.push({
      id: `cte-${i}`,
      name,
      body,
      tables,
      fields,
      usageCount,
      dependencies,
      isRecursive,
      estimatedComplexity,
      isUnused,
      columnReferences: colRefs.slice(0, SQL_ANALYZER_LIMITS.MAX_CTE_FIELD_REFERENCES),
      lineCount: bodyLines,
      nestedSubqueries,
    });
  });

  return ctes;
}

/**
 * Extract the main query that comes after all CTE definitions
 * Example: "WITH cte AS (...) SELECT * FROM cte" → "SELECT * FROM cte"
 */
export function extractMainQuery(sql: string): string {
  const withMatch = SQL_REGEX_PATTERNS.WITH_START.exec(sql);
  if (!withMatch) {
    // No WITH clause, entire SQL is the main query
    return sql.trim();
  }

  let pos = withMatch[0].length;
  const len = sql.length;

  // Helper: skip a quoted string
  function skipString(pos: number, quote: string): number {
    let j = pos + 1;
    while (j < len) {
      if (sql[j] === quote && sql[j + 1] === quote) {
        j += 2;
      } else if (sql[j] === quote) {
        return j + 1;
      } else {
        j++;
      }
    }
    return j;
  }

  // Walk through all CTEs until we find the main query
  let cteCount = 0;
  while (pos < len && cteCount < SQL_ANALYZER_LIMITS.MAX_CTE_COUNT) {
    // Skip whitespace
    while (pos < len && /\s/.test(sql[pos])) pos++;
    if (pos >= len) return '';

    // Skip RECURSIVE keyword if present
    const recursiveMatch = SQL_REGEX_PATTERNS.RECURSIVE_KEYWORD.exec(sql.slice(pos));
    if (recursiveMatch) pos += recursiveMatch[0].length;

    // Read CTE name
    const nameMatch = SQL_REGEX_PATTERNS.CTE_NAME.exec(sql.slice(pos));
    if (!nameMatch) break;
    pos += nameMatch[0].length;

    // Expect "AS"
    const asMatch = SQL_REGEX_PATTERNS.AS_KEYWORD.exec(sql.slice(pos));
    if (!asMatch) break;
    pos += asMatch[0].length;

    // Expect opening paren
    if (pos >= len || sql[pos] !== '(') break;
    pos++;

    // Skip the CTE body (find matching closing paren)
    let depth = 1;
    while (pos < len && depth > 0) {
      const ch = sql[pos];
      if (ch === "'" || ch === '"' || ch === '`') {
        pos = skipString(pos, ch);
        continue;
      }
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (depth > 0) pos++;
    }
    pos++; // skip closing paren

    // Check if there's another CTE (comma) or end of WITH block
    let lookahead = pos;
    while (lookahead < len && /\s/.test(sql[lookahead])) lookahead++;
    if (lookahead >= len || sql[lookahead] !== ',') {
      pos = lookahead; // Move to after whitespace
      break;
    }
    pos = lookahead + 1; // Skip comma
    cteCount++;
  }

  // Everything from pos onwards is the main query
  return sql.slice(pos).trim();
}

/**
 * Finds every SELECT nested inside parentheses in `sql` (a CTE body or the main query), computing
 * a standard "subquery nesting depth" \u2014 the number of SELECT-boundary parens crossed, not the raw
 * paren depth. A subquery can be wrapped in ordinary grouping/function-call parens (e.g.
 * `COALESCE((SELECT x FROM t), 0)` or a redundant double-parenthesised `((SELECT ...))`); those
 * outer parens are still scanned for nested SELECTs, they just do not themselves add a depth
 * level, matching how query analyzers (e.g. EXPLAIN plan nesting, SQLFluff) count only actual
 * derived-table/subquery boundaries.
 *
 * `cleanedSql` + `baseOffset` (the offset of `sql` within `cleanedSql`) let every discovered
 * subquery report a real `line` number the UI can jump to in the editor.
 */
function extractNestedSubqueries(
  sql: string,
  cteId: string,
  cleanedSql: string,
  baseOffset: number
): NestedSubquery[] {
  const results: NestedSubquery[] = [];

  // Determine context keyword before a '(' that contains SELECT. `absolutePos` is relative to
  // the top-level `sql` param (not whichever nested `text` substring is currently being scanned).
  function getContext(absolutePos: number): string {
    const before = sql.slice(Math.max(0, absolutePos - 60), absolutePos).trimEnd();
    const kw = before.match(SQL_REGEX_PATTERNS.CONTEXT_KEYWORD);
    return kw ? kw[1].replace(/\s+/g, ' ').toUpperCase() : 'UNKNOWN';
  }

  // Recursive scanner: scan `text` for subqueries, treating them as being at `baseDepth`.
  // `textOffset` is `text`'s start position relative to the top-level `sql` param, so absolute
  // positions (for context lookup and line numbers) can be recovered at any recursion depth.
  function scan(text: string, baseDepth: number, textOffset: number) {
    const tLen = text.length;
    let pos = 0;

    while (pos < tLen) {
      const ch = text[pos];

      // Skip string literals
      if (ch === "'" || ch === '"' || ch === '`') {
        let j = pos + 1;
        while (j < tLen) {
          if (text[j] === ch && text[j + 1] === ch) {
            j += 2;
            continue;
          }
          if (text[j] === ch) {
            j++;
            break;
          }
          j++;
        }
        pos = j;
        continue;
      }

      if (ch === '(') {
        // Find the matching close paren
        const innerStart = pos + 1;
        let depth = 1;
        let j = innerStart;
        while (j < tLen && depth > 0) {
          const c = text[j];
          if (c === "'" || c === '"' || c === '`') {
            let k = j + 1;
            while (k < tLen) {
              if (text[k] === c && text[k + 1] === c) {
                k += 2;
                continue;
              }
              if (text[k] === c) {
                k++;
                break;
              }
              k++;
            }
            j = k;
            continue;
          }
          if (c === '(') depth++;
          else if (c === ')') depth--;
          if (depth > 0) j++;
          else break;
        }

        const rawInner = text.slice(innerStart, j);
        const innerBody = rawInner.trim();
        // Offset of innerBody's first real character, relative to `text` (accounts for the
        // whitespace `.trim()` drops so line numbers keep pointing at the actual content).
        const innerBodyOffset = innerStart + (rawInner.length - rawInner.trimStart().length);
        const nextTextOffset = textOffset + innerBodyOffset;

        // Check if this parenthesised block is itself a subquery (starts with SELECT).
        const isSubquery = /^SELECT\b/i.test(innerBody);

        if (isSubquery) {
          const currentDepth = baseDepth + 1;
          const absolutePos = textOffset + pos;
          const context = getContext(absolutePos);
          const subTables = extractTables(innerBody).map((t) => t.name);
          const subFieldsWithAlias = extractSelectFields(innerBody);
          const subFields = subFieldsWithAlias.map((f) => f.field); // Convert objects to strings for NestedSubquery
          const subLines = innerBody.split('\n').length;
          const hasJoins = /\bJOIN\b/i.test(innerBody);
          const hasAggregation = /\b(COUNT|SUM|AVG|MIN|MAX|GROUP\s+BY)\b/i.test(innerBody);
          const line = lineNumberAt(cleanedSql, baseOffset + nextTextOffset);

          results.push({
            id: `${cteId}-sub-${results.length}`,
            depth: currentDepth,
            body: innerBody,
            tables: subTables,
            fields: subFields,
            lineCount: subLines,
            line,
            hasJoins,
            hasAggregation,
            context,
          });

          // Recurse into this subquery to find deeper nesting.
          scan(innerBody, currentDepth, nextTextOffset);
        } else {
          // Not itself a subquery (e.g. a function call or grouping parens), but it may still
          // contain one, e.g. COALESCE((SELECT x FROM t), 0) or a redundant ((SELECT ...)).
          // Recurse without incrementing depth so it is not counted as an extra nesting level.
          scan(innerBody, baseDepth, nextTextOffset);
        }

        pos = j + 1; // skip past the closing ')'
        continue;
      }

      pos++;
    }
  }

  scan(sql, 0, 0);

  return results;
}

function isWordBoundary(text: string, start: number, len: number): boolean {
  const before = start <= 0 ? ' ' : text[start - 1];
  const after = start + len >= text.length ? ' ' : text[start + len];
  return !/[A-Z0-9_]/i.test(before) && !/[A-Z0-9_]/i.test(after);
}

function splitTopLevelComma(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      i++;
      while (i < input.length) {
        if (input[i] === quote && input[i + 1] === quote) {
          i += 2;
          continue;
        }
        if (input[i] === quote) break;
        i++;
      }
      continue;
    }

    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ',' && depth === 0) {
      parts.push(input.slice(start, i).trim());
      start = i + 1;
    }
  }

  const tail = input.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
}

function parseSelectField(fieldExpr: string): { field: string; alias: string } {
  const trimmed = fieldExpr.trim();
  if (!trimmed) return { field: '', alias: '' };

  const asMatch = /^(.*?)(?:\s+AS\s+)([A-Za-z_][\w$]*)\s*$/i.exec(trimmed);
  if (asMatch) {
    return { field: asMatch[1].trim(), alias: asMatch[2].trim() };
  }

  const implicitAliasMatch = /^(.*\S)\s+([A-Za-z_][\w$]*)\s*$/.exec(trimmed);
  if (implicitAliasMatch) {
    const left = implicitAliasMatch[1].trim();
    const right = implicitAliasMatch[2].trim();
    const leftLastToken = left.split(/\s+/).pop()?.toLowerCase();
    if (leftLastToken !== right.toLowerCase() && !left.endsWith(')')) {
      return { field: left, alias: right };
    }
  }

  return { field: trimmed, alias: '' };
}

function extractSelectClauses(sql: string): string[] {
  const clauses: string[] = [];
  const upper = sql.toUpperCase();
  let depth = 0;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      i++;
      while (i < sql.length) {
        if (sql[i] === quote && sql[i + 1] === quote) {
          i += 2;
          continue;
        }
        if (sql[i] === quote) break;
        i++;
      }
      continue;
    }

    if (ch === '(') {
      depth++;
      continue;
    }
    if (ch === ')') {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (!upper.startsWith('SELECT', i) || !isWordBoundary(upper, i, 6)) continue;

    const selectDepth = depth;
    let j = i + 6;
    let clause = '';

    while (j < sql.length) {
      const c = sql[j];

      if (c === "'" || c === '"' || c === '`') {
        const quote = c;
        clause += c;
        j++;
        while (j < sql.length) {
          clause += sql[j];
          if (sql[j] === quote && sql[j + 1] === quote) {
            clause += sql[j + 1] || '';
            j += 2;
            continue;
          }
          if (sql[j] === quote) {
            j++;
            break;
          }
          j++;
        }
        continue;
      }

      if (c === '(') {
        depth++;
        clause += c;
        j++;
        continue;
      }
      if (c === ')') {
        depth = Math.max(0, depth - 1);
        clause += c;
        j++;
        continue;
      }

      if (depth === selectDepth && upper.startsWith('FROM', j) && isWordBoundary(upper, j, 4)) {
        break;
      }

      clause += c;
      j++;
    }

    const normalized = clause.trim();
    if (normalized) clauses.push(normalized);
    i = j;
  }

  return clauses;
}

function extractSelectFields(sql: string): { field: string; alias: string }[] {
  const first = extractSelectClauses(sql)[0];
  if (!first) return [];

  return splitTopLevelComma(first)
    .map(parseSelectField)
    .filter((f) => f.field.length > 0)
    .slice(0, 100);
}

function countPattern(sql: string, pattern: RegExp): number {
  return (sql.match(pattern) || []).length;
}

function computeMetrics(
  sql: string,
  ctes: CTE[],
  tables: TableNode[],
  report: StructuralAnalysisReport,
  metricDetails: MetricDetailsReport,
  totalJoinCount: number
): SqlMetrics {
  return {
    windowFunctions: metricDetails.windowFunctions.length,
    groupBy: metricDetails.groupBy.length,
    orderBy: metricDetails.orderBy.length,
    distinct: metricDetails.distinct.length,
    having: report.conditionCount > 0 ? report.conditionCount : 0, // Simplified: use report's conditionCount if available or logic to split
    where: report.conditionCount > 0 ? report.conditionCount : 0, // Simplified
    subqueryDepth: computeSubqueryDepth(report.subqueries || []),
    subqueryCount: report.subqueryCount,
    conditionCount: report.conditionCount,
    operationAndFunctionCount: report.operationAndFunctionCount,
    lineCount: report.lineCount,
    joinCount: report.joinCount,
    totalJoinCount,
    cteCount: ctes.length,
    tableCount: tables.length,
    selectFields: report.allFieldsCount,
    finalSelectFieldCount: report.finalSelectFieldCount,
  };
}

function countLines(rawSql: string): number {
  const normalized = rawSql.replace(/\r\n/g, '\n').trim();
  if (!normalized) return 0;
  return normalized.split('\n').length;
}

function countImplicitJoins(sql: string): number {
  const upper = sql.toUpperCase();
  let count = 0;
  let depth = 0;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      i++;
      while (i < sql.length) {
        if (sql[i] === quote && sql[i + 1] === quote) {
          i += 2;
          continue;
        }
        if (sql[i] === quote) break;
        i++;
      }
      continue;
    }

    if (ch === '(') {
      depth++;
      continue;
    }
    if (ch === ')') {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (!upper.startsWith('FROM', i) || !isWordBoundary(upper, i, 4)) continue;

    const fromDepth = depth;
    let j = i + 4;
    let fromBody = '';
    while (j < sql.length) {
      const c = sql[j];
      if (c === "'" || c === '"' || c === '`') {
        const quote = c;
        fromBody += c;
        j++;
        while (j < sql.length) {
          fromBody += sql[j];
          if (sql[j] === quote && sql[j + 1] === quote) {
            fromBody += sql[j + 1] || '';
            j += 2;
            continue;
          }
          if (sql[j] === quote) {
            j++;
            break;
          }
          j++;
        }
        continue;
      }
      if (c === '(') {
        depth++;
        fromBody += c;
        j++;
        continue;
      }
      if (c === ')') {
        depth = Math.max(0, depth - 1);
        if (depth < fromDepth) break;
        fromBody += c;
        j++;
        continue;
      }

      const stopKeywords = [' WHERE', ' GROUP', ' ORDER', ' HAVING', ' LIMIT', ' UNION'];
      const rest = upper.slice(j);
      if (depth === fromDepth && stopKeywords.some((k) => rest.startsWith(k))) break;

      fromBody += c;
      j++;
    }

    const commaParts = splitTopLevelComma(fromBody);
    if (commaParts.length > 1) {
      count += commaParts.length - 1;
    }

    i = j;
  }

  return count;
}

function countCaseWhen(sql: string): number {
  const upper = sql.toUpperCase();
  const tokenPattern = /\b(CASE|WHEN|END)\b/g;
  let depth = 0;
  let total = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(upper)) !== null) {
    const token = match[1];
    if (token === 'CASE') depth++;
    else if (token === 'WHEN' && depth > 0) total++;
    else if (token === 'END' && depth > 0) depth--;
  }

  return total;
}

function countMathOperations(sql: string): number {
  const compact = sql.replace(/\s+/g, '');
  return (compact.match(/[+\-*/]/g) || []).length;
}

function countFunctionCalls(sql: string): number {
  const upper = sql.toUpperCase();
  const functionLike = /\b([A-Z_][A-Z0-9_$]*)\s*\(/g;
  const excluded = new Set([
    'SELECT',
    'FROM',
    'WHERE',
    'JOIN',
    'ON',
    'AS',
    'CASE',
    'WHEN',
    'THEN',
    'ELSE',
    'END',
    'WITH',
    'IN',
    'EXISTS',
    'VALUES',
  ]);
  let total = 0;
  let match: RegExpExecArray | null;
  while ((match = functionLike.exec(upper)) !== null) {
    if (!excluded.has(match[1])) total++;
  }
  return total;
}

function classifyFieldExpression(expression: string): QueryFieldProjection['category'] {
  const upper = expression.toUpperCase();
  if (/\bOVER\s*\(/.test(upper)) return 'window';
  if (/\bCASE\b/.test(upper) || /[+\-*/]/.test(expression) || /\b\w+\s*\(/.test(expression)) {
    return 'calculated';
  }
  return 'standard';
}

function toFieldProjection(fields: { field: string; alias: string }[]): QueryFieldProjection[] {
  return fields.map((f) => ({
    expression: f.field,
    alias: f.alias,
    category: classifyFieldExpression(f.field),
  }));
}

function computeJoinLogicComplexity(joins: JoinEdge[]): JoinLogicComplexity {
  const withConditions = joins.filter((j) => j.condition && j.condition.trim() !== '');

  let simpleConditions = 0;
  let multiColumnConditions = 0;
  let functionBasedConditions = 0;
  let nonEquiConditions = 0;

  withConditions.forEach((join) => {
    const condition = join.condition.toUpperCase();
    const conditionParts = condition.split(/\bAND\b|\bOR\b/).filter((part) => part.trim() !== '');

    if (conditionParts.length <= 1) simpleConditions++;
    if (conditionParts.length > 1) multiColumnConditions++;
    if (/\b[A-Z_][A-Z0-9_$]*\s*\(/.test(condition)) functionBasedConditions++;

    const nonEquiPattern = /(<>|!=|<=|>=|<|>|\bLIKE\b|\bBETWEEN\b|\bIN\b|\bIS\b)/;
    const hasPureEqui = /\w+\.\w+\s*=\s*\w+\.\w+/.test(condition);
    if (nonEquiPattern.test(condition) && !hasPureEqui) nonEquiConditions++;
  });

  const score =
    simpleConditions +
    multiColumnConditions * 2 +
    functionBasedConditions * 2 +
    nonEquiConditions * 3;

  let level: JoinLogicComplexity['level'] = 'LOW';
  if (score >= 8) level = 'HIGH';
  else if (score >= 4) level = 'MEDIUM';

  return {
    level,
    score,
    totalJoinConditions: withConditions.length,
    simpleConditions,
    multiColumnConditions,
    functionBasedConditions,
    nonEquiConditions,
  };
}

function buildStructuralAnalysisReport(
  cleanedSql: string,
  rawSql: string,
  ctes: CTE[],
  joins: JoinEdge[]
): StructuralAnalysisReport {
  const mainQuery = extractMainQuery(cleanedSql);
  const allFields = toFieldProjection(
    extractSelectClauses(cleanedSql).flatMap((clause) =>
      splitTopLevelComma(clause).map(parseSelectField)
    )
  ).filter((field) => field.expression.length > 0);

  const finalSelectFields = toFieldProjection(extractSelectFields(mainQuery)).filter(
    (field) => field.expression.length > 0
  );

  // Extract all nested subqueries from main query and CTEs. Offsets are resolved against
  // `cleanedSql` so every subquery can report a real line number the UI can jump to.
  const mainQueryOffset = Math.max(0, cleanedSql.lastIndexOf(mainQuery));
  const mainQuerySubqueries = extractNestedSubqueries(mainQuery, 'main', cleanedSql, mainQueryOffset);
  const cteSubqueries: NestedSubquery[] = [];
  ctes.forEach((cte) => {
    const cteBodyOffset = Math.max(0, cleanedSql.indexOf(cte.body));
    cteSubqueries.push(...extractNestedSubqueries(cte.body, cte.id, cleanedSql, cteBodyOffset));
  });

  const allSubqueries = [...mainQuerySubqueries, ...cteSubqueries];

  // Enhance subqueries with display-friendly properties
  const enhancedSubqueries = allSubqueries.map((sq) => ({
    ...sq,
    expression: sq.body, // Add expression as alias for body
    nestingLevel: sq.depth, // Add nestingLevel as alias for depth
    content: sq.body, // Add content as alternative
    // Infer type from context keyword
    type: inferSubqueryType(sq.context),
  }));

  const subqueryCount = allSubqueries.length;

  const whereCount = countPattern(cleanedSql.toUpperCase(), /\bWHERE\b/g);
  const havingCount = countPattern(cleanedSql.toUpperCase(), /\bHAVING\b/g);
  const caseWhenCount = countCaseWhen(cleanedSql);

  return {
    joinCount: joins.length + countImplicitJoins(cleanedSql),
    subqueryCount,
    conditionCount: whereCount + havingCount + caseWhenCount,
    operationAndFunctionCount: countMathOperations(cleanedSql) + countFunctionCalls(cleanedSql),
    lineCount: countLines(rawSql),
    joinLogicComplexity: computeJoinLogicComplexity(joins),
    allFields,
    allFieldsCount: allFields.length,
    finalSelectFields,
    finalSelectFieldCount: finalSelectFields.length,
    hasCTE: ctes.length > 0,
    subqueries: enhancedSubqueries, // Add detailed subqueries list
  };
}

// ---------------------------------------------------------------------------
// Itemized metric detail extraction (feeds the metric-card "click for detail"
// modal on the dashboard). These are purely additive: they do not affect any
// of the numeric counts computed above.
// ---------------------------------------------------------------------------

function resolveScope(sql: string, ctes: CTE[], index: number): string {
  for (const cte of ctes) {
    if (!cte.body) continue;
    const bodyStart = sql.indexOf(cte.body);
    if (bodyStart === -1) continue;
    const bodyEnd = bodyStart + cte.body.length;
    if (index >= bodyStart && index < bodyEnd) {
      return `CTE: ${cte.name}`;
    }
  }
  return 'Main Query';
}

/** 1-based line number of `index` within `text` \u2014 used to power "jump to line in editor" links. */
function lineNumberAt(text: string, index: number): number {
  const clamped = Math.max(0, Math.min(index, text.length));
  let line = 1;
  for (let i = 0; i < clamped; i++) {
    if (text.charCodeAt(i) === 10 /* \n */) line++;
  }
  return line;
}

/** Locates the offset of each (already-trimmed) part within `body`, in order, for per-item line numbers. */
function locatePartOffsets(body: string, parts: string[]): number[] {
  let cursor = 0;
  return parts.map((part) => {
    const idx = part ? body.indexOf(part, cursor) : -1;
    const offset = idx === -1 ? cursor : idx;
    cursor = offset + part.length;
    return offset;
  });
}

function skipQuotedLiteral(sql: string, j: number): number {
  const quote = sql[j];
  let k = j + 1;
  while (k < sql.length) {
    if (sql[k] === quote && sql[k + 1] === quote) {
      k += 2;
      continue;
    }
    if (sql[k] === quote) return k + 1;
    k++;
  }
  return k;
}

/**
 * Scans for every occurrence of `keywordRegex` and captures the clause body
 * that follows, up to (but not including) the first top-level match of
 * `stopPattern` or an unowned closing paren. Mirrors the balanced-paren/quote
 * scanning style used elsewhere in this file (e.g. extractSelectClauses).
 */
function findClauseBodies(
  sql: string,
  keywordRegex: RegExp,
  stopPattern: RegExp
): { start: number; end: number; body: string }[] {
  const upper = sql.toUpperCase();
  const results: { start: number; end: number; body: string }[] = [];
  const flags = keywordRegex.flags.includes('g') ? keywordRegex.flags : `${keywordRegex.flags}g`;
  const re = new RegExp(keywordRegex.source, flags);
  let match: RegExpExecArray | null;

  while ((match = re.exec(sql)) !== null) {
    const start = match.index;
    let depth = 0;
    let j = start + match[0].length;

    while (j < sql.length) {
      const c = sql[j];

      if (c === "'" || c === '"' || c === '`') {
        j = skipQuotedLiteral(sql, j);
        continue;
      }
      if (c === '(') {
        depth++;
        j++;
        continue;
      }
      if (c === ')') {
        if (depth === 0) break;
        depth--;
        j++;
        continue;
      }
      if (depth === 0 && stopPattern.test(upper.slice(j))) break;

      j++;
    }

    const body = sql.slice(start + match[0].length, j).trim();
    results.push({ start, end: j, body });
  }

  return results;
}

function extractGroupOrOrderItems(
  sql: string,
  ctes: CTE[],
  keywordRegex: RegExp,
  stopPattern: RegExp,
  clauseLabel: string,
  idPrefix: string
): MetricDetailItem[] {
  const bodies = findClauseBodies(sql, keywordRegex, stopPattern);
  const items: MetricDetailItem[] = [];
  let idx = 0;

  bodies.forEach((occurrence) => {
    const parts = splitTopLevelComma(occurrence.body).filter((expr) => expr.length > 0);
    const offsets = locatePartOffsets(occurrence.body, parts);
    parts.forEach((expr, partIdx) => {
      items.push({
        id: `${idPrefix}-${idx++}`,
        snippet: expr,
        clause: clauseLabel,
        scope: resolveScope(sql, ctes, occurrence.start),
        line: lineNumberAt(sql, occurrence.start + offsets[partIdx]),
      });
    });
  });

  return items;
}

function extractSingleBodyItems(
  sql: string,
  ctes: CTE[],
  keywordRegex: RegExp,
  stopPattern: RegExp,
  clauseLabel: string,
  idPrefix: string
): MetricDetailItem[] {
  return findClauseBodies(sql, keywordRegex, stopPattern)
    .filter((occurrence) => occurrence.body.length > 0)
    .map((occurrence, idx) => ({
      id: `${idPrefix}-${idx}`,
      snippet: occurrence.body,
      clause: clauseLabel,
      scope: resolveScope(sql, ctes, occurrence.start),
      line: lineNumberAt(sql, occurrence.start),
    }));
}

function extractCaseWhenItems(sql: string): { start: number; snippet: string }[] {
  const upper = sql.toUpperCase();
  const tokenPattern = /\b(CASE|WHEN|THEN|END)\b/g;
  const items: { start: number; snippet: string }[] = [];
  let caseDepth = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(upper)) !== null) {
    const token = match[1];

    if (token === 'CASE') {
      caseDepth++;
      continue;
    }
    if (token === 'END') {
      if (caseDepth > 0) caseDepth--;
      continue;
    }
    if (token === 'WHEN' && caseDepth > 0) {
      const conditionStart = match.index + match[0].length;
      const thenMatch = /\bTHEN\b/i.exec(sql.slice(conditionStart));
      const conditionEnd = thenMatch ? conditionStart + thenMatch.index : conditionStart;
      const snippet = sql.slice(match.index, conditionEnd).trim();
      if (snippet) items.push({ start: match.index, snippet });
    }
  }

  return items;
}

function extractWindowFunctionItems(sql: string, ctes: CTE[]): MetricDetailItem[] {
  const overPattern = /\bOVER\s*\(/gi;
  const items: MetricDetailItem[] = [];
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = overPattern.exec(sql)) !== null) {
    const overStart = match.index;
    const parenStart = overStart + match[0].length - 1;

    let funcStart = overStart;
    let k = overStart - 1;
    while (k >= 0 && /\s/.test(sql[k])) k--;
    if (k >= 0 && sql[k] === ')') {
      let depth = 1;
      k--;
      while (k >= 0 && depth > 0) {
        if (sql[k] === ')') depth++;
        else if (sql[k] === '(') depth--;
        k--;
      }
      while (k >= 0 && /[A-Za-z0-9_$.]/.test(sql[k])) k--;
      funcStart = k + 1;
    }

    let depth = 1;
    let j = parenStart + 1;
    while (j < sql.length && depth > 0) {
      if (sql[j] === '(') depth++;
      else if (sql[j] === ')') depth--;
      j++;
    }

    items.push({
      id: `window-${idx++}`,
      snippet: sql.slice(funcStart, j).trim(),
      clause: 'Window Function',
      scope: resolveScope(sql, ctes, overStart),
      line: lineNumberAt(sql, funcStart),
    });
  }

  return items;
}

function extractDistinctItems(sql: string, ctes: CTE[]): MetricDetailItem[] {
  const pattern = /\bDISTINCT\b/gi;
  const items: MetricDetailItem[] = [];
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = pattern.exec(sql)) !== null) {
    const start = match.index;
    let depth = 0;
    let j = start + match[0].length;

    while (j < sql.length) {
      const c = sql[j];
      if (c === "'" || c === '"' || c === '`') {
        j = skipQuotedLiteral(sql, j);
        continue;
      }
      if (c === '(') {
        depth++;
        j++;
        continue;
      }
      if (c === ')') {
        if (depth === 0) break;
        depth--;
        j++;
        continue;
      }
      if (depth === 0 && c === ',') break;
      if (depth === 0 && /^\s*FROM\b/i.test(sql.slice(j))) break;
      j++;
    }

    const trailing = sql.slice(start + match[0].length, j).trim();
    items.push({
      id: `distinct-${idx++}`,
      snippet: trailing ? `DISTINCT ${trailing}` : 'DISTINCT',
      clause: 'DISTINCT',
      scope: resolveScope(sql, ctes, start),
      line: lineNumberAt(sql, start),
    });
  }

  return items;
}

function extractFunctionCallItems(sql: string, ctes: CTE[]): MetricDetailItem[] {
  const excluded = new Set([
    'SELECT',
    'FROM',
    'WHERE',
    'JOIN',
    'ON',
    'AS',
    'CASE',
    'WHEN',
    'THEN',
    'ELSE',
    'END',
    'WITH',
    'IN',
    'EXISTS',
    'VALUES',
    'OVER',
  ]);
  const pattern = /\b([A-Za-z_][A-Za-z0-9_$]*)\s*\(/g;
  const items: MetricDetailItem[] = [];
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = pattern.exec(sql)) !== null) {
    if (excluded.has(match[1].toUpperCase())) continue;

    const openParenIndex = match.index + match[0].length - 1;
    let depth = 1;
    let j = openParenIndex + 1;

    while (j < sql.length && depth > 0) {
      const c = sql[j];
      if (c === "'" || c === '"' || c === '`') {
        j = skipQuotedLiteral(sql, j);
        continue;
      }
      if (c === '(') depth++;
      else if (c === ')') depth--;
      j++;
    }

    items.push({
      id: `func-${idx++}`,
      snippet: sql.slice(match.index, j).trim(),
      clause: 'Function Call',
      scope: resolveScope(sql, ctes, match.index),
      line: lineNumberAt(sql, match.index),
    });
  }

  return items;
}

function buildMetricDetails(cleanedSql: string, ctes: CTE[]): MetricDetailsReport {
  const groupByStop = /^\s*(?:HAVING\b|ORDER\s+BY\b|LIMIT\b|UNION\b|WINDOW\b)/i;
  const orderByStop = /^\s*(?:LIMIT\b|UNION\b|FETCH\b|OFFSET\b)/i;
  const whereStop = /^\s*(?:GROUP\s+BY\b|ORDER\s+BY\b|HAVING\b|LIMIT\b|UNION\b|WINDOW\b)/i;
  const havingStop = /^\s*(?:ORDER\s+BY\b|LIMIT\b|UNION\b|WINDOW\b)/i;

  const groupBy = extractGroupOrOrderItems(
    cleanedSql,
    ctes,
    /\bGROUP\s+BY\b/gi,
    groupByStop,
    'GROUP BY',
    'group'
  );
  const orderBy = extractGroupOrOrderItems(
    cleanedSql,
    ctes,
    /\bORDER\s+BY\b/gi,
    orderByStop,
    'ORDER BY',
    'order'
  );
  const whereItems = extractSingleBodyItems(
    cleanedSql,
    ctes,
    /\bWHERE\b/gi,
    whereStop,
    'WHERE',
    'where'
  );
  const havingItems = extractSingleBodyItems(
    cleanedSql,
    ctes,
    /\bHAVING\b/gi,
    havingStop,
    'HAVING',
    'having'
  );
  const caseWhenItems = extractCaseWhenItems(cleanedSql).map((item, idx) => ({
    id: `case-${idx}`,
    snippet: item.snippet,
    clause: 'CASE WHEN',
    scope: resolveScope(cleanedSql, ctes, item.start),
    line: lineNumberAt(cleanedSql, item.start),
  }));

  return {
    windowFunctions: extractWindowFunctionItems(cleanedSql, ctes),
    groupBy,
    orderBy,
    distinct: extractDistinctItems(cleanedSql, ctes),
    conditions: [...whereItems, ...havingItems, ...caseWhenItems],
    opsAndFunctions: extractFunctionCallItems(cleanedSql, ctes),
  };
}

function computeSubqueryDepth(subqueries: NestedSubquery[]): number {
  if (!subqueries || subqueries.length === 0) return 0;
  return Math.max(...subqueries.map((sq) => sq.depth));
}

/**
 * Infer subquery type from context keyword (WHERE, EXISTS, IN, FROM, etc.)
 */
function inferSubqueryType(context: string): string {
  if (!context) return 'DERIVED';

  const upper = context.toUpperCase();
  if (upper.includes('EXISTS')) return 'EXISTS';
  if (upper.includes('IN')) return 'IN';
  if (upper.includes('FROM')) return 'FROM';
  if (upper.includes('WHERE')) return 'WHERE';
  if (upper.includes('SELECT')) return 'SCALAR';
  if (upper.includes('JOIN')) return 'JOIN';

  return upper.split(/\s+/)[0] || 'DERIVED';
}

function computeComplexity(metrics: SqlMetrics): ComplexityScore {
  const factors = [
    { name: 'JOIN Count', value: metrics.joinCount, weight: 3 },
    { name: 'Subquery Depth', value: metrics.subqueryDepth, weight: 4 },
    { name: 'CTE Count', value: metrics.cteCount, weight: 2 },
    { name: 'Window Functions', value: metrics.windowFunctions, weight: 3 },
    { name: 'GROUP BY', value: metrics.groupBy, weight: 1 },
    { name: 'ORDER BY', value: metrics.orderBy, weight: 1 },
    { name: 'DISTINCT', value: metrics.distinct, weight: 1 },
    { name: 'HAVING', value: metrics.having, weight: 1 },
    { name: 'WHERE', value: metrics.where, weight: 1 },
  ];

  const scored = factors.map((f) => ({
    ...f,
    contribution: Math.min(f.value * f.weight, f.weight * 5),
  }));

  const score = scored.reduce((s, f) => s + f.contribution, 0);
  const maxScore = scored.reduce((s, f) => s + f.weight * 5, 0);

  let level: ComplexityLevelType = 'LOW';
  const ratio = score / maxScore;
  if (ratio >= SQL_ANALYZER_LIMITS.COMPLEXITY_RATIO_SUPER_HIGH) level = 'SUPER_HIGH';
  else if (ratio >= SQL_ANALYZER_LIMITS.COMPLEXITY_RATIO_HIGH) level = 'HIGH';
  else if (ratio >= SQL_ANALYZER_LIMITS.COMPLEXITY_RATIO_MEDIUM) level = 'MEDIUM';

  return { level, score, maxScore, factors: scored };
}

function computeExecutionCost(
  metrics: SqlMetrics,
  complexity: ComplexityScore,
  dialect: SqlDialect,
  t?: Translations
): ExecutionCostEstimate {
  // Use provided translation object or get default English
  const translation = t || getT('en');

  const dialectMultiplier: Record<SqlDialect, number> = {
    mysql: 1.0,
    postgresql: 0.85,
    sqlserver: 1.1,
    oracle: 1.15,
  };

  const base = complexity.score * dialectMultiplier[dialect];
  const maxBase = complexity.maxScore * 1.15;
  const normalized = Math.min(Math.round((base / maxBase) * 100), 100);

  const factors: ExecutionCostEstimate['factors'] = [
    {
      name: translation.executionCostFactorJoinDepth,
      impact: metrics.joinCount > 4 ? 'high' : metrics.joinCount > 2 ? 'medium' : 'low',
      note: `${metrics.joinCount} ${translation.executionCostNoteJoinDepth}`,
    },
    {
      name: translation.executionCostFactorSubqueryNesting,
      impact: metrics.subqueryDepth > 3 ? 'high' : metrics.subqueryDepth > 1 ? 'medium' : 'low',
      note: `${translation.executionCostNoteSubqueryNesting}${metrics.subqueryDepth}`,
    },
    {
      name: translation.executionCostFactorAnalyticFunctions,
      impact: metrics.windowFunctions > 2 ? 'high' : metrics.windowFunctions > 0 ? 'medium' : 'low',
      note: `${metrics.windowFunctions} ${translation.executionCostNoteAnalyticFunctions}`,
    },
    {
      name: translation.executionCostFactorDialectOverhead,
      impact: dialect === 'oracle' || dialect === 'sqlserver' ? 'medium' : 'low',
      note: `${dialect.toUpperCase()} ${translation.executionCostNoteDialectOverhead}`,
    },
    {
      name: translation.executionCostFactorStandardIndexing,
      impact: 'low',
      note: translation.executionCostNoteStandardIndexing,
    },
  ];

  const recommendations: Record<string, string> = {
    LOW: translation.executionCostRecommendationLow,
    MEDIUM: translation.executionCostRecommendationMedium,
    HIGH: translation.executionCostRecommendationHigh,
    SUPER_HIGH: translation.executionCostRecommendationSuperHigh,
  };

  return {
    label: complexity.level,
    score: normalized,
    maxScore: 100,
    factors,
    recommendation: recommendations[complexity.level],
  };
}

function extractFromClause(sql: string): string {
  // Extract the FROM clause from a SQL query
  const fromMatch =
    /FROM\s+([\s\S]+?)(?:\s+WHERE\s|\s+GROUP\s+BY\s|\s+ORDER\s+BY\s|\s+LIMIT\s|\s+UNION\s|$)/i.exec(
      sql
    );
  return fromMatch ? fromMatch[1].trim() : '';
}

function isSubqueryFromClause(fromClause: string): boolean {
  // Check if FROM clause starts with '(' indicating a subquery
  const trimmed = fromClause.trim();
  return trimmed.startsWith('(');
}

function extractSubqueryFields(subquery: string): string[] {
  // Extract the SELECT clause from subquery and return field names
  const selectMatch = /SELECT\s+([\s\S]+?)(?:\s+FROM\s|$)/i.exec(subquery);
  if (!selectMatch) return [];

  const selectPart = selectMatch[1].trim();
  if (selectPart === '*') {
    // If subquery is also SELECT *, we need to extract its FROM
    const subFromClause = extractFromClause(subquery);
    if (subFromClause && isSubqueryFromClause(subFromClause)) {
      // Nested subquery - extract recursively
      const nestedBody = extractParenthesisContent(subFromClause);
      return extractSubqueryFields(nestedBody);
    }
    // If FROM is a table, try to get its columns from context
    return ['*'];
  }

  // Parse SELECT fields and return field names (not aliases)
  const fields: string[] = [];
  splitTopLevelComma(selectPart).forEach((field) => {
    const parsed = parseSelectField(field);
    if (parsed.field && parsed.field !== '*') {
      fields.push(parsed.field);
    } else if (parsed.field === '*') {
      fields.push('*');
    }
  });

  return fields;
}

function extractParenthesisContent(text: string): string {
  // Extract content between first '(' and matching ')'
  const trimmed = text.trim();
  if (!trimmed.startsWith('(')) return '';

  let depth = 1;
  let i = 1;
  while (i < trimmed.length && depth > 0) {
    const ch = trimmed[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      i++;
      while (i < trimmed.length) {
        if (trimmed[i] === quote && trimmed[i + 1] === quote) {
          i += 2;
          continue;
        }
        if (trimmed[i] === quote) break;
        i++;
      }
    } else if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth > 0) i++;
  }

  return trimmed.slice(1, i).trim();
}

function expandWildcardFields(
  fromClause: string,
  ctes: CTE[],
  tables: TableNode[]
): AnalysisResult['mainQueryFields'] {
  // When SELECT * is used and FROM is a subquery, expand to actual fields
  const expandedFields: AnalysisResult['mainQueryFields'] = [];

  if (isSubqueryFromClause(fromClause)) {
    const subquery = extractParenthesisContent(fromClause);
    const subqueryFields = extractSubqueryFields(subquery);

    // Extract tables from subquery to trace sources
    const subqueryTables = extractTables(subquery);

    subqueryFields.forEach((field) => {
      if (field === '*') {
        // Keep the wildcard entry as-is
        expandedFields.push({
          field: '*',
          alias: '',
          origin: 'subquery-expansion',
          sourceTable: '',
          type: 'expression',
        });
      } else {
        // Parse each expanded field to find its source
        const prefixMatch = /^(\w+)\./i.exec(field);
        const prefix = prefixMatch ? prefixMatch[1].toLowerCase() : '';

        let sourceTable = '';
        let type: 'cte' | 'table' | 'expression' = 'expression';
        let origin = field;

        // Try to match with subquery tables
        const matchedTable = subqueryTables.find(
          (t) => (t.alias && t.alias.toLowerCase() === prefix) || t.name.toLowerCase() === prefix
        );

        if (matchedTable) {
          sourceTable = matchedTable.name;
          type = 'table';
          origin = matchedTable.name;
        } else {
          // Try to find in main CTE list
          const matchedCTE = ctes.find((c) => c.name.toLowerCase() === prefix);
          if (matchedCTE) {
            sourceTable = matchedCTE.name;
            type = 'cte';
            origin = matchedCTE.name;
          }
        }

        expandedFields.push({
          field,
          alias: '',
          origin,
          sourceTable,
          type,
        });
      }
    });

    return expandedFields;
  }

  // If FROM is not a subquery, return empty (caller will handle normally)
  return [];
}

function extractMainQueryFields(
  sql: string,
  ctes: CTE[],
  tables: TableNode[]
): AnalysisResult['mainQueryFields'] {
  const fields = extractSelectFields(sql);

  // Check if this is SELECT * FROM subquery
  if (fields.length === 1 && fields[0].field === '*') {
    const fromClause = extractFromClause(sql);
    if (fromClause && isSubqueryFromClause(fromClause)) {
      const expandedFields = expandWildcardFields(fromClause, ctes, tables);
      if (expandedFields.length > 0) {
        return expandedFields;
      }
    }
  }

  // Normal field extraction for non-wildcard or non-subquery cases
  return fields.map(({ field, alias }) => {
    // Try to extract table/CTE prefix (e.g., "t.name" -> "t")
    const prefixMatch = /^(\w+)\./i.exec(field);
    const prefix = prefixMatch ? prefixMatch[1].toLowerCase() : '';

    // Find source table by prefix or field content
    let sourceTable = '';
    let type: 'cte' | 'table' | 'expression' = 'expression';
    let origin = 'expression';

    // Check if prefix matches a table alias or name
    const matchedTable = tables.find(
      (t) => (t.alias && t.alias.toLowerCase() === prefix) || t.name.toLowerCase() === prefix
    );

    if (matchedTable) {
      sourceTable = matchedTable.name;
      type = 'table';
      origin = matchedTable.name;
    } else {
      // Try to find CTE
      const matchedCTE = ctes.find(
        (c) =>
          c.name.toLowerCase() === prefix ||
          c.fields.some((f) => field.toLowerCase().includes(f.toLowerCase()))
      );

      if (matchedCTE) {
        sourceTable = matchedCTE.name;
        type = 'cte';
        origin = matchedCTE.name;
      } else {
        // Try to find by field content if no prefix
        const fieldLower = field.toLowerCase();
        const tableWithField = tables.find(
          (t) =>
            fieldLower.includes(t.name.toLowerCase()) ||
            (t.alias && fieldLower.includes(t.alias.toLowerCase()))
        );
        const cteWithField = ctes.find((c) =>
          c.fields.some((f) => fieldLower.includes(f.toLowerCase()))
        );

        if (tableWithField) {
          sourceTable = tableWithField.name;
          type = 'table';
          origin = tableWithField.name;
        } else if (cteWithField) {
          sourceTable = cteWithField.name;
          type = 'cte';
          origin = cteWithField.name;
        }
      }
    }

    return {
      field,
      alias,
      origin,
      sourceTable,
      type,
    };
  });
}

export function extractMyBatisParams(xml: string): string[] {
  return collectMyBatisParams(xml);
}

export function resolveMyBatisParams(xml: string, params: Record<string, string>): string {
  const { sql } = parseMyBatisXml(xml);
  let resolved = sql;
  for (const [key, value] of Object.entries(params)) {
    const escapedKey = escapeRegExp(key);
    const quotedValue = toSqlTextLiteral(value || key);
    resolved = resolved.replace(new RegExp(`[#$]\\{${escapedKey}\\}`, 'g'), quotedValue);
  }
  return resolved.trim();
}

/** Extract clean SQL and parameters from MyBatis XML content */
export function parseMyBatisXml(xml: string): { sql: string; params: string[] } {
  // Extract SQL body from MyBatis tags
  const sqlMatch =
    /<(?:select|insert|update|delete)[^>]*>([\s\S]*?)<\/(?:select|insert|update|delete)>/i.exec(
      xml
    );
  if (!sqlMatch) return { sql: '', params: [] };

  let sqlContent = sqlMatch[1];

  // Extract parameters from #{} and ${} syntax (supports nested object paths like args.param1)
  const params = collectMyBatisParams(xml);

  // Remove <if> tag conditions, keeping only the inner SQL
  sqlContent = sqlContent.replace(/<if\s+test="[^"]*">\s*/gi, '');
  sqlContent = sqlContent.replace(/<\/if\s*>/gi, '');

  // Remove other MyBatis tags
  sqlContent = sqlContent
    .replace(/<(?:where|set|trim|foreach|choose|when|otherwise)[^>]*>/gi, '')
    .replace(/<\/(?:where|set|trim|foreach|choose|when|otherwise)>/gi, '');

  // Decode XML entities used in MyBatis SQL content.
  sqlContent = decodeMyBatisXmlEntities(sqlContent);

  // Clean up whitespace and SQL formatting
  sqlContent = sqlContent
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('<!--'))
    .join('\n');

  return { sql: sqlContent, params };
}

const MYBATIS_PARAM_PATTERN = /[#$]\{([A-Za-z_][\w$]*(?:\.[A-Za-z_][\w$]*)*)\}/g;

function collectMyBatisParams(input: string): string[] {
  const params: string[] = [];
  let match;
  while ((match = MYBATIS_PARAM_PATTERN.exec(input)) !== null) {
    if (!params.includes(match[1])) params.push(match[1]);
  }
  return params;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toSqlTextLiteral(value: string): string {
  const trimmed = value.trim();
  const unwrapped =
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
      ? trimmed.slice(1, -1)
      : trimmed;
  const escaped = unwrapped.replace(/'/g, "''");
  return `'${escaped}'`;
}

function decodeMyBatisXmlEntities(sql: string): string {
  return sql
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Get conditional parameters from <if> tags in MyBatis XML */
export function getConditionalParams(xml: string): Record<string, string> {
  const conditionalParams: Record<string, string> = {};
  const ifPattern = /<if\s+test="([^"]+)">/gi;
  let match;

  while ((match = ifPattern.exec(xml)) !== null) {
    const condition = match[1];
    // Extract parameter names from conditions like: "minAmount != null", "status != null"
    const paramMatch = /(\w+)\s*!=\s*null/i.exec(condition);
    if (paramMatch) {
      conditionalParams[paramMatch[1]] = condition;
    }
  }

  return conditionalParams;
}

// Strip all SQL comments (-- single-line and /* */ multi-line) from a string
export function stripSqlComments(sql: string): string {
  let result = '';
  let i = 0;
  while (i < sql.length) {
    const ch = sql.charAt(i);
    const next = sql.charAt(i + 1);

    // Multi-line comment /* ... */
    if (ch === '/' && next === '*') {
      const end = sql.indexOf('*/', i + 2);
      if (end === -1) break; // unclosed comment — skip rest
      // Preserve newlines so line numbers stay consistent
      const block = sql.slice(i, end + 2);
      result += block.replace(/[^\n]/g, '');
      i = end + 2;

      // Single-line comment -- ...
    } else if (ch === '-' && next === '-') {
      const end = sql.indexOf('\n', i + 2);
      if (end === -1) break; // comment runs to end of string
      result += '\n';
      i = end + 1;

      // Single-quoted string literal — preserve content as-is
    } else if (ch === "'") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql.charAt(j) === "'" && sql.charAt(j + 1) === "'") {
          j += 2; // escaped quote ''
        } else if (sql.charAt(j) === "'") {
          j++;
          break;
        } else {
          j++;
        }
      }
      result += sql.slice(i, j);
      i = j;

      // Double-quoted identifier — preserve content as-is
    } else if (ch === '"') {
      let j = i + 1;
      while (j < sql.length) {
        if (sql.charAt(j) === '"' && sql.charAt(j + 1) === '"') {
          j += 2;
        } else if (sql.charAt(j) === '"') {
          j++;
          break;
        } else {
          j++;
        }
      }
      result += sql.slice(i, j);
      i = j;
    } else {
      result += ch;
      i++;
    }
  }
  return result;
}