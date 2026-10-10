import React, { useEffect, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import QueryInputPage from '@/app/query-input/page';
import { getT } from '@/lib/i18n';
import { setDemoAuthenticated } from '@/lib/demoAuth';
import { useAppStore } from '@/lib/store';
import { SqlComparisonAiError } from '@/lib/ai/sqlComparisonAi';
import { compareSqlSnapshots } from '@/lib/sql/sqlComparison';
import type { ComparisonSnapshot } from '@/lib/sql/sqlComparison';
import type { FormatError } from '@/lib/sql/formatError';
import { resetTestStorage, signInAsDemoUser } from '../utils/test-setup';

const { requestComparisonAiMock } = vi.hoisted(() => ({ requestComparisonAiMock: vi.fn() }));
const testAiAssessment = {
  summary: 'The comparison suggests a possible change.',
  potentialCorrectnessImpact: null,
  executionSafetyConcerns: null,
  potentialPerformanceImpact: null,
  evidence: ["WHERE status = 'open'"],
  assumptions: ['The supplied SQL represents the intended change.'],
  verificationSteps: ['Review the changed row scope.'],
  limitations: ['No database execution was performed.'],
};

vi.mock(
  '@/lib/ai/sqlComparisonAi',
  async (importOriginal: () => Promise<typeof import('@/lib/ai/sqlComparisonAi')>) => {
    const actual = await importOriginal();
    return { ...actual, requestSqlComparisonExplanation: requestComparisonAiMock };
  }
);

vi.mock(
  '@/lib/sql/sqlComparison',
  async (importOriginal: () => Promise<typeof import('@/lib/sql/sqlComparison')>) => {
    const actual = await importOriginal();
    return {
      ...actual,
      compareSqlSnapshots: vi.fn(async (snapshot: ComparisonSnapshot) => ({
        snapshot,
        status: 'completed' as const,
        changes: [],
        findings: [
          {
            id: 'deterministic-1',
            origin: 'deterministic' as const,
            category: 'filter',
            severity: 'warning' as const,
            title: 'WHERE clause changed.',
            description: 'Static analysis detected a filter change.',
            evidence: [{ side: 'before' as const, text: "WHERE status = 'open'" }],
            recommendation: 'Review the intended row scope.',
            verificationStatus: 'recommended' as const,
          },
        ],
        assessment: {
          equivalence: 'inconclusive' as const,
          executionSafety: 'review_required' as const,
          performance: 'not_verified' as const,
          staticAnalysis: 'completed' as const,
          resultComparison: 'not_performed' as const,
          executionPlan: 'not_available' as const,
          limitations: [],
        },
        limitations: [],
        ai: { status: 'skipped' as const, explanation: null },
      })),
    };
  }
);

const pushMock = vi.fn();
const replaceMock = vi.fn();

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
  default: function MockSmartSQLEditor({
    initialSql,
    onSqlChange,
    onFormatError,
    apiRef,
  }: {
    initialSql: string;
    onSqlChange?: (sql: string) => void;
    onFormatError?: (error: FormatError) => void;
    apiRef?: {
      current: {
        getSql: () => string;
        getOriginalSql: () => string;
        setSql: (sql: string) => void;
      } | null;
    };
  }) {
    const [sql, setSql] = useState(initialSql);
    const [isCompareMode, setIsCompareMode] = useState(false);
    useEffect(() => onSqlChange?.(sql), [onSqlChange, sql]);
    useEffect(() => {
      if (!apiRef) return;
      apiRef.current = {
        getSql: () => sql,
        getOriginalSql: () => initialSql,
        setSql: (nextSql) => setSql(nextSql),
      };
      return () => {
        apiRef.current = null;
      };
    }, [apiRef, sql]);
    return (
      <>
        <button type="button" onClick={() => setIsCompareMode((current) => !current)}>
          Toggle editor comparison
        </button>
        {isCompareMode && (
          <div data-testid="main-sql-diff" data-original={initialSql} data-modified={sql} />
        )}
        <textarea
          aria-label="SQL editor"
          value={sql}
          onChange={(event) => setSql(event.target.value)}
        />
        <button
          type="button"
          onClick={() =>
            onFormatError?.({
              message: 'Parse error at token: (',
              dialect: 'mysql',
              location: { offset: sql.indexOf('(') },
              locationSource: 'formatter',
              sourceSql: sql,
              severity: 'error',
              occurredAt: '2026-10-10T12:00:00.000Z',
            })
          }
        >
          Trigger format error
        </button>
      </>
    );
  },
}));

