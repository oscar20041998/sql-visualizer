import { describe, expect, it } from 'vitest';
import { getT } from '@/lib/i18n';

describe('graph locales (019 A27 / U21, U22)', () => {
  it('gives English and Vietnamese the same control keys without the old relationship wording', () => {
    const en = getT('en');
    const vi = getT('vi');
    const keys = [
      'graphFit',
      'graphRearrange',
      'graphIncludeNeighbors',
      'graphFilterAll',
      'graphFilterCte',
      'graphFilterCteNeighbors',
      'graphFilterTable',
      'graphFilterTableNeighbors',
      'graphFilterSubquery',
      'graphFilterSubqueryNeighbors',
      'graphImageExportFailed',
      'graphSuggestions',
      'graphDismissSuggestion',
      'noTablesFound',
    ] as const;

    for (const key of keys) {
      expect(en[key].length).toBeGreaterThan(0);
      expect(vi[key].length).toBeGreaterThan(0);
    }
    expect(en.graphFilterCte).not.toContain("CTE's Relationship");
    expect(vi.graphFilterCte).not.toContain('Quan hệ CTE');
    expect(en.graphFilterCteNeighbors).not.toBe(en.graphFilterCte);
    expect(vi.graphFilterCteNeighbors).not.toBe(vi.graphFilterCte);
  });
});
