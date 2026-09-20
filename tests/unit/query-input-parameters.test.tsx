import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import QueryInputPage from '@/app/query-input/page';
import { getT } from '@/lib/i18n';
import { setDemoAuthenticated } from '@/lib/demoAuth';
import { useAppStore } from '@/lib/store';
import { resetTestStorage } from '../utils/test-setup';

/** Component tests for specs/008-query-input-ux (US2 — T017/T018). */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('@/components/AppLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/LoadingOverlay', () => ({ default: () => null }));
vi.mock('@/components/ui/QueryHistoryPanel', () => ({ default: () => null }));
vi.mock('@/app/smart-sql-editor/components/SmartSQLEditor', () => ({ default: () => null }));
vi.mock('@/app/smart-sql-editor/components/AiSqlExplainer', () => ({ default: () => null }));
vi.mock('@monaco-editor/react', () => ({
  default: ({ value }: { value?: string }) => <pre data-testid="sql-preview">{value ?? ''}</pre>,
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const LARGE_XML = `<select id="findOrders">
  SELECT o.id, o.total_amount, c.name
  FROM orders o
  INNER JOIN customers c ON o.customer_id = c.id
  WHERE o.customer_id = #{customerId}
    AND o.status = #{status}
    AND o.created_at >= #{startDate}
    AND o.created_at <= #{endDate}
    AND o.total_amount >= #{minAmount}
    AND o.region = #{region}
    AND o.channel = #{channel}
    AND o.currency = #{currency}
</select>`;

const SMALL_XML = `<select id="findOrder">
  SELECT o.id FROM orders o WHERE o.customer_id = #{customerId} AND o.status = #{status}
</select>`;

const CONDITIONAL_XML = `<select id="findOrders">
  SELECT o.id FROM orders o
  WHERE o.customer_id = #{customerId}
  <if test="minAmount != null">AND o.total_amount &gt;= #{minAmount}</if>
</select>`;

function resetStore() {
  const { settings } = useAppStore.getState();
  useAppStore.setState({
    rawSql: '',
    myBatisXml: '',
    resolvedSql: '',
    myBatisParams: {},
    inputMode: 'import-xml',
    isAnalyzing: false,
    analysisResult: null,
    pendingEditorJump: null,
    settings: { ...settings, locale: 'en' },
  });
}

async function renderWithXml(xml: string) {
  const t = getT('en');
  resetStore();
  useAppStore.setState({ myBatisXml: xml });
  render(<QueryInputPage />);
  await screen.findByRole('heading', { level: 1, name: t.queryInputTitle });
  await screen.findByText(t.parametersTitle);
  return t;
}

beforeEach(() => {
  resetTestStorage();
  setDemoAuthenticated();
});

describe('Query Input parameter clarity (specs/008-query-input-ux T017 / US2)', () => {
  it('labels every parameter field with the placeholder name and marks them as required to resolve SQL', async () => {
    const t = await renderWithXml(SMALL_XML);

    const customerInput = await screen.findByLabelText('#{customerId}');
    const statusInput = screen.getByLabelText('#{status}');

    expect(customerInput).toHaveAttribute('type', 'text');
    expect(customerInput).not.toBe(statusInput);
    // Values are placeholders until the developer resolves them for the final SQL.
    expect(screen.getAllByText(t.parametersRequiredHint).length).toBeGreaterThan(0);
  });

  it('shows the detected parameter count and the resolved SQL preview for the loaded XML', async () => {
    const t = await renderWithXml(SMALL_XML);

    expect(screen.getByText(new RegExp(`2\\s*${t.paramDetected}`))).toBeInTheDocument();
    expect(screen.getByText(t.sqlResolved)).toBeInTheDocument();
    expect(screen.getByTestId('sql-preview')).toBeInTheDocument();
  });

  it('does not add a search field when the parameter set is small', async () => {
    const t = await renderWithXml(SMALL_XML);

    expect(
      screen.queryByRole('searchbox', { name: t.parametersSearchLabel })
    ).not.toBeInTheDocument();
  });

  it('offers a search field for large parameter sets and filters without changing the entered values', async () => {
    const t = await renderWithXml(LARGE_XML);

    const search = await screen.findByRole('searchbox', { name: t.parametersSearchLabel });
    const customerField = screen.getByLabelText('#{customerId}');
    fireEvent.change(customerField, { target: { value: '42' } });
    await waitFor(() => expect(useAppStore.getState().myBatisParams.customerId).toBe('42'));
    expect(screen.getByLabelText('#{region}')).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'cust' } });

    await waitFor(() => expect(screen.queryByLabelText('#{region}')).not.toBeInTheDocument());
    // Filtering is a view concern: it must not drop the values already entered.
    expect(screen.getByLabelText('#{customerId}')).toHaveValue('42');
    expect(useAppStore.getState().myBatisParams.customerId).toBe('42');
    expect(screen.getByRole('heading', { name: t.sqlResolved })).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'no-such-parameter' } });
    await waitFor(() =>
      expect(
        screen.getByText(t.parametersEmptyMatch.replace('{query}', 'no-such-parameter'))
      ).toBeInTheDocument()
    );
  });

  it('keeps the conditional marker visible without replacing the parameter name or value', async () => {
    const t = await renderWithXml(CONDITIONAL_XML);

    const conditionalField = await screen.findByLabelText('#{minAmount}');
    expect(screen.getByText(t.conditionalLabel)).toBeInTheDocument();

    fireEvent.change(conditionalField, { target: { value: '100' } });

    expect(conditionalField).toHaveValue('100');
    expect(useAppStore.getState().myBatisParams.minAmount).toBe('100');
    // The marker is a sibling badge, so the field keeps its own accessible name.
    expect(screen.getByText(t.conditionalLabel).closest('label')).toBeNull();
  });
});

describe('Query Input parameter resolution (specs/008-query-input-ux T018 / FR-006, FR-007)', () => {
  it('propagates an edited parameter value to the resolved SQL preview', async () => {
    const t = await renderWithXml(SMALL_XML);

    const customerInput = await screen.findByLabelText('#{customerId}');
    fireEvent.change(customerInput, { target: { value: '42' } });

    await waitFor(() => {
      expect(screen.getByTestId('sql-preview').textContent).toContain("'42'");
    });
    expect(screen.getByTestId('sql-preview').textContent).not.toContain('#{customerId}');
    expect(useAppStore.getState().myBatisParams.customerId).toBe('42');
    expect(t.sqlResolved).toBeTruthy();
  });

  it('explains the empty parameter state instead of rendering nothing', async () => {
    const t = await renderWithXml('<select id="countAll">SELECT COUNT(*) FROM orders</select>');

    expect(await screen.findByText(t.parametersNoneTitle)).toBeInTheDocument();
    expect(screen.getByText(t.parametersNoneHint)).toBeInTheDocument();
  });
});
