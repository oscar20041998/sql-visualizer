'use client';

import React, { useCallback, useId } from 'react';
import { FileCode, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Translations } from '@/lib/i18n';

interface MyBatisPanelProps {
  xmlContent: string;
  onXmlChange: (content: string) => void;
  onFileImport: (content: string, fileName: string) => void;
  /** Clears the loaded XML (and its file metadata) without touching the workflow order. */
  onRemoveFile?: () => void;
  /** Name of the XML file currently providing the statement, when one was imported. */
  importedFileName?: string | null;
  placeholder: string;
  showFileImport: boolean;
  t: Translations;
}

/**
 * MyBatis XML input for the Query Input page (specs/008-query-input-ux T022).
 *
 * Unlike before, the imported file stays discoverable together with a removal action,
 * and every message is routed through the existing i18n resources.
 */
export const MyBatisPanel: React.FC<MyBatisPanelProps> = ({
  xmlContent,
  onXmlChange,
  onFileImport,
  onRemoveFile,
  importedFileName = null,
  placeholder,
  showFileImport,
  t,
}) => {
  const fileInputId = useId();

  const handleXmlFileImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const content = await file.text();
        onFileImport(content, file.name);
        toast.success(t.myBatisFileImported.replace('{file}', file.name));
      } catch {
        toast.error(t.myBatisFileReadError);
      }

      // Reset file input
      if (e.target) e.target.value = '';
    },
    [onFileImport, t.myBatisFileImported, t.myBatisFileReadError]
  );

  return (
    <div className="space-y-3">
      {showFileImport ? (
        // File import UI
        <div className="group relative flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary/50">
          <input
            id={fileInputId}
            type="file"
            accept=".xml"
            aria-label={t.myBatisDropTitle}
            onChange={handleXmlFileImport}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <FileCode
            size={32}
            className="text-muted-foreground transition-colors group-hover:text-primary"
            aria-hidden
          />
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">{t.myBatisDropTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.myBatisDropHint}</p>
          </div>
        </div>
      ) : (
        // XML content textarea
        <textarea
          value={xmlContent}
          onChange={(e) => onXmlChange(e.target.value)}
          placeholder={placeholder}
          aria-label={t.myBatisPanelTitle}
          className="code-block scrollbar-thin h-[280px] w-full resize-none rounded-lg border border-border bg-card px-4 py-3 font-mono text-sm text-foreground placeholder-muted-foreground transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
          spellCheck={false}
        />
      )}

      {/* Imported file metadata stays visible so the current source is never ambiguous. */}
      {importedFileName && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{t.myBatisCurrentFileLabel}: </span>
            <span className="font-mono">{importedFileName}</span>
          </p>
          {onRemoveFile && (
            <button
              type="button"
              onClick={onRemoveFile}
              className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 size={13} aria-hidden />
              {t.myBatisRemoveFile}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MyBatisPanel;
