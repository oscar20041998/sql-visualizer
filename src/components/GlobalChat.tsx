'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Bot } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import DocsConsultantChat from '@/app/guideline/components/DocsConsultantChat';

const CHAT_LAUNCHER_POSITION_KEY = 'sql-visualizer-chat-launcher-position';
const CHAT_LAUNCHER_SIZE = 48;
const CHAT_LAUNCHER_MARGIN = 24;

interface LauncherPosition {
  left: number;
  top: number;
}

export const GlobalChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [launcherPosition, setLauncherPosition] = useState<LauncherPosition | null>(null);
  const dragStartRef = useRef<{ pointerX: number; pointerY: number; left: number; top: number } | null>(null);
  const draggedRef = useRef(false);
  const latestLauncherPositionRef = useRef<LauncherPosition | null>(null);
  const { settings } = useAppStore();
  const t = getT(settings.locale);

  useEffect(() => {
    const savedPosition = window.localStorage.getItem(CHAT_LAUNCHER_POSITION_KEY);
    if (!savedPosition) return;

    try {
      const position = JSON.parse(savedPosition) as LauncherPosition;
      if (Number.isFinite(position.left) && Number.isFinite(position.top)) {
        latestLauncherPositionRef.current = position;
        setLauncherPosition(position);
      }
    } catch {
      window.localStorage.removeItem(CHAT_LAUNCHER_POSITION_KEY);
    }
  }, []);

  const clampPosition = (left: number, top: number): LauncherPosition => ({
    left: Math.min(
      Math.max(CHAT_LAUNCHER_MARGIN, left),
      Math.max(CHAT_LAUNCHER_MARGIN, window.innerWidth - CHAT_LAUNCHER_SIZE - CHAT_LAUNCHER_MARGIN)
    ),
    top: Math.min(
      Math.max(CHAT_LAUNCHER_MARGIN, top),
      Math.max(CHAT_LAUNCHER_MARGIN, window.innerHeight - CHAT_LAUNCHER_SIZE - CHAT_LAUNCHER_MARGIN)
    ),
  });

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    dragStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      left: bounds.left,
      top: bounds.top,
    };
    draggedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const dragStart = dragStartRef.current;
    if (!dragStart) return;

    const deltaX = event.clientX - dragStart.pointerX;
    const deltaY = event.clientY - dragStart.pointerY;
    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      draggedRef.current = true;
      setIsDragging(true);
    }
    if (!draggedRef.current) return;

    const position = clampPosition(dragStart.left + deltaX, dragStart.top + deltaY);
    latestLauncherPositionRef.current = position;
    setLauncherPosition(position);
  };

  const handlePointerUp = () => {
    dragStartRef.current = null;
    setIsDragging(false);
    if (latestLauncherPositionRef.current) {
      window.localStorage.setItem(
        CHAT_LAUNCHER_POSITION_KEY,
        JSON.stringify(latestLauncherPositionRef.current)
      );
    }
  };

  return (
    <div
      className={isOpen ? 'fixed bottom-6 right-6 z-50' : 'fixed z-50'}
      style={!isOpen && launcherPosition ? launcherPosition : undefined}
    >
      {isOpen ? (
        <div className="w-80 md:w-96 h-[500px] flex flex-col shadow-2xl rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
                <Bot className="text-primary" size={20} />
                <h3 className="font-semibold text-sm">{t.aiAssistantTitle}</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full hover:bg-muted"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 scrollbar-thin overflow-y-auto">
             <DocsConsultantChat config={settings.aiConfig} locale={settings.locale} t={t} className="p-4" />
          </div>
        </div>
      ) : (
        <button
          onClick={() => {
            if (draggedRef.current) {
              draggedRef.current = false;
              return;
            }
            setIsOpen(true);
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label={t.aiAssistantTitle}
          className={`flex h-12 w-12 touch-none cursor-grab items-center justify-center rounded-full bg-primary text-primary-foreground transition-[transform,box-shadow,opacity] duration-150 hover:opacity-90 active:cursor-grabbing ${
            isDragging ? 'scale-110 shadow-2xl ring-2 ring-primary/30' : 'shadow-lg'
          }`}
        >
          <MessageCircle size={24} />
        </button>
      )}
    </div>
  );
};
