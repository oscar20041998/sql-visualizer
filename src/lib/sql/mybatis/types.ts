/**
 * Model, result and finding types for the MyBatis conversion (data-model E1–E10).
 *
 * Types only — no behaviour lives here. Every module in `src/lib/sql/mybatis/`
 * builds on these shapes, and `renderer.ts` consumes a `DynamicNode` tree to
 * produce the pure SQL the analyzer receives (FR-042: structural conversion).
 */
import type { SqlDialect } from '../sqlAnalyzer';

// ---------------------------------------------------------------------------
// E9 — Conversion findings
// ---------------------------------------------------------------------------

export type FindingSeverity = 'error' | 'warning' | 'info';

export type FindingKind =
  | 'MALFORMED_XML'
  | 'INPUT_TOO_LARGE'
  | 'NESTING_TOO_DEEP'
  | 'EXPANSION_LIMIT'
  | 'NO_STATEMENT'
  | 'MISSING_FRAGMENT'
  | 'FRAGMENT_CYCLE'
  | 'FRAGMENT_DEPTH'
  | 'DUPLICATE_FRAGMENT'
  | 'UNRESOLVED_CONDITION'
  | 'UNRESOLVED_COLLECTION'
  | 'EMPTY_COLLECTION'
  | 'UNRESOLVED_BIND'
  | 'UNSUPPLIED_VALUE'
  | 'UNSUPPLIED_SUBSTITUTION'
  | 'SELECT_KEY_SKIPPED';

/** Findings that block the statement: no SQL is produced at all (FR-040). */
export const BLOCKING_FINDINGS: ReadonlySet<FindingKind> = new Set([
  'MALFORMED_XML',
  'INPUT_TOO_LARGE',
  'NESTING_TOO_DEEP',
  'NO_STATEMENT',
  'MISSING_FRAGMENT',
  'FRAGMENT_CYCLE',
  'FRAGMENT_DEPTH',
  'EXPANSION_LIMIT',
]);

export interface SourcePosition {
  /** 1-based line in the mapper source, when known. */
  line?: number;
  /** The construct or statement the finding concerns. */
  construct?: string;
  /** The statement key the finding belongs to; absent for file-level findings. */
  statementKey?: string;
}

export interface ConversionFinding {
  kind: FindingKind;
  severity: FindingSeverity;
  /** Localisation key suffix under `myBatisFinding`; the library produces no copy (R15). */
  messageKey: string;
  /** Values the message interpolates. */
  messageValues?: Record<string, string>;
  position?: SourcePosition;
}

// ---------------------------------------------------------------------------
// E4 — Dynamic node tree
// ---------------------------------------------------------------------------

export interface TextNode {
  kind: 'text';
  /** Literal SQL text (CDATA content included verbatim). */
  text: string;
  line?: number;
}

export interface IfNode {
  kind: 'if';
  test: string;
  children: DynamicNode[];
  line?: number;
}

export interface ChooseBranch {
  test: string;
  children: DynamicNode[];
}

export interface ChooseNode {
  kind: 'choose';
  branches: ChooseBranch[];
  /** `<otherwise>` children, when the mapper declares a fallback. */
  fallback?: DynamicNode[];
  line?: number;
}

export interface WhereNode {
  kind: 'where';
  children: DynamicNode[];
  line?: number;
}

export interface SetNode {
  kind: 'set';
  children: DynamicNode[];
  line?: number;
}

export interface TrimNode {
  kind: 'trim';
  prefix?: string;
  prefixOverrides?: string;
  suffix?: string;
  suffixOverrides?: string;
  children: DynamicNode[];
  line?: number;
}

export interface ForeachNode {
  kind: 'foreach';
  collection: string;
  item?: string;
  index?: string;
  open?: string;
  close?: string;
  separator?: string;
  children: DynamicNode[];
  line?: number;
}

export interface BindNode {
  kind: 'bind';
  name: string;
  expression: string;
  line?: number;
}

export interface IncludeNode {
  kind: 'include';
  refid: string;
  properties: Record<string, string>;
  line?: number;
}

export type DynamicNode =
  | TextNode
  | IfNode
  | ChooseNode
  | WhereNode
  | SetNode
  | TrimNode
  | ForeachNode
  | BindNode
  | IncludeNode;

// ---------------------------------------------------------------------------
// E2 / E3 — Statements and reusable fragments
// ---------------------------------------------------------------------------

