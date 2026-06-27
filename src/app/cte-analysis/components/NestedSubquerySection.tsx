'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Search,
  Table2,
  Hash,
  Database,
  Code2,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { getT } from '@/lib/i18n';
import type { NestedSubquery } from '@/lib/sqlAnalyzer';

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

export default function NestedSubquerySection({
  subqueries,
  cteId,
  t,
}: NestedSubquerySectionProps) {
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
            <div key={sub.id}>
              <button
                onClick={() => toggleSub(sub.id)}
                className="w-full flex items-center gap-3 px-5 py-3 text-left"
                style={{ containment: 'layout style paint' }}\n              >
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
