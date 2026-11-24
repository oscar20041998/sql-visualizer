# Implementation Plan: Tinh chỉnh giao diện không gian làm việc

**Branch**: `develop` (nhánh thực tế; feature `023-refine-workspace-ui`) | **Date**: 2026-11-24 | **Spec**: [spec.md](spec.md)

## Summary

Tinh chỉnh sidebar, card trang chủ, metric card và thanh điều hướng mà không thay đổi nghiệp vụ. Dùng giao diện, biến theme và công cụ hiện có; kiểm tra responsive, bàn phím, giảm chuyển động, light/dark và chức năng trước/sau.

## Technical Context

**Language/Version**: TypeScript, React 19, Next.js 15.

**Primary Dependencies**: Tailwind CSS 3, lucide-react, Zustand; không thêm dependency.

**Storage**: Không thay đổi.

**Testing**: Vitest, Testing Library/jsdom; profile tại `.specify/memory/tdd-profile.md`. Kiểm tra hình ảnh và kích thước trên trình duyệt bổ sung cho test tự động.

**Target Platform**: Trình duyệt desktop và mobile.

**Project Type**: Ứng dụng web Next.js App Router.

**Performance Goals**: Chuyển động ngắn, không lặp, không cản trở thao tác; nội dung vẫn hiển thị nếu không có hỗ trợ quan sát cuộn.

**Constraints**: Không thay đổi route, quyền, dữ liệu, phân tích SQL, nội dung, ngôn ngữ hoặc cấu trúc điều hướng; bảo toàn dữ liệu và sửa đổi hiện có trong worktree.

**Scale/Scope**: Sidebar dùng chung, card trang chủ, metric cards và các thanh điều hướng/header trên các trang hiện hữu; lập danh mục trước khi thay đổi.

## Constitution Check

- Không thay đổi parser, graph, dữ liệu, luồng AI, xác thực hoặc cấu hình provider.
- Giữ khả năng khám phá và cập nhật trực tiếp của các màn hình phân tích.
- Test giao diện và tương tác bằng Vitest/Testing Library, giữ TypeScript strict.
- Không có ngoại lệ cần giải trình. Đánh giá lại sau thiết kế: PASS, với điều kiện xác minh bảo toàn hành vi trong quá trình thực hiện.

## Project Structure

```text
src/components/Sidebar.tsx                 # Điều hướng workspace
src/components/AppLayout.tsx              # Shell và vùng cuộn
src/app/page.tsx                          # Trang chủ và header
src/app/sql-metrics-dashboard/components/MetricCardsGrid.tsx
src/app/*/                                # Header/điều hướng riêng từng trang
src/styles/ và CSS toàn cục               # Theme, chuyển động nếu cần
tests/unit/                               # Test giao diện hiện có
specs/023-refine-workspace-ui/            # Đặc tả, kế hoạch, test và bằng chứng
```

**Structure Decision**: Sửa các thành phần hiện có, tái sử dụng token và mẫu hiện có; chỉ trích xuất helper khi cần tránh trùng lặp.

## Complexity Tracking

Không có vi phạm hiến chương dự kiến.
