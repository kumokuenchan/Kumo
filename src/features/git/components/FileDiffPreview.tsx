import React, { useState, useEffect } from 'react';
import { useGit } from '../GitContext';

interface FileDiffPreviewProps {
  filepath: string;
  commitOid: string;
}

type ViewMode = 'unified' | 'split';

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header';
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

const FileDiffPreview: React.FC<FileDiffPreviewProps> = ({ filepath, commitOid }) => {
  const { gitService } = useGit();
  const [diffContent, setDiffContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('unified');

  const getFileExtension = (path: string) => {
    return path.split('.').pop()?.toLowerCase() || '';
  };

  const extension = getFileExtension(filepath);

  useEffect(() => {
    const loadDiff = async () => {
      if (!gitService || !commitOid || !filepath) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const diff = await gitService.getCommitFileDiff(commitOid, filepath);
        setDiffContent(diff);
      } catch (error) {
        console.error('Error loading commit file diff:', error);
        setDiffContent('');
      } finally {
        setLoading(false);
      }
    };

    loadDiff();
  }, [gitService, commitOid, filepath]);
  
  // Parse diff into structured format
  const parseDiffLines = (diff: string): DiffLine[] => {
    const lines = diff.split('\n');
    const result: DiffLine[] = [];
    let oldLineNum = 0;
    let newLineNum = 0;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        // Parse hunk header to get line numbers
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
        if (match) {
          oldLineNum = parseInt(match[1]);
          newLineNum = parseInt(match[2]);
        }
        result.push({ type: 'header', content: line });
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        result.push({
          type: 'add',
          content: line.substring(1),
          newLineNum: newLineNum++
        });
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        result.push({
          type: 'remove',
          content: line.substring(1),
          oldLineNum: oldLineNum++
        });
      } else if (line.startsWith(' ')) {
        result.push({
          type: 'context',
          content: line.substring(1),
          oldLineNum: oldLineNum++,
          newLineNum: newLineNum++
        });
      } else if (line.length > 0) {
        result.push({
          type: 'context',
          content: line,
          oldLineNum: oldLineNum++,
          newLineNum: newLineNum++
        });
      }
    }

    return result;
  };

  // Render content with proper indentation
  const renderContent = (content: string) => {
    // Replace tabs with 4 spaces for consistent display
    const normalized = content.replace(/\t/g, '    ');
    // Preserve leading spaces
    return <span className="whitespace-pre">{normalized}</span>;
  };

  // Render unified diff view
  const renderUnifiedDiff = (lines: DiffLine[]) => {
    return lines.map((line, index) => {
      if (line.type === 'header') {
        return (
          <div key={index} className="flex bg-blue-50 dark:bg-blue-900/20 border-y border-blue-200 dark:border-blue-800 sticky top-0 z-10">
            <div className="w-24 flex-shrink-0"></div>
            <div className="flex-1 py-1.5 px-3 font-mono text-blue-700 dark:text-blue-300 font-semibold text-xs">
              {line.content}
            </div>
          </div>
        );
      } else if (line.type === 'add') {
        return (
          <div key={index} className="flex hover:bg-green-100/50 dark:hover:bg-green-900/30 transition-colors group">
            <div className="w-12 flex-shrink-0 text-right pr-2 text-gray-400 dark:text-gray-500 text-[10px] leading-5 select-none bg-green-50 dark:bg-green-900/20 border-r border-green-200 dark:border-green-800"></div>
            <div className="w-12 flex-shrink-0 text-right pr-2 text-gray-400 dark:text-gray-500 text-[10px] leading-5 select-none bg-green-50 dark:bg-green-900/20 border-r border-green-200 dark:border-green-800">
              {line.newLineNum}
            </div>
            <div className="flex-1 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 pl-3 pr-2 leading-5">
              <span className="inline-block w-4 text-center text-green-600 dark:text-green-400 font-bold text-xs">+</span>
              <span className="ml-1 font-mono text-xs">{renderContent(line.content)}</span>
            </div>
          </div>
        );
      } else if (line.type === 'remove') {
        return (
          <div key={index} className="flex hover:bg-red-100/50 dark:hover:bg-red-900/30 transition-colors group">
            <div className="w-12 flex-shrink-0 text-right pr-2 text-gray-400 dark:text-gray-500 text-[10px] leading-5 select-none bg-red-50 dark:bg-red-900/20 border-r border-red-200 dark:border-red-800">
              {line.oldLineNum}
            </div>
            <div className="w-12 flex-shrink-0 text-right pr-2 text-gray-400 dark:text-gray-500 text-[10px] leading-5 select-none bg-red-50 dark:bg-red-900/20 border-r border-red-200 dark:border-red-800"></div>
            <div className="flex-1 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 pl-3 pr-2 leading-5">
              <span className="inline-block w-4 text-center text-red-600 dark:text-red-400 font-bold text-xs">-</span>
              <span className="ml-1 font-mono text-xs">{renderContent(line.content)}</span>
            </div>
          </div>
        );
      } else {
        return (
          <div key={index} className="flex hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
            <div className="w-12 flex-shrink-0 text-right pr-2 text-gray-400 dark:text-gray-500 text-[10px] leading-5 select-none border-r border-gray-200 dark:border-gray-700">
              {line.oldLineNum}
            </div>
            <div className="w-12 flex-shrink-0 text-right pr-2 text-gray-400 dark:text-gray-500 text-[10px] leading-5 select-none border-r border-gray-200 dark:border-gray-700">
              {line.newLineNum}
            </div>
            <div className="flex-1 text-gray-700 dark:text-gray-300 pl-3 pr-2 leading-5">
              <span className="inline-block w-4"></span>
              <span className="ml-1 font-mono text-xs">{renderContent(line.content)}</span>
            </div>
          </div>
        );
      }
    });
  };

  // Render split diff view
  const renderSplitDiff = (lines: DiffLine[]) => {
    const rows: JSX.Element[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (line.type === 'header') {
        rows.push(
          <div key={i} className="flex bg-blue-50 dark:bg-blue-900/20 border-y border-blue-200 dark:border-blue-800 sticky top-0 z-10">
            <div className="flex-1 py-1.5 px-3 font-mono text-blue-700 dark:text-blue-300 font-semibold text-xs">
              {line.content}
            </div>
          </div>
        );
        i++;
      } else if (line.type === 'context') {
        // Context line - show on both sides
        rows.push(
          <div key={i} className="flex hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
            {/* Left side (old) */}
            <div className="flex-1 flex border-r border-gray-200 dark:border-gray-700">
              <div className="w-12 flex-shrink-0 text-right pr-2 text-gray-400 dark:text-gray-500 text-[10px] leading-5 select-none border-r border-gray-200 dark:border-gray-700">
                {line.oldLineNum}
              </div>
              <div className="flex-1 text-gray-700 dark:text-gray-300 pl-3 pr-2 leading-5">
                <span className="inline-block w-4"></span>
                <span className="ml-1 font-mono text-xs">{renderContent(line.content)}</span>
              </div>
            </div>
            {/* Right side (new) */}
            <div className="flex-1 flex">
              <div className="w-12 flex-shrink-0 text-right pr-2 text-gray-400 dark:text-gray-500 text-[10px] leading-5 select-none border-r border-gray-200 dark:border-gray-700">
                {line.newLineNum}
              </div>
              <div className="flex-1 text-gray-700 dark:text-gray-300 pl-3 pr-2 leading-5">
                <span className="inline-block w-4"></span>
                <span className="ml-1 font-mono text-xs">{renderContent(line.content)}</span>
              </div>
            </div>
          </div>
        );
        i++;
      } else if (line.type === 'remove') {
        // Look ahead for corresponding add
        let j = i + 1;
        while (j < lines.length && lines[j].type === 'remove') j++;

        const removes: DiffLine[] = [];
        const adds: DiffLine[] = [];

        // Collect consecutive removes
        for (let k = i; k < j; k++) {
          removes.push(lines[k]);
        }

        // Collect consecutive adds
        while (j < lines.length && lines[j].type === 'add') {
          adds.push(lines[j]);
          j++;
        }

        // Render pairs
        const maxLen = Math.max(removes.length, adds.length);
        for (let k = 0; k < maxLen; k++) {
          const removeeLine = removes[k];
          const addLine = adds[k];

          rows.push(
            <div key={`${i}-${k}`} className="flex transition-colors">
              {/* Left side (removed) */}
              <div className={`flex-1 flex border-r border-gray-200 dark:border-gray-700 ${removeeLine ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100/70 dark:hover:bg-red-900/40' : ''}`}>
                {removeeLine ? (
                  <>
                    <div className="w-12 flex-shrink-0 text-right pr-2 text-gray-400 dark:text-gray-500 text-[10px] leading-5 select-none border-r border-red-200 dark:border-red-800">
                      {removeeLine.oldLineNum}
                    </div>
                    <div className="flex-1 text-red-800 dark:text-red-200 pl-3 pr-2 leading-5">
                      <span className="inline-block w-4 text-center text-red-600 dark:text-red-400 font-bold text-xs">-</span>
                      <span className="ml-1 font-mono text-xs">{renderContent(removeeLine.content)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 flex-shrink-0 border-r border-gray-200 dark:border-gray-700"></div>
                    <div className="flex-1"></div>
                  </>
                )}
              </div>
              {/* Right side (added) */}
              <div className={`flex-1 flex ${addLine ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100/70 dark:hover:bg-green-900/40' : ''}`}>
                {addLine ? (
                  <>
                    <div className="w-12 flex-shrink-0 text-right pr-2 text-gray-400 dark:text-gray-500 text-[10px] leading-5 select-none border-r border-green-200 dark:border-green-800">
                      {addLine.newLineNum}
                    </div>
                    <div className="flex-1 text-green-800 dark:text-green-200 pl-3 pr-2 leading-5">
                      <span className="inline-block w-4 text-center text-green-600 dark:text-green-400 font-bold text-xs">+</span>
                      <span className="ml-1 font-mono text-xs">{renderContent(addLine.content)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 flex-shrink-0 border-r border-gray-200 dark:border-gray-700"></div>
                    <div className="flex-1"></div>
                  </>
                )}
              </div>
            </div>
          );
        }

        i = j;
      } else if (line.type === 'add') {
        // Standalone add (no corresponding remove)
        rows.push(
          <div key={i} className="flex transition-colors">
            {/* Left side (empty) */}
            <div className="flex-1 flex border-r border-gray-200 dark:border-gray-700">
              <div className="w-12 flex-shrink-0 border-r border-gray-200 dark:border-gray-700"></div>
              <div className="flex-1"></div>
            </div>
            {/* Right side (added) */}
            <div className="flex-1 flex bg-green-50 dark:bg-green-900/20 hover:bg-green-100/70 dark:hover:bg-green-900/40">
              <div className="w-12 flex-shrink-0 text-right pr-2 text-gray-400 dark:text-gray-500 text-[10px] leading-5 select-none border-r border-green-200 dark:border-green-800">
                {line.newLineNum}
              </div>
              <div className="flex-1 text-green-800 dark:text-green-200 pl-3 pr-2 leading-5">
                <span className="inline-block w-4 text-center text-green-600 dark:text-green-400 font-bold text-xs">+</span>
                <span className="ml-1 font-mono text-xs">{renderContent(line.content)}</span>
              </div>
            </div>
          </div>
        );
        i++;
      }
    }

    return rows;
  };

  const diffLines = diffContent ? parseDiffLines(diffContent) : [];

  return (
    <div className="h-full flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
      {/* Header with view mode toggle */}
      <div className="bg-gray-50 dark:bg-gray-700/30 px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 font-mono truncate">
            {filepath}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-medium uppercase">
              {extension || 'file'}
            </span>
            {/* View mode toggle */}
            <div className="flex items-center gap-0.5 bg-gray-200 dark:bg-gray-700 rounded-md p-0.5">
              <button
                onClick={() => setViewMode('unified')}
                className={`px-2 py-0.5 text-[10px] rounded transition-all ${
                  viewMode === 'unified'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Unified view"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`px-2 py-0.5 text-[10px] rounded transition-all ${
                  viewMode === 'split'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Split view"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4v16m6-16v16M4 8h16M4 16h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-auto font-mono text-xs bg-gray-50/30 dark:bg-gray-900/30">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Loading diff...</span>
            </div>
          </div>
        ) : diffContent ? (
          <div className="min-h-full">
            {viewMode === 'unified' ? renderUnifiedDiff(diffLines) : renderSplitDiff(diffLines)}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">No changes to display</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileDiffPreview;