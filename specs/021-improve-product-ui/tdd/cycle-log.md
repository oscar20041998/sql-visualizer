# Cycle Log: Cải thiện giao diện sản phẩm với Hallmark

## Baseline trước thay đổi

- Ngày: 2026-11-21.
- Lệnh: `npm test`.
- Kết quả: thất bại, 10 tệp lỗi và 84 tệp đạt; 826 kiểm thử đạt. Không có kiểm thử TDD mới hoặc thay đổi mã ứng dụng.
- Nguyên nhân quan sát được: Vitest thu thập các tệp kiểm thử đi kèm Hallmark trong `.agents/skills/hallmark/scripts/` và `.github/skills/hallmark/scripts/`. Các tệp này báo `TypeError: The URL must be of scheme file` hoặc `No test suite found`.
- Trạng thái: vòng TDD chưa bắt đầu vì bộ kiểm thử nền chưa xanh. Không đánh dấu task hoặc hành vi nào hoàn tất.
- Ngoại lệ đã được người dùng chấp thuận: kiểm thử characterization cho hành vi đã tồn tại có thể xanh ở baseline; không tạo lỗi giả để chứng minh RED.

## Baseline sau khi sửa phạm vi thu thập kiểm thử

- Người dùng đã chấp thuận sửa cấu hình Vitest để không thu thập kiểm thử nội bộ của Hallmark; kiểm thử ứng dụng không bị loại.
- Lệnh: `npm test`.
- Kết quả: thành công, 84 tệp và 826 kiểm thử đạt (83,65 giây).
- Đây là baseline bộ kiểm thử, không phải bằng chứng E2E hay bằng chứng hoàn thành một hành vi hoặc task.

## A1 / U1: characterization một luồng phân tích SQL

- RED: ngoại lệ characterization đã được chấp thuận; không tạo lỗi giả cho hành vi đã có.
- Bổ sung kiểm thử nhập SQL, dùng analyzer thật, kiểm tra bảng, JOIN, nội dung SQL và điều hướng tới dashboard; lịch sử và các bề mặt editor nặng được mock.
- Lệnh: `npm test -- tests/unit/query-input-workflow.test.tsx -t "analyzes entered SQL and stores its tables and join before opening the dashboard"`.
- Hai lần đầu thất bại do cách tìm placeholder và timeout mặc định của Testing Library khi parser khởi động nguội; đây là lỗi thiết lập kiểm thử, không phải RED hợp lệ. Sau khi sửa cách tìm và chờ tối đa 15 giây: 1 kiểm thử đạt, 8 bỏ qua.
- Lệnh sau sửa: `npm test -- tests/unit/query-input-workflow.test.tsx`; kết quả: 9 kiểm thử đạt.
- Lệnh: `npm test -- tests/unit/query-input-analysis-state.test.tsx -t "clears a stale failure and stores the new result when a later analysis succeeds"`; kết quả: 1 kiểm thử đạt, 2 bỏ qua; analyzer trong kiểm thử này được mock.
- Lệnh: `npm run type-check`; kết quả: thành công.
- Lệnh: `npm test` sau khi bổ sung kiểm thử; kết quả: 84 tệp, 827 kiểm thử đạt (84,16 giây).
- Không sửa mã sản phẩm, không refactor. A1 và U1 vẫn `PENDING`: kiểm thử trên không chứng minh hiển thị và thao tác kết quả trong browser hoặc đầy đủ mọi điều kiện của hành vi.

## Giới hạn kiểm tra browser

