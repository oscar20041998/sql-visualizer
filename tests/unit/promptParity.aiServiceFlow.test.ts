// Characterization parity gate for the aiService.ts prompt flow migrated by
// specs/020-prompt-manager-refactor: requirement-candidate, proposal-repair, follow-up system
// and docs-consultant prompts.
//
// Each `OLD_*` helper below is copied CHARACTER-FOR-CHARACTER from the pre-migration constants in
// `src/lib/ai/aiService.ts` (REQUIREMENT_CANDIDATE_PROMPT :2418, REPAIR_PROPOSALS_PROMPT :2657,
// FOLLOW_UP_SYSTEM_PROMPT :2800, DOCS_CONSULTANT_SYSTEM_PROMPT :2897,
// DOCS_CONSULTANT_NO_CONTEXT_PROMPT :2902), including the original odd parameter formatting, the
// conditional branches and the call-site compositions. Every assertion compares what
// `renderPrompt` produces against what the old literal produced for the same inputs, so ANY
// wording, whitespace, ordering or punctuation drift fails here (FR-002/FR-004).
//
// These old literals are the pinned baseline. Do not "fix" them: if a prompt looks wrong, the
// wrong bytes are the contract until a new spec says otherwise.
import { describe, expect, it } from 'vitest';
import type { Locale } from '@/lib/i18n';
import { localizedPromptId, renderPrompt } from '@/lib/ai/prompts/render';
import {
  REQUIREMENT_PROMPTS,
  requirementCandidateParams,
} from '@/lib/ai/prompts/templates/requirement';
import {
  REPAIR_PROMPTS,
  repairProposalsParams,
  type RepairProposalRef,
} from '@/lib/ai/prompts/templates/repair';
import { FOLLOW_UP_PROMPTS } from '@/lib/ai/prompts/templates/followUp';
import {
  DOCS_CONSULTANT_PROMPTS,
  docsConsultantNoContextParams,
  docsConsultantSystemParams,
} from '@/lib/ai/prompts/templates/docsConsultant';

// --- pre-migration baseline: src/lib/ai/aiService.ts:2418 --------------------------------------
const OLD_REQUIREMENT_CANDIDATE_PROMPT: Record<
  Locale,
  (sql: string, requirementText: string, hintedTables: string[]) => string
