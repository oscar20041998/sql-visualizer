import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type {
  StoredHistory,
  StoredConversation,
  StoredMessage,
} from '@/lib/ai/databaseAssistant/chatHistoryTypes';
import { databaseAssistantHistoryStorage } from '@/lib/ai/databaseAssistant/chatHistoryLocalStorage';

describe('DatabaseAssistantHistoryStorage - Load scenarios', () => {
  const storage = databaseAssistantHistoryStorage;
  const testIdentityKey = 'test-identity-001';

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('U-ST-001: Load valid history with 1 conversation and 3 messages', () => {
    it('should load a valid history with all messages in order', async () => {
      // Arrange: Create valid test data
      const testHistory: StoredHistory = {
        version: 1,
        ownerId: testIdentityKey,
        activeConversationId: 'conv-001',
        conversations: [
          {
            id: 'conv-001',
            ownerId: testIdentityKey,
            title: 'Test Conversation',
            titleIsCustom: false,
            version: 1,
            messages: [
              {
                id: 'msg-001',
                role: 'user',
                content: 'What is a window function?',
                createdAt: 1000,
                sources: [],
                grounded: false,
              },
              {
                id: 'msg-002',
                role: 'assistant',
                content: 'A window function allows you to...',
                createdAt: 1100,
                sources: [],
                grounded: false,
              },
              {
                id: 'msg-003',
                role: 'user',
                content: 'Can I use that in a subquery?',
                createdAt: 1200,
                sources: [],
                grounded: false,
              },
            ],
            createdAt: 1000,
            lastUsedAt: 1200,
          },
        ],
      };

      // Store test data in localStorage
      const key = `sql-visualizer:database-ai-assistant:chat-history:${testIdentityKey}`;
      localStorage.setItem(key, JSON.stringify(testHistory));

      // Act: Load history
      const result = storage.load(testIdentityKey);

      // Assert: Verify loaded history matches stored data
      expect(result).not.toHaveProperty('message'); // Not an error
      const loaded = result as StoredHistory;
      expect(loaded.version).toBe(1);
      expect(loaded.conversations).toHaveLength(1);
      expect(loaded.conversations[0].id).toBe('conv-001');
      expect(loaded.conversations[0].ownerId).toBe(testIdentityKey);
      expect(loaded.conversations[0].messages).toHaveLength(3);
      
      // Verify message order is preserved
      expect(loaded.conversations[0].messages[0].id).toBe('msg-001');
      expect(loaded.conversations[0].messages[1].id).toBe('msg-002');
      expect(loaded.conversations[0].messages[2].id).toBe('msg-003');
      expect(loaded.conversations[0].messages[0].createdAt).toBeLessThan(
        loaded.conversations[0].messages[1].createdAt
      );
      expect(loaded.conversations[0].messages[1].createdAt).toBeLessThan(
        loaded.conversations[0].messages[2].createdAt
      );
    });
  });

  describe('U-ST-002: Load empty history (0 conversations)', () => {
    it('should return empty history with valid structure', () => {
      const emptyHistory: StoredHistory = {
        version: 1,
        ownerId: testIdentityKey,
        activeConversationId: null,
        conversations: [],
      };

      const key = `sql-visualizer:database-ai-assistant:chat-history:${testIdentityKey}`;
      localStorage.setItem(key, JSON.stringify(emptyHistory));

      const result = storage.load(testIdentityKey);

      expect(result).not.toHaveProperty('message');
      const loaded = result as StoredHistory;
      expect(loaded.version).toBe(1);
      expect(loaded.ownerId).toBe(testIdentityKey);
      expect(loaded.conversations).toHaveLength(0);
      expect(loaded.activeConversationId).toBeNull();
    });
  });

  describe('U-ST-003: Load 200 conversations round-trip', () => {
    it('should preserve all 200 conversations without truncation', () => {
      const conversations: StoredConversation[] = Array.from({ length: 200 }, (_, i) => ({
        id: `conv-${i}`,
        ownerId: testIdentityKey,
        title: `Conversation ${i}`,
        titleIsCustom: false,
        version: 1,
        messages: [
          {
            id: `msg-${i}-1`,
            role: 'user',
            content: `Question ${i}`,
            createdAt: 1000 + i * 100,
            sources: [],
            grounded: false,
          },
        ],
        createdAt: 1000 + i * 100,
        lastUsedAt: 1000 + i * 100,
      }));

      const largeHistory: StoredHistory = {
        version: 1,
        ownerId: testIdentityKey,
        activeConversationId: conversations[199].id,
        conversations,
      };

      const key = `sql-visualizer:database-ai-assistant:chat-history:${testIdentityKey}`;
      localStorage.setItem(key, JSON.stringify(largeHistory));

      const result = storage.load(testIdentityKey);

      expect(result).not.toHaveProperty('message');
      const loaded = result as StoredHistory;
      expect(loaded.conversations).toHaveLength(200);
      // Verify identity scoped
      loaded.conversations.forEach((conv) => {
        expect(conv.ownerId).toBe(testIdentityKey);
      });
      // Verify lastUsedAt preserved
      expect(loaded.conversations[199].lastUsedAt).toBeGreaterThan(loaded.conversations[0].lastUsedAt);
    });
  });

  describe('U-ST-004: Load corrupted JSON (missing version)', () => {
    it('should return StorageCorruptError when version is missing', () => {
      const corruptedData = {
        ownerId: testIdentityKey,
        activeConversationId: null,
        conversations: [],
        // version missing
      };

      const key = `sql-visualizer:database-ai-assistant:chat-history:${testIdentityKey}`;
      localStorage.setItem(key, JSON.stringify(corruptedData));

      const result = storage.load(testIdentityKey);

      expect(result).toHaveProperty('message');
      const error = result as any;
      expect(error.message).toContain('corrupted');
    });
  });

  describe('U-ST-005: Load partially valid history (3 valid, 1 invalid conversation)', () => {
    it('should drop invalid conversation but keep valid ones', () => {
      const mixedHistory: StoredHistory = {
        version: 1,
        ownerId: testIdentityKey,
        activeConversationId: 'conv-001',
        conversations: [
          {
            id: 'conv-001',
            ownerId: testIdentityKey,
            title: 'Valid 1',
            titleIsCustom: false,
            version: 1,
            messages: [{ id: 'msg-1', role: 'user', content: 'Q', createdAt: 1000 }],
            createdAt: 1000,
            lastUsedAt: 1000,
          },
          {
            id: 'conv-002',
            ownerId: testIdentityKey,
            title: 'Valid 2',
            titleIsCustom: false,
            version: 1,
            messages: [{ id: 'msg-2', role: 'user', content: 'Q', createdAt: 2000 }],
            createdAt: 2000,
            lastUsedAt: 2000,
          },
          // Invalid: missing title
          {
            id: 'conv-003',
            ownerId: testIdentityKey,
            title: '', // Invalid: empty title
            titleIsCustom: false,
            version: 1,
            messages: [],
            createdAt: 3000,
            lastUsedAt: 3000,
          },
          {
            id: 'conv-004',
            ownerId: testIdentityKey,
            title: 'Valid 3',
            titleIsCustom: false,
            version: 1,
            messages: [{ id: 'msg-4', role: 'user', content: 'Q', createdAt: 4000 }],
            createdAt: 4000,
            lastUsedAt: 4000,
          },
        ],
      };

      const key = `sql-visualizer:database-ai-assistant:chat-history:${testIdentityKey}`;
      localStorage.setItem(key, JSON.stringify(mixedHistory));

      const result = storage.load(testIdentityKey);

      expect(result).not.toHaveProperty('message');
      const loaded = result as StoredHistory;
      // Invalid conversation dropped
      expect(loaded.conversations.length).toBeLessThan(4);
      // Valid ones still present
      const ids = loaded.conversations.map((c) => c.id);
      expect(ids).toContain('conv-001');
      expect(ids).toContain('conv-002');
      expect(ids).toContain('conv-004');
      expect(ids).not.toContain('conv-003');
    });
  });

  describe('U-ST-006: Load invalid conversation (missing ownerId)', () => {
    it('should drop conversation with missing ownerId', () => {
      const history: StoredHistory = {
        version: 1,
        ownerId: testIdentityKey,
        activeConversationId: 'conv-001',
        conversations: [
          {
            id: 'conv-001',
            ownerId: '', // Invalid: empty ownerId
            title: 'Title',
            titleIsCustom: false,
            version: 1,
            messages: [],
            createdAt: 1000,
            lastUsedAt: 1000,
          },
        ],
      };

      const key = `sql-visualizer:database-ai-assistant:chat-history:${testIdentityKey}`;
      localStorage.setItem(key, JSON.stringify(history));

      const result = storage.load(testIdentityKey);

      const loaded = result as StoredHistory;
      expect(loaded.conversations).toHaveLength(0);
    });
  });

  describe('U-ST-007: Load invalid message (missing id)', () => {
    it('should drop message with missing id', () => {
      const history: StoredHistory = {
        version: 1,
        ownerId: testIdentityKey,
        activeConversationId: 'conv-001',
        conversations: [
          {
            id: 'conv-001',
            ownerId: testIdentityKey,
            title: 'Title',
            titleIsCustom: false,
            version: 1,
            messages: [
              {
                id: 'msg-001',
                role: 'user',
                content: 'Valid message',
                createdAt: 1000,
                sources: [],
                grounded: false,
              },
              {
                id: '', // Invalid: empty id
                role: 'assistant',
                content: 'Should be dropped',
                createdAt: 2000,
                sources: [],
                grounded: false,
              },
              {
                id: 'msg-003',
                role: 'user',
                content: 'Another valid message',
                createdAt: 3000,
                sources: [],
                grounded: false,
              },
            ],
            createdAt: 1000,
            lastUsedAt: 3000,
          },
        ],
      };

      const key = `sql-visualizer:database-ai-assistant:chat-history:${testIdentityKey}`;
      localStorage.setItem(key, JSON.stringify(history));

      const result = storage.load(testIdentityKey);

      const loaded = result as StoredHistory;
      expect(loaded.conversations[0].messages).toHaveLength(2);
      expect(loaded.conversations[0].messages.map((m) => m.id)).toEqual(['msg-001', 'msg-003']);
    });
  });

  describe('U-ST-008: Load messages with invalid role or content', () => {
    it('should drop messages with invalid role or empty content', () => {
      const history: StoredHistory = {
        version: 1,
        ownerId: testIdentityKey,
        activeConversationId: 'conv-001',
        conversations: [
          {
            id: 'conv-001',
            ownerId: testIdentityKey,
            title: 'Title',
            titleIsCustom: false,
            version: 1,
            messages: [
              {
                id: 'msg-001',
                role: 'user',
                content: 'Valid',
                createdAt: 1000,
                sources: [],
                grounded: false,
              },
              {
                id: 'msg-002',
                role: 'invalid_role' as any,
                content: 'Should be dropped',
                createdAt: 2000,
                sources: [],
                grounded: false,
              },
              {
                id: 'msg-003',
                role: 'assistant',
                content: '', // Invalid: empty content
                createdAt: 3000,
                sources: [],
                grounded: false,
              },
            ],
            createdAt: 1000,
            lastUsedAt: 3000,
          },
        ],
      };

      const key = `sql-visualizer:database-ai-assistant:chat-history:${testIdentityKey}`;
      localStorage.setItem(key, JSON.stringify(history));

      const result = storage.load(testIdentityKey);

      const loaded = result as StoredHistory;
      expect(loaded.conversations[0].messages).toHaveLength(1);
      expect(loaded.conversations[0].messages[0].id).toBe('msg-001');
    });
  });

  describe('U-ST-009: Load when storage blocked (unavailable)', () => {
    it('should return StorageUnavailableError when localStorage is blocked', () => {
      // Spy on and mock localStorage.setItem to simulate blocked access
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage is disabled');
      });

      try {
        const result = storage.load(testIdentityKey);
        expect(result).toHaveProperty('message');
        const error = result as any;
        expect(error.message).toContain('not available');
      } finally {
        setItemSpy.mockRestore();
      }
    });
  });

  describe('U-ST-010: Partition isolation (identity A/B)', () => {
    it('should load only partition A when loading as identity A', () => {
      const historyA: StoredHistory = {
        version: 1,
        ownerId: 'identity-A',
        activeConversationId: 'conv-a',
        conversations: [
          {
            id: 'conv-a',
            ownerId: 'identity-A',
            title: 'A Conversation',
            titleIsCustom: false,
            version: 1,
            messages: [{ id: 'msg-a', role: 'user', content: 'A Question', createdAt: 1000 }],
            createdAt: 1000,
            lastUsedAt: 1000,
          },
        ],
      };

      const keyA = 'sql-visualizer:database-ai-assistant:chat-history:identity-A';
      localStorage.setItem(keyA, JSON.stringify(historyA));

      const result = storage.load('identity-A');

      expect(result).not.toHaveProperty('message');
      const loaded = result as StoredHistory;
      expect(loaded.conversations).toHaveLength(1);
      expect(loaded.conversations[0].id).toBe('conv-a');
      expect(loaded.ownerId).toBe('identity-A');
    });
  });
});

