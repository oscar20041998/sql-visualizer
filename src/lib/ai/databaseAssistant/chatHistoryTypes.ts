/**
 * Persisted shapes for Database AI Assistant conversation history.
 * Authority for all stored and in-memory conversation state.
 *
 * Storage location: browser localStorage under
 * `sql-visualizer:database-ai-assistant:chat-history:<identityKey>`
 *
 * Design notes (research.md):
 * - No `recencyGroup`, `messageCount`, `preview`, or `archived` fields (all derivable)
 * - One `updatedAt` ≡ `lastUsedAt` (one field, one meaning)
 * - Messages are append-only; no partial answer is ever persisted
 * - A conversation is self-contained; no cross-conversation references
 */

import { DatabaseKnowledgeSource } from '@/lib/ai/databaseAssistant';

/**
 * One message (question or answer) within a conversation.
 * A partial answer is never stored — if streaming is interrupted, the message does not exist.
 * (research.md R7)
 */
export interface StoredMessage {
  /** Unique ID within the conversation (generated once, stable) — FR-002 */
  id: string;

  /** 'user' for questions, 'assistant' for answers — FR-012 */
  role: 'user' | 'assistant';

  /** Full text as sent or full completed answer; never empty when stored — FR-012 */
  content: string;

  /** Unix epoch milliseconds when this message was created — Key Entities */
  createdAt: number;

  /** For assistant messages: grounding source labels from retrieval — FR-012 */
  sources?: DatabaseKnowledgeSource[];

  /** For assistant messages: whether grounding was actually used (distinguishes "no sources found" from "grounding unavailable") — FR-012, Key Entities */
  grounded?: boolean;

  /** For assistant messages: which model/provider produced it (e.g., 'ollama:qwen2.5-coder:7b', 'openai:gpt-4o') — Key Entities */
  model?: string;
}

/**
 * One conversation thread: a series of questions and answers on a single topic.
 * Self-contained; no references to other conversations.
 */
export interface StoredConversation {
  /** Stable ID, never an index or position — FR-002 */
  id: string;

  /** The identityKey that owns this conversation (denormalised from partition for cross-check) — FR-030, FR-043 */
  ownerId: string;

  /** Title: either auto-derived from the first question or user-entered; never empty — FR-004, FR-005 */
  title: string;

  /** Whether this title was manually set (true) or auto-derived (false); once true, always true — FR-005 */
  titleIsCustom: boolean;

  /** Chronological messages in this conversation, oldest first — FR-012 */
  messages: StoredMessage[];

  /** Unix epoch milliseconds when the conversation was created, set once — Key Entities */
  createdAt: number;

  /** Unix epoch milliseconds when this conversation was last used (created, question sent, answer completed, or switched to) — FR-015, FR-016 */
  lastUsedAt: number;

  /** Record-level reconcile marker for a future server-backed history — Appendix constraint */
  version: number;
}

/**
 * Complete persisted history for one identity.
 * Stored under one key per identity partition (research.md R1).
 */
export interface StoredHistory {
  /** Schema version for future migrations */
  version: number;

  /** The identityKey that owns this entire payload (for validation on load) — FR-030, FR-043 */
  ownerId: string;

  /** Which conversation is currently open (nullable; may dangle after deletion → fallback) — FR-011 */
  activeConversationId: string | null;

  /** All conversations for this identity, unordered (apply recency grouping at render time) — FR-015 */
  conversations: StoredConversation[];
}

/** Type guard: is this an object a StoredMessage? */
export function isStoredMessage(value: unknown): value is StoredMessage {
  if (typeof value !== 'object' || value === null) return false;
  const msg = value as Record<string, unknown>;

  // Required fields
  if (typeof msg.id !== 'string' || msg.id === '') return false;
  if (msg.role !== 'user' && msg.role !== 'assistant') return false;
  if (typeof msg.content !== 'string' || msg.content === '') return false;
  if (typeof msg.createdAt !== 'number' || !isFinite(msg.createdAt)) return false;

  // Optional grounding fields (assistant only)
  if (msg.sources !== undefined) {
    if (!Array.isArray(msg.sources)) return false;
    if (
      !msg.sources.every(
        (s) =>
          typeof s === 'object' &&
          s !== null &&
          typeof (s as Record<string, unknown>).sourceFile === 'string' &&
          (!('section' in s) || typeof (s as Record<string, unknown>).section === 'string') &&
          (!('pageAnchor' in s) || typeof (s as Record<string, unknown>).pageAnchor === 'string')
      )
    ) {
      return false;
    }
  }
  if (msg.grounded !== undefined && typeof msg.grounded !== 'boolean') return false;
  if (msg.model !== undefined && typeof msg.model !== 'string') return false;

  return true;
}

/** Type guard: is this an object a StoredConversation? */
export function isStoredConversation(value: unknown): value is StoredConversation {
  if (typeof value !== 'object' || value === null) return false;
  const conv = value as Record<string, unknown>;

  // Required fields
  if (typeof conv.id !== 'string' || conv.id === '') return false;
  if (typeof conv.ownerId !== 'string' || conv.ownerId === '') return false;
  if (typeof conv.title !== 'string' || conv.title === '') return false;
  if (typeof conv.titleIsCustom !== 'boolean') return false;
  if (!Array.isArray(conv.messages)) return false;
  if (typeof conv.createdAt !== 'number' || !isFinite(conv.createdAt)) return false;
  if (typeof conv.lastUsedAt !== 'number' || !isFinite(conv.lastUsedAt)) return false;
  if (typeof conv.version !== 'number' || !isFinite(conv.version)) return false;

  // Validate messages (drop invalid ones per FR-035, but conversation survives)
  if (!conv.messages.every((m) => typeof m === 'object' && m !== null)) return false;

  return true;
}

/** Type guard: is this an object a StoredHistory? */
export function isStoredHistory(value: unknown): value is StoredHistory {
  if (typeof value !== 'object' || value === null) return false;
  const hist = value as Record<string, unknown>;

  if (typeof hist.version !== 'number' || !isFinite(hist.version)) return false;
  if (typeof hist.ownerId !== 'string' || hist.ownerId === '') return false;
  if (hist.activeConversationId !== null && typeof hist.activeConversationId !== 'string') {
    return false;
  }
  if (!Array.isArray(hist.conversations)) return false;
  if (!hist.conversations.every((c) => typeof c === 'object' && c !== null)) return false;

  return true;
}

/** Current schema version for StoredHistory records */
export const DB_ASSISTANT_HISTORY_VERSION = 1;

/** Legacy storage key (pre-identity partitioning) — used for one-time adoption (research.md R1) */
export const DB_ASSISTANT_LEGACY_STORAGE_KEY = 'sql-visualizer:database-ai-assistant:chat-history';

/** Storage key prefix (identity partition appended as suffix) */
export const DB_ASSISTANT_STORAGE_KEY_PREFIX = 'sql-visualizer:database-ai-assistant:chat-history:';

/** Build the full storage key for a given identity */
export function buildStorageKey(identityKey: string): string {
  return `${DB_ASSISTANT_STORAGE_KEY_PREFIX}${identityKey}`;
}
