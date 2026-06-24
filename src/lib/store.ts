'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SqlDialect, AnalysisResult } from './sqlAnalyzer';
import type { Locale } from './i18n';

export interface AppSettings {
  theme: 'dark' | 'light';
  locale: Locale;
  defaultDialect: SqlDialect;
  autoAnalyze: boolean;
  graphLayout: 'dagre' | 'force' | 'grid';
  nodeSpacing: 'compact' | 'normal' | 'spacious';
  edgeStyle: 'smooth' | 'straight' | 'step';
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
  inputMode: 'sql' | 'mybatis';
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
  setInputMode: (m: 'sql' | 'mybatis') => void;
  setSelectedNodeId: (id: string | null) => void;
  resetAll: () => void;
}

const defaultSettings: AppSettings = {
  theme: 'dark',
  locale: 'en',
  defaultDialect: 'mysql',
  autoAnalyze: false,
  graphLayout: 'dagre',
  nodeSpacing: 'normal',
  edgeStyle: 'smooth',
};

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
      partialize: (state) => ({
        settings: state.settings,
        dialect: state.dialect,
      }),
    }
  )
);
