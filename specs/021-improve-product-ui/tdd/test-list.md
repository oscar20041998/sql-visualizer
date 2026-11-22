---
feature: 021-improve-product-ui
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 9
planned_at: a7935aa
updated_at: a7935aa
suite_baseline: unknown
---

# Test List: Cải thiện giao diện sản phẩm với Hallmark

**Trạng thái**: Các acceptance behavior A1–A23 vẫn chờ đối chiếu runtime; U1–U9 có baseline unit/component xanh trong lần tiếp tục triển khai gần nhất, U10 có kiểm thử component xanh. `PENDING` không phải bằng chứng pass/fail. `US1-AS1` nghĩa là User Story 1, Acceptance Scenario 1 trong [spec.md](../spec.md).

**Ngoại lệ đã được người dùng chấp thuận ngày 2026-11-21**: Kiểm thử characterization bảo toàn hành vi đã tồn tại có thể xanh ngay trên baseline; ghi lệnh và kết quả thật, không cố tình phá chức năng để tạo đỏ. Ngoại lệ chỉ áp dụng cho hành vi đã có, không áp dụng cho hành vi giao diện mới. Với hành vi mới có thể kiểm thử tự động, ghi RED đúng nguyên nhân trước thay đổi, sau đó GREEN và REFACTOR. Trường hợp thủ công hoặc không có runner phù hợp phải ghi rõ phương pháp và trạng thái bị chặn khi không có bằng chứng; không bịa pha RED.

**Quy tắc**: Trước khi T009 hoặc bất kỳ thay đổi giao diện nào ảnh hưởng một hành vi, chạy và ghi baseline thật của mọi kiểm thử bảo toàn liên quan; bổ sung kiểm thử còn thiếu trước thay đổi. Với hành vi mới, viết kiểm thử có thể chạy và ghi RED hợp lệ trước thay đổi. Các hành trình browser thủ công và đánh giá người dùng là cổng nghiệm thu riêng, không được thay bằng jsdom. Các test case dạng ma trận cần được mở rộng thành từng ID mục kiểm kê của T005; mục thiếu bằng chứng không tính đạt.

## Outer loop: acceptance behaviors

