# SQL Visualizer
## Nền tảng phân tích, trực quan hóa và tối ưu hóa SQL bằng AI

> **Tài liệu tổng quan sản phẩm dành cho Management, BA, Technical Lead và Engineering Team**  
> SQL Visualizer giúp biến những truy vấn SQL phức tạp thành thông tin dễ hiểu, có thể quan sát, đo lường và cải thiện — từ việc hiểu cấu trúc truy vấn đến phát hiện vấn đề và đề xuất tối ưu hóa.

---

## 1. Tóm tắt điều hành

**SQL Visualizer** là một nền tảng phân tích SQL trên nền web, được thiết kế để hỗ trợ lập trình viên và đội kỹ thuật hiểu sâu hơn về cách một truy vấn được hình thành, các thành phần dữ liệu liên quan và những điểm có thể ảnh hưởng đến chất lượng cũng như hiệu năng.

Thay vì chỉ nhìn SQL như một khối code khó đọc, SQL Visualizer tiếp cận truy vấn theo nhiều góc nhìn:

- **Understand** — phân rã và giải thích cấu trúc SQL.
- **Visualize** — trực quan hóa quan hệ giữa các bảng, JOIN, CTE và nguồn gốc dữ liệu.
- **Measure** — định lượng độ phức tạp của truy vấn bằng hệ thống metrics.
- **Explain** — chuyển SQL thành phần giải thích bằng ngôn ngữ tự nhiên.
- **Optimize** — hỗ trợ phát hiện vấn đề và đề xuất cách cải thiện bằng AI.
- **Assist** — cung cấp trợ lý cơ sở dữ liệu và RAG dựa trên tài liệu chính thức hoặc tài liệu dự án.

### Giá trị cốt lõi

SQL Visualizer hướng tới việc rút ngắn khoảng cách giữa **SQL complexity** và **human understanding**, giúp đội kỹ thuật phân tích truy vấn nhanh hơn, nhất quán hơn và có cơ sở rõ ràng hơn khi tối ưu.

---

## 2. Tầm nhìn sản phẩm

### Từ mã SQL đến trí tuệ SQL

Một truy vấn SQL phức tạp thường chứa nhiều lớp logic: JOIN, CTE, subquery, window function, filter và các phép biến đổi dữ liệu. Khi tất cả được thể hiện dưới dạng text, việc hiểu toàn bộ luồng dữ liệu có thể mất nhiều thời gian.

SQL Visualizer chuyển truy vấn từ một **text-based artifact** thành một **interactive analytical view**, trong đó người dùng có thể:

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
| **Backend Developer** | Hiểu, debug và tối ưu SQL | Phân tích cấu trúc, metrics, AI Explainer, AI Optimize |
| **Senior Developer / Tech Lead** | Review chất lượng và độ phức tạp SQL | Relationship Graph, CTE Analysis, scoring và before/after comparison |
| **DBA / Database Engineer** | Phân tích query và các điểm cần tối ưu | JOIN analysis, CTE/subquery analysis, optimization assistant |
| **Developer mới / Junior** | Học và hiểu SQL phức tạp | Natural-language explanation và visualization |
| **Technical Manager** | Quan sát chất lượng và hiệu quả kỹ thuật | Tổng quan capability, metrics và business value |

---

## 4. Bản đồ năng lực sản phẩm

SQL Visualizer được tổ chức thành các nhóm capability chính:

### A. Hiểu SQL
- Query Input & Analysis
- CTE Analysis
- Field Origin Mapping
- MyBatis XML → SQL Normalization
- Smart SQL Editor

### B. Trực quan hóa SQL
- Relationship Graph
- Interactive table relationships
- JOIN condition analysis
- Mermaid / image export

### C. Chất lượng & độ phức tạp của SQL
- Complexity Score 0–100
- Query metrics
- Source-line mapping
- Real-time analysis

### D. Trí tuệ AI
- AI SQL Explainer
- AI Query Optimizer
- Database AI Assistant
- AI Format Error Diagnostics
- Docs Consultant Chat

### E. Năng suất
- Query History
- Semantic Search
- Multilingual UI
- Text-to-Speech

---

# 5. Năng lực chức năng chi tiết

## 5.1 Nhập truy vấn & phân tích SQL

