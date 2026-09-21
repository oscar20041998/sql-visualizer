import { beforeEach, describe, expect, it } from 'vitest';
import {
  calculateQueryComplexity,
  getNormalizedLevel,
  normalizeScore,
} from '@/lib/sql/complexityScorer';
import { getT } from '@/lib/i18n';
import { resetTestStorage } from '../utils/test-setup';

/** specs/010-sql-intelligence-dashboard T005/T006 — U3..U9 (FR-001, FR-008, FR-027, FR-028). */

const SAMPLE_SQL =
  'SELECT u.id, o.amount FROM users u LEFT JOIN orders o ON u.id = o.user_id WHERE u.active = 1 GROUP BY u.id';

describe('normalized complexity score (specs/010-sql-intelligence-dashboard T005 / U3)', () => {
  it('maps a raw score of 0 to 0 and rises monotonically toward but never beyond 100', () => {
    expect(normalizeScore(0)).toBe(0);

    const samples = [1, 5, 20, 60, 150, 483, 2000, 50000];
    const normalized = samples.map((raw) => normalizeScore(raw));
    for (let i = 1; i < normalized.length; i++) {
      expect(normalized[i]).toBeGreaterThan(normalized[i - 1]);
    }
    normalized.forEach((value) => {
      expect(value).toBeLessThanOrEqual(100);
    });
    // Calibration reference from the product's own example: raw 483 → 82.
    expect(normalizeScore(483)).toBe(82);
  });
});

describe('normalized level boundaries (specs/010-sql-intelligence-dashboard T005 / U4, U5, U6)', () => {
  it('resolves both sides of the LOW/MEDIUM boundary', () => {
    expect(getNormalizedLevel(24)).toBe('LOW');
    expect(getNormalizedLevel(25)).toBe('MEDIUM');
  });

  it('resolves both sides of the MEDIUM/HIGH boundary', () => {
    expect(getNormalizedLevel(54)).toBe('MEDIUM');
    expect(getNormalizedLevel(55)).toBe('HIGH');
  });

  it('resolves both sides of the HIGH/SUPER_HIGH boundary', () => {
    expect(getNormalizedLevel(79)).toBe('HIGH');
    expect(getNormalizedLevel(80)).toBe('SUPER_HIGH');
  });
});

describe('history independence (specs/010-sql-intelligence-dashboard T006 / U7)', () => {
  beforeEach(() => {
    resetTestStorage();
  });

  it('yields the same normalized score and level with an empty and a skewed score history', () => {
    const empty = calculateQueryComplexity(SAMPLE_SQL);

    resetTestStorage();
    window.localStorage.setItem('complexityScoreList', JSON.stringify([999]));
    const skewed = calculateQueryComplexity(SAMPLE_SQL);

    expect(skewed.normalizedScore).toBe(empty.normalizedScore);
    expect(skewed.normalizedLevel).toBe(empty.normalizedLevel);
    // The legacy dynamic denominator DID move — proof the normalized score is independent of it.
    expect(skewed.maxScorePossible).not.toBe(empty.maxScorePossible);
  });
});

describe('empty input (specs/010-sql-intelligence-dashboard T006 / U8)', () => {
  beforeEach(() => {
    resetTestStorage();
  });

  it('scores empty and whitespace-only SQL as raw 0, normalized 0, level LOW, with no linting issues', () => {
    for (const sql of ['', '   \n\t  ']) {
      const result = calculateQueryComplexity(sql);
      expect(result.totalScore).toBe(0);
      expect(result.normalizedScore).toBe(0);
      expect(result.normalizedLevel).toBe('LOW');
      expect(result.lintingIssues).toHaveLength(0);
    }
  });
});

describe('legacy dynamic fields stay advanced-only (specs/010-sql-intelligence-dashboard T006 / U9)', () => {
  beforeEach(() => {
    resetTestStorage();
  });

  it('still computes maxScorePossible and percentageOfMax, and derives the normalized level only from the normalized score', () => {
    const result = calculateQueryComplexity(SAMPLE_SQL);

    expect(typeof result.maxScorePossible).toBe('number');
    expect(typeof result.percentageOfMax).toBe('number');
    expect(result.normalizedLevel).toBe(getNormalizedLevel(result.normalizedScore));

    const t = getT('en');
    expect(result.normalizedThresholds.map((item) => item.level)).toEqual([
      'LOW',
      'MEDIUM',
      'HIGH',
      'SUPER_HIGH',
    ]);
    expect(result.normalizedThresholds[0].label).toBe(t.complexityLow);
    expect(result.normalizedThresholds[0]).toMatchObject({ min: 0, max: 24 });
    expect(result.normalizedThresholds[3]).toMatchObject({ min: 80, max: 100 });
  });
});
