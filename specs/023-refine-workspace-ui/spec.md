# Feature Specification: Tinh chỉnh giao diện không gian làm việc

**Feature Branch**: `develop` (nhánh hiện tại; không tạo nhánh mới)

**Created**: 2026-11-24

**Status**: Draft

**Input**: Tinh chỉnh sidebar nổi có chiều sâu và co giãn khi thu/mở, hiệu ứng xuất hiện card khi cuộn trang chủ, làm nổi bật metric card bằng màu và hiệu ứng, và tiết kiệm không gian trên thanh điều hướng các trang.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sử dụng sidebar nổi (Priority: P1)

Người dùng điều hướng bằng sidebar có góc bo, cảm giác nổi và chiều sâu, đồng thời thu hoặc mở sidebar với chuyển động mượt.

**Why this priority**: Sidebar là điều hướng dùng chung và ảnh hưởng trực tiếp tới không gian làm việc.

**Independent Test**: Mở và thu sidebar, kiểm tra hình thức và dùng các liên kết ở từng trạng thái.

**Acceptance Scenarios**:

1. **Given** sidebar đang mở, **When** người dùng thu sidebar, **Then** sidebar chuyển trạng thái có hiệu ứng co giãn, các đích điều hướng vẫn sử dụng được và vùng nội dung không bị che.
2. **Given** sidebar đang thu, **When** người dùng mở sidebar, **Then** sidebar chuyển trạng thái có hiệu ứng co giãn và hiển thị lại tên điều hướng.
3. **Given** sidebar hiển thị, **When** người dùng quan sát, **Then** sidebar có góc bo, chiều sâu và cảm giác nổi tách khỏi nền.

### User Story 2 - Khám phá trang chủ (Priority: P2)

Người dùng cuộn trang chủ và thấy các card xuất hiện nhẹ nhàng khi đi vào vùng nhìn.

**Why this priority**: Chuyển động vừa phải giúp người dùng nhận biết nội dung mà không cản trở việc đọc.

**Independent Test**: Cuộn qua các nhóm card trên trang chủ và kiểm tra card hiển thị, đọc được và sử dụng được.

**Acceptance Scenarios**:

1. **Given** một card chưa ở trong vùng nhìn, **When** người dùng cuộn card vào vùng nhìn, **Then** card xuất hiện với hiệu ứng nhẹ và hoàn tất ở trạng thái đọc được.
2. **Given** nội dung đã nằm trong vùng nhìn khi mở trang, **When** trang sẵn sàng sử dụng, **Then** card xuất hiện và các thao tác trên card vẫn hoạt động.

### User Story 3 - Xem metric nổi bật (Priority: P2)

Người dùng xem dashboard và phân biệt các metric card rõ ràng hơn nhờ màu sắc và hiệu ứng thị giác.

**Why this priority**: Các số liệu là thông tin chính của dashboard và cần dễ nhận biết.

**Independent Test**: Mở dashboard với dữ liệu mẫu và kiểm tra các card, giá trị và tương tác hiện có.

**Acceptance Scenarios**:

1. **Given** dashboard có metric, **When** người dùng xem các card, **Then** card có màu nhấn và chiều sâu hoặc hiệu ứng giúp nổi bật, đồng thời tên và giá trị vẫn dễ đọc.
2. **Given** dữ liệu metric thay đổi hoặc chưa có, **When** dashboard cập nhật, **Then** giá trị, trạng thái và chức năng hiện có vẫn chính xác.

### User Story 4 - Dùng thanh điều hướng tiết kiệm không gian (Priority: P2)

Người dùng dùng các trang với thanh điều hướng gọn hơn, dành thêm không gian cho nội dung mà vẫn truy cập được các thao tác hiện tại.

**Why this priority**: Vùng làm việc là trọng tâm của các trang phân tích.

**Independent Test**: Kiểm tra thanh điều hướng trên các trang áp dụng ở kích thước màn hình rộng và hẹp, rồi thực hiện các thao tác vốn có.

**Acceptance Scenarios**:

