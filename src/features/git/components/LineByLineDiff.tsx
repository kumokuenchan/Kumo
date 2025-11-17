import React, { useState } from 'react';

interface LineChange {
  oldLine?: number;
  newLine?: number;
  content: string;
  type: 'added' | 'deleted' | 'unchanged' | 'context';
}

interface LineByLineDiffProps {
  filepath: string;
  onBack?: () => void;
}

const LineByLineDiff: React.FC<LineByLineDiffProps> = ({ filepath, onBack }) => {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  
  // Simulate line changes for different file types
  const getFileExtension = (path: string) => {
    return path.split('.').pop()?.toLowerCase() || '';
  };
  
  const extension = getFileExtension(filepath);
  
  const getLineChanges = (): LineChange[] => {
    switch (extension) {
      case 'ts':
      case 'tsx':
        return [
          { oldLine: 1, newLine: 1, content: "import React from 'react';", type: 'unchanged' },
          { oldLine: 2, newLine: 2, content: "import { useState } from 'react';", type: 'unchanged' },
          { oldLine: 3, newLine: 3, content: '', type: 'unchanged' },
          { oldLine: 4, newLine: 4, content: 'const MyComponent: React.FC = () => {', type: 'unchanged' },
          { oldLine: 5, newLine: 5, content: '  const [count, setCount] = useState(0);', type: 'deleted' },
          { newLine: 6, content: '  const [count, setCount] = useState<number>(0);', type: 'added' },
          { oldLine: 6, newLine: 7, content: '  ', type: 'unchanged' },
          { oldLine: 7, newLine: 8, content: '  const increment = () => {', type: 'unchanged' },
          { oldLine: 8, newLine: 9, content: '    setCount(count + 1);', type: 'unchanged' },
          { oldLine: 9, newLine: 10, content: '  };', type: 'unchanged' },
          { oldLine: 10, newLine: 11, content: '  ', type: 'unchanged' },
          { oldLine: 11, newLine: 12, content: '  return (', type: 'unchanged' },
          { oldLine: 12, newLine: 13, content: '    <div>', type: 'unchanged' },
          { oldLine: 13, newLine: 14, content: '      <h1>Counter: {count}</h1>', type: 'unchanged' },
          { newLine: 15, content: '      <button onClick={increment}>', type: 'added' },
          { newLine: 16, content: '        Click me', type: 'added' },
          { newLine: 17, content: '      </button>', type: 'added' },
          { oldLine: 14, newLine: 18, content: '      <p>Current value: {count}</p>', type: 'unchanged' },
          { oldLine: 15, newLine: 19, content: '    </div>', type: 'unchanged' },
          { oldLine: 16, newLine: 20, content: '  );', type: 'unchanged' },
          { oldLine: 17, newLine: 21, content: '};', type: 'unchanged' },
        ];
      case 'md':
        return [
          { oldLine: 1, newLine: 1, content: '# Project Documentation', type: 'unchanged' },
          { oldLine: 2, newLine: 2, content: '', type: 'unchanged' },
          { oldLine: 3, newLine: 3, content: 'This is the main documentation file.', type: 'unchanged' },
          { oldLine: 4, newLine: 4, content: '', type: 'unchanged' },
          { newLine: 5, content: '## New Section', type: 'added' },
          { newLine: 6, content: '', type: 'added' },
          { newLine: 7, content: 'This section was added in the latest commit.', type: 'added' },
          { newLine: 8, content: '', type: 'added' },
          { oldLine: 5, newLine: 9, content: '## Getting Started', type: 'unchanged' },
          { oldLine: 6, newLine: 10, content: '', type: 'unchanged' },
          { oldLine: 7, newLine: 11, content: 'Instructions for getting started with the project.', type: 'unchanged' },
        ];
      default:
        return [
          { oldLine: 1, newLine: 1, content: 'Line 1', type: 'unchanged' },
          { oldLine: 2, newLine: undefined, content: 'Line 2', type: 'deleted' },
          { oldLine: undefined, newLine: 2, content: 'Modified line 2', type: 'added' },
          { oldLine: undefined, newLine: 3, content: 'New line 3', type: 'added' },
          { oldLine: 3, newLine: 4, content: 'Line 4', type: 'unchanged' },
          { oldLine: 4, newLine: 5, content: 'Line 5', type: 'unchanged' },
        ];
    }
  };

  const lineChanges = getLineChanges();

  const renderUnifiedView = () => {
    return (
      <div className="font-mono text-xs">
        {lineChanges.map((change, index) => {
          let bgColor = '';
          let prefix = ' ';
          
          switch (change.type) {
            case 'added':
              bgColor = 'bg-green-50 dark:bg-green-900/20';
              prefix = '+';
              break;
            case 'deleted':
              bgColor = 'bg-red-50 dark:bg-red-900/20';
              prefix = '-';
              break;
            case 'context':
              bgColor = 'bg-gray-50 dark:bg-gray-700/30';
              break;
            default:
              bgColor = '';
          }
          
          return (
            <div key={index} className={`flex ${bgColor}`}>
              <div className="w-12 text-right pr-2 text-gray-500 text-xs select-none py-0.5">
                {change.oldLine || ''}
              </div>
              <div className="w-12 text-right pr-2 text-gray-500 text-xs select-none py-0.5 border-r border-gray-200 dark:border-gray-700">
                {change.newLine || ''}
              </div>
              <div className="flex-1 py-0.5">
                <span className="w-4 inline-block text-center">{prefix}</span>
                <span className={change.type === 'added' ? 'text-green-700 dark:text-green-300' : change.type === 'deleted' ? 'text-red-700 dark:text-red-300' : ''}>
                  {change.content}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSplitView = () => {
    // Group changes into pairs for split view
    const pairs: { old?: LineChange; new?: LineChange }[] = [];
    let oldChanges = lineChanges.filter(c => c.type !== 'added');
    let newChanges = lineChanges.filter(c => c.type !== 'deleted');
    
    // This is a simplified pairing - in a real implementation, we'd need proper diff alignment
    const maxLength = Math.max(oldChanges.length, newChanges.length);
    for (let i = 0; i < maxLength; i++) {
      pairs.push({
        old: oldChanges[i],
        new: newChanges[i]
      });
    }
    
    return (
      <div className="font-mono text-xs">
        {pairs.map((pair, index) => (
          <div key={index} className="flex">
            {/* Old side */}
            <div className="w-1/2 border-r border-gray-200 dark:border-gray-700">
              {pair.old ? (
                <div className={`flex ${pair.old.type === 'deleted' ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                  <div className="w-12 text-right pr-2 text-gray-500 text-xs select-none py-0.5">
                    {pair.old.oldLine || ''}
                  </div>
                  <div className="flex-1 py-0.5">
                    <span className="w-4 inline-block text-center">{pair.old.type === 'deleted' ? '-' : ' '}</span>
                    <span className={pair.old.type === 'deleted' ? 'text-red-700 dark:text-red-300' : ''}>
                      {pair.old.content}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-6"></div>
              )}
            </div>
            
            {/* New side */}
            <div className="w-1/2">
              {pair.new ? (
                <div className={`flex ${pair.new.type === 'added' ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                  <div className="w-12 text-right pr-2 text-gray-500 text-xs select-none py-0.5">
                    {pair.new.newLine || ''}
                  </div>
                  <div className="flex-1 py-0.5">
                    <span className="w-4 inline-block text-center">{pair.new.type === 'added' ? '+' : ' '}</span>
                    <span className={pair.new.type === 'added' ? 'text-green-700 dark:text-green-300' : ''}>
                      {pair.new.content}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-6"></div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-md">
            {filepath}
          </h3>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/60 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('unified')}
            className={`px-2.5 py-1 text-xs rounded-md transition-all ${
              viewMode === 'unified'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Unified
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`px-2.5 py-1 text-xs rounded-md transition-all ${
              viewMode === 'split'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Split
          </button>
        </div>
      </div>

      {/* Diff Content */}
      <div className="flex-1 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="bg-gray-50 dark:bg-gray-700/30 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex text-xs text-gray-600 dark:text-gray-400">
            <div className="w-12 text-right pr-2">Old</div>
            <div className="w-12 text-right pr-2 border-r border-gray-200 dark:border-gray-700">New</div>
            <div className="flex-1 pl-6">Content</div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 max-h-full overflow-auto">
          {viewMode === 'unified' ? renderUnifiedView() : renderSplitView()}
        </div>
      </div>
    </div>
  );
};

export default LineByLineDiff;