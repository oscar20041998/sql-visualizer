'use client';

import React, { useId } from 'react';
import { Play, Trash2, BookOpen } from 'lucide-react';

interface ActionButtonsProps {
  onAnalyze: () => void;
  onLoadSample: () => void;
  onClear: () => void;
  isLoading: boolean;
  t: Record<string, string>;
}

/**
 * Action bar for the Query Input page (specs/008-query-input-ux T014).
 *
 * Analyze is the single primary CTA; Load Sample and Clear stay available but
 * visually subordinate. `data-action` / `data-variant` document that hierarchy so
 * it stays explicit for reviewers and tests.
 */
export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onAnalyze,
  onLoadSample,
  onClear,
  isLoading,
  t,
}) => {
  const hintId = useId();

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-action="analyze"
          data-variant="primary"
          onClick={onAnalyze}
          disabled={isLoading}
          aria-busy={isLoading}
          aria-describedby={hintId}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                aria-hidden
              />
              {t.analyzing || 'Analyzing'}
            </>
          ) : (
            <>
              <Play size={14} aria-hidden />
              {t.analyzeButton || 'Analyze'}
            </>
          )}
        </button>

        <button
          type="button"
          data-action="load-sample"
          data-variant="secondary"
          onClick={onLoadSample}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
        >
          <BookOpen size={14} aria-hidden />
          {t.loadSample || 'Load Sample'}
        </button>

        <button
          type="button"
          data-action="clear"
          data-variant="secondary"
          onClick={onClear}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
        >
          <Trash2 size={14} aria-hidden />
          {t.clearButton || 'Clear'}
        </button>
      </div>

      <p id={hintId} className="text-xs text-muted-foreground">
        {t.analyzeHint}
      </p>
    </div>
  );
};

export default ActionButtons;
