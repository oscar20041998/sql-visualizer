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
import SidePanelTab from './SidePanelTab';
import LockedFeatureNotice from '@/components/ui/LockedFeatureNotice';
import { useCapabilityLock } from '@/lib/useCapabilityLock';

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Flattens an explanation into plain text for the clipboard. */
function toPlainText(explanation: SqlExplanation, t: Translations): string {
  if (!explanation.structured) return explanation.raw;

  const { sections } = explanation;
  const blocks = [`${t.aiExplainerObjective}\n${sections.query_objective}`];
  blocks.push(`${t.aiExplainerOutput}\n${sections.result_bullets.map((bullet) => `- ${bullet}`).join('\n')}`);
  blocks.push(`${t.aiExplainerGrain}\n${sections.report_grain}`);
  if (sections.filter_categories.length) {
    blocks.push(
      `${t.aiExplainerFilters}\n${sections.filter_categories
        .map((category) => `${category.category}\n${category.items.map((item) => `- ${item}`).join('\n')}`)
        .join('\n')}`
    );
  } else {
    blocks.push(`${t.aiExplainerFilters}\n${t.aiExplainerNoFilters}`);
  }
  if (sections.data_sources.length) {
    blocks.push(
      `${t.aiExplainerTables}\n${sections.data_sources.map((source) => `${source.name} — ${source.purpose}`).join(', ')}`
    );
  }
  return blocks.join('\n\n');
}

/**
 * Renders the identifiers inside a bullet — single-quoted/backticked names and
 * bare snake_case column/table names — in the same monospace accent as the Data
 * Sources section, so a column name reads distinctly from the prose around it.
 */
function renderHighlighted(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`|'[^']+'|\b[a-zA-Z_][a-zA-Z0-9]*_[a-zA-Z0-9]*\b)/g);
  return parts.map((part, index) => {
    const isIdentifier =
      part.startsWith('`') || part.startsWith("'") || (part.length > 0 && part.includes('_'));
    return isIdentifier ? (
      <code key={index} className="rounded bg-emerald-500/10 px-1 font-mono text-[0.9em] text-emerald-300">
        {part}
      </code>
    ) : (
      <span key={index}>{part}</span>
    );
  });
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
    query_objective: extractPartialString(withoutFence, 'query_objective'),
    result_bullets: extractPartialArray(withoutFence, 'result_bullets'),
    report_grain: extractPartialString(withoutFence, 'report_grain'),
  };
}

/** Renders the assistant's half of one turn: a live-growing bubble while streaming, the
 * structured breakdown once the stream finishes parsing, or an error. */
