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
} from 'lucide-react';
import { useAppStore, DEFAULT_SETTINGS } from '@/lib/store';
import { getT, type Translations } from '@/lib/i18n';
import { explainSqlStructured, resolveBudget, type SqlExplanation } from '@/lib/aiService';
import { analyzeSql, type AnalysisResult } from '@/lib/sqlAnalyzer';
import { buildSqlContextBrief } from '@/lib/aiSqlContext';
import { estimateTokens } from '@/lib/aiTokens';
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
  if (explanation.tables.length) {
    blocks.push(`${t.aiExplainerTables}\n${explanation.tables.join(', ')}`);
  }
  return blocks.join('\n\n');
}

interface AiSqlExplainerProps {
  /** SQL currently held by the editor. */
  sql: string;
}

/**
 * Converts the SQL in the editor into a natural-language explanation using the provider
 * and parameters saved on the Settings page (Settings → AI Model Configuration).
 */
export const AiSqlExplainer: React.FC<AiSqlExplainerProps> = ({ sql }) => {
  const settings = useAppStore((store) => store.settings);
  const dialect = useAppStore((store) => store.dialect);
  const t = getT(settings.locale);
  const aiConfig = settings.aiConfig ?? DEFAULT_SETTINGS.aiConfig;

  const announcement = useAnnouncementVisibility();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startedAtRef = useRef<number>(0);

  const [isRunning, setIsRunning] = useState(false);
  const [explanation, setExplanation] = useState<SqlExplanation | null>(null);
  const [explainedSql, setExplainedSql] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [contextBrief, setContextBrief] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const isLocalProvider = aiConfig.provider === 'ollama';
  const modelLabel = isLocalProvider ? aiConfig.ollamaModel : aiConfig.modelId;
  const isStale = explanation !== null && sql.trim() !== explainedSql;

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

  const runExplain = useCallback(async () => {
    const query = sql.trim();
    if (!query) {
      toast.error(t.aiExplainerEmptySql);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    startedAtRef.current = Date.now();
    setIsRunning(true);
    setElapsedMs(0);
    setError(null);
    setShowRaw(false);

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

      const result = await explainSqlStructured({
        sql: query,
        config: aiConfig,
        locale: settings.locale,
        contextBrief: brief,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setExplanation(result);
      setExplainedSql(query);
      setDurationMs(Date.now() - startedAtRef.current);
      toast.success(t.aiExplainerSuccess);
    } catch (caught) {
      if ((caught as Error)?.name === 'AbortError') return;
      setError(caught instanceof Error ? caught.message : String(caught));
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

  /** Primary CTA of the release announcement: scroll the panel into view and explain right away. */
  const handleTryNow = useCallback(() => {
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    void runExplain();
  }, [runExplain]);

  const handleCopy = useCallback(async () => {
    if (!explanation) return;
    try {
      await navigator.clipboard.writeText(toPlainText(explanation, t));
      setCopied(true);
      toast.success(t.aiExplainerCopied);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t.aiExplainerCopyFailed);
    }
  }, [explanation, t]);

  const sections = useMemo(() => {
    if (!explanation?.structured) return [];
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
  }, [explanation, t]);

  return (
    <>
      <AiFeatureAnnouncement
        open={announcement.isOpen}
        onDismiss={announcement.dismiss}
        onTryNow={handleTryNow}
      />

      <div
        ref={containerRef}
        className="flex flex-col rounded-lg border border-gray-800 bg-gray-900 overflow-hidden"
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
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                isLocalProvider
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
              {explanation ? t.aiExplainerRerunButton : t.aiExplainerRunButton}
            </button>
          )}

          {explanation && !isRunning && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:bg-gray-700"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? t.aiExplainerCopiedShort : t.aiExplainerCopy}
            </button>
          )}

          {durationMs > 0 && !isRunning && (
            <span className="text-[11px] text-gray-500">
              {t.aiExplainerGeneratedIn} <span className="font-mono">{formatSeconds(durationMs)}</span>
            </span>
          )}

          {/* Context-window meter: makes the token cost of the query visible up front. */}
          {sql.trim() && (
            <span
              className={`ml-auto font-mono text-[11px] ${
                preflight.overflows ? 'text-yellow-300' : 'text-gray-500'
              }`}
              title={t.aiContextMeterHint}
            >
              ~{preflight.needsTokens} / {preflight.promptTokens} tok
            </span>
          )}
        </div>

        {/* Body */}
        <div className="px-4 pb-4">
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

          {error && !isRunning && (
            <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-3.5 py-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-red-200">
                <AlertTriangle size={14} />
                {t.aiExplainerErrorTitle}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-red-300/90">{error}</p>
              <p className="mt-2 text-xs text-red-300/70">{t.aiExplainerErrorHint}</p>
            </div>
          )}

          {isRunning && (
            <div className="space-y-3" aria-busy="true">
              {[0, 1, 2].map((row) => (
                <div key={`ai-skeleton-${row}`} className="rounded-lg border border-gray-800 bg-gray-800/40 p-3">
                  <div className="h-3 w-28 animate-pulse rounded bg-gray-700" />
                  <div className="mt-2.5 h-2.5 w-full animate-pulse rounded bg-gray-700/70" />
                  <div className="mt-1.5 h-2.5 w-4/5 animate-pulse rounded bg-gray-700/50" />
                </div>
              ))}
            </div>
          )}

          {!isRunning && !error && !explanation && (
            <div className="rounded-lg border border-dashed border-gray-700 bg-gray-800/30 px-4 py-6 text-center">
              <Sparkles size={18} className="mx-auto text-indigo-400/70" />
              <p className="mt-2 text-sm text-gray-300">{t.aiExplainerEmptyStateTitle}</p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-gray-500">
                {t.aiExplainerEmptyStateHint}
              </p>
            </div>
          )}

          {!isRunning && explanation && (
            <div className="space-y-3">
              {/* What actually reached the model. Silent truncation becomes visible here. */}
              {(explanation.budget.sqlTruncated || explanation.budget.contextBriefDropped) && (
                <div className="rounded-lg border border-yellow-800/50 bg-yellow-950/30 px-3 py-2 text-xs leading-relaxed text-yellow-200">
                  {explanation.budget.sqlTruncated && (
                    <p>
                      {t.aiContextTruncatedNotice.replace(
                        '{lines}',
                        String(explanation.budget.omittedSqlLines)
                      )}
                    </p>
                  )}
                  {explanation.budget.contextBriefDropped && (
                    <p className="mt-1">{t.aiContextBriefDropped}</p>
                  )}
                </div>
              )}

              {contextBrief && (
                <p className="text-[11px] text-gray-500">{t.aiContextBriefUsed}</p>
              )}

              {explanation.structured ? (
                <>
                  {sections.map(({ key, icon: Icon, title, accent, body }) => (
                    <div key={key} className="rounded-lg border border-gray-800 bg-gray-800/40 p-3.5">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        <span className={`flex h-5 w-5 items-center justify-center rounded ${accent}`}>
                          <Icon size={11} />
                        </span>
                        {title}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-gray-200">{body}</p>
                    </div>
                  ))}

                  <div className="rounded-lg border border-gray-800 bg-gray-800/40 p-3.5">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-500/15 text-amber-300">
                        <Filter size={11} />
                      </span>
                      {t.aiExplainerFilters}
                    </p>
                    {explanation.filters.length ? (
                      <ul className="mt-2 space-y-1.5">
                        {explanation.filters.map((filter, index) => (
                          <li
                            key={`ai-filter-${index}`}
                            className="flex items-start gap-2 text-sm leading-relaxed text-gray-200"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400/70" />
                            {filter}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-gray-400">{t.aiExplainerNoFilters}</p>
                    )}
                  </div>

                  {explanation.tables.length > 0 && (
                    <div className="rounded-lg border border-gray-800 bg-gray-800/40 p-3.5">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/15 text-emerald-300">
                          <Database size={11} />
                        </span>
                        {t.aiExplainerTables}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {explanation.tables.map((table, index) => (
                          <span
                            key={`ai-table-${index}`}
                            className="rounded border border-gray-700 bg-gray-900 px-2 py-0.5 font-mono text-xs text-gray-300"
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
                    <ChevronDown
                      size={11}
                      className={`transition-transform ${showRaw ? 'rotate-180' : ''}`}
                    />
                    {showRaw ? t.aiExplainerHideRaw : t.aiExplainerShowRaw}
                  </button>
                  {showRaw && (
                    <pre className="max-h-64 overflow-auto rounded-lg border border-gray-800 bg-gray-950 p-3 font-mono text-[11px] leading-relaxed text-gray-400">
                      {explanation.raw}
                    </pre>
                  )}
                </>
              ) : (
                /* The model ignored the JSON contract — show its answer verbatim. */
                <div className="rounded-lg border border-gray-800 bg-gray-800/40 p-3.5">
                  <p className="mb-2 text-xs text-gray-500">{t.aiExplainerUnstructuredNotice}</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
                    {explanation.raw}
                  </p>
                </div>
              )}

              {/* Batch: explain each CTE of the pipeline on its own. */}
              {analysis && analysis.ctes.length > 0 && (
                <AiCteBatchPanel
                  ctes={analysis.ctes}
                  config={aiConfig}
                  locale={settings.locale}
                  t={t}
                />
              )}

              {/* Multi-turn follow-up about the query that was just explained. */}
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
    </>
  );
};

export default AiSqlExplainer;
