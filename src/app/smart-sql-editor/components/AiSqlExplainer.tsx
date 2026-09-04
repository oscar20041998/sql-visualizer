'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Sparkles,
  Target,
  Filter,
  MessageSquareText,
  Database,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  Settings,
  Copy,
  Check,
  X,
  Volume2,
  Square,
} from 'lucide-react';
import { useAppStore, DEFAULT_SETTINGS } from '@/lib/store';
import { getT, type Translations } from '@/lib/i18n';
import {
  explainSqlStructuredStream,
  resolveBudget,
  type SqlExplanation,
  type SqlOptimizationResult,
} from '@/lib/ai/aiService';
import { buildSpeechScript, synthesizeSpeech } from '@/lib/ai/aiSpeech';
import { analyzeSql, type AnalysisResult } from '@/lib/sql/sqlAnalyzer';
import { buildSqlContextBrief } from '@/lib/ai/aiSqlContext';
import { estimateTokens } from '@/lib/ai/aiTokens';
import AiFeatureAnnouncement, { useAnnouncementVisibility } from './AiFeatureAnnouncement';
import AiFollowUpChat from './AiFollowUpChat';
import AiCteBatchPanel from './AiCteBatchPanel';

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Flattens an explanation into plain text for the clipboard. */
function toPlainText(explanation: SqlExplanation, t: Translations): string {
  if (!explanation.structured) return explanation.raw;

  const blocks = [`${t.aiExplainerObjective}\n${explanation.objective}`];
  if (explanation.filters.length) {
    blocks.push(`${t.aiExplainerFilters}\n${explanation.filters.map((f) => `- ${f}`).join('\n')}`);
  }
  if (explanation.output) blocks.push(`${t.aiExplainerOutput}\n${explanation.output}`);
  if (explanation.fieldMeanings.length) {
    blocks.push(`${t.aiExplainerFieldMeanings}\n${explanation.fieldMeanings.map((field) => `- ${field}`).join('\n')}`);
  }
  if (explanation.tables.length) {
    blocks.push(`${t.aiExplainerTables}\n${explanation.tables.join(', ')}`);
  }
  return blocks.join('\n\n');
}

/** One exchange in the chat thread: the query that was sent, and the assistant's answer. */
interface ExplainTurn {
  id: string;
  sql: string;
  status: 'streaming' | 'done' | 'error';
  streamingRaw: string;
  explanation: SqlExplanation | null;
  error: string | null;
  durationMs: number;
}

function buildSections(explanation: SqlExplanation, t: Translations) {
  if (!explanation.structured) return [];
  return [
    {
      key: 'objective',
      icon: Target,
      title: t.aiExplainerObjective,
      accent: 'text-indigo-300 bg-indigo-500/15',
      body: explanation.objective || t.aiExplainerNoContent,
    },
    {
      key: 'output',
      icon: MessageSquareText,
      title: t.aiExplainerOutput,
      accent: 'text-sky-300 bg-sky-500/15',
      body: explanation.output || t.aiExplainerNoContent,
    },
  ];
}

/** Undoes the small set of JSON escapes that can appear inside a still-streaming string value. */
function unescapeJsonFragment(value: string): string {
  return value
    .replace(/\\r\\n|\\n/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .trim();
}

/** Reads the value of a still-streaming JSON string field, even before its closing quote arrives. */
function extractPartialString(buffer: string, key: string): string {
  const match = buffer.match(new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)`));
  return match ? unescapeJsonFragment(match[1]) : '';
}

/** Reads every fully-arrived string item of a still-streaming JSON array field (the in-flight
 * last item is left out until its closing quote arrives, avoiding a half-written flash). */
function extractPartialArray(buffer: string, key: string): string[] {
  const closed = buffer.match(new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*?)\\]`));
  const open = closed ? null : buffer.match(new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*)`));
  const body = closed?.[1] ?? open?.[1];
  if (body === undefined) return [];

  const items: string[] = [];
  const itemPattern = /"((?:\\.|[^"\\])*)"/g;
  let match: RegExpExecArray | null;
  while ((match = itemPattern.exec(body))) {
    const item = unescapeJsonFragment(match[1]);
    if (item) items.push(item);
  }
  return items;
}

/** Best-effort structured read of an in-flight JSON answer, so the panel can render growing
 * sections instead of a raw JSON blob while the model is still streaming its response. */
function parsePartialExplanation(raw: string) {
  const withoutFence = raw.replace(/```(?:json)?/gi, '');
  return {
    objective: extractPartialString(withoutFence, 'objective'),
    output: extractPartialString(withoutFence, 'output'),
    filters: extractPartialArray(withoutFence, 'filters'),
    fieldMeanings: extractPartialArray(withoutFence, 'field_meanings'),
    tables: extractPartialArray(withoutFence, 'tables'),
  };
}

