'use client';

import React from 'react';
import { GitBranch } from 'lucide-react';
import { getT } from '@/lib/i18n';
import ReferencedTablesTable from './ReferencedTablesTable';
import type { TableNode } from '@/lib/sqlAnalyzer';

interface ReferencedTablesOverviewProps {
  tables: TableNode[];
  t: ReturnType<typeof getT>;
}

export default function ReferencedTablesOverview({
  tables,
  t,
}: ReferencedTablesOverviewProps) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <GitBranch size={15} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{t.referencedTablesTitle}</h3>
        <span className="ml-auto text-xs text-muted-foreground font-mono">
          {tables.length} {t.referencedTablesCount}
        </span>
      </div>

      <div className="p-5">
        <ReferencedTablesTable tables={tables} t={t} />
      </div>
    </div>
  );
}
