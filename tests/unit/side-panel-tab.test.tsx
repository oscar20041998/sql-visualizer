import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SidePanelTab, { SidePanelRail } from '@/app/smart-sql-editor/components/SidePanelTab';
import { getT } from '@/lib/i18n';
import FormatErrorPanel from '@/app/smart-sql-editor/components/FormatErrorPanel';
import OptimizeQueryModal from '@/app/smart-sql-editor/components/OptimizeQueryModal';
import type { FormatError } from '@/lib/sql/formatError';
import type { SqlOptimizationResult, SqlSemanticBrief } from '@/lib/ai/aiService';

const t = getT('en');

/**
 * The three collapsed panel launchers used to be independent `fixed right-0` buttons sitting
 * 1.5rem apart around the viewport's middle, while each was ~2.25rem tall — so they physically
 * overlapped and swallowed each other's clicks.
 *
 * They now share one rail (SidePanelRail) that packs them by flow. These tests pin the property
 * that matters: every launcher lives inside the rail and is ordered within it, so the rail grows
 * and shrinks with the panels actually present and never leaves a hole for one that isn't.
 */

/** The rail element the launchers are packed into. */
function railElement(): HTMLElement {
  const rail = document.querySelector('[data-side-panel-rail]');
  if (!rail) throw new Error('No rail was mounted');
  return rail as HTMLElement;
}

const ERROR: FormatError = {
  message: 'Parse error at token: ; at line 1 column 16',
  dialect: 'mysql',
  location: { offset: 4, line: 1, column: 5 },
  snippet: 'SELECT * FROM (…',
  sourceSql: 'SELECT * FROM (;',
  severity: 'error',
  occurredAt: '2026-09-23T10:00:00.000Z',
};

describe('SidePanelRail', () => {
  it('packs every launcher into one flex column, so none can overlap', () => {
    render(
      <SidePanelRail>
        <SidePanelTab rank={0} icon={<span />} label="first" onClick={() => undefined} />
        <SidePanelTab rank={1} icon={<span />} label="second" onClick={() => undefined} />
        <SidePanelTab rank={2} icon={<span />} label="third" onClick={() => undefined} />
      </SidePanelRail>
    );

    const rail = railElement();
    // A vertical stack with a fixed gap: spacing now comes from flow, so it cannot be
    // miscalculated against a tab's height the way hard-coded top offsets were.
    expect(rail.className).toContain('flex-col');
    expect(rail.className).toContain('gap-1.5');
    expect(rail.className).toContain('items-end');

    const labels = screen.getAllByRole('button').map((tab) => tab.getAttribute('aria-label'));
    expect(labels).toEqual(['first', 'second', 'third']);
    for (const label of labels) {
      expect(rail.contains(screen.getByRole('button', { name: label! }))).toBe(true);
    }
  });

  it('leaves no gap when a launcher is not rendered', () => {
    // The real case: the Format-error launcher only exists once formatting has failed, so a rail
    // that reserved a slot for it would show a visible hole on every healthy page.
    const { rerender } = render(
      <SidePanelRail>
        <SidePanelTab rank={0} icon={<span />} label="first" onClick={() => undefined} />
        <SidePanelTab rank={2} icon={<span />} label="third" onClick={() => undefined} />
      </SidePanelRail>
    );

    expect(screen.getAllByRole('button')).toHaveLength(2);
    // The two remaining launchers sit adjacent, and the rail holds no empty placeholder child.
    expect(railElement().children).toHaveLength(2);

    rerender(
      <SidePanelRail>
        <SidePanelTab rank={0} icon={<span />} label="first" onClick={() => undefined} />
        <SidePanelTab rank={1} icon={<span />} label="second" onClick={() => undefined} />
        <SidePanelTab rank={2} icon={<span />} label="third" onClick={() => undefined} />
      </SidePanelRail>
    );
    expect(railElement().children).toHaveLength(3);
  });

  it('orders launchers by rank, not by the order they happen to mount in', () => {
    render(
      <SidePanelRail>
        <SidePanelTab rank={2} icon={<span />} label="third" onClick={() => undefined} />
        <SidePanelTab rank={0} icon={<span />} label="first" onClick={() => undefined} />
        <SidePanelTab rank={1} icon={<span />} label="second" onClick={() => undefined} />
      </SidePanelRail>
    );

    // DOM order follows mount order, but `order` drives the visual stack, so the rail always
    // reads top-to-bottom the same way regardless of which panel rendered first.
    const orders = screen
      .getAllByRole('button')
      .map((tab) => tab.style.order)
      .sort();
    expect(orders).toEqual(['0', '1', '2']);
  });

  it('keeps the rail from swallowing clicks on the page behind it', () => {
    render(
      <SidePanelRail>
        <SidePanelTab rank={0} icon={<span />} label="Optimize" onClick={() => undefined} />
      </SidePanelRail>
    );

    // The rail is a transparent box over the editor, so only the tabs take pointer events.
    expect(railElement().className).toContain('pointer-events-none');
    expect(screen.getByRole('button', { name: 'Optimize' }).className).toContain(
      'pointer-events-auto'
    );
  });
});

