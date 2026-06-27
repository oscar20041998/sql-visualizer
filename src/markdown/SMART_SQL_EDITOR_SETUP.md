# Smart SQL Editor Component - Setup Guide

## Overview

The `SmartSQLEditor` component is a production-ready React component that provides:

- **Real-time SQL syntax validation** with Monaco Editor
- **SQL formatting** with MySQL uppercase transformation
- **Diff view** for comparing original vs optimized SQL
- **AI-powered optimization** via local Ollama LLM
- **Performance insights** and business impact analysis

## Installation

### 1. Install Missing Dependencies

```bash
npm install monaco-editor sql-formatter
```

Or if using yarn:

```bash
yarn add monaco-editor sql-formatter
```

### 2. Verify Existing Dependencies

Ensure these are already in your `package.json`:

- `dt-sql-parser` ✅ (already installed)
- `react` ✅ (v19+)
- `react-dom` ✅ (v19+)

## Usage

### Basic Integration

```tsx
import { SmartSQLEditor } from '@/components/SmartSQLEditor';

export default function SQLDashboard() {
  const initialQuery = `
    SELECT u.id, u.name, COUNT(o.id) as order_count
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    WHERE u.active = 1
    GROUP BY u.id, u.name
    ORDER BY order_count DESC;
  `;

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <SmartSQLEditor initialSql={initialQuery} />
    </div>
  );
}
```

### Advanced Usage with Layout

```tsx
'use client';

import { SmartSQLEditor } from '@/components/SmartSQLEditor';

export default function AdvancedDashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 bg-gray-950 min-h-screen">
      {/* Main Editor */}
      <div className="lg:col-span-2">
        <SmartSQLEditor initialSql="SELECT * FROM users LIMIT 10;" />
      </div>

      {/* Side Panel */}
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <h2 className="text-lg font-bold text-white mb-4">Query Statistics</h2>
        {/* Your custom stats here */}
      </div>
    </div>
  );
}
```

## Features in Detail

### 1. Real-Time Syntax Validation

- Validates SQL using `dt-sql-parser` (MySQL dialect)
- **500ms debounce** prevents excessive validation checks
- Errors display inline in Monaco Editor
- Shows summary in error panel

**How it works:**

1. User types SQL
2. After 500ms of inactivity, validation triggers
3. Parser attempts to parse the SQL
4. If invalid, markers appear in editor and error panel
5. If valid, markers cleared

### 2. SQL Formatting

- Button: **📝 Format SQL**
- Uses `sql-formatter` with:
  - Language: `mysql`
  - Uppercase: `true` (keywords uppercase)
- Automatically re-validates after formatting

**Example:**

```sql
-- Before
select id,name from users where active=1 order by created_at desc limit 10

-- After
SELECT id, name FROM users WHERE active = 1 ORDER BY created_at DESC LIMIT 10
```

### 3. Diff View Toggle

- Button: **🔀 Compare**
- Left pane: Original SQL
- Right pane: Modified/Optimized SQL
- Syntax highlighting for both
- Color-coded differences

**Use cases:**

- Compare original vs formatted
- View before/after AI optimization
- Compare different query versions

### 4. AI Optimization via Ollama

- Button: **🤖 Analyze & Optimize**
- Requires: Local Ollama running on `http://localhost:11434`
- Model: `mistral` (popular, fast, accurate for SQL)

**Prerequisites:**

```bash
# Install Ollama from https://ollama.ai
# Then run:
ollama run mistral

# Or use a different model:
ollama run neural-chat
ollama run wizard-math
```

**What it does:**

1. Sends SQL to Ollama with DBA expert prompt
2. Ollama returns optimized SQL + insights (as JSON)
3. Automatically switches to Diff View
4. Displays:
   - **Optimized SQL** (right pane)
   - **Performance Notes** (bullet list)
   - **Estimated Rows** (row count impact)
   - **Business Changes** (functional differences)

**Example Output:**

```json
{
  "optimizedSql": "SELECT u.id, u.name, COUNT(o.id) as order_count FROM users u LEFT JOIN orders o ON u.id = o.user_id WHERE u.active = 1 GROUP BY u.id, u.name ORDER BY order_count DESC;",
  "estimatedRows": "~500-1000 rows (down from 5000+)",
  "performanceNotes": [
    "Added index hint for users(active, id)",
    "Query uses index merge for better performance",
    "Subquery eliminated through window function"
  ],
  "businessChanges": "Results now filtered to active users only; return count of orders per user instead of raw order details"
}
```

## API Endpoints

### Ollama Generate Endpoint

**URL:** `http://localhost:11434/api/generate`

**Request Format:**

```json
{
  "model": "mistral",
  "prompt": "Your SQL query with system prompt",
  "stream": false,
  "format": "json"
}
```

**Response Format:**

```json
{
  "model": "mistral",
  "created_at": "2024-01-15T10:30:00Z",
  "response": "{\"optimizedSql\": \"...\", \"performanceNotes\": [...]}",
  "done": true,
  "context": [...]
}
```

## Component API

### Props

```tsx
interface SmartSQLEditorProps {
  initialSql?: string; // Default: "SELECT * FROM table_name LIMIT 10;"
}
```

