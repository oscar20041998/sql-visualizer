'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Bot,
  Database,
  Send,
  Loader2,
  Trash2,
  Copy,
  Check,
  Square,
  User,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import {
  streamDatabaseAssistant,
  suggestFollowUpQuestions,
  type DatabaseKnowledgeSource,
} from '@/lib/ai/databaseAssistant';
import type { AIMessage } from '@/lib/ai/aiService';

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: DatabaseKnowledgeSource[];
  isStreaming?: boolean;
}

const CODE_FENCE_RE = /```(\w+)?\n?([\s\S]*?)```/g;

/** Renders fenced ```sql code blocks as monospace panels, everything else as plain paragraphs. */
function MessageContent({ content }: { content: string }) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  CODE_FENCE_RE.lastIndex = 0;

  while ((match = CODE_FENCE_RE.exec(content))) {
    if (match.index > lastIndex) {
      parts.push(
        <p key={key++} className="whitespace-pre-wrap text-sm leading-relaxed">
          {content.slice(lastIndex, match.index)}
        </p>
      );
    }
    parts.push(
      <pre
        key={key++}
        className="overflow-x-auto rounded-lg border border-border bg-background/60 p-3 text-xs font-mono leading-relaxed text-foreground"
      >
        <code>{match[2]}</code>
      </pre>
    );
    lastIndex = CODE_FENCE_RE.lastIndex;
  }
  if (lastIndex < content.length) {
    parts.push(
      <p key={key++} className="whitespace-pre-wrap text-sm leading-relaxed">
        {content.slice(lastIndex)}
      </p>
    );
  }
  return <div className="space-y-2">{parts}</div>;
}

function CopyButton({ text, label, labelCopied }: { text: string; label: string; labelCopied: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard access can be denied by the browser; silently ignore, nothing to recover.
        }
      }}
      title={copied ? labelCopied : label}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}

