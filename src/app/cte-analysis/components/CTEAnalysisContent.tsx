'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, GitBranch, BarChart2, RefreshCw, EyeOff, BarChart3 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import CTECard from './CTECard';
import MainQueryFieldsTable from './MainQueryFieldsTable';

export default function CTEAnalysisContent() {
  const router = useRouter();
  const { settings, analysisResult, beginNavigation } = useAppStore();
  const t = getT(settings.locale);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    if (!analysisResult) return;
    setExpandedIds(new Set(analysisResult.ctes.map((c) => c.id)));
  };

  const collapseAll = () => setExpandedIds(new Set());

  if (!analysisResult) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center gap-4 px-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Layers size={28} className="text-muted-foreground" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">{t.noCTEs}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t.noCTEsHint}</p>
        </div>
        <a
          href="/query-input"
          className="mt-2 inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t.navQueryInput}
        </a>
      </div>
    );
  }

  const { ctes, mainQueryFields } = analysisResult;

  const unusedCount = ctes.filter((c) => c.isUnused).length;
  const recursiveCount = ctes.filter((c) => c.isRecursive).length;
  const complexityMap = { LOW: 0, MEDIUM: 1, HIGH: 2 };
  const avgComplexity =
    ctes.length > 0
      ? ctes.reduce((s, c) => s + complexityMap[c.estimatedComplexity], 0) / ctes.length
      : 0;
  const avgComplexityLabel =
    avgComplexity >= 1.5 ? 'HIGH' : avgComplexity >= 0.5 ? 'MEDIUM' : 'LOW';
  const complexityLabels = {
    LOW: t.complexityLow,
    MEDIUM: t.complexityMedium,
    HIGH: t.complexityHigh,
  };

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Header */}
      <header className="floating-header mb-5 flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div>
          <h1 className="text-page-title text-foreground flex items-center gap-2">
            <span className="floating-header-icon"><Layers size={20} aria-hidden /></span>
            {t.cteTitle}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t.cteSubtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              beginNavigation('/sql-metrics-dashboard');
              router.push('/sql-metrics-dashboard');
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BarChart3 size={14} className="text-primary" />
            {t.navMetricsDashboard}
          </button>
          {ctes.length > 0 && (
            <>
              <button
                onClick={expandAll}
                className="min-h-10 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t.expandAll}
              </button>
              <button
                onClick={collapseAll}
                className="min-h-10 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t.collapseAll}
              </button>
            </>
          )}
        </div>
      </header>

      {/* CTE Summary Stats */}
      {ctes.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground normal-case tracking-normal">
              {t.cteTotalLabel}
            </span>
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-primary" />
              <span className="text-2xl font-bold text-foreground font-mono">{ctes.length}</span>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground normal-case tracking-normal">
              {t.cteUnusedCount}
            </span>
            <div className="flex items-center gap-2">
              <EyeOff
                size={16}
                className={unusedCount > 0 ? 'text-amber-500' : 'text-emerald-500'}
              />
              <span
                className={`text-2xl font-bold font-mono ${unusedCount > 0 ? 'text-amber-500' : 'text-foreground'}`}
              >
                {unusedCount}
              </span>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground normal-case tracking-normal">
              {t.cteRecursiveCount}
            </span>
            <div className="flex items-center gap-2">
              <RefreshCw
                size={16}
                className={recursiveCount > 0 ? 'text-primary' : 'text-muted-foreground'}
              />
              <span className="text-2xl font-bold text-foreground font-mono">{recursiveCount}</span>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground normal-case tracking-normal">
              {t.cteAvgComplexity}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <BarChart2 size={16} className="text-primary" />
              <span
                className={`text-sm font-bold ${
                  avgComplexityLabel === 'HIGH'
                    ? 'text-danger'
                    : avgComplexityLabel === 'MEDIUM'
                      ? 'text-warning'
                      : 'text-success'
                }`}
              >
                {complexityLabels[avgComplexityLabel]}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CTE List */}
      {ctes.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <GitBranch size={20} className="text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{t.noCTEs}</h3>
          <p className="text-xs text-muted-foreground max-w-sm">{t.noCTEsHint}</p>
        </div>
      ) : (
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-muted-foreground normal-case tracking-normal">
              {ctes.length} {t.cteDepCountLabel}
              {ctes.length !== 1 ? 's' : ''} {t.cteDetected}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          {ctes.map((cte) => (
            <CTECard
              key={`cte-card-${cte.id}`}
              cte={cte}
              expanded={expandedIds.has(cte.id)}
              onToggle={() => toggleExpand(cte.id)}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Main Query Field Origins */}
      <MainQueryFieldsTable fields={mainQueryFields} t={t} />
    </div>
  );
}
