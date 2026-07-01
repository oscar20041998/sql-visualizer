# SQL Visualizer

A comprehensive SQL analysis and visualization tool built with Next.js 15, React 19, and TypeScript. Analyze query complexity, visualize table relationships, explore CTEs, and deep-dive into JOIN conditions across multiple SQL dialects.

## 🚀 Features

### Core Analysis Tools

- **Query Input** - Paste SQL or import MyBatis XML with multi-dialect support (MySQL, PostgreSQL, SQL Server, Oracle)
- **Relationship Graph Visualizer** - Interactive visualization of table relationships and JOIN connections with color-coded edges and multiple layout options
- **JOIN Analysis** - Deep-dive analysis of JOIN conditions with complexity breakdown, column/operator detection, and multi-dialect support
- **Metrics Dashboard** - Real-time complexity scoring (0-100) with detailed breakdowns of keywords, SELECT fields, JOINs, CTEs, subqueries, and window functions
- **CTE Analysis** - Explore Common Table Expressions and field origins with visual tree structure
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

## 📁 Project Structure

```
sql-visualizer/
├── public/
│   └── assets/                      # Static assets and images
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with theme provider
│   │   ├── page.tsx                # Dashboard page
│   │   ├── query-input/            # SQL input and parameter configuration
│   │   ├── relationship-graph-visualizer/  # Graph visualization and JOIN analysis
│   │   ├── cte-analysis/           # CTE exploration and analysis
│   │   ├── sql-metrics-dashboard/  # Complexity metrics and scoring
│   │   └── settings-preferences/   # User preferences and theme
│   ├── components/
│   │   ├── AppLayout.tsx          # Main layout component
│   │   ├── Sidebar.tsx            # Navigation sidebar
│   │   ├── ThemeProvider.tsx      # Theme context provider
│   │   └── ui/                    # Reusable UI components (ComplexityDashboard, LintingAlerts, etc.)
│   ├── lib/
│   │   ├── sqlAnalyzer.ts         # SQL parsing and analysis engine
│   │   ├── complexityScorer.ts    # Complexity calculation logic
│   │   ├── store.ts               # Zustand state management
│   │   ├── logger.ts              # Logging utilities
│   │   └── i18n.ts                # Internationalization setup
│   ├── locales/
│   │   ├── en.ts                  # English translations
│   │   └── vi.ts                  # Vietnamese translations
│   ├── styles/
│   │   ├── index.css              # Global styles
│   │   └── tailwind.css           # Tailwind CSS configuration
│   ├── markdown/                  # Documentation and guides
│   │   ├── FEATURES.md            # Feature overview and landing page
│   │   ├── FEATURES_INDEX.md      # Comprehensive feature index with navigation
│   │   ├── features/              # Modular feature documentation (12 files)
│   │   │   ├── QUERY_INPUT.md     # SQL input functionality guide
│   │   │   ├── RELATIONSHIP_GRAPH.md  # Graph visualization guide
│   │   │   ├── JOIN_ANALYSIS.md   # Deep JOIN condition analysis guide
│   │   │   ├── METRICS_DASHBOARD.md  # Complexity scoring guide
│   │   │   ├── COMPLEXITY_SCORING.md # Technical scoring details
│   │   │   ├── CTE_ANALYSIS.md    # CTE exploration guide
│   │   │   ├── SETTINGS.md        # UI customization guide
│   │   │   ├── BEST_PRACTICES.md  # Query optimization best practices
│   │   │   ├── OPTIMIZATION_WORKFLOW.md # Step-by-step optimization
│   │   │   ├── WORKFLOW_EXAMPLES.md # Real-world use case examples
│   │   │   ├── LEARNING_PATH.md   # Structured learning guide
│   │   │   └── ADVANCED_TOPICS.md # Enterprise patterns
│   │   ├── AST_*.md               # Architecture and AST documentation
│   │   ├── SMART_SQL_EDITOR_*.md  # Smart editor implementation docs
│   │   ├── ENTITY_EXTRACTION_*.md # Entity extraction documentation
│   │   └── sample/                # Sample SQL queries
├── next.config.mjs                # Next.js configuration
├── package.json                   # Project dependencies and scripts
├── postcss.config.js              # PostCSS configuration
├── tailwind.config.js             # Tailwind CSS theme customization
└── tsconfig.json                  # TypeScript configuration
```

## 🎯 Key Pages

- **Dashboard** (`/`) - Overview and quick access to all analysis tools
- **Query Input** (`/query-input`) - Paste SQL, configure parameters, select dialect
- **Relationship Graph** (`/relationship-graph-visualizer`) - Visualize tables, JOINs, and deep-dive JOIN analysis
- **CTE Analysis** (`/cte-analysis`) - Explore CTEs and field data flow
- **Metrics Dashboard** (`/sql-metrics-dashboard`) - View complexity scores and breakdowns
- **Settings** (`/settings-preferences`) - Configure theme, language, and analysis options

## 🎨 Styling & Theming

This project uses Tailwind CSS with extensive customization:

