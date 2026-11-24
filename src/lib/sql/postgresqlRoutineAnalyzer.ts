import type { FunctionAnalysis } from './functionAnalyzer';
import type { ProcedureAnalysis } from './storeprocedureAnalyzer';
import { sourceText } from './mysqlObjectParser';

export async function analyzePostgresqlRoutine(
  sql: string
): Promise<FunctionAnalysis | ProcedureAnalysis | null> {
  const { PostgreSQL } = await import('dt-sql-parser');
  const errors: unknown[] = [];
  const tree = new PostgreSQL().parse(sql, (error) => errors.push(error));
  if (errors.length || tree.singleStmt().length !== 1) return null;
  const routine = tree.singleStmt(0)?.stmt()?.createFunctionStmt();
  if (!routine) return null;

  const nameContext = routine.KW_FUNCTION()
    ? routine.functionNameCreate()
    : routine.procedureNameCreate();
  const name = nameContext && sourceText(sql, nameContext);
  const parameters = routine.funcArgWithDefault().map((parameter) => sourceText(sql, parameter));
  const options = routine.createFuncOptItem();
  const bodies = options.filter((option) => option.KW_AS());
  const languages = options.filter((option) => option.KW_LANGUAGE());
  if (bodies.length !== 1 || languages.length !== 1 || bodies[0].notifyPayload()) return null;
  const columns = bodies[0].colId();
  const identifier = columns.length === 1 ? columns[0].identifier() : null;
  const literal = bodies[0].stringConst() ?? identifier?.stringConst();
  const string = literal?.anysconst().length === 1
    ? literal.anysconst(0)
    : identifier?.anysconst();
  const begin = string?.BeginDollarStringConstant()?.getText();
  const end = string?.EndDollarStringConstant()?.getText();
  const languageContext = languages[0].nonReservedWordOrStringConst();
  const language = languageContext && sourceText(sql, languageContext);
  const body = string && sourceText(sql, string);
  if (
    !name ||
    !body ||
    !begin ||
    begin !== end ||
    !language ||
    !/^(sql|plpgsql)$/i.test(language) ||
    parameters.some((parameter) => parameter === null)
  ) {
    return null;
  }
  const provenParameters = parameters.filter((parameter): parameter is string => parameter !== null);
  if (routine.KW_FUNCTION()) {
    const type = routine.funcType();
    const returnType = type && sourceText(sql, type);
    if (!returnType) return null;
    return { status: 'partial', kind: 'function', name, parameters: provenParameters, returnType, body };
  }
  if (routine.KW_PROCEDURE()) {
    return { status: 'partial', kind: 'procedure', name, parameters: provenParameters, body };
  }
  return null;
}
