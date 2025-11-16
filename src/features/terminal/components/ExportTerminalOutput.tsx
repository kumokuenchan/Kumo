import React from 'react';

interface ExportTerminalOutputProps {
  terminalId?: string;
  onExport?: (content: string, filename: string) => void;
}

export default function ExportTerminalOutput({ terminalId, onExport }: ExportTerminalOutputProps) {
  const exportTerminalOutput = () => {
    if (!terminalId) return;

    // Get terminal buffer from localStorage
    const storageKey = `terminal_buffer_${terminalId}`;
    const saved = localStorage.getItem(storageKey);

    if (!saved) {
      alert('No terminal output to export');
      return;
    }

    try {
      const { lines } = JSON.parse(saved);

      if (!lines || lines.length === 0) {
        alert('No terminal output to export');
        return;
      }

      // Join lines with newlines
      const content = lines.join('\n');
      
      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `terminal-output-${timestamp}.txt`;

      // If onExport callback is provided, use it
      if (onExport) {
        onExport(content, filename);
        return;
      }

      // Default export implementation
      // Create a Blob with the content
      const blob = new Blob([content], { type: 'text/plain' });
      
      // Create a download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('Terminal output exported successfully');
    } catch (error) {
      console.error('Failed to export terminal output:', error);
      alert('Failed to export terminal output');
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={exportTerminalOutput}
        className="px-3 py-1 bg-black-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
        title="Export terminal output"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export
      </button>
    </div>
  );
}