1. **Given** một trang có thanh điều hướng trong phạm vi ứng dụng, **When** trang hiển thị, **Then** thanh điều hướng được bố trí gọn hơn so với hiện tại mà vẫn giữ các chức năng, tên và trạng thái cần thiết.
2. **Given** màn hình hẹp, **When** người dùng truy cập các thao tác điều hướng, **Then** thao tác không bị cắt, che khuất hoặc yêu cầu cuộn ngang toàn trang để tìm.

### Edge Cases

- Người dùng yêu cầu giảm chuyển động: nội dung vẫn xuất hiện ngay và chuyển trạng thái không phụ thuộc hiệu ứng.
- Card đã ở trong vùng nhìn lúc tải trang, hoặc người dùng không cuộn: nội dung và thao tác vẫn sẵn sàng.
- Màn hình hẹp, phóng to trang hoặc nội dung nhãn dài: không làm mất thao tác; nội dung được giải phóng khi thu sidebar.
- Trên màn hình hẹp, sidebar mở phủ tạm lên nội dung; người dùng thu sidebar để xem lại toàn bộ nội dung.
- Theme sáng/tối, giá trị metric dài và trạng thái rỗng: nội dung vẫn dễ đọc.
- Người dùng điều hướng bằng bàn phím: các thao tác vẫn truy cập được và có dấu hiệu focus.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sidebar MUST có hình thức nổi tách nền, góc bo và chiều sâu, phù hợp cả theme sáng và tối.
- **FR-002**: Sidebar MUST chuyển đổi giữa trạng thái mở và thu với hiệu ứng co giãn, giữ nguyên các đích điều hướng và hành vi truy cập hiện có.
- **FR-003**: Trang chủ MUST cho các card xuất hiện nhẹ khi vào vùng nhìn mà không làm mất nội dung hoặc cản trở thao tác.
- **FR-004**: Các metric card MUST có màu nhấn và hiệu ứng thị giác giúp phân biệt, đồng thời giữ nguyên tên, giá trị, trạng thái và thao tác hiện có.
- **FR-005**: Thanh điều hướng dùng trên các trang ứng dụng MUST được bố trí gọn hơn, giữ các chức năng và trạng thái hiện có trên màn hình rộng và hẹp.
- **FR-006**: Giao diện MUST tôn trọng tùy chọn giảm chuyển động và không ẩn nội dung khi hiệu ứng không chạy.
- **FR-007**: Các thay đổi MUST giữ khả năng sử dụng bằng bàn phím, nhãn dễ hiểu, trạng thái focus nhìn thấy được và độ tương phản dễ đọc.
- **FR-008**: Thay đổi MUST không sửa nghiệp vụ, dữ liệu, quyền truy cập, route, ngôn ngữ hoặc cấu trúc điều hướng hiện có.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% thao tác thu/mở và liên kết sidebar kiểm tra được vẫn hoạt động ở cả hai trạng thái; không che nội dung.
- **SC-002**: 100% card trang chủ được kiểm tra xuất hiện và sử dụng được khi vào vùng nhìn, bao gồm khi giảm chuyển động.
- **SC-003**: 100% metric card được kiểm tra có màu nhấn hoặc hiệu ứng dễ nhận thấy và giữ nguyên giá trị, nhãn, trạng thái và thao tác.
- **SC-004**: 100% thanh điều hướng trong phạm vi được kiểm tra giữ đầy đủ thao tác trên màn hình rộng và hẹp; không có thao tác bị che hoặc cắt.
- **SC-005**: Trên mỗi trang có thanh điều hướng được chỉnh sửa, chiều cao hoặc diện tích thanh chiếm dụng giảm so với trước thay đổi ở ít nhất một kích thước màn hình được kiểm tra.

## Assumptions

- Chỉ tinh chỉnh giao diện hiện có; không bổ sung tính năng, route hoặc thư viện chỉ để tạo hiệu ứng.
- Phạm vi thanh điều hướng là các thanh điều hướng và header trong ứng dụng hiện hữu; ưu tiên thành phần dùng chung và các trang có thanh riêng.
- Hiệu ứng cần tinh tế, không lặp liên tục gây phân tâm; màu sắc vẫn tuân theo hệ thống giao diện hiện tại.
- Đánh giá hình ảnh và không gian dựa trên cùng dữ liệu và kích thước màn hình trước và sau thay đổi.
