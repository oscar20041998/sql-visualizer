import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildMermaidDiagram } from '@/app/relationship-graph-visualizer/components/GraphVisualizerContent';
import { exportGraphImage, GRAPH_IMAGE_FILENAME } from '@/app/relationship-graph-visualizer/lib/graphExport';
import { toBlob } from 'html-to-image';
import type { JoinEdge, JoinType, TableNode } from '@/lib/sql/sqlAnalyzer';

vi.mock('html-to-image', () => ({ toBlob: vi.fn() }));

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

});

describe('PNG graph export', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('captures all rendered nodes, edges and labels independently of pan and zoom', async () => {
    const viewport = document.createElement('div');
    viewport.innerHTML = `
      <div class="react-flow__node"></div>
      <div class="react-flow__node"></div>
      <svg><path class="react-flow__edge-path"></path></svg>
      <div class="react-flow__edgelabel-renderer"><div></div></div>`;
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 50, 800, 600));
    const elements = viewport.querySelectorAll(
      '.react-flow__node, .react-flow__edge-path, .react-flow__edgelabel-renderer > div'
    );
    [
      new DOMRect(120, 70, 200, 100),
      new DOMRect(-300, 470, 200, 100),
      new DOMRect(-400, 70, 500, 300),
      new DOMRect(600, 100, 100, 40),
    ].forEach((rect, index) => vi.spyOn(elements[index], 'getBoundingClientRect').mockReturnValue(rect));
    const png = new Blob(['png'], { type: 'image/png' });
    vi.mocked(toBlob).mockResolvedValue(png);

    await expect(exportGraphImage(viewport, 2, 'dark')).resolves.toBe(png);
    expect(GRAPH_IMAGE_FILENAME).toBe('relationship-graph.png');
    expect(toBlob).toHaveBeenCalledWith(viewport, expect.objectContaining({
      width: 710,
      height: 410,
      pixelRatio: 1,
      backgroundColor: '#0f172a',
      style: expect.objectContaining({ transform: 'translate(330px, 70px) scale(1)' }),
    }));
  });

  it('rejects missing, oversized or non-PNG output instead of downloading a partial image', async () => {
    await expect(exportGraphImage(null, 1, 'light')).rejects.toThrow();
    const viewport = document.createElement('div');
    viewport.innerHTML = '<div class="react-flow__node"></div>';
    const node = viewport.querySelector('.react-flow__node')!;
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 100));
    const nodeRect = vi.spyOn(node, 'getBoundingClientRect');
    nodeRect.mockReturnValue(new DOMRect(0, 0, 20000, 100));
    await expect(exportGraphImage(viewport, 1, 'light')).rejects.toThrow();
    expect(toBlob).not.toHaveBeenCalled();
    nodeRect.mockReturnValue(new DOMRect(0, 0, 100, 100));
    vi.mocked(toBlob).mockResolvedValue(new Blob(['svg'], { type: 'image/svg+xml' }));
    await expect(exportGraphImage(viewport, 1, 'light')).rejects.toThrow();
    vi.mocked(toBlob).mockRejectedValue(new Error('render failed'));
    await expect(exportGraphImage(viewport, 1, 'light')).rejects.toThrow('render failed');
  });
});
