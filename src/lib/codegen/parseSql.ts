import { Parser } from 'node-sql-parser';
import type {
  AstStatistics,
  ColumnDefinition,
  Constraint,
  GenerationDiagnostic,
  ParsedSqlModel,
  SelectExpressionKind,
  SelectField,
  SqlDialect,
  StatementKind,
  TableDefinition,
} from './model';

type AstRecord = Record<string, unknown>;

const GRAMMAR_BY_DIALECT: Partial<Record<SqlDialect, string>> = {
  mysql: 'MySQL',
  postgresql: 'Postgresql',
  sqlserver: 'TransactSQL',
};

function asRecord(value: unknown): AstRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as AstRecord)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function identifier(value: unknown): string | null {
  if (typeof value === 'string') return value;
  const object = asRecord(value);
  if (!object) return null;
  if (typeof object.value === 'string') return object.value;
  const expr = asRecord(object.expr);
  return expr && typeof expr.value === 'string' ? expr.value : null;
}

function diagnostic(
  severity: GenerationDiagnostic['severity'],
  code: string,
  message: string
): GenerationDiagnostic {
  return { severity, code, message, sourceSpan: null };
}

function emptyModel(sql: string, dialect: SqlDialect): ParsedSqlModel {
  return {
    dialect,
    statementKind: 'unknown',
    tables: [],
    selectShape: null,
    sourceSql: sql,
    parseStatus: 'invalid',
    diagnostics: [],
    astStatistics: null,
  };
}

function normalizeColumn(definition: AstRecord): ColumnDefinition | null {
  const column = asRecord(definition.column);
  const name = identifier(column?.column);
  const type = asRecord(definition.definition);
  const rawType = typeof type?.dataType === 'string' ? type.dataType : null;
  if (!name || !rawType) return null;

  const length = typeof type?.length === 'number' ? type.length : null;
  const nullable = asRecord(definition.nullable);
  const nullableType = typeof nullable?.type === 'string' ? nullable.type.toLowerCase() : '';

  return {
    name,
    sqlType: { raw: rawType, normalized: rawType.toUpperCase() },
    nullable: nullableType === 'not null' ? false : true,
    length,
    precision: null,
    scale: null,
    defaultExpression: null,
    identity: 'unknown',
  };
}

function normalizeConstraint(definition: AstRecord): Constraint | null {
  const constraintType =
    typeof definition.constraint_type === 'string' ? definition.constraint_type.toLowerCase() : '';
  const name = typeof definition.constraint === 'string' ? definition.constraint : null;
  const columns = asArray(definition.definition)
    .map((item) => identifier(asRecord(item)?.column))
    .filter((column): column is string => column !== null);

  if (constraintType === 'primary key' && columns.length > 0) {
    return { kind: 'primary-key', columns, name };
  }
  if (constraintType === 'unique' && columns.length > 0) {
    return { kind: 'unique', columns, name };
  }
  if (constraintType !== 'foreign key') return null;

  const reference = asRecord(definition.reference_definition);
  const referencedTable = identifier(asRecord(asArray(reference?.table)[0])?.table);
  const referencedColumns = asArray(reference?.definition)
    .map((item) => identifier(asRecord(item)?.column))
    .filter((column): column is string => column !== null);
  if (!referencedTable || columns.length === 0 || referencedColumns.length === 0) {
    return {
      kind: 'unknown',
      raw: 'FOREIGN KEY constraint with incomplete reference metadata',
      name,
    };
  }
  return { kind: 'foreign-key', columns, referencedTable, referencedColumns, name };
}

