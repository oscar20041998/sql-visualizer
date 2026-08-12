'use client';

import React, { useRef } from 'react';
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
  const charCount = normalizedValue.length;
  const lineNumbers = Array.from({ length: lineCount }, (_, index) => index + 1);

  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      const textarea = textareaRef.current;
      const gutter = gutterRef.current;
      const textareaScrollRange = textarea.scrollHeight - textarea.clientHeight;
      const gutterScrollRange = gutter.scrollHeight - gutter.clientHeight;
      const scrollRatio = textareaScrollRange > 0 ? textarea.scrollTop / textareaScrollRange : 0;

      gutter.scrollTop = scrollRatio * Math.max(0, gutterScrollRange);
    }
  };

  return (
    <div className="relative animate-fade-in">
      <div
        ref={gutterRef}
        className="absolute inset-y-0 left-0 w-14 overflow-hidden border-r border-border bg-card/80 pr-2 pt-3 text-right text-xs font-mono text-muted-foreground select-none"
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
        className="w-full h-[420px] pl-16 pr-4 py-3 bg-card border border-border rounded-lg font-mono text-sm leading-6 text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring transition-all scrollbar-thin code-block overflow-x-auto"
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
