import { useEffect, useMemo, useState } from 'react';
import { dataEditingApi } from '../../api/dataEditing';

interface FKEditorProps {
  connectionId: string;
  database: string;
  table: string;
  column: string;
  value: any;
  onChange: (value: any) => void;
}

export default function FKEditor({ connectionId, database, table, column, value, onChange }: FKEditorProps) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Array<{ value: any; label: string }>>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = await dataEditingApi.fkLookup(connectionId, database, table, column, query, 50, 0);
        if (!cancelled) setOptions(res.options || []);
      } catch (e) {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [connectionId, database, table, column, query]);

  const selectedLabel = useMemo(() => {
    const found = options.find((o) => String(o.value) === String(value));
    return found?.label ?? (value ?? '');
  }, [options, value]);

  return (
    <div className="relative">
      <div className="flex gap-1">
        <input
          type="text"
          value={selectedLabel as any}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search..."
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="px-2 border border-gray-300 rounded text-gray-600"
          title="Toggle options"
        >
          ▾
        </button>
      </div>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow max-h-48 overflow-auto">
          {loading ? (
            <div className="p-2 text-sm text-gray-500">Loading...</div>
          ) : options.length === 0 ? (
            <div className="p-2 text-sm text-gray-500">No matches</div>
          ) : (
            options.map((opt) => (
              <button
                key={`${opt.value}`}
                onClick={() => { onChange(opt.value); setOpen(false); setQuery(''); }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 ${String(opt.value) === String(value) ? 'bg-blue-50' : ''}`}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

