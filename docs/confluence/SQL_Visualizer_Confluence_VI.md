# SQL Visualizer
## Nền tảng phân tích, trực quan hóa và tối ưu hóa SQL bằng AI

> **Tài liệu tổng quan sản phẩm dành cho Ban quản lý, chuyên viên phân tích nghiệp vụ, trưởng nhóm kỹ thuật và nhóm phát triển**  
> SQL Visualizer giúp biến những truy vấn SQL phức tạp thành thông tin dễ hiểu, có thể quan sát, đo lường và cải thiện — từ việc hiểu cấu trúc truy vấn đến phát hiện vấn đề và đề xuất tối ưu hóa.

---

## 1. Tóm tắt điều hành

**SQL Visualizer** là một nền tảng phân tích SQL trên nền web, được thiết kế để hỗ trợ lập trình viên và đội kỹ thuật hiểu sâu hơn về cách một truy vấn được hình thành, các thành phần dữ liệu liên quan và những điểm có thể ảnh hưởng đến chất lượng cũng như hiệu năng.

Thay vì chỉ nhìn SQL như một khối mã khó đọc, SQL Visualizer tiếp cận truy vấn theo nhiều góc nhìn:

- **Hiểu** — phân rã và giải thích cấu trúc SQL.
- **Trực quan hóa** — thể hiện quan hệ giữa các bảng, JOIN, CTE và nguồn gốc dữ liệu.
- **Định lượng** — đo độ phức tạp của truy vấn bằng hệ thống chỉ số.
- **Diễn giải** — chuyển SQL thành phần giải thích bằng ngôn ngữ tự nhiên.
- **Tối ưu hóa** — hỗ trợ phát hiện vấn đề và đề xuất cách cải thiện bằng AI.
- **Hỗ trợ** — cung cấp trợ lý cơ sở dữ liệu và RAG dựa trên tài liệu chính thức hoặc tài liệu dự án.

### Giá trị cốt lõi

SQL Visualizer hướng tới việc rút ngắn khoảng cách giữa **độ phức tạp của SQL** và **sự thấu hiểu của con người**, giúp đội kỹ thuật phân tích truy vấn nhanh hơn, nhất quán hơn và có cơ sở rõ ràng hơn khi tối ưu.

---

## 2. Tầm nhìn sản phẩm

### Từ mã SQL đến trí tuệ SQL

Một truy vấn SQL phức tạp thường chứa nhiều lớp logic: JOIN, CTE, truy vấn con, hàm cửa sổ, bộ lọc và các phép biến đổi dữ liệu. Khi tất cả được thể hiện dưới dạng văn bản, việc hiểu toàn bộ luồng dữ liệu có thể mất nhiều thời gian.

SQL Visualizer chuyển truy vấn từ một **dạng văn bản thuần** thành một **góc nhìn phân tích tương tác**, trong đó người dùng có thể:

1. Nhìn thấy cấu trúc và quan hệ dữ liệu.
2. Xác định nguồn gốc của từng trường.
3. Đánh giá độ phức tạp.
4. Hiểu mục tiêu và logic của truy vấn.
5. Nhận diện các điểm cần xem xét về chất lượng và hiệu năng.
6. So sánh và áp dụng các phương án tối ưu hóa có kiểm soát.

---

## 3. Người dùng mục tiêu

| Đối tượng | Nhu cầu chính | Giá trị từ SQL Visualizer |
|---|---|---|
| **Lập trình viên phía máy chủ** | Hiểu, gỡ lỗi và tối ưu hóa SQL | Phân tích cấu trúc, chỉ số, AI diễn giải, AI tối ưu |
| **Lập trình viên cấp cao / Trưởng nhóm kỹ thuật** | Rà soát chất lượng và độ phức tạp của SQL | Biểu đồ quan hệ, phân tích CTE, chấm điểm và so sánh trước/sau |
| **Chuyên viên cơ sở dữ liệu** | Phân tích truy vấn và cơ hội tối ưu | Phân tích JOIN, phân tích CTE và truy vấn con, trợ lý tối ưu hóa |
| **Lập trình viên mới / chưa có nhiều kinh nghiệm** | Học và hiểu SQL phức tạp | Giải thích bằng ngôn ngữ tự nhiên và trực quan hóa |
| **Quản lý kỹ thuật** | Hiểu về năng lực kỹ thuật và hiệu quả vận hành | Tổng quan năng lực, chỉ số và giá trị kinh doanh |

---

## 4. Bản đồ năng lực sản phẩm

SQL Visualizer được tổ chức thành năm nhóm năng lực chính:

### A. Hiểu SQL
- Nhập truy vấn & phân tích SQL
- Phân tích CTE
- Ánh xạ nguồn gốc trường dữ liệu
- Chuẩn hóa MyBatis XML sang SQL
- Trình soạn thảo SQL thông minh

