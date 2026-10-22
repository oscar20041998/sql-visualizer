// Characterization parity gate for the databaseAssistant.ts prompts migrated by
// specs/020-prompt-manager-refactor (prompt-inventory.md rows 11-13).
//
// Each `OLD_*` helper below was copied CHARACTER-FOR-CHARACTER from the pre-migration constants in
// `src/lib/ai/databaseAssistant.ts` (DATABASE_ASSISTANT_SYSTEM_PROMPT :26,
// DATABASE_KNOWLEDGE_ADDENDUM :32, FOLLOW_UP_SUGGESTIONS_PROMPT :44), including the original
// locale branching, by splicing the source lines programmatically rather than retyping them.
//
// Every assertion compares what the SERVICE actually puts on the wire (the request body captured at
// the global `fetch` seam) against what the old literal produced for the same inputs, so ANY
// wording, whitespace, ordering or punctuation drift fails here (FR-002/FR-004). Row 12 is pinned
// as the exact concatenation onto row 11, because the pre-migration call site appended the addendum
// only when retrieval found excerpts (prompt-inventory.md row 12 note).
//
// These old literals are the immutable baseline (FR-011). Do not "fix" them: if a prompt looks
// wrong, the wrong bytes are the contract until a new spec says otherwise. This file must stay
// green UNCHANGED across the migration — never edit it to make a failure pass.
import { describe, expect, it } from 'vitest';
import type { Locale } from '@/lib/i18n';
import {
  askDatabaseAssistant,
  suggestFollowUpQuestions,
  type DatabaseKnowledgeSource,
} from '@/lib/ai/databaseAssistant';
import { jsonResponse, makeOllamaConfig, withStubbedFetch } from './helpers/format-error-fixtures';

// --- pre-migration baseline: src/lib/ai/databaseAssistant.ts:26 (verbatim splice) -------------
const OLD_DATABASE_ASSISTANT_SYSTEM_PROMPT: Record<Locale, string> = {
  en: 'You are an expert database assistant embedded in SQL Visualizer. You can be asked about anything database-related: SQL across dialects (MySQL, PostgreSQL, SQL Server, Oracle), schema design, normalization, indexing, query performance/optimization, transactions, locking, replication, backups, migrations, NoSQL vs relational trade-offs, and security best practices. Answer clearly and practically, use short code blocks for SQL examples when helpful, and say plainly when something depends on the specific database engine or version.',
  vi: 'Bạn là trợ lý cơ sở dữ liệu chuyên nghiệp được tích hợp trong SQL Visualizer. Bạn có thể được hỏi bất cứ điều gì liên quan đến cơ sở dữ liệu: SQL trên nhiều dialect (MySQL, PostgreSQL, SQL Server, Oracle), thiết kế schema, chuẩn hóa dữ liệu, đánh chỉ mục, tối ưu hiệu năng truy vấn, transaction, khóa, replication, sao lưu, migration, so sánh NoSQL với quan hệ, và các thực hành bảo mật tốt nhất. Hãy trả lời bằng tiếng Việt một cách rõ ràng, thực tế, dùng khối mã ngắn cho ví dụ SQL khi cần, và nói rõ khi điều gì đó phụ thuộc vào loại/phiên bản cơ sở dữ liệu cụ thể.',
};

// --- pre-migration baseline: src/lib/ai/databaseAssistant.ts:32 (verbatim splice) -------------
const OLD_DATABASE_KNOWLEDGE_ADDENDUM: Record<Locale, string> = {
  en: '\n\nSome official database manual excerpts (SQL Server, MySQL, PostgreSQL, and/or Oracle) relevant to the question are provided below as reference material. Prefer and cite this reference material when it applies; fall back to your general knowledge for anything it does not cover.',
  vi: '\n\nBên dưới là một số đoạn trích từ tài liệu chính thức của các hệ cơ sở dữ liệu (SQL Server, MySQL, PostgreSQL và/hoặc Oracle) liên quan đến câu hỏi, được cung cấp làm tài liệu tham khảo. Hãy ưu tiên và trích dẫn tài liệu này khi phù hợp; với những gì tài liệu không đề cập, hãy dùng kiến thức chung của bạn.',
};

