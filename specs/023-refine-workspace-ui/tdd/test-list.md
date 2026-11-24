---
feature: 023-refine-workspace-ui
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 9
planned_at: b6b1230
updated_at: b6b1230
suite_baseline: green
---

# Test List: Tinh chỉnh giao diện

Trạng thái là kế hoạch, không phải bằng chứng đã chạy. Tên tệp và test bên dưới là dự kiến. Các đánh giá màu, chiều sâu, chuyển động thực tế và số đo cần trình duyệt; jsdom không thể chứng minh chúng.

## Outer loop: acceptance behaviors

| ID | Behavior | Traces | Layer | Kind | State | Test / task |
|---|---|---|---|---|---|---|
| A1 | Thu sidebar giữ các đích điều hướng và vùng nội dung không bị che | US1.1, FR-002 | component + browser | example | BASELINE | `tests/unit/sidebar-appearance.test.tsx`, T005-T007 |
| A2 | Mở sidebar khôi phục nhãn điều hướng | US1.2, FR-002 | component | example | BASELINE | `tests/unit/sidebar-appearance.test.tsx`, T005-T007 |
| A3 | Sidebar có góc bo, chiều sâu, cảm giác nổi ở hai theme | US1.3, FR-001 | browser visual | example | PENDING | T007, T018 |
| A4 | Card ngoài vùng nhìn xuất hiện khi cuộn tới và đọc được | US2.1, FR-003 | component + browser | example | DONE | `tests/unit/home-features.test.tsx`, T008-T010 |
| A5 | Card ban đầu trong vùng nhìn và thao tác của nó sẵn sàng | US2.2, FR-003 | component + browser | example | PENDING | `tests/unit/home-features.test.tsx`, T008-T010 |
| A6 | Metric card có màu nhấn, hiệu ứng và vẫn đọc được | US3.1, FR-004 | component + browser visual | example | PENDING | `tests/unit/sqlMetricsDashboard.test.tsx`, T011-T013 |
| A7 | Metric thay đổi và trạng thái rỗng vẫn hiển thị đúng | US3.2, FR-004 | integration | example | PENDING | `tests/unit/sqlMetricsDashboard.test.tsx`, T011-T013 |
| A8 | Header gọn hơn và giữ tên, trạng thái, chức năng | US4.1, FR-005 | browser + component | example | PENDING | T003, T014-T017 |
| A9 | Màn hình hẹp không cắt hoặc che thao tác header | US4.2, FR-005 | browser | example | PENDING | T017-T018 |

## Inner loop: edge and cross-cutting behaviors

| ID | Behavior | Traces | Layer | Kind | State | Test / task |
|---|---|---|---|---|---|---|
| U1 | Không có API quan sát thì card vẫn hiển thị | FR-003, FR-006 | component | example | BASELINE | T008-T010 |
| U2 | Giảm chuyển động không ẩn card hoặc cản toggle | FR-002, FR-006 | component + browser | example | PENDING | T005-T010, T018 |
| U3 | Bàn phím truy cập sidebar và metric, focus vẫn nhìn thấy | FR-007 | component + browser | example | PENDING | T005-T007, T011-T013, T018 |
| U4 | Theme sáng/tối, nhãn dài và giá trị dài vẫn đọc được | FR-001, FR-004, FR-007 | browser | example | PENDING | T007, T013, T018 |
| U5 | Route, quyền, dữ liệu và luồng phân tích hiện có được bảo toàn | FR-008 | integration + browser | example | PENDING | T001, T018-T020 |
| U6 | Nút thu/mở công bố trạng thái mở cho công nghệ hỗ trợ | FR-002, FR-007 | component | example | DONE | `tests/unit/sidebar-appearance.test.tsx`, T005-T007 |

## Verification commands

- Single test: `npm test -- tests/unit/sqlSourceClassification.test.ts`
- Single home test file: `npm test -- tests/unit/home-features.test.tsx`
- Single sidebar test file: `npm test -- tests/unit/sidebar-appearance.test.tsx`
- File: `npm test -- tests/unit/sqlSourceClassification.test.ts`
- Full suite: `npm test` (2026-11-24: 104 files, 951 tests passed)
- Coverage, mutation, browser E2E: chưa có lệnh xác minh trong profile; kiểm tra trình duyệt phải ghi bằng chứng riêng.

## Limits

- Các test ngoài trang chủ cần xác minh và ghi lệnh chạy tập trung phù hợp trong profile trước khi dùng làm bằng chứng TDD.
- Bằng chứng đo diện tích và đánh giá thị giác không thể được xác nhận bằng test component.
