import { memo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react';
import type { JoinType } from '../../types/queryBuilder';

export interface JoinEdgeData {
  joinType: JoinType;
  onJoinTypeChange: (newType: JoinType) => void;
  onRemove: () => void;
}

const joinTypes: JoinType[] = ['INNER', 'LEFT', 'RIGHT', 'FULL OUTER', 'CROSS'];

const joinTypeColors: Record<JoinType, string> = {
  'INNER': '#3b82f6',      // blue
  'LEFT': '#10b981',       // green
  'RIGHT': '#f59e0b',      // yellow
  'FULL OUTER': '#8b5cf6', // purple
  'CROSS': '#ef4444',      // red
};

function JoinEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<JoinEdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const joinType = data?.joinType || 'INNER';
  const strokeColor = joinTypeColors[joinType];

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          strokeWidth: 2,
          stroke: strokeColor,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div className="bg-white border-2 rounded shadow-lg flex items-center gap-1 p-1"
               style={{ borderColor: strokeColor }}>
            {/* JOIN Type Selector */}
            <select
              value={joinType}
              onChange={(e) => data?.onJoinTypeChange(e.target.value as JoinType)}
              className="text-xs font-semibold border-0 px-2 py-1 rounded cursor-pointer"
              style={{ color: strokeColor }}
            >
              {joinTypes.map((type) => (
                <option key={type} value={type}>
                  {type} JOIN
                </option>
              ))}
            </select>

            {/* Remove Button */}
            <button
              onClick={() => data?.onRemove()}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-100 text-red-600 font-bold text-xs"
              title="Remove JOIN"
            >
              ×
            </button>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(JoinEdge);