// --- pre-migration baseline: src/lib/ai/databaseAssistant.ts:44 (verbatim splice) -------------
const OLD_FOLLOW_UP_SUGGESTIONS_PROMPT: Record<
  Locale,
  (question: string, answer: string) => string
> = {
  en: (question, answer) => `Conversation so far:
Q: ${question}
A: ${answer}

Suggest exactly 4 diverse, short follow-up questions the user might naturally ask next. Cover different angles: a deeper dive into a detail just mentioned, a related database topic, a practical example, and a common pitfall or edge case. Each question must be under 12 words and phrased in English.

Reply with ONLY a JSON array of 4 strings — no prose, no markdown fence — e.g. ["...", "...", "...", "..."]`,
  vi: (question, answer) => `Cuộc trò chuyện cho đến nay:
Hỏi: ${question}
Đáp: ${answer}

Hãy gợi ý chính xác 4 câu hỏi tiếp theo ngắn gọn, đa dạng mà người dùng có thể tự nhiên muốn hỏi tiếp. Bao quát các góc độ khác nhau: đào sâu một chi tiết vừa đề cập, một chủ đề cơ sở dữ liệu liên quan, một ví dụ thực tế, và một lỗi/trường hợp đặc biệt thường gặp. Mỗi câu hỏi dưới 12 từ, bằng tiếng Việt.

Chỉ trả về DUY NHẤT một mảng JSON gồm 4 chuỗi — không thêm lời dẫn, không dùng khối markdown — ví dụ: ["...", "...", "...", "..."]`,
};

const QUESTION = 'How should I index a wide join on the orders table?';
const ANSWER = 'Index the join key first, then the filter columns.';
const KNOWLEDGE_CONTEXT = 'SQL Server manual: clustered index keys should be narrow.';
const KNOWLEDGE_SOURCES: DatabaseKnowledgeSource[] = [
  { sourceFile: 'sqlserver-indexes.md', section: 'Clustered indexes' },
];
const ANSWER_REPLY = 'A short grounded answer.';
const SUGGESTIONS_REPLY = '["one","two","three","four"]';

interface CapturedCall {
  url: string;
  body: Record<string, unknown>;
}

/**
 * Routes the three requests the assistant makes: the fixed local-Ollama embedding call for RAG, the
 * app-server knowledge-context lookup, and the chat completion itself (only the last one is a
 * prompt-bearing call, so only it is captured).
 *
 * `knowledge: null` fails the embedding call at the network layer, which is exactly how the
 * pre-migration code degraded to "no reference material": `fetchDatabaseKnowledgeContext` catches
 * and returns null, so the addendum is not appended.
 */
function assistantFetch(
  calls: CapturedCall[],
  options: { knowledge: { context: string; sources: DatabaseKnowledgeSource[] } | null },
  reply: string
): typeof fetch {
  return (async (url: string, init: RequestInit) => {
    const target = String(url);
    if (target.endsWith('/api/embeddings')) {
      if (!options.knowledge) throw new Error('Failed to fetch');
      return new Response(JSON.stringify({ embedding: [0.1, 0.2, 0.3] }), { status: 200 });
    }
    if (target.includes('/api/ai/database-knowledge-context')) {
      return new Response(JSON.stringify(options.knowledge ?? { context: '', sources: [] }), {
        status: 200,
      });
    }
    calls.push({ url: target, body: JSON.parse(String(init.body)) });
    return jsonResponse(reply);
  }) as unknown as typeof fetch;
}

function messagesOf(call: CapturedCall): Array<{ role: string; content: string }> {
  return call.body.messages as Array<{ role: string; content: string }>;
}

const NO_KNOWLEDGE = { knowledge: null };
const WITH_KNOWLEDGE = {
  knowledge: { context: KNOWLEDGE_CONTEXT, sources: KNOWLEDGE_SOURCES },
};

