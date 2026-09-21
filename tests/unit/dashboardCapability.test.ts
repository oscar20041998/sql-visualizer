import { describe, expect, it } from 'vitest';
import { resolveCapabilities, type DashboardSection } from '@/lib/sql/dashboard/capability';

/** specs/010-sql-intelligence-dashboard T008 — U10, U11, U12 (FR-013, FR-014, FR-015). */

const ALL_SECTIONS: DashboardSection[] = [
  'health',
  'findings',
  'complexity',
  'structure',
  'join',
  'cte',
  'predicates',
  'select',
  'functions',
  'dependencies',
  'ai',
  'advanced',
];

describe('dashboard capability resolution (specs/010-sql-intelligence-dashboard T008 / U10, U11, U12)', () => {
  it('resolves the core analysis sections to supported for a query object (U10)', () => {
    const caps = resolveCapabilities('query');
    const supported: DashboardSection[] = [
      'complexity',
      'findings',
      'structure',
      'join',
      'cte',
      'select',
      'functions',
    ];
    for (const section of supported) {
      expect(caps[section]).toBe('supported');
    }
  });

  it('resolves dependencies and predicates to partial for a query object (U11)', () => {
    const caps = resolveCapabilities('query');
    expect(caps.dependencies).toBe('partial');
    expect(caps.predicates).toBe('partial');
  });

  it('resolves every analysis section to unsupported for non-query object types (U12)', () => {
    const nonQuery = ['cte', 'view', 'procedure', 'function', 'trigger'] as const;
    for (const objectType of nonQuery) {
      const caps = resolveCapabilities(objectType);
      for (const section of ALL_SECTIONS) {
        expect(caps[section]).toBe('unsupported');
      }
    }
  });
});
