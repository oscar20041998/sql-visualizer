import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import { ObjectIntelligencePanel } from '@/app/query-input/components/ObjectIntelligencePanel';
import { getT } from '@/lib/i18n';
import * as viewAnalyzer from '@/lib/sql/viewAnalyzer';
import { useAppStore } from '@/lib/store';
import { currentSessionOwner } from '@/lib/demoAuth';

it('keeps the object draft when the workspace is unmounted and reopened', () => {
  const first = render(<ObjectIntelligencePanel dialect="mysql" t={getT('en')} />);
  const source = 'CREATE VIEW active_orders AS SELECT id FROM orders;';
  fireEvent.change(screen.getByRole('textbox', { name: 'Database object SQL' }), {
    target: { value: source },
  });
  first.unmount();

  render(<ObjectIntelligencePanel dialect="mysql" t={getT('en')} />);
  expect(screen.getByRole('textbox', { name: 'Database object SQL' })).toHaveValue(source);
});

it('does not replace a newer result when an older analysis finishes late', async () => {
  useAppStore.getState().setObjectSql('', currentSessionOwner());
  const result = (name: string): viewAnalyzer.ViewAnalysis => ({
    status: 'partial',
    name,
    schema: null,
    columns: null,
    query: 'SELECT 1',
    queryRange: {
      start: { offset: 0, line: 1, column: 1 },
      end: { offset: 8, line: 1, column: 9 },
    },
    tables: [],
    sourceCrossCheck: 'unavailable',
  });
  let resolveFirst!: (value: viewAnalyzer.ViewAnalysis) => void;
  const first = new Promise<viewAnalyzer.ViewAnalysis>((resolve) => {
    resolveFirst = resolve;
  });
  const analyze = vi
    .spyOn(viewAnalyzer, 'analyzeView')
    .mockReturnValueOnce(first)
    .mockResolvedValueOnce(result('new_view'));
  try {
    render(<ObjectIntelligencePanel dialect="mysql" t={getT('en')} />);
    const input = screen.getByRole('textbox', { name: 'Database object SQL' });
    fireEvent.change(input, { target: { value: 'CREATE VIEW old_view AS SELECT 1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
    fireEvent.change(input, { target: { value: 'CREATE VIEW new_view AS SELECT 1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze object' }));
    const output = within(screen.getByRole('region', { name: 'Object analysis result' }));
    expect(await output.findByText('new_view')).toBeInTheDocument();
    await act(async () => {
      resolveFirst(result('old_view'));
      await first;
    });
    expect(output.getByText('new_view')).toBeInTheDocument();
    expect(output.queryByText('old_view')).not.toBeInTheDocument();
  } finally {
    analyze.mockRestore();
  }
});
