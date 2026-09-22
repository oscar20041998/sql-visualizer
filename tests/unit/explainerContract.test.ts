import { describe, it, expect } from 'vitest';
import {
  countObjectiveChars,
  isWithinLengthBudget,
  parseExplainerPayload,
  type ExplainerPayload,
  type ExplainerSections,
} from '@/lib/ai/aiService';

const VALID_PAYLOAD = {
  query_objective: 'Shows monthly revenue by region for active stores.',
  result_bullets: ['One bullet per month and region with total revenue.', 'Sorted by month, limited to 100 rows.'],
  report_grain: 'One row per store per month.',
  filter_categories: [{ category: 'time range', items: ['Only the last 30 days.'] }],
  data_sources: [{ name: 'orders', purpose: 'Customer purchase records.' }],
};

describe('U1 parses a valid five-key payload preserving key order', () => {
  it('parses the JSON string keys in contract order into a structured explanation', () => {
    const raw = JSON.stringify(VALID_PAYLOAD);
    const parsed: ExplainerPayload = parseExplainerPayload(raw);
    expect(parsed.structured).toBe(true);
    expect(Object.keys(parsed.sections)).toEqual([
      'query_objective',
      'result_bullets',
      'report_grain',
      'filter_categories',
      'data_sources',
    ]);
    expect(parsed.sections.query_objective).toBe(VALID_PAYLOAD.query_objective);
  });
});

describe('U2 rejects a payload missing report_grain', () => {
  it('marks the payload unstructured when report_grain is absent', () => {
    const { report_grain: _omitted, ...withoutGrain } = VALID_PAYLOAD;
    const parsed: ExplainerPayload = parseExplainerPayload(JSON.stringify(withoutGrain));
    expect(parsed.structured).toBe(false);
    expect(parsed.raw).toContain('query_objective');
  });
});

describe('U3 rejects a payload with an extra top-level key', () => {
  it('marks the payload unstructured when an unknown sixth key is present', () => {
    const raw = JSON.stringify({ ...VALID_PAYLOAD, calculations: ['SUM(amount)'] });
    const parsed: ExplainerPayload = parseExplainerPayload(raw);
    expect(parsed.structured).toBe(false);
  });
});

describe('U4 rejects an empty result_bullets array', () => {
  it('marks the payload unstructured when result_bullets is empty', () => {
    const raw = JSON.stringify({ ...VALID_PAYLOAD, result_bullets: [] });
    const parsed: ExplainerPayload = parseExplainerPayload(raw);
    expect(parsed.structured).toBe(false);
  });
});

describe('U5 accepts a filterless query as one no-filter category', () => {
  it('parses an explicit no-filters category as structured', () => {
    const raw = JSON.stringify({
      ...VALID_PAYLOAD,
      filter_categories: [{ category: 'other constraints', items: ['No filters: every row is included.'] }],
    });
    const parsed: ExplainerPayload = parseExplainerPayload(raw);
    expect(parsed.structured).toBe(true);
    expect(parsed.sections.filter_categories).toEqual([
      { category: 'other constraints', items: ['No filters: every row is included.'] },
    ]);
  });
});

describe('U6 rejects a filter category with empty items', () => {
  it('marks the payload unstructured when a category has no items', () => {
    const raw = JSON.stringify({
      ...VALID_PAYLOAD,
      filter_categories: [{ category: 'status', items: [] }],
    });
    const parsed: ExplainerPayload = parseExplainerPayload(raw);
    expect(parsed.structured).toBe(false);
  });
});

describe('U7 accepts a CTE entry with name plus one-phrase role', () => {
  it('parses a named query step with a one-phrase role as structured', () => {
    const raw = JSON.stringify({
      ...VALID_PAYLOAD,
      data_sources: [{ name: 'monthly_sales', purpose: 'A named step in this query: monthly totals.' }],
    });
    const parsed: ExplainerPayload = parseExplainerPayload(raw);
    expect(parsed.structured).toBe(true);
    expect(parsed.sections.data_sources).toEqual([
      { name: 'monthly_sales', purpose: 'A named step in this query: monthly totals.' },
    ]);
  });
});

