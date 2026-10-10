'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Copy,
  MessageSquareText,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type { AIModelConfig } from '@/lib/store';
import type { Locale, Translations } from '@/lib/i18n';
import { askFollowUp, type AIMessage } from '@/lib/ai/aiService';
import LockedFeatureNotice from '@/components/ui/LockedFeatureNotice';
import { useCapabilityLock } from '@/lib/useCapabilityLock';

interface AiFollowUpChatProps {
  sql: string;
  config: AIModelConfig;
  locale: Locale;
  contextBrief: string;
  t: Translations;
}

const SQL_CODE_FENCE_RE = /```(?:sql)?\s*\n?([\s\S]*?)```/gi;

const INLINE_MARKDOWN_TOKEN = /(`[^`]+`|\*\*\*[^*\n]+?\*\*\*|\*\*[^*\n]+?\*\*|\*[^*\n]+?\*)/g;

function renderInlineMarkdown(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const tokens = text.split(INLINE_MARKDOWN_TOKEN);
  tokens.forEach((part, index) => {
    const key = `${keyPrefix}-${index}`;
    const isCode = part.startsWith('`') && part.endsWith('`') && part.length >= 2;
    const isBoldItalic = part.startsWith('***') && part.endsWith('***') && part.length >= 7;
    const isBold =
      !isBoldItalic && part.startsWith('**') && part.endsWith('**') && part.length >= 5;
    const isItalic =
      !isBold && !isBoldItalic && part.startsWith('*') && part.endsWith('*') && part.length >= 3;

    if (isCode) {
      parts.push(
        <code
          key={key}
          className="rounded bg-background/70 px-1 py-0.5 font-mono text-[0.85em] text-primary"
        >
          {part.slice(1, -1)}
        </code>
      );
      return;
    }
    if (isBoldItalic) {
      parts.push(
        <strong key={key} className="font-bold italic text-foreground">
          {renderInlineMarkdown(part.slice(3, -3), `${key}-bi`)}
        </strong>
      );
      return;
    }
    if (isBold) {
      parts.push(
        <strong key={key} className="font-bold text-foreground">
          {renderInlineMarkdown(part.slice(2, -2), `${key}-b`)}
        </strong>
      );
      return;
    }
    if (isItalic) {
      parts.push(
        <em key={key} className="italic">
          {renderInlineMarkdown(part.slice(1, -1), `${key}-i`)}
        </em>
      );
      return;
    }
    parts.push(<React.Fragment key={key}>{part}</React.Fragment>);
  });
  return parts;
}

function MarkdownText({ content, keyPrefix }: { content: string; keyPrefix: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = content.split('\n');

  for (let index = 0; index < lines.length; ) {
    const line = lines[index];
    const heading = /^(#{1,6})\s+(.+)$/.exec(line.trim());
    if (heading) {
      const level = heading[1].length;
      const headingClass =
        level === 1
          ? 'text-base font-bold text-primary'
          : level === 2
            ? 'text-sm font-bold text-primary'
            : 'text-xs font-bold uppercase tracking-wide text-primary';
      blocks.push(
        <p key={`${keyPrefix}-h-${index}`} className={headingClass}>
          {renderInlineMarkdown(heading[2], `${keyPrefix}-h-${index}`)}
        </p>
      );
      index += 1;
      continue;
    }

    const unordered = /^\s*[-*+]\s+(.+)$/.exec(line);
    const ordered = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    if (unordered || ordered) {
      const matcher = unordered ? /^\s*[-*+]\s+(.+)$/ : /^\s*\d+[.)]\s+(.+)$/;
      const items: string[] = [];
      const start = index;
      while (index < lines.length) {
        const match = matcher.exec(lines[index]);
        if (!match) break;
        items.push(match[1]);
        index += 1;
      }
      const List = unordered ? 'ul' : 'ol';
      blocks.push(
        <List
          key={`${keyPrefix}-list-${start}`}
          className={`space-y-1 pl-5 text-sm leading-relaxed text-foreground ${
            unordered ? 'list-disc' : 'list-decimal'
          }`}
        >
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>
              {renderInlineMarkdown(item, `${keyPrefix}-list-${start}-${itemIndex}`)}
            </li>
          ))}
        </List>
      );
      continue;
    }

    blocks.push(
      line.trim() ? (
        <p
          key={`${keyPrefix}-p-${index}`}
          className="whitespace-pre-wrap text-sm leading-relaxed text-foreground"
        >
          {renderInlineMarkdown(line, `${keyPrefix}-p-${index}`)}
        </p>
      ) : (
        <div key={`${keyPrefix}-space-${index}`} className="h-1" />
      )
    );
    index += 1;
  }

  return <div className="space-y-1.5">{blocks}</div>;
}

function SqlCodeBlock({ sql, t }: { sql: string; t: Translations }) {
  const [copied, setCopied] = useState(false);
  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t.aiExplainerCopyFailed);
    }
  };

  return (
    <div className="relative my-2 overflow-hidden rounded-lg border border-border bg-muted/50">
      <button
        onClick={() => void copySql()}
        title={copied ? t.aiExplainerCopiedShort : t.aiExplainerCopy}
        className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
      <pre className="max-h-56 overflow-auto p-3 pr-11 font-mono text-xs leading-relaxed text-foreground scrollbar-thin">
        <code>{sql}</code>
      </pre>
    </div>
  );
}

function AssistantMessage({ content, t }: { content: string; t: Translations }) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  SQL_CODE_FENCE_RE.lastIndex = 0;

  while ((match = SQL_CODE_FENCE_RE.exec(content))) {
    if (match.index > lastIndex) {
      parts.push(
        <MarkdownText
          key={key++}
          content={content.slice(lastIndex, match.index)}
          keyPrefix={`chat-${key}`}
        />
      );
    }
    parts.push(<SqlCodeBlock key={key++} sql={match[1].trim()} t={t} />);
    lastIndex = SQL_CODE_FENCE_RE.lastIndex;
  }
  if (lastIndex < content.length) {
    parts.push(
      <MarkdownText key={key++} content={content.slice(lastIndex)} keyPrefix={`chat-${key}`} />
    );
  }
  return <div className="space-y-2">{parts}</div>;
}

function buildSuggestions(sql: string, t: Translations): string[] {
  const normalized = sql.toUpperCase();
  const suggestions: string[] = [];
  if (/\bJOIN\b/.test(normalized)) suggestions.push(t.aiChatSuggestion2);
  if (/\bWHERE\b|\bHAVING\b/.test(normalized)) suggestions.push(t.aiChatSuggestion3);
  if (/\bGROUP\s+BY\b|\bSUM\s*\(|\bCOUNT\s*\(|\bAVG\s*\(/.test(normalized)) {
    suggestions.push(t.aiChatSuggestionAggregation);
  }
  if (/\bSELECT\b/.test(normalized)) suggestions.push(t.aiChatSuggestion1);
  return suggestions.slice(0, 3);
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
  // A guest reads the locked explanation INSIDE the chat card (specs/013 US2 / FR-015):
  // the header stays rendered so the lock is discoverable where the AI feature lives,
  // and only the thread/composer area shows the lock instead of a form that would
  // fail on submit (FR-013).
  const locked = useCapabilityLock('follow-up-chat');
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

  const suggestions = buildSuggestions(sql, t);

  const chatBody = locked ? (
    <div className="mt-3">
      <LockedFeatureNotice t={t} featureName={t.aiChatTitle} />
    </div>
  ) : (
    <>
      {/* Thread */}
      {history.length > 0 && (
        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
          {history.map((message, index) => (
            <div
              key={`ai-turn-${index}`}
              className={
                message.role === 'user'
                  ? 'ml-6 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2'
                  : 'mr-6 rounded-lg border border-border bg-muted/40 px-3 py-2'
              }
            >
              <p
                className={`mb-1 text-[10px] font-semibold uppercase tracking-wide ${message.role === 'user' ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {message.role === 'user' ? t.aiChatRoleYou : t.aiChatRoleAssistant}
              </p>
              {message.role === 'assistant' ? (
                <AssistantMessage content={message.content} t={t} />
              ) : (
                <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-foreground">
                  {message.content}
                </p>
              )}
            </div>
          ))}
          {isAsking && (
            <div className="mr-6 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <RefreshCw size={11} className="animate-spin" />
              {t.aiChatThinking}
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      {droppedMessages > 0 && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-warning">
          <AlertTriangle size={11} className="mt-0.5 flex-shrink-0" />
          {t.aiChatHistoryTrimmed.replace('{count}', String(droppedMessages))}
        </p>
      )}

      {/* Query-aware suggestions stay available throughout the conversation. */}
      {suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggestions.map((suggestion, index) => (
            <button
              key={`ai-suggestion-${index}`}
              onClick={() => ask(suggestion)}
              disabled={isAsking}
              className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] text-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
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
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isAsking || !question.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t.aiChatSend}
          <ChevronRight size={12} />
        </button>
      </form>
    </>
  );

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/15 text-primary">
              <MessageSquareText size={11} />
            </span>
            {t.aiChatTitle}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t.aiChatSubtitle}</p>
        </div>
        {history.length > 0 && (
          <button
            onClick={handleReset}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] text-foreground transition-colors hover:bg-secondary"
          >
            <Trash2 size={11} />
            {t.aiChatReset}
          </button>
        )}
      </div>

      {chatBody}
    </div>
  );
};

export default AiFollowUpChat;