function normalizeCreateTable(
  statement: AstRecord,
  sql: string,
  dialect: SqlDialect
): ParsedSqlModel {
  const tableNode = asRecord(asArray(statement.table)[0]);
  const tableName = identifier(tableNode?.table);
  if (!tableName) {
    return {
      ...emptyModel(sql, dialect),
      diagnostics: [
        diagnostic(
          'error',
          'unsupported-create-table',
          'The table name could not be read from this CREATE TABLE statement.'
        ),
      ],
    };
  }

  const columns: ColumnDefinition[] = [];
  const constraints: Constraint[] = [];
  for (const rawDefinition of asArray(statement.create_definitions)) {
    const definition = asRecord(rawDefinition);
    if (!definition) continue;
    const constraint = normalizeConstraint(definition);
    if (constraint) {
      constraints.push(constraint);
      continue;
    }
    const column = normalizeColumn(definition);
    if (!column) continue;
    columns.push(column);
    if (typeof definition.primary_key === 'string') {
      constraints.push({ kind: 'primary-key', columns: [column.name], name: null });
    }
  }

  const primaryKeyColumns = new Set(
    constraints.flatMap((constraint) =>
      constraint.kind === 'primary-key' ? constraint.columns : []
    )
  );
  for (const column of columns) {
    if (primaryKeyColumns.has(column.name)) column.nullable = false;
  }

  if (columns.length === 0) {
    return {
      ...emptyModel(sql, dialect),
      statementKind: 'create-table',
      diagnostics: [
        diagnostic(
          'error',
          'unsupported-create-table',
          'No supported column definitions were found.'
        ),
      ],
    };
  }

  const table: TableDefinition = {
    schemaName: identifier(tableNode?.db),
    tableName,
    columns,
    constraints,
    sourceSpan: null,
  };

  return {
    dialect,
    statementKind: 'create-table',
    tables: [table],
    selectShape: null,
    sourceSql: sql,
    parseStatus: 'parsed',
    diagnostics: [],
    astStatistics: null,
  };
}

function expressionText(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  const expression = asRecord(value);
  if (!expression) return null;

  const type = typeof expression.type === 'string' ? expression.type.toLowerCase() : '';
  if (type === 'column_ref') {
    const column = identifier(expression.column);
    const table = identifier(expression.table);
    return column ? (table ? `${table}.${column}` : column) : null;
  }
  if (type === 'aggr_func') {
    const name = typeof expression.name === 'string' ? expression.name : null;
    const args = asRecord(expression.args);
    const argument = expressionText(args?.expr);
    if (!name || !argument) return null;
    return `${name}(${args?.distinct ? 'DISTINCT ' : ''}${argument})`;
  }
  if (type === 'binary_expr') {
    const left = expressionText(expression.left);
    const right = expressionText(expression.right);
    const operator = typeof expression.operator === 'string' ? expression.operator : null;
    return left && right && operator ? `${left} ${operator} ${right}` : null;
  }
  if (type === 'unary_expr') {
    const inner = expressionText(expression.expr);
    const operator = typeof expression.operator === 'string' ? expression.operator : null;
    return inner && operator ? `${operator} ${inner}` : null;
  }
  if (type === 'star' || expression.column === '*') return '*';
  if (['number', 'string', 'single_quote_string', 'bool', 'null'].includes(type)) {
    const literal = expression.value;
    return typeof literal === 'string' || typeof literal === 'number' ? String(literal) : null;
  }
  return null;
}

function sourceColumns(value: unknown): string[] {
  const result: string[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const object = asRecord(node);
    if (!object) return;
    if (object.type === 'column_ref') {
      const text = expressionText(object);
      if (text && !result.includes(text)) result.push(text);
      return;
    }
    Object.values(object).forEach(visit);
  };
  visit(value);
  return result;
}

function expressionKind(value: unknown): SelectExpressionKind {
  const expression = asRecord(value);
  if (!expression) return 'unknown';
  const type = typeof expression?.type === 'string' ? expression.type.toLowerCase() : '';
  if (type === 'column_ref') return expression.column === '*' ? 'wildcard' : 'column';
  if (type === 'aggr_func') return 'aggregate';
  if (type === 'binary_expr' || type === 'unary_expr') return 'computed';
  return 'unknown';
}

