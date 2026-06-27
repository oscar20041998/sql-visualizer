'use client';

import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';

interface Table {
  id: string;
  name: string;
  alias?: string;
  isCTE?: boolean;
  columns: string[];
}

interface ReferencedTablesTableProps {
  tables: Table[];
  t: any;
}

const itemsPerPage = 10;

export default function ReferencedTablesTable({ tables, t }: ReferencedTablesTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredTables = useMemo(() => {
    if (!searchTerm.trim()) return tables;
    const term = searchTerm.toLowerCase();
    return tables.filter(
      (table) =>
        table.name.toLowerCase().includes(term) ||
        table.alias?.toLowerCase().includes(term) ||
        table.columns.some((col) => col.toLowerCase().includes(term))
    );
  }, [tables, searchTerm]);

  const totalPages = Math.ceil(filteredTables.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedTables = filteredTables.slice(startIdx, endIdx);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pages = [];
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

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  if (tables.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground">{t.noTablesDetected}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          placeholder={`Search tables, aliases, or columns... (${filteredTables.length} found)`}
          value={searchTerm}
          onChange={handleSearch}
          className="w-full pl-9 pr-10 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />
        {searchTerm && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            title="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Table */}
      {filteredTables.length === 0 ? (
        <div className="p-8 text-center bg-muted/20 border border-border/50 rounded-lg">
          <p className="text-sm text-muted-foreground">No tables match your search</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto scrollbar-thin border border-border rounded-lg">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 sticky top-0">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-8 border-r border-border/30">
                    #
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-40 border-r border-border/30">
                    {t.tableName || 'Table Name'}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-32 border-r border-border/30">
                    {t.tableAlias || 'Alias'}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24 border-r border-border/30">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20 border-r border-border/30">
                    {t.columnCount || 'Columns'}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-64">
                    Column List
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedTables.map((table, i) => (
                  <tr
                    key={`table-row-${table.id}`}
                    className="border-b border-border/50 last:border-0"
                    style={{ containment: 'layout style paint' } as any}
                  >
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono border-r border-border/30">
                      {startIdx + i + 1}
                    </td>
                    <td className="px-4 py-3 border-r border-border/30">
                      <code className="text-xs text-foreground bg-muted px-2 py-0.5 rounded font-mono">
                        {table.name}
                      </code>
                    </td>
                    <td className="px-4 py-3 border-r border-border/30">
                      {table.alias ? (
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 inline-block">
                          {table.alias}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 border-r border-border/30">
                      {table.isCTE ? (
                        <span className="text-xs font-semibold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 inline-block">
                          CTE
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block">
                          TABLE
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 border-r border-border/30">
                      <span className="text-xs font-mono text-foreground font-semibold">
                        {table.columns.length}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {table.columns.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {table.columns.map((col, idx) => (
                            <span
                              key={`col-${table.id}-${idx}`}
                              className="px-1.5 py-0.5 rounded bg-border/30 text-foreground/60 font-mono text-[10px]"
                            >
                              {col}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No columns</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Result Counter & Pagination */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">
              Showing {filteredTables.length === 0 ? 0 : startIdx + 1} to{' '}
              {Math.min(endIdx, filteredTables.length)} of {filteredTables.length}{' '}
              {searchTerm && `(searched: ${tables.length})`}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 rounded bg-card border border-border text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  ←
                </button>
                {getPageNumbers().map((page, idx) =>
                  page === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 py-1">
                      ...
                    </span>
                  ) : (
                    <button
                      key={`page-${page}`}
                      onClick={() => setCurrentPage(page as number)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                        currentPage === page
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card border border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 rounded bg-card border border-border text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  →
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
