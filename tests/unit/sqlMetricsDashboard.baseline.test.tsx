import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MetricsDashboardContent from '@/app/sql-metrics-dashboard/components/MetricsDashboardContent';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import { makeAnalysisResult } from '../utils/dashboardFixtures';
import { resetTestStorage } from '../utils/test-setup';

/**
 * Regression baseline (specs/010-sql-intelligence-dashboard T002 / U26).
 * Originally captured the pre-rewiring section order; updated with T015 to pin the
 * new order (health summary first, advanced details last) while keeping the empty
 * state and the CTE-navigation contract intact.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const SECTION_TESTIDS = [
  'section-health',
  'section-metrics',
  'section-factors',
  'section-subqueries',
  'section-fields',
  'section-tables',
  'section-advanced',
] as const;

vi.mock('@/app/sql-metrics-dashboard/components/AnalysisHealthSummary', () => ({
  default: () => <div data-testid="section-health" />,
}));
vi.mock('@/app/sql-metrics-dashboard/components/AdvancedDetails', () => ({
  default: () => <div data-testid="section-advanced" />,
}));
vi.mock('@/app/sql-metrics-dashboard/components/MetricCardsGrid', () => ({
  default: () => <div data-testid="section-metrics" />,
}));
vi.mock('@/app/sql-metrics-dashboard/components/ComplexityFactorsBreakdown', () => ({
  default: () => <div data-testid="section-factors" />,
}));
vi.mock('@/app/sql-metrics-dashboard/components/NestedSubqueryAnalysis', () => ({
  default: () => <div data-testid="section-subqueries" />,
}));
vi.mock('@/app/sql-metrics-dashboard/components/FieldExtractionSummary', () => ({
  default: () => <div data-testid="section-fields" />,
}));
vi.mock('@/app/sql-metrics-dashboard/components/ReferencedTablesOverview', () => ({
  default: () => <div data-testid="section-tables" />,
}));

describe('MetricsDashboardContent baseline (specs/010-sql-intelligence-dashboard T002 / U26)', () => {
  beforeEach(() => {
    resetTestStorage();
    useAppStore.setState({ analysisResult: null });
  });

  it('renders the empty state guidance when no analysis result exists', () => {
    render(<MetricsDashboardContent />);
    const t = getT('en');

    expect(screen.getByText(t.noMetrics)).toBeInTheDocument();
    expect(screen.getByText(t.noMetricsHint)).toBeInTheDocument();
  });

  it('renders the current section order with the CTE navigation available when CTEs exist', () => {
    useAppStore.setState({ analysisResult: makeAnalysisResult() });
    const { container } = render(<MetricsDashboardContent />);
    const t = getT('en');

    expect(screen.getByText(t.metricsTitle)).toBeInTheDocument();
    expect(screen.getByText(t.navCTEAnalysis)).toBeInTheDocument();

    const sections = SECTION_TESTIDS.map((id) =>
      container.querySelector(`[data-testid="${id}"]`)
    ) as Element[];
    expect(sections.every((section) => section !== null)).toBe(true);
    for (let i = 1; i < sections.length; i++) {
      expect(
        sections[i - 1].compareDocumentPosition(sections[i]) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }
  });

  it('hides the CTE navigation when the statement has no CTEs', () => {
    useAppStore.setState({
      analysisResult: makeAnalysisResult({ ctes: [], hasCTE: false }),
    });
    render(<MetricsDashboardContent />);

    expect(screen.queryByText(getT('en').navCTEAnalysis)).not.toBeInTheDocument();
  });
});
