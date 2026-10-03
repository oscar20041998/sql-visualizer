import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import { parseSql } from '@/lib/codegen/parseSql';

const DDL_CASES: Array<{
  dialect: 'mysql' | 'postgresql' | 'sqlserver';
  schemaName: string | null;
  sql: string;
  displayNameType: string;
}> = [
  {
    dialect: 'mysql' as const,
    schemaName: null,
    sql: 'CREATE TABLE users (id BIGINT NOT NULL PRIMARY KEY, display_name VARCHAR(80) NOT NULL);',
    displayNameType: 'VARCHAR',
  },
  {
    dialect: 'postgresql' as const,
    schemaName: 'public',
    sql: 'CREATE TABLE public.users (id BIGINT NOT NULL PRIMARY KEY, display_name VARCHAR(80) NOT NULL);',
    displayNameType: 'VARCHAR',
  },
  {
    dialect: 'sqlserver' as const,
    schemaName: 'dbo',
    sql: 'CREATE TABLE dbo.users ([id] BIGINT NOT NULL PRIMARY KEY, [display_name] NVARCHAR(80) NOT NULL);',
    displayNameType: 'NVARCHAR',
  },
];

describe('parseSql DDL normalization', () => {
  it.each(DDL_CASES)(
    'normalizes supported DDL for $dialect',
    (testCase: (typeof DDL_CASES)[number]) => {
      const { dialect, schemaName, sql, displayNameType } = testCase;
      const model = parseSql(sql, dialect);

      expect(model.statementKind).toBe('create-table');
      expect(model.parseStatus).toBe('parsed');
      expect(model.tables).toHaveLength(1);
      expect(model.tables[0]).toMatchObject({
        schemaName,
        tableName: 'users',
        columns: [
          {
            name: 'id',
            sqlType: { raw: 'BIGINT', normalized: 'BIGINT' },
            nullable: false,
            length: null,
          },
          {
            name: 'display_name',
            sqlType: { raw: displayNameType, normalized: displayNameType },
            nullable: false,
            length: 80,
          },
        ],
        constraints: [{ kind: 'primary-key', columns: ['id'] }],
      });
    }
  );

  it('rejects unsupported Oracle syntax', () => {
    const model = parseSql('CREATE TABLE users (id NUMBER PRIMARY KEY)', 'oracle');

    expect(model.parseStatus).toBe('unsupported');
    expect(model.tables).toHaveLength(0);
    expect(model.diagnostics).toContainEqual(
      expect.objectContaining({ severity: 'error', code: 'unsupported-dialect' })
    );
  });

  it('marks primary-key columns as non-null without explicit NOT NULL', () => {
    const inline = parseSql('CREATE TABLE inline_keys (id BIGINT PRIMARY KEY)', 'mysql');
    const tableLevel = parseSql('CREATE TABLE table_keys (id BIGINT, PRIMARY KEY (id))', 'mysql');

    expect(inline.tables[0].columns[0].nullable).toBe(false);
    expect(tableLevel.tables[0].columns[0].nullable).toBe(false);
  });

  it('normalizes explicit foreign keys', () => {
    const model = parseSql(
      'CREATE TABLE orders (id BIGINT NOT NULL, customer_id BIGINT NOT NULL, CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id), PRIMARY KEY (id))',
      'mysql'
    );

    expect(model.tables[0].constraints).toContainEqual({
      kind: 'foreign-key',
      columns: ['customer_id'],
      referencedTable: 'customers',
      referencedColumns: ['id'],
      name: 'fk_orders_customer',
    });
  });

  it('normalizes explicit unique constraints', () => {
    const model = parseSql(
      'CREATE TABLE orders (id BIGINT, customer_id BIGINT, CONSTRAINT uq_customer UNIQUE (customer_id))',
      'mysql'
    );

    expect(model.tables[0].constraints).toContainEqual({
      kind: 'unique',
      columns: ['customer_id'],
      name: 'uq_customer',
    });
  });

  it('reports invalid SQL location', () => {
    const sql = 'CREATE TABLE users (id INT,';
    const model = parseSql(sql, 'mysql');

    expect(model.parseStatus).toBe('invalid');
    expect(model.tables).toHaveLength(0);
    expect(model.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        code: 'invalid-sql',
        sourceSpan: { start: 27, end: 27 },
      })
    );
  });

  it('normalizes select result facts', () => {
    const model = parseSql(
      'SELECT u.id AS user_id, COUNT(o.id) AS order_count FROM users u JOIN orders o ON u.id = o.user_id GROUP BY u.id ORDER BY user_id',
      'mysql'
    );

    expect(model.parseStatus).toBe('parsed');
    expect(model.statementKind).toBe('select');
    expect(model.selectShape).toMatchObject({
      fields: [
        {
          expression: 'u.id',
          alias: 'user_id',
          sourceColumns: ['u.id'],
          expressionKind: 'column',
          inferredSqlType: null,
        },
        {
          expression: 'COUNT(o.id)',
          alias: 'order_count',
          sourceColumns: ['o.id'],
          expressionKind: 'aggregate',
          inferredSqlType: null,
        },
      ],
      sourceTables: ['users', 'orders'],
      hasJoin: true,
      groupByExpressions: ['u.id'],
      orderByExpressions: ['user_id'],
      hasAggregation: true,
    });
  });

  it('reports unsupported constructs', () => {
    const model = parseSql('SELECT DISTINCT id FROM users', 'mysql');

    expect(model.parseStatus).toBe('partial');
    expect(model.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: 'warning',
        code: 'unsupported-select-clause',
      })
    );
  });

  it('reports DISTINCT as the limitation for the demo query 7 wildcard projection', () => {
    const sql = readFileSync('src/sample/demo_query7.sql', 'utf8');
    const model = parseSql(sql, 'mysql');

    expect(model.parseStatus).toBe('partial');
    expect(model.selectShape?.fields).toMatchObject([
      { expression: '*', expressionKind: 'wildcard' },
    ]);
    expect(model.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'unsupported-select-clause',
        message: 'SELECT DISTINCT is not represented in the normalized query shape yet.',
      })
    );
    expect(model.diagnostics).not.toContainEqual(
      expect.objectContaining({ code: 'unsupported-select-expression' })
    );
  });
});

