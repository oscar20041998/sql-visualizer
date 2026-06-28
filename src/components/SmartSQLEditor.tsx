'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { format } from 'sql-formatter';
import { MySQL } from 'dt-sql-parser';
import { createLogger } from '@/lib/logger';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import { toast } from 'sonner';

const logger = createLogger('SmartSQLEditor');

// ─── Helper: Map SQL dialect to sql-formatter language ──────────────────────
function getFormatterLanguage(dialect: string): 'mysql' | 'postgresql' | 'tsql' | 'plsql' {
  const dialectMap: Record<string, 'mysql' | 'postgresql' | 'tsql' | 'plsql'> = {
    mysql: 'mysql',
    postgresql: 'postgresql',
    sqlserver: 'tsql',
    oracle: 'plsql',
  };
  return dialectMap[dialect] || 'mysql';
}

// Monaco types (deferred import)
type MonacoType = typeof import('monaco-editor');
let monacoInstance: MonacoType | null = null;

// ─── Types ──────────────────────────────────────────────────────────────────

interface OptimizationResult {
  optimizedSql: string;
  estimatedRows: string;
  performanceNotes: string[];
  businessChanges: string;
}

interface EditorState {
  originalSql: string;
  modifiedSql: string;
  isDiffMode: boolean;
  isLoading: boolean;
  optimizationResult: OptimizationResult | null;
  syntaxErrors: string[];
  terminalErrors: Array<{ id: string; message: string }>;
}

// ─── Helper to load Monaco dynamically ────────────────────────────────────

