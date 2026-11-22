# Phase 0 Research: Cải thiện giao diện sản phẩm

## R1. Hệ trình bày hiện có

- **Decision**: Giữ Geist/Geist Mono, biến theme và thang spacing hiện tại; áp dụng Hallmark có chọn lọc vào hệ thống đang vận hành.
- **Rationale**: `src/app/layout.tsx` nạp Geist; `src/styles/tailwind.css` định nghĩa token tối/sáng; `tailwind.config.js` ánh xạ token, font và bo góc. `AppLayout` và `ThemeProvider` áp dụng màu nhấn động riêng cho các nhóm trang. Thay thế các điểm này có thể làm hỏng cài đặt hiện có.
- **Alternatives considered**: Áp một theme Hallmark hoàn toàn mới hoặc ghi đè stylesheet. Loại vì có nguy cơ phá theme, màu nhấn và hành vi người dùng đang lưu.

## R2. Giới hạn sửa giao diện

- **Decision**: Sửa trong route và thành phần hiện tại; chỉ thêm thành phần trình bày khi cần mà không đổi trách nhiệm, luồng hoặc cấu trúc điều hướng.
- **Rationale**: `src/app/query-input/page.tsx` tích hợp phân tích, editor, MyBatis, AI, lịch sử, so sánh và sinh mã; `src/components/Sidebar.tsx` gắn điều hướng, locale, theme và đăng xuất với store. Thay toàn bộ sẽ đặt nhiều hành vi vào rủi ro.
- **Alternatives considered**: Viết lại trang hoặc đổi route. Loại vì trái yêu cầu bảo toàn tính năng và vượt phạm vi.

## R3. Bảo toàn và kiểm thử

- **Decision**: Chụp danh mục hành vi gốc trước thay đổi, sử dụng kiểm thử Vitest hiện có cộng kiểm thử browser cho bố cục, hành trình và focus; đối chiếu từng mục với cùng dữ liệu và quyền.
- **Rationale**: `tests/unit/` đã có kiểm thử auth, query input, comparison, dashboard, graph và axe; `vitest.config.ts` dùng jsdom, không thể xác nhận bố cục viewport thực. Bằng chứng chạy thực tế cần bổ sung kiểm tra browser.
- **Alternatives considered**: Chỉ so sánh ảnh hoặc chỉ chạy unit test. Loại vì không chứng minh được cả hành vi, dữ liệu, tương tác lẫn bố cục.

## R4. Dịch vụ tùy chọn và bảo mật

- **Decision**: Giữ nguyên provider, session, trạng thái lỗi và dữ liệu lưu; dùng đầu vào và đầu ra thử đã khử nhạy cảm hoặc các fixture hiện có. Đánh dấu các trường hợp không thể xác minh thay vì mặc định đạt.
- **Rationale**: Dịch vụ AI, đăng nhập xã hội và lưu trữ có điều kiện môi trường; hành vi phụ thuộc cấu hình không được suy diễn từ giao diện.
- **Alternatives considered**: Dùng dữ liệu người dùng thật hoặc bỏ qua trường hợp lỗi. Loại vì rủi ro riêng tư và không chứng minh tương đương.

## R5. Hallmark và điều kiện thực hiện

- **Decision**: Dùng pre-flight và quy trình Hallmark 2.0.0 cho thiết kế tại chỗ; hỏi một lần về material/audience/use/tone trước khi thiết kế theo điều kiện của phiên bản mới.
- **Rationale**: Ngày 2026-11-21, bản 2.0.0 từ kho chính thức `nutlope/hallmark`, commit `04977e15f3dfd6ee4b74c887dac3eb52665d6c92`, đã thay thế bản 1.1.0; cả hai vị trí skill đều có đủ 187 tệp của gói upstream, bao gồm `references/` và `scripts/`.
- **Alternatives considered**: Tiếp tục sử dụng bản 1.1 thiếu tài liệu tại vị trí `.github`, hoặc công bố kiểm tra Hallmark thành công mà chưa chạy. Loại vì không phản ánh cài đặt mới và thiếu bằng chứng.

## R6. Tham chiếu AI Compare

- **Decision**: Dùng `docs/ui-prompts/20261009/sql-visualizer-ai-compare-before-after.prompt.md` như ngữ cảnh hành vi cần bảo toàn, không xem là yêu cầu triển khai tính năng mới.
- **Rationale**: Đặc tả feature này chỉ yêu cầu thay đổi giao diện; mã hiện có đã tích hợp `SqlComparisonPanel` tại query input và có các kiểm thử tương ứng.
- **Alternatives considered**: Triển khai lại toàn bộ nội dung prompt. Loại vì mở rộng phạm vi và có thể thay đổi hành vi hiện tại.
