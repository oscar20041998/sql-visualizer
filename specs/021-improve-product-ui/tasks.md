---
description: "Danh sách công việc cải thiện giao diện SQL Visualizer bằng Hallmark"
---

# Tasks: Cải thiện giao diện sản phẩm với Hallmark

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [hợp đồng UI](./contracts/ui-behavior.md), [quickstart.md](./quickstart.md)

**Tổ chức**: Theo user story, với [test-list.md](./tdd/test-list.md) là danh mục kiểm thử bắt buộc. Người dùng đã chấp thuận ngoại lệ TDD chỉ cho characterization bảo toàn hành vi hiện có: ghi baseline xanh thật, không cố tạo đỏ. Hành vi giao diện mới vẫn cần kiểm thử trước, RED đúng nguyên nhân, GREEN và REFACTOR; trường hợp thủ công hoặc thiếu runner được báo riêng, không bịa bằng chứng.

## Format: `[ID] [P?] [Story] Description`

- `[P]`: Có thể thực hiện song song với các task `[P]` cùng nhóm sau khi hoàn tất các phụ thuộc; các task này không sửa cùng tệp.
- `[US1]`, `[US2]`, `[US3]`: User story tương ứng trong đặc tả.
- Không đổi nghiệp vụ, route, phân quyền, lưu trữ, nội dung, ngôn ngữ hoặc cấu trúc điều hướng; không xóa cây route hay thành phần khi chưa được người dùng chấp thuận.
- Bằng chứng dùng fixture/dữ liệu giả; không lưu truy vấn nhạy cảm, thông tin đăng nhập, token hoặc hội thoại thực.

## Phase 1: Setup

**Purpose**: Xác nhận môi trường và chuẩn bị kiểm chứng, không thay đổi sản phẩm.

- [X] T001 Kiểm tra Hallmark 2.0.0, tài liệu và các script cần thiết trong `.github/skills/hallmark/SKILL.md`, `.github/skills/hallmark/references/redesign.md` và `.github/skills/hallmark/scripts/`; nạp skill mới trong phiên thực hiện.
- [X] T002 [P] Kiểm tra Node, phụ thuộc hiện có và lệnh chạy trong `package.json` và `specs/021-improve-product-ui/quickstart.md`; chỉ cài lại khi lệnh xác nhận thiếu phụ thuộc.
- [X] T003 [P] Kiểm tra môi trường browser, AI, đăng nhập và lưu trữ theo `specs/021-improve-product-ui/contracts/ui-behavior.md`; ghi điều kiện và giới hạn vào `specs/021-improve-product-ui/environment-evidence.json`, không ghi bí mật.
- [X] T004 Đối chiếu phạm vi, nguyên tắc và danh sách đường dẫn thực tế trong `specs/021-improve-product-ui/plan.md`, `.specify/memory/constitution.md` và `src/app/`; công bố danh sách tệp dự kiến sửa trước khi sửa code.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Chụp baseline toàn sản phẩm và xác lập hệ trình bày chung trước mọi thay đổi giao diện.

- [ ] T005 [P] Lập `specs/021-improve-product-ui/baseline-inventory.json` theo `specs/021-improve-product-ui/data-model.md` và `specs/021-improve-product-ui/contracts/ui-behavior.md`: kiểm kê mọi route, màn hình, hành động, kết quả, trạng thái, vai trò, quyền, locale, theme, màu nhấn, lưu/khôi phục và điều kiện dịch vụ thực tế; gán ID và đánh dấu mục không quan sát được.
- [ ] T006 [P] Trước T009, chạy các kiểm thử bảo toàn liên quan trong `specs/021-improve-product-ui/tdd/test-list.md`, bổ sung characterization còn thiếu cho mọi bề mặt có thể bị ảnh hưởng bởi token chung; chạy baseline Vitest và type-check theo `specs/021-improve-product-ui/quickstart.md`, ghi lệnh, kết quả và lỗi có sẵn vào `specs/021-improve-product-ui/baseline-tests.json`. Với hành vi mới bị T009 tác động, viết kiểm thử trước và ghi RED hợp lệ hoặc đánh dấu bị chặn.
- [ ] T007 [P] Ghi nhận màn hình và thao tác gốc với dữ liệu giả tại 320, 375, 414, 768 px và desktop theo `specs/021-improve-product-ui/contracts/ui-behavior.md`; lưu đường dẫn bằng chứng và giới hạn vào `specs/021-improve-product-ui/baseline-visual.json`.
- [ ] T008 Sau T005–T007, thực hiện pre-flight Hallmark trên `src/styles/tailwind.css`, `src/app/layout.tsx` và `tailwind.config.js`; hỏi một lần về tư liệu, đối tượng, việc sử dụng và tông theo Hallmark, ghi câu trả lời hoặc suy luận vào `.hallmark/preflight.json`, và công bố hướng cùng các tệp dự kiến sửa.
- [ ] T009 Sau T005–T008 và kiểm thử trước thay đổi theo `specs/021-improve-product-ui/tdd/test-list.md`, cải thiện token và nền trình bày chung tại `src/styles/tailwind.css` và `tailwind.config.js`, giữ directives, font, hai theme, các biến ngữ nghĩa và màu nhấn động; đối chiếu tích hợp hiện tại trong `src/components/AppLayout.tsx` và `src/components/ThemeProvider.tsx`.