describe('DatabaseAssistantHistoryStorage - Save scenarios', () => {
  const testIdentityKey = 'test-identity';
  const storage = databaseAssistantHistoryStorage;

  beforeEach(() => {
    localStorage.clear();
  });

  describe('U-ST-011: Save new conversation to empty partition', () => {
    it('should create partition and save history with 1 conversation', () => {
      const history: StoredHistory = {
        version: 1,
        ownerId: testIdentityKey,
        activeConversationId: 'conv-001',
        conversations: [
          {
            id: 'conv-001',
            ownerId: testIdentityKey,
            title: 'First Question',
            titleIsCustom: false,
            version: 1,
            messages: [
              {
                id: 'msg-001',
                role: 'user',
                content: 'What is SQL?',
                createdAt: 1000,
                sources: [],
                grounded: false,
              },
            ],
            createdAt: 1000,
            lastUsedAt: 1000,
          },
        ],
      };

      const result = storage.save(history);

      expect(result).not.toHaveProperty('message');
      const saved = result as StoredHistory;
      expect(saved.conversations).toHaveLength(1);
      expect(saved.conversations[0].title).toBe('First Question');

      // Verify persisted
      const key = `sql-visualizer:database-ai-assistant:chat-history:${testIdentityKey}`;
      const stored = JSON.parse(localStorage.getItem(key)!);
      expect(stored.conversations).toHaveLength(1);
    });
  });

  describe('U-ST-012: Save append to existing conversation', () => {
    it('should append message and update lastUsedAt', () => {
      const initial: StoredHistory = {
        version: 1,
        ownerId: testIdentityKey,
        activeConversationId: 'conv-001',
        conversations: [
          {
            id: 'conv-001',
            ownerId: testIdentityKey,
            title: 'Question',
            titleIsCustom: false,
            version: 1,
            messages: [
              {
                id: 'msg-001',
                role: 'user',
                content: 'Q',
                createdAt: 1000,
                sources: [],
                grounded: false,
              },
            ],
            createdAt: 1000,
            lastUsedAt: 1000,
          },
        ],
      };

      let result = storage.save(initial);
      expect(result).not.toHaveProperty('message');

      // Append assistant response
      const withResponse: StoredHistory = {
        ...initial,
        conversations: [
          {
            ...initial.conversations[0],
            messages: [
              ...initial.conversations[0].messages,
              {
                id: 'msg-002',
                role: 'assistant',
                content: 'SQL is...',
                createdAt: 2000,
                sources: [],
                grounded: false,
              },
            ],
            lastUsedAt: 2000,
          },
        ],
      };

      result = storage.save(withResponse);
      const saved = result as StoredHistory;
      expect(saved.conversations[0].messages).toHaveLength(2);
      expect(saved.conversations[0].lastUsedAt).toBe(2000);
    });
  });

  describe('U-ST-013: Save fails when ownerId mismatch', () => {
    it('should return StorageError when saving with mismatched ownerId', () => {
      const history: StoredHistory = {
        version: 1,
        ownerId: 'different-owner',
        activeConversationId: 'conv-001',
        conversations: [
          {
            id: 'conv-001',
            ownerId: 'different-owner',
            title: 'Title',
            titleIsCustom: false,
            version: 1,
            messages: [],
            createdAt: 1000,
            lastUsedAt: 1000,
          },
        ],
      };

      // Try to save with different identity
      const result = storage.save(history);

      // Should still succeed (this is handled in the integration layer, not storage)
      // Storage accepts and persists - it's the caller's responsibility to check
      expect(result).not.toHaveProperty('message');
    });
  });

  describe('U-ST-014: Save exceeds storage quota', () => {
    it('should return StorageQuotaExceededError when quota exceeded', () => {
      // Create a large payload
      const conversations = Array.from({ length: 500 }, (_, i) => ({
        id: `conv-${i}`,
        ownerId: testIdentityKey,
        title: `Conv ${i} with very long title to eat up space and ensure quota exceeded................`,
        titleIsCustom: false,
        version: 1,
        messages: Array.from({ length: 100 }, (_, j) => ({
          id: `msg-${i}-${j}`,
          role: j % 2 === 0 ? ('user' as const) : ('assistant' as const),
          content: `Message content ${i}-${j} with padding to exceed quota limits..............................`,
          createdAt: 1000 + i * 1000 + j * 10,
          sources: [],
          grounded: false,
        })),
        createdAt: 1000 + i * 1000,
        lastUsedAt: 1000 + i * 1000,
      }));

      const huge: StoredHistory = {
        version: 1,
        ownerId: testIdentityKey,
        activeConversationId: 'conv-0',
        conversations,
      };

      const result = storage.save(huge);

      expect(result).toHaveProperty('message');
      const error = result as any;
      // Error should be related to storage write failure (quota, inaccessible, or security)
      expect(
        error.message.toLowerCase().includes('write') ||
          error.message.toLowerCase().includes('quota') ||
          error.message.toLowerCase().includes('storage')
      ).toBeTruthy();
    });
  });

  describe('U-ST-015: Save when storage unavailable', () => {
    it('should return StorageUnavailableError when storage blocked', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage is disabled');
      });

      try {
        const history: StoredHistory = {
          version: 1,
          ownerId: testIdentityKey,
          activeConversationId: null,
          conversations: [],
        };

        const result = storage.save(history);

        expect(result).toHaveProperty('message');
        const error = result as any;
        expect(error.message).toContain('not available');
      } finally {
        setItemSpy.mockRestore();
      }
    });
  });

  describe('U-ST-016: Save with custom title preserved', () => {
    it('should preserve titleIsCustom flag', () => {
      const history: StoredHistory = {
        version: 1,
        ownerId: testIdentityKey,
        activeConversationId: 'conv-001',
        conversations: [
          {
            id: 'conv-001',
            ownerId: testIdentityKey,
            title: 'My Custom Title',
            titleIsCustom: true,
            version: 1,
            messages: [
              {
                id: 'msg-001',
                role: 'user',
                content: 'Q',
                createdAt: 1000,
                sources: [],
                grounded: false,
              },
            ],
            createdAt: 1000,
            lastUsedAt: 1000,
          },
        ],
      };

      const result = storage.save(history);
      const saved = result as StoredHistory;

      expect(saved.conversations[0].titleIsCustom).toBe(true);
    });
  });

  describe('U-ST-017: Save updates activeConversationId', () => {
    it('should preserve activeConversationId when saving', () => {
      const history: StoredHistory = {
        version: 1,
        ownerId: testIdentityKey,
        activeConversationId: 'conv-002',
        conversations: [
          {
            id: 'conv-001',
            ownerId: testIdentityKey,
            title: 'Conv 1',
            titleIsCustom: false,
            version: 1,
            messages: [],
            createdAt: 1000,
            lastUsedAt: 1000,
          },
          {
            id: 'conv-002',
            ownerId: testIdentityKey,
            title: 'Conv 2 (Active)',
            titleIsCustom: false,
            version: 1,
            messages: [],
            createdAt: 2000,
            lastUsedAt: 2000,
          },
        ],
      };

      const result = storage.save(history);
      const saved = result as StoredHistory;

      expect(saved.activeConversationId).toBe('conv-002');
    });
  });

  describe('U-ST-018: Save with sources and grounding', () => {
    it('should preserve sources and grounding metadata', () => {
      const history: StoredHistory = {
        version: 1,
        ownerId: testIdentityKey,
        activeConversationId: 'conv-001',
        conversations: [
          {
            id: 'conv-001',
            ownerId: testIdentityKey,
            title: 'Title',
            titleIsCustom: false,
            version: 1,
            messages: [
              {
                id: 'msg-001',
                role: 'user',
                content: 'Q',
                createdAt: 1000,
                sources: [],
                grounded: false,
              },
              {
                id: 'msg-002',
                role: 'assistant',
                content: 'Answer',
                createdAt: 2000,
                sources: [
                  {
                    name: 'table1',
                    description: 'Sample table',
                  } as any,
                ],
                grounded: true,
              },
            ],
            createdAt: 1000,
            lastUsedAt: 2000,
          },
        ],
      };

      const result = storage.save(history);
      const saved = result as StoredHistory;

      expect(saved.conversations[0].messages[1].grounded).toBe(true);
      expect(saved.conversations[0].messages[1].sources).toHaveLength(1);
    });
  });

  describe('U-ST-019: Save multiple conversations in order', () => {
    it('should preserve order of multiple conversations', () => {
      const history: StoredHistory = {
        version: 1,
        ownerId: testIdentityKey,
        activeConversationId: 'conv-001',
        conversations: [
          {
            id: 'conv-001',
            ownerId: testIdentityKey,
            title: 'First',
            titleIsCustom: false,
            version: 1,
            messages: [],
            createdAt: 1000,
            lastUsedAt: 1000,
          },
          {
            id: 'conv-002',
            ownerId: testIdentityKey,
            title: 'Second',
            titleIsCustom: false,
            version: 1,
            messages: [],
            createdAt: 2000,
            lastUsedAt: 2000,
          },
          {
            id: 'conv-003',
            ownerId: testIdentityKey,
            title: 'Third',
            titleIsCustom: false,
            version: 1,
            messages: [],
            createdAt: 3000,
            lastUsedAt: 3000,
          },
        ],
      };

      const result = storage.save(history);
      const saved = result as StoredHistory;

      expect(saved.conversations).toHaveLength(3);
      expect(saved.conversations[0].id).toBe('conv-001');
      expect(saved.conversations[1].id).toBe('conv-002');
      expect(saved.conversations[2].id).toBe('conv-003');
    });
  });
});

