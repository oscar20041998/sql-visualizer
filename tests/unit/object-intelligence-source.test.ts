import { expect, it } from 'vitest';
import { analyzeView } from '@/lib/sql/viewAnalyzer';

it('preserves the query source when a view definition has leading whitespace', async () => {
  const result = await analyzeView(
    '\n  CREATE VIEW active_orders AS SELECT id FROM orders;',
    'mysql'
  );

  expect(result).toMatchObject({
    status: 'partial',
    name: 'active_orders',
    query: 'SELECT id FROM orders',
  });
});

it('reports malformed view SQL as unsupported syntax', async () => {
  await expect(analyzeView('CREATE VIEW broken AS SELECT', 'mysql')).resolves.toEqual({
    status: 'unsupported',
    reason: 'syntax',
  });
});

it.each(['mysql', 'postgresql'] as const)(
  'analyzes a qualified simple view as partial for %s',
  async (dialect: 'mysql' | 'postgresql') => {
    const result = await analyzeView(
      'CREATE VIEW sales.active_orders AS SELECT id FROM orders;',
      dialect
    );

    expect(result).toMatchObject({
      status: 'partial',
      name: 'active_orders',
      schema: 'sales',
      query: 'SELECT id FROM orders',
      tables: ['orders'],
    });
  }
);

it('preserves PostgreSQL view query text after multibyte comments and with a trailing comment', async () => {
  const result = await analyzeView(
    "-- 😀 AS\nCREATE VIEW sales.v AS SELECT 'AS' AS label FROM orders; -- end",
    'postgresql'
  );
  expect(result).toMatchObject({
    status: 'partial',
    query: "SELECT 'AS' AS label FROM orders",
  });
});

it('maps the MySQL view query to its original source position after Unicode comments', async () => {
  const sql = '-- 😀\nCREATE VIEW v AS\n  SELECT id FROM orders;';
  const result = await analyzeView(sql, 'mysql');
  expect(result).toMatchObject({
    status: 'partial',
    query: 'SELECT id FROM orders',
    queryRange: {
      start: { offset: sql.indexOf('SELECT'), line: 3, column: 3 },
      end: { offset: sql.indexOf(';'), line: 3, column: 24 },
    },
  });
});

it('maps the PostgreSQL view query to its original source position after Unicode comments', async () => {
  const sql = '-- 😀\nCREATE VIEW v AS\n  SELECT id FROM orders;';
  const result = await analyzeView(sql, 'postgresql');
  expect(result).toMatchObject({
    status: 'partial',
    query: 'SELECT id FROM orders',
    queryRange: {
      start: { offset: sql.indexOf('SELECT'), line: 3, column: 3 },
      end: { offset: sql.indexOf(';'), line: 3, column: 24 },
    },
  });
}, 30000);
