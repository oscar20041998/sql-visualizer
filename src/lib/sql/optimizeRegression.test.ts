import { describe, expect, it } from 'vitest';
import { buildRequirementChangeSummary } from './optimizeRegression';
import type { AnalysisResult } from './sqlAnalyzer';

function makeAnalysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  const base: AnalysisResult = {
    tables: [
      { id: 't1', name: 'orders', alias: 'o', columns: [] },
      { id: 't2', name: 'customers', alias: 'c', columns: [] },
    ],
    joins: [{ id: 'j1', source: 't1', target: 't2', joinType: 'INNER', condition: 'o.customer_id = c.id' }],
    joinAnalysisDetails: [],
    ctes: [],
    metrics: {
      windowFunctions: 0,
      groupBy: 0,
      orderBy: 0,
      distinct: 0,
      having: 0,
      where: 1,
      subqueryDepth: 0,
      subqueryCount: 0,
      conditionCount: 1,
      operationAndFunctionCount: 0,
      lineCount: 3,
      joinCount: 1,
      totalJoinCount: 1,
      cteCount: 0,
      tableCount: 2,
      selectFields: 2,
      finalSelectFieldCount: 2,
    },
    complexity: { level: 'LOW', score: 1, maxScore: 10, factors: [] },
    executionCost: { label: 'Low', score: 1, maxScore: 10, factors: [], recommendation: '' },
    mainQueryFields: [
      { field: 'o.id', alias: 'order_id', origin: 'orders', sourceTable: 'orders', type: 'table' },
      { field: 'c.name', alias: 'customer_name', origin: 'customers', sourceTable: 'customers', type: 'table' },
    ],
    dialect: 'postgresql',
    rawSql: 'SELECT o.id AS order_id, c.name AS customer_name FROM orders o JOIN customers c ON o.customer_id = c.id',
    structuralReport: {
      joinCount: 1,
      subqueryCount: 0,
      conditionCount: 1,
      operationAndFunctionCount: 0,
      lineCount: 3,
      joinLogicComplexity: {
        level: 'LOW',
        score: 0,
        totalJoinConditions: 1,
        simpleConditions: 1,
        multiColumnConditions: 0,
        functionBasedConditions: 0,
        nonEquiConditions: 0,
      },
      allFields: [],
      allFieldsCount: 0,
      finalSelectFields: [],
      finalSelectFieldCount: 2,
      hasCTE: false,
    },
    metricDetails: {
      windowFunctions: [],
      groupBy: [],
      orderBy: [],
      distinct: [],
      conditions: [],
      opsAndFunctions: [],
    },
    hasCTE: false,
  };
  return { ...base, ...overrides };
}

describe('buildRequirementChangeSummary', () => {
  it('reports no semantic change when tables/joins/columns/filters are identical', () => {
    const original = makeAnalysis();
    const candidate = makeAnalysis();
    const summary = buildRequirementChangeSummary(original, candidate);
    expect(summary.isSemanticChange).toBe(false);
    expect(summary.addedTables).toEqual([]);
    expect(summary.removedTables).toEqual([]);
    expect(summary.addedJoins).toEqual([]);
    expect(summary.removedJoins).toEqual([]);
    expect(summary.addedColumns).toEqual([]);
    expect(summary.removedColumns).toEqual([]);
    expect(summary.filterChanged).toBe(false);
  });

  it('detects an added table and an added join', () => {
    const original = makeAnalysis();
    const candidate = makeAnalysis({
      tables: [
        { id: 't1', name: 'orders', alias: 'o', columns: [] },
        { id: 't2', name: 'customers', alias: 'c', columns: [] },
        { id: 't3', name: 'shipping_addresses', alias: 's', columns: [] },
      ],
      joins: [
        { id: 'j1', source: 't1', target: 't2', joinType: 'INNER', condition: 'o.customer_id = c.id' },
        { id: 'j2', source: 't1', target: 't3', joinType: 'LEFT', condition: 'o.id = s.order_id' },
      ],
    });
    const summary = buildRequirementChangeSummary(original, candidate);
    expect(summary.isSemanticChange).toBe(true);
    expect(summary.addedTables).toEqual(['shipping_addresses']);
    expect(summary.removedTables).toEqual([]);
    expect(summary.addedJoins.length).toBe(1);
    expect(summary.removedJoins).toEqual([]);
  });

  it('detects a removed table', () => {
    const original = makeAnalysis();
    const candidate = makeAnalysis({
      tables: [{ id: 't1', name: 'orders', alias: 'o', columns: [] }],
      joins: [],
    });
    const summary = buildRequirementChangeSummary(original, candidate);
    expect(summary.isSemanticChange).toBe(true);
    expect(summary.removedTables).toEqual(['customers']);
    expect(summary.removedJoins.length).toBe(1);
  });

  it('detects added and removed output columns', () => {
    const original = makeAnalysis();
    const candidate = makeAnalysis({
      mainQueryFields: [
        { field: 'o.id', alias: 'order_id', origin: 'orders', sourceTable: 'orders', type: 'table' },
        { field: 'o.total', alias: 'order_total', origin: 'orders', sourceTable: 'orders', type: 'table' },
      ],
    });
    const summary = buildRequirementChangeSummary(original, candidate);
    expect(summary.isSemanticChange).toBe(true);
    expect(summary.addedColumns).toEqual(['order_total']);
    expect(summary.removedColumns).toEqual(['customer_name']);
  });

  it('detects a changed filter via conditionCount', () => {
    const original = makeAnalysis();
    const candidate = makeAnalysis({
      metrics: { ...original.metrics, conditionCount: 2, where: 2 },
    });
    const summary = buildRequirementChangeSummary(original, candidate);
    expect(summary.isSemanticChange).toBe(true);
    expect(summary.filterChanged).toBe(true);
  });
});
