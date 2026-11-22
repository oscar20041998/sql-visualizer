# UI Behavior Contract: Bảo toàn và cải thiện giao diện

## Bất biến

Với cùng đầu vào, quyền, cấu hình và điều kiện dịch vụ, giao diện sau thay đổi giữ nguyên route, cấu trúc điều hướng, nhãn và ý nghĩa, hành động, kết quả, dữ liệu, trạng thái, quyền và hành vi lưu/khôi phục. Được phép thay đổi trình bày; không được thêm chức năng, thay đổi logic hoặc công bố chức năng chưa hoàn thành.

## Ma trận tối thiểu để lập danh mục

Danh sách dưới là điểm xuất phát, không thay thế việc khám phá mọi route và trạng thái có thật.

| Bề mặt | Hành vi bắt buộc đối chiếu |
|---|---|
| Trang công khai, đăng nhập và callback | Điều hướng, đăng nhập/đăng xuất, trạng thái phiên và quyền đã có; guest chỉ theo hành vi thực tế. |
| Shell, sidebar, cài đặt | Điều hướng, hạn chế theo trạng thái, locale, light/dark, màu nhấn, dữ liệu cài đặt và khôi phục. |
| Nhập SQL/MyBatis và editor | Nhập/sửa, định dạng, phân tích, thông báo lỗi, cập nhật tức thời và nhảy đến dòng nguồn. |
| Chỉ số, graph, JOIN và CTE | Kết quả, tương tác, bố cục/tùy chọn đang có, drill-down, liên kết dòng nguồn và xuất. |
| So sánh, sinh mã, lịch sử | Baseline và trạng thái stale, đầu ra/cảnh báo, thao tác sao chép/tải xuống và lưu/khôi phục theo hành vi hiện tại. |
| AI và hội thoại | Khả năng truy cập, dữ liệu đầu vào/đầu ra, streaming, chứng cứ/trích dẫn, lịch sử và trạng thái lỗi/không khả dụng. |
| Hướng dẫn, tài liệu và các route khác | Nội dung, đường dẫn và tương tác thực sự có trước thay đổi. |

Từng mục phải ghi nhận cả trạng thái rỗng, tải, lỗi, vô hiệu hóa và quyền hạn chế khi có. Không suy diễn guest hoặc các tính năng chưa hoàn thành từ tài liệu.

## Khả năng tiếp cận và hiển thị

- Kiểm tra các hành trình chính tại 320, 375, 414, 768 px và một viewport máy tính; không tràn ngang toàn trang hay cắt điều khiển thiết yếu. Trình soạn thảo, bảng và biểu đồ có thể cuộn trong vùng riêng.
- Các điều khiển trong hành trình chính phải dùng được bằng bàn phím, có focus nhìn thấy, và hoạt động với giảm chuyển động; kiểm tra cả theme sáng/tối và màu nhấn được hỗ trợ.
- Các kết quả rộng, SQL dài, lỗi dài và biểu đồ lớn không được che khuất thao tác; thông tin không chỉ truyền đạt bằng màu.

## Cổng nghiệm thu

Hoàn tất đối chiếu 100% danh mục, chạy các kiểm thử liên quan, kiểm tra thực tế trong browser, và đánh giá ít nhất 5 người dùng mục tiêu với tối thiểu 4 người đạt tiêu chí SC-005. Nếu thiếu provider, quyền, thiết bị đo hiệu năng hoặc người tham gia, ghi rõ `bị chặn` và không tuyên bố tiêu chí tương ứng đã đạt.
