'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Layers,
  Hash,
  ArrowUpDown,
  Filter,
  GitBranch,
  BarChart3,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { getT } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import type { SqlMetrics, MetricDetailsReport, MetricDetailItem } from '@/lib/sql/sqlAnalyzer';
import MetricDetailDrawer from './MetricDetailDrawer';

interface MetricCardsGridProps {
  metrics: SqlMetrics;
  metricDetails: MetricDetailsReport;
  t: ReturnType<typeof getT>;
}

type DetailMetricKey = Exclude<keyof MetricDetailsReport, 'subqueries'>;

function MetricCard({
  label,
  value,
  icon: Icon,
  accentColor,
  subtitle,
  alert,
  onClick,
  tooltip,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  accentColor: string;
  subtitle?: string;
  alert?: boolean;
  onClick?: () => void;
  tooltip?: string;
}) {
  const interactive = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      title={tooltip}
      aria-label={tooltip}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`group relative min-w-0 bg-card border rounded-card p-4 flex flex-col gap-3 shadow-sm motion-safe:transition-[transform,box-shadow,border-color] motion-safe:duration-200 ${
        alert ? 'border-danger/30 bg-danger/5' : 'border-border'
      } ${interactive ? 'cursor-pointer hover:border-primary/50 hover:shadow-lg motion-safe:hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring' : ''}`}
      style={
        {
          containment: 'layout style paint',
          '--card-accent': accentColor,
          backgroundImage:
            'linear-gradient(135deg, color-mix(in srgb, var(--card-accent) 15%, transparent), transparent 70%)',
        } as React.CSSProperties
      }
    >
      {interactive && (
        <ChevronRight
          size={13}
          className="absolute bottom-4 right-4 text-muted-foreground group-hover:text-primary"
        />
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted">
          <Icon size={14} style={{ color: accentColor }} />
        </div>
      </div>
      <div className="min-w-0 pr-4">
        <span className="text-2xl font-semibold text-foreground tabular-nums">
          {value}
        </span>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function MetricCardsGrid({ metrics, metricDetails, t }: MetricCardsGridProps) {
  const router = useRouter();
  const beginNavigation = useAppStore((state) => state.beginNavigation);
  const [activeMetric, setActiveMetric] = useState<DetailMetricKey | null>(null);

  const detailModalConfig: Record<
    DetailMetricKey,
    {
      title: string;
      icon: React.ElementType;
      accentColor: string;
      items: MetricDetailItem[];
      footerNote?: string;
    }
  > = {
    windowFunctions: {
      title: t.windowFunctions,
      icon: TrendingUp,
      accentColor: 'var(--accent)',
      items: metricDetails.windowFunctions,
    },
    groupBy: {
      title: t.groupBy,
      icon: Filter,
      accentColor: 'var(--info)',
      items: metricDetails.groupBy,
    },
    orderBy: {
      title: t.orderBy,
      icon: ArrowUpDown,
      accentColor: 'var(--join-inner)',
      items: metricDetails.orderBy,
    },
    distinct: {
      title: t.distinct,
      icon: Hash,
      accentColor: 'var(--join-right)',
      items: metricDetails.distinct,
    },
    conditions: {
      title: t.metricsConditionCount,
      icon: Filter,
      accentColor: 'var(--info)',
      items: metricDetails.conditions,
    },
    opsAndFunctions: {
      title: t.metricsOpsFunctions,
      icon: Zap,
      accentColor: 'var(--accent)',
      items: metricDetails.opsAndFunctions,
      footerNote:
        metrics.operationAndFunctionCount - metricDetails.opsAndFunctions.length > 0
          ? t.metricsDetailOpsFooterNote.replace(
              '{count}',
              String(metrics.operationAndFunctionCount - metricDetails.opsAndFunctions.length)
            )
          : undefined,
    },
  };

  const activeConfig = activeMetric ? detailModalConfig[activeMetric] : null;

  const scrollToFieldExtractionSummary = () => {
    document.getElementById('metrics-field-table')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <MetricCard
          label={t.windowFunctions}
          value={metrics.windowFunctions}
          icon={TrendingUp}
          accentColor="var(--accent)"
          subtitle={t.metricsSubtitleWindowClauses}
          alert={metrics.windowFunctions > 3}
          onClick={() => setActiveMetric('windowFunctions')}
          tooltip={t.metricsCardDetailsHint}
        />
        <MetricCard
          label={t.groupBy}
          value={metrics.groupBy}
          icon={Filter}
          accentColor="var(--info)"
          subtitle={t.metricsSubtitleAggregationClauses}
          onClick={() => setActiveMetric('groupBy')}
          tooltip={t.metricsCardDetailsHint}
        />
        <MetricCard
          label={t.orderBy}
          value={metrics.orderBy}
          icon={ArrowUpDown}
          accentColor="var(--join-inner)"
          subtitle={t.metricsSubtitleSortOperations}
          onClick={() => setActiveMetric('orderBy')}
          tooltip={t.metricsCardDetailsHint}
        />
        <MetricCard
          label={t.distinct}
          value={metrics.distinct}
          icon={Hash}
          accentColor="var(--join-right)"
          subtitle={t.metricsSubtitleDeduplicationOps}
          onClick={() => setActiveMetric('distinct')}
          tooltip={t.metricsCardDetailsHint}
        />
        <MetricCard
          label={t.subqueryDepth}
          value={metrics.subqueryDepth}
          icon={Layers}
          accentColor="var(--warning)"
          subtitle={t.metricsSubtitleNestingLevels}
          alert={metrics.subqueryDepth > 3}
        />
        <MetricCard
          label={t.metricsSubqueryCount}
          value={metrics.subqueryCount}
          icon={Layers}
          accentColor="var(--warning)"
          subtitle={t.metricsSubtitleNestedSelects}
          alert={metrics.subqueryCount > 3}
        />
        <MetricCard
          label={t.joinCount}
          value={metrics.totalJoinCount}
          icon={GitBranch}
          accentColor="var(--join-left)"
          subtitle={t.metricsSubtitleJoinOperations}
          alert={metrics.totalJoinCount > 5}
          onClick={() => {
            beginNavigation('/relationship-graph-visualizer');
            router.push('/relationship-graph-visualizer');
          }}
          tooltip={t.metricsCardOpenGraphHint}
        />
        <MetricCard
          label={t.metricsConditionCount}
          value={metrics.conditionCount}
          icon={Filter}
          accentColor="var(--info)"
          subtitle={t.metricsSubtitleConditionFormula}
          alert={metrics.conditionCount > 8}
          onClick={() => setActiveMetric('conditions')}
          tooltip={t.metricsCardDetailsHint}
        />
        <MetricCard
          label={t.metricsOpsFunctions}
          value={metrics.operationAndFunctionCount}
          icon={Zap}
          accentColor="var(--accent)"
          subtitle={t.metricsSubtitleOpsFunctions}
          alert={metrics.operationAndFunctionCount > 12}
          onClick={() => setActiveMetric('opsAndFunctions')}
          tooltip={t.metricsCardDetailsHint}
        />
        <MetricCard
          label={t.metricsLinesOfSql}
          value={metrics.lineCount}
          icon={Hash}
          accentColor="var(--primary)"
          subtitle={t.metricsSubtitleRawInputLines}
        />
        <MetricCard
          label={t.metricsFinalSelectFields}
          value={metrics.finalSelectFieldCount}
          icon={BarChart3}
          accentColor="var(--join-inner)"
          subtitle={t.metricsSubtitleFinalOutputProjection}
          onClick={scrollToFieldExtractionSummary}
          tooltip={t.metricsCardFieldSummaryHint}
        />
      </div>

      <MetricDetailDrawer
        isOpen={activeConfig !== null}
        onClose={() => setActiveMetric(null)}
        title={activeConfig?.title ?? ''}
        icon={activeConfig?.icon ?? TrendingUp}
        accentColor={activeConfig?.accentColor ?? 'var(--primary)'}
        items={activeConfig?.items ?? []}
        footerNote={activeConfig?.footerNote}
        t={t}
      />
    </>
  );
}
