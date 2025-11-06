import { useState } from 'react';
import { Code, Play, Book, Wand2 } from 'lucide-react';
import type { ApiRequest } from '../../api/apiTester';

interface GraphQLEditorProps {
  request: ApiRequest;
  onRequestChange: (request: ApiRequest) => void;
  onExecute: () => void;
  isLoading: boolean;
}

interface GraphQLBody {
  query: string;
  variables?: string;
  operationName?: string;
}

export default function GraphQLEditor({ request, onRequestChange, onExecute, isLoading }: GraphQLEditorProps) {
  const [showIntrospection, setShowIntrospection] = useState(false);
  const [introspectionResult, setIntrospectionResult] = useState<any>(null);

  // Parse GraphQL body
  const getGraphQLBody = (): GraphQLBody => {
    if (typeof request.body === 'object' && request.body) {
      return {
        query: (request.body as any).query || '',
        variables: (request.body as any).variables || '',
        operationName: (request.body as any).operationName || '',
      };
    }
    return { query: '', variables: '', operationName: '' };
  };

  const graphqlBody = getGraphQLBody();

  const updateQuery = (query: string) => {
    const body = getGraphQLBody();
    const updatedBody: any = { query };
    if (body.variables) updatedBody.variables = body.variables;
    if (body.operationName) updatedBody.operationName = body.operationName;

    onRequestChange({
      ...request,
      body: updatedBody,
      headers: {
        ...request.headers,
        'Content-Type': 'application/json',
      },
    });
  };

  const updateVariables = (variables: string) => {
    const body = getGraphQLBody();
    const updatedBody: any = { query: body.query };
    if (variables.trim()) updatedBody.variables = variables;
    if (body.operationName) updatedBody.operationName = body.operationName;

    onRequestChange({
      ...request,
      body: updatedBody,
      headers: {
        ...request.headers,
        'Content-Type': 'application/json',
      },
    });
  };

  const updateOperationName = (operationName: string) => {
    const body = getGraphQLBody();
    const updatedBody: any = { query: body.query };
    if (body.variables) updatedBody.variables = body.variables;
    if (operationName.trim()) updatedBody.operationName = operationName;

    onRequestChange({
      ...request,
      body: updatedBody,
      headers: {
        ...request.headers,
        'Content-Type': 'application/json',
      },
    });
  };

  const runIntrospection = async () => {
    const introspectionQuery = `
      query IntrospectionQuery {
        __schema {
          queryType { name }
          mutationType { name }
          subscriptionType { name }
          types {
            ...FullType
          }
          directives {
            name
            description
            locations
            args {
              ...InputValue
            }
          }
        }
      }

      fragment FullType on __Type {
        kind
        name
        description
        fields(includeDeprecated: true) {
          name
          description
          args {
            ...InputValue
          }
          type {
            ...TypeRef
          }
          isDeprecated
          deprecationReason
        }
        inputFields {
          ...InputValue
        }
        interfaces {
          ...TypeRef
        }
        enumValues(includeDeprecated: true) {
          name
          description
          isDeprecated
          deprecationReason
        }
        possibleTypes {
          ...TypeRef
        }
      }

      fragment InputValue on __InputValue {
        name
        description
        type { ...TypeRef }
        defaultValue
      }

      fragment TypeRef on __Type {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                  ofType {
                    kind
                    name
                    ofType {
                      kind
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    // Store current query
    const originalQuery = graphqlBody.query;

    // Temporarily set introspection query
    updateQuery(introspectionQuery);

    // Execute the request (this will call the parent's onExecute)
    // The response will come back through the normal flow
    setShowIntrospection(true);
  };

  const prettifyQuery = () => {
    try {
      // Basic GraphQL formatting
      let formatted = graphqlBody.query
        .replace(/\s+/g, ' ')
        .replace(/\s*{\s*/g, ' {\n  ')
        .replace(/\s*}\s*/g, '\n}\n')
        .replace(/\s*,\s*/g, ',\n  ')
        .trim();

      updateQuery(formatted);
    } catch {
      // Ignore formatting errors
    }
  };

  const loadExampleQuery = () => {
    const example = `query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    posts {
      id
      title
      createdAt
    }
  }
}`;

    const exampleVars = `{
  "id": "1"
}`;

    updateQuery(example);
    updateVariables(exampleVars);
  };

  return (
    <div className="flex flex-col h-full">
      {/* GraphQL Editor Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">GraphQL Editor</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadExampleQuery}
            className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded flex items-center gap-1"
            title="Load example query"
          >
            <Book className="w-3.5 h-3.5" />
            Example
          </button>
          <button
            onClick={prettifyQuery}
            className="px-3 py-1 text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded flex items-center gap-1"
            title="Prettify query"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Prettify
          </button>
          <button
            onClick={runIntrospection}
            disabled={!request.url || isLoading}
            className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded flex items-center gap-1 disabled:opacity-50"
            title="Run introspection query to explore schema"
          >
            <Play className="w-3.5 h-3.5" />
            Introspect
          </button>
        </div>
      </div>

      {/* Operation Name (optional) */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-slate-700">
        <input
          type="text"
          value={graphqlBody.operationName || ''}
          onChange={(e) => updateOperationName(e.target.value)}
          placeholder="Operation Name (optional)"
          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400"
        />
      </div>

      {/* Query Editor */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Query
          </label>
          <textarea
            value={graphqlBody.query}
            onChange={(e) => updateQuery(e.target.value)}
            placeholder={`query {\n  # Your GraphQL query here\n}`}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm font-mono text-gray-900 dark:text-white placeholder-gray-400 resize-none"
          />
        </div>

        {/* Variables Editor */}
        <div className="flex-1 flex flex-col p-4 pt-0 overflow-hidden">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Query Variables (JSON)
          </label>
          <textarea
            value={graphqlBody.variables || ''}
            onChange={(e) => updateVariables(e.target.value)}
            placeholder={'{\n  "key": "value"\n}'}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm font-mono text-gray-900 dark:text-white placeholder-gray-400 resize-none"
          />
        </div>
      </div>

      {/* GraphQL Tips */}
      <div className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 border-t border-purple-200 dark:border-purple-800">
        <div className="text-xs text-purple-700 dark:text-purple-300">
          <span className="font-medium">Tips:</span>
          {' '}Use <code className="px-1 py-0.5 bg-purple-100 dark:bg-purple-900/40 rounded">query</code>, <code className="px-1 py-0.5 bg-purple-100 dark:bg-purple-900/40 rounded">mutation</code>, or <code className="px-1 py-0.5 bg-purple-100 dark:bg-purple-900/40 rounded">subscription</code> operations. Click Introspect to explore the schema.
        </div>
      </div>

      {/* Introspection Modal */}
      {showIntrospection && introspectionResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Schema Introspection</h3>
              <button
                onClick={() => setShowIntrospection(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-sm font-mono text-gray-900 dark:text-white">
                {JSON.stringify(introspectionResult, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
