const en = {
  // App
  appName: 'SQLVisualizer',
  appTagline: 'SQL & MyBatis Query Analyzer',

  // Nav
  navQueryInput: 'Query Input',
  navGraphVisualizer: 'Graph Visualizer',
  navMetricsDashboard: 'Metrics Dashboard',
  navCTEAnalysis: 'CTE Analysis',
  navGuideline: 'Guideline',
  navSettings: 'Settings',

  // Query Input
  queryInputTitle: 'Query Input & Configuration',
  queryInputSubtitle: 'Paste SQL or import MyBatis XML to begin analysis',
  tabPasteSQL: 'Paste SQL Direct',
  tabMyBatis: 'Import MyBatis XML',
  dialectLabel: 'SQL Dialect',
  dialectMySQL: 'MySQL',
  dialectPostgres: 'PostgreSQL',
  dialectSQLServer: 'SQL Server',
  dialectOracle: 'Oracle DB',
  sqlPlaceholder:
    "Paste your SQL query here...\n\nExample:\nSELECT o.id, c.name, p.title\nFROM orders o\nINNER JOIN customers c ON o.customer_id = c.id\nLEFT JOIN products p ON o.product_id = p.id\nWHERE o.status = 'active'",
  myBatisPlaceholder:
    'Paste your MyBatis XML here...\n\nExample:\n<select id="getOrders" resultType="Order">\n  SELECT * FROM orders WHERE customer_id = #{customerId}\n  AND status = #{status}\n</select>',
  parametersTitle: 'Parameter Configuration',
  parametersSubtitle: 'Fill in values to resolve dynamic parameters',
  paramDetected: 'parameters detected',
  noParams: 'No dynamic parameters detected in this XML',
  analyzeButton: 'Analyze Query',
  analyzing: 'Analyzing...',
  clearButton: 'Clear',
  loadSample: 'Load Sample',
  resolvedPreviewTitle: 'Resolved SQL Preview',
  resolvedPreviewEmpty: 'Resolved SQL will appear here as you fill parameters',
  charCount: 'characters',
  linesCount: 'lines',

  // Graph
  graphTitle: 'Relationship Graph',
  graphSubtitle: 'Interactive table relationship visualization',
  noGraph: 'No graph to display',
  noGraphHint: 'Analyze a query first to see the relationship graph',
  tableCount: 'Tables',
  joinCount: 'Joins',
  selectedNode: 'Selected Table',
  nodeColumns: 'Referenced Columns',
  nodeJoins: 'Connected Joins',
  joinLegend: 'Join Type Legend',
  fitView: 'Fit View',
  autoLayout: 'Auto Layout',
  exportGraph: 'Export',
  clickNodeHint: 'Click a node to inspect its relationships',
  allTables: 'All Tables',
  searchTables: 'Search tables...',
  noTablesFound: 'No tables found',
  smartSuggestions: 'Smart Suggestions',
  extractedTables: 'Extracted Tables',
  rows: 'rows',
  colTableName: 'Table Name',
  colClause: 'Clause',
  colRelationTo: 'Relation To',
  colHits: 'Hits',
  convertMermaid: 'Convert to Mermaid',
  copyChart: 'Copy Chart',
  errors: 'errors',
  warnings: 'warnings',
  warning: 'warning',
  error: 'Error',

  // Smart Suggestions — titles
  suggMissingIndexTitle: 'Missing indexes on join columns',
  suggExcessiveJoinsTitle: 'Excessive joins detected',
  suggManyJoinsTitle: 'Multiple joins — review join order',
  suggCrossJoinTitle: 'CROSS JOIN produces Cartesian product',
  suggInefficientCteTitle: 'CTE complexity',
  suggTooManyCteTitle: 'High CTE count',
  suggDeepSubqueryTitle: 'Deep subquery nesting',
  suggWindowFunctionsTitle: 'Multiple window functions',
  suggFullOuterJoinTitle: 'FULL OUTER JOIN — verify intent',
  suggIsolatedTablesTitle: 'Unconnected table(s)',
  suggSuperHighComplexityTitle: 'Critical query complexity',
  suggLooksGoodTitle: 'Query looks well-structured',

  // Smart Suggestions — details
  suggMissingIndexDetail:
    'Ensure indexes exist on join key columns. Missing indexes on join keys cause full table scans.',
  suggExcessiveJoinsDetail:
    'joins in a single query significantly increases execution cost. Consider splitting into smaller queries or using intermediate CTEs to pre-aggregate data.',
  suggManyJoinsDetail:
    'Place the most selective (smallest result set) table first in the FROM clause. Ensure the optimizer can use index nested loops.',
  suggCrossJoinDetail:
    'CROSS JOIN(s) found. This multiplies row counts of both tables. Add an ON condition or replace with INNER JOIN unless a Cartesian product is intentional.',
  suggInefficientCteDetail:
    'These CTEs reference multiple tables internally. In MySQL/SQL Server, CTEs are not materialized by default — they may be re-evaluated on each reference. Consider using temp tables or MATERIALIZED hint (PostgreSQL).',
  suggTooManyCteDetail:
    'Many chained CTEs can prevent the optimizer from choosing efficient join orders. Flatten or merge CTEs where possible.',
  suggDeepSubqueryDetail:
    'Deeply nested subqueries prevent index usage and force sequential evaluation. Refactor using JOINs or CTEs to flatten the query structure.',
  suggWindowFunctionsDetail:
    'Each OVER() clause triggers a separate sort/partition pass. Group window functions with the same PARTITION BY/ORDER BY into a single expression where possible.',
  suggFullOuterJoinDetail:
    'FULL OUTER JOINs return all rows from both sides including NULLs. Confirm this is intentional; they are often replaceable with LEFT JOIN + UNION ALL for better performance.',
  suggIsolatedTablesDetail:
    'These tables appear in the query but have no detected JOIN relationship. Verify they are intentionally included or add explicit join conditions.',
  suggSuperHighComplexityDetail:
    'This query is at risk of causing full table scans, lock contention, and timeout errors in production. Strongly recommend decomposition.',
  suggLooksGoodDetail:
    'No major performance concerns detected. Ensure join columns are indexed and statistics are up to date.',

  // Metrics
  metricsTitle: 'SQL Metrics Dashboard',
  metricsSubtitle: 'Aggregated SQL construct analysis',
  windowFunctions: 'Window Functions',
  groupBy: 'GROUP BY Clauses',
  orderBy: 'ORDER BY Clauses',
  distinct: 'DISTINCT Keywords',
  subqueryDepth: 'Subquery Depth',
  complexityScore: 'Complexity Score',
  complexityLevel: 'Complexity Level',
  executionCost: 'Estimated Execution Cost',
  executionCostHint:
    'Client-side heuristic based on complexity, dialect, and standard indexing assumptions',
  complexityLow: 'LOW',
  complexityMedium: 'MEDIUM',
  complexityHigh: 'HIGH',
  complexitySuper: 'SUPER HIGH',
  noMetrics: 'No metrics available',
  noMetricsHint: 'Analyze a query to see metrics',
  impactLow: 'Low Impact',
  impactMedium: 'Medium Impact',
  impactHigh: 'High Impact',
  recommendation: 'Recommendation',
  factorsBreakdown: 'Complexity Factors Breakdown',

  // CTE
  cteTitle: 'CTE Analysis',
  cteSubtitle: 'Common Table Expression scanner and field origin mapping',
  noCTEs: 'No CTEs detected',
  noCTEsHint: 'This query does not contain any WITH...AS(...) expressions',
  cteBody: 'CTE Body',
  cteTables: 'Referenced Tables',
  cteFields: 'Selected Fields',
  mainQueryFields: 'Main Query Field Origins',
  fieldName: 'Field',
  fieldOrigin: 'Origin',
  fieldType: 'Type',
  originCTE: 'CTE',
  originTable: 'Table',
  originExpression: 'Expression',
  copySQL: 'Copy SQL',
  expandAll: 'Expand All',
  collapseAll: 'Collapse All',
  cteUnusedCount: 'Unused CTEs',
  cteRecursiveCount: 'Recursive CTEs',
  cteAvgComplexity: 'Avg Complexity',
  cteNestedSubqueries: 'Nested Subqueries',
  cteNestedSubqueriesHint: 'Deep nested subqueries detected inside this CTE',
  cteNoNestedSubqueries: 'No nested subqueries found',
  cteSubqueryDepth: 'Depth',
  cteSubqueryContext: 'Context',
  cteSubqueryTables: 'Tables',
  cteSubqueryFields: 'Fields',
  cteSubqueryLines: 'Lines',
  cteSubqueryHasJoins: 'Has JOINs',
  cteSubqueryHasAggregation: 'Has Aggregation',
  cteSubqueryCount: 'Subqueries',

  // CTE Analysis - Additional missing translations
  cteOriginBadgeCTE: 'CTE',
  cteOriginBadgeTable: 'Table',
  cteOriginBadgeExpression: 'Expression',
  cteTagJOIN: 'JOIN',
  cteTagAGG: 'AGG',
  cteTagRECURSIVE: 'RECURSIVE',
  cteTagUNUSED: 'UNUSED',
  cteSubqueryPrefix: 'Subquery',
  cteNoTablesDetected: 'No tables detected',
  cteNoFieldsDetected: 'No fields detected',
  cteDetected: 'Detected',
  cteTotalLabel: 'Total CTEs',
  cteDepCountLabel: 'CTEs',
  cteBooleanYes: 'Yes',
  cteBooleanNo: 'No',
  cteMetadataTables: 'tables',
  cteMetadataFields: 'fields',
  cteMetadataLines: 'lines',
  cteMetadataUsed: 'used',
  cteIssues: 'Issues',
  cteUsageCount: 'Usage Count',
  cteUsedInMain: 'used in main',
  cteEstimatedComplexity: 'Estimated Complexity',
  cteIsRecursive: 'Is Recursive',
  cteDependencies: 'Dependencies',
  cteDepsLabel: 'CTE Dependencies',
  cteColumnRefs: 'Column References',
  cteUnusedWarning: 'This CTE is never used in the main query',
  cteRecursiveNote: 'This CTE references itself (recursive)',

  // Settings
  settingsTitle: 'Settings & Preferences',
  settingsSubtitle: 'Configure appearance, language, and analysis defaults',
  settingsAppearance: 'Appearance',
  settingsLanguage: 'Language',
  settingsAnalysis: 'Analysis Defaults',
  settingsGraph: 'Graph Layout',
  darkMode: 'Dark Mode',
  darkModeHint: 'Use dark theme across the application',
  lightMode: 'Light Mode',
  language: 'Language',
  languageHint: 'Select UI display language',
  defaultDialect: 'Default SQL Dialect',
  defaultDialectHint: 'Pre-selected dialect when opening the app',
  autoAnalyze: 'Auto-Analyze on Paste',
  autoAnalyzeHint: 'Automatically analyze query when pasting into the SQL input',
  graphLayout: 'Graph Layout Algorithm',
  graphLayoutHint: 'Algorithm used for initial node placement',
  nodeSpacing: 'Node Spacing',
  nodeSpacingHint: 'Distance between nodes in the graph',
  edgeStyle: 'Edge Style',
  edgeStyleHint: 'Visual style for join relationship edges',
  saved: 'Settings saved',
  layoutDagre: 'Dagre (Hierarchical)',
  layoutForce: 'Force-Directed',
  layoutGrid: 'Grid',
  edgeSmooth: 'Smooth Bezier',
  edgeStraight: 'Straight',
  edgeStep: 'Step',
  accentColor: 'Accent Color',
  accentColorHint: 'Primary highlight color used throughout the UI',
  resetDefaults: 'Reset to Defaults',
  resetConfirm: 'This will reset all settings to their default values.',

  // Guideline
  guidelineTitle: 'User Guide',
  guidelineSubtitle: 'Everything you need to get the most out of SQLVisualizer',
  guidelineQuickStart: 'Quick Start',
  guidelineQuickStartDesc:
    "Go to Query Input → paste your SQL → click Analyze. All four screens (Graph, Metrics, CTE, Settings) will populate automatically with your query's data.",
  guidelineTips: 'Tips',
  guidelineSidebarControls: 'Sidebar Controls',
  guidelineBuiltFor: 'Built for developers who love clarity',

  // Guideline - Query Input Section
  guidelineQueryInputTitle: 'Query Input',
  guidelineQueryInputSubtitle: 'Start here — paste your SQL or import a MyBatis XML file',
  guidelineQueryInputStep1Label: 'Choose input mode',
  guidelineQueryInputStep1Desc:
    'Switch between "Paste SQL Direct" and "Import MyBatis XML" tabs at the top of the editor.',
  guidelineQueryInputStep2Label: 'Select SQL dialect',
  guidelineQueryInputStep2Desc:
    'Pick MySQL, PostgreSQL, SQL Server, or Oracle from the dialect dropdown to get accurate analysis.',
  guidelineQueryInputStep3Label: 'Paste or type your query',
  guidelineQueryInputStep3Desc:
    'Paste your SQL directly into the editor. For MyBatis XML, fill in parameter values to resolve dynamic expressions like #{param}.',
  guidelineQueryInputStep4Label: 'Click "Analyze Query"',
  guidelineQueryInputStep4Desc:
    'Hit the Analyze button (or enable Auto-Analyze in Settings). Results populate all other screens instantly.',
  guidelineQueryInputTip1: 'Use "Load Sample" to try the tool with a pre-built multi-join query.',
  guidelineQueryInputTip2:
    'The character and line counter at the bottom helps you track query size.',

  // Guideline - Graph Visualizer Section
  guidelineGraphTitle: 'Relationship Graph',
  guidelineGraphSubtitle: 'Interactive visualization of table relationships and JOIN connections',
  guidelineGraphStep1Label: 'Read the graph',
  guidelineGraphStep1Desc:
    'Each box is a table. Colored lines (edges) connect tables that share a JOIN. The line color matches the JOIN type shown in the legend on the right.',
  guidelineGraphStep2Label: 'Click a table node',
  guidelineGraphStep2Desc:
    'Clicking a node highlights it and its direct connections. The right panel shows columns, join conditions, and related tables.',
  guidelineGraphStep3Label: 'Use the Extracted Tables section',
  guidelineGraphStep3Desc:
    'The collapsible table at the bottom lists every table with its clause (FROM/JOIN), which table it relates to, and how many times it appears (hits). Click "Copy" to export as CSV.',
  guidelineGraphStep4Label: 'Export the chart',
  guidelineGraphStep4Desc:
    '"Convert to Mermaid" copies the full Mermaid diagram syntax to your clipboard, ready to paste into any Mermaid-compatible renderer.',
  guidelineGraphTip1:
    'Edge colors: Amber = LEFT JOIN, Green = RIGHT JOIN, Indigo = INNER JOIN, Pink = FULL OUTER, Red = CROSS, Purple = NATURAL.',
  guidelineGraphTip2:
    'Use the MiniMap (bottom-right) to navigate large graphs. Scroll to zoom, drag to pan.',

  // Guideline - Metrics Dashboard Section
  guidelineMetricsTitle: 'Metrics Dashboard',
  guidelineMetricsSubtitle: 'Quantified complexity analysis and performance heuristics',
  guidelineMetricsStep1Label: 'Complexity Score gauge',
  guidelineMetricsStep1Desc:
    'The radial gauge shows a 0–100 complexity score. LOW (green) → MEDIUM (yellow) → HIGH (orange) → SUPER HIGH (red).',
  guidelineMetricsStep2Label: 'Complexity Factors Breakdown',
  guidelineMetricsStep2Desc:
    'The bar chart breaks down individual factors: JOINs, subquery depth, window functions, GROUP BY, ORDER BY, and DISTINCT usage.',
  guidelineMetricsStep3Label: 'Estimated Execution Cost',
  guidelineMetricsStep3Desc:
    'A client-side heuristic score based on complexity, dialect, and standard indexing assumptions. Use as a relative guide, not an absolute benchmark.',
  guidelineMetricsTip1:
    'Hover over chart bars to see exact values and recommendations for each factor.',

  // Guideline - CTE Analysis Section
  guidelineCTETitle: 'CTE Analysis',
  guidelineCTESubtitle: 'Deep-dive into Common Table Expressions and field origin mapping',
  guidelineCTEStep1Label: 'View detected CTEs',
  guidelineCTEStep1Desc:
    'Each WITH...AS(...) block is listed as a card. Expand a card to see the CTE body SQL, referenced tables, and selected fields.',
  guidelineCTEStep2Label: 'Field origin mapping',
  guidelineCTEStep2Desc:
    'The "Main Query Field Origins" table shows where each field in the final SELECT comes from — a CTE, a base table, or a computed expression.',
  guidelineCTEStep3Label: 'Copy CTE SQL',
  guidelineCTEStep3Desc:
    'Each CTE card has a "Copy SQL" button to copy that CTE\'s body to your clipboard for reuse.',
  guidelineCTETip1: 'Use "Expand All" / "Collapse All" to quickly scan or hide all CTE bodies.',

  // Guideline - Settings Section
  guidelineSettingsTitle: 'Settings & Preferences',
  guidelineSettingsSubtitle: 'Customize appearance, language, and analysis behavior',
  guidelineSettingsStep1Label: 'Dark / Light mode',
  guidelineSettingsStep1Desc:
    'Toggle between dark and light themes. You can also switch quickly using the Sun/Moon button at the bottom of the sidebar.',
  guidelineSettingsStep2Label: 'Language (EN / VI)',
  guidelineSettingsStep2Desc:
    'Switch the UI between English and Vietnamese. The globe button in the sidebar provides a quick toggle.',
  guidelineSettingsStep3Label: 'Graph layout & edge style',
  guidelineSettingsStep3Desc:
    'Choose Dagre (hierarchical), Force-Directed, or Grid layout. Edge style can be Smooth Bezier, Straight, or Step.',
  guidelineSettingsStep4Label: 'Auto-Analyze on Paste',
  guidelineSettingsStep4Desc:
    'When enabled, the tool automatically runs analysis as soon as you paste SQL into the editor — no need to click Analyze.',
  guidelineSettingsTip1:
    'Settings are persisted in your browser — your preferences survive page refreshes.',

  // Guideline - Tools Available Section
  guidelineToolsTitle: 'Tools Available',
  guidelineToolsSubtitle: 'Complete feature overview and tool descriptions',
  guidelineToolsIntroTitle: 'All Powerful SQL Analysis Features',
  guidelineToolsIntroDesc:
    'SQLVisualizer provides five integrated tools working together to analyze, visualize, and optimize your SQL queries. Use them individually or as a complete workflow.',
  guidelineToolsQueryInputName: 'Query Input & Configuration',
  guidelineToolsQueryInputDesc:
    'The starting point for all analysis. Paste raw SQL or import MyBatis XML files with dynamic parameter support.',
  guidelineToolsQueryInputFeatures: 'Dual input modes • Multi-dialect support (MySQL, PostgreSQL, SQL Server, Oracle) • Auto-analysis option • Sample queries • Character/line counter',
  guidelineToolsGraphName: 'Relationship Graph Visualizer',
  guidelineToolsGraphDesc:
    'Interactive visualization of table relationships. See at a glance which tables join together and how data flows through your query.',
  guidelineToolsGraphFeatures: 'Interactive nodes • Color-coded JOIN types • Multiple layout options • Mermaid diagram export • MiniMap navigation • CSV export of tables',
  guidelineToolsMetricsName: 'Metrics Dashboard',
  guidelineToolsMetricsDesc:
    'Quantify query complexity with objective metrics. Understand performance impact before execution and get specific optimization recommendations.',
  guidelineToolsMetricsFeatures: 'Complexity gauge (0-100) • Breakdown by factors (JOINs, subqueries, functions) • Estimated execution cost • Per-factor recommendations • Interactive tooltips',
  guidelineToolsCTEName: 'CTE Analysis',
  guidelineToolsCTEDesc:
    'Deep-dive into Common Table Expressions. See CTE structure, dependencies, field origins, and identify unused or problematic CTEs.',
  guidelineToolsCTEFeatures: 'CTE detection & listing • Recursive/unused CTE flags • Field origin mapping • Nested subquery analysis • Copy CTE SQL • Bulk expand/collapse',
  guidelineToolsSettingsName: 'Settings & Preferences',
  guidelineToolsSettingsDesc:
    'Customize the application to your preferences. Control appearance, language, graph visualization style, and analysis behavior.',
  guidelineToolsSettingsFeatures: 'Dark/light theme • EN/VI language switching • Graph layout options (Dagre/Force/Grid) • Edge style selection • Auto-analyze toggle',
  guidelineToolsWorkflowTitle: 'Common Workflows',
  guidelineToolsWorkflowQuickAudit: 'Quick Audit (5 min)',
  guidelineToolsWorkflowQuickAuditDesc: 'Paste query → Check Metrics → Review CTE Analysis',
  guidelineToolsWorkflowDeepAnalysis: 'Deep Analysis (15 min)',
  guidelineToolsWorkflowDeepAnalysisDesc: 'Paste query → Explore Graph → Review metrics → Export diagram and tables',
  guidelineToolsWorkflowOptimization: 'Optimization Work (30+ min)',
  guidelineToolsWorkflowOptimizationDesc: 'Baseline metrics → Identify bottlenecks → Optimize → Compare improvements → Export results',
  guidelineToolsWorkflowTeamReview: 'Team Review (20 min)',
  guidelineToolsWorkflowTeamReviewDesc: 'Load query → Export Mermaid → Discuss in meeting → Review CTE origins → Document',
  guidelineToolsExportTitle: 'Export & Integration',
  guidelineToolsExportCSV: 'CSV Export (Tables)',
  guidelineToolsExportCSVDesc: 'Export Extracted Tables section for spreadsheet analysis or database documentation.',
  guidelineToolsExportMermaid: 'Mermaid Diagram',
  guidelineToolsExportMermaidDesc: 'Copy full Mermaid diagram syntax to clipboard. Paste into Mermaid renderers, wikis, or documentation tools.',
  guidelineToolsExportCTESQL: 'CTE SQL Copy',
  guidelineToolsExportCTESQLDesc: 'Copy individual CTE bodies for reuse in other queries or standalone CTE optimization.',

  // Guideline - Quick Reference
  guidelineQuickRefQueryInput: 'Query Input',
  guidelineQuickRefGraph: 'Graph Visualizer',
  guidelineQuickRefMetrics: 'Metrics Dashboard',
  guidelineQuickRefCTE: 'CTE Analysis',
  guidelineQuickRefSettings: 'Settings',

  // Guideline - Sidebar Controls
  guidelineSidebarDarkLight: 'Dark / Light toggle',
  guidelineSidebarDarkLightDesc: 'Bottom of sidebar',
  guidelineSidebarLanguage: 'EN ↔ VI language',
  guidelineSidebarLanguageDesc: 'Globe button in sidebar',
  guidelineSidebarCopyChart: 'Copy chart / Mermaid',
  guidelineSidebarCopyChartDesc: 'Top-right of Graph screen',
  guidelineSidebarExportCSV: 'Export CSV',
  guidelineSidebarExportCSVDesc: 'Extracted Tables section',

  // SQL Analyzer - Complexity Recommendations
  complexityRecommendationLow:
    'Query appears lightweight. Standard indexing should handle this well.',
  complexityRecommendationMedium:
    'Consider reviewing join order. Ensure indexed columns are used in ON conditions.',
  complexityRecommendationHigh:
    'High complexity detected. Consider breaking into smaller queries or using materialized CTEs.',
  complexityRecommendationSuperHigh:
    'Critical complexity. This query may cause full table scans. Strongly recommend query decomposition and index review.',

  // Common
  copy: 'Copy',
  copied: 'Copied!',
  close: 'Close',
  expand: 'Expand',
  collapse: 'Collapse',
  noData: 'No data',
  loading: 'Loading...',
  success: 'Success',
  cancel: 'Cancel',
  confirm: 'Confirm',
  reset: 'Reset',
  save: 'Save',
} as const;

export default en;
