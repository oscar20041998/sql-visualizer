'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Check, Layers, RefreshCw } from 'lucide-react';
import type { AIModelConfig } from '@/lib/store';
import type { Locale, Translations } from '@/lib/i18n';
import type { CTE } from '@/lib/sqlAnalyzer';
import { explainSqlStructured, type SqlExplanation } from '@/lib/aiService';
import { runBatch, type BatchItemState } from '@/lib/aiQueue';

interface AiCteBatchPanelProps {
  ctes: CTE[];
  config: AIModelConfig;
  locale: Locale;
  t: Translations;
}

type CteBatchState = BatchItemState<CTE, SqlExplanation>;

const STATUS_STYLES: Record<CteBatchState['status'], string> = {
  pending: 'border-gray-700 bg-gray-900 text-gray-500',
  running: 'border-indigo-700/50 bg-indigo-950/30 text-indigo-200',
  done: 'border-emerald-800/50 bg-emerald-950/20 text-emerald-200',
  error: 'border-red-900/60 bg-red-950/30 text-red-200',
  cancelled: 'border-gray-700 bg-gray-900 text-gray-500',
};

/**
 * Explains every CTE of the query separately, a bounded number at a time. Each CTE is a small
 * self-contained prompt, which keeps every request well inside the context window even when the
 * full query would not fit — and gives a per-step reading of a long pipeline.
 */
export const AiCteBatchPanel: React.FC<AiCteBatchPanelProps> = ({ ctes, config, locale, t }) => {
  const [states, setStates] = useState<CteBatchState[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  // A different query means the previous per-CTE results no longer apply.
  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsRunning(false);
    setStates([]);
    setExpanded(null);
  }, [ctes]);

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsRunning(true);
    setExpanded(null);

    try {
      const finalStates = await runBatch<CTE, SqlExplanation>(
        ctes,
        (cte, _index, signal) =>
          explainSqlStructured({
            // A CTE body is valid standalone SQL once wrapped in a SELECT context.
            sql: `-- CTE "${cte.name}"\nSELECT * FROM (\n${cte.body}\n) AS ${cte.name};`,
            config,
            locale,
            signal,
          }),
        {
          concurrency: config.batchConcurrency,
          signal: controller.signal,
          onProgress: setStates,
        }
      );

      if (controller.signal.aborted) return;
      const failed = finalStates.filter((state) => state.status === 'error').length;
      if (failed) toast.error(t.aiBatchPartialError.replace('{count}', String(failed)));
      else toast.success(t.aiBatchDone);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsRunning(false);
      }
    }
  }, [ctes, config, locale, t]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsRunning(false);
    toast.info(t.aiBatchCancelled);
  }, [t]);

  const completed = states.filter((state) => state.status === 'done').length;

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-800/40 p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-cyan-500/15 text-cyan-300">
              <Layers size={11} />
            </span>
            {t.aiBatchTitle}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {t.aiBatchSubtitle
              .replace('{count}', String(ctes.length))
              .replace('{concurrency}', String(Math.max(1, config.batchConcurrency)))}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {states.length > 0 && (
            <span className="font-mono text-[11px] text-gray-400">
              {completed}/{states.length}
            </span>
          )}
          {isRunning ? (
            <button
              onClick={cancel}
              className="rounded-lg border border-gray-700 bg-gray-800 px-2.5 py-1 text-[11px] text-gray-200 transition-colors hover:bg-gray-700"
            >
              {t.aiBatchCancel}
            </button>
          ) : (
            <button
              onClick={run}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-700 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-cyan-600"
            >
              <Layers size={11} />
              {states.length ? t.aiBatchRerun : t.aiBatchRun}
            </button>
          )}
        </div>
      </div>

      {states.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {states.map((state) => {
            const isOpen = expanded === state.index;
            return (
              <li key={`cte-batch-${state.item.name}-${state.index}`}>
                <button
                  onClick={() => setExpanded(isOpen ? null : state.index)}
                  disabled={state.status !== 'done' && state.status !== 'error'}
                  className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors disabled:cursor-default ${
                    STATUS_STYLES[state.status]
                  }`}
                >
                  <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                    {state.status === 'running' && <RefreshCw size={11} className="animate-spin" />}
                    {state.status === 'done' && <Check size={11} />}
                    {state.status === 'error' && <AlertTriangle size={11} />}
                    {(state.status === 'pending' || state.status === 'cancelled') && (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <span className="font-mono">{state.item.name}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wide opacity-70">
                    {t[`aiBatchStatus_${state.status}` as keyof Translations]}
                  </span>
                </button>

                {isOpen && state.result && (
                  <div className="mt-1.5 ml-6 space-y-2 rounded-lg border border-gray-800 bg-gray-900 p-2.5">
                    <p className="text-sm leading-relaxed text-gray-200">
                      {state.result.structured ? state.result.objective : state.result.raw}
                    </p>
                    {state.result.structured && state.result.filters.length > 0 && (
                      <ul className="space-y-1">
                        {state.result.filters.map((filter, filterIndex) => (
                          <li
                            key={`cte-filter-${state.index}-${filterIndex}`}
                            className="flex items-start gap-2 text-xs leading-relaxed text-gray-300"
                          >
                            <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-amber-400/70" />
                            {filter}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {isOpen && state.error && (
                  <p className="mt-1.5 ml-6 rounded-lg border border-red-900/60 bg-red-950/30 px-2.5 py-2 text-xs text-red-300">
                    {state.error}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default AiCteBatchPanel;