### Component State (Internal)

```tsx
interface EditorState {
  originalSql: string; // Current SQL in editor
  modifiedSql: string; // Modified/optimized SQL
  isDiffMode: boolean; // Diff view active?
  isLoading: boolean; // AI optimization in progress?
  optimizationResult: OptimizationResult | null; // Ollama response
  syntaxErrors: string[]; // Validation errors
}

interface OptimizationResult {
  optimizedSql: string; // Optimized query
  estimatedRows: string; // Row count impact
  performanceNotes: string[]; // Performance tips
  businessChanges: string; // Functional changes
}
```

## Logging

The component uses the project's logger system (`src/lib/logger.ts`) for debugging:

```
[DEBUG] ✅ Monaco Single Editor initialized
[DEBUG] ✅ SQL syntax valid
[INFO]  ✅ SQL formatted successfully
[INFO]  ✅ AI optimization completed successfully
[ERROR] ❌ Failed to initialize Monaco Editor
[WARN]  ⚠️ SQL syntax error detected
```

To see logs in browser console:

1. Open DevTools (F12)
2. Go to **Console** tab
3. Perform actions (format, validate, optimize)
4. Check log output (will show timestamps, modules, debug info)

## Error Handling

### Network Errors

If Ollama is not running or unreachable:

```
Optimization error: Failed to connect to Ollama API. Make sure it is running on http://localhost:11434
```

**Solution:**

```bash
# Start Ollama
ollama serve

# In another terminal
ollama run mistral
```

### JSON Parse Errors

If Ollama returns malformed JSON:

```
Optimization error: Unexpected token in JSON at position X
```

**Solution:**

- Ensure Ollama is using latest version
- Try different model: `ollama run neural-chat`
- Verify API endpoint returns valid JSON

### Syntax Validation Errors

Parser fails on complex syntax:

```
⚠️ SQL syntax error detected: Error parsing SQL at line X
```

**Note:** dt-sql-parser has dialect limitations. Fallback to manual review for complex queries.

## Performance Considerations

### Memory Management

✅ Proper cleanup:

- Monaco editors disposed on unmount
- Event listeners removed
- Debounce timer cleared

✅ No memory leaks:

- useEffect dependencies properly configured
- Ref cleanup in return functions

### Optimization Tips

1. **Debounce:** 500ms is balanced (not too aggressive, not too slow)
2. **Single Editor Default:** Faster initial render than diff editor
3. **Diff on Demand:** Only creates diff editor when needed
4. **Model Disposal:** Explicit cleanup prevents accumulation

## Testing Checklist

### Before Deployment

- [ ] Install dependencies: `npm install monaco-editor sql-formatter`
- [ ] Start Ollama: `ollama run mistral`
- [ ] Add component to a page (use demo below)
- [ ] Test in browser:
  - [ ] Type SQL → validation works (500ms delay)
  - [ ] Click Format → SQL reformatted
  - [ ] Click Analyze & Optimize → Ollama response shown
  - [ ] Click Compare → Diff view shows original vs modified
  - [ ] Open DevTools → Check console logs
  - [ ] Syntax errors show in red panel

### Test Queries

```sql
-- Simple query
SELECT * FROM users LIMIT 10;

-- With JOIN
SELECT u.id, o.amount FROM users u JOIN orders o ON u.id = o.user_id;

-- With CTE
WITH ranked_users AS (
  SELECT id, name, ROW_NUMBER() OVER (ORDER BY created_at) as rank FROM users
)
SELECT * FROM ranked_users WHERE rank <= 10;

-- Complex with subquery
SELECT id, name, (SELECT COUNT(*) FROM orders WHERE user_id = users.id) as order_count
FROM users WHERE active = 1 ORDER BY order_count DESC;
```

## Styling

The component uses **Tailwind CSS** with these key classes:

- Background: `bg-gray-900` / `bg-gray-800` / `bg-gray-950`
- Borders: `border-gray-700`
- Text: `text-white` / `text-gray-300` / `text-red-100`
- Buttons: `bg-blue-600`, `bg-purple-600`, `bg-green-600`
- Success: `text-green-400`
- Error: `bg-red-900 text-red-100`

Customize colors by modifying Tailwind classes in component or config.

## Troubleshooting

| Issue                 | Cause                       | Solution                                |
| --------------------- | --------------------------- | --------------------------------------- |
| Editor doesn't appear | Monaco not installed        | Run `npm install monaco-editor`         |
| Validation very slow  | Debounce too long           | Lower from 500ms to 300ms               |
| Ollama endpoint 404   | Not running on port 11434   | Start: `ollama serve`                   |
| JSON parsing error    | Ollama returns invalid JSON | Check model output, try different model |
| Memory leak warning   | Editor not disposed         | Check if component unmounts cleanly     |
| Diff view blank       | Model creation failed       | Check browser console for errors        |

## Next Steps

1. ✅ Component created: `src/components/SmartSQLEditor.tsx`
2. 📦 Install dependencies: See "Installation" section
3. 🚀 Create demo page: See next section
4. 🧪 Test in browser
5. 🎨 Customize styling as needed
6. 📊 Integrate into dashboard

---

**Questions?** Check browser console logs for detailed debugging info.
