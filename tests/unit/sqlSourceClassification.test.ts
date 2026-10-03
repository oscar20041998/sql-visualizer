import { describe, expect, it } from 'vitest';
import { analyzeSql, type SqlDialect } from '@/lib/sql/sqlAnalyzer';

const dialects: SqlDialect[] = ['mysql', 'postgresql', 'sqlserver', 'oracle'];

describe('SQL source classification', () => {
  it.each(dialects)('classifies physical tables and same-query CTEs for %s', async (dialect: SqlDialect) => {
    const analysis = await analyzeSql(
      `WITH customer_orders AS (
        SELECT * FROM orders
      )
      SELECT * FROM customer_orders`,
      dialect
    );

    expect(analysis.tables).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'orders', sourceType: 'TABLE' }),
        expect.objectContaining({ name: 'customer_orders', sourceType: 'CTE' }),
      ])
    );
  });

  it('keeps aliased CTE occurrences distinct for a self-join', async () => {
    const analysis = await analyzeSql(
      `WITH customer_orders AS (SELECT * FROM orders)
       SELECT a.id, b.id
       FROM customer_orders a
       JOIN customer_orders b ON a.id = b.id`,
      'postgresql'
    );

    const occurrences = analysis.tables.filter((table) => table.name === 'customer_orders');
    expect(occurrences).toHaveLength(2);
    expect(occurrences.map((table) => table.alias)).toEqual(expect.arrayContaining(['a', 'b']));
    expect(occurrences.every((table) => table.sourceType === 'CTE')).toBe(true);
    expect(new Set(occurrences.map((table) => table.id)).size).toBe(2);
  });

  it('keeps schema-qualified physical tables distinct from a matching CTE name', async () => {
    const analysis = await analyzeSql(
      `WITH orders AS (SELECT * FROM staging_orders)
       SELECT * FROM reporting.orders
       JOIN orders ON reporting.orders.id = orders.id`,
      'postgresql'
    );

    expect(analysis.tables).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'reporting.orders', sourceType: 'TABLE' }),
        expect.objectContaining({ name: 'orders', sourceType: 'CTE' }),
      ])
    );
  });

  it('classifies a derived FROM source as a subquery', async () => {
    const analysis = await analyzeSql(
      `SELECT *
       FROM (SELECT * FROM orders) recent_orders
       JOIN customers ON recent_orders.customer_id = customers.id`,
      'postgresql'
    );

    expect(analysis.tables).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'recent_orders', alias: 'recent_orders', sourceType: 'SUBQUERY' }),
        expect.objectContaining({ name: 'orders', sourceType: 'TABLE' }),
      ])
    );
  });

  it('emits one relationship for a dependent CTE pair', async () => {
    const analysis = await analyzeSql(
      `WITH first_orders AS (SELECT * FROM orders),
            second_orders AS (SELECT * FROM first_orders)
       SELECT * FROM second_orders`,
      'postgresql'
    );

    const dependencyEdges = analysis.joins.filter((join) => join.joinType === 'RELATES TO');
    expect(dependencyEdges).toHaveLength(1);
    expect(analysis.tables).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'first_orders', sourceType: 'CTE' }),
        expect.objectContaining({ name: 'second_orders', sourceType: 'CTE' }),
      ])
    );
  });

  it('derives compatibility flags from canonical source type', async () => {
    const analysis = await analyzeSql(
      `WITH customer_orders AS (SELECT * FROM orders)
       SELECT * FROM (SELECT * FROM customer_orders) recent_orders`,
      'postgresql'
    );

    analysis.tables.forEach((table) => {
      expect(table.isCTE).toBe(table.sourceType === 'CTE');
      expect(table.isSubquery).toBe(table.sourceType === 'SUBQUERY');
    });
  });

  it('keeps analysis of 50 or more source occurrences under one second', async () => {
    const sources = Array.from({ length: 55 }, (_, index) => `source_${index} s${index}`);
    const sql = `SELECT * FROM ${sources[0]} ${sources
      .slice(1)
      .map((source, index) => `JOIN ${source} ON s${index}.id = s${index + 1}.id`)
      .join(' ')}`;
    const startedAt = performance.now();
    const analysis = await analyzeSql(sql, 'postgresql');
    const elapsedMs = performance.now() - startedAt;

    expect(analysis.tables.length).toBeGreaterThanOrEqual(55);
    expect(elapsedMs).toBeLessThan(1000);
  });
});