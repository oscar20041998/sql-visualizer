'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import type { editor as MonacoEditorNS } from 'monaco-editor';
import { format } from 'sql-formatter';
import { useAppStore } from '@/lib/store';
import { getT, type Translations } from '@/lib/i18n';
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
  ChevronDown,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { analyzeSql, type AnalysisResult } from '@/lib/sql/sqlAnalyzer';
import { checkSelectAll, checkOtherLintingRules } from '@/lib/sql/complexityScorer';
import { buildSqlContextBrief } from '@/lib/ai/aiSqlContext';
import { optimizeSqlWithAIStream, type SqlOptimizationResult } from '@/lib/ai/aiService';
import { synthesizeSpeech } from '@/lib/ai/aiSpeech';
import { buildOptimizeKnowledgeBrief, type DatabaseKnowledgeSource } from '@/lib/ai/databaseAssistant';
import LintingAlerts from '@/components/ui/LintingAlerts';

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

/**
 * A local, non-AI safety net: the model is told to touch only what a linting alert requires, but
 * it can still ignore that instruction. This compares structural facts the parser already
 * verified on both queries (tables, joins, filter conditions, output columns, DISTINCT/GROUP BY)
 * and flags anything the "optimized" query dropped, so an over-eager rewrite is visible before
 * the user decides whether to keep it — instead of silently trusting the model's own summary.
 */
