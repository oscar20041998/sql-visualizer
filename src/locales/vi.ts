const vi = {
  // App
  appName: 'SQLVisualizer',
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
  clearButton: 'Xóa',
  loadSample: 'Tải mẫu',
  resolvedPreviewTitle: 'Xem trước SQL đã giải quyết',
  resolvedPreviewEmpty: 'SQL đã giải quyết sẽ hiển thị ở đây khi bạn điền tham số',
  charCount: 'ký tự',
  linesCount: 'dòng',

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
  complexityScore: 'Điểm phức tạp',
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
  fieldOrigin: 'Nguồn gốc',
  fieldType: 'Loại',
  originCTE: 'CTE',
  originTable: 'Bảng',
  originExpression: 'Biểu thức',
  copySQL: 'Sao chép SQL',
  expandAll: 'Mở rộng tất cả',
  collapseAll: 'Thu gọn tất cả',
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
  guidelineSubtitle: 'Tất cả những gì bạn cần để tận dụng tối đa SQLVisualizer',
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
    'SQLVisualizer cung cấp năm công cụ tích hợp cùng nhau để phân tích, trực quan hóa và tối ưu hóa truy vấn SQL của bạn. Sử dụng chúng riêng lẻ hoặc như một quy trình hoàn chỉnh.',
  guidelineToolsQueryInputName: 'Nhập truy vấn và cấu hình',
  guidelineToolsQueryInputDesc:
    'Điểm bắt đầu cho tất cả phân tích. Dán SQL thô hoặc nhập tệp MyBatis XML có hỗ trợ tham số động.',
  guidelineToolsQueryInputFeatures: 'Chế độ nhập kép • Hỗ trợ đa phương ngữ (MySQL, PostgreSQL, SQL Server, Oracle) • Tùy chọn phân tích tự động • Truy vấn mẫu • Bộ đếm ký tự/dòng',
  guidelineToolsGraphName: 'Trực quan hóa biểu đồ quan hệ',
  guidelineToolsGraphDesc:
    'Trực quan hóa tương tác các mối quan hệ giữa các bảng. Một cách nhanh chóng xem các bảng nào kết hợp với nhau và cách dữ liệu chảy qua truy vấn của bạn.',
  guidelineToolsGraphFeatures: 'Nút tương tác • Các loại JOIN được mã hóa màu • Nhiều tùy chọn bố cục • Xuất biểu đồ Mermaid • Điều hướng MiniMap • Xuất CSV của bảng',
  guidelineToolsMetricsName: 'Bảng điều khiển số liệu',
  guidelineToolsMetricsDesc:
    'Định lượng độ phức tạp của truy vấn với các số liệu khách quan. Hiểu tác động hiệu suất trước khi thực thi và nhận các khuyến nghị tối ưu hóa cụ thể.',
  guidelineToolsMetricsFeatures: 'Gauge độ phức tạp (0-100) • Phân tích theo yếu tố (JOIN, truy vấn con, hàm) • Ước tính chi phí thực thi • Khuyến nghị từng yếu tố • Tooltip tương tác',
  guidelineToolsCTEName: 'Phân tích CTE',
  guidelineToolsCTEDesc:
    'Phân tích sâu sắc Common Table Expressions. Xem cấu trúc CTE, phụ thuộc, nguồn gốc trường và xác định các CTE không sử dụng hoặc có vấn đề.',
  guidelineToolsCTEFeatures: 'Phát hiện & liệt kê CTE • Cờ CTE đệ quy/không sử dụng • Ánh xạ nguồn gốc trường • Phân tích truy vấn con lồng nhau • Sao chép SQL CTE • Mở rộng/Thu gọn hàng loạt',
  guidelineToolsSettingsName: 'Cài đặt và tùy chọn',
  guidelineToolsSettingsDesc:
    'Tùy chỉnh ứng dụng theo tùy chọn của bạn. Kiểm soát giao diện, ngôn ngữ, kiểu trực quan hóa biểu đồ và hành vi phân tích.',
  guidelineToolsSettingsFeatures: 'Chủ đề tối/sáng • Chuyển đổi ngôn ngữ EN/VI • Tùy chọn bố cục biểu đồ (Dagre/Force/Grid) • Lựa chọn kiểu cạnh • Bật tắt phân tích tự động',
  guidelineToolsWorkflowTitle: 'Quy trình công việc thông thường',
  guidelineToolsWorkflowQuickAudit: 'Kiểm tra nhanh (5 phút)',
  guidelineToolsWorkflowQuickAuditDesc: 'Dán truy vấn → Kiểm tra số liệu → Xem xét phân tích CTE',
  guidelineToolsWorkflowDeepAnalysis: 'Phân tích sâu (15 phút)',
  guidelineToolsWorkflowDeepAnalysisDesc: 'Dán truy vấn → Khám phá biểu đồ → Xem xét số liệu → Xuất biểu đồ và bảng',
  guidelineToolsWorkflowOptimization: 'Công việc tối ưu hóa (30+ phút)',
  guidelineToolsWorkflowOptimizationDesc: 'Số liệu cơ sở → Xác định nút thắt → Tối ưu hóa → So sánh cải thiện → Xuất kết quả',
  guidelineToolsWorkflowTeamReview: 'Xem xét nhóm (20 phút)',
  guidelineToolsWorkflowTeamReviewDesc: 'Tải truy vấn → Xuất Mermaid → Thảo luận trong cuộc họp → Xem xét nguồn gốc CTE → Tài liệu',
  guidelineToolsExportTitle: 'Xuất & Tích hợp',
  guidelineToolsExportCSV: 'Xuất CSV (Bảng)',
  guidelineToolsExportCSVDesc: 'Xuất phần Bảng được trích xuất để phân tích bảng tính hoặc tài liệu cơ sở dữ liệu.',
  guidelineToolsExportMermaid: 'Biểu đồ Mermaid',
  guidelineToolsExportMermaidDesc: 'Sao chép cú pháp biểu đồ Mermaid đầy đủ vào khay nhớ tạm. Dán vào các công cụ render Mermaid, wiki hoặc tài liệu.',
  guidelineToolsExportCTESQL: 'Sao chép SQL CTE',
  guidelineToolsExportCTESQLDesc: 'Sao chép các phần CTE riêng lẻ để sử dụng lại trong các truy vấn khác hoặc tối ưu hóa CTE độc lập.',
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
} as const;

export default vi;
