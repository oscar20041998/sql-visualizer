'use client';

import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Table2 } from 'lucide-react';
import type { TableNode as TableNodeType } from '@/lib/sqlAnalyzer';

export interface TableNodeData extends TableNodeType {
  isHighlighted: boolean;
  isSelected: boolean;
  nodeColor: string;
  theme?: 'dark' | 'light';
  isSimplified?: boolean; // For performance mode
}

const TableNode = memo(function TableNodeComponent({ data }: { data: TableNodeData }) {
  const { name, alias, columns, isCTE, isHighlighted, isSelected, nodeColor, isSimplified } = data;
  const theme = data.theme ?? 'dark';
  const isLight = theme === 'light';

  const cardBg = isLight ? '#ffffff' : '#111827';
  const bodyText = isLight ? '#334155' : '#cbd5e1';
  const subText = isLight ? '#64748b' : '#94a3b8';
  const mutedText = isLight ? '#94a3b8' : '#64748b';
  const tableType = isCTE ? 'CTE' : 'TABLE';
  const totalFields = columns.length;

  // Simplified render for large graphs (60+ nodes)
  if (isSimplified) {
    return (
      <div
        style={{
          background: cardBg,
          border: `2px solid ${isSelected ? nodeColor : isHighlighted ? nodeColor + 'cc' : nodeColor + '66'}`,
          boxShadow: isSelected
            ? `0 0 12px ${nodeColor}88`
            : isHighlighted
              ? `0 0 6px ${nodeColor}44`
              : 'none',
          opacity: isHighlighted ? 1 : 0.5,
          borderRadius: 8,
          padding: '6px 10px',
          minWidth: 120,
          maxWidth: 160,
          position: 'relative',
        }}
      >
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: 'transparent', border: 'none', width: 6, height: 6, left: -3 }}
        />
        <Handle
          type="source"
          position={Position.Right}
          style={{ background: 'transparent', border: 'none', width: 6, height: 6, right: -3 }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Table2 size={10} style={{ color: nodeColor, flexShrink: 0 }} />
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              fontFamily: 'monospace',
              color: nodeColor,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </span>
        </div>
      </div>
    );
  }

  // Full render for normal mode
  return (
    <div
      style={{
        background: cardBg,
        border: `2px solid ${isSelected ? nodeColor : isHighlighted ? nodeColor + 'cc' : nodeColor + '66'}`,
        boxShadow: isSelected
          ? `0 0 20px ${nodeColor}66, 0 6px 16px ${isLight ? 'rgba(15,23,42,0.15)' : 'rgba(2,6,23,0.55)'}`
          : isHighlighted
            ? `0 0 10px ${nodeColor}55`
            : `0 6px 16px ${isLight ? 'rgba(15,23,42,0.12)' : 'rgba(2,6,23,0.45)'}`,
        opacity: isHighlighted ? 1 : 0.6,
        borderRadius: 12,
        minWidth: 170,
        maxWidth: 230,
        overflow: 'visible',
        position: 'relative',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: 'transparent', border: 'none', width: 8, height: 8, left: -4 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: 'transparent', border: 'none', width: 8, height: 8, right: -4 }}
      />

      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: `${nodeColor}28`,
          borderBottom: `1px solid ${nodeColor}55`,
          borderRadius: '10px 10px 0 0',
        }}
      >
        <Table2 size={12} style={{ color: nodeColor, flexShrink: 0 }} />
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'monospace',
            color: nodeColor,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </span>
      </div>

      {/* Type + Fields row */}
      <div
        style={{
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${nodeColor}22`,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontFamily: 'monospace',
            padding: '2px 6px',
            borderRadius: 4,
            background: `${nodeColor}22`,
            color: nodeColor,
          }}
        >
          {tableType}
        </span>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: subText }}>
          {totalFields} field{totalFields !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Columns */}
      <div style={{ padding: '8px 12px' }}>
        {alias && (
          <p style={{ fontSize: 10, fontFamily: 'monospace', color: subText, marginBottom: 4 }}>
            AS {alias}
          </p>
        )}
        {columns.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {columns.slice(0, 4).map((col) => (
              <div
                key={`col-${name}-${col}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: nodeColor + '88',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: 'monospace',
                    color: bodyText,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col}
                </span>
              </div>
            ))}
            {columns.length > 4 && (
              <p style={{ fontSize: 10, paddingLeft: 12, color: mutedText }}>
                +{columns.length - 4} more
              </p>
            )}
          </div>
        ) : (
          <p style={{ fontSize: 10, fontStyle: 'italic', color: mutedText }}>No columns detected</p>
        )}
      </div>
    </div>
  );
});

TableNode.displayName = 'TableNode';

export default TableNode;
