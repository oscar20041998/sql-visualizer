'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import type { editor as MonacoEditorNS } from 'monaco-editor';
import { format } from 'sql-formatter';
import { useAppStore } from '@/lib/store';
import { getT, type Translations } from '@/lib/i18n';
import { toast } from 'sonner';
import {
  FileText,
  GitCompare,
  Copy,
  Check,
  RotateCcw,
  Zap,
  Sparkles,
  X,
  Volume2,
  Square,
  RefreshCw,
  AlertTriangle,
  DatabaseZap,
} from 'lucide-react';
import { analyzeSql, type AnalysisResult } from '@/lib/sql/sqlAnalyzer';
import { checkSelectAll, checkOtherLintingRules } from '@/lib/sql/complexityScorer';
import { buildSqlContextBrief } from '@/lib/ai/aiSqlContext';
import {
  optimizeSqlWithAIStream,
  type SqlOptimizationProposal,
  type SqlOptimizationResult,
} from '@/lib/ai/aiService';
import { synthesizeSpeech } from '@/lib/ai/aiSpeech';
import { buildOptimizeKnowledgeBrief, type DatabaseKnowledgeSource } from '@/lib/ai/databaseAssistant';
import LintingAlerts from '@/components/ui/LintingAlerts';

function getFormatterLanguage(dialect: string): 'mysql' | 'postgresql' | 'tsql' | 'plsql' {
  const dialectMap: Record<string, 'mysql' | 'postgresql' | 'tsql' | 'plsql'> = {
    mysql: 'mysql',
    postgresql: 'postgresql',
    sqlserver: 'tsql',
    oracle: 'plsql',
  };
  return dialectMap[dialect] || 'mysql';
}

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

/** Best-effort SQL formatting: falls back to the input unchanged if the formatter chokes on it. */
function safeFormatSql(sql: string, dialect: string): string {
  try {
    return format(sql, { language: getFormatterLanguage(dialect) });
  } catch {
    return sql;
  }
}

/**
 * A local, non-AI safety net: the model is told to touch only what a linting alert requires, but
 * it can still ignore that instruction. This compares structural facts the parser already
 * verified on both queries (tables, joins, filter conditions, output columns, DISTINCT/GROUP BY)
 * and flags anything the "optimized" query dropped, so an over-eager rewrite is visible before
 * the user decides whether to keep it — instead of silently trusting the model's own summary.
 */
function buildStructuralRegressionWarnings(
  original: AnalysisResult,
  optimized: AnalysisResult,
  t: Translations
): string[] {
  const warnings: string[] = [];

  const tableKey = (table: AnalysisResult['tables'][number]) =>
    `${table.name.toLowerCase()}::${(table.alias ?? '').toLowerCase()}`;
  const originalTables = new Set(original.tables.map(tableKey));
  const optimizedTables = new Set(optimized.tables.map(tableKey));
  if ([...originalTables].some((table) => !optimizedTables.has(table))) {
    warnings.push(t.smartEditorOptimizeRegressionTableIdentity);
  }

  const joinKey = (join: AnalysisResult['joins'][number]) =>
    [join.source, join.target].sort().join('::').toLowerCase();
  const originalRelationships = new Set(original.joins.map(joinKey));
  const optimizedRelationships = new Set(optimized.joins.map(joinKey));
  if ([...originalRelationships].some((relationship) => !optimizedRelationships.has(relationship))) {
    warnings.push(t.smartEditorOptimizeRegressionJoinIdentity);
  }

  if (optimized.tables.length < original.tables.length) {
    warnings.push(
      t.smartEditorOptimizeRegressionTables.replace(
        '{count}',
        String(original.tables.length - optimized.tables.length)
      )
    );
  }
  if (optimized.metrics.totalJoinCount < original.metrics.totalJoinCount) {
    warnings.push(
      t.smartEditorOptimizeRegressionJoins.replace(
        '{count}',
        String(original.metrics.totalJoinCount - optimized.metrics.totalJoinCount)
      )
    );
  }
  if (optimized.metrics.conditionCount < original.metrics.conditionCount) {
    warnings.push(
      t.smartEditorOptimizeRegressionConditions.replace(
        '{count}',
        String(original.metrics.conditionCount - optimized.metrics.conditionCount)
      )
    );
  }
  if (optimized.mainQueryFields.length < original.mainQueryFields.length) {
    warnings.push(
      t.smartEditorOptimizeRegressionColumns
        .replace('{optimized}', String(optimized.mainQueryFields.length))
        .replace('{original}', String(original.mainQueryFields.length))
    );
  }
  if (original.metrics.distinct > 0 && optimized.metrics.distinct === 0) {
    warnings.push(t.smartEditorOptimizeRegressionDistinct);
  }
  if (original.metrics.groupBy > 0 && optimized.metrics.groupBy === 0) {
    warnings.push(t.smartEditorOptimizeRegressionGroupBy);
  }

  return warnings;
}

