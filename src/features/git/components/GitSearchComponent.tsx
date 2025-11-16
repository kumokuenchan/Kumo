import React, { useState, useEffect, useCallback } from 'react';
import { useGit } from '../GitContext';

interface FileStatus {
  filepath: string;
  index: string;
  workdir: string;
  stage: string;
}

interface GitSearchComponentProps {
  onFileSelect?: (filepath: string) => void;
  onSearchResults?: (results: FileStatus[]) => void;
  statusFiles: FileStatus[];
}

const GitSearchComponent: React.FC<GitSearchComponentProps> = ({ 
  onFileSelect, 
  onSearchResults,
  statusFiles 
}) => {
  const { gitService } = useGit();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredFiles, setFilteredFiles] = useState<FileStatus[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const filterFiles = useCallback((files: FileStatus[], term: string) => {
    if (!term) return files;
    const lowerTerm = term.toLowerCase();
    return files.filter(file => 
      file.filepath.toLowerCase().includes(lowerTerm)
    );
  }, []);

  useEffect(() => {
    if (searchTerm) {
      setIsLoading(true);
      const results = filterFiles(statusFiles, searchTerm);
      setFilteredFiles(results);
      onSearchResults?.(results);
      setIsLoading(false);
    } else {
      setFilteredFiles([]);
      onSearchResults?.(statusFiles);
    }
  }, [searchTerm, statusFiles, filterFiles, onSearchResults]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, filteredFiles.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      onFileSelect?.(filteredFiles[activeIndex].filepath);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  };

  const handleFileClick = (filepath: string) => {
    onFileSelect?.(filepath);
    setSearchTerm('');
    setShowDropdown(false);
    setActiveIndex(-1);
  };

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder="Search files..."
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
        />
      </div>

      {showDropdown && searchTerm && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              Searching...
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              No files found
            </div>
          ) : (
            <ul>
              {filteredFiles.map((file, index) => (
                <li
                  key={file.filepath}
                  className={`px-4 py-2.5 text-sm cursor-pointer transition-all duration-150 ${
                    index === activeIndex
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                  onClick={() => handleFileClick(file.filepath)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono truncate">{file.filepath}</span>
                    <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-700/50 px-1.5 py-0.5 rounded">
                      {file.workdir === 'modified' ? 'M' : 
                       file.workdir === 'added' ? 'A' : 
                       file.workdir === 'deleted' ? 'D' : 
                       file.workdir === 'untracked' ? '?' : ' ' }
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default GitSearchComponent;