export type StatementType = 'select' | 'insert' | 'update' | 'delete';

export interface MappedStatement {
  /** namespace + '#' + id + '#' + occurrence index: stable across re-parses. */
  key: string;
  id: string;
  namespace: string;
  type: StatementType;
  /** 1-based index among statements sharing the same namespace + id. */
  occurrenceIndex: number;
  /** Statement body, includes already expanded (T037). */
  children: DynamicNode[];
  /** Mapper metadata the element declared, retained for display (FR-009). */
  metadata: Record<string, string>;
  /** Separate key-generation statement declared inside this one (FR-004). */
  hasKeyGeneration: boolean;
  hasDynamic: boolean;
  line?: number;
}

export interface SqlFragment {
  id: string;
  namespace: string;
  children: DynamicNode[];
  line?: number;
}

// ---------------------------------------------------------------------------
// E6 — Parameter references
// ---------------------------------------------------------------------------

export type ReferenceForm = 'prepared' | 'raw';

export type ReferenceStatus = 'resolved' | 'unsupplied';

export interface ParameterReference {
  /** Property name or nested path the mapper wrote inside the braces. */
  path: string;
  form: ReferenceForm;
  /** Extra `key=value` options a prepared reference may carry (R8). */
  options?: Record<string, string>;
  status: ReferenceStatus;
  /** The text that stood in for it, so findings can name what the SQL shows. */
  rendered: string;
}

/** One piece of statement text after every reference in it has been rendered. */
export interface ReferenceScanResult {
  references: ParameterReference[];
  findings: ConversionFinding[];
  /** The text with every reference replaced by its rendered form. */
  rendered: string;
}

// ---------------------------------------------------------------------------
// E7 — The developer's values
// ---------------------------------------------------------------------------

/** Values keyed by the names the mapper uses; one text value per parameter (R6). */
export type ParameterSet = Record<string, string>;

// ---------------------------------------------------------------------------
// E8 — Resolution result
// ---------------------------------------------------------------------------

export type ResolutionState = 'analysable' | 'blocked';

export interface ResolutionResult {
  statementKey: string;
  statementType: StatementType;
  /** Pure SQL, or empty when the statement is blocked. */
  sql: string;
  parameters: ParameterReference[];
  findings: ConversionFinding[];
  state: ResolutionState;
  /** The finding that caused a blocked state, when `state` is `blocked`. */
  blockReason?: ConversionFinding;
}

// ---------------------------------------------------------------------------
// E1 — The parsed mapper
// ---------------------------------------------------------------------------

export interface MapperFile {
  namespace: string;
  statements: MappedStatement[];
  /** Fragment table keyed by `<sql id>`; duplicates reported, first wins (E1). */
  fragments: Record<string, SqlFragment>;
  /** Fragment ids declared more than once, for the duplicate warning. */
  duplicateFragmentIds: string[];
  findings: ConversionFinding[];
  /** Whether any T001 ceiling was reached while reading the input. */
  boundsReached: string[];
}

// ---------------------------------------------------------------------------
// Statement picker option (contracts/query-input-mybatis-ui.md)
// ---------------------------------------------------------------------------

export interface StatementOption {
  key: string;
  id: string;
  type: StatementType;
  /** Pre-built display label: the type and identifier, plus occurrence when repeated. */
  label: string;
  occurrenceIndex: number;
}

// ---------------------------------------------------------------------------
// Dialect profile (R3) — the one place literal rendering can diverge per dialect
// ---------------------------------------------------------------------------

export interface DialectProfile {
  /** Wrap a value as a SQL literal the dialect accepts. */
  renderLiteral(value: string): string;
}

/**
 * Today every dialect resolves to the same profile because the parameter editor
 * carries untyped text (research R3): a single-quoted string with embedded quotes
 * doubled. A dialect that needs booleans or typed dates changes its entry here —
 * and nowhere else.
 */
function defaultProfile(): DialectProfile {
  return {
    renderLiteral(value: string): string {
      return `'${value.replace(/'/g, "''")}'`;
    },
  };
}

export const DIALECT_PROFILES: Record<SqlDialect, DialectProfile> = {
  mysql: defaultProfile(),
  postgresql: defaultProfile(),
  sqlserver: defaultProfile(),
  oracle: defaultProfile(),
};

