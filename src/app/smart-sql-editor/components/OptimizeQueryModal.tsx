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
} from '@/lib/ai/aiService';
import type { DatabaseKnowledgeSource } from '@/lib/ai/databaseAssistant';

/** Renders the raw streamed JSON as a short "waiting" message until real content has arrived. */
function buildOptimizeProgressMessage(raw: string, waitingLabel: string): string {
  return raw.trim() ? raw : waitingLabel;
}

interface OptimizeQueryModalProps {
  isOpen: boolean;
  /** Backdrop click / X / Escape — aborts an in-flight call but keeps the last result. */
  onClose: () => void;

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
  speechPhase,
  onSpeech,
  onSessionApply,
  onSessionDiscard,
}) => {
  const settings = useAppStore((store) => store.settings);
  const t = getT(settings.locale);

  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [localInstruction, setLocalInstruction] = useState(instructionDraft);

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

  if (!isOpen) return null;

  const hasUnappliedProposals =
    (optimizeResult?.proposals.length ?? 0) >
    optimizeResult?.proposals.filter((p) => appliedProposalIds.includes(p.id)).length!;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="optimize-query-modal-heading"
        onClick={(event) => event.stopPropagation()}
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl animate-slide-up"
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-800 px-5 py-4">
          <h2 id="optimize-query-modal-heading" className="flex items-center gap-2 text-sm font-semibold text-gray-100">
            <Sparkles size={14} className="text-indigo-300" />
            {t.smartEditorOptimizeModalTitle}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label={t.smartEditorOptimizeModalClose}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-3">
          {/* Natural-language instruction: optional, folded into both the semantic-brief step and
           * the optimize step as an explicit "must not change semantics" constraint. */}
          <div className="space-y-2">
            <label htmlFor="optimize-instruction-input" className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {t.smartEditorInstructionLabel}
            </label>
            <textarea
              id="optimize-instruction-input"
              value={localInstruction}
              onChange={(event) => setLocalInstruction(event.target.value)}
              placeholder={t.smartEditorInstructionPlaceholder}
              rows={2}
              disabled={semanticPhase === 'running' || optimizePhase === 'streaming'}
              className="w-full resize-none rounded-lg border border-gray-800 bg-gray-950 p-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
            />
            <button
              onClick={handleInstructionSubmit}
              disabled={semanticPhase === 'running' || optimizePhase === 'streaming'}
              className="rounded-md border border-indigo-500/60 bg-indigo-500/15 px-3 py-1.5 text-xs font-medium text-indigo-200 transition-colors hover:bg-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.smartEditorInstructionSubmit}
            </button>
          </div>

          {/* Step 1: model's own understanding of the query, reviewed before any rewrite runs */}
          {semanticPhase !== 'idle' && (
            <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-3 scrollbar-thin">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={onToggleSemanticDetail}
                  disabled={!semanticBrief}
                  aria-expanded={isSemanticDetailExpanded}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs font-semibold uppercase tracking-wide text-amber-300 disabled:cursor-default"
                >
                  <Sparkles size={12} className={semanticPhase === 'running' ? 'animate-pulse' : ''} />
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
                    className="text-gray-500 transition-colors hover:text-gray-300"
                    aria-label={t.smartEditorReset}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {semanticPhase === 'error' && semanticError && (
                <p className="mt-2 text-xs text-red-300">{semanticError}</p>
              )}

              {(semanticPhase === 'ready' || semanticPhase === 'confirmed') && semanticBrief && isSemanticDetailExpanded && (
                <div className="mt-2 space-y-2">
                  {semanticBrief.structured ? (
                    <>
                      {semanticBrief.purpose && (
                        <p className="text-sm leading-relaxed text-gray-200">{semanticBrief.purpose}</p>
                      )}
                      {semanticBrief.relationships.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            {t.smartEditorSemanticRelationshipsLabel}
                          </p>
                          <ul className="mt-1 space-y-1 text-sm text-gray-200">
                            {semanticBrief.relationships.map((rel, index) => (
                              <li key={`semantic-rel-${index}`} className="flex items-start gap-2">
                                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                                <span>
                                  {rel.tables && <span className="font-semibold text-amber-200">{rel.tables}: </span>}
                                  {rel.description}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {semanticBrief.criticalFilters.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            {t.smartEditorSemanticFiltersLabel}
                          </p>
                          <ul className="mt-1 space-y-1 text-sm text-gray-200">
                            {semanticBrief.criticalFilters.map((filter, index) => (
                              <li key={`semantic-filter-${index}`} className="flex items-start gap-2">
                                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                                {filter}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {semanticBrief.risks.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            {t.smartEditorSemanticRisksLabel}
                          </p>
                          <ul className="mt-1 space-y-1 text-sm text-gray-200">
                            {semanticBrief.risks.map((risk, index) => (
                              <li key={`semantic-risk-${index}`} className="flex items-start gap-2">
                                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
                                {risk}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-gray-800 bg-gray-950 p-3 font-mono text-[11px] leading-relaxed text-gray-300 scrollbar-thin">
                      {semanticBrief.raw}
                    </pre>
                  )}
                </div>
              )}

              {(semanticPhase === 'ready' || semanticPhase === 'confirmed') && semanticBrief && (
                <div className="mt-2">
                  {semanticPhase === 'ready' && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={onConfirmSemanticReview}
                        className="rounded-md border border-amber-500/60 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/25"
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
                    <p className="text-xs font-medium text-amber-300/80">{t.smartEditorSemanticConfirmedLabel}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* AI Optimize progress / results — live stream while running, structured summary once done */}
          {optimizePhase !== 'idle' && (
            <div className="rounded-lg border border-indigo-800/40 bg-indigo-950/20 p-3 scrollbar-thin">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-300">
                  <Sparkles size={12} className={optimizePhase === 'streaming' ? 'animate-pulse' : ''} />
                  {optimizePhase === 'streaming'
                    ? t.smartEditorOptimizeProgressTitle
                    : optimizePhase === 'error'
                      ? t.smartEditorOptimizationError
                      : t.optimizationResultsTitle}
                </p>
                {optimizePhase !== 'streaming' && (
                  <div className="flex items-center gap-1">
                    {optimizePhase === 'done' && optimizeResult && optimizeResult.structured && (
                      <button
                        onClick={onSpeech}
                        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-indigo-300 transition-colors hover:bg-indigo-400/10 hover:text-indigo-200 disabled:cursor-wait disabled:opacity-70"
                        aria-label={speechPhase === 'idle' ? t.smartEditorSpeechPlay : t.smartEditorSpeechStop}
                        title={speechPhase === 'idle' ? t.smartEditorSpeechPlay : t.smartEditorSpeechStop}
                      >
                        {speechPhase === 'loading' ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : speechPhase === 'playing' ? (
                          <Square size={12} fill="currentColor" />
                        ) : (
                          <Volume2 size={14} />
                        )}
                        <span className="hidden sm:inline">
                          {speechPhase === 'idle' ? t.smartEditorSpeechPlay : t.smartEditorSpeechStop}
                        </span>
                      </button>
                    )}
                    <button
                      onClick={onDismissResults}
                      className="text-gray-500 transition-colors hover:text-gray-300"
                      aria-label={t.smartEditorReset}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {optimizePhase === 'streaming' && (
                <p className="mt-2 max-h-40 overflow-y-auto scrollbar-thin whitespace-pre-wrap text-xs leading-relaxed text-gray-300">
                  {buildOptimizeProgressMessage(optimizeStreamRaw, t.smartEditorOptimizeWaitingLabel)}
                  <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-indigo-400 align-middle" />
                </p>
              )}

              {optimizePhase === 'error' && optimizeError && (
                <p className="mt-2 text-xs text-red-300">{optimizeError}</p>
              )}

              {optimizePhase === 'done' && optimizeResult && !optimizeResult.structured && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs leading-relaxed text-yellow-300/90">
                    {t.smartEditorOptimizeUnstructuredNotice}
                  </p>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-gray-800 bg-gray-950 p-3 font-mono text-[11px] leading-relaxed text-gray-300 scrollbar-thin">
                    {optimizeResult.raw}
                  </pre>
                </div>
              )}

              {optimizePhase === 'done' && optimizeResult && optimizeResult.structured && (
                <div className="mt-2 space-y-2">
                  {structuralWarnings.length > 0 && (
                    <div className="rounded-lg border border-red-800/60 bg-red-950/30 p-3">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-red-300">
                        <AlertTriangle size={13} />
                        {t.smartEditorOptimizeRegressionTitle}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {structuralWarnings.map((warning, index) => (
                          <li
                            key={`smart-optimize-regression-${index}`}
                            className="flex items-start gap-2 text-sm leading-relaxed text-red-200"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {optimizeResult.instructionStatus && optimizeResult.instructionStatus !== 'applied' && (
                    <div className="rounded-lg border border-yellow-800/60 bg-yellow-950/20 p-3">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-yellow-300">
                        <AlertTriangle size={13} />
                        {t.smartEditorInstructionRefusedTitle}
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-yellow-100">
                        {optimizeResult.instructionNote || t.smartEditorInstructionRefusedNote}
                      </p>
                    </div>
                  )}

                  <p className="text-sm leading-relaxed text-gray-200">
                    {optimizeResult.analysis || t.aiExplainerNoContent}
                  </p>
                  {optimizeResult.semanticImpact && (
                    <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {t.smartEditorOptimizeSemanticImpactLabel}
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-gray-200">
                        {optimizeResult.semanticImpact}
                      </p>
                    </div>
                  )}
                  {optimizeResult.proposals.length === 0 && (
                    <p className="text-xs italic text-gray-400">{t.smartEditorOptimizeNoProposals}</p>
                  )}
                  {optimizeResult.proposals.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {t.smartEditorOptimizeProposalsLabel}
                      </p>
                      {optimizeResult.proposals.map((proposal) => {
                        const isApplied = appliedProposalIds.includes(proposal.id);
                        const isExpanded = expandedProposalIds.has(proposal.id);
                        return (
                          <div key={proposal.id} className="rounded-lg border border-indigo-800/50 bg-gray-900/60 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <button
                                type="button"
                                onClick={() => onToggleProposalExpanded(proposal.id)}
                                aria-expanded={isExpanded}
                                className="flex min-w-0 flex-1 items-start gap-2 text-left"
                              >
                                {isExpanded ? (
                                  <ChevronUp size={16} className="mt-0.5 flex-shrink-0 text-indigo-300" />
                                ) : (
                                  <ChevronDown size={16} className="mt-0.5 flex-shrink-0 text-indigo-300" />
                                )}
                                <span className="min-w-0 truncate text-sm font-semibold text-indigo-200">
                                  {proposal.issue || t.smartEditorOptimizeProposalsLabel}
                                </span>
                              </button>
                              <button
                                onClick={() => onApplyProposal(proposal)}
                                disabled={isApplied}
                                className="flex-shrink-0 rounded-md border border-indigo-500/50 px-2 py-1 text-xs font-medium text-indigo-200 transition-colors hover:bg-indigo-500/15 disabled:cursor-default disabled:border-success/40 disabled:text-success"
                              >
                                {isApplied ? t.smartEditorOptimizeProposalAppliedLabel : t.smartEditorOptimizeProposalApply}
                              </button>
                            </div>
                            {isExpanded && (
                              <div className="mt-2 space-y-1 text-sm leading-relaxed text-gray-200">
                                {proposal.location && <p><span className="text-gray-400">{t.smartEditorOptimizeProposalLocation}: </span>{proposal.location}</p>}
                                {proposal.reason && <p><span className="text-gray-400">{t.smartEditorOptimizeProposalReason}: </span>{proposal.reason}</p>}
                                {proposal.recommendation && <p><span className="text-gray-400">{t.smartEditorOptimizeProposalRecommendation}: </span>{proposal.recommendation}</p>}
                                {proposal.semanticImpact && <p><span className="text-gray-400">{t.smartEditorOptimizeSemanticImpactLabel}: </span>{proposal.semanticImpact}</p>}
                                <pre className="mt-2 max-h-28 overflow-auto rounded border border-gray-800 bg-gray-950 p-2 text-[11px] leading-relaxed text-gray-300 scrollbar-thin">
                                  <code>{proposal.find}</code>
                                </pre>
                                <pre className="mt-1 max-h-28 overflow-auto rounded border border-indigo-900/50 bg-indigo-950/20 p-2 text-[11px] leading-relaxed text-indigo-100 scrollbar-thin">
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
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {t.performanceNotesLabel}
                      </p>
                      <ul className="mt-1 space-y-1 text-sm text-gray-200">
                        {optimizeResult.suggestions.map((suggestion, index) => (
                          <li key={`smart-optimize-suggestion-${index}`} className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {knowledgeSources.length > 0 && (
                    <p className="text-[11px] text-gray-500">
                      {t.smartEditorOptimizeGroundedIn.replace(
                        '{sources}',
                        Array.from(new Set(knowledgeSources.map((source) => source.sourceFile))).join(', ')
                      )}
                    </p>
                  )}

                  {/* Session-level confirmation gate: nothing above ever touches the editor by
                   * itself — the user must explicitly Apply (or Discard) the whole session here,
                   * right next to any regression warnings, before anything lands in the editor. */}
                  <div className="flex items-center gap-2 border-t border-gray-800 pt-3">
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
        </div>
      </div>
    </div>
  );
};

export default OptimizeQueryModal;
