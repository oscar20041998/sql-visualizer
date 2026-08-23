# Relationship Graph Visualizer 📊

Interactive visualization of table relationships and JOIN connections.

## Capabilities

### Visual Graph Representation

- Each table appears as a node
- JOIN relationships shown as colored edges
- Multiple layout options: Dagre (hierarchical), Force-Directed, Grid
- Interactive zoom and pan controls

### Color-Coded JOIN Types

- Amber: LEFT JOIN
- Green: RIGHT JOIN
- Indigo: INNER JOIN
- Pink: FULL OUTER JOIN
- Red: CROSS JOIN
- Purple: NATURAL JOIN

### Node Interaction

- Click to highlight table and direct connections
- View join conditions and related tables
- See table occurrence count (hits)

### Extracted Tables Section

- Complete list of all tables with clause information (FROM/JOIN)
- Related table mapping
- Hit count (how many times each table appears)
- CSV export capability

### Mermaid Export

- Convert graph to Mermaid diagram syntax
- Copy to clipboard for use in documentation/wikis
- Compatible with Mermaid.js renderers

### Additional Features

- **MiniMap Navigation:** Quick overview and navigation for large queries
- **Edge Style Options:** Smooth Bezier, Straight, Step curves

## Use Cases

- Understand complex multi-table query structure at a glance
- Identify unnecessary JOINs or missing relationships
- Document SQL architecture using Mermaid diagrams
- Verify table relationships in large queries
- Export visual diagrams for team documentation

## Tips

- Use Dagre layout for hierarchical dependencies (clear flow of data)
- Use Force-Directed for balanced relationship viewing (intuitive clustering)
- Use Grid for structured, organized table arrangement
- Use MiniMap to navigate large complex queries
- Identify isolated tables that may be unnecessary
