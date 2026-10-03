# Contributing to SQL Visualizer

Thank you for your interest in contributing to SQL Visualizer! This guide will help you understand our development process, coding standards, and how to submit your contributions.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Code Organization](#code-organization)
4. [Coding Standards](#coding-standards)
5. [Feature Development Workflow](#feature-development-workflow)
6. [Testing Requirements](#testing-requirements)
7. [Submission Process](#submission-process)
8. [Issue Reporting](#issue-reporting)

---

## Getting Started

### Prerequisites

- **Node.js**: 18.17 or later
- **npm** or **yarn**: Latest stable version
- **Git**: For version control
- **Ollama** (optional): For local AI model testing

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/sql-visualizer.git
   cd sql-visualizer
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/original-repo/sql-visualizer.git
   ```

---

## Development Setup

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

### 2. Configure Environment

Create a `.env.local` file for local development (see `.env.example` if available):

```env
NEXT_PUBLIC_API_URL=http://localhost:4028
# Add other required environment variables
```

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:4028`

### 4. Optional: Setup Ollama for AI Features

For full AI feature testing:

```bash
# Install Ollama models
ollama pull qwen2.5-coder:7b
ollama pull all-minilm
ollama pull nomic-embed-text

# In a separate terminal, start Ollama
$env:OLLAMA_CONTEXT_LENGTH = "8192"
ollama serve
```

### 5. Build the Database Knowledge Index (Optional)

```bash
npm run build-database-knowledge-index
npm run build-docs-index
```

---

## Code Organization

### Project Structure

```
sql-visualizer/
├── src/
│   ├── app/                 # Next.js App Router pages and layout
│   ├── components/          # Reusable React components
│   ├── lib/                 # Core business logic and utilities
│   │   ├── ai/              # AI-related functions (analysis, chat)
│   │   └── ...
│   ├── locales/             # Internationalization (EN, VI, etc.)
│   ├── styles/              # Global and component styles
│   └── types/               # TypeScript type definitions
├── tests/
│   ├── unit/                # Unit tests
│   ├── fixtures/            # Test data and mock responses
│   └── utils/               # Test helpers and utilities
├── specs/                   # Feature specifications and planning
│   ├── 001-baseline/
│   ├── 014-db-assistant-chat-history/  # Chat History Feature
│   └── ...
├── public/                  # Static assets
├── docs/                    # Documentation
│   ├── confluence/          # Confluence markdown exports
│   └── spring-backend-calcite/
├── scripts/                 # Build and utility scripts
└── package.json
```

### Module Responsibilities

| Module | Purpose | Key Files |
|--------|---------|-----------|
| `src/lib/ai/` | AI analysis, chat, and assistant logic | `chatHistoryStorage.ts`, `chatHistoryLocalStorage.ts` |
| `src/components/` | UI components for all features | `DatabaseAssistantHistoryPanel.tsx` |
| `src/locales/` | Multilingual string definitions | `en.ts`, `vi.ts` |
| `tests/unit/` | Unit tests for all modules | `*.test.ts` files |
| `specs/*/` | Feature specifications and tasks | `spec.md`, `plan.md`, `tasks.md` |

---

## Coding Standards

### TypeScript

- **Strict Mode Required**: All code must pass `npm run type-check` with no errors or warnings
- **No `any` Types**: Avoid `any`; use specific types or generics
- **Explicit Return Types**: Always annotate function return types
- **Type Guards**: Provide runtime validation functions for untrusted data

Example:
```typescript
// ✅ Good: Explicit types, type guard for runtime validation
function validateHistory(payload: unknown): StoredHistory | null {
  if (typeof payload !== 'object' || payload === null) return null;
  if (!('version' in payload && 'ownerId' in payload)) return null;
  return payload as StoredHistory;
}

// ❌ Avoid: Implicit any, no validation
function process(data: any) {
  return data.conversations;
}
```

### Component Development

- **Use Functional Components**: Class components only for error boundaries
- **Hooks Best Practices**:
  - Keep hooks at the top level (no conditional hooks)
  - Use `useCallback` for stable function references passed to children
  - Minimize dependencies in `useEffect` and `useMemo`
- **Accessibility (a11y)**:
  - Use semantic HTML (`<button>`, `<nav>`, etc.)
  - Include `aria-labels` for icon-only controls
  - Ensure keyboard navigation is supported
  - Test with screen readers

Example:
```typescript
// ✅ Good: Proper component structure with a11y
export function ConversationList({ 
  conversations, 
  onSelect 
}: ConversationListProps) {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSelect(e.currentTarget.dataset.id);
  }, [onSelect]);

  return (
    <nav aria-label="Conversation history">
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

### State Management (Zustand)

- **Single Source of Truth**: All shared state lives in store slices
- **Synchronous Actions**: Keep actions synchronous; handle async in components or middleware
- **Selector Pattern**: Use store selectors for fine-grained subscriptions
- **Error-as-Values**: Never throw from store; return error objects

Example:
```typescript
// ✅ Good: Clear state structure, error-as-values
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
      // Is error
      set({ error: result });
      return result;
    }
    set({ history: result });
    return result;
  },
}));
```

### Storage and Persistence

- **Synchronous APIs**: All storage operations must be synchronous (no async/await)
- **Error Handling**: Return errors; never throw from storage methods
- **Data Validation**: Always validate loaded data against expected schema
- **Partitioning**: Use identity-based key partitioning to prevent data cross-contamination

Example:
```typescript
// ✅ Good: Synchronous, validates data, handles errors
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
      return validated || new StorageCorruptError('Invalid history structure');
    } catch (error) {
      return new StorageUnavailableError('Cannot read storage');
    }
  }
}
```

### Internationalization (i18n)

- **Locale Structure**: One file per language in `src/locales/`
- **Naming Convention**: Use snake_case for keys, namespace by feature
- **Key Organization**:
  ```typescript
  // src/locales/en.ts
  export const en = {
    dbAssistantHistory: {
      title: 'Chat History',
      newChat: 'New Chat',
      search: 'Search conversations',
      // ...
    },
    // Other feature namespaces...
  };
  ```
- **Usage in Components**:
  ```typescript
  import { getT } from '@/lib/i18n';
  
  const t = getT('en'); // or get from context
  return <h1>{t('dbAssistantHistory.title')}</h1>;
  ```

---

## Feature Development Workflow

### 1. Specification Phase

Before coding:

1. Create a feature spec in `specs/{NUMBER}-{feature-name}/spec.md`
2. Include user scenarios, acceptance criteria, and technical constraints
3. Get stakeholder review and approval
4. Identify any integration points with existing features

Example spec structure:
```markdown
# Feature NNN: Feature Name