Cho phép người dùng nhập trực tiếp SQL hoặc cung cấp truy vấn từ file MyBatis XML.

### Khả năng chính

- Hỗ trợ **MySQL, PostgreSQL, SQL Server và Oracle**.
- Phân tích tức thời bảng, cột, JOIN và các mệnh đề trong truy vấn.
- Hỗ trợ import **MyBatis XML** và chuẩn hóa thành SQL thuần.
- Cho phép cấu hình tham số và preview kết quả.
- Lưu lịch sử truy vấn để phục vụ việc xem lại và tìm kiếm.

**Business value:** Giảm thời gian chuẩn bị và phân tích SQL trước khi review, debug hoặc tối ưu.

---

## 5.2 Biểu đồ quan hệ (Relationship Graph)

Biến quan hệ giữa các bảng trong một truy vấn thành **đồ thị tương tác**, giúp người dùng nhanh chóng hình dung data flow.

### Khả năng chính

- Node đại diện cho bảng.
- Edge đại diện cho quan hệ JOIN.
- Phân loại quan hệ bằng màu sắc.
- Hỗ trợ nhiều layout để tối ưu khả năng quan sát.
- Phân tích điều kiện JOIN theo cột, toán tử và độ phức tạp.
- Export dưới dạng Mermaid hoặc hình ảnh.

**Business value:** Giảm cognitive load khi phân tích truy vấn có nhiều bảng và quan hệ JOIN phức tạp.

---

## 5.3 Bảng chỉ số (Metrics Dashboard)

Metrics Dashboard cung cấp một góc nhìn định lượng về độ phức tạp của SQL.

### Điểm độ phức tạp (Complexity Score)

Truy vấn được đánh giá trên thang **0–100**, kết hợp với các chỉ số như:

- Số lượng SQL keywords.
- Số trường SELECT.
- Số lượng JOIN.
- Số CTE.
- Số subquery.
- Số window functions.

Mỗi metric và subquery có thể liên kết với **source line**, cho phép người dùng chuyển trực tiếp đến vị trí tương ứng trong Smart SQL Editor.

### Kết quả

Mức độ phức tạp được phân loại thành:

- Low
- Medium
- High

---

## 5.4 Phân tích CTE & nguồn gốc trường

Tính năng này tập trung vào việc trả lời hai câu hỏi quan trọng:

> **CTE được tổ chức như thế nào?**  
> **Một field trong kết quả cuối cùng thực sự xuất phát từ đâu?**

### Khả năng chính

- CTE dependency tree.
- Phát hiện recursive CTE.
- Phát hiện unused CTE.
- Field origin mapping.
- Phân tích nested subquery và độ sâu.
- Copy SQL của từng CTE để tái sử dụng.

---

## 5.5 Soạn thảo SQL thông minh (Smart SQL Editor)

Smart SQL Editor sử dụng **Monaco Editor**, mang lại trải nghiệm tương tự VS Code.

### Khả năng chính

- Syntax highlighting.
- Minimap.
- Hỗ trợ nhiều SQL dialect.
- SQL formatting.
- Before/after diff.
- Real-time analysis.
- Action tabs dock ở cạnh phải nhằm tối ưu không gian làm việc.

---

## 5.6 AI diễn giải SQL (AI SQL Explainer)

AI SQL Explainer chuyển SQL thành một phần giải thích có cấu trúc bằng ngôn ngữ tự nhiên.

Thay vì chỉ mô tả cú pháp, phần giải thích tập trung vào **ý nghĩa và logic của truy vấn**, bao gồm:

- **Query Objective** — truy vấn đang nhằm đạt được điều gì.
- **Filters & Constraints** — các điều kiện lọc và ràng buộc chính.
- **Data Sources** — những bảng hoặc nguồn dữ liệu được sử dụng.
- **Output** — dữ liệu đầu ra và cách nó được hình thành.

Hỗ trợ:

- Streaming response.
- Copy kết quả.
- Text-to-Speech.

---

## 5.7 Tối ưu hóa truy vấn bằng AI

AI Optimize hỗ trợ người dùng đánh giá và cải thiện SQL theo hướng có kiểm soát.

### Luồng tối ưu hóa

