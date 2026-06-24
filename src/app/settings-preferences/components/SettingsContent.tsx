'use client';

import React, { useState } from 'react';
import {
  Settings,
  Palette,
  Globe,
  Database,
  GitFork,
  Moon,
  Sun,
  Check,
  RotateCcw,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore, type AppSettings } from '@/lib/store';
import { getT } from '@/lib/i18n';
import type { SqlDialect } from '@/lib/sqlAnalyzer';
import Icon from '@/components/ui/AppIcon';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background ${
        checked ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0 pr-8">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function SelectDropdown<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-input border border-border text-sm text-foreground hover:bg-muted transition-colors min-w-[160px] justify-between"
      >
        <span>{current?.label}</span>
        <ChevronDown size={13} className="text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-50 py-1 min-w-[160px] animate-slide-up">
          {options.map((opt) => (
            <button
              key={`opt-${opt.value}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                value === opt.value
                  ? 'text-primary bg-primary/10'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {value === opt.value && <Check size={12} className="text-primary flex-shrink-0" />}
              {value !== opt.value && <span className="w-3" />}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const SETTINGS_CATEGORIES = [
  { key: 'appearance', icon: Palette },
  { key: 'language', icon: Globe },
  { key: 'analysis', icon: Database },
  { key: 'graph', icon: GitFork },
] as const;

const DIALECT_OPTIONS: { value: SqlDialect; label: string }[] = [
  { value: 'mysql', label: 'MySQL' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'sqlserver', label: 'SQL Server' },
  { value: 'oracle', label: 'Oracle DB' },
];

const LAYOUT_OPTIONS = [
  { value: 'dagre' as const, label: '' },
  { value: 'force' as const, label: '' },
  { value: 'grid' as const, label: '' },
];

const SPACING_OPTIONS = [
  { value: 'compact' as const, label: 'Compact' },
  { value: 'normal' as const, label: 'Normal' },
  { value: 'spacious' as const, label: 'Spacious' },
];

const EDGE_OPTIONS = [
  { value: 'smooth' as const, label: '' },
  { value: 'straight' as const, label: '' },
  { value: 'step' as const, label: '' },
];

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  locale: 'en',
  defaultDialect: 'mysql',
  autoAnalyze: false,
  graphLayout: 'dagre',
  nodeSpacing: 'normal',
  edgeStyle: 'smooth',
};

export default function SettingsContent() {
  const { settings, updateSettings } = useAppStore();
  const t = getT(settings.locale);
  const [activeCategory, setActiveCategory] = useState<
    'appearance' | 'language' | 'analysis' | 'graph'
  >('appearance');

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    updateSettings({ [key]: value });
    toast.success(t.saved, { duration: 1500 });
  };

  const resetDefaults = () => {
    updateSettings(DEFAULT_SETTINGS);
    toast.success('Settings reset to defaults');
  };

  const categoryLabels: Record<string, string> = {
    appearance: t.settingsAppearance,
    language: t.settingsLanguage,
    analysis: t.settingsAnalysis,
    graph: t.settingsGraph,
  };

  // Fill in translated labels for options
  const layoutOptionsTranslated = [
    { value: 'dagre' as const, label: t.layoutDagre },
    { value: 'force' as const, label: t.layoutForce },
    { value: 'grid' as const, label: t.layoutGrid },
  ];
  const edgeOptionsTranslated = [
    { value: 'smooth' as const, label: t.edgeSmooth },
    { value: 'straight' as const, label: t.edgeStraight },
    { value: 'step' as const, label: t.edgeStep },
  ];

  return (
    <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Settings size={22} className="text-primary" />
            {t.settingsTitle}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t.settingsSubtitle}</p>
        </div>
        <button
          onClick={resetDefaults}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95"
        >
          <RotateCcw size={13} />
          {t.resetDefaults}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Left Category Nav */}
        <div className="w-52 flex-shrink-0">
          <nav className="space-y-1">
            {SETTINGS_CATEGORIES.map(({ key, icon: Icon }) => (
              <button
                key={`settings-cat-${key}`}
                onClick={() => setActiveCategory(key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  activeCategory === key
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon size={16} className="flex-shrink-0" />
                {categoryLabels[key]}
              </button>
            ))}
          </nav>
        </div>

        {/* Right Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">
                {categoryLabels[activeCategory]}
              </h2>
            </div>
            <div className="px-6">
              {/* Appearance */}
              {activeCategory === 'appearance' && (
                <div>
                  <SettingRow label={t.darkMode} hint={t.darkModeHint}>
                    <div className="flex items-center gap-2">
                      <Sun size={14} className="text-muted-foreground" />
                      <Toggle
                        checked={settings.theme === 'dark'}
                        onChange={(v) => update('theme', v ? 'dark' : 'light')}
                      />
                      <Moon size={14} className="text-muted-foreground" />
                    </div>
                  </SettingRow>
                  <SettingRow label={t.accentColor} hint={t.accentColorHint}>
                    <div className="flex items-center gap-2">
                      {['#6ee7f7', '#a78bfa', '#34d399', '#fb923c', '#f472b6'].map((color) => (
                        <button
                          key={`accent-${color}`}
                          className="w-6 h-6 rounded-full border-2 border-transparent hover:border-foreground transition-all"
                          style={{ background: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </SettingRow>
                </div>
              )}

              {/* Language */}
              {activeCategory === 'language' && (
                <div>
                  <SettingRow label={t.language} hint={t.languageHint}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => update('locale', 'en')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                          settings.locale === 'en'
                            ? 'bg-primary/10 text-primary border-primary/30'
                            : 'bg-card border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <span>🇺🇸</span>
                        English
                      </button>
                      <button
                        onClick={() => update('locale', 'vi')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                          settings.locale === 'vi'
                            ? 'bg-primary/10 text-primary border-primary/30'
                            : 'bg-card border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <span>🇻🇳</span>
                        Tiếng Việt
                      </button>
                    </div>
                  </SettingRow>
                </div>
              )}

              {/* Analysis Defaults */}
              {activeCategory === 'analysis' && (
                <div>
                  <SettingRow label={t.defaultDialect} hint={t.defaultDialectHint}>
                    <SelectDropdown
                      value={settings.defaultDialect}
                      options={DIALECT_OPTIONS}
                      onChange={(v) => update('defaultDialect', v)}
                    />
                  </SettingRow>
                  <SettingRow label={t.autoAnalyze} hint={t.autoAnalyzeHint}>
                    <Toggle
                      checked={settings.autoAnalyze}
                      onChange={(v) => update('autoAnalyze', v)}
                    />
                  </SettingRow>
                </div>
              )}

              {/* Graph Layout */}
              {activeCategory === 'graph' && (
                <div>
                  <SettingRow label={t.graphLayout} hint={t.graphLayoutHint}>
                    <SelectDropdown
                      value={settings.graphLayout}
                      options={layoutOptionsTranslated}
                      onChange={(v) => update('graphLayout', v)}
                    />
                  </SettingRow>
                  <SettingRow label={t.nodeSpacing} hint={t.nodeSpacingHint}>
                    <SelectDropdown
                      value={settings.nodeSpacing}
                      options={SPACING_OPTIONS}
                      onChange={(v) => update('nodeSpacing', v)}
                    />
                  </SettingRow>
                  <SettingRow label={t.edgeStyle} hint={t.edgeStyleHint}>
                    <SelectDropdown
                      value={settings.edgeStyle}
                      options={edgeOptionsTranslated}
                      onChange={(v) => update('edgeStyle', v)}
                    />
                  </SettingRow>
                </div>
              )}
            </div>
          </div>

          {/* Info Panel */}
          <div className="mt-4 p-4 bg-card border border-border rounded-xl">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Settings are persisted to{' '}
              <span className="font-mono text-foreground">localStorage</span> and restored on next
              visit. Theme and language changes apply instantly across all screens.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
