import { expect, it } from 'vitest';
import { analyzeView } from '@/lib/sql/viewAnalyzer';

it.each(['mysql', 'postgresql'] as const)(
  'returns explicitly declared view columns for %s',
  async (dialect: 'mysql' | 'postgresql') => {
    const result = await analyzeView(
      'CREATE VIEW sales.v (order_id, order_status) AS SELECT id, status FROM orders;',
      dialect
    );

    expect(result).toMatchObject({
      status: 'partial',
      name: 'v',
      columns: ['order_id', 'order_status'],
    });
  }
);
