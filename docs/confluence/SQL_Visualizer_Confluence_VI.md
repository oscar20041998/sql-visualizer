# SQL Visualizer
## Nền tảng phân tích, trực quan hóa và tối ưu hóa SQL bằng AI

> **Tài liệu tổng quan sản phẩm dành cho Management, BA, Technical Lead và Engineering Team**  
> SQL Visualizer giúp biến những truy vấn SQL phức tạp thành thông tin dễ hiểu, có thể quan sát, đo lường và cải thiện — từ việc hiểu cấu trúc truy vấn đến phát hiện vấn đề và đề xuất tối ưu hóa.

---

## 1. Executive Summary

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

## 2. Product Vision

### From SQL Code to SQL Intelligence

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

| Persona | Nhu cầu chính | Giá trị từ SQL Visualizer |
|---|---|---|
| **Backend Developer** | Hiểu, debug và tối ưu SQL | Phân tích cấu trúc, metrics, AI Explainer, AI Optimize |
| **Senior Developer / Tech Lead** | Review chất lượng và độ phức tạp SQL | Relationship Graph, CTE Analysis, scoring và before/after comparison |
| **DBA / Database Engineer** | Phân tích query và các điểm cần tối ưu | JOIN analysis, CTE/subquery analysis, optimization assistant |
| **Developer mới / Junior** | Học và hiểu SQL phức tạp | Natural-language explanation và visualization |
| **Technical Manager** | Quan sát chất lượng và hiệu quả kỹ thuật | Tổng quan capability, metrics và business value |

---

## 4. Product Capability Map

SQL Visualizer được tổ chức thành các nhóm capability chính:

### A. SQL Understanding
- Query Input & Analysis
- CTE Analysis
- Field Origin Mapping
- MyBatis XML → SQL Normalization
- Smart SQL Editor

### B. SQL Visualization
- Relationship Graph
- Interactive table relationships
- JOIN condition analysis
- Mermaid / image export

### C. SQL Quality & Complexity
- Complexity Score 0–100
- Query metrics
- Source-line mapping
- Real-time analysis

### D. AI Intelligence
- AI SQL Explainer
- AI Query Optimizer
- Database AI Assistant
- AI Format Error Diagnostics
- Docs Consultant Chat

### E. Productivity
- Query History
- Semantic Search
- Multilingual UI
- Text-to-Speech

---

# 5. Detailed Functional Capabilities

## 5.1 Query Input & SQL Analysis

Cho phép người dùng nhập trực tiếp SQL hoặc cung cấp truy vấn từ file MyBatis XML.

### Khả năng chính

- Hỗ trợ **MySQL, PostgreSQL, SQL Server và Oracle**.
- Phân tích tức thời bảng, cột, JOIN và các mệnh đề trong truy vấn.
- Hỗ trợ import **MyBatis XML** và chuẩn hóa thành SQL thuần.
- Cho phép cấu hình tham số và preview kết quả.
- Lưu lịch sử truy vấn để phục vụ việc xem lại và tìm kiếm.

**Business value:** Giảm thời gian chuẩn bị và phân tích SQL trước khi review, debug hoặc tối ưu.

---

## 5.2 Relationship Graph Visualizer

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

## 5.3 Metrics Dashboard

Metrics Dashboard cung cấp một góc nhìn định lượng về độ phức tạp của SQL.

### Complexity Score

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

## 5.4 CTE Analysis & Field Origin

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

## 5.5 Smart SQL Editor

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

## 5.6 AI SQL Explainer

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

## 5.7 AI Query Optimization

AI Optimize hỗ trợ người dùng đánh giá và cải thiện SQL theo hướng có kiểm soát.

### Optimization flow

**Static Analysis → Semantic Review → Optimization Suggestions → Rewritten Query → Before/After Comparison → User Confirmation**

### Nguyên tắc thiết kế

- Thực hiện **semantic review** trước khi tối ưu.
- Stream đề xuất và query được rewrite.
- Cho phép áp dụng từng suggestion hoặc toàn bộ phiên.
- Có bước xác nhận trước khi thay đổi.
- Hỗ trợ requirement-driven optimization khi người dùng cho phép thay đổi semantics.
- Đề xuất dựa trên dữ kiện static analysis như table, JOIN và CTE; không tự tạo dữ kiện không có trong query.

---

## 5.8 Database AI Assistant

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

## 5.9 Docs Consultant Chat

Docs Consultant Chat sử dụng RAG trên chính tài liệu tính năng của ứng dụng.

### Luồng xử lý

**Question → Embedding → Relevant Document Retrieval → Context-aware Answer → Citation**

Mục tiêu là giúp người dùng tìm hiểu cách sử dụng SQL Visualizer mà không cần tự tìm kiếm thủ công trong toàn bộ tài liệu.

---

## 5.10 Query History & Semantic Search

SQL Visualizer lưu lại các truy vấn đã được phân tích ở phía server.

Người dùng có thể tìm kiếm theo **semantic meaning**, thay vì chỉ dựa trên substring matching.

Điều này giúp tìm lại các truy vấn tương tự ngay cả khi cách diễn đạt hoặc nội dung text không hoàn toàn giống nhau.

---

## 5.11 MyBatis XML → SQL Normalization

Tính năng chuẩn hóa MyBatis chuyển dynamic SQL thành SQL thuần để có thể tiếp tục phân tích.

Hỗ trợ:

- Parameters.
- `<if>`.
- `<foreach>`.
- SQL fragments.
- Dynamic SQL.

Sau khi chuẩn hóa, SQL có thể được đưa tiếp vào các bước phân tích và tối ưu hóa.

---

## 5.12 AI Format Error Diagnostics

Khi SQL formatting gặp lỗi, hệ thống hiển thị một **diagnostic panel** ở cạnh phải thay vì chỉ sử dụng toast message.

