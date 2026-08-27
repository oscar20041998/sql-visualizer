'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { BookMarked, ChevronRight, RefreshCw, Trash2 } from 'lucide-react';
import type { AIModelConfig } from '@/lib/store';
import type { Locale, Translations } from '@/lib/i18n';
import { askDocsConsultant, type DocSource } from '@/lib/ai/aiService';

interface DocsConsultantChatProps {
  config: AIModelConfig;
  locale: Locale;
  t: Translations;
  className?: string;
}

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  sources?: DocSource[];
}

/**
 * RAG chat over the app's own feature docs: embeds the question, retrieves the closest doc
 * chunks server-side, then answers grounded in that context. Same interaction shape as
 * AiFollowUpChat, but each answer cites which doc section it came from.
 */
export const DocsConsultantChat: React.FC<DocsConsultantChatProps> = ({ 
  config, 
  locale, 
  t, 
  className = "rounded-2xl border border-border bg-card p-4 mb-6" 
}) => {
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (history.length) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [history]);

  const ask = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed || isAsking) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const priorHistory = history;
      setHistory((prev) => [...prev, { role: 'user', content: trimmed }]);
      setQuestion('');
      setIsAsking(true);

      try {
        const { answer, sources } = await askDocsConsultant({
          question: trimmed,
          config,
          locale,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setHistory((prev) => [...prev, { role: 'assistant', content: answer, sources }]);
      } catch (caught) {
        if ((caught as Error)?.name === 'AbortError') return;
        // Roll the unanswered question back out of the thread so a retry is not duplicated.
        setHistory(priorHistory);
        setQuestion(trimmed);
        toast.error(caught instanceof Error ? caught.message : String(caught));
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setIsAsking(false);
        }
      }
    },
    [history, isAsking, config, locale]
  );

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsAsking(false);
    setHistory([]);
  }, []);

  const suggestions = [
    t.docsConsultantSuggestion1,
    t.docsConsultantSuggestion2,
    t.docsConsultantSuggestion3,
    t.docsConsultantSuggestion4,
    t.docsConsultantSuggestion5,
  ];

  return (
    <div className={className + " flex flex-col h-full"}>
      <div className="flex-1 scrollbar-thin overflow-y-auto space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/15 text-primary">
                <BookMarked size={11} />
              </span>
              {t.docsConsultantTitle}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t.docsConsultantSubtitle}</p>
          </div>
          {history.length > 0 && (
            <button
              onClick={handleReset}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-border"
            >
              <Trash2 size={11} />
              {t.docsConsultantReset}
            </button>
          )}
        </div>

        {history.length > 0 && (
          <div className="mt-3 space-y-2 pr-1">
            {history.map((turn, index) => (
              <div
                key={`docs-turn-${index}`}
                className={
                  turn.role === 'user'
                    ? 'ml-6 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2'
                    : 'mr-6 rounded-lg border border-border bg-muted px-3 py-2'
                }
              >
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {turn.role === 'user' ? t.docsConsultantRoleYou : t.docsConsultantRoleAssistant}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {turn.content}
                </p>
                {turn.sources && turn.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="text-[10px] text-muted-foreground">
                      {t.docsConsultantSourcesLabel}:
                    </span>
                    {turn.sources.map((source, sourceIndex) => (
                      <span
                        key={`docs-source-${index}-${sourceIndex}`}
                        className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground"
                        title={source.file}
                      >
                        {source.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isAsking && (
              <div className="mr-6 flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                <RefreshCw size={11} className="animate-spin" />
                {t.docsConsultantThinking}
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}

        {history.length === 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {suggestions.map((suggestion, index) => (
              <button
                key={`docs-suggestion-${index}`}
                onClick={() => ask(suggestion)}
                disabled={isAsking}
                className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void ask(question);
        }}
        className="mt-3 flex items-center gap-2 pt-3 border-t border-border"
      >
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={t.docsConsultantPlaceholder}
          disabled={isAsking}
          className="min-w-0 flex-1 rounded-lg border border-border bg-muted px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isAsking || !question.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t.docsConsultantSend}
          <ChevronRight size={12} />
        </button>
      </form>
    </div>
  );
};

export default DocsConsultantChat;
