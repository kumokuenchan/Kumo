import { useRef, useState } from 'react';
import { useSavedQueries, useDeleteSavedQuery, useUpdateSavedQuery } from '../../hooks/useSavedQueries';
import type { SavedQueryEntry } from '../../api/savedQueries';
import ConfirmDialog from '../../components/ConfirmDialog';
import SaveQueryModal from '../../components/SaveQueryModal';
import { savedQueriesApi } from '../../api/savedQueries';

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
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterFolder, setFilterFolder] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [historyFor, setHistoryFor] = useState<SavedQueryEntry | null>(null);

  const handleDelete = (entry: SavedQueryEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(entry);
  };

  const handleRename = (entry: SavedQueryEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameTarget(entry);
  };

  const tags = Array.from(new Set((saved || []).flatMap((e) => e.tags || [])));
  const folders = Array.from(new Set((saved || []).map((e) => e.folder).filter(Boolean)));
  const list = (saved || []).filter((e) => (
    (!filterTag || (e.tags || []).includes(filterTag)) && (!filterFolder || e.folder === filterFolder)
  ));

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Saved Queries</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                try {
                  const blob = await savedQueriesApi.exportList(connectionId);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `saved-queries-${connectionId}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (e) { console.error('Export failed', e); }
              }}
              className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              Export
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  const json = JSON.parse(text);
                  const items = Array.isArray(json?.items) ? json.items : (Array.isArray(json) ? json : []);
                  const overwrite = confirm('Overwrite queries with matching names?');
                  await savedQueriesApi.importList(connectionId, items, overwrite);
                  alert('Import completed');
                } catch (err) {
                  console.error(err);
                  alert('Import failed');
                } finally {
                  if (e.target) (e.target as HTMLInputElement).value = '';
                }
              }}
            />
          </div>
        </div>
        <input
          type="text"
          placeholder="Search saved queries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {(tags.length > 0 || folders.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {folders.map((f) => (
              <button key={`folder-${f}`}
                onClick={() => setFilterFolder(filterFolder === f ? null : f)}
                className={`text-xs px-2 py-1 rounded border ${filterFolder === f ? 'bg-blue-100 text-blue-700 border-blue-300' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}>📁 {f}</button>
            ))}
            {tags.map((t) => (
              <button key={`tag-${t}`}
                onClick={() => setFilterTag(filterTag === t ? null : t)}
                className={`text-xs px-2 py-1 rounded border ${filterTag === t ? 'bg-green-100 text-green-700 border-green-300' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}>#{t}</button>
            ))}
            {(filterTag || filterFolder) && (
              <button onClick={() => { setFilterTag(null); setFilterFolder(null); }} className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100">Clear</button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : list.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">No saved queries</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {list.map((entry) => (
              <div
                key={entry.id}
                className="p-3 hover:bg-gray-50 cursor-pointer group"
                onClick={() => onSelectQuery(entry.sql)}
                title={entry.database ? `DB: ${entry.database}` : ''}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-gray-800 truncate">{entry.name}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {entry.folder && (
                        <span className="text-[11px] px-2 py-0.5 rounded border border-gray-300 text-gray-700 whitespace-nowrap">📁 {entry.folder}</span>
                      )}
                      {(entry.tags || []).map((t) => (
                        <span key={t} className="text-[11px] px-2 py-0.5 rounded border border-gray-300 text-gray-700 whitespace-nowrap">#{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleRename(entry, e)}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-gray-800"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 13.5V20h6.5l8.485-8.485a2.5 2.5 0 00-3.536-3.536L4 13.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => handleDelete(entry, e)}
                      className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                    </button>
                    {entry.revisions && entry.revisions.length > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setHistoryFor(entry); }}
                        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-gray-800"
                        title="History"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      </button>
                    )}
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
        title="Edit Saved Query"
        defaultName={renameTarget?.name || 'My Query'}
        defaultFolder={renameTarget?.folder}
        defaultTags={renameTarget?.tags}
        showFolderTags={true}
        sqlPreview={undefined}
        onCancel={() => setRenameTarget(null)}
        isLoading={upd.isPending}
        onSubmit={async (payload) => {
          if (!renameTarget) return;
          const { name, folder, tags } = typeof payload === 'string' ? { name: payload, folder: renameTarget.folder, tags: renameTarget.tags } : payload;
          await upd.mutateAsync({ id: renameTarget.id, patch: { name, folder, tags }, connectionId });
          setRenameTarget(null);
        }}
      />

      {historyFor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setHistoryFor(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full mx-4 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800">History - {historyFor.name}</h3>
              <button onClick={() => setHistoryFor(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            {historyFor.revisions && historyFor.revisions.length > 0 ? (
              <div className="divide-y divide-gray-200 max-h-80 overflow-auto">
                {historyFor.revisions.map((rev, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between gap-2">
                    <div className="text-xs text-gray-600">{new Date(rev.updatedAt).toLocaleString()}</div>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                        onClick={() => { onSelectQuery(rev.sql); setHistoryFor(null); }}
                      >
                        Load in Editor
                      </button>
                      <button
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                        onClick={async () => {
                          await upd.mutateAsync({ id: historyFor.id, patch: { sql: rev.sql }, connectionId });
                          setHistoryFor(null);
                        }}
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No history.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
