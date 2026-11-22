import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import QueryInputPage from '@/app/query-input/page';
import { getT } from '@/lib/i18n';
import { setDemoAuthenticated } from '@/lib/demoAuth';
import { useAppStore } from '@/lib/store';
import { resetTestStorage, signInAsDemoUser } from '../utils/test-setup';

/**
 * Component tests for specs/008-query-input-ux (US1 — T010/T011).
 * The heavy editor/analysis surfaces are mocked so the tests observe the page
 * structure and interaction contract without booting Monaco or the analyzer.
 */
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
  default: () => <div data-testid="smart-editor" />,
}));

vi.mock('@/app/smart-sql-editor/components/AiSqlExplainer', () => ({ default: () => null }));

vi.mock('@monaco-editor/react', () => ({
  default: ({ value }: { value?: string }) => <pre data-testid="sql-preview">{value ?? ''}</pre>,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/lib/queryHistoryClient', () => ({
  saveQueryHistoryEntry: vi.fn().mockResolvedValue(null),
  updateQueryHistoryEmbedding: vi.fn().mockResolvedValue(undefined),
}));

const MYBATIS_XML = `<select id="findOrders">
  SELECT * FROM orders o
  INNER JOIN customers c ON o.customer_id = c.id
  WHERE o.customer_id = #{customerId}
    OR o.status = #{status}
</select>`;

const BASE_STATE = {
  rawSql: '',
  myBatisXml: '',
  resolvedSql: '',
  myBatisParams: {},
  inputMode: 'sql' as const,
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
  render(<QueryInputPage />);
  await screen.findByRole('heading', { level: 1, name: t.queryInputTitle });
  return t;
}

beforeEach(async () => {
  resetTestStorage();
  pushMock.mockClear();
  replaceMock.mockClear();
  await signInAsDemoUser();
});

describe('Query Input workflow hierarchy (specs/008-query-input-ux T010 / US1)', () => {
  it('analyzes entered SQL and stores its tables and join before opening the dashboard', async () => {
    const t = await renderPage();
    useAppStore.getState().setDialect('mysql');
    const sql = 'SELECT * FROM orders o INNER JOIN customers c ON o.customer_id = c.id';

    fireEvent.change(screen.getByPlaceholderText(/^Paste your SQL query here/), {
      target: { value: sql },
    });
    fireEvent.click(screen.getByRole('button', { name: t.analyzeButton }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/sql-metrics-dashboard'), {
      timeout: 15000,
    });
    const result = useAppStore.getState().analysisResult;
    expect(result?.tables).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'orders' }),
        expect.objectContaining({ name: 'customers' }),
      ])
    );
    expect(result?.joins).toHaveLength(1);
    expect(useAppStore.getState().rawSql).toBe(sql);
  });

  it('exposes the workflow sections and keeps the input → parameters → review → findings order', async () => {
    const t = await renderPage();
    useAppStore.setState({ myBatisXml: MYBATIS_XML, inputMode: 'import-xml' });
    await screen.findByRole('heading', { name: t.parametersTitle });
    // Findings only appear once the parameters resolve into the final SQL.
    await screen.findByRole('heading', { name: new RegExp(t.lintingAlertsTitle) });

    // Workflow guidance is part of the page header shell.
    const workflow = screen.getByRole('list', { name: t.workflowStepsLabel });
    expect(workflow).toBeInTheDocument();
    expect(workflow.textContent).toContain(t.workflowStepInput);
    expect(workflow.textContent).toContain(t.workflowStepConfigure);
    expect(workflow.textContent).toContain(t.workflowStepReview);
    expect(workflow.textContent).toContain(t.workflowStepAnalyze);

    const headingOrder = screen
      .getAllByRole('heading')
      .map((heading) => heading.textContent?.trim() ?? '');

    const inputIndex = headingOrder.findIndex((text) => text.includes(t.myBatisPanelTitle));
    const parametersIndex = headingOrder.findIndex((text) => text.includes(t.parametersTitle));
    const reviewIndex = headingOrder.findIndex((text) => text.includes(t.sqlResolved));
    const findingsIndex = headingOrder.findIndex((text) => text.includes(t.lintingAlertsTitle));

    expect(inputIndex).toBeGreaterThanOrEqual(0);
    expect(parametersIndex).toBeGreaterThan(inputIndex);
    expect(reviewIndex).toBeGreaterThan(parametersIndex);
    expect(findingsIndex).toBeGreaterThanOrEqual(0);

    // The resolved SQL area states that it is the final statement to analyze.
    expect(screen.getByText(t.previewHint)).toBeInTheDocument();
  });

  it('renders the primary action as the only dominant CTA and explains it', async () => {
    const t = await renderPage();

    const analyze = screen.getByRole('button', { name: t.analyzeButton });
    expect(analyze).toHaveAttribute('data-action', 'analyze');
    expect(analyze).toHaveAttribute('data-variant', 'primary');

    for (const label of [t.loadSample, t.clearButton]) {
      const secondary = screen.getByRole('button', { name: label });
      expect(secondary).toHaveAttribute('data-variant', 'secondary');
    }

    expect(screen.getByText(t.analyzeHint)).toBeInTheDocument();
  });

  it('keeps the secondary actions clickable while the primary action stays dominant', async () => {
    const t = await renderPage();

    fireEvent.click(screen.getByRole('button', { name: t.loadSample }));
    await waitFor(() => expect(useAppStore.getState().rawSql).toContain('WITH monthly_revenue'));

    fireEvent.click(screen.getByRole('button', { name: t.clearButton }));
    await waitFor(() => expect(useAppStore.getState().rawSql).toBe(''));

    // Loading and clearing must not promote a secondary action over Analyze.
    expect(screen.getByRole('button', { name: t.analyzeButton })).toHaveAttribute(
      'data-variant',
      'primary'
    );
  });
});

