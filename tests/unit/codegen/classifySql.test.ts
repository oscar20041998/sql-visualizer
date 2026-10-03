import { describe, expect, it } from 'vitest';
import { classifySql } from '@/lib/codegen/classifySql';
import { parseSql } from '@/lib/codegen/parseSql';

describe('classifySql', () => {
  it('classifies DDL and plain select', () => {
    const table = classifySql(parseSql('CREATE TABLE users (id BIGINT PRIMARY KEY)', 'mysql'));
    const projection = classifySql(parseSql('SELECT id, name FROM users', 'mysql'));

    expect(table).toMatchObject({
      kind: 'table-definition',
      confidence: 'high',
      recommendedOutput: 'entity',
      requiresUserChoice: false,
    });
    expect(projection).toMatchObject({
      kind: 'select-dto',
      confidence: 'high',
      recommendedOutput: 'dto',
      requiresUserChoice: false,
    });
  });

  it('classifies joined and aggregate selects', () => {
    const joined = classifySql(
      parseSql('SELECT u.id FROM users u JOIN orders o ON u.id = o.user_id', 'mysql')
    );
    const aggregated = classifySql(
      parseSql('SELECT COUNT(*) AS total FROM orders', 'mysql')
    );
    const grouped = classifySql(
      parseSql('SELECT user_id, COUNT(*) AS total FROM orders GROUP BY user_id', 'mysql')
    );

    expect(joined).toMatchObject({ kind: 'select-join', recommendedOutput: 'dto' });
    expect(aggregated).toMatchObject({ kind: 'select-aggregation', recommendedOutput: 'dto' });
    expect(grouped).toMatchObject({ kind: 'select-aggregation', recommendedOutput: 'dto' });
  });

  it('classifies DML and unknown input', () => {
    const insert = classifySql(
      parseSql('INSERT INTO users (id) VALUES (1)', 'mysql')
    );
    const update = classifySql(
      parseSql("UPDATE users SET name = 'A' WHERE id = 1", 'mysql')
    );
    const deletion = classifySql(
      parseSql('DELETE FROM users WHERE id = 1', 'mysql')
    );
    const unknown = classifySql(parseSql('not valid sql', 'mysql'));

    expect(insert).toMatchObject({ kind: 'insert', recommendedOutput: 'none' });
    expect(update).toMatchObject({ kind: 'update', recommendedOutput: 'none' });
    expect(deletion).toMatchObject({ kind: 'delete', recommendedOutput: 'none' });
    expect(unknown).toMatchObject({ kind: 'unknown', recommendedOutput: 'none' });
    expect(insert.reasons.join(' ')).toMatch(/repository|persistence/i);
  });
});