### B. Trực quan hóa SQL
- Biểu đồ quan hệ
- Quan hệ tương tác giữa các bảng
- Phân tích điều kiện JOIN
- Xuất hình Mermaid / hình ảnh

### C. Chất lượng & độ phức tạp của SQL
- Điểm độ phức tạp 0–100
- Chỉ số truy vấn
- Đối chiếu dòng nguồn gốc
- Phân tích theo thời gian thực

### D. Trí tuệ AI
- AI diễn giải SQL
- AI tối ưu hóa truy vấn
- Trợ lý AI cơ sở dữ liệu
- AI chẩn đoán lỗi định dạng
- Trợ lý tư vấn tài liệu

### E. Năng suất
- Lịch sử truy vấn
- Tìm kiếm ngữ nghĩa
- Lịch sử cuộc trò chuyện Trợ lý AI cơ sở dữ liệu
- SQL → Trình sinh mã
- Giao diện đa ngôn ngữ
- Đọc nội dung bằng giọng nói

---

# 5. Năng lực chức năng chi tiết

## 5.1 Nhập truy vấn & phân tích SQL

Cho phép người dùng nhập trực tiếp SQL hoặc cung cấp truy vấn từ tệp MyBatis XML.

### Khả năng chính

- Hỗ trợ **MySQL, PostgreSQL, SQL Server và Oracle**.
- Phân tích tức thời bảng, cột, JOIN và các mệnh đề trong truy vấn.
- Hỗ trợ nhập **MyBatis XML** và chuẩn hóa thành SQL thuần.
- Cho phép cấu hình tham số và xem trước kết quả.
- Lưu lịch sử truy vấn để phục vụ việc xem lại và tìm kiếm.

**Giá trị kinh doanh:** Giảm thời gian chuẩn bị và phân tích SQL trước khi rà soát, gỡ lỗi hoặc tối ưu.

---

## 5.2 Biểu đồ quan hệ

Biến quan hệ giữa các bảng trong một truy vấn thành **đồ thị tương tác**, giúp người dùng nhanh chóng hình dung luồng dữ liệu.

### Khả năng chính

- Các nút đại diện cho bảng.
- Các cạnh đại diện cho quan hệ JOIN.
- Phân loại quan hệ bằng màu sắc.
- Hỗ trợ nhiều bố cục để tối ưu khả năng quan sát.
- Phân tích điều kiện JOIN theo cột, toán tử và độ phức tạp.
- Xuất ra định dạng Mermaid hoặc hình ảnh.

**Giá trị kinh doanh:** Giảm gánh nặng nhận thức khi phân tích truy vấn có nhiều bảng và quan hệ JOIN phức tạp.

---

## 5.3 Bảng chỉ số

Bảng chỉ số cung cấp một góc nhìn định lượng về độ phức tạp của SQL.

### Điểm độ phức tạp

Truy vấn được đánh giá trên thang **0–100**, kết hợp với các chỉ số như:

- Số lượng từ khóa SQL.
- Số trường trong mệnh đề SELECT.
- Số lượng JOIN.
- Số CTE.
- Số truy vấn con.
- Số hàm cửa sổ.

Mỗi chỉ số và truy vấn con đều được liên kết với **dòng nguồn tương ứng**, cho phép người dùng chuyển thẳng đến vị trí đó trong trình soạn thảo SQL thông minh.

### Phân loại độ phức tạp

Mức độ phức tạp được phân loại thành:

- Thấp
- Trung bình
- Cao

---

## 5.4 Phân tích CTE & nguồn gốc trường

Tính năng này tập trung vào việc trả lời hai câu hỏi quan trọng:

> **CTE được tổ chức như thế nào?**  
> **Một trường dữ liệu trong kết quả cuối cùng thực sự xuất phát từ đâu?**

### Khả năng chính

- Cây phụ thuộc giữa các CTE.
- Phát hiện CTE đệ quy.
- Phát hiện CTE không được sử dụng.
- Ánh xạ nguồn gốc trường dữ liệu.
- Phân tích truy vấn con lồng nhau và theo dõi độ sâu.
- Sao chép SQL của từng CTE để tái sử dụng.

---

## 5.5 Soạn thảo SQL thông minh

Trình soạn thảo SQL thông minh dùng **Monaco Editor**, mang lại trải nghiệm tương tự VS Code.

### Khả năng chính

- Tô màu cú pháp.
- Bản đồ thu nhỏ.
- Hỗ trợ nhiều biến thể SQL.
- Định dạng SQL.
- So sánh khác biệt trước/sau.
- Phân tích theo thời gian thực.
- Các thẻ thao tác xếp ở cạnh phải nhằm tối ưu không gian làm việc.

---

## 5.6 AI diễn giải SQL

