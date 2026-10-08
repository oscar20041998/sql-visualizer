/**
 * Zustand store for Database AI Assistant conversation history state management.
 *
 * Separate from useAppStore to:
 * - Keep conversation persistence logic isolated
 * - Handle async initialization (load from storage on mount)
 * - Manage the conversation collection lifecycle
 * - Enforce write discipline (one write per completed answer, zero during streaming)
 *
 * The active conversation's messages are exposed as a projection to `useAppStore`'s
 * `databaseAssistantHistory` for backward compatibility with existing call sites.
 * (SC-015, FR-042)
 */

'use client';

import { create } from 'zustand';
import {
  type StoredConversation,
  type StoredHistory,
  type StoredMessage,
  DB_ASSISTANT_HISTORY_VERSION,
} from '@/lib/ai/databaseAssistant/chatHistoryTypes';
import { databaseAssistantHistoryStorage } from '@/lib/ai/databaseAssistant/chatHistoryLocalStorage';
import { getCachedHistoryIdentity } from '@/lib/ai/databaseAssistant/chatHistoryIdentity';
import { deriveTitleFromQuestion } from '@/lib/ai/databaseAssistant/chatHistoryHelpers';

/**
 * Conversation history state.
 * All operations are in-memory only; persistence happens through the storage contract.
 */
interface ConversationHistoryState {
  // State: conversation collection
  conversations: StoredConversation[];

  // State: which conversation is currently open (null = empty history state)
  activeConversationId: string | null;

  // State: is storage available (for the UI to show/hide the history panel)
  isStorageAvailable: boolean;

  // State: has initialization completed (prevents duplicate loads)
  isInitialized: boolean;

  // Actions: initialization (called once on mount)
  initializeHistory: (identityKey: string | null) => void;

  // Actions: conversation lifecycle
  createNewConversation: () => string; // Returns the new conversation ID
  setActiveConversation: (conversationId: string | null) => void;
  renameConversation: (conversationId: string, newTitle: string) => void;
  deleteConversation: (conversationId: string) => void;
  clearAllConversations: () => void;

  // Actions: message management
  addMessageToConversation: (
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    sources?: Array<{ sourceFile: string; section?: string; pageAnchor?: string }>,
    grounded?: boolean,
    model?: string
  ) => string; // Returns the message ID

  // Actions: mark answer as complete (triggers storage write)
  completeLastMessage: (conversationId: string) => void;

  // Actions: restore from storage after identity changes
  resetForIdentity: (identityKey: string | null) => void;
}

/**
 * Get the stored identity key for the current session.
 * This must be called fresh on each operation that requires identity.
 */
function getCurrentIdentityKey(): string | null {
  return getCachedHistoryIdentity();
}

/**
 * Helper: create a new empty conversation with a given title.
 */
function createEmptyConversation(title: string, identityKey: string): StoredConversation {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    ownerId: identityKey,
    title,
    titleIsCustom: false,
    messages: [],
    createdAt: now,
    lastUsedAt: now,
    version: DB_ASSISTANT_HISTORY_VERSION,
  };
}

/**
 * Helper: persist the current state to storage.
 * Called after mutations that should be written (create, add message, rename, delete, etc.).
 * Automatically skipped if storage is unavailable (session continues in memory only).
 */
function persistToStorage(state: ConversationHistoryState): void {
  const identityKey = getCurrentIdentityKey();
  if (!identityKey || !state.isStorageAvailable) {
    return; // No identity or storage unavailable; skip write
  }

  const payload: StoredHistory = {
    version: DB_ASSISTANT_HISTORY_VERSION,
    ownerId: identityKey,
    activeConversationId: state.activeConversationId,
    conversations: state.conversations,
  };

  const storage = databaseAssistantHistoryStorage;
  const result = storage.save(payload);

  // Errors are logged but don't block the session (FR-031, FR-033)
  if (result instanceof Error) {
    console.warn('[db-assistant-history] Persistence failed:', result.message);
  }
}

