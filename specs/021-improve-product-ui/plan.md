# Implementation Plan: Cải thiện giao diện sản phẩm với Hallmark

**Branch**: `develop` (Git thực tế khi lập kế hoạch; Spec Kit trả về mã feature `021-improve-product-ui`) | **Date**: 2026-11-21 | **Spec**: [spec.md](./spec.md)

**Input**: Đặc tả trong `specs/021-improve-product-ui/spec.md`. Đặc tả ghi `master` tại thời điểm tạo; kế hoạch này không đổi nhánh.

## Summary

Cải thiện trình bày của toàn bộ giao diện hiện có theo Hallmark, sửa tại chỗ và giữ nguyên luồng, địa chỉ, dữ liệu, quyền, kết quả và tính năng. Trước khi sửa phải kiểm kê và ghi nhận hành vi gốc, sau đó đối chiếu từng mục và kiểm tra giao diện trên các kích thước yêu cầu. Xem [research.md](./research.md), [hợp đồng giao diện](./contracts/ui-behavior.md) và [quickstart.md](./quickstart.md).

## Technical Context

**Language/Version**: TypeScript 5; React 19; Next.js 15.

**Primary Dependencies**: Tailwind CSS 3, Zustand 4, Monaco Editor, ReactFlow, Recharts và các thành phần hiện có. Không dự kiến thêm phụ thuộc.

**Storage**: Giữ nguyên lưu trữ và trạng thái hiện tại; không đổi schema, khóa lưu hoặc thời hạn lưu. Danh mục kiểm chứng là dữ liệu kiểm thử, không phải dữ liệu sản phẩm.

**Testing**: Vitest, Testing Library, jsdom và vitest-axe hiện có; kiểm tra trình duyệt thủ công hoặc công cụ trình duyệt sẵn có cho bố cục, bàn phím, chuyển động và các luồng tích hợp. jsdom không chứng minh được bố cục thực.

**Target Platform**: Ứng dụng web trên trình duyệt máy tính và thiết bị có viewport rộng 320, 375, 414, 768 px.

**Project Type**: Ứng dụng web Next.js với các trang công khai và không gian làm việc được kiểm soát truy cập.

**Performance Goals**: Không làm suy giảm hành vi phản hồi hiện có; giữ yêu cầu hiến chương về phân tích độ phức tạp và biểu đồ cho truy vấn trên 50 bảng dưới 1 giây trên máy một GPU, đối chiếu trong điều kiện tương đương và báo rõ nếu không có môi trường đo phù hợp.

**Constraints**: Chỉ thay đổi trình bày; giữ nguyên route, nhãn và ý nghĩa, cấu trúc điều hướng, đăng nhập, trạng thái, phân quyền, theme, màu nhấn, ngôn ngữ, lưu trữ và ranh giới dịch vụ. Không xóa thành phần hay cây route khi chưa được người dùng cho phép. Không công bố chức năng chưa hoàn thành.

**Scale/Scope**: Tất cả bề mặt thực sự có trong ứng dụng, bao gồm cả trạng thái và quyền truy cập; phạm vi chính xác xác nhận bằng kiểm kê trước khi sửa.

**Implementation prerequisite**: Hallmark 2.0.0 và tài liệu đi kèm đã được cập nhật từ nguồn chính thức. Khi bắt đầu thiết kế, nạp phiên bản mới và xác minh các điều kiện chạy kiểm tra trình duyệt; không báo đã hoàn thành kiểm tra khi chưa chạy.

## Constitution Check

*Đánh giá trước Phase 0: PASS theo phạm vi dự kiến; các mục dưới là cổng bắt buộc khi thực hiện, không phải kết quả thử nghiệm đã đạt.*

| Nguyên tắc | Cổng kiểm chứng |
|---|---|
| I. Multi-Dialect SQL Analysis | Không sửa parser; đối chiếu kết quả SQL/MyBatis, dialect, regex/AST và cảnh báo hiện tại bằng dữ liệu gốc. |
| II. Interactive Visualization First | Giữ biểu đồ, drill-down, JOIN/CTE và nhảy dòng; đối chiếu các thao tác với cùng dữ liệu. |
| III. Real-Time Feedback Loop | Giữ cập nhật theo chỉnh sửa, streaming, trạng thái stale và không thêm reload; kiểm tra từng luồng hiện có. |
| IV. AI-Grounded Explanations | Không đổi prompt, chứng cứ, trích dẫn hay logic AI; so sánh hiển thị và trạng thái thành công/lỗi bằng đầu ra cố định hoặc cùng điều kiện dịch vụ. |
| V. Minimal Deployment Friction | Giữ provider, cấu hình server-side và fallback hiện có; không thêm yêu cầu dịch vụ mới. |
| Security & Privacy | Không đổi auth, phân quyền, phân tách lịch sử hoặc cách xử lý thông tin nhạy cảm; không ghi dữ liệu thật vào bằng chứng. |
| Quality & Performance | Giữ strict TypeScript; chạy kiểm thử liên quan và kiểm thử tương tác/khả năng truy cập mới cho thay đổi. Xác minh ngưỡng >50 bảng trong môi trường phù hợp; ghi rõ giới hạn nếu không thể đo. |

