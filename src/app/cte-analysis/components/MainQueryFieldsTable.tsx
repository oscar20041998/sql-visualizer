'use client';

import React, { useState, useMemo } from 'react';
import { Hash, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getT } from '@/lib/i18n';
import type { AnalysisResult } from '@/lib/sql/sqlAnalyzer';

function OriginBadge({
  type,
  t,
}: {
  type: 'cte' | 'table' | 'expression';
  t: ReturnType<typeof getT>;
}) {
  const cfg = {
    cte: { label: t.cteOriginBadgeCTE, cls: 'bg-accent/10 text-accent border-accent/20' },
    table: { label: t.cteOriginBadgeTable, cls: 'bg-primary/10 text-primary border-primary/20' },
    expression: {
      label: t.cteOriginBadgeExpression,
      cls: 'bg-muted text-muted-foreground border-border',
    },
  };
  const { label, cls } = cfg[type];
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${cls}`}>{label}</span>
  );
}

interface MainQueryFieldsTableProps {
  fields: AnalysisResult['mainQueryFields'];
  t: ReturnType<typeof getT>;
}

export default function MainQueryFieldsTable({ fields, t }: MainQueryFieldsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter fields based on search term
  const filteredFields = useMemo(() => {
    if (!searchTerm.trim()) return fields;

    const term = searchTerm.toLowerCase();
    return fields.filter(
      (field) =>
        field.field.toLowerCase().includes(term) ||
        field.alias?.toLowerCase().includes(term) ||
        field.sourceTable?.toLowerCase().includes(term) ||
        field.origin.toLowerCase().includes(term)
    );
  }, [fields, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredFields.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedFields = filteredFields.slice(startIdx, endIdx);

  // Reset to page 1 when search term changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2">
          <Hash size={15} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{t.mainQueryFields}</h3>
          <span className="ml-2 text-xs text-muted-foreground font-mono">
            {filteredFields.length} {t.cteMetadataFields}
            {searchTerm && ` (${fields.length} total)`}
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-4 py-3 sm:px-5">
        <div className="flex-1 relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder={t.searchTables || 'Search fields, aliases, tables...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              aria-label={t.joinDetailClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {filteredFields.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {searchTerm ? 'No fields match your search' : t.noData}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto scrollbar-thin flex-1">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 sticky top-0">
                  <th className="w-8 border-r border-border/30 px-4 py-3 text-left text-xs font-medium text-muted-foreground normal-case tracking-normal">
                    #
                  </th>
                  <th className="min-w-48 border-r border-border/30 px-4 py-3 text-left text-xs font-medium text-muted-foreground normal-case tracking-normal">
                    {t.fieldName}
                  </th>
                  <th className="min-w-40 border-r border-border/30 px-4 py-3 text-left text-xs font-medium text-muted-foreground normal-case tracking-normal">
                    {t.fieldAlias || 'Alias'}
                  </th>
                  <th className="min-w-32 border-r border-border/30 px-4 py-3 text-left text-xs font-medium text-muted-foreground normal-case tracking-normal">
                    Source Table
                  </th>
                  <th className="min-w-32 border-r border-border/30 px-4 py-3 text-left text-xs font-medium text-muted-foreground normal-case tracking-normal">
                    {t.fieldOrigin}
                  </th>
                  <th className="w-24 px-4 py-3 text-left text-xs font-medium text-muted-foreground normal-case tracking-normal">
                    {t.fieldType}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedFields.map((field, i) => (
                  <tr
                    key={`field-row-${startIdx + i}-${field.field}`}
                    className="border-b border-border/50 last:border-0"
                    style={{ contain: 'layout style paint' }}
                  >
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono border-r border-border/30">
                      {startIdx + i + 1}
                    </td>
                    <td className="px-4 py-3 border-r border-border/30">
                      <code className="text-xs text-foreground bg-muted px-2 py-0.5 rounded font-mono break-words">
                        {field.field}
                      </code>
                    </td>
                    <td className="px-4 py-3 border-r border-border/30">
                      {field.alias ? (
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 inline-block">
                          {field.alias}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">{t.comparisonNone}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 border-r border-border/30">
                      {field.sourceTable ? (
                        <span className="text-xs font-mono text-foreground bg-muted px-2 py-0.5 rounded inline-block">
                          {field.sourceTable}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">{t.comparisonNone}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 border-r border-border/30">
                      <span className="text-xs font-mono text-muted-foreground">
                        {field.origin}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <OriginBadge type={field.type} t={t} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-4 py-4 sm:px-5">
              <div className="text-xs text-muted-foreground">
                Showing <span className="font-semibold">{startIdx + 1}</span> to{' '}
                <span className="font-semibold">{Math.min(endIdx, filteredFields.length)}</span> of{' '}
                <span className="font-semibold">{filteredFields.length}</span> fields
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={t.previousPage}
                >
                  <ChevronLeft size={14} />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const page = i + 1;
                    const isActive = page === currentPage;
                    const isNear =
                      page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;

                    if (!isNear) {
                      if (page === 2 || page === totalPages - 1) {
                        return (
                          <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground">
                            …
                          </span>
                        );
                      }
                      return null;
                    }

                    return (
                      <button
                        key={`page-${page}`}
                        onClick={() => goToPage(page)}
                        className={`min-h-9 min-w-9 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={t.nextPage}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
