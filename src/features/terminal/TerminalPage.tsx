import React, { useState } from 'react';
import TerminalComponent from './components/TerminalComponent';

interface TerminalTab {
  id: string;
  name: string;
}

export default function TerminalPage() {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: '1', name: 'Terminal 1' }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('1');

  const handleCommandSubmit = (command: string) => {
    // Command is handled by TerminalComponent
  };

  const addNewTab = () => {
    const newId = Date.now().toString();
    const newTab: TerminalTab = {
      id: newId,
      name: `Terminal ${tabs.length + 1}`
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
  };

  const closeTab = (tabId: string) => {
    if (tabs.length === 1) return; // Don't close the last tab

    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);

    // If closing the active tab, switch to the first remaining tab
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id);
    }
  };

  const renameTab = (tabId: string, newName: string) => {
    setTabs(tabs.map(tab =>
      tab.id === tabId ? { ...tab, name: newName } : tab
    ));
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-6 h-6 bg-gradient-to-br from-gray-600 to-gray-800 dark:from-gray-400 dark:to-gray-600 rounded-lg flex items-center justify-center">
              <span className="text-xs text-white font-mono">_</span>
            </span>
            Terminal
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Interactive command terminal for database operations and system commands
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white dark:bg-[#0d1117] rounded-2xl border border-gray-200/50 dark:border-gray-800/50 shadow-sm overflow-hidden">
            {/* Tab Bar */}
            <div className="flex items-center border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161b22]">
              <div className="flex-1 flex items-center overflow-x-auto">
                {tabs.map((tab) => (
                  <div
                    key={tab.id}
                    className={`
                      group relative flex items-center gap-2 px-4 py-2 cursor-pointer transition-colors
                      border-r border-gray-200 dark:border-gray-800
                      ${activeTabId === tab.id
                        ? 'bg-white dark:bg-[#0d1117] text-gray-900 dark:text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                      }
                    `}
                    onClick={() => setActiveTabId(tab.id)}
                  >
                    <span className="text-sm font-medium whitespace-nowrap">{tab.name}</span>
                    {tabs.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(tab.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add New Tab Button */}
              <button
                onClick={addNewTab}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                title="New terminal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Terminal Content */}
            <div className="p-6">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  style={{ display: activeTabId === tab.id ? 'block' : 'none' }}
                >
                  <TerminalComponent
                    onCommandSubmit={handleCommandSubmit}
                    terminalId={tab.id}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}