/**
 * Browser localStorage implementation of DatabaseAssistantHistoryStorage.
 *
 * Persists conversation history using browser localStorage with identity-based partitioning.
 * Handles quota errors, corrupted data, and legacy key migration gracefully.
 *
 * Storage key format: `sql-visualizer:database-ai-assistant:chat-history:<identityKey>`
 * Legacy key (one-time adoption): `sql-visualizer:database-ai-assistant:chat-history` (no suffix)
 * (research.md R1)
 */

import {
  StoredHistory,
  isStoredHistory,
  isStoredConversation,
  StoredMessage,
  buildStorageKey,
  DB_ASSISTANT_HISTORY_VERSION,
  DB_ASSISTANT_LEGACY_STORAGE_KEY,
  DB_ASSISTANT_STORAGE_KEY_PREFIX,
} from '@/lib/ai/databaseAssistant/chatHistoryTypes';
import {
  DatabaseAssistantHistoryStorage,
  StorageCorruptError,
  StorageQuotaExceededError,
  StorageUnavailableError,
  StorageError,
} from '@/lib/ai/databaseAssistant/chatHistoryStorage';

/**
 * Check if browser has localStorage available and accessible.
 * Try a test write to detect blocking (private window, quota, etc.).
 */
function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Validate and normalize a loaded StoredHistory payload.
 * Drops invalid conversations (per FR-035) but keeps the container.
 * Normalises timestamps: if lastUsedAt < createdAt, clamps lastUsedAt to createdAt.
 * Removes duplicate conversation IDs (keeps first).
 */
function normaliseLoadedHistory(payload: unknown): StoredHistory | null {
  if (!isStoredHistory(payload)) {
    return null;
  }

  const hist = payload as StoredHistory;
  const seen = new Set<string>();
  hist.conversations = hist.conversations.filter((conv) => {
    // Type-check again per normalization rules (data-model.md)
    if (!isStoredConversation(conv)) {
      return false; // Drop invalid conversation (FR-035)
    }
    if (seen.has(conv.id)) {
      return false; // Drop duplicate ID
    }
    seen.add(conv.id);

    // Normalise timestamps
    if (conv.lastUsedAt < conv.createdAt) {
      conv.lastUsedAt = conv.createdAt;
    }

    // Drop invalid messages but keep conversation (FR-035)
    conv.messages = conv.messages.filter((msg) => {
      if (typeof msg !== 'object' || msg === null) return false;
      const m = msg as unknown as Record<string, unknown>;

      // Basic validation (full validation is in isStoredMessage in chatHistoryTypes.ts)
      if (typeof m.id !== 'string' || m.id === '') return false;
      if (m.role !== 'user' && m.role !== 'assistant') return false;
      if (typeof m.content !== 'string' || m.content === '') return false;
      if (typeof m.createdAt !== 'number' || !isFinite(m.createdAt)) return false;

      return true;
    });

    return true; // Keep conversation
  });

  return hist;
}

/**
 * Adopt legacy undifferentiated storage key if the conditions are met (research.md R1).
 * Conditions:
 * 1. The identity has a real signed-in identity (identityKey is not null)
 * 2. That identity's own partition is absent or empty
 * 3. The legacy key exists with a valid payload
 *
 * On adoption: writes the legacy payload into the identity's partition, deletes the legacy key.
 * Never called for guests or signed-out browsers (identityKey === null).
 * Never overwrites an identity's own data.
 *
 * @param identityKey - The partition key
 * @returns The adopted payload (if conditions met), or null (no legacy to adopt)
 */
function adoptLegacyKeyIfNeeded(identityKey: string): StoredHistory | null {
  // Only for real identities
  if (!identityKey || typeof identityKey !== 'string') {
    return null;
  }

  // Check if this identity already has a partition
  const targetKey = buildStorageKey(identityKey);
  try {
    const existing = localStorage.getItem(targetKey);
    if (existing && existing.trim()) {
      // Identity already has data; don't overwrite
      return null;
    }
  } catch (e) {
    // Storage unavailable; can't check, don't adopt
    return null;
  }

  // Try to read and validate the legacy key
  let legacyData: unknown;
  try {
    const raw = localStorage.getItem(DB_ASSISTANT_LEGACY_STORAGE_KEY);
    if (!raw || !raw.trim()) {
      return null; // Legacy key doesn't exist or is empty
    }
    legacyData = JSON.parse(raw);
  } catch (e) {
    // Legacy key is corrupted or doesn't contain valid JSON; abandon it
    return null;
  }

  const legacyPayload = normaliseLoadedHistory(legacyData);
  if (!legacyPayload) {
    return null; // Legacy payload is malformed
  }

  // Adopt: write to the identity's partition and delete the legacy key
  try {
    legacyPayload.ownerId = identityKey;
    const json = JSON.stringify(legacyPayload);
    localStorage.setItem(targetKey, json);
    localStorage.removeItem(DB_ASSISTANT_LEGACY_STORAGE_KEY);
    return legacyPayload;
  } catch (e) {
    // Adoption failed (quota, inaccessible); leave legacy key intact
    return null;
  }
}

