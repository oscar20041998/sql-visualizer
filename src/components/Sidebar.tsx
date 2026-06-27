'use client';

import React, { useTransition } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Code2,
  GitFork,
  BarChart3,
  Layers,
  Settings,
  Moon,
  Sun,
  Globe,
  Zap,
  BookOpen,
  Loader,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';
import LoadingOverlay from '@/components/ui/LoadingOverlay';

const navItems = [
  { key: 'navQueryInput', href: '/', icon: Code2, badge: null },
  { key: 'navGraphVisualizer', href: '/relationship-graph-visualizer', icon: GitFork, badge: null },
  { key: 'navMetricsDashboard', href: '/sql-metrics-dashboard', icon: BarChart3, badge: null },
  { key: 'navCTEAnalysis', href: '/cte-analysis', icon: Layers, badge: null },
  { key: 'navGuideline', href: '/guideline', icon: BookOpen, badge: null },
  { key: 'navSettings', href: '/settings-preferences', icon: Settings, badge: null },
] as const;

export default function Sidebar() {
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const { settings, updateSettings, analysisResult } = useAppStore();
  const t = getT(settings.locale);

  const toggleTheme = () => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
  const toggleLocale = () => updateSettings({ locale: settings.locale === 'en' ? 'vi' : 'en' });

  return (
    <aside
      className="relative flex flex-col flex-shrink-0 border-r border-border bg-card"
      style={{ width: 240 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border min-h-[72px]">
        <div className="flex-shrink-0">
          <AppLogo size={32} />
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="font-semibold text-sm text-foreground leading-tight truncate">
            {t.appName}
          </span>
          <span className="text-[10px] text-muted-foreground truncate leading-tight">
            {t.appTagline}
          </span>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const label = t[item.key as keyof typeof t] as string;
          const isActive = pathname === item.href;
          // Lock navigation for analysis pages when no data
          const isLocked =
            item.key !== 'navQueryInput' && item.key !== 'navSettings' && !analysisResult;

          return (
            <Link
              key={`nav-${item.href}`}
              href={isLocked ? '#' : item.href}
              onClick={(e) => {
                if (isLocked) {
                  e.preventDefault();
                } else {
                  startTransition(() => {
                    // Navigation will happen automatically
                  });
                }
              }}
              title={isLocked ? 'Analyze query first' : undefined}
              className={`
                group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                ${
                  isLocked
                    ? 'cursor-not-allowed opacity-40 text-muted-foreground'
                    : isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }
              `}
            >
              <Icon size={18} className={`flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
              <span className="truncate">{label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              )}
              {/* Loading indicator during navigation */}
              {isPending && !isActive && (
                <span className="ml-auto flex-shrink-0">
                  <Loader size={14} className="text-primary animate-spin" />
                </span>
              )}
              {/* Analysis indicator */}
              {item.key !== 'navQueryInput' &&
                item.key !== 'navSettings' &&
                analysisResult &&
                !isPending && (
                  <span className="ml-auto flex-shrink-0">
                    <Zap size={10} className="text-primary opacity-60" />
                  </span>
                )}
              {/* Lock indicator for disabled items */}
              {isLocked && (
                <span className="ml-auto flex-shrink-0 text-xs text-muted-foreground/50">🔒</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Controls */}
      <div className="border-t border-border p-2 space-y-1">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={settings.theme === 'dark' ? t.lightMode : t.darkMode}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span className="truncate">{settings.theme === 'dark' ? t.lightMode : t.darkMode}</span>
        </button>

        {/* Language Toggle */}
        <button
          onClick={toggleLocale}
          title={settings.locale === 'en' ? 'Tiếng Việt' : 'English'}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Globe size={18} />
          <span className="truncate font-mono text-xs">
            {settings.locale === 'en' ? 'EN → VI' : 'VI → EN'}
          </span>
        </button>
      </div>

      {/* Global Loading Overlay */}
      <LoadingOverlay
        visible={isPending}
        title={t.loading || 'Loading...'}
        description="Navigating to page..."
      />
    </aside>
  );
}
