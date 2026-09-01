'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { getT } from '@/lib/i18n';
import type { MetricDetailItem } from '@/lib/sql/sqlAnalyzer';
import { useGoToSqlLine } from '@/lib/useGoToSqlLine';

interface MetricDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: React.ElementType;
  accentColor: string;
  items: MetricDetailItem[];
  footerNote?: string;
  t: ReturnType<typeof getT>;
}

const PAGE_SIZE = 10;

export default function MetricDetailDrawer({
  isOpen,
  onClose,
  title,
  icon: Icon,
  accentColor,
  items,
  footerNote,
  t,
}: MetricDetailDrawerProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const goToSqlLine = useGoToSqlLine();

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    setPage(1);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      `${item.snippet} ${item.clause} ${item.scope}`.toLowerCase().includes(query)
    );
  }, [items, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  const rangeStart = filteredItems.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredItems.length);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    const halfVisible = Math.floor(maxVisible / 2);

    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, currentPage + halfVisible);

    if (endPage - startPage < maxVisible - 1) {
      if (startPage === 1) {
        endPage = Math.min(totalPages, startPage + maxVisible - 1);
      } else {
        startPage = Math.max(1, endPage - maxVisible + 1);
      }
    }

    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) pages.push('...');
    }

    for (let i = startPage; i <= endPage; i++) pages.push(i);

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-xl bg-card border-l border-border shadow-2xl flex flex-col animate-slide-in-right"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `${accentColor}15` }}
            >
              <Icon size={16} style={{ color: accentColor }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground">
                {filteredItems.length} {t.metricsDetailItemsLabel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t.metricsDetailCloseLabel}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pt-4">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t.metricsDetailSearchPlaceholder}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
          <div className="overflow-x-auto scrollbar-thin border border-border rounded-lg">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 sticky top-0 z-10">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-8 border-r border-border/30">
                    #
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-40 border-r border-border/30">
                    {t.metricsDetailSnippetHeader}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-24 border-r border-border/30">
                    {t.metricsDetailClauseHeader}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-24 border-r border-border/30">
                    {t.metricsDetailScopeHeader}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-16">
                    {t.metricsDetailLineHeader}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item, idx) => (
                  <tr key={item.id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono border-r border-border/30">
                      {rangeStart + idx}
                    </td>
                    <td className="px-4 py-3 border-r border-border/30">
                      <code className="text-xs font-mono text-foreground bg-muted px-2 py-0.5 rounded break-all">
                        {item.snippet}
                      </code>
                    </td>
                    <td className="px-4 py-3 border-r border-border/30">
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 inline-block">
                        {item.clause}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">{item.scope}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          onClose();
                          goToSqlLine(item.line);
                        }}
                        title={t.metricsDetailGoToLine}
                        className="flex items-center gap-1 text-xs font-mono text-primary hover:underline"
                      >
                        #{item.line}
                        <ArrowRight size={10} />
                      </button>
                    </td>
                  </tr>
                ))}
                {paginatedItems.length === 0 && (
                  <tr>
                    <td className="px-4 py-4 text-center text-muted-foreground" colSpan={5}>
                      {t.metricsDetailNoResults}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="font-medium">
            Showing {filteredItems.length === 0 ? 0 : rangeStart} to {rangeEnd} of{' '}
            {filteredItems.length}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 rounded bg-card border border-border text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                ←
              </button>
              {getPageNumbers().map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 py-1">
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${p}`}
                    onClick={() => setPage(p as number)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                      currentPage === p
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-2 py-1 rounded bg-card border border-border text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                →
              </button>
            </div>
          )}
        </div>

        {footerNote && (
          <div className="px-5 py-2 border-t border-border/50 text-[11px] text-muted-foreground italic">
            {footerNote}
          </div>
        )}
      </div>
    </div>
  );
}
