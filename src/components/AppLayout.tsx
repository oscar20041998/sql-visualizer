'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useAppStore } from '@/lib/store';
import { GlobalChat } from '@/components/GlobalChat';
import LoadingOverlay from '@/components/ui/LoadingOverlay';

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
  const theme = useAppStore((s) => s.settings.theme);
  const accentColor = useAppStore((s) => s.settings.accentColor);
  const navigationTarget = useAppStore((s) => s.navigationTarget);
  const completeNavigation = useAppStore((s) => s.completeNavigation);

  useEffect(() => {
    const root = document.documentElement;
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

  useEffect(() => {
    if (navigationTarget !== pathname) return;
    const frame = requestAnimationFrame(() => completeNavigation(pathname));
    return () => cancelAnimationFrame(frame);
  }, [completeNavigation, navigationTarget, pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <LoadingOverlay
        visible={navigationTarget !== null}
        title="Loading..."
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto scrollbar-thin">
          <div className="min-h-full grid-bg">{children}</div>
        </main>
        <AppFooter />
      </div>
      <GlobalChat />
    </div>
  );
}
