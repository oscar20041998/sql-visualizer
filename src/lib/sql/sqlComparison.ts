import type { SqlDialect } from './sqlAnalyzer';
import { analyzeSql, stripSqlComments } from './sqlAnalyzer';
import { parseSql } from '../codegen/parseSql';
import { validateSqlDialect } from './dialectValidator';

export const BASELINE_SCHEMA_VERSION = 1;

export interface BaselineSnapshot {
  sql: string;
  capturedAt: string;
  schemaVersion: typeof BASELINE_SCHEMA_VERSION;
}

export interface ComparisonSnapshot {
  runId: string;
  beforeSql: string;
  afterSql: string;
  dialect: SqlDialect;
  startedAt: string;
}

export type ComparisonStatus = 'completed' | 'partial' | 'no_changes' | 'failed' | 'stale';

export type StructuralChangeKind =
  | 'projection'
  | 'source'
  | 'join'
  | 'filter'
  | 'grouping'
  | 'ordering'
  | 'distinct'
  | 'set-operation'
  | 'cte'
  | 'subquery'
  | 'aggregation'
  | 'window'
  | 'pagination'
  | 'write-scope'
  | 'formatting-only'
  | 'unknown';

export interface SqlEvidence {
  side: 'before' | 'after';
  text: string;
  startOffset?: number;
  endOffset?: number;
  line?: number;
  column?: number;
}

export interface StructuralChange {
  id: string;
  kind: StructuralChangeKind;
  summary: string;
  beforeValue: string | null;
  afterValue: string | null;
  beforeEvidence: SqlEvidence[];
  afterEvidence: SqlEvidence[];
  support: 'supported' | 'partial' | 'unavailable';
}

export type FindingSeverity = 'info' | 'warning' | 'high' | 'critical';

export interface ComparisonFinding {
  id: string;
  origin: 'deterministic' | 'ai';
  category: string;
  severity: FindingSeverity;
  title: string;
  description: string;
  evidence: SqlEvidence[];
  potentialImpact?: string;
  recommendation?: string;
  verificationStatus: 'not_verified' | 'recommended' | 'verified_by_static_rule';
}

export interface ComparisonAssessment {
  equivalence: 'equivalent' | 'not_equivalent' | 'inconclusive' | 'not_assessed';
  executionSafety: 'review_required' | 'risk_detected' | 'no_known_risk_detected' | 'not_assessed';
  performance: 'risk_detected' | 'no_change_detected' | 'not_verified' | 'not_assessed';
  staticAnalysis: 'completed' | 'partial' | 'failed' | 'not_run';
  resultComparison: 'not_performed';
  executionPlan: 'not_available';
  limitations: string[];
}

export type SqlComparisonAiVerdict = 'good' | 'not_good';

export interface SqlComparisonAiAssessment {
  verdict: SqlComparisonAiVerdict;
  changeExplanation: string;
  impactAfterChange: string;
  extraRiskToVerify: string;
  extraRecommendation: string;
  evidence: string[];
  assumptions: string[];
  verificationSteps: string[];
  limitations: string[];
  inputTruncated?: boolean;
}

export interface SqlComparisonAiStreamedFields {
  verdict?: SqlComparisonAiVerdict;
  changeExplanation?: string;
  impactAfterChange?: string;
  extraRiskToVerify?: string;
  extraRecommendation?: string;
  evidence?: string[];
  assumptions?: string[];
  verificationSteps?: string[];
  limitations?: string[];
}

export interface ComparisonResult {
  snapshot: ComparisonSnapshot;
  status: ComparisonStatus;
  changes: StructuralChange[];
  findings: ComparisonFinding[];
  assessment: ComparisonAssessment;
  limitations: string[];
  ai: {
    status:
      | 'pending'
      | 'completed'
      | 'partial'
      | 'unavailable'
      | 'malformed'
      | 'failed'
      | 'skipped';
    explanation: string | null;
    assessment: SqlComparisonAiAssessment | null;
    streaming?: SqlComparisonAiStreamedFields | null;
    retrying?: boolean;
    previousExplanation?: string | null;
  };
}

export function isBaselineSnapshot(value: unknown): value is BaselineSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<BaselineSnapshot>;
  return (
    typeof snapshot.sql === 'string' &&
    typeof snapshot.capturedAt === 'string' &&
    Number.isFinite(Date.parse(snapshot.capturedAt)) &&
    snapshot.schemaVersion === BASELINE_SCHEMA_VERSION
  );
}

interface ClauseSpan {
  kind: StructuralChangeKind;
  label: string;
  start: number;
  end: number;
  text: string;
}

