/**
 * Helper functions for conversation history: title derivation, ordering, grouping, and search.
 *
 * These are pure functions: no I/O, no async, no side effects.
 * All operations assume data is already loaded and valid.
 *
 * (research.md R6, R10, R11)
 */

import { StoredConversation } from '@/lib/ai/databaseAssistant/chatHistoryTypes';

/**
 * Derive a human-readable title from a user's first question.
 *
 * Rules (research.md R6):
 * - Truncate to ~50 chars at a word boundary (not mid-word)
 * - Never empty; fallback to "Untitled" for edge cases (very short, punctuation-only, etc.)
 * - Strip leading/trailing punctuation
 * - Preserve internal punctuation (e.g., "What's the difference?" is ok)
 *
 * Edge cases handled:
 * - One-word questions: truncated gracefully
 * - Very long paragraphs: broken at word boundary
 * - Punctuation-only: fallback to "Untitled"
 * - Whitespace-only: fallback to "Untitled"
 * - Non-ASCII (other languages): preserved as-is
 *
 * @param question - The user's first question text
 * @returns A concise, readable title (never empty)
 */
export function deriveTitleFromQuestion(question: string): string {
  if (!question || typeof question !== 'string') {
    return 'Untitled';
  }

  // Trim whitespace
  let trimmed = question.trim();

  if (!trimmed) {
    return 'Untitled';
  }

  // Strip leading punctuation
  trimmed = trimmed.replace(/^[^\w\s]+/, '').trim();

  // Strip trailing punctuation (but preserve internal punctuation like apostrophes)
  trimmed = trimmed.replace(/[^\w\s]+$/, '').trim();

  if (!trimmed) {
    return 'Untitled';
  }

  // Target length: ~50 chars, but break at word boundary
  const maxLength = 50;

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  // Truncate at word boundary
  const truncated = trimmed.substring(0, maxLength);

  // Find the last space before maxLength
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  if (lastSpaceIndex > 0) {
    // Break at the last space
    return trimmed.substring(0, lastSpaceIndex).trim();
  }

  // No space found (one long word); truncate and add ellipsis
  return truncated.trim() + '…';
}

/**
 * Recency group for grouping conversations by how recently they were used.
 */
export type RecencyGroup = 'today' | 'yesterday' | 'previousSevenDays' | 'older';

/**
 * Determine which recency group a conversation belongs to.
 *
 * Groups based on `lastUsedAt` relative to local midnight boundaries.
 * (research.md R11 — known limitation: timezone assumptions)
 *
 * @param lastUsedAt - Epoch milliseconds when the conversation was last used
 * @param now - Current time (epoch ms) — defaults to Date.now()
 * @returns The recency group
 */
export function getRecencyGroup(lastUsedAt: number, now = Date.now()): RecencyGroup {
  // Convert to local midnight boundaries (simplification: assume user's timezone)
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const yesterday = new Date(todayMs - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(todayMs - 7 * 24 * 60 * 60 * 1000);

  if (lastUsedAt >= todayMs) {
    return 'today';
  } else if (lastUsedAt >= yesterday.getTime()) {
    return 'yesterday';
  } else if (lastUsedAt >= sevenDaysAgo.getTime()) {
    return 'previousSevenDays';
  } else {
    return 'older';
  }
}

/**
 * Grouped conversations by recency.
 */
export interface GroupedConversations {
  today: StoredConversation[];
  yesterday: StoredConversation[];
  previousSevenDays: StoredConversation[];
  older: StoredConversation[];
}

/**
 * Group conversations by recency and order each group by lastUsedAt (newest first).
 *
 * Returns a structure with four groups, each sorted in descending order (most recent first).
 * (FR-015, FR-016; research.md R11)
 *
 * @param conversations - All conversations for this identity
 * @param now - Current time (defaults to Date.now()) — for testing
 * @returns Grouped and sorted conversations
 */
export function groupConversationsByRecency(
  conversations: StoredConversation[],
  now = Date.now()
): GroupedConversations {
  const groups: GroupedConversations = {
    today: [],
    yesterday: [],
    previousSevenDays: [],
    older: [],
  };

  for (const conv of conversations) {
    const group = getRecencyGroup(conv.lastUsedAt, now);
    groups[group].push(conv);
  }

  // Sort each group by lastUsedAt descending (most recent first)
  for (const group of Object.values(groups)) {
    group.sort((a: StoredConversation, b: StoredConversation) => b.lastUsedAt - a.lastUsedAt);
  }

  return groups;
}

/**
 * Search conversations by title and question text (not answers).
 *
 * Case-insensitive substring match.
 * Searches in: conversation title + all user messages (role === 'user').
 * Does NOT search in assistant answers (role === 'assistant') — see FR-021.
 *
 * Returns conversations that match the query, in original order (unordered).
 *
 * @param conversations - All conversations for this identity
 * @param query - Search term (trimmed; empty query returns all)
 * @returns Filtered conversations
 */
export function searchConversations(
  conversations: StoredConversation[],
  query: string
): StoredConversation[] {
  const trimmedQuery = query.trim().toLowerCase();

  if (!trimmedQuery) {
    // Empty query returns all
    return conversations;
  }

  return conversations.filter((conv) => {
    // Search in title
    if (conv.title.toLowerCase().includes(trimmedQuery)) {
      return true;
    }

    // Search in user messages only (not assistant answers)
    for (const msg of conv.messages) {
      if (msg.role === 'user' && msg.content.toLowerCase().includes(trimmedQuery)) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Flatten a GroupedConversations structure into a single ordered list.
 * Order: today → yesterday → previousSevenDays → older
 *
 * @param grouped - Result of groupConversationsByRecency()
 * @returns Flat array in recency order
 */
export function flattenGroupedConversations(grouped: GroupedConversations): StoredConversation[] {
  return [...grouped.today, ...grouped.yesterday, ...grouped.previousSevenDays, ...grouped.older];
}
