'use client';

import React, { useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Eye, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';

interface PreviewPanelProps {
  currentSql: string;
  inputMode: string;
  t: Record<string, string>;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ currentSql, inputMode, t }) => {
  const settings = useAppStore((store) => store.settings);
  const panelTitle = inputMode === 'sql' ?  t.sqlReview :  t.sqlResolved;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(currentSql);
    toast.success(t.copied || 'Copied!');
  }, [currentSql, t]);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-primary" />
          <span className="text-sm font-medium text-foreground">{panelTitle}</span>
        </div>
        <button
          onClick={handleCopy}
          disabled={!currentSql}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Copy size={13} />
        </button>
      </div>
      <div className="p-2 overflow-hidden flex-grow min-h-0">
        {currentSql ? (
          <div className="h-full min-h-[220px] overflow-hidden rounded-md border border-border/80">
            <Editor
              height="100%"
              language="sql"
              theme={settings.theme === 'dark' ? 'vs-dark' : 'vs'}
              value={currentSql}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                fontSize: 12,
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
                lineNumbers: 'on',
                glyphMargin: false,
                folding: false,
                contextmenu: false,
              }}
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic pt-4">
            {inputMode === 'sql' ? t.sqlEmpty : t.resolvedPreviewEmpty}
          </p>
        )}
      </div>
    </div>
  );
};

export default PreviewPanel;
