import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Server, 
  Wifi, 
  WifiOff, 
  Folder, 
  File, 
  FileText, 
  Trash2, 
  AlertTriangle, 
  Plus, 
  Settings, 
  Eye, 
  Download,
  RefreshCw,
  Search,
  ChevronRight,
  ChevronDown,
  Terminal,
  Shield,
  Clock
} from 'lucide-react';
import RemoteExplorerService, { SSHConnection, RemoteFile, LogFileContent } from '../../../services/RemoteExplorerService';
import LogFileViewer from './LogFileViewer';

const RemoteExplorer: React.FC = () => {
  const [connections, setConnections] = useState<SSHConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [files, setFiles] = useState<RemoteFile[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<RemoteFile | null>(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [logContent, setLogContent] = useState<LogFileContent | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  // Connection form state
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 22,
    username: '',
    password: '',
    privateKey: '',
    privateKeyPath: ''
  });

  useEffect(() => {
    setConnections(RemoteExplorerService.getConnections());
  }, []);

  useEffect(() => {
    if (selectedConnection) {
      loadFiles();
    }
  }, [selectedConnection, currentPath]);

  const loadFiles = async () => {
    if (!selectedConnection) return;
    
    setLoading(true);
    try {
      const fileList = await RemoteExplorerService.listFiles(selectedConnection, currentPath);
      setFiles(fileList);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (id: string) => {
    setLoading(true);
    try {
      const success = await RemoteExplorerService.connect(id);
      if (success) {
        setSelectedConnection(id);
        setConnections(RemoteExplorerService.getConnections());
      }
    } catch (error) {
      console.error('Failed to connect:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    await RemoteExplorerService.disconnect(id);
    setConnections(RemoteExplorerService.getConnections());
    if (selectedConnection === id) {
      setSelectedConnection(null);
      setFiles([]);
    }
  };

  const handleAddConnection = async () => {
    if (!formData.name || !formData.host || !formData.username) return;

    try {
      const connection = await RemoteExplorerService.addConnection({
        name: formData.name,
        host: formData.host,
        port: formData.port,
        username: formData.username,
        password: formData.password,
        privateKey: formData.privateKey
      });
      
      setConnections(RemoteExplorerService.getConnections());
      setShowConnectionModal(false);
      setFormData({
        name: '',
        host: '',
        port: 22,
        username: '',
        password: '',
        privateKey: '',
        privateKeyPath: ''
      });
    } catch (error) {
      console.error('Failed to add connection:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFormData(prev => ({
        ...prev,
        privateKey: content,
        privateKeyPath: file.name
      }));
    };
    reader.readAsText(file);
  };

  const handleDeleteConnection = async (id: string) => {
    await RemoteExplorerService.removeConnection(id);
    setConnections(RemoteExplorerService.getConnections());
    if (selectedConnection === id) {
      setSelectedConnection(null);
      setFiles([]);
    }
  };

  const handleFileClick = async (file: RemoteFile) => {
    if (file.type === 'directory') {
      setCurrentPath(file.path);
      const folderKey = file.path;
      const newExpanded = new Set(expandedFolders);
      if (newExpanded.has(folderKey)) {
        newExpanded.delete(folderKey);
      } else {
        newExpanded.add(folderKey);
      }
      setExpandedFolders(newExpanded);
    } else if (file.name.endsWith('.log') || file.name.endsWith('.out')) {
      try {
        const content = await RemoteExplorerService.readFile(selectedConnection!, file.path);
        setLogContent(content);
        setSelectedFile(file);
      } catch (error) {
        console.error('Failed to read file:', error);
      }
    }
  };

  const handleDeleteFile = async (path: string) => {
    if (!selectedConnection) return;
    
    try {
      await RemoteExplorerService.deleteFile(selectedConnection, path);
      await loadFiles();
      setShowDeleteConfirm(false);
      setFileToDelete(null);
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  const handleDeleteAllLogs = async () => {
    if (!selectedConnection) return;
    
    try {
      await RemoteExplorerService.deleteAllLogs(selectedConnection);
      await loadFiles();
      setShowDeleteConfirm(false);
      setFileToDelete(null);
    } catch (error) {
      console.error('Failed to delete log files:', error);
    }
  };

  const navigateToPath = (path: string) => {
    setCurrentPath(path);
  };

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLogFile = (file: RemoteFile) => {
    return file.name.endsWith('.log') || 
           file.name.endsWith('.out') || 
           file.name.endsWith('.err') ||
           file.name.includes('log');
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Remote Explorer
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                SSH to servers and manage log files
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowConnectionModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Add Server
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Server List */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Servers
            </h3>
            <div className="space-y-2">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedConnection === conn.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    if (conn.connected) {
                      setSelectedConnection(conn.id);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {conn.connected ? (
                        <Wifi className="w-4 h-4 text-green-500" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {conn.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {conn.connected ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDisconnect(conn.id);
                          }}
                          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                          title="Disconnect"
                        >
                          <WifiOff className="w-3 h-3 text-red-500" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConnect(conn.id);
                          }}
                          className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30"
                          title="Connect"
                          disabled={loading}
                        >
                          <Wifi className="w-3 h-3 text-green-500" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConnection(conn.id);
                        }}
                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {conn.username}@{conn.host}:{conn.port}
                    </span>
                    {conn.privateKey && (
                      <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Key
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* File Explorer */}
        <div className="flex-1 flex flex-col">
          {selectedConnection ? (
            <>
              {/* Path Navigation */}
              <div className="px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigateToPath('/')}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      /
                    </button>
                    {currentPath.split('/').filter(Boolean).map((part, index, parts) => (
                      <React.Fragment key={index}>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                        <button
                          onClick={() => navigateToPath('/' + parts.slice(0, index + 1).join('/'))}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {part}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={loadFiles}
                      disabled={loading}
                      className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Refresh"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => {
                        setFileToDelete('all');
                        setShowDeleteConfirm(true);
                      }}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete All Logs
                    </button>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search files..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              {/* File List */}
              <div className="flex-1 overflow-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : (
                  <div className="p-4">
                    {filteredFiles.length === 0 ? (
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No files found</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {filteredFiles.map((file, index) => (
                          <motion.div
                            key={file.path}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className={`flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer group ${
                              selectedFile?.path === file.path ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                            onClick={() => handleFileClick(file)}
                          >
                            <div className="flex items-center gap-3">
                              {file.type === 'directory' ? (
                                <Folder className="w-5 h-5 text-blue-500" />
                              ) : isLogFile(file) ? (
                                <FileText className="w-5 h-5 text-orange-500" />
                              ) : (
                                <File className="w-5 h-5 text-gray-500" />
                              )}
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {file.name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {file.size && `${(file.size / 1024).toFixed(1)} KB`}
                                  {file.modified && ` • ${new Date(file.modified).toLocaleDateString()}`}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {file.type === 'file' && (
                                <>
                                  {isLogFile(file) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleFileClick(file);
                                      }}
                                      className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                                      title="View"
                                    >
                                      <Eye className="w-4 h-4 text-blue-500" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFileToDelete(file.path);
                                      setShowDeleteConfirm(true);
                                    }}
                                    className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </button>
                                </>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Server className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No Server Selected
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Select a server from the list to start exploring
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Log File Viewer */}
        {logContent && selectedFile && (
          <LogFileViewer
            file={selectedFile}
            content={logContent}
            onClose={() => {
              setLogContent(null);
              setSelectedFile(null);
            }}
          />
        )}
      </div>

      {/* Add Connection Modal */}
      <AnimatePresence>
        {showConnectionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Add SSH Connection
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Production Server"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Host
                  </label>
                  <input
                    type="text"
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="192.168.1.100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Port
                  </label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 22 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="ubuntu"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Authentication Method
                  </label>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Password (optional)
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter password or use private key"
                      />
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">OR</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Private Key (.pem file)
                      </label>
                      <input
                        type="file"
                        accept=".pem,.key"
                        onChange={handleFileUpload}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {formData.privateKeyPath && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          {formData.privateKeyPath}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddConnection}
                  disabled={!formData.name || !formData.host || !formData.username}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  Add Connection
                </button>
                <button
                  onClick={() => {
                    setShowConnectionModal(false);
                    setFormData({
                      name: '',
                      host: '',
                      port: 22,
                      username: '',
                      password: '',
                      privateKey: '',
                      privateKeyPath: ''
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delete Confirmation
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {fileToDelete === 'all' 
                  ? 'Are you sure you want to delete all log files in /var/log? This action cannot be undone.'
                  : `Are you sure you want to delete "${fileToDelete}"? This action cannot be undone.`
                }
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (fileToDelete === 'all') {
                      handleDeleteAllLogs();
                    } else if (fileToDelete) {
                      handleDeleteFile(fileToDelete);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setFileToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RemoteExplorer;