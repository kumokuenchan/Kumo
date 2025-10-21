import { useState } from 'react';
import SchemaTree, { TreeNodeData } from './SchemaTree';
import SchemaDetailPanel from './SchemaDetailPanel';

interface SchemaExplorerProps {
  connectionId: string | null;
  onViewData?: (database: string, table: string) => void;
}

export default function SchemaExplorer({ connectionId, onViewData }: SchemaExplorerProps) {
  const [selectedNode, setSelectedNode] = useState<TreeNodeData | null>(null);
  const [showDetail, setShowDetail] = useState(true);

  const handleNodeSelect = (node: TreeNodeData) => {
    setSelectedNode(node);
    // Auto-show detail panel when a node is selected on mobile/small screens
    if (!showDetail) {
      setShowDetail(true);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Schema Explorer</h2>
        <button
          onClick={() => setShowDetail(!showDetail)}
          className="lg:hidden px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          {showDetail ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Main content area with split panes */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left pane: Schema tree */}
        <div
          className={`${
            showDetail ? 'hidden lg:block lg:w-80' : 'w-full'
          } bg-white border-r border-gray-200 flex-shrink-0 overflow-hidden`}
        >
          <SchemaTree
            connectionId={connectionId}
            onNodeSelect={handleNodeSelect}
            selectedNode={selectedNode}
            onViewData={onViewData}
          />
        </div>

        {/* Resize handle (visual only for now) */}
        {showDetail && (
          <div className="hidden lg:block w-1 bg-gray-200 hover:bg-blue-500 cursor-col-resize" />
        )}

        {/* Right pane: Detail panel */}
        {showDetail && (
          <div className="flex-1 overflow-hidden">
            <SchemaDetailPanel selectedNode={selectedNode} connectionId={connectionId} />
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-2 text-xs text-gray-600">
        {connectionId ? (
          selectedNode ? (
            <span>
              Selected: <span className="font-semibold">{selectedNode.name}</span> (
              {selectedNode.type})
            </span>
          ) : (
            <span>Select an object to view details</span>
          )
        ) : (
          <span>No connection active</span>
        )}
      </div>
    </div>
  );
}
