import React, { useState, useRef } from 'react';
import { Upload, Globe, FolderOpen, PlayCircle, Archive, FileText } from 'lucide-react';
import JSZip from 'jszip';
import pako from 'pako';

interface LogFileSelectorProps {
  onFileSelected: (content: string) => void;
  selectedFile: string;
  onFilePathChange: (path: string) => void;
}

interface ArchiveFile {
  name: string;
  content: string;
}

export default function LogFileSelector({
  onFileSelected,
  selectedFile,
  onFilePathChange
}: LogFileSelectorProps) {
  const [sourceType, setSourceType] = useState<'local' | 'remote'>('local');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [archiveFiles, setArchiveFiles] = useState<ArchiveFile[]>([]);
  const [showArchiveSelector, setShowArchiveSelector] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCompressedFile = (filename: string): boolean => {
    return /\.(zip|gz|tar\.gz|tgz)$/i.test(filename);
  };

  const extractZipFile = async (file: File): Promise<ArchiveFile[]> => {
    const zip = await JSZip.loadAsync(file);
    const files: ArchiveFile[] = [];

    for (const [filename, zipEntry] of Object.entries(zip.files)) {
      if (!zipEntry.dir && /\.(log|txt)$/i.test(filename)) {
        const content = await zipEntry.async('text');
        files.push({ name: filename, content });
      }
    }

    return files;
  };

  const extractGzFile = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const compressed = new Uint8Array(arrayBuffer);
    const decompressed = pako.ungzip(compressed, { to: 'string' });
    return decompressed;
  };

  const extractTarGzFile = async (file: File): Promise<ArchiveFile[]> => {
    // First decompress the gzip
    const arrayBuffer = await file.arrayBuffer();
    const compressed = new Uint8Array(arrayBuffer);
    const decompressed = pako.ungzip(compressed);

    // Simple tar parser (basic implementation)
    const files: ArchiveFile[] = [];
    let offset = 0;

    while (offset < decompressed.length) {
      // Read tar header (512 bytes)
      if (offset + 512 > decompressed.length) break;

      // File name is at offset 0, 100 bytes
      const nameBytes = decompressed.slice(offset, offset + 100);
      const name = new TextDecoder().decode(nameBytes).replace(/\0.*$/g, '');

      // File size is at offset 124, 12 bytes (octal)
      const sizeBytes = decompressed.slice(offset + 124, offset + 136);
      const sizeStr = new TextDecoder().decode(sizeBytes).trim().replace(/\0.*$/g, '');
      const size = parseInt(sizeStr, 8);

      // File type at offset 156
      const typeFlag = String.fromCharCode(decompressed[offset + 156]);

      offset += 512; // Skip header

      if (name && typeFlag === '0' && size > 0 && /\.(log|txt)$/i.test(name)) {
        // Regular file
        const contentBytes = decompressed.slice(offset, offset + size);
        const content = new TextDecoder().decode(contentBytes);
        files.push({ name, content });
      }

      // Move to next file (tar blocks are 512-byte aligned)
      offset += Math.ceil(size / 512) * 512;
    }

    return files;
  };

  const handleLocalFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      if (isCompressedFile(file.name)) {
        let extractedFiles: ArchiveFile[] = [];

        if (file.name.endsWith('.zip')) {
          extractedFiles = await extractZipFile(file);
        } else if (file.name.endsWith('.tar.gz') || file.name.endsWith('.tgz')) {
          extractedFiles = await extractTarGzFile(file);
        } else if (file.name.endsWith('.gz')) {
          const content = await extractGzFile(file);
          const originalName = file.name.replace(/\.gz$/i, '');
          extractedFiles = [{ name: originalName, content }];
        }

        if (extractedFiles.length === 0) {
          alert('No log files found in the archive');
          return;
        }

        if (extractedFiles.length === 1) {
          // Only one file, load it directly
          onFilePathChange(`${file.name} → ${extractedFiles[0].name}`);
          onFileSelected(extractedFiles[0].content);
        } else {
          // Multiple files, show selector
          setArchiveFiles(extractedFiles);
          setShowArchiveSelector(true);
          onFilePathChange(file.name);
        }
      } else {
        // Regular file
        onFilePathChange(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          onFileSelected(content);
        };
        reader.readAsText(file);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Failed to extract archive. Please ensure it\'s a valid compressed file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchiveFileSelect = (archiveFile: ArchiveFile) => {
    onFilePathChange(`${selectedFile} → ${archiveFile.name}`);
    onFileSelected(archiveFile.content);
    setShowArchiveSelector(false);
    setArchiveFiles([]);
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
            accept=".log,.txt,.zip,.gz,.tar.gz,.tgz"
            onChange={handleLocalFile}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Extracting...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Choose Log File
              </>
            )}
          </button>

          <div className="text-xs text-gray-500 text-center">
            Supports: .log, .txt, .zip, .gz, .tar.gz
          </div>

          {selectedFile && sourceType === 'local' && (
            <div className="p-3 bg-gray-800 rounded">
              <div className="flex items-start gap-2">
                {isCompressedFile(selectedFile) ? (
                  <Archive className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="text-xs text-gray-300 break-all flex-1">
                  {selectedFile}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Archive File Selector Modal */}
      {showArchiveSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              Select a log file from archive
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {archiveFiles.map((file, index) => (
                <button
                  key={index}
                  onClick={() => handleArchiveFileSelect(file)}
                  className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 text-left rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{file.name}</div>
                      <div className="text-xs text-gray-500">
                        {(file.content.length / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowArchiveSelector(false);
                setArchiveFiles([]);
              }}
              className="mt-4 w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
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
      {selectedFile && !isCompressedFile(selectedFile) && (
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
