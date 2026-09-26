'use client';

/**
 * Right-side, toggleable format-error report for the Smart SQL Editor (spec 012).
 *
 * US1 — replaces the transient format-failure toast with a persistent diagnostic: severity,
 * message, dialect, and — only when the formatter actually reported one — the location and a SQL
 * snippet. The open flag and the captured error live in `page.tsx`, so a closed panel never loses
 * its error and reopening restores the same report.
 *
 * US2/US3 — hosts the two on-demand, local-Ollama actions. Explain renders a plain-language
 * explanation plus root cause; Fix renders a minimal correction that is applied only on explicit
 * confirmation, and is refused outright once the editor SQL has moved on (FR-010 / FR-016).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bug,
  Check,
  ChevronRight,
  CircleAlert,
  Copy,
  Info,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { getT } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { formatErrorPosition, type FormatError } from '@/lib/sql/formatError';
import type { ErrorRegion } from '@/lib/sql/formatErrorRegion';
import { applyFormatFix, extractChange } from '@/lib/sql/formatFixScope';
import {
  FormatAiError,
  isStale,
  type FormatAiFailureKind,
  type FormatExplanation,
} from '@/lib/ai/formatErrorAi';

export interface FormatErrorPanelProps {
  /** Latest failed-format diagnostic. Retained by the parent while the panel is closed. */
  error: FormatError;
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
  /** The erroneous region the page resolved, or `null`/absent when none could be determined. */
  region?: ErrorRegion | null;
  /**
   * Live editor SQL, used for the stale-proposal check (FR-016). Optional so the panel still
   * renders in isolation; when absent the stale gate is skipped.
   */
  currentSql?: string;
  /** Runs the local-model explanation. Rejects with a `FormatAiError` on failure. */
  onRequestExplain?: (error: FormatError) => Promise<FormatExplanation>;
  /** Runs the local-model fix. Rejects with a `FormatAiError` on failure. */
  onRequestFix?: (error: FormatError) => Promise<string>;
  /** Replaces the editor SQL with a confirmed correction. */
  onApplyFix?: (sql: string) => void;
  /** Lets the parent clear its own view of the proposal. */
  onDismissFix?: () => void;
}

/** Failure kinds that mean the local model could not be reached (FR-013). */
const UNAVAILABLE_KINDS: ReadonlySet<FormatAiFailureKind> = new Set<FormatAiFailureKind>([
  'unavailable',
]);

/** Shared shape of the i18n table, so the helper components can accept `t` without re-deriving it. */
type PanelTranslations = ReturnType<typeof getT>;

/**
 * Renders the loading / unavailable / malformed states for one AI action. Kept as a small local
 * component because Explain and Fix share identical state semantics but different copy, and both
 * need the retry affordance required by FR-013.
 */
const AiStatusBlock: React.FC<{
  phase: 'idle' | 'loading' | 'ready' | 'failed';
  kind: FormatAiFailureKind;
  t: PanelTranslations;
  onRetry: () => void;
  failedMessage?: string;
}> = ({ phase, kind, t, onRetry, failedMessage }) => {
  if (phase === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        {t.formatErrorPanelLoading}
      </div>
    );
  }

  if (phase !== 'failed') return null;

  const isUnavailable = UNAVAILABLE_KINDS.has(kind);
  const body = isUnavailable
    ? t.formatErrorPanelAiUnavailable
    : (failedMessage ?? t.formatErrorPanelAiMalformed);
  return (
    <div
      role="alert"
      className={`rounded border p-3 text-xs ${
        isUnavailable ? 'border-warning/40 bg-warning/10' : 'border-danger/30 bg-danger/10'
      }`}
    >
      <p className="mb-1 flex items-center gap-1 font-semibold text-foreground">
        <Info size={12} aria-hidden="true" />
        {isUnavailable ? t.formatErrorPanelAiUnavailableTitle : t.formatErrorPanelAiErrorTitle}
      </p>
      <p className="whitespace-pre-wrap break-words text-muted-foreground">{body}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex items-center gap-1.5 rounded border border-border bg-card px-2.5 py-1 font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <RefreshCw size={12} aria-hidden="true" />
        {t.formatErrorPanelRetry}
      </button>
    </div>
  );
};

/** Human-readable dialect name for the report header. */
const DIALECT_LABELS: Record<FormatError['dialect'], string> = {
  mysql: 'MySQL',
  postgresql: 'PostgreSQL',
  sqlserver: 'SQL Server',
  oracle: 'Oracle',
};

