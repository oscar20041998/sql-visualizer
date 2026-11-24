import { expect, it } from 'vitest';
import { functionFromStatement } from '@/lib/sql/functionAnalyzer';
import { extractRoutineQueries, parseMySqlDefinition } from '@/lib/sql/mysqlObjectParser';

it('preserves qualified function source and extracts a direct query from its block', async () => {
  const sql =
    'CREATE FUNCTION sales.`count_employees`(p_id INT) RETURNS INT READS SQL DATA\n' +
    'BEGIN\n  SELECT COUNT(*) INTO @n FROM employees;\n  RETURN @n;\nEND;';
  const statement = await parseMySqlDefinition(sql);
  expect(statement).not.toBeNull();
  if (!statement) throw new Error('Expected a valid MySQL function');
  expect(functionFromStatement(sql, statement)).toEqual({
    status: 'partial',
    kind: 'function',
    name: 'sales.`count_employees`',
    parameters: ['p_id INT'],
    returnType: 'INT',
    body: 'BEGIN\n  SELECT COUNT(*) INTO @n FROM employees;\n  RETURN @n;\nEND',
  });
  const body = statement.createFunction()?.routineBody();
  expect(body).toBeTruthy();
  if (!body) throw new Error('Expected a function body');
  const extracted = extractRoutineQueries(sql, body);
  expect(extracted.incomplete).toBe(true);
  expect(extracted.queries).toHaveLength(1);
  expect(extracted.queries[0].text).toBe('SELECT COUNT(*) INTO @n FROM employees');
  expect(extracted.queries[0].start.line).toBe(3);
});

it('rejects malformed or multiple MySQL function definitions', async () => {
  await expect(
    parseMySqlDefinition('CREATE FUNCTION f(x INT) RETURNS INT RETURN')
  ).resolves.toBeNull();
  await expect(
    parseMySqlDefinition(
      'CREATE FUNCTION f() RETURNS INT RETURN 1; CREATE FUNCTION g() RETURNS INT RETURN 2;'
    )
  ).resolves.toBeNull();
});
