import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import QueryInputPage from '@/app/query-input/page';
import { getT } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { resetTestStorage, signInAsDemoUser } from '../utils/test-setup';

const push = vi.fn();
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace, prefetch: vi.fn() }),
}));

vi.mock('@/components/AppLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/LoadingOverlay', () => ({
  default: ({ visible, title }: { visible: boolean; title?: string }) =>
    visible ? <div role="status">{title}</div> : null,
}));

vi.mock('@/components/ui/QueryHistoryPanel', () => ({ default: () => null }));
vi.mock('@/app/smart-sql-editor/components/SmartSQLEditor', () => ({
  default: () => <div data-testid="smart-editor" />,
}));
vi.mock('@/app/smart-sql-editor/components/AiSqlExplainer', () => ({ default: () => null }));
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, options, language }: { value?: string; options?: { ariaLabel?: string }; language?: string }) => (
    <pre role="textbox" aria-label={options?.ariaLabel} data-language={language}>
      {value ?? ''}
    </pre>
  ),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

const INITIAL_STATE = {
  rawSql: '',
  myBatisXml: '',
  codeGeneratorSql: '',
  codeGeneratorInitialSql: null,
  resolvedSql: '',
  myBatisParams: {},
  inputMode: 'sql' as const,
  isAnalyzing: false,
  analysisResult: null,
  pendingEditorJump: null,
};

beforeEach(async () => {
  resetTestStorage();
  push.mockClear();
  replace.mockClear();
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
  const { settings } = useAppStore.getState();
  useAppStore.setState({ ...INITIAL_STATE, settings: { ...settings, locale: 'en' } });
  await signInAsDemoUser();
});