describe('SidePanelTab', () => {
  it('exposes a stable accessible name, tooltip and collapsed state', () => {
    render(
      <SidePanelRail>
        <SidePanelTab
          rank={1}
          icon={<span />}
          label="Visible label"
          ariaLabel="Open the panel"
          ariaExpanded={false}
          onClick={() => undefined}
        />
      </SidePanelRail>
    );

    const tab = screen.getByRole('button', { name: 'Open the panel' });
    expect(tab).toHaveAttribute('aria-expanded', 'false');
    // The label is revealed on hover, so it must also be reachable without hovering.
    expect(tab).toHaveAttribute('title', 'Visible label');
  });

  it('activates the panel it launches and stays keyboard reachable', () => {
    const onClick = vi.fn();
    render(
      <SidePanelRail>
        <SidePanelTab rank={0} icon={<span />} label="Optimize" onClick={onClick} />
      </SidePanelRail>
    );

    const tab = screen.getByRole('button', { name: 'Optimize' });
    fireEvent.click(tab);
    expect(onClick).toHaveBeenCalledTimes(1);

    // A fixed, icon-only control still needs a visible focus indicator.
    expect(tab.className).toContain('focus-visible:ring-2');
    tab.focus();
    expect(tab).toHaveFocus();
  });
});

/**
 * The Optimize panel needs its full prop set before it reaches the collapsed branch, so its
 * launcher is rendered through the real component rather than a stand-in.
 */
function renderOptimizeLauncher(onOpen: () => void, extra?: React.ReactNode) {
  return render(
    <SidePanelRail>
      <OptimizeQueryModal
        isOpen={false}
        onClose={() => undefined}
        onOpen={onOpen}
        optimizeMode="instruction"
        onOptimizeModeChange={() => undefined}
        semanticPhase="idle"
        semanticBrief={null as SqlSemanticBrief | null}
        semanticError={null}
        isSemanticDetailExpanded={false}
        onToggleSemanticDetail={() => undefined}
        onConfirmSemanticReview={() => undefined}
        onCancelSemanticReview={() => undefined}
        instructionDraft=""
        onInstructionDraftChange={() => undefined}
        onSubmitInstruction={() => undefined}
        optimizePhase="idle"
        optimizeStreamRaw=""
        optimizeError={null}
        optimizeResult={null as SqlOptimizationResult | null}
        structuralWarnings={[]}
        appliedProposalIds={[]}
        expandedProposalIds={new Set<string>()}
        onToggleProposalExpanded={() => undefined}
        onApplyProposal={() => undefined}
        onDismissResults={() => undefined}
        knowledgeSources={[]}
        requirementDraft=""
        onRequirementDraftChange={() => undefined}
        requirementHintedTablesDraft=""
        onRequirementHintedTablesDraftChange={() => undefined}
        onSubmitRequirement={() => undefined}
        requirementPhase="idle"
        requirementStreamRaw=""
        requirementError={null}
        requirementResult={null}
        requirementChangeSummary={null}
        requirementIsStale={false}
        onApplyRequirementCandidate={() => undefined}
        onDiscardRequirementCandidate={() => undefined}
        speechPhase="idle"
        onSpeech={() => undefined}
        onSessionApply={() => undefined}
        onSessionDiscard={() => undefined}
      />
      {extra}
    </SidePanelRail>
  );
}

describe('the real panel launchers', () => {
  it('pack the Optimize and Format-error launchers into the one rail', () => {
    const onOpen = vi.fn();
    // Both launchers at once, in one rail: these are the two that used to sit 1.5rem apart while
    // each was ~2.25rem tall, overlapping. Sharing one flex column makes overlap structurally
    // impossible rather than merely unlikely.
    renderOptimizeLauncher(
      onOpen,
      <FormatErrorPanel
        error={ERROR}
        isOpen={false}
        onToggle={() => undefined}
        region={null}
        currentSql={ERROR.sourceSql}
        onRequestExplain={() => Promise.reject(new Error('stub'))}
        onRequestFix={() => Promise.reject(new Error('stub'))}
        onApplyFix={() => undefined}
        onDismissFix={() => undefined}
      />
    );
    const optimizeTab = screen.getByRole('button', { name: t.smartEditorOptimizeModalTitle });
    const formatErrorTab = screen.getByRole('button', { name: t.formatErrorPanelOpen });

    // The rail swap must not break the action the launcher exists for.
    fireEvent.click(optimizeTab);
    expect(onOpen).toHaveBeenCalledTimes(1);

    const rail = railElement();
    expect(rail.contains(optimizeTab)).toBe(true);
    expect(rail.contains(formatErrorTab)).toBe(true);
    // Two children only — no reserved slot sits empty between them.
    expect(rail.children).toHaveLength(2);
    // Ranks 0 and 2, so they read top-to-bottom in a fixed order.
    expect(optimizeTab.style.order).toBe('0');
    expect(formatErrorTab.style.order).toBe('2');
  });
});