AI diễn giải SQL chuyển truy vấn thành phần giải thích có cấu trúc bằng ngôn ngữ tự nhiên.

Thay vì chỉ mô tả cú pháp, phần giải thích tập trung vào **ý nghĩa và logic của truy vấn**, bao gồm:

- **Mục tiêu truy vấn** — truy vấn đang nhằm đạt được điều gì.
- **Bộ lọc & ràng buộc** — các điều kiện lọc và ràng buộc chính.
- **Nguồn dữ liệu** — những bảng hoặc nguồn dữ liệu được sử dụng.
- **Kết quả đầu ra** — dữ liệu đầu ra và cách nó được hình thành.

Hỗ trợ:

- Cập nhật câu trả lời theo thời gian thực.
- Sao chép kết quả.
- Đọc thành tiếng.

---

## 5.7 Tối ưu hóa truy vấn bằng AI

AI Tối ưu hóa hỗ trợ người dùng đánh giá và cải thiện SQL theo hướng có kiểm soát.

### Luồng tối ưu hóa

**Phân tích tĩnh → Rà soát ngữ nghĩa → Đề xuất tối ưu → Truy vấn viết lại → So sánh trước/sau → Người dùng xác nhận**

### Nguyên tắc thiết kế

- Thực hiện **rà soát ngữ nghĩa** trước khi tối ưu.
- Hiển thị đề xuất và truy vấn đã viết lại theo thời gian thực.
- Cho phép áp dụng từng đề xuất hoặc toàn bộ phiên tối ưu.
- Có bước xác nhận trước khi thay đổi.
- Hỗ trợ tối ưu hóa theo yêu cầu khi người dùng cho phép thay đổi ngữ nghĩa của truy vấn.
- Đề xuất dựa trên dữ liệu phân tích tĩnh như bảng, JOIN và CTE; không tự tạo suy đoán không có trong truy vấn.

---

## 5.8 Trợ lý AI cơ sở dữ liệu

Trợ lý AI cơ sở dữ liệu cung cấp giao diện hội thoại cho các câu hỏi liên quan đến cơ sở dữ liệu.

Có thể hỗ trợ các chủ đề:

- SQL.
- Thiết kế lược đồ dữ liệu.
- Chỉ mục.
- Giao dịch.
- Hiệu năng cơ sở dữ liệu.

### RAG

Trợ lý sử dụng kỹ thuật RAG (sinh văn bản tăng cường truy xuất) dựa trên các tài liệu chính thức của:

- SQL Server
- MySQL
- PostgreSQL
- Oracle

Mỗi câu trả lời có thể hiển thị nhãn nguồn tài liệu tương ứng.

---

## 5.9 Trợ lý tư vấn tài liệu

Trợ lý tư vấn tài liệu áp dụng RAG trên chính tài liệu tính năng của ứng dụng.

### Luồng xử lý

**Câu hỏi → Biểu diễn vector → Truy xuất tài liệu liên quan → Câu trả lời theo ngữ cảnh → Trích dẫn nguồn**

Mục tiêu là giúp người dùng tìm hiểu cách sử dụng SQL Visualizer mà không cần tự tìm kiếm thủ công trong toàn bộ tài liệu.

---

## 5.10 Lịch sử truy vấn & tìm kiếm ngữ nghĩa

SQL Visualizer lưu lại các truy vấn đã được phân tích ở máy chủ.

Người dùng có thể tìm kiếm theo **ý nghĩa ngữ nghĩa**, thay vì chỉ dựa trên **so khớp chuỗi con**.

Điều này giúp tìm lại các truy vấn tương tự ngay cả khi cách diễn đạt hoặc nội dung văn bản không hoàn toàn giống nhau.

---

## 5.11 Chuẩn hóa MyBatis XML → SQL

Tính năng chuẩn hóa MyBatis chuyển SQL động thành SQL thuần để có thể tiếp tục phân tích.

Hỗ trợ:

- Tham số.
- `<if>`.
- `<foreach>`.
- Các đoạn SQL dùng lại.
- SQL động.

Sau khi chuẩn hóa, SQL có thể được đưa tiếp vào các bước phân tích và tối ưu hóa.

---

## 5.12 Chẩn đoán lỗi định dạng bằng AI

Khi định dạng SQL gặp lỗi, hệ thống hiển thị một **bảng chẩn đoán** ở cạnh phải thay vì chỉ dùng thông báo bật lên.

AI có thể:

1. Giải thích lỗi.
2. Xác định nguyên nhân gốc.
3. Đề xuất cách sửa tối thiểu.
4. So sánh kết quả trước và sau khi sửa.
5. Chỉ áp dụng thay đổi sau khi người dùng xác nhận.

Đối với tính năng này, AI chạy cục bộ thông qua **Ollama**, giúp SQL không phải rời khỏi thiết bị.

