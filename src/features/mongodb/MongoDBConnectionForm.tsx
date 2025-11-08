import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TestTube, Database, Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { 
  useCreateMongoDBConnection,
  useUpdateMongoDBConnection,
  useTestMongoDBConnection
} from '../../hooks/useMongoDB';
import { MongoDBConnection } from '../../types/mongodb';

interface MongoDBConnectionFormProps {
  connection?: MongoDBConnection;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function MongoDBConnectionForm({ connection, onSuccess, onCancel }: MongoDBConnectionFormProps) {
  const isEditing = !!connection;
  
  const [formData, setFormData] = useState({
    name: connection?.name || '',
    group: connection?.group || '',
    environment: connection?.environment || 'development',
    uri: connection?.uri || 'mongodb://localhost:27017',
    connectTimeoutMS: connection?.options?.connectTimeoutMS?.toString() || '10000',
    serverSelectionTimeoutMS: connection?.options?.serverSelectionTimeoutMS?.toString() || '30000',
    maxPoolSize: connection?.options?.maxPoolSize?.toString() || '10',
    retryWrites: connection?.options?.retryWrites !== false,
    retryReads: connection?.options?.retryReads !== false,
  });

  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    serverVersion?: string;
  } | null>(null);

  const createMutation = useCreateMongoDBConnection();
  const updateMutation = useUpdateMongoDBConnection();
  const testMutation = useTestMongoDBConnection();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear test result when form changes
    setTestResult(null);
  };

  const validate = (): boolean => {
    if (!formData.name.trim()) {
      alert('Connection name is required');
      return false;
    }

    if (!formData.uri.trim()) {
      alert('MongoDB URI is required');
      return false;
    }

    // Basic MongoDB URI validation
    if (!formData.uri.startsWith('mongodb://') && !formData.uri.startsWith('mongodb+srv://')) {
      alert('Invalid MongoDB URI. Must start with mongodb:// or mongodb+srv://');
      return false;
    }

    return true;
  };

  const handleTest = async () => {
    if (!validate()) return;
    
    setTestResult(null);
    
    try {
      const options = {
        connectTimeoutMS: parseInt(formData.connectTimeoutMS),
        serverSelectionTimeoutMS: parseInt(formData.serverSelectionTimeoutMS),
        maxPoolSize: parseInt(formData.maxPoolSize),
        retryWrites: formData.retryWrites,
        retryReads: formData.retryReads,
      };
      
      const result = await testMutation.mutateAsync({ uri: formData.uri, options });
      
      if (result.success) {
        setTestResult({
          success: true,
          message: 'Connection successful!',
          serverVersion: result.serverVersion,
        });
      } else {
        setTestResult({
          success: false,
          message: result.error || 'Connection failed',
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Connection test failed',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    try {
      const connectionData = {
        name: formData.name,
        group: formData.group || undefined,
        environment: formData.environment as 'development' | 'staging' | 'production',
        uri: formData.uri,
        options: {
          connectTimeoutMS: parseInt(formData.connectTimeoutMS),
          serverSelectionTimeoutMS: parseInt(formData.serverSelectionTimeoutMS),
          maxPoolSize: parseInt(formData.maxPoolSize),
          retryWrites: formData.retryWrites,
          retryReads: formData.retryReads,
        },
      };
      
      if (isEditing && connection) {
        await updateMutation.mutateAsync({ id: connection.id, data: connectionData });
      } else {
        await createMutation.mutateAsync(connectionData as any);
      }
      
      onSuccess?.();
    } catch (error: any) {
      alert(error.message || 'Failed to save connection');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <Database className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {isEditing ? 'Edit MongoDB Connection' : 'Add MongoDB Connection'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-4rem)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Connection Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Connection Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500"
                placeholder="My MongoDB Server"
                required
              />
            </div>

            {/* MongoDB URI */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                MongoDB URI *
              </label>
              <input
                type="text"
                name="uri"
                value={formData.uri}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 font-mono"
                placeholder="mongodb://localhost:27017"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Format: mongodb://username:password@host:port/database?options
              </p>
            </div>

            {/* Group and Environment */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Group
                </label>
                <input
                  type="text"
                  name="group"
                  value={formData.group}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500"
                  placeholder="Production, Development"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Environment
                </label>
                <select
                  name="environment"
                  value={formData.environment}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500"
                >
                  <option value="development">🟢 Development</option>
                  <option value="staging">🟡 Staging</option>
                  <option value="production">🔴 Production</option>
                </select>
              </div>
            </div>

            {/* Connection Options */}
            <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Connection Options
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Connection Timeout (ms)
                  </label>
                  <input
                    type="number"
                    name="connectTimeoutMS"
                    value={formData.connectTimeoutMS}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500"
                    placeholder="10000"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Server Selection Timeout (ms)
                  </label>
                  <input
                    type="number"
                    name="serverSelectionTimeoutMS"
                    value={formData.serverSelectionTimeoutMS}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500"
                    placeholder="30000"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Pool Size
                  </label>
                  <input
                    type="number"
                    name="maxPoolSize"
                    value={formData.maxPoolSize}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500"
                    placeholder="10"
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-2 mt-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="retryWrites"
                    name="retryWrites"
                    checked={formData.retryWrites}
                    onChange={handleChange}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor="retryWrites" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Retry Writes
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="retryReads"
                    name="retryReads"
                    checked={formData.retryReads}
                    onChange={handleChange}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor="retryReads" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Retry Reads
                  </label>
                </div>
              </div>
            </div>

            {/* Test Result */}
            <AnimatePresence>
              {testResult && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-4 rounded-lg ${
                    testResult.success
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {testResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium">{testResult.message}</p>
                      {testResult.serverVersion && (
                        <p className="text-xs mt-1 opacity-80">Server version: {testResult.serverVersion}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={testMutation.isPending}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {testMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4" />
                )}
                Test Connection
              </button>
              
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : isEditing
                    ? 'Update Connection'
                    : 'Add Connection'}
              </button>
              
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}