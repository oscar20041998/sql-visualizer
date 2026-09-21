'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, AlertTriangle, Layers, Download } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import { analyzeSql } from '@/lib/sql/sqlAnalyzer';
import { buildDashboardData } from '@/lib/sql/dashboard/buildDashboardData';
import AnalysisHealthSummary from './AnalysisHealthSummary';
import AdvancedDetails from './AdvancedDetails';
import MetricCardsGrid from './MetricCardsGrid';
import ComplexityFactorsBreakdown from './ComplexityFactorsBreakdown';
import NestedSubqueryAnalysis from './NestedSubqueryAnalysis';
import FieldExtractionSummary from './FieldExtractionSummary';
import ReferencedTablesOverview from './ReferencedTablesOverview';

export default function MetricsDashboardContent() {
  const router = useRouter();
  const {
    settings,
    analysisResult,
    isAnalyzing,
    analysisError,
    rawSql,
    resolvedSql,
    dialect,
    inputMode,
    beginNavigation,
    setIsAnalyzing,
    setAnalysisResult,
    setAnalysisError,
  } = useAppStore();
  const t = getT(settings.locale);

  /**
   * The SQL the dashboard can re-analyse: MyBatis/XML input analyses the parameter-resolved SQL
   * (rawSql holds unrelated text or nothing), plain SQL analyses rawSql. Smart-editor analyses keep
   * their SQL inside the editor, so there is nothing to re-run here and retry stays disabled rather
   * than re-analysing an empty string (FR-003, FR-016).
   */
  const sqlToReanalyze =
    inputMode === 'mybatis' || inputMode === 'import-xml' ? resolvedSql : rawSql;
  const canRetry = sqlToReanalyze.trim().length > 0;

  /**
   * Retry re-runs the analysis of the current SQL from the dashboard itself
   * (specs/010-sql-intelligence-dashboard FR-016): loading state, then result or error.
   */
  const handleRetry = async () => {
    setAnalysisError(null);
    setIsAnalyzing(true);
    try {
      const result = await analyzeSql(sqlToReanalyze, dialect, settings.locale);
      setAnalysisResult(result);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isAnalyzing) {
    return (
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 py-8">
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <BarChart3 size={22} className="text-primary" />
          {t.metricsTitle}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t.metricsSubtitle}</p>
        <div className="mt-6 rounded-lg border border-border/50 bg-muted/20 p-4">
          <p className="text-sm font-semibold text-foreground">{t.analysisLoadingTitle}</p>
          <p className="text-xs text-muted-foreground mt-1">{t.analysisLoadingHint}</p>
        </div>
        {/* Skeletons only — no metric values are shown while the analysis runs. */}
        <div className="mt-4 space-y-4" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-24 rounded-xl border border-border bg-muted/20 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (analysisError) {
    return (
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 py-8">
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <BarChart3 size={22} className="text-primary" />
          {t.metricsTitle}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t.metricsSubtitle}</p>
        <div role="alert" className="mt-6 rounded-lg border border-danger/30 bg-danger/5 p-4">
          <h2 className="text-sm font-semibold text-danger flex items-center gap-2">
            <AlertTriangle size={16} />
            {t.analysisErrorTitle}
          </h2>
          <p className="text-xs text-danger/80 mt-1">{analysisError}</p>
          <button
            type="button"
            onClick={handleRetry}
            disabled={!canRetry}
            className="mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t.analysisRetry}
          </button>
        </div>
      </div>
    );
  }

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

  const { metrics, detailedComplexity, ctes, tables, metricDetails } = analysisResult;
  // AI availability determination is scheduled with the AI Insights task (T030); until then
  // the adapter is fed "unavailable" so no AI-only action is offered (FR-021).
  const data = buildDashboardData(analysisResult, {
    locale: settings.locale,
    aiAvailable: false,
    inputMode,
  });
  const isHighRisk =
    data.health.complexity.level === 'HIGH' || data.health.complexity.level === 'SUPER_HIGH';

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
              onClick={() => {
                beginNavigation('/cte-analysis');
                router.push('/cte-analysis');
              }}
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
              <h3 className="text-sm font-semibold text-danger">
                {t.metricsHighComplexityWarning}
              </h3>
              <p className="text-xs text-danger/70 mt-1">{t.metricsHighComplexityDescription}</p>
            </div>
          </div>
        </div>
      )}

      {/* Sections: health summary first; the existing detail sections preserved; advanced last */}
      <div className="grid grid-cols-1 gap-6">
        <AnalysisHealthSummary data={data} t={t} />

        <MetricCardsGrid metrics={metrics} metricDetails={metricDetails} t={t} />

        <ComplexityFactorsBreakdown
          detailedComplexity={detailedComplexity}
          metrics={metrics}
          t={t}
        />

        <NestedSubqueryAnalysis metrics={metrics} subqueries={metricDetails.subqueries} t={t} />

        <FieldExtractionSummary analysisResult={analysisResult} t={t} />

        <ReferencedTablesOverview tables={tables} t={t} />

        <AdvancedDetails data={data} t={t} />
      </div>
    </div>
  );
}
