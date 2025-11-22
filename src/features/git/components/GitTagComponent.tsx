import React, { useState, useEffect } from 'react';
import { useGit } from '../GitContext';

interface GitTag {
  name: string;
  commit: string;
  message?: string;
  date?: string;
}

interface GitTagComponentProps {
  onTagListUpdate?: () => void;
}

const GitTagComponent: React.FC<GitTagComponentProps> = ({ onTagListUpdate }) => {
  const { gitService } = useGit();
  const [tags, setTags] = useState<GitTag[]>([]);
  const [tagName, setTagName] = useState('');
  const [tagMessage, setTagMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLightweight, setIsLightweight] = useState(true);

  useEffect(() => {
    loadTags();
  }, [gitService]);

  const loadTags = async () => {
    if (!gitService) return;

    try {
      setIsLoading(true);
      const tagsData = await gitService.getTags();
      setTags(tagsData);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createTag = async () => {
    if (!gitService || !tagName.trim()) return;

    setIsCreating(true);
    try {
      const message = isLightweight ? undefined : tagMessage.trim();
      const success = await gitService.createTag(tagName.trim(), message);
      if (success) {
        setTagName('');
        setTagMessage('');
        onTagListUpdate?.();
        await loadTags();
      }
    } catch (error) {
      console.error('Error creating tag:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteTag = async (tagName: string) => {
    if (!gitService) return;

    try {
      const success = await gitService.deleteTag(tagName);
      if (success) {
        onTagListUpdate?.();
        await loadTags();
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Create Tag</h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="Tag name (e.g. v1.0.0)"
              className="flex-1 px-3 py-2 text-sm border border-gray-300/60 dark:border-gray-600/60 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 dark:bg-gray-700/30 dark:text-white transition-all duration-200"
            />
            <button
              onClick={createTag}
              disabled={isCreating || !tagName.trim()}
              className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-1.5 shadow-sm ${
                isCreating || !tagName.trim()
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
              }`}
            >
              {isCreating ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Create Tag
                </>
              )}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={isLightweight}
                onChange={(e) => setIsLightweight(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 shadow-sm"
              />
              <span>Lightweight tag (no message)</span>
            </label>
          </div>
          {!isLightweight && (
            <textarea
              value={tagMessage}
              onChange={(e) => setTagMessage(e.target.value)}
              placeholder="Tag message (optional)"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300/60 dark:border-gray-600/60 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 dark:bg-gray-700/30 dark:text-white transition-all duration-200"
            />
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Tags</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : tags.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <p>No tags found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tags.map((tag, index) => (
              <div 
                key={tag.name} 
                className="p-3 bg-gray-50/70 dark:bg-gray-700/30 border border-gray-200/50 dark:border-gray-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {tag.name}
                    </span>
                    <span className="text-xs bg-gray-200 dark:bg-gray-700/50 px-1.5 py-0.5 rounded">
                      {tag.commit.substring(0, 7)}
                    </span>
                  </div>
                  {tag.message && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {tag.message}
                    </div>
                  )}
                  {tag.date && (
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {tag.date}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => deleteTag(tag.name)}
                  className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs transition-all duration-200 shadow-sm"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GitTagComponent;