**Checkpoint**: T005–T008 phải hoàn tất trước khi sửa UI; T009 hoàn tất trước các story. Mục baseline bị chặn phải ghi lý do và không được tính là đã kiểm chứng.

---

## Phase 3: User Story 1 - Không gian phân tích SQL (Priority: P1) 🎯 MVP kỹ thuật

**Goal**: Cải thiện giao diện nhập, chỉnh sửa và khám phá phân tích SQL mà không thay đổi kết quả hoặc thao tác hiện có.

**Independent Test**: Với cùng SQL và MyBatis thử nghiệm, đối chiếu trước/sau thao tác nhập, định dạng, phân tích, cập nhật khi sửa, graph/JOIN/CTE và nhảy dòng; kết quả và hành vi phải tương đương.

### Tests for User Story 1

- [ ] T010 [P] [US1] Bắt buộc chạy kiểm thử regression nhập SQL/MyBatis, chỉnh sửa và phản hồi phân tích trong `tests/unit/query-input-workflow.test.tsx` và `tests/unit/query-input-analysis-state.test.tsx`; bổ sung trường hợp thiếu theo A1, A3, A13, U1–U2 trong `specs/021-improve-product-ui/tdd/test-list.md` và ghi baseline trước sửa.
- [ ] T011 [P] [US1] Bắt buộc chạy kiểm thử tương tác graph, bố cục, hiển thị và nhảy nguồn trong `tests/unit/relationshipGraphPage.test.tsx` và `tests/unit/relationshipGraphIdentity.test.tsx`; bổ sung trường hợp thiếu theo A2, U3 trong `specs/021-improve-product-ui/tdd/test-list.md` và ghi baseline trước sửa.
- [ ] T012 [P] [US1] Bắt buộc chạy kiểm thử kết quả chỉ số, trạng thái và điều hướng dòng nguồn trong `tests/unit/sqlMetricsDashboard.test.tsx` và `tests/unit/complexitySurfaces.baseline.test.tsx`; bổ sung trường hợp thiếu theo A2, U4 trong `specs/021-improve-product-ui/tdd/test-list.md` và ghi baseline trước sửa.

### Implementation for User Story 1

- [X] T013 [US1] Cải thiện bố cục và thứ bậc của `src/app/query-input/page.tsx` cùng các thành phần nhập SQL/MyBatis trong `src/app/query-input/components/`, ngoại trừ `CodeGeneratorPanel.tsx` thuộc T025; giữ callback, tab, dữ liệu, nhãn, lỗi và luồng phân tích.
- [X] T014 [P] [US1] Cải thiện trình bày `src/app/smart-sql-editor/page.tsx`, `src/app/smart-sql-editor/components/SmartSQLEditor.tsx` và `src/app/smart-sql-editor/components/FormatErrorPanel.tsx`, giữ chỉnh sửa, định dạng, cảnh báo, trạng thái lỗi và điều hướng dòng.
- [X] T015 [P] [US1] Cải thiện trình bày `src/app/relationship-graph-visualizer/page.tsx` và `src/app/relationship-graph-visualizer/components/`, giữ node/edge, tương tác, bộ lọc, bố cục, xuất và liên kết nguồn.
- [X] T016 [P] [US1] Cải thiện trình bày `src/app/sql-metrics-dashboard/page.tsx`, `src/app/sql-metrics-dashboard/components/`, `src/app/cte-analysis/page.tsx` và `src/app/cte-analysis/components/`, giữ chỉ số, JOIN/CTE, drill-down và nhảy dòng.
- [ ] T017 [US1] Đối chiếu các ID US1 trong `specs/021-improve-product-ui/baseline-inventory.json` với cùng đầu vào, dialect và quyền; ghi kết quả và bằng chứng vào `specs/021-improve-product-ui/us1-comparison.json`, bao gồm SQL rỗng, lỗi, SQL dài và MyBatis.
- [ ] T018 [US1] Chạy lại các kiểm thử ở T010–T012 và các kiểm thử trực tiếp liên quan tới tệp đã sửa; ghi kết quả vào `specs/021-improve-product-ui/us1-comparison.json` và sửa regression do thay đổi.

