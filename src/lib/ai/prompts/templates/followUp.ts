/**
 * Follow-up conversation prompt templates.
 *
 * Migrated by specs/020-prompt-manager-refactor from `FOLLOW_UP_SYSTEM_PROMPT` in
 * `src/lib/ai/aiService.ts`. The wording is byte-identical to the pre-migration constant
 * (FR-002/FR-004); nothing here may be reworded without a new spec, because
 * `tests/unit/promptParity.aiServiceFlow.test.ts` pins the exact bytes a provider must receive.
 *
 * The source branched per locale, so the purpose is registered as an `.en` / `.vi` pair
 * (data-model.md -> PromptTemplate.locale) and call sites resolve it via `localizedPromptId`,
 * which reproduces the pre-migration `PROMPT[locale] ?? PROMPT.en` lookup exactly.
 *
 * Role is `system`: `askFollowUp` puts this text in `{ role: 'system', content: systemPrompt }`
 * (aiService.ts:2838 + 2870). Its pre-migration composition was a bare template-literal wrap
 * (`\`${FOLLOW_UP_SYSTEM_PROMPT[locale] ?? FOLLOW_UP_SYSTEM_PROMPT.en}\``), which yields exactly
 * the constant's own bytes — so this entry has no parameters and needs no builder.
 *
 * Deliberately NOT part of this template: the SQL anchor turn (`This conversation is about the
 * following SQL query.` + fenced SQL + fitted brief, aiService.ts:2851-2862) and the scripted
 * assistant acknowledgement (aiService.ts:2872). Those are separate message-assembly texts
 * outside this task's scope, not wording of the follow-up system prompt.
 */
import type { PromptTemplateMap } from '../registry';

/** Registry ids for this feature. Prefer these over raw strings at call sites. */
export const FOLLOW_UP_PROMPTS = {
  system: 'followUp.system',
} as const;

/**
 * Registry entries for the follow-up feature.
 *
 * Source of truth before migration: `src/lib/ai/aiService.ts:2801` (en) / `:2802` (vi).
 */
export const FOLLOW_UP_TEMPLATES: PromptTemplateMap = {
  [`${FOLLOW_UP_PROMPTS.system}.en`]: {
    role: 'system',
    locale: 'en',
    feature: 'followUp',
    source: 'src/lib/ai/aiService.ts:2801',
    params: {},
    text: `You are a SQL expert answering any question about one specific query. Explain the query’s intent, fields, expressions, filters, joins, returned data, and likely business impact in plain language suitable for non-technical staff. Stay grounded in the SQL and verified parser facts. Clearly distinguish what the query proves from a reasonable inference, and say when an exact business definition or answer is not present. Give detail when the question calls for it; otherwise be concise.`,
  },

  [`${FOLLOW_UP_PROMPTS.system}.vi`]: {
    role: 'system',
    locale: 'vi',
    feature: 'followUp',
    source: 'src/lib/ai/aiService.ts:2802',
    params: {},
    text: `Bạn là chuyên gia SQL đang trả lời mọi câu hỏi về một truy vấn cụ thể. Hãy giải thích mục đích, field, biểu thức, điều kiện, phép nối, dữ liệu trả về và tác động nghiệp vụ có thể suy ra từ truy vấn bằng tiếng Việt dễ hiểu cho cả người không chuyên. Chỉ dựa trên SQL và các dữ kiện đã được parser xác thực. Phân biệt rõ điều truy vấn chứng minh được với suy luận hợp lý, và nói rõ khi truy vấn không có định nghĩa nghiệp vụ hoặc câu trả lời chính xác. Trả lời chi tiết khi câu hỏi cần; các trường hợp khác giữ ngắn gọn.`,
  },
};
