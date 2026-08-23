'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { History, X, Search, Trash2, ArrowUpRight, Loader2, Database } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import type { SqlDialect } from '@/lib/sql/sqlAnalyzer';
import type { QueryHistoryEntry } from '@/lib/queryHistory';
import {
  fetchQueryHistory,
  removeQueryHistoryEntry as deleteQueryHistoryEntry,
  clearQueryHistory as clearQueryHistoryApi,
} from '@/lib/queryHistoryClient';
import { tryEmbedText, cosineSimilarity } from '@/lib/ai/embeddingService';

interface QueryHistoryPanelProps {
  /** Called when the user picks a saved query, so the host page can load it back in. */
  onLoadQuery: (sql: string, dialect: SqlDialect) => void;
}

function complexityLabel(level: string | undefined, t: Record<string, string>): string {
  switch (level) {
    case 'LOW':
      return t.complexityLow;
    case 'MEDIUM':
      return t.complexityMedium;
    case 'HIGH':
      return t.complexityHigh;
    case 'SUPER_HIGH':
      return t.complexitySuperHigh;
    default:
      return level ?? '';
  }
}

function complexityColor(level: string | undefined): string {
  switch (level) {
    case 'LOW':
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-800/50';
    case 'MEDIUM':
      return 'text-yellow-400 bg-yellow-500/10 border-yellow-800/50';
    case 'HIGH':
      return 'text-orange-400 bg-orange-500/10 border-orange-800/50';
    case 'SUPER_HIGH':
      return 'text-red-400 bg-red-500/10 border-red-800/50';
    default:
      return 'text-gray-400 bg-gray-500/10 border-gray-700';
  }
}

interface RankedEntry {
  entry: QueryHistoryEntry;
  score: number | null;
}

/**
 * Drawer listing every analyzed query saved on this device, opened from an inline toolbar
 * button (a fixed/floating trigger would sit under the Sidebar, which spans the full left
 * edge of the viewport). Free-text search first tries semantic matching (embeds the query,
 * ranks saved entries by cosine similarity to their stored vectors) and falls back to a plain
 * substring match when embeddings are unavailable.
 */
