'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Braces, FileCode2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import AppLayout from '@/components/AppLayout';
import LoadingOverlay from '@/components/ui/LoadingOverlay';
import SmartSQLEditor from '@/app/smart-sql-editor/components/SmartSQLEditor';
import AiSqlExplainer from '@/app/smart-sql-editor/components/AiSqlExplainer';
import QueryHistoryPanel from '@/components/ui/QueryHistoryPanel';
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
import { isDemoAuthenticated } from '@/lib/demoAuth';

// Import sub-components
import { Header } from './components/Header';
import { TabNavigation, type QueryInputMode } from './components/TabNavigation';
import { SqlInputPanel } from './components/SqlInputPanel';
import { MyBatisPanel } from './components/MyBatisPanel';
import { ParameterConfig } from './components/ParameterConfig';
import { ActionButtons } from './components/ActionButtons';
import { PreviewPanel } from './components/PreviewPanel';
import { BottomAnalytics } from './components/BottomAnalytics';
import { EmptyStateTips } from './components/EmptyStateTips';
import { QueryInputPanel } from './components/QueryInputPanel';

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

export default function QueryInputContent() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const {
    settings,
    dialect,
    rawSql,
    myBatisXml,
    resolvedSql,
    myBatisParams,
    inputMode,
    isAnalyzing,
    pendingEditorJump,
    setDialect,
    setRawSql,
    setMyBatisXml,
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
    if (!isDemoAuthenticated()) {
      router.replace('/login');
      return;
    }

    setIsAuthorized(true);
  }, [router]);

  const t = getT(settings.locale);
  const [detectedParams, setDetectedParams] = useState<string[]>([]);
  const [conditionalParams, setConditionalParams] = useState<Record<string, string>>({});
  // Display-only metadata for the XML that currently backs the MyBatis input; the parsed
  // content still lives in the store, so this adds no new state semantics.
  const [importedFileName, setImportedFileName] = useState<string | null>(null);
  const smartEditorSqlRef = useRef(rawSql || 'SELECT * FROM table LIMIT 10;');
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

  // Resolve params in real-time
  useEffect(() => {
    if (inputMode === 'sql' || inputMode === 'smart-editor') {
      // For SQL mode, don't use resolved SQL - clear it
      setResolvedSql('');
    } else if ((inputMode === 'mybatis' || inputMode === 'import-xml') && myBatisXml) {
      setResolvedSql(resolveMyBatisParams(myBatisXml, myBatisParams));
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

  const handleAnalyze = useCallback(async () => {
    const sqlToAnalyze =
      inputMode === 'smart-editor'
        ? smartEditorSqlRef.current
        : inputMode === 'sql'
          ? rawSql
          : resolvedSql;
    if (!sqlToAnalyze.trim()) {
      toast.error(t.emptyQueryError);
      return;
    }

    // Catches copy-paste artifacts (whole query wrapped in quotes, curly quotes, invisible
    // characters) that the regex-based analyzer below would otherwise silently "succeed" on.
    const formatCheck = validateSqlFormat(sqlToAnalyze);
    if (!formatCheck.valid && formatCheck.issue) {
      const reasonText = (t as Record<string, string>)[formatCheck.issue.reasonKey] || formatCheck.issue.reason;
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
    rawSql,
    resolvedSql,
    dialect,
    settings.locale,
    settings.aiConfig,
    router,
    t,
    setIsAnalyzing,
    setAnalysisResult,
    setAnalysisError,
    beginNavigation,
  ]);

  const handleClear = useCallback(() => {
    if (inputMode === 'sql') setRawSql('');
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
    setRawSql,
    setMyBatisXml,
    setMyBatisParams,
    setResolvedSql,
    setAnalysisResult,
    setImportedFileName,
  ]);

  const handleLoadSample = useCallback(() => {
    if (inputMode === 'sql') {
      setRawSql(SAMPLE_SQL);
    } else if (inputMode === 'mybatis' || inputMode === 'import-xml') {
      setMyBatisXml(SAMPLE_MYBATIS);
    }
  }, [inputMode, setRawSql, setMyBatisXml]);

  const handleTabChange = (newMode: QueryInputMode) => {
    setInputMode(newMode);
    // Switching tabs manually means the pending jump no longer applies to what's shown.
    setJumpSql(null);
  };

  const currentSql = inputMode === 'smart-editor' ? '' : inputMode === 'sql' ? rawSql : resolvedSql;

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
    jumpSql || rawSql || 'SELECT * FROM table LIMIT 10;'
  );
  const [optimizationResult, setOptimizationResult] = useState<
    null | import('@/lib/ai/aiService').SqlOptimizationResult
  >(null);

  // Tips array
  const tips = [t.tipCTE, t.tipJoin, t.tipMyBatis, t.tipDialect].filter(Boolean);
  if (!isAuthorized) return null;

  return (
    <AppLayout>
      <div className="mx-auto max-w-screen-2xl space-y-6 px-6 py-8 lg:px-8 xl:px-10">
        <LoadingOverlay
          visible={isAnalyzing}
          title={t.analyzing}
          description={t.parsingSQL}
          hideDelay={300}
          onHide={() => {
            // Optional: Add any cleanup logic when loading completes
          }}
        />

        {/* Header: title, workflow spine, dialect and query history */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Header dialect={dialect} onDialectChange={setDialect} t={t} />
          </div>
          <QueryHistoryPanel
            onLoadQuery={(sql, historyDialect) => {
              setDialect(historyDialect);
              setInputMode('sql');
              setRawSql(sql);
            }}
          />
        </div>

        {/* Smart Editor Tab - Fullscreen */}
        {inputMode === 'smart-editor' && (
          <div className="smart-sql-editor-theme flex min-h-[calc(100vh-11rem)] flex-col">
            <TabNavigation inputMode={inputMode} onTabChange={handleTabChange} t={t} />
            <div
              id="query-input-tabpanel"
              role="tabpanel"
              aria-labelledby={`tab-${inputMode}`}
              className="mt-4 flex flex-col gap-4"
            >
              <div className="flex min-h-[620px] flex-col">
                <SmartSQLEditor
                  initialSql={jumpSql || rawSql || 'SELECT * FROM table LIMIT 10;'}
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
                />
              </div>

              {/* SQL → natural language, same panel as the standalone Smart SQL Editor page. */}
              <AiSqlExplainer sql={smartEditorSql} optimizationResult={optimizationResult} />
            </div>
          </div>
        )}

        {/* Regular SQL/MyBatis Input */}
        {inputMode !== 'smart-editor' && (
          <>
            {/* Tabs - Full Width */}
            <TabNavigation inputMode={inputMode} onTabChange={handleTabChange} t={t} />

            {/* Workspace: left = input + parameters, right = resolved SQL (more width for readability) */}
            <div
              id="query-input-tabpanel"
              role="tabpanel"
              aria-labelledby={`tab-${inputMode}`}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                {/* Left: Input + Parameters */}
                <div className="space-y-4 xl:col-span-5">
                  {/* SQL Textarea */}
                  {inputMode === 'sql' && (
                    <QueryInputPanel
                      title={t.sqlInputPanelTitle}
                      description={t.sqlInputPanelHint}
                      icon={<FileCode2 size={14} className="text-primary" aria-hidden />}
                    >
                      <SqlInputPanel
                        value={rawSql}
                        onChange={setRawSql}
                        placeholder={t.sqlPlaceholder || 'Paste your SQL query here...'}
                      />
                    </QueryInputPanel>
                  )}

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
                    onAnalyze={handleAnalyze}
                    onLoadSample={handleLoadSample}
                    onClear={handleClear}
                    isLoading={isAnalyzing}
                    t={t}
                  />
                </div>

                {/* Right: Preview Panel (final SQL to analyze) */}
                <div className="xl:col-span-7 xl:min-h-[560px]">
                  <PreviewPanel currentSql={currentSql} inputMode={inputMode} t={t} />
                </div>
              </div>

              {/* Bottom: Complexity & Linting findings */}
              <BottomAnalytics currentSql={currentSql} />

              {/* Empty State Tips */}
              {!currentSql && <EmptyStateTips tips={tips} t={t} />}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
