import { analyzeSql, type SqlDialect } from './sqlAnalyzer';

type RecordValue = Record<string, unknown>;

interface SourcePosition {
  offset: number;
  line: number;
  column: number;
}

function sourcePosition(sql: string, offset: number): SourcePosition {
  const before = sql.slice(0, offset);
  return {
    offset,
    line: before.split('\n').length,
    column: offset - before.lastIndexOf('\n'),
  };
}

function record(value: unknown): RecordValue | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as RecordValue)
    : null;
}

export type ViewAnalysis =
  | {
      status: 'partial';
      name: string;
      schema: string | null;
      columns: string[] | null;
      query: string;
      queryRange: { start: SourcePosition; end: SourcePosition };
      tables: string[];
      sourceCrossCheck: 'agreement' | 'disagreement' | 'unavailable';
    }
  | { status: 'unsupported'; reason: 'dialect' | 'syntax' | 'shape' };

export async function analyzeQuerySources(
  query: string,
  dialect: SqlDialect
): Promise<{
  tables: string[];
  sourceCrossCheck: 'agreement' | 'disagreement' | 'unavailable';
}> {
  const analysis = await analyzeSql(query, dialect);
  const tables = analysis.tables.map((table) => table.name);
  if (dialect === 'oracle') return { tables, sourceCrossCheck: 'unavailable' };
  const { Parser } = await import('node-sql-parser');
  let sourceCrossCheck: 'agreement' | 'disagreement' | 'unavailable' = 'unavailable';
  try {
    const parsedTables = new Parser().tableList(query, {
      database: dialect === 'sqlserver' ? 'TransactSQL' : dialect,
    });
    const astTables: string[] = [];
    for (const entry of parsedTables) {
      const parts = entry.split('::');
      if (parts.length !== 3 || parts[0] !== 'select' || !parts[2]) break;
      astTables.push(parts[1] === 'null' ? parts[2] : `${parts[1]}.${parts[2]}`);
    }
    if (astTables.length === parsedTables.length) {
      const astSet = new Set(astTables);
      const regexSet = new Set(tables);
      sourceCrossCheck =
        astSet.size === regexSet.size && [...astSet].every((table) => regexSet.has(table))
          ? 'agreement'
          : 'disagreement';
    }
  } catch (error) {
    if (!(error instanceof Error && error.name === 'SyntaxError')) throw error;
  }
  return { tables: sourceCrossCheck === 'disagreement' ? [] : tables, sourceCrossCheck };
}

function declaredColumns(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const columns: string[] = [];
  for (const column of value) {
    const name = typeof column === 'string' ? column : record(column)?.value;
    if (typeof name !== 'string' || name.length === 0) return null;
    columns.push(name);
  }
  return columns;
}

async function postgresqlViewQueryRange(
  sql: string
): Promise<{ start: number; end: number } | null> {
  const { PostgreSQL, PostgreSqlParserListener } = await import('dt-sql-parser');
  const parser = new PostgreSQL();
  const errors: unknown[] = [];
  const tree = parser.parse(sql, (error) => errors.push(error));
  if (errors.length || tree.singleStmt().length !== 1) return null;

  let range: { start: number; end: number } | null = null;
  const listener = new PostgreSqlParserListener();
  listener.enterCreateView = (context) => {
    const select = context.selectStmt();
    const start = select.start?.start;
    const end = select.stop?.stop;
    // ANTLR token offsets count Unicode code points, not JavaScript UTF-16 code units.
    const chars = Array.from(sql);
    if (
      start !== undefined &&
      end !== undefined &&
      start >= 0 &&
      end >= start &&
      end < chars.length
    ) {
      range = {
        start: chars.slice(0, start).join('').length,
        end: chars.slice(0, end + 1).join('').length,
      };
    }
  };
  parser.listen(listener, tree);
  return range;
}

/**
 * Parses a single view definition. Only source names are cross-checked; all other query facts
 * remain preliminary.
 */
export async function analyzeView(sql: string, dialect: SqlDialect): Promise<ViewAnalysis> {
  if (dialect !== 'mysql' && dialect !== 'postgresql') {
    return { status: 'unsupported', reason: 'dialect' };
  }

  const { Parser } = await import('node-sql-parser');
  let parsed: unknown;
  try {
    parsed = new Parser().astify(sql, {
      database: dialect,
      trimQuery: false,
      parseOptions: { includeLocations: true },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'SyntaxError') {
      return { status: 'unsupported', reason: 'syntax' };
    }
    throw error;
  }

  const statements = Array.isArray(parsed) ? parsed : [parsed];
  if (statements.length !== 1) return { status: 'unsupported', reason: 'shape' };
  const statement = record(statements[0]);
  const view = record(statement?.view);
  const select = record(statement?.select);
  const location = record(select?.loc);
  const start = record(location?.start)?.offset;
  const end = record(location?.end)?.offset;
  if (
    statement?.type !== 'create' ||
    statement.keyword !== 'view' ||
    typeof view?.view !== 'string'
  ) {
    return { status: 'unsupported', reason: 'shape' };
  }

  const hasLocation =
    typeof start === 'number' &&
    typeof end === 'number' &&
    start >= 0 &&
    end > start &&
    end <= sql.length;
  const range = hasLocation
    ? { start, end }
    : dialect === 'postgresql'
      ? await postgresqlViewQueryRange(sql)
      : null;
  if (!range) return { status: 'unsupported', reason: 'shape' };
  const query = sql.slice(range.start, range.end);
  if (!query) return { status: 'unsupported', reason: 'shape' };
  const { tables, sourceCrossCheck } = await analyzeQuerySources(query, dialect);
  return {
    status: 'partial',
    name: view.view,
    schema: typeof view.db === 'string' ? view.db : null,
    columns: declaredColumns(statement.columns),
    query,
    queryRange: {
      start: sourcePosition(sql, range.start),
      end: sourcePosition(sql, range.end),
    },
    tables,
    sourceCrossCheck,
  };
}