---

## 5.13 Xác thực & phân quyền

Hệ thống hỗ trợ:

- Đăng nhập dùng thử.
- Google OAuth.
- Microsoft OAuth.
- Duy trì phiên đăng nhập.
- Luồng chuyển hướng phù hợp.

Phân quyền được thực thi tại ranh giới máy chủ; việc chỉ ẩn giao diện không được coi là cơ chế phân quyền.

### Hướng dẫn cấu hình đăng nhập Google & Microsoft

Đăng nhập xã hội chạy hoàn toàn phía trình duyệt theo OAuth 2.0 implicit flow (`response_type=token`),
không cần OAuth client phía máy chủ: nút đăng nhập mở màn hình đồng ý của nhà cung cấp trong một popup,
trang `/oauth/callback` chuyển kết quả về bảng đăng nhập qua `postMessage`, và máy chủ xác minh access
token nhận được rồi mới cấp session cookie. Mỗi nhà cung cấp được bật bằng một client ID công khai trong
`.env.local`:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=your-azure-app-client-id
```

| Nhà cung cấp | Endpoint ủy quyền | Scope | Redirect URI |
|---|---|---|---|
| Google | `https://accounts.google.com/o/oauth2/v2/auth` | `openid profile email` | `<origin>/oauth/callback` |
| Microsoft | `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` | `openid profile email User.Read` | `<origin>/oauth/callback` |

`<origin>` là scheme, host và cổng đang phục vụ ứng dụng (`http://localhost:4028` cho development
server). Hồ sơ được đọc từ `https://www.googleapis.com/oauth2/v3/userinfo` (Google) hoặc
`https://graph.microsoft.com/v1.0/me` (Microsoft Graph).

**Google.** Trong Google Cloud Console → APIs & Services → Credentials, tạo OAuth client ID loại *Web
application* với `http://localhost:4028` là Authorized JavaScript origin và
`http://localhost:4028/oauth/callback` là Authorized redirect URI, sau đó copy Client ID vào
`NEXT_PUBLIC_GOOGLE_CLIENT_ID`. Khi OAuth consent screen còn ở trạng thái *Testing*, chỉ những người dùng
được thêm vào danh sách test users mới đăng nhập được.

**Microsoft.** Trong Azure portal, đăng ký ứng dụng tại Microsoft Entra ID → App registrations với
supported account types là *Accounts in any organizational directory and personal Microsoft accounts*
(ứng dụng gọi authority `/common`), redirect URI nền tảng **Single-page application (SPA)** là
`http://localhost:4028/oauth/callback`, và quyền Microsoft Graph delegated **User.Read**. Không cần
client secret; copy Application (client) ID vào `NEXT_PUBLIC_MICROSOFT_CLIENT_ID`.

Vì giá trị `NEXT_PUBLIC_*` được nhúng lúc Next.js khởi động, development server phải được khởi động lại
sau khi thay đổi một trong hai biến. Nếu thiếu client ID, nút tương ứng sẽ báo rõ biến nào còn thiếu thay
vì mở popup; popup phải được cho phép cho origin của ứng dụng; và phiên bản triển khai thật phải đăng ký
origin thực tế ở cả hai console, ví dụ `https://your-domain/oauth/callback`.

---

### Truy cập với tư cách khách (đang phát triển)

Đang bổ sung luồng "tiếp tục dùng mà không cần tài khoản" để khách truy cập có thể đánh giá sản phẩm mà
không cần thông tin đăng nhập. Khách truy cập xác nhận một thông báo ngắn, trong đó nêu rõ những gì không
dùng được và lý do, sau đó được cấp quyền với tư cách **khách** ẩn danh — được ghi nhận dưới dạng
dấu nhận diện trên phiên hiện có chứ không phải một danh tính mới, và không mang theo địa chỉ thư điện tử, tên hay mã thông báo.

Khách vẫn sử dụng được toàn bộ các tính năng không dùng AI: phân tích cú pháp và định dạng SQL, đồ thị quan hệ,
chấm điểm độ phức tạp, bảng chỉ số, phân tích CTE, và mọi định dạng xuất ra.

Các tính năng dùng AI được dành riêng cho người đã đăng nhập:

| Loại tính năng | Trải nghiệm của khách |
|---|---|
| Không dùng mô hình (phân tích cú pháp, chấm điểm, đồ thị, xuất tệp) | Sử dụng được |
| **Mọi** tính năng có dùng mô hình, bất kể nhà cung cấp | Bị khóa, kèm giải thích và đường dẫn đăng nhập một chạm |
| Chỉ riêng tính năng giải thích và sửa lỗi định dạng | Sử dụng được — luôn chạy cục bộ nên không tốn chi phí của nhà vận hành |

