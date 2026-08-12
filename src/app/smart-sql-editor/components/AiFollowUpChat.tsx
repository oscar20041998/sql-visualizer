'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, ChevronRight, MessageSquareText, RefreshCw, Trash2 } from 'lucide-react';
import type { AIModelConfig } from '@/lib/store';
import type { Locale, Translations } from '@/lib/i18n';
import { askFollowUp, type AIMessage } from '@/lib/ai/aiService';

interface AiFollowUpChatProps {
  sql: string;
  config: AIModelConfig;
  locale: Locale;
  contextBrief: string;
  t: Translations;
}

/**
 * Multi-turn Q&A about the query that was just explained. History lives here and is passed
 * back to the service on every turn; the service trims the oldest exchanges when the
 * conversation outgrows the model's context window and reports how many it dropped.
 */
export const AiFollowUpChat: React.FC<AiFollowUpChatProps> = ({
  sql,
  config,
  locale,
  contextBrief,
  t,
}) => {
  const [history, setHistory] = useState<AIMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [droppedMessages, setDroppedMessages] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Keep the newest turn in view as the thread grows.
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

      const asked: AIMessage = { role: 'user', content: trimmed };
      const priorHistory = history;
      setHistory((prev) => [...prev, asked]);
      setQuestion('');
      setIsAsking(true);

      try {
        const { answer, budget } = await askFollowUp({
          question: trimmed,
          sql,
          config,
          locale,
          contextBrief,
          history: priorHistory,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setHistory((prev) => [...prev, { role: 'assistant', content: answer }]);
        setDroppedMessages(budget.droppedMessages);
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
    [history, isAsking, sql, config, locale, contextBrief]
  );

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsAsking(false);
    setHistory([]);
    setDroppedMessages(0);
  }, []);

  const suggestions = [t.aiChatSuggestion1, t.aiChatSuggestion2, t.aiChatSuggestion3];

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-800/40 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-500/15 text-violet-300">
              <MessageSquareText size={11} />
            </span>
            {t.aiChatTitle}
          </p>
          <p className="mt-1 text-xs text-gray-500">{t.aiChatSubtitle}</p>
        </div>
        {history.length > 0 && (
          <button
            onClick={handleReset}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-2.5 py-1 text-[11px] text-gray-300 transition-colors hover:bg-gray-700"
          >
            <Trash2 size={11} />
            {t.aiChatReset}
          </button>
        )}
      </div>

      {/* Thread */}
      {history.length > 0 && (
        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
          {history.map((message, index) => (
            <div
              key={`ai-turn-${index}`}
              className={
                message.role === 'user'
                  ? 'ml-6 rounded-lg border border-violet-800/40 bg-violet-950/30 px-3 py-2'
                  : 'mr-6 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2'
              }
            >
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                {message.role === 'user' ? t.aiChatRoleYou : t.aiChatRoleAssistant}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
                {message.content}
              </p>
            </div>
          ))}
          {isAsking && (
            <div className="mr-6 flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-400">
              <RefreshCw size={11} className="animate-spin" />
              {t.aiChatThinking}
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      {droppedMessages > 0 && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-yellow-300/90">
          <AlertTriangle size={11} className="mt-0.5 flex-shrink-0" />
          {t.aiChatHistoryTrimmed.replace('{count}', String(droppedMessages))}
        </p>
      )}

      {/* Suggestions on an empty thread */}
      {history.length === 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggestions.map((suggestion, index) => (
            <button
              key={`ai-suggestion-${index}`}
              onClick={() => ask(suggestion)}
              disabled={isAsking}
              className="rounded-full border border-gray-700 bg-gray-900 px-2.5 py-1 text-[11px] text-gray-300 transition-colors hover:border-violet-700 hover:text-violet-200 disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void ask(question);
        }}
        className="mt-3 flex items-center gap-2"
      >
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={t.aiChatPlaceholder}
          disabled={isAsking}
          className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-gray-200 placeholder:text-gray-600 focus:border-violet-700 focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isAsking || !question.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t.aiChatSend}
          <ChevronRight size={12} />
        </button>
      </form>
    </div>
  );
};

export default AiFollowUpChat;
