'use client';

import React, { useState } from 'react';
import { Code2, ChevronDown, CheckCircle2 } from 'lucide-react';
import AppImage from '@/components/ui/AppImage';
import { type SqlDialect } from '@/lib/sqlAnalyzer';

const DIALECTS: { value: SqlDialect; label: string; image: string }[] = [
  { value: 'mysql', label: 'MySQL', image: '/assets/images/my_sql_logo.png' },
  { value: 'postgresql', label: 'PostgreSQL', image: '/assets/images/postgresql_logo.jpg' },
  { value: 'sqlserver', label: 'SQL Server', image: '/assets/images/mssql_logo.png' },
  { value: 'oracle', label: 'Oracle DB', image: '/assets/images/oracle_logo.png' },
];

interface HeaderProps {
  dialect: SqlDialect;
  onDialectChange: (dialect: SqlDialect) => void;
  t: Record<string, string>;
}

export const Header: React.FC<HeaderProps> = ({ dialect, onDialectChange, t }) => {
  const [dialectOpen, setDialectOpen] = useState(false);
  const currentDialect = DIALECTS.find((d) => d.value === dialect);

  return (
    <div className="mb-8 overflow-x-auto scrollbar-thin pb-1">
      <div className="min-w-max flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Code2 size={22} className="text-primary" />
            {t.queryInputTitle}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t.queryInputSubtitle}</p>
        </div>
        {/* Dialect Selector */}
        <div className="relative">
          <button
            onClick={() => setDialectOpen((o) => !o)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-sm font-medium text-foreground hover:bg-muted transition-all duration-150"
          >
            <span className="text-muted-foreground text-xs">{t.dialectLabel}:</span>
            {currentDialect && (
              <AppImage
                src={currentDialect.image}
                alt={currentDialect.label}
                width={16}
                height={16}
                className="h-4 w-4 rounded-sm object-cover"
              />
            )}
            <span className="text-primary">{currentDialect?.label}</span>
            <ChevronDown size={14} className="text-muted-foreground" />
          </button>
          {dialectOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-lg shadow-xl z-50 py-1 animate-slide-up">
              {DIALECTS.map((d) => (
                <button
                  key={`dialect-${d.value}`}
                  onClick={() => {
                    onDialectChange(d.value);
                    setDialectOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                    dialect === d.value
                      ? 'text-primary bg-primary/10'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  {dialect === d.value && (
                    <CheckCircle2 size={12} className="text-primary flex-shrink-0" />
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
      </div>
    </div>
  );
};

export default Header;
