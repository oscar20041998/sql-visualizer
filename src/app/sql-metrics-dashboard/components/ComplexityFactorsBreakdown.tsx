'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import { getT } from '@/lib/i18n';
import type { ComplexityScore } from '@/lib/sqlAnalyzer';

interface ComplexityFactorsBreakdownProps {
  complexity: ComplexityScore;
  t: ReturnType<typeof getT>;
}

export default function ComplexityFactorsBreakdown({
  complexity,
  t,
}: ComplexityFactorsBreakdownProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
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
  );
}
