import React, { useState, useEffect } from 'react';
import { FileText, Copy, CheckCircle, AlertTriangle, GitBranch, ExternalLink, MessageSquare } from 'lucide-react';

interface Repository {
  id: string;
  name: string;
  owner: string;
  url: string;
  token?: string;
}

interface MultiRepoDiffViewerProps {
  filePath: string;
  diff: string;
  repository: Repository;
  headBranch: string;
  baseBranch: string;
  commitId: string;
  onAddLineComment?: (line: number, originalLine: number | undefined, filePath: string, commitId: string) => void;
  getCommentsForLine?: (filePath: string, line: number) => any[];
}

type ViewMode = 'unified' | 'split';

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header';
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

const MultiRepoDiffViewer: React.FC<MultiRepoDiffViewerProps> = ({
  filePath,
  diff,
  repository,
  headBranch,
  baseBranch,
  commitId,
  onAddLineComment,
  getCommentsForLine
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('unified');
  const [copied, setCopied] = useState(false);
  const [parsedLines, setParsedLines] = useState<DiffLine[]>([]);

  useEffect(() => {
    parseDiffContent(diff);
  }, [diff]);

  const parseDiffContent = (diffContent: string) => {
    if (!diffContent) {
      setParsedLines([]);
      return;
    }

    const lines: DiffLine[] = [];
    const diffLines = diffContent.split('\n');
    let oldLineNum = 0;
    let newLineNum = 0;

    for (const line of diffLines) {
      if (line.startsWith('@@')) {
        // Header line with line numbers
        const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
        if (match) {
          oldLineNum = parseInt(match[1]) - 1;
          newLineNum = parseInt(match[3]) - 1;
        }
        lines.push({
          type: 'header',
          content: line,
        });
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        newLineNum++;
        lines.push({
          type: 'add',
          content: line.substring(1),
          oldLineNum: undefined,
          newLineNum,
        });
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        oldLineNum++;
        lines.push({
          type: 'remove',
          content: line.substring(1),
          oldLineNum,
          newLineNum: undefined,
        });
      } else if (line.startsWith(' ')) {
        oldLineNum++;
        newLineNum++;
        lines.push({
          type: 'context',
          content: line.substring(1),
          oldLineNum,
          newLineNum,
        });
      } else {
        // Binary files or other special lines
        lines.push({
          type: 'context',
          content: line,
        });
      }
    }

    setParsedLines(lines);
  };

  const getFileExtension = (path: string) => {
    return path.split('.').pop()?.toLowerCase() || '';
  };

  const getLanguageIcon = (extension: string) => {
    const iconMap: Record<string, string> = {
      js: '🟨',
      ts: '🔷',
      jsx: '⚛️',
      tsx: '⚛️',
      py: '🐍',
      java: '☕',
      cpp: '⚙️',
      c: '⚙️',
      cs: '🔷',
      php: '🐘',
      rb: '💎',
      go: '🐹',
      rs: '🦀',
      swift: '🍎',
      kt: '🎯',
      scala: '🔴',
      html: '🌐',
      css: '🎨',
      scss: '🎨',
      sass: '🎨',
      json: '📄',
      xml: '📄',
      yaml: '📄',
      yml: '📄',
      md: '📝',
      sql: '🗃️',
      dockerfile: '🐳',
      gitignore: '📁',
    };
    return iconMap[extension] || '📄';
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(diff);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const extension = getFileExtension(filePath);

  if (!diff) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No diff content available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">{getLanguageIcon(extension)}</span>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">{filePath}</h4>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{repository.owner}/{repository.name}</span>
                <span>•</span>
                <span>{baseBranch} → {headBranch}</span>
                <a
                  href={`https://github.com/${repository.owner}/${repository.name}/blob/${headBranch}/${filePath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-blue-600"
                >
                  <ExternalLink className="w-3 h-3" />
                  View on GitHub
                </a>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('unified')}
                className={`px-3 py-1 text-xs rounded ${
                  viewMode === 'unified'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Unified
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`px-3 py-1 text-xs rounded ${
                  viewMode === 'split'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Split
              </button>
            </div>
            
            <button
              onClick={copyToClipboard}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Copy diff"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Diff Content */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        <div className="min-w-full">
          {viewMode === 'unified' ? (
            <div className="font-mono text-sm">
              {parsedLines.map((line, index) => {
                const comments = getCommentsForLine ? getCommentsForLine(filePath, line.newLineNum || line.oldLineNum || 0) : [];
                const hasComments = comments && comments.length > 0;
                
                return (
                  <div
                    key={index}
                    className={`flex group ${
                      line.type === 'add'
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : line.type === 'remove'
                        ? 'bg-red-50 dark:bg-red-900/20'
                        : line.type === 'header'
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : ''
                    } ${hasComments ? 'border-l-2 border-l-blue-500' : ''}`}
                  >
                    <div className="flex-shrink-0 w-12 text-right text-gray-400 dark:text-gray-500 text-xs px-2 py-1 border-r border-gray-200 dark:border-gray-700 select-none relative">
                      {line.newLineNum || ''}
                      {/* Comment button */}
                      {(line.newLineNum || line.oldLineNum) && line.type !== 'header' && (
                        <button
                          onClick={() => {
                            if (onAddLineComment) {
                              onAddLineComment(
                                line.newLineNum || line.oldLineNum || 0,
                                line.oldLineNum,
                                filePath,
                                commitId
                              );
                            }
                          }}
                          className="absolute -right-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                          title="Add comment"
                        >
                          <MessageSquare className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="flex-shrink-0 w-12 text-right text-gray-400 dark:text-gray-500 text-xs px-2 py-1 border-r border-gray-200 dark:border-gray-700 select-none">
                      {line.oldLineNum || ''}
                    </div>
                  <div className={`flex-1 px-2 py-1 relative ${
                      line.type === 'add'
                        ? 'text-green-700 dark:text-green-300'
                        : line.type === 'remove'
                        ? 'text-red-700 dark:text-red-300'
                        : line.type === 'header'
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      <pre className="whitespace-pre-wrap">{line.content}</pre>
                      {/* Comment indicator */}
                      {hasComments && (
                        <div className="absolute right-2 top-1 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            {comments.length}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex">
              {/* Left side (old) */}
              <div className="w-1/2 font-mono text-sm border-r border-gray-200 dark:border-gray-700">
                {parsedLines.map((line, index) => (
                  <div
                    key={`left-${index}`}
                    className={`flex ${
                      line.type === 'remove' || line.type === 'context'
                        ? 'bg-red-50 dark:bg-red-900/20'
                        : line.type === 'header'
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : ''
                    }`}
                  >
                    <div className="flex-shrink-0 w-12 text-right text-gray-400 dark:text-gray-500 text-xs px-2 py-1 border-r border-gray-200 dark:border-gray-700 select-none">
                      {line.oldLineNum || ''}
                    </div>
                    <div className={`flex-1 px-2 py-1 ${
                      line.type === 'remove'
                        ? 'text-red-700 dark:text-red-300'
                        : line.type === 'header'
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      <pre className="whitespace-pre-wrap">
                        {line.type !== 'add' ? line.content : ''}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Right side (new) */}
              <div className="w-1/2 font-mono text-sm">
                {parsedLines.map((line, index) => (
                  <div
                    key={`right-${index}`}
                    className={`flex ${
                      line.type === 'add' || line.type === 'context'
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : line.type === 'header'
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : ''
                    }`}
                  >
                    <div className="flex-shrink-0 w-12 text-right text-gray-400 dark:text-gray-500 text-xs px-2 py-1 border-r border-gray-200 dark:border-gray-700 select-none">
                      {line.newLineNum || ''}
                    </div>
                    <div className={`flex-1 px-2 py-1 ${
                      line.type === 'add'
                        ? 'text-green-700 dark:text-green-300'
                        : line.type === 'header'
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      <pre className="whitespace-pre-wrap">
                        {line.type !== 'remove' ? line.content : ''}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiRepoDiffViewer;