import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { format } from 'sql-formatter';

import SmartSQLEditorPage from '@/app/smart-sql-editor/page';
import { getT } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import { resetTestStorage } from '../utils/test-setup';

const t = getT('en');

/**
 * Integration test for spec 012 (T007): the format-error panel must mount to the
 * right of the editor whenever `onFormatError` fires. The heavy editor/explainer
 * surfaces are mocked, and the editor mock is driven to emit a format error, so we
 * observe the exact page-level composition that `page.tsx` owns.
 */

/** The editor SQL the mocked editor reports as failing, with the unclosed parenthesis on line 3. */
const ERROR_SQL = 'SELECT a,\n  b\nFROM (';

/** The unclosed parenthesis, so the captured error carries a position the region can anchor to. */
const UNCLOSED_PAREN = ERROR_SQL.indexOf('(');

/**
 * A proposal the formatter does not emit verbatim, so the page's re-format step is observable, and
 * so the guard can refuse it: the model rewrote the whole statement, not just the erroneous line.
 */
const PROPOSED_FIX_SQL = 'select  a,  b from  t;';

/** A one-line-broken query whose fix leaves the statement still unparseable. */
const UNFIXABLE_SQL = 'SELECT a\nFROM (';
const STILL_BROKEN_SQL = 'SELECT a\nFROM )';

/** The bytes that precede the erroneous line, so an apply's containment is stated, not assumed. */
const OUTSIDE_PREFIX = 'SELECT a,\n  b\n';

/** A proposal that corrects the erroneous line and leaves every other byte alone. */
const REGION_ONLY_FIX = `${OUTSIDE_PREFIX}FROM users`;

// The double's inputs, so each test can state the situation it is about.
let errorSql = ERROR_SQL;
let proposalForApply = PROPOSED_FIX_SQL;
/** When true the editor reports a format failure with no position at all. */
let omitLocation = false;

// Capture the editor's props so the test can drive its callbacks directly.
let capturedProps: Record<string, unknown> = {};
// What the page last pushed into the editor through its public API (`apiRef.setSql`).
let editorSql: string | null = null;
// The props the panel mock last received, so a test can observe the page's live editor SQL
// and the region it resolved.
let capturedPanelProps: { currentSql?: string; region?: unknown } = {};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('@/components/AppLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/app/smart-sql-editor/components/SmartSQLEditor', () => ({
  default: (props: Record<string, unknown>) => {
    capturedProps = props;
    // The page hands the editor an apiRef so it can write the SQL back; wire the fake editor's
    // half of that contract so an apply is observable from the page test.
    const apiRef = props.apiRef as
      | { current: { setSql: (sql: string) => void } | null }
      | undefined;
    if (apiRef)
      apiRef.current = {
        setSql: (sql: string) => {
          editorSql = sql;
        },
      };
    return (
      <div data-testid="smart-editor">
        <div data-testid="editor-sql">{editorSql ?? ''}</div>
        <button
          type="button"
          onClick={() => {
            const onFormatError = props.onFormatError as
              | ((e: {
                  message: string;
                  dialect: string;
                  sourceSql: string;
                  severity: string;
                  occurredAt: string;
                  location?: { offset: number; line: number; column: number };
                }) => void)
              | undefined;
            onFormatError?.({
              message: 'Parse error at token: «EOF» at line 1 column 16',
              dialect: 'mysql',
              sourceSql: errorSql,
              severity: 'error',
              occurredAt: '2026-09-23T10:00:00.000Z',
              // Some formatter failures carry no position at all; that is the case the cross-check
              // parser exists for (FR-019).
              location: omitLocation
                ? undefined
                : {
                    offset: errorSql.indexOf('('),
                    line: errorSql.split('\n').length,
                    column: 7,
                  },
            });
          }}
        >
          trigger-format-error
        </button>
      </div>
    );
  },
}));

vi.mock('@/app/smart-sql-editor/components/AiSqlExplainer', () => ({
  default: () => null,
}));

vi.mock('@/app/smart-sql-editor/components/FormatErrorPanel', () => ({
  default: (props: {
    error: { message: string };
    isOpen: boolean;
    currentSql?: string;
    region?: unknown;
    onApplyFix?: (sql: string) => void;
  }) => {
    // The page hands the panel the live editor SQL; recording it lets a test wait until the page
    // state it would guard against has actually settled.
    capturedPanelProps = props;
    return (
      <aside data-testid="format-error-panel" data-open={String(props.isOpen)}>
        {props.error.message}
        <button type="button" onClick={() => props.onApplyFix?.(proposalForApply)}>
          apply-proposed-fix
        </button>
      </aside>
    );
  },
}));

