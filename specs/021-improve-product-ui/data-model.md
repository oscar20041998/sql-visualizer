# Data Model: Danh mục kiểm chứng giao diện

Không đề xuất thay đổi mô hình dữ liệu, schema, khóa lưu hoặc cách lưu của sản phẩm. Các thực thể dưới đây chỉ mô tả bằng chứng kiểm thử phục vụ so sánh trước/sau.

## Mục kiểm kê

- **ID ổn định**: định danh duy nhất cho mục.
- **Bề mặt và điểm vào**: route hoặc vùng UI thực sự có, vị trí truy cập và thành phần liên quan.
- **Vai trò và điều kiện**: trạng thái đăng nhập/quyền, ngôn ngữ, theme, màu nhấn, kích thước và điều kiện dịch vụ cần thiết.
- **Hành động và trạng thái**: đầu vào thử, thao tác, trạng thái mặc định/đang tải/lỗi/rỗng/vô hiệu hóa/thành công khi áp dụng.
- **Kết quả gốc**: kết quả có thể quan sát, thông báo, tương tác, quyền, dữ liệu và hành vi lưu/khôi phục.
- **Bằng chứng**: tham chiếu đến kiểm thử, ghi chú hoặc ảnh đã khử dữ liệu nhạy cảm.

## Kết quả đối chiếu

- Liên kết đúng một ID mục kiểm kê; ghi điều kiện và đầu vào giống bản gốc, kết quả sau, bằng chứng, người/ngày kiểm tra.
- **Trạng thái**: `chưa kiểm tra`, `đạt`, `không đạt`, `bị chặn`.
- Mỗi mục chỉ được `đạt` khi toàn bộ kết quả và hành vi liên quan tương đương. Thiếu điều kiện dịch vụ, thiếu bằng chứng hoặc khác biệt chưa được xử lý là `bị chặn` hoặc `không đạt`, không phải `đạt`.
- 100% mục đã ghi nhận phải có kết quả `đạt` để đáp ứng SC-001; phải kiểm tra đủ các viewport và điều kiện theo [hợp đồng giao diện](./contracts/ui-behavior.md).

## Nguyên tắc dữ liệu

- Dùng fixture hoặc dữ liệu giả an toàn; không ghi query nhạy cảm, token, thông tin đăng nhập, nội dung hội thoại thực hay dữ liệu cá nhân vào bằng chứng.
- Kết quả kiểm thử và danh mục không được đưa vào store, lịch sử hay dữ liệu sản phẩm.
