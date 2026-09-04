'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SqlDialect, AnalysisResult } from './sql/sqlAnalyzer';
import type { Locale } from './i18n';
import type { DocSource } from './ai/aiService';

// Provider constants live in aiProviders (no 'use client') so the server API route can read
// their real values; re-exported here for the client code that already imports from the store.
import {
  DEFAULT_BASE_URLS,
  DEFAULT_CONTEXT_TOKENS,
  DEFAULT_MAX_OUTPUT_TOKENS,
  type AIProvider,
} from './ai/aiProviders';

export { DEFAULT_BASE_URLS, DEFAULT_CONTEXT_TOKENS, DEFAULT_MAX_OUTPUT_TOKENS };
export type { AIProvider };

export interface AIModelConfig {
  provider: AIProvider;
  /**
   * Per-provider API root, all persisted so switching provider does not lose the others.
   * Cloud overrides must also be allow-listed server-side (AI_ALLOWED_BASE_URLS) before the
   * route will send a credential to them.
   */
  baseUrls: Record<AIProvider, string>;
  ollamaModel: string;
  // No apiKey here on purpose: cloud credentials are read server-side from .env by
  // /api/ai/generate, so they never reach the browser or localStorage.
  modelId: string;
  temperature: number;
  systemPrompt: string;
  /**
   * Context window per provider, in tokens. Used to fit the prompt before sending — Ollama
   * silently drops overflow instead of erroring, so its value must match the server's real
   * limit (raise it with OLLAMA_CONTEXT_LENGTH or a Modelfile, then update this value).
   */
  contextTokens: Record<AIProvider, number>;
  /** Tokens reserved for the answer, per provider. */
  maxOutputTokens: Record<AIProvider, number>;
  /** How many AI requests may run at once during a batch explain. */
  batchConcurrency: number;
  /** Male/female preference for the read-aloud voice (Explainer + Optimize panels). */
  speechVoiceGender?: 'male' | 'female';
}

export interface AppSettings {
  theme: 'dark' | 'light';
  locale: Locale;
  defaultDialect: SqlDialect;
  autoAnalyze: boolean;
  graphLayout: 'dagre' | 'force' | 'grid';
  nodeSpacing: 'compact' | 'normal' | 'spacious';
  edgeStyle: 'smooth' | 'straight' | 'step';
  accentColor?: string;
  performanceMode: boolean;
  aiConfig: AIModelConfig;
}

/** One saved query, kept for the history panel's semantic search. Persisted server-side via
 * /api/history (an Excel workbook on disk), not in this store — see src/lib/queryHistory.ts. */
export type { QueryHistoryEntry } from './queryHistory';

/** One exchange in the floating AI Assistant's (GlobalChat/DocsConsultantChat) conversation. */
export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  sources?: DocSource[];
}

interface AppState {
  settings: AppSettings;
  dialect: SqlDialect;
  rawSql: string;
  myBatisXml: string;
  resolvedSql: string;
  myBatisParams: Record<string, string>;
  analysisResult: AnalysisResult | null;
  isAnalyzing: boolean;
  /** Target path for an in-progress client-side route change. Never persisted. */
  navigationTarget: string | null;
  inputMode: 'sql' | 'mybatis' | 'import-xml' | 'smart-editor';
  selectedNodeId: string | null;
  /** Set by "go to line" links on the Metrics Dashboard; consumed once by the Smart SQL Editor
   *  page to load the analyzed SQL and reveal/highlight the target line, then cleared. */
  pendingEditorJump: { sql: string; line: number } | null;
  /**
   * GlobalChat is instantiated fresh by every page's own <AppLayout> wrapper (no shared layout
   * instance across routes), so its state must live here instead of component-local useState —
   * otherwise navigating to another page remounts it and silently drops the open panel and the
   * whole conversation.
   */
  chatIsOpen: boolean;
  chatHistory: ChatTurn[];
  chatQuestionDraft: string;

  // Actions
  updateSettings: (patch: Partial<AppSettings>) => void;
  setDialect: (d: SqlDialect) => void;
  setRawSql: (s: string) => void;
  setMyBatisXml: (s: string) => void;
  setResolvedSql: (s: string) => void;
  setMyBatisParams: (p: Record<string, string>) => void;
  setAnalysisResult: (r: AnalysisResult | null) => void;
  setIsAnalyzing: (v: boolean) => void;
  beginNavigation: (target: string) => void;
  completeNavigation: (pathname: string) => void;
  setInputMode: (m: 'sql' | 'mybatis' | 'import-xml' | 'smart-editor') => void;
  setSelectedNodeId: (id: string | null) => void;
  setPendingEditorJump: (jump: { sql: string; line: number } | null) => void;
  setChatIsOpen: (open: boolean) => void;
  setChatHistory: (updater: ChatTurn[] | ((prev: ChatTurn[]) => ChatTurn[])) => void;
  setChatQuestionDraft: (value: string) => void;
  resetChat: () => void;
  resetAll: () => void;
}

export const DEFAULT_AI_CONFIG: AIModelConfig = {
  provider: 'ollama',
  baseUrls: { ...DEFAULT_BASE_URLS },
  ollamaModel: 'qwen2.5-coder:7b',
  modelId: 'gpt-4o',
  temperature: 0.1,
  systemPrompt:
    'You are a SQL expert assistant. Explain SQL queries in plain, clear language: describe the purpose, tables involved, joins, filters, and the expected result set.',
  contextTokens: { ...DEFAULT_CONTEXT_TOKENS },
  maxOutputTokens: { ...DEFAULT_MAX_OUTPUT_TOKENS },
  batchConcurrency: 2,
  speechVoiceGender: 'female',
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  locale: 'en',
  defaultDialect: 'mysql',
  autoAnalyze: false,
  graphLayout: 'dagre',
  nodeSpacing: 'normal',
  edgeStyle: 'smooth',
  accentColor: '#6ee7f7',
  performanceMode: false,
  aiConfig: DEFAULT_AI_CONFIG,
};

