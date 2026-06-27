'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import LoadingOverlay from '@/components/ui/LoadingOverlay';
import SmartSQLEditor from '@/components/SmartSQLEditor';
import {
  analyzeSql,
  extractMyBatisParams,
  parseMyBatisXml,
  getConditionalParams,
  type SqlDialect,
} from '@/lib/sqlAnalyzer';

// Import sub-components
import { Header } from './components/Header';
import { TabNavigation } from './components/TabNavigation';
import { SqlInputPanel } from './components/SqlInputPanel';
import { MyBatisPanel } from './components/MyBatisPanel';
import { ParameterConfig } from './components/ParameterConfig';
import { ActionButtons } from './components/ActionButtons';
import { PreviewPanel } from './components/PreviewPanel';
import { BottomAnalytics } from './components/BottomAnalytics';
import { EmptyStateTips } from './components/EmptyStateTips';

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
  const {
    settings,
    dialect,
    rawSql,
    myBatisXml,
    resolvedSql,
    myBatisParams,
    inputMode,
    isAnalyzing,
    setDialect,
    setRawSql,
    setMyBatisXml,
    setResolvedSql,
    setMyBatisParams,
    setAnalysisResult,
    setIsAnalyzing,
    setInputMode,
  } = useAppStore();

  const t = getT(settings.locale);
  const [detectedParams, setDetectedParams] = useState<string[]>([]);
  const [conditionalParams, setConditionalParams] = useState<Record<string, string>>({});

  // Detect params when MyBatis XML changes
  useEffect(() => {
    if ((inputMode === 'mybatis' || inputMode === 'import-xml') && myBatisXml) {
      const params = extractMyBatisParams(myBatisXml);
      setDetectedParams(params);
      const conditional = getConditionalParams(myBatisXml);
      setConditionalParams(conditional);
      // Remove stale params
      const updated: Record<string, string> = {};
      params.forEach((p) => {
        updated[p] = myBatisParams[p] || '';
      });
      setMyBatisParams(updated);
    }
  }, [myBatisXml, inputMode, myBatisParams, setMyBatisParams]);

  // Resolve params in real-time
  useEffect(() => {
    if (inputMode === 'sql' || inputMode === 'smart-editor') {
      // For SQL mode, don't use resolved SQL - clear it
      setResolvedSql('');
    } else if ((inputMode === 'mybatis' || inputMode === 'import-xml') && myBatisXml) {
      // Parse MyBatis XML to get clean SQL without any XML tags
      const { sql: cleanSql } = parseMyBatisXml(myBatisXml);

      // Replace parameters in the clean SQL
      let resolved = cleanSql;
      for (const [key, value] of Object.entries(myBatisParams)) {
        if (value) {
          resolved = resolved.replace(new RegExp(`[#$]\\{${key}\\}`, 'g'), value);
        }
      }

      setResolvedSql(resolved);
    } else {
      // No XML content yet
      setResolvedSql('');
    }
  }, [myBatisParams, myBatisXml, inputMode, setResolvedSql]);

  const handleXmlFileImport = useCallback(
    (content: string, fileName: string) => {
      setMyBatisXml(content);
      // Auto-switch to XML content tab after import
      if (inputMode !== 'mybatis') {
        setInputMode('mybatis');
      }
    },
    [inputMode, setMyBatisXml, setInputMode]
  );

  const handleAnalyze = useCallback(async () => {
    const sqlToAnalyze = inputMode === 'sql' ? rawSql : resolvedSql;
    if (!sqlToAnalyze.trim()) {
      toast.error('Please enter a SQL query first');
      return;
    }
    setIsAnalyzing(true);
    // Simulate async parsing (dt-sql-parser integration point)
    await new Promise((r) => setTimeout(r, 600));
    try {
      const result = await analyzeSql(sqlToAnalyze, dialect, settings.locale);
      setAnalysisResult(result);
      toast.success(
        t.analysisCompleteMessage
          ?.replace('{tables}', result.tables.length.toString())
          ?.replace('{joins}', result.joins.length.toString()) || 'Analysis complete'
      );
      router.push('/sql-metrics-dashboard');
    } catch {
      toast.error(t.parseErrorMessage || 'Parse error');
    } finally {
      setIsAnalyzing(false);
    }
  }, [
    inputMode,
    rawSql,
    resolvedSql,
    dialect,
    settings.locale,
    router,
    t,
    setIsAnalyzing,
    setAnalysisResult,
  ]);

  const handleClear = useCallback(() => {
    if (inputMode === 'sql') setRawSql('');
    else {
      setMyBatisXml('');
      setDetectedParams([]);
      setMyBatisParams({});
      setResolvedSql('');
    }
    // Clear analysis result to lock navigation
    setAnalysisResult(null);
  }, [inputMode, setRawSql, setMyBatisXml, setMyBatisParams, setResolvedSql, setAnalysisResult]);

  const handleLoadSample = useCallback(() => {
    if (inputMode === 'sql') {
      setRawSql(SAMPLE_SQL);
    } else if (inputMode === 'mybatis' || inputMode === 'import-xml') {
      setMyBatisXml(SAMPLE_MYBATIS);
    }
  }, [inputMode, setRawSql, setMyBatisXml]);

  const handleTabChange = (newMode: 'sql' | 'mybatis' | 'import-xml' | 'smart-editor') => {
    setInputMode(newMode as any);
  };

  const currentSql = inputMode === 'smart-editor' ? '' : inputMode === 'sql' ? rawSql : resolvedSql;

  // Tips array
  const tips = [
    t.tipCTE || 'Use CTEs for complex queries',
    t.tipJoin || 'JOIN optimization matters',
    t.tipMyBatis || 'MyBatis XML for dynamic queries',
    t.tipDialect || 'Select correct dialect',
  ].filter(Boolean);
  return (
    <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 py-8">
      <LoadingOverlay
        visible={isAnalyzing}
        title={t.analyzing || 'Analyzing'}
        description={t.parsingSQL || 'Parsing SQL...'}
        hideDelay={300}
        onHide={() => {
          // Optional: Add any cleanup logic when loading completes
        }}
      />

      {/* Header */}
      <Header dialect={dialect} onDialectChange={setDialect} t={t} />

      {/* Smart Editor Tab - Fullscreen */}
      {inputMode === 'smart-editor' && (
        <div className="mb-6">
          <TabNavigation inputMode={inputMode} onTabChange={handleTabChange} t={t} />
          <div className="mt-4">
            <SmartSQLEditor initialSql={rawSql || 'SELECT * FROM table LIMIT 10;'} />
          </div>
        </div>
      )}

      {/* Regular SQL/MyBatis Input */}
      {inputMode !== 'smart-editor' && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 min-h-[500px]">
            {/* Left: Input Panel */}
            <div className="xl:col-span-2 space-y-4">
              {/* Tabs */}
              <TabNavigation inputMode={inputMode} onTabChange={handleTabChange} t={t} />

              {/* SQL Textarea */}
              {inputMode === 'sql' && (
                <SqlInputPanel
                  value={rawSql}
                  onChange={setRawSql}
                  placeholder={t.sqlPlaceholder || 'Paste your SQL query here...'}
                />
              )}

              {/* MyBatis/XML Textarea */}
              {(inputMode === 'mybatis' || inputMode === 'import-xml') && (
                <div className="space-y-4">
                  <MyBatisPanel
                    xmlContent={myBatisXml}
                    onXmlChange={setMyBatisXml}
                    onFileImport={handleXmlFileImport}
                    placeholder={t.myBatisPlaceholder || 'Paste MyBatis XML here...'}
                    showFileImport={inputMode === 'import-xml'}
                  />

                  {/* Parameter Configuration */}
                  {myBatisXml && (
                    <ParameterConfig
                      detectedParams={detectedParams}
                      myBatisParams={myBatisParams}
                      onParamChange={(key, value) =>
                        setMyBatisParams({ ...myBatisParams, [key]: value })
                      }
                      conditionalParams={conditionalParams}
                    />
                  )}
                </div>
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

            {/* Right: Preview Panel */}
            <div className="xl:col-span-2 space-y-4 h-full" style={{ maxHeight: '500px' }}>
              <PreviewPanel currentSql={currentSql} inputMode={inputMode} t={t} />
            </div>
          </div>

          {/* Bottom: Complexity & Linting */}
          <BottomAnalytics currentSql={currentSql} t={t} />

          {/* Empty State Tips */}
          {!currentSql && <EmptyStateTips tips={tips} />}
        </>
      )}
    </div>
  );
}