export default function DatabaseAIAssistantContent() {
  const { settings } = useAppStore();
  const t = getT(settings.locale);
  const aiConfig = settings.aiConfig;

  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const followUpAbortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const idRef = useRef(0);

  const isLocalProvider = aiConfig.provider === 'ollama';
  const modelLabel = isLocalProvider ? aiConfig.ollamaModel : aiConfig.modelId;

  useEffect(
    () => () => {
      abortRef.current?.abort();
      followUpAbortRef.current?.abort();
    },
    []
  );

  useEffect(() => {
    if (turns.length) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [turns]);

  /** Fetches fresh follow-up chips for the latest answer; best-effort, never blocks or errors visibly. */
  const generateFollowUps = useCallback(
    async (askedQuestion: string, answer: string) => {
      followUpAbortRef.current?.abort();
      const controller = new AbortController();
      followUpAbortRef.current = controller;

      const nextFollowUps = await suggestFollowUpQuestions({
        question: askedQuestion,
        answer,
        config: aiConfig,
        locale: settings.locale,
        signal: controller.signal,
      });
      if (!controller.signal.aborted) setFollowUps(nextFollowUps);
    },
    [aiConfig, settings.locale]
  );

  const ask = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed || isAsking) return;

      abortRef.current?.abort();
      followUpAbortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const priorTurns = turns;
      const history: AIMessage[] = priorTurns.map((turn) => ({ role: turn.role, content: turn.content }));

      idRef.current += 1;
      const userId = `db-assistant-${idRef.current}`;
      idRef.current += 1;
      const assistantId = `db-assistant-${idRef.current}`;
      setTurns((prev) => [
        ...prev,
        { id: userId, role: 'user', content: trimmed },
        { id: assistantId, role: 'assistant', content: '', isStreaming: true },
      ]);
      setQuestion('');
      setFollowUps([]);
      setIsAsking(true);

      try {
        const { answer, sources } = await streamDatabaseAssistant(
          { question: trimmed, config: aiConfig, locale: settings.locale, history, signal: controller.signal },
          (delta) => {
            setTurns((prev) =>
              prev.map((turn) =>
                turn.id === assistantId ? { ...turn, content: turn.content + delta } : turn
              )
            );
          }
        );
        if (controller.signal.aborted) return;
        setTurns((prev) =>
          prev.map((turn) =>
            turn.id === assistantId ? { ...turn, content: answer, sources, isStreaming: false } : turn
          )
        );
        void generateFollowUps(trimmed, answer);
      } catch (caught) {
        if ((caught as Error)?.name === 'AbortError') return;
        // Roll the unanswered question back out of the thread so a retry is not duplicated.
        setTurns(priorTurns);
        setQuestion(trimmed);
        toast.error(caught instanceof Error ? caught.message : t.dbAssistantErrorGeneric);
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setIsAsking(false);
        }
      }
    },
    [turns, isAsking, aiConfig, settings.locale, t.dbAssistantErrorGeneric, generateFollowUps]
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsAsking(false);
  }, []);

  const handleNewChat = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    followUpAbortRef.current?.abort();
    followUpAbortRef.current = null;
    setIsAsking(false);
    setTurns([]);
    setQuestion('');
    setFollowUps([]);
  }, []);

  const suggestions = [
    t.dbAssistantSuggestion1,
    t.dbAssistantSuggestion2,
    t.dbAssistantSuggestion3,
    t.dbAssistantSuggestion4,
    t.dbAssistantSuggestion5,
    t.dbAssistantSuggestion6,
  ];

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl flex-col px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between pb-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Database size={16} />
          </span>
          <div>
            <h1 className="text-base font-semibold text-foreground">
              {t.dbAssistantHeroTitle} {t.dbAssistantHeroTitleGradient}
            </h1>
            <p className="text-xs text-muted-foreground">{aiConfig.provider} · {modelLabel}</p>
          </div>
        </div>
          {turns.length > 0 && (
            <button
              onClick={handleNewChat}
              title={t.dbAssistantNewChat}
              aria-label={t.dbAssistantNewChat}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Trash2 size={16} />
            </button>
          )}
      </header>

      <section className="flex flex-1 flex-col">
        <div className="flex-1 space-y-6 overflow-y-auto pb-6 scrollbar-thin">
          {turns.length === 0 && (
            <div className="flex min-h-[45vh] flex-col items-center justify-center gap-5 text-center">
              <Database size={30} className="text-primary" />
              <div>
                <p className="text-xl font-medium text-foreground">{t.dbAssistantEmptyTitle}</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t.dbAssistantEmptySubtitle}</p>
              </div>
              <div className="w-full max-w-2xl">
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={`db-suggestion-${index}`}
                      onClick={() => ask(suggestion)}
                      disabled={isAsking}
                      className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {turns.map((turn) => (
            <div
              key={turn.id}
              className={`group flex items-start gap-3 ${turn.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <span
                className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                  turn.role === 'user' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                }`}
              >
                {turn.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </span>
              <div
                className={`max-w-[86%] px-1 py-1.5 ${
                  turn.role === 'user'
                    ? 'rounded-2xl bg-muted px-4'
                    : ''
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-3">
                  {turn.role === 'assistant' && (
                    <CopyButton text={turn.content} label={t.dbAssistantCopy} labelCopied={t.dbAssistantCopied} />
                  )}
                </div>
                {turn.content ? <MessageContent content={turn.content} /> : <Loader2 size={15} className="animate-spin text-muted-foreground" />}
                {turn.isStreaming && turn.content && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-primary align-middle" />}
                {turn.role === 'assistant' && turn.sources && turn.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2">
                    <span className="text-[10px] text-muted-foreground">{t.dbAssistantSourcesLabel}:</span>
                    {turn.sources.map((source, sourceIndex) => (
                      <span
                        key={`db-source-${turn.id}-${sourceIndex}`}
                        className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground"
                        title={[source.section, source.pageAnchor].filter(Boolean).join(' — ')}
                      >
                        {source.sourceFile}
                        {source.section ? ` · ${source.section}` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {!isAsking && followUps.length > 0 && (
            <div className="ml-9 flex flex-wrap items-center gap-2">
              <span className="w-full text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t.dbAssistantFollowUpsLabel}
              </span>
              {followUps.map((suggestion, index) => (
                <button
                  key={`db-followup-${turns.length}-${index}`}
                  onClick={() => ask(suggestion)}
                  className="rounded-full border border-accent/30 bg-accent/5 px-3 py-1.5 text-xs text-foreground transition-colors hover:border-accent hover:bg-accent/10"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <div ref={endRef} />
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void ask(question);
          }}
          className="flex items-center gap-2 rounded-3xl border border-border bg-muted/50 p-2 shadow-sm focus-within:border-primary/50 focus-within:bg-card"
        >
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={t.dbAssistantPlaceholder}
            disabled={isAsking}
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
          />
          {isAsking ? (
            <button
              type="button"
              onClick={handleStop}
              title={t.dbAssistantStop}
              aria-label={t.dbAssistantStop}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-85"
            >
              <Square size={13} fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!question.trim()}
              title={t.dbAssistantSend}
              aria-label={t.dbAssistantSend}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={15} />
            </button>
          )}
        </form>
      </section>

      <p className="pt-4 text-center text-[11px] text-muted-foreground">{t.dbAssistantDisclaimer}</p>
    </div>
  );
}
