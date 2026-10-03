# Đóng góp cho SQL Visualizer

Cảm ơn bạn đã quan tâm đến việc đóng góp cho SQL Visualizer! Hướng dẫn này sẽ giúp bạn hiểu quy trình phát triển, tiêu chuẩn coding, và cách để gửi đóng góp của bạn.

---

## Mục lục

1. [Bắt đầu](#bắt-đầu)
2. [Cài đặt phát triển](#cài-đặt-phát-triển)
3. [Tổ chức code](#tổ-chức-code)
4. [Tiêu chuẩn coding](#tiêu-chuẩn-coding)
5. [Quy trình phát triển tính năng](#quy-trình-phát-triển-tính-năng)
6. [Yêu cầu kiểm thử](#yêu-cầu-kiểm-thử)
7. [Quy trình gửi code](#quy-trình-gửi-code)
8. [Báo cáo lỗi](#báo-cáo-lỗi)

---

## Bắt đầu

### Yêu cầu tiên quyết

- **Node.js**: Phiên bản 18.17 trở lên
- **npm** hoặc **yarn**: Phiên bản ổn định mới nhất
- **Git**: Để kiểm soát phiên bản
- **Ollama** (tùy chọn): Để kiểm thử mô hình AI cục bộ

### Fork và Clone

1. Fork repository trên GitHub
2. Clone fork của bạn về máy cục bộ:
   ```bash
   git clone https://github.com/USERNAME_CUA_BAN/sql-visualizer.git
   cd sql-visualizer
   ```
3. Thêm upstream remote:
   ```bash
   git remote add upstream https://github.com/original-repo/sql-visualizer.git
   ```

---

## Cài đặt phát triển

### 1. Cài đặt dependencies

```bash
npm install
# hoặc
yarn install
```

### 2. Cấu hình môi trường

Tạo file `.env.local` để phát triển cục bộ (xem `.env.example` nếu có):

```env
NEXT_PUBLIC_API_URL=http://localhost:4028
# Thêm các biến môi trường khác khi cần
```

### 3. Khởi động development server

```bash
npm run dev
```

Ứng dụng sẽ có sẵn tại `http://localhost:4028`

### 4. Tùy chọn: Cài đặt Ollama cho các tính năng AI

Để kiểm thử đầy đủ các tính năng AI:

```bash
# Cài đặt các mô hình Ollama
ollama pull qwen2.5-coder:7b
ollama pull all-minilm
ollama pull nomic-embed-text

# Trong một terminal khác, khởi động Ollama
$env:OLLAMA_CONTEXT_LENGTH = "8192"
ollama serve
```

### 5. Xây dựng Database Knowledge Index (Tùy chọn)

```bash
npm run build-database-knowledge-index
npm run build-docs-index
```

---

## Tổ chức code

### Cấu trúc dự án

```
sql-visualizer/
├── src/
│   ├── app/                 # Next.js App Router pages và layout
│   ├── components/          # Các React components có thể tái sử dụng
│   ├── lib/                 # Logic kinh doanh cốt lõi và utilities
│   │   ├── ai/              # Các hàm liên quan AI (phân tích, chat)
│   │   └── ...
│   ├── locales/             # Quốc tế hóa (EN, VI, vv.)
│   ├── styles/              # Các style toàn cục và component
│   └── types/               # Định nghĩa kiểu TypeScript
├── tests/
│   ├── unit/                # Unit tests
│   ├── fixtures/            # Test data và mock responses
│   └── utils/               # Test helpers và utilities
├── specs/                   # Feature specifications và planning
│   ├── 001-baseline/
│   ├── 014-db-assistant-chat-history/  # Chat History Feature
│   └── ...
├── public/                  # Static assets
├── docs/                    # Tài liệu
│   ├── confluence/          # Confluence markdown exports
│   └── spring-backend-calcite/
├── scripts/                 # Build và utility scripts
└── package.json
```

### Trách nhiệm của các Module

| Module | Mục đích | Các file chính |
|--------|---------|-----------|
| `src/lib/ai/` | Phân tích AI, chat, và logic hỗ trợ | `chatHistoryStorage.ts`, `chatHistoryLocalStorage.ts` |
| `src/components/` | Các UI component cho tất cả tính năng | `DatabaseAssistantHistoryPanel.tsx` |
| `src/locales/` | Định nghĩa chuỗi đa ngôn ngữ | `en.ts`, `vi.ts` |
| `tests/unit/` | Unit tests cho tất cả modules | các file `*.test.ts` |
| `specs/*/` | Feature specifications và tasks | `spec.md`, `plan.md`, `tasks.md` |

---

## Tiêu chuẩn coding

### TypeScript

- **Strict Mode Bắt buộc**: Tất cả code phải pass `npm run type-check` không có lỗi hoặc cảnh báo
- **Không có kiểu `any`**: Tránh `any`; sử dụng kiểu cụ thể hoặc generics
- **Rõ ràng về return type**: Luôn chú thích return type của hàm
- **Type Guards**: Cung cấp các hàm xác thực cho dữ liệu không đáng tin cây

Ví dụ:
```typescript
// ✅ Tốt: Kiểu rõ ràng, type guard cho xác thực runtime
function validateHistory(payload: unknown): StoredHistory | null {
  if (typeof payload !== 'object' || payload === null) return null;
  if (!('version' in payload && 'ownerId' in payload)) return null;
  return payload as StoredHistory;
}

// ❌ Tránh: Implicit any, không có xác thực
function process(data: any) {
  return data.conversations;
}
```

### Phát triển Component

- **Sử dụng Functional Components**: Chỉ dùng class components cho error boundaries
- **Hooks Best Practices**:
  - Giữ hooks ở mức cao nhất (không hook có điều kiện)
  - Sử dụng `useCallback` cho các tham chiếu hàm ổn định được truyền cho children
  - Giảm thiểu dependencies trong `useEffect` và `useMemo`
- **Accessibility (a11y)**:
  - Sử dụng semantic HTML (`<button>`, `<nav>`, vv.)
  - Bao gồm `aria-labels` cho các control chỉ có icon
  - Đảm bảo điều hướng bằng bàn phím được hỗ trợ
  - Kiểm thử với screen readers

Ví dụ:
```typescript
// ✅ Tốt: Cấu trúc component thích hợp với a11y
export function ConversationList({ 
  conversations, 
  onSelect 
}: ConversationListProps) {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSelect(e.currentTarget.dataset.id);
  }, [onSelect]);

  return (
    <nav aria-label="Lịch sử cuộc trò chuyện">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          data-id={conv.id}
          onClick={() => onSelect(conv.id)}
          onKeyDown={handleKeyDown}
          aria-current={conv.isActive ? 'page' : undefined}
        >
          {conv.title}
        </button>
      ))}
    </nav>
  );
}
```

### Quản lý State (Zustand)

- **Single Source of Truth**: Tất cả state được chia sẻ sống trong store slices
- **Synchronous Actions**: Giữ các action đồng bộ; xử lý async trong components hoặc middleware
- **Selector Pattern**: Sử dụng store selectors cho các subscription chi tiết
- **Error-as-Values**: Không bao giờ throw từ store; trả về các object lỗi

Ví dụ:
```typescript
// ✅ Tốt: Cấu trúc state rõ ràng, error-as-values
interface StorageError {
  type: 'unavailable' | 'quota' | 'corrupt';
  message: string;
}

type LoadResult = StoredHistory | StorageError;

const store = create<HistoryStore>((set) => ({
  history: null,
  loadHistory: (identityKey: string): LoadResult => {
    const result = storage.load(identityKey);
    if ('message' in result) {
      // Là lỗi
      set({ error: result });
      return result;
    }
    set({ history: result });
    return result;
  },
}));
```

### Lưu trữ và Persistence

- **Synchronous APIs**: Tất cả các hoạt động lưu trữ phải đồng bộ (không async/await)
- **Xử lý lỗi**: Trả về lỗi; không bao giờ throw từ các phương thức storage
- **Xác thực dữ liệu**: Luôn xác thực dữ liệu được tải so với schema dự kiến
- **Partitioning**: Sử dụng key partitioning dựa trên identity để ngăn chặn cross-contamination dữ liệu

Ví dụ:
```typescript
// ✅ Tốt: Đồng bộ, xác thực dữ liệu, xử lý lỗi
interface DatabaseAssistantHistoryStorage {
  load(identityKey: string | null): StoredHistory | StorageError;
  save(payload: SavePayload): StoredHistory | StorageError;
  clear(payload: ClearPayload): StoredHistory | StorageError;
}

class LocalStorageImpl implements DatabaseAssistantHistoryStorage {
  load(identityKey: string | null): StoredHistory | StorageError {
    if (!identityKey) return this.emptyHistory(null); // Guest
    
    try {
      const key = buildStorageKey(identityKey);
      const json = localStorage.getItem(key);
      if (!json) return this.emptyHistory(identityKey);
      
      const parsed = JSON.parse(json);
      const validated = normaliseLoadedHistory(parsed);
      return validated || new StorageCorruptError('Cấu trúc history không hợp lệ');
    } catch (error) {
      return new StorageUnavailableError('Không thể đọc storage');
    }
  }
}
```

### Quốc tế hóa (i18n)

- **Cấu trúc Locale**: Một file cho mỗi ngôn ngữ trong `src/locales/`
- **Quy ước đặt tên**: Sử dụng snake_case cho keys, namespace theo tính năng
- **Tổ chức Key**:
  ```typescript
  // src/locales/en.ts
  export const en = {
    dbAssistantHistory: {
      title: 'Chat History',
      newChat: 'New Chat',
      search: 'Search conversations',
      // ...
    },
    // Các namespace tính năng khác...
  };
  ```
- **Sử dụng trong Components**:
  ```typescript
  import { getT } from '@/lib/i18n';
  
  const t = getT('en'); // hoặc lấy từ context
  return <h1>{t('dbAssistantHistory.title')}</h1>;
  ```

---

## Quy trình phát triển tính năng

### 1. Giai đoạn Specification

Trước khi coding:

1. Tạo feature spec trong `specs/{NUMBER}-{feature-name}/spec.md`
2. Bao gồm các user scenarios, acceptance criteria, và technical constraints
3. Nhận xét lại từ stakeholders và phê duyệt
4. Xác định các điểm tích hợp với các tính năng hiện có

Ví dụ cấu trúc spec:
```markdown
# Feature NNN: Tên tính năng

## Tổng quan
Tính năng này làm gì và tại sao nó quan trọng.

## Acceptance Criteria
- Given... When... Then... (Gherkin format)
- Định nghĩa có thể đo lường của "done"

## Technical Requirements
- Cơ chế lưu trữ (localStorage, DB, vv.)
- Ràng buộc hiệu năng
- Chiến lược xử lý lỗi
- Yêu cầu i18n/a11y
```

### 2. Giai đoạn Planning

Tạo `specs/{NUMBER}/plan.md` với:

- **Data Model**: Cấu trúc lưu trữ, schemas, migrations
- **Component Architecture**: Cấu trúc UI, state flow
- **API Contracts**: Storage interface, service signatures
- **Error Handling**: Các chế độ lỗi dự kiến và phục hồi
- **Testing Strategy**: Ma trận test unit, integration, E2E

### 3. Giai đoạn Implementation

1. **Tuân theo TDD Red-Green-Refactor**:
   ```bash
   # RED: Viết test fail
   npm run test -- --watch
   
   # GREEN: Viết minimal code để pass
   npm run type-check  # Phải pass
   
   # REFACTOR: Cải thiện mà không thay đổi hành vi
   ```

2. **Chuỗi Core-to-UI**:
   - Core types và contracts trước tiên
   - Storage/persistence layer
   - Business logic (helpers, state)
   - UI components
   - Integration và E2E tests

3. **Code Reviews**:
   - Giữ PRs focused (một tính năng per PR)
   - Yêu cầu review từ 2+ maintainers
   - Xử lý tất cả feedback trước merge
   - Chạy full test suite trước phê duyệt cuối cùng

### 4. Giai đoạn Documentation

Cập nhật các docs liên quan khi tính năng hoàn thành:

- `README.md` (setup/features tiếng Anh)
- `docs/confluence/SQL_Visualizer_Confluence_EN.md`
- `docs/confluence/SQL_Visualizer_Confluence_VI.md`
- Feature-specific README trong `docs/{feature}/README.md`

---

## Yêu cầu kiểm thử

### Cấu trúc Test

Tests sử dụng **Vitest** với **jsdom** để mô phỏng DOM và mock **localStorage**.

```bash
# Chạy tất cả tests
npm run test

# Chạy file cụ thể
npx vitest run tests/unit/specific.test.ts

# Chạy tests khớp pattern
npx vitest run -t "pattern"

# Watch mode cho phát triển
npx vitest --watch
```

### Coverage Targets

| Area | Tối thiểu | Mục tiêu |
|------|---------|--------|
| Unit Tests | 80% | 90%+ |
| Integration | 60% | 80%+ |
| E2E | Key flows | Tất cả flows |

### Test Patterns

#### Unit Tests (Pure Functions)

```typescript
describe('deriveTitleFromQuestion', () => {
  it('should preserve short questions unchanged', () => {
    const question = 'SELECT * FROM users';
    expect(deriveTitleFromQuestion(question)).toBe(question);
  });

  it('should truncate long questions at word boundary', () => {
    const long = 'SELECT * FROM users WHERE id IN (...many long conditions...)';
    const result = deriveTitleFromQuestion(long);
    expect(result.length).toBeLessThanOrEqual(55); // ~50 + buffer
    expect(result.endsWith('...')).toBe(true);
  });

  it('should never return empty string', () => {
    expect(deriveTitleFromQuestion('   ')).toBe('Untitled');
    expect(deriveTitleFromQuestion('')).toBe('Untitled');
  });
});
```

#### Storage Tests (Error Scenarios)

```typescript
describe('DatabaseAssistantHistoryStorage', () => {
  afterEach(() => localStorage.clear());

  it('should return StorageUnavailableError when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const result = storage.save(testPayload);
    expect(result).toHaveProperty('message');
    expect(result.message).toContain('storage');
  });

  it('should preserve data integrity when quota is exceeded', () => {
    // Pre-fill storage
    const existing = storage.load(testKey);
    
    // Try to exceed quota
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    storage.save(newPayload);
    
    // Original data should be unchanged
    const reloaded = storage.load(testKey);
    expect(reloaded).toEqual(existing);
  });
});
```

#### Component Tests (React)

```typescript
describe('ConversationList', () => {
  it('should render conversations grouped by recency', () => {
    const conversations = [
      { id: '1', title: 'Today', lastUsedAt: now },
      { id: '2', title: 'Yesterday', lastUsedAt: yesterday },
    ];

    const { getByText } = render(
      <ConversationList conversations={conversations} />
    );

    expect(getByText('Today')).toBeInTheDocument();
    expect(getByText('Yesterday')).toBeInTheDocument();
  });

  it('should support keyboard navigation', () => {
    const onSelect = vi.fn();
    const { getByRole } = render(
      <ConversationList conversations={mockConversations} onSelect={onSelect} />
    );

    const firstButton = getByRole('button', { name: /first conversation/i });
    fireEvent.keyDown(firstButton, { key: 'Enter' });
    
    expect(onSelect).toHaveBeenCalled();
  });
});
```

### Type Checking

Tất cả code phải pass strict TypeScript checking:

```bash
npm run type-check
```

Lệnh này chạy `tsc --noEmit` với strict mode bật. Không có lỗi nào được chấp nhận.

---

## Quy trình gửi code

### Tạo Pull Request

1. **Tạo feature branch**:
   ```bash
   git checkout -b feature/NNN-description
   ```

2. **Thực hiện thay đổi** tuân theo quy trình trên

3. **Commit với các thông báo rõ ràng**:
   ```bash
   git commit -m "feat(feature-name): add new capability"
   ```
   Sử dụng conventional commits: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`

4. **Push tới fork của bạn**:
   ```bash
   git push origin feature/NNN-description
   ```

5. **Mở PR trên GitHub** với:
   - Tiêu đề rõ ràng: `feat(chat-history): persist conversations to localStorage`
   - Mô tả những gì thay đổi và tại sao
   - Link tới các issues liên quan
   - Bằng chứng tests pass (`npm run test`)
   - Type check pass (`npm run type-check`)

### PR Checklist

Trước khi gửi, xác minh:

- [ ] Tests được viết và pass (`npm run test`)
- [ ] Type check pass (`npm run type-check`)
- [ ] Linting pass (`npm run lint` nếu được cấu hình)
- [ ] Tài liệu được cập nhật
- [ ] Không có breaking changes mà không thảo luận
- [ ] Tuân theo tiêu chuẩn code (TypeScript, components, i18n)
- [ ] Commits là logic và được mô tả tốt

### Quy trình Review

- Maintainers sẽ review PR của bạn trong vòng 5 ngày làm việc
- Xử lý feedback một cách xây dựng
- Push additional commits tới cùng một branch (không force-push)
- Khi được phê duyệt bởi 2+ maintainers, PR của bạn sẽ được merge

---

## Báo cáo lỗi

### Phát hiện một lỗi?

1. Kiểm tra các issues hiện có để tránh duplicates
2. Tạo một issue với:
   - Tiêu đề rõ ràng: "Bug: [Component] does not work with [scenario]"
   - Các bước để tái tạo
   - Hành vi dự kiến
   - Hành vi thực tế
   - Screenshots nếu liên quan
   - Môi trường (OS, Node version, vv.)

Ví dụ:
```markdown
## Bug: Chat History Search Not Finding Conversations

### Các bước để tái tạo
1. Load Database AI Assistant
2. Tạo 5 cuộc trò chuyện với các tiêu đề khác nhau
3. Nhấp vào search box
4. Gõ "test"

### Dự kiến
Hiển thị 2 cuộc trò chuyện chứa "test"

### Thực tế
Search box xuất hiện disabled; không có kết quả

### Môi trường
- OS: Windows 11
- Node: 18.17
- Browser: Chrome 120
```

### Feature Request?

1. Kiểm tra roadmap trong thư mục `specs/`
2. Tạo một issue với:
   - Tiêu đề rõ ràng: "Feature: [capability] for [user] to [goal]"
   - User story format: "As a [role], I want [feature] so that [benefit]"
   - Acceptance criteria
   - Bất kỳ mockups hoặc ví dụ nào

---

## Tài nguyên

- **Tài liệu**: Xem `docs/confluence/SQL_Visualizer_Confluence_VI.md`
- **Architecture**: Xem `docs/spring-backend-calcite/README.md`
- **Tests**: Xem thư mục `tests/` và `specs/*/tdd/`
- **TypeScript**: https://www.typescriptlang.org/docs/
- **Next.js**: https://nextjs.org/docs
- **Zustand**: https://github.com/pmndrs/zustand
- **Tailwind CSS**: https://tailwindcss.com/docs

---

## Quy tắc ứng xử

Hãy tôn trọng, bao gồm và xây dựng trong tất cả các tương tác. Chúng ta ở đây để giúp nhau xây dựng một cái gì đó tuyệt vời.

---

**Có câu hỏi?** Mở một thảo luận trong tab GitHub Discussions hoặc liên hệ với maintainers.

Cảm ơn bạn đã đóng góp cho SQL Visualizer! 🚀
