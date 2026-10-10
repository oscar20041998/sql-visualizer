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

export interface SqlComparisonAiAssessment {
  summary: string;
  potentialCorrectnessImpact: string | null;
  executionSafetyConcerns: string | null;
  potentialPerformanceImpact: string | null;
  evidence: string[];
  assumptions: string[];
  verificationSteps: string[];
  limitations: string[];
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

function findTopLevelClauses(sql: string): ClauseSpan[] {
  const starts: Array<{ index: number; kind: StructuralChangeKind; label: string }> = [];
  let depth = 0;
  let index = 0;
  let quote: "'" | '"' | '`' | ']' | null = null;

  while (index < sql.length) {
    const char = sql[index];
    const next = sql[index + 1];
    if (quote) {
      if (quote === ']' && char === ']') quote = null;
      else if (char === quote) {
        if (quote !== "'" && next === quote) index += 1;
        else if (next !== quote || quote === "'") quote = null;
      }
      index += 1;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      index += 1;
      continue;
    }
    if (char === '[') {
      quote = ']';
      index += 1;
      continue;
    }
    if (char === '-' && next === '-') {
      index += 2;
      while (index < sql.length && sql[index] !== '\n') index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      index += 2;
      while (index < sql.length && !(sql[index] === '*' && sql[index + 1] === '/')) index += 1;
      index = Math.min(sql.length, index + 2);
      continue;
    }
    if (char === '(') {
      depth += 1;
      index += 1;
      continue;
    }
    if (char === ')') {
      depth = Math.max(0, depth - 1);
      index += 1;
      continue;
    }
    if (depth === 0 && /[A-Za-z_]/.test(char)) {
      const start = index;
      while (index < sql.length && /[A-Za-z_]/.test(sql[index])) index += 1;
      const clause = clauseStartsAt(sql, start);
      if (clause && (start === 0 || !/[\w]/.test(sql[start - 1]))) {
        starts.push({ index: start, kind: clause.kind, label: clause.label });
      }
      continue;
    }
    index += 1;
  }

  return starts.map((start, position) => {
    const end = starts[position + 1]?.index ?? sql.length;
    const text = sql.slice(start.index, end).trim().replace(/;\s*$/, '');
    return { ...start, start: start.index, end, text };
  });
}

function canonicalSql(sql: string): string {
  return stripSqlComments(sql)
    .replace(/\s+/g, ' ')
    .replace(/\s*([(),;=<>+*/-])\s*/g, '$1')
    .trim()
    .toLowerCase();
}

function canonicalClause(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s*([(),;=<>+*/-])\s*/g, '$1')
    .trim()
    .toLowerCase();
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
    const beforeClauses = findTopLevelClauses(snapshot.beforeSql);
    const afterClauses = findTopLevelClauses(snapshot.afterSql);
    const beforeByLabel = spansByLabel(beforeClauses);
    const afterByLabel = spansByLabel(afterClauses);
    const changes: StructuralChange[] = [];

    for (const label of new Set([...beforeByLabel.keys(), ...afterByLabel.keys()])) {
      if (label === 'WITH' && cteMatchingUncertain) continue;
      const beforeSpan = beforeByLabel.get(label);
      const afterSpan = afterByLabel.get(label);
      const beforeValue = beforeSpan?.text ?? null;
      const afterValue = afterSpan?.text ?? null;
      if (canonicalClause(beforeValue ?? '') === canonicalClause(afterValue ?? '')) continue;
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
    if (!beforeDialect.valid || !afterDialect.valid) {
      limitations.push('Dialect validation reported a mismatch or incomplete validation.');
    }

    const formattingOnly =
      changes.length === 0 && canonicalSql(snapshot.beforeSql) === canonicalSql(snapshot.afterSql);
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
      parserIncomplete || !beforeDialect.valid || !afterDialect.valid || cteMatchingUncertain;
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
