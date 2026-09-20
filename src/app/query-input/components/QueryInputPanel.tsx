'use client';

import React, { useId } from 'react';

export type QueryInputPanelEmphasis = 'default' | 'primary';

export interface QueryInputPanelProps {
  /** Panel title. When omitted the shell renders body-only. */
  title?: React.ReactNode;
  /** One-line explanation shown under the title. */
  description?: React.ReactNode;
  /** Leading icon rendered before the title. */
  icon?: React.ReactNode;
  /** Small status/badge rendered right after the title. */
  badge?: React.ReactNode;
  /** Trailing controls (counters, actions) rendered on the right of the header. */
  actions?: React.ReactNode;
  /** Heading level so nested panels keep a valid document outline. */
  headingLevel?: 2 | 3;
  /** Visual weight of the panel; 'primary' is reserved for the resolved SQL area. */
  emphasis?: QueryInputPanelEmphasis;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  children?: React.ReactNode;
}

/**
 * Shared visual contract for the Query Input route (specs/008-query-input-ux T009).
 *
 * Every step of the workflow (input, parameter configuration, resolved SQL, tips)
 * renders through this shell so grouping, spacing, border treatment and semantic
 * emphasis stay consistent instead of each panel inventing its own card style.
 * It is presentation-only: it owns no state and changes no business behaviour.
 */
export const QueryInputPanel: React.FC<QueryInputPanelProps> = ({
  title,
  description,
  icon,
  badge,
  actions,
  headingLevel = 2,
  emphasis = 'default',
  className = '',
  headerClassName = '',
  bodyClassName = '',
  children,
}) => {
  const generatedId = useId();
  const headingId = `${generatedId}-heading`;
  const Heading = headingLevel === 3 ? 'h3' : 'h2';

  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className={`flex flex-col rounded-lg border bg-card ${
        emphasis === 'primary' ? 'border-primary/40' : 'border-border'
      } ${className}`}
    >
      {title && (
        <header
          className={`flex flex-shrink-0 flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3 ${headerClassName}`}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Heading
                id={headingId}
                className="flex items-center gap-2 text-sm font-semibold text-foreground"
              >
                {icon}
                <span className="min-w-0 truncate">{title}</span>
              </Heading>
              {badge}
            </div>
            {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={`px-4 py-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
};

export default QueryInputPanel;
