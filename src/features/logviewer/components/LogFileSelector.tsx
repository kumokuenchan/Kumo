import React, { useState, useRef } from 'react';
import { Upload, Globe, FolderOpen, PlayCircle } from 'lucide-react';

interface LogFileSelectorProps {
  onFileSelected: (content: string) => void;
  selectedFile: string;
  onFilePathChange: (path: string) => void;
}

export default function LogFileSelector({
  onFileSelected,
  selectedFile,
  onFilePathChange
}: LogFileSelectorProps) {
  const [sourceType, setSourceType] = useState<'local' | 'remote'>('local');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLocalFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    onFilePathChange(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      onFileSelected(content);
    };
    reader.readAsText(file);
  };

  const handleRemoteLog = async () => {
    if (!remoteUrl) return;

    setIsLoading(true);
    try {
      const response = await fetch(remoteUrl);
      if (!response.ok) throw new Error('Failed to fetch remote log');

      const content = await response.text();
      onFilePathChange(remoteUrl);
      onFileSelected(content);
    } catch (error) {
      console.error('Error fetching remote log:', error);
      alert('Failed to load remote log file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWatchFile = async () => {
    if (!selectedFile) return;

    try {
      const response = await fetch('http://localhost:3001/api/logs/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: selectedFile })
      });

      if (!response.ok) throw new Error('Failed to start watching file');

      alert('File watching started. Logs will auto-update.');
    } catch (error) {
      console.error('Error watching file:', error);
      alert('Failed to start file watching. Make sure the server is running.');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-sm font-semibold text-gray-300 mb-3">Log Source</h2>

      {/* Source Type Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSourceType('local')}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
            sourceType === 'local'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <FolderOpen className="w-4 h-4 inline mr-1" />
          Local File
        </button>
        <button
          onClick={() => setSourceType('remote')}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
            sourceType === 'remote'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <Globe className="w-4 h-4 inline mr-1" />
          Remote URL
        </button>
      </div>

      {/* Local File Upload */}
      {sourceType === 'local' && (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".log,.txt"
            onChange={handleLocalFile}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Choose Log File
          </button>

          {selectedFile && sourceType === 'local' && (
            <div className="p-3 bg-gray-800 rounded text-xs text-gray-300 break-all">
              {selectedFile}
            </div>
          )}
        </div>
      )}

      {/* Remote URL */}
      {sourceType === 'remote' && (
        <div className="space-y-3">
          <input
            type="text"
            value={remoteUrl}
            onChange={(e) => setRemoteUrl(e.target.value)}
            placeholder="https://example.com/logs/app.log"
            className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:border-blue-500 text-sm"
          />
          <button
            onClick={handleRemoteLog}
            disabled={isLoading || !remoteUrl}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>Loading...</>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                Load Remote Log
              </>
            )}
          </button>
        </div>
      )}

      {/* Watch File Button */}
      {selectedFile && (
        <div className="pt-3 border-t border-gray-800">
          <button
            onClick={handleWatchFile}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <PlayCircle className="w-4 h-4" />
            Watch for Changes
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Auto-update when file changes
          </p>
        </div>
      )}
    </div>
  );
}
