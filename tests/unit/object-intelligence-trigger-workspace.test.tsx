import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import QueryInputPage from '@/app/query-input/page';
import { useAppStore } from '@/lib/store';
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
  resetTestStorage();
  await signInAsDemoUser();
  useAppStore.setState({
    settings: { ...useAppStore.getState().settings, locale: 'en' },
    dialect: 'mysql',
    inputMode: 'sql',
    objectSql: '',
    objectSqlOwner: null,
  });
});

it('shows evidenced metadata and the body of a simple MySQL trigger as partial', async () => {
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: {
      value:
        'CREATE TRIGGER before_employee_insert\nBEFORE INSERT ON employees\nFOR EACH ROW\nSET NEW.created_at = NOW();',
    },
  });

  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));

  const result = within(screen.getByRole('region', { name: 'Object analysis result' }));
  expect(
    await result.findByText('before_employee_insert', {}, { timeout: 30000 })
  ).toBeInTheDocument();
  expect(result.getByText('Trigger')).toBeInTheDocument();
  expect(result.getByText('BEFORE')).toBeInTheDocument();
  expect(result.getByText('INSERT')).toBeInTheDocument();
  expect(result.getByText('employees')).toBeInTheDocument();
  expect(result.getByText('SET NEW.created_at = NOW()')).toBeInTheDocument();
  expect(result.getByText('Partial analysis')).toBeInTheDocument();
});

it('shows a MySQL procedure with its declared parameters and body as partial', async () => {
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: {
      value:
        'CREATE PROCEDURE list_employees(IN department_id INT)\nBEGIN\n  SELECT * FROM employees WHERE dept_id = department_id;\nEND;',
    },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));

  const result = within(screen.getByRole('region', { name: 'Object analysis result' }));
  expect(await result.findByText('list_employees', {}, { timeout: 30000 })).toBeInTheDocument();
  expect(result.getByText('Procedure')).toBeInTheDocument();
  expect(result.getByText('IN department_id INT')).toBeInTheDocument();
  expect(
    result.getByText('BEGIN\n  SELECT * FROM employees WHERE dept_id = department_id;\nEND', {
      normalizer: (text) => text,
    })
  ).toBeInTheDocument();
  expect(result.getByText('Partial analysis')).toBeInTheDocument();
}, 40000);

it('shows a MySQL function with its parameters, return type and body', async () => {
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: {
      value:
        'CREATE FUNCTION total_with_tax(amount DECIMAL(10,2)) RETURNS DECIMAL(10,2) DETERMINISTIC RETURN amount * 1.1;',
    },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
  const result = within(screen.getByRole('region', { name: 'Object analysis result' }));
  expect(await result.findByText('total_with_tax', {}, { timeout: 30000 })).toBeInTheDocument();
  expect(result.getByText('Function')).toBeInTheDocument();
  expect(result.getByText('amount DECIMAL(10,2)')).toBeInTheDocument();
  expect(result.getByText('DECIMAL(10,2)')).toBeInTheDocument();
  expect(result.getByText('RETURN amount * 1.1')).toBeInTheDocument();
  expect(result.getByText('Partial analysis')).toBeInTheDocument();
}, 40000);

it('shows a PostgreSQL SQL function with parser-backed metadata and body as partial', async () => {
  useAppStore.setState({ dialect: 'postgresql' });
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: {
      value:
        'CREATE FUNCTION sales.add_tax(amount numeric) RETURNS numeric LANGUAGE sql AS $$ SELECT amount * 1.1; $$;',
    },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
  const result = within(screen.getByRole('region', { name: 'Object analysis result' }));
  expect(await result.findByText('sales.add_tax', {}, { timeout: 30000 })).toBeInTheDocument();
  expect(result.getByText('amount numeric')).toBeInTheDocument();
  expect(result.getByText('numeric')).toBeInTheDocument();
  expect(result.getByText('$$ SELECT amount * 1.1; $$')).toBeInTheDocument();
  expect(result.getByText('Partial analysis')).toBeInTheDocument();
  expect(result.getByText(/PostgreSQL routine bodies are not analyzed/i)).toBeInTheDocument();
}, 60000);

it('allows inspecting a direct query in a MySQL function body', async () => {
  const sql =
    'CREATE FUNCTION count_employees(p_id INT) RETURNS INT READS SQL DATA\n' +
    'BEGIN\n  SELECT COUNT(*) INTO @n FROM employees;\n  RETURN @n;\nEND;';
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  const editor = screen.getByRole('textbox', { name: 'Database object SQL' });
  fireEvent.change(editor, { target: { value: sql } });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
  const result = within(screen.getByRole('region', { name: 'Object analysis result' }));
  fireEvent.click(await result.findByRole('button', { name: 'Statement 1' }, { timeout: 30000 }));
  expect(result.getByText('SELECT COUNT(*) INTO @n FROM employees')).toBeInTheDocument();
  expect(result.getByText(/some body structures are not analyzed/i)).toBeInTheDocument();
  fireEvent.click(result.getByRole('button', { name: 'Show in source' }));
  expect(editor).toHaveProperty('selectionStart', sql.indexOf('SELECT'));
  expect(editor).toHaveProperty('selectionEnd', sql.indexOf(';'));
}, 40000);

it('allows selecting a procedure query and inspecting its source and detected tables', async () => {
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: {
      value:
        'CREATE PROCEDURE list_data()\nBEGIN\n  SELECT id FROM employees;\n  SELECT id FROM departments;\nEND;',
    },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
  const result = within(screen.getByRole('region', { name: 'Object analysis result' }));
  const query = await result.findByRole('button', { name: 'Statement 2' }, { timeout: 30000 });
  fireEvent.click(query);
  expect(result.getByText('SELECT id FROM departments')).toBeInTheDocument();
  expect(await result.findByText('departments')).toBeInTheDocument();
  expect(result.getByText(/line 4, column 3/i)).toBeInTheDocument();
}, 40000);

it('reveals the selected statement in the original SQL input', async () => {
  const sql = 'CREATE PROCEDURE p()\nBEGIN\n  SELECT id FROM employees;\nEND;';
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  const editor = screen.getByRole('textbox', { name: 'Database object SQL' });
  fireEvent.change(editor, { target: { value: sql } });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
  const result = within(screen.getByRole('region', { name: 'Object analysis result' }));
  fireEvent.click(await result.findByRole('button', { name: 'Statement 1' }, { timeout: 30000 }));
  fireEvent.click(result.getByRole('button', { name: 'Show in source' }));
  expect(editor).toHaveFocus();
  expect(editor).toHaveProperty('selectionStart', sql.indexOf('SELECT'));
  expect(editor).toHaveProperty('selectionEnd', sql.indexOf(';'));
}, 40000);

it('marks a trigger body with unsupported statements as incomplete while exposing its direct query', async () => {
  const sql =
    'CREATE TRIGGER t BEFORE INSERT ON employees FOR EACH ROW BEGIN SET @x = 1; SELECT id INTO @x FROM departments; END;';
  render(<QueryInputPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Database objects' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: { value: sql },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
  const result = within(screen.getByRole('region', { name: 'Object analysis result' }));
  fireEvent.click(await result.findByRole('button', { name: 'Statement 1' }, { timeout: 30000 }));
  expect(result.getByText(/some body structures are not analyzed/i)).toBeInTheDocument();
  expect(result.getByText('SELECT id INTO @x FROM departments')).toBeInTheDocument();
}, 40000);
