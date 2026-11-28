import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import TableNode from '@/app/relationship-graph-visualizer/components/TableNode';
import {
  CATEGORY_CHROME,
  CATEGORY_CHROME_LIGHT,
} from '@/app/relationship-graph-visualizer/lib/graphVisibility';
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

function luminance(rgb: number[]): number {
  const linear = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

describe('graph identity (019 A5-A8, A25)', () => {
  it('keeps every light category readable against its tinted header', () => {
    for (const color of Object.values(CATEGORY_CHROME_LIGHT)) {
      const rgb = color.slice(1).match(/.{2}/g)!.map((channel) => parseInt(channel, 16));
      const header = rgb.map((channel) => (channel * 40 + 255 * 215) / 255);
      expect((luminance(header) + 0.05) / (luminance(rgb) + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each([false, true])('keeps dimmed light nodes readable in compact mode %s', (isSimplified: boolean) => {
    const { rerender } = render(
      <ReactFlowProvider>
        <TableNode
          data={data({
            theme: 'light',
            nodeColor: CATEGORY_CHROME_LIGHT.TABLE,
            isHighlighted: false,
            isSimplified,
          })}
        />
      </ReactFlowProvider>
    );
    expect(screen.getByRole('img', { name: 'orders, TABLE, alias o' })).toHaveStyle({
      opacity: '1',
    });
    rerender(
      <ReactFlowProvider>
        <TableNode data={data({ theme: 'dark', isHighlighted: false, isSimplified })} />
      </ReactFlowProvider>
    );
    expect(screen.getByRole('img', { name: 'orders, TABLE, alias o' })).toHaveStyle({
      opacity: isSimplified ? '0.5' : '0.6',
    });
  });

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
