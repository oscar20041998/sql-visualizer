'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import type { editor as MonacoEditorNS } from 'monaco-editor';
import { format } from 'sql-formatter';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import { toast } from 'sonner';
import { FileText, GitCompare, Copy, Check, RotateCcw, Zap, Sparkles } from 'lucide-react';
import { analyzeSql } from '@/lib/sqlAnalyzer';
import { buildSqlContextBrief } from '@/lib/aiSqlContext';
import { optimizeSqlWithAI, type SqlOptimizationResult } from '@/lib/aiService';

function getFormatterLanguage(dialect: string): 'mysql' | 'postgresql' | 'tsql' | 'plsql' {
  const dialectMap: Record<string, 'mysql' | 'postgresql' | 'tsql' | 'plsql'> = {
    mysql: 'mysql',
    postgresql: 'postgresql',
    sqlserver: 'tsql',
    oracle: 'plsql',
  };
  return dialectMap[dialect] || 'mysql';
}

interface EditorState {
  originalSql: string;
  currentSql: string;
  isDiffMode: boolean;
  isFormatting: boolean;
  isOptimizing: boolean;
  hasChanges: boolean;
  copiedToClipboard: boolean;
}

const editorOptions: MonacoEditorNS.IStandaloneEditorConstructionOptions = {
  language: 'sql',
  minimap: { enabled: true, maxColumn: 40 },
  wordWrap: 'on',
  fontSize: 14,
  lineNumbers: 'on',
  scrollBeyondLastLine: false,
  automaticLayout: true,
  padding: { top: 16, bottom: 16 },
  smoothScrolling: true,
  cursorBlinking: 'blink',
};

const diffEditorOptions: MonacoEditorNS.IDiffEditorConstructionOptions = {
  minimap: { enabled: true, maxColumn: 40 },
  wordWrap: 'on',
  fontSize: 14,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  padding: { top: 16, bottom: 16 },
  smoothScrolling: true,
  renderSideBySide: true,
};