## Overview
What this feature does and why it matters.

## Acceptance Criteria
- Given... When... Then... (Gherkin format)
- Measurable definition of "done"

## Technical Requirements
- Storage mechanism (localStorage, DB, etc.)
- Performance constraints
- Error handling strategy
- i18n/a11y requirements
```

### 2. Planning Phase

Create `specs/{NUMBER}/plan.md` with:

- **Data Model**: Storage structure, schemas, migrations
- **Component Architecture**: UI structure, state flow
- **API Contracts**: Storage interface, service signatures
- **Error Handling**: Expected failure modes and recovery
- **Testing Strategy**: Unit, integration, E2E test matrix

### 3. Implementation Phase

1. **Follow TDD Red-Green-Refactor**:
   ```bash
   # RED: Write test that fails
   npm run test -- --watch
   
   # GREEN: Write minimal code to pass
   npm run type-check  # Must pass
   
   # REFACTOR: Improve without changing behavior
   ```

2. **Core-to-UI Sequence**:
   - Core types and contracts first
   - Storage/persistence layer
   - Business logic (helpers, state)
   - UI components
   - Integration and E2E tests

3. **Code Reviews**:
   - Keep PRs focused (one feature per PR)
   - Request review from 2+ maintainers
   - Address all feedback before merge
   - Run full test suite before final approval

### 4. Documentation Phase

Update relevant docs when feature is complete:

- `README.md` (English setup/features)
- `docs/confluence/SQL_Visualizer_Confluence_EN.md`
- `docs/confluence/SQL_Visualizer_Confluence_VI.md`
- Feature-specific README in `docs/{feature}/README.md`

---

## Testing Requirements

### Test Structure

Tests use **Vitest** with **jsdom** for DOM simulation and **localStorage** mocking.

```bash
# Run all tests
npm run test

