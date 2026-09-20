import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import QueryInputPage from '@/app/query-input/page';
import { getT } from '@/lib/i18n';
import { setDemoAuthenticated } from '@/lib/demoAuth';
import { useAppStore } from '@/lib/store';
import { resetTestStorage } from '../utils/test-setup';

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

beforeEach(() => {
  resetTestStorage();
  pushMock.mockClear();
  replaceMock.mockClear();
  setDemoAuthenticated();
});

describe('Query Input workflow hierarchy (specs/008-query-input-ux T010 / US1)', () => {
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
    expect(tabs).toHaveLength(4);
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

describe('Query Input desktop layout (specs/008-query-input-ux T015 / A10)', () => {
  // Layout proportions are only observable as classes in jsdom, so this asserts the
  // workspace contract that keeps SQL readable (FR-012) instead of a rendered width.
  it('gives the resolved SQL more width than the input and parameter column', async () => {
    const t = await renderPage();
    useAppStore.setState({ myBatisXml: MYBATIS_XML, inputMode: 'import-xml' });
    await screen.findByRole('heading', { name: t.parametersTitle });

    const workspace = document.querySelector('[class*="xl:grid-cols-12"]');
    const inputColumn = document.querySelector('[class*="xl:col-span-5"]');
    const sqlColumn = document.querySelector('[class*="xl:col-span-7"]');

    expect(workspace).not.toBeNull();
    expect(inputColumn).not.toBeNull();
    expect(sqlColumn).not.toBeNull();

    const inputSpan = Number(inputColumn?.className.match(/xl:col-span-(\d+)/)?.[1]);
    const sqlSpan = Number(sqlColumn?.className.match(/xl:col-span-(\d+)/)?.[1]);
    expect(sqlSpan).toBeGreaterThan(inputSpan);
    expect(sqlColumn?.className).toContain('xl:min-h-[560px]');

    const parametersPanel = screen
      .getByRole('heading', { name: t.parametersTitle })
      .closest('section');
    const parameterGrid = parametersPanel?.querySelector('[class*="grid-cols"]');
    expect(parameterGrid?.className).toContain('sm:grid-cols-2');
    expect(parameterGrid?.className).not.toContain('grid-cols-3');
  });
});
