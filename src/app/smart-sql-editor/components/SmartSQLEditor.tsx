'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import type { editor as MonacoEditorNS } from 'monaco-editor';
import { format } from 'sql-formatter';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import { toast } from 'sonner';
import {
  FileText,
  GitCompare,
  Copy,
  Check,
  RotateCcw,
  Zap,
  Sparkles,
  X,
  Volume2,
  Square,
} from 'lucide-react';
import { analyzeSql } from '@/lib/sql/sqlAnalyzer';
import { checkSelectAll, checkOtherLintingRules } from '@/lib/sql/complexityScorer';
import { buildSqlContextBrief } from '@/lib/ai/aiSqlContext';
import { optimizeSqlWithAIStream, type SqlOptimizationResult } from '@/lib/ai/aiService';

function getFormatterLanguage(dialect: string): 'mysql' | 'postgresql' | 'tsql' | 'plsql' {
  const dialectMap: Record<string, 'mysql' | 'postgresql' | 'tsql' | 'plsql'> = {
    mysql: 'mysql',
    postgresql: 'postgresql',
    sqlserver: 'tsql',
    oracle: 'plsql',
  };
  return dialectMap[dialect] || 'mysql';
}

/** Best-effort SQL formatting: falls back to the input unchanged if the formatter chokes on it. */
function safeFormatSql(sql: string, dialect: string): string {
  try {
    return format(sql, { language: getFormatterLanguage(dialect) });
  } catch {
    return sql;
  }
}

/** Reads a JSON string value out of a possibly-incomplete JSON document being streamed in. */
function extractPartialJsonString(raw: string, key: string): string | null {
  const idx = raw.indexOf(`"${key}"`);
  if (idx === -1) return null;
  let i = raw.indexOf(':', idx + key.length + 2);
  if (i === -1) return null;
  i++;
  while (raw[i] === ' ' || raw[i] === '\n' || raw[i] === '\t' || raw[i] === '\r') i++;
  if (raw[i] !== '"') return null;
  i++;
  let result = '';
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === '\\') {
      const next = raw[i + 1];
      if (next === undefined) break; // escape sequence not finished yet, stop here
      const map: Record<string, string> = { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\' };
      result += map[next] ?? next;
      i += 2;
      continue;
    }
    if (ch === '"') return result;
    result += ch;
    i++;
  }
  return result; // string still open — return the partial content streamed so far
}

/** Reads only the fully-closed string entries of a JSON string array being streamed in. */
function extractPartialJsonStringArray(raw: string, key: string): string[] {
  const idx = raw.indexOf(`"${key}"`);
  if (idx === -1) return [];
  const arrStart = raw.indexOf('[', idx);
  if (arrStart === -1) return [];
  const arrEnd = raw.indexOf(']', arrStart);
  const segment = arrEnd === -1 ? raw.slice(arrStart + 1) : raw.slice(arrStart + 1, arrEnd);
  const matches = segment.match(/"(?:[^"\\]|\\.)*"/g) ?? [];
  return matches.map((m) => {
    try {
      return JSON.parse(m) as string;
    } catch {
      return m.slice(1, -1);
    }
  });
}

