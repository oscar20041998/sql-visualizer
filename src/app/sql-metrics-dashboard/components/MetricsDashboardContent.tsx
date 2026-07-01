'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, AlertTriangle, Layers, Download } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import ComplexityBreakdown from '@/components/ui/ComplexityBreakdown';
import ComplexityHeroCard from './ComplexityHeroCard';
import MetricCardsGrid from './MetricCardsGrid';
import BarChartExecutionCost from './BarChartExecutionCost';
import ComplexityFactorsBreakdown from './ComplexityFactorsBreakdown';
import JoinLogicComplexity from './JoinLogicComplexity';
import NestedSubqueryAnalysis from './NestedSubqueryAnalysis';
import FieldExtractionSummary from './FieldExtractionSummary';
import ReferencedTablesOverview from './ReferencedTablesOverview';

export default function MetricsDashboardContent() {
  const router = useRouter();
  const { settings, analysisResult } = useAppStore();
  const t = getT(settings.locale);

  if (!analysisResult) {
    return (
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 py-8">
        <div className="flex items-center justify-center h-64 rounded-lg border border-border/50 bg-muted/20">
          <div className="text-center">
            <h3 className="text-sm font-semibold text-foreground mb-1">{t.noMetrics}</h3>
            <p className="text-xs text-muted-foreground">{t.noMetricsHint}</p>
          </div>
        </div>
      </div>
    );
  }

  const { metrics, complexity, executionCost, structuralReport, ctes, tables } = analysisResult;
  const isHighRisk = complexity.level === 'HIGH' || complexity.level === 'SUPER_HIGH';

  const handleExportAnalysisJson = () => {
    const json = JSON.stringify(analysisResult, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sql-analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
        <div className="flex items-center gap-2">
          {ctes && ctes.length > 0 && (
            <button
              onClick={() => router.push('/cte-analysis')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-accent bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-colors"
            >
              <Layers size={14} />
              {t.navCTEAnalysis}
            </button>
          )}
          <button
            onClick={handleExportAnalysisJson}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Download size={14} className="text-primary" />
            {t.metricsExportJson}
          </button>
        </div>
      </div>

      {/* High-Risk Alert */}
      {isHighRisk && (
        <div className="mb-6 p-4 rounded-lg border border-danger/30 bg-danger/5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-danger mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-danger">{t.metricsHighComplexityWarning}</h3>
              <p className="text-xs text-danger/70 mt-1">{t.metricsHighComplexityDescription}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 gap-6">
        {/* Top Section: Complexity Hero (Left) + Metric Cards (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="lg:col-span-1 h-full">
            <ComplexityHeroCard complexity={complexity} t={t} />
          </div>
          <div className="lg:col-span-2 h-full">
            <MetricCardsGrid metrics={metrics} t={t} />
          </div>
        </div>

        {/* Bar Chart & Execution Cost */}
        <BarChartExecutionCost
          metrics={metrics}
          complexity={complexity}
          executionCost={executionCost}
          t={t}
        />

        {/* Complexity Breakdown */}
        <ComplexityBreakdown sql={analysisResult.rawSql} />

        {/* Complexity Factors */}
        <ComplexityFactorsBreakdown complexity={complexity} t={t} />

        {/* Join Logic Complexity */}
        <JoinLogicComplexity joinLogicComplexity={structuralReport.joinLogicComplexity} t={t} />

        {/* Nested Subquery Analysis */}
        <NestedSubqueryAnalysis
          metrics={metrics}
          structuralReport={structuralReport}
          t={t}
        />

        {/* Field Extraction */}
        <FieldExtractionSummary analysisResult={analysisResult} t={t} />

        {/* Referenced Tables */}
        <ReferencedTablesOverview tables={tables} t={t} />
      </div>
    </div>
  );
}
