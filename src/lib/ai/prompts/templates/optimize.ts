/**
 * SQL-optimization prompt templates.
 *
 * Migrated by specs/020-prompt-manager-refactor T019 from `src/lib/ai/aiService.ts`
 * (`OPTIMIZE_SQL_STRUCTURED_PROMPT:1764`). The wording is byte-identical to the pre-migration
 * locale builders (FR-002/FR-004); nothing here may be reworded without a new spec, because
 * `tests/unit/promptParity.aiServiceCore.test.ts` pins the exact bytes the provider must receive.
 *
 * The source branched per locale, so the prompt is registered as an `.en` / `.vi` pair resolved
 * through `localizedPromptId`. Its two conditional segments became parameters whose builders live
 * here, so all prompt wording stays under `prompts/templates/` (SC-002) while `renderPrompt`
 * remains the only place a prompt is assembled:
 * - `instructionBlock` — the optional restatement of the user's extra instruction and its
 *   apply/partial/refuse rules;
 * - `instructionKeys` — the two extra `instruction_status` / `instruction_note` keys appended to
 *   the JSON contract only when such an instruction exists.
 */
import type { Locale } from '@/lib/i18n';
import type { PromptTemplateMap } from '../registry';

/** Registry ids for this feature. Prefer these over raw strings at call sites. */
export const OPTIMIZE_PROMPTS = {
  optimizeSqlStructured: 'optimize.optimizeSqlStructured',
} as const;

/**
 * The optional user-instruction segment of {@link OPTIMIZE_PROMPTS.optimizeSqlStructured}. Empty
 * when none was supplied — including an empty string, exactly as the pre-migration
 * `userInstruction ? ... : ''`.
 */
export function optimizeInstructionBlock(
  userInstruction: string | undefined,
  locale: Locale = 'en'
): string {
  if (!userInstruction) return '';
  return locale === 'vi'
    ? `
Người dùng cũng đã yêu cầu thêm, bằng lời của họ: "${userInstruction}"
Chỉ áp dụng yêu cầu này trong phạm vi KHÔNG làm thay đổi những dòng, bảng, phép nối, điều kiện lọc hoặc cột đầu ra mà truy vấn trả về:
- Nếu có thể đáp ứng đầy đủ mà không đổi ngữ nghĩa kết quả, hãy áp dụng và đặt "instruction_status" là "applied".
- Nếu chỉ một phần có thể áp dụng mà không đổi ngữ nghĩa, chỉ áp dụng phần đó và đặt "instruction_status" là "partial", giải thích trong "instruction_note" phần nào đã bỏ qua và vì sao.
- Nếu áp dụng yêu cầu chắc chắn sẽ làm thay đổi ngữ nghĩa kết quả (ví dụ yêu cầu bỏ một điều kiện lọc, đổi loại JOIN làm thay đổi số dòng, hoặc bỏ một cột đầu ra), KHÔNG áp dụng phần đó — đặt "instruction_status" là "refused" và giải thích lý do trong "instruction_note", chỉ đề xuất không thay đổi (hoặc một phần an toàn) thay vào đó.
`
    : `
The user additionally asked, in their own words: "${userInstruction}"
Apply this instruction ONLY to the extent it does not change which rows, tables, joins, filters, or output columns the query returns:
- If it can be fully satisfied without changing result semantics, apply it and set "instruction_status" to "applied".
- If only part of it can be applied without changing semantics, apply that part only and set "instruction_status" to "partial", explaining in "instruction_note" what was left out and why.
- If applying it would necessarily change the query's result semantics (e.g. it asks to drop a filter, change a JOIN's row inclusion, or remove an output column), do NOT apply that part — set "instruction_status" to "refused" and explain why in "instruction_note", proposing no change (or only a safe subset) instead.
`;
}

/**
 * The optional `instruction_status` / `instruction_note` keys of the JSON contract in
 * {@link OPTIMIZE_PROMPTS.optimizeSqlStructured}. Empty when there is no user instruction, so the
 * schema stays byte-identical to the pre-migration prompt.
 */