**Checkpoint**: US1 kiểm thử độc lập; đây chỉ là lát cắt để trình diễn nội bộ, chưa phải phát hành toàn bộ feature khi US2/US3 chưa đạt.

---

## Phase 4: User Story 2 - Tiếp tục sử dụng toàn bộ sản phẩm (Priority: P1)

**Goal**: Cải thiện các bề mặt còn lại và giữ nguyên mọi tính năng, quyền, dữ liệu và trạng thái hiện có.

**Independent Test**: Đối chiếu từng mục trong danh mục baseline cho đăng nhập, điều hướng, cài đặt, lịch sử, AI, so sánh, sinh mã, xuất và tài liệu với cùng dữ liệu và điều kiện.

### Tests for User Story 2

- [ ] T019 [P] [US2] Bắt buộc chạy kiểm thử điều hướng/phiên/quyền và tùy chọn trong `tests/unit/AppLayout.test.tsx`, `tests/unit/SignInPage.test.tsx` và `tests/unit/home-preferences.test.tsx`; bổ sung trường hợp thiếu theo A18, A20, U5, U10 trong `specs/021-improve-product-ui/tdd/test-list.md` và ghi baseline trước sửa.
- [ ] T020 [P] [US2] Bắt buộc chạy kiểm thử so sánh, stale, sinh mã và cảnh báo trong `tests/unit/query-input-sql-comparison.test.tsx`, `tests/unit/sqlComparisonPanel.test.tsx` và `tests/unit/codegen/CodeGeneratorPanel.test.tsx`; bổ sung trường hợp thiếu theo A16–A17, U6–U7 trong `specs/021-improve-product-ui/tdd/test-list.md` và ghi baseline trước sửa.
- [ ] T021 [P] [US2] Bắt buộc chạy kiểm thử lịch sử, khôi phục và trạng thái AI trong `tests/unit/dbAssistantHistoryPanel.test.tsx` và `tests/unit/dbAssistantChatHistoryStorage.test.ts`; bổ sung trường hợp thiếu theo A5, A14, A19, U8 trong `specs/021-improve-product-ui/tdd/test-list.md` và ghi baseline trước sửa.

### Implementation for User Story 2

- [X] T022 [US2] Cải thiện shell và điều hướng tại `src/components/AppLayout.tsx`, `src/components/Sidebar.tsx`, `src/components/ThemeProvider.tsx` và `src/app/settings-preferences/`, giữ session, đường dẫn, locale, theme, màu nhấn và trạng thái điều hướng.
- [X] T023 [P] [US2] Cải thiện trang công khai và đăng nhập tại `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/oauth/callback/page.tsx` và `src/components/auth/`, giữ nội dung, callback và các điều kiện truy cập thực tế.
- [X] T024 [P] [US2] Cải thiện trình bày AI và lịch sử tại `src/app/database-ai-assistant/`, `src/components/GlobalChat.tsx`, `src/components/ui/QueryHistoryPanel.tsx` và `src/app/smart-sql-editor/components/AiSqlExplainer.tsx`, giữ streaming, nguồn, lỗi, lưu/khôi phục và quyền hiện có.
- [X] T025 [P] [US2] Cải thiện `src/app/smart-sql-editor/components/SqlComparisonPanel.tsx` và `src/app/query-input/components/CodeGeneratorPanel.tsx`, giữ baseline, stale, kết quả, cảnh báo, sao chép và tải xuống; không thực hiện thêm yêu cầu tính năng AI Compare.
- [X] T026 [P] [US2] Cải thiện các bề mặt tài liệu tại `src/app/guideline/`, `src/app/confluence/`, `src/app/readme/` và `src/components/ui/DocumentationLayout.tsx`, giữ văn bản, liên kết, ngôn ngữ và hành động.
- [ ] T027 [US2] Kiểm tra các route/thành phần còn lại theo `specs/021-improve-product-ui/baseline-inventory.json`, sửa trình bày trong các tệp tương ứng dưới `src/app/` và `src/components/` nếu cần; chạy T019–T021 và ghi đối chiếu mọi mục US2 vào `specs/021-improve-product-ui/us2-comparison.json`.