vi.mock('@/app/smart-sql-editor/components/FormatErrorPanel', () => ({
  default: ({
    error,
    onApplyFix,
  }: {
    error: FormatError | null;
    onApplyFix?: (sql: string) => void;
  }) =>
    error ? (
      <button type="button" onClick={() => onApplyFix?.('SELECT id FROM orders WHERE status = 1;')}>
        Apply test format fix
      </button>
    ) : null,
}));

vi.mock('@/app/smart-sql-editor/components/AiSqlExplainer', () => ({ default: () => null }));
vi.mock('@monaco-editor/react', () => ({
  default: ({ value }: { value: string }) => <div data-testid="monaco-editor-preview">{value}</div>,
  DiffEditor: ({ original, modified }: { original: string; modified: string }) => (
    <div data-testid="sql-diff" data-original={original} data-modified={modified} />
  ),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

const INITIAL_SQL = "SELECT id FROM orders WHERE status = 'open';";

const BASE_STATE = {
  rawSql: INITIAL_SQL,
  myBatisXml: '',
  resolvedSql: '',
  myBatisParams: {},
  inputMode: 'smart-editor' as const,
  isAnalyzing: false,
  analysisResult: null,
  pendingEditorJump: null,
};

function resetStore(locale: 'en' | 'vi' = 'en') {
  const { settings } = useAppStore.getState();
  useAppStore.setState({ ...BASE_STATE, settings: { ...settings, locale } });
}

async function renderPage(locale: 'en' | 'vi' = 'en') {
  const t = getT(locale);
  resetStore(locale);
  const result = render(<QueryInputPage />);
  await screen.findByRole('heading', { level: 1, name: t.queryInputTitle });
  return { ...result, t };
}

async function openComparison(t: ReturnType<typeof getT>) {
  fireEvent.click(await screen.findByRole('button', { name: t.comparisonOpenPanel }));
  await screen.findByRole('button', { name: t.comparisonRun });
}

beforeEach(async () => {
  resetTestStorage();
  pushMock.mockClear();
  replaceMock.mockClear();
  requestComparisonAiMock.mockReset();
  await signInAsDemoUser();
});

describe('Query Input SQL comparison editor source', () => {
  it('renders supported filter findings with relevant before and after evidence', async () => {
    const afterSql = "SELECT id FROM orders WHERE status = 'closed';";
    const actualComparison = (await vi.importActual(
      '@/lib/sql/sqlComparison'
    )) as typeof import('@/lib/sql/sqlComparison');
    const compareActual = actualComparison.compareSqlSnapshots;
    const result = await compareActual({
      runId: 'filter-change-run',
      beforeSql: INITIAL_SQL,
      afterSql,
      dialect: 'postgresql',
      startedAt: '2026-10-10T12:00:00.000Z',
    });
    vi.mocked(compareSqlSnapshots).mockResolvedValueOnce(result);

    const { t } = await renderPage();
    await openComparison(t);
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL editor' }), {
      target: { value: afterSql },
    });
    fireEvent.click(screen.getByRole('button', { name: t.comparisonRun }));

    expect(await screen.findAllByText('WHERE clause changed.')).toHaveLength(2);
    expect(screen.getAllByText(/WHERE status = 'open'/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/WHERE status = 'closed'/).length).toBeGreaterThan(0);
  });

  it('shows CTE matching limitations without a broad confirmed finding', async () => {
    const afterSql =
      "WITH active_orders AS (SELECT id FROM orders WHERE status = 'open') SELECT id FROM active_orders;";
    const actualComparison = (await vi.importActual(
      '@/lib/sql/sqlComparison'
    )) as typeof import('@/lib/sql/sqlComparison');
    const compareActual = actualComparison.compareSqlSnapshots;
    const result = await compareActual({
      runId: 'cte-match-run',
      beforeSql: INITIAL_SQL,
      afterSql,
      dialect: 'postgresql',
      startedAt: '2026-10-10T12:00:00.000Z',
    });
    expect(result.status).toBe('partial');
    expect(result.limitations.join(' ')).toMatch(/CTE identities could not be matched/i);
    expect(
      result.changes.some((change) => change.kind === 'cte' && change.support === 'supported')
    ).toBe(false);
    vi.mocked(compareSqlSnapshots).mockResolvedValueOnce(result);

    const { t } = await renderPage();
    await openComparison(t);
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL editor' }), {
      target: { value: afterSql },
    });
    fireEvent.click(screen.getByRole('button', { name: t.comparisonRun }));

    expect((await screen.findAllByText(t.comparisonPartial)).length).toBeGreaterThan(0);
    expect(screen.getByText(/CTE identities could not be matched reliably/)).toBeInTheDocument();
    expect(screen.queryByText('WITH clause changed.')).not.toBeInTheDocument();
  });

  it('keeps supported findings visible with partial parser coverage', async () => {
    requestComparisonAiMock.mockResolvedValue(testAiAssessment);
    const afterSql = "SELECT id FROM orders WHERE status = 'closed' AND (";
    const actualComparison = (await vi.importActual(
      '@/lib/sql/sqlComparison'
    )) as typeof import('@/lib/sql/sqlComparison');
    const compareActual = actualComparison.compareSqlSnapshots;
    const result = await compareActual({
      runId: 'comparison-1',
      beforeSql: INITIAL_SQL,
      afterSql,
      dialect: 'mysql',
      startedAt: '2026-10-10T12:00:00.000Z',
    });
    expect(result.status).toBe('partial');
    expect(result.changes.some((change) => change.kind === 'filter')).toBe(true);
    expect(result.limitations.length).toBeGreaterThan(0);
    vi.mocked(compareSqlSnapshots).mockResolvedValueOnce(result);

    const { t } = await renderPage();
    await openComparison(t);
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL editor' }), {
      target: { value: afterSql },
    });
    fireEvent.click(screen.getByRole('button', { name: t.comparisonRun }));

    expect((await screen.findAllByText(t.comparisonPartial)).length).toBeGreaterThan(0);
    expect(screen.getAllByText('WHERE clause changed.').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/could not be fully parsed|unsupported/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: t.comparisonRequestAi }));
    expect(await screen.findByText(t.comparisonAiPartial)).toBeInTheDocument();
    expect(screen.getByText(testAiAssessment.summary)).toBeInTheDocument();
    expect(screen.getByText(t.comparisonNotVerified)).toBeInTheDocument();
  });

  it('shows no changes and does not request AI for identical editor SQL', async () => {
    const actualComparison = (await vi.importActual(
      '@/lib/sql/sqlComparison'
    )) as typeof import('@/lib/sql/sqlComparison');
    const compareActual = actualComparison.compareSqlSnapshots;
    const result = await compareActual({
      runId: 'identical-sql-run',
      beforeSql: INITIAL_SQL,
      afterSql: INITIAL_SQL,
      dialect: 'postgresql',
      startedAt: '2026-10-10T12:00:00.000Z',
    });
    vi.mocked(compareSqlSnapshots).mockResolvedValueOnce(result);

    const { t } = await renderPage();
    await openComparison(t);
    fireEvent.click(screen.getByRole('button', { name: t.comparisonRun }));

    expect(await screen.findByText(t.comparisonNoChanges)).toBeInTheDocument();
    expect(screen.getByText(t.comparisonNoChangesDetail)).toHaveTextContent(
      'The original and current SQL are identical.'
    );
    expect(screen.queryByRole('button', { name: t.comparisonRequestAi })).not.toBeInTheDocument();
    expect(requestComparisonAiMock).not.toHaveBeenCalled();
  });

  it('shows an incomplete-pair state without findings for comment-only current SQL', async () => {
    const afterSql = '-- comment only';
    const actualComparison = (await vi.importActual(
      '@/lib/sql/sqlComparison'
    )) as typeof import('@/lib/sql/sqlComparison');
    const compareActual = actualComparison.compareSqlSnapshots;
    const result = await compareActual({
      runId: 'comparison-1',
      beforeSql: INITIAL_SQL,
      afterSql,
      dialect: 'mysql',
      startedAt: '2026-10-10T12:00:00.000Z',
    });
    expect(result.status).toBe('partial');
    expect(result.findings).toEqual([]);
    vi.mocked(compareSqlSnapshots).mockResolvedValueOnce(result);

    const { t } = await renderPage();
    await openComparison(t);
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL editor' }), {
      target: { value: afterSql },
    });
    fireEvent.click(screen.getByRole('button', { name: t.comparisonRun }));

    expect(await screen.findByText(t.comparisonPartial)).toBeInTheDocument();
    expect(
      screen.getByText(/Before and After SQL must both contain a statement/)
    ).toBeInTheDocument();
    expect(screen.queryByText('WHERE clause changed.')).not.toBeInTheDocument();
    expect(requestComparisonAiMock).not.toHaveBeenCalled();
  });

  it('shows formatting-only changes separately from structural findings', async () => {
    const afterSql = "SELECT id\nFROM orders\nWHERE status = 'open';";
    const actualComparison = (await vi.importActual(
      '@/lib/sql/sqlComparison'
    )) as typeof import('@/lib/sql/sqlComparison');
    const compareActual = actualComparison.compareSqlSnapshots;
    const result = await compareActual({
      runId: 'formatting-only-run',
      beforeSql: INITIAL_SQL,
      afterSql,
      dialect: 'postgresql',
      startedAt: '2026-10-10T12:00:00.000Z',
    });
    expect(result.changes.map((change) => change.kind)).toEqual(['formatting-only']);
    vi.mocked(compareSqlSnapshots).mockResolvedValueOnce(result);

    const { t } = await renderPage();
    await openComparison(t);
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL editor' }), {
      target: { value: afterSql },
    });
    fireEvent.click(screen.getByRole('button', { name: t.comparisonRun }));

    expect(await screen.findByText(t.comparisonFormattingOnly)).toBeInTheDocument();
    expect(screen.queryByText('WHERE clause changed.')).not.toBeInTheDocument();
  });

  it('compares the SQL Editor original and current contents without a separate baseline capture', async () => {
    const { t } = await renderPage();
    await openComparison(t);
    const afterSql = 'SELECT id FROM orders;';
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL editor' }), {
      target: { value: afterSql },
    });
    fireEvent.click(screen.getByRole('button', { name: t.comparisonRun }));

    const diff = await screen.findByTestId('sql-diff');
    expect(diff).toHaveAttribute('data-original', INITIAL_SQL);
    expect(diff).toHaveAttribute('data-modified', afterSql);
  });

  it('keeps the SQL Editor original fixed while its current SQL changes', async () => {
    const { t } = await renderPage();
    await openComparison(t);

    const editedSql = 'SELECT id FROM orders;';
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL editor' }), {
      target: { value: editedSql },
    });

    expect(screen.getByRole('textbox', { name: 'SQL editor' })).toHaveValue(editedSql);
    fireEvent.click(screen.getByRole('button', { name: t.comparisonRun }));
    const diff = await screen.findByTestId('sql-diff');
    expect(diff).toHaveAttribute('data-original', INITIAL_SQL);
    expect(diff).toHaveAttribute('data-modified', editedSql);
  });

  it('uses the SQL Editor original again after the page owner is remounted', async () => {
    const firstPage = await renderPage();
    await openComparison(firstPage.t);
    firstPage.unmount();

    const { t } = await renderPage();
    await openComparison(t);

    expect(screen.getByRole('textbox', { name: 'SQL editor' })).toHaveValue(INITIAL_SQL);
  });

  it('refreshes both comparison sides after the editor source is replaced', async () => {
    const replacementSql = 'SELECT id FROM archived_orders;';
    const { t } = await renderPage();

    act(() =>
      useAppStore.setState((state) => ({
        ...state,
        inputMode: 'mybatis',
        resolvedSql: replacementSql,
      }))
    );
    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'SQL editor' })).not.toBeInTheDocument()
    );

    act(() => useAppStore.setState((state) => ({ ...state, inputMode: 'smart-editor' })));
    expect(await screen.findByRole('textbox', { name: 'SQL editor' })).toHaveValue(replacementSql);
    await openComparison(t);
    fireEvent.click(screen.getByRole('button', { name: t.comparisonRun }));

    await waitFor(() =>
      expect(compareSqlSnapshots).toHaveBeenCalledWith(
        expect.objectContaining({ beforeSql: replacementSql, afterSql: replacementSql })
      )
    );
  });

  it('leaves editor SQL unchanged and performs no execution during comparison', async () => {
    const afterSql = "SELECT id FROM orders WHERE status = 'closed';";
    requestComparisonAiMock.mockResolvedValue({
      ...testAiAssessment,
      summary: 'Review the changed filter.',
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      const { t } = await renderPage();
      await openComparison(t);
      fireEvent.change(screen.getByRole('textbox', { name: 'SQL editor' }), {
        target: { value: afterSql },
      });
      fireEvent.click(screen.getByRole('button', { name: t.comparisonRun }));
      await screen.findByTestId('sql-diff');

      expect(screen.getByRole('textbox', { name: 'SQL editor' })).toHaveValue(afterSql);
      fireEvent.click(screen.getByRole('button', { name: t.comparisonRequestAi }));
      expect(await screen.findByText('Review the changed filter.')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'SQL editor' })).toHaveValue(afterSql);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('compares immutable editor snapshots, opens results, and marks later edits stale', async () => {
    const { t } = await renderPage();
    await openComparison(t);

    const afterSql = 'SELECT id FROM orders;';
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL editor' }), {
      target: { value: afterSql },
    });
    fireEvent.click(screen.getByRole('button', { name: t.comparisonRun }));

    await screen.findByTestId('sql-diff');
    expect(screen.getByTestId('sql-diff')).toHaveAttribute('data-original', INITIAL_SQL);
    expect(screen.getByTestId('sql-diff')).toHaveAttribute('data-modified', afterSql);
    expect(screen.getByRole('textbox', { name: 'SQL editor' })).toHaveValue(afterSql);

    const newerSql = 'SELECT id, status FROM orders;';
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL editor' }), {
      target: { value: newerSql },
    });
    expect(await screen.findByText(t.comparisonStale)).toHaveAttribute('role', 'status');
  });

  it('uses the SQL Editor original and current SQL in both compare modes', async () => {
    const { t } = await renderPage();
    const afterSql = 'SELECT id FROM orders;';

    await openComparison(t);
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL editor' }), {
      target: { value: afterSql },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Toggle editor comparison' }));
    fireEvent.click(screen.getByRole('button', { name: t.comparisonRun }));

    const mainDiff = await screen.findByTestId('main-sql-diff');
    const comparisonDiff = await screen.findByTestId('sql-diff');
    expect(mainDiff).toHaveAttribute('data-original', INITIAL_SQL);
    expect(mainDiff).toHaveAttribute('data-modified', afterSql);
    expect(comparisonDiff).toHaveAttribute('data-original', INITIAL_SQL);
    expect(comparisonDiff).toHaveAttribute('data-modified', afterSql);
  });

  it('keeps the compared SQL snapshot visible and marks it stale after further editor changes', async () => {
    const { t } = await renderPage();
    const comparedSql = 'SELECT id FROM orders;';
    await openComparison(t);
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL editor' }), {
      target: { value: comparedSql },
    });
    fireEvent.click(screen.getByRole('button', { name: t.comparisonRun }));

    const diff = await screen.findByTestId('sql-diff');
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL editor' }), {
      target: { value: 'SELECT id, status FROM orders;' },
    });

    expect(await screen.findByText(t.comparisonStale)).toBeInTheDocument();
    expect(diff).toHaveAttribute('data-original', INITIAL_SQL);
    expect(diff).toHaveAttribute('data-modified', comparedSql);
  });

  it('compares the SQL immediately after applying a format fix', async () => {
    const { t } = await renderPage();
    const afterSql = 'SELECT id FROM orders WHERE status = 1;';

    await openComparison(t);
    fireEvent.click(screen.getByRole('button', { name: 'Trigger format error' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Apply test format fix' }));
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'SQL editor' })).toHaveValue(afterSql)
    );

    fireEvent.click(screen.getByRole('button', { name: t.comparisonRun }));

    const diff = await screen.findByTestId('sql-diff');
    expect(diff).toHaveAttribute('data-original', INITIAL_SQL);
    expect(diff).toHaveAttribute('data-modified', afterSql);
  });

  it('renders AI interpretation separately from deterministic findings', async () => {
    requestComparisonAiMock.mockResolvedValue({
      ...testAiAssessment,
      summary: 'AI interpretation with grounded evidence.',
    });
    const { t } = await renderPage();
    await openComparison(t);
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL editor' }), {
      target: { value: 'SELECT id FROM orders;' },
    });
    fireEvent.click(screen.getByRole('button', { name: t.comparisonRun }));
    await screen.findByTestId('sql-diff');

    fireEvent.click(screen.getByRole('button', { name: t.comparisonRequestAi }));

    expect(
      await screen.findByText('AI interpretation with grounded evidence.')
    ).toBeInTheDocument();
    expect(screen.getByText(t.comparisonDeterministicOrigin)).toBeInTheDocument();
    expect(screen.getByText('WHERE clause changed.')).toBeInTheDocument();
  });

  it('shows streamed AI explanation text before the response completes', async () => {
    let finishResponse!: (assessment: typeof testAiAssessment) => void;
    requestComparisonAiMock.mockImplementation((...args: unknown[]) => {
      const onDelta = args[4] as (fragment: string) => void;
      onDelta('{"summary":"The filter was removed, so more rows may be returned');
      return new Promise<typeof testAiAssessment>((resolve) => {
        finishResponse = resolve;
      });
    });
    const { t } = await renderPage();
    await openComparison(t);
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL editor' }), {
      target: { value: 'SELECT id FROM orders;' },
    });
    fireEvent.click(screen.getByRole('button', { name: t.comparisonRun }));
    await screen.findByTestId('sql-diff');

    fireEvent.click(screen.getByRole('button', { name: t.comparisonRequestAi }));

    expect(
      await screen.findByText('The filter was removed, so more rows may be returned')
    ).toBeInTheDocument();
    expect(screen.getByText(t.comparisonAiLoading)).toBeInTheDocument();
    await act(async () =>
      finishResponse({
        ...testAiAssessment,
        summary: 'Final AI interpretation with grounded evidence.',
      })
    );
    expect(
      await screen.findByText('Final AI interpretation with grounded evidence.')
    ).toBeInTheDocument();
  });

  it('renders validated AI assessment fields separately from deterministic findings', async () => {
    const assessment = {
      summary: 'Removing the filter may broaden the returned rows.',
      potentialCorrectnessImpact: 'Rows outside the original status may be included.',
      executionSafetyConcerns: null,
      potentialPerformanceImpact: 'A broader scan may require more work.',
      evidence: ["WHERE status = 'open'"],
      assumptions: ['The status predicate represents an intended row boundary.'],
      verificationSteps: ['Confirm the required status scope with a representative test.'],
      limitations: ['No database execution or schema validation was performed.'],
    };
    requestComparisonAiMock.mockResolvedValue(assessment);
    const { t } = await renderPage();
    await openComparison(t);
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL editor' }), {
      target: { value: 'SELECT id FROM orders;' },
    });
    fireEvent.click(screen.getByRole('button', { name: t.comparisonRun }));
    await screen.findByTestId('sql-diff');
    fireEvent.click(screen.getByRole('button', { name: t.comparisonRequestAi }));

    const aiAssessment = await screen.findByRole('region', { name: t.comparisonAiTitle });
    expect(aiAssessment).toHaveTextContent(assessment.summary);
    expect(aiAssessment).toHaveTextContent(assessment.potentialCorrectnessImpact!);
    expect(aiAssessment).toHaveTextContent(assessment.potentialPerformanceImpact!);
    expect(aiAssessment).toHaveTextContent(assessment.evidence[0]);
    expect(aiAssessment).toHaveTextContent(assessment.assumptions[0]);
    expect(aiAssessment).toHaveTextContent(assessment.verificationSteps[0]);
    expect(aiAssessment).toHaveTextContent(assessment.limitations[0]);
    expect(screen.getByText(t.comparisonDeterministicOrigin)).toBeInTheDocument();
  });

  it('retains deterministic results when an AI provider is unavailable', async () => {
    requestComparisonAiMock.mockRejectedValue(
      new SqlComparisonAiError('unavailable', 'Network unavailable')
    );
    const { t } = await renderPage();
    await openComparison(t);
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL editor' }), {
      target: { value: 'SELECT id FROM orders;' },
    });
    fireEvent.click(screen.getByRole('button', { name: t.comparisonRun }));
    await screen.findByTestId('sql-diff');

    fireEvent.click(screen.getByRole('button', { name: t.comparisonRequestAi }));

    expect(await screen.findByText(t.comparisonAiUnavailable)).toBeInTheDocument();
    expect(screen.getByText('WHERE clause changed.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'SQL editor' })).toHaveValue(
      'SELECT id FROM orders;'
    );
  });

  it('shows unavailable and invalid AI outcomes with retry and retained findings', async () => {
    requestComparisonAiMock
      .mockRejectedValueOnce(new SqlComparisonAiError('unavailable', 'Provider unavailable'))
      .mockRejectedValueOnce(new SqlComparisonAiError('malformed', 'Invalid response'))
      .mockResolvedValueOnce(testAiAssessment);
    const { t } = await renderPage();
    await openComparison(t);
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL editor' }), {
      target: { value: 'SELECT id FROM orders;' },
    });
    fireEvent.click(screen.getByRole('button', { name: t.comparisonRun }));
    await screen.findByTestId('sql-diff');
    fireEvent.click(screen.getByRole('button', { name: t.comparisonRequestAi }));

    expect(await screen.findByText(t.comparisonAiUnavailable)).toBeInTheDocument();
    expect(screen.getByText('WHERE clause changed.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t.comparisonRetryAi }));

    expect(await screen.findByText(t.comparisonAiMalformed)).toBeInTheDocument();
    expect(screen.getByText('WHERE clause changed.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t.comparisonRetryAi }));

    expect(await screen.findByText(testAiAssessment.summary)).toBeInTheDocument();
    expect(requestComparisonAiMock).toHaveBeenCalledTimes(3);
  });

  it('sanitizes provider failures in visible errors and captured logs', async () => {
    const credential = 'sk-live-sensitive-token';
    const sqlSecret = 'private@example.test';
    requestComparisonAiMock.mockRejectedValue(
      new SqlComparisonAiError(
        'unavailable',
        `Network unavailable; Authorization: Bearer ${credential}; query contains ${sqlSecret}`
      )
    );
    const { t } = await renderPage();
    await openComparison(t);
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL editor' }), {
      target: { value: 'SELECT id FROM orders;' },
    });
    fireEvent.click(screen.getByRole('button', { name: t.comparisonRun }));
    await screen.findByTestId('sql-diff');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      fireEvent.click(screen.getByRole('button', { name: t.comparisonRequestAi }));
      expect(await screen.findByText(t.comparisonAiUnavailable)).toBeInTheDocument();
      expect(screen.getByText('WHERE clause changed.')).toBeInTheDocument();
      expect(screen.queryByText(new RegExp(`${credential}|${sqlSecret}`))).not.toBeInTheDocument();
      expect(consoleError).not.toHaveBeenCalled();
      expect(consoleWarn).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
      consoleWarn.mockRestore();
    }
  });

  it('discards an AI response when the compared editor input becomes stale in flight', async () => {
    let resolveAi!: (assessment: typeof testAiAssessment) => void;
    requestComparisonAiMock.mockImplementation(
      () =>
        new Promise<typeof testAiAssessment>((resolve) => {
          resolveAi = resolve;
        })
    );
    const { t } = await renderPage();
    await openComparison(t);
    const comparedSql = 'SELECT id FROM orders;';
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL editor' }), {
      target: { value: comparedSql },
    });
    fireEvent.click(screen.getByRole('button', { name: t.comparisonRun }));
    await screen.findByTestId('sql-diff');
    fireEvent.click(screen.getByRole('button', { name: t.comparisonRequestAi }));
    await waitFor(() => expect(requestComparisonAiMock).toHaveBeenCalledOnce());

    fireEvent.change(screen.getByRole('textbox', { name: 'SQL editor' }), {
      target: { value: 'SELECT id, status FROM orders;' },
    });
    expect(requestComparisonAiMock.mock.calls[0][3].aborted).toBe(true);
    await act(async () =>
      resolveAi({ ...testAiAssessment, summary: 'This explanation belongs to the older SQL.' })
    );

    expect(await screen.findByText(t.comparisonStale)).toBeInTheDocument();
    expect(
      screen.queryByText('This explanation belongs to the older SQL.')
    ).not.toBeInTheDocument();
    expect(screen.getByText('WHERE clause changed.')).toBeInTheDocument();
  });
});
