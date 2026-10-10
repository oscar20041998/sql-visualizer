import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import SqlComparisonPanel from '@/app/smart-sql-editor/components/SqlComparisonPanel';
import { SidePanelRail } from '@/app/smart-sql-editor/components/SidePanelTab';
import { useAppStore } from '@/lib/store';
import type { ComparisonResult } from '@/lib/sql/sqlComparison';
import { LIMITATION_EMPTY_STATEMENT } from '@/lib/sql/sqlComparison';

vi.mock('@monaco-editor/react', () => ({
  DiffEditor: ({
    original,
    modified,
    theme,
    height,
    options,
  }: {
    original: string;
    modified: string;
    theme: string;
    height: string;
    options: { renderSideBySide?: boolean; renderIndicators?: boolean };
  }) => (
    <div
      data-testid="sql-diff"
      data-original={original}
      data-modified={modified}
      data-monaco-theme={theme}
      data-height={height}
      data-render-side-by-side={String(options.renderSideBySide)}
      data-render-indicators={String(options.renderIndicators)}
    />
  ),
}));

const RESULT: ComparisonResult = {
  snapshot: {
    runId: 'run-1',
    beforeSql: 'SELECT id FROM orders WHERE active = 1;',
    afterSql: 'SELECT id FROM orders;',
    dialect: 'postgresql',
    startedAt: '2026-10-09T12:00:00.000Z',
  },
  status: 'completed',
  changes: [
    {
      id: 'filter-1',
      kind: 'filter',
      summary: 'WHERE clause changed.',
      beforeValue: 'WHERE active = 1',
      afterValue: null,
      beforeEvidence: [{ side: 'before', text: 'WHERE active = 1' }],
      afterEvidence: [],
      support: 'supported',
    },
  ],
  findings: [
    {
      id: 'finding-1',
      origin: 'deterministic',
      category: 'filter',
      severity: 'warning',
      title: 'WHERE clause changed.',
      description:
        'Static analysis detected this change; its runtime effect has not been verified.',
      evidence: [{ side: 'before', text: 'WHERE active = 1' }],
      recommendation: 'Review the changed SQL.',
      verificationStatus: 'recommended',
    },
  ],
  assessment: {
    equivalence: 'inconclusive',
    executionSafety: 'review_required',
    performance: 'not_verified',
    staticAnalysis: 'completed',
    resultComparison: 'not_performed',
    executionPlan: 'not_available',
    limitations: [],
  },
  limitations: [],
  ai: { status: 'skipped', explanation: null, assessment: null },
};

