import { expect, it } from 'vitest';
import {
  dependencyEdges,
  reverseImpact,
  type DependencyEdge,
  type SessionObject,
} from '@/lib/sql/objectIntelligenceDependencies';

it('follows incoming edges through a chain and terminates on cycles', () => {
  const edges: DependencyEdge[] = [
    { source: 'b', target: 'a', label: 'b reads a', reference: 'a', resolved: true },
    { source: 'c', target: 'b', label: 'c reads b', reference: 'b', resolved: true },
    { source: 'a', target: 'c', label: 'a reads c', reference: 'c', resolved: true },
    {
      source: 'a',
      target: 'external',
      label: 'a reads external',
      reference: 'external',
      resolved: false,
    },
  ];
  expect(reverseImpact(edges, 'a')).toEqual([
    { id: 'b', depth: 1 },
    { id: 'c', depth: 2 },
  ]);
});

it('retains a missing referenced object as an unresolved graph edge', () => {
  const view: SessionObject = {
    id: 'mysql:sales.report',
    kind: 'view',
    dialect: 'mysql',
    schema: 'sales',
    name: 'report',
    source: 'CREATE VIEW sales.report AS SELECT * FROM sales.orders',
    references: ['sales.orders'],
    incomplete: false,
  };
  expect(dependencyEdges([view])).toEqual([
    expect.objectContaining({
      source: view.id,
      target: 'unresolved:mysql:sales.orders',
      resolved: false,
    }),
  ]);
});
