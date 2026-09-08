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
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { analyzeSql, type AnalysisResult } from '@/lib/sql/sqlAnalyzer';
import { checkSelectAll, checkOtherLintingRules } from '@/lib/sql/complexityScorer';
import { buildStructuralRegressionWarnings } from '@/lib/sql/optimizeRegression';
import { buildSqlContextBrief } from '@/lib/ai/aiSqlContext';
import {
  optimizeSqlWithAIStream,
  analyzeSqlSemantics,
  formatSemanticBriefForOptimizePrompt,
  repairInvalidProposals,
  isProposalApplicable,
  countExactOccurrences,
  type SqlOptimizationProposal,
  type SqlOptimizationResult,
  type SqlSemanticBrief,
} from '@/lib/ai/aiService';
import { synthesizeSpeech } from '@/lib/ai/aiSpeech';
import { buildOptimizeKnowledgeBrief, type DatabaseKnowledgeSource } from '@/lib/ai/databaseAssistant';
import LintingAlerts from '@/components/ui/LintingAlerts';
import OptimizeQueryModal from './OptimizeQueryModal';

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
  const [appliedProposalIds, setAppliedProposalIds] = useState<string[]>([]);
  // Proposal cards default to collapsed (space-saving); toggled open individually.
  const [expandedProposalIds, setExpandedProposalIds] = useState<Set<string>>(new Set());
  const [knowledgeSources, setKnowledgeSources] = useState<DatabaseKnowledgeSource[]>([]);
  // Local structural check, independent of what the model claims in analysis/semantic_impact.
  const [structuralWarnings, setStructuralWarnings] = useState<string[]>([]);
  // Step 1 of Optimize: the model states purpose/relationships/filters before any rewrite is
  // proposed, so the user can confirm what must not change before the actual optimize call runs.
  const [semanticPhase, setSemanticPhase] = useState<'idle' | 'running' | 'ready' | 'confirmed' | 'error'>(
    'idle'
  );
  const [semanticBrief, setSemanticBrief] = useState<SqlSemanticBrief | null>(null);
  const [semanticError, setSemanticError] = useState<string | null>(null);
  // Collapsed by default; the user clicks to open it before deciding to confirm.
  const [isSemanticDetailExpanded, setIsSemanticDetailExpanded] = useState(false);
  /** Carries the sql/context computed in step 1 over to the confirmed optimize call in step 2. */
  const pendingOptimizeRef = useRef<{
    sql: string;
    brief: string;
    originalAnalysis: AnalysisResult | null;
    userInstruction?: string;
  } | null>(null);
  // All analysis/optimize content now lives in a modal (see OptimizeQueryModal) so it never
  // pushes the editor down; this only tracks whether that modal is visible.
  const [isModalOpen, setIsModalOpen] = useState(false);
  // The user's own words for what to optimize, typed in the modal; kept across a single session
  // so re-submitting after tweaking it does not lose what was already typed.
  const [instructionDraft, setInstructionDraft] = useState('');
  const [speechPhase, setSpeechPhase] = useState<'idle' | 'loading' | 'playing'>('idle');
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

  /** Step 1: ask the model to state purpose/relationships/filters — no rewrite proposed yet. */
  const handleAnalyzeSemantics = useCallback(async (userInstruction?: string) => {
    const sql = state.currentSql.trim();
    if (!sql) {
      toast.error(t.emptyQueryError);
      return;
    }
    const trimmedInstruction = userInstruction?.trim() || undefined;

    optimizeAbortRef.current?.abort();
    resetSpeechCache();
    const controller = new AbortController();
    optimizeAbortRef.current = controller;

    onOptimizationResult?.(null);
    setOptimizeResult(null);
    setOptimizeError(null);
    setAppliedProposalIds([]);
    setExpandedProposalIds(new Set());
    setOptimizeStreamRaw('');
    setStructuralWarnings([]);
    setOptimizePhase('idle');
    setSemanticError(null);
    setSemanticBrief(null);
    setSemanticPhase('running');
    setIsSemanticDetailExpanded(false);
    pendingOptimizeRef.current = null;

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

    try {
      const result = await analyzeSqlSemantics({
        sql,
        config: settings.aiConfig,
        locale: settings.locale,
        contextBrief: brief,
        userInstruction: trimmedInstruction,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;

      pendingOptimizeRef.current = { sql, brief, originalAnalysis, userInstruction: trimmedInstruction };
      setSemanticBrief(result);
      setSemanticPhase('ready');
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        setSemanticPhase('idle');
        return;
      }
      const message = (error as Error)?.message || t.smartEditorOptimizationError;
      setSemanticError(message);
      setSemanticPhase('error');
      toast.error(message);
    } finally {
      if (optimizeAbortRef.current === controller) optimizeAbortRef.current = null;
    }
  }, [state.currentSql, dialect, settings, t, onOptimizationResult, setAnalysisResult, resetSpeechCache]);

  const handleCancelSemanticReview = useCallback(() => {
    optimizeAbortRef.current?.abort();
    optimizeAbortRef.current = null;
    pendingOptimizeRef.current = null;
    setSemanticPhase('idle');
    setSemanticBrief(null);
    setSemanticError(null);
  }, []);

  /** Step 2: only runs after the user explicitly confirms the step-1 semantic brief. */
  const handleConfirmOptimize = useCallback(async () => {
    const pending = pendingOptimizeRef.current;
    if (!pending || !semanticBrief) return;
    const { sql, originalAnalysis } = pending;
    let brief = pending.brief;

    optimizeAbortRef.current?.abort();
    const controller = new AbortController();
    optimizeAbortRef.current = controller;

    setSemanticPhase('confirmed');
    setState((prev) => ({ ...prev, isOptimizing: true }));
    setOptimizeStreamRaw('');
    setStructuralWarnings([]);
    setOptimizePhase('streaming');

    // The confirmed brief becomes an explicit constraint the model already committed to, not
    // just an instruction it could ignore like the rest of the prompt.
    const semanticConstraints = formatSemanticBriefForOptimizePrompt(semanticBrief, settings.locale);
    if (semanticConstraints) {
      brief = brief ? `${brief}\n\n${semanticConstraints}` : semanticConstraints;
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
          userInstruction: pending.userInstruction,
          signal: controller.signal,
        },
        (delta) => setOptimizeStreamRaw((prev) => prev + delta)
      );
      if (controller.signal.aborted) return;

      // Assess the full candidate as a warning only. The editor deliberately remains unchanged:
      // each narrow proposal must be approved individually below.
      let regressionWarnings: string[] = [];
      if (result.structured && originalAnalysis) {
        try {
          const optimizedAnalysis = await analyzeSql(result.optimizedSql || sql, dialect, settings.locale);
          regressionWarnings = buildStructuralRegressionWarnings(originalAnalysis, optimizedAnalysis, t);
        } catch {
          // Re-parse failure isn't itself evidence of a problem — skip the check rather than block.
        }
      }
      setStructuralWarnings(regressionWarnings);

      // Never show a proposal the user cannot apply: re-derive any whose `find` doesn't match
      // `sql` (the exact text the model saw) exactly once, dropping whatever still fails after
      // one repair attempt so "Apply" always succeeds for whatever remains on screen.
      let finalResult = result;
      if (result.proposals.some((proposal) => !isProposalApplicable(sql, proposal))) {
        try {
          const { proposals: repairedProposals, droppedCount } = await repairInvalidProposals(
            {
              sql,
              proposals: result.proposals,
              config: settings.aiConfig,
              locale: settings.locale,
              signal: controller.signal,
            },
            (delta) => setOptimizeStreamRaw((prev) => prev + delta)
          );
          if (controller.signal.aborted) return;
          finalResult = { ...result, proposals: repairedProposals };
          if (droppedCount > 0) {
            toast.info(
              t.smartEditorOptimizeProposalsDropped.replace('{count}', String(droppedCount))
            );
          }
        } catch {
          // Repair call failed entirely — fall back to only the proposals already known to
          // apply cleanly rather than blocking the whole optimize result.
          finalResult = {
            ...result,
            proposals: result.proposals.filter((proposal) => isProposalApplicable(sql, proposal)),
          };
        }
      }

      setState((prev) => ({ ...prev, isOptimizing: false }));
      setOptimizeResult(finalResult);
      // Collapsed by default; the user clicks each proposal to open it.
      setExpandedProposalIds(new Set());
      setOptimizePhase('done');
      onOptimizationResult?.(finalResult);
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
  }, [semanticBrief, dialect, settings, t, onOptimizationResult]);

  const toggleProposalExpanded = useCallback((proposalId: string) => {
    setExpandedProposalIds((previous) => {
      const next = new Set(previous);
      if (next.has(proposalId)) next.delete(proposalId);
      else next.add(proposalId);
      return next;
    });
  }, []);

  const handleApplyProposal = useCallback(
    async (proposal: SqlOptimizationProposal) => {
      const currentSql = state.currentSql;
      if (countExactOccurrences(currentSql, proposal.find) !== 1) {
        toast.error(t.smartEditorOptimizeProposalNoLongerMatches);
        return;
      }

      const candidateSql = currentSql.replace(proposal.find, proposal.replace);
      try {
        const [originalAnalysis, candidateAnalysis] = await Promise.all([
          analyzeSql(currentSql, dialect, settings.locale),
          analyzeSql(candidateSql, dialect, settings.locale),
        ]);
        const regressions = buildStructuralRegressionWarnings(originalAnalysis, candidateAnalysis, t);
        if (regressions.length > 0) {
          setStructuralWarnings(regressions);
          toast.error(t.smartEditorOptimizeProposalBlocked);
          return;
        }
      } catch {
        toast.error(t.smartEditorOptimizeProposalBlocked);
        return;
      }

      setState((prev) => ({ ...prev, currentSql: candidateSql }));
      setAppliedProposalIds((previous) => [...previous, proposal.id]);
      toast.success(t.smartEditorOptimizeProposalApplied);
    },
    [state.currentSql, dialect, settings.locale, t]
  );

  /** Backdrop/X/Escape: aborts an in-flight call but otherwise keeps the last result so
   * reopening the modal shows exactly what was there before (FR-013 + persistence). */
  const handleCloseOptimizeModal = useCallback(() => {
    setIsModalOpen(false);
    if (semanticPhase === 'running' || optimizePhase === 'streaming') {
      optimizeAbortRef.current?.abort();
      optimizeAbortRef.current = null;
      setSemanticPhase('idle');
      setOptimizePhase('idle');
    }
  }, [semanticPhase, optimizePhase]);

  const handleSubmitInstruction = useCallback(
    (instruction: string) => {
      setInstructionDraft(instruction);
      void handleAnalyzeSemantics(instruction);
    },
    [handleAnalyzeSemantics]
  );

  /**
   * Session-level "Apply to editor": applies every not-yet-applied proposal in sequence against a
   * single running copy of the SQL (rather than relying on state re-renders between calls),
   * re-checking the structural regression guard at each step and skipping any proposal that would
   * fail it, then commits once and switches straight to the before/after diff view (FR-010/FR-011).
   */
  const handleSessionApply = useCallback(async () => {
    if (!optimizeResult) return;
    const proposalsToApply = optimizeResult.proposals.filter(
      (proposal) => !appliedProposalIds.includes(proposal.id)
    );
    let workingSql = state.currentSql;
    const newlyApplied: string[] = [];
    for (const proposal of proposalsToApply) {
      if (countExactOccurrences(workingSql, proposal.find) !== 1) continue;
      const candidateSql = workingSql.replace(proposal.find, proposal.replace);
      try {
        const [originalAnalysis, candidateAnalysis] = await Promise.all([
          analyzeSql(workingSql, dialect, settings.locale),
          analyzeSql(candidateSql, dialect, settings.locale),
        ]);
        const regressions = buildStructuralRegressionWarnings(originalAnalysis, candidateAnalysis, t);
        if (regressions.length > 0) {
          setStructuralWarnings(regressions);
          continue;
        }
      } catch {
        continue;
      }
      workingSql = candidateSql;
      newlyApplied.push(proposal.id);
    }

    if (newlyApplied.length === 0) {
      toast.error(t.smartEditorOptimizeProposalBlocked);
      return;
    }

    setState((prev) => ({ ...prev, currentSql: workingSql, isDiffMode: true }));
    setAppliedProposalIds((previous) => [...previous, ...newlyApplied]);
    setIsModalOpen(false);
    toast.success(t.smartEditorSessionAppliedToast);
  }, [optimizeResult, appliedProposalIds, state.currentSql, dialect, settings.locale, t]);

  /** Explicit "Discard": unlike closing the modal, this clears the pending result entirely so a
   * later reopen starts a fresh session rather than showing stale proposals (FR-012). */
  const handleSessionDiscard = useCallback(() => {
    setIsModalOpen(false);
    optimizeAbortRef.current?.abort();
    optimizeAbortRef.current = null;
    pendingOptimizeRef.current = null;
    setSemanticPhase('idle');
    setSemanticBrief(null);
    setSemanticError(null);
    setOptimizePhase('idle');
    setOptimizeResult(null);
    setOptimizeError(null);
    setOptimizeStreamRaw('');
    setStructuralWarnings([]);
    onOptimizationResult?.(null);
    toast.info(t.smartEditorSessionDiscardedToast);
  }, [onOptimizationResult, t]);

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
            onClick={() => {
              setIsModalOpen(true);
              void handleAnalyzeSemantics(instructionDraft);
            }}
            disabled={semanticPhase === 'running' || state.isOptimizing || !state.currentSql.trim()}
            className="flex items-center gap-2 rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            title={t.analyzeOptimizeTitle}
          >
            <Sparkles size={12} />
            {semanticPhase === 'running'
              ? t.smartEditorSemanticAnalyzing
              : state.isOptimizing
                ? t.smartEditorOptimizing
                : t.analyzeOptimizeButton}
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

      </div>

      <OptimizeQueryModal
        isOpen={isModalOpen}
        onClose={handleCloseOptimizeModal}
        semanticPhase={semanticPhase}
        semanticBrief={semanticBrief}
        semanticError={semanticError}
        isSemanticDetailExpanded={isSemanticDetailExpanded}
        onToggleSemanticDetail={() => setIsSemanticDetailExpanded((prev) => !prev)}
        onConfirmSemanticReview={() => void handleConfirmOptimize()}
        onCancelSemanticReview={handleCancelSemanticReview}
        instructionDraft={instructionDraft}
        onInstructionDraftChange={setInstructionDraft}
        onSubmitInstruction={handleSubmitInstruction}
        optimizePhase={optimizePhase}
        optimizeStreamRaw={optimizeStreamRaw}
        optimizeError={optimizeError}
        optimizeResult={optimizeResult}
        structuralWarnings={structuralWarnings}
        appliedProposalIds={appliedProposalIds}
        expandedProposalIds={expandedProposalIds}
        onToggleProposalExpanded={toggleProposalExpanded}
        onApplyProposal={(proposal: SqlOptimizationProposal) => void handleApplyProposal(proposal)}
        onDismissResults={() => {
          stopSpeech();
          setOptimizePhase('idle');
          setSemanticPhase('idle');
          setSemanticBrief(null);
        }}
        knowledgeSources={knowledgeSources}
        speechPhase={speechPhase}
        onSpeech={() => void handleSpeech()}
        onSessionApply={() => void handleSessionApply()}
        onSessionDiscard={handleSessionDiscard}
      />

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
