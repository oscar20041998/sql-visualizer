import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';

import QueryInputPage from '@/app/query-input/page';
import LintingAlerts from '@/components/ui/LintingAlerts';
import { getT } from '@/lib/i18n';
import { setDemoAuthenticated } from '@/lib/demoAuth';
import { useAppStore } from '@/lib/store';
import { resetTestStorage } from '../utils/test-setup';

/** Component tests for specs/008-query-input-ux (US3 — T024/T025). */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('@/components/AppLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/LoadingOverlay', () => ({
  default: ({ visible, title }: { visible: boolean; title?: string }) =>
    visible ? <div role="status">{title}</div> : null,
}));

vi.mock('@/components/ui/QueryHistoryPanel', () => ({ default: () => null }));
vi.mock('@/app/smart-sql-editor/components/SmartSQLEditor', () => ({ default: () => null }));
vi.mock('@/app/smart-sql-editor/components/AiSqlExplainer', () => ({ default: () => null }));
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, options }: { value?: string; options?: { readOnly?: boolean } }) => (
    <pre data-testid="sql-preview" data-readonly={String(options?.readOnly === true)}>
      {value ?? ''}
    </pre>
  ),
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const WARNING_SQL = "SELECT * FROM orders WHERE id = 1 OR status = 'open'";
const CLEAN_SQL = 'SELECT id, total_amount FROM orders';
const writeTextMock = vi.fn().mockResolvedValue(undefined);

function resetStore() {
  const { settings } = useAppStore.getState();
  useAppStore.setState({
    rawSql: '',
    myBatisXml: '',
    resolvedSql: '',
    myBatisParams: {},
    inputMode: 'sql',
    isAnalyzing: false,
    analysisResult: null,
    pendingEditorJump: null,
    settings: { ...settings, locale: 'en' },
  });
}

async function renderPage() {
  const t = getT('en');
  resetStore();
  render(<QueryInputPage />);
  await screen.findByRole('heading', { level: 1, name: t.queryInputTitle });
  return t;
}

beforeEach(() => {
  resetTestStorage();
  setDemoAuthenticated();
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText: writeTextMock },
    configurable: true,
  });
  writeTextMock.mockClear();
  vi.mocked(toast.error).mockClear();
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.warning).mockClear();
});

describe('Query Input resolved SQL review (specs/008-query-input-ux T024 / US3)', () => {
  it('treats the resolved SQL panel as the final statement to analyze', async () => {
    const t = await renderPage();
    useAppStore.setState({
      inputMode: 'import-xml',
      myBatisXml:
        '<select id="findOrder">SELECT id FROM orders WHERE customer_id = #{customerId}</select>',
    });

    const heading = await screen.findByRole('heading', { name: t.sqlResolved });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText(t.previewHint)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.previewCopyLabel })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('sql-preview').textContent).toContain('SELECT id FROM orders')
    );
  });

  it('shows a read-only review state for direct SQL input', async () => {
    const t = await renderPage();
    useAppStore.setState({ rawSql: CLEAN_SQL });

    // The preview mirrors the current SQL exactly and cannot be edited in place.
    await waitFor(() => expect(screen.getByTestId('sql-preview').textContent).toBe(CLEAN_SQL));
    expect(screen.getByTestId('sql-preview')).toHaveAttribute('data-readonly', 'true');
    expect(screen.getByRole('heading', { name: t.sqlReview })).toBeInTheDocument();
  });

  it('copies the resolved SQL to the clipboard and confirms it', async () => {
    const t = await renderPage();
    useAppStore.setState({ rawSql: WARNING_SQL });

    const copy = screen.getByRole('button', { name: t.previewCopyLabel });
    await waitFor(() => expect(copy).toBeEnabled());
    fireEvent.click(copy);

    await waitFor(() => expect(writeTextMock).toHaveBeenCalledWith(WARNING_SQL));
    expect(toast.success).toHaveBeenCalledWith(t.copied);
  });
});

describe('Query Input findings scanability (specs/008-query-input-ux T024 / FR-009, FR-010)', () => {
  it('scans findings by severity, summary and location without relying on color alone', async () => {
    const t = await renderPage();
    useAppStore.setState({ rawSql: WARNING_SQL });

    const findings = await screen.findByRole('region', {
      name: new RegExp(t.lintingAlertsTitle),
    });
    expect(findings).toBeInTheDocument();

    const severityLabels = screen.getAllByText(t.severityWarning);
    expect(severityLabels.length).toBeGreaterThan(0);

    const count = severityLabels.length;
    const countLabel =
      count === 1
        ? t.findingsWarningCountOne
        : t.findingsWarningCountOther.replace('{count}', String(count));
    expect(screen.getByText(countLabel)).toBeInTheDocument();

    expect(screen.getAllByText(new RegExp(`${t.lintingLocationLabel}:`)).length).toBeGreaterThan(0);
    expect(screen.getAllByText('SELECT_ALL').length).toBeGreaterThan(0);
  });

  it('keeps the dismiss behavior available for each finding', async () => {
    const t = await renderPage();
    useAppStore.setState({ rawSql: WARNING_SQL });

    const dismiss = await screen.findByRole('button', {
      name: `${t.dismissFinding}: SELECT_ALL`,
    });

    const warningsBefore = screen.getAllByText(t.severityWarning).length;
    fireEvent.click(dismiss);

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: `${t.dismissFinding}: SELECT_ALL` })).toBeNull()
    );
    expect(screen.getAllByText(t.severityWarning).length).toBeLessThan(warningsBefore);
  });
});

describe('Query Input findings detail (specs/008-query-input-ux T028 / A8)', () => {
  // The Query Input page renders the expanded findings list; this collapsible surface is the
  // shared linting alert used elsewhere (Smart SQL Editor) and is the seam where expand/collapse
  // is observable, so T028's "keep the existing expand/collapse behaviour" is asserted here.
  it('keeps the finding detail and its actions available behind the expand toggle', () => {
    const t = getT('en');
    resetStore();
    render(<LintingAlerts sql={WARNING_SQL} collapsible />);

    const toggle = screen.getByRole('button', { name: new RegExp(t.lintingAlertsTitle) });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    // Collapsed keeps the overview: the count is in the toggle, the details are not rendered.
    expect(screen.queryByText(t.severityWarning)).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByText(t.severityWarning).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(`${t.lintingLocationLabel}:`)).length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: new RegExp(`^${t.dismissFinding}:`) }).length
    ).toBeGreaterThan(0);
  });
});

describe('Query Input state messaging (specs/008-query-input-ux T025 / FR-011)', () => {
  it('explains the empty state instead of leaving the review area blank', async () => {
    const t = await renderPage();

    expect(screen.getByText(t.sqlEmpty)).toBeInTheDocument();
    expect(screen.getByText(t.previewEmptySqlHint)).toBeInTheDocument();
    expect(screen.queryByTestId('sql-preview')).not.toBeInTheDocument();
  });

  it('communicates the loading state and disables the primary action while analyzing', async () => {
    const t = await renderPage();
    useAppStore.setState({ isAnalyzing: true });

    await screen.findByRole('status');
    const analyze = screen.getByRole('button', { name: t.analyzing });
    expect(analyze).toBeDisabled();
    expect(analyze).toHaveAttribute('aria-busy', 'true');
  });

  it('reports a missing query through the message, not a stack trace', async () => {
    const t = await renderPage();

    fireEvent.click(screen.getByRole('button', { name: t.analyzeButton }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(t.emptyQueryError));
  });
});
