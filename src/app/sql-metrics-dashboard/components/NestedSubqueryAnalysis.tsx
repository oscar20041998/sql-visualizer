'use client';

import React from 'react';
import { toast } from 'sonner';
import { Layers, AlertTriangle } from 'lucide-react';
import { getT } from '@/lib/i18n';
import type { SqlMetrics, StructuralAnalysisReport } from '@/lib/sqlAnalyzer';

interface NestedSubqueryAnalysisProps {
  metrics: SqlMetrics;
  structuralReport: StructuralAnalysisReport;
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

export default function NestedSubqueryAnalysis({
  metrics,
  structuralReport,
  t,
}: NestedSubqueryAnalysisProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Layers size={15} className="text-primary" />
        {t.metricsNestedSubqueryAnalysisTitle}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <MetricCard
          label={t.subqueryDepth}
          value={metrics.subqueryDepth}
          icon={Layers}
          color="var(--warning)"
          subtitle={t.metricsMaximumNestingLevel}
          alert={metrics.subqueryDepth > 3}
        />
        <MetricCard
          label={t.metricsSubqueryCount}
          value={metrics.subqueryCount}
          icon={Layers}
          color="var(--info)"
          subtitle={t.metricsTotalSubqueriesFound}
          alert={metrics.subqueryCount > 3}
        />
        <MetricCard
          label={t.metricsComplexityRisk}
          value={metrics.subqueryDepth > 3 || metrics.subqueryCount > 3 ? 'HIGH' : 'MODERATE'}
          icon={AlertTriangle}
          color={metrics.subqueryDepth > 3 || metrics.subqueryCount > 3 ? 'var(--danger)' : 'var(--warning)'}
          subtitle={t.metricsBased}
          alert={metrics.subqueryDepth > 3 || metrics.subqueryCount > 3}
        />
      </div>

      {/* Nesting Level Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-medium text-foreground">
          <span>{t.metricsNestingDepthAnalysis}</span>
          <span className="text-muted-foreground">{t.metricsLevelDistribution}</span>
        </div>
        {Array.from({ length: Math.min(metrics.subqueryDepth, 5) }).map((_, level) => {
          const depthLevel = level + 1;
          const progress = depthLevel <= metrics.subqueryDepth ? 100 : 0;
          return (
            <div key={`depth-${depthLevel}`} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t.metricsLevelLabel} {depthLevel}</span>
                <span className="font-mono text-foreground font-semibold">
                  {depthLevel === metrics.subqueryDepth ? t.metricsMaxStatus : t.metricsActiveStatus}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progress}%`,
                    background:
                      depthLevel > 3
                        ? 'var(--danger)'
                        : depthLevel > 2
                          ? 'var(--warning)'
                          : 'var(--success)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Optimization Recommendation */}
      {(metrics.subqueryDepth > 3 || metrics.subqueryCount > 3) && (
        <div className="mt-4 p-3 rounded-lg bg-danger/5 border border-danger/30">
          <p className="text-xs font-semibold text-danger mb-1">{t.metricsOptimizationRecommended}</p>
          <p className="text-xs text-danger/70 leading-relaxed">
            {metrics.subqueryDepth > 3
              ? t.metricsDeepNestingMessage.replace('{{level}}', metrics.subqueryDepth.toString())
              : t.metricsMultipleSubqueriesMessage}
          </p>
        </div>
      )}

      {/* Detailed Subqueries List */}
      {structuralReport.subqueries && structuralReport.subqueries.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              {t.metricsDetectedSubqueries} ({structuralReport.subqueries.length})
            </h4>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
            {structuralReport.subqueries.map((subquery, idx) => (
              <div
                key={`subquery-${idx}`}
                className="p-3 bg-muted/30 border border-border/50 rounded-lg hover:border-border transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {t.metricsSubqueryPrefix} #{idx + 1}
                      </span>
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        {t.metricsLevelLabel} {subquery.nestingLevel || idx + 1}
                      </span>
                      {subquery.type && (
                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                          {subquery.type}
                        </span>
                      )}
                    </div>
                    <code className="text-xs font-mono text-foreground bg-background p-2 rounded block border border-border/30 overflow-x-auto whitespace-pre-wrap break-words max-w-full">
                      {subquery.expression || subquery.content || `Subquery at level ${subquery.nestingLevel}`}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const text = subquery.expression || subquery.content || '';
                      navigator.clipboard.writeText(text).then(() => {
                        toast.success(t.copiedToClipboard, { duration: 2000 });
                      });
                    }}
                    className="flex-shrink-0 px-2 py-1 rounded text-[10px] font-medium border border-border bg-card text-foreground hover:bg-muted transition-colors"
                    title={t.metricsCopyButton}
                  >
                    {t.metricsCopyButton}
                  </button>
                </div>
                {subquery.analysis && (
                  <div className="text-[10px] text-muted-foreground space-y-1 border-t border-border/30 pt-2 mt-2">
                    <div>
                      <span className="font-semibold text-foreground">{t.metricsAnalysisLabel}:</span>{' '}
                      {subquery.analysis}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