> = {
  en: (
    sql,
    requirementText,
    hintedTables
  ) => `The user wants to add a new requirement to the following SQL query. Unlike a normal optimization pass, you MAY change which tables, joins, filters, or output columns the query uses if that is what the requirement needs — but only to satisfy the stated requirement, nothing else.

SQL:
\`\`\`sql
${sql}
\`\`\`

Requirement, in the user's own words: "${requirementText}"
${hintedTables.length ? `The user specifically named these tables/columns to consider: ${hintedTables.join(', ')}.` : ''}

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
  vi: (
    sql,
    requirementText,
    hintedTables
  ) => `Người dùng muốn thêm một yêu cầu mới vào truy vấn SQL sau đây. Khác với một lượt tối ưu hóa thông thường, bạn ĐƯỢC PHÉP thay đổi bảng, phép nối, điều kiện lọc hoặc cột đầu ra của truy vấn nếu yêu cầu cần như vậy — nhưng chỉ để đáp ứng đúng yêu cầu đã nêu, không hơn.

SQL:
\`\`\`sql
${sql}
\`\`\`

Yêu cầu, theo lời của người dùng: "${requirementText}"
${hintedTables.length ? `Người dùng đã nêu rõ các bảng/cột sau cần xem xét: ${hintedTables.join(', ')}.` : ''}

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
};

// --- pre-migration baseline: src/lib/ai/aiService.ts:2657 --------------------------------------
const OLD_REPAIR_PROPOSALS_PROMPT: Record<
  Locale,
  (sql: string, invalid: { issue: string; find: string; occurrences: number }[]) => string
> = {
  en: (
    sql,
    invalid
  ) => `You previously proposed targeted SQL edits for the query below, but some of them cannot be applied because their "find" text does not match the ORIGINAL query exactly once (occurrences=0 means it was not found at all; occurrences>1 means it matched more than once and is ambiguous — a repeated expression like an aggregate reused in HAVING/ORDER BY is a common cause).

Re-emit ONLY the proposals listed below, corrected. Keep each one's original intent (the same issue/fix) — only correct "find"/"replace" so that:
- "find" is copied character-for-character from the SQL below (same whitespace, casing, line breaks).
- "find" occurs in the SQL EXACTLY ONCE. If the expression repeats, widen "find" to include enough surrounding text (a neighboring keyword, clause, alias, or operand) to make it unique.
- If a proposal genuinely cannot be made both valid and unique from this exact SQL, omit it from the output array entirely rather than guessing.

Original SQL:
\`\`\`sql
${sql}
\`\`\`

Proposals to correct:
${invalid.map((p, i) => `${i + 1}. issue: ${p.issue || '(none)'} | previous find (occurrences=${p.occurrences}): ${JSON.stringify(p.find)}`).join('\n')}

Return only a JSON object with exactly this key:
{"proposals": [{"id": "short id", "location": "clause and affected expression", "issue": "specific anti-pattern", "reason": "why it is costly or risky", "recommendation": "what this targeted change does", "find": "exact unique SQL text from the original", "replace": "replacement SQL text", "semantic_impact": "why rows, columns, joins and aggregates stay unchanged"}]}`,
  vi: (
    sql,
    invalid
  ) => `Bạn đã đề xuất các thay đổi SQL cục bộ cho truy vấn bên dưới, nhưng một số đề xuất không thể áp dụng vì đoạn "find" không khớp CHÍNH XÁC MỘT LẦN với truy vấn GỐC (occurrences=0 nghĩa là không tìm thấy; occurrences>1 nghĩa là khớp nhiều lần nên không rõ ràng — nguyên nhân thường gặp là một biểu thức lặp lại, ví dụ hàm aggregate được dùng lại ở HAVING/ORDER BY).

Chỉ trả lại các đề xuất được liệt kê bên dưới, đã sửa. Giữ nguyên mục đích ban đầu của từng đề xuất (cùng vấn đề/cách sửa) — chỉ sửa "find"/"replace" sao cho:
- "find" được copy nguyên văn từng ký tự từ SQL bên dưới (giữ nguyên khoảng trắng, chữ hoa/thường, xuống dòng).
- "find" xuất hiện trong SQL ĐÚNG MỘT LẦN. Nếu biểu thức bị lặp lại, hãy mở rộng "find" để bao gồm đủ ngữ cảnh xung quanh (từ khóa lân cận, mệnh đề, alias, hoặc toán hạng) để nó trở nên duy nhất.
- Nếu một đề xuất thực sự không thể vừa hợp lệ vừa duy nhất từ SQL này, hãy bỏ hẳn nó khỏi mảng kết quả thay vì đoán bừa.

SQL gốc:
\`\`\`sql
${sql}
\`\`\`

Các đề xuất cần sửa:
${invalid.map((p, i) => `${i + 1}. issue: ${p.issue || '(không có)'} | find cũ (occurrences=${p.occurrences}): ${JSON.stringify(p.find)}`).join('\n')}

Chỉ trả về một đối tượng JSON với đúng khóa sau:
{"proposals": [{"id": "id ngắn", "location": "mệnh đề và biểu thức bị ảnh hưởng", "issue": "anti-pattern cụ thể", "reason": "vì sao gây tốn chi phí hoặc rủi ro", "recommendation": "thay đổi cục bộ này thực hiện gì", "find": "đoạn SQL chính xác và duy nhất từ bản gốc", "replace": "đoạn SQL thay thế", "semantic_impact": "vì sao số dòng, cột, join và aggregate không thay đổi"}]}`,
};

// --- pre-migration baseline: src/lib/ai/aiService.ts:2800 --------------------------------------
const OLD_FOLLOW_UP_SYSTEM_PROMPT: Record<Locale, string> = {
  en: 'You are a SQL expert answering any question about one specific query. Explain the query’s intent, fields, expressions, filters, joins, returned data, and likely business impact in plain language suitable for non-technical staff. Stay grounded in the SQL and verified parser facts. Clearly distinguish what the query proves from a reasonable inference, and say when an exact business definition or answer is not present. Give detail when the question calls for it; otherwise be concise.',
  vi: 'Bạn là chuyên gia SQL đang trả lời mọi câu hỏi về một truy vấn cụ thể. Hãy giải thích mục đích, field, biểu thức, điều kiện, phép nối, dữ liệu trả về và tác động nghiệp vụ có thể suy ra từ truy vấn bằng tiếng Việt dễ hiểu cho cả người không chuyên. Chỉ dựa trên SQL và các dữ kiện đã được parser xác thực. Phân biệt rõ điều truy vấn chứng minh được với suy luận hợp lý, và nói rõ khi truy vấn không có định nghĩa nghiệp vụ hoặc câu trả lời chính xác. Trả lời chi tiết khi câu hỏi cần; các trường hợp khác giữ ngắn gọn.',
};

