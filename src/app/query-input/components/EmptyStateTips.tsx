'use client';

import React from 'react';
import { Lightbulb } from 'lucide-react';
import type { Translations } from '@/lib/i18n';
import { QueryInputPanel } from './QueryInputPanel';

interface EmptyStateTipsProps {
  tips: string[];
  t: Translations;
}

/**
 * Empty-state guidance for the Query Input page (specs/008-query-input-ux T009 / T038).
 * Shares the Query Input panel contract and keeps all copy in the i18n resources.
 */
export const EmptyStateTips: React.FC<EmptyStateTipsProps> = ({ tips, t }) => {
  return (
    <QueryInputPanel
      title={t.tipsTitle}
      icon={<Lightbulb size={14} className="text-primary" aria-hidden />}
    >
      <ul className="space-y-2">
        {tips.map((tip, i) => (
          <li key={`tip-${i}`} className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="mt-0.5 flex-shrink-0 text-primary" aria-hidden>
              ›
            </span>
            {tip}
          </li>
        ))}
      </ul>
    </QueryInputPanel>
  );
};

export default EmptyStateTips;
