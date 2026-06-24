'use client';

import React, { useState } from 'react';
import {
  Layers,
  ChevronDown,
  ChevronRight,
  Copy,
  Table2,
  Hash,
  Database,
  Code2,
  GitBranch,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Link2,
  BarChart2,
  CheckCircle2,
  Columns,
  Search,
  Zap,
  ArrowRight,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import { CTE, NestedSubquery } from '@/lib/sqlAnalyzer';

function OriginBadge({
  type,
  t,
}: {
  type: 'cte' | 'table' | 'expression';
  t: ReturnType<typeof getT>;
}) {
  const cfg = {
    cte: { label: t.cteOriginBadgeCTE, cls: 'bg-accent/10 text-accent border-accent/20' },
    table: { label: t.cteOriginBadgeTable, cls: 'bg-primary/10 text-primary border-primary/20' },
    expression: {
      label: t.cteOriginBadgeExpression,
      cls: 'bg-muted text-muted-foreground border-border',
    },
  };
  const { label, cls } = cfg[type];
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${cls}`}>{label}</span>
  );
}

function ComplexityBadge({ level }: { level: 'LOW' | 'MEDIUM' | 'HIGH' }) {
  const cfg = {
    LOW: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    MEDIUM: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    HIGH: 'bg-red-500/10 text-red-500 border-red-500/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${cfg[level]}`}>
      {level}
    </span>
  );
}