/**
 * Browser localStorage implementation of DatabaseAssistantHistoryStorage.
 * Singleton instance exported below.
 */
class LocalStorageImpl implements DatabaseAssistantHistoryStorage {
  load(identityKey: string | null): StoredHistory | StorageError {
    // Guests and signed-out browsers: storage disabled
    if (identityKey === null) {
      // Return empty history without reading storage
      return {
        version: DB_ASSISTANT_HISTORY_VERSION,
        ownerId: '',
        activeConversationId: null,
        conversations: [],
      };
    }

    // Check storage availability
    if (!isStorageAvailable()) {
      return new StorageUnavailableError('localStorage is not available');
    }

    // Try to adopt legacy key first (one-time migration)
    const adopted = adoptLegacyKeyIfNeeded(identityKey);
    if (adopted) {
      return adopted;
    }

    // Read the identity's partition
    const key = buildStorageKey(identityKey);
    try {
      const raw = localStorage.getItem(key);

      if (!raw || !raw.trim()) {
        // Empty partition; create new
        return {
          version: DB_ASSISTANT_HISTORY_VERSION,
          ownerId: identityKey,
          activeConversationId: null,
          conversations: [],
        };
      }

      // Parse and validate
      const payload = JSON.parse(raw);
      const normalised = normaliseLoadedHistory(payload);

      if (!normalised) {
        // Corrupted data; return error (app shows empty history, no crash)
        return new StorageCorruptError(`History for ${identityKey} is corrupted`);
      }

      // Validate ownership: ownerId must match the partition
      if (normalised.ownerId !== identityKey) {
        return new StorageCorruptError(
          `History ownership mismatch: partition ${identityKey}, but payload claims ${normalised.ownerId}`
        );
      }

      return normalised;
    } catch (e) {
      if (e instanceof SyntaxError) {
        // JSON parse error
        return new StorageCorruptError(`History for ${identityKey}: invalid JSON`);
      }
      // Other error (quota, SecurityError, etc.)
      return new StorageUnavailableError(e instanceof Error ? e.message : 'Unable to read storage');
    }
  }

  save(payload: StoredHistory): StoredHistory | StorageError {
    const identityKey = payload.ownerId;

    // Validate ownership
    if (!identityKey || typeof identityKey !== 'string') {
      return new StorageCorruptError('Payload ownerId is invalid or missing');
    }

    // Check storage availability
    if (!isStorageAvailable()) {
      return new StorageUnavailableError('localStorage is not available');
    }

    const key = buildStorageKey(identityKey);

    try {
      const json = JSON.stringify(payload);
      localStorage.setItem(key, json);
      return payload; // Idempotent: return the same payload
    } catch (e) {
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        return new StorageQuotaExceededError('localStorage quota exceeded');
      }
      // SecurityError, NotSupportedError, or other storage errors
      return new StorageUnavailableError(
        e instanceof Error ? e.message : 'Unable to write storage'
      );
    }
  }

  clear(payload: StoredHistory): StoredHistory | StorageError {
    const identityKey = payload.ownerId;

    // Validate ownership
    if (!identityKey || typeof identityKey !== 'string') {
      return new StorageCorruptError('Payload ownerId is invalid or missing');
    }

    // Check storage availability
    if (!isStorageAvailable()) {
      return new StorageUnavailableError('localStorage is not available');
    }

    const key = buildStorageKey(identityKey);

    try {
      localStorage.removeItem(key);
      // Return empty history with same ownerId
      return {
        version: DB_ASSISTANT_HISTORY_VERSION,
        ownerId: identityKey,
        activeConversationId: null,
        conversations: [],
      };
    } catch (e) {
      // SecurityError or other storage errors
      return new StorageUnavailableError(
        e instanceof Error ? e.message : 'Unable to clear storage'
      );
    }
  }
}

/**
 * Global singleton instance of the browser localStorage implementation.
 * Use this to persist and restore conversation history.
 */
export const databaseAssistantHistoryStorage = new LocalStorageImpl();
