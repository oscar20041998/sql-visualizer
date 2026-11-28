import type { ParserRuleContext, ParseTree } from 'antlr4ng';
import type { SqlStatementContext } from 'dt-sql-parser/dist/lib/mysql/MySqlParser';
import type { StmtContext } from 'dt-sql-parser/dist/lib/postgresql/PostgreSqlParser';
import type { SqlDialect } from './sqlAnalyzer';

export type StatementKind = 'query' | 'table' | 'view' | 'trigger' | 'procedure' | 'function';

export interface ClassifiedStatement {
  kind: StatementKind;
  text: string;
  /** Inclusive start and exclusive end, in UTF-16 code units. Delimiters and outer trivia are excluded. */
  start: number;
  end: number;
}

export type StatementClassification =
  | { status: 'parsed'; statements: ClassifiedStatement[] }
  | { status: 'unsupported' };

function mysqlKind(statement: SqlStatementContext): StatementKind | null {
  const ddl = statement.ddlStatement();
  if (ddl?.createTable()) return 'table';
  if (ddl?.createView()) return 'view';
  if (ddl?.createTrigger()) return 'trigger';
  if (ddl?.createProcedure()) return 'procedure';
  if (ddl?.createFunction()) return 'function';
  const dml = statement.dmlStatement();
  if (
    dml?.selectStatement() ||
    dml?.setOperations() ||
    dml?.interSectStatement() ||
    dml?.parenthesizedQuery()
  )
    return 'query';
  return null;
}

function postgresKind(statement: StmtContext): StatementKind | null {
  if (statement.createStmt() || statement.createAsStmt()) return 'table';
  if (statement.viewStmt()) return 'view';
  if (statement.createTrigStmt()) return 'trigger';
  const routine = statement.createFunctionStmt();
  if (routine?.KW_FUNCTION()) return 'function';
  if (routine?.KW_PROCEDURE()) return 'procedure';
  if (statement.selectStmt()) return 'query';
  return null;
}

// The PostgreSQL grammar accepts mismatched dollar-quote tags; they must match in SQL.
function matchingDollarQuotes(tree: ParseTree): boolean {
  const stack: ParseTree[] = [tree];
  while (stack.length) {
    const node = stack.pop()!;
    const maybeString = node as ParseTree & {
      BeginDollarStringConstant?: () => { getText(): string } | null;
      EndDollarStringConstant?: () => { getText(): string } | null;
    };
    if (maybeString.BeginDollarStringConstant) {
      const begin = maybeString.BeginDollarStringConstant();
      const end = maybeString.EndDollarStringConstant?.();
      if (begin && (!end || begin.getText() !== end.getText())) return false;
    }
    for (let i = 0; i < node.getChildCount(); i++) {
      const child = node.getChild(i);
      if (child) stack.push(child);
    }
  }
  return true;
}

function ranges(
  source: string,
  entries: { context: ParserRuleContext; kind: StatementKind }[]
): StatementClassification {
  const offsets = [0];
  for (const char of source) offsets.push(offsets[offsets.length - 1] + char.length);
  const statements: ClassifiedStatement[] = [];
  for (const { context, kind } of entries) {
    const start = context.start?.start;
    const end = context.stop?.stop;
    if (
      start === undefined ||
      end === undefined ||
      start < 0 ||
      end < start ||
      end + 1 >= offsets.length
    ) {
      return { status: 'unsupported' };
    }
    const from = offsets[start];
    const to = offsets[end + 1];
    if (statements.length && from < statements[statements.length - 1].end) {
      return { status: 'unsupported' };
    }
    statements.push({ kind, text: source.slice(from, to), start: from, end: to });
  }
  return statements.length ? { status: 'parsed', statements } : { status: 'unsupported' };
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function classifySingleOtherDialect(
  source: string,
  dialect: 'sqlserver' | 'oracle'
): Promise<StatementClassification> {
  // These parsers do not expose reliable root ranges. Restrict input to a form where trimming
  // whitespace and one final semicolon proves the range, without guessing at comments or batches.
  if (
    /--|\/\*|\*\//.test(source) ||
    /(?:^|[\r\n])[ \t]*GO(?:[ \t]+\d+)?[ \t]*(?=[\r\n]|$)/i.test(source)
  ) {
    return { status: 'unsupported' };
  }
  const start = source.length - source.trimStart().length;
  let end = source.trimEnd().length;
  if (source[end - 1] === ';') end = source.slice(0, end - 1).trimEnd().length;
  const text = source.slice(start, end);
  if (!text || text.includes(';')) return { status: 'unsupported' };

  let kind: StatementKind | null = null;
  if (dialect === 'sqlserver') {
    const { Parser } = await import('node-sql-parser');
    const statement = record(new Parser().astify(text, { database: 'TransactSQL' }));
    if (statement?.type === 'select') kind = 'query';
    if (statement?.type === 'create' && statement.keyword === 'table' && !statement.query_expr) {
      kind = 'table';
    }
  } else {
    const { Parser } = await import('oracle-sql-parser');
    const statements = new Parser().parse(`${text}\n;`);
    const statement =
      Array.isArray(statements) && statements.length === 1 ? record(statements[0]) : null;
    if (statement?.operation === 'create' && statement.object === 'table') kind = 'table';
  }
  return kind
    ? { status: 'parsed', statements: [{ kind, text, start, end }] }
    : { status: 'unsupported' };
}

/** Classify the entire script atomically; unsupported syntax never yields partial results. */
export async function classifyStatements(
  source: string,
  dialect: SqlDialect
): Promise<StatementClassification> {
  try {
    if (dialect === 'sqlserver' || dialect === 'oracle') {
      return await classifySingleOtherDialect(source, dialect);
    }
    if (dialect !== 'mysql' && dialect !== 'postgresql') return { status: 'unsupported' };
    const { MySQL, PostgreSQL } = await import('dt-sql-parser');
    const errors: unknown[] = [];
    const onError = (error: unknown) => errors.push(error);
    if (dialect === 'mysql') {
      const parser = new MySQL();
      const lexer = parser.createLexer(source, onError);
      for (let token = lexer.nextToken(); token.type !== -1; token = lexer.nextToken()) {
        // MySQL version comments are executable, unlike ordinary comments.
        if (token.text?.startsWith('/*!')) return { status: 'unsupported' };
      }
      const tree = parser.parse(source, onError);
      const parts = tree.singleStatement();
      const entries: { context: ParserRuleContext; kind: StatementKind }[] = [];
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const statement = part.sqlStatement();
        if (!statement) continue;
        if (i < parts.length - 1 && !part.SEMI()) return { status: 'unsupported' };
        const kind = mysqlKind(statement);
        if (!kind) return { status: 'unsupported' };
        entries.push({ context: statement, kind });
      }
      return errors.length ? { status: 'unsupported' } : ranges(source, entries);
    }
    const tree = new PostgreSQL().parse(source, onError);
    const parts = tree.singleStmt();
    const entries: { context: ParserRuleContext; kind: StatementKind }[] = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i < parts.length - 1 && !part.SEMI()) return { status: 'unsupported' };
      const statement = part.stmt();
      const kind = statement && postgresKind(statement);
      if (!kind) return { status: 'unsupported' };
      entries.push({ context: statement, kind });
    }
    return errors.length || !matchingDollarQuotes(tree)
      ? { status: 'unsupported' }
      : ranges(source, entries);
  } catch (error) {
    if (error instanceof Error && error.name === 'SyntaxError') return { status: 'unsupported' };
    throw error;
  }
}
