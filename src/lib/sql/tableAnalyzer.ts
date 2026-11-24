import type { SqlDialect } from './sqlAnalyzer';

export interface TableAnalysis {
  status: 'partial';
  kind: 'table';
  name: string;
  schema: string | null;
  columns: { name: string; type: string }[];
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
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
  for (const property of table.relational_properties) {
    const column = record(property);
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
  }
  if (columns.length === 0) return null;
  return { status: 'partial', kind: 'table', name: name.name, schema: name.schema, columns };
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
  };
}
