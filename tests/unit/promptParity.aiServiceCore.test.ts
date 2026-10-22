import { describe, expect, it } from 'vitest';
import type { Locale } from '@/lib/i18n';
import { localizedPromptId, renderPrompt } from '@/lib/ai/prompts/render';
import { PROMPT_REGISTRY } from '@/lib/ai/prompts/registry';
import {
  SQL_EXPLAINER_PROMPTS,
  explainCteParams,
  explainSqlParams,
  explainSqlStructuredParams,
} from '@/lib/ai/prompts/templates/sqlExplainer';
import {
  SEMANTIC_BRIEF_PROMPTS,
  semanticBriefParams,
} from '@/lib/ai/prompts/templates/semanticBrief';
import {
  OPTIMIZE_PROMPTS,
  optimizeSqlStructuredParams,
} from '@/lib/ai/prompts/templates/optimize';

/**
 * Byte-parity gate for the aiService prompt core migrated by specs/020-prompt-manager-refactor
 * (T018 sqlExplainer, T019 semanticBrief + optimize).
 *
 * The `OLD_*` constants below are VERBATIM copies of the pre-migration locale template literals
 * from `src/lib/ai/aiService.ts` (`EXPLAIN_SQL_PROMPT:25`, `EXPLAIN_CTE_PROMPT:31`,
 * `EXPLAIN_SQL_STRUCTURED_PROMPT:62`, `SEMANTIC_BRIEF_PROMPT:1565`,
 * `OPTIMIZE_SQL_STRUCTURED_PROMPT:1764`). They are the characterization baseline: the registry
 * templates must render byte-identical content for every locale and every conditional branch
 * (FR-002/FR-003/FR-004, SC-001). Do not reword either side — an intended wording change is a
 * new spec, not an edit here.
 */
const OLD_EXPLAIN_SQL_PROMPT: Record<Locale, (sql: string) => string> = {
  en: (sql) => `Explain the following SQL query in plain language:\n\n${sql}`,
  vi: (sql) => `Hãy giải thích truy vấn SQL sau đây bằng ngôn ngữ đơn giản, dễ hiểu:\n\n${sql}`,
};

const OLD_EXPLAIN_CTE_PROMPT: Record<Locale, (name: string, sql: string, dependencies: string) => string> = {
  en: (
    name,
    sql,
    dependencies
  ) => `Explain the SQL query step named '${name}' to a reader who does not write SQL. Reply with compact Markdown, never JSON. Use ### headings to separate short sections, **bold** only for essential conclusions, short - lists when helpful, and backticks around SQL keywords, table names, CTE names, and field names. Do not use links or HTML.

State its role in the overall data flow, what information it produces, and its important conditions or transformations. Explain SQL meaning, not execution performance. Do not invent business definitions that the SQL does not prove.

${dependencies ? `Direct upstream query steps for context:\n${dependencies}\n\n` : ''}Target query step '${name}':
\`\`\`sql
${sql}
\`\`\``,
  vi: (
    name,
    sql,
    dependencies
  ) => `Hãy giải thích bước truy vấn có tên '${name}' cho người không biết SQL. Trả lời bằng Markdown ngắn gọn, không trả JSON. Dùng tiêu đề ### để phân tách các phần ngắn, **in đậm** chỉ cho kết luận quan trọng, danh sách - ngắn khi phù hợp, và đặt từ khóa SQL, tên bảng, tên CTE và tên trường trong dấu backticks. Không dùng liên kết hoặc HTML.

Nêu rõ vai trò của bước này trong luồng dữ liệu, thông tin nó tạo ra, cùng các điều kiện hoặc phép biến đổi quan trọng. Giải thích ý nghĩa SQL, không phân tích hiệu năng thực thi. Không tự suy diễn ý nghĩa nghiệp vụ khi SQL không chứng minh được.

${dependencies ? `Các bước truy vấn đầu vào trực tiếp để tham chiếu:\n${dependencies}\n\n` : ''}Bước truy vấn '${name}':
\`\`\`sql
${sql}
\`\`\``,
};