/** The exact pre-migration composition at aiService.ts:2838 — a bare template-literal wrap. */
function oldFollowUpSystemContent(locale: Locale): string {
  return `${OLD_FOLLOW_UP_SYSTEM_PROMPT[locale] ?? OLD_FOLLOW_UP_SYSTEM_PROMPT.en}`;
}

// --- pre-migration baseline: src/lib/ai/aiService.ts:2897 / :2902 ------------------------------
const OLD_DOCS_CONSULTANT_SYSTEM_PROMPT: Record<Locale, string> = {
  en: "You are the SQL Visualizer documentation assistant. Answer only about the app's existing features using the retrieved documentation below. Treat the retrieved documentation as relevant and synthesize its direct answer. Answer in English, with at most three short sentences. Do not add unrelated features, generic database advice, alternatives, or follow-up questions.",
  vi: 'Bạn là trợ lý tài liệu của SQL Visualizer. Chỉ trả lời về các tính năng hiện có của ứng dụng dựa vào tài liệu được truy xuất bên dưới. Hãy coi tài liệu được truy xuất là liên quan và diễn giải câu trả lời trực tiếp. Trả lời bằng tiếng Việt, tối đa ba câu ngắn. Không thêm tính năng không liên quan, lời khuyên cơ sở dữ liệu chung, phương án thay thế hoặc câu hỏi tiếp theo.',
};

const OLD_DOCS_CONSULTANT_NO_CONTEXT_PROMPT: Record<Locale, string> = {
  en: 'The current SQL Visualizer documentation does not cover this.',
  vi: 'Tài liệu SQL Visualizer hiện tại chưa đề cập nội dung này.',
};

/**
 * The exact pre-migration system-message content from `buildDocsConsultantMessages`
 * (aiService.ts:2960-2967): the base prompt plus the retrieved-documentation heading when
 * retrieval returned something, otherwise the entirely separate no-context prompt.
 */
function oldDocsConsultantSystemContent(context: string, locale: Locale): string {
  const basePrompt =
    OLD_DOCS_CONSULTANT_SYSTEM_PROMPT[locale] ?? OLD_DOCS_CONSULTANT_SYSTEM_PROMPT.en;
  const noContextPrompt =
    OLD_DOCS_CONSULTANT_NO_CONTEXT_PROMPT[locale] ?? OLD_DOCS_CONSULTANT_NO_CONTEXT_PROMPT.en;
  return context ? `${basePrompt}\n\nRetrieved documentation:\n${context}` : noContextPrompt;
}

// --- shared fixtures ---------------------------------------------------------------------------
const SQL = `SELECT dept, COUNT(*) AS headcount
FROM employees
WHERE hired_at >= '2024-01-01'
GROUP BY dept`;

const REQUIREMENT_TEXT = 'also show each department manager\'s full name';
const HINTED_TABLES = ['employees.manager_id', 'managers.full_name'];

// Exercises both `(none)`/`(không có)` fallbacks and JSON.stringify quoting of the find text.
const INVALID_PROPOSALS: RepairProposalRef[] = [
  { issue: 'COUNT(*) repeats in HAVING', find: 'COUNT(*)', occurrences: 2 },
  { issue: '', find: `hired_at >= '2024-01-01'`, occurrences: 0 },
];

const DOCS_CONTEXT = `## Semantic brief
The brief lists verified query facts.

## Saved views
A saved view stores the current query.`;

