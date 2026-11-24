# Quickstart: Kiểm chứng giao diện

## Chuẩn bị

- Dùng dữ liệu SQL mẫu không nhạy cảm, cùng locale, theme, viewport và trạng thái phiên trước/sau.
- Ghi lại danh mục các header và kích thước thực tế trước thay đổi, gồm trang chủ và workspace; lặp lại sau thay đổi.
- Không gửi SQL, credentials hay dữ liệu người dùng tới dịch vụ ngoài.

## Kiểm tra

1. Chạy test tập trung cho sidebar, trang chủ, dashboard và header liên quan bằng `npm test -- <file...>`; ghi rõ lệnh và kết quả thực tế.
2. Chạy `npm run type-check` và `npm test`; ghi rõ lỗi nền nếu có.
3. Trên trình duyệt, kiểm tra rộng và hẹp, theme sáng/tối, keyboard/focus và giảm chuyển động; kiểm tra sidebar mở/thu và liên kết.
4. Cuộn card trang chủ; kiểm tra card ban đầu trong viewport, card phía dưới, fallback khi API quan sát không có và giảm chuyển động.
5. Phân tích SQL mẫu, kiểm tra metric, cảnh báo, mở chi tiết, đóng và điều hướng; so sánh kết quả với trước thay đổi.
6. Với từng header được chỉnh, đo chiều cao hoặc diện tích ở cùng viewport, xác nhận giảm và tất cả thao tác vẫn truy cập được.

Xem [hợp đồng UI](contracts/ui-behavior.md) và [đặc tả](spec.md) để đối chiếu tiêu chí.

## Kết quả đã kiểm tra

- Baseline `npm test`: 104 tệp, 951 test đạt trên worktree có thay đổi sẵn.
- Sau card trang chủ: `npm test`: 104 tệp, 952 test đạt.
- `npm test -- tests/unit/sidebar-appearance.test.tsx tests/unit/AppLayout.test.tsx tests/unit/home-features.test.tsx tests/unit/sqlMetricsDashboard.test.tsx tests/unit/query-input-workflow.test.tsx tests/unit/object-intelligence-signout.test.tsx`: 43 test đạt.
- `npm run type-check`: đạt sau các thay đổi giao diện.
- Suite sau sidebar: `npm test` đạt 105 tệp / 955 test. Sau chỉnh sửa header tài liệu/lịch sử, suite mặc định có 1 lỗi chờ nhóm xác nhận AI (104 tệp / 954 test đạt); test AI riêng và các suite trước có lần đạt, nguyên nhân chưa xác định.
- Suite sau cùng `npm test -- --maxWorkers=2 --minWorkers=1`: 105 tệp / 955 test đạt; TypeScript đạt. Giới hạn worker không chứng minh nguyên nhân lỗi suite mặc định.
- Trang chủ tại viewport 688x350: header 64.8px trước, 56.8px sau; card tính năng chạy animation khi cuộn tới. Giảm chuyển động: animation `none`, opacity 1.
- Sidebar tại viewport 390x844: thu 64px không phủ nội dung; mở 240px phủ tạm nội dung theo lựa chọn của người dùng, nội dung giữ độ rộng khoảng 302px.
- Dashboard với SQL mẫu: 11 metric card, màu nền gradient xuất hiện; tại viewport 688px, header 120.8px theo class cũ và 108.8px với class mới. Kiểm tra light theme cho card đầu tiên bằng cách đổi theme tạm thời trên DOM.
- Chưa có bằng chứng đo trước/sau và kiểm tra đầy đủ thao tác cho từng header và từng viewport/theme; không suy luận các trường hợp đó đã đạt.
