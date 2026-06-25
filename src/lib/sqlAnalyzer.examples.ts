/**
 * SQL Analyzer with dt-sql-parser Integration - Usage Examples
 *
 * This file demonstrates how the dt-sql-parser integration extracts comprehensive
 * SQL analysis information from various SQL query types.
 */

import { analyzeSql, type AnalysisResult } from './sqlAnalyzer';

/**
 * Example 1: Simple SELECT with JOIN
 */
export const example1SimpleJoin = `
  SELECT 
    o.order_id,
    c.customer_name,
    p.product_name,
    ol.quantity
  FROM orders o
  JOIN customers c ON o.customer_id = c.id
  JOIN order_lines ol ON o.order_id = ol.order_id
  JOIN products p ON ol.product_id = p.id
  WHERE o.order_date > '2024-01-01'
  ORDER BY o.order_id DESC
`;

/**
 * Example 2: Query with CTEs (Common Table Expressions)
 */
export const example2WithCTEs = `
  WITH monthly_sales AS (
    SELECT 
      DATE_TRUNC('month', order_date) as month,
      customer_id,
      SUM(amount) as total_sales
    FROM orders
    GROUP BY DATE_TRUNC('month', order_date), customer_id
  ),
  customer_avg AS (
    SELECT 
      customer_id,
      AVG(total_sales) as avg_monthly_sales
    FROM monthly_sales
    GROUP BY customer_id
  )
  SELECT 
    ms.month,
    ms.customer_id,
    ms.total_sales,
    ca.avg_monthly_sales,
    ROUND(((ms.total_sales - ca.avg_monthly_sales) / ca.avg_monthly_sales * 100), 2) as variance_percent
  FROM monthly_sales ms
  JOIN customer_avg ca ON ms.customer_id = ca.customer_id
  ORDER BY ms.month DESC, variance_percent DESC
`;

/**
 * Example 3: Nested Subqueries
 */
export const example3NestedSubqueries = `
  SELECT 
    customer_id,
    (SELECT COUNT(*) FROM orders WHERE customer_id = c.id) as order_count,
    (SELECT AVG(amount) FROM orders WHERE customer_id = c.id) as avg_order_value
  FROM customers c
  WHERE id IN (
    SELECT DISTINCT customer_id 
    FROM orders 
    WHERE order_date > (
      SELECT DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    )
  )
`;

/**
 * Example 4: Complex Query with Window Functions
 */
export const example4WindowFunctions = `
  SELECT 
    order_id,
    customer_id,
    amount,
    SUM(amount) OVER (PARTITION BY customer_id ORDER BY order_date) as running_total,
    ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY amount DESC) as rank_in_customer,
    LAG(amount) OVER (ORDER BY order_date) as previous_order_amount
  FROM orders
  WHERE amount > 100
`;

/**
 * Example 5: Aggregation with HAVING
 */
export const example5AggregationWithHaving = `
  SELECT 
    c.country,
    COUNT(DISTINCT o.customer_id) as unique_customers,
    COUNT(o.order_id) as total_orders,
    SUM(ol.quantity) as total_items_sold,
    AVG(o.amount) as avg_order_value
  FROM customers c
  LEFT JOIN orders o ON c.id = o.customer_id
  LEFT JOIN order_lines ol ON o.order_id = ol.order_id
  GROUP BY c.country
  HAVING COUNT(o.order_id) > 5 AND AVG(o.amount) > 50
  ORDER BY total_orders DESC
`;

/**
 * Test harness to run analysis on example queries
 */
export async function runExampleAnalysis(): Promise<void> {
  const examples = [
    { name: 'Simple JOIN', sql: example1SimpleJoin, dialect: 'postgresql' as const },
    { name: 'CTEs Query', sql: example2WithCTEs, dialect: 'postgresql' as const },
    { name: 'Nested Subqueries', sql: example3NestedSubqueries, dialect: 'mysql' as const },
    { name: 'Window Functions', sql: example4WindowFunctions, dialect: 'mysql' as const },
    {
      name: 'Aggregation & HAVING',
      sql: example5AggregationWithHaving,
      dialect: 'postgresql' as const,
    },
  ];

  console.log('🔍 SQL Analyzer - dt-sql-parser Integration Examples\n');
  console.log('═'.repeat(80));

  for (const example of examples) {
    try {
      console.log(`\n📝 Example: ${example.name}`);
      console.log(`   Dialect: ${example.dialect}`);
      console.log('─'.repeat(80));

      const result = analyzeSql(example.sql, example.dialect);

      // Display analysis results
      console.log(`\n   Tables Found: ${result.tables.length}`);
      result.tables.forEach((table, idx) => {
        console.log(
          `     ${idx + 1}. ${table.name}${table.alias ? ` (${table.alias})` : ''} - ${table.columns.length} columns`
        );
      });

      console.log(`\n   Joins: ${result.joins.length}`);
      result.joins.slice(0, 3).forEach((join, idx) => {
        console.log(`     ${idx + 1}. ${join.joinType}`);
      });

      console.log(`\n   CTEs: ${result.ctes.length}`);
      result.ctes.forEach((cte, idx) => {
        console.log(`     ${idx + 1}. ${cte.name}`);
      });

      console.log(`\n   Metrics:`);
      console.log(`     • Join Count: ${result.metrics.joinCount}`);
      console.log(`     • Subquery Depth: ${result.metrics.subqueryDepth}`);
      console.log(`     • Window Functions: ${result.metrics.windowFunctions}`);
      console.log(`     • GROUP BY: ${result.metrics.groupBy}`);
      console.log(`     • CTE Count: ${result.metrics.cteCount}`);

      console.log(
        `\n   Complexity: ${result.complexity.level} (${result.complexity.score}/${result.complexity.maxScore})`
      );
      console.log(`   Execution Cost Score: ${result.executionCost.score}/100`);

      console.log(`\n   Query Fields: ${result.mainQueryFields.length}`);
      result.mainQueryFields.slice(0, 3).forEach((field, idx) => {
        console.log(`     ${idx + 1}. ${field.field} → ${field.sourceTable} [${field.type}]`);
      });
    } catch (error) {
      console.error(`   ❌ Error analyzing: ${(error as Error).message}`);
    }

    console.log('═'.repeat(80));
  }
}

/**
 * Structured analysis output for integration testing
 */
export function getAnalysisMetadata(result: AnalysisResult): Record<string, unknown> {
  return {
    summary: {
      tables: result.tables.length,
      joins: result.joins.length,
      ctes: result.ctes.length,
      fields: result.mainQueryFields.length,
    },
    metrics: result.metrics,
    complexity: {
      level: result.complexity.level,
      score: result.complexity.score,
    },
    executionCost: {
      score: result.executionCost.score,
      factors: result.executionCost.factors.map((f) => ({
        name: f.name,
        impact: f.impact,
      })),
    },
  };
}

// Example usage in a test environment:
// import { runExampleAnalysis } from './sqlAnalyzer.examples';
//
// // Run all examples
// runExampleAnalysis().then(() => {
//   console.log('\n✅ Analysis complete!');
// }).catch(err => {
//   console.error('❌ Analysis failed:', err);
// });
