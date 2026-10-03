import { describe, it, expect } from 'vitest';
import {
  deriveTitleFromQuestion,
  getRecencyGroup,
  groupConversationsByRecency,
  searchConversations,
  type GroupedConversations,
  type RecencyGroup,
} from '@/lib/ai/databaseAssistant/chatHistoryHelpers';
import { StoredConversation } from '@/lib/ai/databaseAssistant/chatHistoryTypes';

describe('ChatHistoryHelpers - Title Derivation', () => {
  describe('U-TH-001: Derive title from short question', () => {
    it('should return short question as-is', () => {
      const result = deriveTitleFromQuestion('What is SQL?');
      expect(result).toBe('What is SQL');
    });
  });

  describe('U-TH-002: Derive title from long question (>50 chars)', () => {
    it('should truncate at word boundary', () => {
      const longQuestion =
        'What is the difference between an inner join and a left outer join in SQL?';
      const result = deriveTitleFromQuestion(longQuestion);

      expect(result.length).toBeLessThanOrEqual(54); // Some buffer for word boundary
      expect(result).toContain('difference');
      expect(result).not.toContain('left outer');
    });
  });

  describe('U-TH-003: Derive title strips leading punctuation', () => {
    it('should remove leading punctuation marks', () => {
      const result = deriveTitleFromQuestion('???What is this???');
      expect(result).not.toMatch(/^\?/);
      expect(result).toContain('What');
    });
  });

  describe('U-TH-004: Derive title strips trailing punctuation', () => {
    it('should remove trailing punctuation but keep internal', () => {
      const result = deriveTitleFromQuestion("What's the difference???");
      expect(result).toBe("What's the difference");
      expect(result).toContain("'");
    });
  });

  describe('U-TH-005: Derive title fallback for empty string', () => {
    it('should return Untitled for empty input', () => {
      const result = deriveTitleFromQuestion('');
      expect(result).toBe('Untitled');
    });
  });

  describe('U-TH-006: Derive title fallback for whitespace-only', () => {
    it('should return Untitled for whitespace-only input', () => {
      const result = deriveTitleFromQuestion('   \t\n   ');
      expect(result).toBe('Untitled');
    });
  });

  describe('U-TH-007: Derive title fallback for punctuation-only', () => {
    it('should return Untitled when only punctuation remains', () => {
      const result = deriveTitleFromQuestion('!!!???...***');
      expect(result).toBe('Untitled');
    });
  });

  describe('U-TH-008: Derive title from null/invalid input', () => {
    it('should return Untitled for null or non-string', () => {
      expect(deriveTitleFromQuestion(null as any)).toBe('Untitled');
      expect(deriveTitleFromQuestion(undefined as any)).toBe('Untitled');
      expect(deriveTitleFromQuestion({} as any)).toBe('Untitled');
    });
  });

  describe('U-TH-009: Derive title preserves internal punctuation', () => {
    it('should keep question marks, apostrophes, hyphens within text', () => {
      const result = deriveTitleFromQuestion("What's the best way to write SQL? (join vs subquery)");
      expect(result).toContain("'");
      expect(result).toContain('(');
    });
  });

  describe('U-TH-010: Derive title from one-word question', () => {
    it('should handle single long word gracefully with ellipsis', () => {
      // Use a word longer than 50 chars with no spaces
      const longWord = 'Abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz';
      const result = deriveTitleFromQuestion(longWord);
      expect(result).toContain('…');
      expect(result.length).toBeLessThanOrEqual(52); // Approximately 50 + ellipsis
    });
  });
});

