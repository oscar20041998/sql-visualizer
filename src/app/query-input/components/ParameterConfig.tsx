'use client';

import React, { useId, useState } from 'react';
import { Info, Search, SlidersHorizontal, X } from 'lucide-react';
import type { Translations } from '@/lib/i18n';
import { QueryInputPanel } from './QueryInputPanel';

interface ParameterConfigProps {
  detectedParams: string[];
  myBatisParams: Record<string, string>;
  onParamChange: (key: string, value: string) => void;
  conditionalParams?: Record<string, string>;
  t: Translations;
}

/** Beyond this many parameters the search field appears, so small sets stay compact. */
const PARAM_SEARCH_THRESHOLD = 6;

/**
 * Parameter configuration for the Query Input page (specs/008-query-input-ux T020/T021).
 *
 * Presentation only: it still edits the same `myBatisParams` map, but makes the
 * name → value relationship explicit, states that values are needed to resolve the
 * final SQL, and adds a filter for long parameter lists.
 */
export const ParameterConfig: React.FC<ParameterConfigProps> = ({
  detectedParams,
  myBatisParams,
  onParamChange,
  conditionalParams = {},
  t,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchId = useId();
  const hintId = useId();

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleParams = normalizedQuery
    ? detectedParams.filter((param) => param.toLowerCase().includes(normalizedQuery))
    : detectedParams;
  const showSearch = detectedParams.length > PARAM_SEARCH_THRESHOLD;

  if (!detectedParams.length) {
    return (
      <QueryInputPanel
        title={t.parametersTitle}
        icon={<SlidersHorizontal size={14} className="text-primary" aria-hidden />}
      >
        <div className="flex items-start gap-2">
          <Info size={14} className="mt-0.5 flex-shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <p className="text-sm font-medium text-foreground">{t.parametersNoneTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.parametersNoneHint}</p>
          </div>
        </div>
      </QueryInputPanel>
    );
  }

  return (
    <QueryInputPanel
      title={t.parametersTitle}
      description={t.parametersSubtitle}
      icon={<SlidersHorizontal size={14} className="text-primary" aria-hidden />}
      badge={
        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs font-medium text-primary">
          {detectedParams.length} {t.paramDetected}
        </span>
      }
      actions={
        showSearch ? (
          <div className="relative">
            <Search
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              id={searchId}
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label={t.parametersSearchLabel}
              placeholder={t.parametersSearchPlaceholder}
              className="w-full rounded-md border border-border bg-input py-1.5 pl-8 pr-8 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:w-56"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={t.parametersSearchClear}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X size={12} aria-hidden />
              </button>
            )}
          </div>
        ) : undefined
      }
    >
      <p id={hintId} className="text-xs text-muted-foreground">
        {t.parametersRequiredHint}
      </p>

      {normalizedQuery && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t.parametersVisibleCount
            .replace('{visible}', String(visibleParams.length))
            .replace('{total}', String(detectedParams.length))}
        </p>
      )}

      {visibleParams.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {t.parametersEmptyMatch.replace('{query}', searchQuery.trim())}
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visibleParams.map((param) => {
            const inputId = `param-value-${param}`;
            return (
              <div key={`param-${param}`} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor={inputId}
                    className="font-mono text-xs font-medium text-foreground"
                  >
                    #{'{'}
                    {param}
                    {'}'}
                  </label>
                  {conditionalParams[param] && (
                    <span className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] text-accent">
                      {t.conditionalLabel}
                    </span>
                  )}
                </div>
                <input
                  id={inputId}
                  type="text"
                  value={myBatisParams[param] || ''}
                  onChange={(e) => onParamChange(param, e.target.value)}
                  placeholder={`${t.parameterValuePrefix} ${param}`}
                  aria-describedby={hintId}
                  className="w-full rounded border border-border bg-input px-3 py-1.5 font-mono text-sm text-foreground placeholder-muted-foreground transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            );
          })}
        </div>
      )}
    </QueryInputPanel>
  );
};

export default ParameterConfig;
