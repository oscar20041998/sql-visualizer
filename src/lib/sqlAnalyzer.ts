// Backend integration point: Replace this entire module with actual dt-sql-parser calls
// when integrating with a real parsing backend or when dt-sql-parser is fully initialized.

import {
  calculateQueryComplexity as scoreQueryComplexity,
  type DetailedComplexityScore,
} from './complexityScorer';
import { getT, type Translations } from './i18n';

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
  | 'RELATES TO';

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
  cteCount: number;
  tableCount: number;
  selectFields: number;
  finalSelectFieldCount: number;
}

export interface JoinLogicComplexity {
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  score: number;
  totalJoinConditions: number;
  simpleConditions: number;
  multiColumnConditions: number;
  functionBasedConditions: number;
  nonEquiConditions: number;
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

export type ComplexityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'SUPER_HIGH';

export interface ComplexityScore {
  level: ComplexityLevel;
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
  const metrics = computeMetrics(cleaned, ctes, extractedTables, structuralReport);
  const complexity = computeComplexity(metrics);
  const t = getT(locale as 'en' | 'vi');
  const executionCost = computeExecutionCost(metrics, complexity, dialect, t);
  const mainQuery = extractMainQuery(cleaned);
  const mainQueryFields = extractMainQueryFields(mainQuery, ctes, tables);

  // New: Calculate detailed complexity score using the comprehensive scoring engine
  const detailedComplexity = await scoreQueryComplexity(cleaned, locale as 'en' | 'vi');

  return {
    tables,
    joins,
    ctes,
    metrics,
    complexity,
    detailedComplexity,
    executionCost,
    mainQueryFields,
    dialect,
    rawSql: cleaned,
    structuralReport,
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
        existing.columns = cte.fields.slice(0, 8);
      }
      return;
    }

