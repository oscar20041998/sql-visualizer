'use client';

import React, { useRef } from 'react';
import { Braces, Code2, BookOpen, Database, FileCode2, Wand2 } from 'lucide-react';

export type QueryInputMode =
  | 'sql'
  | 'mybatis'
  | 'import-xml'
  | 'smart-editor'
  | 'code-generator'
  | 'database-object';

interface TabNavigationProps {
  inputMode: QueryInputMode;
  onTabChange: (mode: QueryInputMode) => void;
  t: Record<string, string>;
}

/**
 * Input-method switcher for the Query Input page (specs/008-query-input-ux T013).
 *
 * Follows the WAI-ARIA tabs pattern (roving tabindex + arrow keys) so the active
 * input method is announced and reachable by keyboard. The selection is marked by
 * `aria-selected` plus a visible underline — never by color alone.
 */
export const TabNavigation: React.FC<TabNavigationProps> = ({ inputMode, onTabChange, t }) => {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const tabs: Array<{ value: QueryInputMode; label: string; icon: React.ReactNode }> = [
    { value: 'sql', label: t.tabPasteSQL, icon: <Code2 size={13} aria-hidden /> },
    { value: 'import-xml', label: t.tabImportMyBatis, icon: <FileCode2 size={13} aria-hidden /> },
    { value: 'mybatis', label: t.tabMyBatisContent, icon: <BookOpen size={13} aria-hidden /> },
    { value: 'smart-editor', label: t.tabSmartEditor, icon: <Wand2 size={13} aria-hidden /> },
    { value: 'code-generator', label: t.tabCodeGenerator, icon: <Braces size={13} aria-hidden /> },
    {
      value: 'database-object',
      label: t.tabDatabaseObject,
      icon: <Database size={13} aria-hidden />,
    },
  ];

  const activateTab = (index: number) => {
    tabRefs.current[index]?.focus();
    onTabChange(tabs[index].value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;

    if (nextIndex === null) return;
    event.preventDefault();
    activateTab(nextIndex);
  };

  return (
    <div
      role="tablist"
      aria-label={t.inputMethodLabel}
      className="flex flex-wrap items-center gap-x-1 border-b border-border bg-background"
    >
      {tabs.map((tab, index) => {
        const isActive = inputMode === tab.value;
        return (
          <button
            key={`tab-${tab.value}`}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            id={`tab-${tab.value}`}
            role="tab"
            type="button"
            aria-label={tab.label}
            aria-selected={isActive}
            aria-controls="query-input-tabpanel"
            tabIndex={isActive ? 0 : -1}
            data-active={isActive}
            onClick={() => onTabChange(tab.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`group relative -mb-px flex h-11 w-11 items-center justify-center border-b active:text-primary disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent font-medium text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute top-full z-20 mt-2 whitespace-nowrap rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground opacity-0 shadow-sm group-hover:opacity-100 group-focus-visible:opacity-100 ${
                index === 0
                  ? 'left-0'
                  : index === tabs.length - 1
                    ? 'right-0'
                    : 'left-1/2 -translate-x-1/2'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default TabNavigation;
