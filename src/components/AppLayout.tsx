'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Sidebar from '@/components/Sidebar';
import { useAppStore } from '@/lib/store';
import { GlobalChat } from '@/components/GlobalChat';
import RouteProgressBar from '@/components/ui/RouteProgressBar';
import {
  getSocialSession,
  isDemoAuthenticated,
  isGuestSession,
  SOCIAL_AUTH_STORAGE_KEY,
} from '@/lib/demoAuth';
import { getT } from '@/lib/i18n';

interface AppLayoutProps {
  children: React.ReactNode;
}

function AppFooter() {
  const [monthYear, setMonthYear] = useState('');

  useEffect(() => {
    const now = new Date();
    setMonthYear(now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
  }, []);

  return (
    <footer className="flex-shrink-0 border-t border-border" style={{ background: 'var(--card)' }}>
      <div className="flex items-center justify-between px-6 py-2.5 gap-4 flex-wrap">
        {/* Left: Name + Company */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-semibold text-foreground">
              ©{new Date().getFullYear()} Copy Right - All Rights Reserved
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

const COLOR_PRESETS: Record<string, { dark: string; light: string }> = {
  '#6ee7f7': { dark: '#6ee7f7', light: '#0969da' }, // cyan -> blue
  '#a78bfa': { dark: '#a78bfa', light: '#8250df' }, // purple -> purple
  '#34d399': { dark: '#34d399', light: '#059669' }, // emerald -> green
  '#fb923c': { dark: '#fb923c', light: '#ea580c' }, // orange -> orange
  '#f472b6': { dark: '#f472b6', light: '#c5192d' }, // pink -> red
};

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useAppStore((s) => s.settings.locale);
  const theme = useAppStore((s) => s.settings.theme);
  const accentColor = useAppStore((s) => s.settings.accentColor);
  const navigationTarget = useAppStore((s) => s.navigationTarget);
  const completeNavigation = useAppStore((s) => s.completeNavigation);
  const cancelNavigation = useAppStore((s) => s.cancelNavigation);
  // null = unknown (SSR/pre-hydration), true = signed in. Mirrors the
  // query-input gate pattern: render nothing until the check completes,
  // so protected content never flashes for signed-out visitors.
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [authorizedPathname, setAuthorizedPathname] = useState<string | null>(null);
  // A browser back/forward navigation runs no in-app handler, so nothing calls `beginNavigation`
  // and the store never learns about it. `popstate` is the signal that such a navigation started;
  // the pathname effect below retires it once the route has actually moved.
  const [isRestoringHistory, setIsRestoringHistory] = useState(false);

  useEffect(() => {
    const handlePopState = () => setIsRestoringHistory(true);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    setIsRestoringHistory(false);
  }, [pathname]);

  useEffect(() => {
    const hadStoredSession = window.localStorage.getItem(SOCIAL_AUTH_STORAGE_KEY) !== null;
    const staleSession = hadStoredSession && !getSocialSession();
    // A guest is admitted too (FR-008, task T019): the workspace shell is what they were promised
    // on confirming the disclosure, and the AI routes refuse independently at the server boundary.
    // Only a signed-out visitor with no guest marker is bounced to /login.
    if ((!isDemoAuthenticated() && !isGuestSession()) || staleSession) {
      setIsAuthorized(false);
      setAuthorizedPathname(null);
      if (staleSession) {
        toast.info(getT(locale).authSessionExpiredMessage);
      }
      router.replace('/login');
      return;
    }
    setIsAuthorized(true);
    setAuthorizedPathname(pathname);
  }, [locale, pathname, router]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }

    // Apply accent color
    const selectedColor = accentColor || '#6ee7f7';
    const colorMap = COLOR_PRESETS[selectedColor] || COLOR_PRESETS['#6ee7f7'];
    const primaryColor = theme === 'dark' ? colorMap.dark : colorMap.light;

    root.style.setProperty('--primary', primaryColor);
    root.style.setProperty('--primary-foreground', theme === 'dark' ? '#0d1117' : '#ffffff');
  }, [theme, accentColor]);

  // Only settle navigation when the route arrives, not when a target is first set.
  useEffect(() => {
    const target = useAppStore.getState().navigationTarget;
    if (target === null) return;
    if (target === pathname) {
      const frame = requestAnimationFrame(() => completeNavigation(pathname));
      return () => cancelAnimationFrame(frame);
    }
    const frame = requestAnimationFrame(() => {
      if (useAppStore.getState().navigationTarget === target) cancelNavigation();
    });
    return () => cancelAnimationFrame(frame);
  }, [cancelNavigation, completeNavigation, pathname]);

  // Auth gate: signed-out users never see protected content (not even a
  // flash) — nothing renders until the check passes, mirroring query-input.
  if (!isAuthorized) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <RouteProgressBar active={navigationTarget !== null || isRestoringHistory} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto scrollbar-thin">
          {/* `h-full` (not just `min-h-full`) is deliberate: this is the shell that gives the page
              content a *definite* height to resolve percentage heights against. A percentage height
              resolves against the parent's `height` property only — `min-height` does not make a
              parent definite — so with `min-h-full` alone, every `h-full` descendant silently
              collapsed to `auto`. That is what left the Database Assistant history sidebar
              content-sized instead of filling the viewport, and what stopped its `overflow-y-auto`
              list from ever scrolling internally (specs/014 U41). `min-h-full` is kept so a short
              page still fills the viewport, and because this box does not clip, a page whose content
              is taller simply overflows into `main`'s own scrollbar. */}
          <div className="h-full min-h-full grid-bg">
            {authorizedPathname === pathname ? children : null}
          </div>
        </main>
        <AppFooter />
      </div>
      <GlobalChat />
    </div>
  );
}
