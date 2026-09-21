/**
 * Presentation contract for the SQL Intelligence Dashboard
 * (specs/010-sql-intelligence-dashboard — contracts/dashboard-data.md, data-model.md).
 * Pure data: the adapter builds it from AnalysisResult; components only render it.
 */

import type { Locale } from '../../i18n';
import type { SqlDialect } from '../sqlAnalyzer';
import type { ComplexityLevel, LintingIssue } from '../complexityScorer';
import type { CapabilityStatus, DashboardSection } from './capability';

/** Actions a finding may offer — only what genuinely exists for that rule. */
export type FindingAction = 'viewSql' | 'explainAi' | 'optimize';

export interface DashboardFinding {
  rule: string;
  severity: 'error' | 'warning';
  title: string;
  whyItMatters: string;
  suggestion: string;
  occurrences: number;
  locations: string[];
  actions: FindingAction[];
}

export interface ComplexityContributor {
  /** SQL construct identifier (untranslated technical term), e.g. 'CTEs', 'LEFT JOIN'. */
  construct: string;
  points: number;
  shareOfTotal: number;
}

export interface MetricGroup {
  /** Group identifier — components resolve labels via i18n. */
  key: string;
  metricKeys: string[];
}

export interface DetailTab {
  section: DashboardSection;
  capability: CapabilityStatus;
}

export interface DashboardHealth {
  complexity: {
    /** The single authoritative normalized score (0–100) — null when complexity is partial. */
    normalizedScore: number | null;
    level: ComplexityLevel | null;
    /** Secondary detail only; never a primary display (FR-001). */
    rawScore: number | null;
  };
  findingCounts: { error: number; warning: number };
}

export interface DashboardAdvanced {
  rawScore: number | null;
  maxScorePossible: number | null;
  percentageOfMax: number | null;
  ruleIds: string[];
}

export interface SqlAnalysisDashboardData {
  /** Query today; future object analyzers extend this union additively (FR-014). */
  objectType: 'query';
  dialect: SqlDialect;
  health: DashboardHealth;
  findings: DashboardFinding[];
  contributors: ComplexityContributor[];
  structure: { core: MetricGroup[]; advanced: MetricGroup[] };
  detailTabs: DetailTab[];
  dependencies: { direct: number; capability: CapabilityStatus };
  capabilities: Record<DashboardSection, CapabilityStatus>;
  advanced: DashboardAdvanced;
}

export type DashboardInputMode = 'sql' | 'mybatis' | 'import-xml' | 'smart-editor';

export interface DashboardContext {
  locale: Locale;
  aiAvailable: boolean;
  inputMode: DashboardInputMode;
  /** MyBatis conversion findings, merged into the findings list when the input
   *  mode is MyBatis (U16). The caller owns where these come from. */
  mybatisFindings?: LintingIssue[];
}
