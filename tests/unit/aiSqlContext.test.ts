import { describe, expect, it } from 'vitest';
import type { AnalysisResult } from '@/lib/sql/sqlAnalyzer';
import { buildSqlContextBrief, fitContextBrief } from '@/lib/ai/aiSqlContext';
import { estimateTokens } from '@/lib/ai/aiTokens';
import { explainSqlStructured } from '@/lib/ai/aiService';
import type { AIModelConfig } from '@/lib/store';

const analysis = {
  tables: [
    { id: 'orders', name: 'orders', alias: 'o', isCTE: false, isSubquery: false },
    { id: 'customers', name: 'customers', alias: 'c', isCTE: false, isSubquery: false },
  ],
  joins: [
    {
      source: 'orders',
      target: 'customers',
      joinType: 'LEFT JOIN',
      condition: 'o.customer_id = c.id',
    },
  ],
  ctes: [],
  mainQueryFields: [
    {
      field: 'COUNT(o.id)',
      alias: 'order_count',
      origin: 'expression',
      sourceTable: '',
      type: 'expression',
    },
  ],
  structuralReport: {
    finalSelectFields: [
      { expression: 'COUNT(o.id)', alias: 'order_count', category: 'calculated' },
    ],
  },
  metrics: {
    where: 1,
    conditionCount: 2,
    groupBy: 1,
    having: 1,
    orderBy: 1,
    distinct: 0,
    windowFunctions: 0,
    subqueryCount: 0,
    subqueryDepth: 0,
  },
  metricDetails: {
    conditions: [
      { snippet: "o.status = 'PAID'", clause: 'WHERE', scope: 'main' },
      { snippet: 'COUNT(o.id) > 2', clause: 'HAVING', scope: 'main' },
    ],
    groupBy: [{ snippet: 'c.id', scope: 'main' }],
    orderBy: [{ snippet: 'order_count DESC', scope: 'main' }],
  },
  complexity: { level: 'LOW' },
} as unknown as AnalysisResult;

describe('SQL context brief', () => {
  it('includes parser-extracted output expressions and clause contents', () => {
    const brief = buildSqlContextBrief(analysis, { detailed: true });

    expect(brief).toContain('COUNT(o.id) AS order_count');
    expect(brief).toContain("WHERE: o.status = 'PAID'");
    expect(brief).toContain('HAVING: COUNT(o.id) > 2');
    expect(brief).toContain('GROUP BY:\n- c.id');
    expect(brief).toContain('ORDER BY:\n- order_count DESC');
  });

  it('keeps the existing compact brief as the default for other AI features', () => {
    const brief = buildSqlContextBrief(analysis);

    expect(brief).toContain('Tables: orders (alias o), customers (alias c)');
    expect(brief).not.toContain('Output expressions:');
  });

  it('keeps the fitting prefix of an oversized brief instead of dropping all context', () => {
    const brief = [
      'Verified parser facts:',
      '- Tables: orders, customers',
      '- WHERE: o.status = PAID',
      '- GROUP BY: customers.region',
      '- ORDER BY: order_count DESC',
      '- CTEs: paid_orders',
    ].join('\n');
    const budget = Math.ceil(estimateTokens(brief) * 0.55);
    const fitted = fitContextBrief(brief, budget, { truncate: true });

    expect(fitted).not.toBe('');
    expect(fitted).not.toBe(brief);
    expect(fitted).toContain('Verified parser facts:');
    expect(estimateTokens(fitted)).toBeLessThanOrEqual(budget);
    expect(fitContextBrief(brief, budget)).toBe('');
  });

  it('preserves SQL that fits and uses remaining prompt space for a large brief', async () => {
    const sql = `SELECT ${Array.from(
      { length: 120 },
      (_, index) => `COALESCE(CAST(field_${index} AS VARCHAR(128)), 'missing') AS result_${index}`
    ).join(', ')} FROM source_data`;
    const contextBrief = Array.from(
      { length: 400 },
      (_, index) => `- Verified parser fact ${index}: relevant query structure.`
    ).join('\n');
    const response = JSON.stringify({
      query_objective: 'S'.repeat(500),
      result_bullets: ['One result per source row.'],
      report_grain: 'One row per source row.',
      filter_categories: [{ category: 'other constraints', items: ['No filters apply.'] }],
      data_sources: [{ name: 'source_data', purpose: 'unknown' }],
    });
    const config = {
      provider: 'ollama',
      contextTokens: { ollama: 8192 },
      maxOutputTokens: { ollama: 1200 },
    } as AIModelConfig;
    const generate = async (_config: AIModelConfig, request: { prompt?: string }) => {
      expect(request.prompt).toContain(sql);
      expect(request.prompt).toContain('Verified parser fact');
      return response;
    };

    const result = await explainSqlStructured({ sql, config, contextBrief }, generate);

    expect(result.budget.sqlTruncated).toBe(false);
    expect(result.budget.contextBriefDropped).toBe(false);
  });
});
