// Backend integration point: Replace this entire module with actual dt-sql-parser calls
// when integrating with a real parsing backend or when dt-sql-parser is fully initialized.

export type SqlDialect = 'mysql' | 'postgresql' | 'sqlserver' | 'oracle';

export type JoinType =
  | 'INNER JOIN'
  | 'LEFT JOIN'
  | 'RIGHT JOIN'
  | 'FULL OUTER JOIN'
  | 'CROSS JOIN'
  | 'NATURAL JOIN';

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
  subqueryDepth: number;
  joinCount: number;
  cteCount: number;
  tableCount: number;
  selectFields: number;
}

export type ComplexityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'SUPER HIGH';

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
  executionCost: ExecutionCostEstimate;
  mainQueryFields: { field: string; origin: string; type: 'cte' | 'table' | 'expression' }[];
  dialect: SqlDialect;
  rawSql: string;
}

// ─── Regex-based extraction (client-side heuristic) ──────────────────────────

function extractTables(sql: string): TableNode[] {
  const tables: Map<string, TableNode> = new Map();
  const upper = sql.toUpperCase();

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
    if (['WHERE', 'ON', 'SET', 'SELECT', 'WITH'].includes(rawName.toUpperCase())) continue;
    const key = rawName.toUpperCase();
    if (!tables.has(key)) {
      tables.set(key, {
        id: `table-${rawName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        name: rawName,
        alias: alias && alias.toUpperCase() !== rawName.toUpperCase() ? alias : undefined,
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
  // pos now points to the main SELECT (or whitespace before it)
  const mainQuery = sql.slice(pos).trim();

  rawCtes.forEach((raw, i) => {
    const name = raw.name;
    const body = raw.body;
    const tables = extractTables(body).map((t) => t.name);
    const fields = extractSelectFields(body);

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
    const bodyLines = body.split('\n').length;
    let complexityScore = 0;
    if (hasJoins) complexityScore += 2;
    if (hasSubquery) complexityScore += 3;
    if (hasWindow) complexityScore += 2;
    if (hasGroupBy) complexityScore += 1;
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
          const subFields = extractSelectFields(innerBody);
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

function extractSelectFields(sql: string): string[] {
  const selectMatch = /SELECT\s+([\s\S]+?)\s+FROM/i.exec(sql);
  if (!selectMatch) return [];
  return selectMatch[1]
    .split(',')
    .map((f) =>
      f
        .trim()
        .replace(/\s+AS\s+\w+/i, '')
        .trim()
    )
    .filter((f) => f.length > 0)
    .slice(0, 12);
}

function countPattern(sql: string, pattern: RegExp): number {
  return (sql.match(pattern) || []).length;
}

function computeMetrics(
  sql: string,
  ctes: CTE[],
  tables: TableNode[],
  joins: JoinEdge[]
): SqlMetrics {
  const upper = sql.toUpperCase();
  return {
    windowFunctions: countPattern(upper, /\bOVER\s*\(/g),
    groupBy: countPattern(upper, /\bGROUP\s+BY\b/g),
    orderBy: countPattern(upper, /\bORDER\s+BY\b/g),
    distinct: countPattern(upper, /\bDISTINCT\b/g),
    subqueryDepth: computeSubqueryDepth(sql),
    joinCount: joins.length,
    cteCount: ctes.length,
    tableCount: tables.length,
    selectFields: extractSelectFields(sql).length,
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

function computeComplexity(metrics: SqlMetrics): ComplexityScore {
  const factors = [
    { name: 'JOIN Count', value: metrics.joinCount, weight: 3 },
    { name: 'Subquery Depth', value: metrics.subqueryDepth, weight: 4 },
    { name: 'CTE Count', value: metrics.cteCount, weight: 2 },
    { name: 'Window Functions', value: metrics.windowFunctions, weight: 3 },
    { name: 'GROUP BY', value: metrics.groupBy, weight: 1 },
    { name: 'ORDER BY', value: metrics.orderBy, weight: 1 },
    { name: 'DISTINCT', value: metrics.distinct, weight: 1 },
  ];

  const scored = factors.map((f) => ({
    ...f,
    contribution: Math.min(f.value * f.weight, f.weight * 5),
  }));

  const score = scored.reduce((s, f) => s + f.contribution, 0);
  const maxScore = scored.reduce((s, f) => s + f.weight * 5, 0);

  let level: ComplexityLevel = 'LOW';
  const ratio = score / maxScore;
  if (ratio >= 0.75) level = 'SUPER HIGH';
  else if (ratio >= 0.5) level = 'HIGH';
  else if (ratio >= 0.25) level = 'MEDIUM';

  return { level, score, maxScore, factors: scored };
}

function computeExecutionCost(
  metrics: SqlMetrics,
  complexity: ComplexityScore,
  dialect: SqlDialect
): ExecutionCostEstimate {
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
      name: 'Join Depth',
      impact: metrics.joinCount > 4 ? 'high' : metrics.joinCount > 2 ? 'medium' : 'low',
      note: `${metrics.joinCount} join(s) detected`,
    },
    {
      name: 'Subquery Nesting',
      impact: metrics.subqueryDepth > 3 ? 'high' : metrics.subqueryDepth > 1 ? 'medium' : 'low',
      note: `Max depth ~${metrics.subqueryDepth}`,
    },
    {
      name: 'Analytic Functions',
      impact: metrics.windowFunctions > 2 ? 'high' : metrics.windowFunctions > 0 ? 'medium' : 'low',
      note: `${metrics.windowFunctions} OVER() clause(s)`,
    },
    {
      name: 'Dialect Overhead',
      impact: dialect === 'oracle' || dialect === 'sqlserver' ? 'medium' : 'low',
      note: `${dialect.toUpperCase()} optimizer assumed`,
    },
    {
      name: 'Standard Indexing',
      impact: 'low',
      note: 'Assumes standard B-tree indexes on join keys',
    },
  ];

  const recommendations: Record<string, string> = {
    LOW: 'Query appears lightweight. Standard indexing should handle this well.',
    MEDIUM: 'Consider reviewing join order. Ensure indexed columns are used in ON conditions.',
    HIGH: 'High complexity detected. Consider breaking into smaller queries or using materialized CTEs.',
    'SUPER HIGH':
      'Critical complexity. This query may cause full table scans. Strongly recommend query decomposition and index review.',
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
  return fields.map((field) => {
    const cteName = ctes.find((c) =>
      c.fields.some((f) => field.toLowerCase().includes(f.toLowerCase()))
    )?.name;
    const tableName = tables.find(
      (t) =>
        field.toLowerCase().includes(t.name.toLowerCase()) ||
        (t.alias && field.toLowerCase().includes(t.alias.toLowerCase()))
    )?.name;

    if (cteName) return { field, origin: cteName, type: 'cte' as const };
    if (tableName) return { field, origin: tableName, type: 'table' as const };
    return { field, origin: 'expression', type: 'expression' as const };
  });
}

export function analyzeSql(sql: string, dialect: SqlDialect): AnalysisResult {
  // Strip all SQL comments before scanning
  const stripped = stripSqlComments(sql);
  // Backend integration point: Replace with dt-sql-parser AST traversal
  const cleaned = stripped.trim();
  const tables = extractTables(cleaned);
  const joins = extractJoins(cleaned, tables);
  const ctes = extractCTEs(cleaned);
  const metrics = computeMetrics(cleaned, ctes, tables, joins);
  const complexity = computeComplexity(metrics);
  const executionCost = computeExecutionCost(metrics, complexity, dialect);
  const mainQueryFields = extractMainQueryFields(cleaned, ctes, tables);

  return {
    tables,
    joins,
    ctes,
    metrics,
    complexity,
    executionCost,
    mainQueryFields,
    dialect,
    rawSql: cleaned,
  };
}

export function extractMyBatisParams(xml: string): string[] {
  const params: string[] = [];
  const pattern = /[#$]\{(\w+)\}/g;
  let match;
  while ((match = pattern.exec(xml)) !== null) {
    if (!params.includes(match[1])) params.push(match[1]);
  }
  return params;
}

export function resolveMyBatisParams(xml: string, params: Record<string, string>): string {
  let resolved = xml;
  for (const [key, value] of Object.entries(params)) {
    resolved = resolved.replace(new RegExp(`[#$]\\{${key}\\}`, 'g'), value || `'${key}'`);
  }
  // Extract SQL from MyBatis XML tags
  const sqlMatch =
    /<(?:select|insert|update|delete)[^>]*>([\s\S]*?)<\/(?:select|insert|update|delete)>/i.exec(
      resolved
    );
  if (sqlMatch) return sqlMatch[1].trim();
  return resolved;
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