/**
 * AST statistics are opt-in additions to this pipeline (specs/016-ast-statistics U7–U10). They are
 * measured from the same AST the model is normalized from, so they exist only where a real AST does.
 */
describe('parseSql AST statistics option', () => {
  const SUPPORTED_DIALECTS = ['mysql', 'postgresql', 'sqlserver'] as const;

  it('computes statistics for every dialect whose grammar the pipeline maps', () => {
    SUPPORTED_DIALECTS.forEach((dialect) => {
      const model = parseSql(
        'WITH recent AS (SELECT id, total FROM orders) SELECT r.id, SUM(r.total) AS s FROM recent r GROUP BY r.id',
        dialect,
        { statistics: true }
      );

      expect(model.astStatistics, `dialect ${dialect}`).not.toBeNull();
      expect(model.astStatistics?.statementKind).toBe('select');
      expect(model.astStatistics?.cteCount).toBe(1);
      expect(model.astStatistics?.functionCounts.SUM).toBe(1);
    });
  });

  it('leaves statistics null when the caller does not opt in', () => {
    expect(parseSql('SELECT 1 FROM t', 'mysql').astStatistics).toBeNull();
  });

  it('keeps statistics for a real AST even when the normalized model is partial', () => {
    // DISTINCT is understood by the parser but not represented in the normalized shape.
    const model = parseSql('SELECT DISTINCT a FROM t', 'mysql', { statistics: true });

    expect(model.parseStatus).toBe('partial');
    expect(model.diagnostics.length).toBeGreaterThan(0);
    // The AST was real, so the facts describing it stay available.
    expect(model.astStatistics).not.toBeNull();
    expect(model.astStatistics?.totalNodeCount).toBeGreaterThan(0);
  });

  it('reports unavailable statistics for Oracle, which has no grammar', () => {
    const model = parseSql('SELECT 1 FROM dual', 'oracle', { statistics: true });

    expect(model.parseStatus).toBe('unsupported');
    expect(model.astStatistics).toBeNull();
  });

  it('reports unavailable statistics for empty, comment-only and invalid SQL', () => {
    expect(parseSql('', 'mysql', { statistics: true }).astStatistics).toBeNull();
    expect(parseSql('/* nothing here */', 'mysql', { statistics: true }).astStatistics).toBeNull();
    expect(parseSql('SELECT * FROM', 'mysql', { statistics: true }).astStatistics).toBeNull();
  });

  it('refuses statistics for a multi-statement script instead of describing the first statement', () => {
    const model = parseSql('SELECT 1 FROM a; SELECT 2 FROM b', 'mysql', { statistics: true });

    expect(model.astStatistics).toBeNull();
  });

  it('measures statistics on the demo fixture without changing its normalized model', () => {
    const sql = readFileSync('src/sample/demo_query7.sql', 'utf8');
    const withoutStats = parseSql(sql, 'mysql');
    const withStats = parseSql(sql, 'mysql', { statistics: true });

    // Opting in must not alter any field the code generator already depends on.
    expect({ ...withStats, astStatistics: null }).toEqual(withoutStats);
    expect(withStats.astStatistics?.totalNodeCount).toBeGreaterThan(0);
  });
});
