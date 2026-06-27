'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { Translations } from '@/lib/i18n';

interface ParameterConfigProps {
  detectedParams: string[];
  myBatisParams: Record<string, string>;
  onParamChange: (key: string, value: string) => void;
  conditionalParams?: Record<string, string>;
  t: Translations;
}

export const ParameterConfig: React.FC<ParameterConfigProps> = ({
  detectedParams,
  myBatisParams,
  onParamChange,
  conditionalParams = {},
  t,
}) => {
  if (!detectedParams.length) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t.parametersTitle}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {detectedParams.length > 0
              ? `${detectedParams.length} ${t.paramDetected}`
              : t.noParamsFound}
          </p>
        </div>
        {detectedParams.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-mono">
            {detectedParams.length}
          </span>
        )}
      </div>

      {detectedParams.length === 0 ? (
        <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
          <AlertCircle size={14} />
          <span>{t.noParamsToConfigure}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {detectedParams.map((param) => (
            <div key={`param-${param}`} className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-muted-foreground font-mono">
                  #{'{'}
                  {param}
                  {'}'}
                </label>
                {conditionalParams[param] && (
                  <span className="text-[9px] text-accent bg-accent/10 px-1.5 py-0.5 rounded font-mono">
                    {t.conditionalLabel}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={myBatisParams[param] || ''}
                onChange={(e) => onParamChange(param, e.target.value)}
                placeholder={`${t.parameterValuePrefix} ${param}`}
                className="w-full px-3 py-1.5 bg-input border border-border rounded text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono transition-all"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ParameterConfig;