const CLAUSE_STARTS: Array<{ pattern: RegExp; kind: StructuralChangeKind; label: string }> = [
  { pattern: /^SELECT\s+DISTINCT\b/i, kind: 'distinct', label: 'DISTINCT' },
  { pattern: /^SELECT\b/i, kind: 'projection', label: 'SELECT' },
  { pattern: /^FROM\b/i, kind: 'source', label: 'FROM' },
  { pattern: /^WHERE\b/i, kind: 'filter', label: 'WHERE' },
  { pattern: /^GROUP\s+BY\b/i, kind: 'grouping', label: 'GROUP BY' },
  { pattern: /^HAVING\b/i, kind: 'filter', label: 'HAVING' },
  { pattern: /^ORDER\s+BY\b/i, kind: 'ordering', label: 'ORDER BY' },
  { pattern: /^LIMIT\b/i, kind: 'pagination', label: 'LIMIT' },
  { pattern: /^OFFSET\b/i, kind: 'pagination', label: 'OFFSET' },
  { pattern: /^FETCH\s+FIRST\b/i, kind: 'pagination', label: 'FETCH FIRST' },
  { pattern: /^UNION\b/i, kind: 'set-operation', label: 'UNION' },
  { pattern: /^INTERSECT\b/i, kind: 'set-operation', label: 'INTERSECT' },
  { pattern: /^EXCEPT\b/i, kind: 'set-operation', label: 'EXCEPT' },
  { pattern: /^WITH\b/i, kind: 'cte', label: 'WITH' },
  { pattern: /^INSERT\b/i, kind: 'write-scope', label: 'INSERT' },
  { pattern: /^UPDATE\b/i, kind: 'write-scope', label: 'UPDATE' },
  { pattern: /^DELETE\b/i, kind: 'write-scope', label: 'DELETE' },
  { pattern: /^MERGE\b/i, kind: 'write-scope', label: 'MERGE' },
];

function clauseStartsAt(sql: string, index: number) {
  const tail = sql.slice(index);
  return CLAUSE_STARTS.find((clause) => clause.pattern.test(tail));
}

function findTopLevelClauses(sql: string, dialect: SqlDialect): ClauseSpan[] {
  const starts: Array<{ index: number; kind: StructuralChangeKind; label: string }> = [];
  let depth = 0;
  for (const token of tokenizeComparisonSql(sql, dialect)) {
    if (token.kind !== 'symbol' && token.kind !== 'word') continue;
    if (token.text === '(') {
      depth += 1;
      continue;
    }
    if (token.text === ')') {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth === 0 && token.kind === 'word') {
      const clause = clauseStartsAt(sql, token.start);
      if (clause) {
        starts.push({ index: token.start, kind: clause.kind, label: clause.label });
      }
    }
  }

  return starts.map((start, position) => {
    const end = starts[position + 1]?.index ?? sql.length;
    const text = sql.slice(start.index, end).trim().replace(/;\s*$/, '');
    return { ...start, start: start.index, end, text };
  });
}

interface ComparisonToken {
  text: string;
  kind: 'word' | 'quoted' | 'symbol' | 'comment';
  start: number;
  end: number;
}