const OLD_EXPLAIN_SQL_STRUCTURED_PROMPT: Record<Locale, (sql: string) => string> = {
  en: (
    sql
  ) => `You translate SQL into plain business language for a reader who does not write SQL. Keep it concise, business-focused, and free of SQL jargon.

SQL query:
\`\`\`sql
${sql}
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
  vi: (
    sql
  ) => `Bạn diễn giải SQL thành ngôn ngữ nghiệp vụ dễ hiểu cho người không viết SQL. Toàn bộ nội dung trả về phải bằng tiếng Việt. Hãy viết ngắn gọn, tập trung vào nghiệp vụ và tránh thuật ngữ SQL.

Truy vấn SQL:
\`\`\`sql
${sql}
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
};

const OLD_SEMANTIC_BRIEF_PROMPT: Record<Locale, (sql: string, userInstruction?: string) => string> = {
  en: (
    sql,
    userInstruction
  ) => `Before any optimization, read the following SQL query and describe your understanding of it. Do not suggest or perform any changes here.

SQL:
\`\`\`sql
${sql}
\`\`\`
${
  userInstruction
    ? `
The user has asked for this optimization goal, in their own words: "${userInstruction}"
Keep this goal in mind while describing the query, but do not act on it yet — this step is read-only.
`
    : ''
}
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
  vi: (
    sql,
    userInstruction
  ) => `Trước khi tối ưu hóa, hãy đọc truy vấn SQL sau và mô tả hiểu biết của bạn về nó. Không đề xuất hay thực hiện bất kỳ thay đổi nào ở bước này.

SQL:
\`\`\`sql
${sql}
\`\`\`
${
  userInstruction
    ? `
Người dùng đã nêu mục tiêu tối ưu hóa sau, bằng lời của họ: "${userInstruction}"
Hãy ghi nhớ mục tiêu này khi mô tả truy vấn, nhưng chưa hành động theo nó — bước này chỉ để hiểu, không thay đổi gì.
`
    : ''
}
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
};

const OLD_OPTIMIZE_SQL_STRUCTURED_PROMPT: Record<Locale, (sql: string, userInstruction?: string) => string> = {
  en: (
    sql,
    userInstruction
  ) => `Optimize the following SQL query for performance. Fix ONLY the specific issues listed below the query under "Linting alerts" (if that section is present) — every other clause, alias, formatting choice, and ordering must stay character-for-character identical to the original. Do not perform a general rewrite.
${
  userInstruction
    ? `
The user additionally asked, in their own words: "${userInstruction}"
Apply this instruction ONLY to the extent it does not change which rows, tables, joins, filters, or output columns the query returns:
- If it can be fully satisfied without changing result semantics, apply it and set "instruction_status" to "applied".
- If only part of it can be applied without changing semantics, apply that part only and set "instruction_status" to "partial", explaining in "instruction_note" what was left out and why.
- If applying it would necessarily change the query's result semantics (e.g. it asks to drop a filter, change a JOIN's row inclusion, or remove an output column), do NOT apply that part — set "instruction_status" to "refused" and explain why in "instruction_note", proposing no change (or only a safe subset) instead.
`
    : ''
}
Return only a JSON object with exactly these keys, in this order:
{
  "analysis": "a short summary of what you changed and why, naming the specific issue(s) fixed",
  "suggestions": ["one specific improvement per issue actually fixed"],
  "proposals": [{"id": "unique-short-id", "location": "clause and affected expression", "issue": "specific anti-pattern", "reason": "why it is costly or risky", "recommendation": "what this targeted change does", "find": "exact unique SQL text from the original to replace", "replace": "replacement SQL text", "semantic_impact": "why rows, columns, joins and aggregates stay unchanged"}],
  "semantic_impact": "plain-language statement of why the approved local changes preserve rows, columns, aggregates and relationships"${
    userInstruction
      ? `,
  "instruction_status": "\"applied\", \"partial\", or \"refused\" — see rules above",
  "instruction_note": "explanation shown to the user when instruction_status is not \"applied\""`
      : ''
  }
}

SQL:
\`\`\`sql
${sql}
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
  vi: (
    sql,
    userInstruction
  ) => `Tối ưu hóa truy vấn SQL sau đây về hiệu suất. CHỈ sửa những vấn đề cụ thể được liệt kê bên dưới truy vấn trong phần "Linting alerts" (nếu có) — mọi mệnh đề, bí danh, cách định dạng và thứ tự khác phải giữ nguyên tuyệt đối so với bản gốc. Không viết lại toàn bộ.
${
  userInstruction
    ? `
Người dùng cũng đã yêu cầu thêm, bằng lời của họ: "${userInstruction}"
Chỉ áp dụng yêu cầu này trong phạm vi KHÔNG làm thay đổi những dòng, bảng, phép nối, điều kiện lọc hoặc cột đầu ra mà truy vấn trả về:
- Nếu có thể đáp ứng đầy đủ mà không đổi ngữ nghĩa kết quả, hãy áp dụng và đặt "instruction_status" là "applied".
- Nếu chỉ một phần có thể áp dụng mà không đổi ngữ nghĩa, chỉ áp dụng phần đó và đặt "instruction_status" là "partial", giải thích trong "instruction_note" phần nào đã bỏ qua và vì sao.
- Nếu áp dụng yêu cầu chắc chắn sẽ làm thay đổi ngữ nghĩa kết quả (ví dụ yêu cầu bỏ một điều kiện lọc, đổi loại JOIN làm thay đổi số dòng, hoặc bỏ một cột đầu ra), KHÔNG áp dụng phần đó — đặt "instruction_status" là "refused" và giải thích lý do trong "instruction_note", chỉ đề xuất không thay đổi (hoặc một phần an toàn) thay vào đó.
`
    : ''
}
Chỉ trả về một đối tượng JSON với đúng các khóa sau, theo đúng thứ tự này:
{
  "analysis": "tóm tắt ngắn gọn những gì bạn đã thay đổi và lý do, nêu rõ (các) vấn đề đã sửa",
  "suggestions": ["mỗi cải tiến cụ thể tương ứng với từng vấn đề đã thực sự được sửa"],
  "proposals": [{"id": "ma-dinh-danh-ngan", "location": "mệnh đề và biểu thức bị ảnh hưởng", "issue": "anti-pattern cụ thể", "reason": "vì sao gây tốn chi phí hoặc rủi ro", "recommendation": "thay đổi cục bộ này thực hiện gì", "find": "đoạn SQL duy nhất, chính xác trong bản gốc cần thay", "replace": "đoạn SQL thay thế", "semantic_impact": "vì sao số dòng, cột, JOIN và aggregate không thay đổi"}],
  "semantic_impact": "giải thích vì sao các thay đổi cục bộ đã duyệt vẫn giữ nguyên số dòng, cột, aggregate và quan hệ"${
    userInstruction
      ? `,
  "instruction_status": "\"applied\", \"partial\", hoặc \"refused\" — xem quy tắc ở trên",
  "instruction_note": "giải thích hiển thị cho người dùng khi instruction_status không phải \"applied\""`
      : ''
  }
}

SQL:
\`\`\`sql
${sql}
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
};

// Multiline SQL that also exercises backticks, braces and a `{{...}}`-shaped value: the renderer
// inserts values verbatim in a single pass and never re-scans them (FR-006).
const SQL = [
  'SELECT c.name, SUM(l.units) AS total_inbound_units',
  'FROM customers AS c',
  "JOIN lines AS l ON l.customer_id = c.id AND l.note = 'a`b{c}{{not_a_param}}'",
  "WHERE c.region = 'north' AND l.note LIKE '%\\%'",
  'GROUP BY c.name',
  'ORDER BY total_inbound_units DESC;',
].join('\n');

