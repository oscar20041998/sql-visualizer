import type { JoinType } from '@/lib/sql/sqlAnalyzer';

export type GraphTheme = 'dark' | 'light';

export const JOIN_COLORS_DARK: Record<JoinType, string> = {
  'LEFT JOIN': '#fbbf24',
  'RIGHT JOIN': '#34d399',
  'INNER JOIN': '#60a5fa',
  'FULL OUTER JOIN': '#f472b6',
  'CROSS JOIN': '#fb7185',
  'NATURAL JOIN': '#a78bfa',
  'RELATES TO': '#22d3ee',
  'LATERAL JOIN': '#8b5cf6' 
};

export const JOIN_COLORS_LIGHT: Record<JoinType, string> = {
  'LEFT JOIN': '#d97706',
  'RIGHT JOIN': '#059669',
  'INNER JOIN': '#2563eb',
  'FULL OUTER JOIN': '#be185d',
  'CROSS JOIN': '#dc2626',
  'NATURAL JOIN': '#7c3aed',
  'RELATES TO': '#0e7490',
  'LATERAL JOIN': '#6d28d9',
};

// Keep existing export for compatibility in older call sites.
export const JOIN_COLORS: Record<JoinType, string> = JOIN_COLORS_DARK;

export function getJoinColor(joinType: JoinType, theme: GraphTheme): string {
  return theme === 'light' ? JOIN_COLORS_LIGHT[joinType] : JOIN_COLORS_DARK[joinType];
}
