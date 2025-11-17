import React from 'react';

interface FileDiffPreviewProps {
  filepath: string;
}

const FileDiffPreview: React.FC<FileDiffPreviewProps> = ({ filepath }) => {
  // In a real implementation, this would fetch the actual diff
  // For now, we'll simulate different types of diffs
  
  const getFileExtension = (path: string) => {
    return path.split('.').pop()?.toLowerCase() || '';
  };
  
  const extension = getFileExtension(filepath);
  
  // Simulate different diff content based on file type
  const getSampleDiff = () => {
    switch (extension) {
      case 'ts':
      case 'tsx':
        return `@@ -10,7 +10,7 @@ import React from 'react';
 import { useState } from 'react';
 
 const MyComponent: React.FC = () => {
-  const [count, setCount] = useState(0);
+  const [count, setCount] = useState<number>(0);
  
   const increment = () => {
     setCount(count + 1);
@@ -25,6 +25,8 @@ const MyComponent: React.FC = () => {
   return (
     <div>
       <h1>Counter: {count}</h1>
+      <button onClick={increment}>
+        Click me
+      </button>
       <p>Current value: {count}</p>
     </div>
   );
`;
      case 'md':
        return `@@ -1,5 +1,7 @@
 # Project Documentation
 
 This is the main documentation file.
 
+## New Section
+
+This section was added in the latest commit.
+
 ## Getting Started
 
 Instructions for getting started with the project.`;
      case 'json':
        return `@@ -2,6 +2,7 @@
   "name": "my-project",
   "version": "1.0.0",
   "description": "A sample project",
+  "author": "John Doe",
   "scripts": {
     "start": "node index.js",
     "test": "jest"
`;
      default:
        return `@@ -1,3 +1,4 @@
 Line 1
-Line 2
+Modified line 2
+New line 3
 Line 4`;
    }
  };
  
  const diffContent = getSampleDiff();
  
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
        {parseDiff(diffContent)}
      </div>
    </div>
  );
};

export default FileDiffPreview;