**Phân tích tĩnh → Rà soát ngữ nghĩa → Đề xuất tối ưu → Truy vấn viết lại → So sánh trước/sau → Người dùng xác nhận**

### Nguyên tắc thiết kế

- Thực hiện **semantic review** trước khi tối ưu.
- Stream đề xuất và query được rewrite.
- Cho phép áp dụng từng suggestion hoặc toàn bộ phiên.
- Có bước xác nhận trước khi thay đổi.
- Hỗ trợ requirement-driven optimization khi người dùng cho phép thay đổi semantics.
- Đề xuất dựa trên dữ kiện static analysis như table, JOIN và CTE; không tự tạo dữ kiện không có trong query.

---

## 5.8 Trợ lý AI cơ sở dữ liệu (Database AI Assistant)

Database AI Assistant cung cấp một conversational interface cho các câu hỏi liên quan đến database.

Có thể hỗ trợ các chủ đề:

- SQL.
- Schema design.
- Index.
- Transaction.
- Database performance.

### RAG

Assistant sử dụng Retrieval-Augmented Generation dựa trên các tài liệu chính thức của:

- SQL Server
- MySQL
- PostgreSQL
- Oracle

Mỗi câu trả lời có thể hiển thị source label tương ứng.

---

## 5.9 Chat tư vấn tài liệu (Docs Consultant Chat)

Docs Consultant Chat sử dụng RAG trên chính tài liệu tính năng của ứng dụng.

### Luồng xử lý

**Câu hỏi → Embedding → Truy xuất tài liệu liên quan → Câu trả lời theo ngữ cảnh → Trích dẫn nguồn**

Mục tiêu là giúp người dùng tìm hiểu cách sử dụng SQL Visualizer mà không cần tự tìm kiếm thủ công trong toàn bộ tài liệu.

---

## 5.10 Lịch sử truy vấn & tìm kiếm ngữ nghĩa

SQL Visualizer lưu lại các truy vấn đã được phân tích ở phía server.

Người dùng có thể tìm kiếm theo **semantic meaning**, thay vì chỉ dựa trên substring matching.

Điều này giúp tìm lại các truy vấn tương tự ngay cả khi cách diễn đạt hoặc nội dung text không hoàn toàn giống nhau.

---

## 5.11 Chuẩn hóa MyBatis XML → SQL

Tính năng chuẩn hóa MyBatis chuyển dynamic SQL thành SQL thuần để có thể tiếp tục phân tích.

Hỗ trợ:

- Parameters.
- `<if>`.
- `<foreach>`.
- SQL fragments.
- Dynamic SQL.

Sau khi chuẩn hóa, SQL có thể được đưa tiếp vào các bước phân tích và tối ưu hóa.

---

## 5.12 Chẩn đoán lỗi định dạng bằng AI

Khi SQL formatting gặp lỗi, hệ thống hiển thị một **diagnostic panel** ở cạnh phải thay vì chỉ sử dụng toast message.

AI có thể:

1. Giải thích lỗi.
2. Xác định nguyên nhân gốc.
3. Đề xuất cách sửa tối thiểu.
4. Hiển thị before/after.
5. Chỉ áp dụng thay đổi sau khi người dùng xác nhận.

Đối với tính năng này, AI chạy cục bộ thông qua **Ollama**, giúp SQL không phải rời khỏi thiết bị.

---

## 5.13 Xác thực & phân quyền

Hệ thống hỗ trợ:

- Demo login.
- Google OAuth.
- Microsoft OAuth.
- Session persistence.
- Appropriate redirect flow.

Authorization được xử lý ở server boundary; việc chỉ ẩn UI không được xem là cơ chế authorization.

### Truy cập với tư cách khách (Guest Access — đang phát triển)

Đang bổ sung luồng "tiếp tục dùng mà không cần tài khoản" để khách truy cập có thể đánh giá sản phẩm mà
không cần credentials. Khách truy cập xác nhận một thông báo ngắn, trong đó nêu rõ những gì không
dùng được và lý do, sau đó được cấp quyền với tư cách **guest** ẩn danh — được ghi nhận dưới dạng
marker trên session hiện có chứ không phải một danh tính mới, và không mang theo email, tên hay token.