- **Theme Support** - Dark and Light modes with persistent user preference
- **Custom Color Variables** - Complexity scoring colors (--complexity-_), JOIN type colors (--join-_), and semantic colors (--primary, --accent, --danger, --warning, --success, --info)
- **Responsive Design** - Mobile-first approach optimized for desktop analysis
- **CSS Animations** - Smooth transitions with float, slideUp, fadeIn, and shimmer keyframes
- **PostCSS & Autoprefixer** - Automatic vendor prefixing and CSS optimization

## 📦 Available Scripts

- `npm run dev` - Start development server on port 4028
- `npm run build` - Build the application for production
- `npm run start` - Start the development server
- `npm run serve` - Start the production server
- `npm run lint` - Run ESLint to check code quality
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

## 🌍 Supported SQL Dialects

- **MySQL** (5.7+) - Including STRAIGHT_JOIN and USING clause
- **PostgreSQL** (9.6+) - Including LATERAL JOIN and advanced USING clauses
- **SQL Server** (2016+) - Including CROSS APPLY and OUTER APPLY
- **Oracle** (12c+) - Including OUTER JOIN variants and USING clause

## 🌐 Internationalization

- **English** - Complete UI translations
- **Vietnamese** - Full Vietnamese localization for all features including JOIN Analysis

Users can switch language in Settings → Preferences

## 📊 SQL Analysis Capabilities

### Query Complexity Scoring

- Real-time complexity calculation (0-100 scale)
- Detailed breakdown by category (keywords, fields, JOINs, CTEs, subqueries, window functions)
- Complexity level classification (LOW, MEDIUM, HIGH, SUPER_HIGH)
- Performance heuristics and anti-pattern detection

### JOIN Analysis

- Deep-dive into each JOIN condition
- Column and operator extraction
- Complexity assessment (Simple vs Complex)
- Equi-join detection
- Complexity scoring per JOIN
- Multi-dialect specific JOIN syntax support

### CTE & Subquery Analysis

- Visual tree structure for CTEs
- Field origin tracking
- Unused CTE detection
- Subquery depth analysis

### Export Capabilities

- Mermaid diagram export for documentation
- CSV export for extracted tables
- CTE SQL copy for reuse in queries

## 📖 Documentation Structure

The project includes comprehensive, modularized documentation to keep guides focused and digestible:

### Feature Documentation

**Core Features** - Start here to understand each analysis tool:

- [Query Input](src/markdown/features/QUERY_INPUT.md) - How to input SQL and configure dialects
- [Relationship Graph](src/markdown/features/RELATIONSHIP_GRAPH.md) - Visualizing table relationships
- [JOIN Analysis](src/markdown/features/JOIN_ANALYSIS.md) - Deep-dive into JOIN conditions
- [Metrics Dashboard](src/markdown/features/METRICS_DASHBOARD.md) - Understanding complexity scores
- [CTE Analysis](src/markdown/features/CTE_ANALYSIS.md) - Exploring Common Table Expressions
- [Settings & Preferences](src/markdown/features/SETTINGS.md) - UI customization

### Guides & Workflows

**Practical Guides** - Achieve specific goals:

- [Best Practices](src/markdown/features/BEST_PRACTICES.md) - Query optimization guidelines
- [Optimization Workflow](src/markdown/features/OPTIMIZATION_WORKFLOW.md) - Step-by-step query improvement
- [Workflow Examples](src/markdown/features/WORKFLOW_EXAMPLES.md) - Real-world scenarios and use cases
- [Learning Path](src/markdown/features/LEARNING_PATH.md) - Structured learning for all skill levels

### Technical Reference

**For Deep Dives** - Technical details and customization:

- [Complexity Scoring Engine](src/markdown/features/COMPLEXITY_SCORING.md) - How scoring works with weight matrix
- [Advanced Topics](src/markdown/features/ADVANCED_TOPICS.md) - Enterprise patterns and customization

### Quick Navigation

- [FEATURES_INDEX.md](src/markdown/FEATURES_INDEX.md) - Complete index with all documentation links
- [FEATURES.md](src/markdown/FEATURES.md) - Quick feature overview and getting started

## � Getting Started

1. Clone the repository:

```bash
git clone <repository-url>
cd sql-visualizer
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:4028](http://localhost:4028) in your browser

5. Paste your SQL query and start analyzing!

## 📱 Deployment

Build the application for production:

```bash
npm run build
npm run serve
```

The optimized build will be ready for deployment.

## 📚 Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial

You can check out the [Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## � Documentation

For comprehensive feature documentation, see [FEATURES.md](./src/markdown/FEATURES.md) which includes:

- Detailed feature descriptions
- Use case scenarios
- Workflow examples
- Best practices for query optimization
- Complexity scoring methodology

## 🤝 Contributing

Contributions are welcome! Please ensure:

- All features include English and Vietnamese translations
- Components are properly typed with TypeScript
- Code follows the existing style conventions
- Complex features include documentation in FEATURES.md

## 🙏 Acknowledgments

- Built with Next.js 15 and React 19
- Type-safe with TypeScript
- Styled with Tailwind CSS
- Internationalization support

Built with ❤️ for SQL analysis and query optimization
