import { describe, expect, it } from 'vitest';
import { validateSqlDialect } from './dialectValidator';

describe('validateSqlDialect', () => {
  it('flags Oracle syntax when MySQL is selected', () => {
    const oracleSql = `SELECT employee_id, salary FROM employees WHERE ROWNUM <= 10 ORDER BY salary DESC`;
    const result = validateSqlDialect(oracleSql, 'mysql');

    expect(result.valid).toBe(false);
    expect(result.mismatches[0].detectedDialect).toBe('oracle');
  });

  it('flags SQL Server syntax when PostgreSQL is selected', () => {
    const sqlServerSql = `SELECT TOP 10 [Name], [Salary] FROM [Employees] ORDER BY [Salary] DESC`;
    const result = validateSqlDialect(sqlServerSql, 'postgresql');

    expect(result.valid).toBe(false);
    expect(result.mismatches[0].detectedDialect).toBe('sqlserver');
  });

  it('flags MySQL syntax when Oracle is selected', () => {
    const mysqlSql = 'SELECT * FROM `orders` LIMIT 10, 20';
    const result = validateSqlDialect(mysqlSql, 'oracle');

    expect(result.valid).toBe(false);
    expect(result.mismatches[0].detectedDialect).toBe('mysql');
  });

  it('flags PostgreSQL syntax when MySQL is selected', () => {
    const postgresSql = `SELECT id::text, name FROM users WHERE name ILIKE 'a%'`;
    const result = validateSqlDialect(postgresSql, 'mysql');

    expect(result.valid).toBe(false);
    expect(result.mismatches[0].detectedDialect).toBe('postgresql');
  });

  it('accepts MySQL syntax when MySQL is selected', () => {
    const mysqlSql = 'SELECT `id`, `name` FROM `orders` LIMIT 10, 20';
    const result = validateSqlDialect(mysqlSql, 'mysql');

    expect(result.valid).toBe(true);
    expect(result.mismatches).toHaveLength(0);
  });

  it('ignores dialect keywords that only appear inside string literals', () => {
    const sql = `SELECT id, 'this mentions ROWNUM and ILIKE in a comment string' AS note FROM orders`;
    const result = validateSqlDialect(sql, 'mysql');

    expect(result.valid).toBe(true);
  });

  it('flags PostgreSQL-only DISTINCT ON syntax when MySQL is selected via AST cross-check', () => {
    // No signature regex matches this — only the dt-sql-parser AST cross-check can catch it.
    const postgresOnlySql = 'SELECT DISTINCT ON (customer_id) customer_id, order_date FROM orders';
    const result = validateSqlDialect(postgresOnlySql, 'mysql');

    expect(result.valid).toBe(false);
    expect(result.mismatches[0].detectedDialect).toBe('postgresql');
  });

  it('accepts a plain ANSI query for any dialect', () => {
    const sql = `SELECT o.id, o.total FROM orders o INNER JOIN customers c ON o.customer_id = c.id WHERE o.status = 'completed'`;
    (['mysql', 'postgresql', 'sqlserver', 'oracle'] as const).forEach((dialect) => {
      expect(validateSqlDialect(sql, dialect).valid).toBe(true);
    });
  });
});