    const node: TableNode = {
      id: toNodeId(cte.name),
      name: cte.name,
      columns: cte.fields.slice(0, 8),
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

  const existingEdgeKeys = new Set<string>(
    joins.map((join) => `${join.source}->${join.target}->${join.joinType}`)
  );

  ctes.forEach((cte) => {
    const source = ensureNode(cte.name);
    const relatedNames = new Set<string>(cte.dependencies);

    relatedNames.forEach((name) => {
      if (!name || name.toLowerCase() === cte.name.toLowerCase()) return;
      if (!cteNames.has(name.toLowerCase())) return;

      const target = ensureNode(name);
      const edgeKey = `${source.id}->${target.id}->RELATES TO`;
      if (existingEdgeKeys.has(edgeKey)) return;

      joins.push({
        id: `rel-${source.id}-${target.id}`,
        source: source.id,
        target: target.id,
        joinType: 'RELATES TO',
        condition: '',
      });
      existingEdgeKeys.add(edgeKey);
    });
  });

  return joins;
}

// ─── Regex-based extraction (client-side heuristic) ──────────────────────────

function extractTables(sql: string): TableNode[] {
  const tables: Map<string, TableNode> = new Map();

  const SQL_KEYWORDS = new Set([
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

  // Extract CTEs first to mark them
  const cteNames = new Set<string>();
  const cteRegex = /WITH\s+([\w\s,()]+?)\s+AS\s*\(/gi;
  let cteMatch;
  while ((cteMatch = cteRegex.exec(sql)) !== null) {
    const names = cteMatch[1].split(',').map((n) => n.trim().split(/\s+/)[0]);
    names.forEach((n) => cteNames.add(n.toUpperCase()));
  }

  // FROM and JOIN table extraction
  const tablePattern =
    /(?:FROM|JOIN)\s+([`"\[]?[\w.]+[`"\]]?)(?:\s+(?:AS\s+)?([`"\[]?\w+[`"\]]?))?/gi;
  let match;
  while ((match = tablePattern.exec(sql)) !== null) {
    const rawName = match[1].replace(/[`"\[\]]/g, '');
    const alias = match[2]?.replace(/[`"\[\]]/g, '');
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
  return cols.slice(0, 8);
}

function extractJoins(sql: string, tables: TableNode[]): JoinEdge[] {
  const joins: JoinEdge[] = [];
  const joinPattern =
    /(LEFT\s+(?:OUTER\s+)?JOIN|RIGHT\s+(?:OUTER\s+)?JOIN|FULL\s+(?:OUTER\s+)?JOIN|INNER\s+JOIN|CROSS\s+JOIN|NATURAL\s+JOIN|JOIN)\s+([`"\[]?[\w.]+[`"\]]?)(?:\s+(?:AS\s+)?(\w+))?\s+(?:ON\s+([\s\S]+?))?(?=\s+(?:LEFT|RIGHT|INNER|FULL|CROSS|NATURAL|JOIN|WHERE|GROUP|ORDER|HAVING|LIMIT|UNION|$))/gi;

  let match;
  let idx = 0;
  const fromMatch = /FROM\s+([`"\[]?[\w.]+[`"\]]?)(?:\s+(?:AS\s+)?(\w+))?/i.exec(sql);
  const fromTable = fromMatch ? fromMatch[1].replace(/[`"\[\]]/g, '') : '';

  while ((match = joinPattern.exec(sql)) !== null) {
    const rawJoinType = match[1].replace(/\s+/g, ' ').toUpperCase().trim();
    const joinedTable = match[2].replace(/[`"\[\]]/g, '');
    const condition = match[4]?.trim() || '';

    let joinType: JoinType = 'INNER JOIN';
    if (rawJoinType.includes('LEFT')) joinType = 'LEFT JOIN';
    else if (rawJoinType.includes('RIGHT')) joinType = 'RIGHT JOIN';
    else if (rawJoinType.includes('FULL')) joinType = 'FULL OUTER JOIN';
    else if (rawJoinType.includes('CROSS')) joinType = 'CROSS JOIN';
    else if (rawJoinType.includes('NATURAL')) joinType = 'NATURAL JOIN';

    // Find source table from condition or use previous table
    let sourceTable = fromTable;
    if (condition) {
      const condParts = condition.match(/(\w+)\.\w+\s*=\s*(\w+)\.\w+/);
      if (condParts) {
        const t1 = condParts[1];
        const t2 = condParts[2];
        const t1Node = tables.find(
          (t) =>
            t.alias?.toLowerCase() === t1.toLowerCase() || t.name.toLowerCase() === t1.toLowerCase()
        );
        const t2Node = tables.find(
          (t) =>
            t.alias?.toLowerCase() === t2.toLowerCase() || t.name.toLowerCase() === t2.toLowerCase()
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

  return joins;
}

function extractCTEs(sql: string): CTE[] {
  const ctes: CTE[] = [];

  // Check if SQL starts with WITH (case-insensitive, allowing leading whitespace/comments)
  const withStartMatch = /^\s*WITH\s+/i.exec(sql);
  if (!withStartMatch) return ctes;

  // Use a depth-aware parser to extract each CTE name and its body
  // This correctly handles nested parentheses (subqueries inside CTEs)
  const rawCtes: { name: string; body: string }[] = [];

  let pos = withStartMatch[0].length; // position right after "WITH "
  const len = sql.length;

  while (pos < len) {
    // Skip whitespace and commas between CTEs
    while (pos < len && /[\s,]/.test(sql[pos])) pos++;
    if (pos >= len) break;

    // Check for RECURSIVE keyword
    const recursiveMatch = /^RECURSIVE\s+/i.exec(sql.slice(pos));
    if (recursiveMatch) pos += recursiveMatch[0].length;

    // Read CTE name (word characters)
    const nameMatch = /^(\w+)\s*/i.exec(sql.slice(pos));
    if (!nameMatch) break;
    const cteName = nameMatch[1];
    pos += nameMatch[0].length;

    // Expect "AS"
    const asMatch = /^AS\s*/i.exec(sql.slice(pos));
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

  rawCtes.forEach((raw, i) => {
    const name = raw.name;
    const body = raw.body;
    const tables = extractTables(body).map((t) => t.name);
    const fieldsWithAlias = extractSelectFields(body);
    const fields = fieldsWithAlias.map((f) => f.field); // Convert objects to strings for CTE

    // Column references from SELECT clause
    const colRefs: string[] = [];
    const selectPart = /SELECT\s+([\s\S]+?)\s+FROM/i.exec(body);
    if (selectPart) {
      const parts = selectPart[1].split(',').map((p) => p.trim());
      parts.forEach((p) => {
        const clean = p.replace(/\s+AS\s+\w+/i, '').trim();
        if (clean && !colRefs.includes(clean)) colRefs.push(clean);
      });
    }

    // Usage count in main query (how many times this CTE name appears after the WITH block)
    const usageRegex = new RegExp(`\\b${name}\\b`, 'gi');
    const usageMatches = mainQuery.match(usageRegex);
    const usageCount = usageMatches ? usageMatches.length : 0;

    // Dependencies: which other CTE names are referenced inside this CTE body
    const dependencies: string[] = [];
    rawCtes.forEach((other) => {
      if (other.name !== name) {
        const depRegex = new RegExp(`\\b${other.name}\\b`, 'i');
        if (depRegex.test(body)) {
          dependencies.push(other.name);
        }
      }
    });

    // Recursive detection: CTE references itself
    const selfRef = new RegExp(`\\b${name}\\b`, 'i');
    const isRecursive = selfRef.test(body);

    // Estimated complexity based on body characteristics
    const upperBody = body.toUpperCase();
    const hasJoins = /\bJOIN\b/.test(upperBody);
    const hasSubquery = /SELECT[\s\S]+?FROM[\s\S]+?SELECT/i.test(body);
    const hasWindow = /\bOVER\s*\(/.test(upperBody);
    const hasGroupBy = /\bGROUP\s+BY\b/.test(upperBody);
    const hasHaving = /\bHAVING\b/.test(upperBody);
    const hasWhere = /\bWHERE\b/.test(upperBody);
    const bodyLines = body.split('\n').length;
    let complexityScore = 0;
    if (hasJoins) complexityScore += 2;
    if (hasSubquery) complexityScore += 3;
    if (hasWindow) complexityScore += 2;
    if (hasGroupBy) complexityScore += 1;
    if (hasHaving) complexityScore += 1;
    if (hasWhere) complexityScore += 1;
    if (bodyLines > 20) complexityScore += 2;
    if (bodyLines > 10) complexityScore += 1;
    const estimatedComplexity: 'LOW' | 'MEDIUM' | 'HIGH' =
      complexityScore >= 5 ? 'HIGH' : complexityScore >= 2 ? 'MEDIUM' : 'LOW';

    // Unused: not referenced in main query at all
    const isUnused = usageCount === 0;

    // Extract nested subqueries within this CTE body
    const nestedSubqueries = extractNestedSubqueries(body, `cte-${i}`);

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
      columnReferences: colRefs.slice(0, 15),
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
  const withMatch = /^\s*WITH\s+/i.exec(sql);
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
  while (pos < len && cteCount < 100) {
    // Skip whitespace
    while (pos < len && /\s/.test(sql[pos])) pos++;
    if (pos >= len) return '';

    // Skip RECURSIVE keyword if present
    const recursiveMatch = /^RECURSIVE\s+/i.exec(sql.slice(pos));
    if (recursiveMatch) pos += recursiveMatch[0].length;

    // Read CTE name
    const nameMatch = /^(\w+)\s*/i.exec(sql.slice(pos));
    if (!nameMatch) break;
    pos += nameMatch[0].length;

    // Expect "AS"
    const asMatch = /^AS\s*/i.exec(sql.slice(pos));
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

function extractNestedSubqueries(sql: string, cteId: string): NestedSubquery[] {
  const results: NestedSubquery[] = [];

  // We walk through the SQL character by character, tracking paren depth.
  // When we encounter a SELECT inside parentheses, we capture it as a subquery.
  // We skip string literals and the outermost level (depth 0).

  const len = sql.length;
  let i = 0;
  let globalDepth = 0; // paren depth relative to the whole body

  // Helper: skip a quoted string starting at position i, return end position
  function skipString(pos: number, quote: string): number {
    let j = pos + 1;
    while (j < len) {
      if (sql[j] === quote && sql[j + 1] === quote) {
        j += 2; // escaped quote ''
      } else if (sql[j] === quote) {
        return j + 1;
      } else {
        j++;
      }
    }
    return j;
  }

  // Helper: extract the body of a parenthesised block starting just after '('
  function extractParenBlock(startPos: number): { body: string; endPos: number } {
    let depth = 1;
    let j = startPos;
    while (j < len && depth > 0) {
      const ch = sql[j];
      if (ch === "'" || ch === '"' || ch === '`') {
        j = skipString(j, ch);
        continue;
      }
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (depth > 0) j++;
      else break;
    }
    return { body: sql.slice(startPos, j).trim(), endPos: j };
  }

  // Determine context keyword before a '(' that contains SELECT
  function getContext(pos: number): string {
    const before = sql.slice(Math.max(0, pos - 60), pos).trimEnd();
    const kw = before.match(
      /\b(WHERE|FROM|SELECT|JOIN|ON|HAVING|IN|EXISTS|NOT\s+EXISTS|NOT\s+IN|AND|OR|SET|VALUES)\s*$/i
    );
    return kw ? kw[1].replace(/\s+/g, ' ').toUpperCase() : 'UNKNOWN';
  }

  // Recursive scanner: scan `text` for subqueries, treating them as being at `baseDepth`
  function scan(text: string, baseDepth: number) {
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
        // Peek inside: is there a SELECT keyword at the start of this block?
        const innerStart = pos + 1;
        // Find the matching close paren
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
        const innerBody = text.slice(innerStart, j).trim();

        // Check if this parenthesised block is a subquery (starts with SELECT)
        if (/^\s*SELECT\b/i.test(innerBody)) {
          const currentDepth = baseDepth + 1;
          const context = getContext(pos);
          const subTables = extractTables(innerBody).map((t) => t.name);
          const subFieldsWithAlias = extractSelectFields(innerBody);
          const subFields = subFieldsWithAlias.map((f) => f.field); // Convert objects to strings for NestedSubquery
          const subLines = innerBody.split('\n').length;
          const hasJoins = /\bJOIN\b/i.test(innerBody);
          const hasAggregation = /\b(COUNT|SUM|AVG|MIN|MAX|GROUP\s+BY)\b/i.test(innerBody);

          results.push({
            id: `${cteId}-sub-${results.length}`,
            depth: currentDepth,
            body: innerBody,
            tables: subTables,
            fields: subFields,
            lineCount: subLines,
            hasJoins,
            hasAggregation,
            context,
          });

          // Recurse into this subquery to find deeper nesting
          scan(innerBody, currentDepth);
        }

        pos = j + 1; // skip past the closing ')'
        continue;
      }

      pos++;
    }
  }

  scan(sql, 0);

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
  report: StructuralAnalysisReport
): SqlMetrics {
  const upper = sql.toUpperCase();
  return {
    windowFunctions: countPattern(upper, /\bOVER\s*\(/g),
    groupBy: countPattern(upper, /\bGROUP\s+BY\b/g),
    orderBy: countPattern(upper, /\bORDER\s+BY\b/g),
    distinct: countPattern(upper, /\bDISTINCT\b/g),
    having: countPattern(upper, /\bHAVING\b/g),
    where: countPattern(upper, /\bWHERE\b/g),
    subqueryDepth: computeSubqueryDepth(sql),
    subqueryCount: report.subqueryCount,
    conditionCount: report.conditionCount,
    operationAndFunctionCount: report.operationAndFunctionCount,
    lineCount: report.lineCount,
    joinCount: report.joinCount,
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

  // Extract all nested subqueries from main query and CTEs
  const mainQuerySubqueries = extractNestedSubqueries(mainQuery, 'main');
  const cteSubqueries: NestedSubquery[] = [];
  ctes.forEach((cte) => {
    cteSubqueries.push(...extractNestedSubqueries(cte.body, cte.id));
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

function computeSubqueryDepth(sql: string): number {
  let depth = 0;
  let maxDepth = 0;
  for (const ch of sql) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth > maxDepth) maxDepth = depth;
  }
  // Rough heuristic: subquery depth ~ max paren depth / 2
  return Math.max(0, Math.floor(maxDepth / 2) - 1);
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

  let level: ComplexityLevel = 'LOW';
  const ratio = score / maxScore;
  if (ratio >= 0.75) level = 'SUPER_HIGH';
  else if (ratio >= 0.5) level = 'HIGH';
  else if (ratio >= 0.25) level = 'MEDIUM';

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

function extractMainQueryFields(
  sql: string,
  ctes: CTE[],
  tables: TableNode[]
): AnalysisResult['mainQueryFields'] {
  const fields = extractSelectFields(sql);
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
function stripSqlComments(sql: string): string {
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
