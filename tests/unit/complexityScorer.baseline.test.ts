import { beforeEach, describe, expect, it } from 'vitest';
import { calculateQueryComplexity } from '@/lib/sql/complexityScorer';
import { getT } from '@/lib/i18n';
import { resetTestStorage } from '../utils/test-setup';

/**
 * Characterization baseline (specs/010-sql-intelligence-dashboard T001 / U1, U2).
 * Captures what the scorer does TODAY so the normalization change (T007) cannot
 * silently alter the raw weight-matrix arithmetic or the linting rule set.
 */

const SAMPLE_SQL = `SELECT u.id, o.amount
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.active = 1
GROUP BY u.id
ORDER BY o.amount DESC`;

describe('complexityScorer baseline (specs/010-sql-intelligence-dashboard T001 / U1)', () => {
  beforeEach(() => {
    resetTestStorage();
  });

  it('keeps the raw total equal to the sum of its keyword, select-field, CTE, window-function and subquery subtotals', () => {
    const result = calculateQueryComplexity(SAMPLE_SQL);
    const parts = result.scoreBreakdown;
    const keywordSubtotal = parts.keywords.reduce((sum, k) => sum + k.subtotal, 0);

    expect(result.totalScore).toBe(
      keywordSubtotal +
        parts.selectFields.complexityScore +
        parts.ctes.totalScore +
        parts.windowFunctions.totalScore +
        parts.subqueries.totalScore
    );
  });
});

describe('complexityScorer linting baseline (specs/010-sql-intelligence-dashboard T001 / U2)', () => {
  beforeEach(() => {
    resetTestStorage();
  });

  it('reports SELECT * as a warning finding with rule, message, suggestion and location', () => {
    const t = getT('en');
    const result = calculateQueryComplexity('SELECT * FROM users WHERE active = 1');

    const selectAll = result.lintingIssues.find((issue) => issue.rule === t.lintingSelectAll);
    expect(selectAll).toBeDefined();
    expect(selectAll?.severity).toBe('warning');
    expect(selectAll?.message).toBe(t.lintingSelectAllMessage);
    expect(selectAll?.suggestion).toBe(t.lintingSelectAllSuggestion);
    expect(selectAll?.location).toBeDefined();
  });

  it('reports no SELECT * finding for a statement that lists its columns', () => {
    const t = getT('en');
    const result = calculateQueryComplexity('SELECT id, name FROM users');

    expect(result.lintingIssues.find((issue) => issue.rule === t.lintingSelectAll)).toBeUndefined();
  });
});
