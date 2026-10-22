/**
 * Dashboard AI insight prompt builders (specs/010-sql-intelligence-dashboard —
 * contracts/ai-insights.md, FR-019/FR-020). Bilingual vi/en; responses render only
 * inside the visibly labeled AI panel and must never contradict parser facts.
 */

import type { Locale } from '../../i18n';
import type { ComplexityContributor } from './types';
import { localizedPromptId, renderPrompt } from '../../ai/prompts/render';
import {
  DASHBOARD_PROMPTS,
  explainComplexityParams,
  explainFindingParams,
  optimizationOpportunitiesParams,
} from '../../ai/prompts/templates/dashboard';

export interface ExplainComplexityInput {
  normalizedScore: number;
  level: string;
  contributors: ComplexityContributor[];
}

// ---------------------------------------------------------------------------------------------
// Prompt building — the wording lives in `src/lib/ai/prompts/templates/dashboard.ts`, registered as
// `dashboard.*.en` / `dashboard.*.vi` pairs because the pre-migration source branched per locale on
// the WHOLE text. These wrappers keep this module's existing exported signatures (and the tests
// that import them) while every prompt text reaches a provider only through `renderPrompt`
// (specs/020 SC-002 / SC-005). The contributor-list formatting also produces prompt text, so it
// moved to the template module as `complexityContributorLines`.
// ---------------------------------------------------------------------------------------------

/** Explains a complexity score together with its top contributors (contracts/ai-insights.md U23). */
export function buildExplainComplexityPrompt(
  input: ExplainComplexityInput,
  locale: Locale
): string {
  return renderPrompt(
    localizedPromptId(DASHBOARD_PROMPTS.explainComplexity, locale),
    explainComplexityParams(input)
  )[0].content;
}

/** Explains one lint finding, embedding its location only when one is present (U24). */
export function buildExplainFindingPrompt(
  finding: { rule: string; message: string; location?: string },
  locale: Locale
): string {
  return renderPrompt(
    localizedPromptId(DASHBOARD_PROMPTS.explainFinding, locale),
    explainFindingParams(finding)
  )[0].content;
}

/** Requests optimization opportunities as the documented JSON object only (U25). */
export function buildOptimizationOpportunitiesPrompt(sql: string, locale: Locale): string {
  return renderPrompt(
    localizedPromptId(DASHBOARD_PROMPTS.optimizationOpportunities, locale),
    optimizationOpportunitiesParams(sql)
  )[0].content;
}