const CTE_NAME = 'inbound_totals';
const CTE_SQL = 'SELECT id, amount\nFROM raw_orders\nWHERE amount > 0';
const DEPENDENCIES = '- raw_orders: base table\n- fx_rates: currency conversion';
const INSTRUCTION = 'Make it faster without changing the rows it returns.';

const LOCALES: Locale[] = ['en', 'vi'];

/** Renders one entry and pins the invariants every migrated prompt must keep. */
function rendered(id: string, params: Record<string, string>): string {
  const messages = renderPrompt(id, params);
  expect(messages).toHaveLength(1);
  expect(messages[0].role).toBe('user');
  for (const name of Object.keys(PROMPT_REGISTRY[id].params)) {
    expect(messages[0].content, `placeholder ${name} left unfilled`).not.toContain(
      `{{${name}}}`
    );
  }
  return messages[0].content;
}

describe('sqlExplainer prompt parity (feature 020, characterization of the pre-migration literals)', () => {
  it.each(LOCALES)('renders explainSql byte-identically for locale %s', (locale: Locale) => {
    expect(
      rendered(localizedPromptId(SQL_EXPLAINER_PROMPTS.explainSql, locale), explainSqlParams(SQL))
    ).toBe(OLD_EXPLAIN_SQL_PROMPT[locale](SQL));
  });

  it.each(LOCALES)('renders explainCte byte-identically for locale %s with dependencies', (locale: Locale) => {
    expect(
      rendered(
        localizedPromptId(SQL_EXPLAINER_PROMPTS.explainCte, locale),
        explainCteParams(CTE_NAME, CTE_SQL, DEPENDENCIES, locale)
      )
    ).toBe(OLD_EXPLAIN_CTE_PROMPT[locale](CTE_NAME, CTE_SQL, DEPENDENCIES));
  });

  it.each(LOCALES)('renders explainCte byte-identically for locale %s without dependencies', (locale: Locale) => {
    expect(
      rendered(
        localizedPromptId(SQL_EXPLAINER_PROMPTS.explainCte, locale),
        explainCteParams(CTE_NAME, CTE_SQL, '', locale)
      )
    ).toBe(OLD_EXPLAIN_CTE_PROMPT[locale](CTE_NAME, CTE_SQL, ''));
  });

  it('keeps the omitted dependenciesBlock default and the en builder default (FR-003)', () => {
    expect(
      rendered(`${SQL_EXPLAINER_PROMPTS.explainCte}.en`, { name: CTE_NAME, sql: CTE_SQL })
    ).toBe(OLD_EXPLAIN_CTE_PROMPT.en(CTE_NAME, CTE_SQL, ''));
    expect(rendered(localizedPromptId(SQL_EXPLAINER_PROMPTS.explainCte, 'en'), explainCteParams(CTE_NAME, CTE_SQL, DEPENDENCIES)))
      .toBe(OLD_EXPLAIN_CTE_PROMPT.en(CTE_NAME, CTE_SQL, DEPENDENCIES));
  });

  it.each(LOCALES)('renders explainSqlStructured byte-identically for locale %s', (locale: Locale) => {
    expect(
      rendered(
        localizedPromptId(SQL_EXPLAINER_PROMPTS.explainSqlStructured, locale),
        explainSqlStructuredParams(SQL)
      )
    ).toBe(OLD_EXPLAIN_SQL_STRUCTURED_PROMPT[locale](SQL));
  });

  it('falls back to the en entry for an unexpected runtime locale', () => {
    const unexpected = 'de' as Locale;
    expect(localizedPromptId(SQL_EXPLAINER_PROMPTS.explainSqlStructured, unexpected)).toBe(
      `${SQL_EXPLAINER_PROMPTS.explainSqlStructured}.en`
    );
    expect(rendered(localizedPromptId(SQL_EXPLAINER_PROMPTS.explainSqlStructured, unexpected), explainSqlStructuredParams(SQL)))
      .toBe(OLD_EXPLAIN_SQL_STRUCTURED_PROMPT.en(SQL));
  });

  it('inserts a placeholder-shaped parameter value verbatim without re-scanning it (FR-006)', () => {
    const content = rendered(
      `${SQL_EXPLAINER_PROMPTS.explainSql}.en`,
      explainSqlParams(SQL)
    );
    expect(content).toContain('{{not_a_param}}');
    expect(content).toBe(OLD_EXPLAIN_SQL_PROMPT.en(SQL));
  });
});