describe('Query Input tab navigation (specs/008-query-input-ux T011 / FR-004)', () => {
  it('marks the active input method through accessible tab semantics without relying on color alone', async () => {
    const t = await renderPage();

    const tablist = screen.getByRole('tablist', { name: t.inputMethodLabel });
    const tabs = screen.getAllByRole('tab');

    expect(tablist).toContainElement(tabs[0]);
    expect(tabs).toHaveLength(5);
    expect(screen.getByRole('tab', { name: t.tabPasteSQL })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tab', { name: t.tabImportMyBatis })).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('switches input modes without altering the underlying workflow', async () => {
    const t = await renderPage();

    fireEvent.click(screen.getByRole('tab', { name: t.tabImportMyBatis }));
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: t.tabImportMyBatis })).toHaveAttribute(
        'aria-selected',
        'true'
      )
    );
    expect(useAppStore.getState().inputMode).toBe('import-xml');
    expect(screen.getByText(t.myBatisDropTitle)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: t.tabSmartEditor }));
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: t.tabSmartEditor })).toHaveAttribute(
        'aria-selected',
        'true'
      )
    );
    expect(screen.getByTestId('smart-editor')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: t.tabPasteSQL }));
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: t.tabPasteSQL })).toHaveAttribute(
        'aria-selected',
        'true'
      )
    );
    expect(useAppStore.getState().inputMode).toBe('sql');
  });

  it('supports arrow-key navigation between input methods', async () => {
    const t = await renderPage();

    const activeTab = screen.getByRole('tab', { name: t.tabPasteSQL });
    expect(activeTab).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(activeTab, { key: 'ArrowRight' });

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: t.tabImportMyBatis })).toHaveAttribute(
        'aria-selected',
        'true'
      )
    );
    expect(screen.getByRole('tab', { name: t.tabImportMyBatis })).toHaveFocus();
  });

  it('keeps the dialect selector beside the tabs and applies a different dialect', async () => {
    useAppStore.getState().setDialect('mysql');
    const t = await renderPage();
    const tablist = screen.getByRole('tablist', { name: t.inputMethodLabel });
    const selector = screen.getByRole('button', { name: `${t.dialectLabel}: MySQL` });
    expect(tablist.parentElement).toContainElement(selector);
    fireEvent.click(selector);
    fireEvent.click(screen.getByRole('button', { name: /PostgreSQL/ }));
    expect(useAppStore.getState().dialect).toBe('postgresql');
  });
});

describe('Query Input locale parity (specs/008-query-input-ux T010 / FR-013)', () => {
  it('renders the Vietnamese workflow copy from the existing i18n resources', async () => {
    const t = await renderPage('vi');

    expect(screen.getByRole('heading', { level: 1, name: t.queryInputTitle })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: t.workflowStepsLabel })).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: t.inputMethodLabel })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.analyzeButton })).toBeInTheDocument();
    expect(getT('en').queryInputTitle).not.toBe(t.queryInputTitle);
  });
});

describe('Query Input desktop layout', () => {
  // Layout proportions are only observable as classes in jsdom, so this asserts the
  // workspace contract that keeps SQL readable (FR-012) instead of a rendered width.
  it('gives the input and resolved SQL equal width', async () => {
    const t = await renderPage();
    useAppStore.setState({ myBatisXml: MYBATIS_XML, inputMode: 'import-xml' });
    await screen.findByRole('heading', { name: t.parametersTitle });

    const workspace = document.querySelector('[class*="xl:grid-cols-12"]');
    const columns = workspace?.querySelectorAll('[class*="xl:col-span-6"]');

    expect(workspace).not.toBeNull();
    expect(columns).toHaveLength(2);
    expect(columns?.[1].className).toContain('xl:min-h-[560px]');

    const parametersPanel = screen
      .getByRole('heading', { name: t.parametersTitle })
      .closest('section');
    const parameterGrid = parametersPanel?.querySelector('[class*="grid-cols"]');
    expect(parameterGrid?.className).toContain('sm:grid-cols-2');
    expect(parameterGrid?.className).not.toContain('grid-cols-3');
  });

  it('shows the existing tips on demand beside the tabs without a permanent section', async () => {
    const t = await renderPage();
    const tablist = screen.getByRole('tablist', { name: t.inputMethodLabel });
    const tipsButton = screen.getByRole('button', { name: t.tipsTitle });
    const selector = screen.getByRole('button', { name: new RegExp(`^${t.dialectLabel}:`) });
    expect(tablist.parentElement).toContainElement(tipsButton);
    expect(tipsButton.parentElement?.parentElement).toContainElement(selector);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: t.tipsTitle })).not.toBeInTheDocument();

    fireEvent.focus(tipsButton);
    const tooltip = screen.getByRole('tooltip');
    for (const tip of [t.tipCTE, t.tipJoin, t.tipMyBatis, t.tipDialect]) {
      expect(tooltip).toHaveTextContent(tip);
    }
    expect(tipsButton).toHaveAttribute('aria-describedby', tooltip.id);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    fireEvent.click(tipsButton);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