function buildStructuralRegressionWarnings(
  original: AnalysisResult,
  optimized: AnalysisResult,
  t: Translations
): string[] {
  const warnings: string[] = [];

  if (optimized.tables.length < original.tables.length) {
    warnings.push(
      t.smartEditorOptimizeRegressionTables.replace(
        '{count}',
        String(original.tables.length - optimized.tables.length)
      )
    );
  }
  if (optimized.metrics.totalJoinCount < original.metrics.totalJoinCount) {
    warnings.push(
      t.smartEditorOptimizeRegressionJoins.replace(
        '{count}',
        String(original.metrics.totalJoinCount - optimized.metrics.totalJoinCount)
      )
    );
  }
  if (optimized.metrics.conditionCount < original.metrics.conditionCount) {
    warnings.push(
      t.smartEditorOptimizeRegressionConditions.replace(
        '{count}',
        String(original.metrics.conditionCount - optimized.metrics.conditionCount)
      )
    );
  }
  if (optimized.mainQueryFields.length < original.mainQueryFields.length) {
    warnings.push(
      t.smartEditorOptimizeRegressionColumns
        .replace('{optimized}', String(optimized.mainQueryFields.length))
        .replace('{original}', String(original.mainQueryFields.length))
    );
  }
  if (original.metrics.distinct > 0 && optimized.metrics.distinct === 0) {
    warnings.push(t.smartEditorOptimizeRegressionDistinct);
  }
  if (original.metrics.groupBy > 0 && optimized.metrics.groupBy === 0) {
    warnings.push(t.smartEditorOptimizeRegressionGroupBy);
  }

  return warnings;
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
  const setAnalysisResult = useAppStore((store) => store.setAnalysisResult);
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
  const [knowledgeSources, setKnowledgeSources] = useState<DatabaseKnowledgeSource[]>([]);
  // Local structural check, independent of what the model claims in analysis/semantic_impact.
  const [structuralWarnings, setStructuralWarnings] = useState<string[]>([]);
  const [speechPhase, setSpeechPhase] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [showOptimizeRaw, setShowOptimizeRaw] = useState(false);
  const isLocalProvider = settings.aiConfig.provider === 'ollama';
  const speechAbortRef = useRef<AbortController | null>(null);
  const speechAudioRef = useRef<HTMLAudioElement | null>(null);
  // One synthesized clip per optimize result — replayable without re-billing a fresh request.
  const speechUrlRef = useRef<string | null>(null);

  const stopSpeech = useCallback(() => {
    speechAbortRef.current?.abort();
    speechAbortRef.current = null;
    if (speechAudioRef.current) {
      speechAudioRef.current.pause();
      speechAudioRef.current = null;
    }
    setSpeechPhase('idle');
  }, []);

  // A fresh clip is required for a locale switch — the cached URL was narrated in the old language.
  const resetSpeechCache = useCallback(() => {
    stopSpeech();
    if (speechUrlRef.current) {
      URL.revokeObjectURL(speechUrlRef.current);
      speechUrlRef.current = null;
    }
  }, [stopSpeech]);

  useEffect(() => () => resetSpeechCache(), [resetSpeechCache]);
  useEffect(() => resetSpeechCache(), [settings.locale, resetSpeechCache]);

  // Fired from an effect (after commit + paint) rather than inline in the async handler, so the
  // success toast can never appear a frame before the loading overlay has actually disappeared.
  useEffect(() => {
    if (optimizePhase !== 'done') return;
    if (structuralWarnings.length > 0) {
      toast.warning(t.smartEditorOptimizeRegressionToast);
    } else {
      toast.success(t.smartEditorOptimizationSuccess);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optimizePhase]);

  const playSpeech = useCallback(
    async (url: string) => {
      // A fresh element per playback, same as the Explainer panel: reusing one leaves the old
      // buffer playing on some browsers once `src` is reassigned.
      const audio = new Audio(url);
      speechAudioRef.current = audio;
      audio.addEventListener('ended', () => {
        if (speechAudioRef.current === audio) speechAudioRef.current = null;
        setSpeechPhase('idle');
      });
      audio.addEventListener('error', () => {
        if (speechAudioRef.current === audio) speechAudioRef.current = null;
        setSpeechPhase('idle');
        toast.error(t.aiExplainerSpeakFailed);
      });

      setSpeechPhase('playing');
      try {
        await audio.play();
      } catch {
        if (speechAudioRef.current === audio) speechAudioRef.current = null;
        setSpeechPhase('idle');
        toast.error(t.aiExplainerSpeakFailed);
      }
    },
    [t]
  );

  const handleSpeech = useCallback(async () => {
    if (!optimizeResult) return;
    if (speechPhase !== 'idle') {
      stopSpeech();
      return;
    }

    if (speechUrlRef.current) {
      await playSpeech(speechUrlRef.current);
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
    if (!text.trim()) return;

    const controller = new AbortController();
    speechAbortRef.current = controller;
    setSpeechPhase('loading');
    try {
      // Locale drives the voice server-side (Piper voice pack or OpenAI TTS instructions), so the
      // narration always matches the app's selected language instead of guessing from installed
      // browser voices, which silently falls back to an English voice when Vietnamese is missing.
      const { blob, engine } = await synthesizeSpeech({
        text,
        locale: settings.locale,
        gender: settings.aiConfig.speechVoiceGender,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;

      if (engine === 'openai' && isLocalProvider) toast.info(t.aiExplainerSpeakCloudNotice);

      const url = URL.createObjectURL(blob);
      speechUrlRef.current = url;
      await playSpeech(url);
    } catch (caught) {
      if ((caught as Error)?.name === 'AbortError') return;
      setSpeechPhase('idle');
      toast.error(caught instanceof Error ? caught.message : t.aiExplainerSpeakFailed);
    } finally {
      if (speechAbortRef.current === controller) speechAbortRef.current = null;
    }
  }, [optimizeResult, speechPhase, stopSpeech, playSpeech, isLocalProvider, settings.locale, settings.aiConfig.speechVoiceGender, t]);

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
    resetSpeechCache();
    const controller = new AbortController();
    optimizeAbortRef.current = controller;

    setState((prev) => ({ ...prev, isOptimizing: true }));
    onOptimizationResult?.(null);
    setOptimizeResult(null);
    setOptimizeError(null);
    setOptimizeStreamRaw('');
    setShowOptimizeRaw(false);
    setStructuralWarnings([]);
    setOptimizePhase('streaming');

    let brief = '';
    let originalAnalysis: AnalysisResult | null = null;
    try {
      const parsed = await analyzeSql(sql, dialect, settings.locale);
      originalAnalysis = parsed;
      brief = buildSqlContextBrief(parsed);
      setAnalysisResult(parsed);
    } catch {
      brief = '';
      setAnalysisResult(null);
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

    // Best-effort: ground the rewrite in the official manual for the active dialect. Requires a
    // local Ollama embedding model (independent of the chat provider); any failure — no Ollama, no
    // index built, no relevant match — just means this section is silently omitted.
    setKnowledgeSources([]);
    try {
      const knowledge = await buildOptimizeKnowledgeBrief({
        sql,
        dialect,
        lintIssues,
        locale: settings.locale,
        ollamaBaseUrl: settings.aiConfig.baseUrls?.ollama ?? '',
        signal: controller.signal,
      });
      if (knowledge) {
        brief = brief ? `${brief}\n\n${knowledge.brief}` : knowledge.brief;
        setKnowledgeSources(knowledge.sources);
      }
    } catch {
      // Same non-fatal contract as the parser brief above.
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

      // Local safety net: re-parse the rewrite and compare structural facts to the original,
      // regardless of what the model itself claims changed.
      let regressionWarnings: string[] = [];
      if (result.structured && originalAnalysis) {
        try {
          const optimizedAnalysis = await analyzeSql(formattedOptimized, dialect, settings.locale);
          regressionWarnings = buildStructuralRegressionWarnings(originalAnalysis, optimizedAnalysis, t);
        } catch {
          // Re-parse failure isn't itself evidence of a problem — skip the check rather than block.
        }
      }
      setStructuralWarnings(regressionWarnings);

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
  }, [state.currentSql, dialect, settings, t, onOptimizationResult, setAnalysisResult, resetSpeechCache]);

  // Calculate statistics. originalLines/originalChars reflect state.originalSql (the "before"
  // state) so the stats bar can show before → after counts once the SQL has been modified.
  const stats = {
    lines: state.currentSql.split('\n').length,
    chars: state.currentSql.length,
    words: state.currentSql.trim().split(/\s+/).length,
    originalLines: state.originalSql.split('\n').length,
    originalChars: state.originalSql.length,
    changeSummary: state.hasChanges
      ? `${t.smartEditorModifiedSummary} (${state.originalSql.length} → ${state.currentSql.length} ${t.smartEditorChars})`
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
            disabled={state.isFormatting || state.isOptimizing || !state.currentSql.trim()}
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
            className="flex items-center gap-2 rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            title={t.analyzeOptimizeTitle}
          >
            <Sparkles size={12} />
            {state.isOptimizing ? t.smartEditorOptimizing : t.analyzeOptimizeButton}
          </button>

          <button
            onClick={handleToggleDiffMode}
            disabled={!state.hasChanges}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              state.isDiffMode
                ? 'border-primary bg-primary/15 text-primary hover:bg-primary/20'
                : 'border-border bg-muted text-foreground hover:bg-secondary'
            }`}
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
              disabled={state.isOptimizing}
              className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning transition-colors hover:bg-warning/20 disabled:cursor-not-allowed disabled:opacity-50"
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
              {state.hasChanges ? (
                <>
                  <span>{stats.originalLines}</span>
                  <span className="mx-1">→</span>
                  <span className="text-primary">{stats.lines}</span>
                </>
              ) : (
                <span className="text-primary">{stats.lines}</span>
              )}{' '}
              {t.smartEditorLines}
            </span>
            <span className="font-mono">
              {state.hasChanges ? (
                <>
                  <span>{stats.originalChars}</span>
                  <span className="mx-1">→</span>
                  <span className="text-primary">{stats.chars}</span>
                </>
              ) : (
                <span className="text-primary">{stats.chars}</span>
              )}{' '}
              {t.smartEditorChars}
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
                  {optimizePhase === 'done' && optimizeResult && optimizeResult.structured && (
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
                      {speechPhase === 'loading' ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : speechPhase === 'playing' ? (
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

            {optimizePhase === 'done' && optimizeResult && !optimizeResult.structured && (
              <div className="mt-2 space-y-2">
                <p className="text-xs leading-relaxed text-yellow-300/90">
                  {t.smartEditorOptimizeUnstructuredNotice}
                </p>
                <button
                  onClick={() => setShowOptimizeRaw((prev) => !prev)}
                  className="flex items-center gap-1.5 text-[11px] text-gray-500 transition-colors hover:text-gray-300"
                >
                  <ChevronDown
                    size={11}
                    className={`transition-transform ${showOptimizeRaw ? 'rotate-180' : ''}`}
                  />
                  {showOptimizeRaw ? t.aiExplainerHideRaw : t.aiExplainerShowRaw}
                </button>
                {showOptimizeRaw && (
                  <pre className="max-h-64 overflow-auto rounded-lg border border-gray-800 bg-gray-950 p-3 font-mono text-[11px] leading-relaxed text-gray-400">
                    {optimizeResult.raw}
                  </pre>
                )}
              </div>
            )}

            {optimizePhase === 'done' && optimizeResult && optimizeResult.structured && (
              <div className="mt-2 space-y-2">
                {structuralWarnings.length > 0 && (
                  <div className="rounded-lg border border-red-800/60 bg-red-950/30 p-3">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-red-300">
                      <AlertTriangle size={13} />
                      {t.smartEditorOptimizeRegressionTitle}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {structuralWarnings.map((warning, index) => (
                        <li
                          key={`smart-optimize-regression-${index}`}
                          className="flex items-start gap-2 text-sm leading-relaxed text-red-200"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-sm leading-relaxed text-gray-200">
                  {optimizeResult.analysis || t.aiExplainerNoContent}
                </p>
                {optimizeResult.semanticImpact && (
                  <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {t.smartEditorOptimizeSemanticImpactLabel}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-200">
                      {optimizeResult.semanticImpact}
                    </p>
                  </div>
                )}
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
                {knowledgeSources.length > 0 && (
                  <p className="text-[11px] text-gray-500">
                    {t.smartEditorOptimizeGroundedIn.replace(
                      '{sources}',
                      Array.from(new Set(knowledgeSources.map((source) => source.sourceFile))).join(', ')
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4">
        <LintingAlerts sql={state.currentSql} collapsible />
      </div>

      {/* Editor Container */}
      <div className="relative flex-1 min-h-0 w-full">
        {state.isDiffMode ? (
          <DiffEditor
            original={state.originalSql}
            modified={state.currentSql}
            language="sql"
            theme={monacoTheme}
            options={{ ...diffEditorOptions, readOnly: state.isOptimizing }}
            className="min-h-0 w-full"
            height="100vh"
          />
        ) : (
          <Editor
            value={state.currentSql}
            language="sql"
            theme={monacoTheme}
            options={{ ...editorOptions, readOnly: state.isOptimizing }}
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

        {/* Blocks editing while the AI rewrites this query in place, so the user cannot type
         * into content that is about to be replaced by the streamed result. */}
        {state.isOptimizing && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-[2px]">
            <div className="flex items-center gap-3 rounded-lg border border-indigo-800/40 bg-indigo-950/80 px-4 py-3 shadow-lg">
              <RefreshCw size={16} className="animate-spin text-indigo-300" />
              <span className="text-sm font-medium text-indigo-200">
                {t.smartEditorEditorLockedNotice}
              </span>
            </div>
          </div>
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
