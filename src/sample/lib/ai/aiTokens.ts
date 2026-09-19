// Context-window accounting for AI requests.
//
// Local models run with a fixed context window (Ollama's default is commonly 4096 tokens).
// When a prompt exceeds it the server silently drops the overflow, which produces a
// confidently wrong explanation with no error. These helpers estimate the cost up front so
// callers can trim deliberately and tell the user what was left out.

/** Tokens reserved for chat scaffolding (role markers, template tokens) that we cannot measure. */
const SCAFFOLD_TOKENS = 64;

/** Extra slack so a slightly-off estimate does not push the request over the real limit. */
const SAFETY_MARGIN_TOKENS = 96;

/** Last-resort fallbacks when no provider-specific value is available. */
export const FALLBACK_CONTEXT_TOKENS = 4096;
export const FALLBACK_MAX_OUTPUT_TOKENS = 2000;

/**
 * Rough token count. Byte-pair encoders average ~4 characters per token for ASCII prose and
 * code, but far fewer for accented or non-Latin text (Vietnamese diacritics, CJK), so those
 * characters are counted more heavily. Deliberately errs on the high side: overestimating
 * costs a little headroom, underestimating causes silent truncation.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  let ascii = 0;
  let wide = 0;
  for (const char of text) {
    if (char.codePointAt(0)! < 128) ascii += 1;
    else wide += 1;
  }
  return Math.ceil(ascii / 4 + wide / 1.5);
}

export interface ContextBudget {
  /** Total context window of the model. */
  contextTokens: number;
  /** Tokens reserved for the answer. */
  maxOutputTokens: number;
  /** Tokens available for system prompt + history + query. */
  promptTokens: number;
}

export function buildContextBudget(
  contextTokens = FALLBACK_CONTEXT_TOKENS,
  maxOutputTokens = FALLBACK_MAX_OUTPUT_TOKENS
): ContextBudget {
  const context = Math.max(512, Math.floor(contextTokens) || FALLBACK_CONTEXT_TOKENS);
  // Never let the output reservation eat the whole window; keep at least half for the prompt.
  const output = Math.min(Math.max(128, Math.floor(maxOutputTokens) || 0), Math.floor(context / 2));
  const prompt = Math.max(128, context - output - SCAFFOLD_TOKENS - SAFETY_MARGIN_TOKENS);
  return { contextTokens: context, maxOutputTokens: output, promptTokens: prompt };
}

export interface TruncatedSql {
  sql: string;
  truncated: boolean;
  /** Lines removed from the middle of the query. */
  omittedLines: number;
  /** Estimated tokens of the original query. */
  originalTokens: number;
  /** Estimated tokens of the query actually sent. */
  sentTokens: number;
}

/**
 * Fits a query into `budgetTokens` by dropping lines from the middle, keeping the head
 * (SELECT list, CTE definitions) and the tail (WHERE/GROUP BY/ORDER BY) — the parts that
 * carry the objective and the filters. The gap is marked so the model knows it is partial.
 */
export function truncateSqlForBudget(sql: string, budgetTokens: number): TruncatedSql {
  const originalTokens = estimateTokens(sql);
  if (originalTokens <= budgetTokens) {
    return { sql, truncated: false, omittedLines: 0, originalTokens, sentTokens: originalTokens };
  }

  const lines = sql.split(/\r?\n/);
  if (lines.length < 4) {
    // A few very long lines: fall back to a character cut rather than dropping everything.
    const keepChars = Math.max(200, budgetTokens * 3);
    const cut = `${sql.slice(0, keepChars)}\n/* ... query truncated to fit the model context window ... */`;
    return {
      sql: cut,
      truncated: true,
      omittedLines: 0,
      originalTokens,
      sentTokens: estimateTokens(cut),
    };
  }

  let head = 0;
  let tail = 0;
  let used = estimateTokens('\n/* ... 0 lines omitted to fit the model context window ... */\n');
  // Grow the head and tail alternately, head-first so CTE definitions survive.
  while (head + tail < lines.length) {
    const nextIsHead = head <= tail;
    const candidate = nextIsHead ? lines[head] : lines[lines.length - 1 - tail];
    const cost = estimateTokens(candidate) + 1;
    if (used + cost > budgetTokens) break;
    used += cost;
    if (nextIsHead) head += 1;
    else tail += 1;
  }

  // Always keep at least the first line so the statement type is visible.
  if (head === 0 && tail === 0) head = 1;

  const omittedLines = Math.max(0, lines.length - head - tail);
  const parts = [
    ...lines.slice(0, head),
    `/* ... ${omittedLines} lines omitted to fit the model context window ... */`,
    ...(tail > 0 ? lines.slice(lines.length - tail) : []),
  ];
  const cut = parts.join('\n');
  return {
    sql: cut,
    truncated: omittedLines > 0,
    omittedLines,
    originalTokens,
    sentTokens: estimateTokens(cut),
  };
}

export interface TrimmableMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface TrimmedMessages<T extends TrimmableMessage> {
  messages: T[];
  /** Number of older messages dropped to fit the budget. */
  droppedMessages: number;
  estimatedTokens: number;
}

/**
 * Keeps a conversation inside `budgetTokens` by dropping the oldest exchanges. System
 * messages and the latest user turn are always preserved — without them the model loses
 * both its instructions and the actual question.
 */
export function trimMessagesForBudget<T extends TrimmableMessage>(
  messages: T[],
  budgetTokens: number
): TrimmedMessages<T> {
  const cost = (message: T) => estimateTokens(message.content) + 4;
  const system = messages.filter((message) => message.role === 'system');
  const rest = messages.filter((message) => message.role !== 'system');

  let used = system.reduce((total, message) => total + cost(message), 0);
  const kept: T[] = [];

  // Walk backwards so the most recent turns win the remaining budget.
  for (let index = rest.length - 1; index >= 0; index -= 1) {
    const message = rest[index];
    const next = used + cost(message);
    // The newest turn is mandatory even if it alone blows the budget; the caller has already
    // truncated the query, and an over-budget question is better than an empty request.
    if (next > budgetTokens && kept.length > 0) break;
    kept.unshift(message);
    used = next;
  }

  return {
    messages: [...system, ...kept],
    droppedMessages: rest.length - kept.length,
    estimatedTokens: used,
  };
}
