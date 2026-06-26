import type { JoinType } from '@/lib/sqlAnalyzer';

export const JOIN_COLORS: Record<JoinType, string> = {
  'LEFT JOIN': '#f59e0b',
  'RIGHT JOIN': '#10b981',
  'INNER JOIN': '#6366f1',
  'FULL OUTER JOIN': '#ec4899',
  'CROSS JOIN': '#ef4444',
  'NATURAL JOIN': '#8b5cf6',
};
