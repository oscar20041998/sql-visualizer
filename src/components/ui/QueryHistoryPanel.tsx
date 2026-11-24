'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { History, Loader2, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getT } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import type { QueryHistoryEntry } from '@/lib/queryHistory';
import {
  clearQueryHistory,
  fetchQueryHistory,
  removeQueryHistoryEntry,
} from '@/lib/queryHistoryClient';
import { cosineSimilarity, tryEmbedText } from '@/lib/ai/embeddingService';

const PAGE_SIZE = 20;

export default function QueryHistoryPanel() {
  const router = useRouter();
  const settings = useAppStore((store) => store.settings);
  const t = getT(settings.locale);
  const [history, setHistory] = useState<QueryHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVector, setSearchVector] = useState<number[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [page, setPage] = useState(1);
  const searchVersion = useRef(0);

  useEffect(() => {
    let active = true;
    fetchQueryHistory()
      .then((entries) => {
        if (active) setHistory(entries);
      })
      .catch((error: unknown) => {
        console.error('[QueryHistory] Failed to load history', error);
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
      searchVersion.current += 1;
    };
  }, []);

  const updateSearch = useCallback((value: string) => {
    searchVersion.current += 1;
    setSearchQuery(value);
    setSearchVector(null);
    setSearchNotice(null);
    setIsSearching(false);
    setPage(1);
  }, []);

  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim();
    if (!query) return;
    const version = ++searchVersion.current;
    setSearchVector(null);
    setSearchNotice(null);
    setIsSearching(true);
    const embedded = await tryEmbedText(query, settings.aiConfig);
    if (version !== searchVersion.current) return;
    setIsSearching(false);
    setPage(1);
    if (embedded) setSearchVector(embedded.vector);
    else setSearchNotice(t.queryHistorySemanticUnavailable);
  }, [searchQuery, settings.aiConfig, t.queryHistorySemanticUnavailable]);

  const results = useMemo(() => {
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
    return history
      .filter((entry) => entry.sql.toLowerCase().includes(query))
      .map((entry) => ({ entry, score: null }));
  }, [history, searchQuery, searchVector]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleResults = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  useEffect(() => {
    setPage((previous) => Math.min(previous, totalPages));
  }, [totalPages]);
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(settings.locale === 'vi' ? 'vi-VN' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [settings.locale]
  );

  const handleLoad = (entry: QueryHistoryEntry) => {
    const store = useAppStore.getState();
    store.setDialect(entry.dialect);
    store.setInputMode('sql');
    store.setRawSql(entry.sql);
    store.setPendingEditorJump(null);
    store.beginNavigation('/query-input');
    router.push('/query-input');
  };

  const handleDelete = async (id: string) => {
    try {
      await removeQueryHistoryEntry(id);
      setHistory((previous) => previous.filter((entry) => entry.id !== id));
    } catch (error) {
      console.error('[QueryHistory] Failed to delete query', error);
      toast.error(t.queryHistoryDeleteError);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearQueryHistory();
      setHistory([]);
      setConfirmClearAll(false);
      setPage(1);
    } catch (error) {
      console.error('[QueryHistory] Failed to clear history', error);
      toast.error(t.queryHistoryClearError);
    }
  };

  const complexityLabels: Record<string, string> = {
    LOW: t.complexityLow,
    MEDIUM: t.complexityMedium,
    HIGH: t.complexityHigh,
    SUPER_HIGH: t.complexitySuperHigh,
  };

  return (
    <div className="mx-auto max-w-[112rem] space-y-6 px-4 py-5 sm:px-6 lg:px-7">
      <header className="floating-header px-4 py-3 sm:px-5">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
          <span className="floating-header-icon"><History size={20} aria-hidden="true" /></span>
          {t.queryHistoryTitle}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.queryHistorySubtitle}</p>
      </header>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <form
          className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSearch();
          }}
        >
          <input
            type="search"
            aria-label={t.queryHistorySearchButton}
            value={searchQuery}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder={t.queryHistorySearchPlaceholder}
            className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-lg"
          />
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSearching ? (
              <Loader2 size={14} className="motion-safe:animate-spin" aria-hidden="true" />
            ) : (
              <Search size={14} aria-hidden="true" />
            )}
            {isSearching ? t.queryHistorySearching : t.queryHistorySearchButton}
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => updateSearch('')}
              className="min-h-11 px-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t.queryHistoryClearSearch}
            </button>
          )}
        </form>
        {history.length > 0 &&
          (confirmClearAll ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span>{t.queryHistoryConfirmClearAll}</span>
              <button
                onClick={() => void handleClearAll()}
                className="min-h-11 text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t.queryHistoryConfirmYes}
              </button>
              <button
                onClick={() => setConfirmClearAll(false)}
                className="min-h-11 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t.queryHistoryConfirmCancel}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClearAll(true)}
              className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 size={14} aria-hidden="true" />
              {t.queryHistoryClearAllButton}
            </button>
          ))}
      </div>
      {searchNotice && (
        <p role="status" className="text-sm text-warning">
          {searchNotice}
        </p>
      )}

      {isLoading ? (
        <p role="status" className="py-8 text-sm text-muted-foreground">
          {t.queryHistorySearching}
        </p>
      ) : loadError ? (
        <p role="alert" className="py-8 text-sm text-danger">
          {t.queryHistoryLoadError}
        </p>
      ) : history.length === 0 ? (
        <div className="py-8">
          <p className="text-sm font-medium text-foreground">{t.queryHistoryEmptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t.queryHistoryEmptyHint}</p>
        </div>
      ) : results.length === 0 ? (
        <p className="py-8 text-sm text-muted-foreground">{t.queryHistoryNoResults}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="border-b border-border bg-card text-xs text-muted-foreground">
                <tr>
                  {[
                    t.queryHistoryColumnQuery,
                    t.queryHistoryColumnDialect,
                    t.queryHistoryColumnDate,
                    t.queryHistoryColumnDetails,
                    t.queryHistoryColumnActions,
                  ].map((heading) => (
                    <th key={heading} scope="col" className="px-4 py-3 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleResults.map(({ entry, score }) => (
                  <tr key={entry.id} className="align-top">
                    <td className="w-2/5 px-4 py-3">
                      <pre className="max-h-20 overflow-hidden whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground">
                        {entry.sql.slice(0, 240)}
                      </pre>
                      {score !== null && (
                        <span className="mt-1 block text-xs text-primary">
                          {Math.round(Math.max(0, score) * 100)}% {t.queryHistoryMatchLabel}
                        </span>
                      )}
                      {score === null && !entry.embedding && !searchQuery && (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {t.queryHistoryEmbeddingPending}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{entry.dialect}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {dateFormatter.format(entry.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {entry.complexityLevel && (
                        <span className="block text-foreground">
                          {complexityLabels[entry.complexityLevel] ?? entry.complexityLevel}
                        </span>
                      )}
                      <span>
                        {t.queryHistoryTablesCount.replace('{n}', String(entry.tableCount))} /{' '}
                        {t.queryHistoryJoinsCount.replace('{n}', String(entry.joinCount))}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleLoad(entry)}
                          className="min-h-11 px-2 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {t.queryHistoryLoadButton}
                        </button>
                        <button
                          onClick={() => void handleDelete(entry.id)}
                          aria-label={`${t.queryHistoryDeleteButton}: ${entry.sql.slice(0, 60)}`}
                          className="flex min-h-11 min-w-11 items-center justify-center text-muted-foreground hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav
            aria-label={t.queryHistoryTitle}
            className="flex flex-wrap items-center justify-end gap-3 text-sm"
          >
            <button
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              className="min-h-11 px-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {t.previousPage}
            </button>
            <span className="text-muted-foreground">
              {t.queryHistoryPage
                .replace('{current}', String(currentPage))
                .replace('{total}', String(totalPages))}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="min-h-11 px-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {t.nextPage}
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
