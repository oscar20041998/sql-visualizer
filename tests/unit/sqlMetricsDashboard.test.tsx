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

  it('keeps the scoring fields behind the disclosure and reports the parser metadata that exists', () => {
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
    expect(container.textContent ?? '').toContain('111');
    expect(container.textContent ?? '').toContain('95');

    // Parser/analyzer metadata is reported from real data — the engine that produced these
    // numbers, its vocabulary size, and the extraction caps the run was subject to.
    expect(screen.getByText(t.analysisAdvancedParserMeta)).toBeInTheDocument();
    expect(screen.getByText(t.analysisAdvancedEngine)).toBeInTheDocument();
    expect(screen.getByText(t.analysisAdvancedDialect)).toBeInTheDocument();
    expect(screen.getByText(t.analysisAdvancedKeywords)).toBeInTheDocument();
    expect(screen.getByText(t.analysisAdvancedPatterns)).toBeInTheDocument();
    expect(screen.getByText(t.analysisAdvancedMaxColumns)).toBeInTheDocument();
    expect(container.textContent ?? '').toContain('regex');

    // The fixture's SQL has a real AST, so this section now reports measured structure facts
    // alongside the parser metadata instead of stating a gap (specs/016-ast-statistics).
    expect(screen.queryByText(t.analysisAdvancedAstUnavailable)).not.toBeInTheDocument();
    expect(screen.getByText(t.analysisAdvancedAst)).toBeInTheDocument();
    expect(screen.getByText(t.analysisAdvancedAstNodes)).toBeInTheDocument();
  });
});

/** specs/016-ast-statistics — real AST statistics in Advanced Details (A1, A3, A4, A6, U13–U16). */
describe('advanced details AST statistics (specs/016-ast-statistics)', () => {
  const SUPPORTED_SQL =
    'WITH recent AS (SELECT id, total FROM orders) SELECT id, SUM(total) AS s FROM recent WHERE total > 100 GROUP BY id';

  beforeEach(() => {
    resetTestStorage();
    analyzeSqlMock.mockReset();
  });

  function renderAdvanced(rawSql: string, dialect: string) {
    seedStore({
      analysisResult: makeAnalysisResult({ rawSql, dialect: dialect as 'mysql' }),
    });
    const rendered = render(<MetricsDashboardContent />);
    fireEvent.click(screen.getByText(t.analysisAdvancedTitle));
    return rendered;
  }

  it('shows real node, depth, operator and function counts for a parseable statement (A1, U13)', () => {
    const { container } = renderAdvanced(SUPPORTED_SQL, 'mysql');
    const text = container.textContent ?? '';

    // Counts are measured from the parsed AST, so the CTE and aggregate in this query are visible.
    expect(screen.getByText(t.analysisAdvancedAstNodes)).toBeInTheDocument();
    expect(screen.getByText(t.analysisAdvancedAstStatementKind)).toBeInTheDocument();
    expect(screen.getByText(t.analysisAdvancedAstCteCount)).toBeInTheDocument();
    expect(screen.getByText(t.analysisAdvancedAstSubqueryDepth)).toBeInTheDocument();
    expect(screen.getByText(t.analysisAdvancedAstOperators)).toBeInTheDocument();
    expect(screen.getByText(t.analysisAdvancedAstFunctions)).toBeInTheDocument();

    // 'select' statement kind and the real SUM occurrence come from the AST, not from prose.
    expect(text).toContain('select');
    expect(text).toMatch(/SUM\s*×\s*1/);
    // No gap is announced for a statement that did produce an AST.
    expect(screen.queryByText(t.analysisAdvancedAstUnavailable)).not.toBeInTheDocument();
  });

  it('stays usable and omits every AST row for a dialect without a grammar (A3, FR-006, U13)', () => {
    renderAdvanced('SELECT id FROM dual', 'oracle');

    // The rest of the dashboard is untouched...
    expect(screen.getByText(t.analysisAdvancedEngine)).toBeInTheDocument();
    expect(screen.getByText(t.analysisAdvancedTitle)).toBeInTheDocument();
    // ...the gap is stated honestly...
    expect(screen.getByText(t.analysisAdvancedAstUnavailable)).toBeInTheDocument();
    // ...and no statistic row is rendered as a zero or an estimate.
    expect(screen.queryByText(t.analysisAdvancedAstNodes)).not.toBeInTheDocument();
    expect(screen.queryByText(t.analysisAdvancedAstFunctions)).not.toBeInTheDocument();
    expect(screen.queryByText(t.analysisAdvancedAstCteCount)).not.toBeInTheDocument();
  });

  it('keeps the dashboard intact for SQL the strict parser rejects but regex analysis accepts (A3, FR-004)', () => {
    renderAdvanced('SELECT FROM WHERE', 'mysql');

    expect(screen.getByText(t.analysisAdvancedEngine)).toBeInTheDocument();
    expect(screen.getByText(t.analysisAdvancedAstUnavailable)).toBeInTheDocument();
    expect(screen.queryByText(t.analysisAdvancedAstNodes)).not.toBeInTheDocument();
  });

  it('describes the resolved SQL rather than the MyBatis XML (U15, I3)', () => {
    // MyBatis analysis runs on parameter-resolved SQL, and that is what reaches the dashboard.
    const { container } = renderAdvanced('SELECT id FROM orders WHERE id = 7', 'mysql');

    expect(container.textContent ?? '').toMatch(/SUM|select/);
    expect(container.textContent ?? '').not.toContain('<mapper');
  });

  it('does not retain statistics from the previously analysed statement (U16)', () => {
    const { container, rerender } = renderAdvanced(SUPPORTED_SQL, 'mysql');
    expect(screen.getByText(t.analysisAdvancedAstNodes)).toBeInTheDocument();
    const withStats = container.textContent ?? '';

    // Re-analysing as Oracle must discard the previous statement's statistics entirely.
    seedStore({
      analysisResult: makeAnalysisResult({ rawSql: 'SELECT id FROM dual', dialect: 'oracle' }),
    });
    rerender(<MetricsDashboardContent />);

    expect(screen.queryByText(t.analysisAdvancedAstNodes)).not.toBeInTheDocument();
    expect(screen.getByText(t.analysisAdvancedAstUnavailable)).toBeInTheDocument();
    expect(withStats).not.toBe('');
  });

  it('exposes every AST label in both English and Vietnamese (A6, U14, FR-008)', () => {
    renderAdvanced(SUPPORTED_SQL, 'mysql');

    const en = getT('en');
    const vi = getT('vi');

    // Every AST-related key must exist, be non-empty and differ between the two locales
    // (SC-012 parity).
    const astKeys = (Object.keys(en) as Array<keyof typeof en>).filter((key) =>
      String(key).startsWith('analysisAdvancedAst')
    );
    expect(astKeys.length).toBeGreaterThan(0);

    astKeys.forEach((key) => {
      expect(en[key], `en value for ${String(key)}`).toBeTruthy();
      expect(vi[key], `vi value for ${String(key)}`).toBeTruthy();
      // Genuinely translated, not an English copy.
      expect(vi[key], `vi translation for ${String(key)}`).not.toBe(en[key]);
    });
  });
});
