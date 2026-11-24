export type SplitResult =
  | { status: 'parsed'; definitions: { text: string; start: number; end: number }[] }
  | { status: 'unsupported' };

export async function splitDefinitions(source: string, dialect: SqlDialect): Promise<SplitResult> {
  if (dialect === 'mysql') return splitMySqlDefinitions(source);
  if (dialect === 'postgresql') {
    const { PostgreSQL } = await import('dt-sql-parser');
    const errors: unknown[] = [];
    const tree = new PostgreSQL().parse(source, (error) => errors.push(error));
    if (errors.length || tree.singleStmt().length === 0) return { status: 'unsupported' };
    return definitionRanges(
      source,
      tree.singleStmt().map((statement) => statement.stmt())
    );
  }
  return { status: 'unsupported' };
}

export async function splitMySqlDefinitions(source: string): Promise<SplitResult> {
  const { MySQL } = await import('dt-sql-parser');
  const errors: unknown[] = [];
  const tree = new MySQL().parse(source, (error) => errors.push(error));
  if (errors.length || tree.singleStatement().length === 0) return { status: 'unsupported' };

  return definitionRanges(
    source,
    tree.singleStatement().map((statement) => statement.sqlStatement()?.ddlStatement() ?? null)
  );
}

function definitionRanges(source: string, contexts: (ParserRuleContext | null)[]): SplitResult {
  const chars = Array.from(source);
  const offsets = [0];
  for (const char of chars) offsets.push(offsets[offsets.length - 1] + char.length);
  const definitions: { text: string; start: number; end: number }[] = [];
  for (const context of contexts) {
    const start = context?.start?.start;
    const end = context?.stop?.stop;
    if (
      start === undefined ||
      end === undefined ||
      start < 0 ||
      end < start ||
      end >= chars.length
    ) {
      return { status: 'unsupported' };
    }
    const startOffset = offsets[start];
    const endOffset = offsets[end + 1];
    definitions.push({
      text: source.slice(startOffset, endOffset),
      start: startOffset,
      end: endOffset,
    });
  }
  return { status: 'parsed', definitions };
}

import type { ParserRuleContext } from 'antlr4ng';
import type { SqlDialect } from './sqlAnalyzer';