/** Reads a JSON string value out of a possibly-incomplete JSON document being streamed in. */
function extractPartialJsonString(raw: string, key: string): string | null {
  const idx = raw.indexOf(`"${key}"`);
  if (idx === -1) return null;
  let i = raw.indexOf(':', idx + key.length + 2);
  if (i === -1) return null;
  i++;
  while (raw[i] === ' ' || raw[i] === '\n' || raw[i] === '\t' || raw[i] === '\r') i++;
  if (raw[i] !== '"') return null;
  i++;
  let result = '';
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === '\\') {
      const next = raw[i + 1];
      if (next === undefined) break; // escape sequence not finished yet, stop here
      const map: Record<string, string> = { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\' };
      result += map[next] ?? next;
      i += 2;
      continue;
    }
    if (ch === '"') return result;
    result += ch;
    i++;
  }
  return result; // string still open — return the partial content streamed so far
}

/** Reads only the fully-closed string entries of a JSON string array being streamed in. */
function extractPartialJsonStringArray(raw: string, key: string): string[] {
  const idx = raw.indexOf(`"${key}"`);
  if (idx === -1) return [];
  const arrStart = raw.indexOf('[', idx);
  if (arrStart === -1) return [];
  const arrEnd = raw.indexOf(']', arrStart);
  const segment = arrEnd === -1 ? raw.slice(arrStart + 1) : raw.slice(arrStart + 1, arrEnd);
  const matches = segment.match(/"(?:[^"\\]|\\.)*"/g) ?? [];
  return matches.map((m) => {
    try {
      return JSON.parse(m) as string;
    } catch {
      return m.slice(1, -1);
    }
  });
}

/** Turns the raw JSON being streamed from the optimize call into a plain-language progress message. */
function buildOptimizeProgressMessage(raw: string, waitingLabel: string): string {
  const analysis = extractPartialJsonString(raw, 'analysis');
  const suggestions = extractPartialJsonStringArray(raw, 'suggestions');

  const parts: string[] = [];
  if (analysis) parts.push(analysis);
  if (suggestions.length) parts.push(suggestions.map((s) => `• ${s}`).join('\n'));

  return parts.join('\n\n') || waitingLabel;
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
  // Keep the scrollbar always visible (not hover-to-reveal) with a consistent, page-like size.
  scrollbar: {
    vertical: 'visible',
    horizontal: 'visible',
    verticalScrollbarSize: 12,
    horizontalScrollbarSize: 12,
    useShadows: false,
  },
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
  scrollbar: {
    vertical: 'visible',
    horizontal: 'visible',
    verticalScrollbarSize: 12,
    horizontalScrollbarSize: 12,
    useShadows: false,
  },
};