Guest vẫn sử dụng được toàn bộ các tính năng không dùng AI: parse và format SQL, đồ thị quan hệ,
chấm điểm độ phức tạp, metrics dashboard, phân tích CTE, và mọi định dạng export.

Các tính năng dùng AI được dành riêng cho người đã đăng nhập:

| Loại tính năng | Trải nghiệm của guest |
|---|---|
| Không dùng model (parse, chấm điểm, đồ thị, export) | Sử dụng được |
| **Mọi** tính năng có dùng model, bất kể provider | Bị khoá, kèm giải thích và nút đăng nhập một chạm |
| Chỉ riêng AI phân tích lỗi cú pháp | Sử dụng được — cố định chạy cục bộ nên không tốn chi phí |

Dòng giữa là chủ ý. Model cục bộ là provider *mặc định*, nên nếu mở ngoại lệ cho nó thì gần như mọi
tính năng AI vẫn mở với khách mới, trong khi trông như là đã bị hạn chế. Ngoại lệ duy nhất là con
đường cố định chạy cục bộ nên không có chi phí nào cần bảo vệ.

Mọi lần từ chối đều được kiểm soát ở server, trước khi tiêu thụ bất kỳ quota nào, và được ghi lại để
operator tra cứu mà không lưu nội dung prompt hay credential.

**Trạng thái: đang phát triển.** Phần giao diện đang được thực hiện; cơ chế kiểm soát ở server chưa
được đưa vào, nên hiện các endpoint AI vẫn chấp nhận request không xác thực. Không nên xem tính năng
này là đã hoàn thành, và không nên mở deployment công khai cho tới khi cơ chế kiểm soát hoàn tất.

---

## 5.14 Đa ngôn ngữ

SQL Visualizer hỗ trợ:

- Tiếng Việt.
- Tiếng Anh.

Ngôn ngữ được chuyển đổi tức thời và lựa chọn của người dùng được lưu lại. Nội dung AI cũng thay đổi theo ngôn ngữ hiện tại.

---

## 5.15 Đọc nội dung bằng giọng nói (Text-to-Speech)

Cho phép đọc thành tiếng các nội dung giải thích hoặc đề xuất từ AI.

Cơ chế sử dụng:

- Browser Speech Synthesis.
- Tùy chọn Piper local voice.

---

# 6. Kiến trúc kỹ thuật

## 6.1 Lớp giao diện (Frontend)

| Lớp | Công nghệ |
|---|---|
| Nền tảng (Framework) | Next.js 15 — App Router |
| Giao diện (UI) | React 19, Tailwind CSS |
| Quản lý trạng thái | Zustand |
| Trình soạn thảo SQL | Monaco Editor |
| Trực quan hóa | ReactFlow |
| Trình phân tích cú pháp SQL | dt-sql-parser |
| Kiểm thử | Vitest |

## 6.2 AI & lớp máy chủ (Backend)

SQL Visualizer được thiết kế theo hướng AI-provider agnostic:

- **Ollama** — chạy AI cục bộ, không yêu cầu API key.
- **OpenAI**
- **Anthropic**
- **Gemini**

Các cloud AI provider được sử dụng thông qua proxy server để credential không bị expose trên browser.

### Kiến trúc RAG

**Tài liệu → Embedding → Kho vector → Truy xuất → LLM → Câu trả lời kèm nguồn**

### Lưu trữ lịch sử

Query history được lưu phía server với nền tảng lưu trữ Excel theo tài liệu hiện tại.

---

# 7. Bảo mật & quyền riêng tư

Security được xem là một phần của architecture, không chỉ là một UI capability.

### Nguyên tắc chính

- API keys được lưu ở server thông qua `.env`.
- Credential không được expose trên client.
- Các chức năng local optimization và format diagnostics không gửi SQL ra bên ngoài thiết bị.
- Authorization được thực thi tại server boundary.
- UI hiding không được sử dụng như một security mechanism.

---

# 8. Giá trị kinh doanh

SQL Visualizer mang lại giá trị ở nhiều lớp:

### 8.1 Năng suất kỹ thuật
Giảm thời gian cần thiết để đọc, phân tích và hiểu SQL phức tạp.

### 8.2 Chất lượng SQL
Cung cấp metrics, visualization và AI-assisted analysis để hỗ trợ nâng cao chất lượng truy vấn.

