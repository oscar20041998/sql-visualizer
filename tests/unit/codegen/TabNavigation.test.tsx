import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TabNavigation, type QueryInputMode } from '@/app/query-input/components/TabNavigation';

const labels: Record<string, string> = {
  inputMethodLabel: 'Input method',
  tabPasteSQL: 'Paste SQL Direct',
  tabImportMyBatis: 'Import MyBatis (XML) file',
  tabMyBatisContent: 'Paste your XML content',
  tabSmartEditor: 'Smart Editor',
  tabCodeGenerator: 'SQL → Code Generator',
};

describe('TabNavigation', () => {
  it('keeps icon-only tabs identifiable to assistive technology and on focus', () => {
    render(<TabNavigation inputMode="sql" onTabChange={vi.fn()} t={labels} />);

    for (const label of [
      labels.tabPasteSQL,
      labels.tabImportMyBatis,
      labels.tabMyBatisContent,
      labels.tabSmartEditor,
      labels.tabCodeGenerator,
    ]) {
      const tab = screen.getByRole('tab', { name: label });
      const tooltip = tab.querySelector('[aria-hidden="true"]:not(svg)');
      expect(tooltip).toHaveTextContent(label);
      expect(tooltip).toHaveClass('opacity-0', 'group-focus-visible:opacity-100');
    }
  });

  it('supports keyboard tab navigation', () => {
    const onTabChange = vi.fn((mode: QueryInputMode) => mode);
    render(<TabNavigation inputMode="smart-editor" onTabChange={onTabChange} t={labels} />);
    const generatorTab = screen.getByRole('tab', { name: 'SQL → Code Generator' });

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Smart Editor' }), { key: 'ArrowRight' });
    expect(generatorTab).toHaveFocus();
    expect(onTabChange).toHaveBeenCalledWith('code-generator');

    fireEvent.keyDown(generatorTab, { key: 'Home' });
    expect(screen.getByRole('tab', { name: 'Paste SQL Direct' })).toHaveFocus();
    expect(onTabChange).toHaveBeenLastCalledWith('sql');
  });
});