function tokenizeComparisonSql(sql: string, dialect: SqlDialect): ComparisonToken[] {
  const tokens: ComparisonToken[] = [];
  const startsLineComment = (position: number) =>
    sql.startsWith('--', position) &&
    (dialect !== 'mysql' || position + 2 === sql.length || /\s/.test(sql[position + 2]));
  let index = 0;
  while (index < sql.length) {
    if (/\s/.test(sql[index])) {
      index += 1;
      continue;
    }
    const start = index;
    const tail = sql.slice(index);
    const dollar = dialect === 'postgresql' ? /^\$(?:[a-zA-Z_]\w*)?\$/.exec(tail)?.[0] : undefined;
    const oracleQuote = dialect === 'oracle' ? /^[qQ]'([^'\s])/.exec(tail) : null;
    let kind: ComparisonToken['kind'] = 'symbol';
    if (dollar) {
      const end = sql.indexOf(dollar, index + dollar.length);
      index = end < 0 ? sql.length : end + dollar.length;
      kind = 'quoted';
    } else if (oracleQuote) {
      const closing: Record<string, string> = { '[': ']', '(': ')', '{': '}', '<': '>' };
      const terminator = `${closing[oracleQuote[1]] ?? oracleQuote[1]}'`;
      const end = sql.indexOf(terminator, index + oracleQuote[0].length);
      index = end < 0 ? sql.length : end + terminator.length;
      kind = 'quoted';
    } else if (startsLineComment(index) || tail.startsWith('/*') || (dialect === 'mysql' && tail.startsWith('#'))) {
      const block = tail.startsWith('/*');
      const end = sql.indexOf(block ? '*/' : '\n', index + (block ? 2 : 1));
      index = end < 0 ? sql.length : end + (block ? 2 : 0);
      kind = 'comment';
    } else if (sql[index] === "'" || sql[index] === '"' || sql[index] === '`' || (dialect === 'sqlserver' && sql[index] === '[')) {
      const closing = sql[index] === '[' ? ']' : sql[index];
      index += 1;
      while (index < sql.length) {
        if (sql[index] === '\\' && (dialect === 'mysql' || dialect === 'postgresql')) {
          index += Math.min(2, sql.length - index);
        } else if (sql[index] === closing) {
          index += 1;
          if (sql[index] === closing) index += 1;
          else break;
        } else index += 1;
      }
      kind = 'quoted';
    } else if (/[\p{L}\p{N}_$]/u.test(sql[index])) {
      index += 1;
      while (index < sql.length && /[\p{L}\p{N}_$]/u.test(sql[index])) index += 1;
      kind = 'word';
    } else if (/[(),.;]/.test(sql[index])) {
      index += 1;
    } else {
      index += 1;
      while (
        index < sql.length &&
        /[+\-*\/%<>=!|&^~:]/.test(sql[index]) &&
        !startsLineComment(index) &&
        !sql.startsWith('/*', index)
      ) index += 1;
    }
    tokens.push({ text: sql.slice(start, index), kind, start, end: index });
  }
  return tokens;
}

function canonicalSql(sql: string, dialect: SqlDialect): string {
  const tokens = tokenizeComparisonSql(sql, dialect);
  return JSON.stringify(tokens.map((token, position) => {
    const previous = tokens[position - 1];
    const separated = previous && previous.end !== token.start;
    const adjacentLiterals = previous?.kind === 'quoted' && token.kind === 'quoted';
    const sensitiveGap = separated && (
      (previous.kind === 'word' && token.kind === 'quoted') ||
      (previous.kind === 'quoted' && token.kind === 'word') ||
      (dialect === 'mysql' && previous.kind === 'word' && token.text === '(') ||
      (previous.text === '.' && token.kind === 'word') ||
      (previous.kind === 'word' && token.text === '.')
    );
    return [separated && adjacentLiterals ? sql.slice(previous.end, token.start) : sensitiveGap ? 'gap' : '', token.text];
  }));
}

function canonicalClause(text: string, dialect: SqlDialect): string {
  return canonicalSql(text, dialect);
}

function evidenceFor(
  sql: string,
  span: ClauseSpan | undefined,
  side: SqlEvidence['side']
): SqlEvidence[] {
  if (!span || !span.text) return [];
  const startOffset = Math.max(0, sql.indexOf(span.text));
  const before = sql.slice(0, startOffset);
  return [
    {
      side,
      text: span.text,
      startOffset,
      endOffset: startOffset + span.text.length,
      line: before.split('\n').length,
      column: startOffset - before.lastIndexOf('\n'),
    },
  ];
}

function addChange(
  changes: StructuralChange[],
  kind: StructuralChangeKind,
  summary: string,
  beforeValue: string | null,
  afterValue: string | null,
  beforeSql: string,
  afterSql: string,
  beforeSpan?: ClauseSpan,
  afterSpan?: ClauseSpan,
  support: StructuralChange['support'] = 'supported'
): void {
  changes.push({
    id: `${kind}-${changes.length + 1}`,
    kind,
    summary,
    beforeValue,
    afterValue,
    beforeEvidence: evidenceFor(beforeSql, beforeSpan, 'before'),
    afterEvidence: evidenceFor(afterSql, afterSpan, 'after'),
    support,
  });
}

function spansByLabel(spans: ClauseSpan[]): Map<string, ClauseSpan> {
  return new Map(spans.map((span) => [span.label, span]));
}

function assessment(
  status: ComparisonAssessment['staticAnalysis'],
  limitations: string[]
): ComparisonAssessment {
  return {
    equivalence: 'inconclusive',
    executionSafety: 'review_required',
    performance: 'not_verified',
    staticAnalysis: status,
    resultComparison: 'not_performed',
    executionPlan: 'not_available',
    limitations,
  };
}

/**
 * Limitation sentence returned when either side of the snapshot has no statement to
 * compare. The analysis lib stays locale-unaware (its sentences also feed the AI
 * prompt context); the comparison panel maps this constant to the active locale.
 */
export const LIMITATION_EMPTY_STATEMENT =
  'Before and After SQL must both contain a statement to compare.';

