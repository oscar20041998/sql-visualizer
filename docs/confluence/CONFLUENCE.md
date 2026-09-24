# SQL Visualizer — Tài liệu tổng hợp tính năng

> Tài liệu nội bộ dành cho trình bày quản lý (manager). Tổng hợp toàn bộ tính năng, giá trị người dùng, và kiến trúc kỹ thuật của sản phẩm **SQL Visualizer** — công cụ phân tích và trực quan hóa truy vấn SQL.

---

## 1. Tổng quan sản phẩm

SQL Visualizer là một công cụ phân tích SQL chạy trên nền web, giúp lập trình viên và đội kỹ thuật:

- **Hiểu** cấu trúc truy vấn SQL phức tạp (bảng, JOIN, CTE, subquery).
- **Đo lường** độ phức tạp của truy vấn bằng thang điểm 0–100.
- **Phát hiện** các vấn đề tiềm ẩn về hiệu năng và chất lượng SQL.
- **Tối ưu hóa** truy vấn với sự trợ giúp của AI (hoạt động cục bộ hoặc qua nhà cung cấp cloud).
- **Trực quan hóa** mối quan hệ giữa các bảng dưới dạng đồ thị tương tác.

**Công nghệ chính:** Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand, Monaco Editor, ReactFlow.

---

## 2. Danh sách tính năng (tổng quan)

| # | Tính năng | Trạng thái | Phân loại |
|---|-----------|------------|-----------|
| 1 | Nhập & phân tích SQL (Query Input) | Hoàn thiện | Core |
| 2 | Biểu đồ quan hệ bảng (Relationship Graph) | Hoàn thiện | Core |
| 3 | Bảng điều khiển chỉ số (Metrics Dashboard) | Hoàn thiện | Core |
| 4 | Phân tích CTE & nguồn gốc trường | Hoàn thiện | Core |
| 5 | Trình soạn thảo SQL thông minh (Smart SQL Editor) | Hoàn thiện | Core |
| 6 | AI SQL Explainer (giải thích truy vấn) | Hoàn thiện | AI |
| 7 | AI Tối ưu hóa truy vấn | Hoàn thiện | AI |
| 8 | AI Trợ lý cơ sở dữ liệu (Database Assistant) | Hoàn thiện | AI |
| 9 | Docs Consultant Chat (RAG) | Hoàn thiện | AI |
| 10 | Lịch sử truy vấn & tìm kiếm ngữ nghĩa | Hoàn thiện | AI |
| 11 | Chuẩn hóa MyBatis XML → SQL thuần | Hoàn thiện | Core |
| 12 | Chẩn đoán lỗi định dạng bằng AI | Hoàn thiện | AI |
| 13 | Đăng nhập (Login / OAuth Google, Microsoft) | Hoàn thiện | Auth |
| 14 | Đa ngôn ngữ (Tiếng Việt / Tiếng Anh) | Hoàn thiện | UX |
| 15 | Text-to-Speech (đọc to kết quả AI) | Hoàn thiện | AI |

---

## 3. Mô tả chi tiết từng tính năng

### 3.1 Nhập & phân tích SQL (Query Input)

Cho phép người dùng dán truy vấn SQL hoặc nhập trực tiếp, hỗ trợ **4 phương ngữ**: MySQL, PostgreSQL, SQL Server, Oracle.

- Phân tích tức thời cấu trúc truy vấn: bảng, cột, JOIN, mệnh đề.
- Nhập file **MyBatis XML** và tự động chuyển thành SQL thuần (chuẩn hóa).
- Cho phép cấu hình tham số và preview kết quả.
- Hỗ trợ lưu lịch sử truy vấn để xem lại.

### 3.2 Biểu đồ quan hệ bảng (Relationship Graph Visualizer)

Trực quan hóa mối quan hệ giữa các bảng trong truy vấn dưới dạng **đồ thị tương tác**.

