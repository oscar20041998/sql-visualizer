'use client';

import React from 'react';
import { getT } from '@/lib/i18n';
import ComplexityGauge from './ComplexityGauge';
import type { ComplexityScore } from '@/lib/sqlAnalyzer';

interface ComplexityHeroCardProps {
  complexity: ComplexityScore;
  t: ReturnType<typeof getT>;
}

export default function ComplexityHeroCard({ complexity, t }: ComplexityHeroCardProps) {
  const complexityBadgeMap: Record<ComplexityScore['level'], string> = {
    LOW: 'complexity-badge-low',
    MEDIUM: 'complexity-badge-medium',
    HIGH: 'complexity-badge-high',
    SUPER_HIGH: 'complexity-badge-super',
  };

  const complexityLabelMap: Record<ComplexityScore['level'], string> = {
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
          {t.complexityScore}: <span className="font-mono text-foreground">{complexity.score}</span>
          <span className="text-muted-foreground/50"> / {complexity.maxScore}</span>
        </p>
      </div>
    </div>
  );
}
