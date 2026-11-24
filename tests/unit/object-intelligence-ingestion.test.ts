import { expect, it } from 'vitest';
import { splitDefinitions, splitMySqlDefinitions } from '@/lib/sql/objectIntelligenceIngestion';

it('retains the original source ranges of multiple MySQL definitions', async () => {
  const source =
    'CREATE TABLE sales.staff (id INT);\nCREATE VIEW sales.report AS SELECT id FROM sales.staff;';
  const result = await splitMySqlDefinitions(source);

  expect(result.status).toBe('parsed');
  if (result.status !== 'parsed') return;
  expect(result.definitions.map(({ text }) => text)).toEqual([
    'CREATE TABLE sales.staff (id INT)',
    'CREATE VIEW sales.report AS SELECT id FROM sales.staff',
  ]);
  for (const definition of result.definitions) {
    expect(source.slice(definition.start, definition.end)).toBe(definition.text);
  }
});

it('preserves Unicode offsets and does not split a routine at internal semicolons', async () => {
  const source =
    "-- 😀 comment\nCREATE PROCEDURE sales.p() BEGIN SELECT 'x;y'; SELECT 2; END;\nCREATE TABLE sales.staff (id INT);";
  const result = await splitMySqlDefinitions(source);
  expect(result.status).toBe('parsed');
  if (result.status !== 'parsed') return;
  expect(result.definitions).toHaveLength(2);
  expect(result.definitions[0].text).toBe(
    "CREATE PROCEDURE sales.p() BEGIN SELECT 'x;y'; SELECT 2; END"
  );
  expect(result.definitions[1].text).toBe('CREATE TABLE sales.staff (id INT)');
  for (const definition of result.definitions) {
    expect(source.slice(definition.start, definition.end)).toBe(definition.text);
  }
});

it('rejects a malformed batch instead of returning a partial set', async () => {
  const result = await splitMySqlDefinitions(
    'CREATE TABLE sales.staff (id INT); CREATE TABLE sales.broken ('
  );
  expect(result.status).toBe('unsupported');
});

it('retains the original source ranges of multiple PostgreSQL definitions', async () => {
  const source =
    'CREATE TABLE sales.staff (id INT);\nCREATE VIEW sales.report AS SELECT id FROM sales.staff;';
  const result = await splitDefinitions(source, 'postgresql');
  expect(result.status).toBe('parsed');
  if (result.status !== 'parsed') return;
  expect(result.definitions.map(({ text }) => text)).toEqual([
    'CREATE TABLE sales.staff (id INT)',
    'CREATE VIEW sales.report AS SELECT id FROM sales.staff',
  ]);
  for (const definition of result.definitions) {
    expect(source.slice(definition.start, definition.end)).toBe(definition.text);
  }
});

it('preserves PostgreSQL dollar-quoted bodies and Unicode source offsets', async () => {
  const source =
    "-- 😀\nCREATE FUNCTION sales.f() RETURNS text LANGUAGE sql AS $$ SELECT 'x;y'; $$;\nCREATE TABLE sales.staff (id INT);";
  const result = await splitDefinitions(source, 'postgresql');
  expect(result.status).toBe('parsed');
  if (result.status !== 'parsed') return;
  expect(result.definitions).toHaveLength(2);
  expect(result.definitions[0].text).toBe(
    "CREATE FUNCTION sales.f() RETURNS text LANGUAGE sql AS $$ SELECT 'x;y'; $$"
  );
  expect(result.definitions[1].text).toBe('CREATE TABLE sales.staff (id INT)');
  for (const definition of result.definitions) {
    expect(source.slice(definition.start, definition.end)).toBe(definition.text);
  }
});
