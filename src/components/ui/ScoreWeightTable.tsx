'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';

interface WeightRow {
  category: string;
  construct: string;
  weight: number;
  color: string;
}

export default function ScoreWeightTable() {
  const { settings } = useAppStore();
  const t = getT(settings.locale);

  const weightData: WeightRow[] = [
    // Base Clauses
    {
      category: t.scoreTableCategoryBaseClauses,
      construct: t.scoreTableFROM,
      weight: 1,
      color: '#6ee7f7',
    },
    {
      category: t.scoreTableCategoryBaseClauses,
      construct: t.scoreTableWHERE,
      weight: 2,
      color: '#6ee7f7',
    },
    {
      category: t.scoreTableCategoryBaseClauses,
      construct: t.scoreTableDISTINCT,
      weight: 3,
      color: '#6ee7f7',
    },

    // Joins
    {
      category: t.scoreTableCategoryJoins,
      construct: t.scoreTableINNERJOIN,
      weight: 4,
      color: '#f59e0b',
    },
    {
      category: t.scoreTableCategoryJoins,
      construct: t.scoreTableLEFTJOIN,
      weight: 5,
      color: '#f59e0b',
    },
    {
      category: t.scoreTableCategoryJoins,
      construct: t.scoreTableRIGHTJOIN,
      weight: 5,
      color: '#f59e0b',
    },
    {
      category: t.scoreTableCategoryJoins,
      construct: t.scoreTableFULLOUTERJOIN,
      weight: 10,
      color: '#f59e0b',
    },
    {
      category: t.scoreTableCategoryJoins,
      construct: t.scoreTableCROSSJOIN,
      weight: 10,
      color: '#f59e0b',
    },
    {
      category: t.scoreTableCategoryJoins,
      construct: t.scoreTableNATURALJOIN,
      weight: 5,
      color: '#f59e0b',
    },

    // Aggregations
    {
      category: t.scoreTableCategoryAggregations,
      construct: t.scoreTableGROUPBY,
      weight: 4,
      color: '#10b981',
    },
    {
      category: t.scoreTableCategoryAggregations,
      construct: t.scoreTableORDERBY,
      weight: 3,
      color: '#10b981',
    },
    {
      category: t.scoreTableCategoryAggregations,
      construct: t.scoreTableHAVING,
      weight: 4,
      color: '#10b981',
    },

    // Advanced Structures
    {
      category: t.scoreTableCategoryAdvanced,
      construct: t.scoreTableWITH,
      weight: 8,
      color: '#a78bfa',
    },
    {
      category: t.scoreTableCategoryAdvanced,
      construct: t.scoreTableNESTEDSUBQUERY,
      weight: 12,
      color: '#a78bfa',
    },
    {
      category: t.scoreTableCategoryAdvanced,
      construct: t.scoreTableUNION,
      weight: 6,
      color: '#a78bfa',
    },
    {
      category: t.scoreTableCategoryAdvanced,
      construct: t.scoreTableEXCEPT,
      weight: 6,
      color: '#a78bfa',
    },
    {
      category: t.scoreTableCategoryAdvanced,
      construct: t.scoreTableINTERSECT,
      weight: 6,
      color: '#a78bfa',
    },

    // Window Functions
    {
      category: t.scoreTableCategoryWindowFunctions,
      construct: t.scoreTableOVER,
      weight: 6,
      color: '#ec4899',
    },
    {
      category: t.scoreTableCategoryWindowFunctions,
      construct: t.scoreTablePARTITIONBY,
      weight: 3,
      color: '#ec4899',
    },
    {
      category: t.scoreTableCategoryWindowFunctions,
      construct: t.scoreTableROWNUMBER,
      weight: 6,
      color: '#ec4899',
    },
    {
      category: t.scoreTableCategoryWindowFunctions,
      construct: t.scoreTableRANK,
      weight: 6,
      color: '#ec4899',
    },
    {
      category: t.scoreTableCategoryWindowFunctions,
      construct: t.scoreTableDENSERANK,
      weight: 6,
      color: '#ec4899',
    },

    // SELECT Field Types
    {
      category: t.scoreTableCategorySelectFields,
      construct: t.scoreTableRawField,
      weight: 1,
      color: '#14b8a6',
    },
    {
      category: t.scoreTableCategorySelectFields,
      construct: t.scoreTableAliasField,
      weight: 3,
      color: '#14b8a6',
    },
    {
      category: t.scoreTableCategorySelectFields,
      construct: t.scoreTableConditionalField,
      weight: 5,
      color: '#14b8a6',
    },
    {
      category: t.scoreTableCategorySelectFields,
      construct: t.scoreTableSubqueryField,
      weight: 10,
      color: '#14b8a6',
    },
    {
      category: t.scoreTableCategorySelectFields,
      construct: t.scoreTableAggregateField,
      weight: 4,
      color: '#14b8a6',
    },
    {
      category: t.scoreTableCategorySelectFields,
      construct: t.scoreTableFunctionField,
      weight: 3,
      color: '#14b8a6',
    },
  ];

  const groupedData = weightData.reduce(
    (acc, row) => {
      const existing = acc.find((g) => g.category === row.category);
      if (existing) {
        existing.rows.push(row);
      } else {
        acc.push({ category: row.category, color: row.color, rows: [row] });
      }
      return acc;
    },
    [] as { category: string; color: string; rows: WeightRow[] }[]
  );

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <BarChart3 size={18} className="text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">{t.scoreTableTitle}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t.scoreTableDescription}</p>
        </div>
      </div>

      {/* Tables by Category */}
      <div className="divide-y divide-border overflow-x-auto">
        {groupedData.map((group, groupIdx) => (
          <div key={groupIdx}>
            {/* Category Header */}
            <div
              className="px-6 py-3 sticky top-0 z-10"
              style={{ background: group.color + '10', borderLeft: `4px solid ${group.color}` }}
            >
              <p className="text-xs font-bold text-foreground" style={{ color: group.color }}>
                {group.category}
              </p>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border/30">
              {group.rows.map((row, rowIdx) => (
                <div
                  key={rowIdx}
                  className="px-6 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
                >
                  <p className="text-xs text-foreground">{row.construct}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-muted/50 rounded h-5 relative overflow-hidden">
                      <div
                        className="h-full flex items-center justify-center"
                        style={{
                          width: `${Math.min((row.weight / 12) * 100, 100)}%`,
                          background: row.color + '60',
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-foreground min-w-12 text-right">
                      {row.weight}pt
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="bg-muted/30 px-6 py-3 flex items-start gap-2">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">{t.scoreTableFooterNoteLabel}</span>{' '}
          {t.scoreTableFooterNoteBody}
        </p>
      </div>
    </div>
  );
}
