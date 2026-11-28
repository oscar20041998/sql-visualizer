'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Braces } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'sql-formatter';
import { DEFAULT_SETTINGS, useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import LoadingOverlay from '@/components/ui/LoadingOverlay';
import SmartSQLEditor, {
  type SmartSQLEditorApi,
} from '@/app/smart-sql-editor/components/SmartSQLEditor';
import AiSqlExplainer from '@/app/smart-sql-editor/components/AiSqlExplainer';
import FormatErrorPanel from '@/app/smart-sql-editor/components/FormatErrorPanel';
import SqlComparisonPanel from '@/app/smart-sql-editor/components/SqlComparisonPanel';
import { SidePanelRail } from '@/app/smart-sql-editor/components/SidePanelTab';
import type { FormatError } from '@/lib/sql/formatError';
import { resolveErrorRegion, type ErrorRegion } from '@/lib/sql/formatErrorRegion';
import { applyFormatFix } from '@/lib/sql/formatFixScope';
import { requestFormatExplanation, type FormatExplanation } from '@/lib/ai/formatErrorAi';
import { saveQueryHistoryEntry, updateQueryHistoryEmbedding } from '@/lib/queryHistoryClient';
import { tryEmbedText } from '@/lib/ai/embeddingService';
import {
  analyzeSql,
  extractMyBatisParams,
  parseMyBatisXml,
  resolveMyBatisParams,
  getConditionalParams,
  type SqlDialect,
} from '@/lib/sql/sqlAnalyzer';
import { validateSqlDialect, DIALECT_LABELS } from '@/lib/sql/dialectValidator';
import { validateSqlFormat } from '@/lib/sql/sqlFormatValidator';
import { classifyStatements } from '@/lib/sql/statementClassifier';
import { isTableScript, splitTableScript } from '@/lib/sql/tableScriptAnalyzer';
import { currentSessionOwner, isDemoAuthenticated, isGuestSession } from '@/lib/demoAuth';
import { compareSqlSnapshots, type ComparisonResult } from '@/lib/sql/sqlComparison';
import {
  extractPartialSqlComparisonFields,
  requestSqlComparisonExplanation,
  SqlComparisonAiError,
} from '@/lib/ai/sqlComparisonAi';

// Import sub-components
import { DialectSelector, Header } from './components/Header';
import { TabNavigation, type QueryInputMode } from './components/TabNavigation';
import { SqlInputPanel } from './components/SqlInputPanel';
import { MyBatisPanel } from './components/MyBatisPanel';
import { ParameterConfig } from './components/ParameterConfig';
import { ActionButtons } from './components/ActionButtons';
import { PreviewPanel } from './components/PreviewPanel';
import { BottomAnalytics } from './components/BottomAnalytics';
import { EmptyStateTips } from './components/EmptyStateTips';
import { QueryInputPanel } from './components/QueryInputPanel';
import { CodeGeneratorPanel } from './components/CodeGeneratorPanel';
import { ObjectIntelligencePanel, type ObjectIntelligenceHandle } from './components/ObjectIntelligencePanel';

// Sample queries
const SAMPLE_SQL = `WITH monthly_revenue AS (
  SELECT
    DATE_TRUNC('month', o.created_at) AS month,
    c.region,
    SUM(oi.quantity * oi.unit_price) AS revenue,
    COUNT(DISTINCT o.id) AS order_count
  FROM orders o
  INNER JOIN order_items oi ON o.id = oi.order_id
  INNER JOIN customers c ON o.customer_id = c.id
  WHERE o.status = 'completed'
  GROUP BY DATE_TRUNC('month', o.created_at), c.region
),
ranked_regions AS (
  SELECT
    month,
    region,
    revenue,
    order_count,
    ROW_NUMBER() OVER (PARTITION BY month ORDER BY revenue DESC) AS rank,
    LAG(revenue) OVER (PARTITION BY region ORDER BY month) AS prev_revenue
  FROM monthly_revenue
)
SELECT
  r.month,
  r.region,
  r.revenue,
  r.order_count,
  r.rank,
  ROUND((r.revenue - r.prev_revenue) / NULLIF(r.prev_revenue, 0) * 100, 2) AS growth_pct
FROM ranked_regions r
LEFT JOIN region_targets rt ON r.region = rt.region_code
  AND r.month = rt.target_month
WHERE r.rank <= 10
ORDER BY r.month DESC, r.rank ASC;`;

const SAMPLE_MYBATIS = `<select id="findOrdersByCustomer" resultType="Order">
  SELECT
    o.id,
    o.order_number,
    o.total_amount,
    o.status,
    c.name AS customer_name,
    p.title AS product_title
  FROM orders o
  INNER JOIN customers c ON o.customer_id = c.id
  LEFT JOIN order_items oi ON o.id = oi.order_id
  LEFT JOIN products p ON oi.product_id = p.id
  WHERE o.customer_id = #{customerId}
    AND o.status = #{status}
    AND o.created_at >= #{startDate}
    AND o.created_at <= #{endDate}
  <if test="minAmount != null">
    AND o.total_amount >= #{minAmount}
  </if>
  ORDER BY o.created_at DESC
  LIMIT #{pageSize} OFFSET #{offset}
</select>`;

/** Formatter language for client-side validation that an AI fix actually formats. */
function toFormatterLanguage(
  dialect: FormatError['dialect']
): 'mysql' | 'postgresql' | 'tsql' | 'plsql' {
  if (dialect === 'postgresql') return 'postgresql';
  if (dialect === 'sqlserver') return 'tsql';
  if (dialect === 'oracle') return 'plsql';
  return 'mysql';
}

export default function QueryInputContent() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const {
    settings,
    dialect,
    rawSql,
    unifiedSql,
    unifiedSqlOwner,
    objectSql,
    objectSqlOwner,
    myBatisXml,
    codeGeneratorInitialSql,
    resolvedSql,
    myBatisParams,
    inputMode,
    isAnalyzing,
    pendingEditorJump,
    setDialect,
    setRawSql,
    setUnifiedSql,
    setMyBatisXml,
    setCodeGeneratorSql,
    setCodeGeneratorInitialSql,
    setResolvedSql,
    setMyBatisParams,
    setAnalysisResult,
    setIsAnalyzing,
    setAnalysisError,
    beginNavigation,
    setInputMode,
    setPendingEditorJump,
  } = useAppStore();

  useEffect(() => {
    // A guest is admitted too (FR-008, task T019): they were promised the workspace when they
    // confirmed the disclosure, and the AI routes refuse independently at the server boundary.
    if (!isDemoAuthenticated() && !isGuestSession()) {
      router.replace('/login');
      return;
    }

    setIsAuthorized(true);
  }, [router]);

  const t = getT(settings.locale);
  const owner = currentSessionOwner();
  const sqlDraft = unifiedSqlOwner === owner ? unifiedSql : '';
  const previousObjectDraft = objectSqlOwner === owner ? objectSql : '';
  const needsDraftChoice = !unifiedSqlOwner && !!rawSql && !!previousObjectDraft && rawSql !== previousObjectDraft;
  const sqlEditorRef = useRef<HTMLTextAreaElement>(null);
  const objectPanelRef = useRef<ObjectIntelligenceHandle>(null);
  const [showObjectResult, setShowObjectResult] = useState(false);
  const [objectBusy, setObjectBusy] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [statementChoice, setStatementChoice] = useState<Awaited<ReturnType<typeof classifyStatements>> | null>(null);
  const classificationRevision = useRef(0);

  useEffect(() => {
    if (!isAuthorized || unifiedSqlOwner || needsDraftChoice) return;
    setUnifiedSql(rawSql || previousObjectDraft, owner);
  }, [isAuthorized, unifiedSqlOwner, needsDraftChoice, rawSql, previousObjectDraft, owner, setUnifiedSql]);

  useEffect(() => {
    if (inputMode === 'database-object') setInputMode('sql');
  }, [inputMode, setInputMode]);

  useEffect(() => {
    classificationRevision.current += 1;
    setStatementChoice(null);
    setClassifying(false);
    setShowObjectResult(false);
  }, [dialect, sqlDraft, owner]);

  useEffect(() => () => { classificationRevision.current += 1; }, []);
  const [detectedParams, setDetectedParams] = useState<string[]>([]);
  const [conditionalParams, setConditionalParams] = useState<Record<string, string>>({});
  // Display-only metadata for the XML that currently backs the MyBatis input; the parsed
  // content still lives in the store, so this adds no new state semantics.
  const [importedFileName, setImportedFileName] = useState<string | null>(null);
  const smartEditorSqlRef = useRef(sqlDraft || rawSql || 'SELECT * FROM table LIMIT 10;');
  const editorApiRef = useRef<SmartSQLEditorApi | null>(null);
  // Last converted SQL already pushed into the editor, so tab switches alone never
  // clobber edits the user made inside the Smart Editor.
  const lastSyncedResolvedSqlRef = useRef<string | null>(null);
  const analysisRunRef = useRef(0);

  // Detect params when MyBatis XML changes
  useEffect(() => {
    if ((inputMode === 'mybatis' || inputMode === 'import-xml') && myBatisXml) {
      const params = extractMyBatisParams(myBatisXml);
      setDetectedParams(params);
      const conditional = getConditionalParams(myBatisXml);
      setConditionalParams(conditional);
      // Remove stale params without creating a state-update loop
      const updated: Record<string, string> = {};
      params.forEach((p) => {
        updated[p] = myBatisParams[p] || '';
      });

      const currentKeys = Object.keys(myBatisParams);
      const updatedKeys = Object.keys(updated);
      const isSameShape = currentKeys.length === updatedKeys.length;
      const isSameValues = updatedKeys.every((key) => myBatisParams[key] === updated[key]);

      if (!(isSameShape && isSameValues)) {
        setMyBatisParams(updated);
      }
    }
  }, [myBatisXml, inputMode, myBatisParams, setMyBatisParams]);

  // Resolve params in real-time. The converted SQL is preserved when the user
  // opens the Smart Editor tab so the SQL review panel and the editor show the
  // same statement after a MyBatis upload/paste + convert.
  useEffect(() => {
    if (myBatisXml) {
      setResolvedSql(resolveMyBatisParams(myBatisXml, myBatisParams));
    } else if (inputMode === 'sql' || inputMode === 'smart-editor') {
      // For SQL mode, don't use resolved SQL - clear it
      setResolvedSql('');
    } else {
      // No XML content yet
      setResolvedSql('');
    }
  }, [myBatisParams, myBatisXml, inputMode, setResolvedSql]);

  const handleXmlFileImport = useCallback(
    (content: string, fileName: string) => {
      setMyBatisXml(content);
      setImportedFileName(fileName);
      // Auto-switch to XML content tab after import
      if (inputMode !== 'mybatis') {
        setInputMode('mybatis');
      }
    },
    [inputMode, setMyBatisXml, setInputMode, setImportedFileName]
  );

  // Removes the loaded XML without adding a workflow step: same state the Clear action resets
  // for the MyBatis input, plus the file metadata shown next to the editor.
  const handleRemoveFile = useCallback(() => {
    setMyBatisXml('');
    setDetectedParams([]);
    setMyBatisParams({});
    setResolvedSql('');
    setImportedFileName(null);
  }, [setMyBatisXml, setMyBatisParams, setResolvedSql]);

  const handleAnalyze = useCallback(async (selectedSql?: string) => {
    const sqlToAnalyze =
      selectedSql !== undefined
        ? selectedSql
        : inputMode === 'smart-editor'
        ? smartEditorSqlRef.current
        : inputMode === 'sql'
          ? sqlDraft
          : resolvedSql;
    if (!sqlToAnalyze.trim()) {
      toast.error(t.emptyQueryError);
      return;
    }

    // Catches copy-paste artifacts (whole query wrapped in quotes, curly quotes, invisible
    // characters) that the regex-based analyzer below would otherwise silently "succeed" on.
    const formatCheck = validateSqlFormat(sqlToAnalyze);
    if (!formatCheck.valid && formatCheck.issue) {
      const reasonText =
        (t as Record<string, string>)[formatCheck.issue.reasonKey] || formatCheck.issue.reason;
      toast.warning(
        (t.sqlFormatIssueWarning || '')
          .replace('{reason}', reasonText)
          .replace('{sample}', formatCheck.issue.sample),
        { duration: 6000 }
      );
      return;
    }

    const dialectCheck = await validateSqlDialect(sqlToAnalyze, dialect);
    if (!dialectCheck.valid) {
      const mismatch = dialectCheck.mismatches[0];
      const reasonText = mismatch.reasonKey
        ? (t as Record<string, string>)[mismatch.reasonKey] || mismatch.reason
        : mismatch.reason;
      toast.error(
        (t.dialectMismatchError || '')
          .replace('{detected}', mismatch.detectedLabel)
          .replace('{reason}', reasonText)
          .replace('{selected}', DIALECT_LABELS[dialect]),
        { duration: 6000 }
      );
      return;
    }

    const runId = ++analysisRunRef.current;
    const runAnalyze = async (): Promise<void> => {
      setAnalysisError(null);
      setIsAnalyzing(true);
      const result = await analyzeSql(sqlToAnalyze, dialect, settings.locale);
      if (runId !== analysisRunRef.current) return;
      setAnalysisResult(result);
      if (inputMode === 'sql') setRawSql(sqlToAnalyze);
      toast.success(
        t.analysisCompleteMessage
          ?.replace('{tables}', result.tables.length.toString())
          ?.replace('{joins}', result.joins.length.toString()) || 'Analysis complete'
      );

      // Save to history for later semantic search; both the save and the background embedding
      // are fire-and-forget so a slow/unreachable history server never blocks the redirect below.
      void saveQueryHistoryEntry({
        sql: sqlToAnalyze,
        dialect,
        tableCount: result.tables.length,
        joinCount: result.joins.length,
        complexityLevel: result.complexity?.level,
      }).then((saved) => {
        if (!saved) return;
        void tryEmbedText(sqlToAnalyze, settings.aiConfig).then((embedded) => {
          if (embedded) void updateQueryHistoryEmbedding(saved.id, embedded.vector, embedded.model);
        });
      });

      beginNavigation('/sql-metrics-dashboard');
      router.push('/sql-metrics-dashboard');
    };

    await runAnalyze().catch((error: unknown) => {
      if (runId === analysisRunRef.current) {
        const message = error instanceof Error ? error.message : String(error);
        // Publish the failure to the store so the dashboard can render its error
        // state and offer a retry (specs/010-sql-intelligence-dashboard FR-016).
        setAnalysisError(message || t.parseErrorMessage || 'Parse error');
        toast.error(t.parseErrorMessage || 'Parse error');
      }
    });
    if (runId === analysisRunRef.current) setIsAnalyzing(false);
  }, [
    inputMode,
    sqlDraft,
    resolvedSql,
    dialect,
    settings.locale,
    settings.aiConfig,
    router,
    t,
    setIsAnalyzing,
    setAnalysisResult,
    setRawSql,
    setAnalysisError,
    beginNavigation,
  ]);

  const runUnifiedAnalysis = (kind: 'query' | 'object', sql: string, offset: number) => {
    setStatementChoice(null);
    if (kind === 'query') {
      setShowObjectResult(false);
      void handleAnalyze(sql);
    } else {
      setShowObjectResult(true);
      objectPanelRef.current?.analyze(sql, offset);
    }
  };

  const handleUnifiedAnalyze = async () => {
    if (!sqlDraft.trim()) {
      toast.error(t.emptyQueryError);
      return;
    }
    const revision = ++classificationRevision.current;
    setStatementChoice(null);
    const tableStatements = splitTableScript(sqlDraft, dialect);
    if (isTableScript(tableStatements)) {
      setShowObjectResult(true);
      objectPanelRef.current?.analyzeTableScript(tableStatements);
      return;
    }
    setClassifying(true);
    try {
      const result = await classifyStatements(sqlDraft, dialect);
      if (revision !== classificationRevision.current || currentSessionOwner() !== owner) return;
      if (result.status === 'parsed' && result.statements.length === 1) {
        const statement = result.statements[0];
        runUnifiedAnalysis(statement.kind === 'query' ? 'query' : 'object', sqlDraft, 0);
      } else {
        setStatementChoice(result);
      }
    } catch {
      if (revision === classificationRevision.current) toast.error(t.unifiedClassifyFailed);
    } finally {
      if (revision === classificationRevision.current) setClassifying(false);
    }
  };

  const renderStatementChoice = () => {
    if (!statementChoice) return null;
    if (statementChoice.status === 'parsed') {
      return (
        <div role="group" aria-label={t.unifiedChooseStatement} className="mt-4 space-y-2 rounded-md border border-border p-3">
          <p className="text-sm font-medium">{t.unifiedChooseStatement}</p>
          {statementChoice.statements.map((statement, index) => (
            <button
              key={`${statement.start}-${statement.end}`}
              type="button"
              onClick={() => runUnifiedAnalysis(
                statement.kind === 'query' ? 'query' : 'object',
                statement.text,
                statement.start
              )}
              className="block w-full rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="system-label">{index + 1}. {statement.kind === 'query' ? t.unifiedQueryType : t.unifiedObjectType}</span>
              <span className="mt-1 block truncate font-mono text-xs text-muted-foreground">{statement.text}</span>
            </button>
          ))}
        </div>
      );
    }
    const analyzeSelection = (kind: 'query' | 'object') => {
      const editor = sqlEditorRef.current;
      if (!editor || editor.selectionStart === editor.selectionEnd) {
        toast.error(t.unifiedSelectSql);
        return;
      }
      runUnifiedAnalysis(kind, sqlDraft.slice(editor.selectionStart, editor.selectionEnd), editor.selectionStart);
    };
    return (
      <div role="group" aria-label={t.unifiedChooseStatement} className="mt-4 space-y-3 rounded-md border border-border p-3">
        <p className="text-sm text-muted-foreground">{t.unifiedAmbiguous}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => analyzeSelection('query')}>{t.unifiedAnalyzeQuery}</button>
          <button type="button" className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => analyzeSelection('object')}>{t.unifiedAnalyzeObject}</button>
        </div>
      </div>
    );
  };

  const handleClear = useCallback(() => {
    if (inputMode === 'sql') {
      setUnifiedSql('', owner);
      setShowObjectResult(false);
    }
    else {
      setMyBatisXml('');
      setDetectedParams([]);
      setMyBatisParams({});
      setResolvedSql('');
      setImportedFileName(null);
    }
    // Clear analysis result to lock navigation
    setAnalysisResult(null);
  }, [
    inputMode,
    setUnifiedSql,
    owner,
    setMyBatisXml,
    setMyBatisParams,
    setResolvedSql,
    setAnalysisResult,
    setImportedFileName,
  ]);

  const handleLoadSample = useCallback(() => {
    if (inputMode === 'sql') {
      setUnifiedSql(SAMPLE_SQL, owner);
      setShowObjectResult(false);
    } else if (inputMode === 'mybatis' || inputMode === 'import-xml') {
      setMyBatisXml(SAMPLE_MYBATIS);
    }
  }, [inputMode, setUnifiedSql, owner, setMyBatisXml]);

  const handleTabChange = (newMode: QueryInputMode) => {
    if (newMode === 'code-generator' && codeGeneratorInitialSql === null) {
      const initialSql =
        inputMode === 'sql'
          ? sqlDraft
          : inputMode === 'mybatis' || inputMode === 'import-xml'
            ? resolvedSql
            : inputMode === 'smart-editor'
              ? smartEditorSqlRef.current
              : '';
      setCodeGeneratorInitialSql(initialSql);
      setCodeGeneratorSql(initialSql);
    }
    if (newMode === 'smart-editor' && !jumpSql) {
      // Fall back to the SQL review content of the mode we come from when the
      // editor has never received converted SQL yet: converted MyBatis SQL for
      // mybatis/import-xml, raw SQL paste for sql mode. The live sync effect
      // above already seeded smartEditorSql, so this never clobbers edits made
      // inside the editor. Skip when a go-to-line jump owns the content.
      const syncedSql =
        lastSyncedResolvedSqlRef.current !== null
          ? smartEditorSqlRef.current
          : inputMode === 'sql'
            ? sqlDraft || resolvedSql || smartEditorSqlRef.current
            : inputMode === 'mybatis' || inputMode === 'import-xml'
              ? resolvedSql || rawSql || smartEditorSqlRef.current
              : smartEditorSqlRef.current;
      if (syncedSql) {
        smartEditorSqlRef.current = syncedSql;
        setSmartEditorSql(syncedSql);
        setSmartEditorInitialSql(syncedSql);
        editorApiRef.current?.setSql(syncedSql);
      }
    }
    setInputMode(newMode);
    // Switching tabs manually means the pending jump no longer applies to what's shown.
    setJumpSql(null);
  };

  const currentSql =
    inputMode === 'smart-editor' || inputMode === 'code-generator'
      ? ''
      : inputMode === 'sql'
        ? sqlDraft
        : resolvedSql;

  // A "go to line" link from the Metrics Dashboard/Graph Visualizer lands here: captured once on
  // mount, it switches to the Smart Editor tab, loads the analyzed SQL instead of the current
  // draft, and reveals/highlights the target line once the editor mounts.
  const [jumpSql, setJumpSql] = useState<string | null>(() => pendingEditorJump?.sql ?? null);
  const [jumpLine, setJumpLine] = useState<number | null>(() => pendingEditorJump?.line ?? null);

  useEffect(() => {
    if (pendingEditorJump) setInputMode('smart-editor');
    // Only ever consume the pending jump once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live content of the Smart Editor, fed to the AI explainer panel below it.
  const [smartEditorSql, setSmartEditorSql] = useState(
    jumpSql || sqlDraft || rawSql || 'SELECT * FROM table LIMIT 10;'
  );
  // Stable seed passed as `initialSql`: only updated by MyBatis convert sync or
  // tab-switch fallback, never by keystrokes inside the editor, so the editor's
  // own change tracking is not reset on every edit.
  const [smartEditorInitialSql, setSmartEditorInitialSql] = useState(
    jumpSql || sqlDraft || rawSql || 'SELECT * FROM table LIMIT 10;'
  );
  const [optimizationResult, setOptimizationResult] = useState<
    null | import('@/lib/ai/aiService').SqlOptimizationResult
  >(null);

  // Format-error report state for the smart-editor tab (spec 012). Lives here rather than in the
  // panel so the report survives a close/reopen and stays in sync with the SQL the editor
  // actually failed on (FR-004). The MyBatis/XML → smart-editor flow is the primary path this
  // page exposes, so the panel must be wired here too — not only on the standalone editor page.
  const [formatError, setFormatError] = useState<FormatError | null>(null);
  const [isErrorPanelOpen, setIsErrorPanelOpen] = useState(false);
  const formatErrorRegion = formatError
    ? resolveErrorRegion(formatError, formatError.sourceSql)
    : null;
  const [isComparisonPanelOpen, setIsComparisonPanelOpen] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [isComparisonRunning, setIsComparisonRunning] = useState(false);
  const comparisonRunRef = useRef(0);
  const comparisonAiAbortRef = useRef<AbortController | null>(null);

  const handleRunComparison = useCallback(async () => {
    comparisonAiAbortRef.current?.abort();
    comparisonAiAbortRef.current = null;
    const runNumber = ++comparisonRunRef.current;
    const runId = `comparison-${runNumber}`;
    const beforeSql = editorApiRef.current?.getOriginalSql() ?? smartEditorInitialSql;
    const afterSql = editorApiRef.current?.getSql() ?? smartEditorSqlRef.current;
    smartEditorSqlRef.current = afterSql;
    setSmartEditorSql(afterSql);
    const snapshot = {
      runId,
      beforeSql,
      afterSql,
      dialect,
      startedAt: new Date().toISOString(),
    };
    setIsComparisonRunning(true);
    try {
      const result = await compareSqlSnapshots(snapshot);
      if (comparisonRunRef.current !== runNumber) return;
      setComparisonResult(result);
      setIsComparisonPanelOpen(true);
      if (result.status === 'no_changes') {
        toast.info(t.comparisonNoChanges);
      } else if (result.status === 'failed') {
        toast.error(t.comparisonFailed);
      } else {
        toast.success(
          result.changes.length > 0
            ? `${t.comparisonChanges}: ${result.changes.length}`
            : t.comparisonStaticCompleted
        );
      }
    } catch {
      if (comparisonRunRef.current === runNumber) {
        toast.error(t.comparisonFailed);
      }
    } finally {
      if (comparisonRunRef.current === runNumber) {
        setIsComparisonRunning(false);
      }
    }
  }, [dialect, smartEditorInitialSql, t]);

  const isComparisonStale = Boolean(
    comparisonResult &&
    (comparisonResult.snapshot.beforeSql !==
      (editorApiRef.current?.getOriginalSql() ?? smartEditorInitialSql) ||
      comparisonResult.snapshot.afterSql !== smartEditorSql ||
      comparisonResult.snapshot.dialect !== dialect)
  );

  useEffect(() => {
    if (!isComparisonStale || !comparisonAiAbortRef.current) return;
    comparisonAiAbortRef.current.abort();
    comparisonAiAbortRef.current = null;
    setComparisonResult((current) =>
      current?.ai.status === 'pending'
        ? { ...current, ai: { status: 'skipped', explanation: null, assessment: null } }
        : current
    );
  }, [isComparisonStale]);

  const handleRequestComparisonAi = useCallback(async () => {
    if (!comparisonResult || comparisonResult.status === 'no_changes' || isComparisonStale) return;
    comparisonAiAbortRef.current?.abort();
    const controller = new AbortController();
    comparisonAiAbortRef.current = controller;
    const { snapshot } = comparisonResult;
    setComparisonResult((current) =>
      current?.snapshot.runId === snapshot.runId
        ? { ...current, ai: { status: 'pending', explanation: null, assessment: null } }
        : current
    );

    try {
      let streamedResponse = '';
      const assessment = await requestSqlComparisonExplanation(
        snapshot,
        settings.aiConfig ?? DEFAULT_SETTINGS.aiConfig!,
        settings.locale,
        controller.signal,
        (fragment) => {
          streamedResponse += fragment;
          const streaming = extractPartialSqlComparisonFields(streamedResponse);
          if (Object.keys(streaming).length === 0 || controller.signal.aborted) return;
          setComparisonResult((current) =>
            current?.snapshot.runId === snapshot.runId
              ? {
                  ...current,
                  ai: {
                    status: 'pending',
                    explanation: streaming.changeExplanation ?? null,
                    assessment: null,
                    streaming,
                  },
                }
              : current
          );
        },
        {
          changes: comparisonResult.changes,
          findings: comparisonResult.findings.filter(
            (finding) => finding.origin === 'deterministic'
          ),
          limitations: comparisonResult.limitations,
        }
      );
      const stillCurrent =
        !controller.signal.aborted &&
        comparisonRunRef.current === Number(snapshot.runId.replace('comparison-', '')) &&
        smartEditorSqlRef.current === snapshot.afterSql &&
        (editorApiRef.current?.getOriginalSql() ?? smartEditorInitialSql) === snapshot.beforeSql &&
        dialect === snapshot.dialect;
      setComparisonResult((current) =>
        current?.snapshot.runId === snapshot.runId
          ? {
              ...current,
              ai: stillCurrent
                ? {
                    status: current.status === 'partial' ? 'partial' : 'completed',
                    explanation: null,
                    assessment,
                  }
                : { status: 'skipped', explanation: null, assessment: null },
            }
          : current
      );
    } catch (error) {
      const status =
        error instanceof SqlComparisonAiError
          ? error.kind === 'cancelled'
            ? 'skipped'
            : error.kind
          : 'failed';
      setComparisonResult((current) =>
        current?.snapshot.runId === snapshot.runId
          ? { ...current, ai: { status, explanation: null, assessment: null } }
          : current
      );
    } finally {
      if (comparisonAiAbortRef.current === controller) comparisonAiAbortRef.current = null;
    }
  }, [
    comparisonResult,
    dialect,
    isComparisonStale,
    settings.aiConfig,
    settings.locale,
    smartEditorInitialSql,
  ]);

  const handleCancelComparisonAi = useCallback(() => {
    comparisonAiAbortRef.current?.abort();
    comparisonAiAbortRef.current = null;
    setComparisonResult((current) =>
      current?.ai.status === 'pending'
        ? { ...current, ai: { status: 'skipped', explanation: null, assessment: null } }
        : current
    );
  }, []);

  // Keep the SQL review panel and the Smart Editor on the same statement: right
  // after a MyBatis upload/paste + convert, the resolved SQL is pushed into the
  // editor state (and its imperative API when mounted) unless a go-to-line jump
  // owns the content. Only a *new* converted value syncs, so moving between tabs
  // preserves whatever the user typed in the editor.
  useEffect(() => {
    if (jumpSql) return;
    if (inputMode !== 'mybatis' && inputMode !== 'import-xml') return;
    if (!resolvedSql) return;
    if (lastSyncedResolvedSqlRef.current === resolvedSql) return;
    if (editorApiRef.current?.getSql() === resolvedSql) {
      lastSyncedResolvedSqlRef.current = resolvedSql;
      return;
    }
    lastSyncedResolvedSqlRef.current = resolvedSql;
    smartEditorSqlRef.current = resolvedSql;
    setSmartEditorSql(resolvedSql);
    setSmartEditorInitialSql(resolvedSql);
    editorApiRef.current?.setSql(resolvedSql);
  }, [inputMode, jumpSql, resolvedSql]);

  /** A new failure replaces the previous report and forces the panel open (FR-003). */
  const handleFormatError = useCallback((error: FormatError) => {
    setFormatError(error);
    setIsErrorPanelOpen(true);
  }, []);

  /** One AI response provides both the explanation and corrected SQL (FR-021). */
  const handleRequestExplain = useCallback(
    (error: FormatError, region?: ErrorRegion | null): Promise<FormatExplanation> => {
      return requestFormatExplanation(error, settings.aiConfig, settings.locale, region);
    },
    [settings.aiConfig, settings.locale]
  );

  /** Applies a confirmed AI fix, re-formats it, and clears the report (FR-010). */
  const handleApplyFormatFix = useCallback(
    (sql: string) => {
      if (!formatError || !formatErrorRegion) return;
      const result = applyFormatFix({
        snapshotSql: formatError.sourceSql,
        currentSql: smartEditorSql,
        proposedSql: sql,
        region: formatErrorRegion,
      });
      if (!result.ok) return;

      const language = toFormatterLanguage(formatError.dialect);
      try {
        format(result.sql, { language });
      } catch {
        return;
      }
      smartEditorSqlRef.current = result.sql;
      editorApiRef.current?.setSql(result.sql);
      setSmartEditorSql(result.sql);
      setFormatError(null);
      setIsErrorPanelOpen(false);
      toast.success(t.formatErrorPanelFixApplied);
    },
    [formatError, formatErrorRegion, smartEditorSql, t]
  );

  /** Dismissing a proposal keeps the editor untouched (FR-010). */
  const handleDismissFormatFix = useCallback(() => {
    toast.info(t.formatErrorPanelFixDismissed);
  }, [t]);

  // Tips array
  const tips = [t.tipCTE, t.tipJoin, t.tipMyBatis, t.tipDialect].filter(Boolean);
  if (!isAuthorized) return null;

  return (
    <>
      {/* The right-edge rail the collapsed Optimize / Explainer / Format-error launchers pack
       * into. It must sit above all three so they share one column. */}
      <SidePanelRail>
        <div className="mx-auto max-w-[112rem] space-y-4 px-4 py-5 sm:px-6 lg:px-7">
          <LoadingOverlay
            visible={isAnalyzing}
            title={t.analyzing}
            description={t.parsingSQL}
            hideDelay={300}
            onHide={() => {
              // Optional: Add any cleanup logic when loading completes
            }}
          />

          <header className="floating-header flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <Header t={t} />
            <DialectSelector dialect={dialect} onDialectChange={setDialect} t={t} />
          </header>
          <div className="flex flex-wrap items-center justify-between gap-x-3">
            <TabNavigation inputMode={inputMode} onTabChange={handleTabChange} t={t} />
            <div className="flex items-center">
              <EmptyStateTips tips={tips} t={t} />
            </div>
          </div>

          {/* Smart Editor Tab - Fullscreen */}
          {inputMode === 'smart-editor' && (
            <div className="smart-sql-editor-theme flex min-h-[calc(100vh-11rem)] flex-col">
              <div
                id="query-input-tabpanel"
                role="tabpanel"
                aria-labelledby={`tab-${inputMode}`}
                className="mt-4 flex flex-col gap-4"
              >
                <div className="flex min-h-[620px] flex-col gap-3 lg:flex-row lg:items-stretch">
                  <div className="flex min-h-[620px] flex-1 flex-col">
                    <SmartSQLEditor
                      initialSql={
                        jumpSql || smartEditorInitialSql || 'SELECT * FROM table LIMIT 10;'
                      }
                      jumpToLine={jumpLine}
                      onJumpHandled={() => {
                        setJumpLine(null);
                        setPendingEditorJump(null);
                      }}
                      onSqlChange={(sql) => {
                        smartEditorSqlRef.current = sql;
                        setSmartEditorSql(sql);
                        setOptimizationResult(null);
                      }}
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
                      region={formatErrorRegion}
                      currentSql={smartEditorSql}
                      onRequestExplain={handleRequestExplain}
                      onApplyFix={handleApplyFormatFix}
                      onDismissFix={handleDismissFormatFix}
                    />
                  )}
                  <SqlComparisonPanel
                    locale={settings.locale}
                    isOpen={isComparisonPanelOpen}
                    onToggle={setIsComparisonPanelOpen}
                    result={comparisonResult}
                    isStale={isComparisonStale}
                    isRunning={isComparisonRunning}
                    onRunComparison={handleRunComparison}
                    onRequestAi={handleRequestComparisonAi}
                    onCancelAi={handleCancelComparisonAi}
                  />
                </div>

                {/* SQL → natural language, same panel as the standalone Smart SQL Editor page. */}
                <AiSqlExplainer sql={smartEditorSql} optimizationResult={optimizationResult} />
              </div>
            </div>
          )}

          {inputMode === 'code-generator' && (
            <div className="space-y-4">
              <div
                id="query-input-tabpanel"
                role="tabpanel"
                aria-labelledby={`tab-${inputMode}`}
                className="space-y-4"
              >
                <CodeGeneratorPanel
                  dialect={dialect}
                  t={t}
                  initialSql={codeGeneratorInitialSql ?? ''}
                />
              </div>
            </div>
          )}

          {inputMode === 'sql' && (
            <div id="query-input-tabpanel" role="tabpanel" aria-labelledby="tab-sql" className="space-y-4">
              {needsDraftChoice ? (
                <QueryInputPanel title={t.unifiedChooseDraft}>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" className="rounded-md border border-border px-4 py-2 text-sm" onClick={() => setUnifiedSql(rawSql, owner)}>
                      {t.unifiedQueryDraft}
                    </button>
                    <button type="button" className="rounded-md border border-border px-4 py-2 text-sm" onClick={() => setUnifiedSql(previousObjectDraft, owner)}>
                      {t.unifiedObjectDraft}
                    </button>
                  </div>
                </QueryInputPanel>
              ) : (
                <>
                  <ObjectIntelligencePanel
                    ref={objectPanelRef}
                    dialect={dialect}
                    t={t}
                    unified={{
                      source: sqlDraft,
                      editor: (
                        <>
                          <SqlInputPanel
                            ref={sqlEditorRef}
                            value={sqlDraft}
                            onChange={(value) => {
                              classificationRevision.current += 1;
                              setUnifiedSql(value, owner);
                              setShowObjectResult(false);
                              setStatementChoice(null);
                            }}
                            placeholder={t.sqlPlaceholder}
                          />
                          <p className="mt-2 text-xs text-muted-foreground">{t.objectDraftLimit}</p>
                        </>
                      ),
                      actions: (
                        <>
                          <ActionButtons
                            onAnalyze={handleUnifiedAnalyze}
                            onLoadSample={handleLoadSample}
                            onClear={handleClear}
                            isLoading={isAnalyzing || classifying || objectBusy}
                            analyzeLabel={t.unifiedAnalyze}
                            analyzeDescription={t.unifiedAnalyzeHint}
                            t={t}
                          />
                          {statementChoice && renderStatementChoice()}
                        </>
                      ),
                      preview: <PreviewPanel currentSql={sqlDraft} inputMode="sql" t={t} />,
                      showResult: showObjectResult,
                      onReveal: (start, end) => {
                        sqlEditorRef.current?.focus();
                        sqlEditorRef.current?.setSelectionRange(start, end);
                      },
                      onBusyChange: setObjectBusy,
                      onShowResult: () => setShowObjectResult(true),
                    }}
                  />
                  <BottomAnalytics currentSql={sqlDraft} />
                </>
              )}
            </div>
          )}

          {/* Regular SQL/MyBatis Input */}
          {(inputMode === 'mybatis' || inputMode === 'import-xml') && (
            <>
              {/* Workspace: input and resolved SQL share the available width. */}
              <div
                id="query-input-tabpanel"
                role="tabpanel"
                aria-labelledby={`tab-${inputMode}`}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                  {/* Left: Input + Parameters */}
                  <div className="min-w-0 space-y-4 xl:col-span-6">
                    {/* MyBatis/XML Input + Parameter Configuration */}
                    {(inputMode === 'mybatis' || inputMode === 'import-xml') && (
                      <>
                        <QueryInputPanel
                          title={t.myBatisPanelTitle}
                          description={t.myBatisPanelHint}
                          icon={<Braces size={14} className="text-primary" aria-hidden />}
                        >
                          <MyBatisPanel
                            xmlContent={myBatisXml}
                            onXmlChange={setMyBatisXml}
                            onFileImport={handleXmlFileImport}
                            onRemoveFile={handleRemoveFile}
                            importedFileName={importedFileName}
                            placeholder={t.myBatisPlaceholder || 'Paste MyBatis XML here...'}
                            showFileImport={inputMode === 'import-xml'}
                            t={t}
                          />
                        </QueryInputPanel>

                        {/* Parameter Configuration */}
                        {myBatisXml && (
                          <ParameterConfig
                            detectedParams={detectedParams}
                            myBatisParams={myBatisParams}
                            onParamChange={(key, value) =>
                              setMyBatisParams({ ...myBatisParams, [key]: value })
                            }
                            conditionalParams={conditionalParams}
                            t={t}
                          />
                        )}
                      </>
                    )}

                    {/* Action Buttons */}
                    <ActionButtons
                      onAnalyze={() => void handleAnalyze()}
                      onLoadSample={handleLoadSample}
                      onClear={handleClear}
                      isLoading={isAnalyzing}
                      t={t}
                    />
                  </div>

                  {/* Right: Preview Panel (final SQL to analyze) */}
                  <div className="min-w-0 xl:col-span-6 xl:min-h-[560px]">
                    <PreviewPanel currentSql={currentSql} inputMode={inputMode} t={t} />
                  </div>
                </div>

                {/* Bottom: Complexity & Linting findings */}
                <BottomAnalytics currentSql={currentSql} />

              </div>
            </>
          )}
        </div>
      </SidePanelRail>
    </>
  );
}
