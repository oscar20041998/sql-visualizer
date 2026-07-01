'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import type { editor as MonacoEditorNS } from 'monaco-editor';
import { format } from 'sql-formatter';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import { toast } from 'sonner';
import { FileText, GitCompare, Copy, Check, RotateCcw, Zap } from 'lucide-react';

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
  hasChanges: boolean;
  copiedToClipboard: boolean;
}

const editorOptions: MonacoEditorNS.IStandaloneEditorConstructionOptions = {
  language: 'sql',
  theme: 'vs-dark',
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

export const SmartSQLEditor: React.FC<{ initialSql?: string }> = ({
  initialSql = 'SELECT * FROM table_name LIMIT 10;',
}) => {
  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);

  const dialect = useAppStore((store) => store.dialect);
  const settings = useAppStore((store) => store.settings);
  const t = getT(settings.locale);

  const [state, setState] = useState<EditorState>({
    originalSql: initialSql,
    currentSql: initialSql,
    isDiffMode: false,
    isFormatting: false,
    hasChanges: false,
    copiedToClipboard: false,
  });

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
    <div className="flex flex-col flex-1 min-h-0 h-full gap-3 bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 px-4 pt-4 pb-0">
        {/* Title Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ 
              background: state.hasChanges ? '#f59e0b' : '#10b981' 
            }} />
            <h2 className="text-lg font-semibold text-white">{t.smartEditorTitle}</h2>
            <span className="text-xs text-gray-400 font-mono">
              {state.hasChanges ? `● ${t.smartEditorModified}` : `○ ${t.smartEditorOriginal}`}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleFormatSQL}
            disabled={state.isFormatting || !state.currentSql.trim()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800 text-gray-200 text-xs font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Format SQL (Ctrl+Shift+F)"
          >
            <Zap size={12} />
            {state.isFormatting ? t.smartEditorFormatting : (t.formatSqlButton || t.smartEditorFormat)}
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
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800 text-gray-200 text-xs font-medium hover:bg-gray-700 transition-colors"
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
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-yellow-700/50 bg-yellow-950/40 text-yellow-300 text-xs font-medium hover:bg-yellow-950/60 transition-colors"
              title={t.smartEditorResetTitle}
            >
              <RotateCcw size={12} />
              {t.smartEditorReset}
            </button>
          )}
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-800">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="font-mono">
              <span className="text-blue-400">{stats.lines}</span> {t.smartEditorLines}
            </span>
            <span className="font-mono">
              <span className="text-blue-400">{stats.chars}</span> {t.smartEditorChars}
            </span>
            <span className="font-mono">
              <span className="text-blue-400">{stats.words}</span> {t.smartEditorWords}
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-500">{t.smartEditorDialect} <span className="text-blue-400 font-mono">{dialect}</span></span>
          </div>
          <div className="text-xs text-gray-500">{stats.changeSummary}</div>
        </div>
      </div>

      {/* Editor Container */}
      <div className="flex-1 min-h-0 w-full">
        {state.isDiffMode ? (
          <DiffEditor
            original={state.originalSql}
            modified={state.currentSql}
            language="sql"
            theme="vs-dark"
            options={diffEditorOptions}
            className="min-h-0 w-full"
            height="48vh"
          />
        ) : (
          <Editor
            value={state.currentSql}
            language="sql"
            theme="vs-dark"
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
            height="48vh"
          />
        )}
      </div>

      {/* Status Footer */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-800/50 text-xs text-gray-400 border-t border-gray-800">
        <div className="flex items-center gap-2">
          <FileText size={12} className="text-gray-500" />
          <span>
            {state.isDiffMode ? t.smartEditorComparingMode : t.smartEditorSingleMode}
          </span>
        </div>
        <div className="text-gray-600">
          {state.hasChanges && (
            <span className="text-yellow-500">{t.smartEditorChangesDetected}</span>
          )}
          {!state.hasChanges && state.currentSql !== '' && (
            <span className="text-green-500">{t.smartEditorSyncedWithOriginal}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartSQLEditor;
