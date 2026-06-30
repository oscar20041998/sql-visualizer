'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import type { editor as MonacoEditorNS } from 'monaco-editor';
import { format } from 'sql-formatter';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import { toast } from 'sonner';

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
  currentSql: string;
  originalSql: string;
  isDiffMode: boolean;
  isFormatting: boolean;
}

const editorOptions: MonacoEditorNS.IStandaloneEditorConstructionOptions = {
  language: 'sql',
  theme: 'vs-dark',
  minimap: { enabled: true },
  wordWrap: 'on',
  fontSize: 14,
  lineNumbers: 'on',
  scrollBeyondLastLine: false,
  automaticLayout: true,
};

const diffEditorOptions: MonacoEditorNS.IDiffEditorConstructionOptions = {
  minimap: { enabled: true },
  wordWrap: 'on',
  fontSize: 14,
  scrollBeyondLastLine: false,
  automaticLayout: true,
};

export const SmartSQLEditor: React.FC<{ initialSql?: string }> = ({
  initialSql = 'SELECT * FROM table_name LIMIT 10;',
}) => {
  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
  
  const dialect = useAppStore((store) => store.dialect);
  const settings = useAppStore((store) => store.settings);
  const t = getT(settings.locale);

  const [state, setState] = useState<EditorState>({
    currentSql: initialSql,
    originalSql: initialSql,
    isDiffMode: false,
    isFormatting: false,
  });

  const showResultToast = useCallback(
    (success: boolean, message?: string) => {
      if (success) {
        toast.success(message || t.formattingSuccess);
      } else {
        toast.error(message || t.formattingError);
      }
    },
    [t.formattingError, t.formattingSuccess]
  );

  // Sync editor content when initialSql prop changes
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      currentSql: initialSql,
      originalSql: initialSql,
      isDiffMode: false,
    }));
    // Update editor value if already mounted
    if (editorRef.current) {
      editorRef.current.setValue(initialSql);
    }
  }, [initialSql]);

  const handleEditorMount = useCallback(
    (editor: MonacoEditorNS.IStandaloneCodeEditor) => {
      editorRef.current = editor;
      // Ensure content is displayed on mount
      editor.setValue(state.currentSql);
    },
    [state.currentSql]
  );

  const handleFormatSQL = useCallback(async () => {
    try {
      if (!state.currentSql.trim()) {
        showResultToast(false, t.emptyQueryError || 'Query is empty');
        return;
      }

      setState((prev) => ({ ...prev, isFormatting: true }));

      const formatted = format(state.currentSql, {
        language: getFormatterLanguage(dialect),
      });

      setState((prev) => ({
        ...prev,
        originalSql: prev.currentSql,
        currentSql: formatted,
        isFormatting: false,
      }));

      showResultToast(true);
    } catch (error) {
      setState((prev) => ({ ...prev, isFormatting: false }));
      showResultToast(false, (error as Error)?.message || t.formattingError || 'Formatting failed');
    }
  }, [state.currentSql, dialect, showResultToast, t]);

  const handleToggleDiffView = useCallback(() => {
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
    }));
  }, []);

  return (
    <div className="flex flex-col flex-1 gap-4 p-4 bg-gray-900 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-white">{t.smartEditorTitle}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleFormatSQL}
            disabled={state.isFormatting}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
            title={t.formatSqlTitle}
          >
            {state.isFormatting ? '⏳ Formatting...' : t.formatSqlButton}
          </button>

          <button
            onClick={handleToggleDiffView}
            disabled={state.currentSql === state.originalSql}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
            title={t.toggleDiffTitle}
          >
            {state.isDiffMode ? t.backToEditorButton : t.compareButton}
          </button>

          {state.currentSql !== state.originalSql && (
            <button
              onClick={handleResetToOriginal}
              className="inline-flex items-center justify-center rounded-lg border border-yellow-600/30 bg-yellow-950/20 px-4 py-2 text-sm font-medium text-yellow-300 shadow-sm transition-colors hover:bg-yellow-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/40"
              title="Reset to original SQL"
            >
              ↺ Reset
            </button>
          )}
        </div>
      </div>

      {/* Editor Container */}
      <div className="flex-1 min-h-0 border border-gray-700 rounded overflow-hidden">
        {state.isDiffMode ? (
          <DiffEditor
            original={state.originalSql}
            modified={state.currentSql}
            language="sql"
            theme="vs-dark"
            options={diffEditorOptions}
            height="100%"
          />
        ) : (
          <Editor
            value={state.currentSql}
            language="sql"
            theme="vs-dark"
            options={editorOptions}
            onMount={handleEditorMount}
            onChange={(value) => {
              setState((prev) => ({
                ...prev,
                currentSql: value ?? '',
              }));
            }}
            height="100%"
          />
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-700 pt-2">
        <div>
          {state.isDiffMode ? t.diffViewStatus : t.singleEditorStatus} • Dialect: <span className="text-blue-400">{dialect}</span>
        </div>
        <div>
          {state.currentSql !== state.originalSql && (
            <span className="text-yellow-400">● Modified</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartSQLEditor;
