'use client';

import React, { useCallback } from 'react';
import { FileCode, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface MyBatisPanelProps {
  xmlContent: string;
  onXmlChange: (content: string) => void;
  onFileImport: (content: string, fileName: string) => void;
  placeholder: string;
  showFileImport: boolean;
}

export const MyBatisPanel: React.FC<MyBatisPanelProps> = ({
  xmlContent,
  onXmlChange,
  onFileImport,
  placeholder,
  showFileImport,
}) => {
  const handleXmlFileImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const content = await file.text();
        onFileImport(content, file.name);
        toast.success(`File "${file.name}" imported successfully`);
      } catch {
        toast.error('Failed to read XML file');
      }

      // Reset file input
      if (e.target) e.target.value = '';
    },
    [onFileImport]
  );

  return (
    <div className="space-y-4 animate-fade-in">
      {showFileImport ? (
        // File import UI
        <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-3 hover:border-primary/50 transition-colors cursor-pointer relative group">
          <input
            type="file"
            accept=".xml"
            onChange={handleXmlFileImport}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <FileCode
            size={32}
            className="text-muted-foreground group-hover:text-primary transition-colors"
          />
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">
              Drag XML file here or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              MyBatis XML files will be automatically parsed
            </p>
          </div>
        </div>
      ) : (
        // XML content textarea
        <div className="relative">
          <textarea
            value={xmlContent}
            onChange={(e) => onXmlChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-[280px] px-4 py-3 bg-card border border-border rounded-lg font-mono text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring transition-all scrollbar-thin code-block"
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
};

export default MyBatisPanel;
