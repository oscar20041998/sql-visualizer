'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Sparkles, X, ShieldCheck, Target, Filter, MessageSquareText, Settings } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';

/** Bumped whenever the announcement content changes so returning users see the new note. */
const DISMISS_STORAGE_KEY = 'sqlvisualizer.ai-explainer-announcement.v1';

function hasBeenDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_STORAGE_KEY) === 'dismissed';
  } catch {
    // Private mode / blocked storage: showing the announcement again is harmless.
    return false;
  }
}

function rememberDismissal(): void {
  try {
    window.localStorage.setItem(DISMISS_STORAGE_KEY, 'dismissed');
  } catch {
    /* ignore — dismissal simply will not persist */
  }
}

/**
 * Owns whether the announcement is showing. It auto-opens on first visit and stays dismissed
 * afterwards, but `open()` lets the host reopen it on demand — otherwise the only way back to
 * the release note would be clearing localStorage by hand.
 */
export function useAnnouncementVisibility() {
  const [isOpen, setIsOpen] = useState(false);

  // localStorage is only available after mount, so the modal never renders during SSR.
  useEffect(() => {
    if (!hasBeenDismissed()) setIsOpen(true);
  }, []);

  const dismiss = useCallback(() => {
    setIsOpen(false);
    rememberDismissal();
  }, []);

  const open = useCallback(() => setIsOpen(true), []);

  return { isOpen, open, dismiss };
}

interface AiFeatureAnnouncementProps {
  open: boolean;
  /** Closing by any route: Dismiss, X, Esc, or backdrop click. */
  onDismiss: () => void;
  /** Invoked by the primary CTA so the host can immediately run the explainer. */
  onTryNow: () => void;
}

/** Release announcement for the AI SQL Explainer. Visibility is controlled by the host. */
export const AiFeatureAnnouncement: React.FC<AiFeatureAnnouncementProps> = ({
  open,
  onDismiss,
  onTryNow,
}) => {
  const settings = useAppStore((store) => store.settings);
  const t = getT(settings.locale);

  const primaryButtonRef = useRef<HTMLButtonElement | null>(null);

  const close = onDismiss;

  const handleTryNow = useCallback(() => {
    close();
    onTryNow();
  }, [close, onTryNow]);

  useEffect(() => {
    if (!open) return;
    primaryButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  if (!open) return null;

  const bullets = [
    { icon: Target, text: t.aiAnnounceBullet1 },
    { icon: Filter, text: t.aiAnnounceBullet2 },
    { icon: MessageSquareText, text: t.aiAnnounceBullet3 },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-announce-heading"
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl animate-slide-up"
      >
        {/* Header */}
        <div className="relative overflow-hidden rounded-t-2xl border-b border-gray-800 bg-gradient-to-br from-indigo-950 via-gray-900 to-gray-900 px-6 pt-6 pb-5">
          <button
            onClick={close}
            aria-label={t.aiAnnounceClose}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-200"
          >
            <X size={16} />
          </button>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-300">
            <Sparkles size={11} />
            {t.aiAnnounceBadge}
          </span>

          <h2
            id="ai-announce-heading"
            className="mt-3 pr-8 text-xl font-bold leading-snug text-white"
          >
            {t.aiAnnounceHeading}
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm leading-relaxed text-gray-300">{t.aiAnnounceBody}</p>

          <ul className="mt-4 space-y-3">
            {bullets.map(({ icon: Icon, text }, index) => (
              <li key={`ai-announce-bullet-${index}`} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
                  <Icon size={13} />
                </span>
                <span className="text-sm leading-relaxed text-gray-200">{text}</span>
              </li>
            ))}
          </ul>

          {/* Security note */}
          <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-emerald-800/50 bg-emerald-950/40 px-3.5 py-3">
            <ShieldCheck size={15} className="mt-0.5 flex-shrink-0 text-emerald-400" />
            <p className="text-xs leading-relaxed text-emerald-200">{t.aiAnnounceSecurity}</p>
          </div>

          <Link
            href="/settings-preferences"
            onClick={close}
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-indigo-300"
          >
            <Settings size={12} />
            {t.aiAnnounceSettingsHint}
          </Link>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-2 border-t border-gray-800 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            onClick={close}
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
          >
            {t.aiAnnounceSecondaryCta}
          </button>
          <button
            ref={primaryButtonRef}
            onClick={handleTryNow}
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-950/50 transition-colors hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            <Sparkles size={14} />
            {t.aiAnnouncePrimaryCta}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiFeatureAnnouncement;