describe('semanticBrief prompt parity (feature 020, characterization of the pre-migration literals)', () => {
  it.each(LOCALES)('renders the brief byte-identically for locale %s with a user goal', (locale: Locale) => {
    expect(
      rendered(
        localizedPromptId(SEMANTIC_BRIEF_PROMPTS.brief, locale),
        semanticBriefParams(SQL, INSTRUCTION, locale)
      )
    ).toBe(OLD_SEMANTIC_BRIEF_PROMPT[locale](SQL, INSTRUCTION));
  });

  it.each(LOCALES)('renders the brief byte-identically for locale %s without a user goal', (locale: Locale) => {
    expect(
      rendered(localizedPromptId(SEMANTIC_BRIEF_PROMPTS.brief, locale), semanticBriefParams(SQL, undefined, locale))
    ).toBe(OLD_SEMANTIC_BRIEF_PROMPT[locale](SQL));
  });

  it.each(LOCALES)('treats an empty user goal as absent for locale %s (FR-003)', (locale: Locale) => {
    expect(rendered(localizedPromptId(SEMANTIC_BRIEF_PROMPTS.brief, locale), semanticBriefParams(SQL, '', locale)))
      .toBe(OLD_SEMANTIC_BRIEF_PROMPT[locale](SQL, ''));
  });

  it('keeps the omitted instructionBlock default and the en builder default (FR-003)', () => {
    expect(rendered(`${SEMANTIC_BRIEF_PROMPTS.brief}.en`, { sql: SQL })).toBe(
      OLD_SEMANTIC_BRIEF_PROMPT.en(SQL)
    );
    expect(rendered(localizedPromptId(SEMANTIC_BRIEF_PROMPTS.brief, 'en'), semanticBriefParams(SQL, INSTRUCTION)))
      .toBe(OLD_SEMANTIC_BRIEF_PROMPT.en(SQL, INSTRUCTION));
  });
});

