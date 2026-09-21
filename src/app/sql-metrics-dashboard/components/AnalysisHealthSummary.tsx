'use client';

import React from 'react';
import { getT } from '@/lib/i18n';
import type { ComplexityLevel } from '@/lib/sql/complexityScorer';
import type { SqlAnalysisDashboardData } from '@/lib/sql/dashboard/types';

interface AnalysisHealthSummaryProps {
  data: SqlAnalysisDashboardData;
  t: ReturnType<typeof getT>;
}

/**
 * Health summary (specs/010-sql-intelligence-dashboard FR-002, FR-023).
 * Shows exactly one authoritative normalized score (X / 100 + level) and finding
 * counts by the analyzer's real severities — raw scores never appear here; they
 * live behind the Advanced details disclosure (FR-001). Severity is always
 * communicated with a text label as well as colour.
 */
export default function AnalysisHealthSummary({ data, t }: AnalysisHealthSummaryProps) {
  const { complexity, findingCounts } = data.health;

  const levelLabels: Record<ComplexityLevel, string> = {
    LOW: t.complexityLow,
    MEDIUM: t.complexityMedium,
    HIGH: t.complexityHigh,
    SUPER_HIGH: t.complexitySuperHigh,
  };

  const levelBadgeClass: Record<ComplexityLevel, string> = {
    LOW: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    SUPER_HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };

  return (
    <section
      aria-labelledby="analysis-health-title"
      className="rounded-xl border border-border bg-card p-5"
    >
      <h2
        id="analysis-health-title"
        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {t.analysisHealthTitle}
      </h2>

      <div className="mt-4 flex flex-wrap items-center gap-10">
        <div>
          <p className="text-xs text-muted-foreground">{t.analysisHealthScoreLabel}</p>
          {complexity.normalizedScore === null || complexity.level === null ? (
            <p className="mt-1 text-sm text-muted-foreground">{t.analysisHealthUnavailable}</p>
          ) : (
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-semibold text-foreground tabular-nums">
                {complexity.normalizedScore}
              </span>
              <span className="text-sm text-muted-foreground">/ 100</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${levelBadgeClass[complexity.level]}`}
              >
                {levelLabels[complexity.level]}
              </span>
            </p>
          )}
        </div>

        <div>
          <p className="text-xs text-muted-foreground">{t.analysisHealthFindings}</p>
          <div className="mt-1 flex items-center gap-4 text-sm font-medium">
            <span className="text-danger">
              {t.analysisFindingErrors}: {findingCounts.error}
            </span>
            <span className="text-amber-600 dark:text-amber-400">
              {t.analysisFindingWarnings}: {findingCounts.warning}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
