'use client';

import React, { useEffect, useRef } from 'react';
import { getT } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';

interface SqlInputPanelProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export const SqlInputPanel: React.FC<SqlInputPanelProps> = ({ value, onChange, placeholder }) => {
  const { settings } = useAppStore();
  const t = getT(settings.locale);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const normalizedValue = value.replace(/\r\n?|\u2028|\u2029/g, '\n');
  const lineCount = value.length === 0 ? 0 : normalizedValue.split('\n').length;
  const charCount = value.length;
  const lineNumbers = Array.from({ length: lineCount }, (_, index) => index + 1);

  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      const textarea = textareaRef.current;
      const gutter = gutterRef.current;
      gutter.scrollTop = textarea.scrollTop;
    }
  };

  // Pasting jumps the textarea's native scroll to the caret before React
  // re-renders the gutter with the new line count, so the gutter's own
  // "scroll" event fires too early and gets clamped to its old (shorter)
  // scroll range. Re-sync once the gutter has re-rendered with all lines.
  useEffect(() => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, [value]);

  return (
    <div className="relative animate-fade-in">
      <div
        ref={gutterRef}
        className="absolute inset-y-px left-0 w-14 overflow-hidden border-r border-border bg-card/80 pr-2 pt-3 text-right text-sm font-mono leading-6 text-muted-foreground select-none"
      >
        <div className="space-y-0 leading-6">
          {lineNumbers.map((line) => (
            <div key={line} className="leading-6">
              {line}
            </div>
          ))}
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        wrap="off"
        placeholder={placeholder}
        className="w-full h-[420px] pl-16 pr-4 py-3 bg-card border border-border rounded-lg font-mono text-sm leading-6 text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring transition-all scrollbar-thin overflow-x-auto"
        spellCheck={false}
      />
      <div className="absolute bottom-3 right-3 flex items-center gap-3 text-xs text-muted-foreground font-mono">
        <span>{lineCount} {t.linesCount}</span>
        <span>{charCount} {t.charCount}</span>
      </div>
    </div>
  );
};

export default SqlInputPanel;