describe('SQL to Code Generator acceptance', () => {
  it('prefills generator SQL from the active SQL input on first entry', async () => {
    const sourceSql = 'SELECT customer_id, email FROM customers';
    useAppStore.setState({ rawSql: sourceSql });
    render(<QueryInputPage />);
    await screen.findByRole('heading', { level: 1, name: getT('en').queryInputTitle });

    fireEvent.click(screen.getByRole('tab', { name: 'SQL → Code Generator' }));

    expect(screen.getByRole('textbox', { name: 'SQL for code generation' })).toHaveValue(sourceSql);
    expect(useAppStore.getState().rawSql).toBe(sourceSql);
  });

  it('generates a JPA entity using Java conventions', async () => {
    render(<QueryInputPage />);
    await screen.findByRole('heading', { level: 1, name: getT('en').queryInputTitle });

    fireEvent.click(screen.getByRole('tab', { name: 'SQL → Code Generator' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL for code generation' }), {
      target: {
        value:
          'CREATE TABLE users (id BIGINT NOT NULL PRIMARY KEY, display_name VARCHAR(80) NOT NULL);',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    const preview = await screen.findByRole('textbox', { name: 'Generated Java code' });
    expect(preview).toHaveTextContent('@Entity');
    expect(preview).toHaveTextContent('@Table(name = "users")');
    expect(preview).toHaveTextContent('@Id');
    expect(preview).toHaveTextContent('private String displayName;');
  });

  it('keeps generator input separate from SQL and MyBatis drafts', async () => {
    useAppStore.setState({
      rawSql: 'SELECT existing_sql FROM users',
      myBatisXml: '<select id="existing">SELECT existing_xml FROM users</select>',
    });
    render(<QueryInputPage />);
    await screen.findByRole('heading', { level: 1, name: getT('en').queryInputTitle });

    fireEvent.click(screen.getByRole('tab', { name: 'SQL → Code Generator' }));
    const generatorSql = 'CREATE TABLE generated (id BIGINT PRIMARY KEY)';
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL for code generation' }), {
      target: { value: generatorSql },
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Paste SQL Direct' }));
    fireEvent.click(screen.getByRole('tab', { name: 'SQL → Code Generator' }));
    expect(screen.getByRole('textbox', { name: 'SQL for code generation' })).toHaveValue(generatorSql);

    expect(useAppStore.getState().rawSql).toBe('SELECT existing_sql FROM users');
    expect(useAppStore.getState().myBatisXml).toBe(
      '<select id="existing">SELECT existing_xml FROM users</select>'
    );
  });

  it('preserves nullable columns', async () => {
    render(<QueryInputPage />);
    await screen.findByRole('heading', { level: 1, name: getT('en').queryInputTitle });

    fireEvent.click(screen.getByRole('tab', { name: 'SQL → Code Generator' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL for code generation' }), {
      target: {
        value: 'CREATE TABLE users (id BIGINT NOT NULL PRIMARY KEY, nickname VARCHAR(50) NULL)',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    expect(await screen.findByRole('textbox', { name: 'Generated Java code' })).toHaveTextContent(
      '@Column(name = "nickname", nullable = true, length = 50)'
    );
  });

  it('warns about inferred relationship cardinality', async () => {
    render(<QueryInputPage />);
    await screen.findByRole('heading', { level: 1, name: getT('en').queryInputTitle });

    fireEvent.click(screen.getByRole('tab', { name: 'SQL → Code Generator' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL for code generation' }), {
      target: {
        value:
          'CREATE TABLE orders (id BIGINT NOT NULL, customer_id BIGINT NOT NULL, CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id), PRIMARY KEY (id))',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    const preview = await screen.findByRole('textbox', { name: 'Generated Java code' });
    expect(preview).toHaveTextContent('@ManyToOne');
    expect(preview).toHaveTextContent('@JoinColumn(name = "customer_id")');
    expect(screen.getByRole('region', { name: 'Generation diagnostics' })).toHaveTextContent(
      /cardinality/i
    );
  });

  it('blocks invalid SQL with a location-specific diagnostic', async () => {
    render(<QueryInputPage />);
    await screen.findByRole('heading', { level: 1, name: getT('en').queryInputTitle });

    fireEvent.click(screen.getByRole('tab', { name: 'SQL → Code Generator' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL for code generation' }), {
      target: { value: 'CREATE TABLE orders (id BIGINT,' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    expect(await screen.findByRole('region', { name: 'Generation diagnostics' })).toHaveTextContent(
      /line 1, column/i
    );
    expect(screen.queryByRole('textbox', { name: 'Generated Java code' })).not.toBeInTheDocument();
  });

  it('uses SELECT aliases in DTO properties', async () => {
    render(<QueryInputPage />);
    await screen.findByRole('heading', { level: 1, name: getT('en').queryInputTitle });

    fireEvent.click(screen.getByRole('tab', { name: 'SQL → Code Generator' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL for code generation' }), {
      target: { value: 'SELECT u.display_name AS display_label FROM users u' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    const preview = await screen.findByRole('textbox', { name: 'Generated Java code' });
    expect(preview).toHaveTextContent('public class UserDto');
    expect(preview).toHaveTextContent('private Object displayLabel;');
    expect(preview).not.toHaveTextContent('@Entity');
    expect(screen.getByRole('region', { name: 'Generation diagnostics' })).toHaveTextContent(
      /could not be inferred/i
    );
  });

  it('maps aggregate results and warns when SUM type is unknown', async () => {
    render(<QueryInputPage />);
    await screen.findByRole('heading', { level: 1, name: getT('en').queryInputTitle });

    fireEvent.click(screen.getByRole('tab', { name: 'SQL → Code Generator' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL for code generation' }), {
      target: {
        value:
          'SELECT COUNT(*) AS total_count, SUM(amount) AS sum_amount, AVG(amount) AS average_amount FROM orders',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    const preview = await screen.findByRole('textbox', { name: 'Generated Java code' });
    expect(preview).toHaveTextContent('private Long totalCount;');
    expect(preview).toHaveTextContent('private Object sumAmount;');
    expect(preview).toHaveTextContent('private BigDecimal averageAmount;');
    expect(screen.getByRole('region', { name: 'Generation diagnostics' })).toHaveTextContent(
      /could not be inferred/i
    );
  });

  it('generates a flattened DTO for a join', async () => {
    render(<QueryInputPage />);
    await screen.findByRole('heading', { level: 1, name: getT('en').queryInputTitle });

    fireEvent.click(screen.getByRole('tab', { name: 'SQL → Code Generator' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL for code generation' }), {
      target: {
        value:
          'SELECT u.id AS user_id, o.id AS order_id FROM users u JOIN orders o ON u.id = o.user_id',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    const preview = await screen.findByRole('textbox', { name: 'Generated Java code' });
    expect(preview).toHaveTextContent('private Object userId;');
    expect(preview).toHaveTextContent('private Object orderId;');
    expect(preview).not.toHaveTextContent('@Entity');
  });

  it('includes grouped fields in the DTO', async () => {
    render(<QueryInputPage />);
    await screen.findByRole('heading', { level: 1, name: getT('en').queryInputTitle });

    fireEvent.click(screen.getByRole('tab', { name: 'SQL → Code Generator' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL for code generation' }), {
      target: {
        value:
          'SELECT department_id, COUNT(*) AS employee_count FROM employees GROUP BY department_id',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    const preview = await screen.findByRole('textbox', { name: 'Generated Java code' });
    expect(preview).toHaveTextContent('private Object departmentId;');
    expect(preview).toHaveTextContent('private Long employeeCount;');
    expect(preview).not.toHaveTextContent('@Entity');
  });

  it('marks non-Java renderer targets unavailable', async () => {
    render(<QueryInputPage />);
    await screen.findByRole('heading', { level: 1, name: getT('en').queryInputTitle });

    fireEvent.click(screen.getByRole('tab', { name: 'SQL → Code Generator' }));

    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('java');
    expect(screen.getByRole('option', { name: 'C# / EF Core (planned)' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Python / SQLAlchemy (planned)' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'TypeScript / TypeORM (planned)' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Go / GORM (planned)' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Kotlin / JPA (planned)' })).toBeDisabled();
  });

  it('generates a supported complex query as a DTO', async () => {
    render(<QueryInputPage />);
    await screen.findByRole('heading', { level: 1, name: getT('en').queryInputTitle });

    fireEvent.click(screen.getByRole('tab', { name: 'SQL → Code Generator' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL for code generation' }), {
      target: {
        value:
          'SELECT c.name AS customer_name, COUNT(o.id) AS order_count FROM customers c JOIN orders o ON c.id = o.customer_id GROUP BY c.name',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    const preview = await screen.findByRole('textbox', { name: 'Generated Java code' });
    expect(preview).toHaveTextContent('public class CustomerDto');
    expect(preview).toHaveTextContent('private Object customerName;');
    expect(preview).toHaveTextContent('private Long orderCount;');
    expect(preview).not.toHaveTextContent('@Entity');
  });

  it('classifies table definitions and recommends Entity output', async () => {
    render(<QueryInputPage />);
    await screen.findByRole('heading', { level: 1, name: getT('en').queryInputTitle });

    fireEvent.click(screen.getByRole('tab', { name: 'SQL → Code Generator' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL for code generation' }), {
      target: { value: 'CREATE TABLE users (id BIGINT NOT NULL PRIMARY KEY)' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    expect(await screen.findByRole('region', { name: 'SQL classification' })).toHaveTextContent(
      'Table definition'
    );
    expect(screen.getByRole('region', { name: 'SQL classification' })).toHaveTextContent(
      'Recommended output: Entity'
    );
  });

  it('distinguishes entity-like, DTO, and aggregate SELECT shapes', async () => {
    render(<QueryInputPage />);
    await screen.findByRole('heading', { level: 1, name: getT('en').queryInputTitle });

    fireEvent.click(screen.getByRole('tab', { name: 'SQL → Code Generator' }));
    const input = screen.getByRole('textbox', { name: 'SQL for code generation' });
    const generate = screen.getByRole('button', { name: 'Generate' });

    fireEvent.change(input, { target: { value: 'SELECT * FROM users' } });
    fireEvent.click(generate);
    let classification = await screen.findByRole('region', { name: 'SQL classification' });
    expect(classification).toHaveTextContent('Entity-like SELECT');
    expect(classification).toHaveTextContent('Unavailable');
    expect(screen.queryByRole('textbox', { name: 'Generated Java code' })).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'SELECT name AS display_name FROM users' } });
    fireEvent.click(generate);
    classification = await screen.findByRole('region', { name: 'SQL classification' });
    expect(classification).toHaveTextContent('DTO SELECT');
    expect(classification).toHaveTextContent('DTO / Projection');

    fireEvent.change(input, {
      target: { value: 'SELECT status, COUNT(*) AS total FROM users GROUP BY status' },
    });
    fireEvent.click(generate);
    classification = await screen.findByRole('region', { name: 'SQL classification' });
    expect(classification).toHaveTextContent('Aggregate SELECT');
    expect(classification).toHaveTextContent('DTO / Projection');
  });

  it('classifies DML without generating a persistence method', async () => {
    render(<QueryInputPage />);
    await screen.findByRole('heading', { level: 1, name: getT('en').queryInputTitle });

    fireEvent.click(screen.getByRole('tab', { name: 'SQL → Code Generator' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL for code generation' }), {
      target: { value: 'INSERT INTO users (id) VALUES (1)' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    const classification = await screen.findByRole('region', { name: 'SQL classification' });
    expect(classification).toHaveTextContent('INSERT statement');
    expect(classification).toHaveTextContent('Unavailable');
    expect(classification).toHaveTextContent(/repository\/persistence method/i);
    expect(screen.queryByRole('textbox', { name: 'Generated Java code' })).not.toBeInTheDocument();
  });

  it('shows generated code in the Java-highlighted preview', async () => {
    render(<QueryInputPage />);
    await screen.findByRole('heading', { level: 1, name: getT('en').queryInputTitle });

    fireEvent.click(screen.getByRole('tab', { name: 'SQL → Code Generator' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL for code generation' }), {
      target: { value: 'CREATE TABLE users (id BIGINT PRIMARY KEY)' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    expect(await screen.findByRole('textbox', { name: 'Generated Java code' })).toHaveAttribute(
      'data-language',
      'java'
    );
  });

  it('copies the exact generated source from the route', async () => {
    const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<QueryInputPage />);
    await screen.findByRole('heading', { level: 1, name: getT('en').queryInputTitle });
    fireEvent.click(screen.getByRole('tab', { name: 'SQL → Code Generator' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL for code generation' }), {
      target: { value: 'CREATE TABLE users (id BIGINT PRIMARY KEY)' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
    const source = (await screen.findByRole('textbox', { name: 'Generated Java code' })).textContent ?? '';

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await vi.waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(getT('en').generatorCopied, { duration: 2000 });
    });
    expect(writeText).toHaveBeenCalledWith(source);

    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
    else Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('downloads the exact generated Java source from the route', async () => {
    const originalCreateObjectUrl = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    const originalRevokeObjectUrl = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
    const createObjectUrl = vi.fn().mockReturnValue('blob:generated-route');
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectUrl });
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe('User.java');
      });

    render(<QueryInputPage />);
    await screen.findByRole('heading', { level: 1, name: getT('en').queryInputTitle });
    fireEvent.click(screen.getByRole('tab', { name: 'SQL → Code Generator' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL for code generation' }), {
      target: { value: 'CREATE TABLE users (id BIGINT PRIMARY KEY)' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
    const source = (await screen.findByRole('textbox', { name: 'Generated Java code' })).textContent ?? '';

    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    const blob = createObjectUrl.mock.calls[0][0] as Blob;
    expect(await blob.text()).toBe(source);
    expect(anchorClick).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith(getT('en').generatorDownloaded, { duration: 2000 });

    anchorClick.mockRestore();
    if (originalCreateObjectUrl) Object.defineProperty(URL, 'createObjectURL', originalCreateObjectUrl);
    else Reflect.deleteProperty(URL, 'createObjectURL');
    if (originalRevokeObjectUrl) Object.defineProperty(URL, 'revokeObjectURL', originalRevokeObjectUrl);
    else Reflect.deleteProperty(URL, 'revokeObjectURL');
  });

  it('replaces the previous route preview on regeneration', async () => {
    render(<QueryInputPage />);
    await screen.findByRole('heading', { level: 1, name: getT('en').queryInputTitle });
    fireEvent.click(screen.getByRole('tab', { name: 'SQL → Code Generator' }));
    const input = screen.getByRole('textbox', { name: 'SQL for code generation' });

    fireEvent.change(input, {
      target: { value: 'CREATE TABLE users (id BIGINT PRIMARY KEY)' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
    expect(await screen.findByRole('textbox', { name: 'Generated Java code' })).toHaveTextContent(
      'class User'
    );

    fireEvent.change(input, {
      target: { value: 'CREATE TABLE orders (id BIGINT PRIMARY KEY)' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }));
    const preview = screen.getByRole('textbox', { name: 'Generated Java code' });
    expect(preview).toHaveTextContent('class Order');
    expect(preview).not.toHaveTextContent('class User');
  });

  it('resets route input to its initial value and clears generated output', async () => {
    useAppStore.setState({ rawSql: 'SELECT initial_sql FROM users' });
    render(<QueryInputPage />);
    await screen.findByRole('heading', { level: 1, name: getT('en').queryInputTitle });
    fireEvent.click(screen.getByRole('tab', { name: 'SQL → Code Generator' }));
    const input = screen.getByRole('textbox', { name: 'SQL for code generation' });

    fireEvent.change(input, {
      target: { value: 'CREATE TABLE users (id BIGINT PRIMARY KEY)' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
    expect(await screen.findByRole('textbox', { name: 'Generated Java code' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(input).toHaveValue('SELECT initial_sql FROM users');
    expect(screen.queryByRole('textbox', { name: 'Generated Java code' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'SQL classification' })).not.toBeInTheDocument();
    expect(useAppStore.getState().rawSql).toBe('SELECT initial_sql FROM users');
  });

  it('does not invent inverse or cascade mappings for explicit relationships', async () => {
    render(<QueryInputPage />);
    await screen.findByRole('heading', { level: 1, name: getT('en').queryInputTitle });
    fireEvent.click(screen.getByRole('tab', { name: 'SQL → Code Generator' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL for code generation' }), {
      target: {
        value:
          'CREATE TABLE orders (id BIGINT NOT NULL, customer_id BIGINT NOT NULL, CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id), PRIMARY KEY (id))',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    const preview = await screen.findByRole('textbox', { name: 'Generated Java code' });
    expect(preview).toHaveTextContent('@ManyToOne');
    expect(preview).not.toHaveTextContent('@OneToMany');
    expect(preview).not.toHaveTextContent('CascadeType');
  });

  it('explains composite foreign-key handling and keeps the columns scalar', async () => {
    render(<QueryInputPage />);
    await screen.findByRole('heading', { level: 1, name: getT('en').queryInputTitle });
    fireEvent.click(screen.getByRole('tab', { name: 'SQL → Code Generator' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL for code generation' }), {
      target: {
        value:
          'CREATE TABLE orders (id BIGINT PRIMARY KEY, customer_id BIGINT, tenant_id BIGINT, CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id, tenant_id) REFERENCES customers(id, tenant_id))',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    const preview = await screen.findByRole('textbox', { name: 'Generated Java code' });
    expect(preview).not.toHaveTextContent('@ManyToOne');
    expect(preview).toHaveTextContent('private Long customerId;');
    expect(preview).toHaveTextContent('private Long tenantId;');
    expect(screen.getByRole('region', { name: 'Generation diagnostics' })).toHaveTextContent(
      /composite or incomplete/i
    );
  });
});