export const useDatabaseAssistantHistoryStore = create<ConversationHistoryState>()((set, get) => ({
  // Initial state
  conversations: [],
  activeConversationId: null,
  isStorageAvailable: true,
  isInitialized: false,

  // Initialize: load from storage once after mount
  initializeHistory: (identityKey: string | null) => {
    const state = get();
    if (state.isInitialized) {
      return; // Already initialized
    }

    const storage = databaseAssistantHistoryStorage;
    const result = storage.load(identityKey);

    if (result instanceof Error) {
      // Storage error: work in memory only (FR-031, FR-033)
      console.warn('[db-assistant-history] Storage unavailable:', result.message);
      set({ isStorageAvailable: false, isInitialized: true });
      return;
    }

    // Storage is available; load conversations
    const { conversations, activeConversationId } = result;

    // Fallback to first conversation if active ID is invalid
    const validActiveId =
      activeConversationId && conversations.some((c) => c.id === activeConversationId)
        ? activeConversationId
        : conversations.length > 0
          ? conversations[0].id
          : null;

    set({
      conversations,
      activeConversationId: validActiveId,
      isStorageAvailable: true,
      isInitialized: true,
    });
  },

  // Create a new conversation (empty, auto-titled "Untitled")
  createNewConversation: () => {
    const identityKey = getCurrentIdentityKey();
    if (!identityKey) {
      throw new Error('Cannot create conversation without identity');
    }

    const newConv = createEmptyConversation('Untitled', identityKey);

    set((state) => ({
      conversations: [...state.conversations, newConv],
      activeConversationId: newConv.id,
    }));

    const state = get();
    persistToStorage(state);

    return newConv.id;
  },

  // Switch to a different conversation
  setActiveConversation: (conversationId: string | null) => {
    set((state) => {
      // Validate ID exists if not null
      if (conversationId !== null && !state.conversations.some((c) => c.id === conversationId)) {
        console.warn(
          '[db-assistant-history] Cannot activate nonexistent conversation',
          conversationId
        );
        return {};
      }

      const updated: Partial<ConversationHistoryState> = { activeConversationId: conversationId };

      // Update lastUsedAt on the switched conversation
      if (conversationId) {
        const conv = state.conversations.find((c) => c.id === conversationId);
        if (conv) {
          conv.lastUsedAt = Date.now();
        }
      }

      return updated;
    });

    const state = get();
    persistToStorage(state);
  },

  // Rename a conversation
  renameConversation: (conversationId: string, newTitle: string) => {
    set((state) => {
      const conv = state.conversations.find((c) => c.id === conversationId);
      if (!conv) {
        console.warn(
          '[db-assistant-history] Cannot rename nonexistent conversation',
          conversationId
        );
        return {};
      }

      // Refuse empty title
      if (!newTitle || !newTitle.trim()) {
        console.warn('[db-assistant-history] Cannot rename to empty title');
        return {};
      }

      conv.title = newTitle.trim();
      conv.titleIsCustom = true;
      // Note: do NOT update lastUsedAt on rename (research.md R11)

      return { conversations: [...state.conversations] };
    });

    const state = get();
    persistToStorage(state);
  },

  // Delete a conversation
  deleteConversation: (conversationId: string) => {
    set((state) => {
      const index = state.conversations.findIndex((c) => c.id === conversationId);
      if (index < 0) {
        console.warn(
          '[db-assistant-history] Cannot delete nonexistent conversation',
          conversationId
        );
        return {};
      }

      const remaining = state.conversations.filter((_, i) => i !== index);

      // If we deleted the active conversation, fallback to the first remaining or null
      let newActiveId = state.activeConversationId;
      if (state.activeConversationId === conversationId) {
        newActiveId = remaining.length > 0 ? remaining[0].id : null;
      }

      return { conversations: remaining, activeConversationId: newActiveId };
    });

    const state = get();
    persistToStorage(state);
  },

  // Clear all conversations
  clearAllConversations: () => {
    set({ conversations: [], activeConversationId: null });

    const state = get();
    persistToStorage(state);
  },

  // Add a message to the active conversation
  // Called per streamed fragment for assistant, or once for user messages.
  // Only the last completed assistant answer is stored; partial answers are discarded on error/stop.
  addMessageToConversation: (
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    sources?: Array<{ sourceFile: string; section?: string; pageAnchor?: string }>,
    grounded?: boolean,
    model?: string
  ): string => {
    let messageId = '';

    set((state) => {
      const conv = state.conversations.find((c) => c.id === conversationId);
      if (!conv) {
        console.warn(
          '[db-assistant-history] Cannot add message to nonexistent conversation',
          conversationId
        );
        return {};
      }

      const now = Date.now();
      messageId = crypto.randomUUID();

      const msg: StoredMessage = {
        id: messageId,
        role,
        content,
        createdAt: now,
        ...(sources && { sources }),
        ...(grounded !== undefined && { grounded }),
        ...(model && { model }),
      };

      conv.messages.push(msg);
      conv.lastUsedAt = now;

      return { conversations: [...state.conversations] };
    });

    // Do NOT persist during streaming; persistence happens on completeLastMessage() only
    // (SC-008, FR-013)

    return messageId;
  },

  // Mark the last message as complete (for assistant answers).
  // This triggers the storage write. Called after streaming ends, before allowing the next question.
  completeLastMessage: (conversationId: string) => {
    // For now, this just triggers a write (the message was already added by addMessageToConversation).
    // In the future, this is where we'd clear an isStreaming flag if we tracked partial state.
    const state = get();
    persistToStorage(state);
  },

  // Reset state when identity changes (sign out, sign in, switch identity).
  // Clears all conversations to prevent cross-identity leakage (FR-043).
  resetForIdentity: (identityKey: string | null) => {
    if (!identityKey) {
      // No identity: clear everything
      set({ conversations: [], activeConversationId: null, isInitialized: false });
    } else {
      // Identity changed: re-initialize from the new partition
      set({ conversations: [], activeConversationId: null, isInitialized: false });
      get().initializeHistory(identityKey);
    }
  },
}));