Dòng giữa là chủ ý. Mô hình cục bộ là nhà cung cấp *mặc định*, nên nếu mở ngoại lệ cho nó thì gần như mọi
tính năng AI vẫn mở với khách mới, trong khi trông như là đã bị hạn chế. Ngoại lệ duy nhất là con
đường luôn chạy cục bộ nên không phát sinh chi phí nào cần bảo vệ.

Mọi lần từ chối đều được kiểm soát ở máy chủ, trước khi tiêu thụ bất kỳ dung lượng mô hình nào, và được ghi lại để
nhà vận hành tra cứu mà không lưu nội dung lệnh nhắc hay thông tin xác thực.

**Trạng thái: đang phát triển.** Phần giao diện đang được thực hiện; cơ chế kiểm soát ở máy chủ chưa
được đưa vào, nên hiện các điểm cuối AI vẫn chấp nhận yêu cầu chưa được xác thực. Không nên xem tính năng
này là đã hoàn thành, và không nên triển khai công khai cho tới khi cơ chế kiểm soát hoàn tất.

---

## 5.14 Đa ngôn ngữ

SQL Visualizer hỗ trợ:

- Tiếng Việt.
- Tiếng Anh.

Ngôn ngữ được chuyển đổi tức thời và lựa chọn của người dùng được lưu lại. Nội dung AI cũng thay đổi theo ngôn ngữ hiện tại.

---

## 5.15 Đọc nội dung bằng giọng nói

Cho phép đọc thành tiếng các nội dung giải thích hoặc đề xuất từ AI.

Cơ chế sử dụng:

- Công cụ tổng hợp giọng nói của trình duyệt.
- Tùy chọn giọng đọc cục bộ qua Piper.

---

## 5.16 Lịch sử cuộc trò chuyện Trợ lý AI cơ sở dữ liệu

Lịch sử cuộc trò chuyện cung cấp một hệ thống quản lý hội thoại lâu dài cho Trợ lý AI cơ sở dữ liệu, cho phép người dùng duy trì nhiều cuộc trò chuyện, tìm kiếm các thảo luận trước đây và quản lý kho cuộc trò chuyện một cách hiệu quả.

### Khả năng chính

- **Lưu trữ cuộc trò chuyện**: Cuộc trò chuyện được tự động lưu vào bộ nhớ trình duyệt theo từng danh tính người dùng, đảm bảo dữ liệu được lưu trữ an toàn và độc lập.
- **Nhiều cuộc trò chuyện**: Người dùng có thể tạo và duy trì nhiều cuộc trò chuyện riêng biệt, mỗi cuộc có lịch sử và ngữ cảnh của riêng nó.
- **Quản lý cuộc trò chuyện**: 
  - Tạo cuộc trò chuyện mới
  - Tìm kiếm cuộc trò chuyện theo tiêu đề và nội dung tin nhắn người dùng
  - Đổi tên cuộc trò chuyện với tiêu đề tùy chỉnh
  - Xóa từng cuộc trò chuyện
  - Xóa toàn bộ lịch sử cuộc trò chuyện cùng lúc
- **Nhóm theo độ gần đây**: Cuộc trò chuyện tự động được nhóm theo thời điểm (Hôm nay, Hôm qua, 7 ngày trước, Cũ hơn) để dễ điều hướng.
- **Lưu trữ theo danh tính**: Cuộc trò chuyện được phân tách an toàn theo danh tính người dùng:
  - Người dùng đăng nhập qua mạng xã hội (Google, Microsoft OAuth): Phân tách theo nhà cung cấp và mã băm của địa chỉ thư điện tử
  - Người dùng dùng thử: Phân tách theo khóa dùng thử cố định
  - Người dùng khách: Không được lưu (bộ nhớ bị vô hiệu)
- **Khả năng phục hồi lỗi**:
  - Xử lý nhẹ nhàng khi bộ nhớ không khả dụng (duyệt ở chế độ riêng tư, vượt quá hạn mức dung lượng)
  - Tự động phục hồi khi dữ liệu hỏng (dữ liệu không hợp lệ bị loại bỏ, dữ liệu hợp lệ được bảo toàn)
  - Thông báo lỗi không chặn để tránh gián đoạn thao tác của người dùng
- **Hỗ trợ quốc tế**: Đa ngôn ngữ hoàn chỉnh (Tiếng Anh, Tiếng Việt) với thuật ngữ nhất quán trên toàn bộ các thành phần giao diện

### Giao diện người dùng

Bảng lịch sử trò chuyện có sẵn trong Trợ lý AI cơ sở dữ liệu:

**Máy tính (≥1024px)**:
- Thanh bên cố định ở bên trái
- Hiển thị danh sách cuộc trò chuyện, tìm kiếm và các điều khiển quản lý
- Ẩn/hiện bảng mà không mất ngữ cảnh cuộc trò chuyện

