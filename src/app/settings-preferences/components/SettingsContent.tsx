'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Settings,
  Palette,
  Globe,
  Database,
  GitFork,
  Bot,
  Moon,
  Sun,
  Check,
  RotateCcw,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import ModelCombobox from './ModelCombobox';
import { toast } from 'sonner';
import { useAppStore, type AppSettings, type AIModelConfig, DEFAULT_SETTINGS } from '@/lib/store';
import {
  DEFAULT_BASE_URLS,
  DEFAULT_CHAT_MODELS,
  RETIRED_GEMINI_MODELS,
  DEFAULT_CONTEXT_TOKENS,
  DEFAULT_MAX_OUTPUT_TOKENS,
  DEFAULT_OLLAMA_MODEL,
  ENV_VAR_BY_PROVIDER,
  type AIProvider,
  type CloudProvider,
} from '@/lib/ai/aiProviders';
import { DEFAULT_SPEECH_GENDER } from '@/lib/ai/aiSpeech';
import LockedFeatureNotice from '@/components/ui/LockedFeatureNotice';
import { isCapabilityLockedForGuest, useCapabilityLock } from '@/lib/useCapabilityLock';
import { getT } from '@/lib/i18n';
import type { SqlDialect } from '@/lib/sql/sqlAnalyzer';
import Icon from '@/components/ui/AppIcon';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`group relative inline-flex h-5 w-9 items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        checked ? 'bg-primary hover:brightness-110' : 'bg-muted hover:bg-border'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full shadow-sm transition-transform duration-200 motion-reduce:transition-none ${
          checked ? 'translate-x-4 bg-primary-foreground' : 'translate-x-0.5 bg-foreground'
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
    <div className="flex flex-col gap-3 border-b border-border py-4 last:border-0 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      </div>
      <div className="min-w-0 max-w-full lg:shrink-0">{children}</div>
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
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="group flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground hover:border-primary hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-w-[200px]"
      >
        <span className="truncate">{current?.label}</span>
        <ChevronDown
          size={13}
          className={`flex-shrink-0 text-muted-foreground transition-transform duration-200 group-hover:text-foreground motion-reduce:transition-none ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-0 overflow-y-auto rounded-md border border-border bg-card p-1 shadow-lg scrollbar-thin max-h-[min(20rem,60vh)] md:left-auto md:right-0 md:w-max md:min-w-full md:max-w-[24rem]">
          {options.map((opt) => (
            <button
              key={`opt-${opt.value}`}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`flex min-h-11 w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                value === opt.value
                  ? 'text-primary bg-primary/10 font-medium'
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
  { key: 'ai', icon: Bot },
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

/**
 * Wraps a per-provider field with a "back to default" button. These defaults differ per provider
 * (a 4096-token Ollama window vs 128k on gpt-4o), so there is no single number a user can be
 * expected to remember once they have edited one.
 */
function ResettableField({
  isModified,
  onReset,
  resetTitle,
  children,
}: {
  isModified: boolean;
  onReset: () => void;
  resetTitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 max-w-full items-center gap-2">
      {children}
      {isModified && (
        <button
          onClick={onReset}
          title={resetTitle}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-border bg-card p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <RotateCcw size={12} />
        </button>
      )}
    </div>
  );
}

/** Keeps a numeric input inside range, falling back to the default while the field is empty. */
function clampNumber(raw: string, min: number, max: number, fallback: number): number {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

// Labels will be provided dynamically from i18n in component
const SPACING_OPTIONS = [
  { value: 'compact' as const, label: '' },
  { value: 'normal' as const, label: '' },
  { value: 'spacious' as const, label: '' },
];

const EDGE_OPTIONS = [
  { value: 'smooth' as const, label: '' },
  { value: 'straight' as const, label: '' },
  { value: 'step' as const, label: '' },
];

/**
 * Offered when the provider's model list could not be fetched. The first entry is the provider's
 * default (DEFAULT_CHAT_MODELS), so a failed request still lands on a model that works.
 */
const FALLBACK_CHAT_MODELS: Record<CloudProvider, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-5', 'gpt-5-mini'],
  anthropic: ['claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022'],
  gemini: ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash'],
  aiportal: [
    'GPT-6-Luna',
    'GPT-5.4',
    'GPT-5.4-mini',
    'GPT-5',
    'GPT-5-mini',
    'DeepSeek-V4.1-Flash',
    'Kimi-K2.6',
    'Kimi-K2.5',
    'DeepSeek-V4-Flash',
    'Gemini-3.1-Flash-Lite',
    'Gemini-3.1-Pro',
    'Gemini-3.6-Flash',
    'Gemini-3.5-Flash',
    'Gemini-3.5-Flash-Lite',
    'Gemini-3-Flash',
  ],
};

const CONTEXT_TOKEN_PRESETS: Record<AIProvider, number[]> = {
  ollama: [2048, 4096, 8192, 16384, 32768, 65536],
  openai: [8192, 16384, 32768, 65536, 128000, 200000, 400000],
  anthropic: [8192, 16384, 32768, 65536, 100000, 200000],
  gemini: [8192, 16384, 32768, 65536, 128000, 256000, 512000, 1000000],
  aiportal: [8192, 16384, 32768, 65536, 128000, 256000, 512000, 1000000],
};

const MAX_OUTPUT_TOKEN_PRESETS = [128, 256, 512, 1024, 1200, 2048, 4096, 8192, 12288, 16384];

export default function SettingsContent() {
  const { settings, updateSettings } = useAppStore();
  const t = getT(settings.locale);
  const [activeCategory, setActiveCategory] = useState<
    'appearance' | 'language' | 'analysis' | 'graph' | 'ai'
  >('appearance');

  const savedAiConfig = settings.aiConfig ?? DEFAULT_SETTINGS.aiConfig;

  /**
   * The AI section edits a draft and commits on Save, unlike the other categories which apply
   * instantly. Model IDs, URLs and prompts are typed character by character — saving on every
   * keystroke would fire a toast per letter and persist half-typed values.
   */
  const [aiDraft, setAiDraft] = useState<AIModelConfig>(savedAiConfig);
  // Model IDs added by hand this session. They are held apart from `availableModels` so a provider
  // refresh does not silently drop them, and so the picker stays a single control.
  const [customModels, setCustomModels] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelLoadError, setModelLoadError] = useState('');
  const [modelLoadAttempt, setModelLoadAttempt] = useState(0);

  // Re-sync when the stored config changes from elsewhere (Reset to defaults, another tab).
  useEffect(() => {
    setAiDraft(savedAiConfig);
  }, [savedAiConfig]);

  // A config saved before a model was retired still names that model, and every request then fails
  // with a provider error the user cannot act on. Repair the stored value once on read so an
  // existing profile recovers without a manual re-pick.
  useEffect(() => {
    const storedModel = savedAiConfig.modelId;
    if (
      savedAiConfig.provider === 'gemini' &&
      RETIRED_GEMINI_MODELS.some((pattern) => pattern.test(storedModel))
    ) {
      updateSettings({ aiConfig: { ...savedAiConfig, modelId: DEFAULT_CHAT_MODELS.gemini } });
    }
  }, [savedAiConfig, updateSettings]);

  useEffect(() => {
    if (activeCategory !== 'ai') return;

    if (isCapabilityLockedForGuest('sql-explainer')) {
      setAvailableModels([]);
      setModelsLoaded(false);
      setModelLoadError('');
      setIsLoadingModels(false);
      return;
    }

    if (aiDraft.provider === 'ollama') {
      setAvailableModels([]);
      setModelsLoaded(false);
      setModelLoadError('');
      return;
    }

    const controller = new AbortController();
    setAvailableModels([]);
    setModelsLoaded(false);
    setModelLoadError('');
    setIsLoadingModels(true);

    const timeoutId = window.setTimeout(() => {
      fetch('/api/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiDraft.provider,
          baseUrl: aiDraft.baseUrls[aiDraft.provider],
        }),
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = await response.json().catch(() => null);
          if (!response.ok) {
            if (payload?.code === 'AI_SESSION_REQUIRED') {
              throw new Error(t.aiModelsSignInRequired);
            }
            throw new Error(payload?.error || `Model listing failed (${response.status}).`);
          }
          return Array.isArray(payload?.models)
            ? payload.models.filter((model: unknown): model is string => typeof model === 'string')
            : [];
        })
        .then((models: string[]) => {
          if (!controller.signal.aborted) {
            const modelsToUse =
              models.length > 0
                ? models
                : aiDraft.provider === 'aiportal'
                  ? FALLBACK_CHAT_MODELS.aiportal
                  : models;
            setAvailableModels(modelsToUse);
            setModelsLoaded(true);
            if (models.length > 0) {
              // Prefer the provider's curated default; fall back to whatever it returned first.
              const preferredModel = DEFAULT_CHAT_MODELS[aiDraft.provider];
              const fallbackModel = models.includes(preferredModel) ? preferredModel : models[0];
              setAiDraft((prev) =>
                prev.provider === aiDraft.provider &&
                (!prev.modelId.trim() ||
                  (aiDraft.provider !== 'ollama' &&
                    FALLBACK_CHAT_MODELS[aiDraft.provider].includes(prev.modelId) &&
                    !models.includes(prev.modelId)))
                  ? { ...prev, modelId: fallbackModel }
                  : prev
              );
            }
          }
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            if (aiDraft.provider === 'aiportal') {
              setAvailableModels(FALLBACK_CHAT_MODELS.aiportal);
              setModelsLoaded(true);
            }
            setModelLoadError(error instanceof Error ? error.message : t.aiModelsLoadFailed);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoadingModels(false);
        });
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    activeCategory,
    aiDraft.provider,
    aiDraft.baseUrls,
    modelLoadAttempt,
    t.aiModelsLoadFailed,
    t.aiModelsSignInRequired,
  ]);

  const isAiDirty = useMemo(
    () => JSON.stringify(aiDraft) !== JSON.stringify(savedAiConfig),
    [aiDraft, savedAiConfig]
  );

  const isAiConfigValid = useMemo(() => {
    if (aiDraft.provider === 'ollama') {
      return aiDraft.ollamaModel.trim().length > 0;
    }
    return aiDraft.modelId.trim().length > 0;
  }, [aiDraft]);

  const aiConfigValidationMessage = useMemo(() => {
    if (aiDraft.provider === 'ollama' && !aiDraft.ollamaModel.trim()) {
      return t.aiLocalModelRequired;
    }
    if (aiDraft.provider !== 'ollama' && !aiDraft.modelId.trim()) {
      return t.aiModelIdRequired;
    }
    return '';
  }, [aiDraft, t]);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    updateSettings({ [key]: value });
    toast.success(t.saved, { duration: 1500 });
  };

  const updateAI = <K extends keyof AIModelConfig>(key: K, value: AIModelConfig[K]) => {
    setAiDraft((prev) => ({ ...prev, [key]: value }));
  };

  const updateBaseUrl = (provider: AIProvider, value: string) => {
    setAiDraft((prev) => ({ ...prev, baseUrls: { ...prev.baseUrls, [provider]: value } }));
  };

  /** Updates one provider's entry in a per-provider numeric map, leaving the others alone. */
  const updateProviderNumber = (
    key: 'contextTokens' | 'maxOutputTokens',
    provider: AIProvider,
    value: number
  ) => {
    setAiDraft((prev) => ({ ...prev, [key]: { ...prev[key], [provider]: value } }));
  };

  const saveAiConfig = () => {
    updateSettings({ aiConfig: aiDraft });
    toast.success(t.aiConfigSaved, { duration: 1500 });
  };

  const discardAiConfig = () => {
    setAiDraft(savedAiConfig);
    toast.info(t.aiConfigDiscarded, { duration: 1500 });
  };

  const resetDefaults = () => {
    updateSettings(DEFAULT_SETTINGS);
    setAiDraft(DEFAULT_SETTINGS.aiConfig);
    toast.success(t.resetSettingsSuccess, { duration: 1500 });
  };

  const categoryLabels: Record<string, string> = {
    appearance: t.settingsAppearance,
    language: t.settingsLanguage,
    analysis: t.settingsAnalysis,
    graph: t.settingsGraph,
    ai: t.settingsAI,
  };

  // Declared after the labels so the notice has its i18n string; the hook itself only needs the id.
  // `sql-explainer` is representative: if a guest may not configure that, configuring any provider
  // is pointless (specs/013 US2).
  const isAiLocked = useCapabilityLock('sql-explainer');

  // Fill in translated labels for options
  const layoutOptionsTranslated = [
    { value: 'dagre' as const, label: t.layoutDagre },
    { value: 'force' as const, label: t.layoutForce },
    { value: 'grid' as const, label: t.layoutGrid },
  ];
  const spacingOptionsTranslated = [
    { value: 'compact' as const, label: t.spacingCompact },
    { value: 'normal' as const, label: t.spacingNormal },
    { value: 'spacious' as const, label: t.spacingSpacious },
  ];
  const edgeOptionsTranslated = [
    { value: 'smooth' as const, label: t.edgeSmooth },
    { value: 'straight' as const, label: t.edgeStraight },
    { value: 'step' as const, label: t.edgeStep },
  ];
  const aiProviderOptionsTranslated: { value: AIModelConfig['provider']; label: string }[] = [
    { value: 'ollama', label: t.aiProviderOllama },
    { value: 'openai', label: t.aiProviderOpenAI },
    { value: 'anthropic', label: t.aiProviderAnthropic },
    { value: 'gemini', label: t.aiProviderGemini },
    { value: 'aiportal', label: t.aiProviderAIPortal },
  ];
  /** Registers a hand-typed model ID so it stays selectable in the combobox. */
  const addCustomModel = useCallback(
    (modelId: string) => {
      setCustomModels((previous) =>
        previous.includes(modelId) ? previous : [...previous, modelId]
      );
      updateAI('modelId', modelId);
    },
    [updateAI]
  );

  const modelOptions =
    aiDraft.provider === 'ollama'
      ? []
      : [
          ...new Set([
            ...(availableModels.length > 0
              ? availableModels
              : FALLBACK_CHAT_MODELS[aiDraft.provider]),
            ...customModels,
            ...(aiDraft.modelId && !availableModels.includes(aiDraft.modelId)
              ? [aiDraft.modelId]
              : []),
          ]),
        ];
  const formatTokenCount = (value: number) =>
    `${value.toLocaleString(settings.locale === 'vi' ? 'vi-VN' : 'en-US')} ${t.aiTokenUnit}`;
  const contextTokenOptions = [
    ...new Set([
      ...CONTEXT_TOKEN_PRESETS[aiDraft.provider],
      aiDraft.contextTokens[aiDraft.provider],
    ]),
  ]
    .sort((a, b) => a - b)
    .map((value) => ({ value: String(value), label: formatTokenCount(value) }));
  const maxOutputTokenOptions = [
    ...new Set([...MAX_OUTPUT_TOKEN_PRESETS, aiDraft.maxOutputTokens[aiDraft.provider]]),
  ]
    .sort((a, b) => a - b)
    .map((value) => ({ value: String(value), label: formatTokenCount(value) }));

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8 xl:px-10">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div className="min-w-0">
          <h1 className="flex items-center gap-3 text-2xl font-semibold text-foreground">
            <Settings size={22} className="text-primary" />
            {t.settingsTitle}
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.settingsSubtitle}</p>
        </div>
        <button
          onClick={resetDefaults}
          className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <RotateCcw size={13} />
          {t.resetDefaults}
        </button>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">
        {/* Left Category Nav */}
        <div className="min-w-0 lg:w-52 lg:shrink-0">
          <nav className="flex flex-wrap gap-1 lg:flex-col">
            {SETTINGS_CATEGORIES.map(({ key, icon: Icon }) => (
              <button
                key={`settings-cat-${key}`}
                onClick={() => setActiveCategory(key)}
                className={`flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:w-full ${
                  activeCategory === key
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon size={16} className="flex-shrink-0" />
                {categoryLabels[key]}
                {/* Unsaved-changes dot, so switching category does not hide pending edits. */}
                {key === 'ai' && isAiDirty && (
                  <span
                    title={t.aiConfigUnsaved}
                    className="ml-auto h-1.5 w-1.5 flex-shrink-0 rounded-full bg-warning"
                  />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Right Content */}
        <div className="flex-1 min-w-0">
          <div className="rounded-card border border-border bg-card">
            <div className="border-b border-border px-4 py-4 sm:px-6">
              <h2 className="text-base font-semibold text-foreground">
                {categoryLabels[activeCategory]}
              </h2>
              {activeCategory === 'ai' && (
                <p className="mt-1 text-xs text-muted-foreground">{t.aiConfigSubtitle}</p>
              )}
            </div>
            <div className="px-4 sm:px-6">
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
                          onClick={() => update('accentColor', color)}
                          className="h-6 w-6 rounded-full border-2 border-transparent hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => update('locale', 'en')}
                        className={`flex min-h-11 items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                          settings.locale === 'en'
                            ? 'bg-primary/10 text-primary border-primary/30'
                            : 'border-border bg-transparent text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {t.languageEnglish}
                      </button>
                      <button
                        onClick={() => update('locale', 'vi')}
                        className={`flex min-h-11 items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                          settings.locale === 'vi'
                            ? 'bg-primary/10 text-primary border-primary/30'
                            : 'border-border bg-transparent text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {t.languageVietnamese}
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
                      options={spacingOptionsTranslated}
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

              {/* AI Model Configuration */}
              {activeCategory === 'ai' && (
                <div>
                  {/*
                    A guest cannot reach any AI feature, so configuring a provider would be
                    meaningless — worse, it invites them to paste a credential for something that will
                    still be refused. The non-AI settings above stay fully available.
                  */}
                  {isAiLocked && (
                    <div className="mb-4">
                      <LockedFeatureNotice t={t} featureName={t.settingsAI} />
                    </div>
                  )}
                  {/* fieldset rather than per-input disabled: one wrapper keeps every control inert. */}
                  <fieldset
                    disabled={isAiLocked}
                    aria-disabled={isAiLocked}
                    className={isAiLocked ? 'opacity-60' : undefined}
                  >
                    <SettingRow label={t.aiProvider} hint={t.aiProviderHint}>
                      <SelectDropdown
                        value={aiDraft.provider}
                        options={aiProviderOptionsTranslated}
                        onChange={(provider) => {
                          updateAI('provider', provider);
                          // Model IDs are provider-specific, so a switch discards the hand-added ones.
                          setCustomModels([]);
                          // Model IDs are provider-specific, so a switch resets to that
                          // provider's default rather than carrying the previous one over.
                          if (provider !== aiDraft.provider) {
                            if (provider === 'ollama') {
                              // Ollama reads ollamaModel, not modelId (see aiService.callProvider).
                              updateAI('ollamaModel', DEFAULT_OLLAMA_MODEL);
                            } else {
                              updateAI('modelId', DEFAULT_CHAT_MODELS[provider]);
                            }
                          }
                        }}
                      />
                    </SettingRow>

                    {/* Every provider has its own base URL, all kept so switching does not lose them. */}
                    <SettingRow
                      label={t.aiBaseUrl}
                      hint={aiDraft.provider === 'ollama' ? t.aiBaseUrlHint : t.aiBaseUrlCloudHint}
                    >
                      <ResettableField
                        isModified={
                          aiDraft.baseUrls[aiDraft.provider] !== DEFAULT_BASE_URLS[aiDraft.provider]
                        }
                        onReset={() =>
                          updateBaseUrl(aiDraft.provider, DEFAULT_BASE_URLS[aiDraft.provider])
                        }
                        resetTitle={t.aiBaseUrlReset}
                      >
                        <input
                          type="text"
                          value={aiDraft.baseUrls[aiDraft.provider] ?? ''}
                          onChange={(e) => updateBaseUrl(aiDraft.provider, e.target.value)}
                          placeholder={DEFAULT_BASE_URLS[aiDraft.provider]}
                          className="w-full min-w-0 rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:w-[260px]"
                        />
                      </ResettableField>
                    </SettingRow>

                    {aiDraft.provider === 'ollama' ? (
                      <SettingRow label={t.aiLocalModel} hint={t.aiLocalModelHint}>
                        <div className="w-full max-w-full sm:w-[220px]">
                          <input
                            type="text"
                            value={aiDraft.ollamaModel}
                            onChange={(e) => updateAI('ollamaModel', e.target.value)}
                            placeholder="llama3"
                            className={`w-full rounded-md border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                              !aiDraft.ollamaModel.trim()
                                ? 'border-rose-500 focus:border-rose-500'
                                : 'border-border'
                            }`}
                          />
                          {!aiDraft.ollamaModel.trim() && (
                            <p className="mt-2 text-xs text-rose-500">{t.aiLocalModelRequired}</p>
                          )}
                        </div>
                      </SettingRow>
                    ) : (
                      <>
                        <SettingRow label={t.aiModelId} hint={t.aiModelIdHint}>
                          <ModelCombobox
                            value={aiDraft.modelId || modelOptions[0] || ''}
                            options={modelOptions}
                            onChange={(modelId) => updateAI('modelId', modelId)}
                            onAddCustom={addCustomModel}
                            disabled={isAiLocked}
                            labels={{
                              searchPlaceholder: t.aiModelSearch,
                              noResults: t.aiModelsNoneAvailable,
                              addCustom: t.aiModelAdd,
                              triggerLabel: t.aiModelId,
                            }}
                          />
                          <div className="mt-1.5 flex min-h-5 flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {isLoadingModels && <span aria-live="polite">{t.aiModelsLoading}</span>}
                            {!isLoadingModels && modelLoadError && (
                              <>
                                <span className="min-w-0 break-words text-rose-500" title={modelLoadError}>
                                  {modelLoadError}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setModelLoadAttempt((attempt) => attempt + 1)}
                                  className="rounded-sm underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  {t.aiModelsRetry}
                                </button>
                              </>
                            )}
                            {!isLoadingModels &&
                              !modelLoadError &&
                              modelsLoaded &&
                              availableModels.length === 0 && (
                                <span>{t.aiModelsNoneAvailable}</span>
                              )}
                          </div>
                        </SettingRow>

                        {/* Replaces the old API Key input: credentials live in .env, server-side. */}
                        <div className="py-4 border-t border-border">
                          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <ShieldCheck size={14} className="text-primary" />
                            {t.aiServerKeyTitle}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {t.aiServerKeyHint}
                          </p>
                          <code className="mt-2 inline-block rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">
                            {ENV_VAR_BY_PROVIDER[
                              aiDraft.provider as keyof typeof ENV_VAR_BY_PROVIDER
                            ] ?? ''}
                          </code>
                        </div>
                      </>
                    )}

                    <SettingRow label={t.aiTemperature} hint={t.aiTemperatureHint}>
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.1}
                          value={aiDraft.temperature}
                          onChange={(e) => updateAI('temperature', parseFloat(e.target.value))}
                          className="w-36 accent-primary"
                        />
                        <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                          {aiDraft.temperature.toFixed(1)}
                        </span>
                      </div>
                    </SettingRow>

                    <SettingRow label={t.aiContextTokens} hint={t.aiContextTokensHint}>
                      <ResettableField
                        isModified={
                          aiDraft.contextTokens[aiDraft.provider] !==
                          DEFAULT_CONTEXT_TOKENS[aiDraft.provider]
                        }
                        onReset={() =>
                          updateProviderNumber(
                            'contextTokens',
                            aiDraft.provider,
                            DEFAULT_CONTEXT_TOKENS[aiDraft.provider]
                          )
                        }
                        resetTitle={t.aiBaseUrlReset}
                      >
                        <SelectDropdown
                          value={String(aiDraft.contextTokens[aiDraft.provider])}
                          options={contextTokenOptions}
                          onChange={(value) =>
                            updateProviderNumber('contextTokens', aiDraft.provider, Number(value))
                          }
                        />
                      </ResettableField>
                    </SettingRow>

                    <SettingRow label={t.aiMaxOutputTokens} hint={t.aiMaxOutputTokensHint}>
                      <ResettableField
                        isModified={
                          aiDraft.maxOutputTokens[aiDraft.provider] !==
                          DEFAULT_MAX_OUTPUT_TOKENS[aiDraft.provider]
                        }
                        onReset={() =>
                          updateProviderNumber(
                            'maxOutputTokens',
                            aiDraft.provider,
                            DEFAULT_MAX_OUTPUT_TOKENS[aiDraft.provider]
                          )
                        }
                        resetTitle={t.aiBaseUrlReset}
                      >
                        <SelectDropdown
                          value={String(aiDraft.maxOutputTokens[aiDraft.provider])}
                          options={maxOutputTokenOptions}
                          onChange={(value) =>
                            updateProviderNumber('maxOutputTokens', aiDraft.provider, Number(value))
                          }
                        />
                      </ResettableField>
                    </SettingRow>

                    <SettingRow label={t.aiBatchConcurrency} hint={t.aiBatchConcurrencyHint}>
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <input
                          type="range"
                          min={1}
                          max={6}
                          step={1}
                          value={aiDraft.batchConcurrency}
                          onChange={(e) =>
                            updateAI('batchConcurrency', clampNumber(e.target.value, 1, 6, 2))
                          }
                          className="w-36 accent-primary"
                        />
                        <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                          {aiDraft.batchConcurrency}
                        </span>
                      </div>
                    </SettingRow>

                    <SettingRow label={t.aiVoiceGenderLabel} hint={t.aiVoiceGenderHint}>
                      <SelectDropdown
                        value={aiDraft.speechVoiceGender ?? DEFAULT_SPEECH_GENDER}
                        options={[
                          { value: 'female' as const, label: t.aiVoiceGenderFemale },
                          { value: 'male' as const, label: t.aiVoiceGenderMale },
                        ]}
                        onChange={(value) => updateAI('speechVoiceGender', value)}
                      />
                    </SettingRow>

                    <div className="py-4">
                      <p className="text-sm font-medium text-foreground mb-0.5">
                        {t.aiSystemPrompt}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">{t.aiSystemPromptHint}</p>
                      <textarea
                        value={aiDraft.systemPrompt}
                        onChange={(e) => updateAI('systemPrompt', e.target.value)}
                        rows={4}
                        placeholder={t.aiSystemPromptPlaceholder}
                        className="w-full resize-none rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    {/* Explicit commit for this section; nothing above takes effect until saved. */}
                    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border py-4">
                      <span className="mr-auto text-xs text-muted-foreground">
                        {isAiDirty ? t.aiConfigUnsaved : t.aiConfigUpToDate}
                      </span>
                      <button
                        onClick={discardAiConfig}
                        disabled={!isAiDirty}
                        className="min-h-11 rounded-md border border-border bg-transparent px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {t.aiConfigDiscard}
                      </button>
                      <button
                        onClick={saveAiConfig}
                        disabled={!isAiDirty || !isAiConfigValid}
                        className="flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
                      >
                        <Check size={14} />
                        {t.aiConfigSave}
                      </button>
                    </div>
                  </fieldset>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