### 8.3 Nhận thức về hiệu năng
Giúp đội kỹ thuật nhận diện các điểm cần xem xét về hiệu năng và cung cấp các đề xuất tối ưu hóa có thể so sánh trước/sau.

### 8.4 Phổ cập kiến thức
Biến SQL và database knowledge thành thông tin dễ tiếp cận hơn thông qua natural-language explanation và RAG.

### 8.5 Bảo mật & linh hoạt trong triển khai
Cho phép lựa chọn AI local hoặc cloud tùy theo yêu cầu về bảo mật và chính sách triển khai.

### 8.6 Khả năng tiếp cận toàn cầu
Hỗ trợ song ngữ Việt/Anh để mở rộng khả năng tiếp cận cho người dùng quốc tế.

---

# 9. Hành trình người dùng đầu-cuối

```text
SQL / MyBatis XML
       ↓
Query Normalization
       ↓
Static SQL Analysis
       ↓
┌───────────────────────────────────┐
│ Structure │ Metrics │ CTE │ Graph │
└───────────────────────────────────┘
       ↓
AI Explanation
       ↓
Optimization Analysis
       ↓
Suggestions + Rewritten SQL
       ↓
Before / After Comparison
       ↓
User Confirmation
       ↓
Improved Query
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
| Chat tư vấn tài liệu | Hoàn thành | AI |
| Lịch sử truy vấn & tìm kiếm ngữ nghĩa | Hoàn thành | AI |
| Chuẩn hóa MyBatis XML → SQL | Hoàn thành | Cốt lõi |
| Chẩn đoán lỗi định dạng bằng AI | Hoàn thành | AI |
| Đăng nhập Google / Microsoft | Hoàn thành | Xác thực |
| Truy cập khách (không cần tài khoản) | Đang phát triển | Xác thực |
| Tiếng Việt / Tiếng Anh | Hoàn thành | UX |
| Đọc nội dung bằng giọng nói (Text-to-Speech) | Hoàn thành | AI |

---

# 11. Lộ trình hiện tại / Phạm vi đã hoàn thành

- [x] Phân tích SQL cốt lõi.
- [x] Trực quan hóa quan hệ bảng.
- [x] Chỉ số và chấm điểm độ phức tạp.
- [x] Phân tích CTE và nguồn gốc trường.
- [x] Soạn thảo SQL thông minh (Smart SQL Editor).
- [x] AI diễn giải SQL.
- [x] Tối ưu hóa bằng AI.
- [x] Trợ lý AI cơ sở dữ liệu với RAG.
- [x] Chuẩn hóa MyBatis.
- [x] Chẩn đoán lỗi định dạng bằng AI.
- [x] OAuth Google / Microsoft.
- [ ] Truy cập khách không cần tài khoản — đang phát triển, chưa có cơ chế kiểm soát ở server.
- [x] Đa ngôn ngữ Tiếng Việt / Tiếng Anh.

---

## 12. Góc nhìn tổng kết

SQL Visualizer không đơn thuần là một trình soạn thảo SQL hay công cụ định dạng truy vấn.

Sản phẩm được định vị là một **nền tảng trí tuệ SQL (SQL Intelligence Platform)** kết nối bốn lớp công việc kỹ thuật:

> **Hiểu → Trực quan hóa → Phân tích → Cải thiện**

Bằng cách đưa phân tích cấu trúc, trực quan hóa, độ phức tạp đo lường được, giải thích bằng ngôn ngữ tự nhiên và tối ưu hóa với sự hỗ trợ của AI vào cùng một quy trình, SQL Visualizer tạo ra một cách làm việc minh bạch hơn cho các đội kỹ thuật khi xử lý SQL phức tạp.

> **Mục tiêu rất đơn giản: làm cho SQL phức tạp dễ hiểu hơn, dễ review hơn và dễ cải thiện hơn — trong khi lập trình viên vẫn nắm quyền kiểm soát mọi thay đổi.**

---

*Nguồn: Tài liệu tính năng nội bộ của SQL Visualizer. Các chi tiết kỹ thuật và phạm vi đã hoàn thành dựa trên tài liệu sản phẩm được cung cấp.*
