import type { ParserRuleContext } from 'antlr4ng';
import type {
  DdlStatementContext,
  RoutineBodyContext,
  SqlStatementContext,
} from 'dt-sql-parser/dist/lib/mysql/MySqlParser';

export interface ExtractedQuery {
  text: string;
  start: { offset: number; line: number; column: number };
  end: { offset: number; line: number; column: number };
}

export function extractRoutineQueries(
  sql: string,
  body: RoutineBodyContext
): { queries: ExtractedQuery[]; incomplete: boolean } {
  const block = body.blockStatement();
  const direct = body.sqlStatement();
  const statements = block
    ? block.procedureSqlStatement().map((item) => item.sqlStatement())
    : [direct];
  const chars = Array.from(sql);
  const position = (offset: number) => {
    const before = sql.slice(0, offset);
    return { offset, line: before.split('\n').length, column: offset - before.lastIndexOf('\n') };
  };
  const queryFromStatement = (statement: SqlStatementContext | null): ExtractedQuery | null => {
    const select = statement?.dmlStatement()?.selectStatement();
    const start = select?.start?.start;
    const end = select?.stop?.stop;
    if (
      start === undefined ||
      end === undefined ||
      start < 0 ||
      end < start ||
      end >= chars.length
    ) {
      return null;
    }
    const startOffset = chars.slice(0, start).join('').length;
    const endOffset = chars.slice(0, end + 1).join('').length;
    return {
      text: sql.slice(startOffset, endOffset),
      start: position(startOffset),
      end: position(endOffset),
    };
  };
  const queries = statements.map(queryFromStatement);
  return {
    queries: queries.filter((query): query is ExtractedQuery => query !== null),
    incomplete:
      queries.some((query) => query === null) ||
      (!!block &&
        (block.declareVariable().length > 0 ||
          block.declareCondition().length > 0 ||
          block.declareCursor().length > 0 ||
          block.declareHandler().length > 0)),
  };
}

export async function parseMySqlDefinition(sql: string): Promise<DdlStatementContext | null> {
  const { MySQL } = await import('dt-sql-parser');
  const errors: unknown[] = [];
  const tree = new MySQL().parse(sql, (error) => errors.push(error));
  if (errors.length || tree.singleStatement().length !== 1) return null;
  return tree.singleStatement(0)?.sqlStatement()?.ddlStatement() ?? null;
}

export function sourceText(sql: string, context: ParserRuleContext): string | null {
  const start = context.start?.start;
  const end = context.stop?.stop;
  // ANTLR offsets count Unicode code points rather than UTF-16 code units.
  const chars = Array.from(sql);
  if (start === undefined || end === undefined || start < 0 || end < start || end >= chars.length) {
    return null;
  }
  return chars.slice(start, end + 1).join('');
}
