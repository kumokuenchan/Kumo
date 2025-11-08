import React, { useState } from 'react';
import { Play, Plus, Trash2, AlertCircle } from 'lucide-react';
import { useAggregateMongoDBDocuments } from '../../hooks/useMongoDB';
import JsonSyntaxHighlighter from '../../components/JsonSyntaxHighlighter';

interface AggregationsTabProps {
  connectionId: string;
  database: string;
  collection: string;
}

export default function AggregationsTab({ connectionId, database, collection }: AggregationsTabProps) {
  const [pipelineText, setPipelineText] = useState('[\n  { "$match": {} },\n  { "$limit": 10 }\n]');
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const aggregateMutation = useAggregateMongoDBDocuments();

  const handleRunAggregation = async () => {
    try {
      setError(null);
      const pipeline = JSON.parse(pipelineText);

      if (!Array.isArray(pipeline)) {
        throw new Error('Pipeline must be an array');
      }

      const response = await aggregateMutation.mutateAsync({
        connectionId,
        database,
        collection,
        pipeline
      });

      setResults(response.documents);
    } catch (err: any) {
      setError(err.message || 'Failed to run aggregation');
      setResults(null);
    }
  };

  const addStage = () => {
    try {
      const pipeline = JSON.parse(pipelineText);
      pipeline.push({ "$match": {} });
      setPipelineText(JSON.stringify(pipeline, null, 2));
    } catch {
      // If invalid JSON, start fresh
      setPipelineText('[\n  { "$match": {} }\n]');
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#f9fbfa] dark:bg-[#0d1117]">
      {/* Header */}
      <div className="bg-white dark:bg-[#161b22] border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Aggregation Pipeline</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Build and execute aggregation pipelines on <span className="font-mono text-green-600 dark:text-green-400">{collection}</span>
        </p>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Pipeline Editor */}
        <div className="w-1/2 flex flex-col border-r border-gray-200 dark:border-gray-800">
          <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Pipeline Stages</span>
            <div className="flex items-center gap-2">
              <button
                onClick={addStage}
                className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Stage
              </button>
              <button
                onClick={handleRunAggregation}
                disabled={aggregateMutation.isPending}
                className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded transition flex items-center gap-1"
              >
                <Play className="w-3 h-3" />
                {aggregateMutation.isPending ? 'Running...' : 'Run'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <textarea
              value={pipelineText}
              onChange={(e) => setPipelineText(e.target.value)}
              className="w-full h-full min-h-[400px] p-4 font-mono text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
              spellCheck={false}
              placeholder='[\n  { "$match": { "status": "active" } },\n  { "$group": { "_id": "$category", "count": { "$sum": 1 } } }\n]'
            />
          </div>

          {error && (
            <div className="m-4 mt-0 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-300">Error</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="w-1/2 flex flex-col">
          <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 border-b border-gray-200 dark:border-gray-800">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Results {results && `(${results.length})`}
            </span>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {results === null ? (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Run the aggregation to see results</p>
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No results found</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((doc, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-gray-800 p-4"
                  >
                    <JsonSyntaxHighlighter data={doc} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