describe('U8 rejects a CTE entry describing inner query logic', () => {
  it('marks the payload unstructured when a purpose narrates inner logic', () => {
    const raw = JSON.stringify({
      ...VALID_PAYLOAD,
      data_sources: [
        { name: 'monthly_sales', purpose: 'First it groups orders by month, then it sums revenue and filters 2024.' },
      ],
    });
    const parsed: ExplainerPayload = parseExplainerPayload(raw);
    expect(parsed.structured).toBe(false);
  });
});

describe('U9 marks an unsupported data-source purpose as unknown', () => {
  it('keeps a literal unknown purpose as a valid structured entry', () => {
    const raw = JSON.stringify({
      ...VALID_PAYLOAD,
      data_sources: [{ name: 'dim_customer', purpose: 'unknown' }],
    });
    const parsed: ExplainerPayload = parseExplainerPayload(raw);
    expect(parsed.structured).toBe(true);
    expect(parsed.sections.data_sources[0]).toEqual({ name: 'dim_customer', purpose: 'unknown' });
  });
});

describe('U10 rejects a payload contradicting parser sources', () => {
  it('marks the payload unstructured when a data source is absent from parser facts', () => {
    const raw = JSON.stringify({
      ...VALID_PAYLOAD,
      data_sources: [{ name: 'ghost_table', purpose: 'Customer purchase records.' }],
    });
    const parsed: ExplainerPayload = parseExplainerPayload(raw, ['orders', 'customers']);
    expect(parsed.structured).toBe(false);
  });
});

describe('U18 rejects each of the six banned topics', () => {
  const BANNED_CASES: Array<[string, string]> = [
    ['CTE inner logic', 'monthly_sales CTE is built from the orders table.'],
    ['join mechanics', 'It joins the orders table to customers.'],
    ['execution steps', 'It groups orders by month and then filters rows.'],
    ['calculations', 'It computes SUM(amount) per row.'],
    ['data lineage', 'This shows the lineage of each column.'],
    ['performance analysis', 'This query is slow and needs performance tuning.'],
  ];

  it.each(BANNED_CASES)('rejects %s wherever it appears in the payload', (_family: string, phrase: string) => {
    const raw = JSON.stringify({ ...VALID_PAYLOAD, data_sources: [{ name: 'orders', purpose: phrase }] });
    const parsed: ExplainerPayload = parseExplainerPayload(raw);
    expect(parsed.structured).toBe(false);
  });
});

function sectionsWithVisibleLength(target: number): ExplainerSections {
  return {
    query_objective: 'a'.repeat(target),
    result_bullets: [],
    report_grain: '',
    filter_categories: [],
    data_sources: [],
  };
}

describe('U11 counts exactly 500 human-readable characters as within budget', () => {
  it('accepts a 500-character explanation', () => {
    expect(isWithinLengthBudget(countObjectiveChars(sectionsWithVisibleLength(500)))).toBe(true);
  });
});

describe('U12 counts 499 human-readable characters as below budget', () => {
  it('rejects a 499-character explanation', () => {
    expect(isWithinLengthBudget(countObjectiveChars(sectionsWithVisibleLength(499)))).toBe(false);
  });
});

describe('U13 counts exactly 1,500 human-readable characters as within budget', () => {
  it('accepts a 1500-character explanation', () => {
    expect(isWithinLengthBudget(countObjectiveChars(sectionsWithVisibleLength(1500)))).toBe(true);
  });
});

describe('U14 counts 1,501 human-readable characters as above budget', () => {
  it('rejects a 1501-character explanation', () => {
    expect(isWithinLengthBudget(countObjectiveChars(sectionsWithVisibleLength(1501)))).toBe(false);
  });
});

describe('U15 excludes whitespace padding from the character count', () => {
  it('counts only visible text when the objective is whitespace-padded', () => {
    const sections: ExplainerSections = {
      query_objective: `  ${'a'.repeat(498)}  `,
      result_bullets: [],
      report_grain: '',
      filter_categories: [],
      data_sources: [],
    };
    expect(countObjectiveChars(sections)).toBe(498);
  });
});
