'use client';

import React from 'react';
import { getT } from '@/lib/i18n';
import ComplexityGauge from './ComplexityGauge';
import type { ComplexityLevel, DetailedComplexityScore } from '@/lib/complexityScorer';

interface ComplexityHeroCardProps {
  detailedComplexity?: DetailedComplexityScore;
  t: ReturnType<typeof getT>;
}

export default function ComplexityHeroCard({ detailedComplexity, t }: ComplexityHeroCardProps) {
  if (!detailedComplexity) {
    return null;
  }

  const complexityBadgeMap: Record<ComplexityLevel, string> = {
    LOW: 'complexity-badge-low',
    MEDIUM: 'complexity-badge-medium',
    HIGH: 'complexity-badge-high',
    SUPER_HIGH: 'complexity-badge-super',
  };

  const complexityLabelMap: Record<ComplexityLevel, string> = {
    LOW: t.complexityLow,
    MEDIUM: t.complexityMedium,
    HIGH: t.complexityHigh,
    SUPER_HIGH: t.complexitySuperHigh,
  };

  return (
    <div
      className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center gap-4"
      style={{ height: '100%' }}
    >
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {t.complexityLevel}
      </span>
      <ComplexityGauge
        score={detailedComplexity.totalScore}
        maxScore={detailedComplexity.maxScorePossible}
        level={detailedComplexity.level}
      />
      <div
        className={`px-4 py-1.5 rounded-full text-sm font-bold ${complexityBadgeMap[detailedComplexity.level]}`}
      >
        {detailedComplexity.levelLabel ?? complexityLabelMap[detailedComplexity.level]}
      </div>
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          {t.complexityScore}:{' '}
          <span className="font-mono text-foreground">{detailedComplexity.totalScore}</span>
          <span className="text-muted-foreground/50"> / {detailedComplexity.maxScorePossible}</span>
        </p>
      </div>
    </div>
  );
}
