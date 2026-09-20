import { describe, expect, it } from 'vitest';
import { calculateQueryComplexity } from '@/lib/sql/complexityScorer';
import { analyzeSql } from '@/lib/sql/sqlAnalyzer';

describe('subquery metric consistency', () => {
  it('excludes a CTE definition body while counting a nested IN subquery', async () => {
    const sql = `
      WITH active_orders AS (
        SELECT order_id
        FROM orders
        WHERE status = 'active'
      )
      SELECT customer_id
      FROM customers
      WHERE id IN (
        SELECT customer_id
        FROM active_orders
      )
    `;

    const analysis = await analyzeSql(sql, 'postgresql');
    const complexity = calculateQueryComplexity(sql);

    expect(analysis.metrics.subqueryCount).toBe(1);
    expect(analysis.metrics.subqueryCount).toBe(analysis.metricDetails.subqueries.length);
    expect(complexity.scoreBreakdown.subqueries.count).toBe(1);
  });
});