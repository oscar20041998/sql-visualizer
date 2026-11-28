import { describe, expect, it } from 'vitest';
import { analyzeTableScript, isTableScript, splitTableScript } from '@/lib/sql/tableScriptAnalyzer';
import type { SqlDialect } from '@/lib/sql/sqlAnalyzer';

describe('table script analysis', () => {
  it.each([
    ['mysql', 'INT', 'VARCHAR(30)', ''],
    ['postgresql', 'INT', 'VARCHAR(30)', ''],
    ['sqlserver', 'INT', 'VARCHAR(30)', '\nGO\n'],
    ['oracle', 'NUMBER', 'VARCHAR2(30)', '\n/\n'],
  ] as const)('combines tables, added columns, foreign keys and indexes for %s', async (dialect: SqlDialect, number: string, text: string, separator: string) => {
    const sql = `
      CREATE TABLE app.customers (id ${number} PRIMARY KEY);${separator}
      CREATE TABLE app.orders (id ${number} PRIMARY KEY, customer_id ${number});${separator}
      ALTER TABLE app.orders ADD ${dialect === 'oracle' ? `(status ${text})` : `status ${text}`};${separator}
      ALTER TABLE app.orders ADD CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES app.customers (id);${separator}
      CREATE UNIQUE INDEX ix_orders_status ON app.orders (status);`;
    const statements = splitTableScript(sql, dialect);
    expect(isTableScript(statements)).toBe(true);
    const result = await analyzeTableScript(statements, dialect);
    expect(result.warnings).toEqual([]);
    expect(result.tables).toHaveLength(2);
    const orders = result.tables[1].analysis;
    expect(orders.columns).toContainEqual({ name: 'status', type: text });
    expect(orders.details?.constraints).toContainEqual({
      type: 'FOREIGN KEY', name: 'fk_customer', columns: ['customer_id'], reference: 'app.customers (id)',
    });
    expect(orders.details?.indexes).toContainEqual({ type: 'UNIQUE INDEX', name: 'ix_orders_status', columns: ['status'] });
    expect(result.tables[0].analysis.details?.indexes).toEqual([]);
  });

  it('keeps supported tables while reporting invalid, unsupported and unrelated changes', async () => {
    const sql = `CREATE TABLE a (id INT);
      CREATE TABLE broken (id;
      CREATE TABLE b (id INT);
      ALTER TABLE a DROP COLUMN id;
      CREATE INDEX missing_index ON missing (id);
      CREATE INDEX valid_index ON b (id);`;
    const result = await analyzeTableScript(splitTableScript(sql, 'mysql'), 'mysql');
    expect(result.tables.map((table) => table.analysis.name)).toEqual(['a', 'b']);
    expect(result.warnings).toHaveLength(3);
    expect(result.warnings.map((warning) => warning.line)).toEqual([2, 4, 5]);
    expect(result.tables[1].analysis.details?.indexes).toContainEqual({
      name: 'valid_index', type: 'INDEX', columns: ['id'],
    });
  });

  it('accepts table scripts beginning with a drop while preserving an explicit warning', async () => {
    const statements = splitTableScript('DROP TABLE IF EXISTS t; CREATE TABLE t (id INT);', 'mysql');
    expect(isTableScript(statements)).toBe(true);
    const result = await analyzeTableScript(statements, 'mysql');
    expect(result.tables[0].analysis.name).toBe('t');
    expect(result.warnings.map((statement) => statement.text)).toEqual(['DROP TABLE IF EXISTS t']);
  });

  it('does not attach an index to ambiguous, differently qualified or later table definitions', async () => {
    const sql = `CREATE TABLE s.a (id INT); CREATE INDEX i ON a (id);
      CREATE INDEX early ON s.b (id); CREATE TABLE s.b (id INT);
      CREATE TABLE s.a (id INT); CREATE INDEX ambiguous ON s.a (id);`;
    const result = await analyzeTableScript(splitTableScript(sql, 'postgresql'), 'postgresql');
    expect(result.warnings).toHaveLength(4);
    expect(result.tables.every((table) => !table.analysis.details?.indexes.length)).toBe(true);
  });

  it('distinguishes PostgreSQL quoted names from folded unquoted identifiers', async () => {
    const sql = `CREATE TABLE "Foo" (id INT); CREATE TABLE foo (id INT);
      CREATE INDEX quoted ON "Foo" (id); CREATE INDEX folded ON FOO (id);`;
    const result = await analyzeTableScript(splitTableScript(sql, 'postgresql'), 'postgresql');
    expect(result.warnings).toEqual([]);
    expect(result.tables[0].analysis.details?.indexes.map((index) => index.name)).toEqual(['quoted']);
    expect(result.tables[1].analysis.details?.indexes.map((index) => index.name)).toEqual(['folded']);
  });

  it('recognizes fulltext and clustered index types', async () => {
    const mysql = await analyzeTableScript(splitTableScript(
      'CREATE TABLE t (name VARCHAR(30)); CREATE FULLTEXT INDEX ft ON t (name);', 'mysql'
    ), 'mysql');
    expect(mysql.tables[0].analysis.details?.indexes).toContainEqual({ name: 'ft', type: 'FULLTEXT INDEX', columns: ['name'] });
    const sqlserver = await analyzeTableScript(splitTableScript(
      'CREATE TABLE t (id INT); CREATE CLUSTERED INDEX ix ON t (id);', 'sqlserver'
    ), 'sqlserver');
    expect(sqlserver.tables[0].analysis.details?.indexes).toContainEqual({ name: 'ix', type: 'CLUSTERED INDEX', columns: ['id'] });
  });

  it('preserves index names and algorithms in ALTER and CREATE INDEX', async () => {
    const sql = `CREATE TABLE t (id INT);
      ALTER TABLE t ADD INDEX idx_tree USING BTREE (id);
      ALTER TABLE t ADD UNIQUE INDEX idx_unique (id);
      CREATE INDEX idx_hash ON t (id) USING HASH;`;
    const result = await analyzeTableScript(splitTableScript(sql, 'mysql'), 'mysql');
    expect(result.warnings).toEqual([]);
    expect(result.tables[0].analysis.details?.indexes).toEqual([
      { name: 'idx_tree', type: 'INDEX USING BTREE', columns: ['id'] },
      { name: 'idx_unique', type: 'UNIQUE INDEX', columns: ['id'] },
      { name: 'idx_hash', type: 'INDEX USING HASH', columns: ['id'] },
    ]);
  });

  it('preserves referential actions and warns about unsupported index expressions', async () => {
    const sql = `CREATE TABLE t (id INT, parent_id INT);
      ALTER TABLE t ADD CONSTRAINT fk FOREIGN KEY (parent_id) REFERENCES t (id) ON DELETE CASCADE;
      CREATE INDEX expr_idx ON t ((id + 1));`;
    const result = await analyzeTableScript(splitTableScript(sql, 'mysql'), 'mysql');
    expect(result.tables[0].analysis.details?.constraints).toContainEqual({
      type: 'FOREIGN KEY', name: 'fk', columns: ['parent_id'], reference: 't (id) ON DELETE CASCADE',
    });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].text).toContain('expr_idx');
  });

  it('handles SQL Server bracketed names and Oracle referential actions', async () => {
    const tsql = `CREATE TABLE [dbo].[orders] ([id] INT, [customer_id] INT);
      ALTER TABLE [dbo].[orders] ADD CONSTRAINT [fk_customer]
      FOREIGN KEY ([customer_id]) REFERENCES [dbo].[customers] ([id]) ON DELETE CASCADE;
      CREATE INDEX [idx_customer] ON [dbo].[orders] ([customer_id]);`;
    const server = await analyzeTableScript(splitTableScript(tsql, 'sqlserver'), 'sqlserver');
    expect(server.warnings).toEqual([]);
    expect(server.tables[0].analysis.details?.constraints).toContainEqual({
      type: 'FOREIGN KEY', name: 'fk_customer', columns: ['customer_id'],
      reference: 'dbo.customers (id) ON DELETE CASCADE',
    });
    expect(server.tables[0].analysis.details?.indexes[0].name).toBe('idx_customer');
    const oracle = `CREATE TABLE HR.orders (id NUMBER, customer_id NUMBER);
      ALTER TABLE HR.orders ADD CONSTRAINT fk FOREIGN KEY (customer_id) REFERENCES HR.customers (id) ON DELETE SET NULL;`;
    const result = await analyzeTableScript(splitTableScript(oracle, 'oracle'), 'oracle');
    expect(result.warnings).toEqual([]);
    expect(result.tables[0].analysis.details?.constraints[0].reference).toBe('HR.customers (id) ON DELETE SET NULL');
  });

  it('reports repeated GO without swallowing the next statement', async () => {
    const sql = 'CREATE TABLE a (id INT);\nGO 2\nCREATE TABLE b (id INT);\nGO';
    const result = await analyzeTableScript(splitTableScript(sql, 'sqlserver'), 'sqlserver');
    expect(result.tables.map((table) => table.analysis.name)).toEqual(['a', 'b']);
    expect(result.warnings.map((statement) => statement.text)).toEqual(['GO 2']);
  });

  it.each(['mysql', 'postgresql', 'sqlserver', 'oracle'] as SqlDialect[])(
    'does not split semicolons inside strings and comments for %s',
    (dialect: SqlDialect) => {
      const statements = splitTableScript("CREATE TABLE a (v VARCHAR(10) DEFAULT 'a;b'); -- ;\nCREATE TABLE b (id INT);", dialect);
      expect(statements).toHaveLength(2);
      expect(statements[0].text).toContain("'a;b'");
      expect(statements[1].line).toBe(2);
    }
  );

  it('preserves PostgreSQL dollar quoted text and escape strings without false statements', () => {
    const statements = splitTableScript("CREATE TABLE a (v TEXT DEFAULT E'a\\';b', x TEXT DEFAULT $$c;d$$); CREATE TABLE b (id INT);", 'postgresql');
    expect(statements).toHaveLength(2);
  });
});
