'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import { getT } from '@/lib/i18n';
import type { DetailedComplexityScore } from '@/lib/sql/complexityScorer';

interface ComplexityFactorsBreakdownProps {
  detailedComplexity?: DetailedComplexityScore;
  t: ReturnType<typeof getT>;
}

interface BreakdownFactor {
  name: string;
  formula: string;
  contribution: number;
  count?: number;
}

const KEYWORD_LABEL_KEYS: Record<string, keyof ReturnType<typeof getT>> = {
  FROM: 'complexityKeywordFrom',
  WHERE: 'complexityKeywordWhere',
  DISTINCT: 'complexityKeywordDistinct',
  GROUP_BY: 'complexityKeywordGroupBy',
  ORDER_BY: 'complexityKeywordOrderBy',
  HAVING: 'complexityKeywordHaving',
  INNER_JOIN: 'complexityKeywordInnerJoin',
  LEFT_JOIN: 'complexityKeywordLeftJoin',
  RIGHT_JOIN: 'complexityKeywordRightJoin',
  FULL_OUTER_JOIN: 'complexityKeywordFullOuterJoin',
  CROSS_JOIN: 'complexityKeywordCrossJoin',
  NATURAL_JOIN: 'complexityKeywordNaturalJoin',
  JOIN: 'complexityKeywordJoin',
  UNION: 'complexityKeywordUnion',
  EXCEPT: 'complexityKeywordExcept',
  INTERSECT: 'complexityKeywordIntersect',
};

function getKeywordLabel(category: string, t: ReturnType<typeof getT>): string {
  const key = KEYWORD_LABEL_KEYS[category];
  return key ? t[key] : category.replace(/_/g, ' ');
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
  const formulaFactors: BreakdownFactor[] = detailedComplexity
    ? [
        ...detailedComplexity.scoreBreakdown.keywords.map((keyword) => ({
          name: getKeywordLabel(keyword.category, t),
          formula: `${keyword.count} x ${keyword.baseScore}`,
          contribution: keyword.subtotal,
          count: keyword.count,
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
          count: detailedComplexity.scoreBreakdown.selectFields.fieldCount,
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
          count: group.count,
        })),
      ]
    : [];

  const totalContribution = formulaFactors.reduce((sum, factor) => sum + factor.contribution, 0);
  const joinsContribution = detailedComplexity?.scoreBreakdown.joins.totalScore ?? 0;
  const keywordJoinsContribution = detailedComplexity?.scoreBreakdown.keywords
    .filter((keyword) => keyword.category.includes('JOIN'))
    .reduce((sum, keyword) => sum + keyword.subtotal, 0) ?? 0;
  const joinsReconcile = joinsContribution === keywordJoinsContribution;

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Zap size={15} className="text-primary" />
        {t.factorsBreakdown}
      </h3>

      <p className="text-xs font-semibold text-foreground mb-3">{t.complexityFactorsFormula}</p>
      {detailedComplexity ? (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <SummaryMetric label={t.complexityFactorsTotalScore} value={detailedComplexity.totalScore} />
            <SummaryMetric label={t.complexityFactorsMaximumScore} value={detailedComplexity.maxScorePossible} />
            <SummaryMetric
              label={t.complexityFactorsPercentageOfMaximum}
              value={`${Math.round(detailedComplexity.percentageOfMax)}%`}
            />
          </div>
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
              style={{ contain: 'layout style paint' }}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground font-medium">{factor.name}</span>
                <div className="flex items-center gap-3 font-mono text-muted-foreground">
                  <span>{factor.formula}</span>
                  <span className="text-foreground">
                    {t.complexityFactorsContribution}: +{factor.contribution}
                  </span>
                  <span>{pct}%</span>
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
          <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{t.complexityFactorsReconciled}: {totalContribution} / {detailedComplexity.totalScore}</span>
            <span className={joinsReconcile ? 'text-success' : 'text-danger'}>
              {joinsReconcile ? t.complexityFactorsJoinsConsistent : t.complexityFactorsJoinsMismatch}
            </span>
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">{t.complexityFactorsNoDetails}</p>
      )}
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
