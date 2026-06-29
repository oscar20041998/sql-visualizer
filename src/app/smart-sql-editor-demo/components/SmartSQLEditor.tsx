'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import type { editor as MonacoEditorNS, MarkerSeverity } from 'monaco-editor';
import { format } from 'sql-formatter';
import { GenericSQL, MySQL, PostgreSQL } from 'dt-sql-parser';
import { createLogger } from '@/lib/logger';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import { toast } from 'sonner';

const logger = createLogger('SmartSQLEditor');

function getFormatterLanguage(dialect: string): 'mysql' | 'postgresql' | 'tsql' | 'plsql' {
  const dialectMap: Record<string, 'mysql' | 'postgresql' | 'tsql' | 'plsql'> = {
    mysql: 'mysql',
    postgresql: 'postgresql',
    sqlserver: 'tsql',
    oracle: 'plsql',
  };
  return dialectMap[dialect] || 'mysql';
}

function getDialectParser(dialect: string): MySQL | PostgreSQL | GenericSQL {
  const parserMap: Record<string, () => MySQL | PostgreSQL | GenericSQL> = {
    mysql: () => new MySQL(),
    postgresql: () => new PostgreSQL(),
    // dt-sql-parser does not expose dedicated SQL Server/Oracle parser classes in this version.
    sqlserver: () => new GenericSQL(),
    oracle: () => new GenericSQL(),
  };

  return (parserMap[dialect] || parserMap.mysql)();
}

interface OptimizationResult {
  optimizedSql: string;
  estimatedRows: string;
  performanceNotes: string[];
  businessChanges: string;
}

interface ParseErrorDetail {
  line: number;
  column: number;
  message: string;
}

interface TerminalEntry {
  id: string;
  message: string;
  source: 'syntax' | 'system';
}

interface EditorState {
  currentSql: string;
  previousSql: string;
  isDiffMode: boolean;
  isLoading: boolean;
  optimizationResult: OptimizationResult | null;
  syntaxErrors: string[];
  syntaxErrorDetails: ParseErrorDetail[];
  terminalErrors: TerminalEntry[];
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
  const mainEditorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
  const diffEditorRef = useRef<MonacoEditorNS.IStandaloneDiffEditor | null>(null);
  const monacoApiRef = useRef<typeof import('monaco-editor') | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const dialect = useAppStore((store) => store.dialect);
  const settings = useAppStore((store) => store.settings);
  const t = getT(settings.locale);

  const [state, setState] = useState<EditorState>({
    currentSql: initialSql,
    previousSql: initialSql,
    isDiffMode: false,
    isLoading: false,
    optimizationResult: null,
    syntaxErrors: [],
    syntaxErrorDetails: [],
    terminalErrors: [],
  });

  const showResultToast = useCallback(
    (success: boolean) => {
      if (success) {
        toast.success(t.formattingSuccess);
      } else {
        toast.error(t.formattingError);
      }
    },
    [t.formattingError, t.formattingSuccess]
  );

  const addTerminalError = useCallback((error: unknown, fallbackMessage: string) => {
    const parsedMessage =
      error instanceof Error ? error.message : typeof error === 'string' ? error : fallbackMessage;

    const cleaned = parsedMessage.replace(/^Error:\s*/i, '').trim() || fallbackMessage;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const systemEntry: TerminalEntry = { id, message: cleaned, source: 'system' };

    setState((prev) => ({
      ...prev,
      terminalErrors: [systemEntry, ...prev.terminalErrors].slice(0, 100),
    }));
  }, []);

