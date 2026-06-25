const en = {
  // App
  appName: 'SQL Visualizer',
  appTagline: 'SQL & Query Analyzer',

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
  parsingSQL: 'Parsing SQL structure...',
  clearButton: 'Clear',
  loadSample: 'Load Sample',
  resolvedPreviewTitle: 'Resolved SQL Preview',
  resolvedPreviewEmpty: 'Resolved SQL will appear here as you fill parameters',
  charCount: 'characters',
  linesCount: 'lines',

  // Tips
  tipCTE: 'Use WITH...AS for CTEs to get full CTE analysis',
  tipJoin: 'JOIN conditions with table.column = table.column are auto-detected',
  tipMyBatis: 'MyBatis #{param} and ${param} syntax both supported',
  tipDialect: 'Switch dialect to adjust complexity scoring',

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
  fieldAlias: 'Alias',
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
    'SQL Visualizer provides five integrated tools working together to analyze, visualize, and optimize your SQL queries. Use them individually or as a complete workflow.',
  guidelineToolsQueryInputName: 'Query Input & Configuration',
  guidelineToolsQueryInputDesc:
    'The starting point for all analysis. Paste raw SQL or import MyBatis XML files with dynamic parameter support.',
  guidelineToolsQueryInputFeatures:
    'Dual input modes • Multi-dialect support (MySQL, PostgreSQL, SQL Server, Oracle) • Auto-analysis option • Sample queries • Character/line counter',
  guidelineToolsGraphName: 'Relationship Graph Visualizer',
  guidelineToolsGraphDesc:
    'Interactive visualization of table relationships. See at a glance which tables join together and how data flows through your query.',
  guidelineToolsGraphFeatures:
    'Interactive nodes • Color-coded JOIN types • Multiple layout options • Mermaid diagram export • MiniMap navigation • CSV export of tables',
  guidelineToolsMetricsName: 'Metrics Dashboard',
  guidelineToolsMetricsDesc:
    'Quantify query complexity with objective metrics. Understand performance impact before execution and get specific optimization recommendations.',
  guidelineToolsMetricsFeatures:
    'Complexity gauge (0-100) • Breakdown by factors (JOINs, subqueries, functions) • Estimated execution cost • Per-factor recommendations • Interactive tooltips',
  guidelineToolsCTEName: 'CTE Analysis',
  guidelineToolsCTEDesc:
    'Deep-dive into Common Table Expressions. See CTE structure, dependencies, field origins, and identify unused or problematic CTEs.',
  guidelineToolsCTEFeatures:
    'CTE detection & listing • Recursive/unused CTE flags • Field origin mapping • Nested subquery analysis • Copy CTE SQL • Bulk expand/collapse',
  guidelineToolsSettingsName: 'Settings & Preferences',
  guidelineToolsSettingsDesc:
    'Customize the application to your preferences. Control appearance, language, graph visualization style, and analysis behavior.',
  guidelineToolsSettingsFeatures:
    'Dark/light theme • EN/VI language switching • Graph layout options (Dagre/Force/Grid) • Edge style selection • Auto-analyze toggle',
  guidelineToolsWorkflowTitle: 'Common Workflows',
  guidelineToolsWorkflowQuickAudit: 'Quick Audit (5 min)',
  guidelineToolsWorkflowQuickAuditDesc: 'Paste query → Check Metrics → Review CTE Analysis',
  guidelineToolsWorkflowDeepAnalysis: 'Deep Analysis (15 min)',
  guidelineToolsWorkflowDeepAnalysisDesc:
    'Paste query → Explore Graph → Review metrics → Export diagram and tables',
  guidelineToolsWorkflowOptimization: 'Optimization Work (30+ min)',
  guidelineToolsWorkflowOptimizationDesc:
    'Baseline metrics → Identify bottlenecks → Optimize → Compare improvements → Export results',
  guidelineToolsWorkflowTeamReview: 'Team Review (20 min)',
  guidelineToolsWorkflowTeamReviewDesc:
    'Load query → Export Mermaid → Discuss in meeting → Review CTE origins → Document',
  guidelineToolsExportTitle: 'Export & Integration',
  guidelineToolsExportCSV: 'CSV Export (Tables)',
  guidelineToolsExportCSVDesc:
    'Export Extracted Tables section for spreadsheet analysis or database documentation.',
  guidelineToolsExportMermaid: 'Mermaid Diagram',
  guidelineToolsExportMermaidDesc:
    'Copy full Mermaid diagram syntax to clipboard. Paste into Mermaid renderers, wikis, or documentation tools.',
  guidelineToolsExportCTESQL: 'CTE SQL Copy',
  guidelineToolsExportCTESQLDesc:
    'Copy individual CTE bodies for reuse in other queries or standalone CTE optimization.',

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

  // Complexity Scoring - Dashboard
  complexityDashboardTitle: 'Complexity Dashboard',
  complexityProgressBar: 'Progress',
  complexityKeywordsAndClauses: 'Keywords & Clauses',
  complexitySelectFields: 'SELECT Fields',
  complexityJoins: 'Joins',
  complexityCTEsAndSubqueries: 'CTEs & Subqueries',
  complexityLintingIssues: 'Linting Issues',

  // Complexity Scoring - Breakdown
  complexityBreakdownTitle: 'Detailed Complexity Score Breakdown',
  complexityBreakdownKeywordsAndClauses: 'Keywords & Clauses',
  complexityBreakdownSelectFields: 'SELECT Fields',
  complexityBreakdownJoins: 'Joins',
  complexityBreakdownCTEs: 'CTEs (WITH Clauses)',
  complexityBreakdownSubqueries: 'Nested Subqueries',
  complexityBreakdownWindowFunctions: 'Window Functions',
  complexityBreakdownNoKeywords: 'No keywords detected',
  complexityBreakdownFieldCount: 'Field Count',
  complexityBreakdownAverageComplexity: 'Average Complexity',
  complexityBreakdownMaxDepth: 'Max Depth',
  complexityBreakdownScoreInterpretation: 'Score Interpretation',
  complexityBreakdownSelectFieldsDesc:
    'Complex SELECT expressions (scalar subqueries, CASE statements, functions) add to the overall score.',
  complexityBreakdownJoinsDesc:
    'Multiple joins increase query complexity through Cartesian products, optimizer challenges, and potential lock contention.',
  complexityBreakdownCTEsDesc:
    'Each CTE (Common Table Expression) adds structuring overhead but improves readability and may help query optimization.',
  complexityBreakdownSubqueriesDesc:
    'Deep subquery nesting prevents index usage and forces sequential evaluation. Consider refactoring with JOINs or CTEs.',
  complexityBreakdownWindowFunctionsDesc:
    'Each window function clause triggers a separate sort/partition pass. Group functions with the same PARTITION BY/ORDER BY when possible.',
  complexityBreakdownJoinsCount: 'JOIN(s)',
  complexityBreakdownCTEsCount: 'CTE(s)',
  complexityBreakdownWindowFunctionsOverClause: 'OVER() Clause(s)',
  complexityBreakdownScoreExplanation:
    'Your query scores {score} out of {maxScore} possible points ({percentage}%). Higher scores indicate greater complexity and potential performance challenges.',
  complexityBreakdownNestedSubqueriesLabel: 'Nested Subquery(ies), Max Depth',
  sqlConstructDistribution: 'SQL Construct Distribution',

  // Complexity Scoring - Linting
  lintingAlertsTitle: 'SQL Anti-Patterns & Best Practice Violations',
  lintingNoIssues: 'No linting issues detected. Query follows best practices.',
  lintingSelectAll: 'SELECT_ALL',
  lintingSelectAllMessage: 'Anti-pattern detected: Avoid using `SELECT *` in large-scale systems.',
  lintingSelectAllSuggestion:
    'Please explicitly define your projection columns to reduce I/O and network overhead.',
  lintingDeepNesting: 'DEEP_NESTING',
  lintingDeepNestingMessage: 'Deep nesting detected. This may degrade query optimization.',
  lintingDeepNestingSuggestion: 'Consider refactoring using CTEs or breaking into smaller queries.',
  lintingCrossJoin: 'CROSS_JOIN',
  lintingCrossJoinMessage:
    'CROSS JOIN produces Cartesian product. This can exponentially increase row counts.',
  lintingCrossJoinSuggestion:
    'Verify this is intentional. Consider adding proper join conditions to replace with INNER JOIN.',
  lintingMissingWhere: 'MISSING_WHERE',
  lintingMissingWhereMessage:
    'Complex query without WHERE clause. May scan entire tables unnecessarily.',
  lintingMissingWhereSuggestion: 'Add filtering predicates to reduce the working set.',

  // Complexity Scoring - Guidelines
  guidelineSubtitle:
    'Understand how SQL Visualizer calculates query complexity and identifies performance risks.',
  guidelineHowScoringWorks: 'How Scoring Works',
  guidelineHowScoringWorksDetail:
    "Every SQL keyword, clause, window function, and SELECT field expression contributes to your query's cumulative complexity score. The system walks through the query structure, assigns weights based on architectural impact, and calculates a final score that maps to a complexity level: LOW, MEDIUM, HIGH, or SUPER HIGH.",
  guidelineLintingAndAntiPatterns: 'Linting & Anti-Patterns',
  guidelineLintingAndAntiPatternsDetail:
    'The linting engine scans for anti-patterns like SELECT *, deep nesting, CROSS JOINs, and missing WHERE clauses. Warnings alert you to potential performance risks that may not show up in the raw score alone.',
  guidelineComplexityWeightMatrix: 'Complexity Weight Matrix',
  guidelineComplexityWeightMatrixSubtitle:
    'Each keyword and structure contributes the following points to the total complexity score.',
  guidelineBaseClauses: 'Base Clauses',
  guidelineJoins: 'Joins (Dynamic Progression)',
  guidelineAggregationsAndSorting: 'Aggregations & Sorting',
  guidelineAdvancedStructures: 'Advanced Structures',
  guidelineWindowFunctions: 'Window Functions',
  guidelineSelectFieldComplexity: 'SELECT Field Complexity',
  guidelineComplexityLevelClassification: 'Complexity Level Classification',
  guidelineComplexityLevelLow: 'Score: 0 – 20 points',
  guidelineComplexityLevelLowDetail:
    'Simple queries with minimal joins, no complex expressions, and straightforward aggregations. Should perform well on standard indexing.',
  guidelineComplexityLevelMedium: 'Score: 21 – 50 points',
  guidelineComplexityLevelMediumDetail:
    'Moderate complexity with multiple joins, a few CTEs, or window functions. Consider reviewing join order and ensuring indexed columns are used in ON conditions.',
  guidelineComplexityLevelHigh: 'Score: 51 – 100 points',
  guidelineComplexityLevelHighDetail:
    'High complexity with many joins, CTEs, or nested subqueries. Recommended to break into smaller queries or use materialized CTEs to avoid full table scans.',
  guidelineComplexityLevelSuperHigh: 'Score: 101+ points',
  guidelineComplexityLevelSuperHighDetail:
    'Critical complexity. This query is at risk of causing full table scans, lock contention, and timeout errors in production. Strongly recommend query decomposition and comprehensive index review.',
  guidelineAntiPatternExamples: 'Anti-Pattern Examples',
  guidelineSelectAllAntiPattern: '🚫 SELECT * Anti-Pattern',
  guidelineSelectAllDetail:
    'Unbounded column selection forces the database to retrieve all columns, increasing I/O and network overhead.',
  guidelineExplicitProjection: '✅ Explicit Projection',
  guidelineExplicitProjectionDetail:
    'Always name the columns you need. This reduces I/O and makes query intent clear.',
  guidelineDeepNestingAntiPattern: '🚫 Deep Nesting',
  guidelineDeepNestingDetail:
    'Queries with 7+ levels of parentheses are hard to optimize and often indicate a need for refactoring.',
  guidelineUseCTEsInstead: '✅ Use CTEs Instead',
  guidelineUseCTEsDetail:
    'Common Table Expressions improve readability and often help the optimizer.',
  guidelineCrossJoinAntiPattern: '🚫 CROSS JOIN Risks',
  guidelineCrossJoinDetail:
    'Cartesian products multiply row counts exponentially. Always verify intent.',
  guidelineAddJoinConditions: '✅ Add Join Conditions',
  guidelineAddJoinConditionsDetail: 'Replace with proper INNER or LEFT JOIN.',

  // Complexity Scoring Evaluation Section
  guidelineComplexityEvaluationTitle: 'Complexity Scoring & Evaluation',
  guidelineComplexityEvaluationSubtitle:
    'Understand how SQL Visualizer scores query complexity and interprets results.',

  // Complexity Evaluation Steps
  guidelineComplexityEvalStep1Label: 'How Scoring Works',
  guidelineComplexityEvalStep1Desc:
    "Each SQL keyword, clause, window function, and SELECT field expression contributes to your query's cumulative complexity score. The system scans your query structure and assigns weights based on architectural impact.",

  guidelineComplexityEvalStep2Label: 'Weight Matrix',
  guidelineComplexityEvalStep2Desc:
    'Different SQL constructs carry different weights:\n\n• Base Clauses (FROM=1, WHERE=2, DISTINCT=3)\n• Joins (INNER=4, LEFT=5, FULL OUTER=10, CROSS=10)\n• Aggregations (GROUP BY=4, HAVING=4)\n• Window Functions (OVER=6, PARTITION BY=3)\n• Advanced (CTEs=8, Nested Subqueries=12)\n\nMore complex constructs contribute more points.',

  guidelineComplexityEvalStep3Label: 'Complexity Levels',
  guidelineComplexityEvalStep3Desc:
    'Scores map to complexity levels:\n\n• LOW (0-20): Simple queries, few joins, straightforward logic\n• MEDIUM (21-50): Multiple joins or CTEs, moderate complexity\n• HIGH (51-100): Many joins/subqueries, consider refactoring\n• SUPER HIGH (101+): Severe complexity risk, strong refactoring recommended',

  guidelineComplexityEvalStep4Label: 'Linting & Anti-Patterns',
  guidelineComplexityEvalStep4Desc:
    'Linting rules detect SQL anti-patterns that may not appear in raw scores:\n\n• SELECT * – unbounded column projection\n• Deep Nesting (7+ levels) – defeats query optimizer\n• CROSS JOIN – exponential row growth\n• Missing WHERE – unnecessary table scans\n\nThese warnings help you identify performance risks beyond the numeric score.',

  guidelineComplexityEvalStep5Label: 'Optimization Tips',
  guidelineComplexityEvalStep5Desc:
    'When your score is HIGH or SUPER HIGH:\n\n• Break into smaller queries or temp tables\n• Replace deep nesting with CTEs (Common Table Expressions)\n• Add explicit WHERE clauses to filter early\n• Verify JOIN conditions – avoid CROSS JOINs\n• Use window functions instead of subqueries where possible\n• Index columns used in JOIN conditions and WHERE clauses',

  // Complexity Evaluation Tips
  guidelineComplexityEvalTip1:
    "💡 Pro Tip: A SUPER HIGH score doesn't always mean your query is wrong – it means you should review it carefully and consider optimization strategies.",
  guidelineComplexityEvalTip2:
    '📊 Dashboard View: Check the "Complexity Breakdown" in the Metrics Dashboard to see which components contribute most to your score.',
  guidelineComplexityEvalTip3:
    '🔍 Iterative Refactoring: Rewrite and re-analyze your query to watch the score improve as you optimize.',

  // Score Weight Table
  scoreTableTitle: 'Complete Score Weight Matrix',
  scoreTableDescription: 'All SQL constructs and their assigned complexity weights.',
  scoreTableConstructColumn: 'SQL Construct',
  scoreTableWeightColumn: 'Weight (pts)',
  scoreTableCategoryBaseClauses: 'Base Clauses',
  scoreTableCategoryJoins: 'Join Types',
  scoreTableCategoryAggregations: 'Aggregations & Sorting',
  scoreTableCategoryAdvanced: 'Advanced Structures',
  scoreTableCategoryWindowFunctions: 'Window Functions',
  scoreTableCategorySelectFields: 'SELECT Field Types',

  // Base Clauses
  scoreTableFROM: 'FROM',
  scoreTableWHERE: 'WHERE',
  scoreTableDISTINCT: 'DISTINCT',

  // Joins
  scoreTableINNERJOIN: 'INNER JOIN',
  scoreTableLEFTJOIN: 'LEFT JOIN',
  scoreTableRIGHTJOIN: 'RIGHT JOIN',
  scoreTableFULLOUTERJOIN: 'FULL OUTER JOIN',
  scoreTableCROSSJOIN: 'CROSS JOIN',
  scoreTableNATURALJOIN: 'NATURAL JOIN',

  // Aggregations
  scoreTableGROUPBY: 'GROUP BY',
  scoreTableORDERBY: 'ORDER BY',
  scoreTableHAVING: 'HAVING',

  // Advanced Structures
  scoreTableWITH: 'WITH (CTE)',
  scoreTableNESTEDSUBQUERY: 'Nested Subquery (per level)',
  scoreTableUNION: 'UNION',
  scoreTableEXCEPT: 'EXCEPT',
  scoreTableINTERSECT: 'INTERSECT',

  // Window Functions
  scoreTableOVER: 'OVER clause',
  scoreTablePARTITIONBY: 'PARTITION BY',
  scoreTableROWNUMBER: 'ROW_NUMBER()',
  scoreTableRANK: 'RANK()',
  scoreTableDENSERANK: 'DENSE_RANK()',

  // SELECT Field Types
  scoreTableRawField: 'Raw Column (e.g., t.column)',
  scoreTableAliasField: 'Aliased Expression (e.g., AS alias)',
  scoreTableConditionalField: 'Conditional (e.g., CASE WHEN)',
  scoreTableSubqueryField: 'Scalar Subquery (e.g., (SELECT ...))',
  scoreTableAggregateField: 'Aggregate Function (e.g., SUM, COUNT)',
  scoreTableFunctionField: 'Scalar Function (e.g., UPPER, ROUND)',

  // Metrics Dashboard - Tables & Fields
  referencedTablesTitle: 'Referenced Tables',
  referencedTablesCount: 'tables',
  tableAlias: 'Alias',
  sourceTable: 'Source Table',
  noTablesDetected: 'No tables detected in this query',
  noFieldsDetected: 'No fields detected in this query',
  columnCount: 'cols',
  columnLabel: 'Columns',
  cteLabel: 'CTE',

  // Execution Cost Factors
  executionCostFactorJoinDepth: 'Join Depth',
  executionCostFactorSubqueryNesting: 'Subquery Nesting',
  executionCostFactorAnalyticFunctions: 'Analytic Functions',
  executionCostFactorDialectOverhead: 'Dialect Overhead',
  executionCostFactorStandardIndexing: 'Standard Indexing',
  executionCostNoteJoinDepth: 'join(s) detected',
  executionCostNoteSubqueryNesting: 'Max depth ~',
  executionCostNoteAnalyticFunctions: 'OVER() clause(s)',
  executionCostNoteDialectOverhead: 'optimizer assumed',
  executionCostNoteStandardIndexing: 'Assumes standard B-tree indexes on join keys',
  executionCostRecommendationLow:
    'Query appears lightweight. Standard indexing should handle this well.',
  executionCostRecommendationMedium:
    'Consider reviewing join order. Ensure indexed columns are used in ON conditions.',
  executionCostRecommendationHigh:
    'High complexity detected. Consider breaking into smaller queries or using materialized CTEs.',
  executionCostRecommendationSuperHigh:
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