| id | behavior | traces | kind | layer | state | test / evidence |
|---|---|---|---|---|---|---|
| A1 | Với SQL hợp lệ, kết quả phân tích và thao tác trên kết quả khớp baseline. | US1-AS1, FR-003, FR-004, SC-002 | example | E2E thủ công + component | PENDING | T005, T010, T017–T018; `tests/unit/query-input-workflow.test.tsx`; `us1-comparison.json` |
| A2 | Tương tác graph, JOIN, CTE và đi tới dòng nguồn cho kết quả như baseline. | US1-AS2, FR-004, SC-002 | example | E2E thủ công + component | PENDING | T011–T012, T017–T018; `tests/unit/relationshipGraphPage.test.tsx`; `us1-comparison.json` |
| A3 | Khi sửa SQL hoặc nhập MyBatis XML, phản hồi cập nhật như baseline mà không mất nội dung. | US1-AS3, FR-004 | example | integration + E2E thủ công | PENDING | T010, T017–T018; `tests/unit/query-input-analysis-state.test.tsx`; `us1-comparison.json` |
| A4 | Mỗi chức năng đang có vẫn truy cập và cho cùng hành vi, dữ liệu, kết quả với cùng vai trò và điều kiện. | US2-AS1, FR-003, FR-005, FR-010, SC-001, SC-002 | example | E2E thủ công | PENDING | T005, T019–T021, T027, T033; `baseline-inventory.json`; `us2-comparison.json` |
| A5 | Dữ liệu và tùy chọn đã lưu được khôi phục với cùng phạm vi truy cập sau khi mở lại. | US2-AS2, FR-003, FR-005, FR-010 | example | integration + E2E thủ công | PENDING | T019, T021, T027; `tests/unit/dbAssistantChatHistoryStorage.test.ts`; `us2-comparison.json` |
| A6 | Các trạng thái đang tải, lỗi, vô hiệu hóa và rỗng vẫn hiển thị thông tin và hành động tương ứng. | US2-AS3, FR-006, FR-007 | example | component + E2E thủ công | PENDING | T005, T019–T021, T027; `us2-comparison.json` |
| A7 | Nhãn, thứ bậc và trạng thái trên các bề mặt được trình bày rõ và nhất quán. | US3-AS1, FR-001, FR-006, FR-007 | example | E2E thủ công | PENDING | T007, T029–T031, T036; `responsive-evidence.json`; `hallmark-evidence.json` |
| A8 | Ở 320, 375, 414, 768 px và desktop, hành trình chính không tràn ngang toàn trang hoặc cắt điều khiển thiết yếu; vùng chuyên biệt vẫn cuộn được. | US3-AS2, FR-008, SC-003 | example | E2E thủ công | PENDING | T007, T029–T031; `responsive-evidence.json` |
| A9 | Mỗi điều khiển tương tác trong hành trình chính dùng được bằng bàn phím và có focus nhìn thấy. | US3-AS3, FR-009, SC-004 | example | component + E2E thủ công | PENDING | T028, T031; `tests/unit/SignInPage.axe.test.tsx`; `responsive-evidence.json` |
| A10 | Bật giảm chuyển động không cản trở hoàn thành hành trình chính. | US3-AS3, FR-009, SC-004 | example | E2E thủ công | PENDING | T029–T031; `responsive-evidence.json` |
| A11 | Danh mục trước thay đổi ghi đủ từng bề mặt, hành động, trạng thái và quyền được phát hiện, có ID và bằng chứng hoặc lý do bị chặn. | FR-002 | example | integration thủ công | PENDING | T005; `baseline-inventory.json` |
| A12 | Mọi mục danh mục được đối chiếu; chỉ kết luận SC-001 đạt khi 100% mục có kết quả đạt. | FR-002, FR-003, SC-001 | example | integration thủ công | PENDING | T033, T038; `acceptance-evidence.json` |
| A13 | SQL rỗng, lỗi hoặc không được hỗ trợ vẫn hiển thị cảnh báo và lựa chọn xử lý như baseline. | FR-003, FR-004, FR-006 | example | integration + E2E thủ công | PENDING | T010, T017; `tests/unit/query-input-workflow.test.tsx`; `us1-comparison.json` |
| A14 | Khi AI hoặc lưu trữ không khả dụng, thông báo và cách phục hồi khớp baseline. | FR-003, FR-005, FR-006 | example | integration + E2E thủ công | PENDING | T021, T027; `tests/unit/dbAssistantChatHistoryStorage.test.ts`; `us2-comparison.json` |
| A15 | Các tính năng chưa hoàn thành giữ nguyên trạng thái và quyền thực tế, không được thể hiện là đã hoàn thành. | FR-011 | example | E2E thủ công | PENDING | T005, T019, T027; `baseline-inventory.json`; `us2-comparison.json` |
| A16 | So sánh SQL giữ baseline, kết quả và trạng thái cũ khi SQL thay đổi như trước. | FR-004, FR-005 | example | integration | PENDING | T020, T027; `tests/unit/query-input-sql-comparison.test.tsx` |
| A17 | Sinh mã giữ kết quả, cảnh báo, sao chép và tải xuống theo hành vi hiện tại. | FR-004, FR-005, FR-006 | example | component + E2E thủ công | PENDING | T020, T027; `tests/unit/codegen/CodeGeneratorPanel.test.tsx`; `us2-comparison.json` |
| A18 | Đăng nhập, điều hướng và quyền truy cập cho từng vai trò khớp baseline. | FR-005, FR-010, SC-002 | example | integration + E2E thủ công | PENDING | T019, T027; `tests/unit/AppLayout.test.tsx`; `us2-comparison.json` |
| A19 | Kết quả AI, streaming và trích dẫn hiện có giữ nội dung và trạng thái với cùng điều kiện dịch vụ. | FR-005, FR-006, SC-002 | example | integration + E2E thủ công | PENDING | T021, T027; `us2-comparison.json` |
| A20 | Theme, màu nhấn và locale đã chọn vẫn áp dụng sau điều hướng và tải lại. | FR-003, FR-010 | example | component + E2E thủ công | PENDING | T019, T027; `tests/unit/home-preferences.test.tsx`; `us2-comparison.json` |
| A21 | Nội dung dài và biểu đồ hoặc bảng lớn không che khuất thao tác; vùng chuyên biệt có thể cuộn. | FR-008 | example | E2E thủ công | PENDING | T029–T031; `responsive-evidence.json` |
| A22 | Trong ít nhất 5 người dùng mục tiêu, ít nhất 4 người thỏa cả ba điều kiện nhận diện hành động, hoàn thành không hướng dẫn và đánh giá dễ hiểu. | SC-005 | example | đánh giá người dùng thủ công | PENDING | T032; `usability-evidence.json`; 3/5 không đạt, 4/5 đạt |
| A23 | Phân tích độ phức tạp và render graph cho truy vấn trên 50 bảng hoàn tất dưới 1 giây trong môi trường một GPU theo hiến chương. | FR-004; plan.md Constitution Check | example | đo hiệu năng thủ công | PENDING | T035; `performance-evidence.json`; không tính đạt nếu thiếu môi trường |

## Inner loop: unit and component behaviors

Các trường hợp bảo toàn dưới đây phải được kiểm tra trên mã chưa đổi trước T009 nếu thay đổi nền chung có thể ảnh hưởng chúng. Đường dẫn là nơi dự kiến kiểm thử; không ngụ ý kiểm thử cụ thể đã tồn tại hoặc đã chạy.