describe('ChatHistoryHelpers - Recency Grouping', () => {
  const now = new Date('2025-03-15T14:00:00Z').getTime(); // Sat Mar 15, 2025 2:00 PM UTC

  describe('U-TH-011: Get recency group for today', () => {
    it('should return today for timestamps after today midnight', () => {
      const today = new Date('2025-03-15T10:00:00Z').getTime();
      const result = getRecencyGroup(today, now);
      expect(result).toBe('today');
    });
  });

  describe('U-TH-012: Get recency group for yesterday', () => {
    it('should return yesterday for yesterday midnight to today midnight', () => {
      const yesterday = new Date('2025-03-14T10:00:00Z').getTime();
      const result = getRecencyGroup(yesterday, now);
      expect(result).toBe('yesterday');
    });
  });

  describe('U-TH-013: Get recency group for previous 7 days', () => {
    it('should return previousSevenDays for dates within last 7 days', () => {
      const fiveDaysAgo = new Date('2025-03-10T10:00:00Z').getTime();
      const result = getRecencyGroup(fiveDaysAgo, now);
      expect(result).toBe('previousSevenDays');
    });
  });

  describe('U-TH-014: Get recency group for older', () => {
    it('should return older for dates more than 7 days ago', () => {
      const tenDaysAgo = new Date('2025-03-05T10:00:00Z').getTime();
      const result = getRecencyGroup(tenDaysAgo, now);
      expect(result).toBe('older');
    });
  });

  describe('U-TH-015: Group empty conversation list', () => {
    it('should return all empty groups for no conversations', () => {
      const result = groupConversationsByRecency([], now);

      expect(result.today).toHaveLength(0);
      expect(result.yesterday).toHaveLength(0);
      expect(result.previousSevenDays).toHaveLength(0);
      expect(result.older).toHaveLength(0);
    });
  });

  describe('U-TH-016: Group conversations by recency', () => {
    it('should place conversations in correct recency buckets', () => {
      const conversations: StoredConversation[] = [
        {
          id: 'today-1',
          ownerId: 'user1',
          title: 'Today',
          titleIsCustom: false,
          version: 1,
          messages: [],
          createdAt: now - 1000,
          lastUsedAt: now - 1000,
        },
        {
          id: 'yesterday-1',
          ownerId: 'user1',
          title: 'Yesterday',
          titleIsCustom: false,
          version: 1,
          messages: [],
          createdAt: new Date('2025-03-14T10:00:00Z').getTime(),
          lastUsedAt: new Date('2025-03-14T10:00:00Z').getTime(),
        },
        {
          id: 'week-1',
          ownerId: 'user1',
          title: 'Last Week',
          titleIsCustom: false,
          version: 1,
          messages: [],
          createdAt: new Date('2025-03-10T10:00:00Z').getTime(),
          lastUsedAt: new Date('2025-03-10T10:00:00Z').getTime(),
        },
        {
          id: 'old-1',
          ownerId: 'user1',
          title: 'Old',
          titleIsCustom: false,
          version: 1,
          messages: [],
          createdAt: new Date('2025-02-01T10:00:00Z').getTime(),
          lastUsedAt: new Date('2025-02-01T10:00:00Z').getTime(),
        },
      ];

      const result = groupConversationsByRecency(conversations, now);

      expect(result.today).toHaveLength(1);
      expect(result.yesterday).toHaveLength(1);
      expect(result.previousSevenDays).toHaveLength(1);
      expect(result.older).toHaveLength(1);
    });
  });

  describe('U-TH-017: Group sorts each bucket by most recent first', () => {
    it('should sort conversations within each group by lastUsedAt descending', () => {
      const conversations: StoredConversation[] = [
        {
          id: 'today-1',
          ownerId: 'user1',
          title: 'Today - First',
          titleIsCustom: false,
          version: 1,
          messages: [],
          createdAt: now - 5000,
          lastUsedAt: now - 5000,
        },
        {
          id: 'today-2',
          ownerId: 'user1',
          title: 'Today - Second',
          titleIsCustom: false,
          version: 1,
          messages: [],
          createdAt: now - 2000,
          lastUsedAt: now - 2000,
        },
        {
          id: 'today-3',
          ownerId: 'user1',
          title: 'Today - Third',
          titleIsCustom: false,
          version: 1,
          messages: [],
          createdAt: now - 1000,
          lastUsedAt: now - 1000,
        },
      ];

      const result = groupConversationsByRecency(conversations, now);

      expect(result.today).toHaveLength(3);
      expect(result.today[0].title).toBe('Today - Third');
      expect(result.today[1].title).toBe('Today - Second');
      expect(result.today[2].title).toBe('Today - First');
    });
  });

  describe('U-TH-018: Group handles multiple conversations in multiple buckets', () => {
    it('should correctly sort within each bucket independently', () => {
      const conversations: StoredConversation[] = [
        {
          id: 'week-1',
          ownerId: 'user1',
          title: 'Week - Older',
          titleIsCustom: false,
          version: 1,
          messages: [],
          createdAt: new Date('2025-03-09T10:00:00Z').getTime(),
          lastUsedAt: new Date('2025-03-09T10:00:00Z').getTime(),
        },
        {
          id: 'week-2',
          ownerId: 'user1',
          title: 'Week - Newer',
          titleIsCustom: false,
          version: 1,
          messages: [],
          createdAt: new Date('2025-03-11T10:00:00Z').getTime(),
          lastUsedAt: new Date('2025-03-11T10:00:00Z').getTime(),
        },
        {
          id: 'old-1',
          ownerId: 'user1',
          title: 'Old - Older',
          titleIsCustom: false,
          version: 1,
          messages: [],
          createdAt: new Date('2025-02-10T10:00:00Z').getTime(),
          lastUsedAt: new Date('2025-02-10T10:00:00Z').getTime(),
        },
        {
          id: 'old-2',
          ownerId: 'user1',
          title: 'Old - Newer',
          titleIsCustom: false,
          version: 1,
          messages: [],
          createdAt: new Date('2025-02-20T10:00:00Z').getTime(),
          lastUsedAt: new Date('2025-02-20T10:00:00Z').getTime(),
        },
      ];

      const result = groupConversationsByRecency(conversations, now);

      expect(result.previousSevenDays[0].title).toBe('Week - Newer');
      expect(result.previousSevenDays[1].title).toBe('Week - Older');
      expect(result.older[0].title).toBe('Old - Newer');
      expect(result.older[1].title).toBe('Old - Older');
    });
  });
});

