'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Zap,
  AlertTriangle,
  TrendingUp,
  Layers,
  Hash,
  ArrowUpDown,
  Filter,
  GitBranch,
  Clock,
  Download,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import ComplexityGauge from './ComplexityGauge';
import MetricsBarChart from './MetricsBarChart';
import ComplexityBreakdown from '@/components/ui/ComplexityBreakdown';
import ReferencedTablesTable from './ReferencedTablesTable';
import Icon from '@/components/ui/AppIcon';

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

export default function MetricsDashboardContent() {
  const { settings, analysisResult } = useAppStore();
  const t = getT(settings.locale);
  const [fieldSearch, setFieldSearch] = useState('');
  const [fieldPage, setFieldPage] = useState(1);
  const fieldPageSize = 20;

  const handleExportAnalysisJson = () => {
    if (!analysisResult) return;

    const payload = {
      generatedAt: new Date().toISOString(),
      locale: settings.locale,
      dialect: analysisResult.dialect,
      analysis: analysisResult,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const timeStamp = new Date().toISOString().replace(/[:.]/g, '-');
    anchor.href = url;
    anchor.download = `sql-analysis-${timeStamp}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  if (!analysisResult) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <BarChart3 size={28} className="text-muted-foreground" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">{t.noMetrics}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t.noMetricsHint}</p>
        </div>
        <a
          href="/"
          className="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {t.navQueryInput}
        </a>
      </div>
    );
  }

  const { metrics, complexity, executionCost, structuralReport } = analysisResult;

  const filteredFields = useMemo(() => {
    const search = fieldSearch.trim().toLowerCase();
    if (!search) return structuralReport.allFields;

    return structuralReport.allFields.filter((field) => {
      const haystack =
        `${field.expression} ${field.alias || ''} ${field.category || ''}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [fieldSearch, structuralReport.allFields]);

  useEffect(() => {
    setFieldPage(1);
  }, [fieldSearch]);

  const totalFieldPages = Math.max(1, Math.ceil(filteredFields.length / fieldPageSize));
  const currentFieldPage = Math.min(fieldPage, totalFieldPages);
  const paginatedFields = filteredFields.slice(
    (currentFieldPage - 1) * fieldPageSize,
    currentFieldPage * fieldPageSize
  );
  const fieldStart = filteredFields.length === 0 ? 0 : (currentFieldPage - 1) * fieldPageSize + 1;
  const fieldEnd = Math.min(currentFieldPage * fieldPageSize, filteredFields.length);

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

  const complexityLabelMap = {
    LOW: t.complexityLow,
    MEDIUM: t.complexityMedium,
    HIGH: t.complexityHigh,
    SUPER_HIGH: t.complexitySuperHigh,
  };

  const complexityColor = complexityColorMap[complexity.level];
  const isHighRisk =
    complexity.level === t.complexityHigh || complexity.level === t.complexitySuperHigh;

  return (
    <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <BarChart3 size={22} className="text-primary" />
            {t.metricsTitle}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t.metricsSubtitle}</p>
        </div>
        <button
          onClick={handleExportAnalysisJson}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <Download size={14} className="text-primary" />
          {t.metricsExportJson}
        </button>
      </div>

      {/* High Risk Alert */}
      {isHighRisk && (
        <div
          className="mb-6 flex items-start gap-3 p-4 bg-danger/10 border border-danger/30 rounded-xl"
          style={{ containment: 'layout style' } as any}
        >
          <AlertTriangle size={16} className="text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-danger">{t.highComplexityDetected}</p>
            <p className="text-xs text-danger/70 mt-0.5">{executionCost.recommendation}</p>
          </div>
        </div>
      )}

      {/* Top: Complexity Hero + Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
        {/* Complexity Hero */}
        <div className="lg:col-span-1 bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center gap-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t.complexityLevel}
          </span>
          <ComplexityGauge
            score={complexity.score}
            maxScore={complexity.maxScore}
            level={complexity.level}
          />
          <div
            className={`px-4 py-1.5 rounded-full text-sm font-bold ${complexityBadgeMap[complexity.level]}`}
          >
            {complexityLabelMap[complexity.level]}
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              {t.complexityScore}:{' '}
              <span className="font-mono text-foreground">{complexity.score}</span>
              <span className="text-muted-foreground/50"> / {complexity.maxScore}</span>
            </p>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="lg:col-span-2 xl:col-span-3 grid grid-cols-2 xl:grid-cols-3 gap-4">
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
      </div>

      {/* Middle: Bar Chart + Execution Cost */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
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
            <p className="text-xs text-foreground leading-relaxed">
              {executionCost.recommendation}
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Complexity Breakdown (if available) */}
      {analysisResult.detailedComplexity && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap size={15} className="text-primary" />
            {t.complexityBreakdownTitle}
          </h3>
          <ComplexityBreakdown sql={analysisResult.rawSql} />
        </div>
      )}

      {/* Complexity Factors Breakdown */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Zap size={15} className="text-primary" />
          {t.factorsBreakdown}
        </h3>
        <div className="space-y-3">
          {complexity.factors.map((factor) => {
            const pct = Math.round((factor.contribution / (factor.weight * 5)) * 100);
            return (
              <div
                key={`cfactor-${factor.name}`}
                className="space-y-1.5"
                style={{ containment: 'layout style paint' } as any}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground font-medium">{factor.name}</span>
                  <div className="flex items-center gap-3 font-mono text-muted-foreground">
                    <span>value: {factor.value}</span>
                    <span>weight: ×{factor.weight}</span>
                    <span className="text-foreground">+{factor.contribution}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background:
                        pct > 66 ? 'var(--danger)' : pct > 33 ? 'var(--warning)' : 'var(--success)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Join Logic Complexity */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <GitBranch size={15} className="text-primary" />
          {t.metricsJoinLogicComplexityTitle}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <MetricCard
            label={t.metricsJoinComplexityLevel}
            value={structuralReport.joinLogicComplexity.level}
            icon={AlertTriangle}
            color="var(--warning)"
            subtitle={`${t.complexityScore} ${structuralReport.joinLogicComplexity.score}`}
            alert={structuralReport.joinLogicComplexity.level === 'HIGH'}
          />
          <MetricCard
            label={t.metricsSimpleOn}
            value={structuralReport.joinLogicComplexity.simpleConditions}
            icon={ArrowUpDown}
            color="var(--success)"
            subtitle={t.metricsSingleColumnMatches}
          />
          <MetricCard
            label={t.metricsMultiColumnOn}
            value={structuralReport.joinLogicComplexity.multiColumnConditions}
            icon={Layers}
            color="var(--info)"
            subtitle={t.metricsAndOrJoinPredicates}
          />
          <MetricCard
            label={t.metricsFunctionBasedOn}
            value={structuralReport.joinLogicComplexity.functionBasedConditions}
            icon={Zap}
            color="var(--accent)"
            subtitle={t.metricsFunctionsInsideOn}
          />
          <MetricCard
            label={t.metricsNonEquiOn}
            value={structuralReport.joinLogicComplexity.nonEquiConditions}
            icon={TrendingUp}
            color="var(--danger)"
            subtitle={t.metricsNonEquiExamples}
            alert={structuralReport.joinLogicComplexity.nonEquiConditions > 0}
          />
        </div>
      </div>

      {/* Field Extraction Summary */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Hash size={15} className="text-primary" />
          {t.metricsFieldExtractionSummaryTitle}
        </h3>
        <div className="mb-3">
          <input
            type="search"
            value={fieldSearch}
            onChange={(event) => setFieldSearch(event.target.value)}
            placeholder={t.metricsFieldSearchPlaceholder}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="text-xs text-muted-foreground mb-3">
          {t.metricsTotalExtractedFields}:{' '}
          <span className="font-mono text-foreground">{structuralReport.allFieldsCount}</span>
        </div>
        <div className="max-h-48 overflow-auto border border-border rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-medium">{t.originExpression}</th>
                <th className="text-left px-3 py-2 font-medium">{t.fieldAlias}</th>
                <th className="text-left px-3 py-2 font-medium">{t.fieldType}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedFields.map((field, idx) => (
                <tr key={`field-${idx}`} className="border-t border-border/50">
                  <td className="px-3 py-2 font-mono text-foreground">{field.expression}</td>
                  <td className="px-3 py-2 text-muted-foreground">{field.alias || t.noDataDash}</td>
                  <td className="px-3 py-2 text-muted-foreground uppercase">{field.category}</td>
                </tr>
              ))}
              {paginatedFields.length === 0 && (
                <tr className="border-t border-border/50">
                  <td className="px-3 py-3 text-muted-foreground" colSpan={3}>
                    {t.metricsFieldNoResults}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {t.metricsFieldShowing} {fieldStart}-{fieldEnd} {t.metricsFieldOf}{' '}
            {filteredFields.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFieldPage((prev) => Math.max(1, prev - 1))}
              disabled={currentFieldPage === 1}
              className="rounded-md border border-border bg-card px-2 py-1 text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.metricsFieldPaginationPrev}
            </button>
            <span className="font-mono">
              {t.metricsFieldPaginationPage} {currentFieldPage}/{totalFieldPages}
            </span>
            <button
              type="button"
              onClick={() => setFieldPage((prev) => Math.min(totalFieldPages, prev + 1))}
              disabled={currentFieldPage === totalFieldPages}
              className="rounded-md border border-border bg-card px-2 py-1 text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.metricsFieldPaginationNext}
            </button>
          </div>
        </div>
      </div>

      {/* Referenced Tables Overview */}
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <GitBranch size={15} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{t.referencedTablesTitle}</h3>
          <span className="ml-auto text-xs text-muted-foreground font-mono">
            {analysisResult.tables.length} {t.referencedTablesCount}
          </span>
        </div>

        <div className="p-5">
          <ReferencedTablesTable tables={analysisResult.tables} t={t} />
        </div>
      </div>
    </div>
  );
}
