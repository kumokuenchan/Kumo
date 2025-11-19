import React, { useState } from 'react';

interface EnhancedJsonSyntaxHighlighterProps {
  data: any;
}

interface CollapseState {
  [key: string]: boolean;
}

export default function EnhancedJsonSyntaxHighlighter({ data }: EnhancedJsonSyntaxHighlighterProps) {
  const [collapsedPaths, setCollapsedPaths] = useState<CollapseState>({});

  const toggleCollapse = (path: string) => {
    setCollapsedPaths(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const renderValue = (value: any, key?: string, depth: number = 0, path: string = ''): React.ReactNode => {
    const indent = '  '.repeat(depth);
    const nextIndent = '  '.repeat(depth + 1);
    const currentPath = path ? `${path}.${key}` : key || 'root';

    // Check if it's an ObjectId (typically has _id field or looks like ObjectId)
    if (key === '_id' || (typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value))) {
      return (
        <span className="text-red-500 dark:text-red-400 font-semibold">
          ObjectId(<span className="text-red-600 dark:text-red-300">"{value}"</span>)
        </span>
      );
    }

    // Check for ISO date strings
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return (
        <span className="text-blue-500 dark:text-blue-400 font-medium">
          ISODate(<span className="text-blue-600 dark:text-blue-300">"{value}"</span>)
        </span>
      );
    }

    // String
    if (typeof value === 'string') {
      return <span className="text-green-600 dark:text-green-400">"{value}"</span>;
    }

    // Number (int or float)
    if (typeof value === 'number') {
      return <span className="text-blue-700 dark:text-blue-300 font-medium">{value}</span>;
    }

    // Boolean
    if (typeof value === 'boolean') {
      return <span className="text-purple-600 dark:text-purple-400 font-medium">{value.toString()}</span>;
    }

    // Null
    if (value === null) {
      return <span className="text-gray-500 dark:text-gray-400 italic">null</span>;
    }

    // Undefined
    if (value === undefined) {
      return <span className="text-gray-500 dark:text-gray-400 italic">undefined</span>;
    }

    // Array
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-gray-600 dark:text-gray-400">[ ]</span>;
      }

      const isCollapsed = collapsedPaths[currentPath];
      const length = value.length;

      // Check if it's a simple array (all primitives)
      const isSimpleArray = value.every(
        item => typeof item !== 'object' || item === null
      );

      if (isSimpleArray && value.length <= 3) {
        // Inline for short simple arrays
        return (
          <span className="text-gray-600 dark:text-gray-400">
            {'[ '}
            {value.map((item, index) => (
              <React.Fragment key={index}>
                {renderValue(item, undefined, depth + 1, currentPath)}
                {index < value.length - 1 && <span>, </span>}
              </React.Fragment>
            ))}
            {' ]'}
          </span>
        );
      }

      if (isCollapsed) {
        return (
          <span
            className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 inline-flex items-center"
            onClick={() => toggleCollapse(currentPath)}
          >
            <span className="inline-flex items-center justify-center w-4 h-4 mr-1 text-gray-500">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.293 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L9 13.586l5.293-5.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </span>
            [<span className="text-gray-500 dark:text-gray-400 font-medium">{length} item{length !== 1 ? 's' : ''}</span>]
          </span>
        );
      }

      return (
        <span>
          <span
            className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 inline-flex items-center"
            onClick={() => toggleCollapse(currentPath)}
          >
            <span className="inline-flex items-center justify-center w-4 h-4 text-gray-500">
              <svg className="w-3 h-3 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.293 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L9 13.586l5.293-5.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </span>
          </span>
          <span className="text-gray-600 dark:text-gray-400">[</span>
          {'\n'}
          {value.map((item, index) => (
            <React.Fragment key={index}>
              <span className="text-gray-400 dark:text-gray-600">{nextIndent}</span>
              {renderValue(item, undefined, depth + 1, `${currentPath}[${index}]`)}
              {index < value.length - 1 && <span className="text-gray-500 dark:text-gray-500">,</span>}
              {'\n'}
            </React.Fragment>
          ))}
          <span className="text-gray-400 dark:text-gray-600">{indent}</span>
          <span className="text-gray-600 dark:text-gray-400">]</span>
        </span>
      );
    }

    // Object
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) {
        return <span className="text-gray-600 dark:text-gray-400">{'{ }'}</span>;
      }

      const isCollapsed = collapsedPaths[currentPath];
      const keyCount = keys.length;

      if (isCollapsed) {
        return (
          <span
            className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 inline-flex items-center"
            onClick={() => toggleCollapse(currentPath)}
          >
            <span className="inline-flex items-center justify-center w-4 h-4 mr-1 text-gray-500">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.293 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L9 13.586l5.293-5.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </span>
            <span className="text-gray-600 dark:text-gray-400">{'{}'}</span>
            <span className="text-gray-500 dark:text-gray-400 font-medium ml-1">{keyCount} key{keyCount !== 1 ? 's' : ''}</span>
          </span>
        );
      }

      return (
        <span>
          <span
            className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 inline-flex items-center"
            onClick={() => toggleCollapse(currentPath)}
          >
            <span className="inline-flex items-center justify-center w-4 h-4 text-gray-500">
              <svg className="w-3 h-3 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.293 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L9 13.586l5.293-5.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </span>
          </span>
          <span className="text-gray-600 dark:text-gray-400">{'{'}</span>
          {'\n'}
          {keys.map((k, index) => (
            <React.Fragment key={k}>
              <span className="text-gray-400 dark:text-gray-600">{nextIndent}</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-medium">"{k}"</span>
              <span className="text-gray-500 dark:text-gray-500">: </span>
              {renderValue(value[k], k, depth + 1, `${currentPath}.${k}`)}
              {index < keys.length - 1 && <span className="text-gray-500 dark:text-gray-500">,</span>}
              {'\n'}
            </React.Fragment>
          ))}
          <span className="text-gray-400 dark:text-gray-600">{indent}</span>
          <span className="text-gray-600 dark:text-gray-400">{'}'}</span>
        </span>
      );
    }

    return <span className="text-gray-700 dark:text-gray-300">{String(value)}</span>;
  };

  return (
    <pre className="text-sm font-mono leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre overflow-x-auto">
      {renderValue(data, undefined, 0, '')}
    </pre>
  );
}
