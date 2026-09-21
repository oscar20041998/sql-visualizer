/**
 * Pure adapter: AnalysisResult → SqlAnalysisDashboardData
 * (specs/010-sql-intelligence-dashboard — contracts/dashboard-data.md).
 *
 * Deterministic and side-effect-free: the same AnalysisResult always yields the
 * same dashboard data. No localStorage, no parsing, no network (U18 / FR-026).
 */

import type { AnalysisResult } from '../sqlAnalyzer';
import type { LintingIssue } from '../complexityScorer';
import { resolveCapabilities, type DashboardSection } from './capability';
import type {
  ComplexityContributor,
  DashboardContext,
  DashboardFinding,
  FindingAction,
  SqlAnalysisDashboardData,
} from './types';

/** Rules that currently have a dedicated optimization function in the product.
 *  None today (US2 scenario 3): add a rule here only when a real optimization
 *  action exists for it — never to make the button look complete. */
const OPTIMIZABLE_RULES: ReadonlySet<string> = new Set<string>();

const DETAIL_TAB_ORDER: DashboardSection[] = [
  'join',
  'cte',
  'predicates',
  'select',
  'functions',
  'dependencies',
];

const CORE_STRUCTURE_METRICS = [
  'tableCount',
  'joinCount',
  'totalJoinCount',
  'cteCount',
  'subqueryCount',
  'subqueryDepth',
  'conditionCount',
  'where',
  'having',
  'selectFields',
  'finalSelectFieldCount',
  'lineCount',
];

const ADVANCED_STRUCTURE_METRICS = [
  'windowFunctions',
  'groupBy',
  'orderBy',
  'distinct',
  'operationAndFunctionCount',
];

interface FindingGroup {
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  suggestion: string;
  occurrences: number;
  locations: string[];
}

function groupFindings(issues: LintingIssue[]): FindingGroup[] {
  const groups = new Map<string, FindingGroup>();
  for (const issue of issues) {
    const existing = groups.get(issue.rule);
    if (existing) {
      existing.occurrences += 1;
      if (issue.location) existing.locations.push(issue.location);
    } else {
      groups.set(issue.rule, {
        rule: issue.rule,
        severity: issue.severity,
        message: issue.message,
        suggestion: issue.suggestion,
        occurrences: 1,
        locations: issue.location ? [issue.location] : [],
      });
    }
  }

  const grouped = [...groups.values()];
  // Errors before warnings, then most occurrences first; Array.sort is stable,
  // so first-seen order breaks ties (U14).
  grouped.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'error' ? -1 : 1;
    return b.occurrences - a.occurrences;
  });
  return grouped;
}

function buildContributors(analysis: AnalysisResult): ComplexityContributor[] {
  const detailed = analysis.detailedComplexity;
  if (!detailed || detailed.totalScore <= 0) return [];

  const breakdown = detailed.scoreBreakdown;
  const parts: { construct: string; points: number }[] = [
    ...breakdown.keywords.map((keyword) => ({
      construct: keyword.category,
      points: keyword.subtotal,
    })),
    { construct: 'SELECT fields', points: breakdown.selectFields.complexityScore },
    { construct: 'CTEs', points: breakdown.ctes.totalScore },
    { construct: 'Subqueries', points: breakdown.subqueries.totalScore },
    { construct: 'Window functions', points: breakdown.windowFunctions.totalScore },
  ];

  return parts
    .filter((part) => part.points > 0)
    .sort((a, b) => b.points - a.points)
    .map((part) => ({ ...part, shareOfTotal: part.points / detailed.totalScore }));
}

export function buildDashboardData(
  analysis: AnalysisResult,
  context: DashboardContext
): SqlAnalysisDashboardData {
  const detailed = analysis.detailedComplexity;

  const capabilities = resolveCapabilities('query');
  if (!detailed) {
    capabilities.complexity = 'partial';
    capabilities.findings = 'partial';
  }

  const lintingIssues: LintingIssue[] = detailed ? [...detailed.lintingIssues] : [];
  if (context.inputMode === 'mybatis' && context.mybatisFindings) {
    lintingIssues.push(...context.mybatisFindings);
  }

  const findingGroups = groupFindings(lintingIssues);
  const findings: DashboardFinding[] = findingGroups.map((group) => {
    const actions: FindingAction[] = [];
    if (group.locations.length > 0) actions.push('viewSql');
    if (context.aiAvailable) actions.push('explainAi');
    if (OPTIMIZABLE_RULES.has(group.rule)) actions.push('optimize');
    return {
      rule: group.rule,
      severity: group.severity,
      title: group.rule,
      whyItMatters: group.message,
      suggestion: group.suggestion,
      occurrences: group.occurrences,
      locations: group.locations,
      actions,
    };
  });

  const findingCounts = {
    error: findings.filter((finding) => finding.severity === 'error').length,
    warning: findings.filter((finding) => finding.severity === 'warning').length,
  };

  const detailTabs = DETAIL_TAB_ORDER.filter(
    (section) => capabilities[section] !== 'unsupported'
  ).map((section) => ({ section, capability: capabilities[section] }));

  // Direct dependencies: real tables/views the statement reads plus the CTE
  // bodies' direct references. Transitive counts, depth and cycles are not
  // computed by the analyzer — the capability stays 'partial' (FR-015).
  const directDependencies =
    analysis.tables.filter((table) => table.sourceType === 'TABLE' || table.sourceType === 'VIEW')
      .length + analysis.ctes.reduce((count, cte) => count + cte.dependencies.length, 0);

  return {
    objectType: 'query',
    dialect: analysis.dialect,
    health: {
      complexity: detailed
        ? {
            normalizedScore: detailed.normalizedScore,
            level: detailed.normalizedLevel,
            rawScore: detailed.totalScore,
          }
        : { normalizedScore: null, level: null, rawScore: null },
      findingCounts,
    },
    findings,
    contributors: buildContributors(analysis),
    structure: {
      core: [{ key: 'core-structure', metricKeys: CORE_STRUCTURE_METRICS }],
      advanced: [{ key: 'advanced-structure', metricKeys: ADVANCED_STRUCTURE_METRICS }],
    },
    detailTabs,
    dependencies: { direct: directDependencies, capability: capabilities.dependencies },
    capabilities,
    advanced: {
      rawScore: detailed ? detailed.totalScore : null,
      maxScorePossible: detailed ? detailed.maxScorePossible : null,
      percentageOfMax: detailed ? detailed.percentageOfMax : null,
      ruleIds: [...new Set(lintingIssues.map((issue) => issue.rule))],
    },
  };
}
