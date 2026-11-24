# Research: Tinh chỉnh giao diện

## Sidebar

- **Decision**: Tinh chỉnh sidebar hiện có và shell nếu cần; chuyển đổi độ rộng có điều kiện giảm chuyển động, không thay đổi logic route hoặc phiên.
- **Rationale**: `src/components/Sidebar.tsx` đã quản lý thu/mở, route, theme và phiên; shell dùng layout flex trong `src/components/AppLayout.tsx`.
- **Alternatives**: Thay sidebar bằng thư viện mới bị loại vì tăng rủi ro hành vi và dependency.

## Card trang chủ

- **Decision**: Ưu tiên nội dung hiển thị mặc định; chỉ áp dụng hiệu ứng quan sát khi được hỗ trợ, có fallback, xử lý cleanup và giảm chuyển động.
- **Rationale**: Card được khai báo trong `src/app/page.tsx`; trang có thể cuộn độc lập ngoài workspace shell. Nội dung không được phụ thuộc JavaScript quan sát.
- **Alternatives**: Ẩn card mặc định bằng CSS bị loại vì có thể làm mất nội dung khi script hoặc API không hoạt động.

## Metric cards

- **Decision**: Tái sử dụng `--card-accent` và token theme trong `MetricCardsGrid.tsx`, bổ sung màu/chiều sâu mà giữ cảnh báo, keyboard và mở chi tiết.
- **Rationale**: Các card đã có màu theo loại, trạng thái cảnh báo và thao tác.
- **Alternatives**: Định nghĩa bảng màu mới cố định bị loại vì có thể xung đột theme và độ tương phản.

## Header trang

- **Decision**: Khảo sát các header/toolbar trang, so sánh kích thước trước/sau, thay đổi khoảng cách và bố cục theo từng thành phần hiện có, giữ toàn bộ thao tác.
- **Rationale**: Trang chủ có header riêng; dashboard có header riêng; không nên giả định mọi trang dùng một thành phần chung.
- **Alternatives**: Thay toàn bộ bằng một navbar mới bị loại vì có thể xóa thao tác đặc thù.
