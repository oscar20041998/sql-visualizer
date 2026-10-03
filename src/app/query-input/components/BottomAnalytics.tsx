'use client';

import React from 'react';
import LintingAlerts from '@/components/ui/LintingAlerts';

interface BottomAnalyticsProps {
  currentSql: string;
}

/**
 * Findings area for the Query Input page (specs/008-query-input-ux T027/T028).
 *
 * The severity grouping, scanability and region semantics live with the shared linting
 * surface (`LintingAlerts`) so the Query Input page and the Smart SQL Editor stay aligned;
 * this wrapper only owns placement inside the workflow.
 */
export const BottomAnalytics: React.FC<BottomAnalyticsProps> = ({ currentSql }) => {
  if (!currentSql.trim()) return null;

  return (
    <div className="mt-6">
      <LintingAlerts sql={currentSql} compact={false} />
    </div>
  );
};

export default BottomAnalytics;
