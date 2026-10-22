/**
 * Database AI Assistant prompt templates.
 *
 * Migrated by specs/020-prompt-manager-refactor T013/T014 from `src/lib/ai/databaseAssistant.ts`
 * (`DATABASE_ASSISTANT_SYSTEM_PROMPT` :26, `DATABASE_KNOWLEDGE_ADDENDUM` :32,
 * `FOLLOW_UP_SUGGESTIONS_PROMPT` :44 — prompt-inventory.md rows 11-13). The wording is
 * byte-identical to the pre-migration constants (FR-002/FR-004); nothing here may be reworded
 * without a new spec, because `tests/unit/promptParity.databaseAssistant.test.ts` pins the exact
 * bytes a provider must receive.
 *
 * The source branched per locale, so every purpose is registered as an `.en` / `.vi` pair
 * (data-model.md -> PromptTemplate.locale) and call sites resolve it via `localizedPromptId`,
 * which reproduces the pre-migration `PROMPT[locale] ?? PROMPT.en` lookup exactly.
 *
 * Roles come from how the pre-migration call site used each text (FR-004):
 * - `system` and `knowledgeAddendum` are both `system`: `prepareRequest` emitted exactly one system
 *   message whose content was the system prompt plus the addendum appended when — and only when —
 *   retrieval found excerpts (databaseAssistant.ts:231-235 + 248). That BRANCH stays at the call
 *   site: it decides whether the second id is rendered at all, and the concatenation order is
 *   unchanged, so the composed bytes stay identical.
 * - `followUpSuggestions` is `user`: `suggestFollowUpQuestions` passed the built text as
 *   `AIGenerateRequest.prompt` (databaseAssistant.ts:360), which `resolveMessages` turns into a
 *   single `{ role: 'user' }` message.
 *
 * Deliberately NOT part of this module: the `Reference material:` user-message wrapper
 * (databaseAssistant.ts:240) and `OPTIMIZE_KNOWLEDGE_HEADER` (:156). Neither is an inventory row
 * for this feature — the first is message assembly around the retrieved context, the second
 * belongs to the Optimize flow.
 */
import type { PromptTemplateMap } from '../registry';

/** Registry ids for this feature. Prefer these over raw strings at call sites. */
export const DATABASE_ASSISTANT_PROMPTS = {
  /** System message sent with every assistant turn. */
  system: 'databaseAssistant.system',
  /** Appended to the system prompt ONLY when retrieval actually found relevant excerpts. */
  knowledgeAddendum: 'databaseAssistant.knowledgeAddendum',
  /** Asks for the 4 follow-up question chips shown after an answer. */
  followUpSuggestions: 'databaseAssistant.followUpSuggestions',
} as const;

/**
 * Parameters for {@link DATABASE_ASSISTANT_PROMPTS.followUpSuggestions}: the latest turn only,
 * which is what keeps the suggestions grounded and cheap enough to run after every answer.
 */
export function followUpSuggestionsParams(
  question: string,
  answer: string
): Record<string, string> {
  return { question, answer };
}

/** {@link DATABASE_ASSISTANT_PROMPTS.system} and `.knowledgeAddendum` take no parameters. */
export function databaseAssistantStaticParams(): Record<string, string> {
  return {};
}

/**
 * Registry entries for the database-assistant feature.
 *
 * Source of truth before migration: `src/lib/ai/databaseAssistant.ts:26` (system prompt, values on
 * :27 en / :28 vi), `:32` (knowledge addendum, values on :33 en / :34 vi) and `:44` (follow-up
 * suggestions, values on :45 en / :52 vi).
 */
