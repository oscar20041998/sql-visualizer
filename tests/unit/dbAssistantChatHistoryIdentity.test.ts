import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveHistoryIdentity,
  getCachedHistoryIdentity,
  clearCachedHistoryIdentity,
} from '@/lib/ai/databaseAssistant/chatHistoryIdentity';
import {
  setGuestSession,
  clearGuestSession,
  SOCIAL_AUTH_STORAGE_KEY,
  type UserSession,
} from '@/lib/demoAuth';
import { resetTestStorage, signInAsSocialUser } from '../utils/test-setup';

/** Writes a social session straight to storage, bypassing the server stub. */
function writeSocialSession(overrides: Partial<UserSession> = {}): void {
  window.localStorage.setItem(
    SOCIAL_AUTH_STORAGE_KEY,
    JSON.stringify({
      provider: 'google',
      displayName: 'Test User',
      email: 'test@example.com',
      accessToken: 'test-token',
      expiry: Date.now() + 3600 * 1000,
      ...overrides,
    })
  );
}

beforeEach(() => {
  resetTestStorage();
  // The cache is module-level, so each test must start from a known-empty state.
  clearCachedHistoryIdentity();
});

describe('ChatHistoryIdentity - Signed-in identities', () => {
  it('U-ID-003: resolves a social session to a social-hashed key', async () => {
    await signInAsSocialUser();
    expect(resolveHistoryIdentity()).toMatch(/^social-[0-9a-z]+$/);
  });

  it('U-ID-003b: normalises email casing so one account keeps one partition', async () => {
    await signInAsSocialUser({ email: 'mixed@example.com' });
    const lower = resolveHistoryIdentity();
    await signInAsSocialUser({ email: 'MIXED@example.com' });
    expect(resolveHistoryIdentity()).toBe(lower);
  });

  it('U-ID-006: demo mode resolves to the fixed demo partition', () => {
    window.localStorage.setItem('sqlvisualizer-demo-authenticated', 'true');
    expect(resolveHistoryIdentity()).toBe('demo');
  });
});

describe('ChatHistoryIdentity - Guest and unsigned', () => {
  it('U-ID-008: a signed-out visitor with no guest marker resolves to null', () => {
    expect(resolveHistoryIdentity()).toBeNull();
  });

  it('U-ID-008a: a guest session resolves to its own guest partition', () => {
    setGuestSession({ startedAt: Date.now(), locale: 'en' });
    expect(resolveHistoryIdentity()).toBe('guest');
  });

  it('U-ID-008b: a signed-in identity takes precedence over a leftover guest marker', async () => {
    setGuestSession({ startedAt: Date.now(), locale: 'en' });
    await signInAsSocialUser();
    expect(resolveHistoryIdentity()).toMatch(/^social-/);
  });

  it('U-ID-008c: the guest partition is distinct from the shared demo pool', () => {
    setGuestSession({ startedAt: Date.now(), locale: 'en' });
    expect(resolveHistoryIdentity()).not.toBe('demo');
  });
});

describe('ChatHistoryIdentity - Cache validation (FR-043)', () => {
  it('U-ID-015: returns the same key while the markers are unchanged', async () => {
    await signInAsSocialUser();
    const first = getCachedHistoryIdentity();
    expect(getCachedHistoryIdentity()).toBe(first);
  });

  it('U-ID-016a: a session starting after a cached null needs no manual cache clear', () => {
    expect(getCachedHistoryIdentity()).toBeNull();

    setGuestSession({ startedAt: Date.now(), locale: 'en' });

    expect(getCachedHistoryIdentity()).toBe('guest');
  });

  it('U-ID-016a: signing out drops the previously cached partition', async () => {
    await signInAsSocialUser();
    expect(getCachedHistoryIdentity()).toMatch(/^social-/);

    window.localStorage.clear();

    expect(getCachedHistoryIdentity()).toBeNull();
  });

  it('U-ID-016b: an expired social session stops resolving to a social partition', () => {
    writeSocialSession({ expiry: Date.now() - 1000 });
    expect(getCachedHistoryIdentity()).toBeNull();
  });

  it('U-ID-016: clearCachedHistoryIdentity forces a fresh resolve', async () => {
    writeSocialSession({ email: 'first@example.com' });
    const before = getCachedHistoryIdentity();

    // Change the underlying session, then clear the cache explicitly.
    writeSocialSession({ email: 'second@example.com' });
    clearCachedHistoryIdentity();

    expect(getCachedHistoryIdentity()).not.toBe(before);
  });

  it('U-ID-008d: clearing only the guest marker switches the partition back to null', () => {
    setGuestSession({ startedAt: Date.now(), locale: 'en' });
    expect(getCachedHistoryIdentity()).toBe('guest');

    clearGuestSession();

    expect(getCachedHistoryIdentity()).toBeNull();
  });
});

describe('ChatHistoryIdentity - No conversation partition without an identity', () => {
  it('U-ID-009: a signed-out visitor gets no conversation partition key', () => {
    // The signature probe does read the session markers, but it must never hand back a usable
    // partition — the conversation store keys all of its reads and writes off this value.
    expect(getCachedHistoryIdentity()).toBeNull();
    expect(getCachedHistoryIdentity()).toBeNull();
  });
});
