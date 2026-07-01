'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { Hash } from 'lucide-react';
import { getT } from '@/lib/i18n';
import type { AnalysisResult } from '@/lib/sqlAnalyzer';

interface FieldExtractionSummaryProps {
  analysisResult: AnalysisResult;
  t: ReturnType<typeof getT>;
}

export default function FieldExtractionSummary({
  analysisResult,
  t,
}: FieldExtractionSummaryProps) {
  const [fieldSearch, setFieldSearch] = useState('');
  const [fieldPage, setFieldPage] = useState(1);
  const fieldPageSize = 20;
  const { structuralReport } = analysisResult;

  const filteredFields = useMemo(() => {
    const search = fieldSearch.trim().toLowerCase();
    if (!search) return structuralReport.allFields;

    return structuralReport.allFields.filter((field) => {
      const haystack =
        `${field.expression} ${field.alias || ''} ${field.category || ''}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [fieldSearch, structuralReport.allFields]);

  useEffect(() => {
    setFieldPage(1);
  }, [fieldSearch]);

  const totalFieldPages = Math.max(1, Math.ceil(filteredFields.length / fieldPageSize));
  const currentFieldPage = Math.min(fieldPage, totalFieldPages);
  const paginatedFields = filteredFields.slice(
    (currentFieldPage - 1) * fieldPageSize,
    currentFieldPage * fieldPageSize
  );
  const fieldStart = filteredFields.length === 0 ? 0 : (currentFieldPage - 1) * fieldPageSize + 1;
  const fieldEnd = Math.min(currentFieldPage * fieldPageSize, filteredFields.length);

  const getFieldPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    const halfVisible = Math.floor(maxVisible / 2);

    let startPage = Math.max(1, currentFieldPage - halfVisible);
    let endPage = Math.min(totalFieldPages, currentFieldPage + halfVisible);

    if (endPage - startPage < maxVisible - 1) {
      if (startPage === 1) {
        endPage = Math.min(totalFieldPages, startPage + maxVisible - 1);
      } else {
        startPage = Math.max(1, endPage - maxVisible + 1);
      }
    }

    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) pages.push('...');
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalFieldPages) {
      if (endPage < totalFieldPages - 1) pages.push('...');
      pages.push(totalFieldPages);
    }

    return pages;
  };

  const getCategoryBadgeConfig = (category?: string) => {
    if (!category)
      return {
        label: 'Unknown',
        color: 'text-slate-600',
        bgColor: 'bg-slate-500/10',
        borderColor: 'border-slate-500/20',
      };

    const categoryUpper = category.toUpperCase();
    const categoryConfigs: Record<
      string,
      { label: string; color: string; bgColor: string; borderColor: string }
    > = {
      COLUMN: {
        label: t.fieldCategoryColumn,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
      },
      EXPRESSION: {
        label: t.fieldCategoryExpression,
        color: 'text-blue-600',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
      },
      AGGREGATE: {
        label: t.fieldCategoryAggregate,
        color: 'text-orange-600',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/20',
      },
      WINDOW: {
        label: t.fieldCategoryWindow,
        color: 'text-purple-600',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
      },
      SUBQUERY: {
        label: t.fieldCategorySubquery,
        color: 'text-pink-600',
        bgColor: 'bg-pink-500/10',
        borderColor: 'border-pink-500/20',
      },
      CONSTANT: {
        label: t.fieldCategoryConstant,
        color: 'text-gray-600',
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500/20',
      },
      FUNCTION: {
        label: t.fieldCategoryFunction,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-500/10',
        borderColor: 'border-cyan-500/20',
      },
      CALCULATED: {
        label: t.fieldCategoryCalculated,
        color: 'text-rose-600',
        bgColor: 'bg-rose-500/10',
        borderColor: 'border-rose-500/20',
      },
      STANDARD: {
        label: t.fieldCategoryStandard,
        color: 'text-teal-600',
        bgColor: 'bg-teal-500/10',
        borderColor: 'border-teal-500/20',
      },
    };

    return (
      categoryConfigs[categoryUpper] || {
        label: categoryUpper,
        color: 'text-slate-600',
        bgColor: 'bg-slate-500/10',
        borderColor: 'border-slate-500/20',
      }
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Hash size={15} className="text-primary" />
        {t.metricsFieldExtractionSummaryTitle}
      </h3>
      <div className="mb-3">
        <input
          type="search"
          value={fieldSearch}
          onChange={(event) => setFieldSearch(event.target.value)}
          placeholder={t.metricsFieldSearchPlaceholder}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div className="text-xs text-muted-foreground mb-3">
        {t.metricsTotalExtractedFields}:{' '}
        <span className="font-mono text-foreground">{structuralReport.allFieldsCount}</span>
      </div>
      <div className="overflow-x-auto scrollbar-thin border border-border rounded-lg">
        <table id="metrics-field-table" className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/30 sticky top-0 z-10">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-8 border-r border-border/30">
                #
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-48 border-r border-border/30">
                {t.metricsFieldExpressionHeader || 'Expression'}
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-32 border-r border-border/30">
                {t.metricsFieldAliasHeader || 'Alias'}
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-28 border-r border-border/30">
                {t.metricsFieldTypeHeader || 'Type'}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedFields.map((field, idx) => (
              <tr
                key={`field-${idx}`}
                className="border-b border-border/50 last:border-0"
                style={{ containment: 'layout style paint' } as any}
              >
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono border-r border-border/30">
                  {fieldStart + idx}
                </td>
                <td className="px-4 py-3 border-r border-border/30">
                  <code className="text-xs font-mono text-foreground bg-muted px-2 py-0.5 rounded">
                    {field.expression}
                  </code>
                </td>
                <td className="px-4 py-3 border-r border-border/30">
                  {field.alias ? (
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 inline-block">
                      {field.alias}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {field.category ? (
                    (() => {
                      const cfg = getCategoryBadgeConfig(field.category);
                      return (
                        <span
                          className={`text-xs font-semibold ${cfg.color} ${cfg.bgColor} px-2 py-0.5 rounded border ${cfg.borderColor} inline-block`}
                        >
                          {cfg.label}
                        </span>
                      );
                    })()
                  ) : (
                    <span className="text-xs text-muted-foreground italic">—</span>
                  )}
                </td>
              </tr>
            ))}
            {paginatedFields.length === 0 && (
              <tr className="border-b border-border/50">
                <td className="px-4 py-4 text-center text-muted-foreground" colSpan={4}>
                  {t.metricsFieldNoResults}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-medium">
          Showing {filteredFields.length === 0 ? 0 : fieldStart} to {fieldEnd} of{' '}
          {filteredFields.length}
        </span>
        {totalFieldPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFieldPage(Math.max(1, currentFieldPage - 1))}
              disabled={currentFieldPage === 1}
              className="px-2 py-1 rounded bg-card border border-border text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              ←
            </button>
            {getFieldPageNumbers().map((page, idx) =>
              page === '...' ? (
                <span key={`ellipsis-${idx}`} className="px-2 py-1">
                  ...
                </span>
              ) : (
                <button
                  key={`page-${page}`}
                  onClick={() => setFieldPage(page as number)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                    currentFieldPage === page
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {page}
                </button>
              )
            )}
            <button
              onClick={() => setFieldPage(Math.min(totalFieldPages, currentFieldPage + 1))}
              disabled={currentFieldPage === totalFieldPages}
              className="px-2 py-1 rounded bg-card border border-border text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
