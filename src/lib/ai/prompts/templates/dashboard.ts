/**
 * Dashboard AI insight prompt templates.
 *
 * Migrated by specs/020-prompt-manager-refactor T016 from `src/lib/sql/dashboard/aiPrompts.ts`.
 * The wording is byte-identical to the pre-migration builders (FR-002/FR-004); nothing here may be
 * reworded without a new spec, because `tests/unit/promptParity.dashboard.test.ts` pins the exact
 * bytes each builder must return.
 *
 * Unlike `formatError.explain` / `sqlComparison.review`, these three sources branch per locale on
 * the WHOLE text, not on a single instruction, so each is registered as a `.en` / `.vi` pair and
 * resolved with `localizedPromptId` (prompt-inventory.md rows 18-20, "Yes (whole text)").
 *
 * Role: all three entries are `user`. These builders return a plain string for the dashboard AI
 * panel and are never sent as a system message — the repo has no chat-message consumer for them at
 * all (they are exercised by `tests/unit/dashboardAiPrompts.test.ts`), so `user` matches both the
 * inventory rows and how `aiService.buildMessages` wraps a single-turn `prompt` string.
 *
 * The `text` values are written as single-line template literals with `\n` escapes, exactly as the
 * source had them, so the migrated bytes are trivially comparable against the pre-migration source.
 *
 * The contributor-list formatting produces prompt text, so it lives here as an exported param
 * builder (SC-002) while `renderPrompt` stays the only place a prompt is assembled.
 *
 * Dependency note: `ExplainComplexityInput` is imported `import type` only, so there is no runtime
 * edge back to the dashboard module and therefore no import cycle (registry.ts dependency rule).
 */
import type { ComplexityContributor } from '@/lib/sql/dashboard/types';
import type { ExplainComplexityInput } from '@/lib/sql/dashboard/aiPrompts';
import type { PromptTemplateMap } from '../registry';

/** Registry base ids for this feature. Resolve the locale variant with `localizedPromptId`. */
export const DASHBOARD_PROMPTS = {
  explainComplexity: 'dashboard.explainComplexity',
  explainFinding: 'dashboard.explainFinding',
  optimizationOpportunities: 'dashboard.optimizationOpportunities',
} as const;

/**
 * Formats the top contributors for the complexity prompt: at most five lines, each naming the
 * construct, its points and its rounded share of the total.
 */
export function complexityContributorLines(contributors: ComplexityContributor[]): string {
  return contributors
    .slice(0, 5)
    .map(
      (contributor) =>
        `- ${contributor.construct}: ${contributor.points} points (${Math.round(
          contributor.shareOfTotal * 100
        )}% of total)`
    )
    .join('\n');
}

/** Parameters for {@link DASHBOARD_PROMPTS.explainComplexity} (either locale variant). */
export function explainComplexityParams(input: ExplainComplexityInput): Record<string, string> {
  return {
    normalizedScore: String(input.normalizedScore),
    level: input.level,
    contributorLines: complexityContributorLines(input.contributors),
  };
}

/** Parameters for {@link DASHBOARD_PROMPTS.explainFinding} (either locale variant). */
export function explainFindingParams(finding: {
  rule: string;
  message: string;
  location?: string;
}): Record<string, string> {
  return {
    rule: finding.rule,
    message: finding.message,
    location: finding.location ? `\nLocation: ${finding.location}` : '',
  };
}

/** Parameters for {@link DASHBOARD_PROMPTS.optimizationOpportunities} (either locale variant). */
export function optimizationOpportunitiesParams(sql: string): Record<string, string> {
  return { sql };
}

export const DASHBOARD_TEMPLATES: PromptTemplateMap = {
  [`${DASHBOARD_PROMPTS.explainComplexity}.en`]: {
    role: 'user',
    locale: 'en',
    feature: 'dashboard',
    source: 'src/lib/sql/dashboard/aiPrompts.ts:33',
    params: {
      normalizedScore: { required: true },
      level: { required: true },
      contributorLines: { required: true },
    },
    text: `Explain in plain language why this SQL query has a complexity of {{normalizedScore}}/100 (level {{level}}).
The top contributing structures:
{{contributorLines}}
Ground your answer in the static analysis facts above; never contradict them.`,
  },

  [`${DASHBOARD_PROMPTS.explainComplexity}.vi`]: {
    role: 'user',
    locale: 'vi',
    feature: 'dashboard',
    source: 'src/lib/sql/dashboard/aiPrompts.ts:31',
    params: {
      normalizedScore: { required: true },
      level: { required: true },
      contributorLines: { required: true },
    },
    text: `Giải thích bằng tiếng Việt, ngôn ngữ đơn giản, vì sao truy vấn SQL này có độ phức tạp {{normalizedScore}}/100 (mức {{level}}).
Các cấu trúc đóng góp nhiều nhất:
{{contributorLines}}
Dựa câu trả lời trên các dữ kiện phân tích tĩnh ở trên; không được mâu thuẫn với chúng.`,
  },

  [`${DASHBOARD_PROMPTS.explainFinding}.en`]: {
    role: 'user',
    locale: 'en',
    feature: 'dashboard',
    source: 'src/lib/sql/dashboard/aiPrompts.ts:45',
    params: {
      rule: { required: true },
      message: { required: true },
      location: { required: false, default: '' },
    },
    text: `Explain in plain language what the rule "{{rule}}" found: {{message}}.{{location}}
Say why it matters and how to address it; do not invent facts.`,
  },

  [`${DASHBOARD_PROMPTS.explainFinding}.vi`]: {
    role: 'user',
    locale: 'vi',
    feature: 'dashboard',
    source: 'src/lib/sql/dashboard/aiPrompts.ts:43',
    params: {
      rule: { required: true },
      message: { required: true },
      location: { required: false, default: '' },
    },
    text: `Giải thích bằng tiếng Việt, dễ hiểu: quy tắc "{{rule}}" phát hiện: {{message}}.{{location}}
Nói rõ vì sao điều này quan trọng và cách khắc phục; không bịa thêm dữ kiện.`,
  },

  [`${DASHBOARD_PROMPTS.optimizationOpportunities}.en`]: {
    role: 'user',
    locale: 'en',
    feature: 'dashboard',
    source: 'src/lib/sql/dashboard/aiPrompts.ts:52',
    params: {
      sql: { required: true },
    },
    text: `Identify optimization opportunities for the following SQL. Reply with ONLY a JSON object — no prose — using exactly this shape:
{"items":[{"title":"...","rationale":"...","suggestedSql":"... (optional)"}]}
Do not change the query's semantics; do not promise performance improvement percentages.

Query:
{{sql}}`,
  },

  [`${DASHBOARD_PROMPTS.optimizationOpportunities}.vi`]: {
    role: 'user',
    locale: 'vi',
    feature: 'dashboard',
    source: 'src/lib/sql/dashboard/aiPrompts.ts:50',
    params: {
      sql: { required: true },
    },
    text: `Phát hiện cơ hội tối ưu hóa cho truy vấn SQL sau đây. Chỉ trả về DUY NHẤT một đối tượng JSON, không kèm lời dẫn, theo đúng cấu trúc:
{"items":[{"title":"...","rationale":"...","suggestedSql":"... (tùy chọn)"}]}
Không thay đổi ngữ nghĩa của truy vấn; không hứa hẹn phần trăm cải thiện hiệu năng.

Truy vấn:
{{sql}}`,
  },
};
