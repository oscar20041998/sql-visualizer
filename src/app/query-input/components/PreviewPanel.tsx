'use client';

import React, { useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Copy, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import type { Translations } from '@/lib/i18n';
import { QueryInputPanel } from './QueryInputPanel';

interface PreviewPanelProps {
  currentSql: string;
  inputMode: string;
  t: Translations;
}

/**
 * Resolved SQL preview for the Query Input page (specs/008-query-input-ux T026).
 *
 * This panel is the source of truth for the SQL that analysis will consume: it carries
 * primary emphasis, states that the statement is final, stays read-only, and exposes an
 * accessible copy action. Empty content explains what is missing instead of going blank.
 */
export const PreviewPanel: React.FC<PreviewPanelProps> = ({ currentSql, inputMode, t }) => {
  const settings = useAppStore((store) => store.settings);
  const isSqlMode = inputMode === 'sql';
  const panelTitle = isSqlMode ? t.sqlReview : t.sqlResolved;

  const handleCopy = useCallback(() => {
    const normalizedSql = currentSql.replace(/\r\n?|\u2028|\u2029/g, '\n');
    navigator.clipboard.writeText(normalizedSql);
    toast.success(t.copied || 'Copied!');
  }, [currentSql, t]);

  const normalizedSql = currentSql.replace(/\r\n?|\u2028|\u2029/g, '\n');
  const lines = currentSql ? normalizedSql.split('\n') : [];

  return (
    <QueryInputPanel
      title={panelTitle}
      description={t.previewHint}
      icon={<Eye size={14} className="text-primary" aria-hidden />}
      emphasis="primary"
      className="h-full"
      bodyClassName="flex min-h-0 flex-grow flex-col p-2"
      actions={
        <>
          {currentSql && (
            <span className="font-mono text-xs text-muted-foreground">
              {lines.length} {t.linesCount}
            </span>
          )}
          <button
            type="button"
            onClick={handleCopy}
            disabled={!currentSql}
            aria-label={t.previewCopyLabel}
            title={t.previewCopyLabel}
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Copy size={13} aria-hidden />
          </button>
        </>
      }
    >
      {currentSql ? (
        <div className="h-full min-h-[320px] overflow-hidden rounded-md border border-border/80">
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
              scrollbar: { horizontal: 'auto', vertical: 'auto' },
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col items-start gap-1.5 px-2 py-4">
          <p className="text-sm font-medium text-foreground">
            {isSqlMode ? t.sqlEmpty : t.resolvedPreviewEmpty}
          </p>
          <p className="text-xs text-muted-foreground">
            {isSqlMode ? t.previewEmptySqlHint : t.previewEmptyResolvedHint}
          </p>
        </div>
      )}
    </QueryInputPanel>
  );
};

export default PreviewPanel;
