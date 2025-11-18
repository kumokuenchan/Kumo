import React, { useState, useEffect } from 'react';
import { useGit } from '../GitContext';

interface FileDiffPreviewProps {
  filepath: string;
  commitOid: string;
}

const FileDiffPreview: React.FC<FileDiffPreviewProps> = ({ filepath, commitOid }) => {
  const { gitService } = useGit();
  const [diffContent, setDiffContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

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
  
  // Parse diff to highlight additions and deletions
  const parseDiff = (diff: string) => {
    return diff.split('\n').map((line, index) => {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        return (
          <div key={index} className="flex hover:bg-green-100/50 dark:hover:bg-green-900/30 transition-colors">
            <div className="w-16 flex-shrink-0 text-right pr-3 text-gray-400 dark:text-gray-500 text-xs select-none bg-green-50 dark:bg-green-900/20 py-1 border-r border-green-200 dark:border-green-800">
              {index + 1}
            </div>
            <div className="flex-1 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 py-1">
              <span className="inline-block w-6 text-center bg-green-200/50 dark:bg-green-800/50 text-green-700 dark:text-green-300 font-semibold">+</span>
              <span className="ml-2 font-mono">{line.substring(1)}</span>
            </div>
          </div>
        );
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        return (
          <div key={index} className="flex hover:bg-red-100/50 dark:hover:bg-red-900/30 transition-colors">
            <div className="w-16 flex-shrink-0 text-right pr-3 text-gray-400 dark:text-gray-500 text-xs select-none bg-red-50 dark:bg-red-900/20 py-1 border-r border-red-200 dark:border-red-800">
              {index + 1}
            </div>
            <div className="flex-1 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 py-1">
              <span className="inline-block w-6 text-center bg-red-200/50 dark:bg-red-800/50 text-red-700 dark:text-red-300 font-semibold">-</span>
              <span className="ml-2 font-mono">{line.substring(1)}</span>
            </div>
          </div>
        );
      } else if (line.startsWith('@@')) {
        return (
          <div key={index} className="flex bg-blue-50 dark:bg-blue-900/20 border-y border-blue-200 dark:border-blue-800 sticky top-0 z-10">
            <div className="w-16 flex-shrink-0"></div>
            <div className="flex-1 py-1.5 px-2 font-mono text-blue-700 dark:text-blue-300 font-semibold text-xs">{line}</div>
          </div>
        );
      } else {
        return (
          <div key={index} className="flex hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
            <div className="w-16 flex-shrink-0 text-right pr-3 text-gray-400 dark:text-gray-500 text-xs select-none py-1 border-r border-gray-200 dark:border-gray-700">
              {index + 1}
            </div>
            <div className="flex-1 text-gray-700 dark:text-gray-300 py-1">
              <span className="inline-block w-6"></span>
              <span className="ml-2 font-mono">{line}</span>
            </div>
          </div>
        );
      }
    });
  };

  return (
    <div className="h-full flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
      <div className="bg-gray-50 dark:bg-gray-700/30 px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 font-mono truncate">
            {filepath}
          </span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-medium uppercase">
            {extension || 'file'}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-auto font-mono text-xs">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Loading diff...</span>
            </div>
          </div>
        ) : diffContent ? (
          <div className="min-h-full">
            {parseDiff(diffContent)}
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