describe('optimize prompt parity (feature 020, characterization of the pre-migration literals)', () => {
  it.each(LOCALES)(
    'renders optimizeSqlStructured byte-identically for locale %s with a user instruction',
    (locale: Locale) => {
      expect(
        rendered(
          localizedPromptId(OPTIMIZE_PROMPTS.optimizeSqlStructured, locale),
          optimizeSqlStructuredParams(SQL, INSTRUCTION, locale)
        )
      ).toBe(OLD_OPTIMIZE_SQL_STRUCTURED_PROMPT[locale](SQL, INSTRUCTION));
    }
  );

  it.each(LOCALES)(
    'renders optimizeSqlStructured byte-identically for locale %s without a user instruction',
    (locale: Locale) => {
      expect(
        rendered(
          localizedPromptId(OPTIMIZE_PROMPTS.optimizeSqlStructured, locale),
          optimizeSqlStructuredParams(SQL, undefined, locale)
        )
      ).toBe(OLD_OPTIMIZE_SQL_STRUCTURED_PROMPT[locale](SQL));
    }
  );

  it.each(LOCALES)('treats an empty user instruction as absent for locale %s (FR-003)', (locale: Locale) => {
    expect(
      rendered(
        localizedPromptId(OPTIMIZE_PROMPTS.optimizeSqlStructured, locale),
        optimizeSqlStructuredParams(SQL, '', locale)
      )
    ).toBe(OLD_OPTIMIZE_SQL_STRUCTURED_PROMPT[locale](SQL, ''));
  });

  it('keeps the omitted optional defaults and the en builder default (FR-003)', () => {
    expect(rendered(`${OPTIMIZE_PROMPTS.optimizeSqlStructured}.en`, { sql: SQL })).toBe(
      OLD_OPTIMIZE_SQL_STRUCTURED_PROMPT.en(SQL)
    );
    expect(rendered(localizedPromptId(OPTIMIZE_PROMPTS.optimizeSqlStructured, 'en'), optimizeSqlStructuredParams(SQL, INSTRUCTION)))
      .toBe(OLD_OPTIMIZE_SQL_STRUCTURED_PROMPT.en(SQL, INSTRUCTION));
  });

  it('is deterministic: identical inputs render byte-identical content (SC-001)', () => {
    const id = localizedPromptId(OPTIMIZE_PROMPTS.optimizeSqlStructured, 'vi');
    const params = optimizeSqlStructuredParams(SQL, INSTRUCTION, 'vi');
    expect(rendered(id, params)).toBe(renderPrompt(id, params)[0].content);
  });
});