- Ứng dụng khởi động cục bộ và trả HTTP 200; đã quan sát trang công khai và trang đăng nhập.
- Công cụ browser từ chối tạo trang trong context tách biệt. Chưa thực hiện đăng nhập, phân tích hoặc ghi dữ liệu trên context có thể dùng chung; chưa có bằng chứng hành trình E2E hoặc bố cục.
- Đã thử một origin cục bộ riêng cùng cơ chế chặn các request ngoài và API; điều hướng browser hết thời gian chờ trước khi kiểm tra được storage. Không thực hiện tương tác có ghi dữ liệu; server thử nghiệm đã dừng.
- Với Computer Use, một cửa sổ Chrome Incognito riêng truy cập được URL đăng nhập cục bộ và server trả HTTP 200, nhưng vùng trang vẫn trống. Chưa thực hiện đăng nhập hoặc phân tích; cửa sổ và server thử nghiệm đã đóng.
- Server kiểm thử đã dừng. Các kiểm tra thủ công và đánh giá với người dùng thật vẫn chưa hoàn tất.
- Người dùng đồng ý tiếp tục các hook còn lại và thu thập baseline, để các kiểm tra sau thay đổi và đánh giá người dùng ở trạng thái chờ. Ngoại lệ này không bỏ kiểm thử trước thay đổi hoặc các cổng nghiệm thu.
- Người dùng cho phép tiếp tục với worktree hiện tại; các thay đổi và tệp có sẵn được giữ nguyên, không tự commit, stash hoặc xóa.

## U10: giữ theme light/dark cho token semantic

- RED: `npm test -- tests/unit/home-preferences.test.tsx -t "updates the document theme attribute used by semantic theme tokens"` thất bại đúng nguyên nhân: theme class đã đổi nhưng `document.documentElement` chưa có `data-theme`.
- RED: `npm test -- tests/unit/AppLayout.test.tsx -t "sets the document theme attribute used by semantic theme tokens"` thất bại đúng nguyên nhân tương tự trong workspace.
- GREEN: `ThemeProvider` và `AppLayout` đồng bộ `data-theme` trên `<html>`; token light dùng selector `html[data-theme='light']`, giữ lại theme class cho các tiện ích Tailwind hiện có và không đổi lựa chọn theme/accent.
- GREEN: `npm test -- tests/unit/home-preferences.test.tsx tests/unit/AppLayout.test.tsx` đạt 2 tệp, 11 kiểm thử.
- Kiểm tra liên quan: `npm run type-check` đạt.
- Hallmark: `node .github/skills/hallmark/scripts/sloplint.mjs src/app/page.tsx src/styles/tailwind.css --genre modern-minimal --scope app --render --kept --url http://localhost:4028/` báo 0 FAIL, 0 REFLEX, 1 WARN do target không trùng toàn bộ `.hallmark/before.json`; render không chạy vì thiếu `puppeteer-core`.
- Trạng thái: kiểm thử thành phần đạt; screenshot, viewport, browser và kiểm tra phần còn lại của ứng dụng vẫn chưa được xác minh.

## Kiểm chứng hồi quy sau các thay đổi trình bày

Các thay đổi trong phần này chỉ điều chỉnh bố cục, trạng thái trực quan, độ tương phản, nhãn phân trang và cách trình bày giá trị rỗng; không thay đổi luồng dữ liệu, handler, route hay quyền. Đây là kiểm thử hồi quy sau thay đổi, không được ghi thành pha RED mới.

