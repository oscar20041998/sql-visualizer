import type { DdlStatementContext } from 'dt-sql-parser/dist/lib/mysql/MySqlParser';
import { sourceText } from './mysqlObjectParser';

export interface ProcedureAnalysis {
  status: 'partial';
  kind: 'procedure';
  name: string;
  parameters: string[];
  body: string;
}

export function procedureFromStatement(
  sql: string,
  statement: DdlStatementContext
): ProcedureAnalysis | null {
  const procedure = statement.createProcedure();
  if (!procedure) return null;
  const name = procedure.fullId()?.getText();
  const bodyContext = procedure.routineBody();
  const body = bodyContext && sourceText(sql, bodyContext);
  const parameters = procedure.procedureParameter().map((parameter) => sourceText(sql, parameter));
  if (!name || !body || parameters.some((parameter) => parameter === null)) return null;
  return {
    status: 'partial',
    kind: 'procedure',
    name,
    parameters: parameters.filter((parameter): parameter is string => parameter !== null),
    body,
  };
}