function normalizeSelect(statement: AstRecord, sql: string, dialect: SqlDialect): ParsedSqlModel {
  const diagnostics: GenerationDiagnostic[] = [];
  if (statement.distinct) {
    diagnostics.push(
      diagnostic(
        'warning',
        'unsupported-select-clause',
        'SELECT DISTINCT is not represented in the normalized query shape yet.'
      )
    );
  }
  const fields: SelectField[] = asArray(statement.columns).map((rawField) => {
    const field = asRecord(rawField) ?? {};
    const expression = expressionText(field.expr);
    const kind = expressionKind(field.expr);
    if (!expression || kind === 'unknown') {
      diagnostics.push(
        diagnostic(
          'warning',
          'unsupported-select-expression',
          'A selected expression could not be normalized safely.'
        )
      );
    }
    return {
      expression: expression ?? '',
      alias: identifier(field.as),
      sourceColumns: sourceColumns(field.expr),
      expressionKind: expression ? kind : 'unknown',
      inferredSqlType: null,
    };
  });

  const from = asArray(statement.from)
    .map(asRecord)
    .filter((table): table is AstRecord => table !== null);
  const groupBy = asRecord(statement.groupby);
  const orderBy = asArray(statement.orderby).map((item) => asRecord(item)?.expr);
  const groupByExpressions = asArray(groupBy?.columns).map(expressionText);
  const orderByExpressions = orderBy.map(expressionText);
  if (
    groupByExpressions.some((expression) => expression === null) ||
    orderByExpressions.some((expression) => expression === null)
  ) {
    diagnostics.push(
      diagnostic(
        'warning',
        'unsupported-select-clause',
        'A GROUP BY or ORDER BY expression could not be normalized safely.'
      )
    );
  }

  return {
    dialect,
    statementKind: 'select',
    tables: [],
    selectShape: {
      fields,
      sourceTables: from
        .map((table) => identifier(table.table))
        .filter((name): name is string => name !== null),
      hasJoin: from.some((table) => typeof table.join === 'string' && table.join.length > 0),
      groupByExpressions: groupByExpressions.filter(
        (expression): expression is string => expression !== null
      ),
      orderByExpressions: orderByExpressions.filter(
        (expression): expression is string => expression !== null
      ),
      hasAggregation: fields.some((field) => field.expressionKind === 'aggregate'),
    },
    sourceSql: sql,
    parseStatus: diagnostics.length > 0 ? 'partial' : 'parsed',
    diagnostics,
    astStatistics: null,
  };
}

/**
 * Reads a function name off an AST function node.
 *
 * The parser uses two shapes: `aggr_func` carries a plain string name, while `function` nests it
 * as `{ name: [{ value }] }`. Both are accepted so aggregates and window functions are counted by
 * the same rule instead of by guessing from the SQL text (FR-001).
 */
function functionNameOf(node: AstRecord): string | null {
  const raw = node.name;
  if (typeof raw === 'string' && raw.length > 0) return raw;
  const record = asRecord(raw);
  if (!record) return null;
  if (typeof record.value === 'string' && record.value.length > 0) return record.value;
  for (const part of asArray(record.name)) {
    if (typeof part === 'string' && part.length > 0) return part;
    const partRecord = asRecord(part);
    if (typeof partRecord?.value === 'string' && partRecord.value.length > 0) {
      return partRecord.value;
    }
  }
  return null;
}

/**
 * Measures real structural statistics from one parsed AST (specs/016-ast-statistics FR-003).
 *
 * Counting rules, chosen so results are deterministic and independent of formatting or comments:
 * - A "node" is an object record carrying a string `type`; `totalNodeCount` is the sum of the
 *   per-type groups. Wrapper objects such as the CTE `{ tableList, columnList, ast }` envelope
 *   carry no `type` and are therefore not counted as nodes.
 * - Operators are read from the AST `operator` fields of expression nodes, never from SQL text.
 * - CTE count is every declaration; `cteNestingDepth` is the deepest nested `WITH` scope, where a
 *   single top-level `WITH` is 1 and sibling declarations stay at that depth.
 * - `subqueryDepth` counts nested query-expression boundaries. A CTE body root is a query root, not
 *   a subquery, so selects inside it are measured from their own body; any select nested below a
 *   query root (FROM/WHERE/column subqueries) adds one level.
 */
