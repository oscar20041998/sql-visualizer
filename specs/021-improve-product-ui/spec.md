# Feature Specification: Cải thiện giao diện sản phẩm với Hallmark

**Feature Branch**: `master` (không tạo nhánh mới)

**Created**: 2026-11-21

**Status**: Draft

**Input**: "Tôi muốn dùng hallmark để improve UI cho sản phẩm hiện tại. Giữ nguyên tất cả các tính năng, chỉ thay đổi giao diện"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sử dụng không gian phân tích SQL sau khi cải thiện giao diện (Priority: P1)

Người dùng nhập hoặc mở SQL, phân tích và khám phá kết quả trong một giao diện rõ ràng, nhất quán hơn mà không phải từ bỏ các thao tác quen thuộc.

**Why this priority**: Đây là nhiệm vụ cốt lõi của sản phẩm; thay đổi hình thức không được ảnh hưởng đến kết quả phân tích hoặc khả năng khám phá.

**Independent Test**: Ghi nhận các thao tác và kết quả hiện tại với cùng dữ liệu thử, sau đó thực hiện lại trên giao diện mới, bao gồm nhập SQL, định dạng, phân tích, khám phá kết quả và đi tới dòng nguồn.

**Acceptance Scenarios**:

1. **Given** người dùng có một truy vấn được hỗ trợ, **When** họ nhập và phân tích truy vấn, **Then** họ nhận được cùng kết quả phân tích và có thể sử dụng các thao tác hiện có trên kết quả.
2. **Given** kết quả chứa biểu đồ quan hệ, JOIN hoặc CTE, **When** người dùng tương tác với biểu đồ hoặc chọn một vị trí nguồn, **Then** thao tác khám phá và điều hướng tới dòng nguồn hoạt động như trước.
3. **Given** người dùng chỉnh sửa SQL hoặc nhập MyBatis XML, **When** dữ liệu thay đổi, **Then** phản hồi và các trạng thái liên quan cập nhật như trước mà không mất nội dung.

---

### User Story 2 - Tiếp tục sử dụng toàn bộ sản phẩm (Priority: P1)

Người dùng tiếp tục truy cập các màn hình, công cụ và lựa chọn vốn có, kể cả đăng nhập, cài đặt, lịch sử, trợ lý AI, so sánh SQL, sinh mã và xuất kết quả, trong một trải nghiệm thị giác thống nhất.

**Why this priority**: Bảo toàn tất cả tính năng là giới hạn bắt buộc của yêu cầu, không chỉ đối với màn hình chính.

**Independent Test**: Lập danh mục các màn hình, thao tác, trạng thái và quyền truy cập thực sự có trước thay đổi; đối chiếu từng mục và kết quả của nó sau thay đổi trong cùng điều kiện.

**Acceptance Scenarios**:

1. **Given** một chức năng và vai trò người dùng được hỗ trợ trước thay đổi, **When** người dùng điều hướng đến và sử dụng chức năng đó, **Then** chức năng vẫn có thể truy cập và cho cùng hành vi, dữ liệu và kết quả.
2. **Given** người dùng đã có dữ liệu hoặc tùy chọn được lưu, **When** họ mở lại sản phẩm sau thay đổi, **Then** dữ liệu, tùy chọn và phạm vi truy cập vẫn được giữ nguyên.
3. **Given** một thao tác đang tải, thất bại, bị vô hiệu hóa hoặc không có dữ liệu, **When** trạng thái đó xảy ra, **Then** người dùng vẫn nhìn thấy thông tin và hành động tương ứng như trước.

---

### User Story 3 - Sử dụng giao diện dễ đọc và dễ thao tác (Priority: P2)

Người dùng nhận biết điều hướng, nội dung, hành động chính và trạng thái dễ dàng hơn trên màn hình lớn và nhỏ, kể cả khi dùng bàn phím hoặc giảm chuyển động.

**Why this priority**: Giao diện được cải thiện chỉ có giá trị khi vẫn dễ sử dụng trong các điều kiện thực tế.

**Independent Test**: Kiểm tra các hành trình chính tại các độ rộng 320, 375, 414 và 768 điểm ảnh cùng một màn hình máy tính; thực hiện các thao tác chính bằng bàn phím và kiểm tra trạng thái giảm chuyển động.

**Acceptance Scenarios**:

1. **Given** người dùng mở một màn hình được cải thiện, **When** họ tìm một hành động hoặc kết quả, **Then** nhãn, thứ bậc và trạng thái thể hiện rõ ràng, nhất quán với các màn hình khác.
2. **Given** màn hình hẹp, **When** người dùng điều hướng và hoàn thành hành trình chính, **Then** các điều khiển và nội dung cần thiết vẫn có thể tiếp cận; trang không bị tràn ngang ngoài vùng nội dung chuyên biệt cần cuộn.
3. **Given** người dùng dùng bàn phím hoặc bật giảm chuyển động, **When** họ tương tác với giao diện, **Then** vị trí đang chọn luôn nhìn thấy và chuyển động không cản trở thao tác.

### Edge Cases

