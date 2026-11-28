import { analyzeTable, nodeTableDetails, type TableAnalysis } from './tableAnalyzer';
import type { SqlDialect } from './sqlAnalyzer';

export interface TableScriptStatement {
  text: string;
  start: number;
  end: number;
  line: number;
}

export interface TableScriptResult {
  tables: { analysis: TableAnalysis; statement: TableScriptStatement }[];
  warnings: TableScriptStatement[];
}

type Ast = Record<string, unknown>;

function record(value: unknown): Ast | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Ast : null;
}

function identifier(value: unknown): string | null {
  if (typeof value === 'string') return value;
  const item = record(value);
  if (typeof item?.value === 'string') return item.value;
  return item?.expr ? identifier(item.expr) : null;
}

/** Split only at delimiters outside SQL strings, quoted identifiers and comments. */
export function splitTableScript(source: string, dialect: SqlDialect): TableScriptStatement[] {
  const statements: TableScriptStatement[] = [];
  let start = -1;
  let i = 0;
  let line = 1;
  let startLine = 1;
  let atLineStart = true;
  const finish = (end: number) => {
    if (start >= 0) {
      const text = source.slice(start, end).trimEnd();
      if (text) statements.push({ text, start, end: start + text.length, line: startLine });
      start = -1;
    }
  };
  while (i < source.length) {
    if (atLineStart && (dialect === 'sqlserver' || dialect === 'oracle')) {
      const separator = dialect === 'sqlserver'
        ? /^[ \t]*GO(?:[ \t]+(\d+))?[ \t]*(?:--[^\r\n]*)?(?=\r?\n|$)/i.exec(source.slice(i))
        : /^[ \t]*\/[ \t]*(?=\r?\n|$)/.exec(source.slice(i));
      if (separator) {
        finish(i);
        if (dialect === 'sqlserver' && separator[1]) {
          const text = separator[0].trim();
          const offset = separator[0].indexOf(text);
          statements.push({ text, start: i + offset, end: i + offset + text.length, line });
        }
        i += separator[0].length;
        atLineStart = false;
        continue;
      }
    }
    const c = source[i];
    if (c === '\n') { line++; i++; atLineStart = true; continue; }
    if (/\s/.test(c)) { i++; continue; }
    atLineStart = false;
    if (source.startsWith('--', i) && (dialect !== 'mysql' || /\s|$/.test(source[i + 2] ?? ''))) {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }
    if (dialect === 'mysql' && c === '#') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }
    if (source.startsWith('/*', i)) {
      const commentStart = i;
      const commentLine = line;
      if (source.startsWith('/*!', i) && start < 0) { start = i; startLine = line; }
      let depth = 1;
      i += 2;
      while (i < source.length && depth) {
        if (source.startsWith('/*', i)) { depth++; i += 2; }
        else if (source.startsWith('*/', i)) { depth--; i += 2; }
        else { if (source[i] === '\n') line++; i++; }
      }
      if (depth && start < 0) { start = commentStart; startLine = commentLine; }
      continue;
    }
    if (c === ';') { finish(i); i++; continue; }
    if (start < 0) { start = i; startLine = line; }
    const dollar = dialect === 'postgresql' && c === '$'
      ? /^\$(?:[a-z_][a-z0-9_]*)?\$/i.exec(source.slice(i))?.[0] : undefined;
    if (dollar) {
      const end = source.indexOf(dollar, i + dollar.length);
      const stop = end < 0 ? source.length : end + dollar.length;
      line += (source.slice(i, stop).match(/\n/g) ?? []).length;
      i = stop;
      continue;
    }
    if (dialect === 'oracle' && (c === 'q' || c === 'Q') && source[i + 1] === "'" && source[i + 2]) {
      const opening = source[i + 2];
      const close = ({ '[': ']', '{': '}', '(': ')', '<': '>' } as Record<string, string>)[opening] ?? opening;
      const end = source.indexOf(`${close}'`, i + 3);
      const stop = end < 0 ? source.length : end + 2;
      line += (source.slice(i, stop).match(/\n/g) ?? []).length;
      i = stop;
      continue;
    }
    if (c === "'" || c === '"' || (c === '`' && dialect === 'mysql') || (c === '[' && dialect === 'sqlserver')) {
      const close = c === '[' ? ']' : c;
      const escapes = dialect === 'mysql' || (
        dialect === 'postgresql' && c === "'" && /[eE]/.test(source[i - 1] ?? '') &&
        (i < 2 || !/[a-z0-9_$]/i.test(source[i - 2]))
      );
      i++;
      while (i < source.length) {
        if (source[i] === '\n') line++;
        if (source[i] === '\\' && escapes) { i += 2; continue; }
        if (source[i] === close) {
          if (source[i + 1] === close) { i += 2; continue; }
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    i++;
  }
  finish(source.length);
  return statements;
}

export function isTableScript(statements: TableScriptStatement[]): boolean {
  return statements.length > 1 &&
    /^(?:CREATE\s+(?:(?:TEMPORARY|TEMP|UNLOGGED)\s+)?TABLE|ALTER\s+TABLE|DROP\s+TABLE|CREATE\s+(?:(?:UNIQUE|FULLTEXT|SPATIAL|CLUSTERED|NONCLUSTERED)\s+)*INDEX)\b/i.test(statements[0].text) &&
    statements.some((statement) => /^CREATE\s+(?:(?:TEMPORARY|TEMP|UNLOGGED)\s+)?TABLE\b/i.test(statement.text)) &&
    !statements.some((statement) =>
      /^(?:SELECT|WITH|INSERT|UPDATE|DELETE|CREATE\s+(?:VIEW|TRIGGER|PROCEDURE|FUNCTION))\b/i.test(statement.text)
    );
}

function columns(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.length) return null;
  const result: string[] = [];
  for (const raw of value) {
    const item = record(raw);
    const name = item?.type === 'column_ref' ? identifier(item.column) : null;
    if (!name || item?.order_by || item?.opclass || item?.collate || item?.nulls) return null;
    result.push(name);
  }
  return result;
}

function target(value: unknown): { schema: string | null; name: string } | null {
  if (Array.isArray(value) && value.length !== 1) return null;
  const table = record(Array.isArray(value) ? value[0] : value);
  const name = identifier(table?.table);
  if (!name || (table?.db != null && !identifier(table.db))) return null;
  return { name, schema: identifier(table?.db) };
}

const SQL_IDENTIFIER = '(?:"(?:[^"]|"")*"|`(?:[^`]|``)*`|\\[(?:[^\\]]|\\]\\])*\\]|[a-z_][a-z0-9_$#]*)';
const QUALIFIED_NAME = `(${SQL_IDENTIFIER})(?:\\s*\\.\\s*(${SQL_IDENTIFIER}))?`;

function sourceIdentity(
  text: string,
  kind: 'table' | 'alter' | 'index',
  dialect: SqlDialect
): { schema: string | null; name: string; key: string } | null {
  const prefix = kind === 'table'
    ? '^CREATE\\s+(?:(?:TEMPORARY|TEMP|UNLOGGED)\\s+)?TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?'
    : kind === 'alter'
      ? '^ALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?(?:ONLY\\s+)?'
      : `^CREATE\\s+(?:(?:UNIQUE|FULLTEXT|SPATIAL|CLUSTERED|NONCLUSTERED)\\s+)*INDEX\\s+(?:CONCURRENTLY\\s+)?(?:IF\\s+NOT\\s+EXISTS\\s+)?${SQL_IDENTIFIER}\\s+ON\\s+`;
  const match = new RegExp(`${prefix}${QUALIFIED_NAME}(?=\\s|\\()`, 'i').exec(text);
  if (!match) return null;
  const decode = (raw: string): { value: string; normalized: string } | null => {
    const first = raw[0];
    const quoted = first === '"' || first === '`' || first === '[';
    if ((first === '`' && dialect !== 'mysql') ||
        (first === '[' && dialect !== 'sqlserver') ||
        (first === '"' && dialect === 'mysql')) return null;
    const quote = first === '[' ? ']' : first;
    const value = quoted ? raw.slice(1, -1).split(quote + quote).join(quote) : raw;
    const normalized = quoted ? value
      : dialect === 'postgresql' ? value.toLowerCase()
      : dialect === 'oracle' ? value.toUpperCase()
      : value;
    return { value, normalized };
  };
  const first = decode(match[1]);
  const second = match[2] ? decode(match[2]) : null;
  if (!first || (match[2] && !second)) return null;
  const schema = second ? first : null;
  const name = second ?? first;
  return {
    schema: schema?.value ?? null,
    name: name.value,
    key: JSON.stringify([schema?.normalized ?? null, name.normalized]),
  };
}

export async function analyzeTableScript(
  statements: TableScriptStatement[],
  dialect: SqlDialect
): Promise<TableScriptResult> {
  const { Parser } = await import('node-sql-parser');
  const parser = new Parser();
  const database = dialect === 'sqlserver' ? 'TransactSQL' : dialect;
  const tables: TableScriptResult['tables'] = [];
  const warnings: TableScriptStatement[] = [];
  const identities = new Map<TableScriptStatement, string>();

  for (const statement of statements) {
    if (!/^CREATE\s+(?:(?:TEMPORARY|TEMP|UNLOGGED)\s+)?TABLE\b/i.test(statement.text)) continue;
    if (/\/\*!/.test(statement.text)) { warnings.push(statement); continue; }
    const analysis = await analyzeTable(statement.text, dialect);
    const identity = sourceIdentity(statement.text, 'table', dialect);
    if (analysis && identity && analysis.name === identity.name && analysis.schema === identity.schema) {
      if ([...identities.values()].includes(identity.key) ||
          /^CREATE\s+(?:(?:TEMPORARY|TEMP|UNLOGGED)\s+)?TABLE\s+IF\s+NOT\s+EXISTS\b/i.test(statement.text)) {
        warnings.push(statement);
      }
      identities.set(statement, identity.key);
      tables.push({ analysis, statement });
    }
    else warnings.push(statement);
  }
  for (const statement of statements) {
    if (/^CREATE\s+(?:(?:TEMPORARY|TEMP|UNLOGGED)\s+)?TABLE\b/i.test(statement.text)) continue;
    if (/\/\*!/.test(statement.text)) { warnings.push(statement); continue; }

    if (dialect === 'oracle') {
      const addColumn = /^ALTER\s+TABLE\s+([a-z][\w$#]*)(?:\.([a-z][\w$#]*))?\s+ADD\s+([\s\S]+)$/i.exec(statement.text);
      if (addColumn && !/^(?:CONSTRAINT|PRIMARY|UNIQUE|FOREIGN)\b/i.test(addColumn[3].trim())) {
        const identity = sourceIdentity(statement.text, 'alter', dialect);
        const matches = identity ? tables.filter((entry) => identities.get(entry.statement) === identity.key) : [];
        const body = addColumn[3].trim();
        const wrapped = body.startsWith('(') && body.endsWith(')') ? body.slice(1, -1) : body;
        const extra = await analyzeTable(`CREATE TABLE temp_for_analysis (${wrapped})`, dialect);
        if (matches.length !== 1 || matches[0].statement.start > statement.start ||
            !matches[0].analysis.details || !extra || extra.columns.length !== 1 || !extra.details ||
            matches[0].analysis.columns.some((column) => column.name === extra.columns[0].name)) {
          warnings.push(statement); continue;
        }
        matches[0].analysis.columns.push(...extra.columns);
        matches[0].analysis.details!.columns.push(...extra.details.columns);
        matches[0].analysis.details!.constraints.push(...extra.details.constraints);
        continue;
      }
    }

    let ast: Ast | null = null;
    const commonId = dialect === 'sqlserver'
      ? '(?:\\[(?:[^\\]]|\\]\\])*\\]|"(?:[^"]|"")*"|[a-z_][\\w$#]*)'
      : '[a-z][\\w$#]*';
    const commonName = `${commonId}(?:\\s*\\.\\s*${commonId})?`;
    const commonColumns = `${commonId}(?:\\s*,\\s*${commonId})*`;
    const actions = dialect === 'oracle'
      ? '(?:\\s+ON\\s+DELETE\\s+(?:CASCADE|SET\\s+NULL))?'
      : '(?:\\s+ON\\s+(?:DELETE|UPDATE)\\s+(?:NO\\s+ACTION|CASCADE|SET\\s+NULL|SET\\s+DEFAULT))*';
    const commonConstraint = new RegExp(
      `^ALTER\\s+TABLE\\s+${commonName}\\s+ADD\\s+(?:CONSTRAINT\\s+${commonId}\\s+)?(?:PRIMARY\\s+KEY|UNIQUE|FOREIGN\\s+KEY)\\s*\\(\\s*${commonColumns}\\s*\\)(?:\\s+REFERENCES\\s+${commonName}\\s*\\(\\s*${commonColumns}\\s*\\)${actions})?$`, 'i'
    ).test(statement.text);
    try {
      const parseDialect = (dialect === 'oracle' || (dialect === 'sqlserver' && commonConstraint))
        ? 'Postgresql' : database;
      const parseText = dialect === 'sqlserver' && commonConstraint
        ? statement.text.replace(/\[((?:[^\]]|\]\])*)\]/g, (_match, name: string) =>
            `"${name.replace(/\]\]/g, ']').replace(/"/g, '""')}"`)
        : statement.text;
      const parsed: unknown = parser.astify(parseText, { database: parseDialect });
      ast = record(Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : parsed);
    } catch (error) {
      if (!(error instanceof Error && error.name === 'SyntaxError')) throw error;
    }
    if (!ast) { warnings.push(statement); continue; }
    const isIndex = ast.type === 'create' && ast.keyword === 'index';
    const isAlter = ast.type === 'alter' && (ast.keyword === 'table' || dialect === 'mysql');
    if (!isIndex && !isAlter) { warnings.push(statement); continue; }
    // Oracle uses the PostgreSQL parser only for verified common index and constraint syntax.
    if (dialect === 'oracle' && !(isAlter && commonConstraint) && !(isIndex && /^CREATE\s+(?:UNIQUE\s+)?INDEX\s+[a-z][\w$#]*\s+ON\s+[a-z][\w$#]*(?:\.[a-z][\w$#]*)?\s*\(\s*[a-z][\w$#]*(?:\s*,\s*[a-z][\w$#]*)*\s*\)$/i.test(statement.text))) {
      warnings.push(statement); continue;
    }
    const identity = target(ast.table);
    const sourceName = sourceIdentity(statement.text, isIndex ? 'index' : 'alter', dialect);
    const matches = identity && sourceName && identity.name === sourceName.name && identity.schema === sourceName.schema &&
      tables.filter((entry) => identities.get(entry.statement) === sourceName.key);
    if (!matches || matches.length !== 1 || matches[0].statement.start > statement.start || !matches[0].analysis.details || ast.if_exists) {
      warnings.push(statement); continue;
    }
    const table = matches[0].analysis;
    const details = table.details!;
    if (isIndex) {
      const indexColumns = columns(ast.index_columns);
      const name = identifier(ast.index);
      const indexOptions = Array.isArray(ast.index_options) ? ast.index_options : [];
      const usingOptions = indexOptions.map(record);
      const using = record(ast.index_using) ?? (usingOptions.length === 1 ? usingOptions[0] : null);
      if (!name || !indexColumns || ast.where || ast.include || ast.if_not_exists ||
          ast.with || ast.tablespace || ast.algorithm_option || ast.lock_option || ast.filestream_on ||
          (indexOptions.length > 0 && (usingOptions.length !== 1 || usingOptions[0]?.keyword !== 'using')) ||
          (ast.index_type != null && typeof ast.index_type !== 'string') ||
          (using && (using.keyword !== 'using' || typeof using.type !== 'string'))) {
        warnings.push(statement); continue;
      }
      details.indexes.push({
        name,
        type: `${typeof ast.index_type === 'string' ? `${ast.index_type.toUpperCase()} ` : ''}INDEX${using ? ` USING ${String(using.type).toUpperCase()}` : ''}`,
        columns: indexColumns,
      });
      continue;
    }
    if (!Array.isArray(ast.expr) || !ast.expr.length) { warnings.push(statement); continue; }
    let unsupported = false;
    for (const action of ast.expr) {
      const item = record(action);
      if (!item || item.action !== 'add' || item.if_not_exists) { unsupported = true; continue; }
      const definition = record(item.create_definitions) ?? item;
      if (definition.resource === 'column') {
        const match = ast.expr.length === 1 && /^ALTER\s+TABLE\s+(?:[a-z_][\w$#]*|`[^`]+`|\[[^\]]+\]|"[^"]+")(?:\.(?:[a-z_][\w$#]*|`[^`]+`|\[[^\]]+\]|"[^"]+"))?\s+ADD\s+(?:COLUMN\s+)?([\s\S]+)$/i.exec(statement.text);
        const extra = match ? await analyzeTable(`CREATE TABLE temp_for_analysis (${match[1]})`, dialect) : null;
        if (!extra || extra.columns.length !== 1 || !extra.details ||
            table.columns.some((column) => column.name === extra.columns[0].name)) {
          unsupported = true; continue;
        }
        table.columns.push(...extra.columns);
        details.columns.push(...extra.details.columns);
        details.constraints.push(...extra.details.constraints);
        details.indexes.push(...extra.details.indexes);
        continue;
      }
      if (definition.resource !== 'constraint' && definition.resource !== 'index') {
        unsupported = true; continue;
      }
      const names = columns(definition.definition);
      if (!names) { unsupported = true; continue; }
      if (definition.constraint_type === 'FOREIGN KEY' || definition.constraint_type === 'foreign key') {
        const reference = record(definition.reference_definition);
        const referenced = columns(reference?.definition);
        const actions = reference?.on_action;
        if (!referenced || referenced.length !== names.length ||
            (Array.isArray(actions) && actions.some((action) => {
              const item = record(action);
              const value = record(item?.value);
              return typeof item?.type !== 'string' || typeof value?.value !== 'string';
            }))) {
          unsupported = true; continue;
        }
      }
      const extracted = nodeTableDetails({ create_definitions: [definition] },
        (expression) => parser.exprToSQL(expression, { database }));
      if (!extracted.constraints.length && !extracted.indexes.length) { unsupported = true; continue; }
      if (extracted.constraints.some((constraint) => constraint.type === 'FOREIGN KEY' && !constraint.reference)) {
        unsupported = true; continue;
      }
      details.constraints.push(...extracted.constraints);
      details.indexes.push(...extracted.indexes);
    }
    if (unsupported) warnings.push(statement);
  }
  return { tables, warnings: warnings.sort((a, b) => a.start - b.start) };
}
