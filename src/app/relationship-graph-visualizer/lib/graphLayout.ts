import type { JoinEdge, TableNode } from '@/lib/sql/sqlAnalyzer';

export type GraphLayoutMode = 'dagre' | 'force' | 'grid';
export type NodeSpacing = 'compact' | 'normal' | 'spacious';

export const FORCE_ITERATIONS = 80;
export const BASE_X_GAP = 380;
export const BASE_Y_GAP = 320;
export const LAYOUT_ORIGIN = 80;

const SPACING_MULTIPLIER: Record<NodeSpacing, number> = {
  compact: 0.75,
  normal: 1,
  spacious: 1.35,
};

export interface Point {
  x: number;
  y: number;
}

export function spacingGaps(spacing: NodeSpacing): { xGap: number; yGap: number } {
  const multiplier = SPACING_MULTIPLIER[spacing];
  return { xGap: BASE_X_GAP * multiplier, yGap: BASE_Y_GAP * multiplier };
}

function connectedIds(tables: TableNode[], joins: JoinEdge[]): Set<string> {
  const ids = new Set<string>();
  for (const join of joins) {
    if (tables.some((table) => table.id === join.source)) ids.add(join.source);
    if (tables.some((table) => table.id === join.target)) ids.add(join.target);
  }
  return ids;
}

function gridPositions(tables: TableNode[], joins: JoinEdge[], spacing: NodeSpacing): Map<string, Point> {
  const { xGap, yGap } = spacingGaps(spacing);
  const linked = connectedIds(tables, joins);
  const connected = tables.filter((table) => linked.has(table.id));
  const isolated = tables.filter((table) => !linked.has(table.id));
  const positions = new Map<string, Point>();
  const cols = Math.max(1, Math.ceil(Math.sqrt(connected.length || 1)));

  connected.forEach((table, index) => {
    positions.set(table.id, {
      x: LAYOUT_ORIGIN + (index % cols) * xGap,
      y: LAYOUT_ORIGIN + Math.floor(index / cols) * yGap,
    });
  });

  const connectedRows = connected.length ? Math.ceil(connected.length / cols) : 0;
  isolated.forEach((table, index) => {
    positions.set(table.id, {
      x: LAYOUT_ORIGIN + index * xGap,
      y: LAYOUT_ORIGIN + connectedRows * yGap + (connected.length ? yGap : 0),
    });
  });

  return positions;
}

