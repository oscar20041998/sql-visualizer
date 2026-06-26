'use client';

import React, { memo, useState, useCallback } from 'react';
import {
  Lightbulb,
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import type { AnalysisResult } from '@/lib/sqlAnalyzer';
import { getT } from '@/lib/i18n';

type SuggestionSeverity = 'error' | 'warning' | 'info';

interface Suggestion {
  id: string;
  severity: SuggestionSeverity;
  title: string;
  detail: string;
}

const SEVERITY_CONFIG: Record<
  SuggestionSeverity,
  { icon: React.ReactNode; color: string; bg: string; border: string }
> = {
  error: {
    icon: <AlertCircle size={13} />,
    color: '#f87171',
    bg: 'rgba(248,113,113,0.08)',
    border: 'rgba(248,113,113,0.25)',
  },
  warning: {
    icon: <AlertTriangle size={13} />,
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.25)',
  },
  info: {
    icon: <CheckCircle2 size={13} />,
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.08)',
    border: 'rgba(96,165,250,0.25)',
  },
};

const SuggestionCard = memo(
  ({ suggestion, onDismiss }: { suggestion: Suggestion; onDismiss: (id: string) => void }) => {
    const cfg = SEVERITY_CONFIG[suggestion.severity];
    return (
      <div
        className="relative group rounded-lg p-3 text-xs"
        style={{
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          willChange: 'transform',
        }}
      >
        <div className="flex items-start gap-2">
          <span style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold font-mono leading-tight" style={{ color: cfg.color }}>
              {suggestion.title}
            </p>
            <p className="mt-1 leading-relaxed" style={{ color: '#8b9ab5' }}>
              {suggestion.detail}
            </p>
          </div>
        </div>
        <button
          onClick={() => onDismiss(suggestion.id)}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/10"
          style={{ color: '#5a6a85' }}
          title="Dismiss"
        >
          <X size={10} />
        </button>
      </div>
    );
  }
);

SuggestionCard.displayName = 'SuggestionCard';

interface SuggestionPanelProps {
  suggestions: Suggestion[];
  dismissedIds: Set<string>;
  onDismiss: (id: string) => void;
}

const SuggestionPanel = memo(function SuggestionPanelComponent({
  suggestions,
  dismissedIds,
  onDismiss,
}: SuggestionPanelProps) {
  const [showSuggestions, setShowSuggestions] = useState(true);

  const visibleSuggestions = suggestions.filter((s) => !dismissedIds.has(s.id));
  const errorCount = visibleSuggestions.filter((s) => s.severity === 'error').length;
  const warnCount = visibleSuggestions.filter((s) => s.severity === 'warning').length;

  const t = getT('en');

  if (visibleSuggestions.length === 0) return null;

  return (
    <div
      className="flex-shrink-0 border-t border-border bg-card overflow-hidden"
      style={{
        height: showSuggestions ? '280px' : '44px',
        transition: 'height 0.2s ease-out',
        willChange: 'height',
      }}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Lightbulb size={14} className="text-yellow-400" />
          <span className="text-sm font-semibold text-foreground">{t.smartSuggestions}</span>
          {errorCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">
              {errorCount} {errorCount > 1 ? t.errors : t.error}
            </span>
          )}
          {warnCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400">
              {warnCount} {warnCount > 1 ? t.warnings : t.warning}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowSuggestions((v) => !v)}
          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground flex-shrink-0"
        >
          {showSuggestions ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {/* Suggestions List */}
      {showSuggestions && (
        <div className="overflow-auto p-3" style={{ maxHeight: '232px' }}>
          <div className="flex flex-col gap-2">
            {visibleSuggestions.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} onDismiss={onDismiss} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

SuggestionPanel.displayName = 'SuggestionPanel';

export default SuggestionPanel;
export type { Suggestion, SuggestionSeverity };
