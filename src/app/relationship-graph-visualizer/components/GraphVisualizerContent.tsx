'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  GitFork,
  Info,
  Table2,
  Link2,
  Copy,
  Check,
  Code2,
  Search,
  X,
  Zap,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import type { JoinType, AnalysisResult, SqlSourceType, TableNode } from '@/lib/sql/sqlAnalyzer';
import type { FlowCanvasHandle } from './FlowCanvas';
import { JOIN_COLORS } from '@/app/common/colorConstant';
import { exportGraphImage, GRAPH_IMAGE_FILENAME } from '../lib/graphExport';
import {
  DEFAULT_INCLUDE_NEIGHBORS,
  categoryLabelKey,
  clearSelectionIfHidden,
  filterVisibleJoins,
  filterVisibleTables,
} from '../lib/graphVisibility';
import SuggestionPanel, { type Suggestion } from './SuggestionPanel';
import ExtractedTablesPanel, { type ExtractedTableRow } from './ExtractedTablesPanel';
import JoinAnalysisPanel from './JoinAnalysisPanel';

const FlowCanvas = dynamic(() => import('./FlowCanvas'), { ssr: false });

export type RelationshipFilterMode = 'all' | 'cte' | 'table' | 'subquery';

export function filterTablesBySourceType(
  tables: TableNode[],
  filter: RelationshipFilterMode
): TableNode[] {
  if (filter === 'all') return tables;
  const sourceType: SqlSourceType =
    filter === 'cte' ? 'CTE' : filter === 'subquery' ? 'SUBQUERY' : 'TABLE';
  return tables.filter((table) => table.sourceType === sourceType);
}

export function filterJoinsBySourceType(
  joins: AnalysisResult['joins'],
  tables: TableNode[],
  filter: RelationshipFilterMode
): AnalysisResult['joins'] {
  const visibleIds = new Set(filterTablesBySourceType(tables, filter).map((table) => table.id));
  return joins.filter((join) => visibleIds.has(join.source) && visibleIds.has(join.target));
}

