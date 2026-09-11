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

export interface AuthProviderConfig {
  clientId: string;
  authUrl: string;
  redirectUri: string;
  scopes: string[];
}

export interface OAuthCallbackPayload {
  accessToken?: string;
  expiresIn?: number;
  state?: string;
  error?: string;
  errorDescription?: string;
  profile?: { name: string; email: string; picture?: string };
}

export type AuthUIState = 'idle' | 'authenticating' | 'error';

function isUserSession(value: unknown): value is UserSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<UserSession>;
  return (
    (session.provider === 'google' || session.provider === 'microsoft') &&
    typeof session.displayName === 'string' &&
    typeof session.email === 'string' &&
    typeof session.accessToken === 'string' &&
    typeof session.expiry === 'number' &&
    Number.isFinite(session.expiry)
  );
}

export function isDemoAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Check legacy admin
  if (window.localStorage.getItem(DEMO_AUTH_STORAGE_KEY) === 'true') {
    return true;
  }

  // 2. Check social session
  return getSocialSession() !== null;
}

export function setDemoAuthenticated(): void {
  window.localStorage.setItem(DEMO_AUTH_STORAGE_KEY, 'true');
}

export function clearDemoAuthenticated(): void {
  window.localStorage.removeItem(DEMO_AUTH_STORAGE_KEY);
  clearSocialSession();
}

export function getSocialSession(): UserSession | null {
  if (typeof window === 'undefined') return null;

  const sessionStr = window.localStorage.getItem(SOCIAL_AUTH_STORAGE_KEY);
  if (!sessionStr) return null;

  try {
    const parsed: unknown = JSON.parse(sessionStr);
    if (isUserSession(parsed) && Date.now() < parsed.expiry) return parsed;
  } catch {
    // Treat malformed local storage as an unauthenticated session.
  }

  clearSocialSession();
  return null;
}

export function clearSocialSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SOCIAL_AUTH_STORAGE_KEY);
}

export function setSocialSession(session: UserSession): void {
  window.localStorage.setItem(SOCIAL_AUTH_STORAGE_KEY, JSON.stringify(session));
}
