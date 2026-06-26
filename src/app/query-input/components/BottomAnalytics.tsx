'use client';

import React from 'react';
import ComplexityDashboard from '@/components/ui/ComplexityDashboard';
import LintingAlerts from '@/components/ui/LintingAlerts';

interface BottomAnalyticsProps {
  currentSql: string;
  t: Record<string, string>;
}

export const BottomAnalytics: React.FC<BottomAnalyticsProps> = ({ currentSql, t }) => {
  if (!currentSql) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Complexity Dashboard */}
      <ComplexityDashboard sql={currentSql} showDetails={true} />

      {/* Linting Alerts */}
      <LintingAlerts sql={currentSql} compact={false} />
    </div>
  );
};

export default BottomAnalytics;
