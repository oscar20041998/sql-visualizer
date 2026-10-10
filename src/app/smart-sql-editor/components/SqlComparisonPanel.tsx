'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, ChevronRight } from 'lucide-react';
import { DiffEditor } from '@monaco-editor/react';
import { getT, type Locale } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import type { ComparisonResult, SqlEvidence } from '@/lib/sql/sqlComparison';
import { LIMITATION_EMPTY_STATEMENT } from '@/lib/sql/sqlComparison';
import SidePanelTab from './SidePanelTab';

export interface SqlComparisonPanelProps {
  locale: Locale;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  result?: ComparisonResult | null;
  isStale?: boolean;
  isRunning?: boolean;
  onRunComparison?: () => void;
  onRequestAi?: () => void;
  onCancelAi?: () => void;
}

export default function SqlComparisonPanel({
  locale,
  isOpen,
  onToggle,
  result = null,
  isStale = false,
  isRunning = false,
  onRunComparison,
  onRequestAi,
  onCancelAi,
}: SqlComparisonPanelProps) {
  const t = getT(locale);
  const theme = useAppStore((store) => store.settings.theme);
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs';
  const [isWideViewport, setIsWideViewport] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef(false);
  const valueLabel = (values: Record<string, string>, value: string) =>
    values[value] ?? t.comparisonNotAssessed;
  const equivalenceLabels = {
    equivalent: t.comparisonEquivalent,
    not_equivalent: t.comparisonNotEquivalent,
    inconclusive: t.comparisonInconclusive,
    not_assessed: t.comparisonNotAssessed,
  };
  const safetyLabels = {
    review_required: t.comparisonReviewRequired,
    risk_detected: t.comparisonSafetyRiskDetected,
    no_known_risk_detected: t.comparisonNoKnownRisk,
    not_assessed: t.comparisonSafetyNotAssessed,
  };
  const performanceLabels = {
    risk_detected: t.comparisonPerformanceRiskDetected,
    no_change_detected: t.comparisonNoChangeDetected,
    not_verified: t.comparisonNotVerified,
    not_assessed: t.comparisonNotAssessed,
  };
  const staticLabels = {
    completed: t.comparisonStaticCompleted,
    partial: t.comparisonStaticPartial,
    failed: t.comparisonStaticFailed,
    not_run: t.comparisonStaticNotRun,
  };
  const severityLabels = {
    info: t.comparisonSeverityInfo,
    warning: t.comparisonSeverityWarning,
    high: t.comparisonSeverityHigh,
    critical: t.comparisonSeverityCritical,
  };
  // The analysis lib produces English limitation sentences (they also feed the AI
  // prompt context); map the known ones to the active locale and pass the rest through.
  const limitationText = (limitation: string): string =>
    limitation === LIMITATION_EMPTY_STATEMENT
      ? t.comparisonLimitationBothStatementsRequired
      : limitation;
  const renderEvidence = (evidence: SqlEvidence, key: string) => {
    const sideLabel = evidence.side === 'before' ? t.comparisonBefore : t.comparisonAfter;
    const preview = evidence.text.length > 240;
    const content = (
      <pre className="whitespace-pre-wrap break-words font-mono text-xs text-muted-foreground">
        {evidence.text}
      </pre>
    );

    if (!preview) {
      return (
        <div key={key} className="mt-1">
          {content}
        </div>
      );
    }

    return (
      <details key={key} className="mt-1 text-xs">
        <summary className="cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {t.comparisonExpandEvidence} ({sideLabel}): {evidence.text.slice(0, 160)}…
        </summary>
        {content}
      </details>
    );
  };

  useEffect(() => {
    const updateViewportMode = () => setIsWideViewport(window.innerWidth >= 1200);
    updateViewportMode();
    window.addEventListener('resize', updateViewportMode);
    return () => window.removeEventListener('resize', updateViewportMode);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (wasOpenRef.current) {
        Promise.resolve().then(() =>
          document.querySelector<HTMLButtonElement>('[data-panel-tab-rank="3"]')?.focus()
        );
      }
      wasOpenRef.current = false;
      return;
    }
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onToggle(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    wasOpenRef.current = true;
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onToggle]);

  if (!isOpen) {
    return (
      <SidePanelTab
        rank={3}
        icon={<ArrowLeftRight size={16} className="shrink-0" aria-hidden="true" />}
        label={t.comparisonTitle}
        ariaLabel={t.comparisonOpenPanel}
        ariaExpanded={false}
        onClick={() => onToggle(true)}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm"
      onClick={() => onToggle(false)}
      role="presentation"
    >
      <aside
        id="sql-comparison-panel"
        aria-label={t.comparisonTitle}
        onClick={(event) => event.stopPropagation()}
        className="smart-sql-editor-theme fixed inset-y-0 right-0 z-[60] flex h-full w-full flex-col overflow-hidden border-l border-border bg-card shadow-2xl sm:w-[92vw] sm:max-w-[1100px]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">{t.comparisonTitle}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => onToggle(false)}
            aria-expanded="true"
            aria-controls="sql-comparison-panel"
            title={t.comparisonClosePanel}
            className="flex h-8 w-8 items-center justify-center rounded border border-border bg-card text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight size={16} aria-hidden="true" />
            <span className="sr-only">{t.comparisonClosePanel}</span>
          </button>
        </div>
        <div className="flex-1 space-y-4 scrollbar-thin overflow-y-auto p-4">
          {onRunComparison && (
            <button
              type="button"
              disabled={isRunning}
              onClick={onRunComparison}
              className="rounded border border-border bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRunning ? t.comparisonRunning : t.comparisonRun}
            </button>
          )}
          {isRunning && <p role="status">{t.comparisonRunning}</p>}
          {result && (
            <section
              aria-label={t.comparisonTitle}
              className="space-y-4 border-t border-border pt-4"
            >
              {(isStale || result.status === 'stale') && (
                <p role="status" className="border-l-2 border-warning pl-3 text-sm font-medium">
                  {t.comparisonStale}
                </p>
              )}
              {result.status === 'no_changes' && (
                <div
                  role="status"
                  className="rounded-lg border border-border bg-muted/50 p-3 text-sm"
                >
                  <p className="font-medium text-foreground">{t.comparisonNoChanges}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.comparisonNoChangesDetail}
                  </p>
                </div>
              )}
              {result.status === 'partial' && (
                <p role="status" className="text-sm font-medium">
                  {t.comparisonPartial}
                </p>
              )}
              {result.status === 'failed' && (
                <p role="status" className="text-sm font-medium">
                  {t.comparisonFailed}
                </p>
              )}
              {result.changes.some((change) => change.kind === 'formatting-only') && (
                <p role="status" className="text-sm">
                  {t.comparisonFormattingOnly}
                </p>
              )}
              <section
                aria-label={t.comparisonSummary}
                className="space-y-2 rounded border border-border bg-muted/30 p-3"
              >
                <h3 className="text-sm font-semibold">{t.comparisonSummary}</h3>
                <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">{t.comparisonTextDifferences}</dt>
                    <dd>
                      {result.status === 'no_changes'
                        ? t.comparisonNoTextDifferences
                        : t.comparisonTextDifferencesDetected}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t.comparisonStructuralFindings}</dt>
                    <dd>{result.findings.length || t.comparisonNone}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t.comparisonAnalysisLimitations}</dt>
                    <dd>{result.limitations.length || t.comparisonNone}</dd>
                  </div>
                </dl>
              </section>
              <p className="text-xs text-muted-foreground">{t.comparisonAnalysisOnly}</p>
              <div className="grid grid-cols-2 gap-2 text-xs font-medium text-foreground">
                <p>{t.comparisonBeforeLabel}</p>
                <p>{t.comparisonAfterLabel}</p>
              </div>
              <div className="h-[min(68vh,760px)] min-h-[320px] overflow-hidden rounded border border-border">
                <DiffEditor
                  key={result.snapshot.runId}
                  height="min(68vh, 760px)"
                  language="sql"
                  original={result.snapshot.beforeSql}
                  modified={result.snapshot.afterSql}
                  options={{
                    readOnly: true,
                    originalEditable: false,
                    renderSideBySide: isWideViewport,
                    renderIndicators: true,
                    renderOverviewRuler: true,
                    minimap: { enabled: false },
                    wordWrap: 'on',
                  }}
                  theme={monacoTheme}
                />
              </div>
              {result.changes.length > 0 && (
                <section aria-label={t.comparisonChanges} className="space-y-2">
                  <h3 className="text-sm font-semibold">{t.comparisonChanges}</h3>
                  <ul className="space-y-2">
                    {result.changes.map((change) => (
                      <li key={change.id} className="border-l-2 border-border pl-3 text-sm">
                        <p className="font-medium">{change.summary}</p>
                        {change.support !== 'supported' && (
                          <p className="text-xs text-muted-foreground">{t.comparisonPartial}</p>
                        )}
                        {[...change.beforeEvidence, ...change.afterEvidence].map(
                          (evidence, index) =>
                            renderEvidence(evidence, `${change.id}-evidence-${index}`)
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {result.findings.length > 0 && (
                <section aria-label={t.comparisonFindings} className="space-y-2">
                  <h3 className="text-sm font-semibold">{t.comparisonFindings}</h3>
                  {result.findings.map((finding) => (
                    <article
                      key={finding.id}
                      className="space-y-1 border-l-2 border-warning pl-3 text-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-medium">{finding.title}</h4>
                        <span className="text-xs text-muted-foreground">
                          {t.comparisonSeverity}: {severityLabels[finding.severity]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {finding.origin === 'deterministic'
                            ? t.comparisonDeterministicOrigin
                            : t.comparisonAiOrigin}
                        </span>
                      </div>
                      <p>{finding.description}</p>
                      {finding.potentialImpact && (
                        <p className="text-muted-foreground">
                          {t.comparisonPotentialImpact}: {finding.potentialImpact}
                        </p>
                      )}
                      {finding.recommendation && (
                        <p className="text-muted-foreground">
                          {t.comparisonRecommendation}: {finding.recommendation}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {t.comparisonVerification}:{' '}
                        {valueLabel(
                          {
                            not_verified: t.comparisonNotVerified,
                            recommended: t.comparisonRecommended,
                            verified_by_static_rule: t.comparisonVerifiedByStaticRule,
                          },
                          finding.verificationStatus
                        )}
                      </p>
                      {finding.evidence.map((evidence, index) =>
                        renderEvidence(evidence, `${finding.id}-evidence-${index}`)
                      )}
                    </article>
                  ))}
                </section>
              )}
              <section aria-label={t.comparisonAssessment} className="space-y-2">
                <h3 className="text-sm font-semibold">{t.comparisonAssessment}</h3>
                <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">{t.comparisonEquivalence}</dt>
                    <dd>{valueLabel(equivalenceLabels, result.assessment.equivalence)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t.comparisonExecutionSafety}</dt>
                    <dd>{valueLabel(safetyLabels, result.assessment.executionSafety)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t.comparisonPerformance}</dt>
                    <dd>{valueLabel(performanceLabels, result.assessment.performance)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t.comparisonVerification}</dt>
                    <dd>
                      {result.findings.some(
                        (finding) => finding.verificationStatus === 'verified_by_static_rule'
                      )
                        ? t.comparisonVerifiedByStaticRule
                        : result.findings.some(
                              (finding) => finding.verificationStatus === 'recommended'
                            )
                          ? t.comparisonRecommended
                          : t.comparisonNotVerified}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t.comparisonStaticAnalysis}</dt>
                    <dd>{valueLabel(staticLabels, result.assessment.staticAnalysis)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t.comparisonResultComparison}</dt>
                    <dd>{t.comparisonResultsNotPerformed}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t.comparisonExecutionPlan}</dt>
                    <dd>{t.comparisonPlanNotAvailable}</dd>
                  </div>
                </dl>
              </section>
              {result.limitations.map((limitation, index) => (
                <p key={`limitation-${index}`} className="text-sm text-muted-foreground">
                  {limitationText(limitation)}
                </p>
              ))}
              <section
                aria-label={t.comparisonAiTitle}
                className="space-y-2 border-t border-border pt-4"
              >
                <h3 className="text-sm font-semibold">{t.comparisonAiTitle}</h3>
                {isStale || result.status === 'stale' ? (
                  <p role="status" className="text-sm text-muted-foreground">
                    {t.comparisonAiStale}
                  </p>
                ) : result.status === 'no_changes' ? (
                  <p role="status" className="text-sm text-muted-foreground">
                    {t.comparisonAiNotNeeded}
                  </p>
                ) : result.ai.status === 'skipped' ? (
                  <p role="status" className="text-sm text-muted-foreground">
                    {t.comparisonAiNotRequested}
                  </p>
                ) : result.ai.status === 'pending' ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <p role="status">{t.comparisonAiLoading}</p>
                      {onCancelAi && (
                        <button
                          type="button"
                          onClick={onCancelAi}
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {t.comparisonCancelAi}
                        </button>
                      )}
                    </div>
                    {result.ai.explanation && (
                      <p aria-live="polite" className="whitespace-pre-wrap text-sm">
                        {result.ai.explanation}
                      </p>
                    )}
                  </div>
                ) : result.ai.assessment ? (
                  <div className="space-y-3 text-sm">
                    {result.ai.status === 'partial' && (
                      <p role="status" className="text-muted-foreground">
                        {t.comparisonAiPartial}
                      </p>
                    )}
                    {result.ai.status === 'completed' && (
                      <p role="status" className="text-muted-foreground">
                        {t.comparisonAiCompleted}
                      </p>
                    )}
                    <div>
                      <h4 className="font-medium">{t.comparisonAiSummary}</h4>
                      <p className="whitespace-pre-wrap">{result.ai.assessment.summary}</p>
                    </div>
                    {result.ai.assessment.potentialCorrectnessImpact && (
                      <div>
                        <h4 className="font-medium">{t.comparisonAiCorrectnessImpact}</h4>
                        <p>{result.ai.assessment.potentialCorrectnessImpact}</p>
                      </div>
                    )}
                    {result.ai.assessment.executionSafetyConcerns && (
                      <div>
                        <h4 className="font-medium">{t.comparisonAiSafetyConcerns}</h4>
                        <p>{result.ai.assessment.executionSafetyConcerns}</p>
                      </div>
                    )}
                    {result.ai.assessment.potentialPerformanceImpact && (
                      <div>
                        <h4 className="font-medium">{t.comparisonAiPerformanceImpact}</h4>
                        <p>{result.ai.assessment.potentialPerformanceImpact}</p>
                      </div>
                    )}
                    {(
                      [
                        ['comparisonAiEvidence', result.ai.assessment.evidence],
                        ['comparisonAiAssumptions', result.ai.assessment.assumptions],
                        ['comparisonAiVerification', result.ai.assessment.verificationSteps],
                        ['comparisonAiLimitations', result.ai.assessment.limitations],
                      ] as const
                    ).map(([label, items]) =>
                      items.length ? (
                        <div key={label}>
                          <h4 className="font-medium">{t[label]}</h4>
                          <ul className="list-disc space-y-1 pl-5">
                            {items.map((item, index) => (
                              <li key={`${label}-${index}`}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null
                    )}
                  </div>
                ) : (
                  <p role="status" className="text-sm text-muted-foreground">
                    {result.ai.status === 'unavailable'
                      ? t.comparisonAiUnavailable
                      : result.ai.status === 'malformed'
                        ? t.comparisonAiMalformed
                        : t.comparisonAiFailed}
                  </p>
                )}
                {result.status !== 'no_changes' &&
                  onRequestAi &&
                  !isStale &&
                  result.status !== 'stale' &&
                  ['skipped', 'unavailable', 'malformed', 'failed'].includes(result.ai.status) && (
                    <button
                      type="button"
                      onClick={onRequestAi}
                      className="rounded border border-border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {result.ai.status === 'skipped' ? t.comparisonRequestAi : t.comparisonRetryAi}
                    </button>
                  )}
              </section>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