**Checkpoint**: US2 được kiểm tra độc lập bằng danh mục; không suy diễn tính năng guest hoặc tính năng chưa hoàn thành từ tài liệu.

---

## Phase 5: User Story 3 - Dễ đọc và dễ thao tác (Priority: P2)

**Goal**: Bảo đảm giao diện cải thiện dùng được trên màn hình nhỏ, bằng bàn phím và khi giảm chuyển động.

**Independent Test**: Thực hiện các hành trình chính tại 320, 375, 414, 768 px và desktop; kiểm tra không tràn toàn trang, focus, bàn phím, giảm chuyển động, light/dark và màu nhấn.

### Tests for User Story 3

- [ ] T028 [P] [US3] Bắt buộc chạy kiểm thử nhãn điều khiển, focus và các trạng thái áp dụng trong `tests/unit/SignInPage.axe.test.tsx` và `tests/unit/AppLayout.test.tsx`; bổ sung trường hợp thiếu theo A9, U9 trong `specs/021-improve-product-ui/tdd/test-list.md`; jsdom không được dùng làm bằng chứng bố cục.
- [ ] T029 [P] [US3] Kiểm tra browser trên tất cả viewport yêu cầu với SQL dài, biểu đồ lớn, bảng rộng và thông báo dài; ghi phát hiện vào `specs/021-improve-product-ui/responsive-evidence.json`.

### Implementation for User Story 3

- [ ] T030 [US3] Khắc phục vấn đề bố cục, focus, tương phản và giảm chuyển động được T028–T029 xác nhận tại `src/styles/tailwind.css`, `src/components/` và các tệp route được nêu trong bằng chứng; giữ cuộn nội bộ editor/bảng/graph.
- [ ] T031 [US3] Chạy lại kiểm thử T028 và kiểm tra browser các hành trình trong `specs/021-improve-product-ui/contracts/ui-behavior.md`; ghi 100% viewport, bàn phím, focus, giảm chuyển động, theme và màu nhấn vào `specs/021-improve-product-ui/responsive-evidence.json`.
- [ ] T032 [US3] Tổ chức đánh giá với ít nhất 5 người dùng mục tiêu cho hành trình phân tích, ghi số người xác định hành động chính, hoàn thành không hướng dẫn và đánh giá dễ hiểu trong `specs/021-improve-product-ui/usability-evidence.json`; đạt khi ít nhất 4 người thỏa cả ba điều kiện.

**Checkpoint**: Nếu không có browser, điều kiện tiếp cận hoặc người dùng thử, ghi bị chặn và không đánh dấu SC-003–SC-005 đạt.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Kiểm chứng toàn bộ feature, không mở rộng chức năng.

- [ ] T033 Đối chiếu từng ID trong `specs/021-improve-product-ui/baseline-inventory.json` với `specs/021-improve-product-ui/us1-comparison.json` và `specs/021-improve-product-ui/us2-comparison.json`; xác nhận 100% đạt hoặc ghi các mục bị chặn/không đạt, bao gồm mọi route và trạng thái ngoài hai nhóm chính.
- [X] T034 [P] Chạy kiểm thử liên quan và `npm run type-check` theo `specs/021-improve-product-ui/quickstart.md`, rồi chạy `npm run build`; ghi lệnh, kết quả và chênh lệch baseline vào `specs/021-improve-product-ui/final-test-evidence.json`.
- [ ] T035 [P] Đo phân tích độ phức tạp và biểu đồ cho truy vấn trên 50 bảng theo `.specify/memory/constitution.md` trên máy một GPU, đối chiếu baseline và ngưỡng dưới 1 giây; ghi kết quả hoặc lý do bị chặn vào `specs/021-improve-product-ui/performance-evidence.json`.
- [X] T036 Thực hiện kiểm tra Hallmark 2.0.0 theo `.github/skills/hallmark/SKILL.md` và `.github/skills/hallmark/references/redesign.md` trên các bề mặt đã thay đổi; ghi lệnh, bằng chứng, lỗi và giới hạn thực tế vào `specs/021-improve-product-ui/hallmark-evidence.json`, không tự tuyên bố pass.
- [ ] T037 Cập nhật tài liệu giao diện liên quan trong `README.md` và `README_VI.md` nếu cách sử dụng được trình bày cần thay đổi; giữ mô tả tính năng và trạng thái phát hành chính xác.
- [ ] T038 Tổng hợp FR-001–FR-011 và SC-001–SC-005, bằng chứng T033–T037, sự cố chưa giải quyết và tiêu chí bị chặn vào `specs/021-improve-product-ui/acceptance-evidence.json`; chỉ kết luận hoàn thành khi mọi cổng bắt buộc đạt.

