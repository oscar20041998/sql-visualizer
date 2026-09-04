'use client';

import React from 'react';
import { AlertTriangle, AlertCircle, ChevronDown, ChevronUp, Lightbulb, X } from 'lucide-react';
import { checkSelectAll, checkOtherLintingRules, type LintingIssue } from '@/lib/sql/complexityScorer';
import { getT } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';

interface LintingAlertsProps {
  sql: string;
  compact?: boolean;
  collapsible?: boolean;
}

export default function LintingAlerts({ sql, compact = false, collapsible = false }: LintingAlertsProps) {
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { settings } = useAppStore();
  const t = getT(settings.locale);

  React.useEffect(() => {
    setDismissed(new Set());
    setIsExpanded(false);
  }, [sql]);

  if (!sql.trim()) {
    return null;
  }

  const issues = [
    ...checkSelectAll(sql, settings.locale),
    ...checkOtherLintingRules(sql, settings.locale),
  ];

  if (issues.length === 0) {
    return (
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
        <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300">
          <span className="text-lg">✓</span>
          <span>{t.lintingNoIssues}</span>
        </div>
      </div>
    );
  }

  const visibleIssues = issues.filter((_, idx) => !dismissed.has(String(idx)));

  if (visibleIssues.length === 0) {
    return null;
  }

  const dismissIssue = (idx: number) => {
    const newDismissed = new Set(dismissed);
    newDismissed.add(String(idx));
    setDismissed(newDismissed);
  };

  if (compact) {
    return (
      <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
        <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-2">
          <AlertTriangle size={14} />
          {t.lintingAlertsTitle} ({visibleIssues.length})
        </p>
        <div className="mt-2 space-y-1">
          {visibleIssues.map((issue, idx) => (
            <div key={`lint-compact-${idx}`} className="text-xs text-orange-700 dark:text-orange-300">
              <p>
                • <span className="font-mono">{issue.rule}</span>: {issue.message}
              </p>
              {issue.location && <p className="mt-1 text-[11px] opacity-80">{t.lintingLineLabel} {issue.location}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setIsExpanded((expanded) => !expanded)}
          aria-expanded={isExpanded}
          className="flex w-full items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-left transition-colors hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950/30 dark:hover:bg-orange-950/50"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-300">
            <AlertTriangle size={16} />
            {t.lintingAlertsTitle} ({visibleIssues.length})
          </span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      ) : (
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-orange-500" />
          <h3 className="text-sm font-semibold text-foreground">
            {t.lintingAlertsTitle} ({visibleIssues.length})
          </h3>
        </div>
      )}

      {(!collapsible || isExpanded) && visibleIssues.map((issue, idx) => (
        <div
          key={`lint-${idx}`}
          className={`border rounded-lg p-4 ${
            issue.severity === 'error'
              ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
              : 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {issue.severity === 'error' ? (
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                ) : (
                  <AlertTriangle size={16} className="text-orange-500 flex-shrink-0" />
                )}
                <span
                  className={`font-mono text-xs font-semibold ${
                    issue.severity === 'error'
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-orange-700 dark:text-orange-300'
                  }`}
                >
                  {issue.rule}
                </span>
              </div>

              <p
                className={`text-sm mt-2 ${
                  issue.severity === 'error'
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-orange-700 dark:text-orange-300'
                }`}
              >
                {issue.message}
              </p>

              <div
                className={`flex items-start gap-2 mt-2 p-2 rounded bg-black/5 dark:bg-white/5 ${
                  issue.severity === 'error'
                    ? 'border-l-2 border-red-300 dark:border-red-700'
                    : 'border-l-2 border-orange-300 dark:border-orange-700'
                }`}
              >
                <Lightbulb
                  size={14}
                  className={`flex-shrink-0 mt-0.5 ${
                    issue.severity === 'error'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-orange-600 dark:text-orange-400'
                  }`}
                />
                <p
                  className={`text-xs ${
                    issue.severity === 'error'
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-orange-700 dark:text-orange-300'
                  }`}
                >
                  {issue.suggestion}
                </p>
              </div>

              {issue.location && (
                <p className="text-xs text-muted-foreground mt-2">
                  {t.lintingLocationLabel}: {t.lintingLineLabel} {issue.location}
                </p>
              )}
            </div>

            <button
              onClick={() => dismissIssue(idx)}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
