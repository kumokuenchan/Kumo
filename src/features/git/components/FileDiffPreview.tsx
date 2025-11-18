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
          <div key={index} className="flex">
            <div className="w-12 text-right pr-2 text-gray-500 text-xs select-none bg-green-50 dark:bg-green-900/20 py-0.5">
              {index + 1}
            </div>
            <div className="flex-1 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200">
              <span className="bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100 px-1">+</span>
              <span className="ml-1 font-mono">{line.substring(1)}</span>
            </div>
          </div>
        );
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        return (
          <div key={index} className="flex">
            <div className="w-12 text-right pr-2 text-gray-500 text-xs select-none bg-red-50 dark:bg-red-900/20 py-0.5">
              {index + 1}
            </div>
            <div className="flex-1 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200">
              <span className="bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100 px-1">-</span>
              <span className="ml-1 font-mono">{line.substring(1)}</span>
            </div>
          </div>
        );
      } else if (line.startsWith('@@')) {
        return (
          <div key={index} className="flex bg-gray-100 dark:bg-gray-700/50 py-1 px-2 text-xs text-gray-600 dark:text-gray-400">
            <div className="w-12"></div>
            <div className="flex-1 font-mono">{line}</div>
          </div>
        );
      } else {
        return (
          <div key={index} className="flex">
            <div className="w-12 text-right pr-2 text-gray-500 text-xs select-none py-0.5">
              {index + 1}
            </div>
            <div className="flex-1">
              <span className="ml-6 font-mono">{line}</span>
            </div>
          </div>
        );
      }
    });
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-700/30 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 font-mono truncate">
            {filepath}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {extension.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
      <div className="font-mono text-xs overflow-x-auto max-h-60 overflow-y-auto bg-white dark:bg-gray-800">
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-500 dark:text-gray-400">Loading diff...</span>
          </div>
        ) : diffContent ? (
          parseDiff(diffContent)
        ) : (
          <div className="flex items-center justify-center p-4 text-gray-500 dark:text-gray-400">
            No changes to display
          </div>
        )}
      </div>
    </div>
  );
};

export default FileDiffPreview;