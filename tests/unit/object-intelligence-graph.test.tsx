import React from 'react';
import { readFileSync } from 'node:fs';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import QueryInputPage from '@/app/query-input/page';
import { useAppStore } from '@/lib/store';
import { clearDemoAuthenticated } from '@/lib/demoAuth';
import { resetTestStorage, signInAsDemoUser } from '../utils/test-setup';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
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

beforeEach(async () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  resetTestStorage();
  await signInAsDemoUser();
  useAppStore.setState({
    settings: { ...useAppStore.getState().settings, locale: 'en' },
    dialect: 'mysql',
    inputMode: 'sql',
    objectSql: '',
    objectSqlOwner: null,
    objectSessionObjects: [],
    objectSessionOwner: null,
  });
});

afterEach(() => vi.unstubAllGlobals());
async function addViews() {
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  const editor = screen.getByRole('textbox', { name: 'Database object SQL' });
  fireEvent.change(editor, {
    target: { value: 'CREATE VIEW sales.base AS SELECT id FROM sales.employees;' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Add to session' }, { timeout: 30000 })
  );
  fireEvent.change(editor, {
    target: { value: 'CREATE VIEW sales.report AS SELECT id FROM sales.base;' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Add to session' }, { timeout: 30000 })
  );

  return within(screen.getByRole('region', { name: 'Object dependencies' }));
}

it('shows evidenced view dependencies for supplied objects', async () => {
  const graph = await addViews();
  expect(graph.getByText('sales.report → sales.base (read)')).toBeInTheDocument();
}, 60000);

it('shows reverse impact for a supplied object', async () => {
  const graph = await addViews();
  fireEvent.click(graph.getByRole('button', { name: 'Impact of sales.base' }));
  expect(graph.getByText('sales.report — direct dependent')).toBeInTheDocument();
}, 60000);

it('reports a dependency cycle after an explicit replacement', async () => {
  const graph = await addViews();
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: { value: 'CREATE VIEW sales.base AS SELECT id FROM sales.report;' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Add to session' }, { timeout: 30000 })
  );
  fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
  expect(graph.getByText('Dependency cycle detected.')).toBeInTheDocument();
}, 60000);

it('keeps the existing definition when a duplicate is declined', async () => {
  const graph = await addViews();
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: { value: 'CREATE VIEW sales.base AS SELECT id FROM sales.report;' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Add to session' }, { timeout: 30000 })
  );
  fireEvent.click(screen.getByRole('button', { name: 'Keep existing' }));
  expect(graph.queryByText('Dependency cycle detected.')).not.toBeInTheDocument();
  expect(graph.getByText('sales.report → sales.base (read)')).toBeInTheDocument();
}, 60000);

it('does not persist definitions and clears them when the session signs out', async () => {
  await addViews();
  expect(window.localStorage.getItem('sqlvisualizer-store')).not.toContain('CREATE VIEW');
  expect(useAppStore.getState().objectSessionObjects).toHaveLength(2);
  clearDemoAuthenticated();
  expect(useAppStore.getState().objectSessionObjects).toHaveLength(0);
});

it('resolves a view dependency against a supplied qualified table', async () => {
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  const editor = screen.getByRole('textbox', { name: 'Database object SQL' });
  fireEvent.change(editor, { target: { value: 'CREATE TABLE sales.employees (id INT);' } });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Add to session' }, { timeout: 30000 })
  );
  fireEvent.change(editor, {
    target: { value: 'CREATE VIEW sales.report AS SELECT id FROM sales.employees;' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Add to session' }, { timeout: 30000 })
  );
  const graph = within(screen.getByRole('region', { name: 'Object dependencies' }));
  expect(graph.getByText('sales.report → sales.employees (read)')).toBeInTheDocument();
}, 60000);

it('adds multiple pasted definitions to one dependency session', async () => {
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: {
      value:
        'CREATE TABLE sales.staff (id INT);\nCREATE VIEW sales.report AS SELECT id FROM sales.staff;',
    },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add pasted definitions' }));
  const graph = within(
    await screen.findByRole('region', { name: 'Object dependencies' }, { timeout: 30000 })
  );
  expect(graph.getByText('sales.report → sales.staff (read)')).toBeInTheDocument();
}, 60000);

it('resolves a duplicate batch transaction only after an explicit choice', async () => {
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  const editor = screen.getByRole('textbox', { name: 'Database object SQL' });
  fireEvent.change(editor, { target: { value: 'CREATE TABLE sales.staff (id INT);' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add pasted definitions' }));
  await screen.findByRole('region', { name: 'Object dependencies' }, { timeout: 30000 });
  const original = useAppStore.getState().objectSessionObjects;
  fireEvent.change(editor, {
    target: {
      value:
        'CREATE TABLE sales.staff (new_id INT); CREATE VIEW sales.report AS SELECT new_id FROM sales.staff;',
    },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add pasted definitions' }));
  const conflict = within(
    await screen.findByRole('group', { name: 'Batch duplicate' }, { timeout: 30000 })
  );
  expect(conflict.getByText('sales.staff')).toBeInTheDocument();
  expect(useAppStore.getState().objectSessionObjects).toBe(original);
  fireEvent.click(conflict.getByRole('button', { name: 'Cancel import' }));
  expect(useAppStore.getState().objectSessionObjects).toBe(original);
  fireEvent.click(screen.getByRole('button', { name: 'Add pasted definitions' }));
  const next = within(
    await screen.findByRole('group', { name: 'Batch duplicate' }, { timeout: 30000 })
  );
  fireEvent.click(next.getByRole('button', { name: 'Replace' }));
  expect(useAppStore.getState().objectSessionObjects).toHaveLength(2);
  expect(useAppStore.getState().objectSessionObjects[0].source).toContain('new_id');
  expect(
    within(screen.getByRole('region', { name: 'Object dependencies' })).getByText(
      'sales.report → sales.staff (read)'
    )
  ).toBeInTheDocument();
}, 60000);

it('imports multiple SQL files with original source provenance into one session', async () => {
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  const table = 'CREATE TABLE sales.staff (id INT);';
  const view = 'CREATE VIEW sales.report AS SELECT id FROM sales.staff;';
  const files = [
    Object.assign(new File([table], 'staff.sql'), { text: async () => table }),
    Object.assign(new File([view], 'report.sql'), { text: async () => view }),
  ];
  fireEvent.change(screen.getByLabelText('Import SQL files'), { target: { files } });
  const graph = within(
    await screen.findByRole('region', { name: 'Object dependencies' }, { timeout: 30000 })
  );
  expect(graph.getByText('sales.report → sales.staff (read)')).toBeInTheDocument();
  const objects = useAppStore.getState().objectSessionObjects;
  expect(objects.map((object) => object.sourceDocument?.label)).toEqual([
    'staff.sql',
    'report.sql',
  ]);
  for (const object of objects) {
    const document = object.sourceDocument;
    expect(document && document.text.slice(document.start, document.end)).toBe(object.source);
  }
}, 60000);

it('reports failed files without modifying existing definitions', async () => {
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  const good = 'CREATE TABLE sales.staff (id INT);';
  const input = screen.getByLabelText('Import SQL files');
  fireEvent.change(input, {
    target: { files: [Object.assign(new File([good], 'staff.sql'), { text: async () => good })] },
  });
  await screen.findByRole('region', { name: 'Object dependencies' }, { timeout: 30000 });
  const original = useAppStore.getState().objectSessionObjects;
  const broken = Object.assign(new File([], 'broken.sql'), {
    text: async () => {
      throw new Error('unreadable');
    },
  });
  const next = Object.assign(new File([good], 'other.sql'), { text: async () => good });
  fireEvent.change(input, { target: { files: [broken, next] } });
  expect(await screen.findByText('broken.sql')).toBeInTheDocument();
  expect(useAppStore.getState().objectSessionObjects).toBe(original);
}, 60000);

it('discards an in-flight file import after signing out and back in', async () => {
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  let resolveFile: (value: string) => void = () => {};
  const contents = new Promise<string>((resolve) => {
    resolveFile = resolve;
  });
  const file = Object.assign(new File([], 'staff.sql'), { text: () => contents });
  fireEvent.change(screen.getByLabelText('Import SQL files'), { target: { files: [file] } });
  clearDemoAuthenticated();
  await signInAsDemoUser();
  await act(async () => {
    resolveFile('CREATE TABLE sales.staff (id INT);');
  });
  await waitFor(() => expect(screen.getByLabelText('Import SQL files')).not.toBeDisabled(), {
    timeout: 30000,
  });
  expect(useAppStore.getState().objectSessionObjects).toHaveLength(0);
  expect(screen.queryByRole('region', { name: 'Object dependencies' })).not.toBeInTheDocument();
}, 60000);

it('rejects a mixed valid and unsupported batch without adding its valid definition', async () => {
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: { value: 'CREATE TABLE sales.staff (id INT); CREATE TABLE sales.invalid (' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add pasted definitions' }));
  expect(await screen.findByRole('alert', {}, { timeout: 30000 })).toHaveTextContent(
    'session was not changed'
  );
  expect(useAppStore.getState().objectSessionObjects).toHaveLength(0);
}, 60000);

it('keeps an existing duplicate while adding the remaining batch definitions', async () => {
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  const editor = screen.getByRole('textbox', { name: 'Database object SQL' });
  fireEvent.change(editor, { target: { value: 'CREATE TABLE sales.staff (id INT);' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add pasted definitions' }));
  await screen.findByRole('region', { name: 'Object dependencies' }, { timeout: 30000 });
  fireEvent.change(editor, {
    target: {
      value:
        'CREATE TABLE sales.staff (other INT); CREATE VIEW sales.report AS SELECT id FROM sales.staff;',
    },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add pasted definitions' }));
  const conflict = within(
    await screen.findByRole('group', { name: 'Batch duplicate' }, { timeout: 30000 })
  );
  fireEvent.click(conflict.getByRole('button', { name: 'Keep existing' }));
  expect(useAppStore.getState().objectSessionObjects).toHaveLength(2);
  expect(useAppStore.getState().objectSessionObjects[0].source).toContain('id INT');
  expect(useAppStore.getState().objectSessionObjects[0].source).not.toContain('other INT');
}, 60000);

it('adds PostgreSQL pasted table and view definitions to the dependency session', async () => {
  useAppStore.setState({ dialect: 'postgresql' });
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: {
      value:
        'CREATE TABLE sales.staff (id INT); CREATE VIEW sales.report AS SELECT id FROM sales.staff;',
    },
  });
  const action = screen.getByRole('button', { name: 'Add pasted definitions' });
  expect(action).toBeEnabled();
  fireEvent.click(action);
  const graph = within(
    await screen.findByRole('region', { name: 'Object dependencies' }, { timeout: 30000 })
  );
  expect(graph.getByText('sales.report → sales.staff (read)')).toBeInTheDocument();
}, 60000);

it('uses an explicitly entered default schema for unqualified batch definitions', async () => {
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  const source = 'CREATE TABLE employees (id INT); CREATE VIEW report AS SELECT id FROM employees;';
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: { value: source },
  });
  fireEvent.change(screen.getByLabelText('Default schema (optional)'), {
    target: { value: 'sales' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add pasted definitions' }));
  const graph = within(
    await screen.findByRole('region', { name: 'Object dependencies' }, { timeout: 30000 })
  );
  expect(
    graph.getByText('sales.report → sales.employees (read) — default schema assumption')
  ).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Database object SQL' })).toHaveValue(source);
}, 60000);

it('adds the supplied employees table with a user-entered default schema', async () => {
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  const source = readFileSync('src/sample/demo-create-table.sql', 'utf8');
  const editor = screen.getByRole('textbox', { name: 'Database object SQL' });
  fireEvent.change(editor, {
    target: { value: source },
  });
  fireEvent.change(screen.getByLabelText('Default schema (optional)'), {
    target: { value: 'sales' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add pasted definitions' }));
  await screen.findByRole('region', { name: 'Object dependencies' }, { timeout: 30000 });
  const object = useAppStore.getState().objectSessionObjects[0];
  expect(object.id).toBe('mysql:sales.employees');
  expect(object.assumedSchema).toBe(true);
  expect(object.sourceDocument?.text).toBe((editor as HTMLTextAreaElement).value);
}, 60000);

it('rejects an invalid default schema without changing the session', async () => {
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: { value: 'CREATE TABLE employees (id INT);' },
  });
  fireEvent.change(screen.getByLabelText('Default schema (optional)'), {
    target: { value: 'sales-invalid' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add pasted definitions' }));
  expect(await screen.findByRole('alert', {}, { timeout: 30000 })).toHaveTextContent(
    'session was not changed'
  );
  expect(useAppStore.getState().objectSessionObjects).toHaveLength(0);
}, 60000);

it('does not equate different object kinds with the same single-object name', async () => {
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  const editor = screen.getByRole('textbox', { name: 'Database object SQL' });
  fireEvent.change(editor, { target: { value: 'CREATE TABLE sales.shared (id INT);' } });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Add to session' }, { timeout: 30000 })
  );
  fireEvent.change(editor, {
    target: { value: 'CREATE VIEW sales.shared AS SELECT id FROM sales.staff;' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Add to session' }, { timeout: 30000 })
  );
  expect(screen.getByRole('alert')).toHaveTextContent('unambiguous');
  expect(useAppStore.getState().objectSessionObjects[0].kind).toBe('table');
}, 60000);

it('adds an analyzed SQL Server table with a qualified identity to the session', async () => {
  useAppStore.setState({ dialect: 'sqlserver' });
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: { value: 'CREATE TABLE sales.staff (id INT);' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Add to session' }, { timeout: 30000 }));
  expect(useAppStore.getState().objectSessionObjects.map((object) => object.id)).toEqual([
    'sqlserver:sales.staff',
  ]);
}, 60000);

it('adds an analyzed Oracle table with a qualified identity to the session', async () => {
  useAppStore.setState({ dialect: 'oracle' });
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: { value: 'CREATE TABLE sales.staff (id NUMBER);' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Add to session' }, { timeout: 30000 }));
  expect(useAppStore.getState().objectSessionObjects.map((object) => object.id)).toEqual([
    'oracle:sales.staff',
  ]);
}, 60000);
