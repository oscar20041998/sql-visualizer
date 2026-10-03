/**
 * Presentation contract for the SQL Intelligence Dashboard
 * (specs/010-sql-intelligence-dashboard — contracts/dashboard-data.md, data-model.md).
 * Pure data: the adapter builds it from AnalysisResult; components only render it.
 */

import type { Locale } from '../../i18n';
import type { SqlDialect } from '../sqlAnalyzer';
import type { ComplexityLevel, LintingIssue } from '../complexityScorer';
import type { AstStatistics } from '../../codegen/model';
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

/**
 * What actually produced the numbers shown in this dashboard.
 *
 * The analyzer parses with a regex engine today (`SQL_REGEX_PATTERNS` + `SQL_KEYWORDS`), not an
 * AST — so every field here describes that engine honestly rather than a parser that is not in the
 * analysis path. `astStatisticsAvailable` is the explicit bridge: it stays false until real AST
 * statistics are computed, so the UI never has to guess whether an omission is a bug.
 */
export interface DashboardParserMetadata {
  /** Engine that produced this analysis. Literal today; widen when an AST path lands. */
  engine: 'regex';
  dialect: SqlDialect;
  /** Size of the engine's vocabulary — derived from the constants that actually drive it. */
  keywordCount: number;
  patternCount: number;
  /** Real extraction caps the analyzer ran under; these explain why some counts stop early. */
  limits: {
    maxColumns: number;
    maxCteFieldReferences: number;
  };
}

export interface DashboardAdvanced {
  rawScore: number | null;
  maxScorePossible: number | null;
  percentageOfMax: number | null;
  ruleIds: string[];
  /** Parser/analyzer metadata that exists today (FR-027). */
  parser: DashboardParserMetadata;
  /**
   * Real AST statistics for the analysed statement, or `null` when no AST could be produced
   * (specs/016-ast-statistics). Computed upstream by the caller and passed in through
   * `DashboardContext`: this adapter never parses SQL, so it can only carry the value it is given.
   * `null` is the only representation of "unavailable" — never a zero-filled object.
   */
  astStatistics: AstStatistics | null;
  /**
   * True exactly when `astStatistics` is non-null. Kept as its own field so the UI can render
   * availability as a state instead of inferring it from the shape of a numeric block.
   */
  astStatisticsAvailable: boolean;
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
  /**
   * Real AST statistics for the analysed statement, computed by the caller through the existing
   * `parseSql` pipeline (specs/016-ast-statistics FR-005).
   *
   * It is an input rather than something the adapter computes: this function must stay a pure,
   * deterministic mapping of its arguments (U18 / FR-026), so parsing happens in the caller and
   * arrives here ready-made. Omitted or `null` — the default, and the result for unsupported
   * dialects or unparsable SQL — means "unavailable", never "zero".
   */
  astStatistics?: AstStatistics | null;
}
