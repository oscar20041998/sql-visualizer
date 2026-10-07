// Turns the local parser's output into a compact brief injected into the AI prompt.
//
// This is the cheap alternative to function calling: the facts a model would otherwise have to
// request (tables, aliases, join graph, CTE dependencies, subquery depth) are already computed
// by sqlAnalyzer, so we hand them over up front. One round-trip instead of several, and the
// model stops guessing at aliases — the most common source of wrong explanations.
import type { AnalysisResult } from '../sql/sqlAnalyzer';
import { estimateTokens } from './aiTokens';

/** Limit each section so one pathological SQL expression cannot consume the brief. */
const MAX_LISTED_ITEMS = 12;
const MAX_FACT_LENGTH = 240;

function truncateFact(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= MAX_FACT_LENGTH) return normalized;
  return `${normalized.slice(0, MAX_FACT_LENGTH - 3).trimEnd()}...`;
}

function appendSection(lines: string[], label: string, values: string[]): void {
  if (!values.length) return;
  lines.push(`${label}:`);
  for (const value of values.slice(0, MAX_LISTED_ITEMS)) {
    lines.push(`- ${truncateFact(value)}`);
  }

  const kept = values.slice(0, MAX_LISTED_ITEMS);
  const extra = values.length - kept.length;
  if (extra > 0) lines.push(`- ${extra} more ${label.toLowerCase()} omitted`);
}

function truncateList(values: string[]): string {
  const kept = values.slice(0, MAX_LISTED_ITEMS);
  const extra = values.length - kept.length;
  return extra > 0 ? `${kept.join(', ')} (+${extra} more)` : kept.join(', ');
}

/**
 * Formats the parsed structure as a short fact sheet. Returns an empty string when the parse
 * produced nothing useful, so callers can skip the section entirely rather than sending a
 * misleading "0 tables" brief.
 */
export function buildSqlContextBrief(
  analysis: AnalysisResult | null,
  options: { detailed?: boolean } = {}
): string {
  return options.detailed
    ? buildDetailedSqlContextBrief(analysis)
    : buildCompactSqlContextBrief(analysis);
}

function buildCompactSqlContextBrief(analysis: AnalysisResult | null): string {
  if (!analysis) return '';

  const lines: string[] = [];
  const realTables = analysis.tables.filter((table) => !table.isCTE && !table.isSubquery);
  if (realTables.length) {
    lines.push(
      `Tables: ${truncateList(
        realTables.map((table) =>
          table.alias ? `${table.name} (alias ${table.alias})` : table.name
        )
      )}`
    );
  }

  if (analysis.joins.length) {
    const nameById = new Map(analysis.tables.map((table) => [table.id, table.name]));
    lines.push(
      `Joins: ${truncateList(
        analysis.joins.map((join) => {
          const source = nameById.get(join.source) ?? join.source;
          const target = nameById.get(join.target) ?? join.target;
          const condition = join.condition ? ` ON ${join.condition}` : '';
          return `${source} ${join.joinType} ${target}${condition}`;
        })
      )}`
    );
  }

  if (analysis.ctes.length) {
    lines.push(
      `CTEs: ${truncateList(
        analysis.ctes.map((cte) => {
          const deps = cte.dependencies.length ? ` depends on ${cte.dependencies.join('/')}` : '';
          const unused = cte.isUnused ? ', never used in the main query' : '';
          const recursive = cte.isRecursive ? ', recursive' : '';
          return `${cte.name}${deps}${recursive}${unused}`;
        })
      )}`
    );
  }

  if (analysis.mainQueryFields.length) {
    lines.push(
      `Output columns: ${truncateList(
        analysis.mainQueryFields.map((field) => {
          const label = field.alias || field.field;
          return field.sourceTable ? `${label} from ${field.sourceTable}` : label;
        })
      )}`
    );
  }

  const { metrics } = analysis;
  const shape: string[] = [];
  if (metrics.where) shape.push(`${metrics.where} WHERE clause(s)`);
  if (metrics.conditionCount) shape.push(`${metrics.conditionCount} condition(s)`);
  if (metrics.groupBy) shape.push('grouping');
  if (metrics.having) shape.push('HAVING filter');
  if (metrics.orderBy) shape.push('explicit ordering');
  if (metrics.distinct) shape.push('DISTINCT');
  if (metrics.windowFunctions) shape.push(`${metrics.windowFunctions} window function(s)`);
  if (metrics.subqueryCount) {
    shape.push(`${metrics.subqueryCount} subquery(ies), max depth ${metrics.subqueryDepth}`);
  }
  if (shape.length) lines.push(`Query shape: ${shape.join(', ')}`);

  if (analysis.complexity?.level) {
    lines.push(`Complexity assessed locally as ${analysis.complexity.level}.`);
  }

  if (!lines.length) return '';
  return [
    'Verified facts extracted by the local SQL parser — trust these over your own reading of the text:',
    ...lines.map((line) => `- ${line}`),
  ].join('\n');
}