export const SmartSQLEditor: React.FC<{
  initialSql?: string;
  /** Lets the page observe the live editor content (used by the AI SQL Explainer). */
  onSqlChange?: (sql: string) => void;
  onOptimizationResult?: (result: SqlOptimizationResult | null) => void;
  /** Line to reveal + briefly highlight once the editor is ready — fed by "go to line" links on the Metrics Dashboard. */
  jumpToLine?: number | null;
  /** Called once the jump has been applied, so the caller can clear its pending-jump state. */
  onJumpHandled?: () => void;
}> = ({
  initialSql = 'SELECT * FROM table_name LIMIT 10;',
  onSqlChange,
  onOptimizationResult,
  jumpToLine,
  onJumpHandled,
}) => {
    const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
    const jumpDecorationsRef = useRef<string[]>([]);

    const dialect = useAppStore((store) => store.dialect);
    const settings = useAppStore((store) => store.settings);
    const setAnalysisResult = useAppStore((store) => store.setAnalysisResult);
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
    const [optimizePhase, setOptimizePhase] = useState<'idle' | 'streaming' | 'done' | 'error'>(
      'idle'
    );
    const [optimizeStreamRaw, setOptimizeStreamRaw] = useState('');
    const [optimizeResult, setOptimizeResult] = useState<SqlOptimizationResult | null>(null);
    const [optimizeError, setOptimizeError] = useState<string | null>(null);
    const [appliedProposalIds, setAppliedProposalIds] = useState<string[]>([]);
    const [knowledgeSources, setKnowledgeSources] = useState<DatabaseKnowledgeSource[]>([]);
    // Local structural check, independent of what the model claims in analysis/semantic_impact.
    const [structuralWarnings, setStructuralWarnings] = useState<string[]>([]);
    const [speechPhase, setSpeechPhase] = useState<'idle' | 'loading' | 'playing'>('idle');
    const isLocalProvider = settings.aiConfig.provider === 'ollama';
    const speechAbortRef = useRef<AbortController | null>(null);
    const speechAudioRef = useRef<HTMLAudioElement | null>(null);
    // One synthesized clip per optimize result — replayable without re-billing a fresh request.
    const speechUrlRef = useRef<string | null>(null);

    const stopSpeech = useCallback(() => {
      speechAbortRef.current?.abort();
      speechAbortRef.current = null;
      if (speechAudioRef.current) {
        speechAudioRef.current.pause();
        speechAudioRef.current = null;
      }
      setSpeechPhase('idle');
    }, []);

    // A fresh clip is required for a locale switch — the cached URL was narrated in the old language.
    const resetSpeechCache = useCallback(() => {
      stopSpeech();
      if (speechUrlRef.current) {
        URL.revokeObjectURL(speechUrlRef.current);
        speechUrlRef.current = null;
      }
    }, [stopSpeech]);

    useEffect(() => () => resetSpeechCache(), [resetSpeechCache]);
    useEffect(() => resetSpeechCache(), [settings.locale, resetSpeechCache]);

    // Fired from an effect (after commit + paint) rather than inline in the async handler, so the
    // success toast can never appear a frame before the loading overlay has actually disappeared.
    useEffect(() => {
      if (optimizePhase !== 'done') return;
      if (structuralWarnings.length > 0) {
        toast.warning(t.smartEditorOptimizeRegressionToast);
      } else {
        toast.success(t.smartEditorOptimizationSuccess);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [optimizePhase]);

    const playSpeech = useCallback(
      async (url: string) => {
        // A fresh element per playback, same as the Explainer panel: reusing one leaves the old
        // buffer playing on some browsers once `src` is reassigned.
        const audio = new Audio(url);
        speechAudioRef.current = audio;
        audio.addEventListener('ended', () => {
          if (speechAudioRef.current === audio) speechAudioRef.current = null;
          setSpeechPhase('idle');
        });
        audio.addEventListener('error', () => {
          if (speechAudioRef.current === audio) speechAudioRef.current = null;
          setSpeechPhase('idle');
          toast.error(t.aiExplainerSpeakFailed);
        });

        setSpeechPhase('playing');
        try {
          await audio.play();
        } catch {
          if (speechAudioRef.current === audio) speechAudioRef.current = null;
          setSpeechPhase('idle');
          toast.error(t.aiExplainerSpeakFailed);
        }
      },
      [t]
    );

    const handleSpeech = useCallback(async () => {
      if (!optimizeResult) return;
      if (speechPhase !== 'idle') {
        stopSpeech();
        return;
      }

      if (speechUrlRef.current) {
        await playSpeech(speechUrlRef.current);
        return;
      }

      const text = [
        optimizeResult.analysis,
        optimizeResult.suggestions.length
          ? `${t.performanceNotesLabel} ${optimizeResult.suggestions.join('. ')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n');
      if (!text.trim()) return;

      const controller = new AbortController();
      speechAbortRef.current = controller;
      setSpeechPhase('loading');
      try {
        // Locale drives the voice server-side (Piper voice pack or OpenAI TTS instructions), so the
        // narration always matches the app's selected language instead of guessing from installed
        // browser voices, which silently falls back to an English voice when Vietnamese is missing.
        const { blob, engine } = await synthesizeSpeech({
          text,
          locale: settings.locale,
          gender: settings.aiConfig.speechVoiceGender,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        if (engine === 'openai' && isLocalProvider) toast.info(t.aiExplainerSpeakCloudNotice);

        const url = URL.createObjectURL(blob);
        speechUrlRef.current = url;
        await playSpeech(url);
      } catch (caught) {
        if ((caught as Error)?.name === 'AbortError') return;
        setSpeechPhase('idle');
        toast.error(caught instanceof Error ? caught.message : t.aiExplainerSpeakFailed);
      } finally {
        if (speechAbortRef.current === controller) speechAbortRef.current = null;
      }
    }, [optimizeResult, speechPhase, stopSpeech, playSpeech, isLocalProvider, settings.locale, settings.aiConfig.speechVoiceGender, t]);

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

    const revealAndHighlightLine = useCallback((line: number) => {
      const editor = editorRef.current;
      const monacoInstance = monacoRef.current;
      if (!editor || !monacoInstance) return;
      const lineCount = editor.getModel()?.getLineCount() ?? 1;
      const safeLine = Math.min(Math.max(1, line), lineCount);
      editor.revealLineInCenter(safeLine);
      editor.setPosition({ lineNumber: safeLine, column: 1 });
      editor.focus();
      jumpDecorationsRef.current = editor.deltaDecorations(jumpDecorationsRef.current, [
        {
          range: new monacoInstance.Range(safeLine, 1, safeLine, 1),
          options: { isWholeLine: true, className: 'smart-editor-jump-highlight' },
        },
      ]);
      setTimeout(() => {
        if (editorRef.current) {
          jumpDecorationsRef.current = editorRef.current.deltaDecorations(
            jumpDecorationsRef.current,
            []
          );
        }
      }, 2500);
    }, []);

    const handleEditorMount = useCallback(
      (
        editor: MonacoEditorNS.IStandaloneCodeEditor,
        monacoInstance: typeof import('monaco-editor')
      ) => {
        editorRef.current = editor;
        monacoRef.current = monacoInstance;
        editor.setValue(state.currentSql);
        if (jumpToLine) {
          // Defer one tick so the model/layout is settled before revealing the line.
          setTimeout(() => {
            revealAndHighlightLine(jumpToLine);
            onJumpHandled?.();
          }, 0);
        }
      },
      [state.currentSql, jumpToLine, onJumpHandled, revealAndHighlightLine]
    );

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
      optimizeAbortRef.current?.abort();
      setState((prev) => ({
        ...prev,
        currentSql: prev.originalSql,
        isDiffMode: false,
        hasChanges: false,
        isOptimizing: false,
      }));
      // Clear the optimization results panel along with the SQL.
      resetSpeechCache();
      setOptimizePhase('idle');
      setOptimizeStreamRaw('');
      setOptimizeResult(null);
      setOptimizeError(null);
      setAppliedProposalIds([]);
      setKnowledgeSources([]);
      setStructuralWarnings([]);
      onOptimizationResult?.(null);
      toast.info(t.smartEditorResetTitle);
    }, [t, resetSpeechCache, onOptimizationResult]);

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
      resetSpeechCache();
      const controller = new AbortController();
      optimizeAbortRef.current = controller;

      setState((prev) => ({ ...prev, isOptimizing: true }));
      onOptimizationResult?.(null);
      setOptimizeResult(null);
      setOptimizeError(null);
      setAppliedProposalIds([]);
      setOptimizeStreamRaw('');
      setStructuralWarnings([]);
      setOptimizePhase('streaming');

      let brief = '';
      let originalAnalysis: AnalysisResult | null = null;
      try {
        const parsed = await analyzeSql(sql, dialect, settings.locale);
        originalAnalysis = parsed;
        brief = buildSqlContextBrief(parsed);
        setAnalysisResult(parsed);
      } catch {
        brief = '';
        setAnalysisResult(null);
      }

      // Feed the same linting alerts shown in the UI to the model so it targets them directly.
      const lintIssues = [
        ...checkSelectAll(sql, settings.locale),
        ...checkOtherLintingRules(sql, settings.locale),
      ];
      if (lintIssues.length) {
        const lintBrief = [
          t.smartEditorLintBriefHeader,
          ...lintIssues.map(
            (issue) =>
              `- [${issue.severity}] ${issue.rule}: ${issue.message} ${t.smartEditorLintFixLabel} ${issue.suggestion}`
          ),
        ].join('\n');
        brief = brief ? `${brief}\n\n${lintBrief}` : lintBrief;
      }

      // Best-effort: ground the rewrite in the official manual for the active dialect. The server
      // embeds the query server-side and searches the manual index; any failure — no index built,
      // no relevant match — just means this section is silently omitted.
      setKnowledgeSources([]);
      try {
        const knowledge = await buildOptimizeKnowledgeBrief({
          sql,
          dialect,
          lintIssues,
          locale: settings.locale,
          signal: controller.signal,
        });
        if (knowledge) {
          brief = brief ? `${brief}\n\n${knowledge.brief}` : knowledge.brief;
          setKnowledgeSources(knowledge.sources);
        }
      } catch {
        // Same non-fatal contract as the parser brief above.
      }

      try {
        const result = await optimizeSqlWithAIStream(
          {
            sql,
            config: settings.aiConfig,
            locale: settings.locale,
            contextBrief: brief,
            signal: controller.signal,
          },
          (delta) => setOptimizeStreamRaw((prev) => prev + delta)
        );
        if (controller.signal.aborted) return;

        // Assess the full candidate as a warning only. The editor deliberately remains unchanged:
        // each narrow proposal must be approved individually below.
        let regressionWarnings: string[] = [];
        if (result.structured && originalAnalysis) {
          try {
            const optimizedAnalysis = await analyzeSql(result.optimizedSql || sql, dialect, settings.locale);
            regressionWarnings = buildStructuralRegressionWarnings(originalAnalysis, optimizedAnalysis, t);
          } catch {
            // Re-parse failure isn't itself evidence of a problem — skip the check rather than block.
          }
        }
        setStructuralWarnings(regressionWarnings);

        setState((prev) => ({ ...prev, isOptimizing: false }));
        setOptimizeResult(result);
        setOptimizePhase('done');
        onOptimizationResult?.(result);
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') {
          setState((prev) => ({ ...prev, isOptimizing: false }));
          setOptimizePhase('idle');
          return;
        }
        const message = (error as Error)?.message || t.smartEditorOptimizationError;
        setState((prev) => ({ ...prev, isOptimizing: false }));
        onOptimizationResult?.(null);
        setOptimizeError(message);
        setOptimizePhase('error');
        toast.error(message);
      } finally {
        if (optimizeAbortRef.current === controller) optimizeAbortRef.current = null;
      }
    }, [state.currentSql, dialect, settings, t, onOptimizationResult, setAnalysisResult, resetSpeechCache]);

    const handleApplyProposal = useCallback(
      async (proposal: SqlOptimizationProposal) => {
        const currentSql = state.currentSql;
        const matches = currentSql.split(proposal.find).length - 1;
        if (matches !== 1) {
          toast.error(t.smartEditorOptimizeProposalNoLongerMatches);
          return;
        }

        const candidateSql = currentSql.replace(proposal.find, proposal.replace);
        try {
          const [originalAnalysis, candidateAnalysis] = await Promise.all([
            analyzeSql(currentSql, dialect, settings.locale),
            analyzeSql(candidateSql, dialect, settings.locale),
          ]);
          const regressions = buildStructuralRegressionWarnings(originalAnalysis, candidateAnalysis, t);
          if (regressions.length > 0) {
            setStructuralWarnings(regressions);
            toast.error(t.smartEditorOptimizeProposalBlocked);
            return;
          }
        } catch {
          toast.error(t.smartEditorOptimizeProposalBlocked);
          return;
        }

        setState((prev) => ({ ...prev, currentSql: candidateSql }));
        setAppliedProposalIds((previous) => [...previous, proposal.id]);
        toast.success(t.smartEditorOptimizeProposalApplied);
      },
      [state.currentSql, dialect, settings.locale, t]
    );

    // Calculate statistics. originalLines/originalChars reflect state.originalSql (the "before"
    // state) so the stats bar can show before → after counts once the SQL has been modified.
    const stats = {
      lines: state.currentSql.split('\n').length,
      chars: state.currentSql.length,
      words: state.currentSql.trim().split(/\s+/).length,
      originalLines: state.originalSql.split('\n').length,
      originalChars: state.originalSql.length,
      changeSummary: state.hasChanges
        ? `${t.smartEditorModifiedSummary} (${state.originalSql.length} → ${state.currentSql.length} ${t.smartEditorChars})`
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
              disabled={state.isFormatting || state.isOptimizing || !state.currentSql.trim()}
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
              className="flex items-center gap-2 rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${state.isDiffMode
                  ? 'border-primary bg-primary/15 text-primary hover:bg-primary/20'
                  : 'border-border bg-muted text-foreground hover:bg-secondary'
                }`}
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
                disabled={state.isOptimizing}
                className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning transition-colors hover:bg-warning/20 disabled:cursor-not-allowed disabled:opacity-50"
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
                {state.hasChanges ? (
                  <>
                    <span>{stats.originalLines}</span>
                    <span className="mx-1">→</span>
                    <span className="text-primary">{stats.lines}</span>
                  </>
                ) : (
                  <span className="text-primary">{stats.lines}</span>
                )}{' '}
                {t.smartEditorLines}
              </span>
              <span className="font-mono">
                {state.hasChanges ? (
                  <>
                    <span>{stats.originalChars}</span>
                    <span className="mx-1">→</span>
                    <span className="text-primary">{stats.chars}</span>
                  </>
                ) : (
                  <span className="text-primary">{stats.chars}</span>
                )}{' '}
                {t.smartEditorChars}
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

          {/* AI Optimize progress / results — live stream while running, structured summary once done */}
          {optimizePhase !== 'idle' && (
            <div className="mb-3 rounded-lg border border-indigo-800/40 bg-indigo-950/20 p-3 scrollbar-thin">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-300">
                  <Sparkles
                    size={12}
                    className={optimizePhase === 'streaming' ? 'animate-pulse' : ''}
                  />
                  {optimizePhase === 'streaming'
                    ? t.smartEditorOptimizeProgressTitle
                    : optimizePhase === 'error'
                      ? t.smartEditorOptimizationError
                      : t.optimizationResultsTitle}
                </p>
                {optimizePhase !== 'streaming' && (
                  <div className="flex items-center gap-1">
                    {optimizePhase === 'done' && optimizeResult && optimizeResult.structured && (
                      <button
                        onClick={handleSpeech}
                        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-indigo-300 transition-colors hover:bg-indigo-400/10 hover:text-indigo-200 disabled:cursor-wait disabled:opacity-70"
                        aria-label={
                          speechPhase === 'idle' ? t.smartEditorSpeechPlay : t.smartEditorSpeechStop
                        }
                        title={
                          speechPhase === 'idle' ? t.smartEditorSpeechPlay : t.smartEditorSpeechStop
                        }
                      >
                        {speechPhase === 'loading' ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : speechPhase === 'playing' ? (
                          <Square size={12} fill="currentColor" />
                        ) : (
                          <Volume2 size={14} />
                        )}
                        <span className="hidden sm:inline">
                          {speechPhase === 'idle' ? t.smartEditorSpeechPlay : t.smartEditorSpeechStop}
                        </span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        stopSpeech();
                        setOptimizePhase('idle');
                      }}
                      className="text-gray-500 transition-colors hover:text-gray-300"
                      aria-label={t.smartEditorReset}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {optimizePhase === 'streaming' && (
                <p className="mt-2 max-h-40 overflow-y-auto scrollbar-thin whitespace-pre-wrap text-xs leading-relaxed text-gray-300">
                  {buildOptimizeProgressMessage(optimizeStreamRaw, t.smartEditorOptimizeWaitingLabel)}
                  <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-indigo-400 align-middle" />
                </p>
              )}

              {optimizePhase === 'error' && optimizeError && (
                <p className="mt-2 text-xs text-red-300">{optimizeError}</p>
              )}

              {optimizePhase === 'done' && optimizeResult && !optimizeResult.structured && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs leading-relaxed text-yellow-300/90">
                    {t.smartEditorOptimizeUnstructuredNotice}
                  </p>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-gray-800 bg-gray-950 p-3 font-mono text-[11px] leading-relaxed text-gray-300 scrollbar-thin">
                    {optimizeResult.raw}
                  </pre>
                </div>
              )}

              {optimizePhase === 'done' && optimizeResult && optimizeResult.structured && (
                <div className="mt-2 space-y-2">
                  {structuralWarnings.length > 0 && (
                    <div className="rounded-lg border border-red-800/60 bg-red-950/30 p-3">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-red-300">
                        <AlertTriangle size={13} />
                        {t.smartEditorOptimizeRegressionTitle}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {structuralWarnings.map((warning, index) => (
                          <li
                            key={`smart-optimize-regression-${index}`}
                            className="flex items-start gap-2 text-sm leading-relaxed text-red-200"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed text-gray-200">
                    {optimizeResult.analysis || t.aiExplainerNoContent}
                  </p>
                  {optimizeResult.semanticImpact && (
                    <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {t.smartEditorOptimizeSemanticImpactLabel}
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-gray-200">
                        {optimizeResult.semanticImpact}
                      </p>
                    </div>
                  )}
                  {optimizeResult.proposals.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {t.smartEditorOptimizeProposalsLabel}
                      </p>
                      {optimizeResult.proposals.map((proposal) => {
                        const isApplied = appliedProposalIds.includes(proposal.id);
                        return (
                          <div key={proposal.id} className="rounded-lg border border-indigo-800/50 bg-gray-900/60 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 space-y-1 text-sm leading-relaxed text-gray-200">
                                {proposal.issue && <p className="font-semibold text-indigo-200">{proposal.issue}</p>}
                                {proposal.location && <p><span className="text-gray-400">{t.smartEditorOptimizeProposalLocation}: </span>{proposal.location}</p>}
                                {proposal.reason && <p><span className="text-gray-400">{t.smartEditorOptimizeProposalReason}: </span>{proposal.reason}</p>}
                                {proposal.recommendation && <p><span className="text-gray-400">{t.smartEditorOptimizeProposalRecommendation}: </span>{proposal.recommendation}</p>}
                                {proposal.semanticImpact && <p><span className="text-gray-400">{t.smartEditorOptimizeSemanticImpactLabel}: </span>{proposal.semanticImpact}</p>}
                              </div>
                              <button
                                onClick={() => void handleApplyProposal(proposal)}
                                disabled={isApplied}
                                className="flex-shrink-0 rounded-md border border-indigo-500/50 px-2 py-1 text-xs font-medium text-indigo-200 transition-colors hover:bg-indigo-500/15 disabled:cursor-default disabled:border-success/40 disabled:text-success"
                              >
                                {isApplied ? t.smartEditorOptimizeProposalAppliedLabel : t.smartEditorOptimizeProposalApply}
                              </button>
                            </div>
                            <pre className="mt-2 max-h-28 overflow-auto rounded border border-gray-800 bg-gray-950 p-2 text-[11px] leading-relaxed text-gray-300 scrollbar-thin">
                              <code>{proposal.find}</code>
                            </pre>
                            <pre className="mt-1 max-h-28 overflow-auto rounded border border-indigo-900/50 bg-indigo-950/20 p-2 text-[11px] leading-relaxed text-indigo-100 scrollbar-thin">
                              <code>{proposal.replace}</code>
                            </pre>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {optimizeResult.suggestions.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {t.performanceNotesLabel}
                      </p>
                      <ul className="mt-1 space-y-1 text-sm text-gray-200">
                        {optimizeResult.suggestions.map((suggestion, index) => (
                          <li
                            key={`smart-optimize-suggestion-${index}`}
                            className="flex items-start gap-2"
                          >
                            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {knowledgeSources.length > 0 && (
                    <p className="text-[11px] text-gray-500">
                      {t.smartEditorOptimizeGroundedIn.replace(
                        '{sources}',
                        Array.from(new Set(knowledgeSources.map((source) => source.sourceFile))).join(', ')
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-4">
          <LintingAlerts sql={state.currentSql} collapsible />
        </div>

        {/* Editor Container: min-h floor guarantees it stays visible even when the optimize
         * results panel above grows tall enough to otherwise squeeze a flex-1 sibling to 0. */}
        <div className="relative flex-1 min-h-[420px] w-full">
          {state.isDiffMode ? (
            <DiffEditor
              original={state.originalSql}
              modified={state.currentSql}
              language="sql"
              theme={monacoTheme}
              options={{ ...diffEditorOptions, readOnly: state.isOptimizing }}
              className="min-h-0 w-full"
              height="100%"
            />
          ) : (
            <Editor
              value={state.currentSql}
              language="sql"
              theme={monacoTheme}
              options={{ ...editorOptions, readOnly: state.isOptimizing }}
              saveViewState={true}
              onMount={handleEditorMount}
              onChange={(value) => {
                setState((prev) => ({
                  ...prev,
                  currentSql: value ?? '',
                }));
              }}
              className="min-h-0 w-full"
              height="100%"
            />
          )}

          {/* Blocks editing while the AI rewrites this query in place, so the user cannot type
         * into content that is about to be replaced by the streamed result. */}
          {state.isOptimizing && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-[2px]">
              <div className="flex items-center gap-3 rounded-lg border border-indigo-800/40 bg-indigo-950/80 px-4 py-3 shadow-lg">
                <RefreshCw size={16} className="animate-spin text-indigo-300" />
                <span className="text-sm font-medium text-indigo-200">
                  {t.smartEditorEditorLockedNotice}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Status Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText size={12} className="text-muted-foreground" />
            <span>{state.isDiffMode ? t.smartEditorComparingMode : t.smartEditorSingleMode}</span>
          </div>
          <div className="text-muted-foreground">
            {state.hasChanges && <span className="text-warning">{t.smartEditorChangesDetected}</span>}
            {!state.hasChanges && state.currentSql !== '' && (
              <span className="text-success">{t.smartEditorSyncedWithOriginal}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

export default SmartSQLEditor;
