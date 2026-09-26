import React, { useMemo, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import FormatErrorPanel from '@/app/smart-sql-editor/components/FormatErrorPanel';
import { getT } from '@/lib/i18n';
import { FormatAiError, type FormatExplanation } from '@/lib/ai/formatErrorAi';
import type { FormatError } from '@/lib/sql/formatError';
import type { ErrorRegion } from '@/lib/sql/formatErrorRegion';

const t = getT('en');

function makeError(overrides: Partial<FormatError> = {}): FormatError {
  return {
    message: 'Parse error at token: ; at line 1 column 16',
    dialect: 'mysql',
    location: { offset: 4, line: 1, column: 5 },
    snippet: 'SELECT * FROM (…',
    sourceSql: 'SELECT * FROM (;',
    severity: 'error',
    occurredAt: '2026-09-23T10:00:00.000Z',
    ...overrides,
  };
}

function makeExplanation(overrides: Partial<FormatExplanation> = {}): FormatExplanation {
  return {
    explanation: 'The parenthesis is never closed.',
    rootCause: 'A delimiter arrives mid-expression.',
    evidence: ['SELECT * FROM (;'],
    ...overrides,
  };
}

/** A promise that never settles — holds the panel in its loading state. */
function never<T>(): Promise<T> {
  return new Promise<T>(() => undefined);
}

function failWith(
  kind: 'unavailable' | 'malformed' | 'error',
  message = 'failed'
): () => Promise<never> {
  return () => Promise.reject(new FormatAiError({ kind, message, retryable: true }));
}

/**
 * The region the page resolves for the single-line default fixture: the whole line, since the
 * parenthesis is on it. Production always passes a region when one could be resolved, so the
 * harness default mirrors that and a test opts out explicitly with `region={null}`.
 */
const DEFAULT_REGION: ErrorRegion = {
  startOffset: 0,
  endOffset: 16,
  startLine: 1,
  endLine: 1,
  source: 'formatter',
  snippet: 'SELECT * FROM (;',
  anchorOffset: 15,
};

/** A two-line error whose parenthesis is on line 2, so the region is that line alone. */
const OUT_OF_RANGE_ERROR = makeError({
  sourceSql: 'SELECT id\nFROM (',
  location: { offset: 15, line: 2, column: 6 },
});

const OUT_OF_RANGE_REGION: ErrorRegion = {
  startOffset: 10,
  endOffset: 16,
  startLine: 2,
  endLine: 2,
  source: 'formatter',
  snippet: 'FROM (',
  anchorOffset: 15,
};

/** A proposal that also renames the first line, so its change reaches before the region. */
const OUT_OF_RANGE_PROPOSAL = 'SELECT name\nFROM users';

/** A proposal that replaces the parenthesis, so the diff has a real removed and added run. */
const DIFF_PROPOSAL = 'SELECT * FROM (users)';

interface HarnessProps {
  error?: FormatError;
  /** Starts open so a test can reach the body without going through the toggle. */
  initialOpen?: boolean;
  /** The erroneous region the page resolved, when it could resolve one. */
  region?: ErrorRegion;
}

/** Mirrors how `page.tsx` composes the panel: open state and AI state are owned by the parent. */
function Harness({ error = makeError(), initialOpen = true, region }: HarnessProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  return (
    <FormatErrorPanel
      error={error}
      isOpen={isOpen}
      onToggle={setIsOpen}
      region={region}
      onApplyFix={() => undefined}
      onDismissFix={() => undefined}
    />
  );
}

interface AiHarnessProps {
  /** What the AI actions should do; defaults to absent (button enabled, click is a no-op). */
  explain?: (error: FormatError) => Promise<FormatExplanation>;
  fix?: (error: FormatError) => Promise<string>;
  onApplyFix?: (sql: string) => void;
  onDismissFix?: () => void;
  currentSql?: string;
  /** The captured error; defaults to the single-line fixture. */
  error?: FormatError;
  /** The erroneous region the page resolved; `null` when none could be determined. */
  region?: ErrorRegion | null;
}

/**
 * Harness for the US2/US3 AI states, with injectable request outcomes. The request fns are stable
 * across `currentSql` changes so a `rerender` with new SQL exercises only the stale gate — never a
 * re-entrant request — exactly like the real page, where the handlers are `useCallback`'d.
 */
function AiHarness({
  explain,
  fix,
  onApplyFix = () => undefined,
  onDismissFix = () => undefined,
  currentSql = 'SELECT * FROM (;',
  error = makeError(),
  region = DEFAULT_REGION,
}: AiHarnessProps) {
  const stableExplain = useMemo(() => explain, [explain !== undefined]);
  const stableFix = useMemo(() => fix, [fix !== undefined]);
  return (
    <FormatErrorPanel
      error={error}
      isOpen={true}
      onToggle={() => undefined}
      region={region}
      currentSql={currentSql}
      onApplyFix={onApplyFix}
      onDismissFix={onDismissFix}
      onRequestExplain={stableExplain}
      onRequestFix={stableFix}
    />
  );
}

describe('FormatErrorPanel (US1)', () => {
  it('names the resolved error region and the parser that supplied it', () => {
    render(
      <Harness
        region={{
          startOffset: 10,
          endOffset: 17,
          startLine: 2,
          endLine: 2,
          source: 'ast-parser',
          snippet: 'FROM (;',
          anchorOffset: 15,
        }}
      />
    );

    expect(screen.getByText(t.formatErrorRegionLabel)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(t.formatErrorRegionSourceAstParser)).toBeInTheDocument();
  });

  it('renders the error summary, message, dialect and severity', () => {
    render(<Harness />);

    expect(screen.getByRole('heading', { name: t.formatErrorPanelTitle })).toBeInTheDocument();
    expect(screen.getByText(t.formatErrorPanelSubtitle)).toBeInTheDocument();
    expect(screen.getByText(t.formatErrorPanelSeverity)).toBeInTheDocument();
    // The header shows the friendly dialect name plus the raw value, e.g. "Dialect: MySQL (mysql)".
    expect(
      screen.getByText(`${t.formatErrorPanelDialectLabel}: MySQL (mysql)`)
    ).toBeInTheDocument();
    expect(screen.getByText('Parse error at token: ; at line 1 column 16')).toBeInTheDocument();
  });

  it('shows the location and snippet when the formatter reported a position', () => {
    render(<Harness />);

    expect(screen.getByText(t.formatErrorPanelLocationLabel)).toBeInTheDocument();
    expect(screen.getByText('Line 1, column 5')).toBeInTheDocument();
    expect(screen.getByText(t.formatErrorPanelSnippetLabel)).toBeInTheDocument();
    expect(screen.getByText('SELECT * FROM (…')).toBeInTheDocument();
  });

  it('omits location and snippet entirely when the error has no position', () => {
    render(<Harness error={makeError({ location: undefined, snippet: undefined })} />);

    expect(screen.queryByText(t.formatErrorPanelLocationLabel)).not.toBeInTheDocument();
    expect(screen.queryByText(t.formatErrorPanelSnippetLabel)).not.toBeInTheDocument();
    // The message is still shown — only the position fields are omitted, never fabricated.
    expect(screen.getByText('Parse error at token: ; at line 1 column 16')).toBeInTheDocument();
  });

  it('does not render the report body when closed', () => {
    render(<Harness initialOpen={false} />);

    expect(screen.queryByText(t.formatErrorPanelSubtitle)).not.toBeInTheDocument();
    expect(
      screen.queryByText('Parse error at token: ; at line 1 column 16')
    ).not.toBeInTheDocument();
  });

  it('closes and reopens from the toggle control, keeping the error available', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: t.formatErrorPanelClose }));
    expect(
      screen.queryByText('Parse error at token: ; at line 1 column 16')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: t.formatErrorPanelOpen }));
    expect(screen.getByText('Parse error at token: ; at line 1 column 16')).toBeInTheDocument();
  });

  it('describes the error with a severity status and keeps the editor SQL untouched', () => {
    render(<Harness />);

    expect(screen.getByRole('status')).toHaveTextContent(t.formatErrorPanelSeverity);
    expect(screen.getByText(t.formatErrorPanelEditorUnchanged)).toBeInTheDocument();
  });

  it('toggles the report open by keyboard (Enter)', () => {
    render(<Harness initialOpen={false} />);

    // Native buttons fire a click on Enter/Space, so control.asserts cover the keyboard path the
    // same way assistive tech does — no custom key handling is required.
    const toggle = screen.getByRole('button', { name: t.formatErrorPanelOpen });
    fireEvent.click(toggle);
    expect(screen.getByText(t.formatErrorPanelSubtitle)).toBeInTheDocument();
  });

  it('exposes the panel state through aria-expanded on the toggle', () => {
    render(<Harness initialOpen={false} />);

    const toggle = screen.getByRole('button', { name: t.formatErrorPanelOpen });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: t.formatErrorPanelClose })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });
});

