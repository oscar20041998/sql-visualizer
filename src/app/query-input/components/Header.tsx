'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Code2, ChevronDown, CheckCircle2, ChevronRight } from 'lucide-react';
import AppImage from '@/components/ui/AppImage';
import { type SqlDialect } from '@/lib/sql/sqlAnalyzer';

const DIALECTS: { value: SqlDialect; label: string; image: string }[] = [
  { value: 'mysql', label: 'MySQL', image: '/assets/images/my_sql_logo.png' },
  { value: 'postgresql', label: 'PostgreSQL', image: '/assets/images/postgresql_logo.jpg' },
  { value: 'sqlserver', label: 'SQL Server', image: '/assets/images/mssql_logo.png' },
  { value: 'oracle', label: 'Oracle DB', image: '/assets/images/oracle_logo.png' },
];

interface HeaderProps {
  t: Record<string, string>;
}

interface DialectSelectorProps extends HeaderProps {
  dialect: SqlDialect;
  onDialectChange: (dialect: SqlDialect) => void;
}

export const DialectSelector: React.FC<DialectSelectorProps> = ({
  dialect,
  onDialectChange,
  t,
}) => {
  const [dialectOpen, setDialectOpen] = useState(false);
  const dialectButtonRef = useRef<HTMLButtonElement | null>(null);
  const currentDialect = DIALECTS.find((d) => d.value === dialect);

  // Close the dialect disclosure on outside click / Escape so keyboard and mouse users
  // can always return to the workflow without hunting for the toggle.
  useEffect(() => {
    if (!dialectOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && !dialectButtonRef.current?.parentElement?.contains(target)) {
        setDialectOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDialectOpen(false);
        dialectButtonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dialectOpen]);

  return (
    <div className="relative ml-auto">
      <button
        ref={dialectButtonRef}
        type="button"
        aria-label={`${t.dialectLabel}: ${currentDialect?.label ?? dialect}`}
        aria-expanded={dialectOpen}
        aria-controls="dialect-options"
        onClick={() => setDialectOpen((o) => !o)}
        className="flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {currentDialect && (
          <AppImage
            src={currentDialect.image}
            alt={currentDialect.label}
            width={16}
            height={16}
            className="h-4 w-4 rounded-sm object-cover"
          />
        )}
        <span>{currentDialect?.label}</span>
        <ChevronDown size={14} className="text-muted-foreground" />
      </button>
      {dialectOpen && (
        <div
          id="dialect-options"
          role="group"
          aria-label={t.dialectLabel}
          className="absolute right-0 top-full z-50 mt-1 w-44 animate-slide-up rounded-lg border border-border bg-card py-1 shadow-lg"
        >
          {DIALECTS.map((d) => (
            <button
              key={`dialect-${d.value}`}
              type="button"
              aria-current={dialect === d.value}
              onClick={() => {
                onDialectChange(d.value);
                setDialectOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                dialect === d.value
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {dialect === d.value && (
                <CheckCircle2 size={12} className="flex-shrink-0 text-primary" aria-hidden />
              )}
              {dialect !== d.value && <span className="w-3" />}
              <AppImage
                src={d.image}
                alt={d.label}
                width={14}
                height={14}
                className="h-3.5 w-3.5 rounded-sm object-cover"
              />
              {d.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const Header: React.FC<HeaderProps> = ({ t }) => {
  const workflowSteps = [
    t.workflowStepInput,
    t.workflowStepConfigure,
    t.workflowStepReview,
    t.workflowStepAnalyze,
  ];

  return (
    <div className="min-w-0">
      <h1 className="flex items-center gap-2 text-page-title text-foreground">
        <span className="floating-header-icon"><Code2 size={20} aria-hidden /></span>
        {t.queryInputTitle}
      </h1>
      <ol
        aria-label={t.workflowStepsLabel}
        className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
      >
        {workflowSteps.map((step, index) => (
          <li key={`workflow-${step}`} className="flex items-center gap-2">
            {index > 0 && (
              <ChevronRight size={12} className="text-muted-foreground/60" aria-hidden />
            )}
            <span className={`whitespace-nowrap ${index === 0 ? 'font-medium text-primary' : 'text-muted-foreground'}`}>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default Header;
