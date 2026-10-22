/**
 * SQL-explainer prompt templates.
 *
 * Migrated by specs/020-prompt-manager-refactor T018 from `src/lib/ai/aiService.ts`
 * (`EXPLAIN_SQL_PROMPT:25`, `EXPLAIN_CTE_PROMPT:31`, `EXPLAIN_SQL_STRUCTURED_PROMPT:62`).
 * The wording is byte-identical to the pre-migration locale builders (FR-002/FR-004); nothing
 * here may be reworded without a new spec, because `tests/unit/promptParity.aiServiceCore.test.ts`
 * pins the exact bytes the provider must receive.
 *
 * Every source prompt branched per locale, so each purpose is registered as an `.en` / `.vi` pair
 * resolved through `localizedPromptId` (data-model.md → PromptTemplate.locale). The one conditional
 * source segment — the optional CTE upstream-context block — became the `dependenciesBlock`
 * parameter, whose builder lives here so all prompt wording stays under `prompts/templates/`
 * (SC-002) while `renderPrompt` remains the only place a prompt is assembled.
 */
import type { Locale } from '@/lib/i18n';
import type { PromptTemplateMap } from '../registry';

/** Registry ids for this feature. Prefer these over raw strings at call sites. */
export const SQL_EXPLAINER_PROMPTS = {
  explainSql: 'sqlExplainer.explainSql',
  explainCte: 'sqlExplainer.explainCte',
  explainSqlStructured: 'sqlExplainer.explainSqlStructured',
} as const;

/**
 * The optional upstream-context segment of {@link SQL_EXPLAINER_PROMPTS.explainCte}. Empty when
 * the caller has no dependency context, exactly as the pre-migration `dependencies ? ... : ''` did.
 */
export function explainCteDependenciesBlock(dependencies: string, locale: Locale = 'en'): string {
  if (!dependencies) return '';
  return locale === 'vi'
    ? `Các bước truy vấn đầu vào trực tiếp để tham chiếu:\n${dependencies}\n\n`
    : `Direct upstream query steps for context:\n${dependencies}\n\n`;
}

/** Parameters for {@link SQL_EXPLAINER_PROMPTS.explainSql}. */
export function explainSqlParams(sql: string): Record<string, string> {
  return { sql };
}

/** Parameters for {@link SQL_EXPLAINER_PROMPTS.explainCte}. */
export function explainCteParams(
  name: string,
  sql: string,
  dependencies: string,
  locale: Locale = 'en'
): Record<string, string> {
  return {
    name,
    sql,
    dependenciesBlock: explainCteDependenciesBlock(dependencies, locale),
  };
}

/** Parameters for {@link SQL_EXPLAINER_PROMPTS.explainSqlStructured}. */
export function explainSqlStructuredParams(sql: string): Record<string, string> {
  return { sql };
}

/**
 * Registry entries for the SQL-explainer feature.
 *
 * Source of truth before migration: `src/lib/ai/aiService.ts:25/31/62`. All three travel via
 * `generateWithAI({ prompt })`, which maps to `{ role: 'user' }` (`aiService.ts:191`).
 */