- Nút là bảng, cạnh là quan hệ JOIN, có màu phân loại.
- Nhiều kiểu bố cục (layout) để dễ quan sát.
- Phân tích chuyên sâu điều kiện JOIN (cột, toán tử, độ phức tạp).
- Xuất biểu đồ dưới dạng Mermaid / hình ảnh.

### 3.3 Bảng điều khiển chỉ số (Metrics Dashboard)

Chấm điểm **độ phức tạp 0–100** theo thời gian thực với phân tích chi tiết:

- Số lượng từ khóa, trường SELECT, JOIN, CTE, subquery, window function.
- Mỗi thẻ chỉ số và subquery đều hiển thị **số dòng nguồn** và cho phép nhảy đến dòng tương ứng trong Smart SQL Editor.
- Đánh giá tổng thể mức độ phức tạp (thấp / trung bình / cao).

### 3.4 Phân tích CTE & nguồn gốc trường (CTE Analysis)

Khám phá **Common Table Expression** và nguồn gốc của từng trường.

- Cây CTE trực quan, phát hiện CTE đệ quy và CTE không sử dụng.
- Truy vết nguồn gốc trường (field origin mapping).
- Phân tích subquery lồng nhau với độ sâu chính xác.
- Sao chép SQL của từng CTE để tái sử dụng.

### 3.5 Trình soạn thảo SQL thông minh (Smart SQL Editor)

Trình soạn thảo code dựa trên **Monaco Editor** (như VS Code):

- Đa phương ngữ, hỗ trợ highlight cú pháp và minimap.
- **Format SQL** (định dạng tự động) và chế độ so sánh trước/sau (diff).
- Phân tích thời gian thực khi chỉnh sửa.
- Các tab hành động dock ở cạnh phải để tiết kiệm không gian.

### 3.6 AI SQL Explainer (giải thích truy vấn bằng ngôn ngữ tự nhiên)

Chuyển truy vấn SQL thành **lời giải thích có cấu trúc** bằng ngôn ngữ tự nhiên:

- Mục tiêu truy vấn (objective).
- Bộ lọc và ràng buộc (filters & constraints).
- Kết quả trả về (output) và bảng tham chiếu (data sources).
- Hỗ trợ streaming (hiển thị dần), sao chép và đọc to (text-to-speech).

### 3.7 AI Tối ưu hóa truy vấn (AI Optimize)

Đề xuất cải thiện truy vấn dựa trên phân tích tĩnh:

- **Duyệt lại ngữ nghĩa** trước khi tối ưu (semantic review).
- Stream các đề xuất tối ưu hóa và query đã viết lại.
- So sánh trước/sau, áp dụng từng đề xuất hoặc toàn bộ phiên (có chốt xác nhận).
- Tối ưu theo yêu cầu (requirement-driven) — có thể thay đổi ngữ nghĩa khi được phép.
- Căn cứ vào dữ kiện phân tích tĩnh (bảng, join, CTE) — không bịa đặt.

### 3.8 AI Trợ lý cơ sở dữ liệu (Database AI Assistant)

Chat tổng quát về cơ sở dữ liệu:

- Trả lời về SQL, thiết kế schema, index, transaction, hiệu năng.
- **RAG** (Retrieval-Augmented Generation): căn cứ vào trích đoạn từ tài liệu chính thức của SQL Server, MySQL, PostgreSQL, Oracle.
- Hiển thị nhãn nguồn (source) bên dưới mỗi câu trả lời.

### 3.9 Docs Consultant Chat (RAG trên tài liệu dự án)

Chat RAG trên chính tài liệu tính năng của ứng dụng:

- Nhúng câu hỏi, truy xuất đoạn tài liệu gần nhất, trả lời kèm trích dẫn.
- Giúp người dùng tìm hiểu cách dùng các tính năng của tool.

### 3.10 Lịch sử truy vấn & tìm kiếm ngữ nghĩa

- Mọi truy vấn đã phân tích được lưu lại (store phía server, nền Excel).
- Tìm kiếm theo **ý nghĩa** (semantic search) qua embeddings, không chỉ tìm chuỗi con.

