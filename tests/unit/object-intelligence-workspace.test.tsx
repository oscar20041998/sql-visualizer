import { readFileSync } from 'node:fs';
import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import QueryInputPage from '@/app/query-input/page';
import { useAppStore } from '@/lib/store';
import { resetTestStorage, signInAsDemoUser } from '../utils/test-setup';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('@/components/AppLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/app/smart-sql-editor/components/SmartSQLEditor', () => ({
  default: () => null,
}));

vi.mock('@/app/smart-sql-editor/components/AiSqlExplainer', () => ({ default: () => null }));
vi.mock('@monaco-editor/react', () => ({ default: () => null }));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

beforeEach(async () => {
  resetTestStorage();
  await signInAsDemoUser();
  const { settings } = useAppStore.getState();
  useAppStore.setState({
    settings: { ...settings, locale: 'en' },
    dialect: 'mysql',
    inputMode: 'sql',
    rawSql: '',
    myBatisXml: '',
    resolvedSql: '',
    myBatisParams: {},
    analysisResult: null,
    isAnalyzing: false,
    pendingEditorJump: null,
  });
});

it('analyzes a view and shows its dialect, identity, query source and honest status', async () => {
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  const sql = 'CREATE VIEW active_orders AS SELECT id FROM orders WHERE status = 1;';
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: { value: sql },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));

  await waitFor(() => {
    const result = within(screen.getByRole('region', { name: 'Object analysis result' }));
    expect(result.getByText('active_orders')).toBeInTheDocument();
    expect(result.getByText('View')).toBeInTheDocument();
    expect(result.getByText('MySQL')).toBeInTheDocument();
    expect(result.getByText('Partial analysis')).toBeInTheDocument();
    expect(result.getByText(/SELECT id FROM orders WHERE status = 1/)).toBeInTheDocument();
    expect(result.getByText('orders')).toBeInTheDocument();
  });
});

it('shows the schema explicitly supplied in a qualified view definition', async () => {
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: { value: 'CREATE VIEW sales.active_orders AS SELECT id FROM orders;' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));

  const result = within(screen.getByRole('region', { name: 'Object analysis result' }));
  expect(await result.findByText('sales')).toBeInTheDocument();
});

it('shows explicitly declared view columns in the result', async () => {
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: {
      value: 'CREATE VIEW sales.v (order_id, order_status) AS SELECT id, status FROM orders;',
    },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));

  const result = within(screen.getByRole('region', { name: 'Object analysis result' }));
  expect(await result.findByText('order_id')).toBeInTheDocument();
  expect(result.getByText('order_status')).toBeInTheDocument();
});

it('explains why disputed view sources are unavailable without showing invented names', async () => {
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: { value: "CREATE VIEW v AS SELECT 'FROM ghost' AS note FROM orders;" },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));

  const result = within(screen.getByRole('region', { name: 'Object analysis result' }));
  expect(await result.findByText(/source detection disagreed/i)).toBeInTheDocument();
  expect(result.queryByText('ghost')).not.toBeInTheDocument();
  expect(result.queryByText('orders')).not.toBeInTheDocument();
});

it('shows a pasted MySQL CREATE TABLE with its schema and declared columns', async () => {
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: {
      value: 'CREATE TABLE shop.employees (id INT NOT NULL PRIMARY KEY, name VARCHAR(80));',
    },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
  const result = within(screen.getByRole('region', { name: 'Object analysis result' }));
  expect(await result.findByText('employees', {}, { timeout: 30000 })).toBeInTheDocument();
  expect(result.getByText('Table')).toBeInTheDocument();
  expect(result.getByText('shop')).toBeInTheDocument();
  expect(result.getByText('id — INT')).toBeInTheDocument();
  expect(result.getByText('name — VARCHAR(80)')).toBeInTheDocument();
  expect(result.getByText('Partial analysis')).toBeInTheDocument();
}, 40000);

it('shows a supported Oracle CREATE TABLE in the object workspace', async () => {
  useAppStore.setState({ dialect: 'oracle' });
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: { value: 'CREATE TABLE HR.employees (id NUMBER(10), name VARCHAR2(80));' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
  const result = within(screen.getByRole('region', { name: 'Object analysis result' }));
  expect(await result.findByText('employees', {}, { timeout: 30000 })).toBeInTheDocument();
  expect(result.getByText('HR')).toBeInTheDocument();
  expect(result.getByText('id — NUMBER(10)')).toBeInTheDocument();
  expect(result.getByText('name — VARCHAR2(80)')).toBeInTheDocument();
  expect(result.getByText('Partial analysis')).toBeInTheDocument();
}, 40000);

it('shows the sample employee table with its ENUM values in the workspace', async () => {
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: { value: readFileSync('src/sample/demo-create-table.sql', 'utf8') },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
  const result = within(screen.getByRole('region', { name: 'Object analysis result' }));
  expect(await result.findByText('employees', {}, { timeout: 30000 })).toBeInTheDocument();
  expect(result.getByText("gender — ENUM('MALE', 'FEMALE', 'OTHER')")).toBeInTheDocument();
  expect(result.getByText('salary — DECIMAL(15,2)')).toBeInTheDocument();
  expect(result.getByText('Partial analysis')).toBeInTheDocument();
}, 40000);
