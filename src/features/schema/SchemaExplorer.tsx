import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import SchemaTree, { TreeNodeData } from './SchemaTree';
import SchemaDetailPanel from './SchemaDetailPanel';
import TableDesignerModal from './TableDesignerModal';
import ExportSchemaDialog from './ExportSchemaDialog';
import ShowCreateTableDialog from './ShowCreateTableDialog';
import DuplicateTableDialog from './DuplicateTableDialog';
import BackupRestoreDialog from './BackupRestoreDialog';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useDropTable, useRenameTable, useEmptyTable, useTruncateTable } from '../../hooks/useSchema';
import { aiApi } from '../../api/ai';

interface SchemaExplorerProps {
  connectionId: string | null;
  onViewData?: (database: string, table: string) => void;
  onGenerateQuery?: (database: string, table: string) => void;
  onTableRenamed?: (database: string, oldName: string, newName: string) => void;
}

export default function SchemaExplorer({ connectionId, onViewData, onGenerateQuery, onTableRenamed }: SchemaExplorerProps) {
  const queryClient = useQueryClient();

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
  const [emptyingTable, setEmptyingTable] = useState<{ database: string; table: string } | null>(null);
  const [truncatingTable, setTruncatingTable] = useState<{ database: string; table: string } | null>(null);
  const [renamingTable, setRenamingTable] = useState<{ database: string; table: string } | null>(null);
  const [backupRestoreDialog, setBackupRestoreDialog] = useState<{ type: 'backup' | 'restore'; database: string } | null>(null);
  const [duplicatingTable, setDuplicatingTable] = useState<{ database: string; table: string; includeData: boolean } | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [tableAnalysis, setTableAnalysis] = useState<{ database: string; table: string; analysis: string } | null>(null);
  const [isAnalyzingTable, setIsAnalyzingTable] = useState(false);

  // Get database name for hooks
  const dropMutation = useDropTable(
    connectionId || '',
    droppingTable?.database || ''
  );

  const renameMutation = useRenameTable(
    connectionId || '',
    renamingTable?.database || ''
  );

  const emptyMutation = useEmptyTable(
    connectionId || '',
    emptyingTable?.database || ''
  );

  const truncateMutation = useTruncateTable(
    connectionId || '',
    truncatingTable?.database || ''
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

  const handleDumpSQL = async (database: string, table: string) => {
    if (!connectionId) return;

    try {
      // Create a direct download link to the backend endpoint
      const url = `/api/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/dump?includeData=true`;

      // Create a temporary link element and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `${table}_dump.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      console.error('Failed to dump SQL:', error);
      alert('Failed to dump SQL file: ' + error.message);
    }
  };

  const handleEmptyTable = (database: string, table: string) => {
    setEmptyingTable({ database, table });
  };

  const handleTruncateTable = (database: string, table: string) => {
    setTruncatingTable({ database, table });
  };

  const handleRenameTable = (database: string, table: string) => {
    setRenamingTable({ database, table });
  };

  const handleDuplicateTable = (database: string, table: string, includeData: boolean) => {
    setDuplicatingTable({ database, table, includeData });
  };

  const handleAnalyzeTable = async (database: string, table: string) => {
    if (!connectionId) {
      alert('No active connection. Please connect to a database first.');
      return;
    }

    setIsAnalyzingTable(true);

    try {
      const requestPayload: any = {
        connectionId,
        database,
      };

      // Only include table if it's not empty (for database-level analysis)
      if (table && table.trim()) {
        requestPayload.table = table;
      }

      const response = await aiApi.analyzeSchema(requestPayload);

      setTableAnalysis({
        database,
        table: table || 'entire schema',
        analysis: response.analysis
      });

      } catch (error: any) {
      console.error('=== ANALYSIS ERROR ===');
      console.error('Error object:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);

      const errorMsg = error.response?.data?.details || error.response?.data?.error || error.message || 'Unknown error';
      const analysisType = table ? 'table' : 'schema';
      alert(`Failed to analyze ${analysisType}: ` + errorMsg);
    } finally {
      setIsAnalyzingTable(false);
    }
  };

  const handleConfirmDuplicateTable = async (newTableName: string) => {
    if (!connectionId || !duplicatingTable) return;

    setIsDuplicating(true);

    try {
      const response = await fetch(
        `/api/schema/${connectionId}/databases/${encodeURIComponent(duplicatingTable.database)}/tables/${encodeURIComponent(duplicatingTable.table)}/duplicate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newTableName, includeData: duplicatingTable.includeData }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to duplicate table');
      }

      // Invalidate the tables cache to trigger a refetch
      queryClient.invalidateQueries({
        queryKey: ['tables', connectionId, duplicatingTable.database]
      });

      // Close dialog and refresh the schema tree
      setDuplicatingTable(null);
      handleTableUpdated();
    } catch (error: any) {
      console.error('Failed to duplicate table:', error);
      alert('Failed to duplicate table: ' + error.message);
    } finally {
      setIsDuplicating(false);
    }
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
    <div className="h-full flex flex-col bg-gray-50">
      {/* Main content area with split panes */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left pane: Schema tree */}
        <div
          className={`${
            showDetail ? 'hidden lg:block lg:w-80' : 'w-full'
          } bg-white flex-shrink-0 overflow-hidden`}
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
            onDumpSQL={handleDumpSQL}
            onEmptyTable={handleEmptyTable}
            onTruncateTable={handleTruncateTable}
            onRenameTable={handleRenameTable}
            onDuplicateTable={handleDuplicateTable}
            onBackupDatabase={(database) => setBackupRestoreDialog({ type: 'backup', database })}
            onRestoreDatabase={(database) => setBackupRestoreDialog({ type: 'restore', database })}
            onAnalyzeTable={handleAnalyzeTable}
            key={refreshKey}
          />
        </div>

        {/* Resize handle */}
        {showDetail && (
          <div className="hidden lg:block w-px bg-gray-200 hover:bg-gray-300 cursor-col-resize transition-colors" />
        )}

        {/* Right pane: Detail panel */}
        {showDetail && (
          <div className="flex-1 overflow-hidden">
            <SchemaDetailPanel
              selectedNode={selectedNode}
              connectionId={connectionId}
              onTableUpdated={handleTableUpdated}
              onExportSchema={handleExportSchema}
            />
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="bg-white border-t border-gray-200 px-6 py-2.5 text-sm text-gray-600 flex items-center justify-between">
        <span>0 databases</span>
        <span className="text-gray-500">{selectedNode ? `Selected: ${selectedNode.name}` : 'Select an object to view details'}</span>
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

      {/* Empty Table Confirmation Dialog */}
      {emptyingTable && (
        <ConfirmDialog
          isOpen={true}
          title="Empty Table"
          message={`Are you sure you want to empty the table "${emptyingTable.table}"? This will delete all data from the table but keep the table structure. This action cannot be undone.`}
          confirmLabel="Empty Table"
          cancelLabel="Cancel"
          onConfirm={async () => {
            try {
              await emptyMutation.mutateAsync({ table: emptyingTable.table });
              setEmptyingTable(null);
              handleTableUpdated();
            } catch (error: any) {
              console.error('Failed to empty table:', error);
            }
          }}
          onCancel={() => setEmptyingTable(null)}
          isLoading={emptyMutation.isPending}
        />
      )}

      {/* Truncate Table Confirmation Dialog */}
      {truncatingTable && (
        <ConfirmDialog
          isOpen={true}
          title="Truncate Table"
          message={`Are you sure you want to truncate the table "${truncatingTable.table}"? This will quickly delete all data from the table and reset AUTO_INCREMENT counters. This action cannot be undone.`}
          confirmLabel="Truncate Table"
          cancelLabel="Cancel"
          onConfirm={async () => {
            try {
              await truncateMutation.mutateAsync({ table: truncatingTable.table });
              setTruncatingTable(null);
              handleTableUpdated();
            } catch (error: any) {
              console.error('Failed to truncate table:', error);
            }
          }}
          onCancel={() => setTruncatingTable(null)}
          isLoading={truncateMutation.isPending}
        />
      )}

      {/* Rename Table Dialog */}
      {renamingTable && (
        <RenameTableDialog
          currentName={renamingTable.table}
          onRename={async (newName) => {
            try {
              const oldName = renamingTable.table;
              const database = renamingTable.database;

              await renameMutation.mutateAsync({ table: oldName, newName });

              // Update selected node if it was the renamed table
              if (selectedNode?.type === 'table' && selectedNode?.name === oldName) {
                setSelectedNode({
                  ...selectedNode,
                  name: newName,
                });
              }

              // Notify parent component about the rename
              onTableRenamed?.(database, oldName, newName);

              setRenamingTable(null);
              handleTableUpdated();
            } catch (error: any) {
              console.error('Failed to rename table:', error);
            }
          }}
          onCancel={() => setRenamingTable(null)}
          isLoading={renameMutation.isPending}
        />
      )}

      {/* Backup/Restore Database Dialog */}
      {backupRestoreDialog && connectionId && (
        <BackupRestoreDialog
          type={backupRestoreDialog.type}
          database={backupRestoreDialog.database}
          connectionId={connectionId}
          onClose={() => setBackupRestoreDialog(null)}
          onSuccess={() => {
            handleTableUpdated();
          }}
        />
      )}

      {/* Duplicate Table Dialog */}
      {duplicatingTable && (
        <DuplicateTableDialog
          isOpen={true}
          currentTableName={duplicatingTable.table}
          includeData={duplicatingTable.includeData}
          onConfirm={handleConfirmDuplicateTable}
          onCancel={() => setDuplicatingTable(null)}
          isLoading={isDuplicating}
        />
      )}

      {/* Table Analysis Dialog */}
      {(() => null)()}
      {(tableAnalysis || isAnalyzingTable) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Table Analysis</h2>
                  {tableAnalysis && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {tableAnalysis.database}.{tableAnalysis.table}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setTableAnalysis(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={isAnalyzingTable}
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isAnalyzingTable ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 dark:border-orange-400 mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Analyzing table...</p>
                </div>
              ) : tableAnalysis ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">
                    {tableAnalysis.analysis}
                  </pre>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setTableAnalysis(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                disabled={isAnalyzingTable}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Rename Table Dialog Component
function RenameTableDialog({
  currentName,
  onRename,
  onCancel,
  isLoading = false,
}: {
  currentName: string;
  onRename: (newName: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  const [newName, setNewName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus and select the text when dialog opens
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName && newName !== currentName) {
      onRename(newName);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Rename Table</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current name: <span className="font-mono text-blue-600">{currentName}</span>
            </label>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New name:
            </label>
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter new table name"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onCancel();
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newName || newName === currentName || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Renaming...' : 'Rename'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
