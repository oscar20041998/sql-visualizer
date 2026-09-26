'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';

export interface FormatSqlPanelProps {
  /** Current editor SQL; an empty editor disables the button rather than formatting nothing. */
  sql: string;
  /** True while a format pass is in flight (shows a busy label on the button). */
  isFormatting: boolean;
  /** Runs the existing format action; on error the page surfaces the FormatErrorPanel. */
  onFormat: () => void;
}

/**
 * The editor's Format action: one button that formats the current SQL.
 *
 * This used to be a collapsed tab docked to the right edge that opened a drawer holding a live
 * preview of the editor SQL. It is a plain button again and the preview is gone with it: the
 * editor is where you read what formatting produced, and a second copy of the SQL in a drawer only
 * invited editing the copy instead of the real thing. The formatting logic is untouched - it lives
 * in the parent editor - so success and error behaviour are unchanged, including the error panel
 * the page opens when formatting fails.
 */
export const FormatSqlPanel: React.FC<FormatSqlPanelProps> = ({ sql, isFormatting, onFormat }) => {
  const settings = useAppStore((state) => state.settings);
  const t = getT(settings.locale);

  return (
    <div className="flex px-4 pt-3">
      <button
        type="button"
        onClick={onFormat}
        disabled={isFormatting || !sql.trim()}
        aria-label={t.formatSqlButton}
        className="flex items-center gap-2 rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Zap size={12} aria-hidden="true" />
        {isFormatting ? t.smartEditorFormatting : t.smartEditorFormat}
      </button>
    </div>
  );
};

export default FormatSqlPanel;