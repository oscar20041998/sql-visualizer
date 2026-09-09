// Temporary client-side session management.
export const DEMO_AUTH_STORAGE_KEY = 'sqlvisualizer-demo-authenticated';
export const SOCIAL_AUTH_STORAGE_KEY = 'sqlvisualizer-user-session';

export interface UserSession {
  provider: 'google' | 'microsoft';
  displayName: string;
  email: string;
  avatarUrl?: string;
  accessToken: string;
  expiry: number; // Unix timestamp in ms
}

export function isDemoAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Check legacy admin
  if (window.localStorage.getItem(DEMO_AUTH_STORAGE_KEY) === 'true') {
    return true;
  }

  // 2. Check social session
  const sessionStr = window.localStorage.getItem(SOCIAL_AUTH_STORAGE_KEY);
  if (!sessionStr) return false;

  try {
    const session: UserSession = JSON.parse(sessionStr);
    if (Date.now() < session.expiry) {
      return true;
    } else {
      // Session expired
      clearSocialSession();
      return false;
    }
  } catch (e) {
    // Corrupted session
    clearSocialSession();
    return false;
  }
}

export function setDemoAuthenticated(): void {
  window.localStorage.setItem(DEMO_AUTH_STORAGE_KEY, 'true');
}

export function clearDemoAuthenticated(): void {
  window.localStorage.removeItem(DEMO_AUTH_STORAGE_KEY);
  clearSocialSession();
}

function clearSocialSession(): void {
  window.localStorage.removeItem(SOCIAL_AUTH_STORAGE_KEY);
}

export function setSocialSession(session: UserSession): void {
  window.localStorage.setItem(SOCIAL_AUTH_STORAGE_KEY, JSON.stringify(session));
}
