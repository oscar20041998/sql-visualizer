'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Info, CheckCircle2 } from 'lucide-react';
import type { Translations } from '@/lib/i18n';

interface GuestAccessDialogProps {
  t: Translations;
  onConfirm: () => void;
  onDismiss: () => void;
}

/**
 * One-time disclosure shown before a guest session starts (specs/013-guest-access-mode, US1).
 *
 * It is a disclosure, not an activity log: a visitor has no history to show yet. The body therefore
 * names what is unavailable, why, and that AI on the visitor's own machine stays available — the
 * restriction follows who pays, not whether a feature is called "AI".
 *
 * Dismissal must leave no trace: the parent only starts a session on confirm.
 */
export default function GuestAccessDialog({ t, onConfirm, onDismiss }: GuestAccessDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Move focus into the dialog on open so a keyboard user is not left behind on the trigger.
  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  // Escape dismisses, matching the cancel action — neither starts a session.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onDismiss();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onDismiss]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-access-title"
        aria-describedby="guest-access-body"
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="guest-access-title" className="text-base font-bold text-foreground">
            {t.guestAccessDialogTitle}
          </h2>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t.guestAccessDialogClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div id="guest-access-body" className="mt-4 space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t.guestAccessDialogIntro}
          </p>

          <p className="text-xs leading-relaxed text-foreground">
            {t.guestAccessDialogUnavailableList}
          </p>

          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{t.guestAccessDialogReason}</span>
          </p>

          <p className="flex items-start gap-2 text-xs leading-relaxed text-foreground">
            <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <span>{t.guestAccessDialogLocalAiNote}</span>
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t.guestAccessDialogCancel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t.guestAccessDialogConfirm}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