- SQL dài, biểu đồ lớn, bảng rộng và thông báo dài vẫn đọc và thao tác được mà không che khuất điều khiển; vùng nội dung chuyên biệt được phép cuộn khi cần.
- Truy vấn rỗng, không hợp lệ hoặc không được hỗ trợ vẫn hiển thị đúng thông báo và tùy chọn xử lý hiện có.
- Các trạng thái tải, lỗi, không có kết quả, vô hiệu hóa và quyền truy cập hạn chế không bị che giấu hoặc biến thành trạng thái thành công.
- Dữ liệu đã lưu, nội dung chưa lưu, kết quả cũ và việc tải lại hoặc điều hướng giữ nguyên hành vi hiện tại.
- Khi dịch vụ AI hoặc lưu trữ không khả dụng, người dùng vẫn nhận được phản hồi và khả năng phục hồi theo hành vi hiện tại.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Giao diện của các màn hình và trạng thái hiện có MUST được cải thiện theo hướng nhất quán về thứ bậc nội dung, khả năng đọc, điều hướng và phản hồi thao tác, sử dụng Hallmark làm phương pháp thiết kế.
- **FR-002**: Trước khi thay đổi, nhóm thực hiện MUST lập danh mục các màn hình, luồng, hành động, trạng thái, vai trò và quyền truy cập thực sự hiện có; danh mục này là cơ sở đối chiếu sau thay đổi.
- **FR-003**: Mọi mục trong danh mục theo FR-002 MUST vẫn có thể truy cập và hoạt động với cùng đầu vào, kết quả, thứ tự xử lý, quyền truy cập và hành vi lưu trữ như trước; không thêm, loại bỏ hoặc thay đổi tính năng nghiệp vụ.
- **FR-004**: Các khả năng hiện có của trình soạn thảo, phân tích SQL và MyBatis, chỉ số, biểu đồ quan hệ, phân tích JOIN và CTE, điều hướng tới dòng nguồn, so sánh và sinh mã MUST được bảo toàn.
- **FR-005**: Các khả năng hiện có của đăng nhập, cài đặt, lịch sử, xuất dữ liệu và tính năng AI, bao gồm phản hồi theo tiến trình, trích dẫn và xử lý lỗi khi có, MUST được bảo toàn.
- **FR-006**: Giao diện MUST giữ nguyên nội dung và ý nghĩa của các nhãn, kết quả, cảnh báo, thông báo lỗi và các lựa chọn hiện có; thay đổi cách trình bày không được làm mất thông tin.
- **FR-007**: Người dùng MUST có thể nhận biết và sử dụng các hành động sẵn có ở trạng thái mặc định, được chọn, đang xử lý, vô hiệu hóa, thành công và lỗi, khi các trạng thái này áp dụng.
- **FR-008**: Tại độ rộng 320, 375, 414 và 768 điểm ảnh và trên màn hình máy tính, các hành trình chính MUST vẫn sử dụng được, không có nội dung hoặc điều khiển thiết yếu bị cắt; cho phép cuộn trong vùng chuyên biệt như trình soạn thảo, bảng và biểu đồ.
- **FR-009**: Các điều khiển tương tác hiện có MUST tiếp tục sử dụng được bằng bàn phím, có dấu hiệu tập trung nhìn thấy và tôn trọng lựa chọn giảm chuyển động của người dùng.
- **FR-010**: Thay đổi MUST giữ nguyên cấu trúc điều hướng, các địa chỉ truy cập, dữ liệu người dùng, tùy chọn, phân quyền và các ranh giới bảo mật hiện có.
- **FR-011**: Những tính năng chưa hoàn thành trước thay đổi MUST giữ nguyên trạng thái hiện có; việc cải thiện giao diện không được biểu thị chúng đã hoàn thành hoặc mở rộng quyền truy cập.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% mục trong danh mục theo FR-002 được đối chiếu trước và sau; không có chức năng, trạng thái hoặc quyền truy cập hiện có bị mất hoặc thay đổi ngoài hình thức.
- **SC-002**: Với cùng dữ liệu và điều kiện thử, 100% hành trình phân tích, khám phá, so sánh, sinh mã, lịch sử, cài đặt, đăng nhập và AI có sẵn trong danh mục cho kết quả và hành vi tương đương trước thay đổi.
- **SC-003**: 100% hành trình chính được kiểm tra tại 320, 375, 414 và 768 điểm ảnh cùng một màn hình máy tính mà không có điều khiển thiết yếu bị cắt hoặc tràn ngang toàn trang.
- **SC-004**: 100% điều khiển tương tác trong các hành trình chính có thể sử dụng bằng bàn phím và hiển thị vị trí tập trung; các hành trình đó hoàn tất khi bật giảm chuyển động.
- **SC-005**: Trong đánh giá với ít nhất 5 người dùng mục tiêu, ít nhất 4 người xác định được hành động chính và hoàn thành hành trình phân tích SQL đại diện mà không cần hướng dẫn, đồng thời đánh giá giao diện dễ hiểu.

## Assumptions

- Phạm vi bao gồm các bề mặt người dùng hiện có của sản phẩm; nguồn sự thật là ứng dụng và hành vi thực tế trước thay đổi, không phải các tính năng được mô tả nhưng chưa hoàn thành.
- Đối tượng chính là người cần phân tích và khám phá truy vấn SQL; phong cách thị giác cụ thể sẽ được xác định trong bước thiết kế Hallmark mà không thay đổi kiến trúc thông tin hiện có.
- Kiểm tra tương đương dùng cùng dữ liệu, quyền truy cập và điều kiện dịch vụ trước và sau; các dịch vụ tùy chọn được đánh giá khi khả dụng và trạng thái không khả dụng cũng được đối chiếu.
- Không có yêu cầu bổ sung tính năng, di chuyển dữ liệu, thay đổi quy tắc nghiệp vụ hoặc thay đổi phân quyền.
