/**
 * Proposal-repair prompt templates.
 *
 * Migrated by specs/020-prompt-manager-refactor from `REPAIR_PROPOSALS_PROMPT` in
 * `src/lib/ai/aiService.ts`. The wording is byte-identical to the pre-migration builders
 * (FR-002/FR-004); nothing here may be reworded without a new spec, because
 * `tests/unit/promptParity.aiServiceFlow.test.ts` pins the exact bytes a provider must receive.
 *
 * The source branched per locale, so the purpose is registered as an `.en` / `.vi` pair
 * (data-model.md -> PromptTemplate.locale) and call sites resolve it via `localizedPromptId`,
 * which reproduces the pre-migration `PROMPT[locale] ?? PROMPT.en` lookup exactly.
 *
 * `repairInvalidProposals` (aiService.ts:2743-2750) renders this template with the budget-fitted
 * SQL and the already-computed invalid-proposal list; it adds no prefix or suffix of its own, so
 * the rendered content IS the whole prompt for that call.
 */
import type { Locale } from '@/lib/i18n';
import type { PromptTemplateMap } from '../registry';

/** Registry ids for this feature. Prefer these over raw strings at call sites. */
export const REPAIR_PROMPTS = {
  proposals: 'repair.proposals',
} as const;

/** One proposal the repair pass must re-derive — the exact shape the source builder took. */
export interface RepairProposalRef {
  issue: string;
  find: string;
  occurrences: number;
}

/**
 * Parameters for {@link REPAIR_PROMPTS.proposals}.
 *
 * `proposals` carries the whole numbered list the source built with `.map(...).join('\n')`,
 * including its `JSON.stringify` quoting of the previous `find` text and its per-locale
 * `(none)` / `(không có)` fallback. `locale` MUST be the same value passed to
 * `localizedPromptId` at the call site, because the list wording is locale-variant in the source.
 */
export function repairProposalsParams(
  sql: string,
  invalid: RepairProposalRef[],
  locale: Locale = 'en'
): Record<string, string> {
  return {
    sql,
    proposals: invalid
      .map((p, i) =>
        locale === 'vi'
          ? `${i + 1}. issue: ${p.issue || '(không có)'} | find cũ (occurrences=${p.occurrences}): ${JSON.stringify(p.find)}`
          : `${i + 1}. issue: ${p.issue || '(none)'} | previous find (occurrences=${p.occurrences}): ${JSON.stringify(p.find)}`
      )
      .join('\n'),
  };
}

/**
 * Registry entries for the repair feature.
 *
 * Source of truth before migration: `src/lib/ai/aiService.ts:2661` (en) / `:2681` (vi).
 * Role is `user`: the call site streams the rendered text as `AIGenerateRequest.prompt`, which
 * `resolveMessages` (aiService.ts:191) turns into a single `user` message.
 */
export const REPAIR_TEMPLATES: PromptTemplateMap = {
  [`${REPAIR_PROMPTS.proposals}.en`]: {
    role: 'user',
    locale: 'en',
    feature: 'repair',
    source: 'src/lib/ai/aiService.ts:2661',
    params: {
      sql: { required: true },
      proposals: { required: true },
    },
    text: `You previously proposed targeted SQL edits for the query below, but some of them cannot be applied because their "find" text does not match the ORIGINAL query exactly once (occurrences=0 means it was not found at all; occurrences>1 means it matched more than once and is ambiguous — a repeated expression like an aggregate reused in HAVING/ORDER BY is a common cause).

Re-emit ONLY the proposals listed below, corrected. Keep each one's original intent (the same issue/fix) — only correct "find"/"replace" so that:
- "find" is copied character-for-character from the SQL below (same whitespace, casing, line breaks).
- "find" occurs in the SQL EXACTLY ONCE. If the expression repeats, widen "find" to include enough surrounding text (a neighboring keyword, clause, alias, or operand) to make it unique.
- If a proposal genuinely cannot be made both valid and unique from this exact SQL, omit it from the output array entirely rather than guessing.

Original SQL:
\`\`\`sql
{{sql}}
\`\`\`

Proposals to correct:
{{proposals}}

Return only a JSON object with exactly this key:
{"proposals": [{"id": "short id", "location": "clause and affected expression", "issue": "specific anti-pattern", "reason": "why it is costly or risky", "recommendation": "what this targeted change does", "find": "exact unique SQL text from the original", "replace": "replacement SQL text", "semantic_impact": "why rows, columns, joins and aggregates stay unchanged"}]}`,
  },

  [`${REPAIR_PROMPTS.proposals}.vi`]: {
    role: 'user',
    locale: 'vi',
    feature: 'repair',
    source: 'src/lib/ai/aiService.ts:2681',
    params: {
      sql: { required: true },
      proposals: { required: true },
    },
    text: `Bạn đã đề xuất các thay đổi SQL cục bộ cho truy vấn bên dưới, nhưng một số đề xuất không thể áp dụng vì đoạn "find" không khớp CHÍNH XÁC MỘT LẦN với truy vấn GỐC (occurrences=0 nghĩa là không tìm thấy; occurrences>1 nghĩa là khớp nhiều lần nên không rõ ràng — nguyên nhân thường gặp là một biểu thức lặp lại, ví dụ hàm aggregate được dùng lại ở HAVING/ORDER BY).

Chỉ trả lại các đề xuất được liệt kê bên dưới, đã sửa. Giữ nguyên mục đích ban đầu của từng đề xuất (cùng vấn đề/cách sửa) — chỉ sửa "find"/"replace" sao cho:
- "find" được copy nguyên văn từng ký tự từ SQL bên dưới (giữ nguyên khoảng trắng, chữ hoa/thường, xuống dòng).
- "find" xuất hiện trong SQL ĐÚNG MỘT LẦN. Nếu biểu thức bị lặp lại, hãy mở rộng "find" để bao gồm đủ ngữ cảnh xung quanh (từ khóa lân cận, mệnh đề, alias, hoặc toán hạng) để nó trở nên duy nhất.
- Nếu một đề xuất thực sự không thể vừa hợp lệ vừa duy nhất từ SQL này, hãy bỏ hẳn nó khỏi mảng kết quả thay vì đoán bừa.

SQL gốc:
\`\`\`sql
{{sql}}
\`\`\`

Các đề xuất cần sửa:
{{proposals}}

Chỉ trả về một đối tượng JSON với đúng khóa sau:
{"proposals": [{"id": "id ngắn", "location": "mệnh đề và biểu thức bị ảnh hưởng", "issue": "anti-pattern cụ thể", "reason": "vì sao gây tốn chi phí hoặc rủi ro", "recommendation": "thay đổi cục bộ này thực hiện gì", "find": "đoạn SQL chính xác và duy nhất từ bản gốc", "replace": "đoạn SQL thay thế", "semantic_impact": "vì sao số dòng, cột, join và aggregate không thay đổi"}]}`,
  },
};
