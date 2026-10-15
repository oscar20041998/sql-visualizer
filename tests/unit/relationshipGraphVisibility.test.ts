import { describe, expect, it } from 'vitest';
import type { JoinEdge, TableNode } from '@/lib/sql/sqlAnalyzer';
import {
  filterJoinsBySourceType,
  filterTablesBySourceType,
} from '@/app/relationship-graph-visualizer/components/GraphVisualizerContent';
import {
  CATEGORY_CHROME,
  DEFAULT_INCLUDE_NEIGHBORS,
  clearSelectionIfHidden,
  displayedJoinCount,
  filterVisibleJoins,
  filterVisibleTables,
} from '@/app/relationship-graph-visualizer/lib/graphVisibility';
import { conditionPreview, formatEndpoint, prepareImageExport } from '@/app/relationship-graph-visualizer/lib/graphExport';
import { getT } from '@/lib/i18n';

function table(id: string, sourceType: TableNode['sourceType'], alias?: string): TableNode {
  return { id, name: id, alias, columns: [], sourceType };
}

function join(source: string, target: string, condition = 'a.id = b.id'): JoinEdge {
  return { id: `${source}-${target}`, source, target, joinType: 'INNER JOIN', condition };
}

const tables = [
  table('cte', 'CTE'),
  table('orders', 'TABLE', 'o'),
  table('sub', 'SUBQUERY'),
  table('mystery', 'UNKNOWN'),
  table('far', 'TABLE'),
];
const joins = [join('cte', 'orders'), join('orders', 'far'), join('sub', 'mystery')];

describe('graph visibility (019 A9, A10 / U12-U20, U33)', () => {
  it('keeps the category-only helpers from including neighbors (U19, U20)', () => {
    expect(filterTablesBySourceType(tables, 'cte').map((item) => item.id)).toEqual(['cte']);
    expect(filterJoinsBySourceType(joins, tables, 'cte')).toEqual([]);
  });

  it('includes one-hop neighbors by default and excludes the second hop (U12-U16)', () => {
    expect(DEFAULT_INCLUDE_NEIGHBORS).toBe(true);
    const visible = filterVisibleTables(tables, joins, 'cte', true).map((item) => item.id);
    expect(visible).toContain('cte');
    expect(visible).toContain('orders');
    expect(visible).not.toContain('far');
    expect(filterVisibleTables(tables, joins, 'cte', false).map((item) => item.id)).toEqual(['cte']);
  });

  it('keeps unknown sources in All and as direct neighbors (U17, U18)', () => {
    expect(filterVisibleTables(tables, joins, 'all', false).map((item) => item.id)).toContain(
      'mystery'
    );
    expect(filterVisibleTables(tables, joins, 'subquery', true).map((item) => item.id)).toContain(
      'mystery'
    );
  });

  it('counts visible joins instead of the unfiltered metric (U33)', () => {
    const visible = filterVisibleTables(tables, joins, 'cte', true);
    const visibleJoins = filterVisibleJoins(joins, visible);
    expect(displayedJoinCount(visibleJoins.length, 'cte')).toBe(1);
    expect(displayedJoinCount(visibleJoins.length, 'cte')).not.toBe(99);
  });

  it('clears a selection that the filter hides (A10)', () => {
    const visible = new Set(filterVisibleTables(tables, joins, 'table', false).map((item) => item.id));
    expect(clearSelectionIfHidden('cte', visible)).toBeNull();
    expect(clearSelectionIfHidden('orders', visible)).toBe('orders');
  });

  it('uses category chrome and readable endpoint text (A5-A8, A21)', () => {
    expect(CATEGORY_CHROME.CTE).not.toBe(CATEGORY_CHROME.TABLE);
    expect(formatEndpoint('orders', 'o')).toBe('orders (o)');
    expect(conditionPreview('short')).toBe('short');
    expect(conditionPreview('x'.repeat(41)).endsWith('...')).toBe(true);
    expect(conditionPreview('x'.repeat(41)).startsWith('x'.repeat(40))).toBe(true);
  });
});

describe('graph locales and image export (019 A19, A27)', () => {
  it('replaces the misleading relationship labels in both locales', () => {
    for (const locale of ['en', 'vi'] as const) {
      const t = getT(locale);
      expect(t.graphFilterCte.toLowerCase()).not.toContain('relationship');
      expect(t.graphFilterCte.toLowerCase()).not.toContain('quan hệ');
      expect(t.graphFilterCteNeighbors).not.toBe(t.graphFilterCte);
      expect(t.graphIncludeNeighbors.length).toBeGreaterThan(0);
      expect(t.graphFit.length).toBeGreaterThan(0);
      expect(t.graphImageExportFailed.length).toBeGreaterThan(0);
    }
  });

  it('downloads themed SVG of the visible surface and reports a missing image without dropping the diagram', () => {
    const ready = prepareImageExport('<svg></svg>', 'light', ['orders']);
    expect(ready.ok).toBe(true);
    expect(ready.markup).toContain('data-visible-ids="orders"');
    expect(ready.markup).toContain('#f8fafc');
    expect(ready.filename.endsWith('.svg')).toBe(true);

    const missing = prepareImageExport(null, 'dark', []);
    expect(missing.ok).toBe(false);
    expect(missing.messageKey).toBe('graphImageExportFailed');
  });
});
