'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import type { editor as MonacoEditorNS } from 'monaco-editor';
import { format } from 'sql-formatter';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import { toast } from 'sonner';
import { FileText, GitCompare, Copy, Check, RotateCcw, Zap, Sparkles, DatabaseZap } from 'lucide-react';
import { analyzeSql } from '@/lib/sql/sqlAnalyzer';
import { buildSqlContextBrief } from '@/lib/ai/aiSqlContext';
import { optimizeSqlWithAI, type SqlOptimizationResult } from '@/lib/ai/aiService';
import { buildOptimizeKnowledgeBrief } from '@/lib/ai/databaseAssistant';
import LoadingOverlay from '@/components/ui/LoadingOverlay';

function getFormatterLanguage(dialect: string): 'mysql' | 'postgresql' | 'tsql' | 'plsql' {
  const dialectMap: Record<string, 'mysql' | 'postgresql' | 'tsql' | 'plsql'> = {
    mysql: 'mysql',
    postgresql: 'postgresql',
    sqlserver: 'tsql',
    oracle: 'plsql',
  };
  return dialectMap[dialect] || 'mysql';
}

interface EditorState {
  originalSql: string;
  currentSql: string;
  isDiffMode: boolean;
  isFormatting: boolean;
  isOptimizing: boolean;
  hasChanges: boolean;
  copiedToClipboard: boolean;
}

const editorOptions: MonacoEditorNS.IStandaloneEditorConstructionOptions = {
  language: 'sql',
  minimap: { enabled: true, maxColumn: 40 },
  wordWrap: 'on',
  fontSize: 14,
  lineNumbers: 'on',
  scrollBeyondLastLine: false,
  automaticLayout: true,
  padding: { top: 16, bottom: 16 },
  smoothScrolling: true,
  cursorBlinking: 'blink',
};

const diffEditorOptions: MonacoEditorNS.IDiffEditorConstructionOptions = {
  minimap: { enabled: true, maxColumn: 40 },
  wordWrap: 'on',
  fontSize: 14,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  padding: { top: 16, bottom: 16 },
  smoothScrolling: true,
  renderSideBySide: true,
};

