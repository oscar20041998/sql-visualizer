'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { useAppStore } from '@/lib/store';

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
          {/* FPT Software logo mark */}
          <div
            className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center font-bold text-[11px] text-white"
            style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}
            aria-label="FPT Software"
          >
            FPT
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-semibold text-foreground">Võ Thanh Duy</span>
            <span className="text-[10px] text-muted-foreground">FPT Software Ho Chi Minh</span>
          </div>
        </div>

        {/* Right: Month/Year */}
        {monthYear && (
          <span className="text-[10px] text-muted-foreground font-mono">{monthYear}</span>
        )}
      </div>
    </footer>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  const theme = useAppStore((s) => s.settings.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, [theme]);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto scrollbar-thin">
          <div className="min-h-full grid-bg">{children}</div>
        </main>
        <AppFooter />
      </div>
    </div>
  );
}
