'use client';

import React, { useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  EdgeLabelRenderer,
  BaseEdge,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type EdgeProps,
  type NodeTypes,
  type EdgeTypes,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useAppStore } from '@/lib/store';
import type { JoinType, TableNode } from '@/lib/sqlAnalyzer';
import { Table2 } from 'lucide-react';

export const JOIN_COLORS: Record<JoinType, string> = {
  'LEFT JOIN': '#f59e0b',
  'RIGHT JOIN': '#10b981',
  'INNER JOIN': '#6366f1',
  'FULL OUTER JOIN': '#ec4899',
  'CROSS JOIN': '#ef4444',
  'NATURAL JOIN': '#8b5cf6',
};

const CHART_BG = '#1a1f2e';
const CHART_DOT = '#2d3348';

function getTableColor(
  tableId: string,
  joins: { source: string; target: string; joinType: JoinType }[]
): string {
  const join = joins.find((j) => j.source === tableId || j.target === tableId);
  if (join) return JOIN_COLORS[join.joinType];
  return '#6ee7f7';
}

// ─── Custom Labeled Edge ──────────────────────────────────────────────────────
function LabeledEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    markerEnd,
  } = props;

  const edgeStyle = useAppStore((s) => s.settings.edgeStyle);

  let edgePath = '';
  let labelX = 0;
  let labelY = 0;

  if (edgeStyle === 'straight') {
    [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  } else if (edgeStyle === 'step') {
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
  } else {
    [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
  }

  const color = (data as { color?: string })?.color ?? '#6ee7f7';
  const joinLabel = (data as { joinLabel?: string })?.joinLabel ?? '';
  const onCondition = (data as { onCondition?: string })?.onCondition ?? '';
  const dimmed = (data as { dimmed?: boolean })?.dimmed ?? false;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={20}
        style={{
          stroke: color,
          strokeWidth: dimmed ? 1.5 : 3,
          opacity: dimmed ? 0.25 : 1,
          filter: dimmed ? 'none' : `drop-shadow(0 0 4px ${color}88)`,
        }}
      />
      {!dimmed && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            {joinLabel && (
              <div
                style={{
                  background: `${color}22`,
                  border: `1.5px solid ${color}`,
                  color: color,
                  fontSize: 9,
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 4,
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.04em',
                  backdropFilter: 'blur(4px)',
                  boxShadow: `0 0 8px ${color}44`,
                }}
              >
                {joinLabel}
              </div>
            )}
            {onCondition && (
              <div
                style={{
                  background: 'rgba(15, 18, 30, 0.88)',
                  border: `1px solid ${color}44`,
                  color: '#a0aec0',
                  fontSize: 8,
                  fontFamily: 'monospace',
                  fontWeight: 500,
                  padding: '1px 6px',
                  borderRadius: 3,
                  whiteSpace: 'nowrap',
                  maxWidth: 180,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  backdropFilter: 'blur(4px)',
                }}
                title={`ON ${onCondition}`}
              >
                ON {onCondition.length > 28 ? onCondition.slice(0, 28) + '…' : onCondition}
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// ─── Custom Table Node ────────────────────────────────────────────────────────
interface TableNodeData extends TableNode {
  isHighlighted: boolean;
  isSelected: boolean;
  nodeColor: string;
}

function TableNodeComponent({ data }: { data: TableNodeData }) {
  const { name, alias, columns, isCTE, isHighlighted, isSelected, nodeColor } = data;
  const tableType = isCTE ? 'CTE' : 'TABLE';
  const totalFields = columns.length;

  return (
    <div
      style={{
        background: '#1e2435',
        border: `2px solid ${isSelected ? nodeColor : isHighlighted ? nodeColor + 'cc' : nodeColor + '66'}`,
        boxShadow: isSelected
          ? `0 0 20px ${nodeColor}99, 0 2px 8px rgba(0,0,0,0.6)`
          : isHighlighted
            ? `0 0 10px ${nodeColor}55`
            : '0 2px 6px rgba(0,0,0,0.5)',
        opacity: isHighlighted ? 1 : 0.6,
        borderRadius: 12,
        minWidth: 170,
        maxWidth: 230,
        overflow: 'visible',
        position: 'relative',
      }}
    >
      {/* ReactFlow connection handles — invisible but required for edge routing */}
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
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#8b9ab5' }}>
          {totalFields} field{totalFields !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Columns */}
      <div style={{ padding: '8px 12px' }}>
        {alias && (
          <p style={{ fontSize: 10, fontFamily: 'monospace', color: '#8b9ab5', marginBottom: 4 }}>
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
                    color: '#8b9ab5',
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
              <p style={{ fontSize: 10, paddingLeft: 12, color: '#5a6a85' }}>
                +{columns.length - 4} more
              </p>
            )}
          </div>
        ) : (
          <p style={{ fontSize: 10, fontStyle: 'italic', color: '#5a6a85' }}>No columns detected</p>
        )}
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  tableNode: TableNodeComponent as unknown as NodeTypes['tableNode'],
};

const edgeTypes: EdgeTypes = {
  labeled: LabeledEdge,
};

// ─── Layout helper ────────────────────────────────────────────────────────────
function computeLayout(count: number): { x: number; y: number }[] {
  const cols = Math.max(2, Math.ceil(Math.sqrt(count)));
  return Array.from({ length: count }, (_, i) => ({
    x: (i % cols) * 380 + 80,
    y: Math.floor(i / cols) * 320 + 80,
  }));
}

export interface FlowCanvasHandle {
  getNodes: () => Node[];
  getEdges: () => Edge[];
}

const FlowCanvas = forwardRef<FlowCanvasHandle>((_, ref) => {
  const { analysisResult, selectedNodeId, setSelectedNodeId, settings } = useAppStore();
  const [nodes, setNodes, onNodesChange] = useNodesState<TableNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useImperativeHandle(ref, () => ({
    getNodes: () => nodes,
    getEdges: () => edges,
  }));

  useEffect(() => {
    if (!analysisResult) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const { tables, joins } = analysisResult;
    const positions = computeLayout(tables.length);

    // Build nodes
    const rfNodes: Node<TableNodeData>[] = tables.map((table, i) => {
      const nodeColor = getTableColor(table.id, joins);
      const isHighlighted =
        selectedNodeId === null ||
        selectedNodeId === table.id ||
        joins.some(
          (j) =>
            (j.source === selectedNodeId && j.target === table.id) ||
            (j.target === selectedNodeId && j.source === table.id)
        );
      return {
        id: table.id,
        type: 'tableNode',
        position: positions[i],
        data: {
          ...table,
          nodeColor,
          isHighlighted,
          isSelected: selectedNodeId === table.id,
        },
      };
    });

    // Build edges
    const rfEdges: Edge[] = joins
      .map((join, idx) => {
        const color = JOIN_COLORS[join.joinType] ?? '#6ee7f7';
        const isConnected =
          selectedNodeId === null ||
          selectedNodeId === join.source ||
          selectedNodeId === join.target;
        const dimmed = selectedNodeId !== null && !isConnected;

        const sourceExists = tables.some((t) => t.id === join.source);
        const targetExists = tables.some((t) => t.id === join.target);
        if (!sourceExists || !targetExists) return null;

        return {
          id: `edge-${idx}-${join.source}-${join.target}`,
          source: join.source,
          target: join.target,
          type: 'labeled',
          data: {
            color,
            joinLabel: join.joinType,
            onCondition: join.condition ?? '',
            dimmed,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color,
            width: 18,
            height: 18,
          },
          style: {
            stroke: color,
            strokeWidth: 3,
          },
          zIndex: dimmed ? 0 : 10,
        } as Edge;
      })
      .filter(Boolean) as Edge[];

    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [analysisResult, selectedNodeId, settings.edgeStyle, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
    },
    [selectedNodeId, setSelectedNodeId]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  return (
    <div className="w-full h-full" style={{ background: CHART_BG }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2.5}
        attributionPosition="bottom-left"
        elevateEdgesOnSelect
        defaultEdgeOptions={{
          style: { strokeWidth: 3 },
        }}
        style={{ background: CHART_BG }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color={CHART_DOT}
          style={{ background: CHART_BG }}
        />
        <Controls
          showInteractive={false}
          style={{
            background: '#1e2435',
            border: '1px solid #2d3348',
            borderRadius: 8,
          }}
        />
        <MiniMap
          nodeColor={(node) => (node.data as TableNodeData)?.nodeColor ?? '#6ee7f7'}
          maskColor="rgba(26, 31, 46, 0.75)"
          style={{
            borderRadius: 8,
            background: '#1e2435',
            border: '1px solid #2d3348',
          }}
        />
      </ReactFlow>
    </div>
  );
});

FlowCanvas.displayName = 'FlowCanvas';

export default FlowCanvas;
