import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import MetricsDashboardContent from '@/app/sql-metrics-dashboard/components/MetricsDashboardContent';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import { makeAnalysisResult, makeDetailedComplexity } from '../utils/dashboardFixtures';
import { resetTestStorage } from '../utils/test-setup';

/** specs/010-sql-intelligence-dashboard T014 — U27, U29, A1..A4 (US1 / FR-001, FR-002, FR-003, FR-016). */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const analyzeSqlMock = vi.fn();
vi.mock('@/lib/sql/sqlAnalyzer', async (importOriginal: () => Promise<Record<string, unknown>>) => {
  const actual = await importOriginal();
  return { ...actual, analyzeSql: (...args: unknown[]) => analyzeSqlMock(...args) };
});

const t = getT('en');

function seedStore(overrides: Record<string, unknown> = {}) {
  useAppStore.setState({
    analysisResult: null,
    isAnalyzing: false,
    analysisError: null,
    rawSql: '',
    resolvedSql: '',
    inputMode: 'sql',
    dialect: 'mysql',
    ...overrides,
  });
}

describe('dashboard health summary (specs/010-sql-intelligence-dashboard T014 / U29, A1)', () => {
  beforeEach(() => {
    resetTestStorage();
    analyzeSqlMock.mockReset();
  });

  it('shows exactly one normalized score as X / 100 with a level label and error/warning counts (A1)', () => {
    seedStore({ analysisResult: makeAnalysisResult() });
    render(<MetricsDashboardContent />);

    const health = screen.getByText(t.analysisHealthTitle).closest('section');
    const healthText = health?.textContent ?? '';

    expect(healthText).toMatch(/51\s*\/\s*100/);
    expect(healthText).toContain(t.complexityMedium);
    expect(healthText).toContain(`${t.analysisFindingErrors}: 1`);
    expect(healthText).toContain(`${t.analysisFindingWarnings}: 2`);
    // Exactly one normalized score: no second raw/denominator figure in the summary.
    expect(healthText).not.toContain('111');
    expect(healthText).not.toContain('95');
  });

  it('keeps every raw or intermediate score value out of the primary health view (A2, primary clause)', () => {
    seedStore({ analysisResult: makeAnalysisResult() });
    const { container } = render(<MetricsDashboardContent />);

    const health = screen.getByText(t.analysisHealthTitle).closest('section');
    expect(health).not.toBeNull();
    const healthText = health?.textContent ?? '';
    expect(healthText).not.toContain('111');
    expect(healthText).not.toContain('95');
    expect(healthText).not.toMatch(/% of max/);
    // The legacy raw-score display strings are gone from the whole page.
    expect(container.textContent ?? '').not.toMatch(/% of max/);
  });

  it('never fabricates risk or maintainability scores (A3, U29)', () => {
    seedStore({ analysisResult: makeAnalysisResult() });
    render(<MetricsDashboardContent />);

    const health = screen.getByText(t.analysisHealthTitle).closest('section');
    const healthText = health?.textContent ?? '';
    expect(healthText).not.toMatch(/risk/i);
    expect(healthText).not.toMatch(/maintainab/i);
  });

  it('refreshes in place when a new analysis result arrives, with no reload (A4)', () => {
    seedStore({ analysisResult: makeAnalysisResult() });
    render(<MetricsDashboardContent />);
    expect(screen.getByText(t.analysisHealthTitle).closest('section')?.textContent).toMatch(
      /51\s*\/\s*100/
    );

    act(() => {
      useAppStore.setState({
        analysisResult: makeAnalysisResult({
          detailedComplexity: makeDetailedComplexity({
            normalizedScore: 88,
            normalizedLevel: 'SUPER_HIGH',
          }),
        }),
      });
    });

    const healthText =
      screen.getByText(t.analysisHealthTitle).closest('section')?.textContent ?? '';
    expect(healthText).toMatch(/88\s*\/\s*100/);
    expect(healthText).toContain(t.complexitySuperHigh);
    expect(healthText).not.toMatch(/51\s*\/\s*100/);
  });
});

