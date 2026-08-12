'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import { getT } from '@/lib/i18n';
import type { DetailedComplexityScore } from '@/lib/sql/complexityScorer';

interface ComplexityFactorsBreakdownProps {
  detailedComplexity?: DetailedComplexityScore;
  t: ReturnType<typeof getT>;
}

export default function ComplexityFactorsBreakdown({ detailedComplexity, t }: ComplexityFactorsBreakdownProps) {
  const selectFieldTypeLabels = {
    raw: t.complexityFactorsFieldTypeRaw,
    alias: t.complexityFactorsFieldTypeAlias,
    conditional: t.complexityFactorsFieldTypeConditional,
    subquery: t.complexityFactorsFieldTypeSubquery,
    aggregate: t.complexityFactorsFieldTypeAggregate,
    function: t.complexityFactorsFieldTypeFunction,
  };
  const formulaFactors = detailedComplexity
    ? [
        ...detailedComplexity.scoreBreakdown.keywords.map((keyword) => ({
          name: keyword.category,
          formula: `${keyword.count} x ${keyword.baseScore}`,
          contribution: keyword.subtotal,
        })),
        {
          name: t.complexityFactorsSelectFields,
          formula:
            `${t.complexityFactorsCount}: ${detailedComplexity.scoreBreakdown.selectFields.fieldCount}; ` +
            (detailedComplexity.scoreBreakdown.selectFields.factors
              ?.map(
                (factor) =>
                  `${factor.count} ${selectFieldTypeLabels[factor.type]} x ${factor.weight}`
              )
              .join(' + ') ?? t.noDataDash),
          contribution: detailedComplexity.scoreBreakdown.selectFields.complexityScore,
        },
        ...[
          { name: t.complexityBreakdownCTEs, ...detailedComplexity.scoreBreakdown.ctes },
          { name: t.complexityBreakdownSubqueries, ...detailedComplexity.scoreBreakdown.subqueries },
          {
            name: t.complexityBreakdownWindowFunctions,
            ...detailedComplexity.scoreBreakdown.windowFunctions,
          },
        ].map((group) => ({
          name: group.name,
          formula: `${t.complexityFactorsCount}: ${group.count}`,
          contribution: group.totalScore,
        })),
      ]
    : [];

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Zap size={15} className="text-primary" />
        {t.factorsBreakdown}
      </h3>

      <p className="text-xs font-semibold text-foreground mb-3">{t.complexityFactorsFormula}</p>
      {detailedComplexity ? (
        <div className="space-y-3">
          {formulaFactors.map((factor) => {
            const pct =
              detailedComplexity.totalScore > 0
                ? Math.min(100, Math.round((factor.contribution / detailedComplexity.totalScore) * 100))
                : 0;
          return (
            <div
              key={`${factor.name}-${factor.formula}`}
              className="space-y-1.5"
              style={{ containment: 'layout style paint' } as any}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground font-medium">{factor.name}</span>
                <div className="flex items-center gap-3 font-mono text-muted-foreground">
                  <span>{factor.formula}</span>
                  <span className="text-foreground">
                    {t.complexityFactorsContribution}: +{factor.contribution}
                  </span>
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
      ) : (
        <p className="text-xs text-muted-foreground">{t.complexityFactorsNoDetails}</p>
      )}
    </div>
  );
}