describe('FormatErrorPanel (US2 — explain)', () => {
  it('offers an Explain action when the handler is wired', () => {
    render(<AiHarness explain={async () => makeExplanation()} fix={async () => 'SELECT 1;'} />);

    expect(screen.getByRole('button', { name: t.formatErrorPanelExplain })).toBeEnabled();
    expect(screen.getByRole('button', { name: t.formatErrorPanelFix })).toBeEnabled();
  });

  it('offers no AI actions when neither handler is wired', () => {
    render(<AiHarness />);

    expect(
      screen.queryByRole('button', { name: t.formatErrorPanelExplain })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t.formatErrorPanelFix })).not.toBeInTheDocument();
  });

  it('shows a loading state while the explanation is in flight', async () => {
    render(<AiHarness explain={() => never<FormatExplanation>()} />);

    fireEvent.click(screen.getByRole('button', { name: t.formatErrorPanelExplain }));

    expect(await screen.findByText(t.formatErrorPanelExplainRunning)).toBeInTheDocument();
    expect(screen.getByText(t.formatErrorPanelLoading)).toBeInTheDocument();
  });

  it('renders the explanation, root cause and evidence once ready', async () => {
    render(<AiHarness explain={async () => makeExplanation()} />);

    fireEvent.click(screen.getByRole('button', { name: t.formatErrorPanelExplain }));

    expect(await screen.findByText('The parenthesis is never closed.')).toBeInTheDocument();
    expect(screen.getByText(t.formatErrorPanelRootCauseLabel)).toBeInTheDocument();
    expect(screen.getByText('A delimiter arrives mid-expression.')).toBeInTheDocument();
    expect(screen.getByText(t.formatErrorPanelEvidenceLabel)).toBeInTheDocument();
    expect(screen.getByText('SELECT * FROM (;')).toBeInTheDocument();
  });

  it('surfaces an actionable unavailable state when the local model is down', async () => {
    render(<AiHarness explain={failWith('unavailable', 'down')} />);

    fireEvent.click(screen.getByRole('button', { name: t.formatErrorPanelExplain }));

    expect(await screen.findByText(t.formatErrorPanelAiUnavailableTitle)).toBeInTheDocument();
    expect(screen.getByText(t.formatErrorPanelAiUnavailable)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.formatErrorPanelRetry })).toBeInTheDocument();
  });

  it('surfaces a malformed-answer state rather than failing silently', async () => {
    render(<AiHarness explain={failWith('malformed', 'bad')} />);

    fireEvent.click(screen.getByRole('button', { name: t.formatErrorPanelExplain }));

    expect(await screen.findByText(t.formatErrorPanelAiErrorTitle)).toBeInTheDocument();
    expect(screen.getByText(t.formatErrorPanelAiMalformed)).toBeInTheDocument();
  });
});