/** Renders the assistant's half of one turn: a live-growing bubble while streaming, the
 * structured breakdown once the stream finishes parsing, or an error. */
const AssistantTurnBody: React.FC<{ turn: ExplainTurn; t: Translations }> = ({ turn, t }) => {
  const [showRaw, setShowRaw] = useState(false);

  if (turn.status === 'error') {
    return (
      <div className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-red-200">
          <AlertTriangle size={13} />
          {t.aiExplainerErrorTitle}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-red-300/90">{turn.error}</p>
      </div>
    );
  }

  if (turn.status === 'streaming') {
    const partial = parsePartialExplanation(turn.streamingRaw);
    const hasContent =
      partial.objective || partial.output || partial.filters.length || partial.fieldMeanings.length || partial.tables.length;

    if (!hasContent) {
      return (
        <p className="flex items-center gap-2 text-sm leading-relaxed text-gray-400">
          <RefreshCw size={13} className="animate-spin text-indigo-400" />
          {t.aiExplainerDrafting}
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {partial.objective && (
          <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-500/15 text-indigo-300">
                <Target size={11} />
              </span>
              {t.aiExplainerObjective}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gray-200">
              {partial.objective}
              <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-indigo-400 align-middle" />
            </p>
          </div>
        )}

        {partial.filters.length > 0 && (
          <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-500/15 text-amber-300">
                <Filter size={11} />
              </span>
              {t.aiExplainerFilters}
            </p>
            <ul className="mt-2 space-y-1.5">
              {partial.filters.map((filter, index) => (
                <li key={`streaming-filter-${index}`} className="flex items-start gap-2 text-sm leading-relaxed text-gray-200">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400/70" />
                  {filter}
                </li>
              ))}
            </ul>
          </div>
        )}

        {partial.output && (
          <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-sky-500/15 text-sky-300">
                <MessageSquareText size={11} />
              </span>
              {t.aiExplainerOutput}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gray-200">{partial.output}</p>
          </div>
        )}

        {partial.fieldMeanings.length > 0 && (
          <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-cyan-500/15 text-cyan-300">
                <MessageSquareText size={11} />
              </span>
              {t.aiExplainerFieldMeanings}
            </p>
            <ul className="mt-2 space-y-1.5">
              {partial.fieldMeanings.map((field, index) => (
                <li key={`streaming-field-${index}`} className="flex items-start gap-2 text-sm leading-relaxed text-gray-200">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-400/70" />
                  {field}
                </li>
              ))}
            </ul>
          </div>
        )}

        {partial.tables.length > 0 && (
          <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/15 text-emerald-300">
                <Database size={11} />
              </span>
              {t.aiExplainerTables}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {partial.tables.map((table, index) => (
                <span
                  key={`streaming-table-${index}`}
                  className="rounded border border-gray-700 bg-gray-950 px-2 py-0.5 font-mono text-xs text-gray-300"
                >
                  {table}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const explanation = turn.explanation;
  if (!explanation) return null;

  if (!explanation.structured) {
    return (
      <div>
        <p className="mb-2 text-xs text-gray-500">{t.aiExplainerUnstructuredNotice}</p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">{explanation.raw}</p>
      </div>
    );
  }

  const sections = buildSections(explanation, t);

  return (
    <div className="space-y-3">
      {(explanation.budget.sqlTruncated || explanation.budget.contextBriefDropped) && (
        <div className="rounded-lg border border-yellow-800/50 bg-yellow-950/30 px-3 py-2 text-xs leading-relaxed text-yellow-200">
          {explanation.budget.sqlTruncated && (
            <p>{t.aiContextTruncatedNotice.replace('{lines}', String(explanation.budget.omittedSqlLines))}</p>
          )}
          {explanation.budget.contextBriefDropped && <p className="mt-1">{t.aiContextBriefDropped}</p>}
        </div>
      )}

      {sections.map(({ key, icon: Icon, title, accent, body }) => (
        <div key={key} className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <span className={`flex h-5 w-5 items-center justify-center rounded ${accent}`}>
              <Icon size={11} />
            </span>
            {title}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-200">{body}</p>
        </div>
      ))}

      <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-500/15 text-amber-300">
            <Filter size={11} />
          </span>
          {t.aiExplainerFilters}
        </p>
        {explanation.filters.length ? (
          <ul className="mt-2 space-y-1.5">
            {explanation.filters.map((filter, index) => (
              <li key={`filter-${index}`} className="flex items-start gap-2 text-sm leading-relaxed text-gray-200">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400/70" />
                {filter}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-gray-400">{t.aiExplainerNoFilters}</p>
        )}
      </div>

      {explanation.fieldMeanings.length > 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-cyan-500/15 text-cyan-300">
              <MessageSquareText size={11} />
            </span>
            {t.aiExplainerFieldMeanings}
          </p>
          <ul className="mt-2 space-y-1.5">
            {explanation.fieldMeanings.map((field, index) => (
              <li key={`field-meaning-${index}`} className="flex items-start gap-2 text-sm leading-relaxed text-gray-200">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-400/70" />
                {field}
              </li>
            ))}
          </ul>
        </div>
      )}

      {explanation.tables.length > 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/15 text-emerald-300">
              <Database size={11} />
            </span>
            {t.aiExplainerTables}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {explanation.tables.map((table, index) => (
              <span
                key={`table-${index}`}
                className="rounded border border-gray-700 bg-gray-950 px-2 py-0.5 font-mono text-xs text-gray-300"
              >
                {table}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setShowRaw((prev) => !prev)}
        className="flex items-center gap-1.5 text-[11px] text-gray-500 transition-colors hover:text-gray-300"
      >
        <ChevronDown size={11} className={`transition-transform ${showRaw ? 'rotate-180' : ''}`} />
        {showRaw ? t.aiExplainerHideRaw : t.aiExplainerShowRaw}
      </button>
      {showRaw && (
        <pre className="max-h-64 overflow-auto rounded-lg border border-gray-800 bg-gray-950 p-3 font-mono text-[11px] leading-relaxed text-gray-400">
          {explanation.raw}
        </pre>
      )}
    </div>
  );
};

interface AiSqlExplainerProps {
  /** SQL currently held by the editor. */
  sql: string;
  optimizationResult?: SqlOptimizationResult | null;
}

/**
 * Converts the SQL in the editor into a natural-language explanation using the provider
 * and parameters saved on the Settings page (Settings → AI Model Configuration). Each run
 * streams its answer in real time into a chat-style thread, like a follow-up conversation.
 */
export const AiSqlExplainer: React.FC<AiSqlExplainerProps> = ({ sql, optimizationResult }) => {
  const settings = useAppStore((store) => store.settings);
  const dialect = useAppStore((store) => store.dialect);
  const t = getT(settings.locale);
  const aiConfig = settings.aiConfig ?? DEFAULT_SETTINGS.aiConfig;

  const announcement = useAnnouncementVisibility();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startedAtRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechAbortRef = useRef<AbortController | null>(null);
  // Narration is billed per synthesis, so each turn's audio is kept for replay: turn id → blob URL.
  const speechCacheRef = useRef<Map<string, string>>(new Map());

  // Docked as a right-side drawer so the editor keeps the full width until this is needed.
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [turns, setTurns] = useState<ExplainTurn[]>([]);
  const [explainedSql, setExplainedSql] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [contextBrief, setContextBrief] = useState('');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [copied, setCopied] = useState(false);
  const [speechState, setSpeechState] = useState<'idle' | 'loading' | 'playing'>('idle');

  const isLocalProvider = aiConfig.provider === 'ollama';
  const modelLabel = isLocalProvider ? aiConfig.ollamaModel : aiConfig.modelId;
  const lastTurn = turns[turns.length - 1] ?? null;
  const isStale = lastTurn?.status === 'done' && sql.trim() !== lastTurn.sql;

  /**
   * Pre-flight context check. Ollama drops prompt overflow silently, so we warn before
   * spending 30s on an answer derived from a partially-read query.
   */
  const preflight = useMemo(() => {
    const budget = resolveBudget(aiConfig);
    const sqlTokens = estimateTokens(sql);
    // Instructions + JSON schema in the prompt cost roughly this much on top of the query.
    const overheadTokens = estimateTokens(aiConfig.systemPrompt ?? '') + 260;
    return {
      ...budget,
      sqlTokens,
      needsTokens: sqlTokens + overheadTokens,
      overflows: sqlTokens + overheadTokens > budget.promptTokens,
    };
  }, [sql, aiConfig]);

  // Abort any in-flight request when the panel unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Live elapsed counter, so a slow local model still feels responsive.
  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 100);
    return () => window.clearInterval(interval);
  }, [isRunning]);

  // Keep the newest turn in view as the thread grows, including while it streams in.
  useEffect(() => {
    if (turns.length) threadEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
  }, [turns]);

  const runExplain = useCallback(async () => {
    const query = sql.trim();
    if (!query) {
      toast.error(t.aiExplainerEmptySql);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const turnId = `turn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    startedAtRef.current = Date.now();
    setIsRunning(true);
    setElapsedMs(0);
    setTurns((prev) => [
      ...prev,
      { id: turnId, sql: query, status: 'streaming', streamingRaw: '', explanation: null, error: null, durationMs: 0 },
    ]);

    try {
      // Parse locally first: the extracted facts are injected into the prompt so the model
      // does not have to infer aliases and join shapes from raw text. A parse failure is not
      // fatal — we simply send the query without the brief.
      let parsed: AnalysisResult | null = null;
      let brief = '';
      try {
        parsed = await analyzeSql(query, dialect, settings.locale);
        brief = buildSqlContextBrief(parsed);
      } catch {
        parsed = null;
      }
      if (controller.signal.aborted) return;
      setAnalysis(parsed);
      setContextBrief(brief);

      const result = await explainSqlStructuredStream(
        {
          sql: query,
          config: aiConfig,
          locale: settings.locale,
          contextBrief: brief,
          signal: controller.signal,
        },
        (delta) => {
          setTurns((prev) =>
            prev.map((turn) => (turn.id === turnId ? { ...turn, streamingRaw: turn.streamingRaw + delta } : turn))
          );
        }
      );
      if (controller.signal.aborted) return;

      const duration = Date.now() - startedAtRef.current;
      setTurns((prev) =>
        prev.map((turn) =>
          turn.id === turnId ? { ...turn, status: 'done', explanation: result, durationMs: duration } : turn
        )
      );
      setExplainedSql(query);
      toast.success(t.aiExplainerSuccess);
    } catch (caught) {
      const message =
        (caught as Error)?.name === 'AbortError'
          ? t.aiExplainerCancelled
          : caught instanceof Error
            ? caught.message
            : String(caught);
      setTurns((prev) => prev.map((turn) => (turn.id === turnId ? { ...turn, status: 'error', error: message } : turn)));
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsRunning(false);
      }
    }
  }, [sql, aiConfig, dialect, settings.locale, t]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsRunning(false);
    toast.info(t.aiExplainerCancelled);
  }, [t]);

  /** Primary CTA of the release announcement: open the drawer and explain right away. */
  const handleTryNow = useCallback(() => {
    setIsOpen(true);
    void runExplain();
  }, [runExplain]);

  /** Newest answer that finished parsing — the one Copy and read-aloud act on. */
  const lastDoneTurn = useMemo(
    () => [...turns].reverse().find((turn) => turn.status === 'done' && turn.explanation) ?? null,
    [turns]
  );

  const handleCopy = useCallback(async () => {
    if (!lastDoneTurn?.explanation) return;
    try {
      await navigator.clipboard.writeText(toPlainText(lastDoneTurn.explanation, t));
      setCopied(true);
      toast.success(t.aiExplainerCopied);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t.aiExplainerCopyFailed);
    }
  }, [lastDoneTurn, t]);

  const stopSpeech = useCallback(() => {
    speechAbortRef.current?.abort();
    speechAbortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeechState('idle');
  }, []);

  const playSpeech = useCallback(
    async (url: string) => {
      // A fresh element per playback: reassigning src on a reused one leaves the old buffer
      // playing on some browsers, and this way the ended/error handlers cannot outlive their run.
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.addEventListener('ended', () => {
        if (audioRef.current === audio) audioRef.current = null;
        setSpeechState('idle');
      });
      audio.addEventListener('error', () => {
        if (audioRef.current === audio) audioRef.current = null;
        setSpeechState('idle');
        toast.error(t.aiExplainerSpeakFailed);
      });

      setSpeechState('playing');
      try {
        await audio.play();
      } catch {
        // Autoplay policies only block audio without a user gesture; this always runs from a
        // click, so a rejection here means the decode failed.
        if (audioRef.current === audio) audioRef.current = null;
        setSpeechState('idle');
        toast.error(t.aiExplainerSpeakFailed);
      }
    },
    [t]
  );

  /** Reads the latest answer aloud — heading first, then every section — or stops playback. */
  const handleSpeak = useCallback(async () => {
    if (speechState !== 'idle') {
      stopSpeech();
      return;
    }
    if (!lastDoneTurn?.explanation) return;

    const cached = speechCacheRef.current.get(lastDoneTurn.id);
    if (cached) {
      await playSpeech(cached);
      return;
    }

    const controller = new AbortController();
    speechAbortRef.current = controller;
    setSpeechState('loading');
    try {
      const { blob, engine } = await synthesizeSpeech({
        text: buildSpeechScript(lastDoneTurn.explanation, t),
        locale: settings.locale,
        gender: aiConfig.speechVoiceGender,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;

      // The badge promised the explanation stayed on this machine. If the server synthesized in the
      // cloud anyway, the text did leave — say so, but only then.
      if (engine === 'openai' && isLocalProvider) toast.info(t.aiExplainerSpeakCloudNotice);

      const url = URL.createObjectURL(blob);
      speechCacheRef.current.set(lastDoneTurn.id, url);
      await playSpeech(url);
    } catch (caught) {
      if ((caught as Error)?.name === 'AbortError') return;
      setSpeechState('idle');
      toast.error(caught instanceof Error ? caught.message : t.aiExplainerSpeakFailed);
    } finally {
      if (speechAbortRef.current === controller) speechAbortRef.current = null;
    }
  }, [speechState, stopSpeech, lastDoneTurn, isLocalProvider, playSpeech, settings.locale, aiConfig.speechVoiceGender, t]);

  // Closing the drawer must silence it too, otherwise the narration keeps playing out of sight.
  useEffect(() => {
    if (!isOpen) stopSpeech();
  }, [isOpen, stopSpeech]);

  // Release the cached audio on unmount; blob URLs live until the document goes away otherwise.
  useEffect(() => {
    const cache = speechCacheRef.current;
    return () => {
      speechAbortRef.current?.abort();
      audioRef.current?.pause();
      for (const url of cache.values()) URL.revokeObjectURL(url);
      cache.clear();
    };
  }, []);

  const canCopy = Boolean(lastDoneTurn);

  return (
    <>
      <AiFeatureAnnouncement
        open={announcement.isOpen}
        onDismiss={announcement.dismiss}
        onTryNow={handleTryNow}
      />

      {/* Collapsed: a slim tab docked to the right edge of the viewport. */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label={t.aiExplainerOpenPanel}
          className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-lg border border-r-0 border-gray-800 bg-gray-900 px-2 py-3 text-indigo-300 shadow-lg transition-colors hover:bg-gray-800"
        >
          <Sparkles size={16} />
          <span className="text-xs font-semibold tracking-wide [writing-mode:vertical-rl]">
            {t.aiExplainerTitle}
          </span>
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            ref={containerRef}
            onClick={(event) => event.stopPropagation()}
            className="smart-sql-editor-theme fixed inset-y-0 right-0 z-[60] flex h-full w-full flex-col overflow-hidden border-l border-gray-800 bg-gray-900 shadow-2xl animate-slide-in-right sm:max-w-2xl"
          >
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-800 px-4 py-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Sparkles size={16} className="text-indigo-400" />
              {t.aiExplainerTitle}
            </h2>
            <p className="mt-0.5 text-xs text-gray-400">{t.aiExplainerSubtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${isLocalProvider
                  ? 'border-emerald-800/60 bg-emerald-950/50 text-emerald-300'
                  : 'border-gray-700 bg-gray-800 text-gray-300'
                }`}
              title={isLocalProvider ? t.aiExplainerLocalBadgeHint : t.aiExplainerCloudBadgeHint}
            >
              <ShieldCheck size={11} />
              {isLocalProvider ? t.aiExplainerLocalBadge : t.aiExplainerCloudBadge}
            </span>
            <span className="rounded-full border border-gray-700 bg-gray-800 px-2.5 py-1 font-mono text-[11px] text-gray-300">
              {modelLabel || t.aiExplainerNoModel}
            </span>
            <Link
              href="/settings-preferences"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-2.5 py-1 text-[11px] font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
            >
              <Settings size={11} />
              {t.aiExplainerOpenSettings}
            </Link>
            {/* Reopens the release note after it has been dismissed. */}
            <button
              onClick={announcement.open}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-800/60 bg-indigo-950/40 px-2.5 py-1 text-[11px] font-medium text-indigo-300 transition-colors hover:bg-indigo-950/70 hover:text-indigo-200"
            >
              <Sparkles size={11} />
              {t.aiAnnounceReopen}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              aria-label={t.aiExplainerClosePanel}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          {isRunning ? (
            <>
              <span className="flex items-center gap-2 rounded-lg border border-indigo-700/50 bg-indigo-950/40 px-3 py-1.5 text-xs font-medium text-indigo-200">
                <RefreshCw size={12} className="animate-spin" />
                {t.aiExplainerRunning}
                <span className="font-mono text-indigo-400">{formatSeconds(elapsedMs)}</span>
              </span>
              <button
                onClick={handleCancel}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:bg-gray-700"
              >
                {t.aiExplainerCancel}
              </button>
            </>
          ) : (
            <button
              onClick={runExplain}
              disabled={!sql.trim()}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles size={12} />
              {turns.length ? t.aiExplainerRerunButton : t.aiExplainerRunButton}
            </button>
          )}

          {canCopy && !isRunning && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:bg-gray-700"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? t.aiExplainerCopiedShort : t.aiExplainerCopy}
            </button>
          )}

          {/* Read-aloud. Stays visible while a new run streams, so playback can still be stopped. */}
          {canCopy && (!isRunning || speechState !== 'idle') && (
            <button
              onClick={handleSpeak}
              title={t.aiExplainerSpeakHint}
              aria-label={speechState === 'playing' ? t.aiExplainerSpeakStop : t.aiExplainerSpeakHint}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                speechState === 'idle'
                  ? 'border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700'
                  : 'border-indigo-700/50 bg-indigo-950/40 text-indigo-200 hover:bg-indigo-950/70'
              }`}
            >
              {speechState === 'loading' ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : speechState === 'playing' ? (
                <Square size={12} />
              ) : (
                <Volume2 size={12} />
              )}
              {speechState === 'loading'
                ? t.aiExplainerSpeakLoading
                : speechState === 'playing'
                  ? t.aiExplainerSpeakStop
                  : t.aiExplainerSpeak}
            </button>
          )}

          {lastTurn?.status === 'done' && lastTurn.durationMs > 0 && !isRunning && (
            <span className="text-[11px] text-gray-500">
              {t.aiExplainerGeneratedIn} <span className="font-mono">{formatSeconds(lastTurn.durationMs)}</span>
            </span>
          )}

          {/* Context-window meter: makes the token cost of the query visible up front. */}
          {sql.trim() && (
            <span
              className={`ml-auto font-mono text-[11px] ${preflight.overflows ? 'text-yellow-300' : 'text-gray-500'
                }`}
              title={t.aiContextMeterHint}
            >
              ~{preflight.needsTokens} / {preflight.promptTokens} tok
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4">
          {/* Pre-flight overflow warning: Ollama truncates overflow silently. */}
          {preflight.overflows && !isRunning && (
            <div className="mb-3 rounded-lg border border-yellow-800/50 bg-yellow-950/30 px-3.5 py-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-yellow-200">
                <AlertTriangle size={14} />
                {t.aiContextOverflowTitle}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-yellow-200/90">
                {t.aiContextOverflowBody
                  .replace('{needed}', String(preflight.needsTokens))
                  .replace('{budget}', String(preflight.promptTokens))
                  .replace('{context}', String(preflight.contextTokens))}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-yellow-200/70">
                {t.aiContextOverflowFix}
              </p>
            </div>
          )}

          {isStale && !isRunning && (
            <div className="mb-3 rounded-lg border border-yellow-800/50 bg-yellow-950/30 px-3 py-2 text-xs text-yellow-200">
              {t.aiExplainerStaleWarning}
            </div>
          )}

          {contextBrief && !isRunning && (
            <p className="mb-3 text-[11px] text-gray-500">{t.aiContextBriefUsed}</p>
          )}

          {optimizationResult && !isRunning && (
            <div className="mb-3 rounded-lg border border-sky-800 bg-sky-950/20 p-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">
                {t.optimizationResultsTitle}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-gray-200">
                {optimizationResult.analysis || t.aiExplainerNoContent}
              </p>
              {optimizationResult.suggestions.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {t.performanceNotesLabel}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-200">
                    {optimizationResult.suggestions.map((suggestion, index) => (
                      <li key={`opt-suggestion-${index}`} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {turns.length === 0 && !isRunning && (
            <div className="rounded-lg border border-dashed border-gray-700 bg-gray-800/30 px-4 py-6 text-center">
              <Sparkles size={18} className="mx-auto text-indigo-400/70" />
              <p className="mt-2 text-sm text-gray-300">{t.aiExplainerEmptyStateTitle}</p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-gray-500">
                {t.aiExplainerEmptyStateHint}
              </p>
            </div>
          )}

          {/* Chat thread: one user bubble (the query sent) + one assistant bubble per run. */}
          {turns.length > 0 && (
            <div className="space-y-3">
              {turns.map((turn) => (
                <div key={turn.id} className="space-y-2">
                  <div className="ml-6 flex items-start gap-2 rounded-lg border border-indigo-800/40 bg-indigo-950/30 px-3 py-2">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-semibold text-indigo-300">
                      {t.aiChatRoleYou}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-200">{t.aiExplainerRunButton}</p>
                      <p className="mt-1 truncate font-mono text-[11px] text-gray-500">{turn.sql}</p>
                    </div>
                  </div>

                  <div className="mr-6 rounded-lg border border-gray-800 bg-gray-800/40 p-3.5">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 text-[10px] text-gray-300">
                        {t.aiChatRoleAssistant}
                      </span>
                      {turn.status === 'streaming' && (
                        <span className="flex items-center gap-1 normal-case text-indigo-300">
                          <RefreshCw size={10} className="animate-spin" />
                          {t.aiExplainerRunning}
                        </span>
                      )}
                      {turn.status === 'done' && turn.durationMs > 0 && (
                        <span className="normal-case text-gray-500">
                          {t.aiExplainerGeneratedIn}{' '}
                          <span className="font-mono">{formatSeconds(turn.durationMs)}</span>
                        </span>
                      )}
                    </div>
                    <AssistantTurnBody turn={turn} t={t} />
                  </div>
                </div>
              ))}
              <div ref={threadEndRef} />
            </div>
          )}

          {/* Batch: explain each CTE of the pipeline on its own. */}
          {!isRunning && analysis && analysis.ctes.length > 0 && (
            <div className="mt-3">
              <AiCteBatchPanel ctes={analysis.ctes} config={aiConfig} locale={settings.locale} t={t} />
            </div>
          )}

          {/* Multi-turn follow-up about the query that was just explained. */}
          {!isRunning && lastTurn?.status === 'done' && (
            <div className="mt-3 mr-6">
              <AiFollowUpChat
                sql={explainedSql}
                config={aiConfig}
                locale={settings.locale}
                contextBrief={contextBrief}
                t={t}
              />
            </div>
          )}
        </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AiSqlExplainer;
