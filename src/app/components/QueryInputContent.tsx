'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Code2,
  FileCode,
  Play,
  Trash2,
  BookOpen,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Copy,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import AppImage from '@/components/ui/AppImage';
import LoadingOverlay from '@/components/ui/LoadingOverlay';
import ComplexityDashboard from '@/components/ui/ComplexityDashboard';
import LintingAlerts from '@/components/ui/LintingAlerts';
import {
  analyseByAST,
  extractMyBatisParams,
  parseMyBatisXml,
  getConditionalParams,
  type SqlDialect,
} from '@/lib/sqlAnalyzer';

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

const DIALECTS: { value: SqlDialect; label: string; image: string }[] = [
  { value: 'mysql', label: 'MySQL', image: '/assets/images/my_sql_logo.png' },
  { value: 'postgresql', label: 'PostgreSQL', image: '/assets/images/postgresql_logo.jpg' },
  { value: 'sqlserver', label: 'SQL Server', image: '/assets/images/mssql_logo.png' },
  { value: 'oracle', label: 'Oracle DB', image: '/assets/images/oracle_logo.png' },
];

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
  const [dialectOpen, setDialectOpen] = useState(false);
  const [conditionalParams, setConditionalParams] = useState<Record<string, string>>({});
  const currentDialect = DIALECTS.find((d) => d.value === dialect);

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
  }, [myBatisXml, inputMode]);

  // Resolve params in real-time
  useEffect(() => {
    if (inputMode === 'sql') {
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
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const content = await file.text();
        setMyBatisXml(content);

        // Auto-switch to XML content tab after import
        if (inputMode !== 'mybatis') {
          setInputMode('mybatis');
        }

        toast.success(`File "${file.name}" imported successfully`);
      } catch {
        toast.error('Failed to read XML file');
      }

      // Reset file input
      if (e.target) e.target.value = '';
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
      const result = analyseByAST(sqlToAnalyze, dialect, settings.locale);
      setAnalysisResult(result);
      toast.success(
        `Analysis complete — ${result.tables.length} tables, ${result.joins.length} joins detected`
      );
      router.push('/sql-metrics-dashboard');
    } catch {
      toast.error('Failed to parse query. Check SQL syntax.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [inputMode, rawSql, resolvedSql, dialect, settings.locale]);

  const handleClear = () => {
    if (inputMode === 'sql') setRawSql('');
    else {
      setMyBatisXml('');
      setDetectedParams([]);
      setMyBatisParams({});
      setResolvedSql('');
    }
    // Clear analysis result to lock navigation
    setAnalysisResult(null);
  };

  const handleLoadSample = () => {
    if (inputMode === 'sql') {
      setRawSql(SAMPLE_SQL);
    } else {
      setMyBatisXml(SAMPLE_MYBATIS);
    }
  };

  const currentSql = inputMode === 'sql' ? rawSql : resolvedSql;
  const charCount = currentSql.length;
  const lineCount = currentSql.split('\n').length;

  return (
    <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 py-8">
      <LoadingOverlay
        visible={isAnalyzing}
        title={t.analyzing}
        description={t.parsingSQL}
        hideDelay={300}
        onHide={() => {
          // Optional: Add any cleanup logic when loading completes
        }}
      />

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Code2 size={22} className="text-primary" />
            {t.queryInputTitle}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t.queryInputSubtitle}</p>
        </div>
        {/* Dialect Selector */}
        <div className="relative">
          <button
            onClick={() => setDialectOpen((o) => !o)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-sm font-medium text-foreground hover:bg-muted transition-all duration-150"
          >
            <span className="text-muted-foreground text-xs">{t.dialectLabel}:</span>
            {currentDialect && (
              <AppImage
                src={currentDialect.image}
                alt={currentDialect.label}
                width={16}
                height={16}
                className="h-4 w-4 rounded-sm object-cover"
              />
            )}
            <span className="text-primary">{currentDialect?.label}</span>
            <ChevronDown size={14} className="text-muted-foreground" />
          </button>
          {dialectOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-lg shadow-xl z-50 py-1 animate-slide-up">
              {DIALECTS.map((d) => (
                <button
                  key={`dialect-${d.value}`}
                  onClick={() => {
                    setDialect(d.value);
                    setDialectOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                    dialect === d.value
                      ? 'text-primary bg-primary/10'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  {dialect === d.value && (
                    <CheckCircle2 size={12} className="text-primary flex-shrink-0" />
                  )}
                  {dialect !== d.value && <span className="w-3" />}
                  <AppImage
                    src={d.image}
                    alt={d.label}
                    width={14}
                    height={14}
                    className="h-3.5 w-3.5 rounded-sm object-cover"
                  />
                  {d.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 min-h-[500px]">
        {/* Left: Input Panel */}
        <div className="xl:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex items-center border-b border-border overflow-x-auto">
            <button
              onClick={() => setInputMode('sql')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-150 -mb-px whitespace-nowrap ${
                inputMode === 'sql'
                  ? 'tab-active'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Code2 size={14} />
              {t.tabPasteSQL}
            </button>
            <button
              onClick={() => setInputMode('mybatis')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-150 -mb-px whitespace-nowrap ${
                inputMode === 'mybatis'
                  ? 'tab-active'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileCode size={14} />
              XML Content
            </button>
            <button
              onClick={() => setInputMode('import-xml')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-150 -mb-px whitespace-nowrap ${
                inputMode === 'import-xml'
                  ? 'tab-active'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <BookOpen size={14} />
              Import XML File
            </button>
          </div>

          {/* SQL Textarea */}
          {inputMode === 'sql' && (
            <div className="relative animate-fade-in">
              <textarea
                value={rawSql}
                onChange={(e) => setRawSql(e.target.value)}
                placeholder={t.sqlPlaceholder}
                className="w-full h-[420px] px-4 py-3 bg-card border border-border rounded-lg font-mono text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring transition-all scrollbar-thin code-block"
                spellCheck={false}
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-3 text-xs text-muted-foreground font-mono">
                <span>
                  {lineCount} {t.linesCount}
                </span>
                <span>
                  {charCount} {t.charCount}
                </span>
              </div>
            </div>
          )}

          {/* MyBatis/XML Textarea */}
          {(inputMode === 'mybatis' || inputMode === 'import-xml') && (
            <div className="space-y-4 animate-fade-in">
              {inputMode === 'import-xml' ? (
                // File import UI
                <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-3 hover:border-primary/50 transition-colors cursor-pointer relative group">
                  <input
                    type="file"
                    accept=".xml"
                    onChange={handleXmlFileImport}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FileCode
                    size={32}
                    className="text-muted-foreground group-hover:text-primary transition-colors"
                  />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">
                      Drag XML file here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      MyBatis XML files will be automatically parsed
                    </p>
                  </div>
                </div>
              ) : (
                // XML content textarea
                <div className="relative">
                  <textarea
                    value={myBatisXml}
                    onChange={(e) => setMyBatisXml(e.target.value)}
                    placeholder={t.myBatisPlaceholder}
                    className="w-full h-[280px] px-4 py-3 bg-card border border-border rounded-lg font-mono text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring transition-all scrollbar-thin code-block"
                    spellCheck={false}
                  />
                </div>
              )}

              {/* Parameter Configuration */}
              {myBatisXml && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Parameters</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {detectedParams.length > 0
                          ? `${detectedParams.length} parameters detected`
                          : 'No parameters found'}
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
                      <span>No parameters to configure</span>
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
                                conditional
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={myBatisParams[param] || ''}
                            onChange={(e) =>
                              setMyBatisParams({
                                ...myBatisParams,
                                [param]: e.target.value,
                              })
                            }
                            placeholder={`value for ${param}`}
                            className="w-full px-3 py-1.5 bg-input border border-border rounded text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono transition-all"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {t.analyzing}
                </>
              ) : (
                <>
                  <Play size={14} />
                  {t.analyzeButton}
                </>
              )}
            </button>
            <button
              onClick={handleLoadSample}
              className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all duration-150"
            >
              <BookOpen size={14} />
              {t.loadSample}
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all duration-150"
            >
              <Trash2 size={14} />
              {t.clearButton}
            </button>
          </div>
        </div>

        {/* Right: Preview Panel */}
        <div className="xl:col-span-2 space-y-4 h-full" style={{ maxHeight: '500px' }}>
          {/* Resolved SQL Preview - Larger */}
          <div className="bg-card border border-border rounded-lg overflow-hidden h-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <Eye size={14} className="text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {inputMode === 'sql' ? 'SQL Preview' : 'Resolved Query'}
                </span>
              </div>
              <button
                onClick={() => {
                  const text = currentSql;
                  navigator.clipboard.writeText(text);
                  toast.success(t.copied);
                }}
                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <Copy size={13} />
              </button>
            </div>
            <div className="p-4 overflow-auto scrollbar-thin flex-grow max-h-full">
              {currentSql ? (
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed">
                  {currentSql}
                </pre>
              ) : (
                <p className="text-xs text-muted-foreground italic">{t.resolvedPreviewEmpty}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Complexity & Linting */}
      {currentSql && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Complexity Dashboard */}
          <ComplexityDashboard sql={currentSql} showDetails={true} />

          {/* Linting Alerts */}
          <LintingAlerts sql={currentSql} compact={false} />
        </div>
      )}

      {!currentSql && (
        <div className="bg-card border border-border rounded-lg p-6 mt-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Tips
          </h3>
          <ul className="space-y-2">
            {[t.tipCTE, t.tipJoin, t.tipMyBatis, t.tipDialect].map((tip, i) => (
              <li key={`tip-${i}`} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="text-primary mt-0.5 flex-shrink-0">›</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
