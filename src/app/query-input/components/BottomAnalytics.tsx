'use client';

import React from 'react';
import LintingAlerts from '@/components/ui/LintingAlerts';

interface BottomAnalyticsProps {
  currentSql: string;
  t: Record<string, string>;
}

export const BottomAnalytics: React.FC<BottomAnalyticsProps> = ({ currentSql, t }) => {
  if (!currentSql) return null;

  return (
    <div className="mt-6">
      <LintingAlerts sql={currentSql} compact={false} />
    </div>
  );
};

export default BottomAnalytics;
