import { useState, useEffect } from 'react';
import SchemaTree, { TreeNodeData } from './SchemaTree';
import SchemaDetailPanel from './SchemaDetailPanel';
import TableDesignerModal from './TableDesignerModal';
import ExportSchemaDialog from './ExportSchemaDialog';
import ShowCreateTableDialog from './ShowCreateTableDialog';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useDropTable } from '../../hooks/useSchema';

interface SchemaExplorerProps {
  connectionId: string | null;
  onViewData?: (database: string, table: string) => void;
  onGenerateQuery?: (database: string, table: string) => void;
}

export default function SchemaExplorer({ connectionId, onViewData, onGenerateQuery }: SchemaExplorerProps) {
  const [selectedNode, setSelectedNode] = useState<TreeNodeData | null>(() => {
    try {
      const saved = localStorage.getItem('schemaExplorer_selectedNode');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showDetail, setShowDetail] = useState(() => {
    try {
      const saved = localStorage.getItem('schemaExplorer_showDetail');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [showTableDesigner, setShowTableDesigner] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [editingTable, setEditingTable] = useState<{ database: string; table: string } | null>(null);
  const [droppingTable, setDroppingTable] = useState<{ database: string; table: string } | null>(null);
  const [showCreateTable, setShowCreateTable] = useState<{ database: string; table: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Get database name from droppingTable for useDropTable hook
  const dropMutation = useDropTable(
    connectionId || '',
    droppingTable?.database || ''
  );

  // Persist selected node to localStorage
  useEffect(() => {
    try {
      if (selectedNode) {
        localStorage.setItem('schemaExplorer_selectedNode', JSON.stringify(selectedNode));
      } else {
        localStorage.removeItem('schemaExplorer_selectedNode');
      }
    } catch (error) {
      console.error('Failed to save selected node:', error);
    }
  }, [selectedNode]);

  // Persist showDetail state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('schemaExplorer_showDetail', JSON.stringify(showDetail));
    } catch (error) {
      console.error('Failed to save showDetail state:', error);
    }
  }, [showDetail]);

  const handleNodeSelect = (node: TreeNodeData) => {
    setSelectedNode(node);
    // Auto-show detail panel when a node is selected on mobile/small screens
    if (!showDetail) {
      setShowDetail(true);
    }
  };

  const handleCreateTable = (database?: string) => {
    const dbName = database || (selectedNode?.type === 'database' ? selectedNode.name : null);
    if (dbName) {
      setEditingTable(null); // Ensure we're in create mode
      setShowTableDesigner(true);
    }
  };

  const handleEditTable = (database: string, table: string) => {
    setEditingTable({ database, table });
    setShowTableDesigner(true);
  };

  const handleDropTable = (database: string, table: string) => {
    setDroppingTable({ database, table });
  };

  const handleExportSchema = (database?: string, table?: string) => {
    setShowExportDialog(true);
  };

  const handleShowCreateTable = (database: string, table: string) => {
    setShowCreateTable({ database, table });
  };

  const handleTableUpdated = () => {
    // Trigger a refresh by incrementing the refresh key
    setRefreshKey((prev) => prev + 1);
  };

  const handleConfirmDropTable = async () => {
    if (!droppingTable) return;

    try {
      await dropMutation.mutateAsync({
        table: droppingTable.table,
        checkDependencies: true,
      });
      setDroppingTable(null);
      // Refresh schema tree or show success message
    } catch (error: any) {
      // Error will be shown by the mutation
      console.error('Failed to drop table:', error);
    }
  };

  // Extract database and table from selected node
  const getNodeInfo = () => {
    if (!selectedNode) return { database: null, table: null };

    if (selectedNode.type === 'database') {
      return { database: selectedNode.name, table: undefined };
    } else if (selectedNode.type === 'table') {
      // Extract database name from parent or id
      const dbName = selectedNode.parent || selectedNode.id.split(':')[1];
      return { database: dbName, table: selectedNode.name };
    }
    return { database: null, table: null };
  };

  const { database, table } = getNodeInfo();

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Schema Explorer</h2>
        <div className="flex items-center gap-2">
          {selectedNode?.type === 'database' && (
            <button
              onClick={handleCreateTable}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition flex items-center gap-1"
              title="Create New Table"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Table
            </button>
          )}
          {(selectedNode?.type === 'database' || selectedNode?.type === 'table') && (
            <button
              onClick={handleExportSchema}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition flex items-center gap-1"
              title="Export Schema"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export
            </button>
          )}
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="lg:hidden px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            {showDetail ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
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
            onCreateTable={handleCreateTable}
            onEditTable={handleEditTable}
            onDropTable={handleDropTable}
            onExportSchema={handleExportSchema}
            onShowCreateTable={handleShowCreateTable}
            onGenerateQuery={onGenerateQuery}
            key={refreshKey}
          />
        </div>

        {/* Resize handle (visual only for now) */}
        {showDetail && (
          <div className="hidden lg:block w-1 bg-gray-200 hover:bg-blue-500 cursor-col-resize" />
        )}

        {/* Right pane: Detail panel */}
        {showDetail && (
          <div className="flex-1 overflow-hidden">
            <SchemaDetailPanel
              selectedNode={selectedNode}
              connectionId={connectionId}
              onTableUpdated={handleTableUpdated}
            />
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-2 text-xs text-gray-500 flex items-center justify-between">
        <span>0 databases</span>
        <span>{selectedNode ? `Selected: ${selectedNode.name}` : 'Select an object to view details'}</span>
      </div>

      {/* Modals */}
      {connectionId && database && (
        <>
          <TableDesignerModal
            connectionId={connectionId}
            database={editingTable?.database || database}
            isOpen={showTableDesigner}
            onClose={() => {
              setShowTableDesigner(false);
              setEditingTable(null);
            }}
            onSuccess={() => {
              // Refresh the schema tree or show success message
              console.log('Table created/updated successfully');
              setEditingTable(null);
            }}
            editMode={editingTable ? { table: editingTable.table } : undefined}
          />
          <ExportSchemaDialog
            connectionId={connectionId}
            database={database}
            table={table}
            isOpen={showExportDialog}
            onClose={() => setShowExportDialog(false)}
          />
        </>
      )}

      {/* Drop Table Confirmation Dialog */}
      {droppingTable && (
        <ConfirmDialog
          isOpen={true}
          title="Drop Table"
          message={`Are you sure you want to drop the table "${droppingTable.table}"? This action cannot be undone.`}
          confirmLabel="Drop Table"
          cancelLabel="Cancel"
          onConfirm={handleConfirmDropTable}
          onCancel={() => setDroppingTable(null)}
          isLoading={dropMutation.isPending}
        />
      )}

      {/* Show CREATE TABLE Dialog */}
      {showCreateTable && connectionId && (
        <ShowCreateTableDialog
          connectionId={connectionId}
          database={showCreateTable.database}
          table={showCreateTable.table}
          isOpen={true}
          onClose={() => setShowCreateTable(null)}
        />
      )}
    </div>
  );
}
