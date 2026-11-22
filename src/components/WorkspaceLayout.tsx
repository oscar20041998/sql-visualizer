'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import AppLayout from '@/components/AppLayout';

const WORKSPACE_ROUTES = new Set([
  '/query-input',
  '/query-history',
  '/smart-sql-editor',
  '/sql-metrics-dashboard',
  '/relationship-graph-visualizer',
  '/cte-analysis',
  '/database-ai-assistant',
  '/guideline',
  '/settings-preferences',
]);

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return WORKSPACE_ROUTES.has(pathname) ? <AppLayout>{children}</AppLayout> : children;
}