export const SQL_EXPLAINER_TEMPLATES: PromptTemplateMap = {
  [`${SQL_EXPLAINER_PROMPTS.explainSql}.en`]: {
    role: 'user',
    locale: 'en',
    feature: 'sqlExplainer',
    source: 'src/lib/ai/aiService.ts:25',
    params: {
      sql: { required: true },
    },
    text: `Explain the following SQL query in plain language:\n\n{{sql}}`,
  },

  [`${SQL_EXPLAINER_PROMPTS.explainSql}.vi`]: {
    role: 'user',
    locale: 'vi',
    feature: 'sqlExplainer',
    source: 'src/lib/ai/aiService.ts:25',
    params: {
      sql: { required: true },
    },
    text: `Hãy giải thích truy vấn SQL sau đây bằng ngôn ngữ đơn giản, dễ hiểu:\n\n{{sql}}`,
  },

  [`${SQL_EXPLAINER_PROMPTS.explainCte}.en`]: {
    role: 'user',
    locale: 'en',
    feature: 'sqlExplainer',
    source: 'src/lib/ai/aiService.ts:31',
    params: {
      name: { required: true },
      dependenciesBlock: { required: false, default: '' },
      sql: { required: true },
    },
    text: `Explain the SQL query step named '{{name}}' to a reader who does not write SQL. Reply with compact Markdown, never JSON. Use ### headings to separate short sections, **bold** only for essential conclusions, short - lists when helpful, and backticks around SQL keywords, table names, CTE names, and field names. Do not use links or HTML.

State its role in the overall data flow, what information it produces, and its important conditions or transformations. Explain SQL meaning, not execution performance. Do not invent business definitions that the SQL does not prove.

{{dependenciesBlock}}Target query step '{{name}}':
\`\`\`sql
{{sql}}
\`\`\``,
  },

  [`${SQL_EXPLAINER_PROMPTS.explainCte}.vi`]: {
    role: 'user',
    locale: 'vi',
    feature: 'sqlExplainer',
    source: 'src/lib/ai/aiService.ts:31',
    params: {
      name: { required: true },
      dependenciesBlock: { required: false, default: '' },
      sql: { required: true },
    },
    text: `Hãy giải thích bước truy vấn có tên '{{name}}' cho người không biết SQL. Trả lời bằng Markdown ngắn gọn, không trả JSON. Dùng tiêu đề ### để phân tách các phần ngắn, **in đậm** chỉ cho kết luận quan trọng, danh sách - ngắn khi phù hợp, và đặt từ khóa SQL, tên bảng, tên CTE và tên trường trong dấu backticks. Không dùng liên kết hoặc HTML.

Nêu rõ vai trò của bước này trong luồng dữ liệu, thông tin nó tạo ra, cùng các điều kiện hoặc phép biến đổi quan trọng. Giải thích ý nghĩa SQL, không phân tích hiệu năng thực thi. Không tự suy diễn ý nghĩa nghiệp vụ khi SQL không chứng minh được.

{{dependenciesBlock}}Bước truy vấn '{{name}}':
\`\`\`sql
{{sql}}
\`\`\``,
  },

  [`${SQL_EXPLAINER_PROMPTS.explainSqlStructured}.en`]: {
    role: 'user',
    locale: 'en',
    feature: 'sqlExplainer',
    source: 'src/lib/ai/aiService.ts:62',
    params: {
      sql: { required: true },
    },
    text: `You translate SQL into plain business language for a reader who does not write SQL. Keep it concise, business-focused, and free of SQL jargon.

SQL query:
\`\`\`sql
{{sql}}
\`\`\`

Reply with ONLY a JSON object — no prose, no markdown fence — using exactly these keys in this order:

{
  "query_objective": "a detailed plain-language explanation of the query's purpose, between 500 and 1,000 characters (up to 1,500 for a complex query)",
  "result_bullets": ["one plain-language bullet each for the returned columns and rows, plus sorting and row limits"],
  "report_grain": "one sentence stating what a single result row represents, e.g. 'one row per customer per month'",
  "filter_categories": [ { "category": "time range | status | region | other constraints", "items": ["one plain-language sentence per condition in this category"] } ],
  "data_sources": [ { "name": "table or CTE name the query reads", "purpose": "its business purpose as supported by the query, or the literal string 'unknown'" } ]
}

Rules:
- "query_objective" and "report_grain" must be non-empty; "report_grain" is always present.
- "result_bullets" must have at least one item.
- "filter_categories" must have at least one category; when the query has no filters, return a single category (e.g. category "other constraints") with one item stating that no filters apply — never omit this section.
- "data_sources" must have at least one entry; set "purpose" to the literal string "unknown" when the query does not support a business purpose.
- A CTE entry is its name plus a one-phrase role only; do NOT describe a CTE's inner query logic.
- Do NOT include join explanations, query execution logic, calculations, data lineage, or performance analysis.
- Avoid SQL keywords; describe meaning instead.
- Wrap every column or field name in single quotes (e.g. 'total_inbound_units') so it reads distinctly from the prose.
- The "query_objective" section alone must measure between 500 and 1,000 characters — up to 1,500 for a complex query; keep every other section concise.
- Do not invent business definitions the SQL or verified facts cannot support; state that a name or code's exact meaning is unknown when necessary.`,
  },

  [`${SQL_EXPLAINER_PROMPTS.explainSqlStructured}.vi`]: {
    role: 'user',
    locale: 'vi',
    feature: 'sqlExplainer',
    source: 'src/lib/ai/aiService.ts:62',
    params: {
      sql: { required: true },
    },
    text: `Bạn diễn giải SQL thành ngôn ngữ nghiệp vụ dễ hiểu cho người không viết SQL. Toàn bộ nội dung trả về phải bằng tiếng Việt. Hãy viết ngắn gọn, tập trung vào nghiệp vụ và tránh thuật ngữ SQL.

Truy vấn SQL:
\`\`\`sql
{{sql}}
\`\`\`

Chỉ trả về DUY NHẤT một đối tượng JSON — không thêm lời dẫn, không dùng khối markdown — theo đúng các khóa và thứ tự sau:

{
  "query_objective": "phần giải thích chi tiết bằng ngôn ngữ tự nhiên về mục đích của truy vấn, dài từ 500 đến 1.000 ký tự (tối đa 1.500 nếu truy vấn phức tạp)",
  "result_bullets": ["mỗi phần tử mô tả cột và dòng dữ liệu trả về, kèm cách sắp xếp và giới hạn số dòng"],
  "report_grain": "một câu nêu rõ một dòng kết quả đại diện cho điều gì, ví dụ 'một dòng cho mỗi khách hàng mỗi tháng'",
  "filter_categories": [ { "category": "khoảng thời gian | trạng thái | khu vực | ràng buộc khác", "items": ["mỗi phần tử là một câu mô tả một điều kiện trong nhóm này"] } ],
  "data_sources": [ { "name": "tên bảng hoặc CTE mà truy vấn đọc", "purpose": "vai trò nghiệp vụ được truy vấn chứng minh, hoặc chuỗi ký tự 'unknown'" } ]
}

Quy tắc:
- "query_objective" và "report_grain" không được rỗng; "report_grain" luôn phải có.
- "result_bullets" phải có ít nhất một phần tử.
- "filter_categories" phải có ít nhất một nhóm; khi truy vấn không có điều kiện lọc, trả về một nhóm (ví dụ category "ràng buộc khác") với một phần tử nói rõ không có điều kiện lọc — không được bỏ mục này.
- "data_sources" phải có ít nhất một mục; đặt "purpose" là chuỗi ký tự "unknown" khi truy vấn không chứng minh được vai trò nghiệp vụ.
- Một mục CTE chỉ gồm tên và vai trò một cụm từ; KHÔNG mô tả logic truy vấn bên trong CTE.
- KHÔNG nêu giải thích join, logic thực thi truy vấn, phép tính, nguồn gốc dữ liệu hay phân tích hiệu năng.
- Tránh từ khóa SQL; hãy diễn giải ý nghĩa.
- Đặt tên cột hoặc field trong dấu nháy đơn (ví dụ 'total_inbound_units') để phân biệt với phần mô tả xung quanh.
- Chỉ mục "query_objective" phải dài từ 500 đến 1.000 ký tự — tối đa 1.500 nếu truy vấn phức tạp; giữ các mục còn lại ngắn gọn.
- Không tự đặt nghĩa nghiệp vụ nếu SQL hoặc dữ kiện đã xác thực không chứng minh được; khi cần, nói rõ không xác định được ý nghĩa chính xác của tên hoặc mã.`,
  },
};