**Điện thoại (<1024px)**:
- Hộp trượt có thể thu gọn
- Truy cập qua nút bật/tắt ở thanh đầu trang
- Bố cục được tối ưu cho thao tác trên màn hình cảm ứng

### Triển khai kỹ thuật

- **Lưu trữ**: Gọi API bộ nhớ localStorage của trình duyệt một cách đồng bộ, dùng hàm băm FNV-1a 32-bit để phân vùng dữ liệu theo danh tính
- **Quản lý trạng thái**: Bộ nhớ trạng thái Zustand quản lý vòng đời cuộc trò chuyện và đồng bộ giao diện theo thời gian thực
- **An toàn kiểu dữ liệu**: Tuân thủ đầy đủ chế độ nghiêm ngặt của TypeScript, kèm các hàm kiểm tra giá trị khi chương trình chạy
- **Xử lý lỗi**: Mô hình coi lỗi là giá trị (không bao giờ ném lỗi; mọi lỗi được trả về dưới dạng hợp nhất có kiểu dữ liệu)
- **Kỷ luật ghi**: Mỗi lần chuyển trạng thái cuộc trò chuyện (tạo, gửi, hoàn tất, đổi tên, xóa, xóa toàn bộ) chỉ thực hiện một lần ghi dữ liệu; không ghi trong quá trình truyền dữ liệu trực tiếp

### Yêu cầu truy cập

- **Đối tượng sử dụng**: Người dùng đã xác thực (đăng nhập qua mạng xã hội hoặc dùng thử) và khách (chỉ được đọc)
- **Lưu trữ cục bộ**: Trên thiết bị của người dùng qua bộ nhớ localStorage của trình duyệt
- **Phía máy chủ**: Không lưu cuộc trò chuyện ở máy chủ; toàn bộ lịch sử được lưu trên thiết bị của người dùng

### Lợi ích

- **Liên tục**: Người dùng có thể tiếp tục cuộc trò chuyện bất kỳ lúc nào mà không mất ngữ cảnh
- **Tổ chức**: Tìm kiếm và nhóm cuộc trò chuyện giúp người dùng tìm thấy các thảo luận liên quan nhanh chóng
- **Hiệu quả**: Giảm việc lặp lại các truy vấn và lời giải thích tương tự cho cơ sở dữ liệu
- **Bảo mật riêng tư**: Toàn bộ lịch sử cuộc trò chuyện nằm trên thiết bị của người dùng; không đồng bộ lên đám mây và không theo dõi hành vi

---

## 5.17 SQL → Trình sinh mã

Trình sinh mã SQL chuyển câu lệnh SQL thành mã ở tầng ứng dụng. Nó được cung cấp dưới dạng một thẻ phương thức nhập riêng trên trang Nhập truy vấn hiện có (cùng với các phương thức Dán SQL, MyBatis và Trình soạn thảo thông minh), chứ không phải một trang riêng biệt.

### Khả năng chính

- **Phân loại SQL**: mỗi câu lệnh được phân loại là định nghĩa bảng, `SELECT` trả về thực thể, DTO, dữ liệu tổng hợp, kết nối JOIN hay câu lệnh DML, và đầu ra được đề xuất dựa trên phân loại đó.
- **Sinh thực thể**: một câu `CREATE TABLE` trở thành thực thể Java/JPA với các chú thích `@Entity`, `@Table`, `@Id` và `@Column`, giữ nguyên tính chấp nhận giá trị NULL, và các quan hệ được suy luận từ khóa chính/khóa ngoại.
- **Sinh DTO / lớp chiếu**: một câu `SELECT` trở thành lớp DTO hoặc lớp chiếu với tên thuộc tính dẫn xuất từ cột và bí danh, bao gồm cả các trường tổng hợp được gán kiểu phù hợp.
- **Ánh xạ kiểu và đặt tên**: kiểu dữ liệu SQL được ánh xạ sang kiểu của ngôn ngữ đích qua một bảng ánh xạ tập trung, và tên thuộc tính theo chiến lược có thể chọn (camelCase, PascalCase, hoặc giữ nguyên tên SQL).
- **Tùy chọn có thể cấu hình**: loại đầu ra (Thực thể, DTO / Lớp chiếu, hoặc Tự động), bao gồm quan hệ, Lombok, chú thích kiểm tra hợp lệ và các tùy chọn khác được chọn trước khi sinh mã.
- **Xem trước và xuất**: mã sinh ra hiển thị trong trình soạn thảo có tô màu cú pháp, cho phép sao chép vào bộ nhớ tạm và tải về dưới dạng tệp `.java`.
- **Chẩn đoán thay vì đoán mò**: SQL chưa hỗ trợ hoặc mơ hồ sẽ tạo ra cảnh báo có thể xử lý, và mọi giả định (chẳng hạn tính một–nhiều của quan hệ) đều được ghi lại thay vì âm thầm áp dụng.