export function optimizeInstructionKeys(
  userInstruction: string | undefined,
  locale: Locale = 'en'
): string {
  if (!userInstruction) return '';
  return locale === 'vi'
    ? `,
  "instruction_status": "\"applied\", \"partial\", hoặc \"refused\" — xem quy tắc ở trên",
  "instruction_note": "giải thích hiển thị cho người dùng khi instruction_status không phải \"applied\""`
    : `,
  "instruction_status": "\"applied\", \"partial\", or \"refused\" — see rules above",
  "instruction_note": "explanation shown to the user when instruction_status is not \"applied\""`;
}

/** Parameters for {@link OPTIMIZE_PROMPTS.optimizeSqlStructured}. */
export function optimizeSqlStructuredParams(
  sql: string,
  userInstruction?: string,
  locale: Locale = 'en'
): Record<string, string> {
  return {
    instructionBlock: optimizeInstructionBlock(userInstruction, locale),
    instructionKeys: optimizeInstructionKeys(userInstruction, locale),
    sql,
  };
}

/**
 * Registry entries for the optimize feature.
 *
 * Source of truth before migration: `src/lib/ai/aiService.ts:1764`. The prompt travels via
 * `generateWithAI({ prompt })` / `streamWithAI({ prompt })`, which map to `{ role: 'user' }`
 * (`aiService.ts:191`).
 */
