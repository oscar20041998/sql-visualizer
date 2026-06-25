'use client';

import React, { useEffect, useState } from 'react';
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

  if (!isDisplayed) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
          <div
            className="absolute inset-2 rounded-full border-2 border-transparent border-t-accent animate-spin"
            style={{ animationDuration: '0.6s', animationDirection: 'reverse' }}
          />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">{defaultTitle}</p>
          {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
    </div>
  );
}
