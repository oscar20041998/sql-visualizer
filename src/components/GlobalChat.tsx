'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Bot } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import DocsConsultantChat from '@/app/guideline/components/DocsConsultantChat';
import LockedFeatureNotice from '@/components/ui/LockedFeatureNotice';
import { isGuestSession } from '@/lib/demoAuth';

const CHAT_WIDGET_POSITION_KEY = 'sql-visualizer-chat-widget-position';
const CHAT_WIDGET_MARGIN = 16;

interface WidgetPosition {
  left: number;
  top: number;
}

export const GlobalChat: React.FC = () => {
  // Open/closed state lives in the store, not local useState: every page's own <AppLayout>
  // wrapper remounts GlobalChat on navigation, which would otherwise reset it (and the
  // conversation inside DocsConsultantChat) back to its initial closed/empty state.
  const { settings, chatIsOpen: isOpen, setChatIsOpen: setIsOpen } = useAppStore();
  const t = getT(settings.locale);
  // Read from storage rather than the store: the guest marker lives in demoAuth, and GlobalChat
  // remounts on every page change, so a mount-time read is the cheapest correct source.
  const [isGuest, setIsGuest] = useState(false);
  // Custom position when the user dragged the widget away from its default
  // bottom-right corner. Null = docked at the corner. Persisted per device so a
  // reload keeps where the user left it; always clamped back into the viewport.
  const [widgetPosition, setWidgetPosition] = useState<WidgetPosition | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
    moved: boolean;
    width: number;
    height: number;
    rafId: number | null;
    pendingX: number;
    pendingY: number;
  } | null>(null);
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const latestPositionRef = useRef<WidgetPosition | null>(null);
  const launcherPositionRef = useRef<WidgetPosition | null>(null);
  // Set when a drag just ended so the click that follows it doesn't toggle open.
  const suppressClickRef = useRef(false);

  useEffect(() => {
    setIsGuest(isGuestSession());
  }, []);

  const clampSize = useCallback(
    (left: number, top: number, width: number, height: number): WidgetPosition => {
      const margin = CHAT_WIDGET_MARGIN;
      const maxLeft = Math.max(margin, window.innerWidth - width - margin);
      const maxTop = Math.max(margin, window.innerHeight - height - margin);
      return {
        left: Math.min(Math.max(margin, left), maxLeft),
        top: Math.min(Math.max(margin, top), maxTop),
      };
    },
    []
  );

  const clampToViewport = useCallback(
    (left: number, top: number): WidgetPosition => {
      const widget = widgetRef.current;
      return clampSize(left, top, widget?.offsetWidth ?? 48, widget?.offsetHeight ?? 48);
    },
    [clampSize]
  );

  // Paint the widget position without a React re-render: pointermove fires far
  // more often than the screen refreshes, and re-rendering the whole chat panel
  // on every pixel is what made the drag feel laggy. State only commits on drop.
  // GPU-friendly transform (no layout/reflow) so the drag tracks the pointer.
  const paintPosition = useCallback((dx: number, dy: number) => {
    const widget = widgetRef.current;
    if (!widget) return;
    widget.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  }, []);

  // Restore dragged position + keep inside viewport on resize/zoom/rotation.
  useEffect(() => {
    const restore = () => {
      try {
        const saved = window.localStorage.getItem(CHAT_WIDGET_POSITION_KEY);
        if (!saved) {
          setWidgetPosition(null);
          latestPositionRef.current = null;
          launcherPositionRef.current = null;
          return;
        }
        const parsed = JSON.parse(saved) as WidgetPosition;
        if (!Number.isFinite(parsed.left) || !Number.isFinite(parsed.top)) {
          window.localStorage.removeItem(CHAT_WIDGET_POSITION_KEY);
          setWidgetPosition(null);
          latestPositionRef.current = null;
          launcherPositionRef.current = null;
          return;
        }
        launcherPositionRef.current = parsed;
        const clamped = clampToViewport(parsed.left, parsed.top);
        latestPositionRef.current = clamped;
        setWidgetPosition(clamped);
      } catch {
        window.localStorage.removeItem(CHAT_WIDGET_POSITION_KEY);
        setWidgetPosition(null);
        latestPositionRef.current = null;
        launcherPositionRef.current = null;
      }
    };
    restore();
    window.addEventListener('resize', restore);
    return () => window.removeEventListener('resize', restore);
  }, [clampToViewport]);

  // Re-clamp when open/closed size changes (launcher 48px vs open panel).
  useEffect(() => {
    if (!latestPositionRef.current) return;
    const targetPosition =
      !isOpen && launcherPositionRef.current
        ? launcherPositionRef.current
        : latestPositionRef.current;
    const clamped = clampToViewport(targetPosition.left, targetPosition.top);
    latestPositionRef.current = clamped;
    if (!isOpen) launcherPositionRef.current = clamped;
    setWidgetPosition(clamped);
  }, [isOpen, clampToViewport]);

  const beginDrag = useCallback((event: React.PointerEvent) => {
    // Clicking the close button must never start a drag.
    if ((event.target as HTMLElement).closest('button[aria-label="Close"]')) return;
    const widget = widgetRef.current;
    if (!widget) return;
    // Anchor the widget at its live bounds (fixed left/top), then move it only
    // with transform deltas so the drag never re-lays-out, just repaints.
    const bounds = widget.getBoundingClientRect();
    const anchored = { left: bounds.left, top: bounds.top };
    latestPositionRef.current = anchored;
    setWidgetPosition(anchored);
    widget.style.left = `${bounds.left}px`;
    widget.style.top = `${bounds.top}px`;
    widget.style.bottom = 'auto';
    widget.style.right = 'auto';
    widget.style.transform = 'translate3d(0px, 0px, 0)';
    widget.style.willChange = 'transform';
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: bounds.left,
      originTop: bounds.top,
      moved: false,
      width: bounds.width,
      height: bounds.height,
      rafId: null,
      pendingX: event.clientX,
      pendingY: event.clientY,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  const moveDrag = useCallback(
    (event: React.PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) < 3) return;
      drag.moved = true;
      drag.pendingX = event.clientX;
      drag.pendingY = event.clientY;
      // Coalesce to one paint per frame; also catches pointer leaving the handle.
      if (drag.rafId !== null) return;
      drag.rafId = requestAnimationFrame(() => {
        const active = dragStateRef.current;
        if (!active) return;
        active.rafId = null;
        // Clamp the delta so the whole widget stays in-viewport, then paint the
        // delta as a transform (compositor-only, no layout work per frame).
        const rawLeft = active.originLeft + (active.pendingX - active.startX);
        const rawTop = active.originTop + (active.pendingY - active.startY);
        const next = clampSize(rawLeft, rawTop, active.width, active.height);
        latestPositionRef.current = next;
        paintPosition(next.left - active.originLeft, next.top - active.originTop);
      });
    },
    [clampSize, paintPosition]
  );

  const endDrag = useCallback(
    (event: React.PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) >= 3) drag.moved = true;
      if (drag.moved) {
        const next = clampSize(drag.originLeft + dx, drag.originTop + dy, drag.width, drag.height);
        latestPositionRef.current = next;
        launcherPositionRef.current = next;
        paintPosition(next.left - drag.originLeft, next.top - drag.originTop);
      }
      if (drag.rafId !== null) cancelAnimationFrame(drag.rafId);
      dragStateRef.current = null;
      const widget = widgetRef.current;
      if (widget) widget.style.willChange = 'auto';
      // Commit the painted position into state once, so React owns it again
      // (resize clamp, reopen, remount) without re-rendering mid-drag.
      if (drag.moved && latestPositionRef.current) {
        suppressClickRef.current = true;
        setWidgetPosition({ ...latestPositionRef.current });
        if (widget) widget.style.transform = 'translate3d(0px, 0px, 0)';
        try {
          window.localStorage.setItem(
            CHAT_WIDGET_POSITION_KEY,
            JSON.stringify(latestPositionRef.current)
          );
        } catch {
          // Private mode: position simply won't persist.
        }
      } else if (widget) {
        // Pure click: drop the anchor styles so docking classes apply cleanly.
        widget.style.transform = '';
        widget.style.willChange = 'auto';
        if (!latestPositionRef.current) {
          widget.style.left = '';
          widget.style.top = '';
          widget.style.bottom = '';
          widget.style.right = '';
        }
      }
    },
    [clampSize, paintPosition]
  );

  const resetToCorner = useCallback(() => {
    latestPositionRef.current = null;
    launcherPositionRef.current = null;
    setWidgetPosition(null);
    try {
      window.localStorage.removeItem(CHAT_WIDGET_POSITION_KEY);
    } catch {
      // In-memory reset already docked the widget.
    }
  }, []);

  return (
    <div
      ref={widgetRef}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={
        widgetPosition ? 'fixed z-50' : 'fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6'
      }
      style={widgetPosition ?? undefined}
    >
      {isOpen ? (
        <div className="flex h-[min(540px,calc(100dvh-6rem))] w-[calc(100vw-2rem)] max-w-80 animate-[chat-pop_180ms_ease-out] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_24px_64px_-12px_rgba(0,0,0,0.45)] ring-1 ring-black/5 backdrop-blur sm:max-w-96">
          <div
            className="relative flex flex-shrink-0 cursor-move touch-none select-none items-center justify-between overflow-hidden border-b border-border/70 bg-gradient-to-r from-primary/15 via-primary/8 to-transparent p-3"
            onPointerDown={beginDrag}
            onDoubleClick={resetToCorner}
            title="Kéo để di chuyển — double-click để về góc phải dưới"
          >
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-md">
                <Bot size={18} />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
              </span>
              <span>
                <h3 className="text-sm font-semibold leading-tight">{t.aiAssistantTitle}</h3>
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span className="chat-online-dot h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Online — kéo header để di chuyển
                </p>
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close"
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto">
            {/* Guest access: the Docs Consultant retrieval is hard-wired to the operator's
                embedding key, so it costs shared capacity even for a local-model guest
                (research.md R3). Show the notice instead of a chat that would be refused. */}
            {isGuest ? (
              <LockedFeatureNotice t={t} featureName={t.docsConsultantTitle} className="m-4" />
            ) : (
              <DocsConsultantChat
                config={settings.aiConfig}
                locale={settings.locale}
                t={t}
                className="p-4"
              />
            )}
          </div>
        </div>
      ) : (
        <button
          ref={launcherRef}
          onClick={() => {
            // A drag ending on the button must not toggle the panel open.
            if (suppressClickRef.current) {
              suppressClickRef.current = false;
              return;
            }
            const bounds = widgetRef.current?.getBoundingClientRect();
            if (bounds) {
              launcherPositionRef.current = { left: bounds.left, top: bounds.top };
            }
            setIsOpen(true);
          }}
          onPointerDown={beginDrag}
          onDoubleClick={resetToCorner}
          aria-label={t.aiAssistantTitle}
          title="Kéo để di chuyển — double-click để về góc phải dưới"
          className="group relative flex h-14 w-14 touch-none select-none items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/70 text-primary-foreground shadow-[0_12px_32px_-8px_var(--primary),0_4px_12px_rgba(0,0,0,0.25)] ring-1 ring-white/25 transition-shadow duration-200 hover:shadow-[0_16px_40px_-8px_var(--primary),0_6px_16px_rgba(0,0,0,0.3)] active:scale-95"
        >
          <span className="chat-float-motion block animate-[chat-float_3s_ease-in-out_infinite] group-active:animate-none">
            <span
              aria-hidden
              className="absolute inset-0 rounded-2xl bg-gradient-to-t from-white/0 via-white/10 to-white/25"
            />
            <span aria-hidden className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
              <span className="chat-online-dot absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
            </span>
            <MessageCircle
              size={26}
              strokeWidth={2.2}
              className="relative drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-transform duration-200 group-hover:scale-110 group-active:scale-95"
            />
          </span>
        </button>
      )}
    </div>
  );
};