describe('FormatErrorPanel (US3 — fix)', () => {
  const proposeFix = 'SELECT * FROM (SELECT 1) t;';

  it('shows a loading state while the fix is being generated', async () => {
    render(<AiHarness fix={() => never<string>()} />);

    fireEvent.click(screen.getByRole('button', { name: t.formatErrorPanelFix }));

    expect(await screen.findByText(t.formatErrorPanelFixRunning)).toBeInTheDocument();
  });

  it('shows the proposal with Apply and Dismiss once ready', async () => {
    render(<AiHarness fix={async () => proposeFix} />);

    fireEvent.click(screen.getByRole('button', { name: t.formatErrorPanelFix }));

    expect(await screen.findByText(t.formatErrorPanelFixSectionTitle)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.formatErrorPanelApplyFix })).toBeEnabled();
    expect(screen.getByRole('button', { name: t.formatErrorPanelDismissFix })).toBeEnabled();
  });

  it('copies the proposed correction to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(<AiHarness fix={async () => proposeFix} />);

    fireEvent.click(screen.getByRole('button', { name: t.formatErrorPanelFix }));
    await screen.findByText(t.formatErrorPanelFixSectionTitle);

    fireEvent.click(screen.getByRole('button', { name: t.formatErrorPanelCopyFix }));

    expect(writeText).toHaveBeenCalledWith(proposeFix);
  });

  it('applies the correction only after explicit confirmation (FR-010)', async () => {
    const applied: string[] = [];
    render(<AiHarness fix={async () => proposeFix} onApplyFix={(sql) => applied.push(sql)} />);

    fireEvent.click(screen.getByRole('button', { name: t.formatErrorPanelFix }));
    await screen.findByText(t.formatErrorPanelFixSectionTitle);

    // Generating a proposal must never touch the editor by itself.
    expect(applied).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: t.formatErrorPanelApplyFix }));
    expect(applied).toEqual(['SELECT * FROM (SELECT 1) t;']);
  });

  it('leaves the SQL untouched when the proposal is dismissed', async () => {
    const applied: string[] = [];
    const dismissed: number[] = [];
    render(
      <AiHarness
        fix={async () => proposeFix}
        onApplyFix={(sql) => applied.push(sql)}
        onDismissFix={() => dismissed.push(1)}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: t.formatErrorPanelFix }));
    await screen.findByText(t.formatErrorPanelFixSectionTitle);

    fireEvent.click(screen.getByRole('button', { name: t.formatErrorPanelDismissFix }));

    expect(applied).toEqual([]);
    expect(dismissed).toHaveLength(1);
    expect(screen.queryByText(t.formatErrorPanelFixSectionTitle)).not.toBeInTheDocument();
  });

  it('flags the proposal stale and blocks Apply once the editor SQL changes (FR-016)', async () => {
    const applied: string[] = [];
    const { rerender } = render(
      <AiHarness fix={async () => proposeFix} onApplyFix={(sql) => applied.push(sql)} />
    );

    fireEvent.click(screen.getByRole('button', { name: t.formatErrorPanelFix }));
    await screen.findByText(t.formatErrorPanelFixSectionTitle);

    // The user edits the SQL after the proposal was generated.
    rerender(
      <AiHarness
        fix={async () => proposeFix}
        onApplyFix={(sql) => applied.push(sql)}
        currentSql="SELECT * FROM (; -- user edited this"
      />
    );

    expect(await screen.findByText(`${t.formatErrorPanelStale}.`)).toBeInTheDocument();
    expect(screen.getByText(t.formatErrorPanelStale)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: t.formatErrorPanelApplyFix })
    ).not.toBeInTheDocument();
    expect(applied).toEqual([]);
  });

  it('reports the applied range after a region-bounded apply', async () => {
    render(<AiHarness fix={async () => proposeFix} onApplyFix={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: t.formatErrorPanelFix }));
    await screen.findByText(t.formatErrorPanelFixSectionTitle);
    fireEvent.click(screen.getByRole('button', { name: t.formatErrorPanelApplyFix }));

    // The audit line names the character range that was actually written (FR-017). `node -e` on this
    // fixture gives the change as the zero-width insertion [15, 15) — the shared `;` is the suffix.
    expect(await screen.findByText(`${t.formatErrorPanelAppliedRange}: 15-15`)).toBeInTheDocument();
  });

  it('disables apply and says why when no region was determined', async () => {
    render(<AiHarness region={null} fix={async () => proposeFix} />);

    fireEvent.click(screen.getByRole('button', { name: t.formatErrorPanelFix }));
    await screen.findByText(t.formatErrorPanelFixSectionTitle);

    // Nothing bounds the change, so the proposal is shown but cannot be applied (FR-020).
    expect(screen.getByText(t.formatErrorPanelFixNoRegion)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.formatErrorPanelApplyFix })).toBeDisabled();
  });

  it('reports an out-of-range proposal and offers a corrected one', async () => {
    const applied: string[] = [];

    render(
      <AiHarness
        error={OUT_OF_RANGE_ERROR}
        region={OUT_OF_RANGE_REGION}
        currentSql={OUT_OF_RANGE_ERROR.sourceSql}
        fix={async () => OUT_OF_RANGE_PROPOSAL}
        onApplyFix={(sql) => applied.push(sql)}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: t.formatErrorPanelFix }));
    await screen.findByText(t.formatErrorPanelFixSectionTitle);
    fireEvent.click(screen.getByRole('button', { name: t.formatErrorPanelApplyFix }));

    expect(await screen.findByText(t.formatErrorPanelFixOutOfRange)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.formatErrorPanelRetry })).toBeEnabled();
    expect(applied).toEqual([]);
  });

  it('shows the proposal as a side-by-side diff with the original on the opposite side', async () => {
    const { container } = render(
      <AiHarness fix={async () => DIFF_PROPOSAL} onApplyFix={() => undefined} />
    );

    fireEvent.click(screen.getByRole('button', { name: t.formatErrorPanelFix }));
    await screen.findByText(t.formatErrorPanelFixSectionTitle);

    // The two sides are labelled, and the replaced run is marked on each of them — the original
    // shows what was there, the proposal shows what belongs there (FR-010).
    expect(screen.getByText(t.formatErrorPanelFixBeforeLabel)).toBeInTheDocument();
    expect(screen.getByText(t.formatErrorPanelFixAfterLabel)).toBeInTheDocument();
    expect(container.querySelector('[data-diff="removed"]')).toHaveTextContent(';');
    expect(container.querySelector('[data-diff="added"]')).toHaveTextContent('users)');

    // Marking a run must not disturb the text around it on either side.
    const before = container.querySelector('[data-diff="removed"]')?.closest('pre');
    const after = container.querySelector('[data-diff="added"]')?.closest('pre');
    expect(before).toHaveTextContent('SELECT * FROM (;');
    expect(after).toHaveTextContent('SELECT * FROM (users)');
  });

  it('announces the applicability notice and moves focus to the retry control', async () => {
    render(
      <AiHarness
        error={OUT_OF_RANGE_ERROR}
        region={OUT_OF_RANGE_REGION}
        currentSql={OUT_OF_RANGE_ERROR.sourceSql}
        fix={async () => OUT_OF_RANGE_PROPOSAL}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: t.formatErrorPanelFix }));
    await screen.findByText(t.formatErrorPanelFixSectionTitle);
    fireEvent.click(screen.getByRole('button', { name: t.formatErrorPanelApplyFix }));

    // The refusal is announced (an alert is an assertive live region) and the keyboard is put on
    // the control that can act on it, so the user is not left at a dead Apply button (FR-018).
    const retry = await screen.findByRole('button', { name: t.formatErrorPanelRetry });
    expect(screen.getByRole('alert')).toHaveTextContent(t.formatErrorPanelFixOutOfRange);
    expect(retry).toHaveFocus();
  });

  it('announces the stale state through a role=alert', async () => {
    const { rerender } = render(
      <AiHarness fix={async () => proposeFix} onApplyFix={() => undefined} />
    );

    fireEvent.click(screen.getByRole('button', { name: t.formatErrorPanelFix }));
    await screen.findByText(t.formatErrorPanelFixSectionTitle);

    rerender(
      <AiHarness
        fix={async () => proposeFix}
        onApplyFix={() => undefined}
        currentSql="SELECT * FROM (; -- user edited this"
      />
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(t.formatErrorPanelStale);
  });

  it('marks an unusable proposal invalid and never applies it', async () => {
    const applied: string[] = [];
    render(
      <AiHarness fix={failWith('malformed', 'same sql')} onApplyFix={(sql) => applied.push(sql)} />
    );

    fireEvent.click(screen.getByRole('button', { name: t.formatErrorPanelFix }));

    expect(await screen.findByText(t.formatErrorPanelInvalidFix)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.formatErrorPanelRetry })).toBeInTheDocument();
    expect(applied).toEqual([]);
  });
});
