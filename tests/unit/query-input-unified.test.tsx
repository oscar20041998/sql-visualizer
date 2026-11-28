import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import QueryInputPage from '@/app/query-input/page';
import { currentSessionOwner, clearDemoAuthenticated } from '@/lib/demoAuth';
import { useAppStore } from '@/lib/store';
import { resetTestStorage, signInAsDemoUser } from '../utils/test-setup';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock('@/components/AppLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/app/smart-sql-editor/components/SmartSQLEditor', () => ({ default: () => null }));
vi.mock('@/app/smart-sql-editor/components/AiSqlExplainer', () => ({ default: () => null }));
vi.mock('@monaco-editor/react', () => ({ default: () => null }));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/queryHistoryClient', () => ({
  saveQueryHistoryEntry: vi.fn().mockResolvedValue(null),
  updateQueryHistoryEmbedding: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(async () => {
  resetTestStorage();
  await signInAsDemoUser();
  pushMock.mockClear();
  const { settings } = useAppStore.getState();
  useAppStore.setState({
    settings: { ...settings, locale: 'en' },
    dialect: 'mysql',
    inputMode: 'sql',
    rawSql: '',
    unifiedSql: '',
    unifiedSqlOwner: null,
    objectSql: '',
    objectSqlOwner: null,
    objectSessionObjects: [],
    objectSessionOwner: null,
    myBatisXml: '',
    resolvedSql: '',
    myBatisParams: {},
    pendingEditorJump: null,
    isAnalyzing: false,
    analysisResult: null,
  });
});

it('opens the metrics dashboard for a query from the same editor', async () => {
  render(<QueryInputPage />);
  const editor = await screen.findByRole('textbox', { name: 'SQL input' });
  fireEvent.change(editor, { target: { value: 'SELECT id FROM orders;' } });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze SQL' }));

  await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/sql-metrics-dashboard'), {
    timeout: 30000,
  });
  expect(useAppStore.getState().rawSql).toBe('SELECT id FROM orders;');
}, 40000);

it('analyzes a database object from the shared editor without leaving the page', async () => {
  render(<QueryInputPage />);
  const editor = await screen.findByRole('textbox', { name: 'SQL input' });
  expect(screen.queryByRole('tab', { name: 'Database objects' })).not.toBeInTheDocument();
  fireEvent.change(editor, { target: { value: 'CREATE TABLE shop.employees (id INT, name VARCHAR(80));' } });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze SQL' }));

  const result = await screen.findByRole('region', { name: 'Object analysis result' });
  expect(await within(result).findByText('employees', {}, { timeout: 30000 })).toBeInTheDocument();
  expect(pushMock).not.toHaveBeenCalled();
}, 40000);

it('analyzes several tables and switches between merged schema details', async () => {
  render(<QueryInputPage />);
  const editor = await screen.findByRole('textbox', { name: 'SQL input' });
  const sql = `CREATE TABLE app.customers (id INT PRIMARY KEY);
CREATE TABLE app.orders (id INT PRIMARY KEY, customer_id INT);
ALTER TABLE app.orders ADD CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES app.customers(id);
CREATE INDEX idx_customer ON app.orders (customer_id);
ALTER TABLE app.orders DROP COLUMN id;`;
  fireEvent.change(editor, { target: { value: sql } });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze SQL' }));

  const result = within(await screen.findByRole('region', { name: 'Object analysis result' }, { timeout: 30000 }));
  const selector = await result.findByRole('combobox', { name: 'Choose a table' }, { timeout: 30000 });
  expect(result.getByText('customers')).toBeInTheDocument();
  fireEvent.change(selector, { target: { value: '1' } });
  expect(result.getByText('orders')).toBeInTheDocument();
  expect(result.getByText(/FOREIGN KEY fk_customer/)).toHaveTextContent('app.customers (id)');
  expect(result.getByText(/INDEX idx_customer/)).toBeInTheDocument();
  expect(result.getByRole('alert')).toHaveTextContent('ALTER TABLE app.orders DROP COLUMN id');
  expect(editor).toHaveValue(sql);
}, 60000);

it('clears the multi-table result after editing the SQL', async () => {
  render(<QueryInputPage />);
  const editor = await screen.findByRole('textbox', { name: 'SQL input' });
  fireEvent.change(editor, { target: { value: 'CREATE TABLE a (id INT); CREATE TABLE b (id INT);' } });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze SQL' }));
  await screen.findByRole('combobox', { name: 'Choose a table' }, { timeout: 30000 });
  fireEvent.change(editor, { target: { value: 'CREATE TABLE c (id INT);' } });
  expect(screen.queryByRole('combobox', { name: 'Choose a table' })).not.toBeInTheDocument();
}, 60000);

it('lets the user choose a statement from mixed SQL without changing the editor', async () => {
  render(<QueryInputPage />);
  const editor = await screen.findByRole('textbox', { name: 'SQL input' });
  const sql = 'SELECT id FROM orders; CREATE TABLE shop.employees (id INT);';
  fireEvent.change(editor, { target: { value: sql } });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze SQL' }));

  const choices = await screen.findByRole('group', { name: 'Choose a statement to analyze' }, { timeout: 30000 });
  fireEvent.click(within(choices).getByRole('button', { name: /Database object/ }));
  const result = await screen.findByRole('region', { name: 'Object analysis result' });
  expect(await within(result).findByText('employees', {}, { timeout: 30000 })).toBeInTheDocument();
  expect(editor).toHaveValue(sql);
}, 60000);

it('requires an explicit selection when SQL cannot be classified safely', async () => {
  render(<QueryInputPage />);
  const editor = await screen.findByRole('textbox', { name: 'SQL input' }) as HTMLTextAreaElement;
  const sql = 'UNKNOWN; CREATE TABLE shop.employees (id INT);';
  fireEvent.change(editor, { target: { value: sql } });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze SQL' }));
  const choices = await screen.findByRole('group', { name: 'Choose a statement to analyze' }, { timeout: 30000 });
  editor.setSelectionRange(sql.indexOf('CREATE'), sql.length);
  fireEvent.click(within(choices).getByRole('button', { name: 'Analyze as object' }));
  const result = await screen.findByRole('region', { name: 'Object analysis result' });
  expect(await within(result).findByText('employees', {}, { timeout: 30000 })).toBeInTheDocument();
  expect(editor).toHaveValue(sql);
}, 60000);

it('offers a choice between different existing drafts without discarding either', async () => {
  const owner = currentSessionOwner();
  useAppStore.setState({
    rawSql: 'SELECT * FROM orders;',
    objectSql: 'CREATE TABLE customers (id INT);',
    objectSqlOwner: owner,
  });
  render(<QueryInputPage />);

  fireEvent.click(await screen.findByRole('button', { name: 'Database object draft' }));
  expect(screen.getByRole('textbox', { name: 'SQL input' })).toHaveValue('CREATE TABLE customers (id INT);');
  expect(useAppStore.getState().rawSql).toBe('SELECT * FROM orders;');
  expect(useAppStore.getState().objectSql).toBe('CREATE TABLE customers (id INT);');
});

it('clears the shared draft when the signed-in identity changes', async () => {
  render(<QueryInputPage />);
  const editor = await screen.findByRole('textbox', { name: 'SQL input' });
  fireEvent.change(editor, { target: { value: 'CREATE TABLE private_data (id INT);' } });
  expect(useAppStore.getState().unifiedSql).toContain('private_data');

  clearDemoAuthenticated();
  await waitFor(() => expect(useAppStore.getState().unifiedSql).toBe(''));
  expect(useAppStore.getState().rawSql).toBe('');
});
