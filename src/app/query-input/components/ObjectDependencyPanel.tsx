'use client';

import React, { useState } from 'react';
import { Background, Controls, MarkerType, ReactFlow, type Edge, type Node } from 'reactflow';
import 'reactflow/dist/style.css';
import {
  dependencyEdges,
  hasDependencyCycle,
  reverseImpact,
  type SessionObject,
} from '@/lib/sql/objectIntelligenceDependencies';
import type { Translations } from '@/lib/i18n';

export function ObjectDependencyPanel({ views, t }: { views: SessionObject[]; t: Translations }) {
  const [selected, setSelected] = useState<string | null>(null);
  const dependencies = dependencyEdges(views);
  const impact = selected ? reverseImpact(dependencies, selected) : [];
  const nodes: Node[] = views.map((view, index) => ({
    id: view.id,
    data: { label: `${view.schema}.${view.name}` },
    position: { x: (index % 3) * 220, y: Math.floor(index / 3) * 130 },
  }));
  for (const edge of dependencies) {
    if (!edge.resolved && !nodes.some((node) => node.id === edge.target)) {
      const index = nodes.length;
      nodes.push({
        id: edge.target,
        data: { label: `${edge.reference} (${t.objectUnresolved})` },
        position: { x: (index % 3) * 220, y: Math.floor(index / 3) * 130 },
      });
    }
  }
  const edges: Edge[] = dependencies.map((edge, index) => ({
    id: `${edge.source}:${edge.target}:${index}`,
    source: edge.source,
    target: edge.target,
    label: edge.assumed
      ? `${t.objectDependencyRead} — ${t.objectDefaultSchemaAssumption}`
      : t.objectDependencyRead,
    markerEnd: { type: MarkerType.ArrowClosed },
    ...(edge.resolved ? {} : { style: { strokeDasharray: '5 5' } }),
  }));
  return (
    <section aria-label={t.objectDependencies} className="space-y-3">
      <h3 className="font-medium">{t.objectDependencies}</h3>
      <p className="text-muted-foreground">{t.objectDependenciesPartial}</p>
      {views.some((view) => view.assumedSchema || view.assumedReferences?.length) && (
        <p className="text-muted-foreground">{t.objectDefaultSchemaNotice}</p>
      )}
      {hasDependencyCycle(dependencies) && <p role="status">{t.objectDependencyCycle}</p>}
      <div className="h-72 rounded-md border border-border">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
      <h4 className="font-medium">{t.objectDependencyList}</h4>
      {dependencies.length ? (
        <ul className="space-y-1">
          {dependencies.map((edge) => (
            <li key={`${edge.source}:${edge.target}`}>
              {edge.label} ({t.objectDependencyRead})
              {edge.assumed ? ` — ${t.objectDefaultSchemaAssumption}` : ''}
              {edge.resolved ? '' : ` — ${t.objectUnresolved}`}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">{t.objectNoDependencies}</p>
      )}
      <h4 className="font-medium">{t.objectImpact}</h4>
      <div className="flex flex-wrap gap-2">
        {views.map((view) => (
          <button
            type="button"
            key={view.id}
            className="min-h-11 rounded-md border border-border px-3"
            aria-pressed={selected === view.id}
            onClick={() => setSelected(view.id)}
          >
            {t.objectImpactOf} {view.schema}.{view.name}
          </button>
        ))}
      </div>
      {selected &&
        (impact.length ? (
          <ul>
            {impact.map((entry) => {
              const view = views.find((item) => item.id === entry.id);
              return view ? (
                <li key={entry.id}>
                  {view.schema}.{view.name} —{' '}
                  {entry.depth === 1
                    ? t.objectDirectDependent
                    : `${t.objectTransitiveDependent} ${entry.depth}`}
                </li>
              ) : null;
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground">{t.objectNoImpact}</p>
        ))}
    </section>
  );
}