### 3.11 Chuẩn hóa MyBatis XML → SQL thuần

- Chuyển đổi file MyBatis XML (dynamic SQL) thành SQL thuần.
- Xử lý tham số, điều kiện động `<if>`, `<foreach>`, fragment.
- Hỗ trợ phân tích và tối ưu hóa sau chuẩn hóa.

### 3.12 Chẩn đoán lỗi định dạng bằng AI

- Khi SQL format lỗi, hiển thị **bảng báo lỗi chuyên nghiệp** ở cạnh phải (thay vì toast thoáng qua).
- AI (chạy cục bộ bằng Ollama) giải thích lỗi và nguyên nhân gốc.
- Đề xuất cách sửa tối thiểu, so sánh trước/sau, áp dụng khi người dùng xác nhận.
- Không đưa SQL ra ngoài thiết bị (hoàn toàn cục bộ).

### 3.13 Đăng nhập & phân quyền

- **Demo login** (tài khoản mặc định) bảo vệ không gian làm việc.
- **OAuth xã hội**: đăng nhập Google và Microsoft.
- Giữ phiên đăng nhập, chuyển hướng hợp lý.

### 3.14 Đa ngôn ngữ (i18n)

- Hỗ trợ đầy đủ **Tiếng Việt** và **Tiếng Anh**.
- Chuyển đổi ngôn ngữ tức thì, lưu lựa chọn.
- Nội dung AI cũng phụ thuộc ngôn ngữ đang chọn.

### 3.15 Text-to-Speech

- Đọc to các giải thích/đề xuất của AI.
- Dùng speech synthesis của trình duyệt, tùy chọn giọng Piper cục bộ.

---

## 4. Kiến trúc kỹ thuật (tổng quan)

### 4.1 Frontend

| Thành phần | Công nghệ |
|-----------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS |
| State | Zustand |
| Editor | Monaco Editor |
| Đồ thị | ReactFlow |
| Parser SQL | dt-sql-parser |
| Test | Vitest |

### 4.2 AI / Backend

- **AI đa nhà cung cấp**: Ollama (cục bộ, không cần API key) hoặc OpenAI / Anthropic / Gemini (qua proxy server để credential không lộ ra trình duyệt).
- **RAG**: embeddings + vector store cho tài liệu DB và tài liệu dự án.
- **Lưu trữ lịch sử**: server-side, nền Excel.

### 4.3 Bảo mật & quyền riêng tư

- Khóa API nằm ở server (`.env`), không bao giờ lộ ra client.
- Tính năng chẩn đoán lỗi định dạng và tối ưu cục bộ không gửi SQL ra ngoài.
- Phân quyền ở biên server (hide UI không phải là authorization).

---

## 5. Giá trị kinh doanh (cho manager)

1. **Tiết kiệm thời gian** phân tích SQL phức tạp cho đội kỹ thuật.
2. **Nâng cao chất lượng** truy vấn thông qua chấm điểm và đề xuất tối ưu.
3. **Giảm rủi ro dữ liệu** nhờ chẩn đoán lỗi và tối ưu cục bộ, bảo mật.
4. **Dễ đào tạo** nhờ giải thích bằng ngôn ngữ tự nhiên và tài liệu tích hợp.
5. **Linh hoạt triển khai AI** (cục bộ hoặc cloud) phù hợp chính sách bảo mật.
6. **Đa ngôn ngữ** (Việt/Anh) mở rộng tới người dùng quốc tế.

---

## 6. Lộ trình / Trạng thái

- [x] Core analysis (nhập, đồ thị, metrics, CTE, editor)
- [x] AI explainer & optimize
- [x] Database AI assistant (RAG)
- [x] MyBatis normalization
- [x] Format error diagnostics
- [x] Social login (Google, Microsoft)
- [x] i18n (Việt/Anh)

---

*Tài liệu được tạo để trình bày tổng quan sản phẩm SQL Visualizer. Nội dung chi tiết kỹ thuật có thể tham khảo thêm trong `README.md` và thư mục `specs/`.*

