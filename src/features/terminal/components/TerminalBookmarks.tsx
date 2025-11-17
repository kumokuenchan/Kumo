import React, { useState, useEffect } from 'react';
import { Bookmark, FolderOpen, Trash2, Edit2, Plus, Tag, X } from 'lucide-react';

interface DirectoryBookmark {
  id: string;
  name: string;
  path: string;
  project?: string;
  tags?: string[];
  createdAt: number;
}

interface TerminalBookmarksProps {
  currentDirectory: string;
  onNavigate: (path: string) => void;
}

export default function TerminalBookmarks({
  currentDirectory,
  onNavigate
}: TerminalBookmarksProps) {
  const [bookmarks, setBookmarks] = useState<DirectoryBookmark[]>([]);
  const [isAddingBookmark, setIsAddingBookmark] = useState(false);
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
  const [newBookmarkName, setNewBookmarkName] = useState('');
  const [newBookmarkProject, setNewBookmarkProject] = useState('');
  const [newBookmarkTags, setNewBookmarkTags] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Load bookmarks from localStorage
  useEffect(() => {
    const loadBookmarks = () => {
      try {
        const saved = localStorage.getItem('terminal_bookmarks');
        if (saved) {
          const parsed = JSON.parse(saved);
          setBookmarks(parsed);
        }
      } catch (error) {
        console.error('Failed to load bookmarks:', error);
      }
    };
    loadBookmarks();
  }, []);

  // Save bookmarks to localStorage
  const saveBookmarks = (bookmarksToSave: DirectoryBookmark[]) => {
    try {
      localStorage.setItem('terminal_bookmarks', JSON.stringify(bookmarksToSave));
      setBookmarks(bookmarksToSave);
    } catch (error) {
      console.error('Failed to save bookmarks:', error);
    }
  };

  // Add bookmark for current directory
  const addBookmark = () => {
    if (!newBookmarkName.trim()) {
      // Use last directory name as default
      const dirName = currentDirectory.split('/').filter(Boolean).pop() || 'Home';
      setNewBookmarkName(dirName);
    }

    const bookmark: DirectoryBookmark = {
      id: Date.now().toString(),
      name: newBookmarkName.trim() || currentDirectory.split('/').filter(Boolean).pop() || 'Bookmark',
      path: currentDirectory,
      project: newBookmarkProject.trim() || undefined,
      tags: newBookmarkTags.trim() ? newBookmarkTags.split(',').map(t => t.trim()) : [],
      createdAt: Date.now()
    };

    const updated = [...bookmarks, bookmark];
    saveBookmarks(updated);

    // Reset form
    setIsAddingBookmark(false);
    setNewBookmarkName('');
    setNewBookmarkProject('');
    setNewBookmarkTags('');
  };

  // Update bookmark
  const updateBookmark = (id: string) => {
    const updated = bookmarks.map(b =>
      b.id === id
        ? {
            ...b,
            name: newBookmarkName.trim() || b.name,
            project: newBookmarkProject.trim() || undefined,
            tags: newBookmarkTags.trim() ? newBookmarkTags.split(',').map(t => t.trim()) : []
          }
        : b
    );
    saveBookmarks(updated);
    setEditingBookmarkId(null);
    setNewBookmarkName('');
    setNewBookmarkProject('');
    setNewBookmarkTags('');
  };

  // Delete bookmark
  const deleteBookmark = (id: string) => {
    const updated = bookmarks.filter(b => b.id !== id);
    saveBookmarks(updated);
  };

  // Start editing
  const startEditing = (bookmark: DirectoryBookmark) => {
    setEditingBookmarkId(bookmark.id);
    setNewBookmarkName(bookmark.name);
    setNewBookmarkProject(bookmark.project || '');
    setNewBookmarkTags(bookmark.tags?.join(', ') || '');
  };

  // Get unique projects
  const projects = ['all', ...Array.from(new Set(bookmarks.map(b => b.project).filter(Boolean)))];

  // Filter bookmarks
  const filteredBookmarks = bookmarks.filter(b => {
    const matchesProject = filterProject === 'all' || b.project === filterProject;
    const matchesSearch = !searchQuery ||
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesProject && matchesSearch;
  });

  return (
    <div className="w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-[500px] flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-medium text-gray-200">Directory Bookmarks</h3>
          </div>
          <button
            onClick={() => setIsAddingBookmark(!isAddingBookmark)}
            className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            title="Add current directory"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Search bookmarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-2 py-1 text-xs bg-gray-700 text-gray-200 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="px-2 py-1 text-xs bg-gray-700 text-gray-200 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            {projects.map(project => (
              <option key={project} value={project}>
                {project === 'all' ? 'All Projects' : project}
              </option>
            ))}
          </select>
        </div>

        {/* Current Directory */}
        <div className="text-xs text-gray-400 mb-2">
          <span className="text-gray-500">Current:</span> {currentDirectory}
        </div>

        {/* Add Bookmark Form */}
        {isAddingBookmark && (
          <div className="bg-gray-750 p-2 rounded mb-2">
            <input
              type="text"
              placeholder="Bookmark name"
              value={newBookmarkName}
              onChange={(e) => setNewBookmarkName(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-gray-700 text-gray-200 rounded mb-1 border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Project (optional)"
              value={newBookmarkProject}
              onChange={(e) => setNewBookmarkProject(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-gray-700 text-gray-200 rounded mb-1 border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Tags (comma separated)"
              value={newBookmarkTags}
              onChange={(e) => setNewBookmarkTags(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-gray-700 text-gray-200 rounded mb-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <div className="flex gap-1">
              <button
                onClick={addBookmark}
                className="flex-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsAddingBookmark(false);
                  setNewBookmarkName('');
                  setNewBookmarkProject('');
                  setNewBookmarkTags('');
                }}
                className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bookmarks List */}
      <div className="flex-1 overflow-y-auto">
        {filteredBookmarks.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-xs">
            <Bookmark className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p className="mb-1">No bookmarks found</p>
            <p className="text-gray-500">Click + to bookmark current directory</p>
          </div>
        ) : (
          filteredBookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="p-3 border-b border-gray-700 last:border-0 hover:bg-gray-750 transition-colors"
            >
              {editingBookmarkId === bookmark.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newBookmarkName}
                    onChange={(e) => setNewBookmarkName(e.target.value)}
                    className="w-full px-2 py-1 text-xs bg-gray-700 text-gray-200 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newBookmarkProject}
                    onChange={(e) => setNewBookmarkProject(e.target.value)}
                    placeholder="Project"
                    className="w-full px-2 py-1 text-xs bg-gray-700 text-gray-200 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newBookmarkTags}
                    onChange={(e) => setNewBookmarkTags(e.target.value)}
                    placeholder="Tags"
                    className="w-full px-2 py-1 text-xs bg-gray-700 text-gray-200 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => updateBookmark(bookmark.id)}
                      className="flex-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                    >
                      Update
                    </button>
                    <button
                      onClick={() => {
                        setEditingBookmarkId(null);
                        setNewBookmarkName('');
                        setNewBookmarkProject('');
                        setNewBookmarkTags('');
                      }}
                      className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FolderOpen className="w-3 h-3 text-blue-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-200 truncate">
                          {bookmark.name}
                        </span>
                        {bookmark.project && (
                          <span className="text-xs px-2 py-0.5 bg-purple-900/30 text-purple-300 rounded">
                            {bookmark.project}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 font-mono truncate" title={bookmark.path}>
                        {bookmark.path}
                      </div>
                      {bookmark.tags && bookmark.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {bookmark.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-1.5 py-0.5 bg-gray-900 text-gray-400 rounded flex items-center gap-1"
                            >
                              <Tag className="w-2 h-2" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => onNavigate(bookmark.path)}
                        className="p-1.5 text-green-400 hover:text-green-300 hover:bg-gray-700 rounded"
                        title="Navigate to this directory"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => startEditing(bookmark)}
                        className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-gray-700 rounded"
                        title="Edit bookmark"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteBookmark(bookmark.id)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded"
                        title="Delete bookmark"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