describe('dashboard states (specs/010-sql-intelligence-dashboard T014 / U27)', () => {
  beforeEach(() => {
    resetTestStorage();
    analyzeSqlMock.mockReset();
  });

  it('renders skeletons with no metric values while analysis runs', () => {
    seedStore({ analysisResult: makeAnalysisResult(), isAnalyzing: true });
    const { container } = render(<MetricsDashboardContent />);

    expect(screen.getByText(t.analysisLoadingTitle)).toBeInTheDocument();
    expect(container.textContent ?? '').not.toContain('51');
    expect(container.textContent ?? '').not.toMatch(/% of max/);
  });

  it('shows the failure message and re-runs the analysis of the current SQL on retry (A4/FR-016)', async () => {
    const retried = makeAnalysisResult({
      detailedComplexity: makeDetailedComplexity({ normalizedScore: 77, normalizedLevel: 'HIGH' }),
    });
    analyzeSqlMock.mockResolvedValue(retried);
    seedStore({ analysisError: 'boom', rawSql: 'SELECT 1', dialect: 'mysql' });

    render(<MetricsDashboardContent />);
    expect(screen.getByText(t.analysisErrorTitle)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: t.analysisRetry }));

    await waitFor(() => expect(analyzeSqlMock).toHaveBeenCalledWith('SELECT 1', 'mysql', 'en'));
    await waitFor(() => expect(useAppStore.getState().analysisResult).toBe(retried));
  });

  it('records the failure when the retried analysis rejects, staying in the error state', async () => {
    analyzeSqlMock.mockRejectedValue(new Error('parser exploded'));
    seedStore({ analysisError: 'first failure', rawSql: 'SELECT 1', dialect: 'mysql' });

    render(<MetricsDashboardContent />);
    fireEvent.click(screen.getByRole('button', { name: t.analysisRetry }));

    await waitFor(() => expect(useAppStore.getState().analysisError).toBe('parser exploded'));
    expect(useAppStore.getState().isAnalyzing).toBe(false);
  });

  it('re-runs the resolved MyBatis SQL rather than stale raw SQL (FR-016)', async () => {
    analyzeSqlMock.mockResolvedValue(makeAnalysisResult());
    seedStore({
      analysisError: 'boom',
      inputMode: 'mybatis',
      rawSql: 'SELECT stale FROM previous_session',
      resolvedSql: 'SELECT * FROM orders WHERE id = 1',
    });

    render(<MetricsDashboardContent />);
    fireEvent.click(screen.getByRole('button', { name: t.analysisRetry }));

    await waitFor(() =>
      expect(analyzeSqlMock).toHaveBeenCalledWith(
        'SELECT * FROM orders WHERE id = 1',
        'mysql',
        'en'
      )
    );
  });

  it('does not offer a retry that would re-analyse SQL the dashboard does not have (FR-003, FR-016)', () => {
    // smart-editor analyses keep their SQL in the editor, not in the store: a retry here would
    // re-analyse an empty string and fabricate an empty result.
    seedStore({ analysisError: 'boom', inputMode: 'smart-editor', rawSql: '', resolvedSql: '' });
    render(<MetricsDashboardContent />);

    expect(screen.getByRole('button', { name: t.analysisRetry })).toBeDisabled();
  });

  it('shows the new result instead of a stale failure once a successful analysis arrives (A4, FR-016)', () => {
    seedStore({ analysisError: 'earlier failure' });

    act(() => {
      useAppStore.getState().setAnalysisResult(makeAnalysisResult());
    });
    render(<MetricsDashboardContent />);

    expect(screen.queryByText(t.analysisErrorTitle)).not.toBeInTheDocument();
    expect(screen.getByText(t.analysisHealthTitle)).toBeInTheDocument();
  });
});

describe('advanced details disclosure (specs/010-sql-intelligence-dashboard T014 / A2, FR-027)', () => {
  beforeEach(() => {
    resetTestStorage();
    analyzeSqlMock.mockReset();
  });

  it('keeps the raw score, dynamic denominator, share and rule ids behind the disclosure and states what is unavailable', () => {
    seedStore({ analysisResult: makeAnalysisResult() });
    const { container } = render(<MetricsDashboardContent />);

    // Progressive disclosure: collapsed by default, expanded by activating the summary.
    const details = container.querySelector('details') as HTMLDetailsElement | null;
    expect(details).not.toBeNull();
    expect(details?.open).toBe(false);

    fireEvent.click(screen.getByText(t.analysisAdvancedTitle));
    expect((container.querySelector('details') as HTMLDetailsElement).open).toBe(true);

    expect(screen.getByText(t.analysisAdvancedRawScore)).toBeInTheDocument();
    expect(screen.getByText(t.analysisAdvancedDenominator)).toBeInTheDocument();
    expect(screen.getByText(t.analysisAdvancedRuleIds)).toBeInTheDocument();
    expect(screen.getByText(t.analysisAdvancedUnavailable)).toBeInTheDocument();
    expect(container.textContent ?? '').toContain('111');
    expect(container.textContent ?? '').toContain('95');
  });
});
