// Client-side local storage and JSON-based persistence for query history.
// Bypasses the server-side API route entirely to read a manually created local
// JSON file in the project (static-qh-*) combined with browser localStorage for dynamic updates.
// Every call is best-effort and never throws, so history operations never block other parts of the app.

import type { QueryHistoryEntry } from './queryHistory';
import { MAX_QUERY_HISTORY_ENTRIES } from './queryHistory';
import staticHistoryRaw from '../data-history/query-history.json'; // This is a static JSON file bundled with the app

const LOCAL_HISTORY_KEY = 'sql_visualizer_local_history';
const DELETED_STATIC_KEY = 'sql_visualizer_deleted_static_ids';

// Safely cast the static JSON import to QueryHistoryEntry[]
const staticHistory = staticHistoryRaw as QueryHistoryEntry[];

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function getLocalHistory(): QueryHistoryEntry[] {
  if (!isBrowser()) return [];
  try {
    const data = localStorage.getItem(LOCAL_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[queryHistoryClient] Failed to parse local history', error);
    return [];
  }
}

function setLocalHistory(entries: QueryHistoryEntry[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('[queryHistoryClient] Failed to save local history', error);
  }
}

function getDeletedStaticIds(): Set<string> {
  if (!isBrowser()) return new Set();
  try {
    const data = localStorage.getItem(DELETED_STATIC_KEY);
    return data ? new Set(JSON.parse(data)) : new Set();
  } catch {
    return new Set();
  }
}

function setDeletedStaticIds(ids: Set<string>): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(DELETED_STATIC_KEY, JSON.stringify(Array.from(ids)));
  } catch (error) {
    console.error('[queryHistoryClient] Failed to save deleted static ids', error);
  }
}

export async function fetchQueryHistory(): Promise<QueryHistoryEntry[]> {
  if (!isBrowser()) return [];

  const localList = getLocalHistory();
  const deletedStaticIds = getDeletedStaticIds();

  // Filter static history entries to only include those not deleted by the user
  const activeStaticList = staticHistory.filter((item) => !deletedStaticIds.has(item.id));

  // Combine and deduplicate. We want to avoid duplicate SQL queries.
  // If the same SQL is present in both local and static, we prefer the local one.
  const combinedMap = new Map<string, QueryHistoryEntry>();

  // 1. Process static items
  for (const item of activeStaticList) {
    const normalizedSql = item.sql.trim();
    combinedMap.set(normalizedSql, item);
  }

  // 2. Process local items (local items override static items because they are newer or updated)
  for (const item of localList) {
    const normalizedSql = item.sql.trim();
    const existing = combinedMap.get(normalizedSql);
    if (!existing || item.createdAt > existing.createdAt) {
      combinedMap.set(normalizedSql, item);
    }
  }

  // Convert map values to array and sort by createdAt descending
  const combinedList = Array.from(combinedMap.values()).sort((a, b) => b.createdAt - a.createdAt);

  return combinedList.slice(0, MAX_QUERY_HISTORY_ENTRIES);
}

export async function saveQueryHistoryEntry(
  entry: Omit<QueryHistoryEntry, 'id' | 'createdAt'>
): Promise<QueryHistoryEntry | null> {
  if (!isBrowser()) return null;

  const sql = entry.sql.trim();
  if (!sql) return null;

  const created: QueryHistoryEntry = {
    id: `qh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sql,
    dialect: entry.dialect,
    createdAt: Date.now(),
    tableCount: entry.tableCount,
    joinCount: entry.joinCount,
    complexityLevel: entry.complexityLevel,
  };

  // Get current local list and filter out any with the same SQL to refresh it to the top
  const localList = getLocalHistory().filter((item) => item.sql.trim() !== sql);

  const updatedLocal = [created, ...localList].slice(0, MAX_QUERY_HISTORY_ENTRIES);
  setLocalHistory(updatedLocal);

  return created;
}

export async function updateQueryHistoryEmbedding(
  id: string,
  embedding: number[],
  embeddingModel: string
): Promise<void> {
  if (!isBrowser()) return;

  const localList = getLocalHistory();
  const index = localList.findIndex((item) => item.id === id);

  if (index !== -1) {
    localList[index] = { ...localList[index], embedding, embeddingModel };
    setLocalHistory(localList);
  } else {
    // If not found in local list, check static list
    const staticEntry = staticHistory.find((item) => item.id === id);
    if (staticEntry) {
      const copiedEntry: QueryHistoryEntry = {
        ...staticEntry,
        embedding,
        embeddingModel,
      };
      localList.push(copiedEntry);
      setLocalHistory(localList);
    }
  }
}

export async function removeQueryHistoryEntry(id: string): Promise<void> {
  if (!isBrowser()) return;

  // 1. Remove from local history
  const localList = getLocalHistory();
  const updatedLocal = localList.filter((item) => item.id !== id);
  setLocalHistory(updatedLocal);

  // 2. If it's a static entry, mark it as deleted
  const isStatic = staticHistory.some((item) => item.id === id);
  if (isStatic) {
    const deletedStaticIds = getDeletedStaticIds();
    deletedStaticIds.add(id);
    setDeletedStaticIds(deletedStaticIds);
  }
}

export async function clearQueryHistory(): Promise<void> {
  if (!isBrowser()) return;

  // 1. Clear all local history
  setLocalHistory([]);

  // 2. Mark all static history entries as deleted so they don't show up
  const deletedStaticIds = getDeletedStaticIds();
  for (const item of staticHistory) {
    deletedStaticIds.add(item.id);
  }
  setDeletedStaticIds(deletedStaticIds);
}
