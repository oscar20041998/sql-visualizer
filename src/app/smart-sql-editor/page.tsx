'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { format } from 'sql-formatter';
import SmartSQLEditor, {
  type SmartSQLEditorApi,
} from '@/app/smart-sql-editor/components/SmartSQLEditor';
import AiSqlExplainer from '@/app/smart-sql-editor/components/AiSqlExplainer';
import FormatErrorPanel from '@/app/smart-sql-editor/components/FormatErrorPanel';
import { getT } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import AppLayout from '@/components/AppLayout';
import type { FormatError } from '@/lib/sql/formatError';
import {
  FormatAiError,
  requestFormatExplanation,
  requestFormatFix,
  type FormatExplanation,
} from '@/lib/ai/formatErrorAi';
import type { AIModelConfig } from '@/lib/store';
import { toast } from 'sonner';

/** Formatter language for client-side validation that an AI fix actually formats. */
function toFormatterLanguage(
  dialect: FormatError['dialect']
): 'mysql' | 'postgresql' | 'tsql' | 'plsql' {
  if (dialect === 'postgresql') return 'postgresql';
  if (dialect === 'sqlserver') return 'tsql';
  if (dialect === 'oracle') return 'plsql';
  return 'mysql';
}

const SAMPLE_QUERIES = {
  simple: 'SELECT id, name, email FROM users LIMIT 10;',
  withJoin: `SELECT u.id, u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.active = 1
GROUP BY u.id, u.name
ORDER BY order_count DESC;`,
  withCTE: `WITH active_users AS (
  SELECT id, name, created_at FROM users WHERE active = 1
),
recent_orders AS (
  SELECT user_id, COUNT(*) as order_count FROM orders WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY user_id
)
SELECT au.id, au.name, COALESCE(ro.order_count, 0) as recent_orders
FROM active_users au
LEFT JOIN recent_orders ro ON au.id = ro.user_id
ORDER BY recent_orders DESC;`,
  complex: `SELECT 
  u.id,
  u.name,
  COUNT(DISTINCT o.id) as total_orders,
  SUM(o.amount) as total_spent,
  AVG(o.amount) as avg_order_value,
  MAX(o.created_at) as last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.active = 1 AND u.created_at > DATE_SUB(NOW(), INTERVAL 1 YEAR)
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 0
ORDER BY total_spent DESC
LIMIT 50;`,
};