export const QueryHistoryPanel: React.FC<QueryHistoryPanelProps> = ({ onLoadQuery }) => {
  const settings = useAppStore((store) => store.settings);
  const t = getT(settings.locale);

  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<QueryHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVector, setSearchVector] = useState<number[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // Load from the server (Excel workbook) each time the drawer opens, so it reflects any
  // queries saved elsewhere (e.g. the Smart Editor tab) since it was last opened.
  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    fetchQueryHistory()
      .then(setHistory)
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim();
    setSearchVector(null);
    setSearchNotice(null);
    if (!query) return;

    setIsSearching(true);
    const embedded = await tryEmbedText(query, settings.aiConfig);
    setIsSearching(false);

    if (!embedded) {
      setSearchNotice(t.queryHistorySemanticUnavailable);
      return;
    }
    setSearchVector(embedded.vector);
  }, [searchQuery, settings.aiConfig, t.queryHistorySemanticUnavailable]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchVector(null);
    setSearchNotice(null);
  }, []);

  const results: RankedEntry[] = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return history.map((entry) => ({ entry, score: null }));

    if (searchVector) {
      return history
        .map((entry) => ({
          entry,
          score: entry.embedding ? cosineSimilarity(entry.embedding, searchVector) : null,
        }))
        .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    }

    // Semantic search hasn't run yet (or failed) — fall back to a plain text filter.
    return history.filter((entry) => entry.sql.toLowerCase().includes(query)).map((entry) => ({ entry, score: null }));
  }, [history, searchQuery, searchVector]);

  const handleLoad = useCallback(
    (entry: QueryHistoryEntry) => {
      onLoadQuery(entry.sql, entry.dialect);
      setIsOpen(false);
    },
    [onLoadQuery]
  );

  const handleDelete = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    void deleteQueryHistoryEntry(id);
  }, []);

  const handleClearAll = useCallback(() => {
    setHistory([]);
    void clearQueryHistoryApi();
    setConfirmClearAll(false);
  }, []);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(settings.locale === 'vi' ? 'vi-VN' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [settings.locale]
  );

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label={t.queryHistoryOpenPanel}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <History size={16} className="text-primary" />
          {t.queryHistoryTitle}
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="fixed inset-y-0 left-0 z-40 flex h-full w-full flex-col overflow-hidden border-r border-border bg-card shadow-2xl sm:max-w-md"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <History size={16} className="text-primary" />
                  {t.queryHistoryTitle}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{t.queryHistorySubtitle}</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label={t.queryHistoryClosePanel}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition-colors hover:text-foreground"
              >
                <X size={14} />
              </button>
            </div>

            {/* Search */}
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void handleSearch();
                  }}
                  placeholder={t.queryHistorySearchPlaceholder}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                />
                <button
                  onClick={() => void handleSearch()}
                  disabled={isSearching || !searchQuery.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSearching ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                  {isSearching ? t.queryHistorySearching : t.queryHistorySearchButton}
                </button>
              </div>
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="mt-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t.queryHistoryClearSearch}
                </button>
              )}
              {searchNotice && <p className="mt-2 text-[11px] text-yellow-500">{searchNotice}</p>}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3">
              {isLoading && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" />
                  {t.queryHistorySearching}
                </div>
              )}

              {!isLoading && history.length === 0 && (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
                  <History size={18} className="mx-auto text-muted-foreground/70" />
                  <p className="mt-2 text-sm text-foreground">{t.queryHistoryEmptyTitle}</p>
                  <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                    {t.queryHistoryEmptyHint}
                  </p>
                </div>
              )}

              {!isLoading && history.length > 0 && results.length === 0 && (
                <p className="px-1 py-6 text-center text-sm text-muted-foreground">{t.queryHistoryNoResults}</p>
              )}

              <div className="space-y-2">
                {results.map(({ entry, score }) => (
                  <div key={entry.id} className="rounded-lg border border-border bg-background p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${complexityColor(entry.complexityLevel)}`}
                      >
                        {complexityLabel(entry.complexityLevel, t)}
                      </span>
                      <span className="text-[11px] uppercase text-muted-foreground">{entry.dialect}</span>
                      <span className="text-[11px] text-muted-foreground">{dateFormatter.format(entry.createdAt)}</span>
                      {score !== null && (
                        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {Math.round(Math.max(0, score) * 100)}% {t.queryHistoryMatchLabel}
                        </span>
                      )}
                      {score === null && !entry.embedding && !searchQuery && (
                        <span className="ml-auto text-[10px] text-muted-foreground/70">{t.queryHistoryEmbeddingPending}</span>
                      )}
                    </div>

                    <pre className="mt-2 max-h-20 overflow-hidden whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-muted-foreground">
                      {entry.sql.slice(0, 240)}
                    </pre>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Database size={10} />
                        {t.queryHistoryTablesCount.replace('{n}', String(entry.tableCount))} ·{' '}
                        {t.queryHistoryJoinsCount.replace('{n}', String(entry.joinCount))}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleLoad(entry)}
                          className="flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
                        >
                          <ArrowUpRight size={11} />
                          {t.queryHistoryLoadButton}
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          aria-label={t.queryHistoryDeleteButton}
                          className="flex items-center gap-1 rounded-lg border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-red-400"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            {history.length > 0 && (
              <div className="border-t border-border px-4 py-3">
                {!confirmClearAll ? (
                  <button
                    onClick={() => setConfirmClearAll(true)}
                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-red-400"
                  >
                    <Trash2 size={11} />
                    {t.queryHistoryClearAllButton}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-muted-foreground">{t.queryHistoryConfirmClearAll}</span>
                    <button onClick={handleClearAll} className="font-semibold text-red-400 hover:underline">
                      {t.queryHistoryConfirmYes}
                    </button>
                    <button
                      onClick={() => setConfirmClearAll(false)}
                      className="text-muted-foreground hover:underline"
                    >
                      {t.queryHistoryConfirmCancel}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default QueryHistoryPanel;
