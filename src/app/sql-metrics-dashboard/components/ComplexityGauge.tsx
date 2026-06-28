'use client';

import React from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import type { ComplexityLevel } from '@/lib/sqlAnalyzer';

interface Props {
  score: number;
  maxScore: number;
  level: ComplexityLevel;
}

const LEVEL_COLORS: Record<ComplexityLevel, string> = {
  LOW: 'var(--complexity-low)',
  MEDIUM: 'var(--complexity-medium)',
  HIGH: 'var(--complexity-high)',
  'SUPER_HIGH': 'var(--complexity-super)',
};

export default function ComplexityGauge({ score, maxScore, level }: Props) {
  const pct = Math.round((score / maxScore) * 100);
  const color = LEVEL_COLORS[level];

  const data = [
    { name: 'bg', value: 100, fill: 'var(--muted)' },
    { name: 'score', value: pct, fill: color },
  ];

  return (
    <div className="relative w-32 h-32">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="65%"
          outerRadius="100%"
          startAngle={225}
          endAngle={-45}
          data={data}
          barSize={10}
        >
          <RadialBar dataKey="value" cornerRadius={5} background={false} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums" style={{ color }}>
          {pct}
        </span>
        <span className="text-[10px] text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}
