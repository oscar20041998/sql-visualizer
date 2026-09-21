import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDashboardData } from '@/lib/sql/dashboard/buildDashboardData';
import type { DashboardContext } from '@/lib/sql/dashboard/types';
import { makeAnalysisResult, makeDetailedComplexity } from '../utils/dashboardFixtures';
import { resetTestStorage } from '../utils/test-setup';

/** specs/010-sql-intelligence-dashboard T010 — U13..U22 (contracts/dashboard-data.md). */

const CONTEXT: DashboardContext = { locale: 'en', aiAvailable: false, inputMode: 'sql' };

describe('dashboard data adapter (specs/010-sql-intelligence-dashboard T010 / U13..U22)', () => {
  beforeEach(() => {
    resetTestStorage();
  });

  it('carries one normalized score with level, rawScore as secondary, and grouped error/warning counts (U13)', () => {
    const data = buildDashboardData(makeAnalysisResult(), CONTEXT);

    expect(data.health.complexity.normalizedScore).toBe(51);
    expect(data.health.complexity.level).toBe('MEDIUM');
    expect(data.health.complexity.rawScore).toBe(111);
    expect(data.health.findingCounts).toEqual({ error: 1, warning: 2 });
    expect(data.objectType).toBe('query');
    expect(data.dialect).toBe('mysql');
  });

  it('groups findings by rule with occurrences and verbatim locations, ordered error-first (U14)', () => {
    const data = buildDashboardData(makeAnalysisResult(), CONTEXT);

    expect(data.findings.map((f) => f.rule)).toEqual(['R-ERR-1', 'R-WARN-1', 'R-WARN-2']);
    const [first] = data.findings;
    expect(first).toMatchObject({
      rule: 'R-ERR-1',
      severity: 'error',
      title: 'R-ERR-1',
      whyItMatters: 'error message one',
      suggestion: 'error fix one',
      occurrences: 2,
    });
    expect(first.locations).toEqual(['Line 12: SELECT *', 'Line 40: SELECT *']);
    expect(data.findings[1].locations).toEqual([]);
    expect(data.findings[2].locations).toEqual(['Line 7: JOIN without condition']);
  });

  it('offers only real actions: viewSql with a location, explainAi with AI, optimize never without a function (U15)', () => {
    const withoutAi = buildDashboardData(makeAnalysisResult(), CONTEXT);
    expect(withoutAi.findings[0].actions).toEqual(['viewSql']);
    expect(withoutAi.findings[1].actions).toEqual([]);

    const withAi = buildDashboardData(makeAnalysisResult(), { ...CONTEXT, aiAvailable: true });
    expect(withAi.findings[0].actions).toEqual(['viewSql', 'explainAi']);
    expect(withAi.findings[1].actions).toEqual(['explainAi']);
    expect(withAi.findings.every((f) => !f.actions.includes('optimize'))).toBe(true);
  });

  it('merges MyBatis findings into the list only when the input mode is MyBatis (U16)', () => {
    const mybatisFinding = {
      rule: 'MB-1',
      severity: 'warning' as const,
      message: 'unresolved fragment',
      suggestion: 'provide parameter values',
    };
    const mybatis = buildDashboardData(makeAnalysisResult(), {
      ...CONTEXT,
      inputMode: 'mybatis',
      mybatisFindings: [mybatisFinding],
    });
    expect(mybatis.findings.some((f) => f.rule === 'MB-1')).toBe(true);

    const sql = buildDashboardData(makeAnalysisResult(), {
      ...CONTEXT,
      mybatisFindings: [mybatisFinding],
    });
    expect(sql.findings.some((f) => f.rule === 'MB-1')).toBe(false);
  });

  it('ranks contributors by points descending with shares of the raw total, empty at raw 0 (U17)', () => {
    const data = buildDashboardData(makeAnalysisResult(), CONTEXT);

    expect(data.contributors.map((c) => c.construct)).toEqual([
      'SELECT fields',
      'Subqueries',
      'Window functions',
      'CTEs',
      'LEFT JOIN',
      'GROUP BY',
      'WHERE',
    ]);
    expect(data.contributors.map((c) => c.points)).toEqual([25, 24, 21, 16, 15, 8, 2]);
    expect(data.contributors[0].shareOfTotal).toBeCloseTo(25 / 111, 5);

    const zeroRaw = buildDashboardData(
      makeAnalysisResult({ detailedComplexity: makeDetailedComplexity({ totalScore: 0 }) }),
      CONTEXT
    );
    expect(zeroRaw.contributors).toEqual([]);
  });

  it('is deterministic and touches no storage (U18)', () => {
    const result = makeAnalysisResult();
    const first = buildDashboardData(result, CONTEXT);
    const second = buildDashboardData(result, CONTEXT);
    expect(first).toEqual(second);

    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    buildDashboardData(result, CONTEXT);
    expect(getItemSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it('downgrades to partial with no fabricated values when detailedComplexity is missing (U19)', () => {
    const data = buildDashboardData(makeAnalysisResult({ detailedComplexity: undefined }), CONTEXT);

    expect(data.capabilities.complexity).toBe('partial');
    expect(data.capabilities.findings).toBe('partial');
    expect(data.health.complexity).toEqual({
      normalizedScore: null,
      level: null,
      rawScore: null,
    });
    expect(data.findings).toEqual([]);
    expect(data.advanced.rawScore).toBeNull();
  });

  it('keeps every existing SqlMetrics key in the structure groups (U20)', () => {
    const result = makeAnalysisResult();
    const data = buildDashboardData(result, CONTEXT);

    const groupKeys = [...data.structure.core, ...data.structure.advanced].flatMap(
      (group) => group.metricKeys
    );
    for (const metricKey of Object.keys(result.metrics)) {
      expect(groupKeys).toContain(metricKey);
    }
  });

  it('emits tabs only for non-unsupported sections, dependencies partial (U21)', () => {
    const data = buildDashboardData(makeAnalysisResult(), CONTEXT);

    expect(data.detailTabs.map((tab) => tab.section)).toEqual([
      'join',
      'cte',
      'predicates',
      'select',
      'functions',
      'dependencies',
    ]);
    expect(data.detailTabs.find((tab) => tab.section === 'dependencies')?.capability).toBe(
      'partial'
    );
  });

  it('keeps a genuine zero metric present while unsupported data has no fake zero fields (U22)', () => {
    const base = makeAnalysisResult();
    const data = buildDashboardData(
      makeAnalysisResult({ metrics: { ...base.metrics, windowFunctions: 0 } }),
      CONTEXT
    );

    const advancedKeys = data.structure.advanced.flatMap((group) => group.metricKeys);
    expect(advancedKeys).toContain('windowFunctions');
    expect(Object.keys(data.dependencies).sort()).toEqual(['capability', 'direct']);
  });
});
