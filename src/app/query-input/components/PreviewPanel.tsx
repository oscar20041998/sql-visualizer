'use client';

import React, { useCallback } from 'react';
import { Eye, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface PreviewPanelProps {
  currentSql: string;
  inputMode: string;
  t: Record<string, string>;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ currentSql, inputMode, t }) => {
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(currentSql);
    toast.success(t.copied || 'Copied!');
  }, [currentSql, t]);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-primary" />
          <span className="text-sm font-medium text-foreground">
            {inputMode === 'sql' ? 'SQL Preview' : 'Resolved Query'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          disabled={!currentSql}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Copy size={13} />
        </button>
      </div>
      <div className="p-4 overflow-auto scrollbar-thin flex-grow max-h-full">
        {currentSql ? (
          <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed">
            {currentSql}
          </pre>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            {t.resolvedPreviewEmpty || 'No SQL to preview'}
          </p>
        )}
      </div>
    </div>
  );
};

export default PreviewPanel;
