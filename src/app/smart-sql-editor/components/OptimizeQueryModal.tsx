'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Volume2,
  Square,
  RefreshCw,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import type {
  SqlOptimizationProposal,
  SqlOptimizationResult,
  SqlSemanticBrief,
  SqlRequirementCandidateResult,
  OptimizationMode,
} from '@/lib/ai/aiService';
import type { SemanticChangeSummary } from '@/lib/sql/optimizeRegression';
import type { DatabaseKnowledgeSource } from '@/lib/ai/databaseAssistant';
import LockedFeatureNotice from '@/components/ui/LockedFeatureNotice';
import { useCapabilityLock } from '@/lib/useCapabilityLock';
import SidePanelTab from '@/app/smart-sql-editor/components/SidePanelTab';

/** Renders the raw streamed JSON as a short "waiting" message until real content has arrived. */
function buildOptimizeProgressMessage(raw: string, waitingLabel: string): string {
  return raw.trim() ? raw : waitingLabel;
}

interface OptimizeQueryModalProps {
  isOpen: boolean;
  /** Backdrop click / X / Escape — aborts an in-flight call but keeps the last result. */
  onClose: () => void;
  /** Opens the panel from the collapsed right-edge tab. */
  onOpen: () => void;

  optimizeMode: OptimizationMode;
  onOptimizeModeChange: (mode: OptimizationMode) => void;

  semanticPhase: 'idle' | 'running' | 'ready' | 'confirmed' | 'error';
  semanticBrief: SqlSemanticBrief | null;
  semanticError: string | null;
  isSemanticDetailExpanded: boolean;
  onToggleSemanticDetail: () => void;
  onConfirmSemanticReview: () => void;
  onCancelSemanticReview: () => void;

  instructionDraft: string;
  onInstructionDraftChange: (value: string) => void;
  onSubmitInstruction: (instruction: string) => void;

  optimizePhase: 'idle' | 'streaming' | 'done' | 'error';
  optimizeStreamRaw: string;
  optimizeError: string | null;
  optimizeResult: SqlOptimizationResult | null;
  structuralWarnings: string[];
  appliedProposalIds: string[];
  expandedProposalIds: Set<string>;
  onToggleProposalExpanded: (proposalId: string) => void;
  onApplyProposal: (proposal: SqlOptimizationProposal) => void;
  onDismissResults: () => void;
  knowledgeSources: DatabaseKnowledgeSource[];

  // Requirement-driven candidate flow (spec 004): a separate mode that may change semantics.
  requirementDraft: string;
  onRequirementDraftChange: (value: string) => void;
  requirementHintedTablesDraft: string;
  onRequirementHintedTablesDraftChange: (value: string) => void;
  onSubmitRequirement: () => void;
  requirementPhase: 'idle' | 'streaming' | 'done' | 'error';
  requirementStreamRaw: string;
  requirementError: string | null;
  requirementResult: SqlRequirementCandidateResult | null;
  requirementChangeSummary: SemanticChangeSummary | null;
  requirementIsStale: boolean;
  onApplyRequirementCandidate: () => void;
  onDiscardRequirementCandidate: () => void;

  speechPhase: 'idle' | 'loading' | 'playing';
  onSpeech: () => void;

  onSessionApply: () => void;
  onSessionDiscard: () => void;
}

/**
 * All optimize-flow content (semantic review, NL instruction, streamed/structured results,
 * per-proposal apply, session-level apply/discard) lives here so the editor below it never
 * shifts layout while an analysis or optimization is running.
 */