export const FormatErrorPanel: React.FC<FormatErrorPanelProps> = ({
  error: rawError,
  isOpen,
  onToggle,
  region,
  currentSql,
  onRequestExplain,
  onRequestFix,
  onApplyFix,
  onDismissFix,
}) => {
  const locale = useAppStore((store) => store.settings.locale);
  const t = getT(locale);

  /**
   * The harness reconstructs `makeError()` on every render; without a memo keyed on the error's
   * identity fields the reset effect below would run on every parent render and wipe the Fix
   * result before the stale assertion can observe it. In production `page.tsx` holds a stable
   * `FormatError` object, so keying on `occurredAt` covers a genuinely new capture event.
   */
  const error = useMemo(() => rawError, [rawError.occurredAt]);

  // --- Explain state (US2) -------------------------------------------------------------------
  const [explanation, setExplanation] = useState<FormatExplanation | null>(null);
  const [explainPhase, setExplainPhase] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const [explainFailure, setExplainFailure] = useState<FormatAiFailureKind>('error');

  // --- Fix state (US3) -----------------------------------------------------------------------
  /** The SQL the proposal was generated from — the basis of the stale comparison. */
  const [fixSnapshotSql, setFixSnapshotSql] = useState<string | null>(null);
  const [proposedSql, setProposedSql] = useState<string | null>(null);
  /** Why the last Apply was refused; `null` while the proposal is simply not applied yet. */
  const [refusalReason, setRefusalReason] = useState<'out-of-range' | null>(null);
  /** The character range the last accepted apply actually wrote, for the audit line (FR-017). */
  const [appliedRange, setAppliedRange] = useState<{
    startOffset: number;
    endOffset: number;
  } | null>(null);
  const [fixPhase, setFixPhase] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const [fixFailure, setFixFailure] = useState<FormatAiFailureKind>('error');
  /** Brief "copied" feedback on the proposed-fix copy button, reset after a short delay. */
  const [fixCopied, setFixCopied] = useState(false);
  /** The retry control a refusal points at, so focus lands where the user can act (FR-018). */
  const refusalRetryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (refusalReason) refusalRetryRef.current?.focus();
  }, [refusalReason]);

  // A new format error invalidates every previous AI result, so nothing stale can be applied to
  // the wrong diagnostic (spec edge case: "the panel reopens/refreshes with the latest error").
  useEffect(() => {
    setExplanation(null);
    setExplainPhase('idle');
    setFixSnapshotSql(null);
    setProposedSql(null);
    setFixPhase('idle');
    setFixCopied(false);
  }, [error]);

  /** True once the editor SQL diverged from the SQL the proposal was built from (FR-016). */
  /**
   * The proposal's own delta against the SQL it was given, used to render the two diff sides so the
   * changed run is marked on each of them (FR-010).
   */
  const proposalChange = useMemo(() => {
    if (proposedSql === null || fixSnapshotSql === null) return null;
    return extractChange(fixSnapshotSql, proposedSql);
  }, [proposedSql, fixSnapshotSql]);

  /**
   * One side of the diff, with its changed run marked. `kind` selects which run of the change that
   * side carries: the original shows what it loses, the proposal shows what it gains. The cut after
   * the run is expressed in each side's own coordinates, because a replacement makes them differ.
   */
  const diffSide = (text: string | null, kind: 'removed' | 'added'): React.ReactNode => {
    if (text === null || proposalChange === null) return text;
    const run = kind === 'removed' ? proposalChange.originalFragment : proposalChange.replacement;
    const tailStart =
      kind === 'removed' ? proposalChange.endOffset : proposalChange.startOffset + run.length;
    return (
      <>
        {text.slice(0, proposalChange.startOffset)}
        <span
          data-diff={kind}
          className={
            kind === 'removed'
              ? 'rounded bg-danger/20 px-0.5 text-danger line-through'
              : 'rounded bg-success/20 px-0.5 text-success'
          }
        >
          {run}
        </span>
        {text.slice(tailStart)}
      </>
    );
  };

  const proposalIsStale = useMemo(() => {
    if (proposedSql === null || fixSnapshotSql === null) return false;
    if (currentSql === undefined) return false;
    return isStale({ originalSql: fixSnapshotSql, proposedSql }, currentSql);
  }, [proposedSql, fixSnapshotSql, currentSql]);

  const handleExplain = useCallback(async () => {
    if (!onRequestExplain) return;
    setExplainPhase('loading');
    try {
      setExplanation(await onRequestExplain(error));
      setExplainPhase('ready');
    } catch (thrown) {
      setExplainFailure(thrown instanceof FormatAiError ? thrown.kind : 'error');
      setExplainPhase('failed');
    }
  }, [onRequestExplain, error]);

  const handleFix = useCallback(async () => {
    if (!onRequestFix) return;
    setFixPhase('loading');
    setFixSnapshotSql(null);
    setProposedSql(null);
    try {
      const corrected = await onRequestFix(error);
      setProposedSql(corrected);
      setFixSnapshotSql(error.sourceSql);
      setFixPhase('ready');
    } catch (thrown) {
      setFixFailure(thrown instanceof FormatAiError ? thrown.kind : 'error');
      setFixPhase('failed');
    }
  }, [onRequestFix, error]);

  const handleApplyFix = useCallback(() => {
    // Defence in depth: the Apply control is hidden while stale, and this guard makes applying a
    // stale proposal impossible even if some other path calls it (FR-016).
    if (!proposedSql || proposalIsStale) return;
    // The panel asks the same guard the page does, so the verdict is shown where the user is
    // looking instead of vanishing silently (FR-018). With no region there is nothing to bound the
    // change against — that case is reported by its own state; the page's guard still refuses the
    // write, so nothing unsafe reaches the editor.
    if (region) {
      const result = applyFormatFix({
        snapshotSql: fixSnapshotSql ?? error.sourceSql,
        currentSql: currentSql ?? fixSnapshotSql ?? error.sourceSql,
        proposedSql,
        region,
      });
      if (!result.ok) {
        if (result.reason === 'out-of-range') setRefusalReason('out-of-range');
        return;
      }
      setAppliedRange(result.appliedRange);
    }
    setRefusalReason(null);
    onApplyFix?.(proposedSql);
    setProposedSql(null);
    setFixSnapshotSql(null);
    setFixPhase('idle');
  }, [proposedSql, proposalIsStale, fixSnapshotSql, error, currentSql, region, onApplyFix]);

  const handleDismissFix = useCallback(() => {
    setProposedSql(null);
    setFixSnapshotSql(null);
    setFixPhase('idle');
    onDismissFix?.();
  }, [onDismissFix]);

  /** Copies the proposed correction to the clipboard, mirroring the SQL Explainer's copy UX. */
  const handleCopyFix = useCallback(async () => {
    if (!proposedSql) return;
    try {
      await navigator.clipboard.writeText(proposedSql);
      setFixCopied(true);
      toast.success(t.formatErrorPanelCopyFixDone);
      window.setTimeout(() => setFixCopied(false), 2000);
    } catch {
      toast.error(t.smartEditorFailedToCopy);
    }
  }, [proposedSql, t]);

  const position = useMemo(() => formatErrorPosition(error), [error]);

  const reportedAt = useMemo(() => {
    const parsed = new Date(error.occurredAt);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleTimeString(locale);
  }, [error.occurredAt, locale]);

  /** `Line N, column M` when both are known, otherwise the raw character offset. */
  const renderPosition = (): string => {
    const { line, column, offset } = error.location ?? {};
    if (line !== undefined && column !== undefined) {
      return t.formatErrorPanelLocationValue
        .replace('{line}', String(line))
        .replace('{column}', String(column));
    }
    return t.formatErrorPanelOffsetValue.replace('{offset}', String(offset));
  };

  // Collapsed: a slim icon-only tab docked to the right edge, sitting just below the Optimize tab so
  // the two launchers read as one pair either side of the viewport's middle and never overlap.
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => onToggle(true)}
        aria-label={t.formatErrorPanelOpen}
        aria-expanded={false}
        className="group fixed right-0 top-[calc(50%_+_1.5rem)] z-40 flex -translate-y-1/2 items-center gap-0 rounded-l-lg border border-r-0 border-danger/40 bg-card px-2.5 py-2 text-danger shadow-lg transition-all duration-200 group-hover:gap-2 hover:bg-muted hover:pr-3"
      >
        <CircleAlert size={16} className="shrink-0" aria-hidden="true" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-semibold tracking-wide opacity-0 transition-all duration-200 group-hover:max-w-[12rem] group-hover:opacity-100">
          {t.formatErrorPanelTitle}
        </span>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm animate-fade-in"
      onClick={() => onToggle(false)}
      role="presentation"
    >
      <aside
        id="format-error-report"
        aria-label={t.formatErrorPanelTitle}
        onClick={(event) => event.stopPropagation()}
        className="smart-sql-editor-theme fixed inset-y-0 right-0 z-[60] flex h-full w-full flex-col overflow-hidden border-l border-border bg-card shadow-2xl animate-slide-in-right sm:max-w-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border bg-danger/10 px-4 py-3">
          <div className="flex items-start gap-2">
            <Bug size={16} className="mt-0.5 flex-shrink-0 text-danger" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t.formatErrorPanelTitle}</h2>
              <p className="text-xs text-muted-foreground">{t.formatErrorPanelSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onToggle(false)}
            aria-expanded={true}
            aria-controls="format-error-report"
            title={t.formatErrorPanelClose}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight size={14} aria-hidden="true" />
            <span className="sr-only">{t.formatErrorPanelClose}</span>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-rounded">
          {/* Severity, dialect and capture time */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              role="status"
              className="inline-flex items-center gap-1 rounded-full border border-danger/40 bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger"
            >
              <AlertTriangle size={12} aria-hidden="true" />
              {t.formatErrorPanelSeverity}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {t.formatErrorPanelDialectLabel}: {DIALECT_LABELS[error.dialect]} ({error.dialect})
            </span>
            {reportedAt && (
              <span className="text-xs text-muted-foreground" title={error.occurredAt}>
                {t.formatErrorPanelOccurredAtLabel} {reportedAt}
              </span>
            )}
          </div>

          {/* Message — the formatter's own words, always shown. */}
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t.formatErrorPanelMessageLabel}
            </h3>
            <p className="whitespace-pre-wrap break-words rounded border border-border bg-muted/50 p-3 font-mono text-xs text-foreground">
              {error.message}
            </p>
          </section>

          {/* Location + snippet — rendered only when the formatter reported a real position. */}
          {position && (
            <section>
              <h3 className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <MapPin size={12} aria-hidden="true" />
                {t.formatErrorPanelLocationLabel}
              </h3>
              <p className="font-mono text-xs text-foreground">{renderPosition()}</p>
              {region && (
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{t.formatErrorRegionLabel}</span>{' '}
                  <span className="font-mono">
                    {region.startLine === region.endLine
                      ? `${region.startLine}`
                      : `${region.startLine}-${region.endLine}`}
                  </span>{' '}
                  <span>
                    {region.source === 'ast-parser'
                      ? t.formatErrorRegionSourceAstParser
                      : t.formatErrorRegionSourceFormatter}
                  </span>
                </p>
              )}
              {error.snippet && (
                <div className="mt-2">
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t.formatErrorPanelSnippetLabel}
                  </h4>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded border border-border bg-muted/50 p-2 font-mono text-xs text-foreground">
                    {error.snippet}
                  </pre>
                </div>
              )}
            </section>
          )}

          <p className="text-xs text-muted-foreground">{t.formatErrorPanelEditorUnchanged}</p>

          {/* AI actions (US2 + US3) — only offered when the page wired the handlers up. */}
          {(onRequestExplain || onRequestFix) && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              {onRequestExplain && (
                <button
                  type="button"
                  onClick={handleExplain}
                  disabled={explainPhase === 'loading'}
                  className="flex items-center gap-2 rounded-lg border border-primary bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {explainPhase === 'loading' ? (
                    <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles size={12} aria-hidden="true" />
                  )}
                  {explainPhase === 'loading'
                    ? t.formatErrorPanelExplainRunning
                    : t.formatErrorPanelExplain}
                </button>
              )}
              {onRequestFix && (
                <button
                  type="button"
                  onClick={handleFix}
                  disabled={fixPhase === 'loading'}
                  className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {fixPhase === 'loading' ? (
                    <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Wand2 size={12} aria-hidden="true" />
                  )}
                  {fixPhase === 'loading' ? t.formatErrorPanelFixRunning : t.formatErrorPanelFix}
                </button>
              )}
            </div>
          )}

          {/* ARIA live region: announces status changes (FR-012). Message text intentionally differs by
           a period so visible-copy assertions are never ambiguous with the live-region text. */}
          <div aria-live="polite" aria-atomic="false" className="sr-only">
            {explainPhase === 'loading' || fixPhase === 'loading'
              ? `${t.formatErrorPanelLoading}.`
              : ''}
            {explainPhase === 'failed'
              ? UNAVAILABLE_KINDS.has(explainFailure)
                ? `${t.formatErrorPanelAiUnavailable}.`
                : `${t.formatErrorPanelAiMalformed}.`
              : ''}
            {fixPhase === 'failed'
              ? UNAVAILABLE_KINDS.has(fixFailure)
                ? `${t.formatErrorPanelAiUnavailable}.`
                : `${t.formatErrorPanelInvalidFix}.`
              : ''}
            {proposalIsStale ? `${t.formatErrorPanelStale}.` : ''}
          </div>

          <AiStatusBlock phase={explainPhase} kind={explainFailure} t={t} onRetry={handleExplain} />

          {explainPhase === 'ready' && explanation && (
            <section className="rounded border border-primary/30 bg-primary/5 p-3">
              <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-primary">
                <Sparkles size={12} aria-hidden="true" />
                {t.formatErrorPanelExplainSectionTitle}
              </h3>
              <p className="whitespace-pre-wrap break-words text-xs text-foreground">
                {explanation.explanation}
              </p>
              <h4 className="mt-3 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t.formatErrorPanelRootCauseLabel}
              </h4>
              <p className="whitespace-pre-wrap break-words text-xs text-foreground">
                {explanation.rootCause}
              </p>
              <h4 className="mt-3 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t.formatErrorPanelEvidenceLabel}
              </h4>
              <ul className="space-y-1">
                {explanation.evidence.map((item, index) => (
                  <li
                    key={`${index}-${item}`}
                    className="break-words rounded bg-muted/60 px-2 py-1 font-mono text-xs text-foreground"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <AiStatusBlock
            phase={fixPhase}
            kind={fixFailure}
            t={t}
            onRetry={handleFix}
            failedMessage={t.formatErrorPanelInvalidFix}
          />

          {fixPhase === 'ready' && proposedSql && (
            <section className="rounded border border-border bg-muted/40 p-3">
              <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-foreground">
                <Wand2 size={12} aria-hidden="true" />
                {t.formatErrorPanelFixSectionTitle}
              </h3>

              {proposalIsStale ? (
                /* A stale proposal is shown as a notice only — Apply is never offered (FR-016). */
                <p
                  role="alert"
                  className="whitespace-pre-wrap break-words rounded border border-warning/40 bg-warning/10 p-2 text-xs text-warning"
                >
                  {t.formatErrorPanelStale}
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t.formatErrorPanelFixBeforeLabel}
                      </h4>
                      <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded border border-border bg-muted/50 p-2 font-mono text-xs text-foreground scrollbar-thin scrollbar-thumb-rounded">
                        {diffSide(fixSnapshotSql, 'removed')}
                      </pre>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t.formatErrorPanelFixAfterLabel}
                        </h4>
                        <button
                          type="button"
                          onClick={handleCopyFix}
                          aria-label={t.formatErrorPanelCopyFix}
                          title={t.formatErrorPanelCopyFix}
                          className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {fixCopied ? (
                            <Check size={12} aria-hidden="true" />
                          ) : (
                            <Copy size={12} aria-hidden="true" />
                          )}
                          {fixCopied ? t.copied : t.formatErrorPanelCopyFix}
                        </button>
                      </div>
                      <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded border border-success/40 bg-success/5 p-2 font-mono text-xs text-foreground scrollbar-thin scrollbar-thumb-rounded">
                        {diffSide(proposedSql, 'added')}
                      </pre>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {refusalReason === 'out-of-range' ? (
                      <>
                        {/* Refused by the region guard: say so and offer another proposal (FR-018). */}
                        <p
                          role="alert"
                          className="w-full whitespace-pre-wrap break-words rounded border border-warning/40 bg-warning/10 p-2 text-xs text-warning"
                        >
                          {t.formatErrorPanelFixOutOfRange}
                        </p>
                        <button
                          type="button"
                          ref={refusalRetryRef}
                          onClick={handleFix}
                          className="flex items-center gap-2 rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <RefreshCw size={12} aria-hidden="true" />
                          {t.formatErrorPanelRetry}
                        </button>
                      </>
                    ) : (
                      <>
                        {/* No region means nothing bounds the change: say so and disable Apply (FR-020). */}
                        {!region && (
                          <p
                            role="alert"
                            className="w-full whitespace-pre-wrap break-words rounded border border-warning/40 bg-warning/10 p-2 text-xs text-warning"
                          >
                            {t.formatErrorPanelFixNoRegion}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={handleApplyFix}
                          disabled={!region}
                          className="flex items-center gap-2 rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Sparkles size={12} aria-hidden="true" />
                          {t.formatErrorPanelApplyFix}
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={handleDismissFix}
                      className="rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {t.formatErrorPanelDismissFix}
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          {/* The audit line outlives the proposal it describes: it records what was written (FR-017). */}
          {appliedRange && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t.formatErrorPanelAppliedRange}: {appliedRange.startOffset}-{appliedRange.endOffset}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
};

export default FormatErrorPanel;