describe('database-assistant parity baseline (feature 020, characterization)', () => {
  const config = makeOllamaConfig();

  describe.each(['en', 'vi'] as const)('chat system prompt, locale=%s', (locale: Locale) => {
    it('sends the system prompt alone when retrieval found nothing (row 11)', async () => {
      const calls: CapturedCall[] = [];
      await withStubbedFetch(assistantFetch(calls, NO_KNOWLEDGE, ANSWER_REPLY), () =>
        askDatabaseAssistant({ question: QUESTION, config, locale })
      );

      expect(calls).toHaveLength(1);
      const messages = messagesOf(calls[0]);
      // Pin the role the migration must preserve (FR-004).
      expect(messages[0].role).toBe('system');
      // Pin the exact system-prompt bytes (row 11).
      expect(messages[0].content).toBe(OLD_DATABASE_ASSISTANT_SYSTEM_PROMPT[locale]);
      expect(messages[0].content).not.toContain('MUTANT');
      // Without reference material the question reaches the model untouched.
      expect(messages[1]).toEqual({ role: 'user', content: QUESTION });
    });

    it('appends the knowledge addendum byte-identically when excerpts were found (rows 11+12)', async () => {
      const calls: CapturedCall[] = [];
      const result = await withStubbedFetch(
        assistantFetch(calls, WITH_KNOWLEDGE, ANSWER_REPLY),
        () => askDatabaseAssistant({ question: QUESTION, config, locale })
      );

      expect(calls).toHaveLength(1);
      const messages = messagesOf(calls[0]);
      expect(messages[0].role).toBe('system');
      // Pin the concatenation: system prompt + addendum, nothing inserted between them.
      expect(messages[0].content).toBe(
        OLD_DATABASE_ASSISTANT_SYSTEM_PROMPT[locale] + OLD_DATABASE_KNOWLEDGE_ADDENDUM[locale]
      );
      expect(messages[0].content).not.toContain('MUTANT');
      expect(messages[1]).toEqual({
        role: 'user',
        content: `Reference material:\n${KNOWLEDGE_CONTEXT}\n\nQuestion: ${QUESTION}`,
      });
      expect(result.sources).toEqual(KNOWLEDGE_SOURCES);
    });
  });

  describe.each(['en', 'vi'] as const)('follow-up suggestions prompt, locale=%s', (locale: Locale) => {
    it('sends the follow-up prompt as one user message with unchanged settings (row 13)', async () => {
      const calls: CapturedCall[] = [];
      const suggestions = await withStubbedFetch(
        assistantFetch(calls, NO_KNOWLEDGE, SUGGESTIONS_REPLY),
        () => suggestFollowUpQuestions({ question: QUESTION, answer: ANSWER, config, locale })
      );

      expect(calls).toHaveLength(1);
      // Pin the request settings the migration must not alter.
      expect(calls[0].body).toMatchObject({
        stream: false,
        max_tokens: 220,
        response_format: { type: 'json_object' },
      });
      const messages = messagesOf(calls[0]);
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('user');
      // Pin the exact follow-up prompt bytes, parameters substituted (row 13).
      expect(messages[0].content).toBe(OLD_FOLLOW_UP_SUGGESTIONS_PROMPT[locale](QUESTION, ANSWER));
      expect(messages[0].content).not.toContain('MUTANT');
      expect(suggestions).toEqual(['one', 'two', 'three', 'four']);
    });
  });

  it('produces byte-identical requests for identical inputs (SC-001)', async () => {
    const first: CapturedCall[] = [];
    const second: CapturedCall[] = [];

    await withStubbedFetch(assistantFetch(first, WITH_KNOWLEDGE, ANSWER_REPLY), () =>
      askDatabaseAssistant({ question: QUESTION, config, locale: 'en' })
    );
    await withStubbedFetch(assistantFetch(second, WITH_KNOWLEDGE, ANSWER_REPLY), () =>
      askDatabaseAssistant({ question: QUESTION, config, locale: 'en' })
    );

    expect(messagesOf(second[0])).toEqual(messagesOf(first[0]));
  });

  it('keeps answering from general knowledge when retrieval is unavailable (edge case)', async () => {
    const calls: CapturedCall[] = [];
    const result = await withStubbedFetch(assistantFetch(calls, NO_KNOWLEDGE, ANSWER_REPLY), () =>
      askDatabaseAssistant({ question: QUESTION, config, locale: 'en' })
    );

    expect(result.sources).toEqual([]);
    expect(messagesOf(calls[0])[0].content).toBe(OLD_DATABASE_ASSISTANT_SYSTEM_PROMPT.en);
  });
});
