import { describe, expect, it } from 'vitest';
import {
  buildExplainComplexityPrompt,
  buildExplainFindingPrompt,
  buildOptimizationOpportunitiesPrompt,
} from '@/lib/sql/dashboard/aiPrompts';

/** specs/010-sql-intelligence-dashboard T012 — U23, U24, U25 (contracts/ai-insights.md). */

const CONTRIBUTORS = [
  { construct: 'CTEs', points: 144, shareOfTotal: 0.3 },
  { construct: 'JOIN', points: 82, shareOfTotal: 0.17 },
];

describe('dashboard AI prompts (specs/010-sql-intelligence-dashboard T012 / U23, U24, U25)', () => {
  it('embeds top contributors, normalized score and level, with distinct vi/en variants (U23)', () => {
    const input = { normalizedScore: 82, level: 'HIGH', contributors: CONTRIBUTORS };

    const en = buildExplainComplexityPrompt(input, 'en');
    expect(en).toContain('82');
    expect(en).toContain('HIGH');
    expect(en).toContain('CTEs');
    expect(en).toContain('144');

    const vi = buildExplainComplexityPrompt(input, 'vi');
    expect(vi).not.toBe(en);
    expect(vi).toContain('82');
  });

  it('embeds the rule and message, plus the location only when present (U24)', () => {
    const en = buildExplainFindingPrompt(
      { rule: 'SELECT *', message: 'select-all detected', location: 'Line 12' },
      'en'
    );
    expect(en).toContain('SELECT *');
    expect(en).toContain('select-all detected');
    expect(en).toContain('Line 12');

    const withoutLocation = buildExplainFindingPrompt({ rule: 'R-WARN', message: 'warned' }, 'en');
    expect(withoutLocation).not.toContain('Location');

    const vi = buildExplainFindingPrompt(
      { rule: 'SELECT *', message: 'select-all detected' },
      'vi'
    );
    expect(vi).not.toBe(withoutLocation);
  });

  it('requests the documented JSON shape with title, rationale and optional suggestedSql (U25)', () => {
    const en = buildOptimizationOpportunitiesPrompt('SELECT * FROM users', 'en');
    expect(en).toContain('JSON');
    expect(en).toContain('title');
    expect(en).toContain('rationale');
    expect(en).toContain('suggestedSql');
    expect(en).toContain('SELECT * FROM users');
    expect(en.toLowerCase()).not.toContain('performance improvement by');

    const vi = buildOptimizationOpportunitiesPrompt('SELECT * FROM users', 'vi');
    expect(vi).not.toBe(en);
  });
});
