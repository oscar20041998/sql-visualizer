'use client';

import React from 'react';
import {
  TrendingUp,
  Layers,
  Hash,
  ArrowUpDown,
  Filter,
  GitBranch,
  Clock,
  BarChart3,
  Zap,
} from 'lucide-react';
import { getT } from '@/lib/i18n';
import type { SqlMetrics } from '@/lib/sqlAnalyzer';

interface MetricCardsGridProps {
  metrics: SqlMetrics;
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
      className={`bg-card border rounded-lg p-4 flex flex-col gap-2 hover:border-primary/30 transition-colors ${
        alert ? 'border-danger/30 bg-danger/5' : 'border-border'
      }}`}
      style={{ containment: 'layout style paint' } as any}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <div
          className="w-7 h-7 rounded flex items-center justify-center"
          style={{ background: `${color}15` }}
        >
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <div>
        <span
          className="text-2xl font-bold tabular-nums"
          style={{ color: alert ? 'var(--danger)' : color }}
        >
          {value}
        </span>
        {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function MetricCardsGrid({ metrics, t }: MetricCardsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      <MetricCard
        label={t.windowFunctions}
        value={metrics.windowFunctions}
        icon={TrendingUp}
        color="var(--accent)"
        subtitle={t.metricsSubtitleWindowClauses}
        alert={metrics.windowFunctions > 3}
      />
      <MetricCard
        label={t.groupBy}
        value={metrics.groupBy}
        icon={Filter}
        color="var(--info)"
        subtitle={t.metricsSubtitleAggregationClauses}
      />
      <MetricCard
        label={t.orderBy}
        value={metrics.orderBy}
        icon={ArrowUpDown}
        color="var(--join-inner)"
        subtitle={t.metricsSubtitleSortOperations}
      />
      <MetricCard
        label={t.distinct}
        value={metrics.distinct}
        icon={Hash}
        color="var(--join-right)"
        subtitle={t.metricsSubtitleDeduplicationOps}
      />
      <MetricCard
        label={t.subqueryDepth}
        value={metrics.subqueryDepth}
        icon={Layers}
        color="var(--warning)"
        subtitle={t.metricsSubtitleNestingLevels}
        alert={metrics.subqueryDepth > 3}
      />
      <MetricCard
        label={t.metricsSubqueryCount}
        value={metrics.subqueryCount}
        icon={Layers}
        color="var(--warning)"
        subtitle={t.metricsSubtitleNestedSelects}
        alert={metrics.subqueryCount > 3}
      />
      <MetricCard
        label={t.joinCount}
        value={metrics.joinCount}
        icon={GitBranch}
        color="var(--join-left)"
        subtitle={t.metricsSubtitleJoinOperations}
        alert={metrics.joinCount > 5}
      />
      <MetricCard
        label={t.metricsConditionCount}
        value={metrics.conditionCount}
        icon={Filter}
        color="var(--info)"
        subtitle={t.metricsSubtitleConditionFormula}
        alert={metrics.conditionCount > 8}
      />
      <MetricCard
        label={t.metricsOpsFunctions}
        value={metrics.operationAndFunctionCount}
        icon={Zap}
        color="var(--accent)"
        subtitle={t.metricsSubtitleOpsFunctions}
        alert={metrics.operationAndFunctionCount > 12}
      />
      <MetricCard
        label={t.metricsLinesOfSql}
        value={metrics.lineCount}
        icon={Hash}
        color="var(--primary)"
        subtitle={t.metricsSubtitleRawInputLines}
      />
      <MetricCard
        label={t.metricsFinalSelectFields}
        value={metrics.finalSelectFieldCount}
        icon={BarChart3}
        color="var(--join-inner)"
        subtitle={t.metricsSubtitleFinalOutputProjection}
      />
    </div>
  );
}
