/**
 * Requirement-candidate prompt templates.
 *
 * Migrated by specs/020-prompt-manager-refactor from `REQUIREMENT_CANDIDATE_PROMPT` in
 * `src/lib/ai/aiService.ts`. The wording is byte-identical to the pre-migration builders
 * (FR-002/FR-004); nothing here may be reworded without a new spec, because
 * `tests/unit/promptParity.aiServiceFlow.test.ts` pins the exact bytes a provider must receive.
 *
 * The source branched per locale, so the purpose is registered as an `.en` / `.vi` pair
 * (data-model.md -> PromptTemplate.locale) and call sites resolve it via `localizedPromptId`,
 * which reproduces the pre-migration `PROMPT[locale] ?? PROMPT.en` lookup exactly.
 *
 * Deliberately NOT part of this template: `prepareRequirementCandidatePrompt` prefixes the
 * fitted semantic brief onto the rendered prompt (aiService.ts:2497-2499). That prefix is
 * call-site composition of a DIFFERENT feature's prompt (`semanticBrief`), not wording of this
 * one, so it stays outside the registry entry and this template's rendered bytes ignore it.
 */
import type { Locale } from '@/lib/i18n';
import type { PromptTemplateMap } from '../registry';

/** Registry ids for this feature. Prefer these over raw strings at call sites. */
export const REQUIREMENT_PROMPTS = {
  candidate: 'requirement.candidate',
} as const;

/**
 * Parameters for {@link REQUIREMENT_PROMPTS.candidate}.
 *
 * `hintedTables` carries the whole conditional sentence the source emitted only when the user
 * named tables/columns. The falsy branch stays an empty string so the source's blank line is
 * preserved byte-for-byte (FR-003). That sentence is itself locale-variant in the source, so
 * `locale` MUST be the same value passed to `localizedPromptId` at the call site.
 */
export function requirementCandidateParams(
  sql: string,
  requirementText: string,
  hintedTables: string[],
  locale: Locale = 'en'
): Record<string, string> {
  return {
    sql,
    requirementText,
    hintedTables: !hintedTables.length
      ? ''
      : locale === 'vi'
        ? `Người dùng đã nêu rõ các bảng/cột sau cần xem xét: ${hintedTables.join(', ')}.`
        : `The user specifically named these tables/columns to consider: ${hintedTables.join(', ')}.`,
  };
}

/**
 * Registry entries for the requirement feature.
 *
 * Source of truth before migration: `src/lib/ai/aiService.ts:2422` (en) / `:2448` (vi).
 * Role is `user`: the call site sends the rendered text as `AIGenerateRequest.prompt`, which
 * `resolveMessages` (aiService.ts:191) turns into a single `user` message.
 */
export const REQUIREMENT_TEMPLATES: PromptTemplateMap = {
  [`${REQUIREMENT_PROMPTS.candidate}.en`]: {
    role: 'user',
    locale: 'en',
    feature: 'requirement',
    source: 'src/lib/ai/aiService.ts:2422',
    params: {
      sql: { required: true },
      requirementText: { required: true },
      hintedTables: { required: false, default: '' },
    },
    text: `The user wants to add a new requirement to the following SQL query. Unlike a normal optimization pass, you MAY change which tables, joins, filters, or output columns the query uses if that is what the requirement needs — but only to satisfy the stated requirement, nothing else.

SQL:
\`\`\`sql
{{sql}}
\`\`\`

Requirement, in the user's own words: "{{requirementText}}"
{{hintedTables}}

Reply with ONLY a JSON object — no prose, no markdown fence — using exactly this shape:
{
  "optimized_sql": "the full candidate query that satisfies the requirement",
  "analysis": "plain-language explanation of what was added or changed and why, compared to the original query",
  "unresolved_references": ["any table or column name from the requirement that you could not find evidence for in the SQL or the verified facts above, and therefore did not use"]
}

Rules:
- Only change what is needed to satisfy the stated requirement. Do not perform an unrelated general rewrite.
- Never invent a table or column name that does not appear in the SQL, the verified facts above, or the user's own hinted names — if you cannot resolve a needed reference, list it in "unresolved_references" and do not use it in "optimized_sql".
- If the requirement cannot be satisfied at all without an unresolvable reference, return the original query unchanged in "optimized_sql" and explain why in "analysis".
- "analysis" must clearly state which tables, joins, filters, or output columns were added, removed, or changed.`,
  },

  [`${REQUIREMENT_PROMPTS.candidate}.vi`]: {
    role: 'user',
    locale: 'vi',
    feature: 'requirement',
    source: 'src/lib/ai/aiService.ts:2448',
    params: {
      sql: { required: true },
      requirementText: { required: true },
      hintedTables: { required: false, default: '' },
    },
    text: `Người dùng muốn thêm một yêu cầu mới vào truy vấn SQL sau đây. Khác với một lượt tối ưu hóa thông thường, bạn ĐƯỢC PHÉP thay đổi bảng, phép nối, điều kiện lọc hoặc cột đầu ra của truy vấn nếu yêu cầu cần như vậy — nhưng chỉ để đáp ứng đúng yêu cầu đã nêu, không hơn.

SQL:
\`\`\`sql
{{sql}}
\`\`\`

Yêu cầu, theo lời của người dùng: "{{requirementText}}"
{{hintedTables}}

Chỉ trả về DUY NHẤT một đối tượng JSON — không thêm lời dẫn, không dùng khối markdown — theo đúng cấu trúc sau:
{
  "optimized_sql": "toàn bộ truy vấn mẫu đáp ứng yêu cầu",
  "analysis": "giải thích bằng ngôn ngữ dễ hiểu về những gì đã được thêm hoặc thay đổi và vì sao, so với truy vấn gốc",
  "unresolved_references": ["tên bảng hoặc cột trong yêu cầu mà bạn không tìm thấy bằng chứng trong SQL hoặc các dữ kiện đã xác thực ở trên, và do đó không sử dụng"]
}

Quy tắc:
- Chỉ thay đổi những gì cần thiết để đáp ứng yêu cầu đã nêu. Không viết lại toàn bộ một cách không liên quan.
- Tuyệt đối không tự đặt ra tên bảng hoặc cột không xuất hiện trong SQL, trong các dữ kiện đã xác thực ở trên, hoặc trong tên người dùng đã nêu — nếu không thể xác định một tham chiếu cần thiết, hãy liệt kê nó trong "unresolved_references" và không sử dụng nó trong "optimized_sql".
- Nếu yêu cầu hoàn toàn không thể đáp ứng được vì thiếu tham chiếu không xác định, hãy trả về truy vấn gốc không đổi trong "optimized_sql" và giải thích lý do trong "analysis".
- "analysis" phải nêu rõ những bảng, phép nối, điều kiện lọc hoặc cột đầu ra nào đã được thêm, loại bỏ hoặc thay đổi.`,
  },
};
