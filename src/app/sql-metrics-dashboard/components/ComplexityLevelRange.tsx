'use client';

import React from 'react';
import type { getT } from '@/lib/i18n';
import type { ComplexityLevel, ComplexityLevelItem } from '@/lib/complexityScorer';

interface ComplexityLevelRangeProps {
  score: number;
  thresholds: ComplexityLevelItem[];
  t: ReturnType<typeof getT>;
}

const LEVEL_COLORS: Record<ComplexityLevel, string> = {
  LOW: 'var(--complexity-low)',
  MEDIUM: 'var(--complexity-medium)',
  HIGH: 'var(--complexity-high)',
  SUPER_HIGH: 'var(--complexity-super)',
};

export default function ComplexityLevelRange({ score, thresholds, t }: ComplexityLevelRangeProps) {
  const finiteThresholds = thresholds.map((threshold, index) => {
    if (Number.isFinite(threshold.max)) {
      return threshold;
    }

    const previous = thresholds[index - 1];
    const range = previous.max - previous.min + 1;
    return { ...threshold, max: threshold.min + range - 1 };
  });
  const displayMax = finiteThresholds[finiteThresholds.length - 1]?.max || 1;
  const markerPosition = Math.min(100, Math.max(0, (score / displayMax) * 100));

  return (
    <div className="w-full max-w-xs pt-2" aria-label={`${t.complexityLevel}: ${t.complexityScore}`}>
      <div className="relative h-3 overflow-hidden rounded-sm bg-muted">
        <div className="flex h-full">
          {finiteThresholds.map((threshold) => {
            const width = ((threshold.max - threshold.min + 1) / displayMax) * 100;
            return (
              <div
                key={threshold.level}
                className="h-full border-r border-background last:border-r-0"
                style={{ width: `${width}%`, backgroundColor: LEVEL_COLORS[threshold.level] }}
                title={`${threshold.label}: ${threshold.min}-${Number.isFinite(thresholds.find((item) => item.level === threshold.level)?.max) ? threshold.max : `${threshold.min}+`}`}
              />
            );
          })}
        </div>
        <span
          className="absolute top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-foreground"
          style={{ left: `${markerPosition}%` }}
          title={`${t.complexityScore}: ${score}`}
        />
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1 text-center">
        {finiteThresholds.map((threshold) => {
          const isSuperHigh = threshold.level === 'SUPER_HIGH';
          return (
            <div key={threshold.level} className="min-w-0">
              <p className="truncate text-[10px] font-medium" style={{ color: LEVEL_COLORS[threshold.level] }}>
                {threshold.label}
              </p>
              <p className="text-[10px] tabular-nums text-muted-foreground">
                {isSuperHigh ? `${threshold.min}+` : `${threshold.min}-${threshold.max}`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}