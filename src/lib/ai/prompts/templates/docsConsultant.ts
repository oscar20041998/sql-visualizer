/**
 * Docs-consultant prompt templates.
 *
 * Migrated by specs/020-prompt-manager-refactor from `DOCS_CONSULTANT_SYSTEM_PROMPT` and
 * `DOCS_CONSULTANT_NO_CONTEXT_PROMPT` in `src/lib/ai/aiService.ts`. The wording is byte-identical
 * to the pre-migration constants (FR-002/FR-004); nothing here may be reworded without a new
 * spec, because `tests/unit/promptParity.aiServiceFlow.test.ts` pins the exact bytes a provider
 * must receive.
 *
 * The source branched per locale, so each purpose is registered as an `.en` / `.vi` pair
 * (data-model.md -> PromptTemplate.locale) and call sites resolve it via `localizedPromptId`,
 * which reproduces the pre-migration `PROMPT[locale] ?? PROMPT.en` lookup exactly.
 *
 * Both purposes are `system` messages: `buildDocsConsultantMessages` (aiService.ts:2963-2970)
 * emits exactly one system message whose content is EITHER the base prompt followed by the
 * retrieved documentation OR the no-context fallback, then the untouched user question.
 *
 * Why the retrieved-documentation heading lives HERE and not at the call site: unlike a semantic
 * brief prefix (which is another feature's prompt text composed by the caller), `Retrieved
 * documentation:` is this feature's own hard-coded prompt wording (aiService.ts:2966). Keeping it
 * in the entry is what makes the rendered content equal the whole pre-migration system message,
 * so no prompt text is left behind in `aiService.ts` (SC-002, contract Invariant 2). The
 * context/no-context BRANCH stays at the call site: it selects which of the two ids to render.
 */
import type { PromptTemplateMap } from '../registry';

/** Registry ids for this feature. Prefer these over raw strings at call sites. */
export const DOCS_CONSULTANT_PROMPTS = {
  /** System message used when retrieval returned documentation. */
  system: 'docsConsultant.system',
  /** System message used when retrieval returned nothing. */
  noContext: 'docsConsultant.noContext',
} as const;

/**
 * Parameters for {@link DOCS_CONSULTANT_PROMPTS.system}: the retrieved documentation chunks
 * exactly as the retrieval step returned them. Render this id ONLY when `context` is truthy —
 * the pre-migration call site substituted the whole no-context prompt in that case instead.
 */
export function docsConsultantSystemParams(context: string): Record<string, string> {
  return { context };
}

/** {@link DOCS_CONSULTANT_PROMPTS.noContext} takes no parameters. */
export function docsConsultantNoContextParams(): Record<string, string> {
  return {};
}

/**
 * Registry entries for the docs-consultant feature.
 *
 * Source of truth before migration: `src/lib/ai/aiService.ts:2898` (en) / `:2899` (vi) for the
 * system prompt, `:2903` (en) / `:2904` (vi) for the no-context fallback, and `:2966` for the
 * retrieved-documentation heading folded into the `system` entries.
 */
export const DOCS_CONSULTANT_TEMPLATES: PromptTemplateMap = {
  [`${DOCS_CONSULTANT_PROMPTS.system}.en`]: {
    role: 'system',
    locale: 'en',
    feature: 'docsConsultant',
    source: 'src/lib/ai/aiService.ts:2898',
    params: {
      context: { required: true },
    },
    text: `You are the SQL Visualizer documentation assistant. Answer only about the app's existing features using the retrieved documentation below. Treat the retrieved documentation as relevant and synthesize its direct answer. Answer in English, with at most three short sentences. Do not add unrelated features, generic database advice, alternatives, or follow-up questions.

Retrieved documentation:
{{context}}`,
  },

  [`${DOCS_CONSULTANT_PROMPTS.system}.vi`]: {
    role: 'system',
    locale: 'vi',
    feature: 'docsConsultant',
    source: 'src/lib/ai/aiService.ts:2899',
    params: {
      context: { required: true },
    },
    text: `Bạn là trợ lý tài liệu của SQL Visualizer. Chỉ trả lời về các tính năng hiện có của ứng dụng dựa vào tài liệu được truy xuất bên dưới. Hãy coi tài liệu được truy xuất là liên quan và diễn giải câu trả lời trực tiếp. Trả lời bằng tiếng Việt, tối đa ba câu ngắn. Không thêm tính năng không liên quan, lời khuyên cơ sở dữ liệu chung, phương án thay thế hoặc câu hỏi tiếp theo.

Retrieved documentation:
{{context}}`,
  },

  [`${DOCS_CONSULTANT_PROMPTS.noContext}.en`]: {
    role: 'system',
    locale: 'en',
    feature: 'docsConsultant',
    source: 'src/lib/ai/aiService.ts:2903',
    params: {},
    text: `The current SQL Visualizer documentation does not cover this.`,
  },

  [`${DOCS_CONSULTANT_PROMPTS.noContext}.vi`]: {
    role: 'system',
    locale: 'vi',
    feature: 'docsConsultant',
    source: 'src/lib/ai/aiService.ts:2904',
    params: {},
    text: `Tài liệu SQL Visualizer hiện tại chưa đề cập nội dung này.`,
  },
};
