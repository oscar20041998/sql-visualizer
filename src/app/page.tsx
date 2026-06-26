'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to query-input page on mount
    router.push('/query-input');
  }, [router]);

  return null;
}
