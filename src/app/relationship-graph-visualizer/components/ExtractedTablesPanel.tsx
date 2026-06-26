'use client';

import React, { memo, useState, useCallback } from 'react';
import { Table2, ChevronDown, ChevronUp } from 'lucide-react';
import { getT } from '@/lib/i18n';
import { JOIN_COLORS } from '@/app/common/colorConstant';
import type { JoinType } from '@/lib/sqlAnalyzer';

interface ExtractedTableRow {
  tableName: string;
  clause: 'FROM' | 'JOIN';
  joinType?: JoinType;
  relatedTo: string;
  hits: number;
}

interface CopyButtonProps {
  getText: () => string;
  label: string;
}

const CopyButton = memo(function CopyButtonComponent({ getText, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }, [getText]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border flex-shrink-0"
      style={{
        background: copied ? 'rgba(16,185,129,0.1)' : 'var(--muted)',
        borderColor: copied ? '#10b981' : 'var(--border)',
        color: copied ? '#10b981' : 'var(--muted-foreground)',
      }}
    >
      {copied ? '✓' : label}
    </button>
  );
});

CopyButton.displayName = 'CopyButton';

const TableRow = memo(function TableRowComponent({ row }: { row: ExtractedTableRow }) {
  return (
    <tr className="border-b border-border/50 hover:bg-muted/40 transition-colors">
      <td className="px-4 py-2 font-mono text-foreground font-medium">{row.tableName}</td>
      <td className="px-4 py-2">
        {row.clause === 'FROM' ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/15 text-blue-400">
            FROM
          </span>
        ) : (
          <span
            className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold"
            style={{
              background: row.joinType ? JOIN_COLORS[row.joinType] + '22' : 'var(--muted)',
              color: row.joinType ? JOIN_COLORS[row.joinType] : 'var(--muted-foreground)',
            }}
          >
            {row.joinType || 'JOIN'}
          </span>
        )}
      </td>
      <td className="px-4 py-2 font-mono text-muted-foreground">{row.relatedTo}</td>
      <td className="px-4 py-2">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
          {row.hits}
        </span>
      </td>
    </tr>
  );
});

TableRow.displayName = 'TableRow';

interface ExtractedTablesPanelProps {
  rows: ExtractedTableRow[];
  onGetCsv: () => string;
}

const ExtractedTablesPanel = memo(function ExtractedTablesPanelComponent({
  rows,
  onGetCsv,
}: ExtractedTablesPanelProps) {
  const [showExtracted, setShowExtracted] = useState(true);
  const t = getT('en');

  return (
    <div
      className="flex-shrink-0 border-t border-border bg-card overflow-hidden"
      style={{
        height: showExtracted ? '320px' : '44px',
        transition: 'height 0.2s ease-out',
        willChange: 'height',
      }}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Table2 size={14} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">{t.extractedTables}</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {rows.length} {t.rows}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton getText={onGetCsv} label="Copy CSV" />
          <button
            onClick={() => setShowExtracted((v) => !v)}
            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground flex-shrink-0"
          >
            {showExtracted ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Table */}
      {showExtracted && (
        <div className="overflow-auto" style={{ maxHeight: '272px', willChange: 'transform' }}>
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  {t.colTableName}
                </th>
                <th className="text-left px-4 py-2 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  {t.colClause}
                </th>
                <th className="text-left px-4 py-2 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  {t.colRelationTo}
                </th>
                <th className="text-left px-4 py-2 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  {t.colHits}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <TableRow key={`extracted-${idx}`} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

ExtractedTablesPanel.displayName = 'ExtractedTablesPanel';

export default ExtractedTablesPanel;
export type { ExtractedTableRow };