function hierarchicalPositions(
  tables: TableNode[],
  joins: JoinEdge[],
  spacing: NodeSpacing
): Map<string, Point> {
  const { xGap, yGap } = spacingGaps(spacing);
  const linked = connectedIds(tables, joins);
  const connected = tables.filter((table) => linked.has(table.id));
  const isolated = tables.filter((table) => !linked.has(table.id));
  const layer = new Map(connected.map((table) => [table.id, 0]));
  const limit = Math.max(connected.length, 1);

  for (let pass = 0; pass < limit; pass += 1) {
    let changed = false;
    for (const join of joins) {
      if (!layer.has(join.source) || !layer.has(join.target)) continue;
      const next = Math.min(limit - 1, (layer.get(join.source) ?? 0) + 1);
      if (next > (layer.get(join.target) ?? 0)) {
        layer.set(join.target, next);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const columns = new Map<number, string[]>();
  for (const table of connected) {
    const index = layer.get(table.id) ?? 0;
    const column = columns.get(index) ?? [];
    column.push(table.id);
    columns.set(index, column);
  }

  const positions = new Map<string, Point>();
  let maxY = LAYOUT_ORIGIN;
  for (const [index, ids] of columns) {
    ids.forEach((id, row) => {
      const y = LAYOUT_ORIGIN + row * yGap;
      maxY = Math.max(maxY, y);
      positions.set(id, { x: LAYOUT_ORIGIN + index * xGap, y });
    });
  }

  isolated.forEach((table, index) => {
    positions.set(table.id, {
      x: LAYOUT_ORIGIN + index * xGap,
      y: maxY + yGap,
    });
  });

  return positions;
}

function forcePositions(tables: TableNode[], joins: JoinEdge[], spacing: NodeSpacing): Map<string, Point> {
  const { xGap } = spacingGaps(spacing);
  const seeded = gridPositions(tables, joins, spacing);
  const nodes = tables.map((table) => ({
    id: table.id,
    ...(seeded.get(table.id) ?? { x: LAYOUT_ORIGIN, y: LAYOUT_ORIGIN }),
  }));
  const rest = xGap;

  for (let iteration = 0; iteration < FORCE_ITERATIONS; iteration += 1) {
    const displacement = new Map(nodes.map((node) => [node.id, { x: 0, y: 0 }]));
    for (let left = 0; left < nodes.length; left += 1) {
      for (let right = left + 1; right < nodes.length; right += 1) {
        const dx = nodes[left].x - nodes[right].x || 0.01;
        const dy = nodes[left].y - nodes[right].y || 0.01;
        const distance = Math.hypot(dx, dy) || 0.01;
        const force = (rest * rest) / distance / 40;
        const ux = (dx / distance) * force;
        const uy = (dy / distance) * force;
        const leftDisp = displacement.get(nodes[left].id)!;
        const rightDisp = displacement.get(nodes[right].id)!;
        leftDisp.x += ux;
        leftDisp.y += uy;
        rightDisp.x -= ux;
        rightDisp.y -= uy;
      }
    }

    for (const edge of joins) {
      const source = nodes.find((node) => node.id === edge.source);
      const target = nodes.find((node) => node.id === edge.target);
      if (!source || !target) continue;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.hypot(dx, dy) || 0.01;
      const force = (distance - rest) / 80;
      const ux = (dx / distance) * force;
      const uy = (dy / distance) * force;
      displacement.get(source.id)!.x += ux;
      displacement.get(source.id)!.y += uy;
      displacement.get(target.id)!.x -= ux;
      displacement.get(target.id)!.y -= uy;
    }

    for (const node of nodes) {
      const shift = displacement.get(node.id)!;
      node.x += shift.x;
      node.y += shift.y;
    }
  }

  return new Map(nodes.map((node) => [node.id, { x: node.x, y: node.y }]));
}

export function computePlacements(
  tables: TableNode[],
  joins: JoinEdge[],
  layout: GraphLayoutMode,
  spacing: NodeSpacing
): Map<string, Point> {
  if (layout === 'dagre') return hierarchicalPositions(tables, joins, spacing);
  if (layout === 'force') return forcePositions(tables, joins, spacing);
  return gridPositions(tables, joins, spacing);
}

export interface PlacementState {
  fingerprint: string;
  layout: GraphLayoutMode;
  spacing: NodeSpacing;
  positions: Map<string, Point>;
}

export type PlacementEvent =
  | {
      type: 'query' | 'layout' | 'spacing' | 'relayout';
      fingerprint?: string;
      layout: GraphLayoutMode;
      spacing: NodeSpacing;
      tables: TableNode[];
      joins: JoinEdge[];
    }
  | { type: 'drag'; id: string; x: number; y: number }
  | { type: 'select' | 'search' | 'theme' | 'performance' | 'panel' | 'filter' };

function fillMissing(
  positions: Map<string, Point>,
  tables: TableNode[],
  joins: JoinEdge[],
  layout: GraphLayoutMode,
  spacing: NodeSpacing
): Map<string, Point> {
  if (tables.every((table) => positions.has(table.id))) return positions;
  const computed = computePlacements(tables, joins, layout, spacing);
  const next = new Map(positions);
  for (const table of tables) {
    if (!next.has(table.id)) {
      next.set(table.id, computed.get(table.id) ?? { x: LAYOUT_ORIGIN, y: LAYOUT_ORIGIN });
    }
  }
  return next;
}

export function reducePlacement(state: PlacementState, event: PlacementEvent): PlacementState {
  if (event.type === 'drag') {
    const positions = new Map(state.positions);
    positions.set(event.id, { x: event.x, y: event.y });
    return { ...state, positions };
  }

  // A switch over the discriminant is required: negative if-checks cannot
  // remove the passive member (its discriminant is a union of six literals),
  // so TypeScript never narrows `event` to the query/layout member below.
  switch (event.type) {
    case 'select':
    case 'search':
    case 'theme':
    case 'performance':
    case 'panel':
    case 'filter':
      return state;
    case 'relayout':
    case 'layout':
    case 'spacing':
      return {
        ...state,
        layout: event.layout,
        spacing: event.spacing,
        positions: computePlacements(event.tables, event.joins, event.layout, event.spacing),
      };
    case 'query': {
      const fingerprint = event.fingerprint ?? state.fingerprint;
      if (
        fingerprint === state.fingerprint &&
        event.layout === state.layout &&
        event.spacing === state.spacing
      ) {
        return {
          ...state,
          positions: fillMissing(state.positions, event.tables, event.joins, event.layout, event.spacing),
        };
      }

      return {
        fingerprint,
        layout: event.layout,
        spacing: event.spacing,
        positions: computePlacements(event.tables, event.joins, event.layout, event.spacing),
      };
    }
  }
}

export function queryFingerprint(rawSql: string, dialect: string): string {
  return `${dialect}\n${rawSql}`;
}