describe('ChatHistoryHelpers - Search Conversations', () => {
  const conversations: StoredConversation[] = [
    {
      id: 'conv-1',
      ownerId: 'user1',
      title: 'SQL JOIN Basics',
      titleIsCustom: false,
      version: 1,
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'What is an inner join?',
          createdAt: 1000,
          sources: [],
          grounded: false,
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'An inner join returns only matching rows...',
          createdAt: 2000,
          sources: [],
          grounded: false,
        },
      ],
      createdAt: 1000,
      lastUsedAt: 2000,
    },
    {
      id: 'conv-2',
      ownerId: 'user1',
      title: 'Performance Tips',
      titleIsCustom: false,
      version: 1,
      messages: [
        {
          id: 'msg-3',
          role: 'user',
          content: 'How to optimize slow queries?',
          createdAt: 3000,
          sources: [],
          grounded: false,
        },
        {
          id: 'msg-4',
          role: 'assistant',
          content: 'Try using indexes and avoiding full table scans...',
          createdAt: 4000,
          sources: [],
          grounded: false,
        },
      ],
      createdAt: 3000,
      lastUsedAt: 4000,
    },
  ];

  describe('U-TH-019: Search matches title case-insensitive', () => {
    it('should find conversations by title regardless of case', () => {
      const result = searchConversations(conversations, 'sql');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('conv-1');
    });
  });

  describe('U-TH-020: Search matches user message case-insensitive', () => {
    it('should find conversations by user message content', () => {
      const result = searchConversations(conversations, 'optimize');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('conv-2');
    });
  });

  describe('U-TH-021: Search does NOT match assistant messages', () => {
    it('should not match terms from assistant answers', () => {
      const result = searchConversations(conversations, 'table scans');
      expect(result).toHaveLength(0);
    });
  });

  describe('U-TH-022: Search returns all for empty query', () => {
    it('should return all conversations when query is empty', () => {
      const result = searchConversations(conversations, '');
      expect(result).toHaveLength(2);
    });
  });

  describe('U-TH-023: Search with whitespace-only query', () => {
    it('should treat whitespace-only as empty query', () => {
      const result = searchConversations(conversations, '   \t\n  ');
      expect(result).toHaveLength(2);
    });
  });

  describe('U-TH-024: Search returns multiple matches', () => {
    it('should return all conversations matching query', () => {
      const manyConvs: StoredConversation[] = [
        {
          id: 'query-1',
          ownerId: 'user1',
          title: 'SQL Basics',
          titleIsCustom: false,
          version: 1,
          messages: [
            {
              id: 'msg-1',
              role: 'user',
              content: 'Tell me about SQL',
              createdAt: 1000,
              sources: [],
              grounded: false,
            },
          ],
          createdAt: 1000,
          lastUsedAt: 1000,
        },
        {
          id: 'query-2',
          ownerId: 'user1',
          title: 'Query Optimization',
          titleIsCustom: false,
          version: 1,
          messages: [
            {
              id: 'msg-2',
              role: 'user',
              content: 'How to write good SQL queries?',
              createdAt: 2000,
              sources: [],
              grounded: false,
            },
          ],
          createdAt: 2000,
          lastUsedAt: 2000,
        },
      ];

      const result = searchConversations(manyConvs, 'sql');
      expect(result).toHaveLength(2);
    });
  });

  describe('U-TH-025: Search partial word match', () => {
    it('should match partial words (substring match)', () => {
      const result = searchConversations(conversations, 'optim');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('conv-2');
    });
  });

  describe('U-TH-026: Search case-insensitive mixed case', () => {
    it('should handle mixed case queries correctly', () => {
      const result = searchConversations(conversations, 'InNeR jOiN');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('conv-1');
    });
  });

  describe('U-TH-027: Search no matches returns empty array', () => {
    it('should return empty array when no conversations match', () => {
      const result = searchConversations(conversations, 'mongodb');
      expect(result).toHaveLength(0);
    });
  });

  describe('U-TH-028: Search preserves conversation order', () => {
    it('should return matches in original order (not reordered)', () => {
      const result = searchConversations(conversations, 'a');
      expect(result[0].id).toBe('conv-1'); // First match comes first
      expect(result[1].id).toBe('conv-2'); // Second match comes second
    });
  });

  describe('U-TH-029: Search matches multiple messages in same conversation', () => {
    it('should match conversation if ANY user message contains query', () => {
      const conv: StoredConversation[] = [
        {
          id: 'multi-msg',
          ownerId: 'user1',
          title: 'Multiple Questions',
          titleIsCustom: false,
          version: 1,
          messages: [
            {
              id: 'msg-1',
              role: 'user',
              content: 'First question about databases',
              createdAt: 1000,
              sources: [],
              grounded: false,
            },
            {
              id: 'msg-2',
              role: 'assistant',
              content: 'Answer 1',
              createdAt: 1100,
              sources: [],
              grounded: false,
            },
            {
              id: 'msg-3',
              role: 'user',
              content: 'Follow-up about indexing',
              createdAt: 1200,
              sources: [],
              grounded: false,
            },
          ],
          createdAt: 1000,
          lastUsedAt: 1200,
        },
      ];

      // Should match "indexing" even though first message was about "databases"
      const result = searchConversations(conv, 'indexing');
      expect(result).toHaveLength(1);
    });
  });
});