function Harness({
  isStale = false,
  aiStatus = 'skipped',
  onRequestAi = vi.fn(),
}: {
  isStale?: boolean;
  aiStatus?: ComparisonResult['ai']['status'];
  onRequestAi?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const onRunComparison = vi.fn();
  return (
    <SidePanelRail>
      <SqlComparisonPanel
        locale="en"
        isOpen={isOpen}
        onToggle={setIsOpen}
        result={{ ...RESULT, ai: { status: aiStatus, explanation: null, assessment: null } }}
        isStale={isStale}
        isRunning={false}
        onRunComparison={onRunComparison}
        onRequestAi={onRequestAi}
        onCancelAi={vi.fn()}
      />
    </SidePanelRail>
  );
}

describe('SQL comparison result panel', () => {
  it('labels both diff panes as Before and After', () => {
    render(<SqlComparisonPanel locale="en" isOpen onToggle={vi.fn()} result={RESULT} />);

    expect(screen.getByText('Before (Original)')).toBeInTheDocument();
    expect(screen.getByText('After (Modified)')).toBeInTheDocument();
  });

  it('renders comparison summary categories before detailed findings', () => {
    const result: ComparisonResult = {
      ...RESULT,
      status: 'partial',
      limitations: ['Parser coverage is limited for this construct.'],
    };
    const { rerender } = render(
      <SqlComparisonPanel locale="en" isOpen onToggle={vi.fn()} result={result} />
    );

    const summary = screen.getByRole('region', { name: 'Comparison summary' });
    const findings = screen.getByRole('region', { name: 'Review findings' });
    expect(summary).toHaveTextContent('Text differences');
    expect(summary).toHaveTextContent('Detected');
    expect(summary).toHaveTextContent('Structural findings');
    expect(summary).toHaveTextContent('Analysis limitations');
    expect(
      summary.compareDocumentPosition(findings) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    rerender(
      <SqlComparisonPanel
        locale="en"
        isOpen
        onToggle={vi.fn()}
        result={{ ...result, status: 'no_changes', changes: [], findings: [], limitations: [] }}
      />
    );
    const noChangeSummary = screen.getByRole('region', { name: 'Comparison summary' });
    expect(noChangeSummary).toHaveTextContent('Text differences');
    expect(noChangeSummary).toHaveTextContent('None');
  });

  it('uses a viewport-sized diff with inline mode on narrow and side-by-side mode on wide screens', () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    try {
      const { getByTestId } = render(
        <SqlComparisonPanel locale="en" isOpen onToggle={vi.fn()} result={RESULT} />
      );
      expect(getByTestId('sql-diff')).toHaveAttribute('data-render-side-by-side', 'false');
      expect(getByTestId('sql-diff')).toHaveAttribute('data-height', 'min(68vh, 760px)');
      expect(getByTestId('sql-diff')).toHaveAttribute('data-render-indicators', 'true');

      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
      act(() => window.dispatchEvent(new Event('resize')));
      expect(getByTestId('sql-diff')).toHaveAttribute('data-render-side-by-side', 'true');
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
      window.dispatchEvent(new Event('resize'));
    }
  });

  it('summarizes and expands long finding evidence', () => {
    const longEvidence = `WHERE ${Array.from({ length: 30 }, (_, index) => `field_${index} = ${index}`).join(' AND ')}`;
    const result: ComparisonResult = {
      ...RESULT,
      changes: [{ ...RESULT.changes[0], beforeEvidence: [{ side: 'before', text: longEvidence }] }],
      findings: [{ ...RESULT.findings[0], evidence: [{ side: 'before', text: longEvidence }] }],
    };
    render(<SqlComparisonPanel locale="en" isOpen onToggle={vi.fn()} result={result} />);

    const disclosures = screen.getAllByText(/Show full evidence/);
    expect(disclosures).toHaveLength(2);
    const fullEvidence = screen.getAllByText(longEvidence);
    expect(fullEvidence).toHaveLength(2);
    expect(fullEvidence[0].closest('details')).not.toHaveAttribute('open');
    expect(fullEvidence[1].closest('details')).not.toHaveAttribute('open');
    fireEvent.click(disclosures[0]);
    expect(fullEvidence[0].closest('details')).toHaveAttribute('open');
    expect(fullEvidence[1].closest('details')).not.toHaveAttribute('open');
  });

  it('opens from the accessible rail launcher and renders the captured diff and findings', () => {
    render(<Harness />);

    const launcher = screen.getByRole('button', { name: 'Open SQL comparison' });
    expect(launcher).toHaveAttribute('aria-expanded', 'false');
    expect(launcher).toHaveAttribute('title', 'Before / After comparison');
    expect(launcher.style.order).toBe('3');
    fireEvent.click(launcher);

    expect(screen.getByRole('complementary', { name: 'Before / After comparison' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Close SQL comparison' })).toHaveFocus();
    expect(screen.getByTestId('sql-diff')).toHaveAttribute(
      'data-original',
      RESULT.snapshot.beforeSql
    );
    expect(screen.getByTestId('sql-diff')).toHaveAttribute(
      'data-modified',
      RESULT.snapshot.afterSql
    );
    expect(screen.getAllByText('WHERE clause changed.')).toHaveLength(2);
    expect(screen.getByText('Semantic equivalence')).toBeInTheDocument();
    expect(
      screen.getByText('Static analysis only. SQL has not been executed.')
    ).toBeInTheDocument();
  });

  it('keeps the diff editor theme in sync with the application theme', () => {
    const { getByTestId } = render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open SQL comparison' }));

    expect(getByTestId('sql-diff')).toHaveAttribute('data-monaco-theme', 'vs-dark');

    act(() => {
      useAppStore.setState((state) => ({
        settings: { ...state.settings, theme: 'light' },
      }));
    });

    expect(getByTestId('sql-diff')).toHaveAttribute('data-monaco-theme', 'vs');
  });

  it('closes and reopens without discarding the result', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open SQL comparison' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close SQL comparison' }));
    expect(screen.queryByTestId('sql-diff')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open SQL comparison' }));
    expect(screen.getByTestId('sql-diff')).toBeInTheDocument();
  });

  it('labels a result stale instead of presenting it as current', () => {
    render(<Harness isStale />);
    fireEvent.click(screen.getByRole('button', { name: 'Open SQL comparison' }));

    expect(screen.getByText('This result uses an older SQL or dialect snapshot.')).toHaveAttribute(
      'role',
      'status'
    );
  });

  it('offers an explicit AI action and retains deterministic findings when AI is unavailable', () => {
    const onRequestAi = vi.fn();
    const { rerender } = render(<Harness onRequestAi={onRequestAi} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open SQL comparison' }));
    fireEvent.click(screen.getByRole('button', { name: 'Request AI interpretation' }));
    expect(onRequestAi).toHaveBeenCalledOnce();

    rerender(<Harness aiStatus="unavailable" onRequestAi={onRequestAi} />);
    expect(
      screen.getByText('AI explanation is unavailable; deterministic results are still shown.')
    ).toBeInTheDocument();
    expect(screen.getByText('Deterministic analysis')).toBeInTheDocument();
    expect(screen.getAllByText('WHERE clause changed.')).toHaveLength(2);
    expect(screen.getByText(/Recommended verification:/)).toBeInTheDocument();
  });

  it('shows the not-requested state and AI action', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open SQL comparison' }));

    const assessment = screen.getByRole('region', { name: 'AI Assessment' });
    expect(assessment).toHaveTextContent('AI assessment has not been requested.');
    expect(screen.getByRole('button', { name: 'Request AI interpretation' })).toBeInTheDocument();
  });

  it('renders each AI lifecycle state distinctly with only supported actions', () => {
    const onRequestAi = vi.fn();
    const onCancelAi = vi.fn();
    const props = {
      locale: 'en' as const,
      isOpen: true,
      onToggle: vi.fn(),
      isStale: false,
      isRunning: false,
      onRunComparison: vi.fn(),
      onRequestAi,
      onCancelAi,
    };
    const assessment = {
      summary: 'The filter change may broaden the result set.',
      potentialCorrectnessImpact: 'Rows outside the former filter may appear.',
      executionSafetyConcerns: null,
      potentialPerformanceImpact: null,
      evidence: ["WHERE status = 'open'"],
      assumptions: ['The predicate represents intended scope.'],
      verificationSteps: ['Confirm the intended row scope.'],
      limitations: ['No database execution was performed.'],
    };
    const { rerender } = render(
      <SqlComparisonPanel
        {...props}
        result={{ ...RESULT, ai: { status: 'skipped', explanation: null, assessment: null } }}
      />
    );
    expect(screen.getByText('AI assessment has not been requested.')).toHaveAttribute(
      'role',
      'status'
    );
    expect(screen.getByRole('button', { name: 'Request AI interpretation' })).toBeInTheDocument();

    rerender(
      <SqlComparisonPanel
        {...props}
        result={{
          ...RESULT,
          ai: { status: 'pending', explanation: 'Streaming summary', assessment: null },
        }}
      />
    );
    expect(screen.getByText('Generating AI interpretation…')).toHaveAttribute('role', 'status');
    expect(screen.getByText('Streaming summary')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel AI request' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Request AI interpretation' })
    ).not.toBeInTheDocument();

    rerender(
      <SqlComparisonPanel
        {...props}
        result={{ ...RESULT, ai: { status: 'completed', explanation: null, assessment } }}
      />
    );
    expect(screen.getByText('AI assessment complete.')).toHaveAttribute('role', 'status');
    expect(screen.getByText(assessment.summary)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry AI assessment' })).not.toBeInTheDocument();

    rerender(
      <SqlComparisonPanel
        {...props}
        result={{
          ...RESULT,
          status: 'partial',
          ai: { status: 'partial', explanation: null, assessment },
        }}
      />
    );
    expect(
      screen.getByText('Partial AI assessment: deterministic parser coverage is incomplete.')
    ).toHaveAttribute('role', 'status');

    rerender(
      <SqlComparisonPanel
        {...props}
        result={{ ...RESULT, ai: { status: 'unavailable', explanation: null, assessment: null } }}
      />
    );
    expect(
      screen.getByText('AI explanation is unavailable; deterministic results are still shown.')
    ).toHaveAttribute('role', 'status');
    expect(screen.getByRole('button', { name: 'Retry AI assessment' })).toBeInTheDocument();

    rerender(
      <SqlComparisonPanel
        {...props}
        result={{ ...RESULT, ai: { status: 'failed', explanation: null, assessment: null } }}
      />
    );
    expect(
      screen.getByText('AI explanation failed; deterministic results are still shown.')
    ).toHaveAttribute('role', 'status');
    expect(screen.getByRole('button', { name: 'Retry AI assessment' })).toBeInTheDocument();

    rerender(
      <SqlComparisonPanel
        {...props}
        result={{
          ...RESULT,
          status: 'no_changes',
          changes: [],
          findings: [],
          ai: { status: 'skipped', explanation: null, assessment: null },
        }}
      />
    );
    expect(
      screen.getByText('AI assessment is not needed because the SQL is identical.')
    ).toHaveAttribute('role', 'status');
    expect(
      screen.queryByRole('button', { name: 'Request AI interpretation' })
    ).not.toBeInTheDocument();

    rerender(
      <SqlComparisonPanel
        {...props}
        result={{
          ...RESULT,
          status: 'stale',
          ai: { status: 'skipped', explanation: null, assessment: null },
        }}
      />
    );
    expect(
      screen.getByText('AI assessment was not applied because the compared SQL is stale.')
    ).toHaveAttribute('role', 'status');
    expect(
      screen.queryByRole('button', { name: 'Request AI interpretation' })
    ).not.toBeInTheDocument();
    expect(onRequestAi).not.toHaveBeenCalled();
    expect(onCancelAi).not.toHaveBeenCalled();
  });

  it('renders comparison labels and AI states in English and Vietnamese', () => {
    const assessment = {
      summary: 'Bộ lọc đã thay đổi.',
      potentialCorrectnessImpact: 'Phạm vi hàng có thể rộng hơn.',
      executionSafetyConcerns: 'Cần xem xét phạm vi thực thi.',
      potentialPerformanceImpact: 'Có thể cần xử lý thêm hàng.',
      evidence: ["WHERE status = 'open'"],
      assumptions: ['Điều kiện này thể hiện phạm vi mong muốn.'],
      verificationSteps: ['Xác nhận phạm vi hàng dự kiến.'],
      limitations: ['Chưa thực thi cơ sở dữ liệu.'],
    };
    const { rerender } = render(
      <SqlComparisonPanel
        locale="vi"
        isOpen
        onToggle={vi.fn()}
        result={{ ...RESULT, ai: { status: 'completed', explanation: null, assessment } }}
      />
    );
    expect(screen.getByText('Trước (Bản gốc)')).toBeInTheDocument();
    expect(screen.getByText('Sau (Bản đã sửa)')).toBeInTheDocument();
    expect(screen.getByText('Đánh giá bằng AI')).toBeInTheDocument();
    expect(screen.getByText('Đã hoàn tất đánh giá AI.')).toHaveAttribute('role', 'status');
    expect(screen.getByText('Tóm tắt')).toBeInTheDocument();
    expect(screen.getByText('Ảnh hưởng tiềm ẩn đến tính đúng đắn')).toBeInTheDocument();
    expect(screen.getByText('Quan ngại về an toàn thực thi')).toBeInTheDocument();
    expect(screen.getByText('Ảnh hưởng tiềm ẩn đến hiệu năng')).toBeInTheDocument();
    expect(screen.getByText('Bằng chứng từ AI')).toBeInTheDocument();
    expect(screen.getByText('Giả định')).toBeInTheDocument();
    expect(screen.getByText('Đề xuất xác minh')).toBeInTheDocument();
    expect(screen.getByText('Giới hạn của AI')).toBeInTheDocument();

    rerender(
      <SqlComparisonPanel
        locale="vi"
        isOpen
        onToggle={vi.fn()}
        result={{ ...RESULT, ai: { status: 'skipped', explanation: null, assessment: null } }}
        onRequestAi={vi.fn()}
      />
    );
    expect(screen.getByText('Chưa yêu cầu đánh giá bằng AI.')).toHaveAttribute('role', 'status');
    expect(screen.getByRole('button', { name: 'Yêu cầu AI diễn giải' })).toBeInTheDocument();

    rerender(
      <SqlComparisonPanel
        locale="vi"
        isOpen
        onToggle={vi.fn()}
        result={{ ...RESULT, ai: { status: 'unavailable', explanation: null, assessment: null } }}
        onRequestAi={vi.fn()}
      />
    );
    expect(
      screen.getByText('Không có diễn giải AI; kết quả xác định vẫn được hiển thị.')
    ).toHaveAttribute('role', 'status');
    expect(screen.getByRole('button', { name: 'Thử lại đánh giá AI' })).toBeInTheDocument();
  });

  it('dismisses on Escape and restores focus to the launcher', async () => {
    render(<Harness />);
    const launcher = screen.getByRole('button', { name: 'Open SQL comparison' });
    fireEvent.click(launcher);
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(
      screen.queryByRole('complementary', { name: 'Before / After comparison' })
    ).not.toBeInTheDocument();
    await screen.findByRole('button', { name: 'Open SQL comparison' });
    expect(screen.getByRole('button', { name: 'Open SQL comparison' })).toHaveFocus();
  });

  it('localizes the empty-statement limitation sentence in both languages', () => {
    const result: ComparisonResult = {
      ...RESULT,
      limitations: [LIMITATION_EMPTY_STATEMENT],
    };
    const { rerender } = render(
      <SqlComparisonPanel locale="en" isOpen onToggle={vi.fn()} result={result} />
    );

    expect(
      screen.getByText('Before and After SQL must both contain a statement to compare.')
    ).toBeInTheDocument();

    rerender(<SqlComparisonPanel locale="vi" isOpen onToggle={vi.fn()} result={result} />);

    expect(
      screen.getByText('Cả SQL Trước và SQL Sau đều phải chứa một câu truy vấn để so sánh.')
    ).toBeInTheDocument();
  });
});
