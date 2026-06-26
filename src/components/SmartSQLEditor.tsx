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
  });

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

  const validateSyntax = useCallback(
    (sql: string) => {
      if (!monacoRef.current) return;
      const monaco = monacoRef.current;

      try {
        const parser = new MySQL();
        const errors: string[] = [];

        try {
          parser.parse(sql);
          logger.debug('✅ SQL syntax valid');
        } catch (parseError) {
          const errorMsg = parseError instanceof Error ? parseError.message : 'Unknown error';
          errors.push(errorMsg);
          logger.warn('⚠️ SQL syntax error detected', { error: errorMsg });
        }

        setState((prev) => ({ ...prev, syntaxErrors: errors }));

        // Set markers for Monaco
        if (singleEditorRef.current) {
          const model = singleEditorRef.current.getModel();
          if (model) {
            const markers: any[] = errors.map((error, idx) => ({
              severity: monaco.MarkerSeverity.Error,
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: sql.split('\n').length,
              endColumn: sql.split('\n').pop()?.length || 1,
              message: error,
              code: `sql-error-${idx}`,
            }));

            monaco.editor.setModelMarkers(model, 'sql-parser', markers);
            logger.debug('Markers set in Monaco', { count: markers.length });
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

      const formatted = format(currentSql, {
        language: getFormatterLanguage(dialect),
      });

      setState((prev) => ({
        ...prev,
        originalSql: formatted,
        modifiedSql: formatted,
      }));

      singleEditorRef.current?.setValue(formatted);
      validateSyntax(formatted);

      logger.info('✅ SQL formatted successfully');
    } catch (error) {
      logger.error('❌ SQL formatting failed', { error });
      toast.error(
        `${t.formattingError} ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }, [state.originalSql, validateSyntax, t]);

  // ─── Toggle Diff View ───────────────────────────────────────────────────

  const handleToggleDiffView = useCallback(async () => {
    if (!editorContainerRef.current || !monacoRef.current) return;
    const monaco = monacoRef.current;

    try {
      if (state.isDiffMode && singleEditorRef.current) {
        // Switch back to single editor
        logger.debug('Switching to Single Editor mode');
        setState((prev) => ({ ...prev, isDiffMode: false }));
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
        if (singleEditorRef.current) {
          singleEditorRef.current.dispose();
          singleEditorRef.current = null;
        }

        editorContainerRef.current.innerHTML = '';

        const originalModel = monaco.editor.createModel(state.originalSql, 'sql');
        const modifiedModel = monaco.editor.createModel(state.modifiedSql, 'sql');

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
      toast.error(
        `${t.diffViewErrorTitle} ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }, [state.isDiffMode, state.originalSql, state.modifiedSql, t]);

  // ─── AI Optimization via Ollama ──────────────────────────────────────────

  const handleAnalyzeAndOptimize = useCallback(async () => {
    const currentSql = singleEditorRef.current?.getValue() || state.originalSql;

    if (!currentSql.trim()) {
      toast.error('Please enter a SQL query first');
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

      const errorMsg = error instanceof Error ? error.message : t.ollamaConnectionError;

      toast.error(`${t.analyzeOptimizeButton} ${t.formattingError} ${errorMsg}`);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [state.originalSql, handleToggleDiffView, t]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full gap-4 p-4 bg-gray-900 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">{t.smartEditorTitle}</h2>
        <div className="flex gap-2">
          <button
            onClick={handleFormatSQL}
            disabled={state.isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            title={t.formatSqlTitle}
          >
            {t.formatSqlButton}
          </button>

          <button
            onClick={handleToggleDiffView}
            disabled={state.isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            title={t.toggleDiffTitle}
          >
            {state.isDiffMode ? t.backToEditorButton : t.compareButton}
          </button>

          <button
            onClick={handleAnalyzeAndOptimize}
            disabled={state.isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
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
          </button>
        </div>
      </div>

      {/* Syntax Errors Display */}
      {state.syntaxErrors.length > 0 && (
        <div className="p-3 bg-red-900 text-red-100 rounded border border-red-700">
          <p className="font-semibold">{t.syntaxErrorsTitle}</p>
          <ul className="list-disc list-inside text-sm mt-1">
            {state.syntaxErrors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Editor Container */}
      <div
        ref={editorContainerRef}
        className="flex-1 border border-gray-700 rounded overflow-hidden"
        style={{ minHeight: '400px' }}
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
