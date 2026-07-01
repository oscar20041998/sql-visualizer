'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  calculateQueryComplexity,
  getComplexityColor,
  type ComplexityLevel,
} from '@/lib/complexityScorer';
import { getT } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';

interface ComplexityDashboardProps {
  sql: string;
  showDetails?: boolean;
}

export default function ComplexityDashboard({ sql, showDetails = true }: ComplexityDashboardProps) {
  const { settings } = useAppStore();
  const t = getT(settings.locale);
  const complexity = calculateQueryComplexity(sql);

  if (!sql.trim()) {
    return null;
  }

  const levelColors: Record<ComplexityLevel, string> = {
    LOW: 'text-green-600 dark:text-green-400',
    MEDIUM: 'text-yellow-600 dark:text-yellow-400',
    HIGH: 'text-orange-600 dark:text-orange-400',
    SUPER_HIGH: 'text-red-600 dark:text-red-400',
  };

  const levelBg: Record<ComplexityLevel, string> = {
    LOW: 'bg-green-100 dark:bg-green-900/30',
    MEDIUM: 'bg-yellow-100 dark:bg-yellow-900/30',
    HIGH: 'bg-orange-100 dark:bg-orange-900/30',
    SUPER_HIGH: 'bg-red-100 dark:bg-red-900/30',
  };

  const colors = getComplexityColor(complexity.level);

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-lg p-4 space-y-4`}>
      {/* Main Complexity Score Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {complexity.level === 'LOW' && (
              <CheckCircle2 size={24} className={`${levelColors[complexity.level]}`} />
            )}
            {complexity.level === 'MEDIUM' && (
              <AlertTriangle size={24} className={`${levelColors[complexity.level]}`} />
            )}
            {complexity.level === 'HIGH' && (
              <AlertTriangle size={24} className={`${levelColors[complexity.level]}`} />
            )}
            {complexity.level === 'SUPER_HIGH' && (
              <AlertCircle size={24} className={`${levelColors[complexity.level]}`} />
            )}
          </div>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide ${colors.text}`}>
              {t.complexityLevel}:{' '}
              {complexity.level === 'SUPER_HIGH'
                ? t.complexitySuperHigh
                : complexity.level === 'HIGH'
                  ? t.complexityHigh
                  : complexity.level === 'MEDIUM'
                    ? t.complexityMedium
                    : t.complexityLow}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t.complexityScore}: {Math.round(complexity.totalScore)} /{' '}
              {complexity.maxScorePossible} pts
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{Math.round(complexity.totalScore)}</p>
          <p className="text-xs text-muted-foreground">
            {Math.round(complexity.percentageOfMax)}% of max
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-black/10 dark:bg-white/10 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            complexity.level === 'LOW'
              ? 'bg-green-500'
              : complexity.level === 'MEDIUM'
                ? 'bg-yellow-500'
                : complexity.level === 'HIGH'
                  ? 'bg-orange-500'
                  : 'bg-red-500'
          }`}
          style={{ width: `${Math.min(complexity.percentageOfMax, 100)}%` }}
        />
      </div>

      {/* Quick Breakdown */}
      {showDetails && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-black/5 dark:bg-white/5 rounded p-2">
            <p className="text-muted-foreground">{t.complexityKeywordsAndClauses}</p>
            <p className="font-semibold text-foreground">
              {complexity.scoreBreakdown.keywords.reduce((sum, k) => sum + k.subtotal, 0)}pt
            </p>
          </div>
          <div className="bg-black/5 dark:bg-white/5 rounded p-2">
            <p className="text-muted-foreground">{t.complexitySelectFields}</p>
            <p className="font-semibold text-foreground">
              {complexity.scoreBreakdown.selectFields.complexityScore}pt
            </p>
          </div>
          <div className="bg-black/5 dark:bg-white/5 rounded p-2">
            <p className="text-muted-foreground">{t.complexityJoins}</p>
            <p className="font-semibold text-foreground">
              {complexity.scoreBreakdown.joins.totalScore}pt
            </p>
          </div>
          <div className="bg-black/5 dark:bg-white/5 rounded p-2">
            <p className="text-muted-foreground">{t.complexityCTEsAndSubqueries}</p>
            <p className="font-semibold text-foreground">
              {complexity.scoreBreakdown.ctes.totalScore +
                complexity.scoreBreakdown.subqueries.totalScore}
              pt
            </p>
          </div>
        </div>
      )}

      {complexity.lintingIssues.length > 0 && (
        <div className="border-t border-black/10 dark:border-white/10 pt-3 space-y-2">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1">
            <AlertCircle size={14} />
            {t.complexityLintingIssues} ({complexity.lintingIssues.length})
          </p>
          {complexity.lintingIssues.map((issue, idx) => (
            <div
              key={`lint-${idx}`}
              className="bg-black/5 dark:bg-white/5 rounded p-2 border-l-2 border-orange-500"
            >
              <p className="text-xs font-mono text-muted-foreground">{issue.rule}</p>
              <p className="text-xs text-foreground mt-0.5">{issue.message}</p>
              <p className="text-xs text-muted-foreground mt-1">💡 {issue.suggestion}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
