import type { SqlDialect } from './sqlAnalyzer';

export interface TableAnalysis {
  status: 'partial';
  kind: 'table';
  name: string;
  schema: string | null;
  columns: { name: string; type: string }[];
  details?: TableDetails;
}

export interface TableDetails {
  columns: { name: string; nullable: string | null; defaultValue: string | null; identity: string | null; comment: string | null }[];
  constraints: { type: string; name: string | null; columns: string[]; reference: string | null }[];
  indexes: { name: string | null; type: string; columns: string[] }[];
  options: { name: string; value: string }[];
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function identifier(value: unknown): string | null {
  if (typeof value === 'string') return value;
  const obj = record(value);
  if (typeof obj?.value === 'string') return obj.value;
  return record(obj?.expr) ? identifier(obj?.expr) : null;
}

function columnNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => identifier(record(item)?.column)).filter((name): name is string => !!name);
}

function referenceText(value: unknown): string | null {
  const reference = record(value);
  const table = Array.isArray(reference?.table) ? record(reference.table[0]) : null;
  const name = identifier(table?.table);
  if (!name) return null;
  const schema = identifier(table?.db);
  const columns = columnNames(reference?.definition);
  const actions = Array.isArray(reference?.on_action)
    ? reference.on_action.map((item) => {
        const action = record(item);
        const value = record(action?.value);
        return typeof action?.type === 'string' && typeof value?.value === 'string'
          ? `${action.type.toUpperCase()} ${value.value.toUpperCase()}` : '';
      }).filter(Boolean)
    : [];
  return `${schema ? `${schema}.` : ''}${name}${columns.length ? ` (${columns.join(', ')})` : ''}${actions.length ? ` ${actions.join(' ')}` : ''}`;
}

export function nodeTableDetails(
  statement: Record<string, unknown>,
  renderExpression: (value: object) => string
): TableDetails {
  const details: TableDetails = { columns: [], constraints: [], indexes: [], options: [] };
  if (!Array.isArray(statement.create_definitions)) return details;
  for (const raw of statement.create_definitions) {
    const definition = record(raw);
    if (!definition) continue;
    if (definition.resource === 'column') {
      const name = identifier(record(definition.column)?.column);
      if (!name) continue;
      const nullable = record(definition.nullable);
      const defaultValue = record(definition.default_val)?.value;
      const comment = record(record(definition.comment)?.value);
      const identity = typeof definition.auto_increment === 'string' ? definition.auto_increment
        : identifier(definition.generated_by_default);
      details.columns.push({
        name,
        nullable: typeof nullable?.value === 'string' ? nullable.value.toUpperCase() : null,
        defaultValue: defaultValue && typeof defaultValue === 'object' ? renderExpression(defaultValue) : null,
        identity: identity?.toUpperCase() ?? null,
        comment: typeof comment?.value === 'string' ? comment.value : null,
      });
      if (definition.primary_key) details.constraints.push({ type: 'PRIMARY KEY', name: null, columns: [name], reference: null });
      if (definition.unique) details.constraints.push({ type: 'UNIQUE', name: null, columns: [name], reference: null });
      if (definition.reference_definition) details.constraints.push({ type: 'FOREIGN KEY', name: null, columns: [name], reference: referenceText(definition.reference_definition) });
    } else if (
      definition.resource === 'constraint' &&
      typeof definition.constraint_type === 'string' &&
      definition.constraint_type.toLowerCase() === 'unique index'
    ) {
      details.indexes.push({
        name: identifier(definition.index),
        type: 'UNIQUE INDEX',
        columns: columnNames(definition.definition),
      });
    } else if (definition.resource === 'constraint' && typeof definition.constraint_type === 'string') {
      details.constraints.push({
        type: definition.constraint_type.toUpperCase(),
        name: identifier(definition.constraint),
        columns: columnNames(definition.definition),
        reference: referenceText(definition.reference_definition),
      });
    } else if (definition.resource === 'index') {
      const indexType = record(definition.index_type);
      const algorithm = typeof indexType?.type === 'string' ? indexType.type
        : typeof definition.index_type === 'string' ? definition.index_type : null;
      details.indexes.push({
        name: identifier(definition.index),
        type: `${typeof definition.keyword === 'string' ? definition.keyword.toUpperCase() : 'INDEX'}${algorithm ? ` USING ${algorithm.toUpperCase()}` : ''}`,
        columns: columnNames(definition.definition),
      });
    }
  }
  if (Array.isArray(statement.table_options)) {
    for (const raw of statement.table_options) {
      const option = record(raw);
      const value = typeof option?.value === 'string' ? option.value : identifier(option?.value);
      if (typeof option?.keyword === 'string' && value !== null) {
        details.options.push({ name: option.keyword.toUpperCase(), value });
      }
    }
  }
  return details;
}