export default function SmartSQLEditorPage() {
  const [selectedQuery, setSelectedQuery] = useState<keyof typeof SAMPLE_QUERIES>('simple');
  const [currentSql, setCurrentSql] = useState<string>(SAMPLE_QUERIES.simple);
  const [optimizationResult, setOptimizationResult] = useState<
    null | import('@/lib/ai/aiService').SqlOptimizationResult
  >(null);
  const [hydrated, setHydrated] = useState(false);
  // Format-error report state lives here rather than inside the panel so the error survives a
  // close/reopen and is always in sync with the SQL the editor actually failed on (FR-004).
  const [formatError, setFormatError] = useState<FormatError | null>(null);
  const [isErrorPanelOpen, setIsErrorPanelOpen] = useState(false);
  const editorApiRef = useRef<SmartSQLEditorApi | null>(null);
  const settings = useAppStore((s) => s.settings);
  const t = getT(settings.locale);

  useEffect(() => {
    setHydrated(true);
  }, []);

  /** A new failure replaces the previous report and forces the panel open (FR-003, edge case). */
  const handleFormatError = useCallback((error: FormatError) => {
    setFormatError(error);
    setIsErrorPanelOpen(true);
  }, []);

  /** Format success leaves the panel state untouched — there is simply nothing to report. */
  const handleSqlChange = useCallback((sql: string) => {
    setCurrentSql(sql);
  }, []);

  /**
   * Local-Ollama-only Explain action (FR-011). The config is cloned with provider forced to
   * `ollama` before the request leaves this page, so even a store that currently points at a
   * cloud provider cannot route this feature's SQL off-device (FR-014).
   */
  const handleRequestExplain = useCallback(
    (error: FormatError): Promise<FormatExplanation> => {
      const localOnlyConfig: AIModelConfig = {
        ...settings.aiConfig,
        provider: 'ollama',
      };
      return requestFormatExplanation(error, localOnlyConfig, settings.locale);
    },
    [settings.aiConfig, settings.locale]
  );

  /**
   * Local-Ollama-only Fix action (FR-011 / FR-014). A proposed fix is validated by re-running the
   * formatter: if it still fails, the promise rejects and the panel shows the invalid state
   * (contract §3). The editor is never touched here — that happens only on Apply (FR-010).
   */
  const handleRequestFix = useCallback(
    async (error: FormatError): Promise<string> => {
      const localOnlyConfig: AIModelConfig = {
        ...settings.aiConfig,
        provider: 'ollama',
      };
      const correctedSql = await requestFormatFix(error, localOnlyConfig);
      try {
        format(correctedSql, { language: toFormatterLanguage(error.dialect) });
      } catch {
        throw new FormatAiError({
          kind: 'malformed',
          message: 'The proposed SQL still fails to format.',
          retryable: true,
        });
      }
      return correctedSql;
    },
    [settings.aiConfig]
  );

  /**
   * Applies a confirmed AI fix: replaces the editor SQL, re-formats it for consistency with the
   * success flow, and clears the report. Falls back to the raw proposal when the final re-format
   * unexpectedly fails, so a confirmed fix is never lost.
   */
  const handleApplyFormatFix = useCallback(
    (sql: string) => {
      const language = toFormatterLanguage(formatError?.dialect ?? 'mysql');
      let applied = sql;
      try {
        applied = format(sql, { language });
      } catch {
        // Keep the user's confirmed proposal; the panel already validated a re-format.
      }
      editorApiRef.current?.setSql(applied);
      setCurrentSql(applied);
      setFormatError(null);
      setIsErrorPanelOpen(false);
      toast.success(t.formatErrorPanelFixApplied);
    },
    [formatError?.dialect, t]
  );

  /** Dismissing a proposal keeps the editor untouched (FR-010) and reports it via toast. */
  const handleDismissFormatFix = useCallback(() => {
    toast.info(t.formatErrorPanelFixDismissed);
  }, [t]);

  // The chrome renders immediately; only the body waits for hydration, since its text comes
  // from locale settings held in persisted (localStorage) state.
  if (!hydrated) return <AppLayout>{null}</AppLayout>;

  return (
    <AppLayout>
      <div className="smart-sql-editor-theme flex flex-col bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card p-6 shadow-sm">
          <div className="max-w-7xl mx-auto">
            <h1 className="mb-2 text-3xl font-bold text-foreground">{t.editorPageTitle}</h1>
            <p className="text-muted-foreground">{t.editorPageSubtitle}</p>
          </div>
        </div>

        {/* Sample Query Selector */}
        <div className="border-b border-border bg-muted/50 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <p className="mb-3 text-sm font-semibold text-foreground">
              {t.editorPageLoadSampleQueryLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(SAMPLE_QUERIES).map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedQuery(key as keyof typeof SAMPLE_QUERIES)}
                  className={`px-4 py-2 rounded font-medium transition ${
                    selectedQuery === key
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'border border-border bg-card text-foreground hover:bg-muted'
                  }`}
                >
                  {key === 'simple' && t.editorPageQuerySimple}
                  {key === 'withJoin' && t.editorPageQueryWithJoin}
                  {key === 'withCTE' && t.editorPageQueryWithCTE}
                  {key === 'complex' && t.editorPageQueryComplex}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col w-full">
          <div className="max-w-7xl mx-auto w-full p-6 flex flex-col gap-4">
            <div className="flex-shrink-0 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-foreground">
              <p className="mb-2 font-semibold">{t.editorPageProTipsTitle}</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>{t.editorPageProTip1}</li>
                <li>{t.editorPageProTip2}</li>
                <li>{t.editorPageProTip3}</li>
                <li>{t.editorPageProTip4}</li>
                <li>{t.editorPageProTip5}</li>
                <li>{t.editorPageProTip6}</li>
              </ul>
            </div>

            {/* Editor + right-side format-error report (spec 012) */}
            <div className="flex min-h-[620px] flex-col gap-3 lg:flex-row lg:items-stretch">
              <div className="flex min-h-[620px] flex-1 flex-col">
                <SmartSQLEditor
                  initialSql={SAMPLE_QUERIES[selectedQuery]}
                  onSqlChange={handleSqlChange}
                  onOptimizationResult={setOptimizationResult}
                  onFormatError={handleFormatError}
                  apiRef={editorApiRef}
                />
              </div>
              {formatError && (
                <FormatErrorPanel
                  error={formatError}
                  isOpen={isErrorPanelOpen}
                  onToggle={setIsErrorPanelOpen}
                  currentSql={currentSql}
                  onRequestExplain={handleRequestExplain}
                  onRequestFix={handleRequestFix}
                  onApplyFix={handleApplyFormatFix}
                  onDismissFix={handleDismissFormatFix}
                />
              )}
            </div>

            {/* SQL → natural language */}
            <AiSqlExplainer sql={currentSql} optimizationResult={optimizationResult} />
          </div>
        </div>

        {/* Footer with Instructions */}
        <div className="overflow-y-auto border-t border-border bg-card p-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Setup Instructions */}
              <div>
                <h3 className="mb-3 text-lg font-bold text-foreground">{t.editorPageSetupTitle}</h3>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">1.</span>
                    <span>{t.editorPageInstallDepsLabel}</span>
                  </li>
                  <li className="ml-6 rounded bg-muted p-2 font-mono text-xs text-foreground">
                    {t.editorPageInstallDepsCmd}
                  </li>
                  <li className="flex gap-2 mt-3">
                    <span className="font-bold text-primary">2.</span>
                    <span>{t.editorPageStartOllamaLabel}</span>
                  </li>
                  <li className="ml-6 rounded bg-muted p-2 font-mono text-xs text-foreground">
                    {t.editorPageStartOllamaCmd}
                  </li>
                  <li className="flex gap-2 mt-3">
                    <span className="font-bold text-primary">3.</span>
                    <span>{t.editorPageTestLabel}</span>
                  </li>
                </ol>
              </div>

              {/* Features */}
              <div>
                <h3 className="mb-3 text-lg font-bold text-foreground">
                  {t.editorPageFeaturesTitle}
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-success">✓</span>
                    <span>{t.editorPageFeature1}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-success">✓</span>
                    <span>{t.editorPageFeature2}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-success">✓</span>
                    <span>{t.editorPageFeature3}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-success">✓</span>
                    <span>{t.editorPageFeature4}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-success">✓</span>
                    <span>{t.editorPageFeature5}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-success">✓</span>
                    <span>{t.editorPageFeature6}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* More Info */}
            <div className="mt-6 rounded border border-border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                {t.editorPageMoreInfoLabel}{' '}
                <code className="rounded bg-background px-2 py-1 text-foreground">
                  {t.editorPageMoreInfoFile}
                </code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
