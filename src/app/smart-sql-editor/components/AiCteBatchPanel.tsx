'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Check, Layers, RefreshCw } from 'lucide-react';
import type { AIModelConfig } from '@/lib/store';
import type { Locale, Translations } from '@/lib/i18n';
import type { CTE } from '@/lib/sql/sqlAnalyzer';
import { explainCteWithAI, type CteExplanation } from '@/lib/ai/aiService';
import { runBatch, type BatchItemState } from '@/lib/ai/aiQueue';
import LockedFeatureNotice from '@/components/ui/LockedFeatureNotice';
import { useCapabilityLock } from '@/lib/useCapabilityLock';

interface AiCteBatchPanelProps {
  ctes: CTE[];
  config: AIModelConfig;
  locale: Locale;
  t: Translations;
}

type CteBatchState = BatchItemState<CTE, CteExplanation>;

const MAX_DEPENDENCY_CONTEXT_CHARS = 6_000;
const INLINE_MARKDOWN_TOKEN =
  /(`[^`]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|\b(?:SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|ON|WITH|AS|GROUP\s+BY|ORDER\s+BY|HAVING|UNION|ALL|DISTINCT|CASE|WHEN|THEN|ELSE|END|SUM|COUNT|AVG|MIN|MAX|COALESCE|NULL)\b|\b[a-zA-Z_][a-zA-Z0-9]*_[a-zA-Z0-9_]*\b)/gi;

function renderInlineMarkdown(text: string): React.ReactNode {
  return text.split(INLINE_MARKDOWN_TOKEN).map((part, index) => {
    const isBackticked = part.startsWith('`') && part.endsWith('`');
    const isBold = part.startsWith('**') && part.endsWith('**');
    const isItalic = !isBold && part.startsWith('*') && part.endsWith('*');
    const isSqlKeyword =
      /^(?:SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|ON|WITH|AS|GROUP\s+BY|ORDER\s+BY|HAVING|UNION|ALL|DISTINCT|CASE|WHEN|THEN|ELSE|END|SUM|COUNT|AVG|MIN|MAX|COALESCE|NULL)$/i.test(
        part
      );
    const isIdentifier = /^[a-zA-Z_][a-zA-Z0-9]*_[a-zA-Z0-9_]*$/.test(part);

    if (isBold) {
      return (
        <strong key={index} className="font-semibold text-primary">
          {renderInlineMarkdown(part.slice(2, -2))}
        </strong>
      );
    }

    if (isItalic) {
      return <em key={index}>{renderInlineMarkdown(part.slice(1, -1))}</em>;
    }

    if (isBackticked || isSqlKeyword || isIdentifier) {
      return (
        <code
          key={index}
          className={`rounded px-1 font-mono text-[0.9em] ${
            isSqlKeyword
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
          }`}
        >
          {isBackticked ? part.slice(1, -1) : part}
        </code>
      );
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export function CteExplanationText({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];

  for (let index = 0; index < lines.length; ) {
    const line = lines[index];
    const heading = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (heading) {
      blocks.push(
        <h4
          key={`heading-${index}`}
          className="border-l-2 border-primary bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"
        >
          {renderInlineMarkdown(heading[2])}
        </h4>
      );
      index += 1;
      continue;
    }

    const unordered = /^\s*[-*+]\s+(.+)$/.exec(line);
    const ordered = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    if (unordered || ordered) {
      const matcher = unordered ? /^\s*[-*+]\s+(.+)$/ : /^\s*\d+[.)]\s+(.+)$/;
      const items: string[] = [];
      while (index < lines.length) {
        const match = matcher.exec(lines[index]);
        if (!match) break;
        items.push(match[1]);
        index += 1;
      }
      const List = unordered ? 'ul' : 'ol';
      blocks.push(
        <List
          key={`list-${index - items.length}`}
          className={`space-y-1 pl-5 ${unordered ? 'list-disc' : 'list-decimal'}`}
        >
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInlineMarkdown(item)}</li>
          ))}
        </List>
      );
      continue;
    }

    blocks.push(
      line.trim() ? (
        <p key={`paragraph-${index}`}>{renderInlineMarkdown(line)}</p>
      ) : (
        <div key={`space-${index}`} className="h-1" />
      )
    );
    index += 1;
  }

  return <div className="space-y-2 text-sm leading-relaxed text-foreground">{blocks}</div>;
}

