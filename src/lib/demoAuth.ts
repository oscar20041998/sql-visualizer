// Temporary client-side session flag until the real authentication API is connected.
export const DEMO_AUTH_STORAGE_KEY = 'sqlvisualizer-demo-authenticated';

export function isDemoAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(DEMO_AUTH_STORAGE_KEY) === 'true';
}

export function setDemoAuthenticated(): void {
  window.localStorage.setItem(DEMO_AUTH_STORAGE_KEY, 'true');
}

export function clearDemoAuthenticated(): void {
  window.localStorage.removeItem(DEMO_AUTH_STORAGE_KEY);
}
