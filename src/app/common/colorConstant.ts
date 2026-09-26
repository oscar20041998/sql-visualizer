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
  'LATERAL JOIN': '#8b5cf6',
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

// ─── Guideline / score-table accents ───────────────────────────────────────────
// The guideline page and ScoreWeightTable paint icon, label and text accents from a fixed
// palette. The dark shades are neon 300s tuned for the dark `--card` surface; on the light
// surface they glare and, used as text (quick-nav pills, table category headers), fail
// contrast. The light shades are the 600–700 tone of the same hues, so the hue identity of
// each section is preserved while staying legible on white.
export type GuidelineAccent =
  | 'cyan'
  | 'sky'
  | 'emerald'
  | 'teal'
  | 'violet'
  | 'indigo'
  | 'pink'
  | 'rose'
  | 'red'
  | 'amber'
  | 'slate';

export const GUIDELINE_ACCENTS_DARK: Record<GuidelineAccent, string> = {
  cyan: '#6ee7f7',
  sky: '#0ea5e9',
  emerald: '#10b981',
  teal: '#14b8a6',
  violet: '#a78bfa',
  indigo: '#818cf8',
  pink: '#f472b6',
  rose: '#f43f5e',
  red: '#ef4444',
  amber: '#f59e0b',
  slate: '#8b949e',
};

export const GUIDELINE_ACCENTS_LIGHT: Record<GuidelineAccent, string> = {
  cyan: '#0e7490',
  sky: '#0369a1',
  emerald: '#047857',
  teal: '#0f766e',
  violet: '#7c3aed',
  indigo: '#4f46e5',
  pink: '#be185d',
  rose: '#be123c',
  red: '#dc2626',
  amber: '#b45309',
  slate: '#57606a',
};

export function getGuidelineAccent(accent: GuidelineAccent, theme: GraphTheme): string {
  return theme === 'light' ? GUIDELINE_ACCENTS_LIGHT[accent] : GUIDELINE_ACCENTS_DARK[accent];
}