  const dismissTerminalError = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      terminalErrors: prev.terminalErrors.filter((entry) => entry.id !== id),
    }));
  }, []);

  const parseErrorLocation = useCallback((errorMsg: string): { line: number; column: number } => {
    const lineColMatch = errorMsg.match(/line\s+(\d+)(?:\s+column\s+(\d+))?/i);
    if (lineColMatch) {
      return {
        line: parseInt(lineColMatch[1], 10),
        column: parseInt(lineColMatch[2] || '1', 10),
      };
    }

    const lineMatch = errorMsg.match(/line\s+(\d+)/i);
    if (lineMatch) {
      return {
        line: parseInt(lineMatch[1], 10),
        column: 1,
      };
    }

    return { line: 1, column: 1 };
  }, []);

  const applyMarkers = useCallback(
    (sql: string, details: ParseErrorDetail[]) => {
      const monaco = monacoApiRef.current;
      if (!monaco) return;

      const model = state.isDiffMode
        ? diffEditorRef.current?.getModel()?.modified
        : mainEditorRef.current?.getModel();

      if (!model) return;

      const markers = details.map((detail, idx) => {
        const lines = sql.split('\n');
        const errorLine = Math.min(Math.max(1, detail.line), lines.length || 1);
        const lineContent = lines[errorLine - 1] || '';
        const lineLength = lineContent.length || 1;

        return {
          severity: monaco.MarkerSeverity.Error as MarkerSeverity,
          startLineNumber: errorLine,
          startColumn: Math.max(1, detail.column),
          endLineNumber: errorLine,
          endColumn: lineLength + 1,
          message: detail.message,
          code: `sql-error-${idx}`,
        };
      });

      monaco.editor.setModelMarkers(model, 'sql-parser', markers);
    },
    [state.isDiffMode]
  );

  const validateSyntax = useCallback(
    (sql: string) => {
      try {
        const parser = getDialectParser(dialect);
        const errors: string[] = [];
        const details: ParseErrorDetail[] = [];

        try {
          parser.parse(sql);
        } catch (parseError) {
          const errorMsg =
            parseError instanceof Error ? parseError.message : 'Unknown SQL parse error';
          errors.push(errorMsg);
          const location = parseErrorLocation(errorMsg);
          details.push({ line: location.line, column: location.column, message: errorMsg });
        }

        setState((prev) => {
          const syntaxEntries: TerminalEntry[] = errors.map((message, idx) => ({
            id: `syntax-${Date.now()}-${idx}`,
            message,
            source: 'syntax',
          }));

          return {
            ...prev,
            syntaxErrors: errors,
            syntaxErrorDetails: details,
            terminalErrors: [
              ...syntaxEntries,
              ...prev.terminalErrors.filter((entry) => entry.source !== 'syntax'),
            ].slice(0, 100),
          };
        });

        applyMarkers(sql, details);

        if (errors.length === 0) {
          logger.debug('SQL syntax valid', { dialect });
        } else {
          logger.warn('SQL syntax errors detected', { dialect, errors });
        }
      } catch (error) {
        logger.error('Syntax validation failed', { error });
      }
    },
    [applyMarkers, dialect, parseErrorLocation]
  );

  const queueValidation = useCallback(
    (sql: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        validateSyntax(sql);
      }, 400);
    },
    [validateSyntax]
  );

  const handleEditorDidMount = useCallback(
    (editor: MonacoEditorNS.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
      mainEditorRef.current = editor;
      monacoApiRef.current = monaco;
      queueValidation(editor.getValue());
    },
    [queueValidation]
  );

  const handleDiffEditorDidMount = useCallback(
    (editor: MonacoEditorNS.IStandaloneDiffEditor, monaco: typeof import('monaco-editor')) => {
      diffEditorRef.current = editor;
      monacoApiRef.current = monaco;
      queueValidation(state.currentSql);
    },
    [queueValidation, state.currentSql]
  );

  useEffect(() => {
    queueValidation(state.currentSql);
  }, [dialect, queueValidation, state.currentSql]);

  useEffect(() => {
    applyMarkers(state.currentSql, state.syntaxErrorDetails);
  }, [applyMarkers, state.currentSql, state.syntaxErrorDetails, state.isDiffMode]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleFormatSQL = useCallback(async () => {
    try {
      const currentSql = state.currentSql;

      if (!currentSql.trim()) {
        showResultToast(false);
        addTerminalError(t.emptyQueryError, 'Query is empty');
        return;
      }

      const formatted = format(currentSql, {
        language: getFormatterLanguage(dialect),
      });

      if (!formatted || typeof formatted !== 'string') {
        throw new Error('Formatter returned invalid result');
      }

      setState((prev) => ({
        ...prev,
        previousSql: prev.currentSql,
        currentSql: formatted,
      }));

      showResultToast(true);
      queueValidation(formatted);
    } catch (error) {
      logger.error('SQL formatting failed', { error, dialect });
      showResultToast(false);
      addTerminalError(error, t.formattingError || 'Formatting error');
    }
  }, [
    addTerminalError,
    dialect,
    queueValidation,
    showResultToast,
    state.currentSql,
    t.emptyQueryError,
    t.formattingError,
  ]);

  const handleToggleDiffView = useCallback(() => {
    setState((prev) => ({ ...prev, isDiffMode: !prev.isDiffMode }));
  }, []);

  const handleAnalyzeAndOptimize = useCallback(async () => {
    const currentSql = state.currentSql;

    if (!currentSql.trim()) {
      showResultToast(false);
      addTerminalError('Please enter a SQL query first', 'Query is empty');
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const systemPrompt =
        'You are an expert DBA. Analyze the following SQL query. Return ONLY a valid JSON object matching this schema: { "optimizedSql": "string", "estimatedRows": "string", "performanceNotes": ["string"], "businessChanges": "string" }. Do not include markdown formatting or conversational text.';

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistral',
          prompt: `${systemPrompt}\n\nSQL Query:\n${currentSql}`,
          stream: false,
          format: 'json',
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      let jsonStr = data.response;

      const jsonMatch = jsonStr.match(/```(?:json)?\s*\{[\s\S]*?\}\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0].replace(/```(?:json)?\s*/g, '').replace(/\s*```/g, '');
      }

      const result: OptimizationResult = JSON.parse(jsonStr);

      if (
        !result.optimizedSql ||
        typeof result.optimizedSql !== 'string' ||
        !Array.isArray(result.performanceNotes)
      ) {
        throw new Error('Invalid optimization result structure');
      }

      setState((prev) => ({
        ...prev,
        previousSql: prev.currentSql,
        currentSql: result.optimizedSql,
        optimizationResult: result,
        isLoading: false,
        isDiffMode: true,
      }));

      queueValidation(result.optimizedSql);
    } catch (error) {
      logger.error('AI optimization failed', { error });
      showResultToast(false);
      addTerminalError(error, t.ollamaConnectionError || 'AI optimization failed');
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [
    addTerminalError,
    queueValidation,
    showResultToast,
    state.currentSql,
    t.ollamaConnectionError,
  ]);

  const hasAnyErrors = state.terminalErrors.length > 0;

  return (
    <div className="flex flex-col flex-1 gap-4 p-4 bg-gray-900 rounded-lg overflow-hidden">
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
            disabled={state.isLoading || state.currentSql === state.previousSql}
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

      {hasAnyErrors && (
        <div className="rounded-lg border border-red-800/80 bg-black/40 p-3 text-red-200">
          <p className="font-semibold tracking-wide">{t.syntaxErrorsTitle}</p>
          <div className="mt-2 max-h-56 overflow-y-auto space-y-2 pr-1">
            {state.terminalErrors.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-3 rounded border border-red-900/70 bg-black/50 px-3 py-2"
              >
                <pre className="m-0 flex-1 whitespace-pre-wrap break-words font-mono text-xs leading-5 text-red-200">
                  [{entry.source}] {entry.message}
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

      <div className="flex-1 min-h-0 border border-gray-700 rounded overflow-hidden">
        {state.isDiffMode ? (
          <DiffEditor
            original={state.previousSql}
            modified={state.currentSql}
            language="sql"
            theme="vs-dark"
            options={diffEditorOptions}
            onMount={handleDiffEditorDidMount}
            height="100%"
          />
        ) : (
          <Editor
            value={state.currentSql}
            language="sql"
            theme="vs-dark"
            options={editorOptions}
            onMount={handleEditorDidMount}
            onChange={(value) => {
              const nextSql = value ?? '';
              setState((prev) => ({
                ...prev,
                previousSql: prev.currentSql,
                currentSql: nextSql,
              }));
              queueValidation(nextSql);
            }}
            height="100%"
          />
        )}
      </div>

      {state.optimizationResult && (
        <div className="bg-gray-800 border border-gray-700 rounded p-4 space-y-3 max-h-64 overflow-y-auto">
          <h3 className="text-lg font-semibold text-green-400">{t.optimizationResultsTitle}</h3>

          {state.optimizationResult.estimatedRows && (
            <div>
              <p className="text-sm font-semibold text-gray-300">{t.estimatedRowsLabel}</p>
              <p className="text-white ml-2">{state.optimizationResult.estimatedRows}</p>
            </div>
          )}

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

          {state.optimizationResult.businessChanges && (
            <div>
              <p className="text-sm font-semibold text-gray-300">{t.businessChangesLabel}</p>
              <p className="text-white ml-2 text-sm">{state.optimizationResult.businessChanges}</p>
            </div>
          )}
        </div>
      )}

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
