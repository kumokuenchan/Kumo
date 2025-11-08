import React from 'react';
import { Database, RefreshCw, FileCode } from 'lucide-react';
import { useMongoDBSchema } from '../../hooks/useMongoDB';

interface SchemaTabProps {
  connectionId: string;
  database: string;
  collection: string;
}

export default function SchemaTab({ connectionId, database, collection }: SchemaTabProps) {
  const { data, isLoading, refetch } = useMongoDBSchema(connectionId, database, collection);

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'string': 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
      'int': 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
      'double': 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
      'boolean': 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
      'date': 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30',
      'objectId': 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
      'object': 'text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/30',
      'array': 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30',
      'null': 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30',
    };
    return colors[type] || 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30';
  };

  return (
    <div className="h-full flex flex-col bg-[#f9fbfa] dark:bg-[#0d1117]">
      {/* Header */}
      <div className="bg-white dark:bg-[#161b22] border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Schema Analysis</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Analyzed {data?.sampledDocuments || 0} of {data?.totalDocuments || 0} documents in <span className="font-mono text-green-600 dark:text-green-400">{collection}</span>
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : !data || data.fields.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No schema data available</p>
              <p className="text-xs mt-1">The collection may be empty</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {data.fields.map((field) => (
              <div
                key={field.name}
                className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-gray-800 p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileCode className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <code className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                        {field.name}
                      </code>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Occurs in {field.occurrence}% of documents
                    </p>
                  </div>
                </div>

                {/* Types */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {field.types.map((typeInfo: any) => (
                    <div
                      key={typeInfo.type}
                      className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(typeInfo.type)}`}
                    >
                      {typeInfo.type} ({typeInfo.percentage}%)
                    </div>
                  ))}
                </div>

                {/* Sample Values */}
                {field.samples && field.samples.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Sample values:</p>
                    <div className="space-y-1">
                      {field.samples.map((sample: any, idx: number) => (
                        <div
                          key={idx}
                          className="px-2 py-1 bg-gray-50 dark:bg-gray-900 rounded text-xs font-mono text-gray-800 dark:text-gray-200 overflow-x-auto"
                        >
                          {typeof sample === 'object' ? JSON.stringify(sample) : String(sample)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
