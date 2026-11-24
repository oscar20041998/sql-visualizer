import { expect, it } from 'vitest';
import { analyzeTrigger } from '@/lib/sql/triggerAnalyzer';

it('extracts MySQL trigger facts and the original body from the supplied definition', async () => {
  await expect(
    analyzeTrigger(
      'CREATE TRIGGER before_employee_insert\nBEFORE INSERT ON employees\nFOR EACH ROW\nSET NEW.created_at = NOW();',
      'mysql'
    )
  ).resolves.toEqual({
    status: 'partial',
    kind: 'trigger',
    name: 'before_employee_insert',
    table: 'employees',
    timing: 'BEFORE',
    event: 'INSERT',
    body: 'SET NEW.created_at = NOW()',
  });
});
