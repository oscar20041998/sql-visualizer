import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { CodeGeneratorPanel } from '@/app/query-input/components/CodeGeneratorPanel';
import { useAppStore } from '@/lib/store';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@monaco-editor/react', () => ({
  default: ({ value, options, theme }: { value?: string; options?: { ariaLabel?: string }; theme?: string }) => (
    <pre role="textbox" aria-label={options?.ariaLabel} data-theme={theme}>{value ?? ''}</pre>
  ),
}));

const labels: Record<string, string> = {
  generatorSqlInput: 'SQL for code generation',
  generatorGenerate: 'Generate',
  generatorRegenerate: 'Regenerate',
  generatorReset: 'Reset',
  generatorGeneratedCode: 'Generated Java code',
  generatorDiagnostics: 'Generation diagnostics',
  generatorCopy: 'Copy',
  generatorDownload: 'Download',
  generatorCopied: 'Generated source copied.',
  generatorCopyFailed: 'Could not copy generated source.',
  generatorDownloaded: 'Java file downloaded.',
  generatorFramework: 'Framework',
  generatorFrameworkJpa: 'JPA / Hibernate',
  generatorLanguage: 'Language',
  generatorOutputType: 'Output type',
  generatorNamingStrategy: 'Naming strategy',
  generatorLombok: 'Use Lombok',
  generatorMyBatisMapper: 'Generate MyBatis @Mapper interface',
  generatorOutputFiles: 'Generated Java files',
  generatorRelationships: 'Include relationships',
  generatorValidation: 'Validation annotations',
  generatorAuto: 'Auto',
  generatorEntity: 'Entity',
  generatorDto: 'DTO / Projection',
  generatorJavaJpa: 'Java / JPA',
  generatorPlannedCsharp: 'C# / EF Core (planned)',
  generatorPlannedPython: 'Python / SQLAlchemy (planned)',
  generatorPlannedTypescript: 'TypeScript / TypeORM (planned)',
  generatorPlannedGo: 'Go / GORM (planned)',
  generatorPlannedKotlin: 'Kotlin / JPA (planned)',
  generatorNamingCamelCase: 'camelCase',
  generatorNamingPascalCase: 'PascalCase',
  generatorNamingPreserve: 'Preserve SQL names',
};

describe('CodeGeneratorPanel', () => {
  it('applies generation options and mapper output to generated source', () => {
    render(<CodeGeneratorPanel dialect="mysql" t={labels} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'SQL for code generation' }), {
      target: {
        value: `CREATE TABLE orders (
          id BIGINT NOT NULL PRIMARY KEY,
          customer_id BIGINT NOT NULL,
          display_name VARCHAR(80) NOT NULL,
          CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
        );`,
      },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Use Lombok' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include relationships' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Validation annotations' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Generate MyBatis @Mapper interface' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    const generated = screen.getByRole('textbox', { name: 'Generated Java code' });
    expect(generated).toHaveTextContent('import lombok.Getter;');
    expect(generated).toHaveTextContent('@NotNull');
    expect(generated).toHaveTextContent('@Size(max = 80)');
    expect(generated).toHaveTextContent('private Long customerId;');
    expect(generated).not.toHaveTextContent('@ManyToOne');
    expect(generated).not.toHaveTextContent('getId()');

    fireEvent.click(screen.getByRole('tab', { name: 'OrderMapper.java' }));
    expect(generated).toHaveTextContent('import org.apache.ibatis.annotations.Mapper;');
    expect(generated).toHaveTextContent('@Mapper');
  });

  it('follows the system light and dark themes in the generated-code editor', () => {
    const originalSettings = useAppStore.getState().settings;
    useAppStore.setState({ codeGeneratorSql: 'CREATE TABLE users (id BIGINT PRIMARY KEY)' });
    useAppStore.getState().updateSettings({ theme: 'dark' });
    const { unmount } = render(<CodeGeneratorPanel dialect="mysql" t={labels} />);

    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
    const editor = screen.getByRole('textbox', { name: 'Generated Java code' });
    expect(editor).toHaveAttribute('data-theme', 'vs-dark');

    act(() => useAppStore.getState().updateSettings({ theme: 'light' }));
    expect(editor).toHaveAttribute('data-theme', 'vs');

    unmount();
    useAppStore.setState({ codeGeneratorSql: '', settings: originalSettings });
  });

  it('isolates input and displays diagnostics', () => {
    render(<CodeGeneratorPanel dialect="mysql" t={labels} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'SQL for code generation' }), {
      target: { value: 'not valid sql' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    expect(screen.getByRole('region', { name: 'Generation diagnostics' })).toHaveTextContent(
      /could not be parsed/i
    );
    expect(screen.queryByRole('textbox', { name: 'Generated Java code' })).not.toBeInTheDocument();
  });

  it('replaces and resets generator output', () => {
    render(<CodeGeneratorPanel dialect="mysql" t={labels} />);
    const sqlInput = screen.getByRole('textbox', { name: 'SQL for code generation' });

    fireEvent.change(sqlInput, {
      target: { value: 'CREATE TABLE users (id BIGINT PRIMARY KEY)' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
    expect(screen.getByRole('textbox', { name: 'Generated Java code' })).toHaveTextContent(
      'class User'
    );

    fireEvent.change(sqlInput, {
      target: { value: 'CREATE TABLE orders (id BIGINT PRIMARY KEY)' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }));
    expect(screen.getByRole('textbox', { name: 'Generated Java code' })).toHaveTextContent(
      'class Order'
    );
    expect(screen.getByRole('textbox', { name: 'Generated Java code' })).not.toHaveTextContent(
      'class User'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(sqlInput).toHaveValue('');
    expect(screen.queryByRole('textbox', { name: 'Generated Java code' })).not.toBeInTheDocument();
  });

  it('exports generated source', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const originalObjectUrl = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    const createObjectUrl = vi.fn().mockReturnValue('blob:generated');
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrl,
    });
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe('UserMapper.java');
      });

    render(<CodeGeneratorPanel dialect="mysql" t={labels} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL for code generation' }), {
      target: { value: 'CREATE TABLE users (id BIGINT PRIMARY KEY)' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Generate MyBatis @Mapper interface' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
    fireEvent.click(screen.getByRole('tab', { name: 'UserMapper.java' }));
    const source = screen.getByRole('textbox', { name: 'Generated Java code' }).textContent ?? '';

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith(source);
    await vi.waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.generatorCopied, { duration: 2000 });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    const downloadedBlob = createObjectUrl.mock.calls[0][0];
    expect(await downloadedBlob.text()).toBe(source);
    expect(anchorClick).toHaveBeenCalled();
    expect(createObjectUrl).toHaveBeenCalledOnce();
    if (originalObjectUrl) Object.defineProperty(URL, 'createObjectURL', originalObjectUrl);
    else Reflect.deleteProperty(URL, 'createObjectURL');
    anchorClick.mockRestore();
  });

  it('shows an error notification when copying fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('Clipboard unavailable')) },
    });
    useAppStore.setState({ codeGeneratorSql: 'CREATE TABLE users (id BIGINT PRIMARY KEY)' });
    render(<CodeGeneratorPanel dialect="mysql" t={labels} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(labels.generatorCopyFailed, { duration: 3000 });
    });
  });
});