describe('aiService prompt-flow parity (feature 020, characterization of the pre-migration implementation)', () => {
  describe('requirement.candidate', () => {
    it.each(['en', 'vi'] as const)(
      'renders byte-identically to the old literal for locale %s when tables are hinted',
      (locale: Locale) => {
        expect(
          renderPrompt(
            localizedPromptId(REQUIREMENT_PROMPTS.candidate, locale),
            requirementCandidateParams(SQL, REQUIREMENT_TEXT, HINTED_TABLES, locale)
          )
        ).toEqual([
          {
            role: 'user',
            content: OLD_REQUIREMENT_CANDIDATE_PROMPT[locale](
              SQL,
              REQUIREMENT_TEXT,
              HINTED_TABLES
            ),
          },
        ]);
      }
    );

    it.each(['en', 'vi'] as const)(
      'preserves the empty hinted-tables branch, blank line included, for locale %s',
      (locale: Locale) => {
        const rendered = renderPrompt(
          localizedPromptId(REQUIREMENT_PROMPTS.candidate, locale),
          requirementCandidateParams(SQL, REQUIREMENT_TEXT, [], locale)
        );
        expect(rendered).toEqual([
          { role: 'user', content: OLD_REQUIREMENT_CANDIDATE_PROMPT[locale](SQL, REQUIREMENT_TEXT, []) },
        ]);
      }
    );

    it('keeps the semantic-brief prefix out of the template (call-site composition)', () => {
      const brief = 'Verified facts: employees has 12 rows.';
      const bare = renderPrompt(
        localizedPromptId(REQUIREMENT_PROMPTS.candidate, 'en'),
        requirementCandidateParams(SQL, REQUIREMENT_TEXT, HINTED_TABLES, 'en')
      )[0].content;

      // The template never carries the brief, and the caller's prefix still reproduces the
      // pre-migration `brief ? `${brief}\n\n${buildPrompt(...)}` : buildPrompt(...)` exactly.
      expect(bare.startsWith(brief)).toBe(false);
      expect(`${brief}\n\n${bare}`).toBe(
        `${brief}\n\n${OLD_REQUIREMENT_CANDIDATE_PROMPT.en(SQL, REQUIREMENT_TEXT, HINTED_TABLES)}`
      );
    });

    it('renders byte-identical messages for identical inputs on every call (SC-001)', () => {
      const id = localizedPromptId(REQUIREMENT_PROMPTS.candidate, 'vi');
      const params = requirementCandidateParams(SQL, REQUIREMENT_TEXT, HINTED_TABLES, 'vi');
      expect(renderPrompt(id, params)).toEqual(renderPrompt(id, params));
    });
  });

  describe('repair.proposals', () => {
    it.each(['en', 'vi'] as const)(
      'renders byte-identically to the old literal for locale %s',
      (locale: Locale) => {
        expect(
          renderPrompt(
            localizedPromptId(REPAIR_PROMPTS.proposals, locale),
            repairProposalsParams(SQL, INVALID_PROPOSALS, locale)
          )
        ).toEqual([
          { role: 'user', content: OLD_REPAIR_PROPOSALS_PROMPT[locale](SQL, INVALID_PROPOSALS) },
        ]);
      }
    );

    it('reproduces the numbered list, the (none) fallback and the JSON-quoted find text', () => {
      const content = renderPrompt(
        localizedPromptId(REPAIR_PROMPTS.proposals, 'en'),
        repairProposalsParams(SQL, INVALID_PROPOSALS, 'en')
      )[0].content;

      expect(content).toContain(
        `1. issue: COUNT(*) repeats in HAVING | previous find (occurrences=2): "COUNT(*)"`
      );
      expect(content).toContain(
        `2. issue: (none) | previous find (occurrences=0): "hired_at >= '2024-01-01'"`
      );
    });
  });

  describe('followUp.system', () => {
    it.each(['en', 'vi'] as const)(
      'renders the system message byte-identically to the old composition for locale %s',
      (locale: Locale) => {
        expect(
          renderPrompt(localizedPromptId(FOLLOW_UP_PROMPTS.system, locale), {})
        ).toEqual([{ role: 'system', content: oldFollowUpSystemContent(locale) }]);
      }
    );

    it('falls back to English for an unexpected runtime locale, like the old `?? PROMPT.en`', () => {
      const unexpected = 'fr' as unknown as Locale;
      expect(localizedPromptId(FOLLOW_UP_PROMPTS.system, unexpected)).toBe(
        `${FOLLOW_UP_PROMPTS.system}.en`
      );
      expect(
        renderPrompt(localizedPromptId(FOLLOW_UP_PROMPTS.system, unexpected), {})[0].content
      ).toBe(oldFollowUpSystemContent('en'));
    });
  });

  describe('docsConsultant.system / docsConsultant.noContext', () => {
    it.each(['en', 'vi'] as const)(
      'renders the whole composed system message when retrieval returned documentation (%s)',
      (locale: Locale) => {
        expect(
          renderPrompt(
            localizedPromptId(DOCS_CONSULTANT_PROMPTS.system, locale),
            docsConsultantSystemParams(DOCS_CONTEXT)
          )
        ).toEqual([
          { role: 'system', content: oldDocsConsultantSystemContent(DOCS_CONTEXT, locale) },
        ]);
      }
    );

    it.each(['en', 'vi'] as const)(
      'renders the no-context prompt as the whole system message when retrieval was empty (%s)',
      (locale: Locale) => {
        expect(
          renderPrompt(
            localizedPromptId(DOCS_CONSULTANT_PROMPTS.noContext, locale),
            docsConsultantNoContextParams()
          )
        ).toEqual([{ role: 'system', content: oldDocsConsultantSystemContent('', locale) }]);
      }
    );

    it('requires the retrieved context so the no-context branch can never render half a prompt', () => {
      expect(() =>
        renderPrompt(localizedPromptId(DOCS_CONSULTANT_PROMPTS.system, 'en'), {})
      ).toThrowError(/missing required parameter: context/);
    });
  });
});