export async function compareSqlSnapshots(snapshot: ComparisonSnapshot): Promise<ComparisonResult> {
  const limitations: string[] = [];
  const fallbackResult = (status: ComparisonStatus): ComparisonResult => ({
    snapshot,
    status,
    changes: [],
    findings: [],
    assessment: assessment(status === 'failed' ? 'failed' : 'partial', limitations),
    limitations,
    ai: { status: 'skipped', explanation: null, assessment: null },
  });

  if (!stripSqlComments(snapshot.beforeSql).trim() || !stripSqlComments(snapshot.afterSql).trim()) {
    limitations.push(LIMITATION_EMPTY_STATEMENT);
    return fallbackResult('partial');
  }
  if (snapshot.beforeSql === snapshot.afterSql) {
    return {
      snapshot,
      status: 'no_changes',
      changes: [],
      findings: [],
      assessment: assessment('completed', limitations),
      limitations,
      ai: { status: 'skipped', explanation: null, assessment: null },
    };
  }

  // AST support varies by dialect (Oracle has no node-sql-parser grammar); gaps remain partial.
  try {
    const [beforeAnalysis, afterAnalysis] = await Promise.all([
      analyzeSql(snapshot.beforeSql, snapshot.dialect),
      analyzeSql(snapshot.afterSql, snapshot.dialect),
    ]);
    const beforeCteNames = beforeAnalysis.ctes.map((cte) => cte.name.toLowerCase()).sort();
    const afterCteNames = afterAnalysis.ctes.map((cte) => cte.name.toLowerCase()).sort();
    const cteMatchingUncertain =
      (beforeCteNames.length > 0 || afterCteNames.length > 0) &&
      JSON.stringify(beforeCteNames) !== JSON.stringify(afterCteNames);
    if (cteMatchingUncertain) {
      limitations.push(
        'CTE identities could not be matched reliably; structural CTE comparison is partial.'
      );
    }
    const beforeAst = parseSql(snapshot.beforeSql, snapshot.dialect);
    const afterAst = parseSql(snapshot.afterSql, snapshot.dialect);
    const [beforeDialect, afterDialect] = await Promise.all([
      validateSqlDialect(snapshot.beforeSql, snapshot.dialect),
      validateSqlDialect(snapshot.afterSql, snapshot.dialect),
    ]);
    const beforeClauses = findTopLevelClauses(snapshot.beforeSql, snapshot.dialect);
    const afterClauses = findTopLevelClauses(snapshot.afterSql, snapshot.dialect);
    const beforeByLabel = spansByLabel(beforeClauses);
    const afterByLabel = spansByLabel(afterClauses);
    const repeatedClauses =
      beforeByLabel.size !== beforeClauses.length || afterByLabel.size !== afterClauses.length;
    if (repeatedClauses) {
      limitations.push('Repeated top-level clauses cannot be matched completely by the structural comparison.');
    }
    const changes: StructuralChange[] = [];

    for (const label of new Set([...beforeByLabel.keys(), ...afterByLabel.keys()])) {
      if (label === 'WITH' && cteMatchingUncertain) continue;
      const beforeSpan = beforeByLabel.get(label);
      const afterSpan = afterByLabel.get(label);
      const beforeValue = beforeSpan?.text ?? null;
      const afterValue = afterSpan?.text ?? null;
      if (canonicalClause(beforeValue ?? '', snapshot.dialect) === canonicalClause(afterValue ?? '', snapshot.dialect)) continue;
      const clause = [...beforeClauses, ...afterClauses].find((span) => span.label === label);
      if (!clause) continue;
      addChange(
        changes,
        clause.kind,
        `${label} clause changed.`,
        beforeValue,
        afterValue,
        snapshot.beforeSql,
        snapshot.afterSql,
        beforeSpan,
        afterSpan
      );
    }

    const beforeTables = [
      ...new Set(beforeAnalysis.tables.map((table) => table.name.toLowerCase())),
    ].sort();
    const afterTables = [
      ...new Set(afterAnalysis.tables.map((table) => table.name.toLowerCase())),
    ].sort();
    if (
      JSON.stringify(beforeTables) !== JSON.stringify(afterTables) &&
      !changes.some((change) => change.kind === 'source')
    ) {
      addChange(
        changes,
        'source',
        'Detected source tables changed.',
        beforeTables.join(', ') || null,
        afterTables.join(', ') || null,
        snapshot.beforeSql,
        snapshot.afterSql,
        beforeByLabel.get('FROM'),
        afterByLabel.get('FROM')
      );
    }

    const beforeJoins = [
      ...new Set(
        beforeAnalysis.joins.map((join) => `${join.joinType}:${join.source}:${join.target}`)
      ),
    ].sort();
    const afterJoins = [
      ...new Set(
        afterAnalysis.joins.map((join) => `${join.joinType}:${join.source}:${join.target}`)
      ),
    ].sort();
    if (JSON.stringify(beforeJoins) !== JSON.stringify(afterJoins)) {
      addChange(
        changes,
        'join',
        'Detected joins changed.',
        beforeJoins.join('; ') || null,
        afterJoins.join('; ') || null,
        snapshot.beforeSql,
        snapshot.afterSql,
        beforeByLabel.get('FROM'),
        afterByLabel.get('FROM')
      );
    }

    const beforeFields = beforeAst.selectShape?.fields.map((field) => field.expression) ?? [];
    const afterFields = afterAst.selectShape?.fields.map((field) => field.expression) ?? [];
    if (
      JSON.stringify(beforeFields) !== JSON.stringify(afterFields) &&
      !changes.some((change) => change.kind === 'projection')
    ) {
      addChange(
        changes,
        'projection',
        'Selected expressions changed.',
        beforeFields.join(', ') || null,
        afterFields.join(', ') || null,
        snapshot.beforeSql,
        snapshot.afterSql,
        beforeByLabel.get('SELECT'),
        afterByLabel.get('SELECT'),
        beforeAst.parseStatus === 'parsed' && afterAst.parseStatus === 'parsed'
          ? 'supported'
          : 'partial'
      );
    }

    const parserIncomplete = [beforeAst, afterAst].some(
      (parsed) => parsed.parseStatus !== 'parsed'
    );
    if (beforeAst.parseStatus === 'unsupported' || afterAst.parseStatus === 'unsupported') {
      limitations.push(
        `AST parsing is unsupported or incomplete for the ${snapshot.dialect} dialect or statement shape.`
      );
    } else if (parserIncomplete) {
      limitations.push(
        'One or both SQL statements could not be fully parsed into supported AST facts.'
      );
    }
    for (const [side, parsed] of [['Before', beforeAst], ['After', afterAst]] as const) {
      if (parsed.parseStatus === 'invalid') {
        const diagnostic = parsed.diagnostics.find((item) => item.code === 'invalid-sql');
        if (diagnostic) limitations.push(`${side} SQL: ${diagnostic.message}`);
      }
    }
    if (!beforeDialect.valid || !afterDialect.valid) {
      limitations.push('Dialect validation reported a mismatch or incomplete validation.');
    }

    const formattingOnly =
      changes.length === 0 &&
      canonicalSql(snapshot.beforeSql, snapshot.dialect) === canonicalSql(snapshot.afterSql, snapshot.dialect);
    if (formattingOnly) {
      addChange(
        changes,
        'formatting-only',
        'Only formatting or comments changed.',
        snapshot.beforeSql,
        snapshot.afterSql,
        snapshot.beforeSql,
        snapshot.afterSql,
        undefined,
        undefined
      );
    } else if (changes.length === 0) {
      addChange(
        changes,
        'unknown',
        'Text changed, but no supported structural difference was established.',
        null,
        null,
        snapshot.beforeSql,
        snapshot.afterSql,
        undefined,
        undefined,
        'unavailable'
      );
      limitations.push('The changed SQL did not map to a supported structural comparison.');
    }

    const partial =
      parserIncomplete || !beforeDialect.valid || !afterDialect.valid || cteMatchingUncertain ||
      repeatedClauses || changes.some((change) => change.kind === 'unknown');
    const findings: ComparisonFinding[] = changes
      .filter((change) => ['filter', 'join', 'write-scope', 'pagination'].includes(change.kind))
      .map((change, index) => ({
        id: `deterministic-${index + 1}`,
        origin: 'deterministic',
        category: change.kind,
        severity: change.kind === 'write-scope' ? 'high' : 'warning',
        title: change.summary,
        description:
          'Static analysis detected this change; its runtime effect has not been verified.',
        evidence: [...change.beforeEvidence, ...change.afterEvidence],
        recommendation:
          'Review the changed SQL and validate it against the intended data and constraints.',
        verificationStatus: 'recommended',
      }));

    return {
      snapshot,
      status: partial ? 'partial' : 'completed',
      changes,
      findings,
      assessment: assessment(partial ? 'partial' : 'completed', limitations),
      limitations,
      ai: { status: 'skipped', explanation: null, assessment: null },
    };
  } catch {
    limitations.push('SQL analysis could not complete for one or both statements.');
    return fallbackResult('failed');
  }
}
