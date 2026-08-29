const en = {
  // App
  appName: 'SQL Visualizer',
  appTagline: 'SQL & Query Analyzer',

  // Nav
  navHome: 'Home',
  navQueryInput: 'Query Input',
  navSmartEditor: 'Smart SQL Editor',
  navGraphVisualizer: 'Graph Visualizer',
  navMetricsDashboard: 'Metrics Dashboard',
  navCTEAnalysis: 'CTE Analysis',
  navGuideline: 'Guideline',
  navSettings: 'Settings',

  // Query Input
  queryInputTitle: 'Query Input & Configuration',
  queryInputSubtitle: 'Paste SQL or import MyBatis XML to begin analysis',
  tabPasteSQL: 'Paste SQL Direct',
  tabMyBatisContent: 'Paste your XML content',
  tabImportMyBatis: 'Import MyBatis (XML) file',
  tabSmartEditor: 'Smart Editor',
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
  noParamsFound: 'No parameters found',
  noParamsToConfigure: 'No parameters to configure',
  conditionalLabel: 'conditional',
  parameterValuePrefix: 'value for',
  analyzeButton: 'Analyze Query',
  analyzing: 'Analyzing...',
  parsingSQL: 'Parsing SQL structure...',
  analysisCompleteMessage: 'Analysis complete — {tables} tables, {joins} joins detected',
  parseErrorMessage: 'Failed to parse query. Check SQL syntax.',
  dialectMismatchError:
    'Dialect mismatch: this query looks like {detected} syntax ({reason}), but {selected} is selected. Fix the dialect or the query before analyzing.',
  dialectReasonAstParse: 'syntax not valid for the selected dialect',
  clearButton: 'Clear',
  loadSample: 'Load Sample',
  resolvedPreviewTitle: 'Resolved SQL Preview',
  resolvedPreviewEmpty: 'Resolved SQL will appear here as you fill parameters',
  sqlEmpty: 'No SQL to analyze. Paste or import a query to begin.',
  charCount: 'characters',
  linesCount: 'lines',
  sqlResolved: 'Resolved SQL',
  sqlReview: 'Review SQL',
  sqlEditor: 'SQL Editor',

  // Tips
  tipCTE: 'Use WITH...AS for CTEs to get full CTE analysis',
  tipJoin: 'JOIN conditions with table.column = table.column are auto-detected',
  tipMyBatis: 'MyBatis #{param} and ${object.param} syntax both supported',
  tipDialect: 'Switch dialect to adjust complexity scoring',

  // Graph
  graphTitle: 'Relationship Graph',
  graphSubtitle: 'Interactive table relationship visualization',
  graphFilterLabel: 'Filter',
  graphFilterAll: 'All',
  graphFilterCte: "CTE's Relationship",
  graphFilterTable: "Table's Relationship",
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
  performanceMode: 'Performance',
  errors: 'errors',
  warnings: 'warnings',
  warning: 'warning',
  error: 'Error',

  // Smart Suggestions — titles
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
  suggExcessiveJoinsDetail:
    'Excessive joins in a single query significantly increases execution cost. Consider splitting into smaller queries or using intermediate CTEs to pre-aggregate data.',
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
  complexitySuperHigh: 'SUPER HIGH',
  noMetrics: 'No metrics available',
  noMetricsHint: 'Analyze a query to see metrics',
  metricsExportJson: 'Export Analysis JSON',
  metricsSubqueryCount: 'Subquery Count',
  metricsConditionCount: 'Condition Count',
  metricsOpsFunctions: 'Ops + Functions',
  metricsLinesOfSql: 'Lines of SQL',
  metricsFinalSelectFields: 'Final SELECT Fields',
  metricsSubtitleWindowClauses: 'OVER() clauses',
  metricsSubtitleAggregationClauses: 'Aggregation clauses',
  metricsSubtitleSortOperations: 'Sort operations',
  metricsSubtitleDeduplicationOps: 'Deduplication ops',
  metricsSubtitleNestingLevels: 'Nesting levels',
  metricsSubtitleNestedSelects: 'Nested SELECTs',
  metricsSubtitleJoinOperations: 'JOIN operations',
  metricsSubtitleConditionFormula: 'WHERE + HAVING + CASE WHEN',
  metricsSubtitleOpsFunctions: 'Math and SQL function calls',
  metricsSubtitleRawInputLines: 'Raw input lines',
  metricsSubtitleFinalOutputProjection: 'Final output projection',
  metricsJoinLogicComplexityTitle: 'JOIN Logic Complexity',
  metricsJoinComplexityLevel: 'Complexity Level',
  metricsSimpleOn: 'Simple ON',
  metricsSingleColumnMatches: 'Single-column matches',
  metricsMultiColumnOn: 'Multi-column ON',
  metricsAndOrJoinPredicates: 'AND/OR join predicates',
  metricsFunctionBasedOn: 'Function-based ON',
  metricsFunctionsInsideOn: 'Functions inside ON',
  metricsNonEquiOn: 'Non-equi ON',
  metricsNonEquiExamples: '>, <, LIKE, BETWEEN, IN',
  metricsFieldExtractionSummaryTitle: 'Field Extraction Summary',
  metricsFieldExpressionHeader: 'Expression',
  metricsFieldAliasHeader: 'Alias',
  metricsFieldTypeHeader: 'Type',
  metricsFieldShowing: 'Showing',
  metricsFieldOf: 'of',
  metricsTotalExtractedFields: 'Total extracted fields',
  fieldCategoryColumn: 'Column',
  fieldCategoryExpression: 'Expression',
  fieldCategoryAggregate: 'Aggregate',
  fieldCategoryWindow: 'Window',
  fieldCategorySubquery: 'Subquery',
  fieldCategoryConstant: 'Constant',
  fieldCategoryFunction: 'Function',
  fieldCategoryCalculated: 'Calculated',
  fieldCategoryStandard: 'Standard',
  metricsBarWindowFn: 'Window Fn',
  metricsBarSubqueryCnt: 'Subquery Cnt',
  metricsBarGroupBy: 'GROUP BY',
  metricsBarOrderBy: 'ORDER BY',
  metricsBarConditions: 'Conditions',
  metricsBarOpsFuncs: 'Ops+Funcs',
  metricsBarJoins: 'JOINs',
  metricsBarFinalSelect: 'Final Select',
  metricsFieldSearchPlaceholder: 'Search extracted fields (expression, alias, type)...',
  metricsFieldNoResults: 'No extracted fields match your search.',
  metricsDetailSnippetHeader: 'Snippet',
  metricsDetailClauseHeader: 'Clause',
  metricsDetailScopeHeader: 'Scope',
  metricsDetailSearchPlaceholder: 'Search snippet, clause, scope...',
  metricsDetailNoResults: 'No items match your search.',
  metricsDetailItemsLabel: 'items',
  metricsDetailCloseLabel: 'Close',
  metricsCardDetailsHint: 'View details',
  metricsCardOpenGraphHint: 'Open relationship graph',
  metricsCardFieldSummaryHint: 'Jump to field summary',
  metricsDetailOpsFooterNote: '+ {count} arithmetic operator(s) counted in the total but not itemized here.',
  metricsFieldPaginationPrev: 'Previous',
  metricsFieldPaginationNext: 'Next',
  metricsFieldPaginationPage: 'Page',
  noDataDash: '-',
  impactLow: 'Low Impact',
  impactMedium: 'Medium Impact',
  impactHigh: 'High Impact',
  recommendation: 'Recommendation',
  factorsBreakdown: 'Complexity Factors Breakdown',
  complexityFactorsTotalScore: 'Total Score',
  complexityFactorsMaximumScore: 'Maximum Score',
  complexityFactorsPercentageOfMaximum: 'Percentage of Maximum',
  complexityFactorsKeywordScoring: 'Keyword Scoring',
  complexityFactorsSelectFields: 'SELECT Fields',
  complexityFactorsCount: 'Count',
  complexityFactorsAverage: 'Average',
  complexityFactorsScore: 'Score',
  complexityFactorsLintingIssues: 'Linting Issues',
  complexityFactorsNoLintingIssues: 'No linting issues detected',
  complexityFactorsSuggestion: 'Suggestion',
  complexityFactorsLocation: 'Location',
  complexityFactorsFormula: 'Factor Formula',
  complexityFactorsValue: 'Value',
  complexityFactorsWeight: 'Weight',
  complexityFactorsContribution: 'Contribution',
  complexityFactorsNoDetails: 'Detailed scoring is unavailable for this query.',
  complexityFactorsFieldTypeRaw: 'raw',
  complexityFactorsFieldTypeAlias: 'aliased',
  complexityFactorsFieldTypeConditional: 'conditional',
  complexityFactorsFieldTypeSubquery: 'subquery',
  complexityFactorsFieldTypeAggregate: 'aggregate',
  complexityFactorsFieldTypeFunction: 'function',
  metricsHighComplexityWarning: 'High complexity detected — review query structure',
  metricsHighComplexityDescription:
    'This query has a high complexity score. Consider refactoring to reduce joins, subquery depth, and function usage.',

  // Nested Subquery Analysis
  metricsNestedSubqueryAnalysisTitle: 'Nested Subquery Analysis',
  metricsNestingDepthAnalysis: 'Nesting Depth Analysis',
  metricsLevelDistribution: 'Level Distribution',
  metricsLevelLabel: 'Level',
  metricsMaxStatus: 'Max',
  metricsActiveStatus: 'Active',
  metricsOptimizationRecommended: 'Optimization Recommended',
  metricsDeepNestingMessage: `Deep nesting (Level {{level}}) detected. Consider using CTEs, joins, or window functions to flatten the query structure.`,
  metricsMultipleSubqueriesMessage:
    'Multiple subqueries detected. Consolidate related subqueries and consider using temporary tables or materialized views.',
  metricsDetectedSubqueries: 'Detected Subqueries',
  metricsSubqueryPrefix: 'Subquery',
  metricsSubqueryType: 'Type',
  metricsCopyButton: 'Copy',
  metricsAnalysisLabel: 'Analysis',
  metricsComplexityRisk: 'Complexity Risk',
  metricsBased: 'Based on depth & count',
  metricsSubqueryRiskLimits: 'Risk Thresholds',
  metricsSubqueryRiskLowLimit: 'Depth 0-1; count 0-2',
  metricsSubqueryRiskMediumLimit: 'Depth up to 2; count up to 4',
  metricsSubqueryRiskHighLimit: 'Depth up to 3; count up to 6',
  metricsSubqueryRiskSuperHighLimit: 'Depth 4+ or count 7+',
  metricsMaximumNestingLevel: 'Maximum nesting level',
  metricsTotalSubqueriesFound: 'Total subqueries found',

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
  resetSettingsSuccess: 'Settings reset to defaults',
  languageEnglish: 'English',
  languageVietnamese: 'Tiếng Việt',
  spacingCompact: 'Compact',
  spacingNormal: 'Normal',
  spacingSpacious: 'Spacious',

  // Settings - AI Model Configuration
  settingsAI: 'AI Model Configuration',
  aiConfigSubtitle: 'Configure the AI provider used for SQL-to-natural-language explanations',
  aiProvider: 'AI Provider',
  aiProviderHint: 'Choose between a local Ollama model or a cloud AI provider',
  aiProviderOllama: 'Ollama (Local LLM)',
  aiProviderOpenAI: 'OpenAI',
  aiProviderAnthropic: 'Anthropic (Claude)',
  aiProviderGemini: 'Google Gemini',
  aiBaseUrl: 'Base URL',
  aiBaseUrlHint: 'Address of your local Ollama server, e.g. http://localhost:11434',
  aiBaseUrlCloudHint:
    'API root for this provider. Override it to use an OpenAI-compatible gateway — the host must also be listed in AI_ALLOWED_BASE_URLS on the server before a key is sent to it.',
  aiBaseUrlReset: 'Restore default',
  aiLocalModel: 'Local Model Name',
  aiLocalModelHint: 'Model tag pulled in Ollama, e.g. qwen2.5-coder:7b or llama3',
  aiServerKeyTitle: 'API key is managed on the server',
  aiServerKeyHint:
    'The browser never receives a provider credential. Set the key in the .env file at the project root and restart the dev server — this is the variable the server reads for the selected provider:',
  aiConfigSave: 'Save changes',
  aiConfigDiscard: 'Discard',
  aiLocalModelRequired: 'Ollama local model name is required.',
  aiModelIdRequired: 'Model ID is required for cloud providers.',
  aiConfigSaved: 'AI configuration saved',
  aiConfigDiscarded: 'Changes discarded',
  aiConfigUnsaved: 'You have unsaved changes',
  aiConfigUpToDate: 'All changes saved',
  aiModelId: 'Model ID',
  aiModelIdHint: 'Identifier of the model to use, e.g. gpt-4o or claude-3-5-sonnet',
  aiTemperature: 'Temperature',
  aiTemperatureHint: 'Controls randomness — lower values are more deterministic',
  aiSystemPrompt: 'System Prompt Instructions for AI',
  aiSystemPromptHint: 'Default instructions guiding how the AI explains SQL queries',
  aiSystemPromptPlaceholder: 'e.g. Explain SQL queries clearly and concisely for a junior developer...',

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
  guidelineMetricsStep4Label: 'Field Extraction Table (Search + Pagination)',
  guidelineMetricsStep4Desc:
    'Review extracted fields with real-time search and pagination. The table supports expression/alias/type filtering and shows 20 items per page for faster navigation in large result sets.',
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
  guidelineSettingsStep5Label: 'AI Model Configuration',
  guidelineSettingsStep5Desc:
    'Configure the AI provider used for SQL-to-natural-language explanations. Choose Ollama for a local LLM, or a cloud provider (OpenAI, Anthropic, Gemini) with your own API key, Model ID, temperature, and system prompt.',
  guidelineSettingsTip1:
    'Settings are persisted in your browser — your preferences survive page refreshes.',
  guidelineSettingsTip2:
    'API keys are stored locally in your browser and are sent only directly to the provider you selected.',

  // Guideline - AI SQL Explainer Section
  guidelineAiExplainerTitle: 'AI SQL Explainer',
  guidelineAiExplainerSubtitle: 'Turn SQL into a structured, natural-language explanation',
  guidelineAiExplainerStep1Label: 'Open the Smart SQL Editor',
  guidelineAiExplainerStep1Desc:
    'Open Smart SQL Editor from the sidebar or switch to the Smart Editor tab on the Query Input page.',
  guidelineAiExplainerStep2Label: 'Enter or load a query',
  guidelineAiExplainerStep2Desc:
    'Type SQL directly, select a sample query, or paste a query you want to understand.',
  guidelineAiExplainerStep3Label: 'Generate an explanation',
  guidelineAiExplainerStep3Desc:
    'Select Explain SQL to receive a structured summary of the query objective, output, filters, and referenced tables. The app includes parsed query context to improve the explanation.',
  guidelineAiExplainerStep4Label: 'Configure the AI provider',
  guidelineAiExplainerStep4Desc:
    'Choose a local Ollama model or a cloud provider in Settings. You can set the model, temperature, and system prompt for your team.',
  guidelineAiExplainerTip1:
    'Use follow-up questions to investigate parts of the explanation, and copy the result when you need to share it.',
  guidelineAiExplainerTip2:
    'Review AI output alongside the metrics and relationship graph; it is an aid for understanding SQL, not an execution plan.',

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
    'Complexity gauge (0-100) • Breakdown by factors (JOINs, subqueries, functions) • Estimated execution cost • Per-factor recommendations • Field extraction search + 20-row pagination • Interactive tooltips',
  guidelineToolsCTEName: 'CTE Analysis',
  guidelineToolsCTEDesc:
    'Deep-dive into Common Table Expressions. See CTE structure, dependencies, field origins, and identify unused or problematic CTEs.',
  guidelineToolsCTEFeatures:
    'CTE detection & listing • Recursive/unused CTE flags • Field origin mapping • Nested subquery analysis • Copy CTE SQL • Bulk expand/collapse',
  guidelineToolsSettingsName: 'Settings & Preferences',
  guidelineToolsSettingsDesc:
    'Customize the application to your preferences. Control appearance, language, graph visualization style, and analysis behavior.',
  guidelineToolsSettingsFeatures:
    'Dark/light theme • EN/VI language switching • Graph layout options (Dagre/Force/Grid) • Edge style selection • Auto-analyze toggle • AI Model Configuration (Ollama/OpenAI/Anthropic/Gemini)',
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
  guidelineToolsExportAnalysisJson: 'Analysis JSON Export',
  guidelineToolsExportAnalysisJsonDesc:
    'Export the full SQL analysis payload (metrics, graph, CTE, and structural report) as a JSON file for sharing or archival.',

  // Guideline - Quick Reference
  guidelineQuickRefQueryInput: 'Query Input',
  guidelineQuickRefGraph: 'Graph Visualizer',
  guidelineQuickRefMetrics: 'Metrics Dashboard',
  guidelineQuickRefCTE: 'CTE Analysis',
  guidelineQuickRefSettings: 'Settings',
  guidelineQuickRefAiExplainer: 'AI SQL Explainer',

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
  highComplexityDetected: 'High complexity detected — consider optimization',
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
  lintingDistinct: 'DISTINCT_OPERATIONS',
  lintingDistinctMessage:
    'Using DISTINCT or COUNT(DISTINCT) often forces expensive sort/hash operations.',
  lintingDistinctSuggestion:
    'Consider pre-aggregating, grouping earlier, or removing duplicates at a more selective stage.',
  lintingOrPredicate: 'OR_PREDICATE',
  lintingOrPredicateMessage:
    'OR predicates can prevent efficient index usage and widen the scan set.',
  lintingOrPredicateSuggestion:
    'Split the predicate into separate branches or rewrite it with UNION ALL / JOIN when appropriate.',
  lintingInSubquery: 'IN_SUBQUERY',
  lintingInSubqueryMessage:
    'IN (subquery) or NOT IN clauses can be less efficient than EXISTS or JOIN.',
  lintingInSubquerySuggestion:
    'Prefer EXISTS or JOIN for correlated filtering when the subquery returns a set of keys.',
  lintingFunctionOnColumn: 'FUNCTION_ON_COLUMN',
  lintingFunctionOnColumnMessage:
    'Applying functions to columns in predicates can block index usage and increase CPU cost.',
  lintingFunctionOnColumnSuggestion:
    'Move the expression to the other side of the comparison or use a normalized/precomputed column.',
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
  lintingLocationLabel: 'Location',
  lintingLineLabel: 'line',
  lintingUnionDedup: 'UNION_DEDUPLICATION',
  lintingUnionDedupMessage: 'UNION removes duplicates with an additional sort or hash operation.',
  lintingUnionDedupSuggestion: 'Use UNION ALL when duplicate removal is not required by the business logic.',
  lintingNullComparison: 'INVALID_NULL_COMPARISON',
  lintingNullComparisonMessage: 'Comparing NULL with =, !=, or <> is invalid and never evaluates to true.',
  lintingNullComparisonSuggestion: 'Use IS NULL or IS NOT NULL.',
  lintingLeadingWildcard: 'LEADING_WILDCARD_LIKE',
  lintingLeadingWildcardMessage: 'A leading wildcard in LIKE commonly prevents an index range scan.',
  lintingLeadingWildcardSuggestion: 'Use a prefix search or a dedicated full-text search when business requirements allow it.',
  lintingNonAggregateHaving: 'NON_AGGREGATE_HAVING',
  lintingNonAggregateHavingMessage: 'HAVING appears to filter non-aggregated values after grouping has completed.',
  lintingNonAggregateHavingSuggestion: 'Move non-aggregate filters to WHERE so fewer rows enter the grouping stage.',
  lintingScalarSubquery: 'SCALAR_SUBQUERY_IN_SELECT',
  lintingScalarSubqueryMessage: 'A subquery in the SELECT list may be evaluated repeatedly for result rows.',
  lintingScalarSubquerySuggestion: 'Consider a pre-aggregated LEFT JOIN while preserving the original cardinality and calculations.',
  lintingSubqueryOrderBy: 'SUBQUERY_ORDER_BY',
  lintingSubqueryOrderByMessage: 'ORDER BY inside a subquery can cause an unnecessary sort when row order is not consumed there.',
  lintingSubqueryOrderBySuggestion: 'Remove it unless it is required by LIMIT, OFFSET, a window function, or business logic.',

  // Complexity Scoring - Select Field Reasons
  complexityFieldReasonUnboundedSelection: 'Unbounded column selection',
  complexityFieldReasonScalarSubquery: 'Scalar subquery in SELECT',
  complexityFieldReasonCaseWhen: 'CASE WHEN conditional expression',
  complexityFieldReasonAggregate: 'Aggregate function',
  complexityFieldReasonScalarFunction: 'Scalar function',
  complexityFieldReasonAliasedExpression: 'Aliased expression',
  complexityFieldReasonComplexExpression: 'Complex expression',
  complexityFieldReasonDirectColumn: 'Direct column reference',

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

  guidelineComplexityEvalStep3Label: 'Dynamic Level Classification (Using Median)',
  guidelineComplexityEvalStep3Desc:
    'Instead of static thresholds, complexity levels are dynamically adapted based on your own workload\'s median score (MEDIAN):\n\n• LOW: Score ≤ 50% of MEDIAN\n• MEDIUM: 50% < Score ≤ 100% of MEDIAN\n• HIGH: 100% < Score ≤ 200% of MEDIAN\n• SUPER HIGH: Score > 200% of MEDIAN\n\nThis relative classification ensures levels remain meaningful as your project evolves.',

  guidelineComplexityEvalStep4Label: 'Linting & Anti-Patterns',
  guidelineComplexityEvalStep4Desc:
    'Linting rules detect SQL anti-patterns that may not appear in raw scores:\n\n• SELECT * – unbounded column projection\n• Deep Nesting (7+ levels) – defeats query optimizer\n• CROSS JOIN – exponential row growth\n• Missing WHERE – unnecessary table scans\n\nThese warnings help you identify performance risks beyond the numeric score.',

  guidelineComplexityEvalStep5Label: 'Optimization Tips',
  guidelineComplexityEvalStep5Desc:
    'When your score is HIGH or SUPER HIGH:\n\n• Break into smaller queries or temp tables\n• Replace deep nesting with CTEs (Common Table Expressions)\n• Add explicit WHERE clauses to filter early\n• Verify JOIN conditions – avoid CROSS JOINs\n• Use window functions instead of subqueries where possible\n• Index columns used in JOIN conditions and WHERE clauses',

  guidelineComplexityEvalStep6Label: 'Median Numeric Evaluation',
  guidelineComplexityEvalStep6Desc:
    'Complexity levels are dynamically evaluated from your recent score history using the median value. The system computes Median, then builds adaptive ranges:\n\n• LOW: 0 to 50% of Median\n• MEDIUM: 50% to 100% of Median\n• HIGH: 100% to 200% of Median\n• SUPER HIGH: above 200% of Median\n\nThis makes level interpretation relative to your real workload instead of fixed static bands.',

  // Complexity Evaluation Tips
  guidelineComplexityEvalTip1:
    "💡 Pro Tip: A SUPER HIGH score doesn't always mean your query is wrong – it means you should review it carefully and consider optimization strategies.",
  guidelineComplexityEvalTip2:
    '📊 Dashboard View: Check the "Complexity Breakdown" in the Metrics Dashboard to see which components contribute most to your score.',
  guidelineComplexityEvalTip3:
    '🔍 Iterative Refactoring: Rewrite and re-analyze your query to watch the score improve as you optimize.',
  guidelineComplexityEvalTip4:
    '📌 Median Mode: Query levels may shift over time as more scores are stored, so compare both raw score and current median-based level.',

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
  scoreTableFooterNoteLabel: 'Note:',
  scoreTableFooterNoteBody:
    'Weights are cumulative. A query with 2 JOINs adds 8-10 points (4-5 per JOIN). Window Functions can stack - each OVER clause is 6 points plus 3 for PARTITION BY.',

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
  navigatingToPage: 'Navigating to page...',
  success: 'Success',
  cancel: 'Cancel',
  confirm: 'Confirm',
  reset: 'Reset',
  save: 'Save',

  // Smart SQL Editor - page
  editorPageTitle: '🚀 Smart SQL Editor',
  editorPageSubtitle:
    'Powerful SQL editing with real-time validation, formatting, and AI-powered optimization',
  editorPageLoadSampleQueryLabel: '📋 Load Sample Query:',
  editorPageQuerySimple: '✨ Simple',
  editorPageQueryWithJoin: '🔗 With JOIN',
  editorPageQueryWithCTE: '📦 With CTE',
  editorPageQueryComplex: '🎯 Complex',
  editorPageProTipsTitle: '💡 Pro Tips:',
  editorPageProTip1: 'Type or paste SQL and watch real-time validation (500ms debounce)',
  editorPageProTip2: 'Click "Format SQL" to beautify with uppercase keywords',
  editorPageProTip3: 'Click "Analyze & Optimize" to get AI suggestions (requires local Ollama running)',
  editorPageProTip4: 'Click "Compare" to see side-by-side diff of original vs optimized',
  editorPageProTip5: 'Open DevTools (F12) Console to see detailed debug logs',
  editorPageProTip6: 'Click "Explain this query" to translate the SQL into plain natural language',
  editorPageSetupTitle: '🛠️ Setup Instructions',
  editorPageInstallDepsLabel: 'Install dependencies:',
  editorPageInstallDepsCmd: 'npm install monaco-editor sql-formatter',
  editorPageStartOllamaLabel: 'Start Ollama (for AI optimization):',
  editorPageStartOllamaCmd: 'ollama run mistral',
  editorPageTestLabel: 'Test it right here or integrate it into your dashboard',
  editorPageFeaturesTitle: '✨ Key Features',
  editorPageFeature1: 'Real-time syntax validation (dt-sql-parser)',
  editorPageFeature2: 'SQL formatting (sql-formatter with MySQL options)',
  editorPageFeature3: 'Diff view for before/after comparison',
  editorPageFeature4: 'AI optimization with local Ollama LLM',
  editorPageFeature5: 'Performance insights and recommendations',
  editorPageFeature6: 'Comprehensive error handling and logging',
  editorPageMoreInfoLabel: '📚 For detailed setup and API documentation, see',
  editorPageMoreInfoFile: 'SMART_SQL_EDITOR_SETUP.md',

  // Smart SQL Editor
  smartEditorTitle: 'Smart SQL Editor',
  formatSqlButton: '📝 Format SQL',
  formatSqlTitle: 'Format SQL with uppercase keywords',
  compareButton: '🔀 Compare',
  backToEditorButton: '🔀 Back to Editor',
  toggleDiffTitle: 'Toggle between single and diff view',
  analyzeOptimizeButton: '🤖 Analyze & Optimize',
  analyzeOptimizeTitle: 'Analyze and optimize SQL with AI',
  smartEditorOptimizing: 'Optimizing…',
  smartEditorOptimizationSuccess: 'SQL optimization complete',
  smartEditorOptimizationError: 'SQL optimization failed',
  smartEditorLintBriefHeader: 'Linting alerts detected in this query — address these during optimization:',
  smartEditorLintFixLabel: 'Fix:',
  smartEditorOptimizeProgressTitle: 'AI is optimizing your query…',
  smartEditorOptimizeWaitingLabel: 'Waiting for the model to respond…',
  smartEditorSpeechPlay: 'Read optimization aloud',
  smartEditorSpeechStop: 'Stop speech',
  smartEditorSpeechError: 'Text to speech is not available in this browser',

  // Query History (semantic search over saved queries)
  queryHistoryTitle: 'Query History',
  queryHistorySubtitle: 'Every analyzed query is saved on this device. Search by meaning to find one again.',
  queryHistoryOpenPanel: 'Open query history',
  queryHistoryClosePanel: 'Close query history',
  queryHistorySearchPlaceholder: 'Search by meaning, e.g. "monthly revenue by region"',
  queryHistorySearchButton: 'Search',
  queryHistorySearching: 'Searching…',
  queryHistoryClearSearch: 'Clear search',
  queryHistorySemanticUnavailable:
    'Semantic search is unavailable right now (check the AI provider in Settings). Showing plain text matches instead.',
  queryHistoryEmptyTitle: 'No saved queries yet',
  queryHistoryEmptyHint: 'Run "Analyze" on a query and it will appear here.',
  queryHistoryNoResults: 'No queries match that search.',
  queryHistoryLoadButton: 'Load',
  queryHistoryDeleteButton: 'Delete',
  queryHistoryClearAllButton: 'Clear all',
  queryHistoryConfirmClearAll: 'Remove all saved queries?',
  queryHistoryConfirmYes: 'Yes, clear all',
  queryHistoryConfirmCancel: 'Cancel',
  queryHistoryMatchLabel: 'match',
  queryHistoryEmbeddingPending: 'Not indexed for semantic search yet',
  queryHistoryTablesCount: '{n} tables',
  queryHistoryJoinsCount: '{n} joins',
  queryHistorySavedToast: 'Query saved to history',
  demoTitle: 'Smart SQL Demo',
  demoSubtitle: 'Try sample SQL queries and AI-powered optimization in a sandboxed editor',
  demoLoadSampleQueryLabel: '📋 Load Sample Query:',
  demoQuerySimple: '✨ Simple',
  demoQueryWithJoin: '🔗 With JOIN',
  demoQueryWithCTE: '📦 With CTE',
  demoQueryComplex: '🎯 Complex',
  demoProTipsTitle: '💡 Demo Pro Tips:',
  demoProTip1: 'Switch samples to see optimization examples quickly',
  demoProTip2: 'Use the toolbar buttons to format and compare changes',
  demoProTip3: 'AI optimization uses the configured model in Settings',
  demoProTip4: 'Optimized SQL is placed back into the editor automatically',
  demoProTip5: 'Use the diff view to inspect the exact code changes',
  demoSetupTitle: '🛠️ Demo Setup Instructions',
  demoInstallDepsLabel: 'Install dependencies for local development:',
  demoInstallDepsCmd: 'npm install',
  demoStartOllamaLabel: 'Start Ollama if using local model optimization:',
  demoStartOllamaCmd: 'ollama serve',
  demoTestInDemoLabel: 'Then run this demo and click Analyze & Optimize.',
  demoFeaturesTitle: '✨ Demo Features',
  demoFeature1: 'Interactive SQL editor with formatting',
  demoFeature2: 'AI optimization and performance guidance',
  demoFeature3: 'Side-by-side diff review mode',
  demoFeature4: 'Sample queries for different SQL patterns',
  demoFeature5: 'Natural-language query explanation panel',
  demoFeature6: 'Live dialect-aware analytics',
  demoMoreInfoLabel: 'More information and source code in',
  demoMoreInfoFile: 'src/app/smart-sql-editor-demo/page.tsx',
  analyzingLabel: 'Analyzing...',
  syntaxErrorsTitle: '❌ Syntax Errors:',
  optimizationResultsTitle: '✅ Optimization Results',
  estimatedRowsLabel: '📊 Estimated Rows:',
  performanceNotesLabel: '⚡ Performance Notes:',
  businessChangesLabel: '🔄 Business Changes:',
  diffViewStatus: '🔀 Diff View',
  singleEditorStatus: '✏️ Single Editor',
  syntaxErrorsStatus: 'Syntax Errors:',
  processingStatus: '⏳ Processing...',
  formattingError: 'SQL formatting error. Please check your query syntax.',
  formattingSuccess: 'SQL formatted successfully',
  diffViewErrorTitle: 'Diff view error:',
  ollamaConnectionError:
    'Failed to connect to Ollama API. Make sure it is running on http://localhost:11434',
  emptyQueryError: 'Query is empty. Please enter a valid SQL query to analyze.',
  smartEditorFormatting: 'Formatting...',
  smartEditorFormat: 'Format',
  smartEditorNoChangesToCompare: 'No changes to compare',
  smartEditorCompare: 'Compare',
  smartEditorEditorView: 'Editor View',
  smartEditorCopy: 'Copy',
  smartEditorCopied: 'Copied!',
  smartEditorReset: 'Reset',
  smartEditorResetTitle: 'Reset to original SQL',
  smartEditorLines: 'lines',
  smartEditorChars: 'chars',
  smartEditorWords: 'words',
  smartEditorDialect: 'Dialect:',
  smartEditorModified: 'Modified',
  smartEditorOriginal: 'Original',
  smartEditorComparingMode: 'Comparing original vs. current',
  smartEditorSingleMode: 'Single editor mode',
  smartEditorChangesDetected: '● Changes detected',
  smartEditorSyncedWithOriginal: '✓ Synced with original',
  smartEditorCopiedToClipboard: 'Copied to clipboard',
  smartEditorFailedToCopy: 'Failed to copy to clipboard',
  smartEditorModifiedSummary: 'Modified from original',
  smartEditorNoChangesSummary: 'No changes from original',
  copiedToClipboard: 'Copied to clipboard',

  // Guideline - AI Speech Section
  guidelineAiSpeechTitle: 'AI Text-to-Speech',
  guidelineAiSpeechSubtitle: 'Read optimization insights and query explanations aloud',
  guidelineAiSpeechStep1Label: 'Locate the audio controls',
  guidelineAiSpeechStep1Desc:
    'Look for the audio icon or "Read aloud" buttons in the Smart SQL Editor optimization results or AI Explainer panel.',
  guidelineAiSpeechStep2Label: 'Play the audio',
  guidelineAiSpeechStep2Desc:
    'Click "Read optimization aloud" or the sound icon to hear the AI-generated insights converted into spoken language.',
  guidelineAiSpeechStep3Label: 'Stop the audio',
  guidelineAiSpeechStep3Desc:
    'You can stop the audio playback at any time by clicking "Stop speech" or the stop button.',
  guidelineAiSpeechTip1:
    'This feature uses browser-based text-to-speech for local explanations, ensuring your data stays private.',
  guidelineAiSpeechTip2:
    'For cloud-based explanations, read-aloud functionality might use external APIs to generate high-quality audio.',
  guidelineAdvancedFeaturesTitle: 'Advanced Features & UI Enhancements',
  guidelineAdvancedFeaturesSubtitle: 'New pagination, search, and customization capabilities',
  guidelineAdvancedFeaturesStep1Label: 'Main Query Fields Table with Pagination',
  guidelineAdvancedFeaturesStep1Desc:
    'View extracted fields in a paginated, searchable table format. Displays 20 fields per page with real-time search filtering across expressions, aliases, and field types. Perfect for analyzing large queries with many selected fields.',
  guidelineAdvancedFeaturesStep2Label: 'Referenced Tables with Advanced Filtering',
  guidelineAdvancedFeaturesStep2Desc:
    'Browse referenced tables (CTEs and base tables) in a dedicated panel with pagination and search. Shows table type badges (CTE/TABLE), column counts, and inline column lists. Search results update instantly as you type.',
  guidelineAdvancedFeaturesStep3Label: 'Nested Subquery Section',
  guidelineAdvancedFeaturesStep3Desc:
    'Explore nested subqueries within CTEs with expandable detail cards. Features depth indicators (L1-L5 color-coded), join and aggregation badges, and inline SQL viewing. Shows table references and field counts for each nesting level.',
  guidelineAdvancedFeaturesStep4Label: 'CTE Card with Full Metadata',
  guidelineAdvancedFeaturesStep4Desc:
    'View comprehensive CTE information including usage count, complexity level, recursive status, and dependencies. Displays referenced tables, CTE dependencies, and column references in organized panels. Includes issues banner for warnings and notes.',
  guidelineAdvancedFeaturesStep5Label: 'Dynamic Accent Color Customization',
  guidelineAdvancedFeaturesStep5Desc:
    'Personalize the app appearance in Settings → Appearance. Select from 5 color presets: Cyan, Purple, Emerald, Orange, or Pink. Colors automatically adapt to dark/light theme and apply system-wide to all primary-colored UI elements instantly.',
  guidelineAdvancedFeaturesTip1:
    'Search is real-time and case-insensitive, filtering across all relevant fields simultaneously',
  guidelineAdvancedFeaturesTip2:
    'Pagination automatically resets to page 1 when you perform a new search for better UX',
  guidelineAdvancedFeaturesTip3:
    'Color selections are persisted to localStorage and restored on your next visit',
  guidelineAdvancedFeaturesTip4:
    'All components use CSS containment for optimal performance and faster rendering',

  // Home Page
  homeWelcomeTitle: 'Welcome to SQL Visualizer',
  homeMainHeading: 'Analyze SQL Queries',
  homeMainHeadingGradient: 'Like Never Before',
  homeDescription:
    'Visualize query complexity, understand relationships, and optimize your SQL with advanced analytics and interactive visualizations.',
  homeGetStartedButton: 'Start Analyzing',
  homeGuidelinesButton: 'View Guidelines',
  homeAccuracyLabel: '100%',
  homeAccuracyValue: 'Analysis Accuracy',
  homeRealtimeLabel: 'Real-time',
  homeRealtimeValue: 'Query Processing',
  homeDialectLabel: '4+ SQL',
  homeDialectValue: 'Dialect Support',
  homePowerfulFeaturesTitle: 'Powerful Features',
  homeFeaturesDescription: 'Everything you need to understand and optimize your SQL queries',
  homeQueryAnalysisTitle: 'Query Analysis',
  homeQueryAnalysisDesc:
    'Deep analysis of SQL structure, complexity scoring, and performance metrics',
  homeRelationshipMappingTitle: 'Relationship Mapping',
  homeRelationshipMappingDesc:
    'Interactive visualization of table relationships, joins, and data flow',
  homeMetricsDashboardTitle: 'Metrics Dashboard',
  homeMetricsDashboardDesc:
    'Comprehensive metrics on query complexity, execution cost, and optimization',
  homeSmartRecommendationsTitle: 'Smart Recommendations',
  homeSmartRecommendationsDesc:
    'AI-powered suggestions to optimize your queries and improve performance',
  homeAiExplainerTitle: 'AI SQL Explainer',
  homeAiExplainerDesc:
    'Turn SQL into a structured natural-language explanation of its objective, filters, output, and referenced tables.',
  homeReadyToAnalyzeTitle: 'Ready to analyze?',
  homeReadyToAnalyzeDesc:
    'Upload your SQL queries and get instant insights into complexity, performance, and optimization opportunities.',
  homeGetStartedNowButton: 'Get Started Now',
  homeCopyrightText: '©Copy Right - SQL Visualizer. Designed with',
  homeForDevelopers: 'for developers.',
  homeDocsLink: 'Docs',
  homeGitHubLink: 'GitHub',
  homeContactLink: 'Contact',
  homePreviewQueryTitle: 'Query workspace',
  homePreviewAnalyzed: 'ANALYZED',
  homePreviewInsightTitle: 'Analysis snapshot',
  homePreviewComplexity: 'Complexity score',
  homePreviewRelationships: 'Detected relationships',
  homePreviewTables: 'tables mapped',
  homePreviewRecommendation: 'Recommendation',
  homePreviewRecommendationText: 'Review the final sort operation and confirm supporting indexes.',
  homeWorkflowEyebrow: 'Workflow',
  homeWorkflowTitle: 'From SQL text to a clear next step',
  homeWorkflowDescription: 'Inspect query structure, identify cost drivers, and improve the final statement with evidence.',
  homeWorkflowInputTitle: 'Bring your query',
  homeWorkflowInputDescription: 'Paste SQL directly or resolve MyBatis XML parameters before analysis.',
  homeWorkflowInspectTitle: 'Inspect the structure',
  homeWorkflowInspectDescription: 'Trace CTEs, field origins, joins, nested queries, and table relationships.',
  homeWorkflowImproveTitle: 'Improve with evidence',
  homeWorkflowImproveDescription: 'Use exact scoring factors and linting findings to focus your next change.',
  homeDialectsLabel: 'SQL dialects',
  homeDialectsTitle: 'Analyze the syntax your team already writes',

  // JOIN Analysis - Deep Analysis
  joinAnalysisTitle: 'JOIN Analysis',
  joinAnalysisSubtitle: 'Detailed JOIN condition analysis and complexity breakdown',
  joinSourceTable: 'Source Table',
  joinTargetTable: 'Target Table',
  joinDetailColumns: 'Columns Involved',
  joinDetailOperators: 'Operators Used',
  joinDetailComplexity: 'Complexity',
  joinDetailIsEquiJoin: 'Equi-Join',
  joinDetailComplexityScore: 'Complexity Score',
  joinDetailSearchPlaceholder: 'Search tables, columns, operators...',
  joinDetailNoResults: 'No joins match your search',
  joinDetailClearSearch: 'Clear search',
  joinAnalysisEmpty: 'No JOIN conditions to analyze',
  joinAnalysisEmptyHint: 'This query does not contain any JOIN clauses',
  joinConditionOn: 'ON Condition',
  joinConditionSimple: 'Simple',
  joinConditionComplex: 'Complex',
  joinDialectSupport: 'Supported across all dialects (MySQL, PostgreSQL, SQL Server, Oracle)',
  joinYes: 'Yes',
  joinNo: 'No',
  joinExpandDetails: 'Expand Details',
  joinCollapseDetails: 'Collapse Details',

  // AI SQL Explainer - release announcement
  aiAnnounceBadge: 'Feature release',
  aiAnnounceHeading: '🎉 New: Understand SQL queries in seconds with AI!',
  aiAnnounceBody:
    'No more wasting time deciphering hundreds of lines of complex code. The new AI SQL Explainer automatically helps you:',
  aiAnnounceBullet1: 'Summarize the core objective of the query.',
  aiAnnounceBullet2: 'Clarify complex filters and constraints (timeframes, statuses, regions, etc.).',
  aiAnnounceBullet3: 'Translate technical dataset outputs into clear, natural language.',
  aiAnnounceSecurity: '🔒 Powered by a secure local AI model, ensuring 100% data privacy.',
  aiAnnounceSettingsHint: 'Choose your model and parameters in Settings → AI Model Configuration',
  aiAnnouncePrimaryCta: 'Try it now',
  aiAnnounceSecondaryCta: 'Dismiss',
  aiAnnounceClose: 'Close announcement',
  aiAnnounceReopen: "What's new",

  // AI SQL Explainer - panel
  aiExplainerTitle: 'AI SQL Explainer',
  aiExplainerSubtitle: 'Turn the query in the editor into plain natural language',
  aiExplainerLocalBadge: 'Local & private',
  aiExplainerLocalBadgeHint: 'Your query is sent only to the Ollama model running on your machine',
  aiExplainerCloudBadge: 'Cloud provider',
  aiExplainerCloudBadgeHint: 'Your query is sent to the cloud provider configured in Settings',
  aiExplainerNoModel: 'No model set',
  aiExplainerOpenSettings: 'Model settings',
  aiExplainerOpenPanel: 'Open AI SQL Explainer',
  aiExplainerClosePanel: 'Close AI SQL Explainer',
  aiExplainerRunButton: 'Explain this query',
  aiExplainerRerunButton: 'Explain again',
  aiExplainerRunning: 'Reading your query…',
  aiExplainerCancel: 'Cancel',
  aiExplainerCancelled: 'Explanation cancelled',
  aiExplainerCopy: 'Copy explanation',
  aiExplainerCopiedShort: 'Copied',
  aiExplainerCopied: 'Explanation copied to clipboard',
  aiExplainerCopyFailed: 'Failed to copy the explanation',
  aiExplainerSpeak: 'Sound',
  aiExplainerSpeakHint: 'Read this explanation aloud',
  aiExplainerSpeakLoading: 'Preparing audio…',
  aiExplainerSpeakStop: 'Stop',
  aiExplainerSpeakFailed: 'Could not read the explanation aloud',
  aiExplainerSpeakCloudNotice:
    'Read-aloud sends the explanation text to OpenAI to generate the audio, even when the explanation itself came from a local model.',
  aiExplainerGeneratedIn: 'Generated in',
  aiExplainerStaleWarning:
    'The query changed after this explanation was generated. Run the explainer again to refresh it.',
  aiExplainerSuccess: 'Explanation ready',
  aiExplainerEmptySql: 'Write a SQL query in the editor first, then run the explainer.',
  aiExplainerEmptyStateTitle: 'No explanation yet',
  aiExplainerEmptyStateHint:
    'Run the explainer to get the query objective, its filters and constraints, and a plain-language description of the result set.',
  aiExplainerErrorTitle: 'Could not explain this query',
  aiExplainerErrorHint:
    'Check that the AI provider is reachable and that the model, base URL, or API key in Settings → AI Model Configuration are correct.',
  aiExplainerObjective: 'Query objective',
  aiExplainerFilters: 'Filters & constraints',
  aiExplainerNoFilters: 'This query has no filters or constraints.',
  aiExplainerOutput: 'What you get back',
  aiExplainerTables: 'Data sources',
  aiExplainerNoContent: 'The model did not describe this section.',
  aiExplainerShowRaw: 'Show raw model response',
  aiExplainerHideRaw: 'Hide raw model response',
  aiExplainerUnstructuredNotice:
    'The model did not return structured sections, so here is its full answer.',

  // AI - context window management
  aiContextTokens: 'Context Window (tokens)',
  aiContextTokensHint:
    "Saved per provider. Must match the selected model's real context size — Ollama silently drops anything over the limit, so raise it with OLLAMA_CONTEXT_LENGTH or a Modelfile before raising it here.",
  aiMaxOutputTokens: 'Max Answer Length (tokens)',
  aiMaxOutputTokensHint: 'Saved per provider. Reserved out of the context window for the answer itself.',
  aiBatchConcurrency: 'Batch Concurrency',
  aiBatchConcurrencyHint:
    'How many AI requests run at once during a batch explain. Ollama serialises per model unless OLLAMA_NUM_PARALLEL is raised.',
  aiContextMeterHint: 'Estimated prompt tokens vs the budget available for the prompt',
  aiContextOverflowTitle: 'This query is larger than the model context window',
  aiContextOverflowBody:
    'The prompt needs about {needed} tokens but only {budget} are available out of a {context}-token window. The query will be trimmed in the middle before sending, so the explanation may miss parts of it.',
  aiContextOverflowFix:
    'To send it whole: raise the context window in Settings (and on the Ollama server via OLLAMA_CONTEXT_LENGTH or a Modelfile), or use "Explain each CTE" below to cover the query step by step.',
  aiContextTruncatedNotice:
    '⚠ {lines} lines were omitted from the middle of the query to fit the context window — this explanation is based on a partial query.',
  aiContextBriefDropped:
    'The local parser summary was too large for the context window and was left out.',
  aiContextBriefUsed: '✓ Grounded with verified facts from the local SQL parser.',

  // AI - follow-up conversation
  aiChatTitle: 'Ask a follow-up',
  aiChatSubtitle: 'Multi-turn questions about this query. Older turns drop out as context fills up.',
  aiChatPlaceholder: 'e.g. What does status = 3 mean here?',
  aiChatSend: 'Ask',
  aiChatReset: 'Clear',
  aiChatThinking: 'Thinking…',
  aiChatRoleYou: 'You',
  aiChatRoleAssistant: 'AI',
  aiChatHistoryTrimmed:
    '{count} earlier message(s) were dropped from the conversation to stay inside the context window.',
  aiChatSuggestion1: 'Which part is most likely to be slow?',
  aiChatSuggestion2: 'Explain the JOIN conditions in more detail.',
  aiChatSuggestion3: 'What would change if I removed the date filter?',

  // AI - batch explain per CTE
  aiBatchTitle: 'Explain each CTE',
  aiBatchSubtitle:
    '{count} CTE(s) in this query, explained separately — {concurrency} at a time. Each step stays well inside the context window.',
  aiBatchRun: 'Run batch',
  aiBatchRerun: 'Run again',
  aiBatchCancel: 'Cancel',
  aiBatchCancelled: 'Batch cancelled',
  aiBatchDone: 'All CTEs explained',
  aiBatchPartialError: '{count} CTE(s) could not be explained',
  aiBatchStatus_pending: 'Queued',
  aiBatchStatus_running: 'Running',
  aiBatchStatus_done: 'Done',
  aiBatchStatus_error: 'Failed',
  aiBatchStatus_cancelled: 'Cancelled',

  // AI - docs consultant (Guideline page)
  docsConsultantTitle: 'Ask the Docs Consultant',
  docsConsultantSubtitle: "Questions about this app's own features and best practices, answered from the guides below.",
  docsConsultantPlaceholder: 'e.g. How do I reduce a HIGH complexity score?',
  docsConsultantSend: 'Ask',
  docsConsultantReset: 'Clear',
  docsConsultantThinking: 'Searching the docs…',
  docsConsultantRoleYou: 'You',
  docsConsultantRoleAssistant: 'Consultant',
  docsConsultantSourcesLabel: 'Sources',
  docsConsultantSuggestion1: 'How do I reduce a HIGH complexity score?',
  docsConsultantSuggestion2: 'What does the JOIN Analysis panel show me?',
  docsConsultantSuggestion3: 'How do I export a Mermaid diagram?',
  docsConsultantSuggestion4: 'How to analyze SQL?',
  docsConsultantSuggestion5: 'Explain JOINs complexity',
  aiAssistantTitle: 'AI Assistant',
} as const;

export default en;