export const SmartSQLEditor: React.FC<{
  initialSql?: string;
  /** Lets the page observe the live editor content (used by the AI SQL Explainer). */
  onSqlChange?: (sql: string) => void;
  onOptimizationResult?: (result: SqlOptimizationResult | null) => void;
}> = ({ initialSql = 'SELECT * FROM table_name LIMIT 10;', onSqlChange, onOptimizationResult }) => {
  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);

  const dialect = useAppStore((store) => store.dialect);
  const settings = useAppStore((store) => store.settings);
  const t = getT(settings.locale);
  const monacoTheme = settings.theme === 'dark' ? 'vs-dark' : 'vs';

  const [state, setState] = useState<EditorState>({
    originalSql: initialSql,
    currentSql: initialSql,
    isDiffMode: false,
    isFormatting: false,
    isOptimizing: false,
    hasChanges: false,
    copiedToClipboard: false,
  });
  const optimizeAbortRef = useRef<AbortController | null>(null);

  // Sync editor content when initialSql prop changes
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      originalSql: initialSql,
      currentSql: initialSql,
      isDiffMode: false,
      hasChanges: false,
    }));
    if (editorRef.current) {
      editorRef.current.setValue(initialSql);
    }
  }, [initialSql]);

  // Calculate changes whenever currentSql updates
  useEffect(() => {
    const hasChanges = state.currentSql.trim() !== state.originalSql.trim();
    setState((prev) => ({ ...prev, hasChanges }));
  }, [state.currentSql, state.originalSql]);

  // Publish the current SQL upward so sibling panels stay in sync with the editor.
  useEffect(() => {
    onSqlChange?.(state.currentSql);
  }, [state.currentSql, onSqlChange]);

  const handleEditorMount = useCallback(
    (editor: MonacoEditorNS.IStandaloneCodeEditor) => {
      editorRef.current = editor;
      editor.setValue(state.currentSql);
    },
    [state.currentSql]
  );

  const handleFormatSQL = useCallback(async () => {
    try {
      if (!state.currentSql.trim()) {
        toast.error(t.emptyQueryError);
        return;
      }

      setState((prev) => ({ ...prev, isFormatting: true }));

      const formatted = format(state.currentSql, {
        language: getFormatterLanguage(dialect),
      });

      setState((prev) => ({
        ...prev,
        currentSql: formatted,
        isFormatting: false,
      }));

      toast.success(t.formattingSuccess);
    } catch (error) {
      setState((prev) => ({ ...prev, isFormatting: false }));
      toast.error((error as Error)?.message || t.formattingError);
    }
  }, [state.currentSql, dialect, t]);

  const handleToggleDiffMode = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isDiffMode: !prev.isDiffMode,
    }));
  }, []);

  const handleResetToOriginal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentSql: prev.originalSql,
      isDiffMode: false,
      hasChanges: false,
    }));
    toast.info(t.smartEditorResetTitle);
  }, [t]);

  const handleCopyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(state.currentSql);
      setState((prev) => ({ ...prev, copiedToClipboard: true }));
      toast.success(t.smartEditorCopiedToClipboard);
      setTimeout(() => {
        setState((prev) => ({ ...prev, copiedToClipboard: false }));
      }, 2000);
    } catch (error) {
      toast.error(t.smartEditorFailedToCopy);
    }
  }, [state.currentSql, t]);

  const handleOptimizeSQL = useCallback(async () => {
    const sql = state.currentSql.trim();
    if (!sql) {
      toast.error(t.emptyQueryError);
      return;
    }

    optimizeAbortRef.current?.abort();
    const controller = new AbortController();
    optimizeAbortRef.current = controller;

    setState((prev) => ({ ...prev, isOptimizing: true }));
    onOptimizationResult?.(null);

    let brief = '';
    try {
      const parsed = await analyzeSql(sql, dialect, settings.locale);
      brief = buildSqlContextBrief(parsed);
    } catch {
      brief = '';
    }

    try {
      const result = await optimizeSqlWithAI({
        sql,
        config: settings.aiConfig,
        locale: settings.locale,
        contextBrief: brief,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;

      setState((prev) => ({
        ...prev,
        originalSql: sql,
        currentSql: result.optimizedSql || sql,
        isDiffMode: result.optimizedSql.trim() !== sql ? true : prev.isDiffMode,
        isOptimizing: false,
      }));
      onOptimizationResult?.(result);
      toast.success(t.smartEditorOptimizationSuccess);
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return;
      setState((prev) => ({ ...prev, isOptimizing: false }));
      onOptimizationResult?.(null);
      toast.error((error as Error)?.message || t.smartEditorOptimizationError);
    } finally {
      if (optimizeAbortRef.current === controller) optimizeAbortRef.current = null;
    }
  }, [state.currentSql, dialect, settings, t, onOptimizationResult]);

  // Calculate statistics
  const stats = {
    lines: state.currentSql.split('\n').length,
    chars: state.currentSql.length,
    words: state.currentSql.trim().split(/\s+/).length,
    changeSummary: state.hasChanges
      ? `${t.smartEditorModifiedSummary} (${state.currentSql.length} ${t.smartEditorChars})`
      : t.smartEditorNoChangesSummary,
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full gap-3 overflow-hidden rounded-lg border border-border bg-card">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 px-4 pt-4 pb-0">
        {/* Title Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{
                background: state.hasChanges ? '#f59e0b' : '#10b981',
              }}
            />
            <h2 className="text-lg font-semibold text-foreground">{t.smartEditorTitle}</h2>
            <span className="font-mono text-xs text-muted-foreground">
              {state.hasChanges ? `● ${t.smartEditorModified}` : `○ ${t.smartEditorOriginal}`}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleFormatSQL}
            disabled={state.isFormatting || !state.currentSql.trim()}
            className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            title="Format SQL (Ctrl+Shift+F)"
          >
            <Zap size={12} />
            {state.isFormatting
              ? t.smartEditorFormatting
              : t.formatSqlButton || t.smartEditorFormat}
          </button>

          <button
            onClick={handleOptimizeSQL}
            disabled={state.isOptimizing || !state.currentSql.trim()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-700 bg-slate-800 text-gray-200 text-xs font-medium hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={t.analyzeOptimizeTitle}
          >
            <Sparkles size={12} />
            {state.isOptimizing ? t.smartEditorOptimizing : t.analyzeOptimizeButton}
          </button>

          <button
            onClick={handleToggleDiffMode}
            disabled={!state.hasChanges}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: state.isDiffMode ? 'rgba(99, 102, 241, 0.2)' : 'rgb(31, 41, 55)',
              borderColor: state.isDiffMode ? '#6366f1' : '#374151',
              color: state.isDiffMode ? '#818cf8' : '#d1d5db',
            }}
            title={state.hasChanges ? 'Compare with original' : t.smartEditorNoChangesToCompare}
          >
            <GitCompare size={12} />
            {state.isDiffMode ? t.smartEditorEditorView : t.smartEditorCompare}
          </button>

          <button
            onClick={handleCopyToClipboard}
            className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
          >
            {state.copiedToClipboard ? (
              <>
                <Check size={12} />
                {t.smartEditorCopied}
              </>
            ) : (
              <>
                <Copy size={12} />
                {t.smartEditorCopy}
              </>
            )}
          </button>

          {state.hasChanges && (
            <button
              onClick={handleResetToOriginal}
              className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning transition-colors hover:bg-warning/20"
              title={t.smartEditorResetTitle}
            >
              <RotateCcw size={12} />
              {t.smartEditorReset}
            </button>
          )}
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="font-mono">
              <span className="text-primary">{stats.lines}</span> {t.smartEditorLines}
            </span>
            <span className="font-mono">
              <span className="text-primary">{stats.chars}</span> {t.smartEditorChars}
            </span>
            <span className="font-mono">
              <span className="text-primary">{stats.words}</span> {t.smartEditorWords}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">
              {t.smartEditorDialect} <span className="font-mono text-primary">{dialect}</span>
            </span>
          </div>
          <div className="text-xs text-muted-foreground">{stats.changeSummary}</div>
        </div>
      </div>

      {/* Editor Container */}
      <div className="flex-1 min-h-0 w-full">
        {state.isDiffMode ? (
          <DiffEditor
            original={state.originalSql}
            modified={state.currentSql}
            language="sql"
            theme={monacoTheme}
            options={diffEditorOptions}
            className="min-h-0 w-full"
            height="100vh"
          />
        ) : (
          <Editor
            value={state.currentSql}
            language="sql"
            theme={monacoTheme}
            options={editorOptions}
            saveViewState={true}
            onMount={handleEditorMount}
            onChange={(value) => {
              setState((prev) => ({
                ...prev,
                currentSql: value ?? '',
              }));
            }}
            className="min-h-0 w-full"
            height="100vh"
          />
        )}
      </div>

      {/* Status Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <FileText size={12} className="text-muted-foreground" />
          <span>{state.isDiffMode ? t.smartEditorComparingMode : t.smartEditorSingleMode}</span>
        </div>
        <div className="text-muted-foreground">
          {state.hasChanges && (
            <span className="text-warning">{t.smartEditorChangesDetected}</span>
          )}
          {!state.hasChanges && state.currentSql !== '' && (
            <span className="text-success">{t.smartEditorSyncedWithOriginal}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartSQLEditor;
