import { describe, expect, it } from 'vitest';
import type { JoinEdge, TableNode } from '@/lib/sql/sqlAnalyzer';
import {
  FORCE_ITERATIONS,
  computePlacements,
  reducePlacement,
  type PlacementState,
} from '@/app/relationship-graph-visualizer/lib/graphLayout';

function table(id: string, sourceType: TableNode['sourceType'] = 'TABLE'): TableNode {
  return { id, name: id, columns: [], sourceType };
}

function join(source: string, target: string): JoinEdge {
  return { id: `${source}-${target}`, source, target, joinType: 'INNER JOIN', condition: 'a = b' };
}

const branched = {
  tables: [table('A'), table('B'), table('C'), table('D'), table('E')],
  joins: [join('A', 'B'), join('A', 'C'), join('B', 'D')],
};

describe('graph placement (019 A1, A2, A4, A24 / U1-U11)', () => {
  it('U1 / A1: hierarchical, force, and grid placements are not the same fixed grid', () => {
    const grid = computePlacements(branched.tables, branched.joins, 'grid', 'normal');
    const hierarchical = computePlacements(branched.tables, branched.joins, 'dagre', 'normal');
    const force = computePlacements(branched.tables, branched.joins, 'force', 'normal');

    expect(Array.from(hierarchical.entries())).not.toEqual(Array.from(grid.entries()));
    expect(Array.from(force.entries())).not.toEqual(Array.from(grid.entries()));
    expect(hierarchical.get('D')?.x).toBeGreaterThan(hierarchical.get('A')?.x ?? 0);
  });

  it('U2 / A2: compact, normal, and spacious change the gap', () => {
    const pair = [table('A'), table('B')];
    const edge = [join('A', 'B')];
    const compact = computePlacements(pair, edge, 'grid', 'compact');
    const normal = computePlacements(pair, edge, 'grid', 'normal');
    const spacious = computePlacements(pair, edge, 'grid', 'spacious');
    const gap = (positions: Map<string, { x: number; y: number }>) =>
      (positions.get('B')?.x ?? 0) - (positions.get('A')?.x ?? 0);

    expect(gap(compact)).toBeLessThan(gap(normal));
    expect(gap(normal)).toBeLessThan(gap(spacious));
  });

  it('U3: the same inputs always return the same coordinates', () => {
    const first = computePlacements(branched.tables, branched.joins, 'force', 'normal');
    const second = computePlacements(branched.tables, branched.joins, 'force', 'normal');
    expect(Array.from(second.entries())).toEqual(Array.from(first.entries()));
  });

  it('U4: hierarchical layout places sources left to right and isolates below', () => {
    const positions = computePlacements(branched.tables, branched.joins, 'dagre', 'normal');
    expect(positions.get('A')?.x).toBeLessThan(positions.get('B')?.x ?? 0);
    expect(positions.get('B')?.x).toBeLessThan(positions.get('D')?.x ?? 0);
    const connectedBottom = Math.max(
      positions.get('A')?.y ?? 0,
      positions.get('B')?.y ?? 0,
      positions.get('C')?.y ?? 0,
      positions.get('D')?.y ?? 0
    );
    expect(positions.get('E')?.y).toBeGreaterThan(connectedBottom);
  });

  it('U5 / A24: force layout is deterministic and capped at 80 iterations', () => {
    expect(FORCE_ITERATIONS).toBeLessThanOrEqual(80);
    expect(FORCE_ITERATIONS).toBe(80);
  });

  it('U6: fifty sources are placed within one second', () => {
    const tables = Array.from({ length: 50 }, (_, index) => table(`t${index}`));
    const joins = tables.slice(1).map((node, index) => join(tables[index].id, node.id));
    const started = performance.now();
    const positions = computePlacements(tables, joins, 'force', 'normal');
    expect(performance.now() - started).toBeLessThan(1000);
    expect(positions.size).toBe(50);
  });

  it('U7-U11: selection, search, theme, performance, and filter do not recompute; drag and relayout do', () => {
    const initial = computePlacements(branched.tables, branched.joins, 'grid', 'normal');
    const state: PlacementState = {
      fingerprint: 'mysql\nselect 1',
      layout: 'grid',
      spacing: 'normal',
      positions: initial,
    };

    for (const type of ['select', 'search', 'theme', 'performance', 'panel', 'filter'] as const) {
      const next = reducePlacement(state, { type });
      expect(next.positions).toBe(state.positions);
    }

    const dragged = reducePlacement(state, { type: 'drag', id: 'A', x: 12, y: 34 });
    expect(dragged.positions.get('A')).toEqual({ x: 12, y: 34 });
    expect(dragged.positions.get('B')).toEqual(initial.get('B'));

    const rearranged = reducePlacement(state, {
      type: 'relayout',
      layout: 'grid',
      spacing: 'normal',
      tables: branched.tables,
      joins: branched.joins,
    });
    expect(rearranged.positions).not.toBe(state.positions);

    const sameQuery = reducePlacement(dragged, {
      type: 'query',
      fingerprint: state.fingerprint,
      layout: 'grid',
      spacing: 'normal',
      tables: branched.tables,
      joins: branched.joins,
    });
    expect(sameQuery.positions.get('A')).toEqual({ x: 12, y: 34 });
  });

  it('U10 / A4: a different query fingerprint never reuses the previous positions', () => {
    const state: PlacementState = {
      fingerprint: 'mysql\nselect 1',
      layout: 'grid',
      spacing: 'normal',
      positions: computePlacements(branched.tables, branched.joins, 'grid', 'normal'),
    };
    const dragged = reducePlacement(state, { type: 'drag', id: 'A', x: 12, y: 34 });

    const next = reducePlacement(dragged, {
      type: 'query',
      fingerprint: 'mysql\nselect 2',
      layout: 'grid',
      spacing: 'normal',
      tables: branched.tables,
      joins: branched.joins,
    });

    expect(next.fingerprint).toBe('mysql\nselect 2');
    expect(next.positions.get('A')).not.toEqual({ x: 12, y: 34 });
    expect(next.positions.get('A')).toEqual(
      computePlacements(branched.tables, branched.joins, 'grid', 'normal').get('A')
    );
  });
});
