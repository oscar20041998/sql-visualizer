'use client';

import React, { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type EdgeProps,
} from 'reactflow';
import { useAppStore } from '@/lib/store';

const LabeledEdge = memo(function LabeledEdgeComponent(props: EdgeProps) {
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
  const theme = (data as { theme?: 'dark' | 'light' })?.theme ?? 'dark';
  const isLight = theme === 'light';
  const conditionBg = isLight ? 'rgba(248, 250, 252, 0.92)' : 'rgba(15, 23, 42, 0.9)';
  const conditionText = isLight ? '#334155' : '#cbd5e1';
  const joinLabel = (data as { joinLabel?: string })?.joinLabel ?? '';
  const onCondition = (data as { onCondition?: string })?.onCondition ?? '';
  const dimmed = (data as { dimmed?: boolean })?.dimmed ?? false;
  const isSimplified = (data as { isSimplified?: boolean })?.isSimplified ?? false;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={20}
        style={{
          stroke: color,
          strokeWidth: dimmed ? 1.5 : isSimplified ? 2 : 3,
          opacity: dimmed ? 0.25 : 1,
          filter: dimmed || isSimplified ? 'none' : `drop-shadow(0 0 4px ${color}88)`,
        }}
      />
      {!dimmed && !isSimplified && (
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
                  background: isLight ? `${color}1f` : `${color}26`,
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
                  background: conditionBg,
                  border: `1px solid ${color}44`,
                  color: conditionText,
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
});

LabeledEdge.displayName = 'LabeledEdge';

export default LabeledEdge;
