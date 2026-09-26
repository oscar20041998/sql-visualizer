'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Database, Network, Sparkles } from 'lucide-react';
import SignInPanel from './SignInPanel';
import { getT } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import LanguageThemeSwitch from '@/components/ui/LanguageThemeSwitch';

/**
 * Full-page sign-in composition (specs/006-login-ui-redesign).
 * Two columns at >=1024px (`lg`): brand introduction left, form right.
 * Below `lg` the brand column is hidden entirely (hidden = removed from the
 * accessibility tree and tab order, per FR-015/FR-016). The form is placed
 * BEFORE the brand column in DOM so it is first in reading/tab order at
 * every width. Brand copy is locale-aware (FR-007).
 * The top bar carries the back-to-home link and the language/theme switches, so
 * signed-out visitors can leave the page and still theme/translate the public
 * shell (FR-008); it sits outside the form and brand columns.
 */
export default function SignInPage() {
  const settings = useAppStore((state) => state.settings);
  const t = getT(settings.locale as 'en' | 'vi');

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-6 pb-12 pt-24 sm:px-10 lg:px-16">
      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 px-6 py-5 sm:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t.backToHome}
        </Link>
        <LanguageThemeSwitch />
      </div>

      <div className="grid w-full max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Sign-in form — first in DOM, first in tab order (FR-016) */}
        <div className="mx-auto flex w-full justify-center lg:justify-end">
          <SignInPanel />
        </div>

        {/* Brand introduction — auxiliary, hidden below lg (FR-015) */}
        <div aria-hidden="true" className="hidden select-none lg:block">
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