export const OPTIMIZE_TEMPLATES: PromptTemplateMap = {
  [`${OPTIMIZE_PROMPTS.optimizeSqlStructured}.en`]: {
    role: 'user',
    locale: 'en',
    feature: 'optimize',
    source: 'src/lib/ai/aiService.ts:1764',
    params: {
      instructionBlock: { required: false, default: '' },
      instructionKeys: { required: false, default: '' },
      sql: { required: true },
    },
    text: `Optimize the following SQL query for performance. Fix ONLY the specific issues listed below the query under "Linting alerts" (if that section is present) — every other clause, alias, formatting choice, and ordering must stay character-for-character identical to the original. Do not perform a general rewrite.
{{instructionBlock}}
Return only a JSON object with exactly these keys, in this order:
{
  "analysis": "a short summary of what you changed and why, naming the specific issue(s) fixed",
  "suggestions": ["one specific improvement per issue actually fixed"],
  "proposals": [{"id": "unique-short-id", "location": "clause and affected expression", "issue": "specific anti-pattern", "reason": "why it is costly or risky", "recommendation": "what this targeted change does", "find": "exact unique SQL text from the original to replace", "replace": "replacement SQL text", "semantic_impact": "why rows, columns, joins and aggregates stay unchanged"}],
  "semantic_impact": "plain-language statement of why the approved local changes preserve rows, columns, aggregates and relationships"{{instructionKeys}}
}

SQL:
\`\`\`sql
{{sql}}
\`\`\`

Rules:
- If a "Linting alerts" section is provided above, only touch the clause(s) needed to resolve those specific alerts. Leave every unrelated part of the query untouched.
- If no linting alerts are provided, apply only the smallest set of high-confidence performance fixes and leave the rest of the query untouched.
- Do not change business logic or result semantics.
- Never delete, merge, or rewrite a table, JOIN, WHERE/HAVING condition, CASE branch, subquery, or CTE that is not the specific target of a listed issue — this holds even when a bigger rewrite would look "cleaner". A correct fix for one flagged issue is almost always a small, local edit, not a rewrite of large parts of the query.
- Do not remove or add tables, columns, joins, filters, or grouping unless the same result set is preserved.
- Do not change NULL handling or DISTINCT semantics.
- Do not reformat, rename aliases, or reorder clauses that are not part of a fix.
- Each proposal must contain one exact, unique \`find\` snippet from the original and one narrow \`replace\` snippet. Never propose a full-query replacement.
- Before returning a proposal, verify it preserves every table, join relationship, filter condition, output column, NULL rule and DISTINCT/GROUP BY behavior. If this cannot be proven from the query, do not propose the change; explain the uncertainty in "analysis".
- If the query has no fixable issues, return an empty "proposals" array and explain why in "analysis".`,
  },

  [`${OPTIMIZE_PROMPTS.optimizeSqlStructured}.vi`]: {
    role: 'user',
    locale: 'vi',
    feature: 'optimize',
    source: 'src/lib/ai/aiService.ts:1764',
    params: {
      instructionBlock: { required: false, default: '' },
      instructionKeys: { required: false, default: '' },
      sql: { required: true },
    },
    text: `Tối ưu hóa truy vấn SQL sau đây về hiệu suất. CHỈ sửa những vấn đề cụ thể được liệt kê bên dưới truy vấn trong phần "Linting alerts" (nếu có) — mọi mệnh đề, bí danh, cách định dạng và thứ tự khác phải giữ nguyên tuyệt đối so với bản gốc. Không viết lại toàn bộ.
{{instructionBlock}}
Chỉ trả về một đối tượng JSON với đúng các khóa sau, theo đúng thứ tự này:
{
  "analysis": "tóm tắt ngắn gọn những gì bạn đã thay đổi và lý do, nêu rõ (các) vấn đề đã sửa",
  "suggestions": ["mỗi cải tiến cụ thể tương ứng với từng vấn đề đã thực sự được sửa"],
  "proposals": [{"id": "ma-dinh-danh-ngan", "location": "mệnh đề và biểu thức bị ảnh hưởng", "issue": "anti-pattern cụ thể", "reason": "vì sao gây tốn chi phí hoặc rủi ro", "recommendation": "thay đổi cục bộ này thực hiện gì", "find": "đoạn SQL duy nhất, chính xác trong bản gốc cần thay", "replace": "đoạn SQL thay thế", "semantic_impact": "vì sao số dòng, cột, JOIN và aggregate không thay đổi"}],
  "semantic_impact": "giải thích vì sao các thay đổi cục bộ đã duyệt vẫn giữ nguyên số dòng, cột, aggregate và quan hệ"{{instructionKeys}}
}

SQL:
\`\`\`sql
{{sql}}
\`\`\`

Quy tắc:
- Nếu có phần "Linting alerts" ở trên, chỉ chạm vào (các) mệnh đề cần thiết để khắc phục những cảnh báo đó. Giữ nguyên mọi phần không liên quan.
- Nếu không có cảnh báo linting nào được cung cấp, chỉ áp dụng tập hợp nhỏ nhất các cải tiến hiệu suất đáng tin cậy và giữ nguyên phần còn lại.
- Không thay đổi logic nghiệp vụ hoặc ngữ nghĩa kết quả.
- Tuyệt đối không xóa, gộp hay viết lại bất kỳ bảng, JOIN, điều kiện WHERE/HAVING, nhánh CASE, subquery hay CTE nào không phải là mục tiêu cụ thể của một vấn đề đã liệt kê — kể cả khi một bản viết lại lớn hơn trông "gọn gàng" hơn. Cách sửa đúng cho một vấn đề được gắn cờ gần như luôn là một chỉnh sửa nhỏ, cục bộ, không phải viết lại phần lớn truy vấn.
- Không loại bỏ hoặc thêm bảng, cột, phép nối, bộ lọc hoặc nhóm trừ khi vẫn giữ nguyên tập kết quả.
- Không thay đổi cách xử lý NULL hoặc ngữ nghĩa DISTINCT.
- Không định dạng lại, đổi tên bí danh, hay sắp xếp lại các mệnh đề không thuộc phần cần sửa.
- Mỗi proposal phải có đúng một đoạn \`find\` duy nhất, chính xác từ SQL gốc và một đoạn \`replace\` cục bộ. Tuyệt đối không đề xuất thay toàn bộ truy vấn.
- Trước khi trả proposal, hãy xác minh nó giữ nguyên mọi bảng, quan hệ JOIN, điều kiện lọc, cột đầu ra, quy tắc NULL và DISTINCT/GROUP BY. Nếu không thể chứng minh từ truy vấn, không đề xuất thay đổi đó; hãy nêu sự không chắc chắn trong "analysis".
- Nếu truy vấn không có vấn đề nào cần sửa, trả về mảng "proposals" rỗng và giải thích lý do trong "analysis".`,
  },
};