- `npm test`: đạt, 84 tệp và 829 kiểm thử.
- `npm run type-check`: đạt.
- `npm test -- tests/unit/query-input`: đạt, 6 tệp và 72 kiểm thử.
- `npm test -- tests/unit/guestAccess.test.tsx tests/unit/SignInPage.test.tsx tests/unit/SignInPage.axe.test.tsx`: đạt, 3 tệp và 23 kiểm thử.
- `npm test -- tests/unit/sqlMetricsDashboard.test.tsx tests/unit/complexitySurfaces.baseline.test.tsx`: đạt, 2 tệp và 19 kiểm thử.
- `npm test -- tests/unit/home-preferences.test.tsx tests/unit/aiBaseUrlFromSettings.test.ts`: đạt, 21 kiểm thử theo kết quả của agent.
- `npm run build`: bị chặn trước bước Next.js build vì `scripts/setup-piper.mjs` không tải được voice assets (`fetch failed`); thư mục models/piper không có assets.
- `npx next build`: đạt, biên dịch production và tạo 24 trang tĩnh.
- Hallmark 2.0.0: các mục tiêu static cho home, query input, settings, login, metrics và Sidebar/ThemeProvider đều 0 FAIL / 0 REFLEX. `sloplint --render` cho home và login cũng đạt 0 FAIL / 0 REFLEX; mỗi lần còn một WARN `kept` do target nhỏ hơn `.hallmark/before.json`.
- Render phát hiện và đã sửa các nút bị xuống dòng ở 768/1024px, đường viền input đăng nhập chưa đủ tương phản, trạng thái tương tác Sidebar và chuyển động spinner. Nhãn guest cuối cùng được rút gọn thêm sau render; kiểm thử guest/accessibility và static Hallmark trên phiên bản cuối đều đạt.
- `AppLayout.tsx` không có điều khiển tương tác trực tiếp; linter file-level báo thiếu focus style dù các điều khiển nằm trong component con đã được kiểm tra riêng. Footer copy được giữ nguyên theo phạm vi bảo toàn nội dung.
- Không có bằng chứng browser xác thực cho workspace routes, mọi viewport tương tác, hiệu năng một GPU, hoặc đánh giá với 5 người dùng. T005–T008 và nhiều route/task khác vẫn chưa hoàn tất; feature toàn sản phẩm chưa được nghiệm thu.

## Baseline before continuing implementation

- The current worktree already contains the earlier shared-shell, home, login, query-input, settings, and metrics presentation changes. This is a continuation baseline, not the original pre-feature baseline required before T009.
- `npm test`: pass, 84 files and 829 tests (97.88 seconds).
- `npm run type-check`: pass.
- Focused characterization: `npm test -- tests/unit/query-input-workflow.test.tsx tests/unit/query-input-analysis-state.test.tsx tests/unit/relationshipGraphPage.test.tsx tests/unit/relationshipGraphIdentity.test.tsx tests/unit/sqlMetricsDashboard.test.tsx tests/unit/complexitySurfaces.baseline.test.tsx tests/unit/AppLayout.test.tsx tests/unit/SignInPage.test.tsx tests/unit/home-preferences.test.tsx tests/unit/query-input-sql-comparison.test.tsx tests/unit/sqlComparisonPanel.test.tsx tests/unit/codegen/CodeGeneratorPanel.test.tsx tests/unit/dbAssistantHistoryPanel.test.tsx tests/unit/dbAssistantChatHistoryStorage.test.ts tests/unit/SignInPage.axe.test.tsx`: pass, 15 files and 146 tests.
- These are green characterization checks for existing behavior, under the user-approved exception; no artificial RED was introduced. They do not prove browser layout, full action/state coverage, or the acceptance-level before/after comparison.

## Final verification after remaining presentation refinements

- `npm test`: pass, 84 files and 829 tests with dependencies restored from `package-lock.json`.
- `npm run type-check`: pass.
- `npx next build`: pass; production compilation and generation of 24 static pages succeeded.
- `npm run build`: pass; local Piper assets were present, docs-index generation completed, and the Next.js production build succeeded.
- `git -c core.whitespace=cr-at-eol diff --check`: pass; the repository contains tracked CRLF files, so the check explicitly recognizes CRLF while still rejecting other trailing whitespace.
- Hallmark 2.0.0: final static lint on 40 changed TSX/CSS files reported 0 FAIL, 0 REFLEX, 0 WARN, and 1 DISMISSED for the existing legal footer copy. Render completed for `/` and produced five screenshots under `.hallmark/shots/`.
- The temporary `puppeteer-core` renderer dependency was removed by `npm ci`; `package.json` and `package-lock.json` remain unchanged.
- This verification does not complete the partial route/action inventory, protected-route browser checks, all responsive keyboard journeys, one-GPU performance measurement, or the 5-person usability study. Acceptance criteria depending on those remain pending.
