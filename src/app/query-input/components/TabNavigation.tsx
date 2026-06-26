'use client';

import React from 'react';
import { Code2, FileCode, BookOpen } from 'lucide-react';
import SmartSQLEditor from '@/components/SmartSQLEditor';

interface TabNavigationProps {
  inputMode: 'sql' | 'mybatis' | 'import-xml' | 'smart-editor';
  onTabChange: (mode: 'sql' | 'mybatis' | 'import-xml' | 'smart-editor') => void;
  t: Record<string, string>;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ inputMode, onTabChange, t }) => {
  const tabs: Array<{
    value: 'sql' | 'mybatis' | 'import-xml' | 'smart-editor';
    label: string;
    icon: React.ReactNode;
  }> = [
    { value: 'sql', label: t.tabPasteSQL || 'Paste SQL', icon: <Code2 size={14} /> },
    { value: 'mybatis', label: 'XML Content', icon: <FileCode size={14} /> },
    { value: 'import-xml', label: 'Import XML File', icon: <BookOpen size={14} /> },
    { value: 'smart-editor', label: '🚀 Smart Editor', icon: <Code2 size={14} /> },
  ];

  return (
    <div className="flex items-center border-b border-border overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={`tab-${tab.value}`}
          onClick={() => onTabChange(tab.value)}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-150 -mb-px whitespace-nowrap ${
            inputMode === tab.value
              ? 'tab-active'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default TabNavigation;
