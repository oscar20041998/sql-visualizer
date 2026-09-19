import { describe, expect, it } from 'vitest';
import { resolveHintedTableReferences } from './aiService';
import type { AnalysisResult } from '../sql/sqlAnalyzer';

function makeAnalysisWithTables(names: string[]): AnalysisResult {
  return {
    tables: names.map((name, index) => ({ id: `t${index}`, name, columns: [] })),
  } as unknown as AnalysisResult;
}

describe('resolveHintedTableReferences', () => {
  it('resolves hints that match a known table name (case-insensitive)', () => {
    const analysis = makeAnalysisWithTables(['orders', 'customers']);
    const { resolved, unresolved } = resolveHintedTableReferences(['Orders', 'customers'], analysis);
    expect(resolved).toEqual(['Orders', 'customers']);
    expect(unresolved).toEqual([]);
  });

  it('reports hints that do not match any known table as unresolved', () => {
    const analysis = makeAnalysisWithTables(['orders']);
    const { resolved, unresolved } = resolveHintedTableReferences(['orders', 'shipping_addresses'], analysis);
    expect(resolved).toEqual(['orders']);
    expect(unresolved).toEqual(['shipping_addresses']);
  });

  it('treats every hint as unresolved when there is no analysis', () => {
    const { resolved, unresolved } = resolveHintedTableReferences(['orders'], null);
    expect(resolved).toEqual([]);
    expect(unresolved).toEqual(['orders']);
  });

  it('ignores blank hints', () => {
    const analysis = makeAnalysisWithTables(['orders']);
    const { resolved, unresolved } = resolveHintedTableReferences(['', '  ', 'orders'], analysis);
    expect(resolved).toEqual(['orders']);
    expect(unresolved).toEqual([]);
  });
});
