# Quickstart: Kiểm chứng cải thiện giao diện

## Điều kiện

- Làm việc tại thư mục gốc repository; cài đặt Node.js và phụ thuộc theo `package-lock.json`. Chỉ cài lại khi lệnh xác nhận thiếu phụ thuộc.
- Sử dụng Hallmark 2.0.0 đã cài; kiểm tra điều kiện chạy công cụ kiểm tra trình duyệt của skill trước khi cần dùng.
- Có browser với công cụ chỉnh viewport và dữ liệu thử không nhạy cảm. Luồng AI hoặc đăng nhập xã hội cần cấu hình môi trường hợp lệ; không lưu credential hoặc dữ liệu người dùng thật vào bằng chứng.

## Trước khi thay đổi

1. Theo [hợp đồng giao diện](./contracts/ui-behavior.md), lập danh mục đầy đủ theo [mô hình bằng chứng](./data-model.md); ghi route, đầu vào, quyền, trạng thái, hành động, kết quả và bằng chứng.
2. Chạy các kiểm thử liên quan làm baseline:

   ```powershell
   npm run test -- tests/unit/AppLayout.test.tsx tests/unit/query-input-workflow.test.tsx tests/unit/query-input-sql-comparison.test.tsx tests/unit/relationshipGraphPage.test.tsx tests/unit/sqlMetricsDashboard.test.tsx tests/unit/SignInPage.axe.test.tsx
   npm run type-check
   ```

3. Chạy ứng dụng trong một terminal:

   ```powershell
   npm run dev
   ```

   Mở `http://localhost:4028` trên máy của người kiểm thử. Ghi rõ các lỗi baseline hoặc trường hợp không có cấu hình; không coi chúng là kết quả sau thay đổi.
4. Với dữ liệu thử đại diện, kiểm tra SQL và MyBatis, biểu đồ và nhảy dòng, so sánh, sinh mã, lưu/khôi phục, đăng nhập, cài đặt và AI nếu khả dụng. Ghi cả trạng thái lỗi, rỗng, tải và quyền hạn chế theo danh mục.

## Sau khi thay đổi

1. Chạy lại các lệnh baseline và mọi kiểm thử liên quan đến thành phần đã sửa; nếu có thay đổi code, chạy thêm `npm run build`. So sánh lỗi với baseline và xử lý regression do thay đổi.
2. Dùng cùng dữ liệu, quyền và điều kiện dịch vụ để đối chiếu từng mục; 100% mục phải đạt. Mục bị chặn phải có lý do và không được tính là đạt.
3. Trong browser, chạy các hành trình chính ở 320, 375, 414 và 768 px cùng một viewport máy tính. Xác nhận không tràn ngang toàn trang, điều khiển không bị cắt, và vùng editor/bảng/graph vẫn cuộn và tương tác khi cần.
4. Kiểm tra bàn phím và focus, giảm chuyển động, theme sáng/tối, màu nhấn và locale; kiểm tra dữ liệu lưu, lỗi và truy cập hạn chế. Dùng công cụ kiểm tra tương phản/khả năng truy cập hiện có và ghi kết quả.
5. Đo yêu cầu trên 50 bảng theo hiến chương trong môi trường một GPU phù hợp, so sánh với baseline; nếu không có môi trường, đánh dấu chưa xác minh.
6. Mời ít nhất 5 người dùng mục tiêu thử hành trình phân tích đại diện không được hướng dẫn; ghi số người hoàn thành, nhận diện hành động chính và đánh giá dễ hiểu. SC-005 yêu cầu ít nhất 4 người đạt cả ba điều kiện.

**Kết quả mong đợi**: Các bất biến trong hợp đồng được bảo toàn, kiểm thử phù hợp thành công và mọi tiêu chí có bằng chứng đạt; điều kiện chưa kiểm chứng được báo riêng, không tính là hoàn thành.
