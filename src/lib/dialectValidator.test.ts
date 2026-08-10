import { describe, expect, it, vi } from 'vitest';
import { validateSqlDialect } from './dialectValidator';

describe('validateSqlDialect', () => {
  it('flags Oracle syntax when MySQL is selected', async () => {
    const oracleSql = `SELECT employee_id, salary FROM employees WHERE ROWNUM <= 10 ORDER BY salary DESC`;
    const result = await validateSqlDialect(oracleSql, 'mysql');

    expect(result.valid).toBe(false);
    expect(result.mismatches[0].detectedDialect).toBe('oracle');
  });

  it('flags SQL Server syntax when PostgreSQL is selected', async () => {
    const sqlServerSql = `SELECT TOP 10 [Name], [Salary] FROM [Employees] ORDER BY [Salary] DESC`;
    const result = await validateSqlDialect(sqlServerSql, 'postgresql');

    expect(result.valid).toBe(false);
    expect(result.mismatches[0].detectedDialect).toBe('sqlserver');
  });

  it('flags MySQL syntax when Oracle is selected', async () => {
    const mysqlSql = 'SELECT * FROM `orders` LIMIT 10, 20';
    const result = await validateSqlDialect(mysqlSql, 'oracle');

    expect(result.valid).toBe(false);
    expect(result.mismatches[0].detectedDialect).toBe('mysql');
  });

  it('flags PostgreSQL syntax when MySQL is selected', async () => {
    const postgresSql = `SELECT id::text, name FROM users WHERE name ILIKE 'a%'`;
    const result = await validateSqlDialect(postgresSql, 'mysql');

    expect(result.valid).toBe(false);
    expect(result.mismatches[0].detectedDialect).toBe('postgresql');
  });

  it('accepts MySQL syntax when MySQL is selected', async () => {
    const mysqlSql = 'SELECT `id`, `name` FROM `orders` LIMIT 10, 20';
    const result = await validateSqlDialect(mysqlSql, 'mysql');

    expect(result.valid).toBe(true);
    expect(result.mismatches).toHaveLength(0);
  });

  it('ignores dialect keywords that only appear inside string literals', async () => {
    const sql = `SELECT id, 'this mentions ROWNUM and ILIKE in a comment string' AS note FROM orders`;
    const result = await validateSqlDialect(sql, 'mysql');

    expect(result.valid).toBe(true);
  });

  it('flags PostgreSQL-only DISTINCT ON syntax when MySQL is selected via AST cross-check', async () => {
    // No signature regex matches this — only the dt-sql-parser AST cross-check can catch it.
    const postgresOnlySql = 'SELECT DISTINCT ON (customer_id) customer_id, order_date FROM orders';
    const result = await validateSqlDialect(postgresOnlySql, 'mysql');

    expect(result.valid).toBe(false);
    expect(result.mismatches[0].detectedDialect).toBe('postgresql');
  });

  it('does not log expected syntax failures during an AST dialect cross-check', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await validateSqlDialect('SELECT DISTINCT ON (customer_id) customer_id FROM orders', 'mysql');

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('runs the AST cross-check on unmasked SQL so string literals do not disable detection', async () => {
    // The string literal 'active' would, if masked before the AST check, blank out to
    // spaces and turn this into a parse error under BOTH parsers — hiding the mismatch.
    // Detection must still fire because the AST check sees the original SQL.
    const postgresOnlyWithLiteral =
      "SELECT DISTINCT ON (customer_id) customer_id, order_date FROM orders WHERE status = 'active'";
    const result = await validateSqlDialect(postgresOnlyWithLiteral, 'mysql');

    expect(result.valid).toBe(false);
    expect(result.mismatches[0].detectedDialect).toBe('postgresql');
  });

  it('does not flag an array subscript as a SQL Server bracketed identifier', async () => {
    // arr[idx] is valid PostgreSQL array access, not a [bracketed] identifier.
    const sql = 'SELECT tags[1] AS first_tag FROM articles';
    const result = await validateSqlDialect(sql, 'postgresql');

    expect(result.valid).toBe(true);
  });

  it('accepts FROM DUAL when MySQL is selected (MySQL supports DUAL too, not Oracle-exclusive)', async () => {
    const sql = `SELECT 1 FROM DUAL`;
    const result = await validateSqlDialect(sql, 'mysql');

    expect(result.valid).toBe(true);
  });

  it('accepts OFFSET…FETCH NEXT paging when Oracle is selected (Oracle 12c+ supports it too, not SQL Server-exclusive)', async () => {
    const sql = `SELECT employee_id, salary FROM employees ORDER BY salary DESC OFFSET 10 ROWS FETCH NEXT 5 ROWS ONLY`;
    const result = await validateSqlDialect(sql, 'oracle');

    expect(result.valid).toBe(true);
  });

  it('accepts RETURNING when Oracle is selected (Oracle DML supports RETURNING INTO, not PostgreSQL-exclusive)', async () => {
    const sql = `UPDATE employees SET salary = salary * 1.1 WHERE department_id = 10 RETURNING employee_id, salary INTO :emp_id, :new_salary`;
    const result = await validateSqlDialect(sql, 'oracle');

    expect(result.valid).toBe(true);
  });

  it('accepts a plain ANSI query for any dialect', async () => {
    const sql = `SELECT o.id, o.total FROM orders o INNER JOIN customers c ON o.customer_id = c.id WHERE o.status = 'completed'`;
    for (const dialect of ['mysql', 'postgresql', 'sqlserver', 'oracle'] as const) {
      const result = await validateSqlDialect(sql, dialect);
      expect(result.valid).toBe(true);
    }
  });
});
