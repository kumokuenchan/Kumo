import { useState, useEffect, useRef } from 'react';
import { Plus, X, Clock, Folder, Edit2, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import RequestEditor from './RequestEditor';
import HistoryPanel from './HistoryPanel';
import CollectionsPanel from './CollectionsPanel';
import type { ApiRequest, ApiResponse } from '../../api/apiTester';

interface RequestTab {
  id: string;
  name: string;
  request: ApiRequest;
  response: ApiResponse | null;
  isSaved: boolean;
  groupId?: string;
}

interface TabGroup {
  id: string;
  name: string;
  color: string;
  collapsed: boolean;
}

const TAB_GROUP_COLORS = [
  { name: 'Blue', value: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-500' },
  { name: 'Green', value: 'bg-green-500', text: 'text-green-700 dark:text-green-300', border: 'border-green-500' },
  { name: 'Red', value: 'bg-red-500', text: 'text-red-700 dark:text-red-300', border: 'border-red-500' },
  { name: 'Yellow', value: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-500' },
  { name: 'Purple', value: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-500' },
  { name: 'Pink', value: 'bg-pink-500', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-500' },
  { name: 'Orange', value: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-500' },
  { name: 'Cyan', value: 'bg-cyan-500', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-500' },
];

export default function PostmanTab() {
  // Load tabs from localStorage
  const loadSavedTabs = (): RequestTab[] => {
    try {
      const saved = localStorage.getItem('apiTesterTabs');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((t: any) => ({
          ...t,
          response: null, // Don't persist responses
        }));
      }
    } catch (e) {
      console.error('Failed to load saved tabs:', e);
    }
    return [createNewTab()];
  };

  // Load groups from localStorage
  const loadSavedGroups = (): TabGroup[] => {
    try {
      const saved = localStorage.getItem('apiTesterGroups');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load saved groups:', e);
    }
    return [];
  };

  const [tabs, setTabs] = useState<RequestTab[]>(loadSavedTabs);
  const [groups, setGroups] = useState<TabGroup[]>(loadSavedGroups);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [showCollections, setShowCollections] = useState(false);
  const [editingTabIndex, setEditingTabIndex] = useState<number | null>(null);
  const [editingTabName, setEditingTabName] = useState('');
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [selectedTabsForGroup, setSelectedTabsForGroup] = useState<number[]>([]);
  const [contextMenuTab, setContextMenuTab] = useState<number | null>(null);
  const [contextMenuGroup, setContextMenuGroup] = useState<string | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [draggingTabIndex, setDraggingTabIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  const tabContainerRef = useRef<HTMLDivElement>(null);

  // Persist tabs to localStorage
  useEffect(() => {
    try {
      const toSave = tabs.map(({ id, name, request, isSaved, groupId }) => ({
        id,
        name,
        request,
        isSaved,
        groupId,
      }));
      localStorage.setItem('apiTesterTabs', JSON.stringify(toSave));
    } catch (e) {
      console.error('Failed to save tabs:', e);
    }
  }, [tabs]);

  // Persist groups to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('apiTesterGroups', JSON.stringify(groups));
    } catch (e) {
      console.error('Failed to save groups:', e);
    }
  }, [groups]);

  function createNewTab(): RequestTab {
    return {
      id: `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: 'New Request',
      request: {
        method: 'GET',
        url: '',
        headers: {},
        params: {},
      },
      response: null,
      isSaved: false,
    };
  }

  const addTab = () => {
    const newTab = createNewTab();
    setTabs([...tabs, newTab]);
    setActiveTabIndex(tabs.length);
  };

  const closeTab = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (tabs.length === 1) {
      // Don't close the last tab, just reset it
      setTabs([createNewTab()]);
      setActiveTabIndex(0);
      return;
    }

    const newTabs = tabs.filter((_, i) => i !== index);
    setTabs(newTabs);

    if (index === activeTabIndex) {
      setActiveTabIndex(Math.max(0, index - 1));
    } else if (index < activeTabIndex) {
      setActiveTabIndex(activeTabIndex - 1);
    }
  };

  const updateTabRequest = (request: ApiRequest) => {
    setTabs(prev => {
      const newTabs = [...prev];
      newTabs[activeTabIndex] = {
        ...newTabs[activeTabIndex],
        request,
        isSaved: false,
      };
      return newTabs;
    });
  };

  const updateTabResponse = (response: ApiResponse) => {
    setTabs(prev => {
      const newTabs = [...prev];
      newTabs[activeTabIndex] = {
        ...newTabs[activeTabIndex],
        response,
      };
      return newTabs;
    });
  };

  const renameTab = (index: number, name: string) => {
    setTabs(prev => {
      const newTabs = [...prev];
      newTabs[index] = {
        ...newTabs[index],
        name,
      };
      return newTabs;
    });
  };

  const startEditingTab = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTabIndex(index);
    setEditingTabName(tabs[index].name);
  };

  const saveTabName = () => {
    if (editingTabIndex !== null && editingTabName.trim()) {
      renameTab(editingTabIndex, editingTabName.trim());
    }
    setEditingTabIndex(null);
    setEditingTabName('');
  };

  const cancelEditingTab = () => {
    setEditingTabIndex(null);
    setEditingTabName('');
  };

  const handleTabNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveTabName();
    } else if (e.key === 'Escape') {
      cancelEditingTab();
    }
  };

  // Check if scrolling is possible
  const updateScrollButtons = () => {
    if (tabContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  // Scroll tabs left
  const scrollTabsLeft = () => {
    if (tabContainerRef.current) {
      tabContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  // Scroll tabs right
  const scrollTabsRight = () => {
    if (tabContainerRef.current) {
      tabContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  // Update scroll buttons when tabs change or container scrolls
  useEffect(() => {
    updateScrollButtons();
    const container = tabContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollButtons);
      window.addEventListener('resize', updateScrollButtons);
      return () => {
        container.removeEventListener('scroll', updateScrollButtons);
        window.removeEventListener('resize', updateScrollButtons);
      };
    }
  }, [tabs]);

  const handleLoadRequest = (request: ApiRequest) => {
    // Create a new tab with the loaded request
    const newTab: RequestTab = {
      id: `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: request.url ? new URL(request.url).pathname : 'Loaded Request',
      request,
      response: null,
      isSaved: false,
    };
    setTabs([...tabs, newTab]);
    setActiveTabIndex(tabs.length);
  };

  // Group management functions
  const createGroup = (name: string, color: string, tabIndices: number[]) => {
    const newGroup: TabGroup = {
      id: `group_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      color,
      collapsed: false,
    };
    setGroups([...groups, newGroup]);

    // Assign tabs to this group
    setTabs(prev => prev.map((tab, index) =>
      tabIndices.includes(index) ? { ...tab, groupId: newGroup.id } : tab
    ));
  };

  const addTabToGroup = (tabIndex: number, groupId: string) => {
    setTabs(prev => prev.map((tab, index) =>
      index === tabIndex ? { ...tab, groupId } : tab
    ));
  };

  const removeTabFromGroup = (tabIndex: number) => {
    setTabs(prev => prev.map((tab, index) =>
      index === tabIndex ? { ...tab, groupId: undefined } : tab
    ));
  };

  const toggleGroupCollapse = (groupId: string) => {
    setGroups(prev => prev.map(group =>
      group.id === groupId ? { ...group, collapsed: !group.collapsed } : group
    ));
  };

  const deleteGroup = (groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
    // Remove groupId from all tabs in this group
    setTabs(prev => prev.map(tab =>
      tab.groupId === groupId ? { ...tab, groupId: undefined } : tab
    ));
  };

  const renameGroup = (groupId: string, newName: string) => {
    setGroups(prev => prev.map(group =>
      group.id === groupId ? { ...group, name: newName } : group
    ));
  };

  const changeGroupColor = (groupId: string, newColor: string) => {
    setGroups(prev => prev.map(group =>
      group.id === groupId ? { ...group, color: newColor } : group
    ));
  };

  const handleTabRightClick = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuTab(index);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const handleGroupRightClick = (groupId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuGroup(groupId);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => {
    setContextMenuTab(null);
    setContextMenuGroup(null);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    if (contextMenuTab !== null || contextMenuGroup !== null) {
      const handleClick = () => closeContextMenu();
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenuTab, contextMenuGroup]);

  // Get tabs organized by group
  const getOrganizedTabs = () => {
    const ungroupedTabs: Array<{ tab: RequestTab; index: number }> = [];
    const groupedTabs: Record<string, Array<{ tab: RequestTab; index: number }>> = {};

    tabs.forEach((tab, index) => {
      if (tab.groupId) {
        if (!groupedTabs[tab.groupId]) {
          groupedTabs[tab.groupId] = [];
        }
        groupedTabs[tab.groupId].push({ tab, index });
      } else {
        ungroupedTabs.push({ tab, index });
      }
    });

    return { ungroupedTabs, groupedTabs };
  };

  // Drag and drop handlers
  const handleDragStart = (index: number, e: React.DragEvent) => {
    setDraggingTabIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Set a transparent drag image
    const dragImage = document.createElement('div');
    dragImage.style.opacity = '0';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggingTabIndex !== null && draggingTabIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragOverGroup = (groupId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverGroupId(groupId);
  };

  const handleDragLeaveGroup = () => {
    setDragOverGroupId(null);
  };

  const handleDrop = (targetIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggingTabIndex === null || draggingTabIndex === targetIndex) {
      setDraggingTabIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder tabs
    const newTabs = [...tabs];
    const [draggedTab] = newTabs.splice(draggingTabIndex, 1);
    newTabs.splice(targetIndex, 0, draggedTab);
    setTabs(newTabs);

    // Update active tab index
    if (activeTabIndex === draggingTabIndex) {
      setActiveTabIndex(targetIndex);
    } else if (draggingTabIndex < activeTabIndex && targetIndex >= activeTabIndex) {
      setActiveTabIndex(activeTabIndex - 1);
    } else if (draggingTabIndex > activeTabIndex && targetIndex <= activeTabIndex) {
      setActiveTabIndex(activeTabIndex + 1);
    }

    setDraggingTabIndex(null);
    setDragOverIndex(null);
  };

  const handleDropOnGroup = (groupId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggingTabIndex !== null) {
      addTabToGroup(draggingTabIndex, groupId);
    }

    setDraggingTabIndex(null);
    setDragOverGroupId(null);
  };

  const handleDragEnd = () => {
    setDraggingTabIndex(null);
    setDragOverIndex(null);
    setDragOverGroupId(null);
  };

  const activeTab = tabs[activeTabIndex];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Tab Bar */}
      <div className="flex items-center bg-gray-100 dark:bg-slate-800 border-b border-gray-300 dark:border-slate-700 relative">
        <style>{`
          .tab-scroll-container::-webkit-scrollbar {
            display: none;
          }
          .tab-scroll-container {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
        {/* Left scroll button */}
        {canScrollLeft && (
          <button
            onClick={scrollTabsLeft}
            className="flex-shrink-0 px-1 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            title="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Tabs container with horizontal scroll */}
        <div
          ref={tabContainerRef}
          className="tab-scroll-container flex items-center gap-2 px-2 py-1 overflow-x-auto flex-1"
        >
          {(() => {
            const { ungroupedTabs, groupedTabs } = getOrganizedTabs();
            const renderTab = (tab: RequestTab, index: number) => {
              const group = tab.groupId ? groups.find(g => g.id === tab.groupId) : null;
              const colorInfo = group ? TAB_GROUP_COLORS.find(c => c.value === group.color) : null;

              return (
                <div
                  key={tab.id}
                  draggable={true}
                  onClick={() => setActiveTabIndex(index)}
                  onContextMenu={(e) => handleTabRightClick(index, e)}
                  onDragStart={(e) => handleDragStart(index, e)}
                  onDragOver={(e) => handleDragOver(index, e)}
                  onDrop={(e) => handleDrop(index, e)}
                  onDragEnd={handleDragEnd}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded cursor-move transition-all flex-shrink-0 ${
                    tabs.length > 5 ? 'min-w-[100px] max-w-[150px]' : 'min-w-[120px] max-w-[200px]'
                  } ${
                    index === activeTabIndex
                      ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-slate-600'
                  } ${group ? `border-l-4 ${colorInfo?.border}` : ''}
                  ${draggingTabIndex === index ? 'opacity-50 scale-95' : ''}
                  ${dragOverIndex === index ? 'border-2 border-blue-500 border-dashed' : ''}`}
                >
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                tab.request.method === 'GET'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : tab.request.method === 'POST'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : tab.request.method === 'PUT'
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                  : tab.request.method === 'DELETE'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
              }`}
            >
              {tab.request.method}
            </span>

            {/* Tab name display or edit */}
            {editingTabIndex === index ? (
              <input
                type="text"
                value={editingTabName}
                onChange={(e) => setEditingTabName(e.target.value)}
                onBlur={saveTabName}
                onKeyDown={handleTabNameKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-white dark:bg-slate-800 text-sm outline-none min-w-0 px-1 py-0.5 border border-blue-500 rounded"
                autoFocus
              />
            ) : (
              <span className="flex-1 text-sm min-w-0 truncate">
                {tab.name}
              </span>
            )}

            {!tab.isSaved && (
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Unsaved changes" />
            )}

            {/* Edit button - only show when not editing and on hover */}
            {editingTabIndex !== index && (
              <button
                onClick={(e) => startEditingTab(index, e)}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-opacity"
                title="Rename tab"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            )}

                  <button
                    onClick={(e) => closeTab(index, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-300 dark:hover:bg-slate-600 rounded transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            };

            return (
              <>
                {/* Render ungrouped tabs */}
                {ungroupedTabs.map(({ tab, index }) => renderTab(tab, index))}

                {/* Render groups */}
                {groups.map(group => {
                  const groupTabs = groupedTabs[group.id] || [];
                  if (groupTabs.length === 0) return null;

                  const colorInfo = TAB_GROUP_COLORS.find(c => c.value === group.color);

                  return (
                    <div key={group.id} className="flex items-center gap-1 flex-shrink-0">
                      {/* Group indicator/button */}
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition-all ${colorInfo?.value} bg-opacity-20 border-2 ${colorInfo?.border}
                        ${dragOverGroupId === group.id ? 'ring-4 ring-blue-400 scale-105' : ''}`}
                        onClick={() => toggleGroupCollapse(group.id)}
                        onContextMenu={(e) => handleGroupRightClick(group.id, e)}
                        onDragOver={(e) => handleDragOverGroup(group.id, e)}
                        onDragLeave={handleDragLeaveGroup}
                        onDrop={(e) => handleDropOnGroup(group.id, e)}
                        title={group.collapsed ? 'Expand group' : 'Collapse group'}
                      >
                        <span className={`text-xs font-semibold ${colorInfo?.text}`}>
                          {group.name}
                        </span>
                        <span className={`text-xs ${colorInfo?.text}`}>
                          ({groupTabs.length})
                        </span>
                        {group.collapsed ? (
                          <ChevronRight className={`w-3 h-3 ${colorInfo?.text}`} />
                        ) : (
                          <ChevronDown className={`w-3 h-3 ${colorInfo?.text}`} />
                        )}
                      </div>

                      {/* Render tabs in group (only if not collapsed) */}
                      {!group.collapsed && groupTabs.map(({ tab, index }) => renderTab(tab, index))}
                    </div>
                  );
                })}
              </>
            );
          })()}
        </div>

        {/* Right scroll button */}
        {canScrollRight && (
          <button
            onClick={scrollTabsRight}
            className="flex-shrink-0 px-1 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            title="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1 px-2 border-l border-gray-300 dark:border-slate-700">
          <button
            onClick={addTab}
            className="px-2 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-300 dark:hover:bg-slate-700 rounded transition-colors"
            title="New Request"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${
              showHistory
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span className="hidden lg:inline">History</span>
          </button>

          <button
            onClick={() => setShowCollections(!showCollections)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${
              showCollections
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-slate-700'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span className="hidden lg:inline">Collections</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {activeTab && (
          <RequestEditor
            request={activeTab.request}
            response={activeTab.response}
            onRequestChange={updateTabRequest}
            onResponseChange={updateTabResponse}
          />
        )}
      </div>

      {/* History Sidebar */}
      {showHistory && (
        <HistoryPanel
          onLoadRequest={handleLoadRequest}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Collections Sidebar */}
      {showCollections && (
        <CollectionsPanel
          onLoadRequest={handleLoadRequest}
          onClose={() => setShowCollections(false)}
          currentRequest={activeTab?.request}
        />
      )}

      {/* Tab Context Menu */}
      {contextMenuTab !== null && (
        <div
          className="fixed bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg shadow-xl py-1 z-50 min-w-[200px]"
          style={{
            left: `${contextMenuPosition.x}px`,
            top: `${contextMenuPosition.y}px`,
          }}
        >
          {/* Add to existing group */}
          {groups.length > 0 && (
            <>
              <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Add to Group
              </div>
              {groups.map(group => (
                <button
                  key={group.id}
                  onClick={() => {
                    addTabToGroup(contextMenuTab, group.id);
                    closeContextMenu();
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <div className={`w-3 h-3 rounded ${group.color}`} />
                  <span>{group.name}</span>
                </button>
              ))}
              <div className="border-t border-gray-200 dark:border-slate-700 my-1" />
            </>
          )}

          {/* Create new group */}
          <button
            onClick={() => {
              setSelectedTabsForGroup([contextMenuTab]);
              setShowGroupDialog(true);
              closeContextMenu();
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            Add to New Group...
          </button>

          {/* Remove from group */}
          {tabs[contextMenuTab]?.groupId && (
            <button
              onClick={() => {
                removeTabFromGroup(contextMenuTab);
                closeContextMenu();
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 text-red-600 dark:text-red-400"
            >
              Remove from Group
            </button>
          )}
        </div>
      )}

      {/* Group Context Menu */}
      {contextMenuGroup !== null && (
        <div
          className="fixed bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg shadow-xl py-1 z-50 min-w-[180px]"
          style={{
            left: `${contextMenuPosition.x}px`,
            top: `${contextMenuPosition.y}px`,
          }}
        >
          <button
            onClick={() => {
              const group = groups.find(g => g.id === contextMenuGroup);
              if (group) {
                const newName = prompt('Enter new group name:', group.name);
                if (newName && newName.trim()) {
                  renameGroup(contextMenuGroup, newName.trim());
                }
              }
              closeContextMenu();
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            Rename Group
          </button>

          <button
            onClick={() => {
              // Show a simple color picker by cycling through colors
              const group = groups.find(g => g.id === contextMenuGroup);
              if (group) {
                const currentIndex = TAB_GROUP_COLORS.findIndex(c => c.value === group.color);
                const nextIndex = (currentIndex + 1) % TAB_GROUP_COLORS.length;
                changeGroupColor(contextMenuGroup, TAB_GROUP_COLORS[nextIndex].value);
              }
              closeContextMenu();
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            Change Color
          </button>

          <div className="border-t border-gray-200 dark:border-slate-700 my-1" />

          <button
            onClick={() => {
              if (confirm('Delete this group? Tabs will not be deleted.')) {
                deleteGroup(contextMenuGroup);
              }
              closeContextMenu();
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 text-red-600 dark:text-red-400"
          >
            Delete Group
          </button>
        </div>
      )}

      {/* Group Creation Dialog */}
      {showGroupDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <GroupDialog
              onClose={() => {
                setShowGroupDialog(false);
                setSelectedTabsForGroup([]);
              }}
              onCreate={(name, color) => {
                createGroup(name, color, selectedTabsForGroup);
                setShowGroupDialog(false);
                setSelectedTabsForGroup([]);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Group Dialog Component
interface GroupDialogProps {
  onClose: () => void;
  onCreate: (name: string, color: string) => void;
}

function GroupDialog({ onClose, onCreate }: GroupDialogProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAB_GROUP_COLORS[0].value);

  const handleCreate = () => {
    if (groupName.trim()) {
      onCreate(groupName.trim(), selectedColor);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Create Tab Group
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
        >
          <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Group Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Group Name *
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g., Users API, Auth Endpoints"
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') onClose();
            }}
          />
        </div>

        {/* Color Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Color
          </label>
          <div className="grid grid-cols-4 gap-2">
            {TAB_GROUP_COLORS.map(color => (
              <button
                key={color.value}
                onClick={() => setSelectedColor(color.value)}
                className={`p-3 rounded border-2 transition-all ${
                  selectedColor === color.value
                    ? `${color.border} bg-opacity-20`
                    : 'border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500'
                }`}
              >
                <div className={`w-full h-6 rounded ${color.value}`} />
                <div className="text-xs mt-1 text-center text-gray-700 dark:text-gray-300">
                  {color.name}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-slate-700">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={!groupName.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded transition-colors"
        >
          Create Group
        </button>
      </div>
    </>
  );
}
