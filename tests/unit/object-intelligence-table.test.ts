import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { analyzeTable } from '@/lib/sql/tableAnalyzer';

it('extracts PostgreSQL table identity and declared columns', async () => {
  await expect(
    analyzeTable(
      'CREATE TABLE public.employees (id INTEGER NOT NULL PRIMARY KEY, name VARCHAR(80));',
      'postgresql'
    )
  ).resolves.toEqual({
    status: 'partial',
    kind: 'table',
    name: 'employees',
    schema: 'public',
    columns: [
      { name: 'id', type: 'INTEGER' },
      { name: 'name', type: 'VARCHAR(80)' },
    ],
  });
});

it('extracts SQL Server table identity and declared columns', async () => {
  await expect(
    analyzeTable(
      'CREATE TABLE dbo.employees ([id] INT NOT NULL PRIMARY KEY, [name] NVARCHAR(80));',
      'sqlserver'
    )
  ).resolves.toEqual({
    status: 'partial',
    kind: 'table',
    name: 'employees',
    schema: 'dbo',
    columns: [
      { name: 'id', type: 'INT' },
      { name: 'name', type: 'NVARCHAR(80)' },
    ],
  });
});

it.each(['mysql', 'postgresql', 'sqlserver'] as const)(
  'preserves decimal precision and scale for %s',
  async (dialect: 'mysql' | 'postgresql' | 'sqlserver') => {
    const result = await analyzeTable('CREATE TABLE t (amount DECIMAL(10,2));', dialect);
    expect(result?.columns).toEqual([{ name: 'amount', type: 'DECIMAL(10,2)' }]);
  }
);

it.each(['mysql', 'postgresql', 'sqlserver'] as const)(
  'rejects malformed or multiple statements for %s',
  async (dialect: 'mysql' | 'postgresql' | 'sqlserver') => {
    await expect(analyzeTable('CREATE TABLE t (id', dialect)).resolves.toBeNull();
    await expect(
      analyzeTable('CREATE TABLE t (id INT); CREATE TABLE u (id INT);', dialect)
    ).resolves.toBeNull();
  }
);

it('extracts Oracle table identity and declared columns', async () => {
  await expect(
    analyzeTable(
      'CREATE TABLE HR.employees (id NUMBER(10) PRIMARY KEY, name VARCHAR2(80) NOT NULL);',
      'oracle'
    )
  ).resolves.toEqual({
    status: 'partial',
    kind: 'table',
    name: 'employees',
    schema: 'HR',
    columns: [
      { name: 'id', type: 'NUMBER(10)' },
      { name: 'name', type: 'VARCHAR2(80)' },
    ],
  });
});

it('analyzes an Oracle CREATE TABLE without a terminal semicolon', async () => {
  const result = await analyzeTable('CREATE TABLE employees (id NUMBER(10))', 'oracle');
  expect(result?.columns).toEqual([{ name: 'id', type: 'NUMBER(10)' }]);
});

it('preserves Oracle NUMBER precision and scale', async () => {
  const result = await analyzeTable('CREATE TABLE t (amount NUMBER(10,2));', 'oracle');
  expect(result?.columns).toEqual([{ name: 'amount', type: 'NUMBER(10,2)' }]);
});

it('rejects unsupported, invalid, and multiple Oracle statements', async () => {
  for (const sql of [
    'CREATE TABLE t (id NUMBER',
    'CREATE TABLE t (id NUMBER); CREATE TABLE u (id NUMBER);',
    'CREATE TABLE "HR"."Staff" ("Name" VARCHAR2(80));',
    'CREATE TABLE t (id NUMBER, created TIMESTAMP WITH TIME ZONE);',
    'CREATE TABLE t (name VARCHAR2(80 CHAR));',
  ]) {
    await expect(analyzeTable(sql, 'oracle')).resolves.toBeNull();
  }
});

it('recognizes Oracle DATE columns', async () => {
  const result = await analyzeTable('CREATE TABLE t (created DATE);', 'oracle');
  expect(result?.columns).toEqual([{ name: 'created', type: 'DATE' }]);
});

it('preserves declared column types in the sample employee table', async () => {
  const sql = readFileSync('src/sample/demo-create-table.sql', 'utf8');
  const result = await analyzeTable(sql, 'mysql');
  expect(result?.name).toBe('employees');
  expect(result?.columns).toHaveLength(12);
  expect(result?.columns).toContainEqual({ name: 'salary', type: 'DECIMAL(15,2)' });
  expect(result?.columns).toContainEqual({
    name: 'gender',
    type: "ENUM('MALE', 'FEMALE', 'OTHER')",
  });
});

it('preserves escaped values in MySQL ENUM types', async () => {
  const result = await analyzeTable("CREATE TABLE t (v ENUM('O''Brien', 'a,b'));", 'mysql');
  expect(result?.columns).toEqual([{ name: 'v', type: "ENUM('O''Brien', 'a,b')" }]);
});
