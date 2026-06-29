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
import type { JoinType, JoinEdge, TableNode as SqlTableNode } from '@/lib/sqlAnalyzer';
import TableNode, { type TableNodeData } from './TableNode';
import LabeledEdge from './LabeledEdge';
import { getJoinColor } from '@/app/common/colorConstant';

const CHART_BG_DARK = '#0f172a';
const CHART_BG_LIGHT = '#f8fafc';
const CHART_DOT_DARK = '#334155';
const CHART_DOT_LIGHT = '#cbd5e1';
const PERF_THRESHOLD = 50; // Enable simplified mode for 50+ nodes

function getTableColor(
  tableId: string,
  joins: { source: string; target: string; joinType: JoinType }[],
  theme: 'dark' | 'light'
): string {
  const join = joins.find((j) => j.source === tableId || j.target === tableId);
  if (join) return getJoinColor(join.joinType, theme);
  return theme === 'light' ? '#0f766e' : '#22d3ee';
}

// ─── Node and Edge Type Definitions ────────────────────────────────────────
const nodeTypes: NodeTypes = {
  tableNode: TableNode as unknown as NodeTypes['tableNode'],
};

const edgeTypes: EdgeTypes = {
  labeled: LabeledEdge,
};

// ─── Layout helper ────────────────────────────────────────────────────────────
function computeLayout(
  tables: SqlTableNode[],
  joins: JoinEdge[]
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>();
  if (tables.length === 0) return result;

  const connectedIds = new Set<string>();
  joins.forEach((join) => {
    connectedIds.add(join.source);
    connectedIds.add(join.target);
  });

  const connected = tables.filter((table) => connectedIds.has(table.id));
  const isolated = tables.filter((table) => !connectedIds.has(table.id));

  const xGap = 380;
  const yGap = 320;
  const left = 80;
  const top = 80;

  const connectedCols = Math.max(2, Math.ceil(Math.sqrt(Math.max(connected.length, 1))));
  connected.forEach((table, idx) => {
    result.set(table.id, {
      x: (idx % connectedCols) * xGap + left,
      y: Math.floor(idx / connectedCols) * yGap + top,
    });
  });

  const connectedRows = connected.length === 0 ? 0 : Math.ceil(connected.length / connectedCols);
  const isolatedStartY = top + connectedRows * yGap + (connected.length > 0 ? 180 : 0);
  const isolatedCols = Math.max(2, Math.ceil(Math.sqrt(Math.max(isolated.length, 1))));

  isolated.forEach((table, idx) => {
    result.set(table.id, {
      x: (idx % isolatedCols) * xGap + left,
      y: isolatedStartY + Math.floor(idx / isolatedCols) * yGap,
    });
  });

  return result;
}

export interface FlowCanvasHandle {
  getNodes: () => Node[];
  getEdges: () => Edge[];
}

interface FlowCanvasProps {
  tables?: SqlTableNode[];
  joins?: JoinEdge[];
}

const FlowCanvas = forwardRef<FlowCanvasHandle, FlowCanvasProps>(({ tables, joins }, ref) => {
  const { analysisResult, selectedNodeId, setSelectedNodeId, settings } = useAppStore();
  const [nodes, setNodes, onNodesChange] = useNodesState<TableNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const graphTheme = settings.theme === 'light' ? 'light' : 'dark';
  const chartBg = graphTheme === 'light' ? CHART_BG_LIGHT : CHART_BG_DARK;
  const chartDot = graphTheme === 'light' ? CHART_DOT_LIGHT : CHART_DOT_DARK;

  const graphTables = tables ?? analysisResult?.tables ?? [];
  const graphJoins = joins ?? analysisResult?.joins ?? [];

  useImperativeHandle(ref, () => ({
    getNodes: () => nodes,
    getEdges: () => edges,
  }));

  useEffect(() => {
    if (!analysisResult && !tables && !joins) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const positions = computeLayout(graphTables, graphJoins);

    // Enable simplified mode for large graphs (60+ nodes)
    const isPerformanceMode = graphTables.length >= PERF_THRESHOLD;

    // Build nodes
    const rfNodes: Node<TableNodeData>[] = graphTables.map((table, i) => {
      const nodeColor = getTableColor(table.id, graphJoins, graphTheme);
      const isHighlighted =
        selectedNodeId === null ||
        selectedNodeId === table.id ||
        graphJoins.some(
          (j) =>
            (j.source === selectedNodeId && j.target === table.id) ||
            (j.target === selectedNodeId && j.source === table.id)
        );
      return {
        id: table.id,
        type: 'tableNode',
        position: positions.get(table.id) ?? { x: 80 + i * 120, y: 80 },
        data: {
          ...table,
          nodeColor,
          theme: graphTheme,
          isHighlighted,
          isSelected: selectedNodeId === table.id,
          isSimplified: isPerformanceMode,
        },
      };
    });

    // Build edges
    const rfEdges: Edge[] = graphJoins
      .map((join, idx) => {
        const color = getJoinColor(join.joinType, graphTheme);
        const isConnected =
          selectedNodeId === null ||
          selectedNodeId === join.source ||
          selectedNodeId === join.target;
        const dimmed = selectedNodeId !== null && !isConnected;

        const sourceExists = graphTables.some((t) => t.id === join.source);
        const targetExists = graphTables.some((t) => t.id === join.target);
        if (!sourceExists || !targetExists) return null;

        return {
          id: `edge-${idx}-${join.source}-${join.target}`,
          source: join.source,
          target: join.target,
          type: 'labeled',
          data: {
            color,
            theme: graphTheme,
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
  }, [
    analysisResult,
    graphTables,
    graphJoins,
    tables,
    joins,
    selectedNodeId,
    graphTheme,
    settings.edgeStyle,
    setNodes,
    setEdges,
  ]);

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
    return graphTables.length >= PERF_THRESHOLD;
  }, [graphTables.length]);

  return (
    <div className="w-full h-full" style={{ background: chartBg }}>
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
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        attributionPosition="bottom-left"
        elevateEdgesOnSelect={!isPerformanceMode} // Disable for performance
        defaultEdgeOptions={{
          style: { strokeWidth: 3 },
        }}
        style={{ background: chartBg }}
      >
        <Background
          variant={settings.theme === 'dark' ? BackgroundVariant.Lines : BackgroundVariant.Cross}
          gap={24}
          size={1.5}
          color={chartDot}
          style={{ background: chartBg }}
        />
        <Controls
          showInteractive={false}
          style={{
            background: settings.theme === 'dark' ? '#1e2435' : '#f0f0f0',
            border: `1px solid ${settings.theme === 'dark' ? '#2d3348' : '#d0d0d0'}`,
            borderRadius: 8,
          }}
        />
        <MiniMap
          nodeColor={(node) => (node.data as TableNodeData)?.nodeColor ?? '#6ee7f7'}
          maskColor="rgba(26, 31, 46, 0.75)"
          style={{
            borderRadius: 8,
            background: settings.theme === 'dark' ? '#1e2435' : '#f0f0f0',
            border: `1px solid ${settings.theme === 'dark' ? '#2d3348' : '#d0d0d0'}`,
          }}
        />
      </ReactFlow>
    </div>
  );
});

FlowCanvas.displayName = 'FlowCanvas';

export default FlowCanvas;
