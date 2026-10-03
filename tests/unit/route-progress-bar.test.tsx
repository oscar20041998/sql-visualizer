import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import RouteProgressBar from '@/components/ui/RouteProgressBar';
import { DEFAULT_SETTINGS, useAppStore } from '@/lib/store';

/**
 * The route-change indicator replaces a full-screen overlay that used to cover the app while a
 * navigation was in flight. Two properties are load-bearing and are covered here:
 *
 * 1. Timing. A client-side route change can settle inside one frame, so an indicator that blinks on
 *    and straight back off is worse than none. It must stay suppressed for a short window and, once
 *    shown, outlive a minimum duration.
 * 2. Non-interference. The old overlay was `fixed inset-0`, so a target it failed to clear swallowed
 *    every click. The replacement must never be able to do that.
 */

const APPEAR_DELAY = 120;
const MIN_VISIBLE = 400;

beforeEach(() => {
  useAppStore.setState({ settings: { ...DEFAULT_SETTINGS, locale: 'en' } });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Advances the fake clock and flushes the React work it triggers. */
function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('RouteProgressBar', () => {
  it('renders nothing while no navigation is in flight', () => {
    render(<RouteProgressBar active={false} />);

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows a labelled progress indicator once a navigation outlasts the appear delay', () => {
    render(<RouteProgressBar active />);

    // Suppressed at first: the route may still settle within the delay.
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

    advance(APPEAR_DELAY);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('keeps the indicator up for the minimum window after the page has loaded, then retires it', () => {
    const { rerender } = render(<RouteProgressBar active />);
    advance(APPEAR_DELAY);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // The new route has arrived (`active` goes false).
    rerender(<RouteProgressBar active={false} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    advance(MIN_VISIBLE);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('never flashes for a navigation that settles inside the appear delay', () => {
    const { rerender } = render(<RouteProgressBar active />);
    advance(APPEAR_DELAY / 2);

    rerender(<RouteProgressBar active={false} />);
    advance(MIN_VISIBLE * 2);

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('labels the indicator in the active interface language', () => {
    useAppStore.setState({ settings: { ...DEFAULT_SETTINGS, locale: 'vi' } });
    render(<RouteProgressBar active />);

    advance(APPEAR_DELAY);

    expect(screen.getByRole('progressbar', { name: 'Đang tải trang' })).toBeInTheDocument();
  });

  it('can never intercept pointer events, so a stuck indicator cannot swallow clicks', () => {
    render(<RouteProgressBar active />);
    advance(APPEAR_DELAY);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveClass('pointer-events-none');
    expect(bar).toHaveAttribute('aria-busy', 'true');
  });
});
