'use client';

import { useEffect } from 'react';
import { parseOAuthCallback } from '@/lib/oauthUtils';

export default function OAuthCallbackPage() {
  useEffect(() => {
    window.opener?.postMessage(
      {
        type: 'oauth-callback',
        provider: new URLSearchParams(window.location.search).get('provider'),
        payload: parseOAuthCallback(window.location.href),
      },
      window.location.origin
    );
    window.close();
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-background text-sm text-foreground">
      Completing sign in...
    </main>
  );
}
