import { describe, expect, it } from 'vitest';
import { classifyStatements } from '@/lib/sql/statementClassifier';
import type { SqlDialect } from '@/lib/sql/sqlAnalyzer';

describe('classifyStatements', () => {
  it('classifies only MySQL top-level statements and returns UTF-16 source slices', async () => {
    const sql = `-- 😀 SELECT 999;
CREATE TABLE t (id INT);
CREATE VIEW v AS SELECT '😀; SELECT 7' AS value FROM t;
CREATE PROCEDURE p() BEGIN SELECT 1; SELECT 2; END;
CREATE FUNCTION f() RETURNS INT DETERMINISTIC RETURN 1;
CREATE TRIGGER tr BEFORE INSERT ON t FOR EACH ROW SET NEW.id = 1;
/* SELECT 3; */ SELECT '😀;' AS value;`;
    const result = await classifyStatements(sql, 'mysql');
    expect(result.status).toBe('parsed');
    if (result.status !== 'parsed') return;
    expect(result.statements.map((item) => item.kind)).toEqual([
      'table',
      'view',
      'procedure',
      'function',
      'trigger',
      'query',
    ]);
    expect(result.statements.map((item) => item.text)).toEqual([
      'CREATE TABLE t (id INT)',
      "CREATE VIEW v AS SELECT '😀; SELECT 7' AS value FROM t",
      'CREATE PROCEDURE p() BEGIN SELECT 1; SELECT 2; END',
      'CREATE FUNCTION f() RETURNS INT DETERMINISTIC RETURN 1',
      'CREATE TRIGGER tr BEFORE INSERT ON t FOR EACH ROW SET NEW.id = 1',
      "SELECT '😀;' AS value",
    ]);
    for (const statement of result.statements) {
      expect(sql.slice(statement.start, statement.end)).toBe(statement.text);
    }
    expect(result.statements[1].start).toBe(sql.indexOf('CREATE VIEW'));
    expect(result.statements[5].end).toBe(sql.lastIndexOf(';'));
  });

  it('classifies PostgreSQL objects and queries without splitting dollar-quoted bodies', async () => {
    const sql = `/* 😀 SELECT 0; */
CREATE TABLE t (id integer);
CREATE TABLE t2 AS SELECT * FROM t;
CREATE VIEW v AS SELECT '; SELECT 42' AS x;
CREATE FUNCTION f() RETURNS int AS $body$ SELECT 1; SELECT 2; $body$ LANGUAGE sql;
CREATE PROCEDURE p() AS $$ BEGIN PERFORM 1; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER tr BEFORE INSERT ON t FOR EACH ROW EXECUTE FUNCTION f();
WITH c AS (SELECT 1) SELECT * FROM c;`;
    const result = await classifyStatements(sql, 'postgresql');
    expect(result.status).toBe('parsed');
    if (result.status !== 'parsed') return;
    expect(result.statements.map((item) => item.kind)).toEqual([
      'table',
      'table',
      'view',
      'function',
      'procedure',
      'trigger',
      'query',
    ]);
    expect(result.statements[3].text).toBe(
      'CREATE FUNCTION f() RETURNS int AS $body$ SELECT 1; SELECT 2; $body$ LANGUAGE sql'
    );
    for (const statement of result.statements) {
      expect(sql.slice(statement.start, statement.end)).toBe(statement.text);
      expect(statement.start).toBe(sql.indexOf(statement.text));
    }
  });

  it.each([
    ['mysql', 'SELECT 1; DROP TABLE t; SELECT 2'],
    ['postgresql', 'SELECT 1; DROP TABLE t; SELECT 2'],
    ['mysql', 'SELECT 1; SELECT FROM'],
    ['postgresql', 'SELECT 1; SELECT FROM'],
    ['mysql', "SELECT 'unterminated"],
    ['postgresql', "SELECT 'unterminated"],
    ['mysql', 'SELECT 1 SELECT 2'],
    ['postgresql', 'SELECT 1 SELECT 2'],
    ['mysql', 'DELIMITER //\nCREATE PROCEDURE p() BEGIN SELECT 1; END//'],
    ['mysql', 'SELECT 1; /*!50000 SELECT 2 */'],
    ['mysql', 'SELECT /*!50000 SQL_NO_CACHE */ 1'],
    ['postgresql', 'SELECT $a$ SELECT 1; $b$; SELECT 2'],
    ['sqlserver', 'SELECT 1; SELECT 2'],
    ['oracle', 'SELECT 1 FROM dual'],
    ['mysql', '-- nothing'],
    ['postgresql', ''],
  ] as [SqlDialect, string][])(
    'returns unsupported for uncertain %s input',
    async (dialect: SqlDialect, sql: string) => {
      expect(await classifyStatements(sql, dialect)).toEqual({ status: 'unsupported' });
    }
  );

  it('does not interpret executable-comment markers in MySQL literals as comments', async () => {
    const result = await classifyStatements("SELECT '/*! SELECT 1 */'", 'mysql');
    expect(result.status).toBe('parsed');
  });

  it('handles top-level MySQL CTE queries as one statement', async () => {
    const sql = 'WITH c AS (SELECT 1 AS n) SELECT n FROM c; SELECT 2';
    const result = await classifyStatements(sql, 'mysql');
    expect(result).toEqual({
      status: 'parsed',
      statements: [
        { kind: 'query', text: sql.slice(0, sql.indexOf(';')), start: 0, end: sql.indexOf(';') },
        { kind: 'query', text: 'SELECT 2', start: sql.indexOf('SELECT 2'), end: sql.length },
      ],
    });
  });

  it.each([
    ['sqlserver', " \nSELECT N'😀' AS value FROM dbo.t  ; \n", 'query'],
    ['sqlserver', '\tCREATE TABLE dbo.t (id INT NOT NULL); ', 'table'],
    ['sqlserver', 'WITH c AS (SELECT 1 n) SELECT n FROM c', 'query'],
    ['oracle', '  CREATE TABLE t (id NUMBER, name VARCHAR2(20)); \n', 'table'],
    ['oracle', 'CREATE TABLE t (id NUMBER)', 'table'],
  ] as [SqlDialect, string, 'query' | 'table'][])(
    'classifies a supported single %s statement with exact offsets',
    async (dialect: SqlDialect, sql: string, kind: 'query' | 'table') => {
      const start = sql.length - sql.trimStart().length;
      const text = sql.trim().replace(/;\s*$/, '').trimEnd();
      expect(await classifyStatements(sql, dialect)).toEqual({
        status: 'parsed',
        statements: [{ kind, text, start, end: start + text.length }],
      });
    }
  );

  it.each([
    ['sqlserver', 'SELECT 1; SELECT 2'],
    ['sqlserver', 'SELECT 1\nGO\nSELECT 2'],
    ['sqlserver', 'SELECT 1\nGO'],
    ['sqlserver', 'SELECT 1; -- SELECT 2'],
    ['sqlserver', "SELECT 'a;b'"],
    ['sqlserver', 'CREATE VIEW v AS SELECT 1'],
    ['sqlserver', 'CREATE PROCEDURE p AS BEGIN SELECT 1; END'],
    ['sqlserver', 'SELECT FROM'],
    ['oracle', 'CREATE TABLE t (id NUMBER); CREATE TABLE u (id NUMBER);'],
    ['oracle', 'CREATE TABLE t (id NUMBER); -- comment'],
    ['oracle', 'CREATE OR REPLACE PROCEDURE p AS BEGIN NULL; END;'],
    ['oracle', 'CREATE TABLE t (id NUMBER); /'],
    ['oracle', 'CREATE TABLE t (id'],
  ] as [SqlDialect, string][])(
    'falls back for unsafe or unsupported %s input',
    async (dialect: SqlDialect, sql: string) => {
      expect(await classifyStatements(sql, dialect)).toEqual({ status: 'unsupported' });
    }
  );
});
