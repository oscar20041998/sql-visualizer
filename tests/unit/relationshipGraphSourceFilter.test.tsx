import { describe, expect, it } from 'vitest';
import {
  buildMermaidDiagram,
  filterJoinsBySourceType,
  filterTablesBySourceType,
} from '@/app/relationship-graph-visualizer/components/GraphVisualizerContent';
import type { JoinEdge, TableNode } from '@/lib/sql/sqlAnalyzer';

const tables: TableNode[] = [
  { id: 'orders', name: 'orders', columns: [], sourceType: 'TABLE' },
  { id: 'customer-orders', name: 'customer_orders', columns: [], sourceType: 'CTE' },
  { id: 'recent-orders', name: 'recent_orders', alias: 'recent', columns: [], sourceType: 'SUBQUERY' },
];

const joins: JoinEdge[] = [
  { id: 'table-cte', source: 'orders', target: 'customer-orders', joinType: 'INNER JOIN', condition: '' },
  { id: 'cte-subquery', source: 'customer-orders', target: 'recent-orders', joinType: 'RELATES TO', condition: '' },
];

describe('relationship graph source filters', () => {
  it('returns only the selected canonical source category', () => {
    expect(filterTablesBySourceType(tables, 'all')).toHaveLength(3);
    expect(filterTablesBySourceType(tables, 'table').map((table) => table.sourceType)).toEqual(['TABLE']);
    expect(filterTablesBySourceType(tables, 'cte').map((table) => table.sourceType)).toEqual(['CTE']);
    expect(filterTablesBySourceType(tables, 'subquery').map((table) => table.sourceType)).toEqual([
      'SUBQUERY',
    ]);
  });

  it('keeps only edges whose endpoints remain visible', () => {
    expect(filterJoinsBySourceType(joins, tables, 'all')).toHaveLength(2);
    expect(filterJoinsBySourceType(joins, tables, 'cte')).toHaveLength(0);
  });

  it('uses canonical source types in exported graph labels', () => {
    const diagram = buildMermaidDiagram(tables, [], {
      'INNER JOIN': '#fff',
      'LEFT JOIN': '#fff',
      'RIGHT JOIN': '#fff',
      'FULL OUTER JOIN': '#fff',
      'CROSS JOIN': '#fff',
      'NATURAL JOIN': '#fff',
      'RELATES TO': '#fff',
      'LATERAL JOIN': '#fff',
    });

    expect(diagram).toContain('[SUBQUERY]');
  });
});