'use client';

import React, { useState } from 'react';
import { Zap, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';

export interface FormatSqlPanelProps {
  /** Current editor SQL, shown as the live result in the panel once formatting completes. */
  sql: string;
  /** True while a format pass is in flight (shows a busy label on the Format button). */
  isFormatting: boolean;
  /** Runs the existing format action; on error the page surfaces the FormatErrorPanel. */
  onFormat: () => void;
}

/**
 * Right-side "Format SQL" panel. A collapsed horizontal tab (docked to the right edge, stacked
 * below the AI Explainer tab) opens a docked panel holding the Format action and a live preview of
 * the editor SQL. Formatting logic itself is unchanged — it lives in the parent editor and this
 * component only re-presents it, so success/error behaviour is identical (spec 012 surface parity).
 */
export const FormatSqlPanel: React.FC<FormatSqlPanelProps> = ({ sql, isFormatting, onFormat }) => {
  const settings = useAppStore((state) => state.settings);
  const t = getT(settings.locale);
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={t.formatSqlButton}
        className="group fixed right-0 top-[calc(50%_+_2.75rem)] z-40 flex -translate-y-1/2 items-center gap-0 rounded-l-lg border border-r-0 border-border bg-card px-2.5 py-2 text-foreground shadow-lg transition-all duration-200 group-hover:gap-2 hover:bg-muted hover:pr-3"
      >
        <Zap size={16} className="shrink-0" aria-hidden="true" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-semibold tracking-wide opacity-0 transition-all duration-200 group-hover:max-w-[12rem] group-hover:opacity-100">
          {t.smartEditorFormat}
        </span>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm animate-fade-in"
      onClick={() => setIsOpen(false)}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="smart-sql-editor-theme fixed inset-y-0 right-0 z-[60] flex h-full w-full flex-col overflow-hidden border-l border-border bg-card shadow-2xl animate-slide-in-right sm:max-w-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Zap size={14} aria-hidden="true" />
            {t.formatSqlButton}
          </h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label={t.smartEditorOptimizeModalClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-3">
          <button
            type="button"
            onClick={onFormat}
            disabled={isFormatting || !sql.trim()}
            className="flex items-center gap-2 rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Zap size={12} />
            {isFormatting ? t.smartEditorFormatting : t.smartEditorFormat}
          </button>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t.smartEditorFormatResultLabel}
            </p>
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded border border-border bg-muted/50 p-3 font-mono text-xs text-foreground">
              {sql.trim() ? sql : t.smartEditorEmptySqlHint}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormatSqlPanel;
