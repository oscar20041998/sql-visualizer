import { describe, expect, it } from 'vitest';
import { compareSqlSnapshots, LIMITATION_EMPTY_STATEMENT } from '@/lib/sql/sqlComparison';
import type { ComparisonSnapshot } from '@/lib/sql/sqlComparison';

function snapshot(
  beforeSql: string,
  afterSql: string,
  dialect: ComparisonSnapshot['dialect'] = 'postgresql'
) {
  return {
    runId: 'test-run',
    beforeSql,
    afterSql,
    dialect,
    startedAt: '2026-10-09T12:00:00.000Z',
  } satisfies ComparisonSnapshot;
}

describe('SQL structural comparison', () => {
  it('reports filter and projection changes with exact source evidence', async () => {
    const before = "SELECT id, name FROM orders WHERE status = 'open';";
    const after = "SELECT id FROM orders WHERE status = 'closed';";

    const result = await compareSqlSnapshots(snapshot(before, after));

    expect(['completed', 'partial']).toContain(result.status);
    expect(result.changes.map((change) => change.kind)).toEqual(
      expect.arrayContaining(['projection', 'filter'])
    );
    const filter = result.changes.find((change) => change.kind === 'filter');
    expect(filter?.beforeEvidence[0]?.text).toContain("status = 'open'");
    expect(filter?.afterEvidence[0]?.text).toContain("status = 'closed'");
    expect(result.assessment.equivalence).toBe('inconclusive');
  });

  it('reports changed sources, joins, grouping, ordering, and pagination', async () => {
    const before =
      'SELECT customer_id, COUNT(*) FROM orders WHERE active = 1 GROUP BY customer_id ORDER BY customer_id LIMIT 10';
    const after =
      'SELECT customer_id, COUNT(*) FROM orders JOIN customers ON orders.customer_id = customers.id WHERE active = 1 GROUP BY customer_id ORDER BY customer_id DESC LIMIT 20 OFFSET 10';

    const result = await compareSqlSnapshots(snapshot(before, after));

    expect(result.changes.map((change) => change.kind)).toEqual(
      expect.arrayContaining(['source', 'join', 'ordering', 'pagination'])
    );
  });

  it('reports identical SQL as no changes without requesting AI', async () => {
    const sql = 'SELECT id FROM orders;';

    const result = await compareSqlSnapshots(snapshot(sql, sql));

    expect(result.status).toBe('no_changes');
    expect(result.changes).toEqual([]);
    expect(result.findings).toEqual([]);
    expect(result.ai.status).toBe('skipped');
  });

  it('reports an unavailable pair for empty and comment-only inputs', async () => {
    const cases = [
      snapshot('', 'SELECT 1;'),
      snapshot('-- only a comment\n', 'SELECT 1;'),
      snapshot('-- only a comment\n', '-- only a comment\n'),
    ];

    for (const input of cases) {
      const result = await compareSqlSnapshots(input);

      expect(result.status).toBe('partial');
      expect(result.changes).toEqual([]);
      expect(result.findings).toEqual([]);
      expect(result.limitations).toContain(LIMITATION_EMPTY_STATEMENT);
    }
  });

  it('keeps ambiguous CTE matching partial and evidence scoped', async () => {
    const before =
      "WITH active_orders AS (SELECT id FROM orders WHERE status = 'open') SELECT id FROM active_orders;";
    const after =
      "WITH current_orders AS (SELECT id FROM orders WHERE status = 'open') SELECT id FROM current_orders;";

    const result = await compareSqlSnapshots(snapshot(before, after));

    expect(result.status).toBe('partial');
    expect(result.limitations.join(' ')).toMatch(/CTE.*match|match.*CTE/i);
    expect(result.changes).not.toContainEqual(
      expect.objectContaining({ kind: 'cte', support: 'supported', beforeValue: before })
    );
    expect(result.findings).toEqual([]);
  });

  it('reports supported changes and parser limits by dialect', async () => {
    const before = 'SELECT id FROM orders WHERE active = 1;';
    const after = 'SELECT id FROM orders WHERE active = 2;';
    const supportedDialects = ['mysql', 'postgresql', 'sqlserver'] as const;

    const supportedResults = await Promise.all(
      supportedDialects.map((dialect) => compareSqlSnapshots(snapshot(before, after, dialect)))
    );
    for (const result of supportedResults) {
      expect(['completed', 'partial'], result.snapshot.dialect).toContain(result.status);
      expect(result.changes.some((change) => change.kind === 'filter')).toBe(true);
      if (result.status === 'partial') {
        expect(result.limitations.length, result.snapshot.dialect).toBeGreaterThan(0);
      }
    }

    const oracleResult = await compareSqlSnapshots(snapshot(before, after, 'oracle'));
    expect(oracleResult.status).toBe('partial');
    expect(oracleResult.limitations.join(' ')).toMatch(/AST|parser|Oracle/i);
    expect(oracleResult.changes.some((change) => change.kind === 'filter')).toBe(true);
  });

  it('distinguishes formatting-only changes from structural changes', async () => {
    const result = await compareSqlSnapshots(
      snapshot('SELECT id FROM orders WHERE active = 1;', 'SELECT id\nFROM orders\nWHERE active=1;')
    );

    expect(['completed', 'partial']).toContain(result.status);
    expect(result.changes.map((change) => change.kind)).toEqual(['formatting-only']);
    expect(result.findings).toEqual([]);
  });

  it.each([
    ["SELECT id FROM orders WHERE status = 'A B';", "SELECT id FROM orders WHERE status = 'a b';", 'postgresql'],
    ["SELECT id FROM orders WHERE status = 'a + b';", "SELECT id FROM orders WHERE status = 'a+b';", 'postgresql'],
    ['SELECT "CaseName" FROM orders;', 'SELECT "casename" FROM orders;', 'postgresql'],
    ["SELECT 'first'\n'second';", "SELECT 'first' 'second';", 'postgresql'],
    ['SELECT COUNT(*) FROM orders;', 'SELECT COUNT (*) FROM orders;', 'mysql'],
    ['SELECT /*+ INDEX(o idx_a) */ id FROM orders o;', 'SELECT /*+ INDEX(o idx_b) */ id FROM orders o;', 'oracle'],
  ] as const)('does not classify meaningful text changes as formatting only', async (
    before: string, after: string, dialect: ComparisonSnapshot['dialect']
  ) => {
    const result = await compareSqlSnapshots(snapshot(before, after, dialect));
    expect(result.changes.some((change) => change.kind !== 'formatting-only')).toBe(true);
  });

  it('does not mistake keywords inside dollar-quoted values for top-level clauses', async () => {
    const result = await compareSqlSnapshots(snapshot(
      'SELECT $$FROM x WHERE a$$ AS text FROM orders WHERE active = 1;',
      'SELECT $$FROM x WHERE b$$ AS text FROM orders WHERE active = 1;'
    ));
    expect(result.changes.some((change) => change.kind === 'projection')).toBe(true);
    expect(result.changes.some((change) => change.kind === 'filter')).toBe(false);
  });

  it('reports an unclassified text change as partial rather than complete', async () => {
    const result = await compareSqlSnapshots(snapshot(
      '-- original\nSELECT id FROM orders;',
      '-- changed\nSELECT id FROM orders;'
    ));
    expect(result.changes[0]?.kind).toBe('unknown');
    expect(result.status).toBe('partial');
  });

  it('marks repeated top-level clauses as partial instead of claiming complete coverage', async () => {
    const result = await compareSqlSnapshots(snapshot(
      'SELECT id FROM a UNION SELECT id FROM b',
      'SELECT id FROM c UNION SELECT id FROM b'
    ));
    expect(result.status).toBe('partial');
    expect(result.limitations.join(' ')).toMatch(/Repeated top-level clauses/);
  });

  it('retains available facts and reports partial results for invalid SQL', async () => {
    const result = await compareSqlSnapshots(
      snapshot('SELECT id FROM orders;', 'SELECT FROM WHERE (', 'postgresql')
    );

    expect(result.status).toBe('partial');
    expect(result.assessment.staticAnalysis).toBe('partial');
    expect(result.limitations.length).toBeGreaterThan(0);
    expect(result.limitations.some((limitation) => limitation.startsWith('After SQL:'))).toBe(true);
    expect(result.assessment.equivalence).toBe('inconclusive');
  });

  it('reports the repaired syntax as a before/after change when the baseline SQL is invalid', async () => {
    const before = 'SELECT id\nFROM users\nWHERE id = (;';
    const after = 'SELECT id\nFROM users\nWHERE id = 1;';

    const result = await compareSqlSnapshots(snapshot(before, after));

    expect(['completed', 'partial']).toContain(result.status);
    expect(result.changes.length).toBeGreaterThan(0);
    expect(result.changes.some((change) => change.kind === 'filter')).toBe(true);
  });

  it('reports Oracle AST unavailability as a limitation rather than complete analysis', async () => {
    const result = await compareSqlSnapshots(
      snapshot(
        'SELECT id FROM orders WHERE ROWNUM <= 5',
        'SELECT id FROM orders WHERE ROWNUM <= 10',
        'oracle'
      )
    );

    expect(result.status).toBe('partial');
    expect(result.limitations.join(' ')).toMatch(/AST|parser|Oracle/i);
    expect(result.assessment.equivalence).not.toBe('equivalent');
  });
});