vi.mock('@/lib/ai/formatErrorAi', () => ({
  FormatAiError: class extends Error {},
  requestFormatExplanation: vi.fn(),
  requestFormatFix: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

describe('SmartSQL Editor page — format-error panel composition (spec 012 T007)', () => {
  beforeEach(() => {
    capturedProps = {};
    capturedPanelProps = {};
    editorSql = null;
    errorSql = ERROR_SQL;
    proposalForApply = PROPOSED_FIX_SQL;
    omitLocation = false;
    useAppStore.setState({ settings: { ...useAppStore.getState().settings, locale: 'en' } });
  });

  it('renders the error panel beside the editor after a format error is emitted', async () => {
    render(<SmartSQLEditorPage />);

    // Initial: no panel (no error captured yet).
    expect(screen.queryByTestId('format-error-panel')).not.toBeInTheDocument();

    // Simulate the editor emitting a format error via its onFormatError prop.
    fireEvent.click(screen.getByText('trigger-format-error'));

    await waitFor(() => {
      const panel = screen.getByTestId('format-error-panel');
      expect(panel).toHaveAttribute('data-open', 'true');
      expect(panel).toHaveTextContent('Parse error');
    });
  });

  it('passes the resolved region to the panel', async () => {
    render(<SmartSQLEditorPage />);

    fireEvent.click(screen.getByText('trigger-format-error'));

    // The unclosed parenthesis is on line 3, so the region is that whole line and nothing else.
    await waitFor(() => {
      expect(capturedPanelProps.region).toEqual({
        startOffset: 14,
        endOffset: 20,
        startLine: 3,
        endLine: 3,
        source: 'formatter',
        snippet: 'FROM (',
        anchorOffset: 19,
      });
    });
  });

  it('applies a fix by writing back only the error region', async () => {
    // The model corrects the erroneous line and nothing else, so the fix is inside the region.
    proposalForApply = REGION_ONLY_FIX;
    render(<SmartSQLEditorPage />);
    fireEvent.click(screen.getByText('trigger-format-error'));
    await screen.findByTestId('format-error-panel');
    (capturedProps.onSqlChange as (sql: string) => void)(ERROR_SQL);
    await waitFor(() => {
      expect(capturedPanelProps.currentSql).toBe(ERROR_SQL);
    });
    fireEvent.click(screen.getByText('apply-proposed-fix'));

    // The whole editor value is replaced with the spliced statement, and the bytes before the
    // region are the editor's own: an apply corrects the region, it does not reformat the
    // statement around it (FR-017).
    await waitFor(() => {
      expect(editorSql).toBe(REGION_ONLY_FIX);
    });
    expect(editorSql?.startsWith(OUTSIDE_PREFIX)).toBe(true);
  });

  it('resolves the region from the cross-check parser when the formatter reports no position', async () => {
    omitLocation = true;
    render(<SmartSQLEditorPage />);

    fireEvent.click(screen.getByText('trigger-format-error'));

    // The formatter named no line, so the region can only come from the cross-check parser - and
    // the region must say so, because its source decides how much the user is told about it.
    await waitFor(() => {
      expect(capturedPanelProps.region).toEqual({
        startOffset: 14,
        endOffset: 20,
        startLine: 3,
        endLine: 3,
        source: 'ast-parser',
        snippet: 'FROM (',
        anchorOffset: 20,
      });
    });
  });

  it('never writes a proposal that reaches outside the region', async () => {
    render(<SmartSQLEditorPage />);

    fireEvent.click(screen.getByText('trigger-format-error'));
    await screen.findByTestId('format-error-panel');
    // The editor still holds the SQL the request was made against, so the proposal is not stale.
    // Waiting for the re-render matters: clicking Apply before it lands would make the guard report
    // `stale` and the test would pass without ever reaching the containment rule.
    (capturedProps.onSqlChange as (sql: string) => void)(ERROR_SQL);
    await waitFor(() => {
      expect(capturedPanelProps.currentSql).toBe(ERROR_SQL);
    });
    fireEvent.click(screen.getByText('apply-proposed-fix'));

    // The model rewrote the whole statement, reaching far past the erroneous third line, so the
    // editor must be left exactly as it was.
    expect(screen.getByTestId('editor-sql').textContent).toBe('');
  });

  it('writes nothing when the spliced SQL still fails to format', async () => {
    errorSql = UNFIXABLE_SQL;
    // The model swapped one character inside the region, which the guard accepts — but the spliced
    // statement is still unparseable, so committing it would put broken SQL in the editor.
    proposalForApply = STILL_BROKEN_SQL;
    render(<SmartSQLEditorPage />);

    fireEvent.click(screen.getByText('trigger-format-error'));
    await screen.findByTestId('format-error-panel');
    (capturedProps.onSqlChange as (sql: string) => void)(UNFIXABLE_SQL);
    await waitFor(() => {
      expect(capturedPanelProps.currentSql).toBe(UNFIXABLE_SQL);
    });
    fireEvent.click(screen.getByText('apply-proposed-fix'));

    expect(screen.getByTestId('editor-sql').textContent).toBe('');
  });

  /**
   * Removed at U65 (tdd/test-list.md U64): this baseline asserted that applying a fix replaces the
   * whole editor value with the re-formatted proposal. The revised spec forbids exactly that
   * (FR-017), and the page no longer does it, so the baseline was retired rather than weakened.
   * Its replacement is `never writes a proposal that reaches outside the region` below, plus the
   * guard's own unit tests in `tests/unit/format-fix-scope.test.ts`.
   */
});
