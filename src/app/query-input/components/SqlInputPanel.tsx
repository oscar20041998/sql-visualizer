'use client';

import React from 'react';

interface SqlInputPanelProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export const SqlInputPanel: React.FC<SqlInputPanelProps> = ({ value, onChange, placeholder }) => {
  const lineCount = value.split('\n').length;
  const charCount = value.length;

  return (
    <div className="relative animate-fade-in">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-[420px] px-4 py-3 bg-card border border-border rounded-lg font-mono text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring transition-all scrollbar-thin code-block"
        spellCheck={false}
      />
      <div className="absolute bottom-3 right-3 flex items-center gap-3 text-xs text-muted-foreground font-mono">
        <span>{lineCount} lines</span>
        <span>{charCount} chars</span>
      </div>
    </div>
  );
};

export default SqlInputPanel;