function computeAstStatistics(root: AstRecord): AstStatistics {
  const nodeCountsByType: Record<string, number> = {};
  const operatorCounts: Record<string, number> = {};
  const functionCounts: Record<string, number> = {};
  let totalNodeCount = 0;

  const countNodes = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(countNodes);
      return;
    }
    const record = asRecord(value);
    if (!record) return;

    const type = typeof record.type === 'string' ? record.type.toLowerCase() : null;
    if (type) {
      nodeCountsByType[type] = (nodeCountsByType[type] ?? 0) + 1;
      totalNodeCount += 1;
    }

    const operator = typeof record.operator === 'string' ? record.operator : null;
    if (operator) {
      const key = operator.toUpperCase();
      operatorCounts[key] = (operatorCounts[key] ?? 0) + 1;
    }

    if (type === 'function' || type === 'aggr_func') {
      const name = functionNameOf(record);
      if (name) {
        const key = name.toUpperCase();
        functionCounts[key] = (functionCounts[key] ?? 0) + 1;
      }
    }

    Object.values(record).forEach(countNodes);
  };
  countNodes(root);

  let cteCount = 0;
  let cteNestingDepth = 0;
  let subqueryDepth = 0;

  const walkDepth = (
    value: unknown,
    withScope: number,
    subLevel: number,
    isQueryRoot: boolean
  ): void => {
    if (Array.isArray(value)) {
      value.forEach((item) => walkDepth(item, withScope, subLevel, isQueryRoot));
      return;
    }
    const record = asRecord(value);
    if (!record) return;
    const type = typeof record.type === 'string' ? record.type.toLowerCase() : null;

    let nextSubLevel = subLevel;
    if (type === 'select' && !isQueryRoot) {
      nextSubLevel = subLevel + 1;
      if (nextSubLevel > subqueryDepth) subqueryDepth = nextSubLevel;
    }

    const declarations = asArray(record.with);
    if (declarations.length > 0) {
      cteCount += declarations.length;
      if (withScope + 1 > cteNestingDepth) cteNestingDepth = withScope + 1;
      for (const declaration of declarations) {
        const body = asRecord(asRecord(declaration)?.stmt);
        const statement = asRecord(body?.ast);
        // A CTE body is its own query root: it never raises subqueryDepth, and a WITH inside it
        // opens one deeper WITH scope.
        if (statement) walkDepth(statement, withScope + 1, 0, true);
      }
    }

    for (const [key, child] of Object.entries(record)) {
      // `with` was handled above; re-walking it would double-count and lose the CTE flags.
      if (key === 'with') continue;
      walkDepth(child, withScope, nextSubLevel, false);
    }
  };
  walkDepth(root, 0, 0, true);

  return {
    totalNodeCount,
    nodeCountsByType,
    statementKind: statementKind(root),
    cteCount,
    cteNestingDepth,
    subqueryDepth,
    operatorCounts,
    functionCounts,
  };
}

/**
 * Resolves the single AST root statistics may be computed from.
 *
 * `astify` returns one record for a single statement and an array for a multi-statement script.
 * A script with more than one root is reported as unavailable rather than describing only its
 * first statement, which would misrepresent the analysed input (plan.md — single-root decision).
 */
function statisticsFromParse(parsed: unknown): AstStatistics | null {
  const root = Array.isArray(parsed)
    ? parsed.length === 1
      ? asRecord(parsed[0])
      : null
    : asRecord(parsed);
  return root ? computeAstStatistics(root) : null;
}

