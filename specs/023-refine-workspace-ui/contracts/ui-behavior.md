# UI Behavior Contract

- Sidebar: toggle hoạt động bằng chuột và bàn phím, trạng thái mở/thu chính xác; liên kết, lock, theme, ngôn ngữ và đăng xuất được bảo toàn.
- Trang chủ: card trong vùng nhìn đọc và thao tác được; thiếu IntersectionObserver hoặc ưu tiên giảm chuyển động không làm ẩn card.
- Metric: giá trị, cảnh báo, điều hướng, mở/đóng chi tiết và thao tác bàn phím giữ nguyên.
- Header: không bỏ tên, hành động hoặc trạng thái; ở màn hình hẹp không cắt thao tác hoặc ép cuộn ngang toàn trang.
- Tất cả: theme sáng/tối, focus và tương phản được kiểm tra; không có thay đổi nghiệp vụ.