/** Turns the raw JSON being streamed from the optimize call into a plain-language progress message. */
function buildOptimizeProgressMessage(raw: string, waitingLabel: string): string {
  const analysis = extractPartialJsonString(raw, 'analysis');
  const suggestions = extractPartialJsonStringArray(raw, 'suggestions');

  const parts: string[] = [];
  if (analysis) parts.push(analysis);
  if (suggestions.length) parts.push(suggestions.map((s) => `• ${s}`).join('\n'));

  return parts.join('\n\n') || waitingLabel;
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
  /** Line to reveal + briefly highlight once the editor is ready — fed by "go to line" links on the Metrics Dashboard. */
  jumpToLine?: number | null;
  /** Called once the jump has been applied, so the caller can clear its pending-jump state. */
  onJumpHandled?: () => void;
}> = ({
  initialSql = 'SELECT * FROM table_name LIMIT 10;',
  onSqlChange,
  onOptimizationResult,
  jumpToLine,
  onJumpHandled,
}) => {
  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const jumpDecorationsRef = useRef<string[]>([]);

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
  const [optimizePhase, setOptimizePhase] = useState<'idle' | 'streaming' | 'done' | 'error'>(
    'idle'
  );
  const [optimizeStreamRaw, setOptimizeStreamRaw] = useState('');
  const [optimizeResult, setOptimizeResult] = useState<SqlOptimizationResult | null>(null);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const [speechPhase, setSpeechPhase] = useState<'idle' | 'playing'>('idle');

  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    setSpeechPhase('idle');
  }, []);

  useEffect(() => () => stopSpeech(), [stopSpeech]);
  useEffect(() => stopSpeech(), [settings.locale, stopSpeech]);

  const handleSpeech = useCallback(() => {
    if (!optimizeResult) return;
    if (speechPhase === 'playing') {
      stopSpeech();
      return;
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error(t.smartEditorSpeechError);
      return;
    }

    const text = [
      optimizeResult.analysis,
      optimizeResult.suggestions.length
        ? `${t.performanceNotesLabel} ${optimizeResult.suggestions.join('. ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const synthesis = window.speechSynthesis;
    synthesis.cancel();
    const language = settings.locale === 'vi' ? 'vi-VN' : 'en-US';
    const voices = synthesis.getVoices();
    const utterance = new SpeechSynthesisUtterance(text);
    const languageCode = language.slice(0, 2).toLowerCase();
    utterance.voice =
      voices.find(
        (voice) =>
          voice.name.toLowerCase().includes('microsoft') &&
          voice.lang.toLowerCase().startsWith(languageCode)
      ) ??
      voices.find((voice) => voice.lang.toLowerCase().startsWith(languageCode)) ??
      null;
    utterance.lang = utterance.voice?.lang || language;
    utterance.rate = 1;
    utterance.onend = () => setSpeechPhase('idle');
    utterance.onerror = (event) => {
      setSpeechPhase('idle');
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        toast.error(t.smartEditorSpeechError);
      }
    };
    synthesis.speak(utterance);
    setSpeechPhase('playing');
  }, [optimizeResult, settings.locale, speechPhase, stopSpeech, t]);

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

  const revealAndHighlightLine = useCallback((line: number) => {
    const editor = editorRef.current;
    const monacoInstance = monacoRef.current;
    if (!editor || !monacoInstance) return;
    const lineCount = editor.getModel()?.getLineCount() ?? 1;
    const safeLine = Math.min(Math.max(1, line), lineCount);
    editor.revealLineInCenter(safeLine);
    editor.setPosition({ lineNumber: safeLine, column: 1 });
    editor.focus();
    jumpDecorationsRef.current = editor.deltaDecorations(jumpDecorationsRef.current, [
      {
        range: new monacoInstance.Range(safeLine, 1, safeLine, 1),
        options: { isWholeLine: true, className: 'smart-editor-jump-highlight' },
      },
    ]);
    setTimeout(() => {
      if (editorRef.current) {
        jumpDecorationsRef.current = editorRef.current.deltaDecorations(
          jumpDecorationsRef.current,
          []
        );
      }
    }, 2500);
  }, []);

  const handleEditorMount = useCallback(
    (
      editor: MonacoEditorNS.IStandaloneCodeEditor,
      monacoInstance: typeof import('monaco-editor')
    ) => {
      editorRef.current = editor;
      monacoRef.current = monacoInstance;
      editor.setValue(state.currentSql);
      if (jumpToLine) {
        // Defer one tick so the model/layout is settled before revealing the line.
        setTimeout(() => {
          revealAndHighlightLine(jumpToLine);
          onJumpHandled?.();
        }, 0);
      }
    },
    [state.currentSql, jumpToLine, onJumpHandled, revealAndHighlightLine]
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
    stopSpeech();
    const controller = new AbortController();
    optimizeAbortRef.current = controller;

    setState((prev) => ({ ...prev, isOptimizing: true }));
    onOptimizationResult?.(null);
    setOptimizeResult(null);
    setOptimizeError(null);
    setOptimizeStreamRaw('');
    setOptimizePhase('streaming');

    let brief = '';
    try {
      const parsed = await analyzeSql(sql, dialect, settings.locale);
      brief = buildSqlContextBrief(parsed);
    } catch {
      brief = '';
    }

    // Feed the same linting alerts shown in the UI to the model so it targets them directly.
    const lintIssues = [
      ...checkSelectAll(sql, settings.locale),
      ...checkOtherLintingRules(sql, settings.locale),
    ];
    if (lintIssues.length) {
      const lintBrief = [
        t.smartEditorLintBriefHeader,
        ...lintIssues.map(
          (issue) =>
            `- [${issue.severity}] ${issue.rule}: ${issue.message} ${t.smartEditorLintFixLabel} ${issue.suggestion}`
        ),
      ].join('\n');
      brief = brief ? `${brief}\n\n${lintBrief}` : lintBrief;
    }

    try {
      const result = await optimizeSqlWithAIStream(
        {
          sql,
          config: settings.aiConfig,
          locale: settings.locale,
          contextBrief: brief,
          signal: controller.signal,
        },
        (delta) => setOptimizeStreamRaw((prev) => prev + delta)
      );
      if (controller.signal.aborted) return;

      // Format both sides so the diff highlights the actual logic change, not whitespace noise.
      const formattedOriginal = safeFormatSql(sql, dialect);
      const formattedOptimized = safeFormatSql(result.optimizedSql || sql, dialect);

      setState((prev) => ({
        ...prev,
        originalSql: formattedOriginal,
        currentSql: formattedOptimized,
        isDiffMode: formattedOptimized.trim() !== formattedOriginal.trim() ? true : prev.isDiffMode,
        isOptimizing: false,
      }));
      setOptimizeResult(result);
      setOptimizePhase('done');
      onOptimizationResult?.(result);
      toast.success(t.smartEditorOptimizationSuccess);
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        setState((prev) => ({ ...prev, isOptimizing: false }));
        setOptimizePhase('idle');
        return;
      }
      const message = (error as Error)?.message || t.smartEditorOptimizationError;
      setState((prev) => ({ ...prev, isOptimizing: false }));
      onOptimizationResult?.(null);
      setOptimizeError(message);
      setOptimizePhase('error');
      toast.error(message);
    } finally {
      if (optimizeAbortRef.current === controller) optimizeAbortRef.current = null;
    }
  }, [state.currentSql, dialect, settings, t, onOptimizationResult, stopSpeech]);

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

        {/* AI Optimize progress / results — live stream while running, structured summary once done */}
        {optimizePhase !== 'idle' && (
          <div className="mb-3 rounded-lg border border-indigo-800/40 bg-indigo-950/20 p-3 scrollbar-thin">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-300">
                <Sparkles
                  size={12}
                  className={optimizePhase === 'streaming' ? 'animate-pulse' : ''}
                />
                {optimizePhase === 'streaming'
                  ? t.smartEditorOptimizeProgressTitle
                  : optimizePhase === 'error'
                    ? t.smartEditorOptimizationError
                    : t.optimizationResultsTitle}
              </p>
              {optimizePhase !== 'streaming' && (
                <div className="flex items-center gap-1">
                  {optimizePhase === 'done' && optimizeResult && (
                    <button
                      onClick={handleSpeech}
                      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-indigo-300 transition-colors hover:bg-indigo-400/10 hover:text-indigo-200 disabled:cursor-wait disabled:opacity-70"
                      aria-label={
                        speechPhase === 'idle' ? t.smartEditorSpeechPlay : t.smartEditorSpeechStop
                      }
                      title={
                        speechPhase === 'idle' ? t.smartEditorSpeechPlay : t.smartEditorSpeechStop
                      }
                    >
                      {speechPhase === 'playing' ? (
                        <Square size={12} fill="currentColor" />
                      ) : (
                        <Volume2 size={14} />
                      )}
                      <span className="hidden sm:inline">
                        {speechPhase === 'idle' ? t.smartEditorSpeechPlay : t.smartEditorSpeechStop}
                      </span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      stopSpeech();
                      setOptimizePhase('idle');
                    }}
                    className="text-gray-500 transition-colors hover:text-gray-300"
                    aria-label={t.smartEditorReset}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            {optimizePhase === 'streaming' && (
              <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-gray-300">
                {buildOptimizeProgressMessage(optimizeStreamRaw, t.smartEditorOptimizeWaitingLabel)}
                <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-indigo-400 align-middle" />
              </p>
            )}

            {optimizePhase === 'error' && optimizeError && (
              <p className="mt-2 text-xs text-red-300">{optimizeError}</p>
            )}

            {optimizePhase === 'done' && optimizeResult && (
              <div className="mt-2 space-y-2">
                <p className="text-sm leading-relaxed text-gray-200">
                  {optimizeResult.analysis || t.aiExplainerNoContent}
                </p>
                {optimizeResult.suggestions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {t.performanceNotesLabel}
                    </p>
                    <ul className="mt-1 space-y-1 text-sm text-gray-200">
                      {optimizeResult.suggestions.map((suggestion, index) => (
                        <li
                          key={`smart-optimize-suggestion-${index}`}
                          className="flex items-start gap-2"
                        >
                          <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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
          {state.hasChanges && <span className="text-warning">{t.smartEditorChangesDetected}</span>}
          {!state.hasChanges && state.currentSql !== '' && (
            <span className="text-success">{t.smartEditorSyncedWithOriginal}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartSQLEditor;
