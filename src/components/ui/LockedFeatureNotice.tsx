'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, ArrowRight } from 'lucide-react';
import type { Translations } from '@/lib/i18n';

interface LockedFeatureNoticeProps {
  t: Translations;
  /** User-facing name of the capability that is unavailable. */
  featureName: string;
  className?: string;
}

/**
 * Shown in place of a capability a guest is not entitled to (specs/013-guest-access-mode, US2).
 *
 * It renders from local state with no network call, so it is available offline and never shows a
 * spinner or a generic error (FR-013, FR-014). It states the reason and offers a one-click path to
 * sign in, so a guest understands the limit rather than concluding the feature is broken.
 */
export default function LockedFeatureNotice({
  t,
  featureName,
  className = '',
}: LockedFeatureNoticeProps) {
  const router = useRouter();

  return (
    <div
      role="note"
      className={`rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center ${className}`}
    >
      <div className="mx-auto flex w-9 h-9 items-center justify-center rounded-lg bg-primary/10">
        <LockKeyhole size={17} className="text-primary" aria-hidden="true" />
      </div>

      <h3 className="mt-3 text-sm font-bold text-foreground">{featureName}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {t.guestAccessLockedReason}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-foreground">
        {t.guestAccessLockedLocalAiNote}
      </p>

      <button
        type="button"
        onClick={() => router.push('/login')}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {t.guestAccessLockedSignIn}
        <ArrowRight size={13} aria-hidden="true" />
      </button>
    </div>
  );
}
