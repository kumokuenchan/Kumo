import React, { useState, useEffect } from 'react';
import { Zap, ChevronRight, Play, Loader2, Globe } from 'lucide-react';
import { apiTesterStorage, type Collection, type SavedRequest } from '../../../services/apiTesterStorage';
import { environmentStorage, type Environment } from '../../../services/environmentStorage';
import { apiCli } from '../utils/apiCli';

interface ApiCollectionsDropdownProps {
  onClose: () => void;
  onExecute: (output: string) => void;
}

export default function ApiCollectionsDropdown({ onClose, onExecute }: ApiCollectionsDropdownProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [executingRequest, setExecutingRequest] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeEnvironment, setActiveEnvironment] = useState<Environment | null>(null);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = () => {
    const cols = apiTesterStorage.getCollections();
    setCollections(cols);

    // Load active environment
    const env = environmentStorage.getActiveEnvironment();
    setActiveEnvironment(env);

    // Auto-expand first collection if exists
    if (cols.length > 0) {
      setExpandedCollections(new Set([cols[0].id]));
    }
  };

  const toggleCollection = (collectionId: string) => {
    const newExpanded = new Set(expandedCollections);
    if (newExpanded.has(collectionId)) {
      newExpanded.delete(collectionId);
    } else {
      newExpanded.add(collectionId);
    }
    setExpandedCollections(newExpanded);
  };

  const executeRequest = async (request: SavedRequest, collectionId: string) => {
    setExecutingRequest(request.id);

    try {
      // Find collection and request indices
      const collectionIndex = collections.findIndex(c => c.id === collectionId);
      const collection = collections[collectionIndex];
      const requestIndex = collection?.requests.findIndex(r => r.id === request.id) ?? -1;

      if (collectionIndex === -1 || requestIndex === -1) {
        onExecute(`\x1b[31m✗ Error:\x1b[0m Request not found`);
        return;
      }

      // Execute using collection.request index format
      const result = await apiCli.execute(`api exec ${collectionIndex}.${requestIndex}`);

      if (result.success) {
        onExecute(result.output);
      } else {
        onExecute(`\x1b[31m✗ Error:\x1b[0m ${result.error}`);
      }
    } catch (error: any) {
      onExecute(`\x1b[31m✗ Error:\x1b[0m ${error.message || error}`);
    } finally {
      setExecutingRequest(null);
      onClose();
    }
  };

  const getMethodColor = (method: string): string => {
    const colors: Record<string, string> = {
      'GET': 'text-green-400 bg-green-900/30',
      'POST': 'text-yellow-400 bg-yellow-900/30',
      'PUT': 'text-blue-400 bg-blue-900/30',
      'DELETE': 'text-red-400 bg-red-900/30',
      'PATCH': 'text-purple-400 bg-purple-900/30',
      'HEAD': 'text-cyan-400 bg-cyan-900/30',
      'OPTIONS': 'text-gray-400 bg-gray-900/30',
    };
    return colors[method] || 'text-gray-400 bg-gray-900/30';
  };

  const filteredCollections = collections.filter(collection => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const nameMatch = collection.name.toLowerCase().includes(query);
    const requestMatch = collection.requests.some(req =>
      req.name.toLowerCase().includes(query) ||
      req.request.url.toLowerCase().includes(query) ||
      req.request.method.toLowerCase().includes(query)
    );

    return nameMatch || requestMatch;
  });

  return (
    <div className="absolute right-0 top-8 w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-700 bg-gray-900">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <h3 className="text-sm font-semibold text-gray-200">API Collections</h3>
          <span className="text-xs text-gray-500 ml-auto">{collections.length} collections</span>
        </div>

        {/* Active Environment Indicator */}
        {activeEnvironment && (
          <div className="flex items-center gap-1 mb-2 px-2 py-1 bg-green-900/30 border border-green-700/50 rounded text-xs">
            <Globe className="w-3 h-3 text-green-400" />
            <span className="text-green-300 font-medium">{activeEnvironment.name}</span>
            <span className="text-green-600 ml-auto">{activeEnvironment.variables.filter(v => v.enabled).length} vars</span>
          </div>
        )}

        {/* Search */}
        <input
          type="text"
          placeholder="Search requests..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-2 py-1 text-xs bg-gray-700 text-gray-200 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Collections List */}
      <div className="overflow-y-auto flex-1">
        {filteredCollections.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-gray-400 mb-2">
              {searchQuery ? 'No matching requests found' : 'No API collections found'}
            </p>
            <p className="text-xs text-gray-500">
              Create requests in the API Tester module
            </p>
          </div>
        ) : (
          filteredCollections.map((collection) => (
            <div key={collection.id} className="border-b border-gray-700 last:border-0">
              {/* Collection Header */}
              <button
                onClick={() => toggleCollection(collection.id)}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-750 transition-colors text-left"
              >
                <ChevronRight
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    expandedCollections.has(collection.id) ? 'rotate-90' : ''
                  }`}
                />
                <span className="text-sm font-medium text-gray-200 flex-1">
                  {collection.name}
                </span>
                <span className="text-xs text-gray-500">
                  {collection.requests.length} request{collection.requests.length !== 1 ? 's' : ''}
                </span>
              </button>

              {/* Collection Requests */}
              {expandedCollections.has(collection.id) && (
                <div className="bg-gray-900/50">
                  {collection.requests.map((request) => (
                    <button
                      key={request.id}
                      onClick={() => executeRequest(request, collection.id)}
                      disabled={executingRequest === request.id}
                      className="w-full px-3 py-2 pl-9 flex items-start gap-2 hover:bg-gray-750 transition-colors text-left disabled:opacity-50 disabled:cursor-wait group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-mono font-semibold ${getMethodColor(request.request.method)}`}>
                            {request.request.method}
                          </span>
                          <span className="text-sm text-gray-200 truncate">
                            {request.name}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 truncate font-mono">
                          {request.request.url}
                        </div>
                        {request.description && (
                          <div className="text-xs text-gray-600 truncate mt-1">
                            {request.description}
                          </div>
                        )}
                      </div>

                      <div className="flex-shrink-0 mt-1">
                        {executingRequest === request.id ? (
                          <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 text-gray-600 group-hover:text-green-400 transition-colors" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {collections.length > 0 && (
        <div className="p-2 border-t border-gray-700 bg-gray-900 text-xs text-gray-500 text-center">
          Click any request to execute • Results appear in terminal
        </div>
      )}
    </div>
  );
}
