'use client';

import React, { memo, useState, useCallback, useMemo } from 'react';
import { GitFork, ChevronDown, ChevronUp, Tag, Zap, Search, X, Database } from 'lucide-react';
import { getT } from '@/lib/i18n';
import { JOIN_COLORS } from '@/app/common/colorConstant';
import type { JoinConditionAnalysis, JoinEdge } from '@/lib/sql/sqlAnalyzer';

export interface JoinAnalysisItem {
  id: string;
  joinEdge: JoinEdge;
  analysis: JoinConditionAnalysis;
}

interface JoinAnalysisPanelProps {
  joinAnalysisDetails?: JoinAnalysisItem[];
  locale: 'en' | 'vi';
}

const JoinDetailsCard = memo(function JoinDetailsCardComponent({
  item,
  index,
  t,
  allExpanded,
  searchQuery,
}: {
  item: JoinAnalysisItem;
  index: number;
  t: ReturnType<typeof getT>;
  allExpanded: boolean | null;
  searchQuery: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const { joinEdge, analysis } = item;
  const joinColor = JOIN_COLORS[joinEdge.joinType] || '#6ee7f7';

  // Highlight search matches
  const highlightMatches = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  };

  // Respond to global expand/collapse
  React.useEffect(() => {
    if (allExpanded === true) {
      setExpanded(true);
    } else if (allExpanded === false) {
      setExpanded(false);
    }
  }, [allExpanded]);

  return (
    <div
      className="border border-border rounded-lg overflow-hidden transition-all duration-200"
      style={{
        background: `${joinColor}08`,
        borderColor: joinColor,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 cursor-pointer flex items-center justify-between hover:opacity-90 transition-opacity"
        onClick={() => setExpanded(!expanded)}
        style={{ background: `${joinColor}12` }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 flex items-center gap-1.5">
            <span className="text-xs font-mono font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              #{index + 1}
            </span>
            <span
              className="px-2 py-0.5 rounded text-xs font-mono font-semibold text-white"
              style={{ background: joinColor }}
            >
              {joinEdge.joinType}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {joinEdge.condition
                ? `ON: ${joinEdge.condition.substring(0, 40)}...`
                : 'No condition'}
            </p>
          </div>
        </div>
        <button
          className="ml-2 p-1 rounded hover:bg-muted transition-colors flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Details */}
      {expanded && (
        <div className="px-4 py-3 border-t border-border/50 space-y-3">
          {/* Tables Involved */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                {t.joinSourceTable}
              </p>
              <div className="flex items-center gap-1.5">
                <Database size={12} className="text-primary flex-shrink-0" />
                <code className="text-xs font-mono text-foreground truncate">
                  {joinEdge.source}
                </code>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                {t.joinTargetTable}
              </p>
              <div className="flex items-center gap-1.5">
                <Database size={12} className="text-accent flex-shrink-0" />
                <code className="text-xs font-mono text-foreground truncate">
                  {joinEdge.target}
                </code>
              </div>
            </div>
          </div>

          {/* Complexity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                {t.joinDetailComplexity}
              </p>
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold text-white"
                  style={{
                    background:
                      analysis.complexity === 'complex'
                        ? '#ef4444'
                        : analysis.complexity === 'simple'
                          ? '#10b981'
                          : '#f59e0b',
                  }}
                >
                  {analysis.complexity === 'complex'
                    ? t.joinConditionComplex
                    : t.joinConditionSimple}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                {t.joinDetailComplexityScore}
              </p>
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary text-sm font-bold">
                {analysis.complexity_score}
              </span>
            </div>
          </div>

          {/* Equi-Join Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                {t.joinDetailIsEquiJoin}
              </p>
              <span className="text-sm font-medium text-foreground">
                {analysis.isEquiJoin ? t.joinYes : t.joinNo}
              </span>
            </div>
          </div>

          {/* Columns Involved */}
          {analysis.columns.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {t.joinDetailColumns}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.columns.map((col, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-mono bg-muted text-foreground"
                  >
                    <Tag size={10} className="opacity-60" />
                    {col}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Operators Used */}
          {analysis.operators.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {t.joinDetailOperators}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.operators.map((op, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-semibold bg-info/15 text-info"
                  >
                    <Zap size={10} />
                    {op}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Full Condition */}
          {joinEdge.condition && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                {t.joinConditionOn}
              </p>
              <code className="block p-2 rounded bg-muted text-xs font-mono text-foreground overflow-x-auto max-h-[120px]">
                {joinEdge.condition}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

JoinDetailsCard.displayName = 'JoinDetailsCard';

const JoinAnalysisPanel = memo(function JoinAnalysisPanelComponent({
  joinAnalysisDetails,
  locale,
}: JoinAnalysisPanelProps) {
  const t = getT(locale);
  const [allExpanded, setAllExpanded] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Smart search filter
  const filteredDetails = useMemo(() => {
    if (!joinAnalysisDetails || !searchQuery.trim()) {
      return joinAnalysisDetails || [];
    }

    const query = searchQuery.toLowerCase().trim();
    return joinAnalysisDetails.filter((item) => {
      const { joinEdge, analysis } = item;
      // Search in: source table, target table, join type, condition, columns, operators
      return (
        joinEdge.source.toLowerCase().includes(query) ||
        joinEdge.target.toLowerCase().includes(query) ||
        joinEdge.joinType.toLowerCase().includes(query) ||
        joinEdge.condition.toLowerCase().includes(query) ||
        analysis.columns.some((col) => col.toLowerCase().includes(query)) ||
        analysis.operators.some((op) => op.toLowerCase().includes(query))
      );
    });
  }, [joinAnalysisDetails, searchQuery]);

  if (!joinAnalysisDetails || joinAnalysisDetails.length === 0) {
    return (
      <div
        className="flex-shrink-0 border-t border-border bg-card overflow-hidden p-6 text-center"
        style={{
          minHeight: '120px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <GitFork size={20} className="text-muted-foreground" />
          </div>
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">{t.joinAnalysisEmpty}</h3>
        <p className="text-xs text-muted-foreground">{t.joinAnalysisEmptyHint}</p>
      </div>
    );
  }

  // Show no results message if search filtered everything out
  const showNoResults = searchQuery.trim() !== '' && filteredDetails.length === 0;

  return (
    <div
      className="flex-shrink-0 border-t border-border bg-card overflow-hidden flex flex-col"
      style={{ maxHeight: '50vh' }}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <GitFork size={14} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">{t.joinAnalysisTitle}</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {filteredDetails.length} {searchQuery.trim() ? `/ ${joinAnalysisDetails.length}` : ''}{' '}
            {t.rows}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAllExpanded(true)}
            className="px-2 py-1 rounded text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            {t.expandAll}
          </button>
          <button
            onClick={() => setAllExpanded(false)}
            className="px-2 py-1 rounded text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            {t.collapseAll}
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-4 py-2.5 border-b border-border/50 flex-shrink-0">
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.joinDetailSearchPlaceholder}
            className="w-full pl-8 pr-8 py-1.5 rounded text-xs font-mono bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              title={t.joinDetailClearSearch}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Cards Container */}
      {showNoResults ? (
        <div className="flex-1 flex items-center justify-center text-center p-4">
          <div>
            <Search size={20} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{t.joinDetailNoResults}</p>
          </div>
        </div>
      ) : (
        <div
          className="overflow-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          style={{ maxHeight: 'calc(100% - 130px)' }}
        >
          <div className="px-4 py-3 space-y-2.5">
            {filteredDetails.map((item, idx) => (
              <JoinDetailsCard
                key={item.id}
                item={item}
                index={idx}
                t={t}
                allExpanded={allExpanded}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="px-4 py-2 border-t border-border/50 bg-muted/30 text-xs text-muted-foreground text-center">
        {t.joinDialectSupport}
      </div>
    </div>
  );
});

JoinAnalysisPanel.displayName = 'JoinAnalysisPanel';

export default JoinAnalysisPanel;
