'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SqlDialect, AnalysisResult } from './sqlAnalyzer';
import type { Locale } from './i18n';

export type AIProvider = 'ollama' | 'openai' | 'anthropic' | 'gemini';

export interface AIModelConfig {
  provider: AIProvider;
  ollamaBaseUrl: string;
  ollamaModel: string;
  apiKey: string;
  modelId: string;
  temperature: number;
  systemPrompt: string;
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

interface AppState {
  settings: AppSettings;
  dialect: SqlDialect;
  rawSql: string;
  myBatisXml: string;
  resolvedSql: string;
  myBatisParams: Record<string, string>;
  analysisResult: AnalysisResult | null;
  isAnalyzing: boolean;
  inputMode: 'sql' | 'mybatis' | 'import-xml' | 'smart-editor';
  selectedNodeId: string | null;

  // Actions
  updateSettings: (patch: Partial<AppSettings>) => void;
  setDialect: (d: SqlDialect) => void;
  setRawSql: (s: string) => void;
  setMyBatisXml: (s: string) => void;
  setResolvedSql: (s: string) => void;
  setMyBatisParams: (p: Record<string, string>) => void;
  setAnalysisResult: (r: AnalysisResult | null) => void;
  setIsAnalyzing: (v: boolean) => void;
  setInputMode: (m: 'sql' | 'mybatis' | 'import-xml' | 'smart-editor') => void;
  setSelectedNodeId: (id: string | null) => void;
  resetAll: () => void;
}

export const DEFAULT_AI_CONFIG: AIModelConfig = {
  provider: 'ollama',
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'qwen2.5-coder:7b',
  apiKey: '',
  modelId: 'gpt-4o',
  temperature: 0.1,
  systemPrompt:
    'You are a SQL expert assistant. Explain SQL queries in plain, clear language: describe the purpose, tables involved, joins, filters, and the expected result set.',
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
      inputMode: 'sql',
      selectedNodeId: null,

      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
      setDialect: (d) => set({ dialect: d }),
      setRawSql: (s) => set({ rawSql: s }),
      setMyBatisXml: (s) => set({ myBatisXml: s }),
      setResolvedSql: (s) => set({ resolvedSql: s }),
      setMyBatisParams: (p) => set({ myBatisParams: p }),
      setAnalysisResult: (r) => set({ analysisResult: r }),
      setIsAnalyzing: (v) => set({ isAnalyzing: v }),
      setInputMode: (m) => set({ inputMode: m }),
      setSelectedNodeId: (id) => set({ selectedNodeId: id }),
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
      // Bumped to backfill aiConfig on settings persisted before AI configuration existed.
      version: 2,
      migrate: (persistedState) => {
        const { analysisResult: _drop, ...rest } = (persistedState as Record<string, unknown>) || {};
        const state = rest as { settings?: Partial<AppSettings> };
        if (state.settings) {
          state.settings = {
            ...DEFAULT_SETTINGS,
            ...state.settings,
            aiConfig: { ...DEFAULT_AI_CONFIG, ...state.settings.aiConfig },
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
