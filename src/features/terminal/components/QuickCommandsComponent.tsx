import React, { useState, useEffect } from 'react';

interface QuickCommand {
  id: string;
  name: string;
  command: string;
  description?: string;
}

interface QuickCommandsComponentProps {
  terminalId?: string;
  onExecuteCommand: (command: string) => void;
  onInsertCommand: (command: string) => void;
}

export default function QuickCommandsComponent({
  terminalId,
  onExecuteCommand,
  onInsertCommand
}: QuickCommandsComponentProps) {
  const [quickCommands, setQuickCommands] = useState<QuickCommand[]>([]);
  const [newCommandName, setNewCommandName] = useState<string>('');
  const [newCommandValue, setNewCommandValue] = useState<string>('');
  const [newCommandDescription, setNewCommandDescription] = useState<string>('');
  const [editingCommandId, setEditingCommandId] = useState<string | null>(null);

  // Load quick commands from localStorage
  const loadQuickCommands = (): QuickCommand[] => {
    // Use a global key instead of terminal-specific key to share across terminals
    const key = `terminal_quick_commands_global`;
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Failed to load quick commands:', error);
      return [];
    }
  };

  // Save quick commands to localStorage
  const saveQuickCommands = (commands: QuickCommand[]) => {
    // Use a global key instead of terminal-specific key to share across terminals
    const key = `terminal_quick_commands_global`;
    try {
      localStorage.setItem(key, JSON.stringify(commands));
    } catch (error) {
      console.error('Failed to save quick commands:', error);
    }
  };

  // Initialize quick commands on component mount
  useEffect(() => {
    const commands = loadQuickCommands();
    setQuickCommands(commands);
  }, [terminalId]);

  // Method to add a new quick command
  const addQuickCommand = () => {
    if (!newCommandName.trim() || !newCommandValue.trim()) return;

    const newCommand: QuickCommand = {
      id: Date.now().toString(),
      name: newCommandName.trim(),
      command: newCommandValue.trim(),
      description: newCommandDescription.trim()
    };

    const updatedCommands = [...quickCommands, newCommand];
    setQuickCommands(updatedCommands);
    saveQuickCommands(updatedCommands);

    // Reset form
    setNewCommandName('');
    setNewCommandValue('');
    setNewCommandDescription('');
  };

  // Method to edit an existing quick command
  const editQuickCommand = (id: string) => {
    if (!newCommandName.trim() || !newCommandValue.trim()) return;

    const updatedCommands = quickCommands.map(cmd => 
      cmd.id === id 
        ? { 
            ...cmd, 
            name: newCommandName.trim(), 
            command: newCommandValue.trim(), 
            description: newCommandDescription.trim() 
          } 
        : cmd
    );
    
    setQuickCommands(updatedCommands);
    saveQuickCommands(updatedCommands);

    // Reset form and editing state
    setNewCommandName('');
    setNewCommandValue('');
    setNewCommandDescription('');
    setEditingCommandId(null);
  };

  // Method to delete a quick command
  const deleteQuickCommand = (id: string) => {
    const updatedCommands = quickCommands.filter(cmd => cmd.id !== id);
    setQuickCommands(updatedCommands);
    saveQuickCommands(updatedCommands);
  };

  // Method to start editing a command
  const startEditingCommand = (command: QuickCommand) => {
    setNewCommandName(command.name);
    setNewCommandValue(command.command);
    setNewCommandDescription(command.description || '');
    setEditingCommandId(command.id);
  };

  return (
    <div className="w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
      <div className="p-3 border-b border-gray-700">
        <h3 className="text-sm font-medium text-gray-200 mb-2">Quick Commands</h3>
        
        {/* Add/Edit Command Form */}
        <div className="mb-3">
          <input
            type="text"
            placeholder="Command name"
            value={newCommandName}
            onChange={(e) => setNewCommandName(e.target.value)}
            className="w-full px-2 py-1 text-xs bg-gray-700 text-gray-200 rounded mb-1"
          />
          <input
            type="text"
            placeholder="Command"
            value={newCommandValue}
            onChange={(e) => setNewCommandValue(e.target.value)}
            className="w-full px-2 py-1 text-xs bg-gray-700 text-gray-200 rounded mb-1"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newCommandDescription}
            onChange={(e) => setNewCommandDescription(e.target.value)}
            className="w-full px-2 py-1 text-xs bg-gray-700 text-gray-200 rounded mb-2"
          />
          <div className="flex gap-1">
            {editingCommandId ? (
              <>
                <button
                  onClick={() => editQuickCommand(editingCommandId)}
                  className="flex-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  Update
                </button>
                <button
                  onClick={() => {
                    setEditingCommandId(null);
                    setNewCommandName('');
                    setNewCommandValue('');
                    setNewCommandDescription('');
                  }}
                  className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={addQuickCommand}
                className="flex-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                Add Command
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Commands List */}
      <div className="max-h-60 overflow-y-auto">
        {quickCommands.length === 0 ? (
          <div className="p-3 text-center text-gray-400 text-xs">
            No quick commands saved
          </div>
        ) : (
          quickCommands.map((cmd) => (
            <div key={cmd.id} className="p-2 border-b border-gray-700 last:border-0 hover:bg-gray-750">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-200 truncate" title={cmd.name}>
                    {cmd.name}
                  </div>
                  <div className="text-xs text-gray-400 font-mono truncate" title={cmd.command}>
                    {cmd.command}
                  </div>
                  {cmd.description && (
                    <div className="text-xs text-gray-500 mt-1 truncate" title={cmd.description}>
                      {cmd.description}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => onExecuteCommand(cmd.command)}
                      className="p-1 text-green-400 hover:text-green-300"
                      title="Execute command"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h1m4 0h1M9 18h6" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onInsertCommand(cmd.command)}
                      className="p-1 text-blue-400 hover:text-blue-300"
                      title="Insert command (without executing)"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => startEditingCommand(cmd)}
                      className="p-1 text-yellow-400 hover:text-yellow-300"
                      title="Edit command"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteQuickCommand(cmd.id)}
                      className="p-1 text-red-400 hover:text-red-300"
                      title="Delete command"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}