const COMPLEX_MULTI_CTE_SAMPLE = `WITH
active_users AS (
  SELECT id, name, email, created_at, referrer_id
  FROM users
  WHERE active = true
),
order_items_agg AS (
  SELECT
    oi.order_id,
    COUNT(*) AS item_count,
    SUM(oi.quantity * oi.unit_price) AS order_total_amount,
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'product_id', oi.product_id,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price
      ) ORDER BY oi.id
    ) AS items_detail
  FROM order_items oi
  GROUP BY oi.order_id
),
recent_orders AS (
  SELECT
    o.user_id,
    COUNT(*) AS orders_30d,
    SUM(oi.order_total_amount) AS revenue_30d,
    MAX(o.created_at) AS last_order_at,
    BOOL_OR(o.refunded) AS any_refund_30d
  FROM orders o
  LEFT JOIN order_items_agg oi ON oi.order_id = o.id
  WHERE o.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY o.user_id
),
lifetime_orders AS (
  SELECT
    o.user_id,
    COUNT(*) AS lifetime_orders,
    SUM(oi.order_total_amount) AS lifetime_revenue,
    AVG(oi.order_total_amount) AS avg_order_value
  FROM orders o
  LEFT JOIN order_items_agg oi ON oi.order_id = o.id
  GROUP BY o.user_id
),
payments_agg AS (
  SELECT
    p.user_id,
    COUNT(*) FILTER (WHERE p.status = 'success') AS payments_success,
    COUNT(*) FILTER (WHERE p.status <> 'success') AS payments_failed,
    SUM(p.amount) FILTER (WHERE p.status = 'success') AS payments_total
  FROM payments p
  GROUP BY p.user_id
),
shipments_agg AS (
  SELECT
    o.user_id,
    AVG(EXTRACT(EPOCH FROM (s.delivered_at - s.created_at)) / 86400) AS avg_delivery_days,
    COUNT(*) FILTER (WHERE s.delivered_at > s.estimated_delivery_at) AS late_deliveries
  FROM shipments s
  INNER JOIN orders o ON o.id = s.order_id
  WHERE s.delivered_at IS NOT NULL
  GROUP BY o.user_id
),
returns_agg AS (
  SELECT
    r.user_id,
    COUNT(*) AS returns_30d,
    SUM(r.refund_amount) AS refund_amount_30d
  FROM returns r
  WHERE r.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY r.user_id
),
reviews_agg AS (
  SELECT
    rv.user_id,
    AVG(rv.rating) AS avg_rating,
    COUNT(*) AS review_count
  FROM reviews rv
  GROUP BY rv.user_id
),
coupons_agg AS (
  SELECT
    cu.used_by_user_id AS user_id,
    COUNT(*) AS coupons_used,
    SUM(cu.discount_amount) AS coupon_savings
  FROM coupon_uses cu
  GROUP BY cu.used_by_user_id
),
marketing_agg AS (
  SELECT
    me.user_id,
    COUNT(*) FILTER (WHERE me.channel = 'email') AS email_touches_90d,
    COUNT(*) FILTER (WHERE me.channel = 'sms') AS sms_touches_90d,
    MAX(me.sent_at) AS last_marketing_touch
  FROM marketing_events me
  WHERE me.sent_at >= NOW() - INTERVAL '90 days'
  GROUP BY me.user_id
),
top_products AS (
  SELECT au.id AS user_id, tp.products
  FROM active_users au
  LEFT JOIN LATERAL (
    SELECT JSONB_AGG(
      JSONB_BUILD_OBJECT('product_id', p.id, 'name', p.name, 'times_bought', bought_count)
      ORDER BY bought_count DESC
    ) AS products
    FROM (
      SELECT oi.product_id, COUNT(*) AS bought_count
      FROM orders o
      INNER JOIN order_items oi ON oi.order_id = o.id
      WHERE o.user_id = au.id
      GROUP BY oi.product_id
      ORDER BY bought_count DESC
      LIMIT 5
    ) ranked_products
    INNER JOIN products p ON p.id = ranked_products.product_id
  ) tp ON true
),
user_activity AS (
  SELECT
    au.id,
    au.name,
    au.email,
    au.created_at,
    COALESCE(ro.orders_30d, 0) AS orders_30d,
    COALESCE(ro.revenue_30d, 0) AS revenue_30d,
    COALESCE(lo.lifetime_orders, 0) AS lifetime_orders,
    COALESCE(lo.lifetime_revenue, 0) AS lifetime_revenue,
    COALESCE(pa.payments_success, 0) AS payments_success,
    COALESCE(pa.payments_failed, 0) AS payments_failed,
    COALESCE(sa.avg_delivery_days, 0) AS avg_delivery_days,
    COALESCE(sa.late_deliveries, 0) AS late_deliveries,
    COALESCE(ra.returns_30d, 0) AS returns_30d,
    COALESCE(ra.refund_amount_30d, 0) AS refund_amount_30d,
    COALESCE(rv.avg_rating, 0) AS avg_rating,
    COALESCE(rv.review_count, 0) AS review_count,
    COALESCE(ca.coupons_used, 0) AS coupons_used,
    COALESCE(ma.email_touches_90d, 0) AS email_touches_90d,
    COALESCE(ma.sms_touches_90d, 0) AS sms_touches_90d,
    COALESCE(tp.products, '[]'::jsonb) AS top_products
  FROM active_users au
  LEFT JOIN recent_orders ro ON ro.user_id = au.id
  LEFT JOIN lifetime_orders lo ON lo.user_id = au.id
  LEFT JOIN payments_agg pa ON pa.user_id = au.id
  LEFT JOIN shipments_agg sa ON sa.user_id = au.id
  LEFT JOIN returns_agg ra ON ra.user_id = au.id
  LEFT JOIN reviews_agg rv ON rv.user_id = au.id
  LEFT JOIN coupons_agg ca ON ca.user_id = au.id
  LEFT JOIN marketing_agg ma ON ma.user_id = au.id
  LEFT JOIN top_products tp ON tp.user_id = au.id
),
ranked_users AS (
  SELECT
    ua.*,
    ROW_NUMBER() OVER (ORDER BY ua.revenue_30d DESC NULLS LAST, ua.lifetime_revenue DESC) AS revenue_rank,
    NTILE(5) OVER (ORDER BY ua.lifetime_revenue DESC NULLS LAST) AS lifetime_quintile,
    CASE
      WHEN ua.orders_30d >= 3 THEN 'power'
      WHEN ua.orders_30d BETWEEN 1 AND 2 THEN 'regular'
      WHEN ua.lifetime_revenue > 0 THEN 'recently_inactive'
      ELSE 'prospect'
    END AS customer_segment,
    CASE
      WHEN ua.orders_30d = 0 AND ua.lifetime_revenue > 100 THEN true
      WHEN ua.refund_amount_30d / NULLIF(ua.revenue_30d, 0) > 0.25 THEN true
      ELSE false
    END AS churn_risk
  FROM user_activity ua
)
SELECT
  id,
  name,
  email,
  customer_segment,
  revenue_rank,
  lifetime_quintile,
  churn_risk,
  orders_30d,
  revenue_30d,
  lifetime_orders,
  lifetime_revenue,
  payments_success,
  payments_failed,
  avg_delivery_days,
  late_deliveries,
  returns_30d,
  refund_amount_30d,
  avg_rating,
  review_count,
  coupons_used,
  email_touches_90d,
  sms_touches_90d,
  top_products
FROM ranked_users
WHERE revenue_30d > 0 OR lifetime_revenue > 100
ORDER BY churn_risk DESC, revenue_30d DESC NULLS LAST
LIMIT 250;`;

