import type { DdlStatementContext } from 'dt-sql-parser/dist/lib/mysql/MySqlParser';
import { sourceText } from './mysqlObjectParser';

export interface FunctionAnalysis {
  status: 'partial';
  kind: 'function';
  name: string;
  parameters: string[];
  returnType: string;
  body: string;
}

export function functionFromStatement(
  sql: string,
  statement: DdlStatementContext
): FunctionAnalysis | null {
  const fn = statement.createFunction();
  if (!fn) return null;
  const name = sourceText(sql, fn.functionNameCreate());
  const returnType = sourceText(sql, fn.dataType());
  const bodyContext = fn.routineBody() ?? fn.returnStatement();
  const body = bodyContext && sourceText(sql, bodyContext);
  const parameters = fn.functionParameter().map((parameter) => sourceText(sql, parameter));
  if (!name || !returnType || !body || parameters.some((parameter) => parameter === null)) {
    return null;
  }
  return {
    status: 'partial',
    kind: 'function',
    name,
    parameters: parameters.filter((parameter): parameter is string => parameter !== null),
    returnType,
    body,
  };
}
