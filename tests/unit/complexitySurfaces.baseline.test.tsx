import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ComplexityDashboard from '@/components/ui/ComplexityDashboard';
import { getT } from '@/lib/i18n';
import { resetTestStorage } from '../utils/test-setup';

/**
 * Characterization baseline (specs/010-sql-intelligence-dashboard T003 / U39).
 * Captures the shared component's current display — raw score over the dynamic
 * denominator plus a percentage of max — before it switches to the normalized
 * score (T036).
 */

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('ComplexityDashboard baseline (specs/010-sql-intelligence-dashboard T003 / U39)', () => {
  beforeEach(() => {
    resetTestStorage();
  });

  it('shows the current raw score over the dynamic denominator with a percentage of max', () => {
    render(<ComplexityDashboard sql="SELECT id, name FROM users WHERE active = 1" />);
    const t = getT('en');

    // Current display contract: "{complexityScore}: {raw} / {denominator} pts" and "{pct}% of max".
    expect(
      screen.getByText(
        new RegExp(`${escapeRegExp(t.complexityScore)}:\\s*\\d+\\s*/\\s*\\d+\\s*pts`)
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/% of max/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${escapeRegExp(t.complexityLevel)}:`))).toBeInTheDocument();
  });

  it('renders nothing for empty SQL input', () => {
    const { container } = render(<ComplexityDashboard sql="   " />);
    expect(container.firstChild).toBeNull();
  });
});
