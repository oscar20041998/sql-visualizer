'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isDemoAuthenticated } from '@/lib/demoAuth';
import SignInPage from '@/components/auth/SignInPage';

/**
 * /login route (specs/006-login-ui-redesign, FR-012).
 * Signed-in visitors are redirected to the workspace instead of seeing the form.
 */
export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    if (isDemoAuthenticated()) {
      router.replace('/query-input');
    }
  }, [router]);

  // Gate pattern from query-input: render nothing while redirecting.
  if (isDemoAuthenticated()) return null;

  return <SignInPage />;
}
