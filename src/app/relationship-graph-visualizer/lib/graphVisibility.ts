import type { JoinEdge, SqlSourceType, TableNode } from '@/lib/sql/sqlAnalyzer';

export type RelationshipFilterMode = 'all' | 'cte' | 'table' | 'subquery';

export const DEFAULT_INCLUDE_NEIGHBORS = true;

const FILTER_SOURCE: Record<Exclude<RelationshipFilterMode, 'all'>, SqlSourceType> = {
  cte: 'CTE',
  table: 'TABLE',
  subquery: 'SUBQUERY',
};

export function filterTablesBySourceType(
  tables: TableNode[],
  filter: RelationshipFilterMode
): TableNode[] {
  if (filter === 'all') return tables;
  const sourceType = FILTER_SOURCE[filter];
  return tables.filter((table) => table.sourceType === sourceType);
}

export function filterJoinsBySourceType(
  joins: JoinEdge[],
  tables: TableNode[],
  filter: RelationshipFilterMode
): JoinEdge[] {
  const visible = new Set(filterTablesBySourceType(tables, filter).map((table) => table.id));
  return joins.filter((join) => visible.has(join.source) && visible.has(join.target));
}

export function filterVisibleTables(
  tables: TableNode[],
  joins: JoinEdge[],
  filter: RelationshipFilterMode,
  includeNeighbors: boolean
): TableNode[] {
  if (filter === 'all') return tables;
  const category = new Set(filterTablesBySourceType(tables, filter).map((table) => table.id));
  if (!includeNeighbors) return tables.filter((table) => category.has(table.id));

  const visible = new Set(category);
  for (const join of joins) {
    if (category.has(join.source)) visible.add(join.target);
    if (category.has(join.target)) visible.add(join.source);
  }
  return tables.filter((table) => visible.has(table.id));
}

export function filterVisibleJoins(joins: JoinEdge[], visibleTables: TableNode[]): JoinEdge[] {
  const visible = new Set(visibleTables.map((table) => table.id));
  return joins.filter((join) => visible.has(join.source) && visible.has(join.target));
}

export function displayedJoinCount(visibleJoins: number, filter: RelationshipFilterMode): number {
  void filter;
  return visibleJoins;
}

export function clearSelectionIfHidden(
  selectedId: string | null,
  visibleIds: Set<string>
): string | null {
  if (!selectedId) return null;
  return visibleIds.has(selectedId) ? selectedId : null;
}

export function categoryLabelKey(sourceType: SqlSourceType): string {
  switch (sourceType) {
    case 'CTE':
      return 'sourceTypeCte';
    case 'SUBQUERY':
      return 'sourceTypeSubquery';
    case 'VIEW':
      return 'sourceTypeView';
    case 'UNKNOWN':
      return 'sourceTypeUnknown';
    default:
      return 'sourceTypeTable';
  }
}

export const CATEGORY_CHROME: Record<SqlSourceType, string> = {
  TABLE: '#38bdf8',
  CTE: '#a78bfa',
  SUBQUERY: '#fbbf24',
  VIEW: '#34d399',
  UNKNOWN: '#94a3b8',
};