AI có thể:

1. Giải thích lỗi.
2. Xác định nguyên nhân gốc.
3. Đề xuất cách sửa tối thiểu.
4. Hiển thị before/after.
5. Chỉ áp dụng thay đổi sau khi người dùng xác nhận.

Đối với tính năng này, AI chạy cục bộ thông qua **Ollama**, giúp SQL không phải rời khỏi thiết bị.

---

## 5.13 Authentication & Authorization

Hệ thống hỗ trợ:

- Demo login.
- Google OAuth.
- Microsoft OAuth.
- Session persistence.
- Appropriate redirect flow.

Authorization được xử lý ở server boundary; việc chỉ ẩn UI không được xem là cơ chế authorization.

---

## 5.14 Internationalization

SQL Visualizer hỗ trợ:

- Tiếng Việt.
- Tiếng Anh.

Ngôn ngữ được chuyển đổi tức thời và lựa chọn của người dùng được lưu lại. Nội dung AI cũng thay đổi theo ngôn ngữ hiện tại.

---

## 5.15 Text-to-Speech

Cho phép đọc thành tiếng các nội dung giải thích hoặc đề xuất từ AI.

Cơ chế sử dụng:

- Browser Speech Synthesis.
- Tùy chọn Piper local voice.

---

# 6. Technical Architecture

## 6.1 Frontend

| Layer | Technology |
|---|---|
| Framework | Next.js 15 — App Router |
| UI | React 19, Tailwind CSS |
| State Management | Zustand |
| SQL Editor | Monaco Editor |
| Visualization | ReactFlow |
| SQL Parser | dt-sql-parser |
| Testing | Vitest |

## 6.2 AI & Backend

SQL Visualizer được thiết kế theo hướng AI-provider agnostic:

- **Ollama** — chạy AI cục bộ, không yêu cầu API key.
- **OpenAI**
- **Anthropic**
- **Gemini**

Các cloud AI provider được sử dụng thông qua proxy server để credential không bị expose trên browser.

### RAG Architecture

**Documents → Embeddings → Vector Store → Retrieval → LLM → Source-aware Response**

### History Storage

Query history được lưu phía server với nền tảng lưu trữ Excel theo tài liệu hiện tại.

---

# 7. Security & Privacy

Security được xem là một phần của architecture, không chỉ là một UI capability.

### Nguyên tắc chính

- API keys được lưu ở server thông qua `.env`.
- Credential không được expose trên client.
- Các chức năng local optimization và format diagnostics không gửi SQL ra bên ngoài thiết bị.
- Authorization được thực thi tại server boundary.
- UI hiding không được sử dụng như một security mechanism.

---

# 8. Business Value

SQL Visualizer mang lại giá trị ở nhiều lớp:

### 8.1 Engineering Productivity
Giảm thời gian cần thiết để đọc, phân tích và hiểu SQL phức tạp.

### 8.2 SQL Quality
Cung cấp metrics, visualization và AI-assisted analysis để hỗ trợ nâng cao chất lượng truy vấn.

### 8.3 Performance Awareness
Giúp đội kỹ thuật nhận diện các điểm cần xem xét về hiệu năng và cung cấp các đề xuất tối ưu hóa có thể so sánh trước/sau.

### 8.4 Knowledge Enablement
Biến SQL và database knowledge thành thông tin dễ tiếp cận hơn thông qua natural-language explanation và RAG.

### 8.5 Security & Deployment Flexibility
Cho phép lựa chọn AI local hoặc cloud tùy theo yêu cầu về bảo mật và chính sách triển khai.

### 8.6 Global Accessibility
Hỗ trợ song ngữ Việt/Anh để mở rộng khả năng tiếp cận cho người dùng quốc tế.

---

# 9. End-to-End User Journey

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

# 10. Product Status

| Capability | Status | Category |
|---|---|---|
| Query Input & Analysis | Completed | Core |
| Relationship Graph | Completed | Core |
| Metrics Dashboard | Completed | Core |
| CTE & Field Origin Analysis | Completed | Core |
| Smart SQL Editor | Completed | Core |
| AI SQL Explainer | Completed | AI |
| AI Query Optimization | Completed | AI |
| Database AI Assistant | Completed | AI |
| Docs Consultant Chat | Completed | AI |
| Query History & Semantic Search | Completed | AI |
| MyBatis XML → SQL | Completed | Core |
| AI Format Error Diagnostics | Completed | AI |
| Google / Microsoft Login | Completed | Auth |
| Vietnamese / English | Completed | UX |
| Text-to-Speech | Completed | AI |

---

# 11. Current Roadmap / Delivered Scope

- [x] Core SQL analysis.
- [x] Relationship visualization.
- [x] Metrics and complexity scoring.
- [x] CTE and field-origin analysis.
- [x] Smart SQL Editor.
- [x] AI Explainer.
- [x] AI Optimization.
- [x] Database AI Assistant with RAG.
- [x] MyBatis normalization.
- [x] AI format-error diagnostics.
- [x] Google / Microsoft OAuth.
- [x] Vietnamese / English internationalization.

---

## 12. Closing Perspective

SQL Visualizer is not simply a SQL editor or query formatter.

It is positioned as a **SQL Intelligence Platform** that connects four layers of engineering work:

> **Understand → Visualize → Analyze → Improve**

By bringing structural analysis, visualization, measurable complexity, natural-language explanation and AI-assisted optimization into one workflow, SQL Visualizer creates a more transparent way for engineering teams to work with complex SQL.

> **The objective is simple: make complex SQL easier to understand, easier to review, and easier to improve — while keeping the developer in control of every change.**

---

*Source: Internal SQL Visualizer feature documentation. Technical details and delivered scope are based on the supplied product document.*
