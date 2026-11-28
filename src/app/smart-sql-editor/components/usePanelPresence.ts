import { useEffect, useState } from 'react';

const EXIT_DURATION_MS = 180;

export function usePanelPresence(isOpen: boolean): boolean {
  const [retained, setRetained] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setRetained(true);
      return;
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setRetained(false);
      return;
    }
    const timer = window.setTimeout(() => setRetained(false), EXIT_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  return isOpen || retained;
}