### Phạm vi và lộ trình

- **Hiện có sẵn**: Java / JPA (Hibernate).
- **Kế hoạch**: C# / EF Core, Python / SQLAlchemy, TypeScript / TypeORM, Go / GORM và Kotlin / JPA được liệt kê là các đích kế hoạch và được đánh dấu rõ ràng trong giao diện là chưa được hỗ trợ.

### Cơ chế sinh lại mã

Việc sinh lại mã sẽ thay thế kết quả trước đó — theo mô hình xem trước thời gian thực thay vì lưu lịch sử các phiên bản — và thao tác **Đặt lại** khôi phục đầu vào SQL ban đầu và xóa kết quả đã sinh. Thẻ giữ bản nháp SQL riêng, nên khi chuyển đổi giữa các phương thức nhập sẽ không bao giờ ghi đè nội dung của các thẻ khác.

---

# 6. Kiến trúc kỹ thuật

## 6.1 Lớp giao diện

| Lớp | Công nghệ |
|---|---|
| Nền tảng | Next.js 15 — App Router |
| Giao diện | React 19, Tailwind CSS |
| Quản lý trạng thái | Zustand |
| Trình soạn thảo SQL | Monaco Editor |
| Trực quan hóa | ReactFlow |
| Trình phân tích cú pháp SQL | dt-sql-parser |
| Kiểm thử | Vitest |

## 6.2 AI & lớp máy chủ

SQL Visualizer được thiết kế theo hướng không phụ thuộc vào nhà cung cấp AI:

- **Ollama** — chạy AI cục bộ, không yêu cầu khóa API.
- **OpenAI**
- **Anthropic**
- **Gemini**

Các nhà cung cấp AI trên đám mây được sử dụng qua máy chủ trung gian để thông tin xác thực không bị lộ trên trình duyệt.

### Kiến trúc RAG

**Tài liệu → Biểu diễn vector → Kho dữ liệu vector → Truy xuất → Mô hình ngôn ngữ lớn → Câu trả lời kèm nguồn**

### Lưu trữ lịch sử

Lịch sử truy vấn được lưu ở máy chủ bằng tầng lưu trữ dựa trên bảng tính Excel theo tài liệu sản phẩm hiện tại.

Trợ lý AI cơ sở dữ liệu giữ **lịch sử hội thoại ở phía trình duyệt**, trong `localStorage`,
với một khóa cho mỗi danh tính đã đăng nhập; không có nội dung cuộc trò chuyện nào được lưu ở
máy chủ, và khách không có lịch sử lưu sẵn theo thiết kế. Lịch sử lưu ở máy chủ là một lựa chọn trong
tương lai đã được ghi nhận, nằm sau cùng một hợp đồng lưu trữ, nên bản thân trợ lý không cần thay đổi
để áp dụng nó.

---

# 7. Bảo mật & quyền riêng tư

Bảo mật được xem là một phần của kiến trúc hệ thống, không chỉ là một năng lực của giao diện.

### Nguyên tắc chính

- Khóa API được lưu ở máy chủ qua tệp `.env`.
- Thông tin xác thực không được phép lộ ra trình duyệt.
- Các chức năng tối ưu hóa và chẩn đoán định dạng chạy cục bộ, không gửi SQL ra ngoài thiết bị.
- Phân quyền được thực thi tại ranh giới máy chủ.
- Việc ẩn giao diện không được dùng làm cơ chế bảo mật.

---

# 8. Giá trị kinh doanh

SQL Visualizer mang lại giá trị ở nhiều lớp:

### 8.1 Năng suất kỹ thuật
Giảm thời gian cần thiết để đọc, phân tích và hiểu SQL phức tạp.

### 8.2 Chất lượng SQL
Cung cấp chỉ số, trực quan hóa và phân tích có AI hỗ trợ để nâng cao chất lượng truy vấn.

### 8.3 Nhận thức về hiệu năng
Giúp đội kỹ thuật nhận diện các điểm cần xem xét về hiệu năng và cung cấp các đề xuất tối ưu hóa có thể so sánh trước/sau.

### 8.4 Phổ cập kiến thức
Biến kiến thức về SQL và cơ sở dữ liệu thành thông tin dễ tiếp cận hơn thông qua giải thích bằng ngôn ngữ tự nhiên và RAG.

### 8.5 Bảo mật & linh hoạt trong triển khai
Cho phép lựa chọn AI cục bộ hoặc đám mây tùy theo yêu cầu về bảo mật và chính sách triển khai.

### 8.6 Khả năng tiếp cận toàn cầu
Hỗ trợ song ngữ Việt/Anh để mở rộng khả năng tiếp cận cho người dùng quốc tế.

