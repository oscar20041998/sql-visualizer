'use client';

import React, { useCallback, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
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
  type NodeTypes,
  type EdgeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useAppStore } from '@/lib/store';
import type { JoinType } from '@/lib/sqlAnalyzer';
import TableNode, { type TableNodeData } from './TableNode';
import LabeledEdge from './LabeledEdge';
import { JOIN_COLORS } from '@/app/common/colorConstant';

const CHART_BG = '#1a1f2e';
const CHART_DOT = '#2d3348';
const PERF_THRESHOLD = 50; // Enable simplified mode for 50+ nodes

function getTableColor(
  tableId: string,
  joins: { source: string; target: string; joinType: JoinType }[]
): string {
  const join = joins.find((j) => j.source === tableId || j.target === tableId);
  if (join) return JOIN_COLORS[join.joinType];
  return '#6ee7f7';
}

// ─── Node and Edge Type Definitions ────────────────────────────────────────
const nodeTypes: NodeTypes = {
  tableNode: TableNode as unknown as NodeTypes['tableNode'],
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

    // Enable simplified mode for large graphs (60+ nodes)
    const isPerformanceMode = tables.length >= PERF_THRESHOLD;

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
          isSimplified: isPerformanceMode,
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
            isSimplified: isPerformanceMode,
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

  // Memoize performance-related settings
  const isPerformanceMode = useMemo(() => {
    return (analysisResult?.tables.length ?? 0) >= PERF_THRESHOLD;
  }, [analysisResult?.tables.length]);

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
        elevateEdgesOnSelect={!isPerformanceMode} // Disable for performance
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
