'use client';

import React from 'react';
import {
  Layers,
  ChevronDown,
  ChevronRight,
  Copy,
  Table2,
  Hash,
  Database,
  Code2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Link2,
  BarChart2,
  Columns,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { getT } from '@/lib/i18n';
import type { CTE } from '@/lib/sqlAnalyzer';
import NestedSubquerySection from './NestedSubquerySection';

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

interface CTECardProps {
  cte: CTE;
  expanded: boolean;
  onToggle: () => void;
  t: ReturnType<typeof getT>;
}

export default function CTECard({ cte, expanded, onToggle, t }: CTECardProps) {
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
      className={`bg-card border rounded-xl overflow-hidden ${
        cte.isUnused ? 'border-amber-500/30' : 'border-border'
      }`}
      style={{ containment: 'layout style paint' } as any}
    >
      {/* Card Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
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
                <Table2 size={9} />
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
        <div className="border-t border-border">
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