# Run specific file
npx vitest run tests/unit/specific.test.ts

# Run tests matching pattern
npx vitest run -t "pattern"

# Watch mode for development
npx vitest --watch
```

### Coverage Targets

| Area | Minimum | Target |
|------|---------|--------|
| Unit Tests | 80% | 90%+ |
| Integration | 60% | 80%+ |
| E2E | Key flows | All flows |

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

All code must pass strict TypeScript checking:

```bash
npm run type-check
```

This runs `tsc --noEmit` with strict mode enabled. No errors are acceptable.

---

## Submission Process

### Creating a Pull Request

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/NNN-description
   ```

2. **Make your changes** following the workflow above

3. **Commit with clear messages**:
   ```bash
   git commit -m "feat(feature-name): add new capability"
   ```
   Use conventional commits: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`

4. **Push to your fork**:
   ```bash
   git push origin feature/NNN-description
   ```

5. **Open a PR on GitHub** with:
   - Clear title: `feat(chat-history): persist conversations to localStorage`
   - Description of what changed and why
   - Link to related issues
   - Evidence of tests passing (`npm run test`)
   - Type check passing (`npm run type-check`)

### PR Checklist

Before submitting, verify:

- [ ] Tests written and passing (`npm run test`)
- [ ] Type check passing (`npm run type-check`)
- [ ] Linting passing (`npm run lint` if configured)
- [ ] Documentation updated
- [ ] No breaking changes without discussion
- [ ] Follows code standards (TypeScript, components, i18n)
- [ ] Commits are logical and well-described

### Review Process

- Maintainers will review your PR within 5 business days
- Address feedback constructively
- Push additional commits to the same branch (don't force-push)
- Once approved by 2+ maintainers, your PR will be merged

---

## Issue Reporting

### Found a Bug?

1. Check existing issues to avoid duplicates
2. Create an issue with:
   - Clear title: "Bug: [Component] does not work with [scenario]"
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshots if relevant
   - Environment (OS, Node version, etc.)

Example:
```markdown
## Bug: Chat History Search Not Finding Conversations

### Steps to Reproduce
1. Load the Database AI Assistant
2. Create 5 conversations with different titles
3. Click the search box
4. Type "test"

### Expected
Shows 2 conversations containing "test"

### Actual
Search box appears disabled; no results shown

### Environment
- OS: Windows 11
- Node: 18.17
- Browser: Chrome 120
```

### Feature Request?

1. Check the roadmap in `specs/` directory
2. Create an issue with:
   - Clear title: "Feature: [capability] for [user] to [goal]"
   - User story format: "As a [role], I want [feature] so that [benefit]"
   - Acceptance criteria
   - Any mockups or examples

---

## Resources

- **Documentation**: See `docs/confluence/SQL_Visualizer_Confluence_EN.md`
- **Architecture**: See `docs/spring-backend-calcite/README.md`
- **Tests**: See `tests/` and `specs/*/tdd/` directories
- **TypeScript**: https://www.typescriptlang.org/docs/
- **Next.js**: https://nextjs.org/docs
- **Zustand**: https://github.com/pmndrs/zustand
- **Tailwind CSS**: https://tailwindcss.com/docs

---

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions. We're here to help each other build something great.

---

**Questions?** Open a discussion in the GitHub Discussions tab or contact the maintainers.

Thank you for contributing to SQL Visualizer! 🚀
