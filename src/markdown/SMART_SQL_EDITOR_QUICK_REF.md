# Smart SQL Editor - Quick Reference

## Install (1 minute)

```bash
npm install monaco-editor sql-formatter
```

## Usage (Copy-Paste Ready)

### In Any Page Component

```tsx
'use client';

import SmartSQLEditor from '@/components/SmartSQLEditor';

export default function MyPage() {
  return (
    <div className="p-4 bg-gray-950 min-h-screen">
      <SmartSQLEditor initialSql="SELECT * FROM users LIMIT 10;" />
    </div>
  );
}
```

### With Custom Layout

```tsx
'use client';

import SmartSQLEditor from '@/components/SmartSQLEditor';

export default function Dashboard() {
  return (
    <div className="grid grid-cols-3 gap-4 p-4">
      <div className="col-span-2">
        <SmartSQLEditor initialSql="SELECT * FROM table;" />
      </div>
      <aside className="bg-gray-900 p-4 rounded">
        <h2>Results</h2>
        {/* Your results panel */}
      </aside>
    </div>
  );
}
```

## Start Ollama (AI Optimization)

```bash
# Option 1: Using Mistral (recommended - fast & accurate)
ollama run mistral

# Option 2: Using Neural Chat (faster inference)
ollama run neural-chat

# Option 3: Using Wizard Math (better at analytical queries)
ollama run wizard-math
```

**Port:** `http://localhost:11434` (auto-configured)

## Component Props

| Prop         | Type     | Default                              | Description            |
| ------------ | -------- | ------------------------------------ | ---------------------- |
| `initialSql` | `string` | `SELECT * FROM table_name LIMIT 10;` | Starting SQL in editor |

## Features & Buttons

| Button                | Function                                    | Trigger                 |
| --------------------- | ------------------------------------------- | ----------------------- |
| 📝 Format SQL         | MySQL-style formatting (uppercase keywords) | Click anytime           |
| 🔀 Compare            | Toggle between single/diff editor view      | Click to switch         |
| 🤖 Analyze & Optimize | AI optimization via Ollama                  | Requires Ollama running |

## Editor Modes

### Single Editor (Default)

- Regular SQL editing
- Real-time validation
- Syntax error highlighting

### Diff Editor (Compare Mode)

- Left pane: Original SQL
- Right pane: Modified/Optimized SQL
- Color-coded differences
- Line-by-line comparison

## Real-Time Validation

```
User types SQL
    ↓
500ms debounce
    ↓
dt-sql-parser validates
    ↓
Errors show in:
  • Red inline markers
  • Error panel (below buttons)
  • Status bar (error count)
```

## AI Optimization Flow

```
Click "Analyze & Optimize"
    ↓
Loading spinner appears
    ↓
SQL sent to Ollama with DBA prompt
    ↓
Ollama returns JSON:
  {
    "optimizedSql": "...",
    "estimatedRows": "...",
    "performanceNotes": ["..."],
    "businessChanges": "..."
  }
    ↓
Auto-switch to Diff View
    ↓
Show optimization panel with insights
```

## Debugging

### Open Console Logs

```javascript
// In DevTools Console (F12)
// You'll see entries like:
[DEBUG] ✅ Monaco Single Editor initialized
[DEBUG] ✅ SQL syntax valid
[INFO]  ✅ SQL formatted successfully
[WARN]  ⚠️ SQL syntax error detected: ...
[ERROR] ❌ Failed to initialize Monaco Editor
```

### Test Ollama Connection

```bash
# Terminal
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral",
    "prompt": "Write a SQL query to get top 10 users by order count",
    "stream": false
  }'

# Should return JSON with "response" field
```

## Common Issues & Fixes

### Issue: "Editor doesn't appear"

**Fix:** Run `npm install monaco-editor`

### Issue: "Ollama API error 404"

**Fix:** Start Ollama: `ollama run mistral`

### Issue: "JSON parsing error in optimization"

**Fix:** Check Ollama is running; try different model: `ollama run neural-chat`

### Issue: "Validation very slow"

**Fix:** Component debounces at 500ms (by design); lowering may impact performance

### Issue: "Memory leak warning"

**Fix:** Component properly disposes editors; may be unrelated to this component

## Performance Notes

