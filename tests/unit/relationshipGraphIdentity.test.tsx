import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import TableNode from '@/app/relationship-graph-visualizer/components/TableNode';
import { CATEGORY_CHROME } from '@/app/relationship-graph-visualizer/lib/graphVisibility';
import type { TableNodeData } from '@/app/relationship-graph-visualizer/components/TableNode';

function data(overrides: Partial<TableNodeData> = {}): TableNodeData {
  return {
    id: 'orders',
    name: 'orders',
    alias: 'o',
    columns: ['id'],
    sourceType: 'TABLE',
    nodeColor: CATEGORY_CHROME.TABLE,
    theme: 'dark',
    isHighlighted: true,
    isSelected: false,
    ...overrides,
  };
}

describe('graph identity (019 A5-A8, A25)', () => {
  it('shows category text on full and compact cards, separate from the alias', () => {
    const { rerender } = render(
      <ReactFlowProvider>
        <TableNode data={data()} />
      </ReactFlowProvider>
    );
    expect(screen.getByText('TABLE')).toBeInTheDocument();
    expect(screen.getByLabelText('orders, TABLE, alias o')).toBeInTheDocument();

    rerender(
      <ReactFlowProvider>
        <TableNode data={data({ isSimplified: true, sourceType: 'CTE', nodeColor: CATEGORY_CHROME.CTE })} />
      </ReactFlowProvider>
    );
    expect(screen.getByText('CTE')).toBeInTheDocument();
    expect(screen.getByLabelText('orders, CTE, alias o')).toBeInTheDocument();
    expect(CATEGORY_CHROME.CTE).not.toBe(CATEGORY_CHROME.UNKNOWN);
  });

  it('A25: two sources that share a name with different aliases stay distinguishable', () => {
    render(
      <ReactFlowProvider>
        <TableNode data={data({ id: 'orders-1', name: 'orders', alias: 'o1' })} />
        <TableNode data={data({ id: 'orders-2', name: 'orders', alias: 'o2' })} />
      </ReactFlowProvider>
    );

    expect(screen.getByLabelText('orders, TABLE, alias o1')).toBeInTheDocument();
    expect(screen.getByLabelText('orders, TABLE, alias o2')).toBeInTheDocument();
  });
});