function buildDetailedSqlContextBrief(analysis: AnalysisResult | null): string {
  if (!analysis) return '';

  const lines = ['Verified facts extracted by the local SQL parser:'];

  const realTables = analysis.tables.filter((table) => !table.isCTE && !table.isSubquery);
  appendSection(
    lines,
    'Tables',
    realTables.map((table) => (table.alias ? `${table.name} (alias ${table.alias})` : table.name))
  );

  if (analysis.joins.length) {
    const nameById = new Map(analysis.tables.map((table) => [table.id, table.name]));
    appendSection(
      lines,
      'Relationships',
      analysis.joins.map((join) => {
        const source = nameById.get(join.source) ?? join.source;
        const target = nameById.get(join.target) ?? join.target;
        const condition = join.condition ? ` ON ${join.condition}` : '';
        return `${source} ${join.joinType} ${target}${condition}`;
      })
    );
  }

  if (analysis.ctes.length) {
    appendSection(
      lines,
      'CTEs',
      analysis.ctes.map((cte) => {
        const deps = cte.dependencies.length ? ` depends on ${cte.dependencies.join('/')}` : '';
        const unused = cte.isUnused ? ', never used in the main query' : '';
        const recursive = cte.isRecursive ? ', recursive' : '';
        return `${cte.name}${deps}${recursive}${unused}`;
      })
    );
  }

  appendSection(
    lines,
    'Output columns',
    analysis.mainQueryFields.map((field) => {
      const label = field.alias || field.field;
      return field.sourceTable ? `${label} from ${field.sourceTable}` : label;
    })
  );

  appendSection(
    lines,
    'Output expressions',
    analysis.structuralReport.finalSelectFields.map((field) =>
      field.alias ? `${field.expression} AS ${field.alias}` : field.expression
    )
  );

  for (const clause of ['WHERE', 'HAVING', 'CASE WHEN']) {
    const conditions = analysis.metricDetails.conditions
      .filter((condition) => condition.clause.toUpperCase() === clause)
      .map((condition) => `${clause}: ${condition.snippet}`);
    appendSection(lines, `${clause} conditions`, conditions);
  }

  appendSection(
    lines,
    'GROUP BY',
    analysis.metricDetails.groupBy.map((item) => item.snippet)
  );
  appendSection(
    lines,
    'ORDER BY',
    analysis.metricDetails.orderBy.map((item) => item.snippet)
  );

  const { metrics } = analysis;
  const shape: string[] = [];
  if (metrics.where) shape.push(`${metrics.where} WHERE clause(s)`);
  if (metrics.conditionCount) shape.push(`${metrics.conditionCount} condition(s)`);
  if (metrics.groupBy) shape.push('grouping');
  if (metrics.having) shape.push('HAVING filter');
  if (metrics.orderBy) shape.push('explicit ordering');
  if (metrics.distinct) shape.push('DISTINCT');
  if (metrics.windowFunctions) shape.push(`${metrics.windowFunctions} window function(s)`);
  if (metrics.subqueryCount) {
    shape.push(`${metrics.subqueryCount} subquery(ies), max depth ${metrics.subqueryDepth}`);
  }
  if (shape.length) appendSection(lines, 'Query shape', shape);

  if (analysis.complexity?.level) {
    appendSection(lines, 'Locally assessed complexity', [analysis.complexity.level]);
  }

  if (lines.length === 1) return '';

  return lines.join('\n');
}

/** Keeps a useful prefix of the parser brief when the full brief exceeds its budget. */
export function fitContextBrief(
  brief: string,
  budgetTokens: number,
  options: { truncate?: boolean } = {}
): string {
  if (!brief || budgetTokens <= 0) return '';
  if (estimateTokens(brief) <= budgetTokens || !options.truncate) {
    return estimateTokens(brief) <= budgetTokens ? brief : '';
  }

  const kept: string[] = [];
  for (const line of brief.split(/\r?\n/)) {
    const candidate = [...kept, line].join('\n');
    if (estimateTokens(candidate) > budgetTokens) break;
    kept.push(line);
  }

  const omittedNotice = '- Additional parser facts omitted to fit the context budget.';
  while (kept.length && estimateTokens([...kept, omittedNotice].join('\n')) > budgetTokens) {
    kept.pop();
  }
  if (estimateTokens(omittedNotice) <= budgetTokens) kept.push(omittedNotice);

  return kept.join('\n');
}
