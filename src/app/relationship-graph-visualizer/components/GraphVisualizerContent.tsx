'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { GitFork, Info, Table2, Link2, Copy, Check, Code2, Search, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import type { JoinType, AnalysisResult } from '@/lib/sqlAnalyzer';
import type { FlowCanvasHandle } from './FlowCanvas';
import { JOIN_COLORS } from '@/app/common/colorConstant';
import SuggestionPanel, { type Suggestion } from './SuggestionPanel';
import ExtractedTablesPanel, { type ExtractedTableRow } from './ExtractedTablesPanel';

const FlowCanvas = dynamic(() => import('./FlowCanvas'), { ssr: false });

type RelationshipFilterMode = 'all' | 'cte' | 'table';

// ─── Copy Button Component ────────────────────────────────────────────────────
function CopyButton({
  getText,
  label,
  icon,
}: {
  getText: () => string;
  label: string;
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
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border"
      style={{
        background: copied ? 'rgba(16,185,129,0.1)' : 'var(--muted)',
        borderColor: copied ? '#10b981' : 'var(--border)',
        color: copied ? '#10b981' : 'var(--muted-foreground)',
      }}
    >
      {copied ? <Check size={12} /> : icon || <Copy size={12} />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

// generateSuggestions function:
function generateSuggestions(result: AnalysisResult, t: ReturnType<typeof getT>): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const { metrics, joins, tables, ctes, complexity } = result;

  // ── Missing indexes on join columns ──
  const joinConditions = joins.filter((j) => j.condition);
  if (joinConditions.length > 0) {
    const colsWithoutIndex: string[] = [];
    joinConditions.forEach((j) => {
      const match = j.condition.match(/(\w+\.\w+)\s*=\s*(\w+\.\w+)/);
      if (match) {
        colsWithoutIndex.push(match[1], match[2]);
      }
    });
    if (colsWithoutIndex.length > 0) {
      const cols = [...new Set(colsWithoutIndex)].slice(0, 4).join(', ');
      suggestions.push({
        id: 'missing-index',
        severity: metrics.joinCount > 3 ? 'error' : 'warning',
        title: t.suggMissingIndexTitle,
        detail: `${t.suggMissingIndexDetail.replace('Ensure indexes exist on join key columns.', `Ensure indexes exist on: ${cols}.`)}`,
      });
    }
  }

  // ── Excessive joins ──
  if (metrics.joinCount >= 5) {
    suggestions.push({
      id: 'excessive-joins',
      severity: 'error',
      title: `${t.suggExcessiveJoinsTitle} (${metrics.joinCount})`,
      detail: `${metrics.joinCount} ${t.suggExcessiveJoinsDetail}`,
    });
  } else if (metrics.joinCount >= 3) {
    suggestions.push({
      id: 'many-joins',
      severity: 'warning',
      title: `${t.suggManyJoinsTitle} (${metrics.joinCount})`,
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
    });
  }

  // ── Complexity level ──
  if (complexity.level === 'SUPER HIGH') {
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
  tables: import('@/lib/sqlAnalyzer').TableNode[],
  joins: import('@/lib/sqlAnalyzer').JoinEdge[]
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

function buildMermaidDiagram(
  tables: import('@/lib/sqlAnalyzer').TableNode[],
  joins: import('@/lib/sqlAnalyzer').JoinEdge[],
  joinColors: Record<JoinType, string>
): string {
  const lines: string[] = ['graph LR'];

  // Node definitions
  tables.forEach((t) => {
    const label = `${t.name}\\n[${t.isCTE ? 'CTE' : 'TABLE'}]\\n${t.columns.length} fields`;
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
  const { settings, analysisResult, selectedNodeId, setSelectedNodeId } = useAppStore();
  const t = getT(settings.locale);
  const flowRef = useRef<FlowCanvasHandle>(null);
  const [showExtracted, setShowExtracted] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [tableSearch, setTableSearch] = useState('');

  // ── Graph search state ──
  const [graphSearch, setGraphSearch] = useState('');
  const [graphSearchFocused, setGraphSearchFocused] = useState(false);
  const graphSearchRef = useRef<HTMLInputElement>(null);
  const [relationshipFilter, setRelationshipFilter] = useState<RelationshipFilterMode>('all');

  const filteredTables = useMemo(() => {
    if (!analysisResult) return [];
    if (relationshipFilter === 'cte') return analysisResult.tables.filter((table) => table.isCTE);
    if (relationshipFilter === 'table')
      return analysisResult.tables.filter((table) => !table.isCTE);
    return analysisResult.tables;
  }, [analysisResult, relationshipFilter]);

  const filteredTableIdSet = useMemo(
    () => new Set(filteredTables.map((table) => table.id)),
    [filteredTables]
  );

  const filteredJoins = useMemo(() => {
    if (!analysisResult) return [];

    const tableById = new Map(analysisResult.tables.map((table) => [table.id, table]));
    return analysisResult.joins.filter((join) => {
      if (!filteredTableIdSet.has(join.source) || !filteredTableIdSet.has(join.target)) {
        return false;
      }

      if (relationshipFilter === 'all') return true;

      const source = tableById.get(join.source);
      const target = tableById.get(join.target);
      const sourceIsCTE = !!source?.isCTE;
      const targetIsCTE = !!target?.isCTE;

      if (relationshipFilter === 'cte') return sourceIsCTE && targetIsCTE;
      return !sourceIsCTE && !targetIsCTE;
    });
  }, [analysisResult, relationshipFilter, filteredTableIdSet]);

  useEffect(() => {
    if (!selectedNodeId) return;
    if (!filteredTableIdSet.has(selectedNodeId)) {
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
    selectedNode?.isCTE && analysisResult
      ? analysisResult.ctes.find((cte) => cte.name.toLowerCase() === selectedNode.name.toLowerCase())
      : null;
  const selectedCteTables = selectedCte?.tables ?? [];
  const connectedJoins =
    filteredJoins.filter(
      (j) => j.source === selectedNodeId || j.target === selectedNodeId
    ) || [];

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
        lines.push(`[${t.isCTE ? 'CTE' : 'TABLE'}] ${t.name}  color: ${color}`);
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

  if (!analysisResult) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[calc(100vh-64px)] gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <GitFork size={28} className="text-muted-foreground" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">{t.noGraph}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t.noGraphHint}</p>
        </div>
        <a
          href="/"
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
    <div className="flex flex-col h-[calc(100vh-0px)] overflow-hidden">
      {/* Main area: canvas + sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative">
          {/* Header Bar */}
          <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-2 flex-wrap">
            <div className="glass-panel rounded-lg px-4 py-2.5 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <GitFork size={16} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">{t.graphTitle}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Table2 size={11} />
                  {filteredTables.length} {t.tableCount}
                </span>
                <span className="flex items-center gap-1">
                  <Link2 size={11} />
                  {filteredJoins.length} {t.joinCount}
                </span>
                <div className="flex items-center gap-2">
                  <span>{t.graphFilterLabel}</span>
                  <select
                    value={relationshipFilter}
                    onChange={(e) => setRelationshipFilter(e.target.value as RelationshipFilterMode)}
                    className="px-2 py-1 rounded-md bg-muted border border-border text-foreground font-mono"
                  >
                    <option value="all">{t.graphFilterAll}</option>
                    <option value="cte">{t.graphFilterCte}</option>
                    <option value="table">{t.graphFilterTable}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <CopyButton
                getText={getMermaidText}
                label={t.convertMermaid}
                icon={<Code2 size={12} />}
              />
              <CopyButton getText={getChartSvg} label={t.copyChart} icon={<Copy size={12} />} />
            </div>
          </div>

          {/* ── Graph Search Box ── */}
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 w-72">
            <div className="relative">
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-150"
                style={{
                  background: 'rgba(26,31,46,0.92)',
                  backdropFilter: 'blur(8px)',
                  borderColor: graphSearchFocused ? 'var(--primary)' : 'rgba(45,51,72,0.8)',
                  boxShadow: graphSearchFocused
                    ? '0 0 0 2px rgba(99,102,241,0.2), 0 4px 16px rgba(0,0,0,0.4)'
                    : '0 2px 12px rgba(0,0,0,0.35)',
                }}
              >
                <Search size={14} className="text-muted-foreground flex-shrink-0" />
                <input
                  ref={graphSearchRef}
                  type="text"
                  value={graphSearch}
                  onChange={(e) => setGraphSearch(e.target.value)}
                  onFocus={() => setGraphSearchFocused(true)}
                  onBlur={() => setTimeout(() => setGraphSearchFocused(false), 150)}
                  placeholder={t.searchTables}
                  className="flex-1 bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none min-w-0"
                />
                {(graphSearch || selectedNodeId) && (
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleGraphSearchClear();
                    }}
                    className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={13} />
                  </button>
                )}
                {selectedNodeId && !graphSearch && (
                  <span
                    className="flex-shrink-0 text-xs font-mono px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
                  >
                    {filteredTables.find((t) => t.id === selectedNodeId)?.name ?? ''}
                  </span>
                )}
              </div>

              {/* Dropdown suggestions */}
              {graphSearchFocused && graphSearch.trim() !== '' && (
                <div
                  className="absolute top-full mt-1.5 left-0 right-0 rounded-xl overflow-hidden border"
                  style={{
                    background: 'rgba(26,31,46,0.97)',
                    backdropFilter: 'blur(8px)',
                    borderColor: 'rgba(45,51,72,0.9)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
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
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
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
                            {table.isCTE && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-accent/20 text-accent">
                                CTE
                              </span>
                            )}
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
          </div>

          <FlowCanvas ref={flowRef} tables={filteredTables} joins={filteredJoins} />
        </div>

        {/* Right Sidebar */}
        <div className="w-72 flex-shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto scrollbar-thin p-4 space-y-4">
            {/* Selected Node */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {t.selectedNode}
              </h3>
              {selectedNode ? (
                <div className="space-y-3 animate-fade-in">
                  <div className="glass-node rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Table2 size={14} className="text-primary" />
                      <span className="font-semibold text-sm text-foreground font-mono">
                        {selectedNode.name}
                      </span>
                      {selectedNode.isCTE && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-accent/20 text-accent font-mono">
                          CTE
                        </span>
                      )}
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

                  {selectedNode.isCTE && selectedCteTables.length > 0 && (
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
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {t.joinLegend}
              </h3>
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
            </div>

            {/* All Tables List */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {t.allTables}
              </h3>
              {/* Search input */}
              <div className="relative mb-2">
                <Search
                  size={11}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder={t.searchTables}
                  className="w-full pl-6 pr-2 py-1.5 rounded text-xs font-mono bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
                {tableSearch && (
                  <button
                    onClick={() => setTableSearch('')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {filteredTables
                  .filter(
                    (table) =>
                      tableSearch.trim() === '' ||
                      table.name.toLowerCase().includes(tableSearch.toLowerCase())
                  )
                  .map((table) => (
                    <button
                      key={`table-list-${table.id}`}
                      onClick={() =>
                        setSelectedNodeId(table.id === selectedNodeId ? null : table.id)
                      }
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs font-mono text-left transition-colors ${
                        selectedNodeId === table.id
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Table2 size={11} className="flex-shrink-0" />
                      {table.name}
                      {table.isCTE && (
                        <span className="ml-auto text-[9px] bg-accent/20 text-accent px-1 rounded">
                          CTE
                        </span>
                      )}
                    </button>
                  ))}
                {tableSearch.trim() !== '' &&
                  filteredTables.filter((table) =>
                    table.name.toLowerCase().includes(tableSearch.toLowerCase())
                  ).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      {t.noTablesFound}
                    </p>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Inline Suggestions Panel ─────────────────────────────────────────── */}
      {visibleSuggestions.length > 0 && (
        <SuggestionPanel
          suggestions={visibleSuggestions}
          dismissedIds={dismissedIds}
          onDismiss={dismissSuggestion}
        />
      )}

      {/* ─── Extracted Tables Section ─────────────────────────────────────────── */}
      <ExtractedTablesPanel rows={extractedRows} onGetCsv={getExtractedTablesCsv} />
    </div>
  );
}
