'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Code2,
  Home,
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
  ChevronLeft,
  LogOut,
  Sparkles,
  Database,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import { clearDemoAuthenticated } from '@/lib/demoAuth';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';

const navItems = [
  { key: 'navQueryInput', href: '/query-input', icon: Code2, badge: null },
  // { key: 'navSmartEditor', href: '/smart-sql-editor', icon: Sparkles, badge: null },
  { key: 'navMetricsDashboard', href: '/sql-metrics-dashboard', icon: BarChart3, badge: null },
  { key: 'navGraphVisualizer', href: '/relationship-graph-visualizer', icon: GitFork, badge: null },
  { key: 'navDatabaseAssistant', href: '/database-ai-assistant', icon: Database, badge: null },
  { key: 'navGuideline', href: '/guideline', icon: BookOpen, badge: null },
  { key: 'navSettings', href: '/settings-preferences', icon: Settings, badge: null },
] as const;

/**
 * Pages that stand on their own; everything else needs an analysis result first. The Smart SQL
 * Editor belongs here — formatting and the AI explainer work straight from typed SQL.
 */
const NAV_WITHOUT_ANALYSIS = new Set<string>([
  'navHome',
  'navQueryInput',
  'navSmartEditor',
  'navDatabaseAssistant',
  'navGuideline',
  'navSettings',
]);

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { settings, updateSettings, analysisResult, navigationTarget, beginNavigation } = useAppStore();
  const t = getT(settings.locale);

  const toggleTheme = () => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
  const toggleLocale = () => updateSettings({ locale: settings.locale === 'en' ? 'vi' : 'en' });

  const handleSignOut = () => {
    clearDemoAuthenticated();
    toast.success(t.signOutSuccess);
    beginNavigation('/');
    router.push('/');
  };

  return (
    <aside
      className="relative flex flex-col flex-shrink-0 border-r border-border bg-card transition-all duration-300 ease-in-out"
      style={{ width: isCollapsed ? 64 : 240 }}
    >
      {/* Logo & Toggle */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-border min-h-[72px]">
        {!isCollapsed && (
          <div className="flex items-center gap-3 flex-1">
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
        )}
        {isCollapsed && (
          <div className="flex justify-center w-full">
            <AppLogo size={32} />
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand' : 'Collapse'}
          className="flex-shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ml-2"
        >
          <ChevronLeft
            size={18}
            className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const label = t[item.key as keyof typeof t] as string;
          const isActive = pathname === item.href;
          // Lock navigation for analysis pages when no data
          const isLocked = !NAV_WITHOUT_ANALYSIS.has(item.key) && !analysisResult;

          return (
            <Link
              key={`nav-${item.href}`}
              href={isLocked ? '#' : item.href}
              onClick={(e) => {
                if (isLocked) {
                  e.preventDefault();
                  return;
                }
                if (isActive) {
                  e.preventDefault();
                  return;
                }
                e.preventDefault();
                beginNavigation(item.href);
                router.push(item.href);
              }}
              title={isCollapsed ? label : isLocked ? 'Analyze query first' : undefined}
              className={`
                group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${isCollapsed ? 'justify-center' : ''}
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
              {!isCollapsed && <span className="truncate">{label}</span>}
              {!isCollapsed && isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              )}
              {/* Loading indicator during navigation */}
              {!isCollapsed && navigationTarget === item.href && (
                <span className="ml-auto flex-shrink-0">
                  <Loader size={14} className="text-primary animate-spin" />
                </span>
              )}
              {/* Analysis indicator */}
              {!isCollapsed &&
                item.key !== 'navQueryInput' &&
                item.key !== 'navSettings' &&
                item.key !== 'navGuideline' &&
                item.key !== 'navDatabaseAssistant' &&
                analysisResult &&
                !navigationTarget && (
                  <span className="ml-auto flex-shrink-0">
                    <Zap size={10} className="text-primary opacity-60" />
                  </span>
                )}
              {/* Lock indicator for disabled items */}
              {isCollapsed && isLocked && (
                <span className="absolute text-xs text-muted-foreground/50">🔒</span>
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
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 ${isCollapsed ? 'justify-center' : ''}`}
        >
          {settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {!isCollapsed && (
            <span className="truncate">{settings.theme === 'dark' ? t.lightMode : t.darkMode}</span>
          )}
        </button>

        {/* Language Toggle */}
        <button
          onClick={toggleLocale}
          title={settings.locale === 'en' ? 'Tiếng Việt' : 'English'}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 ${isCollapsed ? 'justify-center' : ''}`}
        >
          <Globe size={18} />
          {!isCollapsed && (
            <span className="truncate font-mono text-xs">
              {settings.locale === 'en' ? 'EN → VI' : 'VI → EN'}
            </span>
          )}
        </button>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          title={t.signOut}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-danger/10 hover:text-danger transition-all duration-200 ${isCollapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={18} />
          {!isCollapsed && <span className="truncate">{t.signOut}</span>}
        </button>
      </div>

    </aside>
  );
}