// ─── Copy Button Component ────────────────────────────────────────────────────
function CopyButton({
  getText,
  label,
  copiedLabel,
  icon,
}: {
  getText: () => string;
  label: string;
  copiedLabel: string;
  icon?: React.ReactNode;
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex min-h-9 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        copied
          ? 'border-success bg-success/10 text-success'
          : 'border-border bg-muted text-muted-foreground'
      }`}
    >
      {copied ? <Check size={12} /> : icon || <Copy size={12} />}
      {copied ? copiedLabel : label}
    </button>
  );
}

// generateSuggestions function:
function generateSuggestions(result: AnalysisResult, t: ReturnType<typeof getT>): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const { metrics, joins, tables, ctes, complexity } = result;

  // ── Excessive joins ──
  if (metrics.totalJoinCount >= 5) {
    suggestions.push({
      id: 'excessive-joins',
      severity: 'error',
      title: `${t.suggExcessiveJoinsTitle} (${metrics.totalJoinCount})`,
      detail: `${metrics.totalJoinCount} ${t.suggExcessiveJoinsDetail}`,
    });
  } else if (metrics.totalJoinCount >= 3) {
    suggestions.push({
      id: 'many-joins',
      severity: 'warning',
      title: `${t.suggManyJoinsTitle} (${metrics.totalJoinCount})`,
      detail: t.suggManyJoinsDetail,
    });
  }

  // ── CROSS JOIN warning ──
  const crossJoins = joins.filter((j) => j.joinType === 'CROSS JOIN');
  if (crossJoins.length > 0) {
    suggestions.push({
      id: 'cross-join',
      severity: 'error',
      title: t.suggCrossJoinTitle,
      detail: `${t.suggCrossJoinDetail.replace('CROSS JOIN(s) found.', `${crossJoins.length} ${t.suggCrossJoinDetail.split('.')[0]}.`)}`,
    });
  }

  // ── Inefficient CTEs ──
  if (metrics.cteCount > 0) {
    const largeCtes = ctes.filter((c) => c.tables.length > 2);
    if (largeCtes.length > 0) {
      suggestions.push({
        id: 'inefficient-cte',
        severity: 'warning',
        title: `${t.suggInefficientCteTitle}: ${largeCtes.map((c) => c.name).join(', ')}`,
        detail: t.suggInefficientCteDetail,
      });
    }
    if (metrics.cteCount >= 4) {
      suggestions.push({
        id: 'too-many-ctes',
        severity: 'warning',
        title: `${t.suggTooManyCteTitle} (${metrics.cteCount})`,
        detail: t.suggTooManyCteDetail,
      });
    }
  }

  // ── Subquery depth ──
  if (metrics.subqueryDepth >= 3) {
    suggestions.push({
      id: 'deep-subquery',
      severity: 'error',
      title: `${t.suggDeepSubqueryTitle} (~${metrics.subqueryDepth})`,
      detail: t.suggDeepSubqueryDetail,
    });
  }

  // ── Window functions ──
  if (metrics.windowFunctions > 2) {
    suggestions.push({
      id: 'window-functions',
      severity: 'warning',
      title: `${t.suggWindowFunctionsTitle} (${metrics.windowFunctions})`,
      detail: t.suggWindowFunctionsDetail,
    });
  }

  // ── FULL OUTER JOIN ──
  const fullOuterJoins = joins.filter((j) => j.joinType === 'FULL OUTER JOIN');
  if (fullOuterJoins.length > 0) {
    suggestions.push({
      id: 'full-outer-join',
      severity: 'info',
      title: t.suggFullOuterJoinTitle,
      detail: t.suggFullOuterJoinDetail,
    });
  }

  // ── Tables with no join condition ──
  const isolatedTables = tables.filter(
    (t) => !joins.some((j) => j.source === t.id || j.target === t.id)
  );
  if (isolatedTables.length > 0 && tables.length > 1) {
    suggestions.push({
      id: 'isolated-tables',
      severity: 'info',
      title: `${t.suggIsolatedTablesTitle}: ${isolatedTables.map((tbl) => tbl.name).join(', ')}`,
      detail: t.suggIsolatedTablesDetail,
      relatedSourceIds: isolatedTables.map((tbl) => tbl.id),
    });
  }

  // ── Complexity level ──
  if (complexity.level === 'SUPER_HIGH') {
    suggestions.push({
      id: 'super-high-complexity',
      severity: 'error',
      title: t.suggSuperHighComplexityTitle,
      detail: `${t.complexityScore} ${complexity.score}/${complexity.maxScore}. ${t.suggSuperHighComplexityDetail}`,
    });
  } else if (complexity.level === 'LOW' && suggestions.length === 0) {
    suggestions.push({
      id: 'looks-good',
      severity: 'info',
      title: t.suggLooksGoodTitle,
      detail: t.suggLooksGoodDetail,
    });
  }

  return suggestions;
}

// Use only generateSuggestions, removed old components

// ─── Extracted Table Row ──────────────────────────────────────────────────────

function buildExtractedTableRows(
  tables: import('@/lib/sql/sqlAnalyzer').TableNode[],
  joins: import('@/lib/sql/sqlAnalyzer').JoinEdge[]
): ExtractedTableRow[] {
  const rows: ExtractedTableRow[] = [];
  const hitsMap: Record<string, number> = {};

  // Count hits per table (how many times it appears in joins)
  joins.forEach((j) => {
    hitsMap[j.source] = (hitsMap[j.source] || 0) + 1;
    hitsMap[j.target] = (hitsMap[j.target] || 0) + 1;
  });

  // FROM table (first table, no join)
  const fromTable = tables[0];
  if (fromTable) {
    const relatedJoins = joins.filter(
      (j) => j.source === fromTable.id || j.target === fromTable.id
    );
    rows.push({
      tableName: fromTable.name,
      clause: 'FROM',
      relatedTo:
        relatedJoins
          .map((j) => {
            const other = tables.find(
              (t) => t.id === (j.source === fromTable.id ? j.target : j.source)
            );
            return other?.name || '';
          })
          .filter(Boolean)
          .join(', ') || '—',
      hits: hitsMap[fromTable.id] || 0,
    });
  }

  // JOIN tables
  joins.forEach((join) => {
    const targetTable = tables.find((t) => t.id === join.target);
    const sourceTable = tables.find((t) => t.id === join.source);
    if (targetTable) {
      rows.push({
        tableName: targetTable.name,
        clause: 'JOIN',
        joinType: join.joinType,
        relatedTo: sourceTable?.name || '—',
        hits: hitsMap[join.target] || 1,
      });
    }
  });

  // Add remaining tables not yet in rows
  tables.slice(1).forEach((table) => {
    const alreadyAdded = rows.some((r) => r.tableName === table.name);
    if (!alreadyAdded) {
      rows.push({
        tableName: table.name,
        clause: 'FROM',
        relatedTo: '—',
        hits: hitsMap[table.id] || 0,
      });
    }
  });

  return rows;
}

export function buildMermaidDiagram(
  tables: import('@/lib/sql/sqlAnalyzer').TableNode[],
  joins: import('@/lib/sql/sqlAnalyzer').JoinEdge[],
  joinColors: Record<JoinType, string>
): string {
  const lines: string[] = ['graph LR'];

  // Node definitions
  tables.forEach((t) => {
    const label = `${t.name}\\n[${t.sourceType}]\\n${t.columns.length} fields`;
    lines.push(`  ${t.id}["${label}"]`);
  });

  lines.push('');

  // Edge definitions
  joins.forEach((j) => {
    const condText = j.condition ? ` ON ${j.condition.slice(0, 30)}` : '';
    lines.push(`  ${j.source} -->|"${j.joinType}${condText}"| ${j.target}`);
  });

  lines.push('');

  // Node color classes — one classDef per unique color
  const colorToTables: Record<string, string[]> = {};
  tables.forEach((t) => {
    const join = joins.find((j) => j.source === t.id || j.target === t.id);
    const color = join ? joinColors[join.joinType] : '#6ee7f7';
    if (!colorToTables[color]) colorToTables[color] = [];
    colorToTables[color].push(t.id);
  });

  Object.entries(colorToTables).forEach(([color, ids], idx) => {
    const safeColor = color.replace('#', '');
    lines.push(`  classDef color${idx} fill:${color},stroke:${color},color:#fff,stroke-width:2px`);
    lines.push(`  class ${ids.join(',')} color${idx}`);
  });

  lines.push('');

  // Edge link styles with join colors
  joins.forEach((j, idx) => {
    const color = joinColors[j.joinType] ?? '#6ee7f7';
    lines.push(`  linkStyle ${idx} stroke:${color},stroke-width:3px`);
  });

  return lines.join('\n');
}

