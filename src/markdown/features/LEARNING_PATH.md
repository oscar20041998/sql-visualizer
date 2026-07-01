# Learning Path 🎓

Structured guide to mastering the SQL Visualizer based on your experience level.

## Beginner

### Module 1: Get Started (30 minutes)

**Goal:** Understand the basic interface and load your first query

1. Visit [http://localhost:4028](http://localhost:4028)
2. Click "Load Sample" in Query Input to see a pre-built complex query
3. Observe the complexity score in real-time
4. Explore Relationship Graph visualization
5. Check Metrics Dashboard for overall metrics
6. Switch between Light and Dark theme (Settings)
7. Change language to Vietnamese (Settings)

**What You'll Learn:**

- Basic interface navigation
- How complexity scoring works
- Multi-dialect support
- Theme and language switching

### Module 2: Understand Complexity (45 minutes)

**Goal:** Recognize what makes queries complex

1. Load sample query again
2. Notice the complexity level badge (LOW/MEDIUM/HIGH/SUPER_HIGH)
3. Read linting alerts and understand the warnings
4. Look at the complexity breakdown to see which factors contribute most
5. Look at score (0-100) and percentage calculation

**What You'll Learn:**

- What LOW, MEDIUM, HIGH, SUPER_HIGH mean
- How linting warnings work
- Which query components add complexity
- Score interpretation

### Module 3: First Steps (60 minutes)

**Goal:** Analyze your own queries

1. Try different SQL dialects and see how score changes
2. Paste simple queries to see LOW scores
3. Paste complex queries to see HIGH scores
4. Review Metrics Dashboard breakdown for patterns
5. Explore different graph layouts (Dagre, Force-Directed, Grid)
6. Export table list as CSV
7. Copy Mermaid diagram

**What You'll Learn:**

- How to select appropriate SQL dialect
- How complexity varies by query structure
- Graph visualization options
- Export capabilities

---

## Intermediate

### Module 4: Active Analysis (90 minutes)

**Goal:** Use the tool for real query optimization

1. Paste your own SQL queries (from your codebase)
2. Use the complexity score as a guide for query quality
3. Review suggested optimizations in Metrics Dashboard
4. Compare metrics for different query approaches
5. Try modifying a query and watch the score change
6. Export Mermaid diagrams for your queries

**What You'll Learn:**

- How to measure query optimization
- Using score as optimization guide
- How to compare different approaches
- Real-world optimization patterns

### Module 5: Visualize Relationships (75 minutes)

**Goal:** Master relationship graph understanding

1. Explore Relationship Graph for table connections
2. Click nodes to see join conditions
3. Use different layout algorithms for insights
4. Identify nodes that seem unnecessary or isolated
5. Export Mermaid diagram for each layout
6. Build visual documentation of queries

**What You'll Learn:**

- Table relationship patterns
- When different layouts are useful
- Export-based documentation workflow
- Visual SQL architecture

### Module 6: Optimize with Scores (120 minutes)

**Goal:** Use metrics to systematically improve queries

1. Identify high-scoring queries in your codebase
2. Use Metrics Dashboard breakdown to find bottlenecks
3. Use JOIN Analysis to review all join conditions
4. Refactor using the optimization checklist
5. Compare before/after scores
6. Document your optimization decisions

**What You'll Learn:**

- Systematic optimization approach
- Trade-offs between readability and complexity
- Refactoring strategies
- Measurement and comparison

---

## Advanced

### Module 7: Complex Query Analysis (150 minutes)

**Goal:** Master advanced query patterns

1. Analyze complex multi-CTE queries
2. Use CTE Analysis for field origin mapping
3. Identify unused or problematic CTEs
4. Extract and optimize individual CTEs
5. Review complex JOIN patterns
6. Understand multi-level window functions

**What You'll Learn:**

- CTE optimization strategies
- Complex JOIN analysis
- Window function patterns
- Recursive CTE considerations

### Module 8: Performance Tuning (180+ minutes)

**Goal:** Correlate complexity with actual performance

1. Correlate complexity scores with actual execution times
2. Use Metrics to identify index optimization opportunities
3. Review linting violations systematically
4. Use EXPLAIN PLAN to verify improvements
5. Document optimization decisions
6. Create team standards

**What You'll Learn:**

- Score vs actual performance relationship
- Index strategy optimization
- EXPLAIN PLAN integration
- Documentation best practices

### Module 9: Team Integration (120 minutes)

**Goal:** Establish team practices

1. Use Complexity Dashboard in code review processes
2. Share Mermaid diagrams in documentation
3. Establish team standards based on complexity levels
4. Train team members using Guidelines page
5. Create complexity budgets for different query types
6. Track metrics over time for trend analysis

**What You'll Learn:**

- Team process integration
- Governance policies
- Training methods
- Metrics tracking

### Module 10: Enterprise Practices (varies)

**Goal:** Scale across organization

1. Customize complexity weights for your organization
2. Establish complexity budgets for different query types
3. Use scores in database governance policies
4. Track complexity metrics over time
5. Implement automated compliance checks
6. Build organizational knowledge base

**What You'll Learn:**

- Customization options
- Enterprise governance
- Compliance tracking
- Knowledge management

---

## Learning Tracks by Role

### For SQL Developers

**Recommended Path:**

1. Beginner Module 1-3
2. Intermediate Module 4-5
3. Advanced Module 7-8

**Focus:** Using scores to improve personal code quality

### For Database Administrators (DBAs)

**Recommended Path:**

1. Beginner Module 1-3
2. Intermediate Module 6
3. Advanced Module 8-9

**Focus:** Performance tuning and team standards

### For Tech Leads

**Recommended Path:**

1. All Beginner modules
2. All Intermediate modules
3. Advanced Module 9-10

**Focus:** Team integration and governance

### For New Team Members

**Recommended Path:**

1. Beginner Module 1-2
2. Intermediate Module 5
3. Use tool to explore existing queries
4. Ask mentors about high-complexity queries

**Focus:** Learning existing codebase

### For Architects

**Recommended Path:**

1. Beginner Module 1
2. Intermediate Module 4-5
3. Advanced Module 7-10

**Focus:** System design and documentation

---

## Key Milestones

### Level 1: Novice ✅

- [ ] Can load and analyze a query
- [ ] Understand what LOW/MEDIUM/HIGH means
- [ ] Know how to export Mermaid diagrams
- [ ] Can change theme and language

### Level 2: Intermediate ✅

- [ ] Can identify optimization opportunities
- [ ] Use metrics to compare queries
- [ ] Understand CTE Analysis
- [ ] Know when to use different graph layouts

### Level 3: Advanced ✅

- [ ] Can systematically optimize complex queries
- [ ] Use all analysis tools effectively
- [ ] Understand complexity scoring deeply
- [ ] Can establish team practices

### Level 4: Expert ✅

- [ ] Can customize for organization
- [ ] Create compliance policies
- [ ] Train others effectively
- [ ] Contribute improvements and ideas

---

## Tips for Success

### Start Small

- Don't analyze your entire codebase on day one
- Start with 3-5 key queries
- Gradually build expertise

### Practice Regularly

- Analyze one new query daily
- Keep comparing before/after optimization
- Experiment with different approaches

### Ask Questions

- Review high-complexity queries with colleagues
- Understand _why_ they're complex
- Learn organizational patterns

### Document Learnings

- Note patterns you discover
- Share interesting findings with team
- Build organizational knowledge base

### Experiment Safely

- Test optimizations in development
- Verify with EXPLAIN PLAN before production
- Compare metrics carefully

---

## Resources

### Built-in Resources

- **Guideline Page** - Complete walkthroughs and best practices
- **Sample Queries** - Load pre-built examples via "Load Sample"
- **This Learning Path** - Structured progression
- **Best Practices** - Detailed recommendations

### External Resources

- SQL documentation for your database
- EXPLAIN PLAN analysis tools
- Query optimization forums
- Database performance tuning guides

### Getting Help

- Hover over any metric or score for detailed tooltips
- Check the Guidelines page for step-by-step instructions
- Review example queries in Query Input
- Ask team members about complex patterns