const defaultSettings: AppSettings = DEFAULT_SETTINGS;

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      dialect: 'mysql',
      rawSql: '',
      myBatisXml: '',
      resolvedSql: '',
      myBatisParams: {},
      analysisResult: null,
      isAnalyzing: false,
      navigationTarget: null,
      inputMode: 'sql',
      selectedNodeId: null,
      pendingEditorJump: null,
      chatIsOpen: false,
      chatHistory: [],
      chatQuestionDraft: '',

      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
      setDialect: (d) => set({ dialect: d }),
      setRawSql: (s) => set({ rawSql: s }),
      setMyBatisXml: (s) => set({ myBatisXml: s }),
      setResolvedSql: (s) => set({ resolvedSql: s }),
      setMyBatisParams: (p) => set({ myBatisParams: p }),
      setAnalysisResult: (r) => set({ analysisResult: r }),
      setIsAnalyzing: (v) => set({ isAnalyzing: v }),
      beginNavigation: (target) => set({ navigationTarget: target }),
      completeNavigation: (pathname) =>
        set((state) => (state.navigationTarget === pathname ? { navigationTarget: null } : {})),
      setInputMode: (m) => set({ inputMode: m }),
      setSelectedNodeId: (id) => set({ selectedNodeId: id }),
      setPendingEditorJump: (jump) => set({ pendingEditorJump: jump }),
      setChatIsOpen: (open) => set({ chatIsOpen: open }),
      setChatHistory: (updater) =>
        set((state) => ({
          chatHistory: typeof updater === 'function' ? updater(state.chatHistory) : updater,
        })),
      setChatQuestionDraft: (value) => set({ chatQuestionDraft: value }),
      resetChat: () => set({ chatIsOpen: false, chatHistory: [], chatQuestionDraft: '' }),
      resetAll: () =>
        set({
          rawSql: '',
          myBatisXml: '',
          resolvedSql: '',
          myBatisParams: {},
          analysisResult: null,
          isAnalyzing: false,
          selectedNodeId: null,
        }),
    }),
    {
      name: 'sqlvisualizer-store',
      // v2 backfilled aiConfig; v3 added the context-window / batching fields;
      // v4 moved cloud API keys to the server; v5 replaced ollamaBaseUrl with a per-provider map;
      // v6 made contextTokens / maxOutputTokens per-provider; v7 backfilled the installed
      // local Ollama model so existing browsers do not keep an unusable empty model name.
      version: 7,
      migrate: (persistedState) => {
        const { analysisResult: _drop, ...rest } = (persistedState as Record<string, unknown>) || {};
        const state = rest as { settings?: Partial<AppSettings> };
        if (state.settings) {
          // Older builds kept the provider API key in localStorage, a single Ollama base URL,
          // and one shared token budget. Drop the credential, and fold the single-valued
          // settings into the new per-provider maps so customised values survive the upgrade.
          const {
            apiKey: _discardedApiKey,
            ollamaBaseUrl: legacyOllamaBaseUrl,
            ...persistedAiConfig
          } = (state.settings.aiConfig ?? {}) as AIModelConfig & {
            apiKey?: string;
            ollamaBaseUrl?: string;
          };

          // Preserve an explicitly selected model, but repair the empty value written by v6.
          // qwen2.5-coder:7b is installed by the local setup documented for this project.
          if (!persistedAiConfig.ollamaModel?.trim()) {
            persistedAiConfig.ollamaModel = DEFAULT_AI_CONFIG.ollamaModel;
          }

          // A scalar budget belonged to whichever provider was selected at the time; every other
          // provider takes the new default rather than inheriting an unrelated number.
          const activeProvider = persistedAiConfig.provider ?? DEFAULT_AI_CONFIG.provider;
          const legacyBudget = <T,>(value: unknown, defaults: Record<AIProvider, T>) =>
            typeof value === 'number' ? { ...defaults, [activeProvider]: value } : defaults;

          state.settings = {
            ...DEFAULT_SETTINGS,
            ...state.settings,
            aiConfig: {
              ...DEFAULT_AI_CONFIG,
              ...persistedAiConfig,
              baseUrls: {
                ...DEFAULT_BASE_URLS,
                ...(legacyOllamaBaseUrl ? { ollama: legacyOllamaBaseUrl } : {}),
                ...persistedAiConfig.baseUrls,
              },
              contextTokens: {
                ...legacyBudget(persistedAiConfig.contextTokens, DEFAULT_CONTEXT_TOKENS),
                ...(typeof persistedAiConfig.contextTokens === 'object'
                  ? persistedAiConfig.contextTokens
                  : {}),
              },
              maxOutputTokens: {
                ...legacyBudget(persistedAiConfig.maxOutputTokens, DEFAULT_MAX_OUTPUT_TOKENS),
                ...(typeof persistedAiConfig.maxOutputTokens === 'object'
                  ? persistedAiConfig.maxOutputTokens
                  : {}),
              },
            },
          };
        }
        return state;
      },
      // analysisResult is intentionally not persisted: it must always be recomputed
      // fresh so all derived sections (metrics, detailedComplexity, etc.) stay
      // consistent with the current analyzer logic instead of showing stale values.
      partialize: (state) => ({
        settings: state.settings,
        dialect: state.dialect,
      }),
    }
  )
);
