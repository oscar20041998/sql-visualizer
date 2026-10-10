import {
  BASELINE_SCHEMA_VERSION,
  isBaselineSnapshot,
  type BaselineSnapshot,
} from './sqlComparison';

export const BASELINE_SESSION_STORAGE_KEY = 'sql-visualizer:sql-comparison:baseline:v1';

function resolveSessionStorage(storage?: Storage | null): Storage | null {
  if (storage !== undefined) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function removeStoredBaseline(storage: Storage): void {
  try {
    storage.removeItem(BASELINE_SESSION_STORAGE_KEY);
  } catch {
    // A corrupt or unavailable storage entry must not prevent the editor from loading.
  }
}

export function readBaselineSnapshot(storage?: Storage | null): BaselineSnapshot | null {
  const sessionStorage = resolveSessionStorage(storage);
  if (!sessionStorage) return null;

  try {
    const stored = sessionStorage.getItem(BASELINE_SESSION_STORAGE_KEY);
    if (stored === null) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(stored);
    } catch {
      removeStoredBaseline(sessionStorage);
      return null;
    }
    if (isBaselineSnapshot(parsed)) return parsed;
    removeStoredBaseline(sessionStorage);
    return null;
  } catch {
    return null;
  }
}

export function captureBaselineSnapshot(
  sql: string,
  storage?: Storage | null,
  capturedAt: Date = new Date()
): BaselineSnapshot | null {
  const sessionStorage = resolveSessionStorage(storage);
  if (!sessionStorage) return null;

  try {
    const snapshot: BaselineSnapshot = {
      sql,
      capturedAt: capturedAt.toISOString(),
      schemaVersion: BASELINE_SCHEMA_VERSION,
    };
    sessionStorage.setItem(BASELINE_SESSION_STORAGE_KEY, JSON.stringify(snapshot));
    return snapshot;
  } catch {
    return null;
  }
}
