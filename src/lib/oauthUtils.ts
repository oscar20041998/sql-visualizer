import type { OAuthCallbackPayload } from './demoAuth';

export function parseOAuthCallback(url: string): OAuthCallbackPayload {
  const parsed = new URL(
    url,
    typeof window === 'undefined' ? 'http://localhost' : window.location.origin
  );
  const values = new URLSearchParams(
    parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash
  );
  parsed.searchParams.forEach((value, key) => values.set(key, value));

  const expiresIn = values.get('expires_in');
  return {
    accessToken: values.get('access_token') ?? undefined,
    expiresIn: expiresIn ? Number(expiresIn) : undefined,
    state: values.get('state') ?? undefined,
    error: values.get('error') ?? undefined,
    errorDescription: values.get('error_description') ?? undefined,
  };
}

export function createOAuthState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function buildOAuthUrl(config: {
  authUrl: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
}): string {
  const url = new URL(config.authUrl);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'token',
    scope: config.scopes.join(' '),
    state: config.state,
    include_granted_scopes: 'true',
  }).toString();
  return url.toString();
}
