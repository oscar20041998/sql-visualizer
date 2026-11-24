import { expect, it, vi } from 'vitest';
import { analyzeView } from '@/lib/sql/viewAnalyzer';

vi.mock('node-sql-parser', () => ({
  Parser: class {
    astify() {
      throw new Error('Parser initialization failed');
    }
  },
}));

it('propagates parser failures instead of reporting invalid SQL', async () => {
  await expect(analyzeView('CREATE VIEW v AS SELECT 1', 'mysql')).rejects.toThrow(
    'Parser initialization failed'
  );
});
