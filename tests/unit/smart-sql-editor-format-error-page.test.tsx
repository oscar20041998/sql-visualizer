import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

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

// Capture the editor's props so the test can drive its callbacks directly.
let capturedProps: Record<string, unknown> = {};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('@/components/AppLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/app/smart-sql-editor/components/SmartSQLEditor', () => ({
  default: (props: Record<string, unknown>) => {
    capturedProps = props;
    return (
      <div data-testid="smart-editor">
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
                }) => void)
              | undefined;
            onFormatError?.({
              message: 'Parse error at token: «EOF» at line 1 column 16',
              dialect: 'mysql',
              sourceSql: 'SELECT * FROM (',
              severity: 'error',
              occurredAt: '2026-09-23T10:00:00.000Z',
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
  default: ({ error, isOpen }: { error: { message: string }; isOpen: boolean }) => (
    <aside data-testid="format-error-panel" data-open={String(isOpen)}>
      {error.message}
    </aside>
  ),
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
});