export const OptimizeQueryModal: React.FC<OptimizeQueryModalProps> = ({
  isOpen,
  onClose,
  onOpen,
  optimizeMode,
  onOptimizeModeChange,
  semanticPhase,
  semanticBrief,
  semanticError,
  isSemanticDetailExpanded,
  onToggleSemanticDetail,
  onConfirmSemanticReview,
  onCancelSemanticReview,
  instructionDraft,
  onInstructionDraftChange,
  onSubmitInstruction,
  optimizePhase,
  optimizeStreamRaw,
  optimizeError,
  optimizeResult,
  structuralWarnings,
  appliedProposalIds,
  expandedProposalIds,
  onToggleProposalExpanded,
  onApplyProposal,
  onDismissResults,
  knowledgeSources,
  requirementDraft,
  onRequirementDraftChange,
  requirementHintedTablesDraft,
  onRequirementHintedTablesDraftChange,
  onSubmitRequirement,
  requirementPhase,
  requirementStreamRaw,
  requirementError,
  requirementResult,
  requirementChangeSummary,
  requirementIsStale,
  onApplyRequirementCandidate,
  onDiscardRequirementCandidate,
  speechPhase,
  onSpeech,
  onSessionApply,
  onSessionDiscard,
}) => {
  const settings = useAppStore((store) => store.settings);
  const t = getT(settings.locale);

  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [localInstruction, setLocalInstruction] = useState(instructionDraft);

  // A guest sees the locked explanation INSIDE the optimize panel (specs/013 US2 / FR-015):
  // the launcher tab, header and close affordance stay rendered so the lock is discoverable
  // where the AI feature lives — only the body shows the lock instead of a form that would
  // fail on submit (FR-013). Placed after every hook so the Rules of Hooks still hold.
  const optimizeLocked = useCapabilityLock('optimize');

  useEffect(() => setLocalInstruction(instructionDraft), [instructionDraft]);

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // All hooks must run before this early return (Rules of Hooks).
  const handleInstructionSubmit = useCallback(() => {
    onInstructionDraftChange(localInstruction);
    onSubmitInstruction(localInstruction);
  }, [localInstruction, onInstructionDraftChange, onSubmitInstruction]);

  if (!isOpen) {
    // The collapsed launcher must portal into the page's SidePanelRail (rank 0, primary tone) so the
    // Optimize, Explainer and Format-error tabs pack into one column. A hand-rolled `fixed right-0`
    // button here used to sit outside the rail with its own hard-coded offset, so it still overlapped
    // the other launchers — the exact defect the rail exists to remove.
    return (
      <SidePanelTab
        rank={0}
        tone="primary"
        icon={<Sparkles size={16} className="shrink-0" aria-hidden="true" />}
        label={t.analyzeOptimizeButton}
        ariaLabel={t.smartEditorOptimizeModalTitle}
        onClick={onOpen}
      />
    );
  }

  const hasUnappliedProposals =
    (optimizeResult?.proposals.length ?? 0) >
    optimizeResult?.proposals.filter((p) => appliedProposalIds.includes(p.id)).length!;

  return (
    <div
      className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="optimize-query-modal-heading"
        onClick={(event) => event.stopPropagation()}
        className="smart-sql-editor-theme fixed inset-y-0 right-0 z-[60] flex h-full w-full flex-col overflow-hidden border-l border-border bg-card shadow-2xl animate-slide-in-right sm:max-w-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-4">
          <h2
            id="optimize-query-modal-heading"
            className="flex items-center gap-2 text-base font-semibold text-foreground"
          >
            <Sparkles size={16} className="text-primary" />
            {t.smartEditorOptimizeModalTitle}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label={t.smartEditorOptimizeModalClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-3">
          {/* Guest access (specs/013 US2 / FR-013, FR-015): the modal chrome — launcher tab,
              header and close affordance — stays rendered so the lock is discoverable where the
              AI feature lives; only the body is replaced, so a guest never reaches a form that
              would be refused on submit. */}
          {optimizeLocked ? (
            <LockedFeatureNotice t={t} featureName={t.analyzeOptimizeTitle} />
          ) : (
            <>
              {/* Mode toggle (spec 004): the existing safe optimize flow vs the new requirement-driven
               * flow that may change query semantics. Switching modes never clears the other mode's
               * in-progress/result state, so the user can flip back and forth without losing work. */}
              <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
                <button
                  type="button"
                  onClick={() => onOptimizeModeChange('instruction')}
                  aria-pressed={optimizeMode !== 'requirement'}
                  disabled={
                    semanticPhase === 'running' ||
                    optimizePhase === 'streaming' ||
                    requirementPhase === 'streaming'
                  }
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    optimizeMode !== 'requirement'
                      ? 'bg-card text-foreground font-semibold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.smartEditorModeOptimizeLabel}
                </button>
                <button
                  type="button"
                  onClick={() => onOptimizeModeChange('requirement')}
                  aria-pressed={optimizeMode === 'requirement'}
                  disabled={
                    semanticPhase === 'running' ||
                    optimizePhase === 'streaming' ||
                    requirementPhase === 'streaming'
                  }
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    optimizeMode === 'requirement'
                      ? 'bg-card text-foreground font-semibold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.smartEditorModeRequirementLabel}
                </button>
              </div>

              {optimizeMode === 'requirement' ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label
                      htmlFor="requirement-text-input"
                      className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {t.smartEditorRequirementLabel}
                    </label>
                    <textarea
                      id="requirement-text-input"
                      value={requirementDraft}
                      onChange={(event) => onRequirementDraftChange(event.target.value)}
                      placeholder={t.smartEditorRequirementPlaceholder}
                      rows={3}
                      disabled={requirementPhase === 'streaming'}
                      className="w-full resize-none rounded-lg border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:opacity-60"
                    />
                    <label
                      htmlFor="requirement-hinted-tables-input"
                      className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {t.smartEditorRequirementHintedTablesLabel}
                    </label>
                    <input
                      id="requirement-hinted-tables-input"
                      type="text"
                      value={requirementHintedTablesDraft}
                      onChange={(event) => onRequirementHintedTablesDraftChange(event.target.value)}
                      placeholder={t.smartEditorRequirementHintedTablesPlaceholder}
                      disabled={requirementPhase === 'streaming'}
                      className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:opacity-60"
                    />
                    <button
                      onClick={onSubmitRequirement}
                      disabled={requirementPhase === 'streaming'}
                      className="rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t.smartEditorRequirementSubmit}
                    </button>
                  </div>

                  {requirementPhase !== 'idle' && (
                    <div className="rounded-lg border border-border bg-muted/30 p-3 scrollbar-thin">
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                          <Sparkles
                            size={12}
                            className={
                              requirementPhase === 'streaming'
                                ? 'animate-pulse text-primary'
                                : 'text-primary'
                            }
                          />
                          {requirementPhase === 'streaming'
                            ? t.smartEditorRequirementProgressTitle
                            : requirementPhase === 'error'
                              ? t.smartEditorRequirementError
                              : t.smartEditorRequirementResultTitle}
                        </p>
                        {requirementPhase !== 'streaming' && (
                          <button
                            onClick={onDiscardRequirementCandidate}
                            className="text-muted-foreground transition-colors hover:text-foreground"
                            aria-label={t.smartEditorReset}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {requirementPhase === 'streaming' && (
                        <p className="mt-2 max-h-40 overflow-y-auto scrollbar-thin whitespace-pre-wrap text-xs leading-relaxed text-foreground">
                          {buildOptimizeProgressMessage(
                            requirementStreamRaw,
                            t.smartEditorRequirementWaitingLabel
                          )}
                          <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-primary align-middle" />
                        </p>
                      )}

                      {requirementPhase === 'error' && requirementError && (
                        <p className="mt-2 text-xs text-danger">{requirementError}</p>
                      )}

                      {requirementPhase === 'done' && requirementResult && (
                        <div className="mt-2 space-y-2">
                          {requirementIsStale && (
                            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
                              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-warning">
                                <AlertTriangle size={13} />
                                {t.smartEditorRequirementStaleNotice}
                              </p>
                            </div>
                          )}

                          {requirementResult.unresolvedReferences.length > 0 && (
                            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
                              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-warning">
                                <AlertTriangle size={13} />
                                {t.smartEditorRequirementUnresolvedTitle}
                              </p>
                              <p className="mt-1.5 text-xs text-foreground">
                                {t.smartEditorRequirementUnresolvedNote}
                              </p>
                              <ul className="mt-2 space-y-1">
                                {requirementResult.unresolvedReferences.map((ref, index) => (
                                  <li
                                    key={`requirement-unresolved-${index}`}
                                    className="flex items-start gap-2 text-sm leading-relaxed text-foreground"
                                  >
                                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-warning" />
                                    {ref}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {requirementChangeSummary && (
                            <div
                              className={`rounded-lg border p-3 ${
                                requirementChangeSummary.isSemanticChange
                                  ? 'border-danger/40 bg-danger/10'
                                  : 'border-border bg-muted/40'
                              }`}
                            >
                              <p
                                className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${
                                  requirementChangeSummary.isSemanticChange
                                    ? 'text-danger'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {requirementChangeSummary.isSemanticChange && (
                                  <AlertTriangle size={13} />
                                )}
                                {requirementChangeSummary.isSemanticChange
                                  ? t.smartEditorRequirementSemanticChangeTitle
                                  : t.smartEditorRequirementNoSemanticChangeNote}
                              </p>
                              {requirementChangeSummary.isSemanticChange && (
                                <>
                                  <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                                    {t.smartEditorRequirementSemanticChangeNote}
                                  </p>
                                  <ul className="mt-2 space-y-1 text-sm leading-relaxed text-foreground">
                                    {requirementChangeSummary.addedTables.length > 0 && (
                                      <li>
                                        {t.smartEditorRequirementAddedTables.replace(
                                          '{items}',
                                          requirementChangeSummary.addedTables.join(', ')
                                        )}
                                      </li>
                                    )}
                                    {requirementChangeSummary.removedTables.length > 0 && (
                                      <li>
                                        {t.smartEditorRequirementRemovedTables.replace(
                                          '{items}',
                                          requirementChangeSummary.removedTables.join(', ')
                                        )}
                                      </li>
                                    )}
                                    {requirementChangeSummary.addedJoins.length > 0 && (
                                      <li>
                                        {t.smartEditorRequirementAddedJoins.replace(
                                          '{items}',
                                          requirementChangeSummary.addedJoins.join(', ')
                                        )}
                                      </li>
                                    )}
                                    {requirementChangeSummary.removedJoins.length > 0 && (
                                      <li>
                                        {t.smartEditorRequirementRemovedJoins.replace(
                                          '{items}',
                                          requirementChangeSummary.removedJoins.join(', ')
                                        )}
                                      </li>
                                    )}
                                    {requirementChangeSummary.addedColumns.length > 0 && (
                                      <li>
                                        {t.smartEditorRequirementAddedColumns.replace(
                                          '{items}',
                                          requirementChangeSummary.addedColumns.join(', ')
                                        )}
                                      </li>
                                    )}
                                    {requirementChangeSummary.removedColumns.length > 0 && (
                                      <li>
                                        {t.smartEditorRequirementRemovedColumns.replace(
                                          '{items}',
                                          requirementChangeSummary.removedColumns.join(', ')
                                        )}
                                      </li>
                                    )}
                                    {requirementChangeSummary.filterChanged && (
                                      <li>{t.smartEditorRequirementFilterChanged}</li>
                                    )}
                                  </ul>
                                </>
                              )}
                            </div>
                          )}

                          <p className="text-sm leading-relaxed text-foreground">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {t.smartEditorRequirementAnalysisLabel}:{' '}
                            </span>
                            {requirementResult.analysis || t.aiExplainerNoContent}
                          </p>

                          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/50 p-3 font-mono text-[11px] leading-relaxed text-foreground scrollbar-thin">
                            {requirementResult.optimizedSql}
                          </pre>

                          <div className="flex items-center gap-2 border-t border-border pt-3">
                            <button
                              onClick={onApplyRequirementCandidate}
                              disabled={requirementIsStale}
                              className="rounded-md border border-success/50 bg-success/15 px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/25 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {t.smartEditorRequirementApplyButton}
                            </button>
                            <button
                              onClick={onDiscardRequirementCandidate}
                              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                            >
                              {t.smartEditorRequirementDiscardButton}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Natural-language instruction: optional, folded into both the semantic-brief step and
                   * the optimize step as an explicit "must not change semantics" constraint. */}
                  <div className="space-y-2">
                    <label
                      htmlFor="optimize-instruction-input"
                      className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {t.smartEditorInstructionLabel}
                    </label>
                    <textarea
                      id="optimize-instruction-input"
                      value={localInstruction}
                      onChange={(event) => setLocalInstruction(event.target.value)}
                      placeholder={t.smartEditorInstructionPlaceholder}
                      rows={2}
                      disabled={semanticPhase === 'running' || optimizePhase === 'streaming'}
                      className="w-full resize-none rounded-lg border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:opacity-60"
                    />
                    <button
                      onClick={handleInstructionSubmit}
                      disabled={semanticPhase === 'running' || optimizePhase === 'streaming'}
                      className="rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t.smartEditorInstructionSubmit}
                    </button>
                  </div>

                  {/* Step 1: model's own understanding of the query, reviewed before any rewrite runs */}
                  {semanticPhase !== 'idle' && (
                    <div className="rounded-lg border border-border bg-muted/30 p-3 scrollbar-thin">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={onToggleSemanticDetail}
                          disabled={!semanticBrief}
                          aria-expanded={isSemanticDetailExpanded}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs font-semibold uppercase tracking-wide text-warning disabled:cursor-default"
                        >
                          <Sparkles
                            size={12}
                            className={semanticPhase === 'running' ? 'animate-pulse' : ''}
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {semanticPhase === 'running'
                              ? t.smartEditorSemanticAnalyzing
                              : semanticPhase === 'error'
                                ? t.smartEditorOptimizationError
                                : t.smartEditorSemanticReviewTitle}
                          </span>
                          {semanticBrief &&
                            (isSemanticDetailExpanded ? (
                              <ChevronUp size={14} className="flex-shrink-0" />
                            ) : (
                              <ChevronDown size={14} className="flex-shrink-0" />
                            ))}
                        </button>
                        {(semanticPhase === 'ready' || semanticPhase === 'error') && (
                          <button
                            onClick={onCancelSemanticReview}
                            className="text-muted-foreground transition-colors hover:text-foreground"
                            aria-label={t.smartEditorReset}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {semanticPhase === 'error' && semanticError && (
                        <p className="mt-2 text-xs text-danger">{semanticError}</p>
                      )}

                      {(semanticPhase === 'ready' || semanticPhase === 'confirmed') &&
                        semanticBrief &&
                        isSemanticDetailExpanded && (
                          <div className="mt-2 space-y-2">
                            {semanticBrief.structured ? (
                              <>
                                {semanticBrief.purpose && (
                                  <p className="text-sm leading-relaxed text-foreground">
                                    {semanticBrief.purpose}
                                  </p>
                                )}
                                {semanticBrief.relationships.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                      {t.smartEditorSemanticRelationshipsLabel}
                                    </p>
                                    <ul className="mt-1 space-y-1 text-sm text-foreground">
                                      {semanticBrief.relationships.map((rel, index) => (
                                        <li
                                          key={`semantic-rel-${index}`}
                                          className="flex items-start gap-2"
                                        >
                                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-warning" />
                                          <span>
                                            {rel.tables && (
                                              <span className="font-semibold text-warning">
                                                {rel.tables}:{' '}
                                              </span>
                                            )}
                                            {rel.description}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {semanticBrief.criticalFilters.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                      {t.smartEditorSemanticFiltersLabel}
                                    </p>
                                    <ul className="mt-1 space-y-1 text-sm text-foreground">
                                      {semanticBrief.criticalFilters.map((filter, index) => (
                                        <li
                                          key={`semantic-filter-${index}`}
                                          className="flex items-start gap-2"
                                        >
                                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-warning" />
                                          {filter}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {semanticBrief.risks.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                      {t.smartEditorSemanticRisksLabel}
                                    </p>
                                    <ul className="mt-1 space-y-1 text-sm text-foreground">
                                      {semanticBrief.risks.map((risk, index) => (
                                        <li
                                          key={`semantic-risk-${index}`}
                                          className="flex items-start gap-2"
                                        >
                                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-danger" />
                                          {risk}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </>
                            ) : (
                              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/50 p-3 font-mono text-[11px] leading-relaxed text-foreground scrollbar-thin">
                                {semanticBrief.raw}
                              </pre>
                            )}
                          </div>
                        )}

                      {(semanticPhase === 'ready' || semanticPhase === 'confirmed') &&
                        semanticBrief && (
                          <div className="mt-2">
                            {semanticPhase === 'ready' && (
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  onClick={onConfirmSemanticReview}
                                  className="rounded-md border border-warning/60 bg-warning/15 px-3 py-1.5 text-xs font-medium text-warning transition-colors hover:bg-warning/25"
                                >
                                  {t.smartEditorSemanticConfirmButton}
                                </button>
                                <button
                                  onClick={onCancelSemanticReview}
                                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                                >
                                  {t.smartEditorSemanticCancelButton}
                                </button>
                              </div>
                            )}
                            {semanticPhase === 'confirmed' && (
                              <p className="text-xs font-medium text-warning">
                                {t.smartEditorSemanticConfirmedLabel}
                              </p>
                            )}
                          </div>
                        )}
                    </div>
                  )}

                  {/* AI Optimize progress / results — live stream while running, structured summary once done */}
                  {optimizePhase !== 'idle' && (
                    <div className="rounded-lg border border-border bg-muted/30 p-3 scrollbar-thin">
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                          <Sparkles
                            size={12}
                            className={
                              optimizePhase === 'streaming'
                                ? 'animate-pulse text-primary'
                                : 'text-primary'
                            }
                          />
                          {optimizePhase === 'streaming'
                            ? t.smartEditorOptimizeProgressTitle
                            : optimizePhase === 'error'
                              ? t.smartEditorOptimizationError
                              : t.optimizationResultsTitle}
                        </p>
                        {optimizePhase !== 'streaming' && (
                          <div className="flex items-center gap-1">
                            {optimizePhase === 'done' &&
                              optimizeResult &&
                              optimizeResult.structured && (
                                <button
                                  onClick={onSpeech}
                                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-wait disabled:opacity-70"
                                  aria-label={
                                    speechPhase === 'idle'
                                      ? t.smartEditorSpeechPlay
                                      : t.smartEditorSpeechStop
                                  }
                                  title={
                                    speechPhase === 'idle'
                                      ? t.smartEditorSpeechPlay
                                      : t.smartEditorSpeechStop
                                  }
                                >
                                  {speechPhase === 'loading' ? (
                                    <RefreshCw size={12} className="animate-spin" />
                                  ) : speechPhase === 'playing' ? (
                                    <Square size={12} fill="currentColor" />
                                  ) : (
                                    <Volume2 size={14} />
                                  )}
                                  <span className="hidden sm:inline">
                                    {speechPhase === 'idle'
                                      ? t.smartEditorSpeechPlay
                                      : t.smartEditorSpeechStop}
                                  </span>
                                </button>
                              )}
                            <button
                              onClick={onDismissResults}
                              className="text-muted-foreground transition-colors hover:text-foreground"
                              aria-label={t.smartEditorReset}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>

                      {optimizePhase === 'streaming' && (
                        <p className="mt-2 max-h-40 overflow-y-auto scrollbar-thin whitespace-pre-wrap text-xs leading-relaxed text-foreground">
                          {buildOptimizeProgressMessage(
                            optimizeStreamRaw,
                            t.smartEditorOptimizeWaitingLabel
                          )}
                          <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-primary align-middle" />
                        </p>
                      )}

                      {optimizePhase === 'error' && optimizeError && (
                        <p className="mt-2 text-xs text-danger">{optimizeError}</p>
                      )}

                      {optimizePhase === 'done' && optimizeResult && !optimizeResult.structured && (
                        <div className="mt-2 space-y-2">
                          <p className="text-xs leading-relaxed text-warning">
                            {t.smartEditorOptimizeUnstructuredNotice}
                          </p>
                          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/50 p-3 font-mono text-[11px] leading-relaxed text-foreground scrollbar-thin">
                            {optimizeResult.raw}
                          </pre>
                        </div>
                      )}

                      {optimizePhase === 'done' && optimizeResult && optimizeResult.structured && (
                        <div className="mt-2 space-y-2">
                          {structuralWarnings.length > 0 && (
                            <div className="rounded-lg border border-danger/40 bg-danger/10 p-3">
                              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-danger">
                                <AlertTriangle size={13} />
                                {t.smartEditorOptimizeRegressionTitle}
                              </p>
                              <ul className="mt-2 space-y-1">
                                {structuralWarnings.map((warning, index) => (
                                  <li
                                    key={`smart-optimize-regression-${index}`}
                                    className="flex items-start gap-2 text-sm leading-relaxed text-foreground"
                                  >
                                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-danger" />
                                    {warning}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {optimizeResult.instructionStatus &&
                            optimizeResult.instructionStatus !== 'applied' && (
                              <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
                                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-warning">
                                  <AlertTriangle size={13} />
                                  {t.smartEditorInstructionRefusedTitle}
                                </p>
                                <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                                  {optimizeResult.instructionNote ||
                                    t.smartEditorInstructionRefusedNote}
                                </p>
                              </div>
                            )}

                          <p className="text-sm leading-relaxed text-foreground">
                            {optimizeResult.analysis || t.aiExplainerNoContent}
                          </p>
                          {optimizeResult.semanticImpact && (
                            <div className="rounded-lg border border-border bg-muted/40 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {t.smartEditorOptimizeSemanticImpactLabel}
                              </p>
                              <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                                {optimizeResult.semanticImpact}
                              </p>
                            </div>
                          )}
                          {optimizeResult.proposals.length === 0 && (
                            <p className="text-xs italic text-muted-foreground">
                              {t.smartEditorOptimizeNoProposals}
                            </p>
                          )}
                          {optimizeResult.proposals.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {t.smartEditorOptimizeProposalsLabel}
                              </p>
                              {optimizeResult.proposals.map((proposal) => {
                                const isApplied = appliedProposalIds.includes(proposal.id);
                                const isExpanded = expandedProposalIds.has(proposal.id);
                                return (
                                  <div
                                    key={proposal.id}
                                    className="rounded-lg border border-border bg-muted/40 p-3"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <button
                                        type="button"
                                        onClick={() => onToggleProposalExpanded(proposal.id)}
                                        aria-expanded={isExpanded}
                                        className="flex min-w-0 flex-1 items-start gap-2 text-left"
                                      >
                                        {isExpanded ? (
                                          <ChevronUp
                                            size={16}
                                            className="mt-0.5 flex-shrink-0 text-muted-foreground"
                                          />
                                        ) : (
                                          <ChevronDown
                                            size={16}
                                            className="mt-0.5 flex-shrink-0 text-muted-foreground"
                                          />
                                        )}
                                        <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                                          {proposal.issue || t.smartEditorOptimizeProposalsLabel}
                                        </span>
                                      </button>
                                      <button
                                        onClick={() => onApplyProposal(proposal)}
                                        disabled={isApplied}
                                        className="flex-shrink-0 rounded-md border border-primary/50 px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15 disabled:cursor-default disabled:border-success/40 disabled:text-success"
                                      >
                                        {isApplied
                                          ? t.smartEditorOptimizeProposalAppliedLabel
                                          : t.smartEditorOptimizeProposalApply}
                                      </button>
                                    </div>
                                    {isExpanded && (
                                      <div className="mt-2 space-y-1 text-sm leading-relaxed text-foreground">
                                        {proposal.location && (
                                          <p>
                                            <span className="text-muted-foreground">
                                              {t.smartEditorOptimizeProposalLocation}:{' '}
                                            </span>
                                            {proposal.location}
                                          </p>
                                        )}
                                        {proposal.reason && (
                                          <p>
                                            <span className="text-muted-foreground">
                                              {t.smartEditorOptimizeProposalReason}:{' '}
                                            </span>
                                            {proposal.reason}
                                          </p>
                                        )}
                                        {proposal.recommendation && (
                                          <p>
                                            <span className="text-muted-foreground">
                                              {t.smartEditorOptimizeProposalRecommendation}:{' '}
                                            </span>
                                            {proposal.recommendation}
                                          </p>
                                        )}
                                        {proposal.semanticImpact && (
                                          <p>
                                            <span className="text-muted-foreground">
                                              {t.smartEditorOptimizeSemanticImpactLabel}:{' '}
                                            </span>
                                            {proposal.semanticImpact}
                                          </p>
                                        )}
                                        <pre className="mt-2 max-h-28 overflow-auto rounded border border-border bg-muted/60 p-2 text-[11px] leading-relaxed text-foreground scrollbar-thin">
                                          <code>{proposal.find}</code>
                                        </pre>
                                        <pre className="mt-1 max-h-28 overflow-auto rounded border border-primary/40 bg-primary/10 p-2 text-[11px] leading-relaxed text-foreground scrollbar-thin">
                                          <code>{proposal.replace}</code>
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {optimizeResult.suggestions.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {t.performanceNotesLabel}
                              </p>
                              <ul className="mt-1 space-y-1 text-sm text-foreground">
                                {optimizeResult.suggestions.map((suggestion, index) => (
                                  <li
                                    key={`smart-optimize-suggestion-${index}`}
                                    className="flex items-start gap-2"
                                  >
                                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                                    {suggestion}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {knowledgeSources.length > 0 && (
                            <p className="text-[11px] text-muted-foreground">
                              {t.smartEditorOptimizeGroundedIn.replace(
                                '{sources}',
                                Array.from(
                                  new Set(knowledgeSources.map((source) => source.sourceFile))
                                ).join(', ')
                              )}
                            </p>
                          )}

                          {/* Session-level confirmation gate: nothing above ever touches the editor by
                           * itself — the user must explicitly Apply (or Discard) the whole session here,
                           * right next to any regression warnings, before anything lands in the editor. */}
                          <div className="flex items-center gap-2 border-t border-border pt-3">
                            <button
                              onClick={onSessionApply}
                              disabled={!hasUnappliedProposals}
                              className="rounded-md border border-success/50 bg-success/15 px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/25 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {t.smartEditorSessionApplyButton}
                            </button>
                            <button
                              onClick={onSessionDiscard}
                              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                            >
                              {t.smartEditorSessionDiscardButton}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OptimizeQueryModal;
