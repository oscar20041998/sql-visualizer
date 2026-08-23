# Workflow Examples 🔄

Real-world scenarios for using the SQL Visualizer effectively.

## Quick Audit (5 minutes)

Perfect for: Quickly checking a query before deployment

**Steps:**

1. Paste query into Query Input
2. Review JOIN Analysis for any suspicious conditions
3. Check Metrics Dashboard complexity level
4. Review CTE Analysis for unused CTEs
5. Done! Approve or request changes

**Best For:** Code review checkpoints, pre-deployment verification

## Deep Analysis (15 minutes)

Perfect for: Understanding complex query structure

**Steps:**

1. Paste query into Query Input
2. Explore Relationship Graph with different layouts
3. Review JOIN Analysis in detail
4. Check all metrics in dashboard
5. Review Metrics breakdown
6. Export Mermaid diagram for documentation
7. Export table list as CSV

**Best For:** Documentation, architecture understanding, knowledge transfer

## Optimization Work (30+ minutes)

Perfect for: Performance tuning session

**Steps:**

1. Record baseline metrics and complexity score
2. Review JOIN conditions using JOIN Analysis
3. Identify bottlenecks in Metrics Dashboard
4. Check CTE Analysis for unused CTEs
5. Implement optimization in Query Input
6. Compare new JOIN complexity and metrics
7. Repeat steps 3-6 until satisfied
8. Test on actual database with EXPLAIN PLAN
9. Export results for documentation

**Best For:** Performance tuning, query refactoring projects

## Team Review (20 minutes)

Perfect for: Design review meeting with stakeholders

**Steps:**

1. Load query into Query Input
2. Export Mermaid diagram to show table relationships
3. Review JOIN Analysis details to explain connections
4. Discuss Graph in meeting with team
5. Review CTE Analysis for data flow and transformations
6. Show Metrics to justify complexity concerns
7. Document findings and decisions

**Best For:** Architecture discussions, team alignment, decision documentation

## Learning New Codebase (30-60 minutes)

Perfect for: New team member onboarding

**Steps:**

1. Start with most important query
2. Load into Query Input
3. Use Relationship Graph to understand table structure
4. Review JOIN Analysis to see how tables are connected
5. Expand CTEs in CTE Analysis to understand transformations
6. Review Metrics Dashboard to see complexity patterns
7. Move to next important query
8. Repeat for 5-10 key queries
9. Ask questions about high-complexity queries

**Best For:** Onboarding, knowledge transfer, codebase exploration

## Migration Planning (varies)

Perfect for: Database migration or SQL dialect conversion

**Steps:**

1. Load query from source dialect
2. Change SQL dialect in settings to target database
3. Review JOIN Analysis to identify dialect-specific syntax
4. Check Metrics Dashboard for changes
5. Review Relationship Graph (should be same)
6. Export Mermaid diagram and JOIN analysis details
7. Document dialect-specific considerations
8. Plan migration tasks

**Best For:** Database migrations, multi-dialect support planning

## Batch Complexity Audit (1-2 hours)

Perfect for: Enterprise-wide query assessment

**Steps:**

1. Create list of all critical queries
2. For each query:
   - Load into Query Input
   - Record complexity score
   - Note any warnings
   - Identify optimization candidates
3. Aggregate results into spreadsheet
4. Prioritize queries for optimization
5. Create optimization roadmap

**Best For:** Enterprise audits, baseline establishment, prioritization

## Regular Maintenance (weekly/monthly)

Perfect for: Ongoing quality assurance

**Steps:**

1. Review queries added or modified since last check
2. Run through Quick Audit for each
3. Flag any SUPER_HIGH complexity
4. Schedule HIGH complexity queries for optimization
5. Document metrics for trend analysis

**Best For:** Continuous improvement, regression prevention

---

## Quick Tips for Each Workflow

### Quick Audit

- Focus on linting warnings first
- If score is MEDIUM or below, probably fine
- If HIGH or SUPER_HIGH, dig deeper

### Deep Analysis

- Take screenshots of all graphs and diagrams
- Export Mermaid for documentation
- Document complex JOINs

### Optimization Work

- Keep baseline metrics visible
- Test multiple approaches
- Compare scores after each change
- Verify on actual database

### Team Review

- Print Mermaid diagram before meeting
- Have metrics screenshot ready
- Prepare questions about specific JOINs
- Document team decisions

### Learning Codebase

- Start with simple queries first
- Use Query Input to test variations
- Ask questions about complexity peaks
- Build mental model gradually

### Migration Planning

- Note dialect-specific syntax used
- Document any MySQL-isms or PostgreSQL-isms
- Test with target dialect early
- Plan syntax conversion tasks

### Batch Audit

- Set team standards for complexity levels
- Track metrics for trend analysis
- Document outliers and exceptions
- Create reusable optimization patterns

### Regular Maintenance

- Automate complexity tracking if possible
- Create dashboard of key metrics
- Alert on regressions (complexity increases)
- Celebrate improvements