async function analyzeOracleTable(sql: string): Promise<TableAnalysis | null> {
  const { Parser } = await import('oracle-sql-parser');
  let ast: unknown;
  try {
    ast = new Parser().parse(sql.trimEnd().endsWith(';') ? sql : `${sql}\n;`);
  } catch (error) {
    if (error instanceof Error && error.name === 'SyntaxError') return null;
    throw error;
  }
  if (!Array.isArray(ast) || ast.length !== 1) return null;
  const statement = record(ast[0]);
  const name = record(statement?.name);
  const table = record(statement?.table);
  if (
    statement?.operation !== 'create' ||
    statement.object !== 'table' ||
    typeof name?.name !== 'string' ||
    (name.schema !== null && typeof name.schema !== 'string') ||
    !Array.isArray(table?.relational_properties)
  )
    return null;

  const columns: TableAnalysis['columns'] = [];
  const details: TableDetails = { columns: [], constraints: [], indexes: [], options: [] };
  const addConstraint = (raw: unknown, columnName?: string) => {
    const item = record(raw);
    const definition = record(item?.constraint);
    const reference = record(item?.reference) ?? record(definition?.reference);
    const type = reference ? 'FOREIGN KEY' : definition?.primary_key ? 'PRIMARY KEY' : definition?.unique ? 'UNIQUE' : null;
    if (!type) return;
    const object = record(reference?.object);
    const refName = typeof object?.name === 'string' ? object.name : null;
    const refSchema = typeof object?.schema === 'string' ? `${object.schema}.` : '';
    const refColumns = Array.isArray(reference?.columns) ? reference.columns.filter((value): value is string => typeof value === 'string') : [];
    details.constraints.push({
      type,
      name: typeof item?.name === 'string' ? item.name : null,
      columns: columnName ? [columnName] : Array.isArray(definition?.columns) ? definition.columns.filter((value): value is string => typeof value === 'string') : [],
      reference: refName ? `${refSchema}${refName}${refColumns.length ? ` (${refColumns.join(', ')})` : ''}` : null,
    });
  };
  for (const property of table.relational_properties) {
    const column = record(property);
    if (column?.resource === 'constraint') {
      addConstraint(column);
      continue;
    }
    if (column?.resource !== 'column') continue;
    const type = record(column.type);
    if (typeof column.name !== 'string' || typeof type?.type !== 'string') return null;
    let displayType: string;
    if (type.type === 'number') {
      if (type.precision != null && typeof type.precision !== 'number') return null;
      if (type.scale != null && typeof type.scale !== 'number') return null;
      if (type.scale != null && type.precision == null) return null;
      displayType = `NUMBER${type.precision == null ? '' : `(${type.precision}${type.scale == null ? '' : `,${type.scale}`})`}`;
    } else if (
      type.type === 'varchar2' &&
      typeof type.size === 'number' &&
      type.semantics == null
    ) {
      displayType = `VARCHAR2(${type.size})`;
    } else if (type.type === 'date') {
      displayType = 'DATE';
    } else {
      return null;
    }
    columns.push({ name: column.name, type: displayType });
    const constraints = Array.isArray(column.constraints) ? column.constraints : [];
    const notNull = constraints.some((item) => !!record(record(item)?.constraint)?.not_null);
    const defaultExpression = record(column.default)?.expr;
    details.columns.push({
      name: column.name,
      nullable: notNull ? 'NOT NULL' : null,
      defaultValue: typeof defaultExpression === 'number' ? String(defaultExpression) : null,
      identity: null,
      comment: null,
    });
    constraints.forEach((constraint) => addConstraint(constraint, column.name as string));
  }
  if (columns.length === 0) return null;
  return { status: 'partial', kind: 'table', name: name.name, schema: name.schema, columns, details };
}

export async function analyzeTable(
  sql: string,
  dialect: SqlDialect
): Promise<TableAnalysis | null> {
  if (dialect === 'oracle') return analyzeOracleTable(sql);
  if (dialect !== 'mysql' && dialect !== 'postgresql' && dialect !== 'sqlserver') return null;
  const { Parser } = await import('node-sql-parser');
  const parser = new Parser();
  let ast: unknown;
  try {
    ast = parser.astify(sql, { database: dialect === 'sqlserver' ? 'TransactSQL' : dialect });
  } catch (error) {
    if (error instanceof Error && error.name === 'SyntaxError') return null;
    throw error;
  }
  if (Array.isArray(ast) && ast.length !== 1) return null;
  const { parseSql } = await import('../codegen/parseSql');
  const result = parseSql(sql, dialect);
  if (result.statementKind !== 'create-table' || result.parseStatus !== 'parsed') return null;
  const table = result.tables[0];
  if (!table) return null;
  const enumTypes = new Map<string, string>();
  const statement = record(Array.isArray(ast) ? ast[0] : ast);
  if (dialect === 'mysql' && Array.isArray(statement?.create_definitions)) {
    for (const rawDefinition of statement.create_definitions) {
      const definition = record(rawDefinition);
      const column = record(definition?.column);
      const type = record(definition?.definition);
      const expr = record(type?.expr);
      if (
        definition?.resource === 'column' &&
        typeof column?.column === 'string' &&
        type?.dataType === 'ENUM' &&
        expr?.type === 'expr_list' &&
        Array.isArray(expr.value) &&
        expr.value.every((value: unknown) => record(value)?.type === 'single_quote_string')
      ) {
        enumTypes.set(column.column, `ENUM${parser.exprToSQL(expr, { database: 'mysql' })}`);
      }
    }
  }
  return {
    status: 'partial',
    kind: 'table',
    name: table.tableName,
    schema: table.schemaName,
    columns: table.columns.map((column) => ({
      name: column.name,
      type:
        enumTypes.get(column.name) ??
        column.sqlType.raw +
          (column.length === null
            ? ''
            : `(${column.length}${column.scale === null ? '' : `,${column.scale}`})`),
    })),
    details: statement ? nodeTableDetails(statement, (expression) =>
      parser.exprToSQL(expression, { database: dialect === 'sqlserver' ? 'TransactSQL' : dialect })
    ) : undefined,
  };
}
