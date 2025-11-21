import { useState, useEffect, useRef } from 'react';
import { Plus, X, Clock, Folder, ChevronLeft, ChevronRight, ChevronDown, Maximize2, Minimize2, Globe, Upload, Zap, Key, PanelRight, PanelTop } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import RequestEditor from './RequestEditor';
import HistoryPanel from './HistoryPanel';
import CollectionsPanel from './CollectionsPanel';
import EnvironmentManager from './EnvironmentManager';
import CurlImporter from './CurlImporter';
import TemplatesBrowser from './TemplatesBrowser';
import OAuth2Helper from './OAuth2Helper';
import { apiTesterApi, type ApiRequest, type ApiResponse } from '../../api/apiTester';
import { apiTesterStorage } from '../../services/apiTesterStorage';
import { environmentStorage } from '../../services/environmentStorage';
import Toast from '../../components/Toast';
import { saveApiTesterState, loadApiTesterState, type ApiTesterState } from './utils/localStorage';

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

// Modern gradient color themes
const TAB_GROUP_COLORS = [
  { name: 'Blue', value: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-500' },
  { name: 'Green', value: 'bg-green-500', text: 'text-green-700 dark:text-green-300', border: 'border-green-500' },
  { name: 'Red', value: 'bg-red-500', text: 'text-red-700 dark:text-red-300', border: 'border-red-500' },
  { name: 'Yellow', value: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-500' },
  { name: 'Purple', value: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-500' },
  { name: 'Pink', value: 'bg-pink-500', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-500' },
  { name: 'Orange', value: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-500' },
  { name: 'Cyan', value: 'bg-cyan-500', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-500' },
  //{ name: 'Blue', value: 'bg-gradient-to-r from-blue-500 to-indigo-600', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-500' },
  //{ name: 'Green', value: 'bg-gradient-to-r from-green-500 to-emerald-600', text: 'text-green-700 dark:text-green-300', border: 'border-green-500' },
  //{ name: 'Red', value: 'bg-gradient-to-r from-red-500 to-pink-600', text: 'text-red-700 dark:text-red-300', border: 'border-red-500' },
  //{ name: 'Yellow', value: 'bg-gradient-to-r from-yellow-500 to-orange-600', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-500' },
  //{ name: 'Purple', value: 'bg-gradient-to-r from-purple-500 to-violet-600', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-500' },
  //{ name: 'Pink', value: 'bg-gradient-to-r from-pink-500 to-rose-600', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-500' },
  //{ name: 'Orange', value: 'bg-gradient-to-r from-orange-500 to-amber-600', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-500' },
  //{ name: 'Cyan', value: 'bg-gradient-to-r from-cyan-500 to-teal-600', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-500' },
];

export default function PostmanTab() {
  // Load tabs from localStorage
  const loadSavedTabs = (): RequestTab[] => {
    try {
      const savedState = loadApiTesterState();
      if (savedState?.tabs) {
        return savedState.tabs.map((t: any) => ({
          ...t,
          // We can now persist responses
        }));
      }
      
      // Fallback to old method for backward compatibility
      const saved = localStorage.getItem('apiTesterTabs');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((t: any) => ({
          ...t,
          response: null, // Don't persist responses in old format
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
      const savedState = loadApiTesterState();
      if (savedState?.groups) {
        return savedState.groups;
      }
      
      // Fallback to old method for backward compatibility
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
  const [showEnvironments, setShowEnvironments] = useState(false);
  const [showCurlImporter, setShowCurlImporter] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showOAuth2Helper, setShowOAuth2Helper] = useState(false);
  const [activeEnvironment, setActiveEnvironment] = useState(environmentStorage.getActiveEnvironment());
  const [editingTabIndex, setEditingTabIndex] = useState<number | null>(null);
  const [editingTabName, setEditingTabName] = useState('');
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [selectedTabsForGroup, setSelectedTabsForGroup] = useState<number[]>([]);
  const [contextMenuTab, setContextMenuTab] = useState<number | null>(null);
  const [contextMenuGroup, setContextMenuGroup] = useState<string | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showSortSubmenu, setShowSortSubmenu] = useState(false);
  const [draggingTabIndex, setDraggingTabIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Layout mode state
  const [layoutMode, setLayoutMode] = useState<'vertical' | 'horizontal'>(() => {
    try {
      const saved = localStorage.getItem('apiTesterLayoutMode');
      return (saved === 'horizontal' || saved === 'vertical') ? saved : 'vertical';
    } catch {
      return 'vertical';
    }
  });
  
  // Enhanced status indicators
  const [requestStatus, setRequestStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});
  const [showGroupSummary, setShowGroupSummary] = useState(false);
  const [groupSummaryText, setGroupSummaryText] = useState('');
  const [groupSummaryTitle, setGroupSummaryTitle] = useState('');
  const [groupSummaryGroupId, setGroupSummaryGroupId] = useState<string | null>(null);
  const [groupSummaryFormatted, setGroupSummaryFormatted] = useState(true);
  const [groupSummaryFullscreen, setGroupSummaryFullscreen] = useState(false);
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [showSetTokenModal, setShowSetTokenModal] = useState(false);
  const [groupForToken, setGroupForToken] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');

  const tabContainerRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  
  // Responsive layout state
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  // Check screen size for responsive layout
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + T: New tab
      if (cmdOrCtrl && e.key === 't') {
        e.preventDefault();
        addTab();
      }

      // Ctrl/Cmd + W: Close tab
      if (cmdOrCtrl && e.key === 'w') {
        e.preventDefault();
        closeTab(activeTabIndex);
      }

      // Ctrl/Cmd + D: Duplicate tab
      if (cmdOrCtrl && e.key === 'd') {
        e.preventDefault();
        const tab = tabs[activeTabIndex];
        if (tab) {
          const newTab: RequestTab = {
            id: `tab_${Date.now()}`,
            name: `${tab.name} (Copy)`,
            request: JSON.parse(JSON.stringify(tab.request)),
            response: null,
            isSaved: false,
            groupId: tab.groupId,
          };
          setTabs([...tabs.slice(0, activeTabIndex + 1), newTab, ...tabs.slice(activeTabIndex + 1)]);
          setActiveTabIndex(activeTabIndex + 1);
        }
      }

      // Ctrl/Cmd + K: Focus URL bar
      if (cmdOrCtrl && e.key === 'k') {
        e.preventDefault();
        // This will be handled by RequestEditor via ref
        const urlInput = document.querySelector('input[placeholder*="URL"]') as HTMLInputElement;
        if (urlInput) urlInput.focus();
      }

      // Ctrl/Cmd + 1-9: Switch tabs
      if (cmdOrCtrl && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const tabIndex = parseInt(e.key) - 1;
        if (tabIndex < tabs.length) {
          setActiveTabIndex(tabIndex);
        }
      }

      // Ctrl/Cmd + Left/Right: Navigate tabs
      if (cmdOrCtrl && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        if (e.key === 'ArrowLeft' && activeTabIndex > 0) {
          setActiveTabIndex(activeTabIndex - 1);
        } else if (e.key === 'ArrowRight' && activeTabIndex < tabs.length - 1) {
          setActiveTabIndex(activeTabIndex + 1);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeTabIndex, tabs]);

  // Toggle layout mode
  const toggleLayoutMode = () => {
    const newMode = layoutMode === 'vertical' ? 'horizontal' : 'vertical';
    setLayoutMode(newMode);
    try {
      localStorage.setItem('apiTesterLayoutMode', newMode);
    } catch (e) {
      console.error('Failed to save layout mode:', e);
    }
  };

  // Persist layout mode to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('apiTesterLayoutMode', layoutMode);
    } catch (e) {
      console.error('Failed to save layout mode:', e);
    }
  }, [layoutMode]);
  useEffect(() => {
    try {
      const stateToSave: ApiTesterState = {
        tabs: tabs.map(({ id, name, request, response, isSaved, groupId }) => ({
          id,
          name,
          request,
          response,
          isSaved,
          groupId,
        })),
        groups,
      };
      saveApiTesterState(stateToSave);
    } catch (e) {
      console.error('Failed to save API tester state:', e);
    }
  }, [tabs, groups]);

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

  const importFromCurl = (request: ApiRequest) => {
    const newTab: RequestTab = {
      id: `tab_${Date.now()}`,
      name: `Imported Request`,
      request,
      response: null,
      isSaved: false,
    };
    setTabs([...tabs, newTab]);
    setActiveTabIndex(tabs.length);
    setToast({ message: 'cURL command imported successfully', type: 'success' });
  };

  const loadFromTemplate = (request: ApiRequest, name: string) => {
    const newTab: RequestTab = {
      id: `tab_${Date.now()}`,
      name,
      request,
      response: null,
      isSaved: false,
    };
    setTabs([...tabs, newTab]);
    setActiveTabIndex(tabs.length);
    setToast({ message: `Template "${name}" loaded successfully`, type: 'success' });
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

  const handleLoadRequest = (request: ApiRequest, name?: string) => {
    // Create a new tab with the loaded request
    const newTab: RequestTab = {
      id: `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name || (request.url ? new URL(request.url).pathname : 'Loaded Request'),
      request,
      response: null,
      isSaved: false,
    };
    setTabs([...tabs, newTab]);
    setActiveTabIndex(tabs.length);
  };

  const handleLoadCollectionAsGroup = (collection: any) => {
    if (!collection.requests || collection.requests.length === 0) return;

    // Create a new group with the collection name
    const colorIndex = groups.length % TAB_GROUP_COLORS.length;
    const newGroup: TabGroup = {
      id: `group_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: collection.name,
      color: TAB_GROUP_COLORS[colorIndex].value,
      collapsed: false,
    };

    // Create tabs for all requests in the collection
    const newTabs: RequestTab[] = collection.requests.map((savedRequest: any) => ({
      id: `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: savedRequest.name,
      request: savedRequest.request,
      response: null,
      isSaved: false,
      groupId: newGroup.id,
    }));

    // Add the group first
    setGroups([...groups, newGroup]);

    // Add all tabs and switch to the first one
    setTabs([...tabs, ...newTabs]);
    setActiveTabIndex(tabs.length); // First new tab

    // Show success toast
    setToast({
      message: `Opened ${newTabs.length} request${newTabs.length !== 1 ? 's' : ''} from "${collection.name}" as group`,
      type: 'success'
    });
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

  const sortGroupTabs = (groupId: string, sortBy: 'name' | 'method' | 'url' | 'responseTime') => {
    setTabs(prev => {
      // Separate tabs into group tabs and other tabs
      const groupTabs = prev.filter(t => t.groupId === groupId);
      const otherTabs = prev.filter(t => t.groupId !== groupId);

      // Sort group tabs based on criteria
      const sortedGroupTabs = [...groupTabs].sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'method':
            return a.request.method.localeCompare(b.request.method);
          case 'url':
            return (a.request.url || '').localeCompare(b.request.url || '');
          case 'responseTime':
            const timeA = a.response?.duration ?? Infinity;
            const timeB = b.response?.duration ?? Infinity;
            return timeA - timeB;
          default:
            return 0;
        }
      });

      // Find where group tabs start in original array and reconstruct
      const firstGroupIndex = prev.findIndex(t => t.groupId === groupId);
      if (firstGroupIndex === -1) return prev;

      // Rebuild array: tabs before group + sorted group tabs + tabs after group
      const result: RequestTab[] = [];
      let groupInserted = false;

      for (const tab of prev) {
        if (tab.groupId === groupId) {
          if (!groupInserted) {
            result.push(...sortedGroupTabs);
            groupInserted = true;
          }
        } else {
          result.push(tab);
        }
      }

      return result;
    });
  };

  // Close group (Chrome-like: closes all tabs in the group)
  const closeGroup = (groupId: string) => {
    setTabs(prev => {
      const remaining = prev.filter(t => t.groupId !== groupId);
      if (remaining.length === 0) {
        // Keep at least one tab
        const fresh = [createNewTab()];
        setActiveTabIndex(0);
        return fresh;
      }
      const newActive = Math.min(activeTabIndex, remaining.length - 1);
      setActiveTabIndex(newActive);
      return remaining;
    });
    setGroups(prev => prev.filter(g => g.id !== groupId));
  };

  const setBearerTokenForGroup = (groupId: string, token: string) => {
    setTabs(prev => prev.map(tab => {
      if (tab.groupId === groupId) {
        // Update the request with bearer token auth
        const updatedRequest = {
          ...tab.request,
          auth: {
            type: 'bearer' as const,
            bearerToken: token,
          },
          headers: {
            ...tab.request.headers,
            'Authorization': `Bearer ${token}`,
          },
        };
        return {
          ...tab,
          request: updatedRequest,
        };
      }
      return tab;
    }));
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
    setShowSortSubmenu(false);
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

    if (draggingGroupId) {
      // Reorder groups: move draggingGroupId to the position of groupId
      if (draggingGroupId !== groupId) {
        setGroups(prev => {
          const idxFrom = prev.findIndex(g => g.id === draggingGroupId);
          const idxTo = prev.findIndex(g => g.id === groupId);
          if (idxFrom === -1 || idxTo === -1) return prev;
          const next = [...prev];
          const [moved] = next.splice(idxFrom, 1);
          next.splice(idxTo, 0, moved);
          return next;
        });
      }
      setDraggingGroupId(null);
    } else if (draggingTabIndex !== null) {
      addTabToGroup(draggingTabIndex, groupId);
    }

    setDraggingTabIndex(null);
    setDragOverGroupId(null);
  };

  const handleDragEnd = () => {
    setDraggingTabIndex(null);
    setDragOverIndex(null);
    setDragOverGroupId(null);
    setDraggingGroupId(null);
  };

  // Group drag start (for reordering groups)
  const handleGroupDragStart = (groupId: string, e: React.DragEvent) => {
    e.stopPropagation();
    setDraggingGroupId(groupId);
    e.dataTransfer.effectAllowed = 'move';
    // transparent drag image to avoid cursor jump
    const img = document.createElement('div');
    img.style.opacity = '0';
    document.body.appendChild(img);
    e.dataTransfer.setDragImage(img, 0, 0);
    setTimeout(() => document.body.removeChild(img), 0);
  };

  // ===== Group execution and summary =====
  const runGroupRequests = async (groupId: string) => {
    const { groupedTabs } = getOrganizedTabs();
    const entries = groupedTabs[groupId] || [];
    let completed = 0;
    for (const { tab, index } of entries) {
      try {
        if (!tab.request?.url) continue;
        const res = await apiTesterApi.executeRequest(tab.request);
        // update tab response at specific index
        setTabs(prev => {
          const next = [...prev];
          if (next[index]) next[index] = { ...next[index], response: res };
          return next;
        });
        // save to history
        apiTesterStorage.addToHistory(tab.request, res, tab.name);
        completed += 1;
      } catch (err) {
        console.error('Request in group failed:', err);
      }
    }
    return { total: entries.length, completed };
  };

  const buildSingleSummary = (req: ApiRequest, res: ApiResponse | null): string => {
    const ts = new Date().toLocaleString();
    const url = req.url;
    const method = req.method;
    const hasParams = !!(req.params && Object.keys(req.params).length);
    const paramsStr = hasParams ? JSON.stringify(req.params, null, 2) : '';
    const hasReqHeaders = !!(req.headers && Object.keys(req.headers).length);
    const headersStr = hasReqHeaders ? JSON.stringify(req.headers, null, 2) : '';
    let reqBodyStr = '—';
    if (req.body !== undefined && req.body !== null) {
      try { reqBodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body, null, 2); } catch { reqBodyStr = String(req.body); }
    }
    const hasReqBody = reqBodyStr !== '—' && reqBodyStr.trim() !== '';

    if (!res) {
      const parts: string[] = [];
      parts.push(`When: ${ts}`);
      parts.push(`Endpoint: ${method} ${url}`);
      parts.push('Status: (no response)');
      parts.push('');
      if (hasParams) { parts.push('Params:'); parts.push(paramsStr); parts.push(''); }
      if (hasReqHeaders) { parts.push('Request Headers:'); parts.push(headersStr); parts.push(''); }
      if (hasReqBody) { parts.push('Request Body:'); parts.push(reqBodyStr); parts.push(''); }
      return parts.join('\n');
    }
    const headersLc: Record<string, string> = {};
    Object.entries(res.headers || {}).forEach(([k, v]) => (headersLc[k.toLowerCase()] = String(v)));
    const ct = headersLc['content-type'] || '—';
    let resBodyStr = '';
    try {
      if (typeof res.data === 'string') {
        // try pretty json
        try { resBodyStr = JSON.stringify(JSON.parse(res.data), null, 2); }
        catch { resBodyStr = res.data; }
      } else {
        resBodyStr = JSON.stringify(res.data, null, 2);
      }
    } catch { resBodyStr = String(res.data); }
    const formatBytes = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024*1024 ? `${(bytes/1024).toFixed(2)} KB` : `${(bytes/(1024*1024)).toFixed(2)} MB`;
    const parts: string[] = [];
    parts.push(`When: ${ts}`);
    parts.push(`Endpoint: ${method} ${url}`);
    parts.push(`Status: ${res.status} ${res.statusText} | Time: ${res.duration}ms | Size: ${formatBytes(res.size)}`);
    parts.push(`Content-Type: ${ct}`);
    parts.push('');
    if (hasParams) { parts.push('Params:'); parts.push(paramsStr); parts.push(''); }
    if (hasReqHeaders) { parts.push('Request Headers:'); parts.push(headersStr); parts.push(''); }
    if (hasReqBody) { parts.push('Request Body:'); parts.push(reqBodyStr); parts.push(''); }
    parts.push('Response Body:');
    parts.push(resBodyStr);
    parts.push('');
    return parts.join('\n');
  };

  const copyGroupSummary = (groupId: string) => {
    const text = buildGroupSummaryText(groupId);
    try {
      navigator.clipboard.writeText(text);
    } catch (e) {
      console.error('Failed to copy group summary:', e);
    }
  };

  const buildGroupSummaryText = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    const { groupedTabs } = getOrganizedTabs();
    const entries = groupedTabs[groupId] || [];
    const parts: string[] = [];
    parts.push(`API Test Group Summary: ${group?.name || groupId}`);
    parts.push('');
    entries.forEach(({ tab }) => {
      parts.push(buildSingleSummary(tab.request, tab.response));
      parts.push('—'.repeat(40));
    });
    return parts.join('\n');
  };

  // ===== Group table export for Google Sheets =====
  const stringifyShort = (val: any, max = 100000) => {
    try {
      const s = typeof val === 'string' ? val : JSON.stringify(val, null, 2);
      return s.length > max ? s.slice(0, max) + '\n... (truncated - exceeds 100KB)' : s;
    } catch {
      const s = String(val);
      return s.length > max ? s.slice(0, max) + '\n... (truncated - exceeds 100KB)' : s;
    }
  };

  const buildGroupRows = (groupId: string): string[][] => {
    const { groupedTabs } = getOrganizedTabs();
    const entries = groupedTabs[groupId] || [];
    const rows: string[][] = [];
    // Header row
    rows.push([
      'When',
      'Method',
      'URL',
      'Status',
      'Time (ms)',
      'Size',
      'Content-Type',
      'Params',
      'Request Body',
      'Response Body',
    ]);

    const formatBytes = (bytes: number) =>
      bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(2)} KB` : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

    entries.forEach(({ tab }) => {
      const req = tab.request;
      const res = tab.response;
      const when = new Date().toLocaleString();
      const method = req.method;
      const url = req.url;
      const status = res ? `${res.status} ${res.statusText}` : '';
      const time = res ? String(res.duration) : '';
      const size = res ? formatBytes(res.size) : '';
      const headersLc: Record<string, string> = {};
      if (res?.headers) Object.entries(res.headers).forEach(([k, v]) => (headersLc[k.toLowerCase()] = String(v)));
      const ct = headersLc['content-type'] || '';
      const params = req.params && Object.keys(req.params).length ? JSON.stringify(req.params, null, 2) : '';
      const reqBody = req.body != null ? stringifyShort(req.body, 100000) : '';
      const resBody = res?.data != null ? stringifyShort(res.data, 100000) : '';
      rows.push([when, method, url, status, time, size, ct, params, reqBody, resBody]);
    });
    return rows;
  };

  const rowsToCSV = (rows: string[][]): string => {
    const escape = (s: string) => '"' + s.replace(/"/g, '""') + '"';
    return rows.map(r => r.map(c => (c == null ? '' : escape(c))).join(',')).join('\n');
  };

  const rowsToTSV = (rows: string[][]): string => {
    const sanitize = (s: string) => s.replace(/\t/g, '  ').replace(/\r?\n/g, '\n');
    return rows.map(r => r.map(c => (c == null ? '' : sanitize(c))).join('\t')).join('\n');
  };

  const copyGroupTSV = (groupId: string) => {
    const rows = buildGroupRows(groupId);
    const tsv = rowsToTSV(rows);
    try {
      navigator.clipboard.writeText(tsv);
      setToast({ message: 'Group table copied (TSV)', type: 'success' });
    } catch (e) {
      console.error('Copy TSV failed', e);
      setToast({ message: 'Failed to copy TSV', type: 'error' });
    }
  };

  const downloadGroupCSV = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    const rows = buildGroupRows(groupId);
    const csv = rowsToCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `group_${group?.name || groupId}_${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const activeTab = tabs[activeTabIndex];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Enhanced Tab Bar with Modern Design */}
      <div className={`flex items-center bg-gradient-to-r from-white to-gray-50 dark:from-slate-900 dark:to-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm relative ${isMobile ? 'flex-wrap' : ''}`}>
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
          className={`tab-scroll-container flex items-center gap-2 px-2 py-1 overflow-x-auto overflow-y-hidden flex-1 ${
            isMobile ? 'h-12' : isTablet ? 'h-11' : 'h-10'
          }`}
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
                  className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-move transition-all duration-200 flex-shrink-0 hover:scale-105 hover:shadow-md ${
                    isMobile 
                      ? 'min-w-[120px] max-w-[200px]'
                      : isTablet
                      ? 'min-w-[140px] max-w-[250px]'
                      : tabs.length > 5
                      ? 'min-w-[140px] max-w-[280px] xl:max-w-[360px] 2xl:max-w-[480px]'
                      : 'min-w-[180px] max-w-[360px] xl:max-w-[480px] 2xl:max-w-[640px]'
                  } ${
                    index === activeTabIndex
                      ? `bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-lg ring-2 ring-blue-500/20 border-2 ${
                          colorInfo ? colorInfo.border : 'border-blue-500 dark:border-blue-400'
                        } backdrop-blur-sm`
                      : 'bg-gradient-to-r from-gray-100 to-gray-50 dark:from-slate-800 dark:to-slate-700 text-slate-700 dark:text-slate-300 hover:from-gray-200 hover:to-gray-100 dark:hover:from-slate-700 dark:hover:to-slate-600 ring-1 ring-gray-200 dark:ring-slate-600 border border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500'
                  } ${''}
                  ${draggingTabIndex === index ? 'opacity-50 scale-95' : ''}
                  ${dragOverIndex === index ? 'ring-4 ring-blue-400/50 border-2 border-blue-500 border-dashed' : ''}`}
                >
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                tab.request.method === 'GET'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25'
                  : tab.request.method === 'POST'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                  : tab.request.method === 'PUT'
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg shadow-yellow-500/25'
                  : tab.request.method === 'DELETE'
                  ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg shadow-red-500/25'
                  : 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/25'
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
              <span
                className="flex-1 text-sm min-w-0 truncate"
                title={tab.name}
                onDoubleClick={(e) => startEditingTab(index, e)}
              >
                {tab.name}
              </span>
            )}

                  <button
                    onClick={(e) => closeTab(index, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-300 dark:hover:bg-slate-600 rounded transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                {/* Chrome-like group underline (refined) */}
                {group && (
                  <div
                    className={`${colorInfo?.value || 'bg-blue-500'} absolute left-2 right-2 bottom-0 rounded-b h-px opacity-0 group-hover:opacity-60`}
                  />
                )}
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
                    <div key={group.id} className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Group indicator/button (Chrome-like pill with animation) */}
                      <motion.div
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full cursor-pointer border ${colorInfo?.border} bg-transparent`}
                        onClick={() => toggleGroupCollapse(group.id)}
                        onContextMenu={(e) => handleGroupRightClick(group.id, e)}
                        onDragOver={(e) => handleDragOverGroup(group.id, e)}
                        onDragLeave={handleDragLeaveGroup}
                        onDrop={(e) => handleDropOnGroup(group.id, e)}
                        title={group.collapsed ? 'Expand group' : 'Collapse group'}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        animate={{
                          boxShadow: dragOverGroupId === group.id ? '0 0 0 6px rgba(59,130,246,0.35)' : '0 0 0 0 rgba(0,0,0,0)',
                        }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                        layout="position"
                        draggable={true}
                        onDragStart={(e) => handleGroupDragStart(group.id, e)}
                        onDragEnd={handleDragEnd}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${colorInfo?.value}`} />
                        <span className={`text-[11px] font-medium ${colorInfo?.text}`}>{group.name}</span>
                        {group.collapsed ? (
                          <ChevronRight className={`w-3 h-3 ${colorInfo?.text}`} />
                        ) : (
                          <ChevronDown className={`w-3 h-3 ${colorInfo?.text}`} />
                        )}
                      </motion.div>

                      {/* Render tabs in group (animated expand/collapse) */}
                      <AnimatePresence initial={false}>
                        {!group.collapsed && (
                          <motion.div
                            key={`group-tabs-${group.id}`}
                            className="flex items-center gap-1.5 overflow-hidden"
                            initial={{ opacity: 0, scaleX: 0 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            exit={{ opacity: 0, scaleX: 0 }}
                            transition={{ duration: 0.18, ease: 'easeInOut' }}
                            style={{ originX: 0 }}
                          >
                            {groupTabs.map(({ tab, index }) => (
                              <div key={tab.id}>
                                {renderTab(tab, index)}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
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

        {/* Real-time Status Indicator */}
        {!isMobile && (
          <div className="flex items-center gap-2 px-3 border-l border-gray-300 dark:border-slate-700">
            <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20">
              <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-green-700 dark:text-green-300">Ready</span>
            </div>
          </div>
        )}

        {/* Enhanced Action buttons with better mobile support */}
        <div className={`flex items-center gap-1 px-2 border-l border-gray-300 dark:border-slate-700 ${
          isMobile ? 'flex-wrap' : ''
        }`}>
          <button
            onClick={addTab}
            className={`px-2 py-1.5 text-gray-600 dark:text-gray-400 hover:text-white rounded-lg transition-all duration-200 hover:scale-105 ${
              isMobile ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700' : 'hover:bg-gradient-to-r hover:from-blue-500 hover:to-indigo-600 hover:shadow-lg'
            }`}
            title="New Request"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowCurlImporter(true)}
            className={`px-2 py-1.5 text-gray-600 dark:text-gray-400 hover:text-white rounded-lg transition-all duration-200 hover:scale-105 ${
              isMobile ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700' : 'hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-600 hover:shadow-lg'
            }`}
            title="Import cURL"
          >
            <Upload className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowTemplates(true)}
            className={`px-2 py-1.5 text-gray-600 dark:text-gray-400 hover:text-white rounded-lg transition-all duration-200 hover:scale-105 ${
              isMobile ? 'bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700' : 'hover:bg-gradient-to-r hover:from-purple-500 hover:to-violet-600 hover:shadow-lg'
            }`}
            title="Templates"
          >
            <Zap className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowOAuth2Helper(true)}
            className={`px-2 py-1.5 text-gray-600 dark:text-gray-400 hover:text-white rounded-lg transition-all duration-200 hover:scale-105 ${
              isMobile ? 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700' : 'hover:bg-gradient-to-r hover:from-orange-500 hover:to-amber-600 hover:shadow-lg'
            }`}
            title="OAuth 2.0 Flow Helper"
          >
            <Key className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all duration-200 hover:scale-105 ${
              showHistory
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                : isMobile 
                ? 'bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow-lg shadow-cyan-500/25'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-teal-600 hover:text-white hover:shadow-lg'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span className={`${isMobile ? 'hidden' : 'hidden lg:inline'}`}>History</span>
          </button>

          <button
            onClick={() => setShowCollections(!showCollections)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all duration-200 hover:scale-105 ${
              showCollections
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                : isMobile 
                ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/25'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-r hover:from-pink-500 hover:to-rose-600 hover:text-white hover:shadow-lg'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span className={`${isMobile ? 'hidden' : 'hidden lg:inline'}`}>Collections</span>
          </button>

          {/* Layout Toggle Button */}
          <motion.button
            onClick={toggleLayoutMode}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100/60 dark:hover:bg-slate-800/60 rounded-xl transition-all duration-200"
            title={layoutMode === 'vertical' ? 'Switch to side panel mode' : 'Switch to vertical mode'}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {layoutMode === 'vertical' ? (
              <>
                <PanelRight className="w-4 h-4" />
                <span className="hidden sm:inline">Panel</span>
              </>
            ) : (
              <>
                <PanelTop className="w-4 h-4" />
                <span className="hidden sm:inline">Stack</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50/50 to-white dark:from-slate-900 dark:to-slate-800">
        {activeTab && (
          <RequestEditor
            request={activeTab.request}
            response={activeTab.response}
            onRequestChange={updateTabRequest}
            onResponseChange={updateTabResponse}
            requestTitle={activeTab.name}
            layoutMode={layoutMode}
            onLoadCollectionAsGroup={handleLoadCollectionAsGroup}
          />
        )}
      </div>

      {/* Mobile Enhanced Action Bar */}
      {isMobile && (
        <div className="h-14 bg-gradient-to-r from-white to-gray-50 dark:from-slate-900 dark:to-slate-800 border-t border-gray-200 dark:border-slate-700 flex items-center justify-around px-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 ${
              showHistory
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-xs mt-1">History</span>
          </button>
          
          <button
            onClick={() => setShowCollections(!showCollections)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 ${
              showCollections
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
            }`}
          >
            <Folder className="w-5 h-5" />
            <span className="text-xs mt-1">Collections</span>
          </button>
          
          <button
            onClick={() => setShowEnvironments(true)}
            className="flex flex-col items-center justify-center p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all duration-200"
          >
            <Globe className="w-5 h-5" />
            <span className="text-xs mt-1">Environment</span>
          </button>
          
          <button
            onClick={addTab}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs mt-1">New</span>
          </button>
        </div>
      )}

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
          onLoadCollectionAsGroup={handleLoadCollectionAsGroup}
          onClose={() => setShowCollections(false)}
          currentRequest={activeTab?.request}
        />
      )}

      {/* Environment Manager */}
      {showEnvironments && (
        <EnvironmentManager
          onClose={() => {
            setShowEnvironments(false);
            setActiveEnvironment(environmentStorage.getActiveEnvironment());
          }}
        />
      )}

      {/* cURL Importer */}
      {showCurlImporter && (
        <CurlImporter
          onImport={importFromCurl}
          onClose={() => setShowCurlImporter(false)}
        />
      )}

      {/* Templates Browser */}
      {showTemplates && (
        <TemplatesBrowser
          onSelectTemplate={loadFromTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {showOAuth2Helper && (
        <OAuth2Helper
          onClose={() => setShowOAuth2Helper(false)}
          onTokenReceived={(token) => {
            setToast({ message: 'OAuth token saved to environment!', type: 'success' });
            setShowOAuth2Helper(false);
          }}
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
          {/* Rename tab */}
          <button
            onClick={() => {
              if (contextMenuTab !== null) {
                setEditingTabIndex(contextMenuTab);
                setEditingTabName(tabs[contextMenuTab].name);
              }
              closeContextMenu();
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            Rename Tab
          </button>

          {/* Duplicate tab */}
          <button
            onClick={() => {
              if (contextMenuTab !== null) {
                const tab = tabs[contextMenuTab];
                const newTab: RequestTab = {
                  id: `tab_${Date.now()}`,
                  name: `${tab.name} (Copy)`,
                  request: JSON.parse(JSON.stringify(tab.request)),
                  response: null,
                  isSaved: false,
                  groupId: tab.groupId,
                };
                setTabs([...tabs.slice(0, contextMenuTab + 1), newTab, ...tabs.slice(contextMenuTab + 1)]);
                setActiveTabIndex(contextMenuTab + 1);
              }
              closeContextMenu();
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            Duplicate Tab
          </button>

          <div className="border-t border-gray-200 dark:border-slate-700 my-1" />

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
        >          {/* Close group (Chrome-like) */}
          <button
            onClick={() => {
              const gid = contextMenuGroup!;
              closeContextMenu();
              closeGroup(gid);
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 text-red-600 dark:text-red-400"
          >
            Close Group
          </button>
          {/* Run all in group */}
          <button
            onClick={async () => {
              const gid = contextMenuGroup!;
              closeContextMenu();
              const result = await runGroupRequests(gid);
              const group = groups.find(g => g.id === gid);
              setToast({
                message: `Run All: ${group?.name || gid} — ${result.completed}/${result.total} completed`,
                type: 'success',
              });
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            Run All Requests
          </button>

          {/* Copy group summary */}
          <button
            onClick={() => {
              const gid = contextMenuGroup!;
              copyGroupSummary(gid);
              closeContextMenu();
              setToast({ message: 'Group summary copied', type: 'success' });
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            Copy Group Summary
          </button>

          {/* View group summary */}
          <button
            onClick={() => {
              const gid = contextMenuGroup!;
              const text = buildGroupSummaryText(gid);
              const group = groups.find(g => g.id === gid);
              setGroupSummaryTitle(`Group Summary — ${group?.name || gid}`);
              setGroupSummaryText(text);
              setGroupSummaryGroupId(gid);
              closeContextMenu();
              setShowGroupSummary(true);
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            View Group Summary
          </button>

          {/* Save as Collection */}
          <button
            onClick={() => {
              const gid = contextMenuGroup!;
              const group = groups.find(g => g.id === gid);
              const groupTabs = tabs.filter(t => t.groupId === gid);

              if (groupTabs.length === 0) {
                setToast({ message: 'No requests in group to save', type: 'error' });
                closeContextMenu();
                return;
              }

              // Create collection with group name
              const collectionName = group?.name || 'Untitled Collection';
              const collection = apiTesterStorage.createCollection(collectionName);

              // Add all requests from group to collection
              groupTabs.forEach(tab => {
                apiTesterStorage.addRequestToCollection(
                  collection.id,
                  tab.name,
                  tab.request
                );
              });

              // Dispatch event to refresh collections panel
              try {
                window.dispatchEvent(new Event('apiTester:collectionsChanged'));
              } catch {}

              closeContextMenu();
              setToast({
                message: `Saved ${groupTabs.length} request${groupTabs.length > 1 ? 's' : ''} to collection "${collectionName}"`,
                type: 'success'
              });
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            Save as Collection
          </button>

          <div className="border-t border-gray-200 dark:border-slate-700 my-1" />

          {/* Export for Google Sheets */}
          <button
            onClick={() => {
              const gid = contextMenuGroup!;
              copyGroupTSV(gid);
              closeContextMenu();
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            Copy Table (TSV for Sheets)
          </button>
          <button
            onClick={() => {
              const gid = contextMenuGroup!;
              downloadGroupCSV(gid);
              closeContextMenu();
              setToast({ message: 'Group CSV downloaded', type: 'success' });
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            Download CSV
          </button>
          <button
            onClick={() => {
              setGroupForToken(contextMenuGroup);
              setShowSetTokenModal(true);
              closeContextMenu();
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            Set Bearer Token for All
          </button>

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

          {/* Sort Tabs Submenu */}
          <div className="relative">
            <button
              onClick={() => setShowSortSubmenu(!showSortSubmenu)}
              onMouseEnter={() => setShowSortSubmenu(true)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-between"
            >
              Sort Tabs
              <ChevronRight className="w-3 h-3" />
            </button>
            {showSortSubmenu && (
              <div
                className="absolute left-full top-0 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg shadow-xl py-1 min-w-[140px] ml-1"
                onMouseLeave={() => setShowSortSubmenu(false)}
              >
                <button
                  onClick={() => {
                    sortGroupTabs(contextMenuGroup!, 'name');
                    closeContextMenu();
                    setToast({ message: 'Sorted by name', type: 'success' });
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  By Name
                </button>
                <button
                  onClick={() => {
                    sortGroupTabs(contextMenuGroup!, 'method');
                    closeContextMenu();
                    setToast({ message: 'Sorted by method', type: 'success' });
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  By Method
                </button>
                <button
                  onClick={() => {
                    sortGroupTabs(contextMenuGroup!, 'url');
                    closeContextMenu();
                    setToast({ message: 'Sorted by URL', type: 'success' });
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  By URL
                </button>
                <button
                  onClick={() => {
                    sortGroupTabs(contextMenuGroup!, 'responseTime');
                    closeContextMenu();
                    setToast({ message: 'Sorted by response time', type: 'success' });
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  By Response Time
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-slate-700 my-1" />

          <button
            onClick={() => {
              setGroupToDelete(contextMenuGroup);
              setShowDeleteGroupModal(true);
              closeContextMenu();
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 text-red-600 dark:text-red-400"
          >            Ungroup
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

      {/* Delete Group Confirmation Modal */}
      {showDeleteGroupModal && groupToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <DeleteGroupModal
              groupName={groups.find(g => g.id === groupToDelete)?.name || 'this group'}
              onClose={() => {
                setShowDeleteGroupModal(false);
                setGroupToDelete(null);
              }}
              onConfirm={() => {
                if (groupToDelete) {
                  deleteGroup(groupToDelete);
                  setToast({ message: 'Group deleted successfully', type: 'success' });
                }
                setShowDeleteGroupModal(false);
                setGroupToDelete(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Set Bearer Token Modal */}
      {showSetTokenModal && groupForToken && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <SetTokenModal
              groupName={groups.find(g => g.id === groupForToken)?.name || 'this group'}
              onClose={() => {
                setShowSetTokenModal(false);
                setGroupForToken(null);
                setTokenInput('');
              }}
              onConfirm={(token) => {
                if (groupForToken && token.trim()) {
                  setBearerTokenForGroup(groupForToken, token.trim());
                  const { groupedTabs } = getOrganizedTabs();
                  const tabCount = (groupedTabs[groupForToken] || []).length;
                  setToast({
                    message: `Bearer token applied to ${tabCount} request${tabCount !== 1 ? 's' : ''} in group`,
                    type: 'success'
                  });
                }
                setShowSetTokenModal(false);
                setGroupForToken(null);
                setTokenInput('');
              }}
              tokenValue={tokenInput}
              onTokenChange={setTokenInput}
            />
          </div>
        </div>
      )}

      {/* Toast notifications */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Group Summary Modal */}
      {showGroupSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${groupSummaryFullscreen ? 'w-screen h-screen max-w-none mx-0 rounded-none max-h-none' : 'w-full max-w-3xl mx-4 max-h-[80vh] rounded-lg'} bg-white dark:bg-slate-800 shadow-xl flex flex-col`}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{groupSummaryTitle}</h3>
              <div className="flex items-center gap-2">
                <div className="mr-2 hidden sm:flex items-center gap-1 text-xs">
                  <button
                    onClick={() => setGroupSummaryFormatted(true)}
                    className={`px-2 py-1 rounded ${groupSummaryFormatted ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                  >
                    Formatted
                  </button>
                  <button
                    onClick={() => setGroupSummaryFormatted(false)}
                    className={`px-2 py-1 rounded ${!groupSummaryFormatted ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                  >
                    Plain
                  </button>
                </div>
                <button
                  onClick={() => setGroupSummaryFullscreen(v => !v)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded flex items-center gap-1"
                  title={groupSummaryFullscreen ? 'Exit full screen' : 'Full screen'}
                >
                  {groupSummaryFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  {groupSummaryFullscreen ? 'Exit' : 'Full'}
                </button>
                <button
                  onClick={() => {
                    try {
                      navigator.clipboard.writeText(groupSummaryText);
                      setToast({ message: 'Summary copied', type: 'success' });
                    } catch (e) {
                      setToast({ message: 'Failed to copy', type: 'error' });
                    }
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
                >
                  Copy
                </button>
                <button
                  onClick={() => setShowGroupSummary(false)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto flex-1">
              {groupSummaryFormatted && groupSummaryGroupId ? (
                <div className="space-y-4">
                  {(() => {
                    const { groupedTabs } = getOrganizedTabs();
                    const entries = groupedTabs[groupSummaryGroupId] || [];
                    const statusBadge = (status?: number) => {
                      if (!status) return 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300';
                      if (status >= 200 && status < 300) return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25';
                      if (status >= 300 && status < 400) return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25';
                      if (status >= 400 && status < 500) return 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg shadow-yellow-500/25';
                      return 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg shadow-red-500/25';
                    };
                    const methodBadge = (m: string) => {
                      switch (m) {
                        case 'GET': return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25 font-semibold';
                        case 'POST': return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 font-semibold';
                        case 'PUT': return 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg shadow-yellow-500/25 font-semibold';
                        case 'DELETE': return 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg shadow-red-500/25 font-semibold';
                        case 'PATCH': return 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/25 font-semibold';
                        case 'HEAD': return 'bg-gradient-to-r from-gray-500 to-slate-600 text-white shadow-lg shadow-gray-500/25 font-semibold';
                        case 'OPTIONS': return 'bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow-lg shadow-cyan-500/25 font-semibold';
                        default: return 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/25 font-semibold';
                      }
                    };
                    const pretty = (val: any) => {
                      try {
                        if (typeof val === 'string') {
                          try { return JSON.stringify(JSON.parse(val), null, 2); } catch { return val; }
                        }
                        return JSON.stringify(val, null, 2);
                      } catch { return String(val); }
                    };
                    const formatBytes = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024*1024 ? `${(bytes/1024).toFixed(2)} KB` : `${(bytes/(1024*1024)).toFixed(2)} MB`;
                    return entries.map(({ tab }) => {
                      const req = tab.request;
                      const res = tab.response;
                      const headersLc: Record<string, string> = {};
                      if (res?.headers) Object.entries(res.headers).forEach(([k,v]) => headersLc[k.toLowerCase()] = String(v));
                      const ct = headersLc['content-type'] || '—';
                      return (
                        <div key={tab.id} className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                          <div className="px-3 py-2 bg-gray-50 dark:bg-slate-900 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${methodBadge(req.method)}`}>{req.method}</span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[420px]" title={req.url}>{req.url}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className={`px-2 py-0.5 rounded ${statusBadge(res?.status)}`}>{res ? `${res.status} ${res.statusText}` : 'No Response'}</span>
                              {res && (
                                <>
                                  <span className="text-gray-600 dark:text-gray-300">{res.duration}ms</span>
                                  <span className="text-gray-600 dark:text-gray-300">{formatBytes(res.size)}</span>
                                  <span className="text-gray-600 dark:text-gray-300">{ct}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="p-3 grid md:grid-cols-2 gap-3">
                            {req.params && Object.keys(req.params).length > 0 && (
                              <div>
                                <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Params</div>
                                <pre className="text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded p-2 overflow-auto min-h-[48px]">{JSON.stringify(req.params, null, 2)}</pre>
                              </div>
                            )}
                            {req.headers && Object.keys(req.headers).length > 0 && (
                              <div>
                                <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Request Headers</div>
                                <pre className="text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded p-2 overflow-auto min-h-[48px]">{JSON.stringify(req.headers, null, 2)}</pre>
                              </div>
                            )}
                            {req.body != null && String(pretty(req.body)).trim() !== '' && (
                              <div className="md:col-span-1">
                                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">Request Body</div>
                                <pre className="text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded p-2 overflow-auto min-h-[72px]">{pretty(req.body)}</pre>
                              </div>
                            )}
                            <div className="md:col-span-1">
                              <div className="text-xs font-semibold text-fuchsia-700 dark:text-fuchsia-300 mb-1">Response Body</div>
                              <pre className="text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded p-2 overflow-auto min-h-[72px]">{res?.data != null ? pretty(res.data) : '—'}</pre>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <div className="space-y-6 font-mono text-sm">
                  {(() => {
                    const methodBadge = (m: string) => {
                      switch (m) {
                        case 'GET': return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25 font-semibold';
                        case 'POST': return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 font-semibold';
                        case 'PUT': return 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg shadow-yellow-500/25 font-semibold';
                        case 'DELETE': return 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg shadow-red-500/25 font-semibold';
                        case 'PATCH': return 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/25 font-semibold';
                        case 'HEAD': return 'bg-gradient-to-r from-gray-500 to-slate-600 text-white shadow-lg shadow-gray-500/25 font-semibold';
                        case 'OPTIONS': return 'bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow-lg shadow-cyan-500/25 font-semibold';
                        default: return 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/25 font-semibold';
                      }
                    };
                    const statusBadge = (statusNum?: number) => {
                      if (!statusNum) return 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300';
                      if (statusNum >= 200 && statusNum < 300) return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25';
                      if (statusNum >= 300 && statusNum < 400) return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25';
                      if (statusNum >= 400 && statusNum < 500) return 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg shadow-yellow-500/25';
                      return 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg shadow-red-500/25';
                    };
                    const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    const jsonSyntaxHighlight = (json: string) => {
                      const esc = escapeHtml(json);
                      const re = /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)/g;
                      return esc.replace(re, (match, key, str, bool, num) => {
                        if (key) return `<span class=\"text-sky-700 dark:text-sky-300\">${key}</span>`;
                        if (str) return `<span class=\"text-emerald-700 dark:text-emerald-300\">${str}</span>`;
                        if (bool) return `<span class=\"text-purple-700 dark:text-purple-300\">${bool}</span>`;
                        if (num) return `<span class=\"text-orange-700 dark:text-orange-300\">${num}</span>`;
                        return match;
                      });
                    };

                    const items: JSX.Element[] = [];
                    const lines = groupSummaryText.split('\n');
                    let currentBlock: string[] = [];
                    const { groupedTabs } = getOrganizedTabs();
                    const entries = groupSummaryGroupId ? (groupedTabs[groupSummaryGroupId] || []) : [];
                    let blockIndex = 0;
                    const flushBlock = () => {
                      if (currentBlock.length === 0) return;
                      const block = currentBlock;
                      currentBlock = [];

                      // First pass: extract key lines for header
                      let method = '';
                      let url = '';
                      let statusText = '';
                      let statusCode: number | undefined;
                      let timeText = '';
                      for (let i = 0; i < block.length; i++) {
                        const ln = block[i];
                        if (ln.startsWith('Endpoint: ')) {
                          const rest = ln.slice('Endpoint: '.length);
                          method = rest.split(' ')[0] || '';
                          url = rest.slice(method.length).trim();
                        } else if (ln.startsWith('Status: ')) {
                          const segs = ln.split(' | ');
                          statusText = segs[0].replace('Status: ', '');
                          const match = statusText.match(/^(\d+)/);
                          statusCode = match ? parseInt(match[1], 10) : undefined;
                          const timeSeg = segs.find(s => s.startsWith('Time:'));
                          timeText = timeSeg ? timeSeg.replace('Time: ', '') : '';
                        }
                      }

                      // Build header
                      const entry = entries[blockIndex];
                      const header = (
                        <div className="px-4 py-3 bg-gray-50 dark:bg-slate-900 flex items-center justify-between" key={`hdr_${blockIndex}`}>
                          <div className="min-w-0">
                            {entry?.tab?.name && (
                              <div className="text-base md:text-lg font-semibold text-indigo-700 dark:text-indigo-300 truncate mb-1" title={entry.tab.name}>{entry.tab.name}</div>
                            )}
                            <div className="flex items-center gap-2 min-w-0">
                              {method && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${methodBadge(method)}`}>{method}</span>}
                              {url && <span className="text-sm text-gray-900 dark:text-white truncate" title={url}>{url}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {statusText && <span className={`px-2 py-0.5 rounded ${statusBadge(statusCode)}`}>{statusText}</span>}
                            {timeText && <span className="text-gray-600 dark:text-gray-300">{timeText}</span>}
                          </div>
                        </div>
                      );

                      // Second pass: sections
                      const sectionNodes: JSX.Element[] = [];
                      const isSection = (s: string) => s === 'Params:' || s === 'Request Headers:' || s === 'Request Body:' || s === 'Response Body:';
                      for (let i = 0; i < block.length; i++) {
                        const ln = block[i];
                        if (ln.startsWith('When:') || ln.startsWith('Endpoint:') || ln.startsWith('Status:') || ln.startsWith('Content-Type:') || ln.trim() === '' || ln.startsWith('API Test Group Summary:')) {
                          continue;
                        }
                        if (isSection(ln)) {
                          const titleClass = ln.includes('Response')
                            ? 'text-fuchsia-700 dark:text-fuchsia-300'
                            : ln.includes('Request Body')
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-blue-700 dark:text-blue-300';
                          // collect section content until blank line or next section/end
                          let j = i + 1;
                          const buf: string[] = [];
                          for (; j < block.length; j++) {
                            const ln2 = block[j];
                            if (ln2.trim() === '' || isSection(ln2) || ln2.startsWith('When:') || ln2.startsWith('Endpoint:') || ln2.startsWith('Status:')) break;
                            buf.push(ln2);
                          }
                          const content = buf.join('\n');
                          sectionNodes.push(
                            <div key={`sec_${i}`}>
                              <div className={`mt-2 text-xs font-semibold ${titleClass}`}>{ln}</div>
                              <pre className="text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded p-3 overflow-auto">
                                <code dangerouslySetInnerHTML={{ __html: jsonSyntaxHighlight(content) }} />
                              </pre>
                            </div>
                          );
                          i = j - 1;
                        }
                      }

                      items.push(
                        <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm" key={items.length}>
                          {header}
                          <div className="px-4 pt-4 pb-4 space-y-4">
                            {sectionNodes}
                          </div>
                        </div>
                      );
                      blockIndex += 1;
                    };
                    // Split by separator lines (———)
                    for (const ln of lines) {
                      if (/^[-—]{10,}$/.test(ln)) {
                        flushBlock();
                      } else {
                        currentBlock.push(ln);
                      }
                    }
                    flushBlock();
                    return items;
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Set Bearer Token Modal Component
interface SetTokenModalProps {
  groupName: string;
  onClose: () => void;
  onConfirm: (token: string) => void;
  tokenValue: string;
  onTokenChange: (value: string) => void;
}

function SetTokenModal({ groupName, onClose, onConfirm, tokenValue, onTokenChange }: SetTokenModalProps) {
  return (
    <>
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Set Bearer Token
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
        >
          <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <p className="text-gray-700 dark:text-gray-300 text-sm">
          Set bearer token for all requests in group <span className="font-semibold">"{groupName}"</span>
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bearer Token
          </label>
          <textarea
            value={tokenValue}
            onChange={(e) => onTokenChange(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 font-mono text-sm resize-y"
            rows={4}
            autoFocus
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            This will update the Authorization header for all requests in this group
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-slate-700">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(tokenValue)}
          disabled={!tokenValue.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded transition-colors"
        >
          Apply to All
        </button>
      </div>
    </>
  );
}

// Delete Group Confirmation Modal Component
interface DeleteGroupModalProps {
  groupName: string;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteGroupModal({ groupName, onClose, onConfirm }: DeleteGroupModalProps) {
  return (
    <>
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Delete Group
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
        >
          <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      <div className="p-6">
        <p className="text-gray-700 dark:text-gray-300 mb-2">
          Are you sure you want to delete the group <span className="font-semibold">"{groupName}"</span>?
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          The tabs in this group will not be deleted, they will just be ungrouped.
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-slate-700">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
        >
          Delete Group
        </button>
      </div>
    </>
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

