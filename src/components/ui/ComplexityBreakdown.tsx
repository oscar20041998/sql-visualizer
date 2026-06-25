'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Code, Zap, AlertCircle, Info } from 'lucide-react';
import { calculateQueryComplexity, type DetailedComplexityScore } from '@/lib/complexityScorer';
import { getT } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';

interface ComplexityBreakdownProps {
  sql: string;
}

export default function ComplexityBreakdown({ sql }: ComplexityBreakdownProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { settings } = useAppStore();
  const t = getT(settings.locale);
  const complexity = calculateQueryComplexity(sql);

  if (!sql.trim()) return null;

  const breakdown = complexity.scoreBreakdown;
  const toggleExpand = (section: string) => {
    setExpanded(expanded === section ? null : section);
  };

  const BreakdownSection = ({
    title,
    id,
    children,
    score,
  }: {
    title: string;
    id: string;
    children: React.ReactNode;
    score?: number;
  }) => (
    <div className="bg-card border border-border rounded-lg overflow-hidden mb-2">
      <button
        onClick={() => toggleExpand(id)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded === id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span className="text-sm font-medium text-foreground">{title}</span>
        </div>
        {score !== undefined && (
          <span className="text-sm font-semibold text-primary">{score}pt</span>
        )}
      </button>
      {expanded === id && <div className="border-t border-border px-4 py-3">{children}</div>}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Keywords & Clauses */}
      <BreakdownSection
        title={t.complexityBreakdownKeywordsAndClauses}
        id="keywords"
        score={breakdown.keywords.reduce((sum, k) => sum + k.subtotal, 0)}
      >
        {breakdown.keywords.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">{t.complexityBreakdownNoKeywords}</p>
        ) : (
          <div className="space-y-2">
            {breakdown.keywords.map((kw, idx) => (
              <div key={`kw-${idx}`} className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono text-muted-foreground">{kw.category}</span>
                  <span className="text-muted-foreground mx-1">×</span>
                  <span className="font-semibold text-foreground">{kw.count}</span>
                </div>
                <span>
                  <span className="text-muted-foreground">{kw.baseScore}pt</span>
                  <span className="mx-1">=</span>
                  <span className="font-semibold text-primary">{kw.subtotal}pt</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </BreakdownSection>

      {/* SELECT Field Complexity */}
      <BreakdownSection
        title={t.complexityBreakdownSelectFields}
        id="select-fields"
        score={breakdown.selectFields.complexityScore}
      >
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted/50 rounded p-2">
              <p className="text-muted-foreground">{t.complexityBreakdownFieldCount}</p>
              <p className="font-semibold text-foreground">{breakdown.selectFields.fieldCount}</p>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <p className="text-muted-foreground">{t.complexityBreakdownAverageComplexity}</p>
              <p className="font-semibold text-foreground">
                {breakdown.selectFields.avgComplexity.toFixed(1)}pt
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t.complexityBreakdownSelectFieldsDesc}</p>
        </div>
      </BreakdownSection>

      {/* Joins */}
      {breakdown.joins.count > 0 && (
        <BreakdownSection
          title={t.complexityBreakdownJoins}
          id="joins"
          score={breakdown.joins.totalScore}
        >
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">
              {breakdown.joins.count} {t.complexityBreakdownJoinsCount}
            </p>
            <p className="text-xs text-muted-foreground">{t.complexityBreakdownJoinsDesc}</p>
          </div>
        </BreakdownSection>
      )}

      {/* CTEs */}
      {breakdown.ctes.count > 0 && (
        <BreakdownSection
          title={t.complexityBreakdownCTEs}
          id="ctes"
          score={breakdown.ctes.totalScore}
        >
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">
              {breakdown.ctes.count} {t.complexityBreakdownCTEsCount}
            </p>
            <p className="text-xs text-muted-foreground">{t.complexityBreakdownCTEsDesc}</p>
          </div>
        </BreakdownSection>
      )}

      {/* Subqueries */}
      {breakdown.subqueries.count > 0 && (
        <BreakdownSection
          title={t.complexityBreakdownSubqueries}
          id="subqueries"
          score={breakdown.subqueries.totalScore}
        >
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">
              {breakdown.subqueries.count} {t.complexityBreakdownNestedSubqueriesLabel} ~
              {breakdown.subqueries.count}
            </p>
            <p className="text-xs text-muted-foreground">{t.complexityBreakdownSubqueriesDesc}</p>
          </div>
        </BreakdownSection>
      )}

      {/* Window Functions */}
      {breakdown.windowFunctions.count > 0 && (
        <BreakdownSection
          title={t.complexityBreakdownWindowFunctions}
          id="window-functions"
          score={breakdown.windowFunctions.totalScore}
        >
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">
              {breakdown.windowFunctions.count} {t.complexityBreakdownWindowFunctionsOverClause}
            </p>
            <p className="text-xs text-muted-foreground">
              {t.complexityBreakdownWindowFunctionsDesc}
            </p>
          </div>
        </BreakdownSection>
      )}

      {/* Summary */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">
              {t.complexityBreakdownScoreInterpretation}
            </p>
            <p>
              {t.complexityBreakdownScoreExplanation
                .replace('{score}', Math.round(complexity.totalScore).toString())
                .replace('{maxScore}', complexity.maxScorePossible.toString())
                .replace('{percentage}', Math.round(complexity.percentageOfMax).toString())}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