---

# 9. Hành trình người dùng đầu-cuối

```text
SQL / MyBatis XML
       ↓
Chuẩn hóa truy vấn
       ↓
Phân tích SQL tĩnh
       ↓
┌───────────────────────────────────┐
│ Cấu trúc │ Chỉ số │ CTE │ Đồ thị │
└───────────────────────────────────┘
       ↓
Diễn giải bằng AI
       ↓
Phân tích tối ưu hóa
       ↓
Đề xuất + Truy vấn đã viết lại
       ↓
So sánh trước / sau
       ↓
Người dùng xác nhận
       ↓
Truy vấn được cải thiện
```

---

# 10. Trạng thái sản phẩm

| Năng lực | Trạng thái | Nhóm |
|---|---|---|
| Nhập truy vấn & phân tích SQL | Hoàn thành | Cốt lõi |
| Biểu đồ quan hệ | Hoàn thành | Cốt lõi |
| Bảng chỉ số | Hoàn thành | Cốt lõi |
| Phân tích CTE & nguồn gốc trường | Hoàn thành | Cốt lõi |
| Soạn thảo SQL thông minh | Hoàn thành | Cốt lõi |
| AI diễn giải SQL | Hoàn thành | AI |
| Tối ưu hóa truy vấn bằng AI | Hoàn thành | AI |
| Trợ lý AI cơ sở dữ liệu | Hoàn thành | AI |
| Trợ lý tư vấn tài liệu | Hoàn thành | AI |
| Lịch sử truy vấn & tìm kiếm ngữ nghĩa | Hoàn thành | AI |
| Lịch sử cuộc trò chuyện Trợ lý AI cơ sở dữ liệu | Hoàn thành | AI |
| SQL → Trình sinh mã (Java/JPA) | Hoàn thành | Năng suất |
| Chuẩn hóa MyBatis XML → SQL | Hoàn thành | Cốt lõi |
| Chẩn đoán lỗi định dạng bằng AI | Hoàn thành | AI |
| Đăng nhập Google / Microsoft | Hoàn thành | Xác thực |
| Truy cập khách (không cần tài khoản) | Đang phát triển | Xác thực |
| Tiếng Việt / Tiếng Anh | Hoàn thành | Trải nghiệm người dùng |
| Đọc nội dung bằng giọng nói | Hoàn thành | AI |

---

# 11. Lộ trình hiện tại / Phạm vi đã hoàn thành

- [x] Phân tích SQL cốt lõi.
- [x] Trực quan hóa quan hệ bảng.
- [x] Chỉ số và chấm điểm độ phức tạp.
- [x] Phân tích CTE và nguồn gốc trường.
- [x] Soạn thảo SQL thông minh.
- [x] AI diễn giải SQL.
- [x] Tối ưu hóa bằng AI.
- [x] Trợ lý AI cơ sở dữ liệu với RAG.
- [x] Lịch sử cuộc trò chuyện Trợ lý AI cơ sở dữ liệu (lưu bền vững, phân theo danh tính).
- [x] SQL → Trình sinh mã (lớp thực thể và DTO cho Java/JPA; các ngôn ngữ khác đang trong kế hoạch).
- [x] Chuẩn hóa MyBatis.
- [x] Chẩn đoán lỗi định dạng bằng AI.
- [x] OAuth Google / Microsoft.
- [ ] Truy cập khách không cần tài khoản — đang phát triển, chưa có cơ chế kiểm soát ở máy chủ.
- [x] Đa ngôn ngữ Tiếng Việt / Tiếng Anh.

---

## 12. Góc nhìn tổng kết

SQL Visualizer không đơn thuần là một trình soạn thảo SQL hay công cụ định dạng truy vấn.

Sản phẩm được định vị là một **nền tảng trí tuệ SQL** kết nối bốn lớp công việc kỹ thuật:

> **Hiểu → Trực quan hóa → Phân tích → Cải thiện**

Bằng cách đưa phân tích cấu trúc, trực quan hóa, độ phức tạp đo lường được, giải thích bằng ngôn ngữ tự nhiên và tối ưu hóa với sự hỗ trợ của AI vào cùng một quy trình, SQL Visualizer tạo ra một cách làm việc minh bạch hơn cho các đội kỹ thuật khi xử lý SQL phức tạp.

> **Mục tiêu rất đơn giản: làm cho SQL phức tạp dễ hiểu hơn, dễ rà soát hơn và dễ cải thiện hơn — trong khi lập trình viên vẫn nắm quyền kiểm soát mọi thay đổi.**

---

*Nguồn: Tài liệu tính năng nội bộ của SQL Visualizer. Các chi tiết kỹ thuật và phạm vi đã hoàn thành dựa trên tài liệu sản phẩm được cung cấp.*
