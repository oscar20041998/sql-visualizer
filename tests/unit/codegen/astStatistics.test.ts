import { describe, expect, it } from 'vitest';
import { parseSql } from '@/lib/codegen/parseSql';

/** Parses with the opt-in statistics switch and returns the real statistics. */
function statsFor(sql: string, dialect: 'mysql' | 'postgresql' | 'sqlserver' | 'oracle' = 'mysql') {
  const model = parseSql(sql, dialect, { statistics: true });
  expect(model.astStatistics).not.toBeNull();
  return model.astStatistics!;
}

describe('AST statistics (specs/016-ast-statistics)', () => {
  describe('U1 total node count equals the sum of per-type counts', () => {
    it('counts typed AST nodes so the total is the sum of the groups', () => {
      const stats = statsFor(
        'SELECT u.id, o.total FROM users u LEFT JOIN orders o ON o.user_id = u.id WHERE u.id > 1'
      );

      const sum = Object.values(stats.nodeCountsByType).reduce((total, count) => total + count, 0);

      expect(sum).toBe(stats.totalNodeCount);
      expect(stats.totalNodeCount).toBeGreaterThan(0);
      // column_ref nodes exist, proving the walk reaches real expression nodes.
      expect(stats.nodeCountsByType.column_ref).toBeGreaterThan(0);
    });

    it('produces identical counts for formatting-only differences', () => {
      const compact = statsFor('SELECT a FROM t WHERE a = 1');
      const spaced = statsFor('SELECT  a\nFROM   t\nWHERE  a  =  1');

      expect(spaced.totalNodeCount).toBe(compact.totalNodeCount);
      expect(spaced.nodeCountsByType).toEqual(compact.nodeCountsByType);
    });
  });

  describe('U2 statement kind comes from the parsed AST', () => {
    it('reports the parsed statement kind rather than a regex guess', () => {
      expect(statsFor('SELECT 1 FROM t').statementKind).toBe('select');
      expect(statsFor('INSERT INTO t (id) VALUES (1)').statementKind).toBe('insert');
      expect(statsFor('UPDATE t SET a = 1 WHERE id = 2').statementKind).toBe('update');
      expect(statsFor('DELETE FROM t WHERE id = 2').statementKind).toBe('delete');
      expect(
        statsFor('CREATE TABLE users (id BIGINT NOT NULL PRIMARY KEY, name VARCHAR(20))')
          .statementKind
      ).toBe('create-table');
    });
  });

  describe('U3 CTE count and nesting distinguish nested WITH scopes from siblings', () => {
    it('counts every declaration while sibling CTEs share one WITH depth', () => {
      const stats = statsFor(
        'WITH a AS (SELECT 1 AS x FROM t1), b AS (SELECT 2 AS y FROM t2) SELECT x, y FROM a, b'
      );

      expect(stats.cteCount).toBe(2);
      // One top-level WITH: siblings must not stack into depth 2.
      expect(stats.cteNestingDepth).toBe(1);
    });

    it('reports a deeper WITH inside a CTE body as a second scope', () => {
      const stats = statsFor(
        'WITH b AS (WITH inner_cte AS (SELECT 2 AS y FROM t2) SELECT y FROM inner_cte) SELECT y FROM b'
      );

      expect(stats.cteCount).toBe(2);
      expect(stats.cteNestingDepth).toBe(2);
    });

    it('reports zero CTEs for a query without a WITH clause', () => {
      const stats = statsFor('SELECT 1 FROM t');

      expect(stats.cteCount).toBe(0);
      expect(stats.cteNestingDepth).toBe(0);
    });
  });
  describe('U4 subquery depth counts query-expression boundaries', () => {
    it('increases once per nested select', () => {
      const shallow = statsFor('SELECT id FROM t WHERE id IN (SELECT user_id FROM orders)');
      const nested = statsFor(
        'SELECT id FROM t WHERE id IN (SELECT user_id FROM orders WHERE total > (SELECT AVG(total) FROM orders))'
      );

      expect(shallow.subqueryDepth).toBe(1);
      expect(nested.subqueryDepth).toBe(2);
    });

    it('does not count a CTE body root as a subquery but counts selects inside it', () => {
      const bodyOnly = statsFor('WITH a AS (SELECT id FROM t1) SELECT id FROM a');
      const bodyWithSubquery = statsFor(
        'WITH a AS (SELECT id FROM t1 WHERE id IN (SELECT user_id FROM t2)) SELECT id FROM a'
      );

      // The CTE body is a query root, not a subquery.
      expect(bodyOnly.subqueryDepth).toBe(0);
      expect(bodyWithSubquery.subqueryDepth).toBe(1);
    });

    it('reports zero for a query with no nested query expression', () => {
      expect(statsFor('SELECT id FROM t WHERE id > 1').subqueryDepth).toBe(0);
    });
  });

  describe('U5 operator counts come from AST operator fields', () => {
    it('counts operator tokens from the parsed expression tree', () => {
      const stats = statsFor('SELECT 1 FROM t WHERE a = 1 AND b > 2 OR c <> 3');

      expect(stats.operatorCounts['=']).toBe(1);
      expect(stats.operatorCounts.AND).toBe(1);
      expect(stats.operatorCounts.OR).toBe(1);
      expect(stats.operatorCounts['>']).toBe(1);
      expect(stats.operatorCounts['<>']).toBe(1);
    });

    it('is unaffected by the same token appearing only inside a literal', () => {
      const stats = statsFor("SELECT 1 FROM t WHERE note = 'a = b AND c'");

      // The operator lives inside a string literal, so it must not be counted as an operator.
      expect(stats.operatorCounts['=']).toBe(1);
      expect(stats.operatorCounts.AND).toBeUndefined();
    });
  });

  describe('U6 function counts include aggregates and window functions', () => {
    it('counts aggregate and scalar functions from AST function nodes', () => {
      const stats = statsFor(
        'SELECT COUNT(id) AS c, SUM(total) AS s, UPPER(name) AS n FROM t GROUP BY id'
      );

      expect(stats.functionCounts.COUNT).toBe(1);
      expect(stats.functionCounts.SUM).toBe(1);
      expect(stats.functionCounts.UPPER).toBe(1);
    });

    it('counts repeated calls and window functions by name', () => {
      const stats = statsFor(
        'SELECT SUM(total) AS a, SUM(tax) AS b, ROW_NUMBER() OVER (PARTITION BY id ORDER BY d) AS rn FROM t'
      );

      expect(stats.functionCounts.SUM).toBe(2);
      expect(stats.functionCounts.ROW_NUMBER).toBe(1);
    });

    it('reports no functions rather than a fake entry for a plain projection', () => {
      expect(statsFor('SELECT id, name FROM t').functionCounts).toEqual({});
    });
  });

  describe('availability (FR-004, FR-006, I1)', () => {
    it('is null unless the caller opts in', () => {
      expect(parseSql('SELECT 1 FROM t', 'mysql').astStatistics).toBeNull();
      expect(parseSql('SELECT 1 FROM t', 'mysql', {}).astStatistics).toBeNull();
    });

    it('is null for Oracle because no grammar exists', () => {
      const model = parseSql('SELECT 1 FROM dual', 'oracle', { statistics: true });

      expect(model.parseStatus).toBe('unsupported');
      expect(model.astStatistics).toBeNull();
    });

    it('is null for empty, comment-only and unparsable SQL', () => {
      expect(parseSql('', 'mysql', { statistics: true }).astStatistics).toBeNull();
      expect(parseSql('   ', 'mysql', { statistics: true }).astStatistics).toBeNull();
      expect(parseSql('-- just a comment', 'mysql', { statistics: true }).astStatistics).toBeNull();
      expect(
        parseSql('SELECT FROM FROM WHERE', 'mysql', { statistics: true }).astStatistics
      ).toBeNull();
    });

    it('is null for a multi-statement script rather than describing only the first statement', () => {
      const model = parseSql('SELECT 1 FROM a; SELECT 2 FROM b', 'mysql', { statistics: true });

      expect(model.astStatistics).toBeNull();
    });
  });
});
