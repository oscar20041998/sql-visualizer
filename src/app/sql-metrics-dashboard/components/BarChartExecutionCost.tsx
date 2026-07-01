'use client';

import React from 'react';
import { BarChart3, Clock } from 'lucide-react';
import { getT } from '@/lib/i18n';
import MetricsBarChart from './MetricsBarChart';
import type { SqlMetrics, ComplexityScore, ExecutionCostEstimate } from '@/lib/sqlAnalyzer';

interface BarChartExecutionCostProps {
  metrics: SqlMetrics;
  complexity: ComplexityScore;
  executionCost: ExecutionCostEstimate;
  t: ReturnType<typeof getT>;
}

function ImpactBadge({
  impact,
  t,
}: {
  impact: 'low' | 'medium' | 'high';
  t: ReturnType<typeof getT>;
}) {
  const cfg = {
    low: { label: t.impactLow, cls: 'bg-success/10 text-success border-success/20' },
    medium: { label: t.impactMedium, cls: 'bg-warning/10 text-warning border-warning/20' },
    high: { label: t.impactHigh, cls: 'bg-danger/10 text-danger border-danger/20' },
  };
  const { label, cls } = cfg[impact];
  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${cls}`}
      style={{ containment: 'layout' } as any}
    >
      {label}
    </span>
  );
}

export default function BarChartExecutionCost({
  metrics,
  complexity,
  executionCost,
  t,
}: BarChartExecutionCostProps) {
  const complexityColorMap = {
    LOW: 'var(--complexity-low)',
    MEDIUM: 'var(--complexity-medium)',
    HIGH: 'var(--complexity-high)',
    SUPER_HIGH: 'var(--complexity-super)',
  };

  const complexityBadgeMap = {
    LOW: 'complexity-badge-low',
    MEDIUM: 'complexity-badge-medium',
    HIGH: 'complexity-badge-high',
    SUPER_HIGH: 'complexity-badge-super',
  };

  const complexityColor = complexityColorMap[complexity.level];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Metrics Bar Chart */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 size={15} className="text-primary" />
          {t.sqlConstructDistribution}
        </h3>
        <MetricsBarChart metrics={metrics} t={t} />
      </div>

      {/* Execution Cost */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock size={15} className="text-primary" />
            {t.executionCost}
          </h3>
          <div
            className={`px-2 py-0.5 rounded text-xs font-semibold ${complexityBadgeMap[complexity.level]}`}
          >
            {executionCost.score}/100
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-4">{t.executionCostHint}</p>

        {/* Cost Progress Bar */}
        <div className="mb-4">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${executionCost.score}%`,
                background: `linear-gradient(90deg, var(--complexity-low), ${complexityColor})`,
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-mono">
            <span>{t.complexityLow}</span>
            <span>{t.complexityMedium}</span>
            <span>{t.complexityHigh}</span>
            <span>{t.complexitySuperHigh}</span>
          </div>
        </div>

        {/* Cost Factors */}
        <div className="space-y-2">
          {executionCost.factors.map((factor) => (
            <div
              key={`factor-${factor.name}`}
              className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0"
            >
              <div>
                <p className="text-xs font-medium text-foreground">{factor.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{factor.note}</p>
              </div>
              <ImpactBadge impact={factor.impact} t={t} />
            </div>
          ))}
        </div>

        {/* Recommendation */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs font-medium text-muted-foreground mb-1">{t.recommendation}</p>
          <p className="text-xs text-foreground leading-relaxed">{executionCost.recommendation}</p>
        </div>
      </div>
    </div>
  );
}
