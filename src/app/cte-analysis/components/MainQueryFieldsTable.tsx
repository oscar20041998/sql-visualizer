'use client';

import React, { useState, useMemo } from 'react';
import { Hash, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getT } from '@/lib/i18n';
import type { MainQueryField } from '@/lib/sqlAnalyzer';

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
  fields: MainQueryField[];
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
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
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
      <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={t.searchPlaceholder || 'Search fields, aliases, tables...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
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
            <p className="text-sm text-muted-foreground">{searchTerm ? 'No fields match your search' : t.noData}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto scrollbar-thin flex-1">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 sticky top-0">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-8 border-r border-border/30">
                    #
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-48 border-r border-border/30">
                    {t.fieldName}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-40 border-r border-border/30">
                    {t.fieldAlias || 'Alias'}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-32 border-r border-border/30">
                    Source Table
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-32 border-r border-border/30">
                    {t.fieldOrigin}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">
                    {t.fieldType}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedFields.map((field, i) => (
                  <tr
                    key={`field-row-${startIdx + i}-${field.field}`}
                    className="border-b border-border/50 last:border-0"
                    style={{ containment: 'layout style paint' }}\n                  >
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
                        <span className="text-xs text-muted-foreground italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 border-r border-border/30">
                      {field.sourceTable ? (
                        <span className="text-xs font-mono text-foreground bg-muted px-2 py-0.5 rounded inline-block">
                          {field.sourceTable}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 border-r border-border/30">
                      <span className="text-xs font-mono text-muted-foreground">{field.origin}</span>
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
            <div className="px-5 py-4 border-t border-border bg-muted/20 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Showing <span className="font-semibold">{startIdx + 1}</span> to{' '}
                <span className="font-semibold">{Math.min(endIdx, filteredFields.length)}</span> of{' '}
                <span className="font-semibold">{filteredFields.length}</span> fields
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  title="Previous page"
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
                        className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
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
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  title="Next page"
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
