'use client';

import React from 'react';
import { GitBranch, AlertTriangle, ArrowUpDown, Layers, Zap, TrendingUp } from 'lucide-react';
import { getT } from '@/lib/i18n';
import type { JoinLogicComplexity } from '@/lib/sqlAnalyzer';

interface JoinLogicComplexityComponentProps {
  joinLogicComplexity: JoinLogicComplexity;
  t: ReturnType<typeof getT>;
}

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  subtitle,
  alert,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`bg-card border rounded-xl p-5 flex flex-col gap-3 hover:border-primary/30 ${
        alert ? 'border-danger/30 bg-danger/5' : 'border-border'
      }}`}
      style={{ containment: 'layout style paint' } as any}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15` }}
        >
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <div>
        <span
          className="text-3xl font-bold tabular-nums"
          style={{ color: alert ? 'var(--danger)' : color }}
        >
          {value}
        </span>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function JoinLogicComplexityComponent({
  joinLogicComplexity,
  t,
}: JoinLogicComplexityComponentProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <GitBranch size={15} className="text-primary" />
        {t.metricsJoinLogicComplexityTitle}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <MetricCard
          label={t.metricsJoinComplexityLevel}
          value={joinLogicComplexity.level}
          icon={AlertTriangle}
          color="var(--warning)"
          subtitle={`${t.complexityScore} ${joinLogicComplexity.score}`}
          alert={joinLogicComplexity.level === 'HIGH'}
        />
        <MetricCard
          label={t.metricsSimpleOn}
          value={joinLogicComplexity.simpleConditions}
          icon={ArrowUpDown}
          color="var(--success)"
          subtitle={t.metricsSingleColumnMatches}
        />
        <MetricCard
          label={t.metricsMultiColumnOn}
          value={joinLogicComplexity.multiColumnConditions}
          icon={Layers}
          color="var(--info)"
          subtitle={t.metricsAndOrJoinPredicates}
        />
        <MetricCard
          label={t.metricsFunctionBasedOn}
          value={joinLogicComplexity.functionBasedConditions}
          icon={Zap}
          color="var(--accent)"
          subtitle={t.metricsFunctionsInsideOn}
        />
        <MetricCard
          label={t.metricsNonEquiOn}
          value={joinLogicComplexity.nonEquiConditions}
          icon={TrendingUp}
          color="var(--danger)"
          subtitle={t.metricsNonEquiExamples}
          alert={joinLogicComplexity.nonEquiConditions > 0}
        />
      </div>
    </div>
  );
}
