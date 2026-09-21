import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import QueryInputPage from '@/app/query-input/page';
import { getT } from '@/lib/i18n';
import { setDemoAuthenticated } from '@/lib/demoAuth';
import { useAppStore } from '@/lib/store';
import { makeAnalysisResult } from '../utils/dashboardFixtures';
import { resetTestStorage } from '../utils/test-setup';

/**
 * Analysis-state contract for the real analysis entry point
 * (specs/010-sql-intelligence-dashboard FR-016).
 *
 * The dashboard renders loading / error+retry / result purely from store state
 * (`isAnalyzing`, `analysisError`, `analysisResult`), so the page that runs the
 * analysis must publish all three — otherwise the dashboard states are only
 * reachable in unit tests and never in the browser.
 *
 * Heavy surfaces are mocked so the test observes the store contract without
 * booting Monaco, the analyzer or the history server.
 */
const pushMock = vi.fn();
const replaceMock = vi.fn();
const analyzeSqlMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock, prefetch: vi.fn() }),
}));

vi.mock('@/components/AppLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/LoadingOverlay', () => ({
  default: ({ visible, title }: { visible: boolean; title?: string }) =>
    visible ? <div role="status">{title}</div> : null,
}));

vi.mock('@/components/ui/QueryHistoryPanel', () => ({
  default: () => <div data-testid="query-history" />,
}));

vi.mock('@/app/smart-sql-editor/components/SmartSQLEditor', () => ({
  default: () => <div data-testid="smart-editor" />,
}));

vi.mock('@/app/smart-sql-editor/components/AiSqlExplainer', () => ({ default: () => null }));

vi.mock('@monaco-editor/react', () => ({
  default: ({ value }: { value?: string }) => <pre data-testid="sql-preview">{value ?? ''}</pre>,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/lib/sql/sqlAnalyzer', async (importOriginal: () => Promise<Record<string, unknown>>) => {
  const actual = await importOriginal();
  return { ...actual, analyzeSql: (...args: unknown[]) => analyzeSqlMock(...args) };
});

// The pre-analysis validators are not under test here; they must pass so the
// analyzer call is reached deterministically.
vi.mock(
  '@/lib/sql/dialectValidator',
  async (importOriginal: () => Promise<Record<string, unknown>>) => {
    const actual = await importOriginal();
    return {
      ...actual,
      validateSqlDialect: vi.fn().mockResolvedValue({ valid: true, mismatches: [] }),
    };
  }
);

vi.mock(
  '@/lib/sql/sqlFormatValidator',
  async (importOriginal: () => Promise<Record<string, unknown>>) => {
    const actual = await importOriginal();
    return { ...actual, validateSqlFormat: vi.fn().mockReturnValue({ valid: true }) };
  }
);

vi.mock('@/lib/queryHistoryClient', () => ({
  saveQueryHistoryEntry: vi.fn().mockResolvedValue(null),
  updateQueryHistoryEmbedding: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/ai/embeddingService', () => ({
  tryEmbedText: vi.fn().mockResolvedValue(null),
}));

const SAMPLE_SQL = 'SELECT * FROM orders o INNER JOIN customers c ON c.id = o.customer_id';

async function renderPage() {
  const t = getT('en');
  const { settings } = useAppStore.getState();
  useAppStore.setState({
    rawSql: SAMPLE_SQL,
    myBatisXml: '',
    resolvedSql: '',
    myBatisParams: {},
    inputMode: 'sql',
    isAnalyzing: false,
    analysisResult: null,
    analysisError: null,
    pendingEditorJump: null,
    settings: { ...settings, locale: 'en' },
  });
  render(<QueryInputPage />);
  await screen.findByRole('heading', { level: 1, name: t.queryInputTitle });
  return t;
}

beforeEach(() => {
  resetTestStorage();
  pushMock.mockClear();
  replaceMock.mockClear();
  analyzeSqlMock.mockReset();
  setDemoAuthenticated();
});

describe('Query Input publishes analysis state for the dashboard (FR-016)', () => {
  it('records the failure in the store so the dashboard can show it and offer a retry', async () => {
    analyzeSqlMock.mockRejectedValue(new Error('parser exploded'));
    const t = await renderPage();

    fireEvent.click(screen.getByRole('button', { name: t.analyzeButton }));

    await waitFor(() => expect(useAppStore.getState().analysisError).toBe('parser exploded'));
    expect(useAppStore.getState().isAnalyzing).toBe(false);
    // A failed analysis must not navigate to a dashboard that has no result.
    expect(pushMock).not.toHaveBeenCalledWith('/sql-metrics-dashboard');
  });

  it('clears a stale failure and stores the new result when a later analysis succeeds', async () => {
    analyzeSqlMock.mockResolvedValue(makeAnalysisResult());
    const t = await renderPage();
    useAppStore.setState({ analysisError: 'earlier failure' });

    fireEvent.click(screen.getByRole('button', { name: t.analyzeButton }));

    await waitFor(() => expect(useAppStore.getState().analysisError).toBeNull());
    expect(useAppStore.getState().analysisResult).not.toBeNull();
    expect(useAppStore.getState().isAnalyzing).toBe(false);
    expect(pushMock).toHaveBeenCalledWith('/sql-metrics-dashboard');
    expect(analyzeSqlMock).toHaveBeenCalledWith(SAMPLE_SQL, 'mysql', 'en');
  });

  it('shows the loading state while the analysis is in flight', async () => {
    let release: (value: unknown) => void = () => {};
    analyzeSqlMock.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    const t = await renderPage();

    fireEvent.click(screen.getByRole('button', { name: t.analyzeButton }));

    await waitFor(() => expect(useAppStore.getState().isAnalyzing).toBe(true));
    expect(screen.getByRole('status')).toBeInTheDocument();

    release(makeAnalysisResult());
    await waitFor(() => expect(useAppStore.getState().isAnalyzing).toBe(false));
  });
});
