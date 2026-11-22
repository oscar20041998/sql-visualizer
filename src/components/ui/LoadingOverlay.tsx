'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Database } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';

interface LoadingOverlayProps {
  visible: boolean;
  title?: string;
  description?: string;
  hideDelay?: number; // Delay before hiding after visible becomes false (ms)
  onHide?: () => void; // Callback when component hides
}

export default function LoadingOverlay({
  visible,
  title,
  description,
  hideDelay = 0,
  onHide,
}: LoadingOverlayProps) {
  const { settings } = useAppStore();
  const t = getT(settings.locale);
  const [isDisplayed, setIsDisplayed] = useState(visible);

  const defaultTitle = title || t.analyzing;

  // Handle visibility changes with optional delay
  useEffect(() => {
    let hideTimer: NodeJS.Timeout;

    if (visible) {
      setIsDisplayed(true);
    } else if (hideDelay > 0) {
      // Delay hiding to show completion animation
      hideTimer = setTimeout(() => {
        setIsDisplayed(false);
        onHide?.();
      }, hideDelay);
    } else {
      setIsDisplayed(false);
      onHide?.();
    }

    return () => clearTimeout(hideTimer);
  }, [visible, hideDelay, onHide]);

  if (!isDisplayed || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[110] flex items-center justify-center bg-background/90 motion-safe:animate-fade-in"
    >
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-border" aria-hidden="true" />
        <div
          className="absolute inset-0 rounded-full border border-transparent border-t-primary motion-safe:animate-spin"
          aria-hidden="true"
        />
        <Database className="h-6 w-6 text-primary" aria-hidden="true" />
        <div className="absolute left-1/2 top-full mt-5 w-64 max-w-[90vw] -translate-x-1/2 text-center">
          <p className="text-sm font-semibold text-foreground">{defaultTitle}</p>
          {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
    </div>,
    document.body
  );
}