- ✅ Debounce: 500ms (balanced)
- ✅ Single Editor: ~50KB (light)
- ✅ Diff Editor: ~150KB (full comparison)
- ✅ Memory: All editors disposed on unmount
- ✅ No external API calls except Ollama (optional)

## Styling Customization

Find and modify these Tailwind classes in component:

```tsx
// Dark theme - modify for light theme
className = 'bg-gray-900'; // Main background
className = 'bg-gray-800'; // Secondary background
className = 'border-gray-700'; // Borders
className = 'text-white'; // Text color

// Button colors
className = 'bg-blue-600'; // Format button
className = 'bg-purple-600'; // Diff button
className = 'bg-green-600'; // Optimize button
```

## Integration Examples

### In Relationship Graph Visualizer

```tsx
// src/app/relationship-graph-visualizer/page.tsx
import SmartSQLEditor from '@/components/SmartSQLEditor';

export default function RelationshipGraphPage() {
  return (
    <div className="grid grid-cols-2">
      <SmartSQLEditor />
      <div>{/* Your graph */}</div>
    </div>
  );
}
```

### In CTE Analysis Tool

```tsx
// src/app/cte-analysis/page.tsx
import SmartSQLEditor from '@/components/SmartSQLEditor';

const cteExample = `
  WITH cte AS (SELECT * FROM table)
  SELECT * FROM cte;
`;

export default function CTEAnalysisPage() {
  return <SmartSQLEditor initialSql={cteExample} />;
}
```

### In SQL Metrics Dashboard

```tsx
// src/app/sql-metrics-dashboard/page.tsx
import SmartSQLEditor from '@/components/SmartSQLEditor';

export default function MetricsDashboard() {
  return (
    <div>
      <SmartSQLEditor initialSql="SELECT * FROM users;" />
      <MetricsDisplay />
    </div>
  );
}
```

## File Locations

```
src/
├── components/
│   └── SmartSQLEditor.tsx          ← Main component
├── lib/
│   ├── logger.ts                    ← Logging (already exists)
│   └── ...
├── app/
│   └── smart-sql-editor-demo/
│       └── page.tsx                 ← Test/demo page
└── ...

Root/
└── SMART_SQL_EDITOR_SETUP.md        ← Full documentation
└── SMART_SQL_EDITOR_QUICK_REF.md    ← This file
```

## API Reference

### Monaco Editor Themes

```tsx
// In SmartSQLEditor component, change:
theme: 'vs-dark'; // Dark (current)
theme: 'vs'; // Light
theme: 'hc-black'; // High contrast
```

### Ollama Models

```bash
# For SQL optimization, try:
ollama run mistral          # General purpose (recommended)
ollama run neural-chat      # Fast inference
ollama run wizard-math      # Better analytical
ollama run llama2           # Large & slower
```

### SQL Formatter Options

```tsx
// In handleFormatSQL(), can modify:
format(sql, {
  language: 'mysql', // 'mysql' | 'postgresql' | 'sqlite' | etc.
  uppercase: true, // true | false
  lineWidth: 80, // Characters per line
  indent: '  ', // Spaces or tabs
});
```

## Testing Checklist

- [ ] Dependencies installed
- [ ] Component imported
- [ ] Editor renders
- [ ] Type SQL → validation works (check console)
- [ ] Click Format → uppercase keywords
- [ ] Click Compare → diff view appears
- [ ] Start Ollama
- [ ] Click Optimize → AI response appears
- [ ] Console logs visible (F12)

## Support Resources

| Resource         | Location                                    |
| ---------------- | ------------------------------------------- |
| Full Setup Guide | `SMART_SQL_EDITOR_SETUP.md`                 |
| Quick Reference  | `SMART_SQL_EDITOR_QUICK_REF.md` (this file) |
| Demo Page        | http://localhost:4028/smart-sql-editor-demo |
| Component Code   | `src/components/SmartSQLEditor.tsx`         |
| Logger Docs      | `src/lib/logger.ts`                         |

---

**TL;DR:**

1. `npm install monaco-editor sql-formatter`
2. Import & use: `<SmartSQLEditor initialSql="..." />`
3. For AI: `ollama run mistral` in another terminal
4. Debug: Press F12 → Console tab
