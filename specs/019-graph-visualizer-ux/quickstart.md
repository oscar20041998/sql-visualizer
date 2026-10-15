# Quickstart Validation: Relationship Graph UX

## Prerequisites

- Run commands from the repository root.
- Dependencies already installed (`npm install` if `node_modules` is missing).
- No new package is required. See [research.md](research.md).

## Automated validation

1. Run the existing category-only filter tests. They must still pass for the untouched helpers:

   ```powershell
   npm test -- tests/unit/relationshipGraphSourceFilter.test.tsx
   ```

2. Run the new layout and neighbor-filter tests once they exist:

   ```powershell
   npm test -- tests/unit/relationshipGraphLayout.test.ts
   ```

3. Type-check:

   ```powershell
   npm run type-check
   ```

Expected: category-only CTE filtering still yields no edges; neighbor-on filtering of that same fixture yields the CTE, the directly connected table, and that one edge. Hierarchical, force, and grid placements differ for a branched fixture. A second call with the same inputs returns the same coordinates. Spacing multipliers change gaps. Diagram text for a filtered visible set names `[CTE]` and omits hidden sources.

Contracts: [graph-view-ui.md](contracts/graph-view-ui.md). Fields: [data-model.md](data-model.md).

## Manual validation

1. Start the app:

   ```powershell
   npm run dev
   ```

2. In Settings, set graph layout to hierarchical and spacing to spacious. Analyze:

   ```sql
   WITH customer_orders AS (
     SELECT o.customer_id, o.id
     FROM orders o
   )
   SELECT c.id
   FROM customers c
   JOIN customer_orders co ON co.customer_id = c.id
   JOIN (
     SELECT customer_id
     FROM payments
   ) p ON p.customer_id = c.id;
   ```

3. Open Relationship Graph and confirm:
   - Placement is left-to-right layered, not the old single grid, and gaps are wider than compact.
   - Drag a node, then select another node. The dragged node stays put.
   - Fit and Rearrange are labeled. Rearrange restores the layout. A later selection does not undo it.
   - Every card, including a compact card after enabling Performance, shows TABLE, CTE, or SUBQUERY as text.
   - Edge colors still match the join legend, and node chrome is not the only category cue.
   - Filter CTEs with neighbors on: `customer_orders` and `orders` remain, with their connecting relationship. `customers` stays only if it is a direct neighbor. Counts match what is drawn.
   - Turn neighbors off: only CTE sources and CTE-to-CTE relationships remain. The label says category only.
   - One search selects a source and the inspector list highlights it. There is no second search box.
   - Open suggestions, relationship details, and extracted sources together on a 1366×768 window. The toolbar and map stay visible.
   - Relationship details show names and aliases, and a short condition is not ellipsized.
   - Copy diagram text and save image. Both match the filtered view. The image is a file, and its background follows the theme.
   - Switch language to Vietnamese and theme to light. New labels remain readable.
   - Analyze a different query. Positions reset.

4. Repeat the filter check with a self-join of two aliases. Both occurrences stay distinct.

Browser validation is not a substitute for the Vitest helpers above. Do not treat a passing type-check as proof of layout behavior.
