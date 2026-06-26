const vi = {
  // App
  appName: 'SQL Visualizer',
  appTagline: 'Phân tích truy vấn SQL & MyBatis',

  // Nav
  navQueryInput: 'Nhập truy vấn',
  navGraphVisualizer: 'Biểu đồ quan hệ',
  navMetricsDashboard: 'Bảng chỉ số',
  navCTEAnalysis: 'Phân tích CTE',
  navGuideline: 'Hướng dẫn',
  navSettings: 'Cài đặt',

  // Query Input
  queryInputTitle: 'Nhập & Cấu hình truy vấn',
  queryInputSubtitle: 'Dán SQL hoặc nhập MyBatis XML để bắt đầu phân tích',
  tabPasteSQL: 'Dán SQL trực tiếp',
  tabMyBatis: 'Nhập MyBatis XML',
  dialectLabel: 'Phương ngữ SQL',
  dialectMySQL: 'MySQL',
  dialectPostgres: 'PostgreSQL',
  dialectSQLServer: 'SQL Server',
  dialectOracle: 'Oracle DB',
  sqlPlaceholder: 'Dán truy vấn SQL của bạn vào đây...',
  myBatisPlaceholder: 'Dán nội dung MyBatis XML của bạn vào đây...',
  parametersTitle: 'Cấu hình tham số',
  parametersSubtitle: 'Điền giá trị để giải quyết các tham số động',
  paramDetected: 'tham số được phát hiện',
  noParams: 'Không phát hiện tham số động trong XML này',
  analyzeButton: 'Phân tích truy vấn',
  analyzing: 'Đang phân tích...',
  parsingSQL: 'Đang phân tích cấu trúc SQL...',
  analysisCompleteMessage: 'Phân tích hoàn tất — {tables} bảng, {joins} kết nối được phát hiện',
  parseErrorMessage: 'Không thể phân tích truy vấn. Kiểm tra cú pháp SQL.',
  clearButton: 'Xóa',
  loadSample: 'Tải mẫu',
  resolvedPreviewTitle: 'Xem trước SQL đã giải quyết',
  resolvedPreviewEmpty: 'SQL đã giải quyết sẽ hiển thị ở đây khi bạn điền tham số',
  charCount: 'ký tự',
  linesCount: 'dòng',

  // Tips
  tipCTE: 'Sử dụng WITH...AS cho CTE để phân tích CTE đầy đủ',
  tipJoin: 'Các điều kiện JOIN với table.column = table.column được tự động phát hiện',
  tipMyBatis: 'Hỗ trợ cả cú pháp MyBatis #{param} và ${param}',
  tipDialect: 'Chuyển đổi phương ngữ để điều chỉnh điểm số độ phức tạp',

  // Graph
  graphTitle: 'Biểu đồ quan hệ',
  graphSubtitle: 'Trực quan hóa quan hệ bảng tương tác',
  noGraph: 'Không có biểu đồ để hiển thị',
  noGraphHint: 'Phân tích truy vấn trước để xem biểu đồ quan hệ',
  tableCount: 'Bảng',
  joinCount: 'Kết nối',
  selectedNode: 'Bảng đã chọn',
  nodeColumns: 'Cột được tham chiếu',
  nodeJoins: 'Kết nối liên quan',
  joinLegend: 'Chú giải loại JOIN',
  fitView: 'Vừa khung',
  autoLayout: 'Tự động sắp xếp',
  exportGraph: 'Xuất',
  clickNodeHint: 'Nhấp vào một node để xem quan hệ',
  allTables: 'Tất cả bảng',
  searchTables: 'Tìm kiếm bảng...',
  noTablesFound: 'Không tìm thấy bảng',
  smartSuggestions: 'Gợi ý thông minh',
  extractedTables: 'Bảng trích xuất',
  rows: 'hàng',
  colTableName: 'Tên bảng',
  colClause: 'Mệnh đề',
  colRelationTo: 'Quan hệ với',
  colHits: 'Lượt',
  convertMermaid: 'Chuyển sang Mermaid',
  copyChart: 'Sao chép biểu đồ',
  errors: 'lỗi',
  warnings: 'cảnh báo',
  warning: 'cảnh báo',
  error: 'Lỗi',

  // Smart Suggestions — titles
  suggMissingIndexTitle: 'Thiếu chỉ mục trên cột JOIN',
  suggExcessiveJoinsTitle: 'Phát hiện quá nhiều JOIN',
  suggManyJoinsTitle: 'Nhiều JOIN — kiểm tra thứ tự JOIN',
  suggCrossJoinTitle: 'CROSS JOIN tạo tích Descartes',
  suggInefficientCteTitle: 'Độ phức tạp CTE',
  suggTooManyCteTitle: 'Số lượng CTE cao',
  suggDeepSubqueryTitle: 'Truy vấn con lồng sâu',
  suggWindowFunctionsTitle: 'Nhiều hàm cửa sổ',
  suggFullOuterJoinTitle: 'FULL OUTER JOIN — kiểm tra mục đích',
  suggIsolatedTablesTitle: 'Bảng không có kết nối',
  suggSuperHighComplexityTitle: 'Độ phức tạp truy vấn nghiêm trọng',
  suggLooksGoodTitle: 'Truy vấn có cấu trúc tốt',

  // Smart Suggestions — details
  suggMissingIndexDetail:
    'Đảm bảo có chỉ mục trên các cột khóa JOIN. Thiếu chỉ mục trên khóa JOIN gây ra quét toàn bộ bảng.',
  suggExcessiveJoinsDetail:
    'JOIN trong một truy vấn làm tăng đáng kể chi phí thực thi. Hãy xem xét chia thành các truy vấn nhỏ hơn hoặc dùng CTE trung gian để tổng hợp dữ liệu trước.',
  suggManyJoinsDetail:
    'Đặt bảng có tính chọn lọc cao nhất (tập kết quả nhỏ nhất) đầu tiên trong mệnh đề FROM. Đảm bảo trình tối ưu hóa có thể dùng index nested loops.',
  suggCrossJoinDetail:
    'Phát hiện CROSS JOIN. Điều này nhân số hàng của cả hai bảng. Thêm điều kiện ON hoặc thay bằng INNER JOIN trừ khi tích Descartes là có chủ đích.',
  suggInefficientCteDetail:
    'Các CTE này tham chiếu nhiều bảng nội bộ. Trong MySQL/SQL Server, CTE không được vật chất hóa theo mặc định — chúng có thể được đánh giá lại mỗi lần tham chiếu. Hãy xem xét dùng bảng tạm hoặc gợi ý MATERIALIZED (PostgreSQL).',
  suggTooManyCteDetail:
    'Nhiều CTE nối tiếp có thể ngăn trình tối ưu hóa chọn thứ tự JOIN hiệu quả. Hãy làm phẳng hoặc gộp các CTE khi có thể.',
  suggDeepSubqueryDetail:
    'Truy vấn con lồng sâu ngăn sử dụng chỉ mục và buộc đánh giá tuần tự. Tái cấu trúc bằng JOIN hoặc CTE để làm phẳng cấu trúc truy vấn.',
  suggWindowFunctionsDetail:
    'Mỗi mệnh đề OVER() kích hoạt một lần sắp xếp/phân vùng riêng. Nhóm các hàm cửa sổ có cùng PARTITION BY/ORDER BY vào một biểu thức khi có thể.',
  suggFullOuterJoinDetail:
    'FULL OUTER JOIN trả về tất cả hàng từ cả hai phía bao gồm NULL. Xác nhận đây là có chủ đích; thường có thể thay bằng LEFT JOIN + UNION ALL để hiệu suất tốt hơn.',
  suggIsolatedTablesDetail:
    'Các bảng này xuất hiện trong truy vấn nhưng không có quan hệ JOIN nào được phát hiện. Kiểm tra xem chúng có được đưa vào có chủ đích không hoặc thêm điều kiện JOIN rõ ràng.',
  suggSuperHighComplexityDetail:
    'Truy vấn này có nguy cơ gây ra quét toàn bộ bảng, tranh chấp khóa và lỗi timeout trong môi trường sản xuất. Khuyến nghị mạnh mẽ nên phân tách.',
  suggLooksGoodDetail:
    'Không phát hiện vấn đề hiệu suất lớn. Đảm bảo các cột JOIN được lập chỉ mục và thống kê được cập nhật.',

  // Metrics
  metricsTitle: 'Bảng chỉ số SQL',
  metricsSubtitle: 'Phân tích tổng hợp cấu trúc SQL',
  windowFunctions: 'Hàm cửa sổ',
  groupBy: 'Mệnh đề GROUP BY',
  orderBy: 'Mệnh đề ORDER BY',
  distinct: 'Từ khóa DISTINCT',
  subqueryDepth: 'Độ sâu truy vấn con',
  complexityLevel: 'Mức độ phức tạp',
  executionCost: 'Chi phí thực thi ước tính',
  executionCostHint:
    'Heuristic phía client dựa trên độ phức tạp, phương ngữ và giả định chỉ mục chuẩn',
  complexityLow: 'THẤP',
  complexityMedium: 'TRUNG BÌNH',
  complexityHigh: 'CAO',
  complexitySuper: 'RẤT CAO',
  noMetrics: 'Không có chỉ số',
  noMetricsHint: 'Phân tích truy vấn để xem chỉ số',
  impactLow: 'Tác động thấp',
  impactMedium: 'Tác động trung bình',
  impactHigh: 'Tác động cao',
  recommendation: 'Khuyến nghị',
  factorsBreakdown: 'Phân tích yếu tố phức tạp',

  // CTE
  cteTitle: 'Phân tích CTE',
  cteSubtitle: 'Quét biểu thức bảng chung và ánh xạ nguồn gốc trường',
  noCTEs: 'Không phát hiện CTE',
  noCTEsHint: 'Truy vấn này không chứa biểu thức WITH...AS(...)',
  cteBody: 'Nội dung CTE',
  cteTables: 'Bảng được tham chiếu',
  cteFields: 'Trường được chọn',
  mainQueryFields: 'Nguồn gốc trường truy vấn chính',
  fieldName: 'Trường',
  fieldAlias: 'Bí danh',
  fieldOrigin: 'Nguồn gốc',
  fieldType: 'Loại',
  originCTE: 'CTE',
  originTable: 'Bảng',
  originExpression: 'Biểu thức',
  copySQL: 'Sao chép SQL',
  expandAll: 'Mở rộng tất cả',
  collapseAll: 'Thu gọn tất cả',
  cteUnusedCount: 'CTE không sử dụng',
  cteRecursiveCount: 'CTE đệ quy',
  cteAvgComplexity: 'Độ phức tạp trung bình',
  cteNestedSubqueries: 'Truy vấn con lồng nhau',
  cteNestedSubqueriesHint: 'Phát hiện truy vấn con lồng sâu bên trong CTE này',
  cteNoNestedSubqueries: 'Không tìm thấy truy vấn con lồng nhau',
  cteSubqueryDepth: 'Độ sâu',
  cteSubqueryContext: 'Ngữ cảnh',
  cteSubqueryTables: 'Bảng',
  cteSubqueryFields: 'Trường',
  cteSubqueryLines: 'Dòng',
  cteSubqueryHasJoins: 'Có JOIN',
  cteSubqueryHasAggregation: 'Có tổng hợp',
  cteSubqueryCount: 'Truy vấn con',

  // CTE Analysis - Additional missing translations
  cteOriginBadgeCTE: 'CTE',
  cteOriginBadgeTable: 'Bảng',
  cteOriginBadgeExpression: 'Biểu thức',
  cteTagJOIN: 'JOIN',
  cteTagAGG: 'TỔ HỢP',
  cteTagRECURSIVE: 'ĐỆ QUY',
  cteTagUNUSED: 'KHÔNG DÙNG',
  cteSubqueryPrefix: 'Truy vấn con',
  cteNoTablesDetected: 'Không phát hiện bảng',
  cteNoFieldsDetected: 'Không phát hiện trường',
  cteDetected: 'Phát hiện',
  cteTotalLabel: 'Tổng CTE',
  cteDepCountLabel: 'CTE',
  cteBooleanYes: 'Có',
  cteBooleanNo: 'Không',
  cteMetadataTables: 'bảng',
  cteMetadataFields: 'trường',
  cteMetadataLines: 'dòng',
  cteMetadataUsed: 'được dùng',
  cteIssues: 'Vấn đề',
  cteUsageCount: 'Số lần sử dụng',
  cteUsedInMain: 'được dùng trong main',
  cteEstimatedComplexity: 'Độ phức tạp ước tính',
  cteIsRecursive: 'Là đệ quy',
  cteDependencies: 'Phụ thuộc',
  cteDepsLabel: 'Phụ thuộc CTE',
  cteColumnRefs: 'Tham chiếu cột',
  cteUnusedWarning: 'CTE này không bao giờ được dùng trong truy vấn chính',
  cteRecursiveNote: 'CTE này tham chiếu chính nó (đệ quy)',

  // Settings
  settingsTitle: 'Cài đặt & Tùy chọn',
  settingsSubtitle: 'Cấu hình giao diện, ngôn ngữ và mặc định phân tích',
  settingsAppearance: 'Giao diện',
  settingsLanguage: 'Ngôn ngữ',
  settingsAnalysis: 'Mặc định phân tích',
  settingsGraph: 'Bố cục biểu đồ',
  darkMode: 'Chế độ tối',
  darkModeHint: 'Sử dụng giao diện tối trong toàn bộ ứng dụng',
  lightMode: 'Chế độ sáng',
  language: 'Ngôn ngữ',
  languageHint: 'Chọn ngôn ngữ hiển thị giao diện',
  defaultDialect: 'Phương ngữ SQL mặc định',
  defaultDialectHint: 'Phương ngữ được chọn trước khi mở ứng dụng',
  autoAnalyze: 'Tự động phân tích khi dán',
  autoAnalyzeHint: 'Tự động phân tích truy vấn khi dán vào ô nhập SQL',
  graphLayout: 'Thuật toán bố cục biểu đồ',
  graphLayoutHint: 'Thuật toán dùng để đặt vị trí node ban đầu',
  nodeSpacing: 'Khoảng cách node',
  nodeSpacingHint: 'Khoảng cách giữa các node trong biểu đồ',
  edgeStyle: 'Kiểu cạnh',
  edgeStyleHint: 'Kiểu hiển thị cho các cạnh quan hệ JOIN',
  saved: 'Đã lưu cài đặt',
  layoutDagre: 'Dagre (Phân cấp)',
  layoutForce: 'Hướng lực',
  layoutGrid: 'Lưới',
  edgeSmooth: 'Bezier mượt',
  edgeStraight: 'Thẳng',
  edgeStep: 'Bậc thang',
  accentColor: 'Màu nhấn',
  accentColorHint: 'Màu nổi bật chính được sử dụng trong giao diện',
  resetDefaults: 'Đặt lại mặc định',
  resetConfirm: 'Thao tác này sẽ đặt lại tất cả cài đặt về giá trị mặc định.',

  // Guideline
  guidelineTitle: 'Hướng Dẫn Sử Dụng',
  guidelineQuickStart: 'Bắt đầu nhanh',
  guidelineQuickStartDesc:
    'Vào Nhập truy vấn → dán SQL → nhấn Phân tích. Tất cả bốn màn hình (Biểu đồ, Chỉ số, CTE, Cài đặt) sẽ tự động hiển thị dữ liệu từ truy vấn của bạn.',
  guidelineTips: 'Mẹo',
  guidelineSidebarControls: 'Điều khiển thanh bên',
  guidelineBuiltFor: 'Xây dựng cho các nhà phát triển yêu thích sự rõ ràng',

  // Guideline - Query Input Section
  guidelineQueryInputTitle: 'Nhập Truy Vấn',
  guidelineQueryInputSubtitle: 'Bắt đầu tại đây — dán SQL hoặc nhập file MyBatis XML',
  guidelineQueryInputStep1Label: 'Chọn chế độ nhập',
  guidelineQueryInputStep1Desc:
    'Chuyển đổi giữa tab "Dán SQL trực tiếp" và "Nhập MyBatis XML" ở đầu trình soạn thảo.',
  guidelineQueryInputStep2Label: 'Chọn phương ngữ SQL',
  guidelineQueryInputStep2Desc:
    'Chọn MySQL, PostgreSQL, SQL Server hoặc Oracle từ menu thả xuống để phân tích chính xác.',
  guidelineQueryInputStep3Label: 'Dán hoặc nhập truy vấn',
  guidelineQueryInputStep3Desc:
    'Dán SQL vào trình soạn thảo. Với MyBatis XML, điền giá trị tham số để giải quyết các biểu thức động như #{param}.',
  guidelineQueryInputStep4Label: 'Nhấn "Phân tích truy vấn"',
  guidelineQueryInputStep4Desc:
    'Nhấn nút Phân tích (hoặc bật Tự động phân tích trong Cài đặt). Kết quả sẽ hiển thị ngay trên tất cả các màn hình.',
  guidelineQueryInputTip1: 'Dùng "Tải mẫu" để thử công cụ với truy vấn mẫu có nhiều JOIN.',
  guidelineQueryInputTip2:
    'Bộ đếm ký tự và dòng ở phía dưới giúp bạn theo dõi kích thước truy vấn.',

  // Guideline - Graph Visualizer Section
  guidelineGraphTitle: 'Biểu Đồ Quan Hệ',
  guidelineGraphSubtitle: 'Trực quan hóa tương tác các quan hệ bảng và kết nối JOIN',
  guidelineGraphStep1Label: 'Đọc biểu đồ',
  guidelineGraphStep1Desc:
    'Mỗi hộp là một bảng. Các đường màu (cạnh) kết nối các bảng có quan hệ JOIN. Màu đường khớp với loại JOIN hiển thị trong chú giải bên phải.',
  guidelineGraphStep2Label: 'Nhấp vào node bảng',
  guidelineGraphStep2Desc:
    'Nhấp vào node để làm nổi bật nó và các kết nối trực tiếp. Bảng bên phải hiển thị cột, điều kiện JOIN và các bảng liên quan.',
  guidelineGraphStep3Label: 'Dùng phần Bảng đã trích xuất',
  guidelineGraphStep3Desc:
    'Bảng có thể thu gọn ở phía dưới liệt kê mọi bảng với mệnh đề (FROM/JOIN), bảng liên quan và số lần xuất hiện (hits). Nhấn "Copy" để xuất CSV.',
  guidelineGraphStep4Label: 'Xuất biểu đồ',
  guidelineGraphStep4Desc:
    '"Convert to Mermaid" sao chép cú pháp biểu đồ Mermaid đầy đủ vào clipboard, sẵn sàng dán vào bất kỳ trình hiển thị Mermaid nào.',
  guidelineGraphTip1:
    'Màu cạnh: Hổ phách = LEFT JOIN, Xanh lá = RIGHT JOIN, Chàm = INNER JOIN, Hồng = FULL OUTER, Đỏ = CROSS, Tím = NATURAL.',
  guidelineGraphTip2:
    'Dùng MiniMap (góc dưới phải) để điều hướng biểu đồ lớn. Cuộn để phóng to, kéo để di chuyển.',

  // Guideline - Metrics Dashboard Section
  guidelineMetricsTitle: 'Bảng Chỉ Số',
  guidelineMetricsSubtitle: 'Phân tích độ phức tạp định lượng và heuristic hiệu suất',
  guidelineMetricsStep1Label: 'Đồng hồ điểm phức tạp',
  guidelineMetricsStep1Desc:
    'Đồng hồ hình tròn hiển thị điểm phức tạp 0–100. THẤP (xanh) → TRUNG BÌNH (vàng) → CAO (cam) → RẤT CAO (đỏ).',
  guidelineMetricsStep2Label: 'Phân tích yếu tố phức tạp',
  guidelineMetricsStep2Desc:
    'Biểu đồ cột phân tích các yếu tố riêng lẻ: JOIN, độ sâu truy vấn con, hàm cửa sổ, GROUP BY, ORDER BY và DISTINCT.',
  guidelineMetricsStep3Label: 'Chi phí thực thi ước tính',
  guidelineMetricsStep3Desc:
    'Điểm heuristic phía client dựa trên độ phức tạp, phương ngữ và giả định chỉ mục chuẩn. Dùng làm hướng dẫn tương đối, không phải điểm chuẩn tuyệt đối.',
  guidelineMetricsTip1:
    'Di chuột qua các cột biểu đồ để xem giá trị chính xác và khuyến nghị cho từng yếu tố.',

  // Guideline - CTE Analysis Section
  guidelineCTETitle: 'Phân Tích CTE',
  guidelineCTESubtitle: 'Phân tích sâu các biểu thức bảng chung và ánh xạ nguồn gốc trường',
  guidelineCTEStep1Label: 'Xem CTE được phát hiện',
  guidelineCTEStep1Desc:
    'Mỗi khối WITH...AS(...) được liệt kê dưới dạng thẻ. Mở rộng thẻ để xem SQL nội dung CTE, bảng được tham chiếu và trường được chọn.',
  guidelineCTEStep2Label: 'Ánh xạ nguồn gốc trường',
  guidelineCTEStep2Desc:
    'Bảng "Nguồn gốc trường truy vấn chính" hiển thị mỗi trường trong SELECT cuối cùng đến từ đâu — CTE, bảng cơ sở hay biểu thức tính toán.',
  guidelineCTEStep3Label: 'Sao chép SQL CTE',
  guidelineCTEStep3Desc:
    'Mỗi thẻ CTE có nút "Sao chép SQL" để sao chép nội dung CTE vào clipboard để tái sử dụng.',
  guidelineCTETip1:
    'Dùng "Mở rộng tất cả" / "Thu gọn tất cả" để nhanh chóng xem hoặc ẩn tất cả nội dung CTE.',

  // Guideline - Settings Section
  guidelineSettingsTitle: 'Cài Đặt & Tùy Chọn',
  guidelineSettingsSubtitle: 'Tùy chỉnh giao diện, ngôn ngữ và hành vi phân tích',
  guidelineSettingsStep1Label: 'Chế độ tối / sáng',
  guidelineSettingsStep1Desc:
    'Chuyển đổi giữa giao diện tối và sáng. Bạn cũng có thể chuyển nhanh bằng nút Mặt trời/Mặt trăng ở cuối thanh bên.',
  guidelineSettingsStep2Label: 'Ngôn ngữ (EN / VI)',
  guidelineSettingsStep2Desc:
    'Chuyển giao diện giữa tiếng Anh và tiếng Việt. Nút địa cầu trong thanh bên cung cấp chuyển đổi nhanh.',
  guidelineSettingsStep3Label: 'Bố cục biểu đồ & kiểu cạnh',
  guidelineSettingsStep3Desc:
    'Chọn bố cục Dagre (phân cấp), Hướng lực hoặc Lưới. Kiểu cạnh có thể là Bezier mượt, Thẳng hoặc Bậc thang.',
  guidelineSettingsStep4Label: 'Tự động phân tích khi dán',
  guidelineSettingsStep4Desc:
    'Khi bật, công cụ tự động chạy phân tích ngay khi bạn dán SQL vào trình soạn thảo — không cần nhấn Phân tích.',
  guidelineSettingsTip1:
    'Cài đặt được lưu trong trình duyệt — tùy chọn của bạn sẽ được giữ nguyên sau khi tải lại trang.',
  // Guideline - Tools Available Section
  guidelineToolsTitle: 'Các công cụ có sẵn',
  guidelineToolsSubtitle: 'Tổng quan đầy đủ về tính năng và mô tả công cụ',
  guidelineToolsIntroTitle: 'Tất cả các tính năng phân tích SQL mạnh mẽ',
  guidelineToolsIntroDesc:
    'SQL Visualizer cung cấp năm công cụ tích hợp cùng nhau để phân tích, trực quan hóa và tối ưu hóa truy vấn SQL của bạn. Sử dụng chúng riêng lẻ hoặc như một quy trình hoàn chỉnh.',
  guidelineToolsQueryInputName: 'Nhập truy vấn và cấu hình',
  guidelineToolsQueryInputDesc:
    'Điểm bắt đầu cho tất cả phân tích. Dán SQL thô hoặc nhập tệp MyBatis XML có hỗ trợ tham số động.',
  guidelineToolsQueryInputFeatures:
    'Chế độ nhập kép • Hỗ trợ đa phương ngữ (MySQL, PostgreSQL, SQL Server, Oracle) • Tùy chọn phân tích tự động • Truy vấn mẫu • Bộ đếm ký tự/dòng',
  guidelineToolsGraphName: 'Trực quan hóa biểu đồ quan hệ',
  guidelineToolsGraphDesc:
    'Trực quan hóa tương tác các mối quan hệ giữa các bảng. Một cách nhanh chóng xem các bảng nào kết hợp với nhau và cách dữ liệu chảy qua truy vấn của bạn.',
  guidelineToolsGraphFeatures:
    'Nút tương tác • Các loại JOIN được mã hóa màu • Nhiều tùy chọn bố cục • Xuất biểu đồ Mermaid • Điều hướng MiniMap • Xuất CSV của bảng',
  guidelineToolsMetricsName: 'Bảng điều khiển số liệu',
  guidelineToolsMetricsDesc:
    'Định lượng độ phức tạp của truy vấn với các số liệu khách quan. Hiểu tác động hiệu suất trước khi thực thi và nhận các khuyến nghị tối ưu hóa cụ thể.',
  guidelineToolsMetricsFeatures:
    'Gauge độ phức tạp (0-100) • Phân tích theo yếu tố (JOIN, truy vấn con, hàm) • Ước tính chi phí thực thi • Khuyến nghị từng yếu tố • Tooltip tương tác',
  guidelineToolsCTEName: 'Phân tích CTE',
  guidelineToolsCTEDesc:
    'Phân tích sâu sắc Common Table Expressions. Xem cấu trúc CTE, phụ thuộc, nguồn gốc trường và xác định các CTE không sử dụng hoặc có vấn đề.',
  guidelineToolsCTEFeatures:
    'Phát hiện & liệt kê CTE • Cờ CTE đệ quy/không sử dụng • Ánh xạ nguồn gốc trường • Phân tích truy vấn con lồng nhau • Sao chép SQL CTE • Mở rộng/Thu gọn hàng loạt',
  guidelineToolsSettingsName: 'Cài đặt và tùy chọn',
  guidelineToolsSettingsDesc:
    'Tùy chỉnh ứng dụng theo tùy chọn của bạn. Kiểm soát giao diện, ngôn ngữ, kiểu trực quan hóa biểu đồ và hành vi phân tích.',
  guidelineToolsSettingsFeatures:
    'Chủ đề tối/sáng • Chuyển đổi ngôn ngữ EN/VI • Tùy chọn bố cục biểu đồ (Dagre/Force/Grid) • Lựa chọn kiểu cạnh • Bật tắt phân tích tự động',
  guidelineToolsWorkflowTitle: 'Quy trình công việc thông thường',
  guidelineToolsWorkflowQuickAudit: 'Kiểm tra nhanh (5 phút)',
  guidelineToolsWorkflowQuickAuditDesc: 'Dán truy vấn → Kiểm tra số liệu → Xem xét phân tích CTE',
  guidelineToolsWorkflowDeepAnalysis: 'Phân tích sâu (15 phút)',
  guidelineToolsWorkflowDeepAnalysisDesc:
    'Dán truy vấn → Khám phá biểu đồ → Xem xét số liệu → Xuất biểu đồ và bảng',
  guidelineToolsWorkflowOptimization: 'Công việc tối ưu hóa (30+ phút)',
  guidelineToolsWorkflowOptimizationDesc:
    'Số liệu cơ sở → Xác định nút thắt → Tối ưu hóa → So sánh cải thiện → Xuất kết quả',
  guidelineToolsWorkflowTeamReview: 'Xem xét nhóm (20 phút)',
  guidelineToolsWorkflowTeamReviewDesc:
    'Tải truy vấn → Xuất Mermaid → Thảo luận trong cuộc họp → Xem xét nguồn gốc CTE → Tài liệu',
  guidelineToolsExportTitle: 'Xuất & Tích hợp',
  guidelineToolsExportCSV: 'Xuất CSV (Bảng)',
  guidelineToolsExportCSVDesc:
    'Xuất phần Bảng được trích xuất để phân tích bảng tính hoặc tài liệu cơ sở dữ liệu.',
  guidelineToolsExportMermaid: 'Biểu đồ Mermaid',
  guidelineToolsExportMermaidDesc:
    'Sao chép cú pháp biểu đồ Mermaid đầy đủ vào khay nhớ tạm. Dán vào các công cụ render Mermaid, wiki hoặc tài liệu.',
  guidelineToolsExportCTESQL: 'Sao chép SQL CTE',
  guidelineToolsExportCTESQLDesc:
    'Sao chép các phần CTE riêng lẻ để sử dụng lại trong các truy vấn khác hoặc tối ưu hóa CTE độc lập.',
  // Guideline - Quick Reference
  guidelineQuickRefQueryInput: 'Nhập truy vấn',
  guidelineQuickRefGraph: 'Biểu đồ quan hệ',
  guidelineQuickRefMetrics: 'Bảng chỉ số',
  guidelineQuickRefCTE: 'Phân tích CTE',
  guidelineQuickRefSettings: 'Cài đặt',

  // Guideline - Sidebar Controls
  guidelineSidebarDarkLight: 'Chuyển tối / sáng',
  guidelineSidebarDarkLightDesc: 'Cuối thanh bên',
  guidelineSidebarLanguage: 'Ngôn ngữ EN ↔ VI',
  guidelineSidebarLanguageDesc: 'Nút địa cầu trong thanh bên',
  guidelineSidebarCopyChart: 'Sao chép biểu đồ / Mermaid',
  guidelineSidebarCopyChartDesc: 'Góc trên phải màn hình Biểu đồ',
  guidelineSidebarExportCSV: 'Xuất CSV',
  guidelineSidebarExportCSVDesc: 'Phần Bảng đã trích xuất',

  // SQL Analyzer - Complexity Recommendations
  complexityRecommendationLow: 'Truy vấn có vẻ nhẹ. Chỉ mục tiêu chuẩn sẽ xử lý tốt điều này.',
  complexityRecommendationMedium:
    'Hãy xem xét kiểm tra thứ tự JOIN. Đảm bảo các cột được lập chỉ mục được sử dụng trong điều kiện ON.',
  complexityRecommendationHigh:
    'Phát hiện độ phức tạp cao. Hãy xem xét chia thành các truy vấn nhỏ hơn hoặc sử dụng CTE được vật chất hóa.',
  complexityRecommendationSuperHigh:
    'Độ phức tạp nghiêm trọng. Truy vấn này có thể gây quét toàn bộ bảng. Khuyến nghị mạnh mẽ phân tách và kiểm tra chỉ mục.',

  // Complexity Scoring - Dashboard
  complexityDashboardTitle: 'Bảng điều khiển độ phức tạp',
  complexityScore: 'Điểm số',
  complexityProgressBar: 'Tiến trình',
  complexityKeywordsAndClauses: 'Từ khóa & Mệnh đề',
  complexitySelectFields: 'Trường SELECT',
  complexityJoins: 'JOIN',
  complexityCTEsAndSubqueries: 'CTE & Truy vấn con',
  complexityLintingIssues: 'Các vấn đề Linting',

  // Complexity Scoring - Breakdown
  complexityBreakdownTitle: 'Chi tiết phân tích điểm số độ phức tạp',
  complexityBreakdownKeywordsAndClauses: 'Từ khóa & Mệnh đề',
  complexityBreakdownSelectFields: 'Trường SELECT',
  complexityBreakdownJoins: 'JOIN',
  complexityBreakdownCTEs: 'CTE (Mệnh đề WITH)',
  complexityBreakdownSubqueries: 'Truy vấn con lồng nhau',
  complexityBreakdownWindowFunctions: 'Hàm cửa sổ',
  complexityBreakdownNoKeywords: 'Không phát hiện từ khóa',
  complexityBreakdownFieldCount: 'Số trường',
  complexityBreakdownAverageComplexity: 'Độ phức tạp trung bình',
  complexityBreakdownMaxDepth: 'Độ sâu tối đa',
  complexityBreakdownScoreInterpretation: 'Giải thích điểm số',
  complexityBreakdownSelectFieldsDesc:
    'Các biểu thức SELECT phức tạp (truy vấn con vô hướng, câu lệnh CASE, hàm) góp phần vào điểm số tổng thể.',
  complexityBreakdownJoinsDesc:
    'Nhiều JOIN tăng độ phức tạp truy vấn thông qua sản phẩm Descartes, thách thức tối ưu hóa và khả năng tranh chấp khóa tiềm ẩn.',
  complexityBreakdownCTEsDesc:
    'Mỗi CTE (Common Table Expression) tăng chi phí cấu trúc nhưng cải thiện khả năng đọc và có thể giúp tối ưu hóa truy vấn.',
  complexityBreakdownSubqueriesDesc:
    'Lồng truy vấn con sâu ngăn chặn sử dụng chỉ mục và buộc phải đánh giá tuần tự. Hãy cân nhắc tái cấu trúc bằng JOIN hoặc CTE.',
  complexityBreakdownWindowFunctionsDesc:
    'Mỗi mệnh đề hàm cửa sổ kích hoạt một lần sắp xếp/phân vùng riêng. Nhóm các hàm có cùng PARTITION BY/ORDER BY khi có thể.',
  complexityBreakdownJoinsCount: 'JOIN(s)',
  complexityBreakdownCTEsCount: 'CTE(s)',
  complexityBreakdownWindowFunctionsOverClause: 'OVER() Mệnh đề(s)',
  complexityBreakdownScoreExplanation:
    'Truy vấn của bạn có điểm {score} từ {maxScore} điểm có thể ({percentage}%). Điểm cao hơn chỉ ra độ phức tạp lớn hơn và những thách thức hiệu suất tiềm ẩn.',
  complexityBreakdownNestedSubqueriesLabel: 'Truy vấn con lồng nhau, Độ sâu tối đa',
  sqlConstructDistribution: 'Phân phối cấu trúc SQL',

  // Complexity Scoring - Linting
  lintingAlertsTitle: 'Các mẫu chống & Vi phạm thực hành tốt nhất',
  lintingNoIssues: 'Không phát hiện vấn đề linting. Truy vấn tuân theo các thực hành tốt nhất.',
  lintingSelectAll: 'SELECT_ALL',
  lintingSelectAllMessage:
    'Phát hiện mẫu chống: Tránh sử dụng `SELECT *` trong các hệ thống quy mô lớn.',
  lintingSelectAllSuggestion:
    'Vui lòng xác định rõ các cột chiếu của bạn để giảm I/O và độ trễ mạng.',
  lintingDeepNesting: 'DEEP_NESTING',
  lintingDeepNestingMessage: 'Phát hiện lồng sâu. Điều này có thể làm giảm tối ưu hóa truy vấn.',
  lintingDeepNestingSuggestion:
    'Hãy cân nhắc tái cấu trúc bằng CTE hoặc chia thành các truy vấn nhỏ hơn.',
  lintingCrossJoin: 'CROSS_JOIN',
  lintingCrossJoinMessage:
    'CROSS JOIN tạo ra sản phẩm Cartesian. Điều này có thể làm tăng số lượng hàng theo cấp số nhân.',
  lintingCrossJoinSuggestion:
    'Xác minh điều này là có chủ ý. Hãy cân nhắc thêm các điều kiện join thích hợp để thay thế bằng INNER JOIN.',
  lintingMissingWhere: 'MISSING_WHERE',
  lintingMissingWhereMessage:
    'Truy vấn phức tạp không có mệnh đề WHERE. Có thể quét toàn bộ bảng không cần thiết.',
  lintingMissingWhereSuggestion: 'Thêm các vị từ lọc để giảm tập hợp làm việc.',

  // Complexity Scoring - Guidelines
  guidelineSubtitle:
    'Hiểu cách SQL Visualizer tính toán độ phức tạp truy vấn và xác định rủi ro hiệu suất.',
  guidelineHowScoringWorks: 'Cách tính điểm hoạt động',
  guidelineHowScoringWorksDetail:
    'Mỗi từ khóa SQL, mệnh đề, hàm cửa sổ và biểu thức trường SELECT đều góp phần vào điểm số độ phức tạp tích lũy của truy vấn. Hệ thống duyệt cấu trúc truy vấn, gán trọng số dựa trên tác động kiến trúc và tính điểm cuối cùng ánh xạ đến mức độ phức tạp: THẤP, TRUNG BÌNH, CAO hoặc RẤT CAO.',
  guidelineLintingAndAntiPatterns: 'Linting & Mẫu chống',
  guidelineLintingAndAntiPatternsDetail:
    'Công cụ linting quét tìm các mẫu chống như SELECT *, lồng sâu, CROSS JOIN và mệnh đề WHERE bị thiếu. Cảnh báo cảnh báo bạn về các rủi ro hiệu suất tiềm ẩn có thể không xuất hiện trong điểm số thô.',
  guidelineComplexityWeightMatrix: 'Ma trận trọng số độ phức tạp',
  guidelineComplexityWeightMatrixSubtitle:
    'Mỗi từ khóa và cấu trúc góp phần các điểm sau vào tổng điểm số độ phức tạp.',
  guidelineBaseClauses: 'Mệnh đề cơ sở',
  guidelineJoins: 'JOIN (Tiến trình động)',
  guidelineAggregationsAndSorting: 'Tổng hợp & Sắp xếp',
  guidelineAdvancedStructures: 'Cấu trúc nâng cao',
  guidelineWindowFunctions: 'Hàm cửa sổ',
  guidelineSelectFieldComplexity: 'Độ phức tạp trường SELECT',
  guidelineComplexityLevelClassification: 'Phân loại mức độ phức tạp',
  guidelineComplexityLevelLow: 'Điểm: 0 – 20 điểm',
  guidelineComplexityLevelLowDetail:
    'Truy vấn đơn giản với ít JOIN, không có biểu thức phức tạp và tổng hợp thẳng. Nên hoạt động tốt với chỉ mục tiêu chuẩn.',
  guidelineComplexityLevelMedium: 'Điểm: 21 – 50 điểm',
  guidelineComplexityLevelMediumDetail:
    'Độ phức tạp vừa phải với nhiều JOIN, một vài CTE hoặc hàm cửa sổ. Hãy cân nhắc xem xét thứ tự JOIN và đảm bảo các cột được lập chỉ mục được sử dụng trong điều kiện ON.',
  guidelineComplexityLevelHigh: 'Điểm: 51 – 100 điểm',
  guidelineComplexityLevelHighDetail:
    'Độ phức tạp cao với nhiều JOIN, CTE hoặc truy vấn con lồng nhau. Khuyến nghị chia thành các truy vấn nhỏ hơn hoặc sử dụng CTE được vật chất hóa để tránh quét toàn bộ bảng.',
  guidelineComplexityLevelSuperHigh: 'Điểm: 101+ điểm',
  guidelineComplexityLevelSuperHighDetail:
    'Độ phức tạp nghiêm trọng. Truy vấn này có nguy cơ gây quét toàn bộ bảng, tranh chấp khóa và lỗi hết thời gian. Khuyến nghị mạnh mẽ phân tách truy vấn và xem xét chỉ mục toàn diện.',
  guidelineAntiPatternExamples: 'Ví dụ về mẫu chống',
  guidelineSelectAllAntiPattern: '🚫 Mẫu chống SELECT *',
  guidelineSelectAllDetail:
    'Lựa chọn cột không giới hạn buộc cơ sở dữ liệu phải truy xuất tất cả các cột, làm tăng I/O và độ trễ mạng.',
  guidelineExplicitProjection: '✅ Phép chiếu rõ ràng',
  guidelineExplicitProjectionDetail:
    'Luôn đặt tên cho các cột bạn cần. Điều này giảm I/O và làm cho ý định truy vấn rõ ràng.',
  guidelineDeepNestingAntiPattern: '🚫 Lồng sâu',
  guidelineDeepNestingDetail:
    'Các truy vấn có 7+ cấp độ dấu ngoặc đơn khó tối ưu hóa và thường chỉ ra nhu cầu tái cấu trúc.',
  guidelineUseCTEsInstead: '✅ Sử dụng CTE thay thế',
  guidelineUseCTEsDetail:
    'Common Table Expressions cải thiện tính dễ đọc và thường giúp trình tối ưu hóa.',
  guidelineCrossJoinAntiPattern: '🚫 Rủi ro CROSS JOIN',
  guidelineCrossJoinDetail:
    'Sản phẩm Cartesian nhân số lượng hàng theo cấp số nhân. Luôn xác minh ý định.',
  guidelineAddJoinConditions: '✅ Thêm điều kiện JOIN',
  guidelineAddJoinConditionsDetail: 'Thay thế bằng JOIN INNER hoặc LEFT thích hợp.',

  // Complexity Scoring Evaluation Section
  guidelineComplexityEvaluationTitle: 'Tính điểm độ phức tạp & Đánh giá',
  guidelineComplexityEvaluationSubtitle:
    'Hiểu cách SQL Visualizer tính điểm độ phức tạp truy vấn và giải thích kết quả.',

  // Complexity Evaluation Steps
  guidelineComplexityEvalStep1Label: 'Cách tính điểm hoạt động',
  guidelineComplexityEvalStep1Desc:
    'Mỗi từ khóa SQL, mệnh đề, hàm cửa sổ và biểu thức trường SELECT đều góp phần vào điểm số độ phức tạp tích lũy của truy vấn của bạn. Hệ thống quét cấu trúc truy vấn và gán trọng số dựa trên tác động kiến trúc.',

  guidelineComplexityEvalStep2Label: 'Ma trận trọng số',
  guidelineComplexityEvalStep2Desc:
    'Các cấu trúc SQL khác nhau có trọng số khác nhau:\n\n• Mệnh đề cơ sở (FROM=1, WHERE=2, DISTINCT=3)\n• JOIN (INNER=4, LEFT=5, FULL OUTER=10, CROSS=10)\n• Tổng hợp (GROUP BY=4, HAVING=4)\n• Hàm cửa sổ (OVER=6, PARTITION BY=3)\n• Nâng cao (CTE=8, Truy vấn con lồng nhau=12)\n\nCác cấu trúc phức tạp hơn đóng góp nhiều điểm hơn.',

  guidelineComplexityEvalStep3Label: 'Mức độ phức tạp',
  guidelineComplexityEvalStep3Desc:
    'Điểm số ánh xạ tới các mức độ phức tạp:\n\n• THẤP (0-20): Truy vấn đơn giản, ít JOIN, logic rõ ràng\n• TRUNG BÌNH (21-50): Nhiều JOIN hoặc CTE, độ phức tạp vừa phải\n• CAO (51-100): Nhiều JOIN/truy vấn con, xem xét tái cấu trúc\n• RẤT CAO (101+): Rủi ro độ phức tạp nghiêm trọng, khuyến nghị mạnh mẽ tái cấu trúc',

  guidelineComplexityEvalStep4Label: 'Linting & Mẫu chống',
  guidelineComplexityEvalStep4Desc:
    'Các quy tắc linting phát hiện mẫu chống SQL có thể không xuất hiện trong điểm thô:\n\n• SELECT * – Không giới hạn chiếu cột\n• Lồng sâu (7+ cấp độ) – Vô hiệu hóa trình tối ưu hóa truy vấn\n• CROSS JOIN – Tăng trưởng hàng theo cấp số nhân\n• Thiếu WHERE – Quét bảng không cần thiết\n\nCác cảnh báo này giúp bạn xác định rủi ro hiệu suất ngoài điểm số.',

  guidelineComplexityEvalStep5Label: 'Mẹo tối ưu hóa',
  guidelineComplexityEvalStep5Desc:
    'Khi điểm số của bạn CAO hoặc RẤT CAO:\n\n• Chia nhỏ thành các truy vấn nhỏ hơn hoặc bảng tạm thời\n• Thay thế lồng sâu bằng CTE (Biểu thức bảng chung)\n• Thêm mệnh đề WHERE rõ ràng để lọc sớm\n• Xác minh điều kiện JOIN – tránh CROSS JOIN\n• Sử dụng hàm cửa sổ thay vì truy vấn con khi có thể\n• Lập chỉ mục các cột được sử dụng trong điều kiện JOIN và WHERE',

  // Complexity Evaluation Tips
  guidelineComplexityEvalTip1:
    '💡 Mẹo chuyên nghiệp: Điểm RẤT CAO không phải lúc nào cũng có nghĩa là truy vấn của bạn sai – nó có nghĩa là bạn nên xem xét kỹ lưỡng và xem xét các chiến lược tối ưu hóa.',
  guidelineComplexityEvalTip2:
    '📊 Chế độ xem bảng điều khiển: Kiểm tra "Phân tích chi tiết độ phức tạp" trong Bảng điều khiển Số liệu để xem thành phần nào đóng góp nhiều nhất cho điểm số của bạn.',
  guidelineComplexityEvalTip3:
    '🔍 Tái cấu trúc lặp lại: Viết lại và phân tích lại truy vấn của bạn để xem điểm số cải thiện khi bạn tối ưu hóa.',

  // Score Weight Table
  scoreTableTitle: 'Ma trận trọng số hoàn chỉnh',
  scoreTableDescription: 'Tất cả các cấu trúc SQL và trọng số độ phức tạp được gán của chúng.',
  scoreTableConstructColumn: 'Cấu trúc SQL',
  scoreTableWeightColumn: 'Trọng số (điểm)',
  scoreTableCategoryBaseClauses: 'Mệnh đề cơ sở',
  scoreTableCategoryJoins: 'Loại JOIN',
  scoreTableCategoryAggregations: 'Tổng hợp & Sắp xếp',
  scoreTableCategoryAdvanced: 'Cấu trúc nâng cao',
  scoreTableCategoryWindowFunctions: 'Hàm cửa sổ',
  scoreTableCategorySelectFields: 'Loại trường SELECT',

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
  scoreTableNESTEDSUBQUERY: 'Truy vấn con lồng nhau (mỗi cấp độ)',
  scoreTableUNION: 'UNION',
  scoreTableEXCEPT: 'EXCEPT',
  scoreTableINTERSECT: 'INTERSECT',

  // Window Functions
  scoreTableOVER: 'Mệnh đề OVER',
  scoreTablePARTITIONBY: 'PARTITION BY',
  scoreTableROWNUMBER: 'ROW_NUMBER()',
  scoreTableRANK: 'RANK()',
  scoreTableDENSERANK: 'DENSE_RANK()',

  // SELECT Field Types
  scoreTableRawField: 'Cột thô (ví dụ: t.column)',
  scoreTableAliasField: 'Biểu thức có bí danh (ví dụ: AS alias)',
  scoreTableConditionalField: 'Điều kiện (ví dụ: CASE WHEN)',
  scoreTableSubqueryField: 'Truy vấn con vô hướng (ví dụ: (SELECT ...))',
  scoreTableAggregateField: 'Hàm tổng hợp (ví dụ: SUM, COUNT)',
  scoreTableFunctionField: 'Hàm vô hướng (ví dụ: UPPER, ROUND)',

  // Metrics Dashboard - Tables & Fields
  referencedTablesTitle: 'Bảng được tham chiếu',
  referencedTablesCount: 'bảng',
  tableAlias: 'Bí danh',
  sourceTable: 'Bảng nguồn',
  noTablesDetected: 'Không phát hiện bảng nào trong truy vấn này',
  noFieldsDetected: 'Không phát hiện trường nào trong truy vấn này',
  columnCount: 'cột',
  columnLabel: 'Cột',
  cteLabel: 'CTE',

  // Execution Cost Factors
  executionCostFactorJoinDepth: 'Độ sâu Join',
  executionCostFactorSubqueryNesting: 'Lồng Subquery',
  executionCostFactorAnalyticFunctions: 'Hàm Phân tích',
  executionCostFactorDialectOverhead: 'Chi phí Phương ngữ',
  executionCostFactorStandardIndexing: 'Lập chỉ mục Tiêu chuẩn',
  executionCostNoteJoinDepth: 'join(s) được phát hiện',
  executionCostNoteSubqueryNesting: 'Độ sâu tối đa ~',
  executionCostNoteAnalyticFunctions: 'Mệnh đề OVER()',
  executionCostNoteDialectOverhead: 'bộ tối ưu hóa được giả định',
  executionCostNoteStandardIndexing: 'Giả định B-tree indexes tiêu chuẩn trên các cột join',
  executionCostRecommendationLow: 'Truy vấn nhẹ nhàng. Lập chỉ mục tiêu chuẩn sẽ xử lý tốt.',
  executionCostRecommendationMedium:
    'Hãy xem xét lại thứ tự join. Đảm bảo các cột được lập chỉ mục được sử dụng trong điều kiện ON.',
  executionCostRecommendationHigh:
    'Phát hiện độ phức tạp cao. Hãy xem xét chia nhỏ thành các truy vấn nhỏ hơn hoặc sử dụng CTE vật chất hóa.',
  executionCostRecommendationSuperHigh:
    'Độ phức tạp khủng hoảng. Truy vấn này có thể gây quét bảng đầy đủ. Khuyến cáo mạnh mẽ phân rã truy vấn và xem xét chỉ mục.',

  // Common

  copy: 'Sao chép',
  copied: 'Đã sao chép!',
  close: 'Đóng',
  expand: 'Mở rộng',
  collapse: 'Thu gọn',
  noData: 'Không có dữ liệu',
  loading: 'Đang tải...',
  success: 'Thành công',
  cancel: 'Hủy',
  confirm: 'Xác nhận',
  reset: 'Đặt lại',
  save: 'Lưu',

  // Smart SQL Editor Demo
  demoTitle: '🚀 Trình soạn thảo SQL thông minh Demo',
  demoSubtitle: 'Soạn thảo SQL mạnh mẽ với xác thực thời gian thực, định dạng và tối ưu hóa AI',
  demoLoadSampleQueryLabel: '📋 Tải truy vấn mẫu:',
  demoQuerySimple: '✨ Đơn giản',
  demoQueryWithJoin: '🔗 Với JOIN',
  demoQueryWithCTE: '📦 Với CTE',
  demoQueryComplex: '🎯 Phức tạp',
  demoProTipsTitle: '💡 Mẹo hữu ích:',
  demoProTip1: 'Nhập hoặc dán SQL và xem xác thực thời gian thực (debounce 500ms)',
  demoProTip2: 'Nhấp "Định dạng SQL" để làm đẹp với từ khóa viết hoa',
  demoProTip3: 'Nhấp "Phân tích & Tối ưu hóa" để nhận các gợi ý AI (yêu cầu Ollama chạy cục bộ)',
  demoProTip4: 'Nhấp "So sánh" để xem diff của bản gốc so với đã tối ưu hóa',
  demoProTip5: 'Mở DevTools (F12) Console để xem các bản ghi gỡ lỗi chi tiết',
  demoSetupTitle: '🛠️ Hướng dẫn thiết lập',
  demoInstallDepsLabel: 'Cài đặt các phụ thuộc:',
  demoInstallDepsCmd: 'npm install monaco-editor sql-formatter',
  demoStartOllamaLabel: 'Khởi động Ollama (để tối ưu hóa AI):',
  demoStartOllamaCmd: 'ollama run mistral',
  demoTestInDemoLabel: 'Kiểm tra trong demo này hoặc tích hợp vào bảng điều khiển của bạn',
  demoFeaturesTitle: '✨ Các tính năng chính',
  demoFeature1: 'Xác thực cú pháp thời gian thực (dt-sql-parser)',
  demoFeature2: 'Định dạng SQL (sql-formatter với tùy chọn MySQL)',
  demoFeature3: 'Xem diff để so sánh trước/sau',
  demoFeature4: 'Tối ưu hóa AI với Ollama LLM cục bộ',
  demoFeature5: 'Những hiểu biết về hiệu suất và khuyến nghị',
  demoFeature6: 'Xử lý lỗi và ghi nhật ký toàn diện',
  demoMoreInfoLabel: '📚 Để xem hướng dẫn thiết lập và tài liệu API chi tiết, xem',
  demoMoreInfoFile: 'SMART_SQL_EDITOR_SETUP.md',

  // Smart SQL Editor
  smartEditorTitle: 'Trình soạn thảo SQL thông minh',
  formatSqlButton: '📝 Định dạng SQL',
  formatSqlTitle: 'Định dạng SQL với từ khóa viết hoa',
  compareButton: '🔀 So sánh',
  backToEditorButton: '🔀 Quay lại Trình soạn thảo',
  toggleDiffTitle: 'Chuyển đổi giữa chế độ đơn và chế độ diff',
  analyzeOptimizeButton: '🤖 Phân tích & Tối ưu hóa',
  analyzeOptimizeTitle: 'Phân tích và tối ưu hóa SQL bằng AI',
  analyzingLabel: 'Đang phân tích...',
  syntaxErrorsTitle: '❌ Lỗi cú pháp:',
  optimizationResultsTitle: '✅ Kết quả tối ưu hóa',
  estimatedRowsLabel: '📊 Số hàng ước tính:',
  performanceNotesLabel: '⚡ Ghi chú về hiệu suất:',
  businessChangesLabel: '🔄 Thay đổi kinh doanh:',
  diffViewStatus: '🔀 Chế độ Diff',
  singleEditorStatus: '✏️ Trình soạn thảo đơn',
  syntaxErrorsStatus: 'Lỗi cú pháp:',
  processingStatus: '⏳ Đang xử lý...',
  formattingError: 'Lỗi định dạng:',
  diffViewErrorTitle: 'Lỗi chế độ diff:',
  ollamaConnectionError:
    'Không thể kết nối với API Ollama. Hãy chắc chắn rằng nó đang chạy trên http://localhost:11434',
} as const;

export default vi;