export const DATABASE_ASSISTANT_TEMPLATES: PromptTemplateMap = {
  [`${DATABASE_ASSISTANT_PROMPTS.system}.en`]: {
    role: 'system',
    locale: 'en',
    feature: 'databaseAssistant',
    source: 'src/lib/ai/databaseAssistant.ts:26',
    params: {},
    text: 'You are an expert database assistant embedded in SQL Visualizer. You can be asked about anything database-related: SQL across dialects (MySQL, PostgreSQL, SQL Server, Oracle), schema design, normalization, indexing, query performance/optimization, transactions, locking, replication, backups, migrations, NoSQL vs relational trade-offs, and security best practices. Answer clearly and practically, use short code blocks for SQL examples when helpful, and say plainly when something depends on the specific database engine or version.',
  },

  [`${DATABASE_ASSISTANT_PROMPTS.system}.vi`]: {
    role: 'system',
    locale: 'vi',
    feature: 'databaseAssistant',
    source: 'src/lib/ai/databaseAssistant.ts:26',
    params: {},
    text: 'Bạn là trợ lý cơ sở dữ liệu chuyên nghiệp được tích hợp trong SQL Visualizer. Bạn có thể được hỏi bất cứ điều gì liên quan đến cơ sở dữ liệu: SQL trên nhiều dialect (MySQL, PostgreSQL, SQL Server, Oracle), thiết kế schema, chuẩn hóa dữ liệu, đánh chỉ mục, tối ưu hiệu năng truy vấn, transaction, khóa, replication, sao lưu, migration, so sánh NoSQL với quan hệ, và các thực hành bảo mật tốt nhất. Hãy trả lời bằng tiếng Việt một cách rõ ràng, thực tế, dùng khối mã ngắn cho ví dụ SQL khi cần, và nói rõ khi điều gì đó phụ thuộc vào loại/phiên bản cơ sở dữ liệu cụ thể.',
  },

  [`${DATABASE_ASSISTANT_PROMPTS.knowledgeAddendum}.en`]: {
    role: 'system',
    locale: 'en',
    feature: 'databaseAssistant',
    source: 'src/lib/ai/databaseAssistant.ts:32',
    params: {},
    text: '\n\nSome official database manual excerpts (SQL Server, MySQL, PostgreSQL, and/or Oracle) relevant to the question are provided below as reference material. Prefer and cite this reference material when it applies; fall back to your general knowledge for anything it does not cover.',
  },

  [`${DATABASE_ASSISTANT_PROMPTS.knowledgeAddendum}.vi`]: {
    role: 'system',
    locale: 'vi',
    feature: 'databaseAssistant',
    source: 'src/lib/ai/databaseAssistant.ts:32',
    params: {},
    text: '\n\nBên dưới là một số đoạn trích từ tài liệu chính thức của các hệ cơ sở dữ liệu (SQL Server, MySQL, PostgreSQL và/hoặc Oracle) liên quan đến câu hỏi, được cung cấp làm tài liệu tham khảo. Hãy ưu tiên và trích dẫn tài liệu này khi phù hợp; với những gì tài liệu không đề cập, hãy dùng kiến thức chung của bạn.',
  },

  [`${DATABASE_ASSISTANT_PROMPTS.followUpSuggestions}.en`]: {
    role: 'user',
    locale: 'en',
    feature: 'databaseAssistant',
    source: 'src/lib/ai/databaseAssistant.ts:44',
    params: {
      question: { required: true },
      answer: { required: true },
    },
    text: `Conversation so far:
Q: {{question}}
A: {{answer}}

Suggest exactly 4 diverse, short follow-up questions the user might naturally ask next. Cover different angles: a deeper dive into a detail just mentioned, a related database topic, a practical example, and a common pitfall or edge case. Each question must be under 12 words and phrased in English.

Reply with ONLY a JSON array of 4 strings — no prose, no markdown fence — e.g. ["...", "...", "...", "..."]`,
  },

  [`${DATABASE_ASSISTANT_PROMPTS.followUpSuggestions}.vi`]: {
    role: 'user',
    locale: 'vi',
    feature: 'databaseAssistant',
    source: 'src/lib/ai/databaseAssistant.ts:44',
    params: {
      question: { required: true },
      answer: { required: true },
    },
    text: `Cuộc trò chuyện cho đến nay:
Hỏi: {{question}}
Đáp: {{answer}}

Hãy gợi ý chính xác 4 câu hỏi tiếp theo ngắn gọn, đa dạng mà người dùng có thể tự nhiên muốn hỏi tiếp. Bao quát các góc độ khác nhau: đào sâu một chi tiết vừa đề cập, một chủ đề cơ sở dữ liệu liên quan, một ví dụ thực tế, và một lỗi/trường hợp đặc biệt thường gặp. Mỗi câu hỏi dưới 12 từ, bằng tiếng Việt.

Chỉ trả về DUY NHẤT một mảng JSON gồm 4 chuỗi — không thêm lời dẫn, không dùng khối markdown — ví dụ: ["...", "...", "...", "..."]`,
  },
};