const AssistantTurnBody: React.FC<{ turn: ExplainTurn; t: Translations }> = ({ turn, t }) => {
  const [showRaw, setShowRaw] = useState(false);

  if (turn.status === 'error') {
    return (
      <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-danger">
          <AlertTriangle size={13} />
          {t.aiExplainerErrorTitle}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-foreground">{turn.error}</p>
      </div>
    );
  }

  if (turn.status === 'streaming') {
    const partial = parsePartialExplanation(turn.streamingRaw);
    const hasContent = partial.query_objective || partial.result_bullets.length || partial.report_grain;

    if (!hasContent) {
      return (
        <p className="flex items-center gap-2 text-sm leading-relaxed text-muted-foreground">
          <RefreshCw size={13} className="animate-spin text-primary" />
          {t.aiExplainerDrafting}
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {partial.query_objective && (
          <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/15 text-primary">
                <Target size={11} />
              </span>
              {t.aiExplainerObjective}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              {partial.query_objective}
              <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-primary align-middle" />
            </p>
          </div>
        )}

        {partial.result_bullets.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-sky-500/15 text-sky-400">
                <MessageSquareText size={11} />
              </span>
              {t.aiExplainerOutput}
            </p>
            <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
              {partial.result_bullets.map((bullet, index) => (
                <li key={`streaming-result-${index}`} className="flex items-start gap-2 text-sm leading-relaxed text-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-400" />
                  {renderHighlighted(bullet)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {partial.report_grain && (
          <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-500/15 text-violet-400">
                <ShieldCheck size={11} />
              </span>
              {t.aiExplainerGrain}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground">{partial.report_grain}</p>
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
        <p className="mb-2 text-xs text-muted-foreground">{t.aiExplainerUnstructuredNotice}</p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{explanation.raw}</p>
      </div>
    );
  }

  const { sections } = explanation;

  return (
    <div className="space-y-3">
      {(explanation.budget.sqlTruncated || explanation.budget.contextBriefDropped) && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs leading-relaxed text-foreground">
          {explanation.budget.sqlTruncated && (
            <p>{t.aiContextTruncatedNotice.replace('{lines}', String(explanation.budget.omittedSqlLines))}</p>
          )}
          {explanation.budget.contextBriefDropped && <p className="mt-1">{t.aiContextBriefDropped}</p>}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/15 text-primary">
            <Target size={11} />
          </span>
          {t.aiExplainerObjective}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">{sections.query_objective || t.aiExplainerNoContent}</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-sky-500/15 text-sky-400">
            <MessageSquareText size={11} />
          </span>
          {t.aiExplainerOutput}
        </p>
        <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {sections.result_bullets.map((bullet, index) => (
            <li key={`result-${index}`} className="flex items-start gap-2 text-sm leading-relaxed text-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-400" />
              {renderHighlighted(bullet)}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-500/15 text-violet-400">
            <ShieldCheck size={11} />
          </span>
          {t.aiExplainerGrain}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">{sections.report_grain || t.aiExplainerNoContent}</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-500/15 text-amber-400">
            <Filter size={11} />
          </span>
          {t.aiExplainerFilters}
        </p>
        {sections.filter_categories.length ? (
          <div className="mt-2 space-y-3">
            {sections.filter_categories.map((category, categoryIndex) => (
              <div key={`filter-category-${categoryIndex}`}>
                {category.category && <p className="text-xs font-semibold text-muted-foreground">{category.category}</p>}
                <ul className="mt-1 space-y-1.5">
                  {category.items.map((item, itemIndex) => (
                    <li key={`filter-${categoryIndex}-${itemIndex}`} className="flex items-start gap-2 text-sm leading-relaxed text-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{t.aiExplainerNoFilters}</p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/15 text-emerald-400">
            <Database size={11} />
          </span>
          {t.aiExplainerTables}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {sections.data_sources.map((source, index) => (
            <span
              key={`source-${index}`}
              className="inline-flex flex-col rounded border border-border bg-muted/60 px-2.5 py-1 text-xs"
            >
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{source.name}</span>
              <span className={source.purpose === 'unknown' ? 'italic text-muted-foreground/70' : 'text-muted-foreground'}>
                {source.purpose}
              </span>
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={() => setShowRaw((prev) => !prev)}
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDown size={11} className={`transition-transform ${showRaw ? 'rotate-180' : ''}`} />
        {showRaw ? t.aiExplainerHideRaw : t.aiExplainerShowRaw}
      </button>
      {showRaw && (
        <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-foreground">
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
  const locked = useCapabilityLock('sql-explainer');
  const t = getT(settings.locale);
  const aiConfig = settings.aiConfig ?? DEFAULT_SETTINGS.aiConfig;

  const announcement = useAnnouncementVisibility();
  // The announcement promotes the explainer feature; a guest cannot use it, so it must not
  // offer "Try now". Its visibility hook was built around an auto-open-on-visit behavior, so
  // we gate the render rather than the hook state to avoid altering its lifecycle.
  const announcementOpen = announcement.isOpen && !locked;

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
        brief = buildSqlContextBrief(parsed, { detailed: true });
      } catch {
        parsed = null;
      }
      if (controller.signal.aborted) return;
      setAnalysis(parsed);
      setContextBrief(brief);

      const knownSources = parsed
        ? [...parsed.tables.map((table) => table.name), ...parsed.ctes.map((cte) => cte.name)]
        : undefined;

      const result = await explainSqlStructuredStream(
        {
          sql: query,
          config: aiConfig,
          locale: settings.locale,
          contextBrief: brief,
          knownSources,
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

  // A guest reads the locked explanation INSIDE the explainer panel (specs/013 US2 / FR-015).
  // We keep the launcher tab, the panel shell and the header rendered so the lock is
  // discoverable where the AI feature lives — only the action area shows the lock instead
  // of a form that would fail on submit. Placed after every hook so the Rules of Hooks hold.
  const explainerLocked = locked;

  return (
    <>
      <AiFeatureAnnouncement
        open={announcementOpen}
        onDismiss={announcement.dismiss}
        onTryNow={handleTryNow}
      />

      {/* Collapsed: the middle launcher in the right-edge rail (see SidePanelTab). */}
      {!isOpen && (
        <SidePanelTab
          rank={1}
          tone="neutral"
          icon={<Sparkles size={16} className="shrink-0" aria-hidden="true" />}
          label={t.aiExplainerTitle}
          ariaLabel={t.aiExplainerOpenPanel}
          ariaExpanded={false}
          onClick={() => setIsOpen(true)}
        />
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            ref={containerRef}
            onClick={(event) => event.stopPropagation()}
            className="smart-sql-editor-theme fixed inset-y-0 right-0 z-[60] flex h-full w-full flex-col overflow-hidden border-l border-border bg-card shadow-2xl animate-slide-in-right sm:max-w-2xl"
          >
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-card px-4 py-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Sparkles size={16} className="text-primary" />
              {t.aiExplainerTitle}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{t.aiExplainerSubtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${isLocalProvider
                  ? 'border-success/50 bg-success/10 text-success'
                  : 'border-border bg-muted text-muted-foreground'
                }`}
              title={isLocalProvider ? t.aiExplainerLocalBadgeHint : t.aiExplainerCloudBadgeHint}
            >
              <ShieldCheck size={11} />
              {isLocalProvider ? t.aiExplainerLocalBadge : t.aiExplainerCloudBadge}
            </span>
            <span className="rounded-full border border-border bg-muted px-2.5 py-1 font-mono text-[11px] text-foreground">
              {modelLabel || t.aiExplainerNoModel}
            </span>
            <Link
              href="/settings-preferences"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
            >
              <Settings size={11} />
              {t.aiExplainerOpenSettings}
            </Link>
            {/* Reopens the release note after it has been dismissed. */}
            <button
              onClick={announcement.open}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <Sparkles size={11} />
              {t.aiAnnounceReopen}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              aria-label={t.aiExplainerClosePanel}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Actions — a guest sees the locked explanation INSIDE the panel (FR-015) instead
         * of a run button that would fail (FR-013). */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          {explainerLocked ? (
            <LockedFeatureNotice t={t} featureName={t.aiExplainerTitle} />
          ) : isRunning ? (
            <>
              <span className="flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                <RefreshCw size={12} className="animate-spin" />
                {t.aiExplainerRunning}
                <span className="font-mono text-primary">{formatSeconds(elapsedMs)}</span>
              </span>
              <button
                onClick={handleCancel}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
              >
                {t.aiExplainerCancel}
              </button>
            </>
          ) : (
            <button
              onClick={runExplain}
              disabled={!sql.trim()}
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles size={12} />
              {turns.length ? t.aiExplainerRerunButton : t.aiExplainerRunButton}
            </button>
          )}

          {canCopy && !isRunning && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
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
                  ? 'border-border bg-card text-foreground hover:bg-secondary'
                  : 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20'
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
            <span className="text-[11px] text-muted-foreground">
              {t.aiExplainerGeneratedIn} <span className="font-mono">{formatSeconds(lastTurn.durationMs)}</span>
            </span>
          )}

          {/* Context-window meter: makes the token cost of the query visible up front. */}
          {sql.trim() && (
            <span
              className={`ml-auto font-mono text-[11px] ${preflight.overflows ? 'text-warning' : 'text-muted-foreground'
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
            <div className="mb-3 rounded-lg border border-warning/40 bg-warning/10 px-3.5 py-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-warning">
                <AlertTriangle size={14} />
                {t.aiContextOverflowTitle}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-foreground">
                {t.aiContextOverflowBody
                  .replace('{needed}', String(preflight.needsTokens))
                  .replace('{budget}', String(preflight.promptTokens))
                  .replace('{context}', String(preflight.contextTokens))}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {t.aiContextOverflowFix}
              </p>
            </div>
          )}

          {isStale && !isRunning && (
            <div className="mb-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
              {t.aiExplainerStaleWarning}
            </div>
          )}

          {contextBrief && !isRunning && (
            <p className="mb-3 text-[11px] text-muted-foreground">{t.aiContextBriefUsed}</p>
          )}

          {optimizationResult && !isRunning && (
            <div className="mb-3 rounded-lg border border-border bg-muted/40 p-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {t.optimizationResultsTitle}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                {optimizationResult.analysis || t.aiExplainerNoContent}
              </p>
              {optimizationResult.suggestions.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t.performanceNotesLabel}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-foreground">
                    {optimizationResult.suggestions.map((suggestion, index) => (
                      <li key={`opt-suggestion-${index}`} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {turns.length === 0 && !isRunning && (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
              <Sparkles size={18} className="mx-auto text-primary/70" />
              <p className="mt-2 text-sm text-foreground">{t.aiExplainerEmptyStateTitle}</p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
                {t.aiExplainerEmptyStateHint}
              </p>
            </div>
          )}

          {/* Chat thread: one user bubble (the query sent) + one assistant bubble per run. */}
          {turns.length > 0 && (
            <div className="space-y-3">
              {turns.map((turn) => (
                <div key={turn.id} className="space-y-2">
                  <div className="ml-6 flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">
                      {t.aiChatRoleYou}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">{t.aiExplainerRunButton}</p>
                      <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{turn.sql}</p>
                    </div>
                  </div>

                  <div className="mr-6 rounded-lg border border-border bg-muted/40 p-3.5">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] text-foreground">
                        {t.aiChatRoleAssistant}
                      </span>
                      {turn.status === 'streaming' && (
                        <span className="flex items-center gap-1 normal-case text-primary">
                          <RefreshCw size={10} className="animate-spin" />
                          {t.aiExplainerRunning}
                        </span>
                      )}
                      {turn.status === 'done' && turn.durationMs > 0 && (
                        <span className="normal-case text-muted-foreground">
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
