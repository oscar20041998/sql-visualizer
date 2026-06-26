'use client';

import React from 'react';

interface EmptyStateTipsProps {
  tips: string[];
}

export const EmptyStateTips: React.FC<EmptyStateTipsProps> = ({ tips }) => {
  return (
    <div className="bg-card border border-border rounded-lg p-6 mt-6">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Tips
      </h3>
      <ul className="space-y-2">
        {tips.map((tip, i) => (
          <li key={`tip-${i}`} className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="text-primary mt-0.5 flex-shrink-0">›</span>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EmptyStateTips;
