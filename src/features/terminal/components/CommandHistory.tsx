import React, { useState, useEffect } from 'react';

interface CommandHistoryItem {
  id: string;
  command: string;
  timestamp: number;
  terminalId?: string;
}

interface CommandHistoryProps {
  terminalId?: string;
  onCommandSelect: (command: string) => void;
}

export default function CommandHistory({ terminalId, onCommandSelect }: CommandHistoryProps) {
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load command history from localStorage
  useEffect(() => {
    const loadHistory = () => {
      try {
        // Load global history
        const globalHistoryKey = 'terminal_command_history_global';
        const globalHistory = localStorage.getItem(globalHistoryKey);
        
        const globalItems: CommandHistoryItem[] = globalHistory ? JSON.parse(globalHistory) : [];
        
        // Sort by timestamp (newest first) and remove duplicates
        const sortedHistory = globalItems
          .sort((a, b) => b.timestamp - a.timestamp)
          .filter((item, index, self) => 
            index === self.findIndex(t => t.command === item.command)
          )
          .slice(0, 50); // Limit to last 50 commands

        setHistory(sortedHistory);
      } catch (error) {
        console.error('Failed to load command history:', error);
        setHistory([]);
      }
    };

    loadHistory();

    // Listen for storage changes to update history in real-time
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'terminal_command_history_global') {
        loadHistory();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [terminalId]);

  const filteredHistory = history.filter(item => 
    item.command.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectCommand = (command: string) => {
    onCommandSelect(command);
    setShowHistory(false);
  };

  const clearHistory = () => {
    try {
      // Clear global history
      localStorage.removeItem('terminal_command_history_global');
      setHistory([]);
    } catch (error) {
      console.error('Failed to clear command history:', error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="text-gray-400 hover:text-gray-200 transition-colors p-1 mr-2"
        title="Command History"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {showHistory && (
        <div className="absolute right-0 top-8 w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
          <div className="p-3 border-b border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-200">Command History</h3>
              <button
                onClick={clearHistory}
                className="text-xs text-red-400 hover:text-red-300"
                title="Clear history"
              >
                Clear
              </button>
            </div>
            <input
              type="text"
              placeholder="Search commands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-gray-700 text-gray-200 rounded mb-2"
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {filteredHistory.length === 0 ? (
              <div className="p-3 text-center text-gray-400 text-xs">
                No command history
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div 
                  key={item.id} 
                  className="p-2 border-b border-gray-700 last:border-0 hover:bg-gray-750 cursor-pointer"
                  onClick={() => handleSelectCommand(item.command)}
                >
                  <div className="text-sm font-mono text-gray-200 truncate" title={item.command}>
                    {item.command}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}