'use client';

import React from 'react';
import { Play, Trash2, BookOpen } from 'lucide-react';

interface ActionButtonsProps {
  onAnalyze: () => void;
  onLoadSample: () => void;
  onClear: () => void;
  onAnalyzeCTE?: () => void;
  isLoading: boolean;
  showAnalyzeCTE?: boolean;
  t: Record<string, string>;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onAnalyze,
  onLoadSample,
  onClear,
  onAnalyzeCTE,
  isLoading,
  showAnalyzeCTE,
  t,
}) => {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onAnalyze}
        disabled={isLoading}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            {t.analyzing || 'Analyzing'}
          </>
        ) : (
          <>
            <Play size={14} />
            {t.analyzeButton || 'Analyze'}
          </>
        )}
      </button>
      <button
        onClick={onLoadSample}
        className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all duration-150"
      >
        <BookOpen size={14} />
        {t.loadSample || 'Load Sample'}
      </button>
      {showAnalyzeCTE && onAnalyzeCTE && (
        <button
          onClick={onAnalyzeCTE}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-foreground rounded-lg text-sm font-semibold hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t.navCTEAnalysis || 'Analyze CTE'}
        </button>
      )}
      <button
        onClick={onClear}
        className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all duration-150"
      >
        <Trash2 size={14} />
        {t.clearButton || 'Clear'}
      </button>
    </div>
  );
};

export default ActionButtons;
