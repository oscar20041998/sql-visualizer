'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';

/**
 * Route-change progress indicator: a thin bar pinned to the top of the viewport plus a small
 * spinner, replacing the full-screen overlay that used to cover the whole app during a navigation.
 *
 * Timing matters more than the visuals here. A client-side route change can settle inside a single
 * frame, so an indicator that appears and disappears immediately reads as a flicker — worse than
 * showing nothing at all. `APPEAR_DELAY` therefore suppresses it for fast navigations, and
 * `MIN_VISIBLE` keeps it up long enough to be read once it has appeared.
 *
 * The element is `pointer-events-none` and paints only a 2px bar, so an indicator that somehow fails
 * to clear can no longer swallow clicks the way the old `fixed inset-0` overlay did.
 */

/** Delay before the indicator appears, so an instant navigation never flashes it. */
const APPEAR_DELAY = 120;
/** Lower bound on how long the indicator stays up, so a fast navigation is still perceivable. */
const MIN_VISIBLE = 400;
/** Safety net: the indicator cannot stay up longer than this, whatever the route does. */
const MAX_VISIBLE = 10_000;

export default function RouteProgressBar({ active }: { active: boolean }) {
  const locale = useAppStore((s) => s.settings.locale);
  const t = getT(locale);

  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => {
    // Navigation in flight.
    if (active) {
      // Already on screen: do not restart the appear timer, or the minimum-visible window would
      // keep re-measuring from now and the indicator could never retire while a route hangs.
      if (visible) return;

      const appearTimer = setTimeout(() => {
        shownAtRef.current = Date.now();
        setVisible(true);
      }, APPEAR_DELAY);
      return () => clearTimeout(appearTimer);
    }

    // Navigation finished. Honour the minimum-visible window before retiring, so the bar does not
    // blink for a single frame on a fast route change.
    if (!visible) return;

    const elapsed = shownAtRef.current ? Date.now() - shownAtRef.current : 0;
    const hideTimer = setTimeout(
      () => {
        shownAtRef.current = null;
        setVisible(false);
      },
      Math.max(0, MIN_VISIBLE - elapsed)
    );
    return () => clearTimeout(hideTimer);
  }, [active, visible]);

  // Safety net, independent of `active`: a route that never settles must not pin the bar forever.
  useEffect(() => {
    if (!visible) return;

    const safety = setTimeout(() => {
      shownAtRef.current = null;
      setVisible(false);
    }, MAX_VISIBLE);
    return () => clearTimeout(safety);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-label={t.routeLoading}
      aria-busy="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100]"
    >
      {/* Bar track. `overflow-hidden` keeps the sweeping gradient inside the 2px strip. */}
      <div className="relative h-0.5 w-full overflow-hidden bg-primary/10">
        <div className="route-progress-bar absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-primary to-transparent" />
      </div>

      {/* Small spinner, centred below the bar so it never covers page content. */}
      <div className="flex justify-center">
        <span className="mt-2 block h-4 w-4 rounded-full border-2 border-primary/20 border-t-primary motion-safe:animate-spin" />
      </div>
    </div>
  );
}
