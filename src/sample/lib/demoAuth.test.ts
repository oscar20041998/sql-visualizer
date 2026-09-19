import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  isDemoAuthenticated, 
  setDemoAuthenticated, 
  clearDemoAuthenticated, 
  setSocialSession,
  DEMO_AUTH_STORAGE_KEY,
  SOCIAL_AUTH_STORAGE_KEY
} from './demoAuth';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('demoAuth SessionManager', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    // Mock Date.now() for predictable expiry tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-09T12:00:00Z'));
  });

  it('should return false when unauthenticated', () => {
    expect(isDemoAuthenticated()).toBe(false);
  });

  it('should return true when legacy admin is authenticated', () => {
    setDemoAuthenticated();
    expect(isDemoAuthenticated()).toBe(true);
  });

  it('should return true when valid social session exists', () => {
    const validExpiry = Date.now() + 3600 * 1000;
    setSocialSession({
      provider: 'google',
      displayName: 'Test User',
      email: 'test@example.com',
      accessToken: 'token123',
      expiry: validExpiry
    });
    expect(isDemoAuthenticated()).toBe(true);
  });

  it('should return false when social session has expired', () => {
    const expiredExpiry = Date.now() - 1000;
    setSocialSession({
      provider: 'google',
      displayName: 'Test User',
      email: 'test@example.com',
      accessToken: 'token123',
      expiry: expiredExpiry
    });
    expect(isDemoAuthenticated()).toBe(false);
    expect(localStorage.getItem(SOCIAL_AUTH_STORAGE_KEY)).toBeNull(); // Should be cleared
  });

  it('should return false and clear when social session is corrupted', () => {
    localStorage.setItem(SOCIAL_AUTH_STORAGE_KEY, 'invalid-json');
    expect(isDemoAuthenticated()).toBe(false);
    expect(localStorage.getItem(SOCIAL_AUTH_STORAGE_KEY)).toBeNull();
  });

  it('should clear both sessions on clearDemoAuthenticated', () => {
    setDemoAuthenticated();
    setSocialSession({
        provider: 'microsoft',
        displayName: 'Test User',
        email: 'test@example.com',
        accessToken: 'token123',
        expiry: Date.now() + 3600 * 1000
    });
    
    clearDemoAuthenticated();
    
    expect(isDemoAuthenticated()).toBe(false);
    expect(localStorage.getItem(DEMO_AUTH_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(SOCIAL_AUTH_STORAGE_KEY)).toBeNull();
  });
});
