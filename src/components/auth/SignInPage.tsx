'use client';

import React from 'react';
import { Database, Network, Sparkles } from 'lucide-react';
import SignInPanel from './SignInPanel';
import { getT } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';

/**
 * Full-page sign-in composition (specs/006-login-ui-redesign).
 * Two columns at >=1024px (`lg`): brand introduction left, form right.
 * Below `lg` the brand column is hidden entirely (hidden = removed from the
 * accessibility tree and tab order, per FR-015/FR-016). The form is placed
 * BEFORE the brand column in DOM so it is first in reading/tab order at
 * every width. Brand copy is locale-aware (FR-007).
 */
export default function SignInPage() {
  const settings = useAppStore((state) => state.settings);
  const t = getT(settings.locale as 'en' | 'vi');

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12 sm:px-10 lg:px-16">
      <div className="grid w-full max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Sign-in form — first in DOM, first in tab order (FR-016) */}
        <div className="mx-auto flex w-full justify-center lg:justify-end">
          <SignInPanel />
        </div>

        {/* Brand introduction — auxiliary, hidden below lg (FR-015) */}
        <div
          aria-hidden="true"
          className="hidden select-none lg:block"
        >
          <div className="space-y-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Database size={22} />
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground">
                {t.signInBrandTitle}
              </h2>
              <p className="max-w-md text-base leading-relaxed text-muted-foreground">
                {t.signInBrandTagline}
              </p>
            </div>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Network size={17} className="mt-0.5 shrink-0 text-primary" />
                <span className="text-sm leading-relaxed text-muted-foreground">
                  {t.signInBrandFeatureAnalysis}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Sparkles size={17} className="mt-0.5 shrink-0 text-primary" />
                <span className="text-sm leading-relaxed text-muted-foreground">
                  {t.signInBrandFeatureScoring}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
