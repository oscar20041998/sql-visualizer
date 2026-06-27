'use client';

import React, { useState } from 'react';
import { Layers, GitBranch, BarChart2, RefreshCw, EyeOff } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import CTECard from './CTECard';
import MainQueryFieldsTable from './MainQueryFieldsTable';

export default function CTEAnalysisContent() {
  const { settings, analysisResult } = useAppStore();
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
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Layers size={28} className="text-muted-foreground" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">{t.noCTEs}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t.noCTEsHint}</p>
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

  return (
    <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Layers size={22} className="text-primary" />
            {t.cteTitle}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t.cteSubtitle}</p>
        </div>
        {ctes.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-muted-foreground"
            >
              {t.expandAll}
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-muted-foreground"
            >
              {t.collapseAll}
            </button>
          </div>
        )}
      </div>

      {/* CTE Summary Stats */}
      {ctes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t.cteTotalLabel}
            </span>
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-primary" />
              <span className="text-2xl font-bold text-foreground font-mono">{ctes.length}</span>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
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
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t.cteRecursiveCount}
            </span>
            <div className="flex items-center gap-2">
              <RefreshCw
                size={16}
                className={recursiveCount > 0 ? 'text-blue-500' : 'text-muted-foreground'}
              />
              <span className="text-2xl font-bold text-foreground font-mono">{recursiveCount}</span>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t.cteAvgComplexity}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <BarChart2 size={16} className="text-primary" />
              <span
                className={`text-sm font-bold ${
                  avgComplexityLabel === 'HIGH'
                    ? 'text-red-500'
                    : avgComplexityLabel === 'MEDIUM'
                      ? 'text-amber-500'
                      : 'text-emerald-500'
                }`}
              >
                {avgComplexityLabel}
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
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
