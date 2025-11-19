import { useState } from 'react';
import { Search, RefreshCw, Check, X, Shield, User } from 'lucide-react';
import Toast, { ToastContainer, ToastType } from '../../components/Toast';
import JsonView from '@uiw/react-json-view';

interface IAMUser {
  userName: string;
  userId: string;
  arn: string;
  createDate: string;
}

interface IAMPolicy {
  policyName: string;
  policyArn?: string;
  isAttached: boolean;
}

interface Permission {
  action: string;
  resource: string;
  effect: 'Allow' | 'Deny';
  policyName: string;
}

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export default function IAMPermissionChecker() {
  const [region, setRegion] = useState('us-east-1');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [users, setUsers] = useState<IAMUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<IAMUser | null>(null);
  const [policies, setPolicies] = useState<IAMPolicy[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [simulateAction, setSimulateAction] = useState('');
  const [simulateResource, setSimulateResource] = useState('');
  const [simulationResult, setSimulationResult] = useState<{ allowed: boolean; reason: string } | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const fetchUsers = async () => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/iam/users', {
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
        throw new Error(error.message || 'Failed to fetch IAM users');
      }

      const data = await response.json();
      setUsers(data.users || []);
      showToast(`Found ${data.users?.length || 0} IAM users`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch IAM users', 'error');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPermissions = async (user: IAMUser) => {
    setSelectedUser(user);
    setLoadingPermissions(true);
    try {
      const response = await fetch('/api/aws/iam/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          userName: user.userName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch permissions');
      }

      const data = await response.json();
      setPolicies(data.policies || []);
      setPermissions(data.permissions || []);
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch user permissions', 'error');
      setPolicies([]);
      setPermissions([]);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const simulatePermission = async () => {
    if (!selectedUser || !simulateAction || !simulateResource) {
      showToast('Please select a user and provide action and resource', 'error');
      return;
    }

    try {
      const response = await fetch('/api/aws/iam/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          userName: selectedUser.userName,
          action: simulateAction,
          resource: simulateResource,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to simulate permission');
      }

      const data = await response.json();
      setSimulationResult(data);
      showToast(data.allowed ? 'Permission allowed' : 'Permission denied', data.allowed ? 'success' : 'error');
    } catch (error: any) {
      showToast(error.message || 'Failed to simulate permission', 'error');
    }
  };

  const filteredUsers = users.filter(user =>
    user.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.userId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPermissions = permissions.filter(perm =>
    !actionFilter || perm.action.toLowerCase().includes(actionFilter.toLowerCase())
  );

  const groupedPermissions = filteredPermissions.reduce((acc, perm) => {
    const service = perm.action.split(':')[0] || 'other';
    if (!acc[service]) acc[service] = [];
    acc[service].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

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
        {/* Users List */}
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
              onClick={fetchUsers}
              disabled={loading}
              className="w-full px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 mb-2"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Load Users'}
            </button>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-7 pr-2 py-1.5 text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto p-2">
            {filteredUsers.length === 0 ? (
              <div className="text-xs text-gray-500 text-center mt-4">
                {users.length === 0 ? 'No users loaded' : 'No users match search'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredUsers.map((user) => (
                  <button
                    key={user.userId}
                    onClick={() => fetchUserPermissions(user)}
                    className={`w-full text-left px-3 py-2 text-xs rounded transition-colors ${
                      selectedUser?.userId === user.userId
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200'
                        : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{user.userName}</div>
                        <div className="text-[10px] text-gray-500 truncate">{user.userId}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Permissions View */}
        <div className="flex-1 flex flex-col">
          {selectedUser ? (
            <>
              <div className="px-4 py-3 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                <div className="flex items-center gap-3 mb-3">
                  <User className="w-5 h-5" />
                  <div className="flex-1">
                    <h3 className="font-semibold">{selectedUser.userName}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{selectedUser.arn}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <input
                    type="text"
                    value={simulateAction}
                    onChange={(e) => setSimulateAction(e.target.value)}
                    placeholder="Action (e.g., s3:GetObject)"
                    className="px-3 py-2 text-sm rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={simulateResource}
                    onChange={(e) => setSimulateResource(e.target.value)}
                    placeholder="Resource ARN"
                    className="px-3 py-2 text-sm rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
                  />
                  <button
                    onClick={simulatePermission}
                    className="px-3 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700"
                  >
                    Simulate
                  </button>
                </div>

                {simulationResult && (
                  <div className={`p-3 rounded flex items-center gap-2 ${
                    simulationResult.allowed
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                  }`}>
                    {simulationResult.allowed ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                    <div className="flex-1">
                      <div className="font-semibold">{simulationResult.allowed ? 'Allowed' : 'Denied'}</div>
                      <div className="text-sm">{simulationResult.reason}</div>
                    </div>
                  </div>
                )}

                <input
                  type="text"
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  placeholder="Filter by action..."
                  className="w-full px-3 py-2 text-sm rounded border dark:border-slate-600 bg-white dark:bg-slate-800 mt-3"
                />
              </div>

              <div className="flex-1 overflow-auto p-4">
                {loadingPermissions ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
                  </div>
                ) : (
                  <>
                    {/* Policies */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Attached Policies ({policies.length})
                      </h4>
                      <div className="space-y-2">
                        {policies.map((policy, index) => (
                          <div
                            key={index}
                            className="p-3 bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">{policy.policyName}</div>
                                {policy.policyArn && (
                                  <div className="text-xs text-gray-500 font-mono">{policy.policyArn}</div>
                                )}
                              </div>
                              <span className={`px-2 py-1 text-xs rounded ${
                                policy.isAttached
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                  : 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400'
                              }`}>
                                {policy.isAttached ? 'Attached' : 'Inline'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Permissions */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">
                        Permissions ({filteredPermissions.length})
                      </h4>
                      {Object.keys(groupedPermissions).length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          No permissions to display
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {Object.entries(groupedPermissions).map(([service, perms]) => (
                            <div key={service} className="border dark:border-slate-700 rounded-lg overflow-hidden">
                              <div className="px-4 py-2 bg-gray-100 dark:bg-slate-800 font-semibold text-sm">
                                {service.toUpperCase()} ({perms.length})
                              </div>
                              <div className="divide-y dark:divide-slate-700">
                                {perms.map((perm, index) => (
                                  <div key={index} className="px-4 py-2 text-sm">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1">
                                        <div className="font-mono text-xs mb-1">{perm.action}</div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                                          {perm.resource}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          Policy: {perm.policyName}
                                        </div>
                                      </div>
                                      <span className={`px-2 py-0.5 text-xs rounded flex-shrink-0 ${
                                        perm.effect === 'Allow'
                                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                      }`}>
                                        {perm.effect}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a user to view permissions
            </div>
          )}
        </div>
      </div>
    </>
  );
}
