/**
 * Semantic-brief prompt templates.
 *
 * Migrated by specs/020-prompt-manager-refactor T019 from `src/lib/ai/aiService.ts`
 * (`SEMANTIC_BRIEF_PROMPT:1565`). The wording is byte-identical to the pre-migration locale
 * builders (FR-002/FR-004); nothing here may be reworded without a new spec, because
 * `tests/unit/promptParity.aiServiceCore.test.ts` pins the exact bytes the provider must receive.
 *
 * The source branched per locale, so the prompt is registered as an `.en` / `.vi` pair resolved
 * through `localizedPromptId`. Its one conditional segment — the optional read-only restatement
 * of the user's optimization goal — became the `instructionBlock` parameter, whose builder lives
 * here so all prompt wording stays under `prompts/templates/` (SC-002) while `renderPrompt`
 * remains the only place a prompt is assembled.
 */
import type { Locale } from '@/lib/i18n';
import type { PromptTemplateMap } from '../registry';

/** Registry ids for this feature. Prefer these over raw strings at call sites. */
export const SEMANTIC_BRIEF_PROMPTS = {
  brief: 'semanticBrief.brief',
} as const;

/**
 * The optional user-goal segment of {@link SEMANTIC_BRIEF_PROMPTS.brief}. Empty when no goal was
 * supplied — including an empty string, exactly as the pre-migration `userInstruction ? ... : ''`.
 */
export function semanticBriefInstructionBlock(
  userInstruction: string | undefined,
  locale: Locale = 'en'
): string {
  if (!userInstruction) return '';
  return locale === 'vi'
    ? `
Người dùng đã nêu mục tiêu tối ưu hóa sau, bằng lời của họ: "${userInstruction}"
Hãy ghi nhớ mục tiêu này khi mô tả truy vấn, nhưng chưa hành động theo nó — bước này chỉ để hiểu, không thay đổi gì.
`
    : `
The user has asked for this optimization goal, in their own words: "${userInstruction}"
Keep this goal in mind while describing the query, but do not act on it yet — this step is read-only.
`;
}

/** Parameters for {@link SEMANTIC_BRIEF_PROMPTS.brief}. */
export function semanticBriefParams(
  sql: string,
  userInstruction?: string,
  locale: Locale = 'en'
): Record<string, string> {
  return {
    sql,
    instructionBlock: semanticBriefInstructionBlock(userInstruction, locale),
  };
}

/**
 * Registry entries for the semantic-brief feature.
 *
 * Source of truth before migration: `src/lib/ai/aiService.ts:1565`. The prompt travels via
 * `generateWithAI({ prompt })`, which maps to `{ role: 'user' }` (`aiService.ts:191`).
 */
export const SEMANTIC_BRIEF_TEMPLATES: PromptTemplateMap = {
  [`${SEMANTIC_BRIEF_PROMPTS.brief}.en`]: {
    role: 'user',
    locale: 'en',
    feature: 'semanticBrief',
    source: 'src/lib/ai/aiService.ts:1565',
    params: {
      sql: { required: true },
      instructionBlock: { required: false, default: '' },
    },
    text: `Before any optimization, read the following SQL query and describe your understanding of it. Do not suggest or perform any changes here.

SQL:
\`\`\`sql
{{sql}}
\`\`\`
{{instructionBlock}}
Return only a JSON object with exactly these keys:
{
  "purpose": "Clearly and specifically explain what business purpose this query serves and what outcome it is intended to provide.",
  "relationships": [{"tables": "the two tables/CTEs involved", "description": "what this join/relationship means and why it must be preserved"}],
  "critical_filters": ["every WHERE/HAVING condition, in plain language, that determines which rows are included or excluded"],
  "risks": ["specific ways a careless rewrite of this query could silently change its result set or business meaning"]
}

Rules:
- List every JOIN and every CTE-to-CTE dependency as a relationship, even ones that look removable.
- Do not omit a filter just because it looks redundant — state what it does.
- This is a read-only understanding step; "relationships" and "critical_filters" become the constraints a later optimization step must not violate.`,
  },

  [`${SEMANTIC_BRIEF_PROMPTS.brief}.vi`]: {
    role: 'user',
    locale: 'vi',
    feature: 'semanticBrief',
    source: 'src/lib/ai/aiService.ts:1565',
    params: {
      sql: { required: true },
      instructionBlock: { required: false, default: '' },
    },
    text: `Trước khi tối ưu hóa, hãy đọc truy vấn SQL sau và mô tả hiểu biết của bạn về nó. Không đề xuất hay thực hiện bất kỳ thay đổi nào ở bước này.

SQL:
\`\`\`sql
{{sql}}
\`\`\`
{{instructionBlock}}
Chỉ trả về một đối tượng JSON với đúng các khóa sau:
{
  "purpose": "Hãy giải thích chi tiết và cụ thể về mục đích kinh doanh của truy vấn này và kết quả mà nó hướng tới.",
  "relationships": [{"tables": "hai bảng/CTE liên quan", "description": "quan hệ JOIN này có ý nghĩa gì và vì sao phải giữ nguyên"}],
  "critical_filters": ["mọi điều kiện WHERE/HAVING, bằng ngôn ngữ dễ hiểu, quyết định dòng nào được giữ hoặc loại"],
  "risks": ["những cách cụ thể mà một bản viết lại bất cẩn có thể âm thầm thay đổi tập kết quả hoặc ý nghĩa nghiệp vụ"]
}

Quy tắc:
- Liệt kê mọi JOIN và mọi quan hệ phụ thuộc CTE-CTE như một relationship, kể cả những quan hệ trông như có thể loại bỏ.
- Không bỏ qua điều kiện lọc nào dù trông thừa — hãy nêu rõ nó làm gì.
- Đây là bước hiểu chỉ đọc; "relationships" và "critical_filters" sẽ trở thành ràng buộc mà bước tối ưu sau này không được vi phạm.`,
  },
};
