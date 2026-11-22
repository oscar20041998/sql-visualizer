'use client';

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import type { Translations } from '@/lib/i18n';

interface EmptyStateTipsProps {
  tips: string[];
  t: Translations;
}

export const EmptyStateTips: React.FC<EmptyStateTipsProps> = ({ tips, t }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hovering = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number; maxHeight: number } | null>(null);
  const tooltipId = useId();

  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }
    const positionTooltip = () => {
      const button = buttonRef.current;
      const tooltip = tooltipRef.current;
      if (!button || !tooltip) return;
      const margin = 8;
      const width = Math.min(288, Math.max(0, window.innerWidth - margin * 2));
      tooltip.style.width = `${width}px`;
      tooltip.style.maxHeight = `${Math.max(0, window.innerHeight - margin * 2)}px`;
      const anchor = button.getBoundingClientRect();
      const height = tooltip.getBoundingClientRect().height;
      const above = Math.max(0, anchor.top - margin * 2);
      const below = Math.max(0, window.innerHeight - anchor.bottom - margin * 2);
      const placeAbove = height <= above || above >= below;
      const available = placeAbove ? above : below;
      const maxHeight = Math.min(window.innerHeight - margin * 2, available);
      const visibleHeight = Math.min(height, maxHeight);
      setPosition({
        left: Math.max(margin, Math.min(anchor.right - width, window.innerWidth - width - margin)),
        top: placeAbove ? anchor.top - margin - visibleHeight : anchor.bottom + margin,
        maxHeight,
      });
    };
    positionTooltip();
    window.addEventListener('resize', positionTooltip);
    window.addEventListener('scroll', positionTooltip, true);
    return () => {
      window.removeEventListener('resize', positionTooltip);
      window.removeEventListener('scroll', positionTooltip, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target) &&
        !tooltipRef.current?.contains(event.target)
      ) {
        setIsPinned(false);
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPinned(false);
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const handleMouseEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    hovering.current = true;
    setIsOpen(true);
  };
  const handleMouseLeave = () => {
    hovering.current = false;
    closeTimer.current = setTimeout(() => {
      if (!isPinned && document.activeElement !== buttonRef.current) setIsOpen(false);
    }, 150);
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={t.tipsTitle}
        aria-describedby={isOpen ? tooltipId : undefined}
        aria-expanded={isOpen}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          if (!isPinned && !hovering.current) setIsOpen(false);
        }}
        onClick={() => {
          setIsOpen(!isPinned);
          setIsPinned(!isPinned);
        }}
        className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground active:text-primary disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info size={15} aria-hidden="true" />
      </button>
      {isOpen && createPortal(
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            left: position?.left,
            top: position?.top,
            maxHeight: position?.maxHeight,
            visibility: position ? 'visible' : 'hidden',
          }}
          className="fixed z-[110] overflow-y-auto rounded-md border border-border bg-card p-3 text-foreground shadow-lg"
        >
          <p className="text-sm font-semibold">{t.tipsTitle}</p>
          <ul className="mt-2 space-y-2">
            {tips.map((tip) => (
              <li key={tip} className="text-xs leading-relaxed text-muted-foreground">
                {tip}
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
};

export default EmptyStateTips;
