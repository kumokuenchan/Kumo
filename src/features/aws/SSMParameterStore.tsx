import { useState } from 'react';
import { Search, RefreshCw, Eye, EyeOff, Copy, Filter } from 'lucide-react';
import Toast, { ToastContainer, ToastType } from '../../components/Toast';

interface Parameter {
  name: string;
  type: string;
  value: string;
  version: number;
  lastModified: string;
  description?: string;
}

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export default function SSMParameterStore() {
  const [region, setRegion] = useState('us-east-1');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [path, setPath] = useState('/');
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [filterType, setFilterType] = useState<'all' | 'String' | 'SecureString' | 'StringList'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const fetchParameters = async () => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/ssm/parameters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          path,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch parameters');
      }

      const data = await response.json();
      setParameters(data.parameters || []);
      showToast(`Fetched ${data.parameters?.length || 0} parameters`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch parameters', 'error');
      setParameters([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSecret = (name: string) => {
    setShowSecrets(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'success');
  };

  const filteredParameters = parameters.filter(param => {
    const matchesType = filterType === 'all' || param.type === filterType;
    const matchesSearch = param.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         param.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

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

      <div className="h-full flex flex-col">
        {/* Configuration Panel */}
        <div className="px-4 py-3 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
              >
                <option value="us-east-1">US East (N. Virginia)</option>
                <option value="us-east-2">US East (Ohio)</option>
                <option value="us-west-1">US West (N. California)</option>
                <option value="us-west-2">US West (Oregon)</option>
                <option value="eu-west-1">EU (Ireland)</option>
                <option value="eu-central-1">EU (Frankfurt)</option>
                <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Access Key ID</label>
              <input
                type="text"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                placeholder="AKIA..."
                className="w-full px-3 py-2 text-sm rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Secret Access Key</label>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Parameter Path</label>
              <input
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/"
                className="w-full px-3 py-2 text-sm rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={fetchParameters}
              disabled={loading}
              className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Fetch Parameters'}
            </button>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search parameters..."
                className="w-full pl-10 pr-3 py-2 text-sm rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="flex gap-2 items-center">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-3 py-2 text-sm rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
              >
                <option value="all">All Types</option>
                <option value="String">String</option>
                <option value="SecureString">SecureString</option>
                <option value="StringList">StringList</option>
              </select>
            </div>
          </div>
        </div>

        {/* Parameters List */}
        <div className="flex-1 overflow-auto p-4">
          {filteredParameters.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              {parameters.length === 0 ? 'No parameters loaded. Configure credentials and click "Fetch Parameters".' : 'No parameters match your filters.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredParameters.map((param) => (
                <div
                  key={param.name}
                  className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {param.name}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          param.type === 'SecureString'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            : param.type === 'StringList'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        }`}>
                          {param.type}
                        </span>
                        <span className="text-xs text-gray-500">v{param.version}</span>
                      </div>
                      {param.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{param.description}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-900 rounded border dark:border-slate-600 font-mono text-sm">
                          {param.type === 'SecureString' && !showSecrets[param.name]
                            ? '••••••••••••••••'
                            : param.value}
                        </div>
                        {param.type === 'SecureString' && (
                          <button
                            onClick={() => toggleSecret(param.name)}
                            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400"
                            title={showSecrets[param.name] ? 'Hide value' : 'Show value'}
                          >
                            {showSecrets[param.name] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                        <button
                          onClick={() => copyToClipboard(param.value)}
                          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400"
                          title="Copy value"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Last modified: {param.lastModified}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