function statementKind(statement: AstRecord): StatementKind {
  const type = typeof statement.type === 'string' ? statement.type.toLowerCase() : '';
  const keyword = typeof statement.keyword === 'string' ? statement.keyword.toLowerCase() : '';
  if (type === 'create' && keyword === 'table') return 'create-table';
  if (type === 'alter' && keyword === 'table') return 'alter-table';
  if (type === 'select') return 'select';
  if (type === 'insert' || type === 'replace') return 'insert';
  if (type === 'update') return 'update';
  if (type === 'delete') return 'delete';
  return 'unknown';
}

/** Opt-in controls for `parseSql`. Statistics are opt-in so code-generation callers, which only
 *  need the normalized model, never pay for the AST traversal. */
export interface ParseSqlOptions {
  /** Compute real AST statistics from the same parse. Default `false`. */
  statistics?: boolean;
}

export function parseSql(
  sql: string,
  dialect: SqlDialect,
  options: ParseSqlOptions = {}
): ParsedSqlModel {
  const grammar = GRAMMAR_BY_DIALECT[dialect];
  if (!grammar) {
    // Oracle has no grammar in this pipeline: reported as unavailable, never approximated (FR-006).
    return {
      ...emptyModel(sql, dialect),
      parseStatus: 'unsupported',
      diagnostics: [
        diagnostic(
          'error',
          'unsupported-dialect',
          `SQL parsing is not available for the ${dialect} dialect.`
        ),
      ],
    };
  }

  try {
    const parsed = new Parser().astify(sql, { database: grammar });
    // Statistics come from the very same AST the model is normalized from, so they cannot drift
    // from the parse and no second parser or second pass is introduced (FR-002).
    const astStatistics = options.statistics ? statisticsFromParse(parsed) : null;
    const first = Array.isArray(parsed) ? parsed[0] : parsed;
    const statement = asRecord(first);
    if (!statement) return { ...emptyModel(sql, dialect), astStatistics };

    const kind = statementKind(statement);
    if (kind === 'create-table') {
      return { ...normalizeCreateTable(statement, sql, dialect), astStatistics };
    }
    if (kind === 'select') {
      return { ...normalizeSelect(statement, sql, dialect), astStatistics };
    }
    if (kind === 'insert' || kind === 'update' || kind === 'delete') {
      return {
        ...emptyModel(sql, dialect),
        statementKind: kind,
        parseStatus: 'parsed',
        astStatistics,
      };
    }

    return {
      ...emptyModel(sql, dialect),
      statementKind: kind,
      parseStatus: 'unsupported',
      diagnostics: [
        diagnostic(
          'warning',
          'unsupported-statement-shape',
          'This SQL statement shape is not normalized yet.'
        ),
      ],
      // A real AST was produced even though its shape is not normalized, so the statistics that
      // describe it stay available (plan.md — partial model still yields statistics).
      astStatistics,
    };
  } catch (error) {
    const location = asRecord(asRecord(error)?.location);
    const start = asRecord(location?.start);
    const end = asRecord(location?.end);
    const startOffset = typeof start?.offset === 'number' ? start.offset : null;
    const endOffset = typeof end?.offset === 'number' ? end.offset : startOffset;
    const line = typeof start?.line === 'number' ? start.line : null;
    const column = typeof start?.column === 'number' ? start.column : null;
    const message =
      line !== null && column !== null
        ? `The SQL could not be parsed for the selected dialect (line ${line}, column ${column}).`
        : 'The SQL could not be parsed for the selected dialect.';
    return {
      ...emptyModel(sql, dialect),
      diagnostics: [
        {
          severity: 'error',
          code: 'invalid-sql',
          message,
          sourceSpan:
            startOffset !== null && endOffset !== null
              ? { start: startOffset, end: endOffset }
              : null,
        },
      ],
    };
  }
}
