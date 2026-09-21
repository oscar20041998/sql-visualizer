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
 * First cut: exposes the raw score, the legacy dynamic denominator and its share, and
 * the rule identifiers behind a native disclosure. AST statistics and parser metadata
 * are not produced by the analyzer today and are stated as not yet available — never
 * rendered as fabricated values. The section carries a partial capability.
 */
export default function AdvancedDetails({ data, t }: AdvancedDetailsProps) {
  const { advanced } = data;

  const entries: Array<[string, string]> = [
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

  return (
    <details className="rounded-xl border border-border bg-card/50 p-4">
      <summary className="cursor-pointer text-sm font-medium text-foreground">
        {t.analysisAdvancedTitle}
      </summary>
      <dl className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
        {entries.map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 font-mono text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">{t.analysisAdvancedUnavailable}</p>
    </details>
  );
}
