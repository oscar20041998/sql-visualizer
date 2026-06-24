'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Code2,
  GitFork,
  BarChart3,
  Layers,
  Settings,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Globe,
  Zap,
  BookOpen,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';

const navItems = [
  { key: 'navQueryInput', href: '/', icon: Code2, badge: null },
  { key: 'navGraphVisualizer', href: '/relationship-graph-visualizer', icon: GitFork, badge: null },
  { key: 'navMetricsDashboard', href: '/sql-metrics-dashboard', icon: BarChart3, badge: null },
  { key: 'navCTEAnalysis', href: '/cte-analysis', icon: Layers, badge: null },
  { key: 'navGuideline', href: '/guideline', icon: BookOpen, badge: null },
  { key: 'navSettings', href: '/settings-preferences', icon: Settings, badge: null },
] as const;

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { settings, updateSettings, analysisResult } = useAppStore();
  const t = getT(settings.locale);

  const toggleTheme = () => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
  const toggleLocale = () => updateSettings({ locale: settings.locale === 'en' ? 'vi' : 'en' });

  return (
    <aside
      className="relative flex flex-col flex-shrink-0 border-r border-border bg-card transition-all duration-300 ease-in-out"
      style={{ width: collapsed ? 64 : 240 }}
    >
      {/* ── Edge Toggle Button ─────────────────────────────────────────────── */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? (t.expand ?? 'Expand sidebar') : (t.collapse ?? 'Collapse sidebar')}
        className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center w-7 h-7 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted shadow-md transition-all duration-150"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.35)' }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border min-h-[72px]">
        <div className="flex-shrink-0">
          <AppLogo size={32} />
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden animate-fade-in">
            <span className="font-semibold text-sm text-foreground leading-tight truncate">
              {t.appName}
            </span>
            <span className="text-[10px] text-muted-foreground truncate leading-tight">
              {t.appTagline}
            </span>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const label = t[item.key as keyof typeof t] as string;
          const isActive = pathname === item.href;

          return (
            <Link
              key={`nav-${item.href}`}
              href={item.href}
              title={collapsed ? label : undefined}
              className={`
                group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-150
                ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }
              `}
            >
              <Icon
                size={18}
                className={`flex-shrink-0 transition-colors ${isActive ? 'text-primary' : ''}`}
              />
              {!collapsed && <span className="truncate animate-fade-in">{label}</span>}
              {isActive && !collapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              )}
              {/* Analysis indicator */}
              {item.key !== 'navQueryInput' &&
                item.key !== 'navSettings' &&
                analysisResult &&
                !collapsed && (
                  <span className="ml-auto flex-shrink-0">
                    <Zap size={10} className="text-primary opacity-60" />
                  </span>
                )}
              {/* Tooltip for collapsed state */}
              {collapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 text-xs bg-card border border-border rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {label}
                </span>
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
          className="group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150"
        >
          {settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {!collapsed && (
            <span className="truncate animate-fade-in">
              {settings.theme === 'dark' ? t.lightMode : t.darkMode}
            </span>
          )}
          {collapsed && (
            <span className="absolute left-full ml-2 px-2 py-1 text-xs bg-card border border-border rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              {settings.theme === 'dark' ? t.lightMode : t.darkMode}
            </span>
          )}
        </button>

        {/* Language Toggle */}
        <button
          onClick={toggleLocale}
          title={settings.locale === 'en' ? 'Tiếng Việt' : 'English'}
          className="group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150"
        >
          <Globe size={18} />
          {!collapsed && (
            <span className="truncate animate-fade-in font-mono text-xs">
              {settings.locale === 'en' ? 'EN → VI' : 'VI → EN'}
            </span>
          )}
          {collapsed && (
            <span className="absolute left-full ml-2 px-2 py-1 text-xs bg-card border border-border rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              {settings.locale === 'en' ? 'Tiếng Việt' : 'English'}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
