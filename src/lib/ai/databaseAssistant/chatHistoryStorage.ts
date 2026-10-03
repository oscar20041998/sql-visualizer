/**
 * DatabaseAssistantHistoryStorage contract.
 *
 * This is a replaceable abstraction for persisting conversation history (FR-042).
 * The browser-local implementation lives in chatHistoryLocalStorage.ts.
 * A future server-backed implementation can be swapped without changes to store or UI logic.
 *
 * Contract invariants (research.md):
 * - G-ID-1: No async initialization; all methods are synchronous
 * - G-ID-2: All three methods are idempotent when called with the same arguments
 * - G-ID-3: Read never mutates the payload
 * - G-ID-4: No network requests or sensitive data transmission
 * - G-ID-5: Errors are returned as objects, never thrown; the app continues
 */

import type { StoredHistory } from '@/lib/ai/databaseAssistant/chatHistoryTypes';

/** Error when storage is unavailable (blocked by browser, private window, etc.) */
export class StorageUnavailableError extends Error {
  constructor(message = 'Storage is unavailable') {
    super(message);
    this.name = 'StorageUnavailableError';
  }
}

/** Error when storage quota is exceeded */
export class StorageQuotaExceededError extends Error {
  constructor(message = 'Storage quota exceeded') {
    super(message);
    this.name = 'StorageQuotaExceededError';
  }
}

/** Error when stored data is corrupted or unreadable */
export class StorageCorruptError extends Error {
  constructor(message = 'Storage data is corrupted') {
    super(message);
    this.name = 'StorageCorruptError';
  }
}

export type StorageError = StorageUnavailableError | StorageQuotaExceededError | StorageCorruptError;

export function isStorageError(err: unknown): err is StorageError {
  return (
    err instanceof StorageUnavailableError ||
    err instanceof StorageQuotaExceededError ||
    err instanceof StorageCorruptError
  );
}

/**
 * Abstract interface for persisting conversation history.
 *
 * All methods are synchronous (no async, no Promises).
 * All methods return errors as result objects, never throw (FR-031, FR-033, FR-034, FR-035).
 * The contract handles migration of legacy keys and validation of payloads.
 */
export interface DatabaseAssistantHistoryStorage {
  /**
   * Load history for the given identity key.
   *
   * On successful read: returns the validated StoredHistory.
   * If the key doesn't exist: returns an empty StoredHistory with zero conversations.
   * If the payload is corrupted: returns a StorageCorruptError (app shows empty history, no crash).
   * If storage is blocked: returns a StorageUnavailableError (app continues in memory only).
   * If quota is exceeded: returns a StorageQuotaExceededError (session continues, no persistence).
   *
   * On first call with a valid identity, checks for legacy undifferentiated key and adopts it:
   * - Reads the legacy key `sql-visualizer:database-ai-assistant:chat-history`
   * - If found and this identity's own partition is empty or missing, merges into the partition
   * - Deletes the legacy key (adoption is one-time, not repeated)
   * - (research.md R1)
   *
   * @param identityKey - The partition key for this identity (or null to disable storage)
   * @returns StoredHistory or an error object
   */
  load(identityKey: string | null): StoredHistory | StorageError;

  /**
   * Persist the given history for the identity owning it.
   *
   * On successful write: returns the same payload (idempotent).
   * On quota exceeded: returns a StorageQuotaExceededError (payload not written, session continues).
   * On other storage errors: returns an error object (payload may be partially written).
   *
   * The method MUST validate that payload.ownerId matches the partition being written.
   * A mismatch is a corruption indicator and MUST return StorageCorruptError.
   *
   * @param payload - The history to persist (must include ownerId)
   * @returns The same payload on success, or an error object
   */
  save(payload: StoredHistory): StoredHistory | StorageError;

  /**
   * Clear all conversations for the identity owning the given payload.
   *
   * On successful clear: returns an empty StoredHistory with the same ownerId.
   * On storage errors: returns an error object.
   *
   * The method MUST clear only the partition identified by payload.ownerId,
   * never any other identity's data or the legacy key.
   *
   * @param payload - The history to clear (identifies the partition by ownerId)
   * @returns Empty StoredHistory or an error object
   */
  clear(payload: StoredHistory): StoredHistory | StorageError;
}

/**
 * Determine if a result is a successful load/save/clear or an error.
 * @param result - The return value from a storage method
 * @returns true if it's an error, false if it's a StoredHistory
 */
export function isStorageResult(result: StoredHistory | StorageError): result is StorageError {
  return isStorageError(result);
}
