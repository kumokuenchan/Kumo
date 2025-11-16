import React from 'react';

interface EnhancedDiffViewProps {
  diff: string;
  fileType: string;
  viewMode?: 'unified' | 'split';
  onModeChange?: (mode: 'unified' | 'split') => void;
}

const EnhancedDiffView: React.FC<EnhancedDiffViewProps> = ({ 
  diff, 
  fileType, 
  viewMode = 'unified',
  onModeChange 
}) => {
  // Simple syntax highlighting function
  const highlightSyntax = (code: string, fileType: string): string => {
    if (!code) return code;
    
    // Basic syntax highlighting for common file types
    switch (fileType) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        // Highlight JavaScript/TypeScript keywords
        code = code
          .replace(/\b(function|class|const|let|var|if|else|for|while|return|import|export|from|default|async|await|try|catch|finally|throw|new|this|super|extends|static|get|set|constructor)\b/g, '<span class="text-blue-600 dark:text-blue-400 font-medium">$&</span>')
          .replace(/(["'`])([^"']*)\1/g, '<span class="text-green-600 dark:text-green-400">$&</span>') // Strings
          .replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, '<span class="text-gray-500 dark:text-gray-400 italic">$&</span>'); // Comments
        break;
      case 'css':
      case 'scss':
        // Highlight CSS properties and values
        code = code
          .replace(/([a-zA-Z-]+)(?=\s*:)/g, '<span class="text-blue-600 dark:text-blue-400">$&</span>') // Properties
          .replace(/(#\w+|\.\w+|\w+-\w+)/g, '<span class="text-purple-600 dark:text-purple-400">$&</span>') // Selectors
          .replace(/(["'])([^"']*)\1/g, '<span class="text-green-600 dark:text-green-400">$&</span>'); // Strings
        break;
      case 'html':
        // Highlight HTML tags
        code = code
          .replace(/(&lt;[^&gt;]*&gt;)/g, '<span class="text-blue-600 dark:text-blue-400">$&</span>') // Tags
          .replace(/(="[^"]*")/g, '<span class="text-green-600 dark:text-green-400">$&</span>'); // Attributes
        break;
      case 'json':
        // Highlight JSON keys and values
        code = code
          .replace(/("[^"]*")(\s*:)/g, '<span class="text-blue-600 dark:text-blue-400">$1</span>$2') // Keys
          .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="text-green-600 dark:text-green-400">$&</span>') // Strings
          .replace(/\b(true|false|null)\b/g, '<span class="text-purple-600 dark:text-purple-400">$&</span>'); // Boolean/null
        break;
      default:
        // No highlighting for other file types
        break;
    }
    
    return code;
  };

  // Process diff for unified view
  const renderUnifiedView = () => {
    if (!diff) return null;
    
    const lines = diff.split('\n');
    let oldLineNum = 0;
    let newLineNum = 0;

    return lines.map((line, index) => {
      const isAddition = line.startsWith('+') && !line.startsWith('+++');
      const isDeletion = line.startsWith('-') && !line.startsWith('---');
      const isContext = line.startsWith('@@');
      const isFileHeader = line.startsWith('+++') || line.startsWith('---');
      const lineContent = (isAddition || isDeletion) ? line.substring(1) : line;

      // Skip file headers
      if (isFileHeader) return null;

      // Parse @@ header to get line numbers
      if (isContext) {
        const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          oldLineNum = parseInt(match[1]);
          newLineNum = parseInt(match[2]);
        }

        return (
          <div
            key={index}
            className="bg-blue-50 dark:bg-blue-950/30 border-y border-blue-200 dark:border-blue-900/50 px-3 py-2 my-2"
          >
            <span className="text-xs font-mono font-semibold text-blue-700 dark:text-blue-400">{line}</span>
          </div>
        );
      }

      // Track current line numbers
      const currentOldLine = oldLineNum;
      const currentNewLine = newLineNum;

      // Increment line numbers based on line type
      if (!isAddition) oldLineNum++;
      if (!isDeletion) newLineNum++;

      // Apply syntax highlighting
      const highlightedContent = highlightSyntax(lineContent, fileType);

      return (
        <div
          key={index}
          className={`group flex items-stretch hover:bg-opacity-70 transition-colors ${
            isAddition
              ? 'bg-green-50 dark:bg-green-950/20'
              : isDeletion
              ? 'bg-red-50 dark:bg-red-950/20'
              : 'bg-white dark:bg-gray-950'
          }`}
        >
          {/* Line Numbers (dual column like GitHub) */}
          <div className="flex flex-shrink-0">
            {/* Old line number */}
            <div
              className={`w-12 px-2 py-0.5 text-right select-none border-r ${
                isAddition
                  ? 'bg-green-100 dark:bg-green-950/30 border-green-200 dark:border-green-900/50 text-transparent'
                  : isDeletion
                  ? 'bg-red-100 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400'
                  : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-600'
              }`}
            >
              <span className="text-xs font-mono">{!isAddition ? currentOldLine : ''}</span>
            </div>

            {/* New line number */}
            <div
              className={`w-12 px-2 py-0.5 text-right select-none border-r ${
                isAddition
                  ? 'bg-green-100 dark:bg-green-950/30 border-green-200 dark:border-green-900/50 text-green-600 dark:text-green-400'
                  : isDeletion
                  ? 'bg-red-100 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-transparent'
                  : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-600'
              }`}
            >
              <span className="text-xs font-mono">{!isDeletion ? currentNewLine : ''}</span>
            </div>
          </div>

          {/* Symbol Column */}
          <div
            className={`flex-shrink-0 w-8 px-2 py-0.5 text-center select-none ${
              isAddition
                ? 'bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400'
                : isDeletion
                ? 'bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                : 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600'
            }`}
          >
            <span className="text-xs font-bold">{isAddition ? '+' : isDeletion ? '-' : ' '}</span>
          </div>

          {/* Code Content with Syntax Highlighting */}
          <div
            className={`flex-1 px-3 py-0.5 font-mono text-xs whitespace-pre-wrap break-all ${
              isAddition
                ? 'text-gray-900 dark:text-gray-100'
                : isDeletion
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-700 dark:text-gray-300'
            }`}
            style={{
              tabSize: 2,
              MozTabSize: 2,
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
            }}
            dangerouslySetInnerHTML={{ __html: highlightedContent || ' ' }}
          />
        </div>
      );
    });
  };

  // Process diff for split view
  const renderSplitView = () => {
    if (!diff) return null;
    
    const lines = diff.split('\n');
    let oldLineNum = 0;
    let newLineNum = 0;
    const splitLines: { oldLine: string; newLine: string; oldNum: number; newNum: number; type: 'add' | 'delete' | 'modify' | 'context' }[] = [];

    // Process diff to create split view data
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isAddition = line.startsWith('+') && !line.startsWith('+++');
      const isDeletion = line.startsWith('-') && !line.startsWith('---');
      const isContext = line.startsWith('@@');
      const isFileHeader = line.startsWith('+++') || line.startsWith('---');

      if (isFileHeader) continue;

      if (isContext) {
        const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          oldLineNum = parseInt(match[1]);
          newLineNum = parseInt(match[2]);
        }
        splitLines.push({ oldLine: line, newLine: line, oldNum: 0, newNum: 0, type: 'context' });
        continue;
      }

      if (isAddition) {
        splitLines.push({ 
          oldLine: '', 
          newLine: line.substring(1), 
          oldNum: 0, 
          newNum: newLineNum++, 
          type: 'add' 
        });
      } else if (isDeletion) {
        splitLines.push({ 
          oldLine: line.substring(1), 
          newLine: '', 
          oldNum: oldLineNum++, 
          newNum: 0, 
          type: 'delete' 
        });
      } else {
        // Context line
        splitLines.push({ 
          oldLine: line.substring(1), 
          newLine: line.substring(1), 
          oldNum: oldLineNum++, 
          newNum: newLineNum++, 
          type: 'modify' 
        });
      }
    }

    return (
      <div className="font-mono text-xs">
        {/* Header row */}
        <div className="flex border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900">
          <div className="w-12 px-2 py-1 text-center text-gray-500 dark:text-gray-400 border-r border-gray-300 dark:border-gray-600">Old</div>
          <div className="flex-1 px-3 py-1 text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600">Old File</div>
          <div className="w-12 px-2 py-1 text-center text-gray-500 dark:text-gray-400 border-r border-gray-300 dark:border-gray-600">New</div>
          <div className="flex-1 px-3 py-1 text-gray-700 dark:text-gray-300">New File</div>
        </div>

        {/* Content rows */}
        {splitLines.map((row, index) => {
          if (row.type === 'context') {
            return (
              <div key={index} className="bg-blue-50 dark:bg-blue-950/30 border-y border-blue-200 dark:border-blue-900/50 px-3 py-2 my-2">
                <span className="text-xs font-mono font-semibold text-blue-700 dark:text-blue-400">{row.oldLine}</span>
              </div>
            );
          }

          const oldHighlighted = highlightSyntax(row.oldLine, fileType);
          const newHighlighted = highlightSyntax(row.newLine, fileType);

          return (
            <div 
              key={index} 
              className={`flex border-b border-gray-100 dark:border-gray-800 ${
                row.type === 'add' ? 'bg-green-50 dark:bg-green-950/20' : 
                row.type === 'delete' ? 'bg-red-50 dark:bg-red-950/20' : ''
              }`}
            >
              {/* Old line number */}
              <div className="w-12 px-2 py-1 text-right text-gray-500 dark:text-gray-400 border-r border-gray-300 dark:border-gray-600">
                {row.oldNum > 0 ? row.oldNum : ''}
              </div>
              {/* Old line content */}
              <div 
                className={`flex-1 px-3 py-1 border-r border-gray-300 dark:border-gray-600 ${
                  row.type === 'delete' ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'
                }`}
                dangerouslySetInnerHTML={{ __html: oldHighlighted || ' ' }}
              />
              {/* New line number */}
              <div className="w-12 px-2 py-1 text-right text-gray-500 dark:text-gray-400 border-r border-gray-300 dark:border-gray-600">
                {row.newNum > 0 ? row.newNum : ''}
              </div>
              {/* New line content */}
              <div 
                className={`flex-1 px-3 py-1 ${
                  row.type === 'add' ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'
                }`}
                dangerouslySetInnerHTML={{ __html: newHighlighted || ' ' }}
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden shadow-sm">
      {/* Diff Header */}
      <div className="bg-gray-100 dark:bg-gray-900 px-3 py-2 border-b border-gray-300 dark:border-gray-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Diff View</span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {diff.split('\n').filter(l => l.startsWith('+')).length} additions, {diff.split('\n').filter(l => l.startsWith('-')).length} deletions
        </div>
      </div>

      {/* Diff Content */}
      <div className="overflow-auto bg-white dark:bg-gray-950">
        {viewMode === 'unified' ? renderUnifiedView() : renderSplitView()}
      </div>
    </div>
  );
};

export default EnhancedDiffView;