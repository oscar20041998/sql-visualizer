'use client';

import { useEffect, useState } from 'react';
import { getCapability, isLockedForGuest } from '@/lib/capabilities';
import { isGuestSession } from '@/lib/demoAuth';

/**
 * The browser-side view of the guest restriction (specs/013-guest-access-mode, US2).
 *
 * Every AI surface asks this before rendering its control, so a guest reads the locked explanation
 * instead of activating a button that would fail. It resolves through the same capability table the
 * server guard uses, so the interface cannot promise what the server will refuse.
 *
 * This lives in its own file, not in `capabilities.ts`, because the table is imported by the server
 * route guards: a `'use client'` directive in that module would break them.
 */

/**
 * The non-hook form, for event handlers deciding whether to call at all.
 *
 * Returns `false` for a signed-in user, an unknown id, or on the server. The early check must never
 * be the thing that blocks a legitimate feature — the server guard refuses independently, and that is
 * the boundary that counts.
 */
export function isCapabilityLockedForGuest(capabilityId: string): boolean {
  if (typeof window === 'undefined') return false;
  if (!isGuestSession()) return false;
  const capability = getCapability(capabilityId);
  if (!capability) return false;
  return isLockedForGuest(capability);
}

/** Whether a capability is locked for the current browser session. */
export function useCapabilityLock(capabilityId: string): boolean {
  // The guest marker lives in localStorage, which the server cannot see, so it is read after mount
  // rather than during render: reading it inline would emit different markup on hydration.
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setLocked(isCapabilityLockedForGuest(capabilityId));
  }, [capabilityId]);

  return locked;
}