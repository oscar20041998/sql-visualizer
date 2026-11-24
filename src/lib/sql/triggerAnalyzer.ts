import type { SqlDialect } from './sqlAnalyzer';
import type { DdlStatementContext } from 'dt-sql-parser/dist/lib/mysql/MySqlParser';
import { parseMySqlDefinition, sourceText } from './mysqlObjectParser';

export interface TriggerAnalysis {
  status: 'partial';
  kind: 'trigger';
  name: string;
  table: string;
  timing: 'BEFORE' | 'AFTER';
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  body: string;
}

export async function analyzeTrigger(
  sql: string,
  dialect: SqlDialect
): Promise<TriggerAnalysis | null> {
  if (dialect !== 'mysql') return null;
  const statement = await parseMySqlDefinition(sql);
  return statement ? triggerFromStatement(sql, statement) : null;
}

export function triggerFromStatement(
  sql: string,
  statement: DdlStatementContext
): TriggerAnalysis | null {
  const trigger = statement.createTrigger();
  if (!trigger) return null;
  const name = trigger._trigger_name?.getText();
  const table = trigger.tableName()?.getText();
  const timing = trigger.KW_BEFORE() ? 'BEFORE' : trigger.KW_AFTER() ? 'AFTER' : null;
  const event = trigger.KW_INSERT()
    ? 'INSERT'
    : trigger.KW_UPDATE()
      ? 'UPDATE'
      : trigger.KW_DELETE()
        ? 'DELETE'
        : null;
  const bodyContext = trigger.routineBody();
  const body = bodyContext && sourceText(sql, bodyContext);
  if (!name || !table || !timing || !event || !body) return null;
  return {
    status: 'partial',
    kind: 'trigger',
    name,
    table,
    timing,
    event,
    body,
  };
}
