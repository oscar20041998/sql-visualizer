import { beforeEach, describe, expect, it } from 'vitest';
import {
  BASELINE_SESSION_STORAGE_KEY,
  captureBaselineSnapshot,
  readBaselineSnapshot,
} from '@/lib/sql/sqlComparisonStorage';

describe('SQL comparison baseline storage', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('preserves exact SQL and capture time in tab session storage', () => {
    const sql = '\nSELECT  id -- keep comment\nFROM orders;  ';
    const capturedAt = new Date('2026-10-09T12:30:00.000Z');

    const snapshot = captureBaselineSnapshot(sql, window.sessionStorage, capturedAt);

    expect(snapshot).toEqual({
      sql,
      capturedAt: capturedAt.toISOString(),
      schemaVersion: 1,
    });
    expect(JSON.parse(window.sessionStorage.getItem(BASELINE_SESSION_STORAGE_KEY) ?? 'null')).toEqual(
      snapshot
    );
  });

  it('rehydrates a baseline after the page owner is recreated', () => {
    const captured = captureBaselineSnapshot(
      'SELECT id FROM orders;',
      window.sessionStorage,
      new Date('2026-10-09T12:30:00.000Z')
    );

    expect(readBaselineSnapshot(window.sessionStorage)).toEqual(captured);
  });

  it('explicitly replaces an earlier baseline when recaptured', () => {
    captureBaselineSnapshot('SELECT id FROM old_orders;', window.sessionStorage);

    const replacement = captureBaselineSnapshot(
      'SELECT id FROM current_orders;',
      window.sessionStorage,
      new Date('2026-10-09T12:31:00.000Z')
    );

    expect(readBaselineSnapshot(window.sessionStorage)).toEqual(replacement);
    expect(replacement?.sql).toBe('SELECT id FROM current_orders;');
  });

  it('clears malformed and incompatible stored snapshots instead of trusting them', () => {
    window.sessionStorage.setItem(BASELINE_SESSION_STORAGE_KEY, '{not json');
    expect(readBaselineSnapshot(window.sessionStorage)).toBeNull();
    expect(window.sessionStorage.getItem(BASELINE_SESSION_STORAGE_KEY)).toBeNull();

    window.sessionStorage.setItem(
      BASELINE_SESSION_STORAGE_KEY,
      JSON.stringify({ sql: 'SELECT 1', capturedAt: 'not-a-date', schemaVersion: 99 })
    );
    expect(readBaselineSnapshot(window.sessionStorage)).toBeNull();
    expect(window.sessionStorage.getItem(BASELINE_SESSION_STORAGE_KEY)).toBeNull();
  });

  it('reports unavailable storage without throwing or claiming a saved snapshot', () => {
    expect(readBaselineSnapshot(null)).toBeNull();
    expect(
      captureBaselineSnapshot('SELECT 1;', null, new Date('2026-10-09T12:30:00.000Z'))
    ).toBeNull();
  });
});