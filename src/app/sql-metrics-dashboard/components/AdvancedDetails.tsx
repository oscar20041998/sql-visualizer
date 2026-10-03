'use client';

import React from 'react';
import { getT } from '@/lib/i18n';
import type { SqlAnalysisDashboardData } from '@/lib/sql/dashboard/types';

interface AdvancedDetailsProps {
  data: SqlAnalysisDashboardData;
  t: ReturnType<typeof getT>;
}

/**
 * Advanced details (specs/010-sql-intelligence-dashboard FR-027, clarification Q2).
 *
 * Everything rendered here is produced by the analyzer today: the raw score, the legacy dynamic
 * denominator and its share, the rule identifiers, and an honest description of the regex engine
 * that produced those numbers (dialect, vocabulary size, and the extraction caps the run was
 * subject to).
 *
 * AST statistics, when present, are measured from a real parsed AST upstream of this component
 * (specs/016-ast-statistics). They are rendered as a separate block only when they exist: an
 * unavailable AST produces no numeric rows at all, so a gap is never displayed as a zero.
 */
export default function AdvancedDetails({ data, t }: AdvancedDetailsProps) {
  const { advanced } = data;
  const { parser } = advanced;
  const ast = advanced.astStatistics;

  const scoreEntries: Array<[string, string]> = [
    [t.analysisAdvancedRawScore, advanced.rawScore === null ? '—' : String(advanced.rawScore)],
    [
      t.analysisAdvancedDenominator,
      advanced.maxScorePossible === null ? '—' : String(advanced.maxScorePossible),
    ],
    [
      t.analysisAdvancedPercentage,
      advanced.percentageOfMax === null ? '—' : `${Math.round(advanced.percentageOfMax)}%`,
    ],
    [t.analysisAdvancedRuleIds, advanced.ruleIds.length > 0 ? advanced.ruleIds.join(', ') : '—'],
  ];

  const parserEntries: Array<[string, string]> = [
    [t.analysisAdvancedEngine, parser.engine],
    [t.analysisAdvancedDialect, parser.dialect],
    [t.analysisAdvancedKeywords, String(parser.keywordCount)],
    [t.analysisAdvancedPatterns, String(parser.patternCount)],
    [t.analysisAdvancedMaxColumns, String(parser.limits.maxColumns)],
    [t.analysisAdvancedMaxCteRefs, String(parser.limits.maxCteFieldReferences)],
  ];

  /** Renders a count map as stable `token ×N` rows: busiest first, ties broken alphabetically. */
  const countEntries = (counts: Record<string, number>): Array<[string, string]> =>
    Object.entries(counts)
      .sort(([leftKey, leftCount], [rightKey, rightCount]) =>
        leftCount !== rightCount ? rightCount - leftCount : leftKey.localeCompare(rightKey)
      )
      .map(([name, count]) => [name, String(count)]);

  const astEntries: Array<[string, string]> = ast
    ? [
        [t.analysisAdvancedAstNodes, String(ast.totalNodeCount)],
        [t.analysisAdvancedAstStatementKind, ast.statementKind],
        [t.analysisAdvancedAstCteCount, String(ast.cteCount)],
        [t.analysisAdvancedAstCteDepth, String(ast.cteNestingDepth)],
        [t.analysisAdvancedAstSubqueryDepth, String(ast.subqueryDepth)],
      ]
    : [];

  // Renders one count map as a labelled row of `token ×N` chips. An empty map is omitted rather than
  // shown as an empty heading: the scalar rows above already carry the genuine zeros that matter
  // (CTE count and depth), and a heading with nothing under it reads as a rendering fault.
  const astGroup = (label: string, counts: Record<string, number>) =>
    Object.keys(counts).length === 0 ? null : (
      <div className="min-w-0">
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-foreground">
          {countEntries(counts).map(([name, count]) => (
            <span key={name}>
              {name}
              <span className="text-muted-foreground"> ×</span>
              {count}
            </span>
          ))}
        </dd>
      </div>
    );

  return (
    <details className="rounded-xl border border-border bg-card/50 p-4">
      <summary className="cursor-pointer text-sm font-medium text-foreground">
        {t.analysisAdvancedTitle}
      </summary>

      <p className="mt-3 text-xs font-medium text-muted-foreground">{t.analysisAdvancedScoring}</p>
      <dl className="mt-2 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
        {scoreEntries.map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 font-mono text-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-xs font-medium text-muted-foreground">
        {t.analysisAdvancedParserMeta}
      </p>
      <dl className="mt-2 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
        {parserEntries.map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 font-mono text-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      {ast ? (
        <>
          <p className="mt-4 text-xs font-medium text-muted-foreground">{t.analysisAdvancedAst}</p>
          <dl className="mt-2 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
            {astEntries.map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 font-mono text-foreground">{value}</dd>
              </div>
            ))}
            {astGroup(t.analysisAdvancedAstNodeTypes, ast.nodeCountsByType)}
            {astGroup(t.analysisAdvancedAstOperators, ast.operatorCounts)}
            {astGroup(t.analysisAdvancedAstFunctions, ast.functionCounts)}
          </dl>
        </>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">{t.analysisAdvancedAstUnavailable}</p>
      )}
    </details>
  );
}