| id | behavior | traces | kind | layer | state | test |
|---|---|---|---|---|---|---|
| U1 | Nhập SQL và phân tích hiển thị kết quả hiện tại cho dữ liệu thử. | US1-AS1, FR-004 | example | component | PASS (unit baseline; browser pending) | T006, T010; `tests/unit/query-input-workflow.test.tsx` |
| U2 | Chỉnh SQL không làm mất nội dung đang được chỉnh. | US1-AS3, FR-004 | example | component | PASS (unit baseline; browser pending) | T006, T010; `tests/unit/query-input-analysis-state.test.tsx` |
| U3 | Chọn phần tử đồ thị còn mở đúng thông tin hoặc nguồn theo baseline. | US1-AS2, FR-004 | example | component | PASS (unit baseline; browser pending) | T006, T011; `tests/unit/relationshipGraphPage.test.tsx` |
| U4 | Chọn chỉ số dẫn tới cùng dòng nguồn theo baseline. | US1-AS2, FR-004 | example | component | PASS (unit baseline; browser pending) | T006, T012; `tests/unit/sqlMetricsDashboard.test.tsx` |
| U5 | Phiên không hợp lệ không mở rộng quyền truy cập workspace. | US2-AS1, FR-010 | example | component | PASS (unit baseline; browser pending) | T006, T019; `tests/unit/AppLayout.test.tsx` |
| U6 | Kết quả so sánh không được trình bày là hiện hành khi dữ liệu đã đổi. | FR-004, FR-006 | example | component | PASS (unit baseline; browser pending) | T006, T020; `tests/unit/query-input-sql-comparison.test.tsx` |
| U7 | Trạng thái lỗi hoặc vô hiệu hóa của chức năng sinh mã không hiển thị là thành công. | US2-AS3, FR-007 | example | component | PASS (unit baseline; browser pending) | T006, T020; `tests/unit/codegen/CodeGeneratorPanel.test.tsx` |
| U8 | Lịch sử hội thoại được khôi phục theo danh tính và phạm vi lưu hiện tại. | US2-AS2, FR-005, FR-010 | example | unit | PASS (unit baseline; browser pending) | T006, T021; `tests/unit/dbAssistantChatHistoryStorage.test.ts` |
| U9 | Điều khiển đăng nhập có tên truy cập và vẫn dùng được qua bàn phím. | US3-AS3, FR-009 | example | component | PASS (jsdom accessibility; browser pending) | T006, T028; `tests/unit/SignInPage.axe.test.tsx` |
| U10 | Theme và locale đã chọn được phản ánh trong giao diện theo hành vi hiện tại. | US2-AS2, FR-010 | example | component | PASS (component; browser pending) | T006, T019; `tests/unit/home-preferences.test.tsx`, `tests/unit/AppLayout.test.tsx` |

## Coverage and limitations

- **9/9 kịch bản** trong spec có trace: US1-AS1–AS3 → A1–A3; US2-AS1–AS3 → A4–A6; US3-AS1–AS3 → A7–A10.
- **FR-001–FR-011** và **SC-001–SC-005** có trace trong A1–A22; A23 bổ sung cổng hiệu năng của hiến chương và kế hoạch.
- Số lượng thực tế của màn hình, quyền, trạng thái và ID kiểm kê chưa biết cho tới T005. Không thể kết luận 100% coverage trước khi mở rộng và đối chiếu danh mục.
- Profile không có acceptance/E2E runner được xác minh. Các bước E2E, responsive, Hallmark, hiệu năng và đánh giá người dùng ở trên là kiểm tra thủ công theo kế hoạch; không gán lệnh tự động chưa được xác minh. Thiếu browser, dịch vụ, GPU hoặc người tham gia phải ghi `BLOCKED`, không tính đạt.
- A7 cần đánh giá thiết kế dựa trên bằng chứng; A22 cần người dùng thật. Không thể chứng minh hai tiêu chí này chỉ bằng kiểm thử unit hoặc snapshot.

## Out of scope

- Thay đổi parser, AI, quyền, lưu trữ hoặc bổ sung tính năng: yêu cầu chỉ thay đổi giao diện.
- Cài thêm E2E, mutation, coverage hoặc công cụ approval: profile hiện không xác minh các công cụ đó.

## Verification commands

Chép đúng từ `.specify/memory/tdd-profile.md`:

- Single: `npm test -- tests/unit/sqlSourceClassification.test.ts`
- File: `npm test -- tests/unit/sqlSourceClassification.test.ts`
- Suite: `npm test`
- Coverage, mutation, watch, acceptance, property, approval, contract: chưa có lệnh được xác minh.

Lệnh single/file là ví dụ đã được profile xác minh cho tệp nguồn SQL; trước khi chạy một tệp khác, dùng cùng runner với đường dẫn tệp tương ứng và ghi lệnh thực tế. `npm run type-check` và `npm run build` được kế hoạch yêu cầu nhưng chưa được profile TDD xác minh.
