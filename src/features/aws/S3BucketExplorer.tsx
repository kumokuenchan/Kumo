import { useState } from 'react';
import { RefreshCw, Folder, File, Download, Search, ArrowLeft, ChevronRight } from 'lucide-react';
import Toast, { ToastContainer, ToastType } from '../../components/Toast';

interface S3Bucket {
  name: string;
  creationDate: string;
}

interface S3Object {
  key: string;
  size: number;
  lastModified: string;
  isFolder: boolean;
}

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export default function S3BucketExplorer() {
  const [region, setRegion] = useState('us-east-1');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [buckets, setBuckets] = useState<S3Bucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [pathHistory, setPathHistory] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const fetchBuckets = async () => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/s3/buckets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch S3 buckets');
      }

      const data = await response.json();
      setBuckets(data.buckets || []);
      showToast(`Found ${data.buckets?.length || 0} buckets`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch S3 buckets', 'error');
      setBuckets([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchObjects = async (bucket: string, prefix: string = '') => {
    setLoading(true);
    try {
      const response = await fetch('/api/aws/s3/objects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          bucket,
          prefix,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch objects');
      }

      const data = await response.json();
      setObjects(data.objects || []);
      setCurrentPrefix(prefix);
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch objects', 'error');
      setObjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBucketSelect = (bucket: string) => {
    setSelectedBucket(bucket);
    setPathHistory(['']);
    fetchObjects(bucket, '');
  };

  const handleFolderClick = (folderKey: string) => {
    if (selectedBucket) {
      setPathHistory(prev => [...prev, folderKey]);
      fetchObjects(selectedBucket, folderKey);
    }
  };

  const handleBackClick = () => {
    if (pathHistory.length > 1 && selectedBucket) {
      const newHistory = pathHistory.slice(0, -1);
      setPathHistory(newHistory);
      const previousPrefix = newHistory[newHistory.length - 1];
      fetchObjects(selectedBucket, previousPrefix);
    }
  };

  const downloadFile = async (key: string) => {
    if (!selectedBucket) return;

    try {
      const response = await fetch('/api/aws/s3/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          bucket: selectedBucket,
          key,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = key.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('File downloaded successfully', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to download file', 'error');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredObjects = objects.filter(obj =>
    obj.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getBreadcrumbs = () => {
    if (!selectedBucket) return [];
    const paths = pathHistory.map((prefix, index) => ({
      name: index === 0 ? selectedBucket : prefix.split('/').filter(Boolean).pop() || '',
      prefix: prefix,
      index,
    }));
    return paths;
  };

  return (
    <>
      <ToastContainer>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </ToastContainer>

      <div className="h-full flex">
        {/* Buckets List */}
        <div className="w-64 border-r dark:border-slate-700 flex flex-col">
          <div className="px-4 py-3 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <div className="grid grid-cols-1 gap-2 mb-2">
              <div>
                <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
                >
                  <option value="us-east-1">US East 1</option>
                  <option value="us-east-2">US East 2</option>
                  <option value="us-west-1">US West 1</option>
                  <option value="us-west-2">US West 2</option>
                  <option value="eu-west-1">EU West 1</option>
                  <option value="eu-central-1">EU Central 1</option>
                  <option value="ap-southeast-1">AP Southeast 1</option>
                  <option value="ap-northeast-1">AP Northeast 1</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Access Key</label>
                <input
                  type="text"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  placeholder="AKIA..."
                  className="w-full px-2 py-1.5 text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Secret Key</label>
                <input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-2 py-1.5 text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
            </div>
            <button
              onClick={fetchBuckets}
              disabled={loading}
              className="w-full px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Load Buckets'}
            </button>
          </div>

          <div className="flex-1 overflow-auto p-2">
            {buckets.length === 0 ? (
              <div className="text-xs text-gray-500 text-center mt-4">
                No buckets loaded
              </div>
            ) : (
              <div className="space-y-1">
                {buckets.map((bucket) => (
                  <button
                    key={bucket.name}
                    onClick={() => handleBucketSelect(bucket.name)}
                    className={`w-full text-left px-3 py-2 text-xs rounded transition-colors ${
                      selectedBucket === bucket.name
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200'
                        : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{bucket.name}</div>
                        <div className="text-[10px] text-gray-500">
                          {new Date(bucket.creationDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Objects List */}
        <div className="flex-1 flex flex-col">
          {selectedBucket ? (
            <>
              <div className="px-4 py-3 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  {pathHistory.length > 1 && (
                    <button
                      onClick={handleBackClick}
                      className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700"
                      title="Go back"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <div className="flex items-center gap-1 flex-1 overflow-x-auto">
                    {getBreadcrumbs().map((crumb, index) => (
                      <div key={index} className="flex items-center gap-1 flex-shrink-0">
                        {index > 0 && <ChevronRight className="w-3 h-3 text-gray-400" />}
                        <button
                          onClick={() => {
                            if (index < pathHistory.length - 1) {
                              setPathHistory(pathHistory.slice(0, index + 1));
                              fetchObjects(selectedBucket, crumb.prefix);
                            }
                          }}
                          className="text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {crumb.name}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search objects..."
                    className="w-full pl-10 pr-3 py-2 text-sm rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4">
                {loading ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                ) : filteredObjects.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    {objects.length === 0 ? 'No objects in this location' : 'No objects match your search'}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredObjects.map((obj) => (
                      <div
                        key={obj.key}
                        className="flex items-center gap-3 p-3 rounded-lg border dark:border-slate-700 hover:shadow-md transition-shadow bg-white dark:bg-slate-800"
                      >
                        {obj.isFolder ? (
                          <button
                            onClick={() => handleFolderClick(obj.key)}
                            className="flex items-center gap-3 flex-1 text-left"
                          >
                            <Folder className="w-5 h-5 text-blue-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{obj.key.split('/').filter(Boolean).pop()}</div>
                              <div className="text-xs text-gray-500">Folder</div>
                            </div>
                          </button>
                        ) : (
                          <>
                            <File className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{obj.key.split('/').pop()}</div>
                              <div className="text-xs text-gray-500">
                                {formatBytes(obj.size)} • {new Date(obj.lastModified).toLocaleString()}
                              </div>
                            </div>
                            <button
                              onClick={() => downloadFile(obj.key)}
                              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400"
                              title="Download file"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a bucket to view its contents
            </div>
          )}
        </div>
      </div>
    </>
  );
}