export const SmartSQLEditor: React.FC<{
  initialSql?: string;
  jumpToLine?: number | null;
  onJumpHandled?: () => void;
  /** Lets the page observe the live editor content (used by the AI SQL Explainer). */
  onSqlChange?: (sql: string) => void;
  onOptimizationResult?: (result: SqlOptimizationResult | null) => void;
}> = ({
  initialSql = 'SELECT * FROM table_name LIMIT 10;',
  jumpToLine,
  onJumpHandled,
  onSqlChange,
  onOptimizationResult,
}) => {
    const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);

    const dialect = useAppStore((store) => store.dialect);
    const settings = useAppStore((store) => store.settings);
    const t = getT(settings.locale);
    const monacoTheme = settings.theme === 'dark' ? 'vs-dark' : 'vs';

    const [state, setState] = useState<EditorState>({
      originalSql: initialSql,
      currentSql: initialSql,
      isDiffMode: false,
      isFormatting: false,
      isOptimizing: false,
      hasChanges: false,
      copiedToClipboard: false,
    });
    const optimizeAbortRef = useRef<AbortController | null>(null);

    // Sync editor content when initialSql prop changes
    useEffect(() => {
      setState((prev) => ({
        ...prev,
        originalSql: initialSql,
        currentSql: initialSql,
        isDiffMode: false,
        hasChanges: false,
      }));
      if (editorRef.current) {
        editorRef.current.setValue(initialSql);
      }
    }, [initialSql]);

    // Calculate changes whenever currentSql updates
    useEffect(() => {
      const hasChanges = state.currentSql.trim() !== state.originalSql.trim();
      setState((prev) => ({ ...prev, hasChanges }));
    }, [state.currentSql, state.originalSql]);

    // Publish the current SQL upward so sibling panels stay in sync with the editor.
    useEffect(() => {
      onSqlChange?.(state.currentSql);
    }, [state.currentSql, onSqlChange]);

    const handleEditorMount = useCallback(
      (editor: MonacoEditorNS.IStandaloneCodeEditor) => {
        editorRef.current = editor;
        editor.setValue(state.currentSql);
      },
      [state.currentSql]
    );

    useEffect(() => {
      if (!jumpToLine || !editorRef.current) return;
      editorRef.current.revealLineInCenter(jumpToLine);
      editorRef.current.setPosition({ lineNumber: jumpToLine, column: 1 });
      editorRef.current.focus();
      onJumpHandled?.();
    }, [jumpToLine, onJumpHandled]);

    const handleFormatSQL = useCallback(async () => {
      try {
        if (!state.currentSql.trim()) {
          toast.error(t.emptyQueryError);
          return;
        }

        setState((prev) => ({ ...prev, isFormatting: true }));

        const formatted = format(state.currentSql, {
          language: getFormatterLanguage(dialect),
        });

        setState((prev) => ({
          ...prev,
          currentSql: formatted,
          isFormatting: false,
        }));

        toast.success(t.formattingSuccess);
      } catch (error) {
        setState((prev) => ({ ...prev, isFormatting: false }));
        toast.error((error as Error)?.message || t.formattingError);
      }
    }, [state.currentSql, dialect, t]);

    const handleToggleDiffMode = useCallback(() => {
      setState((prev) => ({
        ...prev,
        isDiffMode: !prev.isDiffMode,
      }));
    }, []);

    const handleResetToOriginal = useCallback(() => {
      setState((prev) => ({
        ...prev,
        currentSql: prev.originalSql,
        isDiffMode: false,
        hasChanges: false,
      }));
      toast.info(t.smartEditorResetTitle);
    }, [t]);

    const handleCopyToClipboard = useCallback(async () => {
      try {
        await navigator.clipboard.writeText(state.currentSql);
        setState((prev) => ({ ...prev, copiedToClipboard: true }));
        toast.success(t.smartEditorCopiedToClipboard);
        setTimeout(() => {
          setState((prev) => ({ ...prev, copiedToClipboard: false }));
        }, 2000);
      } catch (error) {
        toast.error(t.smartEditorFailedToCopy);
      }
    }, [state.currentSql, t]);

    const handleLoadComplexSample = useCallback(() => {
      setState((prev) => ({
        ...prev,
        originalSql: COMPLEX_MULTI_CTE_SAMPLE,
        currentSql: COMPLEX_MULTI_CTE_SAMPLE,
        isDiffMode: false,
        hasChanges: false,
      }));
      editorRef.current?.setValue(COMPLEX_MULTI_CTE_SAMPLE);
      onOptimizationResult?.(null);
      toast.success('Complex multi-CTE query loaded');
    }, [onOptimizationResult]);

    const handleOptimizeSQL = useCallback(async () => {
      const sql = state.currentSql.trim();
      if (!sql) {
        toast.error(t.emptyQueryError);
        return;
      }

      optimizeAbortRef.current?.abort();
      const controller = new AbortController();
      optimizeAbortRef.current = controller;

      setState((prev) => ({ ...prev, isOptimizing: true }));
      onOptimizationResult?.(null);

      let brief = '';
      try {
        const parsed = await analyzeSql(sql, dialect, settings.locale);
        brief = buildSqlContextBrief(parsed);
        const knowledge = await buildOptimizeKnowledgeBrief({
          sql,
          dialect,
          lintIssues: parsed.detailedComplexity?.lintingIssues ?? [],
          locale: settings.locale,
          signal: controller.signal,
        });
        brief = [brief, knowledge?.brief].filter(Boolean).join('\n\n');
      } catch {
        brief = '';
      }

      try {
        const result = await optimizeSqlWithAI({
          sql,
          config: settings.aiConfig,
          locale: settings.locale,
          contextBrief: brief,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        setState((prev) => ({
          ...prev,
          originalSql: sql,
          currentSql: result.optimizedSql || sql,
          isDiffMode: result.optimizedSql.trim() !== sql ? true : prev.isDiffMode,
          isOptimizing: false,
        }));
        onOptimizationResult?.(result);
        toast.success(t.smartEditorOptimizationSuccess);
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') return;
        setState((prev) => ({ ...prev, isOptimizing: false }));
        onOptimizationResult?.(null);
        toast.error((error as Error)?.message || t.smartEditorOptimizationError);
      } finally {
        if (optimizeAbortRef.current === controller) optimizeAbortRef.current = null;
      }
    }, [state.currentSql, dialect, settings, t, onOptimizationResult]);

    // Calculate statistics
    const stats = {
      lines: state.currentSql.split('\n').length,
      chars: state.currentSql.length,
      words: state.currentSql.trim().split(/\s+/).length,
      changeSummary: state.hasChanges
        ? `${t.smartEditorModifiedSummary} (${state.currentSql.length} ${t.smartEditorChars})`
        : t.smartEditorNoChangesSummary,
    };

    return (
      <div className="flex flex-col flex-1 min-h-0 h-full gap-3 overflow-hidden rounded-lg border border-border bg-card">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 px-4 pt-4 pb-0">
          {/* Title Bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: state.hasChanges ? '#f59e0b' : '#10b981',
                }}
              />
              <h2 className="text-lg font-semibold text-foreground">{t.smartEditorTitle}</h2>
              <span className="font-mono text-xs text-muted-foreground">
                {state.hasChanges ? `● ${t.smartEditorModified}` : `○ ${t.smartEditorOriginal}`}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleFormatSQL}
              disabled={state.isFormatting || !state.currentSql.trim()}
              className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
              title="Format SQL (Ctrl+Shift+F)"
            >
              <Zap size={12} />
              {state.isFormatting
                ? t.smartEditorFormatting
                : t.formatSqlButton || t.smartEditorFormat}
            </button>

            <button
              onClick={handleOptimizeSQL}
              disabled={state.isOptimizing || !state.currentSql.trim()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-700 bg-slate-800 text-gray-200 text-xs font-medium hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={t.analyzeOptimizeTitle}
            >
              <Sparkles size={12} />
              {state.isOptimizing ? t.smartEditorOptimizing : t.analyzeOptimizeButton}
            </button>

            <button
              onClick={handleLoadComplexSample}
              disabled={state.isOptimizing || state.isFormatting}
              className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
              title="Load a complex PostgreSQL query with multiple CTEs and joins across about 10 tables"
            >
              <DatabaseZap size={12} />
              Complex CTE Sample
            </button>

            <button
              onClick={handleToggleDiffMode}
              disabled={!state.hasChanges}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: state.isDiffMode ? 'rgba(99, 102, 241, 0.2)' : 'rgb(31, 41, 55)',
                borderColor: state.isDiffMode ? '#6366f1' : '#374151',
                color: state.isDiffMode ? '#818cf8' : '#d1d5db',
              }}
              title={state.hasChanges ? 'Compare with original' : t.smartEditorNoChangesToCompare}
            >
              <GitCompare size={12} />
              {state.isDiffMode ? t.smartEditorEditorView : t.smartEditorCompare}
            </button>

            <button
              onClick={handleCopyToClipboard}
              className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
            >
              {state.copiedToClipboard ? (
                <>
                  <Check size={12} />
                  {t.smartEditorCopied}
                </>
              ) : (
                <>
                  <Copy size={12} />
                  {t.smartEditorCopy}
                </>
              )}
            </button>

            {state.hasChanges && (
              <button
                onClick={handleResetToOriginal}
                className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning transition-colors hover:bg-warning/20"
                title={t.smartEditorResetTitle}
              >
                <RotateCcw size={12} />
                {t.smartEditorReset}
              </button>
            )}
          </div>

          {/* Stats Bar */}
          <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="font-mono">
                <span className="text-primary">{stats.lines}</span> {t.smartEditorLines}
              </span>
              <span className="font-mono">
                <span className="text-primary">{stats.chars}</span> {t.smartEditorChars}
              </span>
              <span className="font-mono">
                <span className="text-primary">{stats.words}</span> {t.smartEditorWords}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                {t.smartEditorDialect} <span className="font-mono text-primary">{dialect}</span>
              </span>
            </div>
            <div className="text-xs text-muted-foreground">{stats.changeSummary}</div>
          </div>
        </div>

        {/* Editor Container */}
        <div className="flex-1 min-h-0 w-full">
          {state.isDiffMode ? (
            <DiffEditor
              original={state.originalSql}
              modified={state.currentSql}
              language="sql"
              theme={monacoTheme}
              options={diffEditorOptions}
              className="min-h-0 w-full"
              height="100vh"
            />
          ) : (
            <Editor
              value={state.currentSql}
              language="sql"
              theme={monacoTheme}
              options={editorOptions}
              saveViewState={true}
              onMount={handleEditorMount}
              onChange={(value) => {
                setState((prev) => ({
                  ...prev,
                  currentSql: value ?? '',
                }));
              }}
              className="min-h-0 w-full"
              height="100vh"
            />
          )}
        </div>

        {/* Status Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText size={12} className="text-muted-foreground" />
            <span>{state.isDiffMode ? t.smartEditorComparingMode : t.smartEditorSingleMode}</span>
          </div>
          <div className="text-muted-foreground">
            {state.hasChanges && (
              <span className="text-warning">{t.smartEditorChangesDetected}</span>
            )}
            {!state.hasChanges && state.currentSql !== '' && (
              <span className="text-success">{t.smartEditorSyncedWithOriginal}</span>
            )}
          </div>
        </div>
        <LoadingOverlay visible={state.isOptimizing} title={t.smartEditorOptimizing} hideDelay={150} />
      </div>
    );
  };

export default SmartSQLEditor;
