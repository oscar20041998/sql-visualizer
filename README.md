# SQL Visualizer

A comprehensive SQL analysis and visualization tool built with Next.js 15, React 19, and TypeScript. Analyze query complexity, visualize table relationships, explore CTEs, and deep-dive into JOIN conditions across multiple SQL dialects.

## 🚀 Features

### Core Analysis Tools

- **Query Input** - Paste SQL or import MyBatis XML with multi-dialect support (MySQL, PostgreSQL, SQL Server, Oracle)
- **Relationship Graph Visualizer** - Interactive visualization of table relationships and JOIN connections with color-coded edges and multiple layout options
- **JOIN Analysis** - Deep-dive analysis of JOIN conditions with complexity breakdown, column/operator detection, and multi-dialect support
- **Metrics Dashboard** - Real-time complexity scoring (0-100) with detailed breakdowns of keywords, SELECT fields, JOINs, CTEs, subqueries, and window functions
- **CTE Analysgit is** - Explore Common Table Expressions and field origins with visual tree structure
- **Smart SQL Editor** - Multi-dialect query editor with syntax awareness and real-time analysis

### Technical Stack

- **Next.js 15** - Latest version with improved performance and App Router
- **React 19** - Latest React with enhanced capabilities
- **TypeScript** - Strict type checking for code reliability
- **Tailwind CSS** - Utility-first CSS framework with custom theme variables
- **Zustand** - Lightweight state management for global application state
- **Lucide React** - Icon library for consistent UI elements

## 🛠️ Installation

1. Install dependencies:

```bash
npm install
# or
yarn install
```

2. Start the development server:

```bash
npm run dev
# or
yarn dev
```

3. Open [http://localhost:4028](http://localhost:4028) with your browser to see the result.
### Free text to speech

The Smart SQL Editor reads optimization results using the browser's built-in speech service.
It requires no API key or usage credits and selects a matching English or Vietnamese voice.
After **Analyze & Optimize** finishes, use **Read optimization aloud** in the results panel.