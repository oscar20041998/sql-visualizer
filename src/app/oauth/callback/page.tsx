'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
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
    <main
      role="status"
      aria-live="polite"
      className="grid min-h-screen place-items-center bg-background text-sm text-foreground"
    >
      <span className="flex items-center gap-3">
        <Loader2 size={16} className="motion-safe:animate-spin text-primary" aria-hidden="true" />
        Completing sign in…
      </span>
    </main>
  );
}