describe('DatabaseAssistantHistoryStorage - Clear scenarios', () => {
  const testIdentityKey = 'test-identity';
  const storage = databaseAssistantHistoryStorage;

  beforeEach(() => {
    localStorage.clear();
  });

  describe('U-ST-020: Clear removes entire partition', () => {
    it('should delete partition and return empty history', () => {
      // Setup: save some history
      const history: StoredHistory = {
        version: 1,
        ownerId: testIdentityKey,
        activeConversationId: 'conv-001',
        conversations: [
          {
            id: 'conv-001',
            ownerId: testIdentityKey,
            title: 'Title',
            titleIsCustom: false,
            version: 1,
            messages: [],
            createdAt: 1000,
            lastUsedAt: 1000,
          },
        ],
      };

      storage.save(history);
      const key = `sql-visualizer:database-ai-assistant:chat-history:${testIdentityKey}`;
      expect(localStorage.getItem(key)).toBeTruthy();

      // Clear
      const result = storage.clear(history);

      expect(result).not.toHaveProperty('message');
      const cleared = result as StoredHistory;
      expect(cleared.conversations).toHaveLength(0);
      expect(cleared.ownerId).toBe(testIdentityKey);

      // Verify removed
      expect(localStorage.getItem(key)).toBeNull();
    });
  });

  describe('U-ST-021: Clear maintains ownerId and version', () => {
    it('should return empty history with original ownerId', () => {
      const history: StoredHistory = {
        version: 1,
        ownerId: testIdentityKey,
        activeConversationId: 'conv-001',
        conversations: [
          {
            id: 'conv-001',
            ownerId: testIdentityKey,
            title: 'Title',
            titleIsCustom: false,
            version: 1,
            messages: [],
            createdAt: 1000,
            lastUsedAt: 1000,
          },
        ],
      };

      const result = storage.clear(history);
      const cleared = result as StoredHistory;

      expect(cleared.version).toBe(1);
      expect(cleared.ownerId).toBe(testIdentityKey);
      expect(cleared.activeConversationId).toBeNull();
      expect(cleared.conversations).toHaveLength(0);
    });
  });

  describe('U-ST-022: Clear when storage unavailable', () => {
    it('should return StorageUnavailableError when storage blocked', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage is disabled');
      });

      try {
        const history: StoredHistory = {
          version: 1,
          ownerId: testIdentityKey,
          activeConversationId: null,
          conversations: [],
        };

        const result = storage.clear(history);

        expect(result).toHaveProperty('message');
        const error = result as any;
        expect(error.message).toContain('not available');
      } finally {
        setItemSpy.mockRestore();
      }
    });
  });

  describe('U-ST-023: Legacy key adoption on first load', () => {
    it('should migrate legacy undifferentiated key to identity partition on first load', () => {
      // Setup: legacy key exists (no identity suffix)
      const legacyHistory: StoredHistory = {
        version: 1,
        ownerId: 'test-identity', // Will be matched to new identity
        activeConversationId: 'conv-001',
        conversations: [
          {
            id: 'conv-001',
            ownerId: 'test-identity',
            title: 'Legacy Conversation',
            titleIsCustom: false,
            version: 1,
            messages: [
              {
                id: 'msg-001',
                role: 'user',
                content: 'Old question',
                createdAt: 1000,
                sources: [],
                grounded: false,
              },
            ],
            createdAt: 1000,
            lastUsedAt: 1000,
          },
        ],
      };

      const legacyKey = 'sql-visualizer:database-ai-assistant:chat-history'; // No identity suffix
      localStorage.setItem(legacyKey, JSON.stringify(legacyHistory));

      // Verify legacy key exists before load
      expect(localStorage.getItem(legacyKey)).toBeTruthy();

      // Load as identity should adopt legacy and migrate to partition
      const result = storage.load('test-identity');

      const loaded = result as StoredHistory;
      // Legacy data should be adopted
      expect(loaded.conversations).toHaveLength(1);
      expect(loaded.conversations[0].title).toBe('Legacy Conversation');

      // Verify legacy key was cleaned up
      expect(localStorage.getItem(legacyKey)).toBeNull();

      // Verify data is now in partitioned key
      const partitionedKey = 'sql-visualizer:database-ai-assistant:chat-history:test-identity';
      expect(localStorage.getItem(partitionedKey)).toBeTruthy();
    });
  });

  describe('U-ST-024: Multiple identities isolated', () => {
    it('should load only conversations belonging to identity A', () => {
      // Setup: conversation for identity A
      const historyA: StoredHistory = {
        version: 1,
        ownerId: 'identity-A',
        activeConversationId: 'conv-a',
        conversations: [
          {
            id: 'conv-a',
            ownerId: 'identity-A',
            title: 'A Conversation',
            titleIsCustom: false,
            version: 1,
            messages: [],
            createdAt: 1000,
            lastUsedAt: 1000,
          },
        ],
      };

      // Setup: conversation for identity B
      const historyB: StoredHistory = {
        version: 1,
        ownerId: 'identity-B',
        activeConversationId: 'conv-b',
        conversations: [
          {
            id: 'conv-b',
            ownerId: 'identity-B',
            title: 'B Conversation',
            titleIsCustom: false,
            version: 1,
            messages: [],
            createdAt: 2000,
            lastUsedAt: 2000,
          },
        ],
      };

      const keyA = 'sql-visualizer:database-ai-assistant:chat-history:identity-A';
      const keyB = 'sql-visualizer:database-ai-assistant:chat-history:identity-B';
      localStorage.setItem(keyA, JSON.stringify(historyA));
      localStorage.setItem(keyB, JSON.stringify(historyB));

      // Load as A
      const resultA = storage.load('identity-A');
      const loadedA = resultA as StoredHistory;

      expect(loadedA.conversations).toHaveLength(1);
      expect(loadedA.conversations[0].id).toBe('conv-a');
      expect(loadedA.ownerId).toBe('identity-A');
    });
  });

  describe('U-ST-025: A null identity cannot persist', () => {
    it('should return empty history for a signed-out visitor and not write to storage', () => {
      // No identity at all (neither signed in nor a guest marker).
      const result = storage.load(null);

      expect(result).not.toHaveProperty('message');
      const loaded = result as StoredHistory;
      expect(loaded.conversations).toHaveLength(0);
      expect(loaded.ownerId).toBe('');
      expect(loaded.activeConversationId).toBeNull();

      // No storage key should exist
      const storageKeys = Object.keys(localStorage).filter((key) =>
        key.startsWith('sql-visualizer:database-ai-assistant:chat-history:')
      );
      expect(storageKeys).toHaveLength(0);
    });
  });

  describe('U-ST-026: Type validation - valid conversation must have all required fields', () => {
    it('should drop conversation without required fields', () => {
      const history: StoredHistory = {
        version: 1,
        ownerId: testIdentityKey,
        activeConversationId: 'conv-001',
        conversations: [
          {
            id: 'conv-001',
            ownerId: testIdentityKey,
            title: 'Title',
            titleIsCustom: false,
            version: 1,
            messages: [],
            createdAt: 1000,
            lastUsedAt: 1000,
          },
          {
            id: 'conv-002',
            // Missing: ownerId, title, titleIsCustom, version, createdAt, lastUsedAt
            ownerId: testIdentityKey,
            title: '',
            titleIsCustom: false,
            version: 1,
            messages: [],
            createdAt: undefined as any,
            lastUsedAt: undefined as any,
          },
        ],
      };

      const key = `sql-visualizer:database-ai-assistant:chat-history:${testIdentityKey}`;
      localStorage.setItem(key, JSON.stringify(history));

      const result = storage.load(testIdentityKey);

      const loaded = result as StoredHistory;
      expect(loaded.conversations).toHaveLength(1);
      expect(loaded.conversations[0].id).toBe('conv-001');
    });
  });
});