async function loadMonaco(): Promise<MonacoType> {
  if (monacoInstance) return monacoInstance;
  monacoInstance = await import('monaco-editor');
  return monacoInstance;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const SmartSQLEditor: React.FC<{ initialSql?: string }> = ({
  initialSql = 'SELECT * FROM table_name LIMIT 10;',
}) => {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const diffEditorRef = useRef<any>(null);
  const singleEditorRef = useRef<any>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const skipNextModelSyncRef = useRef(false);
  const [monacoReady, setMonacoReady] = useState(false);
  const monacoRef = useRef<MonacoType | null>(null);
  const dialect = useAppStore((state) => state.dialect);
  const settings = useAppStore((state) => state.settings);
  const t = getT(settings.locale);

  const [state, setState] = useState<EditorState>({
    originalSql: initialSql,
    modifiedSql: initialSql,
    isDiffMode: false,
    isLoading: false,
    optimizationResult: null,
    syntaxErrors: [],
    terminalErrors: [],
  });
  const [dismissedSyntaxErrorIds, setDismissedSyntaxErrorIds] = useState<string[]>([]);

  const showResultToast = useCallback(
    (success: boolean) => {
      if (success) {
        toast.success(t.formattingSuccess);
      } else {
        toast.error(t.formattingError);
      }
    },
    []
  );

  const addTerminalError = useCallback((error: unknown, fallbackMessage: string) => {
    const parsedMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : fallbackMessage;

    const cleaned = parsedMessage.replace(/^Error:\s*/i, '').trim() || fallbackMessage;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setState((prev) => ({
      ...prev,
      terminalErrors: [{ id, message: cleaned }, ...prev.terminalErrors].slice(0, 20),
    }));
  }, []);

  const dismissTerminalError = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      terminalErrors: prev.terminalErrors.filter((err) => err.id !== id),
    }));
  }, []);

  // ─── Load Monaco dynamically on client ───────────────────────────────────

  useEffect(() => {
    loadMonaco()
      .then((monaco) => {
        monacoRef.current = monaco;
        setMonacoReady(true);
        logger.debug('✅ Monaco Editor loaded');
      })
      .catch((error) => {
        logger.error('❌ Failed to load Monaco', { error });
      });
  }, []);

  // ─── Initialize Monaco Editor ────────────────────────────────────────────

  useEffect(() => {
    if (!monacoReady || !monacoRef.current) return;
    if (!editorContainerRef.current) return;

    const monaco = monacoRef.current;

    try {
      // Create single editor (default mode)
      const editor = monaco.editor.create(editorContainerRef.current, {
        value: state.originalSql,
        language: 'sql',
        theme: 'vs-dark',
        minimap: { enabled: true },
        wordWrap: 'on',
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
      });

      singleEditorRef.current = editor;
      logger.debug('✅ Monaco Single Editor initialized', {
        initialContent: state.originalSql.substring(0, 50),
      });

      return () => {
        editor.dispose();
        singleEditorRef.current = null;
        logger.debug('✅ Monaco Single Editor disposed');
      };
    } catch (error) {
      logger.error('❌ Failed to initialize Monaco Editor', { error });
    }
  }, [monacoReady]);

  // ─── Real-time Syntax Validation (Debounced) ────────────────────────────

  // ─── Helper: Parse error location from error message ──────────────────

  const parseErrorLocation = (errorMsg: string, sql: string): { line: number; column: number } => {
    // Try to extract line:column from error message (format: "line X column Y: message")
    const lineColMatch = errorMsg.match(/line (\d+)(?:\s+column\s+(\d+))?/i);
    if (lineColMatch) {
      return {
        line: parseInt(lineColMatch[1], 10),
        column: parseInt(lineColMatch[2] || '1', 10),
      };
    }

    // Try to extract line number alone (format: "line X: message")
    const lineMatch = errorMsg.match(/line\s+(\d+)/i);
    if (lineMatch) {
      return {
        line: parseInt(lineMatch[1], 10),
        column: 1,
      };
    }

    // Default: first line
    return { line: 1, column: 1 };
  };

  // ─── Validate SQL Syntax ────────────────────────────────────────────────

  const validateSyntax = useCallback(
    (sql: string) => {
      if (!monacoRef.current) return;
      const monaco = monacoRef.current;

      try {
        const parser = new MySQL();
        const errors: string[] = [];
        const errorDetails: Array<{ line: number; column: number; message: string }> = [];

        try {
          parser.parse(sql);
          logger.debug('✅ SQL syntax valid');
        } catch (parseError) {
          const errorMsg = parseError instanceof Error ? parseError.message : 'Unknown error';
          errors.push(errorMsg);

          // Parse error location
          const location = parseErrorLocation(errorMsg, sql);
          errorDetails.push({
            line: location.line,
            column: location.column,
            message: errorMsg,
          });

          logger.warn('⚠️ SQL syntax error detected', {
            error: errorMsg,
            line: location.line,
            column: location.column,
          });
        }

        setState((prev) => ({
          ...prev,
          syntaxErrors: errors,
          terminalErrors: errors.length === 0 ? [] : prev.terminalErrors,
        }));
        if (errors.length === 0) {
          setDismissedSyntaxErrorIds([]);
        }

        // Set markers for Monaco with specific error locations
        if (singleEditorRef.current) {
          const model = singleEditorRef.current.getModel();
          if (model) {
            const markers: any[] = errorDetails.map((detail, idx) => {
              const sqlLines = sql.split('\n');
              const errorLine = Math.min(detail.line, sqlLines.length);
              const lineContent = sqlLines[errorLine - 1] || '';
              const lineLength = lineContent.length || 1;

              return {
                severity: monaco.MarkerSeverity.Error,
                startLineNumber: errorLine,
                startColumn: Math.max(1, detail.column),
                endLineNumber: errorLine,
                endColumn: lineLength + 1,
                message: detail.message,
                code: `sql-error-${idx}`,
              };
            });

            monaco.editor.setModelMarkers(model, 'sql-parser', markers);
            logger.debug('Markers set in Monaco', {
              count: markers.length,
              details: errorDetails,
            });
          }
        }
      } catch (error) {
        logger.error('❌ Syntax validation failed', { error });
      }
    },
    [monacoRef]
  );

  // Content change handler with debounce
  useEffect(() => {
    if (!singleEditorRef.current) return;

    const disposable = singleEditorRef.current.onDidChangeModelContent(() => {
      if (skipNextModelSyncRef.current) {
        skipNextModelSyncRef.current = false;
        return;
      }

      const newContent = singleEditorRef.current?.getValue() || '';

      setState((prev) => ({ ...prev, originalSql: newContent, modifiedSql: newContent }));

      // Clear previous debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer (500ms)
      debounceTimerRef.current = setTimeout(() => {
        validateSyntax(newContent);
      }, 500);
    });

    return () => {
      disposable.dispose();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [validateSyntax]);

  // ─── Format SQL ──────────────────────────────────────────────────────────

  const handleFormatSQL = useCallback(async () => {
    try {
      const currentSql = singleEditorRef.current?.getValue() || state.originalSql;

      // Validate SQL is not empty
      if (!currentSql || !currentSql.trim()) {
        logger.warn('Cannot format empty SQL');
        showResultToast(false);
        addTerminalError(t.emptyQueryError, 'Query is empty');
        return;
      }

      logger.debug('Formatting SQL with dialect:', dialect);

      const formatted = format(currentSql, {
        language: getFormatterLanguage(dialect),
      });

      // Check if formatting produced valid output
      if (!formatted || typeof formatted !== 'string') {
        throw new Error('Formatter returned invalid result');
      }

      setState((prev) => ({
        ...prev,
        originalSql: currentSql,
        modifiedSql: formatted,
      }));

      skipNextModelSyncRef.current = true;
      singleEditorRef.current?.setValue(formatted);
      validateSyntax(formatted);

      logger.info('✅ SQL formatted successfully');
      showResultToast(true);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('❌ SQL formatting failed', {
        error: errorMsg,
        dialect,
        sqlLength: (singleEditorRef.current?.getValue() || state.originalSql).length,
      });
      showResultToast(false);
      addTerminalError(error, t.formattingError || 'Formatting error');
    }
  }, [state.originalSql, dialect, validateSyntax, t, showResultToast, addTerminalError]);

  // ─── Toggle Diff View ───────────────────────────────────────────────────

  const handleToggleDiffView = useCallback(async () => {
    if (!editorContainerRef.current || !monacoRef.current) return;
    const monaco = monacoRef.current;

    try {
      if (state.isDiffMode && diffEditorRef.current) {
        // Switch back to single editor
        logger.debug('Switching to Single Editor mode');
        setState((prev) => ({ ...prev, isDiffMode: false }));
        const diffModel = diffEditorRef.current.getModel();
        diffModel?.original?.dispose();
        diffModel?.modified?.dispose();
        diffEditorRef.current?.dispose();
        diffEditorRef.current = null;

        // Recreate single editor
        editorContainerRef.current.innerHTML = '';
        const editor = monaco.editor.create(editorContainerRef.current, {
          value: state.originalSql,
          language: 'sql',
          theme: 'vs-dark',
          minimap: { enabled: true },
          wordWrap: 'on',
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
        });

        singleEditorRef.current = editor;
        logger.debug('✅ Single Editor recreated');
      } else {
        // Switch to diff editor
        logger.debug('Switching to Diff Editor mode');
        const currentSql = singleEditorRef.current?.getValue() || state.originalSql;
        const originalForDiff = state.originalSql || currentSql;
        const modifiedForDiff = state.modifiedSql || currentSql;

        if (singleEditorRef.current) {
          singleEditorRef.current.dispose();
          singleEditorRef.current = null;
        }

        editorContainerRef.current.innerHTML = '';

        const originalModel = monaco.editor.createModel(originalForDiff, 'sql');
        const modifiedModel = monaco.editor.createModel(modifiedForDiff, 'sql');

        const diffEditor = monaco.editor.createDiffEditor(editorContainerRef.current, {
          theme: 'vs-dark',
          minimap: { enabled: true },
          wordWrap: 'on',
          fontSize: 14,
          scrollBeyondLastLine: false,
          automaticLayout: true,
        });

        diffEditor.setModel({
          original: originalModel,
          modified: modifiedModel,
        });

        diffEditorRef.current = diffEditor;
        setState((prev) => ({ ...prev, isDiffMode: true }));
        logger.debug('✅ Diff Editor created');
      }
    } catch (error) {
      logger.error('❌ Failed to toggle diff view', { error });
      showResultToast(false);
      addTerminalError(error, t.diffViewErrorTitle || 'Unable to toggle diff view');
    }
  }, [state.isDiffMode, state.originalSql, state.modifiedSql, t, showResultToast, addTerminalError]);

  // ─── AI Optimization via Ollama ──────────────────────────────────────────

  const handleAnalyzeAndOptimize = useCallback(async () => {
    const currentSql = singleEditorRef.current?.getValue() || state.originalSql;

    if (!currentSql.trim()) {
      showResultToast(false);
      addTerminalError('Please enter a SQL query first', 'Query is empty');
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true }));
    logger.info('🚀 Starting AI optimization', { sql: currentSql.substring(0, 100) });

    try {
      const systemPrompt =
        'You are an expert DBA. Analyze the following SQL query. Return ONLY a valid JSON object matching this schema: { "optimizedSql": "string", "estimatedRows": "string", "performanceNotes": ["string"], "businessChanges": "string" }. Do not include markdown formatting or conversational text.';

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistral', // Popular local model; adjust as needed
          prompt: `${systemPrompt}\n\nSQL Query:\n${currentSql}`,
          stream: false,
          format: 'json',
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('📋 Ollama response received', { response: data });

      // Extract JSON from response
      let jsonStr = data.response;

      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = jsonStr.match(/```(?:json)?\s*\{[\s\S]*?\}\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0].replace(/```(?:json)?\s*/g, '').replace(/\s*```/g, '');
      }

      const result: OptimizationResult = JSON.parse(jsonStr);

      // Validate result structure
      if (
        !result.optimizedSql ||
        typeof result.optimizedSql !== 'string' ||
        !Array.isArray(result.performanceNotes)
      ) {
        throw new Error('Invalid optimization result structure');
      }

      setState((prev) => ({
        ...prev,
        modifiedSql: result.optimizedSql,
        optimizationResult: result,
        isLoading: false,
        isDiffMode: true,
      }));

      logger.info('✅ AI optimization completed successfully');

      // Update diff editor
      if (diffEditorRef.current) {
        const modifiedModel = diffEditorRef.current.getModel()?.modified;
        if (modifiedModel) {
          modifiedModel.setValue(result.optimizedSql);
        }
      } else {
        // Switch to diff view to show results
        await handleToggleDiffView();
      }
    } catch (error) {
      logger.error('❌ AI optimization failed', { error });
      showResultToast(false);
      addTerminalError(error, t.ollamaConnectionError || 'AI optimization failed');
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [state.originalSql, handleToggleDiffView, t, showResultToast, addTerminalError]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-12rem)] gap-4 p-4 bg-gray-900 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-white">{t.smartEditorTitle}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleFormatSQL}
            disabled={state.isLoading}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
            title={t.formatSqlTitle}
          >
            {t.formatSqlButton}
          </button>

          <button
            onClick={handleToggleDiffView}
            disabled={state.isLoading}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
            title={t.toggleDiffTitle}
          >
            {state.isDiffMode ? t.backToEditorButton : t.compareButton}
          </button>

          {/* <button
            onClick={handleAnalyzeAndOptimize}
            disabled={state.isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
            title={t.analyzeOptimizeTitle}
          >
            {state.isLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                {t.analyzingLabel}
              </>
            ) : (
              <>{t.analyzeOptimizeButton}</>
            )}
          </button> */}
        </div>
      </div>

      {/* Terminal-style Error Display */}
      {(state.syntaxErrors.length > 0 || state.terminalErrors.length > 0) && (
        <div className="rounded-lg border border-red-800/80 bg-black/40 p-3 text-red-200">
          <p className="font-semibold tracking-wide">{t.syntaxErrorsTitle}</p>
          <div className="mt-2 space-y-2">
            {state.syntaxErrors.map((error, idx) => {
              const syntaxId = `syntax-${idx}-${error}`;
              if (dismissedSyntaxErrorIds.includes(syntaxId)) return null;
              return (
                <div
                  key={syntaxId}
                  className="flex items-start justify-between gap-3 rounded border border-red-900/70 bg-black/50 px-3 py-2"
                >
                  <pre className="m-0 flex-1 whitespace-pre-wrap break-words font-mono text-xs leading-5 text-red-200">
                    {error}
                  </pre>
                  <button
                    type="button"
                    onClick={() =>
                      setDismissedSyntaxErrorIds((prev) =>
                        prev.includes(syntaxId) ? prev : [...prev, syntaxId]
                      )
                    }
                    className="rounded px-2 py-1 text-xs text-red-300 transition-colors hover:bg-red-950/60 hover:text-red-100"
                    aria-label="Dismiss syntax error"
                    title="Close"
                  >
                    X
                  </button>
                </div>
              );
            })}

            {state.terminalErrors.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-3 rounded border border-red-900/70 bg-black/50 px-3 py-2"
              >
                <pre className="m-0 flex-1 whitespace-pre-wrap break-words font-mono text-xs leading-5 text-red-200">
                  {entry.message}
                </pre>
                <button
                  type="button"
                  onClick={() => dismissTerminalError(entry.id)}
                  className="rounded px-2 py-1 text-xs text-red-300 transition-colors hover:bg-red-950/60 hover:text-red-100"
                  aria-label="Dismiss error"
                  title="Close"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editor Container */}
      <div
        ref={editorContainerRef}
        className="flex-1 min-h-0 border border-gray-700 rounded overflow-hidden"
      />

      {/* Optimization Results Panel */}
      {state.optimizationResult && (
        <div className="bg-gray-800 border border-gray-700 rounded p-4 space-y-3 max-h-64 overflow-y-auto">
          <h3 className="text-lg font-semibold text-green-400">{t.optimizationResultsTitle}</h3>

          {/* Estimated Rows */}
          {state.optimizationResult.estimatedRows && (
            <div>
              <p className="text-sm font-semibold text-gray-300">{t.estimatedRowsLabel}</p>
              <p className="text-white ml-2">{state.optimizationResult.estimatedRows}</p>
            </div>
          )}

          {/* Performance Notes */}
          {state.optimizationResult.performanceNotes.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-300">{t.performanceNotesLabel}</p>
              <ul className="list-disc list-inside ml-2 text-white text-sm space-y-1">
                {state.optimizationResult.performanceNotes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Business Changes */}
          {state.optimizationResult.businessChanges && (
            <div>
              <p className="text-sm font-semibold text-gray-300">{t.businessChangesLabel}</p>
              <p className="text-white ml-2 text-sm">{state.optimizationResult.businessChanges}</p>
            </div>
          )}
        </div>
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-700 pt-2">
        <div>
          {state.isDiffMode ? t.diffViewStatus : t.singleEditorStatus} | {t.syntaxErrorsStatus}{' '}
          {state.syntaxErrors.length}
        </div>
        <div>{state.isLoading && t.processingStatus}</div>
      </div>
    </div>
  );
};

export default SmartSQLEditor;
