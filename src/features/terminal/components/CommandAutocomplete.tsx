import React, { useEffect, useRef } from 'react';

export interface CompletionItem {
  value: string;
  type: 'file' | 'directory' | 'command' | 'git-branch' | 'env-var' | 'history' | 'saved-command';
  description?: string;
}

interface CommandAutocompleteProps {
  suggestions: CompletionItem[];
  selectedIndex: number;
  onSelect: (suggestion: CompletionItem) => void;
  position: { x: number; y: number };
}

export default function CommandAutocomplete({
  suggestions,
  selectedIndex,
  onSelect,
  position
}: CommandAutocompleteProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  if (suggestions.length === 0) {
    return null;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'file':
        return (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'directory':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        );
      case 'command':
        return (
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'git-branch':
        return (
          <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      case 'env-var':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        );
      case 'history':
        return (
          <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'saved-command':
        return (
          <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        maxHeight: '300px',
        minWidth: '300px',
        maxWidth: '500px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
      }}
    >
      <div ref={listRef} className="overflow-y-auto max-h-[300px]">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className={`
              flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors
              ${index === selectedIndex
                ? 'bg-blue-500 text-white'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
            onClick={() => onSelect(suggestion)}
          >
            <div className="flex-shrink-0">
              {getIcon(suggestion.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-mono truncate ${index === selectedIndex ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                {suggestion.value}
              </div>
              {suggestion.description && (
                <div className={`text-xs truncate ${index === selectedIndex ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                  {suggestion.description}
                </div>
              )}
            </div>
            <div className={`flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${
              index === selectedIndex
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              {suggestion.type === 'history' ? 'HIST' :
               suggestion.type === 'env-var' ? 'ENV' :
               suggestion.type === 'git-branch' ? 'GIT' :
               suggestion.type === 'command' ? 'CMD' :
               suggestion.type === 'saved-command' ? 'SAVED' :
               suggestion.type === 'directory' ? 'DIR' : 'FILE'}
            </div>
          </div>
        ))}
      </div>
      <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 text-[10px] text-gray-500 dark:text-gray-400 flex items-center justify-between">
        <span>↑↓ Navigate</span>
        <span>Tab / Enter: Select</span>
        <span>Esc: Close</span>
      </div>
    </div>
  );
}
