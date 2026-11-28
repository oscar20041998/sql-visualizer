'use client';

import React, { useEffect, useRef, useState } from 'react';
import { generateWithAI } from '@/lib/ai/aiService';
import { renderPrompt } from '@/lib/ai/prompts/render';
import { OBJECT_AI_PROMPTS } from '@/lib/ai/prompts/templates/objectIntelligence';
import { currentSessionOwner, SESSION_IDENTITY_CHANGED_EVENT } from '@/lib/demoAuth';
import type { Translations } from '@/lib/i18n';
import type { SqlDialect } from '@/lib/sql/sqlAnalyzer';
import { useAppStore } from '@/lib/store';
import { isCapabilityLockedForGuest, useCapabilityLock } from '@/lib/useCapabilityLock';
import LockedFeatureNotice from '@/components/ui/LockedFeatureNotice';
import { AiMessageContent } from '@/components/ui/AiMessageContent';

export interface ObjectAiFacts {
  dialect: SqlDialect;
  kind: 'table' | 'view' | 'trigger' | 'procedure' | 'function';
  status: 'partial';
  columnCount?: number;
  parameterCount?: number;
  verifiedSourceCount?: number;
}

export function ObjectAiPanel({ facts, t }: { facts: ObjectAiFacts; t: Translations }) {
  const config = useAppStore((state) => state.settings.aiConfig);
  const locale = useAppStore((state) => state.settings.locale);
  const consent = useAppStore((state) => state.objectAiConsent);
  const setConsent = useAppStore((state) => state.setObjectAiConsent);
  const locked = useCapabilityLock('sql-explainer');
  const owner = currentSessionOwner();
  const [confirming, setConfirming] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const request = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const factText = JSON.stringify({
    dialect: facts.dialect,
    kind: facts.kind,
    status: facts.status,
    columnCount: facts.columnCount,
    parameterCount: facts.parameterCount,
    verifiedSourceCount: facts.verifiedSourceCount,
  });
  let endpoint: URL | null = null;
  try {
    const url = new URL(config.baseUrls[config.provider]);
    if (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    ) {
      endpoint = url;
    }
  } catch {
    endpoint = null;
  }
  const origin = endpoint?.origin ?? null;
  const local = config.provider === 'ollama' &&
    (endpoint?.hostname === 'localhost' || endpoint?.hostname === '127.0.0.1' || endpoint?.hostname === '[::1]');

  useEffect(() => {
    request.current += 1;
    controller.current?.abort();
    setConfirming(false);
    setAnswer(null);
    setFailed(false);
    setLoading(false);
    const savedConsent = useAppStore.getState().objectAiConsent;
    if (savedConsent && (savedConsent.provider !== config.provider || savedConsent.origin !== origin || savedConsent.owner !== currentSessionOwner())) {
      setConsent(null);
    }
    return () => {
      request.current += 1;
      controller.current?.abort();
    };
  }, [factText, config.provider, origin, locale, setConsent]);

  useEffect(() => {
    const clear = () => {
      request.current += 1;
      controller.current?.abort();
      setConfirming(false);
      setAnswer(null);
      setFailed(false);
      setLoading(false);
    };
    window.addEventListener(SESSION_IDENTITY_CHANGED_EVENT, clear);
    window.addEventListener('storage', clear);
    return () => {
      window.removeEventListener(SESSION_IDENTITY_CHANGED_EVENT, clear);
      window.removeEventListener('storage', clear);
    };
  }, []);

  const send = async () => {
    const latest = useAppStore.getState().settings.aiConfig;
    if (!origin || latest !== config || currentSessionOwner() !== owner || isCapabilityLockedForGuest('sql-explainer')) {
      setConfirming(false);
      setFailed(true);
      return;
    }
    const call = ++request.current;
    const abort = new AbortController();
    controller.current = abort;
    setConfirming(false);
    setLoading(true);
    setFailed(false);
    setAnswer(null);
    try {
      const response = await generateWithAI(config, {
        messages: [
          ...renderPrompt(OBJECT_AI_PROMPTS.system, { language: locale === 'vi' ? 'Vietnamese' : 'English' }),
          ...renderPrompt(OBJECT_AI_PROMPTS.facts, { facts: factText }),
        ],
        signal: abort.signal,
      });
      if (request.current === call) {
        if (response.trim()) setAnswer(response);
        else setFailed(true);
      }
    } catch {
      if (request.current === call) setFailed(true);
    } finally {
      if (request.current === call) setLoading(false);
    }
  };

  if (locked) return <LockedFeatureNotice t={t} featureName={t.objectAiTitle} />;

  return (
    <section aria-label={t.objectAiTitle} className="space-y-2 rounded-md border border-border p-3">
      <h3 className="font-medium">{t.objectAiTitle}</h3>
      <p className="text-muted-foreground">{t.objectAiScope}</p>
      <button
        type="button"
        className="min-h-11 rounded-md border border-border px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        disabled={loading}
        onClick={() => {
          if (!origin) {
            setFailed(true);
          } else if (local || (consent?.owner === currentSessionOwner() && consent.provider === config.provider && consent.origin === origin)) {
            void send();
          } else {
            setConfirming(true);
          }
        }}
      >
        {t.objectAiExplain}
      </button>
      {confirming && origin && (
        <div role="group" aria-label={t.objectAiConfirmTitle} className="space-y-2">
          <p>{t.objectAiConfirmProvider}: {config.provider} ({origin})</p>
          <p>{t.objectAiScope}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="min-h-11 rounded-md border border-border px-3" onClick={() => setConfirming(false)}>{t.objectAiCancel}</button>
            <button type="button" className="min-h-11 rounded-md bg-primary px-3 text-primary-foreground" onClick={() => {
              if (currentSessionOwner() !== owner || useAppStore.getState().settings.aiConfig !== config || isCapabilityLockedForGuest('sql-explainer')) {
                setConfirming(false);
                setFailed(true);
                return;
              }
              setConsent({ owner, provider: config.provider, origin });
              void send();
            }}>{t.objectAiConfirmSend}</button>
          </div>
        </div>
      )}
      {loading && <p role="status">{t.analyzing}</p>}
      {failed && <p role="alert">{t.objectAiFailed}</p>}
      {answer && <div className="break-words"><p className="font-medium">{t.objectAiGenerated}</p><AiMessageContent content={answer} /></div>}
    </section>
  );
}
