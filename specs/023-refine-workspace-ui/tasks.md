---
description: "Tác vụ tinh chỉnh giao diện không gian làm việc"
---

# Tasks: Tinh chỉnh giao diện không gian làm việc

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [ui-behavior.md](contracts/ui-behavior.md), [quickstart.md](quickstart.md).

**TDD**: Dùng danh mục kiểm thử và profile `.specify/memory/tdd-profile.md`. Với hành vi mới, chứng minh RED đúng nguyên nhân trước GREEN/REFACTOR. Người dùng cho phép ngoại lệ kiểm tra trước/sau bằng trình duyệt với tiêu chí thuần thị giác và characterization xanh cho hành vi đã hoạt động; ghi bằng chứng thật, không coi jsdom là bằng chứng thị giác.

## Phase 1: Setup

- [ ] T001 Kiểm tra trạng thái worktree và ghi baseline các thao tác sidebar, card, metric và header cùng viewport trong `specs/023-refine-workspace-ui/quickstart.md`.
- [X] T002 Kiểm tra cấu hình ignore và công cụ hiện có trong `.gitignore`, `.eslintrc.json`, `.prettierignore` và `package.json`; chỉ bổ sung mẫu thiết yếu còn thiếu.

## Phase 2: Foundational

- [ ] T003 Lập danh mục header/toolbar từng trang, thành phần dùng chung và đo diện tích trước thay đổi trong `specs/023-refine-workspace-ui/quickstart.md`.
- [X] T004 Chuẩn bị danh mục kiểm thử theo từng hành vi và bằng chứng RED/GREEN trong `specs/023-refine-workspace-ui/tdd/test-list.md` và `specs/023-refine-workspace-ui/tdd/cycle-log.md`.

## Phase 3: User Story 1 - Sidebar nổi (P1, MVP)

**Goal**: Sidebar có chiều sâu, góc bo và co giãn khi thu/mở.

**Independent Test**: Thu/mở bằng chuột, bàn phím, kiểm tra điều hướng và hiển thị ở desktop/mobile và cả hai theme.

- [X] T005 [US1] Viết và chạy characterization cho toggle và bảo toàn điều hướng trong `tests/unit/sidebar-appearance.test.tsx`.
- [X] T006 [US1] Tinh chỉnh diện mạo, kích thước và chuyển động có hỗ trợ giảm chuyển động trong `src/components/Sidebar.tsx`; điều chỉnh mobile overlay trong `src/components/AppLayout.tsx`.
- [ ] T007 [US1] Chạy GREEN, test liên quan và kiểm tra trực quan sidebar, ghi kết quả vào `specs/023-refine-workspace-ui/tdd/cycle-log.md`.

## Phase 4: User Story 2 - Card trang chủ (P2)

**Goal**: Card xuất hiện nhẹ khi cuộn mà không phụ thuộc hiệu ứng để đọc nội dung.

**Independent Test**: Kiểm tra card ban đầu, cuộn tới card, thiếu API quan sát và giảm chuyển động.

- [X] T008 [US2] Viết và chạy test RED cho hiển thị khi vào vùng nhìn và characterization cho fallback trong `tests/unit/home-features.test.tsx`.
- [X] T009 [US2] Thêm hiệu ứng xuất hiện và fallback an toàn trong `src/app/page.tsx` và `src/styles/tailwind.css`, không đổi nội dung hay hành động.
- [X] T010 [US2] Chạy GREEN, test liên quan và kiểm tra cuộn trong trình duyệt; ghi vào `specs/023-refine-workspace-ui/tdd/cycle-log.md`.

## Phase 5: User Story 3 - Metric nổi bật (P2)

**Goal**: Các metric card có màu và hiệu ứng, giữ nguyên giá trị, cảnh báo và thao tác.

**Independent Test**: So sánh metric với baseline và mở chi tiết, điều hướng bằng chuột và bàn phím.

- [X] T011 [US3] Chạy characterization hành vi metric hiện hữu trong `tests/unit/sqlMetricsDashboard.test.tsx` và đo baseline trình bày bằng trình duyệt.
- [X] T012 [US3] Bổ sung màu, chiều sâu và hiệu ứng phù hợp theme trong `src/app/sql-metrics-dashboard/components/MetricCardsGrid.tsx`.
- [ ] T013 [US3] Chạy GREEN, test dashboard liên quan và kiểm tra trực quan, ghi vào `specs/023-refine-workspace-ui/tdd/cycle-log.md`.

## Phase 6: User Story 4 - Header gọn (P2)

**Goal**: Các header/toolbar trang gọn hơn mà vẫn đủ chức năng.

**Independent Test**: Đối chiếu danh mục header, thao tác và số đo trước/sau trên viewport rộng và hẹp.

- [ ] T014 [US4] Viết và chạy test RED cho bố cục/hành vi mới và thao tác header phù hợp trong `tests/unit/home-features.test.tsx` và các test trang tương ứng.
- [X] T015 [US4] Tinh chỉnh header trang chủ trong `src/app/page.tsx` và header dashboard trong `src/app/sql-metrics-dashboard/components/MetricsDashboardContent.tsx`.
- [ ] T016 [US4] Tinh chỉnh các header còn lại được xác định tại T003 trong `src/app/`, giữ các điều khiển và trạng thái riêng của từng trang.
- [ ] T017 [US4] Chạy GREEN và đối chiếu số đo trước/sau cho từng header trong `specs/023-refine-workspace-ui/quickstart.md`; ghi bằng chứng vào `specs/023-refine-workspace-ui/tdd/cycle-log.md`.

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T018 Kiểm tra theme, giảm chuyển động, keyboard, viewport và hồi quy theo `specs/023-refine-workspace-ui/quickstart.md`; ghi kết quả thực tế.
- [ ] T019 Chạy `npm run type-check` và `npm test`, ghi kết quả và các lỗi nền trong `specs/023-refine-workspace-ui/tdd/cycle-log.md`.
- [ ] T020 Đối chiếu từng yêu cầu FR và SC trong `specs/023-refine-workspace-ui/spec.md`, cập nhật tài liệu liên quan và báo giới hạn chưa kiểm chứng trong `specs/023-refine-workspace-ui/quickstart.md`.

## Dependencies & Execution Order

Setup T001-T002 → foundational T003-T004 → các story US1, US2, US3, US4 → polish. Trong từng story, RED trước implementation rồi GREEN; chỉ tick sau bằng chứng thật. US2 và US4 cùng sửa `src/app/page.tsx` nên thực hiện tuần tự. Các story khác có thể song song nếu không cùng file, nhưng test và thay đổi của cùng hành vi phải tuần tự.

## Parallel Opportunities

Sau T004, US1, US2 và US3 có thể triển khai song song trên các file tách biệt; US4 phải chờ US2 vì cùng file trang chủ. Không chạy song song các thay đổi cùng file hoặc cùng cycle log.

## Implementation Strategy

Ưu tiên hoàn thành US1 làm MVP, kiểm chứng độc lập, sau đó lần lượt US2, US3, US4; kết thúc bằng kiểm tra toàn bộ và đối chiếu tiêu chí. Không tạo commit tự động.