// Optimized getChartSvg - moved to lazy evaluation

export default function GraphVisualizerContent() {
  const { settings, analysisResult, selectedNodeId, setSelectedNodeId, updateSettings } =
    useAppStore();
  const t = getT(settings.locale);
  const flowRef = useRef<FlowCanvasHandle>(null);
  const [showExtracted, setShowExtracted] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showJoinAnalysis, setShowJoinAnalysis] = useState(false);
  const [showJoinLegend, setShowJoinLegend] = useState(true);
  const [showDetails, setShowDetails] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [includeNeighbors, setIncludeNeighbors] = useState(DEFAULT_INCLUDE_NEIGHBORS);
  const [imageExportError, setImageExportError] = useState<string | null>(null);
  const [isExportingImage, setIsExportingImage] = useState(false);

  // ── Graph search state ──
  const [graphSearch, setGraphSearch] = useState('');
  const [graphSearchFocused, setGraphSearchFocused] = useState(false);
  const graphSearchRef = useRef<HTMLInputElement>(null);
  const [relationshipFilter, setRelationshipFilter] = useState<RelationshipFilterMode>('all');

  useEffect(() => {
    if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 639px)').matches) {
      setShowDetails(false);
    }
  }, []);

  const filteredTables = useMemo(() => {
    if (!analysisResult) return [];
    return filterVisibleTables(
      analysisResult.tables,
      analysisResult.joins,
      relationshipFilter,
      includeNeighbors
    );
  }, [analysisResult, relationshipFilter, includeNeighbors]);

  const filteredTableIdSet = useMemo(
    () => new Set(filteredTables.map((table) => table.id)),
    [filteredTables]
  );

  const filteredJoins = useMemo(() => {
    if (!analysisResult) return [];
    return filterVisibleJoins(analysisResult.joins, filteredTables);
  }, [analysisResult, filteredTables]);

  useEffect(() => {
    if (!selectedNodeId) return;
    if (!clearSelectionIfHidden(selectedNodeId, filteredTableIdSet)) {
      setSelectedNodeId(null);
    }
  }, [selectedNodeId, filteredTableIdSet, setSelectedNodeId]);

  const graphSearchMatches = useMemo(() => {
    if (!analysisResult || graphSearch.trim() === '') return [];
    const q = graphSearch.toLowerCase();
    return filteredTables.filter((t) => t.name.toLowerCase().includes(q));
  }, [analysisResult, graphSearch, filteredTables]);

  const handleGraphSearchSelect = (tableId: string) => {
    setSelectedNodeId(tableId === selectedNodeId ? null : tableId);
    setGraphSearch('');
    setGraphSearchFocused(false);
  };

  const handleGraphSearchClear = () => {
    setGraphSearch('');
    setSelectedNodeId(null);
    graphSearchRef.current?.focus();
  };

  const selectedNode = filteredTables.find((tbl) => tbl.id === selectedNodeId);
  const selectedCte =
    selectedNode?.sourceType === 'CTE' && analysisResult
      ? analysisResult.ctes.find(
          (cte) => cte.name.toLowerCase() === selectedNode.name.toLowerCase()
        )
      : null;
  const selectedCteTables = selectedCte?.tables ?? [];
  const connectedJoins =
    filteredJoins.filter((j) => j.source === selectedNodeId || j.target === selectedNodeId) || [];

  const extractedRows = useMemo(() => {
    if (!analysisResult) return [];
    return buildExtractedTableRows(filteredTables, filteredJoins);
  }, [analysisResult, filteredTables, filteredJoins]);

  const suggestions = useMemo(() => {
    if (!analysisResult) return [];
    return generateSuggestions(analysisResult, t);
  }, [analysisResult, t]);

  const visibleSuggestions = useMemo(
    () => suggestions.filter((s) => !dismissedIds.has(s.id)),
    [suggestions, dismissedIds]
  );

  const dismissSuggestion = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  const getMermaidText = useCallback(() => {
    if (!analysisResult) return '';
    return buildMermaidDiagram(filteredTables, filteredJoins, JOIN_COLORS);
  }, [analysisResult, filteredTables, filteredJoins]);

  const getChartSvg = useCallback(() => {
    // Optimized SVG serialization with deferred style computation
    const svgEl = document.querySelector('.react-flow__renderer svg') as SVGSVGElement | null;
    if (!svgEl) {
      // Fallback: return a color-annotated text representation
      if (!analysisResult) return '';
      const lines: string[] = ['=== Chart Color Summary ===', ''];
      filteredTables.forEach((t) => {
        const join = filteredJoins.find((j) => j.source === t.id || j.target === t.id);
        const color = join ? JOIN_COLORS[join.joinType] : '#6ee7f7';
        lines.push(`[${t.sourceType}] ${t.name}  color: ${color}`);
      });
      lines.push('');
      filteredJoins.forEach((j) => {
        const color = JOIN_COLORS[j.joinType] ?? '#6ee7f7';
        lines.push(
          `${j.source} --[${j.joinType} | color:${color}]--> ${j.target}${j.condition ? `  ON ${j.condition}` : ''}`
        );
      });
      return lines.join('\n');
    }

    // Clone the SVG and embed a background rect
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', '#1a1f2e');
    clone.insertBefore(rect, clone.firstChild);

    // Optimized style inlining: cache computed styles to avoid recomputation
    const styleCache = new Map<HTMLElement, Record<string, string>>();
    const allEls = clone.querySelectorAll('*');
    const srcEls = svgEl.querySelectorAll('*');
    const important = [
      'fill',
      'stroke',
      'stroke-width',
      'color',
      'opacity',
      'font-size',
      'font-family',
    ];

    allEls.forEach((el, i) => {
      const src = srcEls[i] as HTMLElement | undefined;
      if (src) {
        let cached = styleCache.get(src);
        if (!cached) {
          cached = {};
          const computed = window.getComputedStyle(src);
          important.forEach((prop) => {
            const val = computed.getPropertyValue(prop);
            if (val) cached![prop] = val;
          });
          styleCache.set(src, cached);
        }
        Object.entries(cached).forEach(([prop, val]) => {
          (el as SVGElement).style.setProperty(prop, val);
        });
      }
    });

    const serializer = new XMLSerializer();
    return serializer.serializeToString(clone);
  }, [analysisResult, filteredTables, filteredJoins]);

  const getExtractedTablesCsv = useCallback(() => {
    if (!extractedRows.length) return '';
    const header = 'Table Name,Clause,Join Type,Related To,Hits';
    const rows = extractedRows.map(
      (r) => `${r.tableName},${r.clause},${r.joinType || ''},${r.relatedTo},${r.hits}`
    );
    return [header, ...rows].join('\n');
  }, [extractedRows]);

  const downloadVisibleImage = useCallback(async () => {
    setImageExportError(null);
    setIsExportingImage(true);
    try {
      const viewport = flowRef.current?.getImageViewport();
      const blob = await exportGraphImage(
        viewport?.element ?? null,
        viewport?.zoom ?? 0,
        settings.theme === 'light' ? 'light' : 'dark'
      );
      const url = URL.createObjectURL(blob);
      try {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = GRAPH_IMAGE_FILENAME;
        anchor.click();
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Graph PNG export failed:', error);
      setImageExportError(t.graphImageExportFailed);
    } finally {
      setIsExportingImage(false);
    }
  }, [settings.theme, t.graphImageExportFailed]);

  if (!analysisResult) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <GitFork size={28} className="text-muted-foreground" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">{t.noGraph}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t.noGraphHint}</p>
        </div>
        <a
          href="/query-input"
          className="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {t.navQueryInput}
        </a>
      </div>
    );
  }

  const errorCount = visibleSuggestions.filter((s) => s.severity === 'error').length;
  const warnCount = visibleSuggestions.filter((s) => s.severity === 'warning').length;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Main area: canvas + sidebar */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 min-w-0 relative flex flex-col overflow-hidden min-h-[220px]">
          {/* ── Top Bar Menu — all graph controls grouped in one flexible row ── */}
          <div className="floating-header relative z-20 mx-3 mt-3 flex flex-shrink-0 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2">
            {/* Title */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="floating-header-icon"><GitFork size={16} aria-hidden /></span>
              <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                {t.graphTitle}
              </span>
            </div>

            {/* Stats + Filter */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
              <span className="flex items-center gap-1 whitespace-nowrap">
                <Table2 size={11} />
                {filteredTables.length} {t.tableCount}
              </span>
              <span className="flex items-center gap-1 whitespace-nowrap">
                <Link2 size={11} />
                {filteredJoins.length} {t.joinCount}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="system-label whitespace-nowrap">{t.graphFilterLabel}</span>
                <select
                  aria-label={t.graphFilterLabel}
                  value={relationshipFilter}
                  onChange={(e) => setRelationshipFilter(e.target.value as RelationshipFilterMode)}
                  className="select-control select-control-sm font-mono"
                >
                  <option value="all">{t.graphFilterAll}</option>
                  <option value="cte">
                    {includeNeighbors ? t.graphFilterCteNeighbors : t.graphFilterCte}
                  </option>
                  <option value="table">
                    {includeNeighbors ? t.graphFilterTableNeighbors : t.graphFilterTable}
                  </option>
                  <option value="subquery">
                    {includeNeighbors ? t.graphFilterSubqueryNeighbors : t.graphFilterSubquery}
                  </option>
                </select>
                <label className="flex items-center gap-1 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={includeNeighbors}
                    onChange={(event) => setIncludeNeighbors(event.target.checked)}
                  />
                  {t.graphIncludeNeighbors}
                </label>
              </div>
            </div>

            <div className="hidden md:block w-px h-6 bg-border flex-shrink-0" />

            {/* Search */}
            <div className="relative flex-1 min-w-[160px] max-w-xs order-last md:order-none basis-full md:basis-auto">
              <div
                className="flex items-center gap-2 rounded-md border px-3 py-1.5 transition-colors"
                style={{
                  background: 'var(--muted)',
                  borderColor: graphSearchFocused ? 'var(--primary)' : 'var(--border)',
                  boxShadow: graphSearchFocused
                    ? '0 0 0 2px color-mix(in srgb, var(--primary) 20%, transparent)'
                    : 'none',
                }}
              >
                <Search size={13} className="text-muted-foreground flex-shrink-0" />
                <input
                  ref={graphSearchRef}
                  type="text"
                  value={graphSearch}
                  onChange={(e) => setGraphSearch(e.target.value)}
                  onFocus={() => setGraphSearchFocused(true)}
                  onBlur={() => setTimeout(() => setGraphSearchFocused(false), 150)}
                  aria-label={t.searchTables}
                  placeholder={t.searchTables}
                  className="flex-1 bg-transparent text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none min-w-0"
                />
                {(graphSearch || selectedNodeId) && (
                  <button
                    type="button"
                    aria-label={t.joinDetailClearSearch}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleGraphSearchClear();
                    }}
                    className="flex-shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X size={12} />
                  </button>
                )}
                {selectedNodeId && !graphSearch && (
                  <span
                    className="max-w-20 truncate flex-shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono text-primary"
                    title={filteredTables.find((t) => t.id === selectedNodeId)?.name ?? ''}
                  >
                    {filteredTables.find((t) => t.id === selectedNodeId)?.name ?? ''}
                  </span>
                )}
              </div>

              {/* Dropdown suggestions */}
              {graphSearchFocused && graphSearch.trim() !== '' && (
                <div
                  className="absolute top-full mt-1.5 left-0 right-0 rounded-xl overflow-hidden border z-30"
                  style={{
                    background: 'var(--card)',
                    backdropFilter: 'blur(8px)',
                    borderColor: 'var(--border)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                    maxHeight: 220,
                    overflowY: 'auto',
                  }}
                >
                  {graphSearchMatches.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-muted-foreground text-center font-mono">
                      {t.noTablesFound}
                    </div>
                  ) : (
                    graphSearchMatches.map((table) => {
                      const isActive = selectedNodeId === table.id;
                      const relCount = filteredJoins.filter(
                        (j) => j.source === table.id || j.target === table.id
                      ).length;
                      const joinForColor = filteredJoins.find(
                        (j) => j.source === table.id || j.target === table.id
                      );
                      const nodeColor = joinForColor
                        ? JOIN_COLORS[joinForColor.joinType]
                        : '#6ee7f7';
                      return (
                        <button
                          key={table.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleGraphSearchSelect(table.id);
                          }}
                          className="flex min-h-11 w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                          style={{ borderBottom: '1px solid rgba(45,51,72,0.5)' }}
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: nodeColor, boxShadow: `0 0 6px ${nodeColor}88` }}
                          />
                          <span className="flex-1 text-sm font-mono text-foreground truncate">
                            {table.name}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-accent/20 text-accent">
                              {t[categoryLabelKey(table.sourceType) as keyof typeof t]}
                            </span>
                            {relCount > 0 && (
                              <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-0.5">
                                <Link2 size={9} />
                                {relCount}
                              </span>
                            )}
                            {isActive && <Check size={11} className="text-primary" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div className="hidden md:block w-px h-6 bg-border flex-shrink-0" />

            {/* Panel Toggles */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Suggestions Toggle */}
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className={`relative flex min-h-9 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  showSuggestions
                    ? 'border-danger/40 bg-danger/10 text-danger'
                    : 'border-border bg-muted text-muted-foreground'
                }`}
                aria-label={t.graphSuggestions}
                title={t.graphSuggestions}
              >
                <AlertCircle size={12} />
                <span>{t.graphSuggestions}</span>
                {errorCount + warnCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold">
                    {errorCount + warnCount}
                  </span>
                )}
              </button>

              {/* Join Analysis Toggle */}
              <button
                onClick={() => setShowJoinAnalysis(!showJoinAnalysis)}
                className={`relative flex min-h-9 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  showJoinAnalysis
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border bg-muted text-muted-foreground'
                }`}
                aria-label={t.graphJoinAnalysis}
                title={t.graphJoinAnalysis}
              >
                <TrendingUp size={12} />
                <span>{t.graphJoinAnalysis}</span>
              </button>

              {/* Extracted Tables Toggle */}
              <button
                onClick={() => setShowExtracted(!showExtracted)}
                className={`relative flex min-h-9 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  showExtracted
                    ? 'border-success/40 bg-success/10 text-success'
                    : 'border-border bg-muted text-muted-foreground'
                }`}
                aria-label={t.graphExtractedTables}
                title={t.graphExtractedTables}
              >
                <Layers size={12} />
                <span>{t.graphExtractedTables}</span>
                {extractedRows.length > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success text-white text-[10px] font-bold">
                    {extractedRows.length}
                  </span>
                )}
              </button>
            </div>

            <div className="w-px h-6 bg-border flex-shrink-0" />

            {/* Performance + Copy actions */}
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              <button
                onClick={() => updateSettings({ performanceMode: !settings.performanceMode })}
                className={`flex min-h-9 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  settings.performanceMode
                    ? 'border-accent/40 bg-accent/10 text-accent'
                    : 'border-border bg-muted text-muted-foreground'
                }`}
                title={settings.performanceMode ? 'Performance Mode: ON' : 'Performance Mode: OFF'}
              >
                <Zap size={12} />
                {t.performanceMode || 'Performance'}
              </button>
              <CopyButton
                getText={getMermaidText}
                label={t.convertMermaid}
                copiedLabel={t.copiedLabel}
                icon={<Code2 size={12} />}
              />
              <button
                type="button"
                onClick={() => flowRef.current?.fitView()}
                className="flex min-h-9 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t.graphFit}
              </button>
              <button
                type="button"
                onClick={() => flowRef.current?.relayout()}
                className="flex min-h-9 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t.graphRearrange}
              </button>
              <button
                type="button"
                onClick={downloadVisibleImage}
                disabled={isExportingImage}
                className="flex min-h-9 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Copy size={12} />
                {t.graphDownloadImage}
              </button>
              {imageExportError && (
                <span role="status" className="text-xs text-destructive">
                  {imageExportError}
                </span>
              )}
            </div>
          </div>

          {/* Canvas fills remaining space below the bar */}
          <div className="flex-1 relative">
            <FlowCanvas ref={flowRef} tables={filteredTables} joins={filteredJoins} />
          </div>
        </div>

        {/* Right Sidebar */}
        <aside
          className={`absolute inset-y-3 right-3 z-30 max-w-[calc(100%-3rem)] flex-shrink-0 motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-in-out sm:relative sm:inset-auto sm:my-3 sm:mr-3 ${
            showDetails ? 'w-72' : 'w-0'
          }`}
        >
          <button
            type="button"
            onClick={() => setShowDetails((open) => !open)}
            aria-label={showDetails ? t.graphHideDetails : t.graphShowDetails}
            title={showDetails ? t.graphHideDetails : t.graphShowDetails}
            aria-expanded={showDetails}
            aria-controls="graph-details-panel"
            className="absolute right-full top-4 z-10 -mr-3 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight
              size={18}
              aria-hidden="true"
              className={`motion-safe:transition-transform motion-safe:duration-300 ${showDetails ? '' : 'rotate-180'}`}
            />
          </button>
          <div
            id="graph-details-panel"
            aria-label={t.graphDetailsPanel}
            aria-hidden={!showDetails}
            inert={!showDetails}
            className={`floating-header h-full overflow-auto scrollbar-thin p-4 space-y-4 motion-safe:transition-opacity motion-safe:duration-200 ${
              showDetails ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            {/* Selected Node */}
            <div>
              <h3 className="mb-3 text-xs font-medium text-muted-foreground normal-case tracking-normal">
                {t.selectedNode}
              </h3>
              {selectedNode ? (
                <div className="space-y-3 motion-safe:animate-fade-in">
                  <div className="glass-node rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Table2 size={14} className="text-primary" />
                      <span className="font-semibold text-sm text-foreground font-mono">
                        {selectedNode.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-accent/20 text-accent font-mono">
                        {t[categoryLabelKey(selectedNode.sourceType) as keyof typeof t]}
                      </span>
                    </div>
                    {selectedNode.alias && (
                      <p className="text-xs text-muted-foreground font-mono">
                        alias: {selectedNode.alias}
                      </p>
                    )}
                  </div>

                  {selectedNode.columns.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">{t.nodeColumns}</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedNode.columns.map((col) => (
                          <span
                            key={`col-${selectedNode.id}-${col}`}
                            className="px-2 py-0.5 rounded bg-muted text-xs font-mono text-muted-foreground"
                          >
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedNode.sourceType === 'CTE' && selectedCteTables.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">{t.cteTables}</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedCteTables.map((tableName) => (
                          <span
                            key={`cte-table-${selectedNode.id}-${tableName}`}
                            className="px-2 py-0.5 rounded bg-muted text-xs font-mono text-muted-foreground"
                          >
                            {tableName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {connectedJoins.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">{t.nodeJoins}</p>
                      <div className="space-y-2">
                        {connectedJoins.map((join) => {
                          const otherTable = filteredTables.find(
                            (tbl) =>
                              tbl.id ===
                              (join.source === selectedNodeId ? join.target : join.source)
                          );
                          return (
                            <div
                              key={`join-detail-${join.id}`}
                              className="rounded-lg p-2 bg-muted/50 border border-border"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ background: JOIN_COLORS[join.joinType] }}
                                />
                                <span className="text-xs font-mono text-foreground">
                                  {join.joinType}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground font-mono">
                                → {otherTable?.name}
                              </p>
                              {join.condition && (
                                <p className="text-[10px] text-muted-foreground/70 font-mono mt-1 break-all">
                                  ON {join.condition.slice(0, 60)}
                                  {join.condition.length > 60 ? '…' : ''}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Info size={20} className="text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{t.clickNodeHint}</p>
                </div>
              )}
            </div>

            {/* Join Legend */}
            <div>
              <button
                onClick={() => setShowJoinLegend(!showJoinLegend)}
                className="w-full flex items-center justify-between hover:opacity-75 transition-opacity mb-3"
              >
                <h3 className="text-xs font-medium text-muted-foreground normal-case tracking-normal">
                  {t.joinLegend}
                </h3>
                <ChevronDown
                  size={14}
                  className="flex-shrink-0 transition-transform duration-200"
                  style={{ transform: showJoinLegend ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                />
              </button>
              {showJoinLegend && (
                <div className="space-y-2">
                  {(Object.entries(JOIN_COLORS) as [JoinType, string][]).map(([type, color]) => (
                    <div key={`legend-${type}`} className="flex items-center gap-2">
                      <div
                        className="w-8 h-0.5 rounded-full flex-shrink-0"
                        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                      />
                      <span className="text-xs font-mono text-muted-foreground">{type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* All Tables List */}
            <div>
              <h3 className="mb-3 text-xs font-medium text-muted-foreground normal-case tracking-normal">
                {t.allTables}
              </h3>
              <div className="space-y-1">
                {filteredTables.map((table) => (
                  <button
                    key={`table-list-${table.id}`}
                    onClick={() => setSelectedNodeId(table.id === selectedNodeId ? null : table.id)}
                    className={`w-full flex items-center gap-2 rounded px-2 py-1.5 text-xs font-mono text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      selectedNodeId === table.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Table2 size={11} className="flex-shrink-0" />
                    {table.name}
                    <span className="ml-auto text-[9px] bg-accent/20 text-accent px-1 rounded">
                      {t[categoryLabelKey(table.sourceType) as keyof typeof t]}
                    </span>
                  </button>
                ))}
                {filteredTables.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    {t.noTablesFound}
                  </p>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ─── Collapsible Panels ─── shared height budget so opening all three at once can never
       * squeeze the toolbar/canvas above out of view — each panel keeps its own internal sizing,
       * but the stack as a whole is capped and scrolls instead of growing past this. */}
      {(showSuggestions || showJoinAnalysis || showExtracted) && (
        <div
          className="flex-shrink-0 flex flex-col overflow-y-auto scrollbar-thin"
          style={{ maxHeight: '45vh' }}
        >
          {showSuggestions && visibleSuggestions.length > 0 && (
            <div className="flex-shrink-0 border-t border-border bg-card motion-safe:animate-slide-up">
              <SuggestionPanel
                suggestions={visibleSuggestions}
                dismissedIds={dismissedIds}
                onDismiss={dismissSuggestion}
                locale={settings.locale}
                onActivate={(suggestion) => {
                  const nextId = suggestion.relatedSourceIds?.find((id) =>
                    filteredTables.some((table) => table.id === id)
                  );
                  if (nextId) setSelectedNodeId(nextId);
                }}
              />
            </div>
          )}

          {showJoinAnalysis && (
            <div className="flex-shrink-0 border-t border-border bg-card motion-safe:animate-slide-up">
              <JoinAnalysisPanel
                joinAnalysisDetails={analysisResult?.joinAnalysisDetails}
                tables={analysisResult?.tables}
                locale={settings.locale}
              />
            </div>
          )}

          {showExtracted && extractedRows.length > 0 && (
            <div className="flex-shrink-0 border-t border-border bg-card motion-safe:animate-slide-up">
              <ExtractedTablesPanel rows={extractedRows} onGetCsv={getExtractedTablesCsv} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
