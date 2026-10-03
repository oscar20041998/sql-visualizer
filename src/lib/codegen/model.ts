export type SqlDialect = 'mysql' | 'postgresql' | 'sqlserver' | 'oracle';

export type StatementKind =
  | 'create-table'
  | 'alter-table'
  | 'select'
  | 'insert'
  | 'update'
  | 'delete'
  | 'unknown';

export interface SourceSpan {
  start: number;
  end: number;
}

export interface GenerationDiagnostic {
  severity: 'warning' | 'error';
  code: string;
  message: string;
  sourceSpan: SourceSpan | null;
}

export interface ColumnDefinition {
  name: string;
  sqlType: { raw: string; normalized: string | null };
  nullable: boolean | 'unknown';
  length: number | null;
  precision: number | null;
  scale: number | null;
  defaultExpression: string | null;
  identity: boolean | 'unknown';
}

export type Constraint =
  | { kind: 'primary-key'; columns: string[]; name: string | null }
  | {
      kind: 'unique';
      columns: string[];
      name: string | null;
    }
  | {
      kind: 'foreign-key';
      columns: string[];
      referencedTable: string;
      referencedColumns: string[];
      name: string | null;
    }
  | { kind: 'check'; expression: string; name: string | null }
  | { kind: 'unknown'; raw: string; name: string | null };

export interface TableDefinition {
  schemaName: string | null;
  tableName: string;
  columns: ColumnDefinition[];
  constraints: Constraint[];
  sourceSpan: SourceSpan | null;
}

export type SelectExpressionKind = 'column' | 'aggregate' | 'computed' | 'wildcard' | 'unknown';

export interface SelectField {
  expression: string;
  alias: string | null;
  sourceColumns: string[];
  expressionKind: SelectExpressionKind;
  inferredSqlType: string | null;
}

export interface SelectShape {
  fields: SelectField[];
  sourceTables: string[];
  hasJoin: boolean;
  groupByExpressions: string[];
  orderByExpressions: string[];
  hasAggregation: boolean;
}

/**
 * Real statistics measured from the parsed AST (specs/016-ast-statistics).
 *
 * Produced only when the opt-in parse yields exactly one AST root for a grammar the pipeline
 * supports. Every count is measured from AST nodes and operator/function fields — never inferred
 * from SQL text — so a value here is always traceable to real parse output. Absence is expressed
 * by `null` at the call site, never by zeros (FR-001, FR-004).
 */
export interface AstStatistics {
  /** Number of typed AST node records; always equals the sum of `nodeCountsByType`. */
  totalNodeCount: number;
  /** Counts keyed by the lower-cased parser node `type`. */
  nodeCountsByType: Record<string, number>;
  /** Determined from the parsed statement, not from regex analysis. */
  statementKind: StatementKind;
  /** Every CTE declaration found in the AST. */
  cteCount: number;
  /** Maximum nested `WITH` scope. One top-level `WITH` is depth 1; sibling CTEs stay at the same
   *  depth, and a query without a CTE is 0. */
  cteNestingDepth: number;
  /** Maximum nested query-expression boundaries below their containing query. A CTE body root is
   *  not itself a subquery, but subqueries inside that body are counted. */
  subqueryDepth: number;
  /** Operator tokens from AST operator fields, keyed by the upper-cased token. */
  operatorCounts: Record<string, number>;
  /** Function calls from AST function nodes (aggregates and window functions included), keyed by
   *  the upper-cased function name. */
  functionCounts: Record<string, number>;
}

export interface ParsedSqlModel {
  dialect: SqlDialect;
  statementKind: StatementKind;
  tables: TableDefinition[];
  selectShape: SelectShape | null;
  sourceSql: string;
  parseStatus: 'parsed' | 'partial' | 'unsupported' | 'invalid';
  diagnostics: GenerationDiagnostic[];
  /**
   * Present only when the caller opted in with `{ statistics: true }` and a single AST root was
   * produced. `null` means "not computed or not available" — it never means zero.
   */
  astStatistics: AstStatistics | null;
}

export type ClassificationKind =
  | 'table-definition'
  | 'select-entity-like'
  | 'select-dto'
  | 'select-aggregation'
  | 'select-join'
  | 'insert'
  | 'update'
  | 'delete'
  | 'unknown';

export interface SqlClassification {
  kind: ClassificationKind;
  confidence: 'high' | 'limited' | 'insufficient';
  recommendedOutput: 'entity' | 'dto' | 'none';
  reasons: string[];
  requiresUserChoice: boolean;
}

export interface CodeGenerationOptions {
  language: 'java';
  framework: 'jpa-hibernate';
  outputType: 'auto' | 'entity' | 'dto';
  namingStrategy: 'camelCase' | 'pascalCase' | 'preserve';
  includeRelationships: boolean;
  useLombok: boolean;
  validationAnnotations: boolean;
  generateMyBatisMapper: boolean;
}

export interface GeneratedCodeFile {
  fileName: string;
  source: string;
}

export interface GeneratedCode {
  source: string;
  fileName: string;
  className: string | null;
  outputType: 'entity' | 'dto' | null;
  diagnostics: GenerationDiagnostic[];
  assumptions: string[];
  additionalFiles?: GeneratedCodeFile[];
}

export interface SqlParserAdapter {
  parse(sql: string, dialect: SqlDialect): ParsedSqlModel;
}

export interface CodeRenderer {
  render(
    model: ParsedSqlModel,
    classification: SqlClassification,
    options: CodeGenerationOptions
  ): GeneratedCode;
}