function buildDependencyContext(cte: CTE, ctes: CTE[]): string {
  const dependencies = new Set(cte.dependencies.map((name) => name.toLowerCase()));
  const sources = ctes.filter(
    (candidate) => candidate.name !== cte.name && dependencies.has(candidate.name.toLowerCase())
  );
  const dependencyDefinitions = sources
    .map((dependency) => `CTE ${dependency.name}:\n${dependency.body}`)
    .join('\n\n');
  const context = [
    cte.isRecursive ? 'The target CTE is recursive and refers to its previous iteration.' : '',
    dependencyDefinitions,
  ]
    .filter(Boolean)
    .join('\n\n');

  if (context.length <= MAX_DEPENDENCY_CONTEXT_CHARS) return context;
  return `${context.slice(0, MAX_DEPENDENCY_CONTEXT_CHARS)}\n[Remaining dependency context omitted]`;
}

const STATUS_STYLES: Record<CteBatchState['status'], string> = {
  pending: 'border-border bg-muted text-muted-foreground',
  running: 'border-primary/50 bg-primary/10 text-primary',
  done: 'border-success/40 bg-success/10 text-success',
  error: 'border-danger/40 bg-danger/10 text-danger',
  cancelled: 'border-border bg-muted text-muted-foreground',
};

/**
 * Explains every CTE of the query separately, a bounded number at a time. Each request includes
 * only its direct upstream CTEs, preserving the pipeline context without sending the full query.
 */
export const AiCteBatchPanel: React.FC<AiCteBatchPanelProps> = ({ ctes, config, locale, t }) => {
  // A guest reads the locked explanation INSIDE the batch panel (specs/013 US2 / FR-015):
  // the header stays so the lock is discoverable where the AI feature lives, and the list
  // and run button are replaced so no request is attempted (FR-013).
  const locked = useCapabilityLock('cte-batch');
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
      const finalStates = await runBatch<CTE, CteExplanation>(
        ctes,
        (cte, _index, signal) =>
          explainCteWithAI({
            cteName: cte.name,
            cteSql: cte.body,
            dependencyContext: buildDependencyContext(cte, ctes),
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

  const batchBody = locked ? (
    <div className="mt-3">
      <LockedFeatureNotice t={t} featureName={t.aiBatchTitle} />
    </div>
  ) : (
    <>
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
                  <div className="mt-1.5 ml-6 space-y-2 rounded-lg border border-border bg-muted/40 p-2.5">
                    <CteExplanationText text={state.result.text} />
                  </div>
                )}

                {isOpen && state.error && (
                  <p className="mt-1.5 ml-6 rounded-lg border border-danger/40 bg-danger/10 px-2.5 py-2 text-xs text-danger">
                    {state.error}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/15 text-primary">
              <Layers size={11} />
            </span>
            {t.aiBatchTitle}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t.aiBatchSubtitle
              .replace('{count}', String(ctes.length))
              .replace('{concurrency}', String(Math.max(1, config.batchConcurrency)))}
          </p>
        </div>

        {locked ? null : (
          <div className="flex items-center gap-2">
            {states.length > 0 && (
              <span className="font-mono text-[11px] text-muted-foreground">
                {completed}/{states.length}
              </span>
            )}
            {isRunning ? (
              <button
                onClick={cancel}
                className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] text-foreground transition-colors hover:bg-secondary"
              >
                {t.aiBatchCancel}
              </button>
            ) : (
              <button
                onClick={run}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Layers size={11} />
                {states.length ? t.aiBatchRerun : t.aiBatchRun}
              </button>
            )}
          </div>
        )}
      </div>

      {batchBody}
    </div>
  );
};

export default AiCteBatchPanel;
