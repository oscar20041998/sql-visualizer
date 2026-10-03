import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Fixture loader for the golden corpus (research R14).
 *
 * Test-only helper — never imported from `src/`. Enumerates the case triples in
 * `tests/fixtures/mybatis/` and exposes the SQL normaliser the runner compares with.
 */

const FIXTURE_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'fixtures',
  'mybatis'
);

/** One corpus case, fully loaded. */
export interface MyBatisFixtureCase {
  /** Case name without extension. */
  name: string;
  /** Raw mapper XML. */
  xml: string;
  /** The `<case>.params.json` body, parsed. */
  config: FixtureConfig;
  /** Expected SQL after normalisation (empty string for blocked cases). */
  expectedSql: string;
}

export interface FixtureConfig {
  /** Parameter values keyed by the names the mapper uses. */
  params?: Record<string, string>;
  /** Dialect to resolve with. Defaults to `mysql` when absent. */
  dialect?: string;
  /** Statement identifier to resolve. Defaults to the first statement. */
  statement?: string;
  /** Finding kinds the result must carry (subset match). */
  expectedFindings?: string[];
}

/** SQL normaliser shared with the runner: collapse cosmetic whitespace only. */
export function normaliseSql(sql: string): string {
  return sql
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

/** Every case triple found in the fixture directory, in name order. */
export function listMyBatisFixtures(): MyBatisFixtureCase[] {
  const names = readdirSync(FIXTURE_DIR)
    .filter((name) => name.endsWith('.xml'))
    .map((name) => name.slice(0, -'.xml'.length))
    .sort();
  return names.map(loadMyBatisFixture);
}

/** Load one case triple by name. */
export function loadMyBatisFixture(name: string): MyBatisFixtureCase {
  const xml = readFileSync(join(FIXTURE_DIR, `${name}.xml`), 'utf8');
  const rawConfig = readFileSync(join(FIXTURE_DIR, `${name}.params.json`), 'utf8');
  const expectedSql = readFileSync(join(FIXTURE_DIR, `${name}.expected.sql`), 'utf8');
  return {
    name,
    xml,
    config: JSON.parse(rawConfig) as FixtureConfig,
    expectedSql: normaliseSql(expectedSql),
  };
}