function DepthBadge({ depth }: { depth: number }) {
  const colors = [
    'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'bg-violet-500/10 text-violet-500 border-violet-500/20',
    'bg-rose-500/10 text-rose-500 border-rose-500/20',
    'bg-orange-500/10 text-orange-500 border-orange-500/20',
    'bg-pink-500/10 text-pink-500 border-pink-500/20',
  ];
  const cls = colors[Math.min(depth - 1, colors.length - 1)];
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cls} font-mono`}>
      L{depth}
    </span>
  );
}

interface NestedSubquerySectionProps {
  subqueries: NestedSubquery[];
  cteId: string;
  t: ReturnType<typeof getT>;
}

function NestedSubquerySection({ subqueries, cteId, t }: NestedSubquerySectionProps) {
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());

  const toggleSub = (id: string) => {
    setExpandedSubs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const maxDepth = subqueries.length > 0 ? Math.max(...subqueries.map((s) => s.depth)) : 0;

  return (
    <div className="border-t border-border">
      <div className="px-5 py-3 bg-violet-500/5 border-b border-violet-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search size={12} className="text-violet-500" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t.cteNestedSubqueries}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-500 text-[10px] font-bold border border-violet-500/20">
            {subqueries.length}
          </span>
          {maxDepth > 0 && (
            <span className="text-[10px] text-muted-foreground">· max depth L{maxDepth}</span>
          )}
        </div>
      </div>

      {subqueries.length === 0 ? (
        <div className="px-5 py-4 text-xs text-muted-foreground italic">
          {t.cteNoNestedSubqueries}
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {subqueries.map((sub, idx) => (
            <div key={sub.id} className="group">
              <button
                onClick={() => toggleSub(sub.id)}
                className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-muted/20 transition-colors"
              >
                {/* Depth indicator line */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {Array.from({ length: sub.depth }).map((_, d) => (
                    <div
                      key={d}
                      className={`w-0.5 h-5 rounded-full ${
                        d === sub.depth - 1 ? 'bg-violet-500/60' : 'bg-border'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <DepthBadge depth={sub.depth} />
                  <span className="text-xs font-semibold text-foreground font-mono truncate">
                    {t.cteSubqueryPrefix} #{idx + 1}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <ArrowRight size={9} />
                    {sub.context}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {sub.hasJoins && (
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium border border-primary/20">
                      {t.cteTagJOIN}
                    </span>
                  )}
                  {sub.hasAggregation && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-medium border border-emerald-500/20">
                      {t.cteTagAGG}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {sub.lineCount}L
                  </span>
                  {expandedSubs.has(sub.id) ? (
                    <ChevronDown size={13} className="text-muted-foreground" />
                  ) : (
                    <ChevronRight size={13} className="text-muted-foreground" />
                  )}
                </div>
              </button>

              {expandedSubs.has(sub.id) && (
                <div className="px-5 pb-4 space-y-3 bg-muted/10 border-t border-border/30">
                  {/* Meta row */}
                  <div className="flex flex-wrap gap-3 pt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Zap size={10} className="text-violet-500" />
                      <span className="font-semibold text-foreground">{t.cteSubqueryDepth}:</span>
                      <DepthBadge depth={sub.depth} />
                    </span>
                    <span className="flex items-center gap-1">
                      <Code2 size={10} />
                      {sub.lineCount} {t.cteSubqueryLines}
                    </span>
                    <span className="flex items-center gap-1">
                      <Table2 size={10} />
                      {sub.tables.length} {t.cteSubqueryTables}
                    </span>
                    <span className="flex items-center gap-1">
                      <Hash size={10} />
                      {sub.fields.length} {t.cteSubqueryFields}
                    </span>
                    <span className="flex items-center gap-1">
                      <ArrowRight size={10} />
                      {t.cteSubqueryContext}:{' '}
                      <span className="font-mono text-foreground ml-1">{sub.context}</span>
                    </span>
                  </div>

                  {/* Tables */}
                  {sub.tables.length > 0 && (
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                        {t.cteSubqueryTables}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {sub.tables.map((tbl, idx) => (
                          <span
                            key={`${sub.id}-tbl-${idx}`}
                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono"
                          >
                            <Database size={9} />
                            {tbl}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SQL body */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        SQL
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(sub.body);
                          toast.success(t.copied);
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Copy size={9} />
                        {t.copySQL}
                      </button>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 overflow-auto max-h-36 scrollbar-thin">
                      <pre className="text-xs font-mono text-foreground whitespace-pre-wrap leading-relaxed">
                        {sub.body}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface CTECardProps {
  cte: CTE;
  expanded: boolean;
  onToggle: () => void;
  t: ReturnType<typeof getT>;
}

function CTECard({ cte, expanded, onToggle, t }: CTECardProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(cte.body);
    toast.success(t.copied);
  };

  const issues: { icon: React.ReactNode; text: string; color: string }[] = [];
  if (cte.isUnused) {
    issues.push({
      icon: <EyeOff size={11} />,
      text: t.cteUnusedWarning,
      color: 'text-amber-500',
    });
  }
  if (cte.isRecursive) {
    issues.push({
      icon: <RefreshCw size={11} />,
      text: t.cteRecursiveNote,
      color: 'text-blue-500',
    });
  }

  return (
    <div
      className={`bg-card border rounded-xl overflow-hidden transition-all duration-200 hover:border-primary/30 ${
        cte.isUnused ? 'border-amber-500/30' : 'border-border'
      }`}
    >
      {/* Card Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
          <Layers size={14} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground font-mono">{cte.name}</span>
            <span className="px-1.5 py-0.5 rounded bg-accent/10 text-accent text-[10px] font-mono">
              {t.cteOriginBadgeCTE}
            </span>
            {cte.isRecursive && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[10px] font-medium border border-blue-500/20">
                <RefreshCw size={9} />
                {t.cteTagRECURSIVE}
              </span>
            )}
            {cte.isUnused && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-medium border border-amber-500/20">
                <EyeOff size={9} />
                {t.cteTagUNUSED}
              </span>
            )}
            {cte.nestedSubqueries.length > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-500 text-[10px] font-medium border border-violet-500/20">
                <Search size={9} />
                {cte.nestedSubqueries.length} {t.cteSubqueryCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Table2 size={10} />
              {cte.tables.length} {t.cteMetadataTables}
            </span>
            <span className="flex items-center gap-1">
              <Hash size={10} />
              {cte.fields.length} {t.cteMetadataFields}
            </span>
            <span className="flex items-center gap-1">
              <Code2 size={10} />
              {cte.lineCount} {t.cteMetadataLines}
            </span>
            <span className="flex items-center gap-1">
              <Eye size={10} />
              {cte.usageCount}× {t.cteMetadataUsed}
            </span>
            <ComplexityBadge level={cte.estimatedComplexity} />
          </div>
        </div>
        {expanded ? (
          <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {/* Expanded Body */}
      {expanded && (
        <div className="border-t border-border animate-fade-in">
          {/* Issues Banner */}
          {issues.length > 0 && (
            <div className="px-5 py-3 bg-amber-500/5 border-b border-amber-500/20 flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={10} className="text-amber-500" />
                {t.cteIssues}
              </span>
              {issues.map((issue, i) => (
                <div key={i} className={`flex items-start gap-2 text-xs ${issue.color}`}>
                  {issue.icon}
                  <span>{issue.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border border-b border-border">
            <div className="px-4 py-3 flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t.cteUsageCount}
              </span>
              <div className="flex items-center gap-1.5">
                <Eye
                  size={13}
                  className={cte.usageCount === 0 ? 'text-amber-500' : 'text-emerald-500'}
                />
                <span className="text-sm font-bold text-foreground font-mono">
                  {cte.usageCount}
                </span>
                <span className="text-[10px] text-muted-foreground">{t.cteUsedInMain}</span>
              </div>
            </div>
            <div className="px-4 py-3 flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t.cteEstimatedComplexity}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <BarChart2 size={13} className="text-primary" />
                <ComplexityBadge level={cte.estimatedComplexity} />
              </div>
            </div>
            <div className="px-4 py-3 flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t.cteIsRecursive}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {cte.isRecursive ? (
                  <>
                    <RefreshCw size={13} className="text-blue-500" />
                    <span className="text-xs font-semibold text-blue-500">{t.cteBooleanYes}</span>
                  </>
                ) : (
                  <>
                    <X size={13} className="text-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-500">{t.cteBooleanNo}</span>
                  </>
                )}
              </div>
            </div>
            <div className="px-4 py-3 flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t.cteDependencies}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Link2 size={13} className="text-primary" />
                <span className="text-sm font-bold text-foreground font-mono">
                  {cte.dependencies.length}
                </span>
                <span className="text-[10px] text-muted-foreground">CTEs</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border">
            {/* SQL Body */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t.cteBody}
                </h4>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Copy size={11} />
                  {t.copySQL}
                </button>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 overflow-auto max-h-48 scrollbar-thin">
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap leading-relaxed">
                  {cte.body}
                </pre>
              </div>
            </div>

            {/* Right Panel: Tables, Fields, Deps, Column Refs */}
            <div className="p-5 space-y-4">
              {/* Referenced Tables */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {t.cteTables}
                </h4>
                {cte.tables.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {cte.tables.map((table, idx) => (
                      <span
                        key={`cte-table-${cte.id}-${idx}`}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-mono"
                      >
                        <Database size={10} />
                        {table}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">{t.cteNoTablesDetected}</p>
                )}
              </div>

              {/* CTE Dependencies */}
              {cte.dependencies.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Link2 size={10} />
                    {t.cteDepsLabel}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {cte.dependencies.map((dep, idx) => (
                      <span
                        key={`dep-${cte.id}-${idx}`}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-xs font-mono border border-accent/20"
                      >
                        <Layers size={9} />
                        {dep}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Column References */}
              {cte.columnReferences.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Columns size={10} />
                    {t.cteColumnRefs}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {cte.columnReferences.map((col, idx) => (
                      <span
                        key={`col-${cte.id}-${idx}`}
                        className="px-2 py-0.5 rounded bg-muted text-xs font-mono text-muted-foreground border border-border/50"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Fields */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {t.cteFields}
                </h4>
                {cte.fields.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {cte.fields.map((field, idx) => (
                      <span
                        key={`cte-field-${cte.id}-${idx}`}
                        className="px-2 py-0.5 rounded bg-muted text-xs font-mono text-muted-foreground"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">{t.cteNoFieldsDetected}</p>
                )}
              </div>
            </div>
          </div>

          {/* Nested Subqueries Section */}
          <NestedSubquerySection subqueries={cte.nestedSubqueries} cteId={cte.id} t={t} />
        </div>
      )}
    </div>
  );
}

export default function CTEAnalysisContent() {
  const { settings, analysisResult } = useAppStore();
  const t = getT(settings.locale);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    if (!analysisResult) return;
    setExpandedIds(new Set(analysisResult.ctes.map((c) => c.id)));
  };

  const collapseAll = () => setExpandedIds(new Set());

  if (!analysisResult) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Layers size={28} className="text-muted-foreground" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">{t.noCTEs}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t.noCTEsHint}</p>
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

  const { ctes, mainQueryFields } = analysisResult;

  const unusedCount = ctes.filter((c) => c.isUnused).length;
  const recursiveCount = ctes.filter((c) => c.isRecursive).length;
  const complexityMap = { LOW: 0, MEDIUM: 1, HIGH: 2 };
  const avgComplexity =
    ctes.length > 0
      ? ctes.reduce((s, c) => s + complexityMap[c.estimatedComplexity], 0) / ctes.length
      : 0;
  const avgComplexityLabel =
    avgComplexity >= 1.5 ? 'HIGH' : avgComplexity >= 0.5 ? 'MEDIUM' : 'LOW';

  return (
    <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Layers size={22} className="text-primary" />
            {t.cteTitle}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t.cteSubtitle}</p>
        </div>
        {ctes.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              {t.expandAll}
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              {t.collapseAll}
            </button>
          </div>
        )}
      </div>

      {/* CTE Summary Stats */}
      {ctes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t.cteTotalLabel}
            </span>
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-primary" />
              <span className="text-2xl font-bold text-foreground font-mono">{ctes.length}</span>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t.cteUnusedCount}
            </span>
            <div className="flex items-center gap-2">
              <EyeOff
                size={16}
                className={unusedCount > 0 ? 'text-amber-500' : 'text-emerald-500'}
              />
              <span
                className={`text-2xl font-bold font-mono ${unusedCount > 0 ? 'text-amber-500' : 'text-foreground'}`}
              >
                {unusedCount}
              </span>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t.cteRecursiveCount}
            </span>
            <div className="flex items-center gap-2">
              <RefreshCw
                size={16}
                className={recursiveCount > 0 ? 'text-blue-500' : 'text-muted-foreground'}
              />
              <span className="text-2xl font-bold text-foreground font-mono">{recursiveCount}</span>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t.cteAvgComplexity}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <BarChart2 size={16} className="text-primary" />
              <span
                className={`text-sm font-bold ${
                  avgComplexityLabel === 'HIGH'
                    ? 'text-red-500'
                    : avgComplexityLabel === 'MEDIUM'
                      ? 'text-amber-500'
                      : 'text-emerald-500'
                }`}
              >
                {avgComplexityLabel}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CTE List */}
      {ctes.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <GitBranch size={20} className="text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{t.noCTEs}</h3>
          <p className="text-xs text-muted-foreground max-w-sm">{t.noCTEsHint}</p>
        </div>
      ) : (
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {ctes.length} {t.cteDepCountLabel}
              {ctes.length !== 1 ? 's' : ''} {t.cteDetected}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          {ctes.map((cte) => (
            <CTECard
              key={`cte-card-${cte.id}`}
              cte={cte}
              expanded={expandedIds.has(cte.id)}
              onToggle={() => toggleExpand(cte.id)}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Main Query Field Origins */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Hash size={15} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{t.mainQueryFields}</h3>
          <span className="ml-auto text-xs text-muted-foreground font-mono">
            {mainQueryFields.length} {t.cteMetadataFields}
          </span>
        </div>

        {mainQueryFields.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">{t.noData}</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-8">
                    #
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t.fieldName}
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t.fieldOrigin}
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t.fieldType}
                  </th>
                </tr>
              </thead>
              <tbody>
                {mainQueryFields.map((field, i) => (
                  <tr
                    key={`field-row-${i}-${field.field}`}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-5 py-3 text-xs text-muted-foreground font-mono">{i + 1}</td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-foreground bg-muted px-2 py-0.5 rounded">
                        {field.field}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-mono text-muted-foreground">
                        {field.origin}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <OriginBadge type={field.type} t={t} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
