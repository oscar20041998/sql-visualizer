'use client';

import React from 'react';
import { AlertTriangle, AlertCircle, ChevronDown, ChevronUp, Lightbulb, X } from 'lucide-react';
import {
  checkSelectAll,
  checkOtherLintingRules,
  type LintingIssue,
} from '@/lib/sql/complexityScorer';
import { getT } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';

interface LintingAlertsProps {
  sql: string;
  compact?: boolean;
  collapsible?: boolean;
}

export default function LintingAlerts({
  sql,
  compact = false,
  collapsible = false,
}: LintingAlertsProps) {
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { settings } = useAppStore();
  const t = getT(settings.locale);
  // Ties the findings region to its heading so assistive tech can name and jump to the block.
  const headingId = React.useId();

  React.useEffect(() => {
    setDismissed(new Set());
    setIsExpanded(false);
  }, [sql]);

  if (!sql.trim()) {
    return null;
  }

  // Errors first so severity grouping is visible in a quick scan. The order inside the same
  // severity level stays as the rules produced it (Array#sort is stable) and no rule,
  // severity, message or suggestion is changed.
  const issues = [
    ...checkSelectAll(sql, settings.locale),
    ...checkOtherLintingRules(sql, settings.locale),
  ].sort((a, b) => {
    if (a.severity === b.severity) return 0;
    return a.severity === 'error' ? -1 : 1;
  });

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

  const errorCount = visibleIssues.filter((issue) => issue.severity === 'error').length;
  const warningCount = visibleIssues.length - errorCount;

  const formatSeverityCount = (count: number, one: string, other: string) =>
    count === 1 ? one : other.replace('{count}', String(count));

  // Severity is stated in words as well as color so it survives color-blind and high-contrast use.
  const severitySummary = (
    <span className="flex flex-wrap items-center gap-2">
      {errorCount > 0 && (
        <span className="flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle size={11} aria-hidden />
          {formatSeverityCount(errorCount, t.findingsErrorCountOne, t.findingsErrorCountOther)}
        </span>
      )}
      {warningCount > 0 && (
        <span className="flex items-center gap-1 rounded-full border border-orange-300 bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300">
          <AlertTriangle size={11} aria-hidden />
          {formatSeverityCount(
            warningCount,
            t.findingsWarningCountOne,
            t.findingsWarningCountOther
          )}
        </span>
      )}
    </span>
  );

  if (compact) {
    return (
      <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
        <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-2">
          <AlertTriangle size={14} />
          {t.lintingAlertsTitle} ({visibleIssues.length})
        </p>
        <div className="mt-2 space-y-1">
          {visibleIssues.map((issue, idx) => (
            <div
              key={`lint-compact-${idx}`}
              className="text-xs text-orange-700 dark:text-orange-300"
            >
              <p>
                • <span className="font-mono">{issue.rule}</span>: {issue.message}
              </p>
              {issue.location && (
                <p className="mt-1 text-[11px] opacity-80">
                  {t.lintingLineLabel} {issue.location}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // One card per finding, shared by the collapsible (Smart Editor) and expanded (Query Input)
  // surfaces so severity, summary, location and the suggested fix stay consistent everywhere.
  const renderIssueCard = (issue: LintingIssue, idx: number) => {
    const isError = issue.severity === 'error';
    const tone = isError
      ? 'text-red-700 dark:text-red-300'
      : 'text-orange-700 dark:text-orange-300';

    return (
      <div
        key={`lint-${idx}`}
        className={`rounded-lg border p-4 ${
          isError
            ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
            : 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {isError ? (
                <AlertCircle size={16} className="flex-shrink-0 text-red-500" aria-hidden />
              ) : (
                <AlertTriangle size={16} className="flex-shrink-0 text-orange-500" aria-hidden />
              )}
              <span className={`font-mono text-xs font-semibold ${tone}`}>{issue.rule}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                  isError
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                }`}
              >
                {isError ? t.severityError : t.severityWarning}
              </span>
            </div>

            <p className={`mt-2 text-sm ${tone}`}>{issue.message}</p>

            <div
              className={`mt-2 flex items-start gap-2 rounded bg-black/5 p-2 dark:bg-white/5 ${
                isError
                  ? 'border-l-2 border-red-300 dark:border-red-700'
                  : 'border-l-2 border-orange-300 dark:border-orange-700'
              }`}
            >
              <Lightbulb
                size={14}
                className={`mt-0.5 flex-shrink-0 ${
                  isError
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-orange-600 dark:text-orange-400'
                }`}
                aria-hidden
              />
              <p className={`text-xs ${tone}`}>{issue.suggestion}</p>
            </div>

            {issue.location && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t.lintingLocationLabel}: {t.lintingLineLabel} {issue.location}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => dismissIssue(idx)}
            aria-label={`${t.dismissFinding}: ${issue.rule}`}
            className="flex-shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      </div>
    );
  };

  if (!collapsible) {
    return (
      <section aria-labelledby={headingId} className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3
            id={headingId}
            className="flex items-center gap-2 text-sm font-semibold text-foreground"
          >
            <AlertTriangle size={16} className="text-orange-500" aria-hidden />
            {t.lintingAlertsTitle} ({visibleIssues.length})
          </h3>
          {severitySummary}
        </div>
        {visibleIssues.map(renderIssueCard)}
      </section>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsExpanded((expanded) => !expanded)}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-left transition-colors hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950/30 dark:hover:bg-orange-950/50"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-300">
          <AlertTriangle size={16} aria-hidden />
          {t.lintingAlertsTitle} ({visibleIssues.length})
        </span>
        {isExpanded ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
      </button>

      {isExpanded && <div className="space-y-2">{visibleIssues.map(renderIssueCard)}</div>}
    </div>
  );
}
