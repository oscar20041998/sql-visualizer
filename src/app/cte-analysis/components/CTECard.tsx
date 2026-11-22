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
import type { CTE } from '@/lib/sql/sqlAnalyzer';
import NestedSubquerySection from './NestedSubquerySection';

function ComplexityBadge({
  level,
  t,
}: {
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  t: ReturnType<typeof getT>;
}) {
  const cfg = {
    LOW: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    MEDIUM: 'bg-warning/10 text-warning border-warning/20',
    HIGH: 'bg-danger/10 text-danger border-danger/20',
  };
  return (
    <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${cfg[level]}`}>
      {{ LOW: t.complexityLow, MEDIUM: t.complexityMedium, HIGH: t.complexityHigh }[level]}
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
      color: 'text-warning',
    });
  }
  if (cte.isRecursive) {
    issues.push({
      icon: <RefreshCw size={11} />,
      text: t.cteRecursiveNote,
      color: 'text-info',
    });
  }

  return (
    <div
      className={`overflow-hidden rounded-lg border bg-card ${
        cte.isUnused ? 'border-warning/30' : 'border-border'
      }`}
      style={{ containment: 'layout style paint' } as any}
    >
      {/* Card Header */}
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
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
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-info/10 text-info text-[10px] font-medium border border-info/20">
                <RefreshCw size={9} />
                {t.cteTagRECURSIVE}
              </span>
            )}
            {cte.isUnused && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-warning/10 text-warning text-[10px] font-medium border border-warning/20">
                <EyeOff size={9} />
                {t.cteTagUNUSED}
              </span>
            )}
            {cte.nestedSubqueries.length > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent/10 text-accent text-[10px] font-medium border border-accent/20">
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
            <ComplexityBadge level={cte.estimatedComplexity} t={t} />
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
            <div className="px-5 py-3 bg-warning/5 border-b border-warning/20 flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground normal-case tracking-normal">
                <AlertTriangle size={10} className="text-warning" />
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
              <span className="text-xs font-medium text-muted-foreground normal-case tracking-normal">
                {t.cteUsageCount}
              </span>
              <div className="flex items-center gap-1.5">
                <Eye size={13} className={cte.isUnused ? 'text-warning' : 'text-success'} />
                <span className="text-sm font-bold text-foreground font-mono">
                  {cte.usageCount}
                </span>
                <span className="text-[10px] text-muted-foreground">{t.cteUsedInMain}</span>
              </div>
            </div>
            <div className="px-4 py-3 flex flex-col gap-0.5">
              <span className="text-xs font-medium text-muted-foreground normal-case tracking-normal">
                {t.cteEstimatedComplexity}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <BarChart2 size={13} className="text-primary" />
                <ComplexityBadge level={cte.estimatedComplexity} t={t} />
              </div>
            </div>
            <div className="px-4 py-3 flex flex-col gap-0.5">
              <span className="text-xs font-medium text-muted-foreground normal-case tracking-normal">
                {t.cteIsRecursive}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {cte.isRecursive ? (
                  <>
                    <RefreshCw size={13} className="text-info" />
                    <span className="text-xs font-semibold text-info">{t.cteBooleanYes}</span>
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
              <span className="text-xs font-medium text-muted-foreground normal-case tracking-normal">
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
                <h4 className="text-xs font-medium text-muted-foreground normal-case tracking-normal">
                  {t.cteBody}
                </h4>
                <button
                  onClick={handleCopy}
                  className="flex min-h-9 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            <div className="p-5 space-y-4 overflow-auto">
              {/* Referenced Tables */}
              <div className="space-y-2 overflow-auto max-h-48 scrollbar-thin">
                <div>
                  <h4 className="mb-2 text-xs font-medium text-muted-foreground normal-case tracking-normal">
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
                    <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground normal-case tracking-normal">
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
                    <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground normal-case tracking-normal">
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
                  <h4 className="mb-2 text-xs font-medium text-muted-foreground normal-case tracking-normal">
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
          </div>

          {/* Nested Subqueries Section */}
          <NestedSubquerySection subqueries={cte.nestedSubqueries} cteId={cte.id} t={t} />
        </div>
      )}
    </div>
  );
}
