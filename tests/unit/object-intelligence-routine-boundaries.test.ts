import { describe, expect, it } from 'vitest';
import { extractRoutineQueries, parseMySqlDefinition } from '@/lib/sql/mysqlObjectParser';
import { procedureFromStatement } from '@/lib/sql/storeprocedureAnalyzer';
import { analyzeTrigger, triggerFromStatement } from '@/lib/sql/triggerAnalyzer';
import { analyzePostgresqlRoutine } from '@/lib/sql/postgresqlRoutineAnalyzer';

describe('MySQL object definition boundaries', () => {
  it('extracts direct SELECT statements with original Unicode-safe source locations', async () => {
    const sql =
      "-- 😀\nCREATE PROCEDURE p()\nBEGIN\n  SELECT 'x;😀' FROM orders;\n  SELECT id FROM employees;\nEND;";
    const statement = await parseMySqlDefinition(sql);
    const body = statement?.createProcedure()?.routineBody();
    expect(body).toBeDefined();
    const result = extractRoutineQueries(sql, body!);
    expect(result).toEqual({
      queries: [
        {
          text: "SELECT 'x;😀' FROM orders",
          start: { offset: sql.indexOf('SELECT'), line: 4, column: 3 },
          end: { offset: sql.indexOf(';\n'), line: 4, column: 28 },
        },
        {
          text: 'SELECT id FROM employees',
          start: { offset: sql.indexOf('SELECT id'), line: 5, column: 3 },
          end: { offset: sql.lastIndexOf(';\n'), line: 5, column: 27 },
        },
      ],
      incomplete: false,
    });

  }, 30000);

  it('marks non-SELECT and nested control flow as incomplete instead of flattening them', async () => {
    const sql =
      'CREATE PROCEDURE p() BEGIN SET @x = 1; IF @x = 1 THEN SELECT id FROM hidden_table; END IF; SELECT id FROM visible_table; END;';
    const statement = await parseMySqlDefinition(sql);
    const body = statement?.createProcedure()?.routineBody();
    expect(body).toBeDefined();
    const result = extractRoutineQueries(sql, body!);
    expect(result.incomplete).toBe(true);
    expect(result.queries.map((query) => query.text)).toEqual(['SELECT id FROM visible_table']);
  }, 30000);
  it('preserves qualified quoted trigger names and Unicode source in a compound body', async () => {
    const sql =
      "-- 😀 comment\nCREATE TRIGGER `sales`.`audit` AFTER UPDATE ON `sales`.`orders`\nFOR EACH ROW BEGIN\n  SET @message = '😀; done';\n  SET @count = 1;\nEND;";
    const statement = await parseMySqlDefinition(sql);
    expect(statement && triggerFromStatement(sql, statement)).toEqual({
      status: 'partial',
      kind: 'trigger',
      name: '`sales`.`audit`',
      table: '`sales`.`orders`',
      timing: 'AFTER',
      event: 'UPDATE',
      body: "BEGIN\n  SET @message = '😀; done';\n  SET @count = 1;\nEND",
    });
  }, 30000);

  it('preserves procedure parameters and a multi-statement body without inventing parameter information', async () => {
    const sql =
      "-- 😀\nCREATE PROCEDURE `sales`.`update_order`(IN p_id INT, OUT p_msg VARCHAR(20))\nBEGIN\n  SET p_msg = 'ok; 😀';\n  SELECT p_id;\nEND;";
    const statement = await parseMySqlDefinition(sql);
    expect(statement && procedureFromStatement(sql, statement)).toEqual({
      status: 'partial',
      kind: 'procedure',
      name: '`sales`.`update_order`',
      parameters: ['IN p_id INT', 'OUT p_msg VARCHAR(20)'],
      body: "BEGIN\n  SET p_msg = 'ok; 😀';\n  SELECT p_id;\nEND",
    });
  }, 30000);

  it('rejects invalid definitions and multiple top-level statements', async () => {
    expect(
      await parseMySqlDefinition('CREATE TRIGGER broken BEFORE INSERT ON t FOR EACH ROW SET')
    ).toBeNull();
    expect(await parseMySqlDefinition('CREATE PROCEDURE p() BEGIN SELECT 1;')).toBeNull();
    expect(await parseMySqlDefinition('CREATE PROCEDURE p() SELECT 1; SELECT 2;')).toBeNull();
  }, 30000);

  it('distinguishes a procedure with no declared parameters', async () => {
    const sql = 'CREATE PROCEDURE ping() SELECT 1;';
    const statement = await parseMySqlDefinition(sql);
    expect(statement && procedureFromStatement(sql, statement)).toEqual({
      status: 'partial',
      kind: 'procedure',
      name: 'ping',
      parameters: [],
      body: 'SELECT 1',
    });
  }, 30000);

  it('does not claim MySQL trigger support for other dialects', async () => {
    expect(
      await analyzeTrigger(
        'CREATE TRIGGER t BEFORE INSERT ON x FOR EACH ROW SET @x = 1;',
        'postgresql'
      )
    ).toBeNull();
  });
});

describe('PostgreSQL routine metadata boundaries', () => {
  it('preserves a tagged procedure body, quoted identity and Unicode without inventing statements', async () => {
    const sql =
      '-- 😀\nCREATE PROCEDURE "sales"."update_order"(IN p_id integer) LANGUAGE plpgsql AS $body$ BEGIN RAISE NOTICE \'😀; done\'; END; $body$;';
    expect(await analyzePostgresqlRoutine(sql)).toEqual({
      status: 'partial',
      kind: 'procedure',
      name: '"sales"."update_order"',
      parameters: ['IN p_id integer'],
      body: "$body$ BEGIN RAISE NOTICE '😀; done'; END; $body$",
    });
  }, 30000);

  it('rejects mismatched tags, multiple statements and unsupported return or language forms', async () => {
    const inputs = [
      'CREATE FUNCTION f() RETURNS integer LANGUAGE sql AS $a$ SELECT 1; $b$;',
      'CREATE FUNCTION f() RETURNS integer LANGUAGE sql AS $$ SELECT 1; $$; SELECT 2;',
      'CREATE FUNCTION f() RETURNS TABLE (id integer) LANGUAGE sql AS $$ SELECT 1; $$;',
      'CREATE FUNCTION f() RETURNS integer LANGUAGE plpython3u AS $$ return 1 $$;',
    ];
    for (const sql of inputs) {
      expect(await analyzePostgresqlRoutine(sql)).toBeNull();
    }
  }, 30000);
});