---

## Dependencies & Execution Order

### Phase Dependencies

1. Phase 1 → Phase 2; T005–T007 có thể thực hiện song song sau Phase 1, T008 chờ cả ba, T009 chờ T008.
2. US1 và US2 phụ thuộc Phase 2; cả hai cùng ưu tiên P1. Để tránh xung đột, không sửa đồng thời cùng tệp; T013 và T025 dùng các tệp khác nhau, nhưng cần phối hợp khi tích hợp trang query input.
3. US3 phụ thuộc hoàn tất các thay đổi US1 và US2 vì kiểm tra và sửa khả năng tiếp cận trên toàn bộ bề mặt; tiêu chí của US3 vẫn kiểm tra độc lập.
4. Phase 6 phụ thuộc US1–US3. T034 và T035 có thể chạy song song sau khi mã ổn định; T038 chờ T033–T037.
5. Kiểm thử regression ở T010–T012, T019–T021 và T028 ghi baseline trước phần sửa tương ứng. Nếu một điều kiện không thể thực hiện, ghi `bị chặn` và không tuyên bố nghiệm thu đạt.
6. Trước T009, T006 phải bao phủ các hành vi bị ảnh hưởng bởi token chung, kể cả các trường hợp thuộc story sau. Lặp lại các task story theo test list trước thay đổi riêng; hành vi mới cần RED hợp lệ trước khi sửa code. Characterization xanh ngay dùng ngoại lệ người dùng đã chấp thuận, ghi trong `specs/021-improve-product-ui/tdd/test-list.md` và cycle log.

### User Story Dependencies

- **US1 (P1)**: Sau Phase 2; không phụ thuộc US2.
- **US2 (P1)**: Sau Phase 2; không phụ thuộc kết quả US1, nhưng phối hợp khi cùng đụng tích hợp.
- **US3 (P2)**: Sau US1 và US2 để kiểm chứng toàn bộ bề mặt cuối cùng.

### Parallel Opportunities

- **US1**: T010, T011 và T012 độc lập; sau baseline, T014, T015 và T016 chỉnh các nhóm tệp khác nhau. T013 không chạy cùng T025 nếu phải thay đổi tích hợp chung.
- **US2**: T019, T020 và T021 độc lập; T023, T024, T025 và T026 có thể thực hiện song song khi không sửa cùng tệp hoặc chia sẻ trạng thái đang chỉnh.
- **US3**: T028 và T029 độc lập sau US1/US2; T030 chờ cả hai và T031 chờ T030. T032 có thể chuẩn bị sau khi giao diện ổn định nhưng không ghi đạt khi chưa có người tham gia.

## Implementation Strategy

### MVP First

1. Hoàn tất Phase 1–2, nhất là kiểm kê baseline trước sửa.
2. Hoàn tất US1 và kiểm tra độc lập; chỉ trình diễn nội bộ vì yêu cầu bảo toàn toàn sản phẩm vẫn cần US2/US3.

### Incremental Delivery

1. Sau baseline, thực hiện US1 và US2 trên các nhóm tệp không xung đột.
2. Hoàn tất US3 và đối chiếu toàn bộ danh mục.
3. Hoàn thành Phase 6; không phát hành hoặc tuyên bố toàn bộ yêu cầu đạt khi kiểm thử, Hallmark, hiệu năng hay đánh giá người dùng còn bị chặn.
