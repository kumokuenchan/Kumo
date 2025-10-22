import { useState } from 'react';
import { useSavedQueries, useDeleteSavedQuery, useUpdateSavedQuery } from '../../hooks/useSavedQueries';
import type { SavedQueryEntry } from '../../api/savedQueries';
import ConfirmDialog from '../../components/ConfirmDialog';
import SaveQueryModal from '../../components/SaveQueryModal';

interface SavedQueriesPanelProps {
  connectionId: string;
  onSelectQuery: (sql: string) => void;
}

export default function SavedQueriesPanel({ connectionId, onSelectQuery }: SavedQueriesPanelProps) {
  const [search, setSearch] = useState('');
  const { data: saved = [], isLoading } = useSavedQueries(connectionId, search);
  const del = useDeleteSavedQuery();
  const upd = useUpdateSavedQuery();
  const [deleteTarget, setDeleteTarget] = useState<SavedQueryEntry | null>(null);
  const [renameTarget, setRenameTarget] = useState<SavedQueryEntry | null>(null);

  const handleDelete = (entry: SavedQueryEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(entry);
  };

  const handleRename = (entry: SavedQueryEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameTarget(entry);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Saved Queries</h3>
        </div>
        <input
          type="text"
          placeholder="Search saved queries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : saved.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">No saved queries</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {saved.map((entry) => (
              <div
                key={entry.id}
                className="p-3 hover:bg-gray-50 cursor-pointer group"
                onClick={() => onSelectQuery(entry.sql)}
                title={entry.database ? `DB: ${entry.database}` : ''}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="font-medium text-sm text-gray-800 truncate">{entry.name}</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleRename(entry, e)}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-gray-800"
                      title="Rename"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => handleDelete(entry, e)}
                      className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                    </button>
                  </div>
                </div>
                <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap break-words max-h-24 overflow-hidden">{entry.sql}</pre>
                <div className="mt-1 text-[11px] text-gray-500">Updated {new Date(entry.updatedAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Saved Query"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await del.mutateAsync({ id: deleteTarget.id, connectionId });
          setDeleteTarget(null);
        }}
        isLoading={del.isPending}
      />

      {/* Rename Modal (reuse SaveQueryModal for name editing) */}
      <SaveQueryModal
        isOpen={!!renameTarget}
        defaultName={renameTarget?.name || 'My Query'}
        sqlPreview={undefined}
        onCancel={() => setRenameTarget(null)}
        isLoading={upd.isPending}
        onSubmit={async (newName) => {
          if (!renameTarget) return;
          await upd.mutateAsync({ id: renameTarget.id, patch: { name: newName }, connectionId });
          setRenameTarget(null);
        }}
      />
    </div>
  );
}