**Đánh giá sau Phase 1**: PASS về thiết kế; không có vi phạm dự kiến. Phát hành vẫn bị chặn nếu cổng hành vi, bảo mật, hiệu năng hoặc điều kiện Hallmark chưa được xác minh.

## Project Structure

### Documentation (this feature)

```text
specs/021-improve-product-ui/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui-behavior.md
└── tasks.md             # tạo ở giai đoạn /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── app/                 # route, màn hình và thành phần theo từng luồng
├── components/          # AppLayout, Sidebar, ThemeProvider, UI chung
├── lib/                 # store, i18n, phân tích, lưu trữ và dịch vụ hiện có
└── styles/tailwind.css  # token theme và lớp nền hiện có
tests/
├── unit/                # kiểm thử hành vi, thành phần và khả năng truy cập
├── fixtures/            # dữ liệu thử hiện có
└── utils/               # thiết lập kiểm thử
```

**Structure Decision**: Giữ cấu trúc và quyền sở hữu thành phần hiện tại; chỉnh style hoặc markup tại các điểm đã kiểm kê thay vì dựng ứng dụng, route hoặc hệ thống trạng thái mới. Phạm vi tệp cụ thể chỉ được chốt sau kiểm kê; công bố tệp dự kiến trước khi sửa theo Hallmark.

## Implementation Approach

1. **Kiểm tra điều kiện Hallmark và chốt hướng**: dùng Hallmark 2.0.0 và đọc lại hệ thiết kế hiện có. Trước khi thiết kế, hỏi một lần về tư liệu, đối tượng, việc sử dụng chính và tông theo Hallmark; cho phép người dùng bỏ qua và công khai các suy luận. Không chọn theme phá vỡ tùy chọn hiện tại hoặc kiến trúc thông tin.
2. **Đóng băng hành vi gốc**: kiểm kê toàn bộ route công khai và nội bộ, trạng thái, hành động, ngôn ngữ, theme, quyền, dữ liệu và các luồng được nêu trong hợp đồng. Lưu bằng chứng đã khử dữ liệu nhạy cảm; ghi rõ mục không thể chạy và lý do. Danh mục phải hoàn tất trước khi chỉnh UI.
3. **Thiết kế hệ trình bày chung**: dùng `src/styles/tailwind.css`, các biến được ánh xạ trong `tailwind.config.js`, Geist/Geist Mono và hệ spacing hiện tại làm cơ sở. Giữ directives đầu stylesheet; bảo đảm dark/light, màu nhấn động, trạng thái focus, độ tương phản và giảm chuyển động. Đồng bộ `AppLayout` và `ThemeProvider` nếu thay đổi token ảnh hưởng cả hai; không xóa hoặc ghi đè stylesheet.
4. **Cải thiện theo từng bề mặt**: shell/điều hướng và trang công khai; nhập truy vấn/trình soạn thảo; bảng chỉ số/biểu đồ/CTE; AI, lịch sử, so sánh, sinh mã, cài đặt và tài liệu. Các nhóm là thứ tự tổ chức, không cho phép bỏ sót màn hình. Giữ các callback, dữ liệu, vai trò, hành vi lưu và các nhãn; kiểm tra từng nhóm trước nhóm tiếp theo.
5. **Kiểm chứng và nghiệm thu**: chạy kiểm thử phù hợp, đối chiếu 100% danh mục với cùng dữ liệu/quyền và trạng thái dịch vụ, kiểm tra viewport, bàn phím, giảm chuyển động, light/dark và tùy chọn màu; đo hiệu năng theo hiến chương nếu có môi trường. Thực hiện đánh giá người dùng theo SC-005. Mục chưa kiểm chứng là chưa đạt, không được thay bằng tuyên bố thành công.

## Complexity Tracking

Không có vi phạm hiến chương được đề xuất; không thêm framework, thay thế ứng dụng, migration dữ liệu hoặc kiến trúc mới.
