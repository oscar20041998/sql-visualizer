import { describe, expect, it } from 'vitest';
import { buildMermaidDiagram } from '@/app/relationship-graph-visualizer/components/GraphVisualizerContent';
import { prepareImageExport } from '@/app/relationship-graph-visualizer/lib/graphExport';
import type { JoinEdge, JoinType, TableNode } from '@/lib/sql/sqlAnalyzer';

const colors = { 'INNER JOIN': '#38bdf8' } as Record<JoinType, string>;

describe('graph export (019 A19-A21 / U29-U32)', () => {
  it('names visible categories in the diagram and omits hidden ids', () => {
    const tables: TableNode[] = [
      { id: 'orders', name: 'orders', columns: ['id'], sourceType: 'TABLE' },
    ];
    const joins: JoinEdge[] = [];
    const diagram = buildMermaidDiagram(tables, joins, colors);
    expect(diagram).toContain('[TABLE]');
    expect(diagram).not.toContain('hidden_cte');
  });

  it('builds a themed SVG download and keeps a failure separate from diagram text', () => {
    const ready = prepareImageExport('<svg></svg>', 'dark', ['orders']);
    expect(ready.ok).toBe(true);
    expect(ready.markup).toContain('#1a1f2e');
    expect(ready.filename).toBe('relationship-graph.svg');

    const missing = prepareImageExport(null, 'light', ['orders']);
    expect(missing.ok).toBe(false);
    expect(missing.messageKey).toBe('graphImageExportFailed');
  });
});
