import { useState } from 'react';
import { RefreshCw, Calendar, Settings, Activity, ToggleLeft, ToggleRight, FileText, BarChart3, AlertTriangle, Copy, ExternalLink, ChevronRight, ChevronDown } from 'lucide-react';
import Toast, { ToastContainer, ToastType } from '../../components/Toast';
import JsonView from '@uiw/react-json-view';

interface EventRule {
  ruleName: string;
  ruleArn: string;
  eventPattern?: string;
  scheduleExpression?: string;
  state: 'ENABLED' | 'DISABLED';
  description?: string;
  roleArn?: string;
  targets: Target[];
  eventBuses: string[];
  createdAt: string;
  modifiedAt?: string;
}

interface Target {
  id: string;
  arn: string;
  roleArn?: string;
  input?: string;
  inputPath?: string;
  inputTransformer?: {
    inputPathsMap?: Record<string, string>;
    inputTemplate: string;
  };
  ecsParameters?: {
    taskDefinitionArn: string;
    taskCount?: number;
  };
  kinesisParameters?: {
    partitionKeyPath?: string;
  };
  sqsParameters?: {
    messageGroupId?: string;
  };
}

interface RuleMetric {
  ruleName: string;
  matchedEvents: number;
  triggeredEvents: number;
  failedInvocations: number;
  lastMatchTime: string;
}

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export default function EventBridgeRulesViewer() {
  const [region, setRegion] = useState('us-east-1');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // EventBridge Data
  const [rules, setRules] = useState<EventRule[]>([]);
  const [metrics, setMetrics] = useState<RuleMetric[]>([]);
  const [selectedRule, setSelectedRule] = useState<EventRule | null>(null);
  
  // UI State
  const [activeView, setActiveView] = useState<'rules' | 'pattern' | 'targets' | 'metrics' | 'settings'>('rules');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const showToast = (message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const fetchRules = async () => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/eventbridge/rules', {
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
        throw new Error(error.message || 'Failed to fetch rules');
      }

      const data = await response.json();
      setRules(data.rules || []);
      showToast(`Found ${data.rules?.length || 0} rules`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch rules', 'error');
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async (ruleName: string) => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/eventbridge/rule-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          ruleName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch metrics');
      }

      const data = await response.json();
      setMetrics(prev => [...prev, data.metric]);
      showToast(`Fetched metrics for ${ruleName}`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch metrics', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleRuleState = async (ruleName: string, newState: 'ENABLED' | 'DISABLED') => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/eventbridge/toggle-rule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          ruleName,
          state: newState,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to toggle rule state');
      }

      const data = await response.json();
      showToast(`Rule ${ruleName} ${newState.toLowerCase()}`, 'success');
      
      // Update the rule in the list
      setRules(prev => prev.map(rule => 
        rule.ruleName === ruleName ? { ...rule, state: newState } : rule
      ));
      
      if (selectedRule && selectedRule.ruleName === ruleName) {
        setSelectedRule({ ...selectedRule, state: newState });
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to toggle rule state', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRuleSelect = (rule: EventRule) => {
    setSelectedRule(rule);
    fetchMetrics(rule.ruleName);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`, 'success');
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Filter rules based on search query
  const filteredRules = rules.filter(rule => 
    rule.ruleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (rule.description && rule.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
        {/* Sidebar - AWS Credentials and Rule List */}
        <div className="w-80 border-r dark:border-slate-700 flex flex-col">
          <div className="px-4 py-3 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <div className="grid grid-cols-1 gap-3 mb-4">
              <div>
                <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
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
                  className="w-full px-2 py-1.5 text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Secret Access Key</label>
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
              onClick={fetchRules}
              disabled={loading}
              className="w-full px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Load Rules'}
            </button>
          </div>

          <div className="flex-1 overflow-auto p-2">
            <div className="mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rules..."
                className="w-full px-2 py-1 text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
              />
            </div>

            {filteredRules.length === 0 ? (
              <div className="text-xs text-gray-500 text-center mt-4">
                {loading ? 'Loading rules...' : 'No rules found'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredRules.map((rule) => (
                  <div
                    key={rule.ruleArn}
                    className={`bg-white dark:bg-slate-800 rounded border dark:border-slate-700 p-2 text-xs cursor-pointer ${
                      selectedRule?.ruleName === rule.ruleName
                        ? 'ring-2 ring-blue-500'
                        : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                    onClick={() => handleRuleSelect(rule)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {rule.ruleName}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {rule.state} | {rule.targets.length} targets
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRuleState(rule.ruleName, rule.state === 'ENABLED' ? 'DISABLED' : 'ENABLED');
                          }}
                          className={`p-1 rounded ${
                            rule.state === 'ENABLED' 
                              ? 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30' 
                              : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                          }`}
                          title={rule.state === 'ENABLED' ? 'Disable rule' : 'Enable rule'}
                        >
                          {rule.state === 'ENABLED' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {rule.description && (
                      <div className="text-[10px] text-gray-600 dark:text-gray-400 mt-1 truncate">
                        {rule.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {selectedRule ? (
            <>
              {/* Rule Header */}
              <div className="px-4 py-3 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      {selectedRule.ruleName}
                    </h2>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        selectedRule.state === 'ENABLED' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                        {selectedRule.state}
                      </span>
                      <span>Created: {new Date(selectedRule.createdAt).toLocaleString()}</span>
                      {selectedRule.modifiedAt && (
                        <span>Modified: {new Date(selectedRule.modifiedAt).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* View Tabs */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveView('rules')}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'rules'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveView('pattern')}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'pattern'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Rule Pattern
                  </button>
                  <button
                    onClick={() => setActiveView('targets')}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'targets'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Targets ({selectedRule.targets.length})
                  </button>
                  <button
                    onClick={() => setActiveView('metrics')}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'metrics'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Metrics
                  </button>
                  <button
                    onClick={() => setActiveView('settings')}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'settings'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Settings
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-auto p-4">
                {activeView === 'rules' && (
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                      <h3 className="font-semibold mb-3">Rule Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Rule ARN:</span>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="font-mono text-sm break-all">{selectedRule.ruleArn}</span>
                            <button
                              onClick={() => copyToClipboard(selectedRule.ruleArn, 'Rule ARN')}
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">State:</span>
                          <div className="mt-1">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              selectedRule.state === 'ENABLED' 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}>
                              {selectedRule.state}
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Event Bus:</span>
                          <div className="mt-1">
                            {selectedRule.eventBuses.join(', ')}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Created:</span>
                          <div className="mt-1">
                            {new Date(selectedRule.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {selectedRule.description && (
                        <div className="mt-4">
                          <span className="text-gray-600 dark:text-gray-400">Description:</span>
                          <p className="mt-1">{selectedRule.description}</p>
                        </div>
                      )}
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                      <h3 className="font-semibold mb-3">Rule Configuration</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedRule.scheduleExpression && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Schedule:</span>
                            <div className="mt-1 font-mono">{selectedRule.scheduleExpression}</div>
                          </div>
                        )}
                        {selectedRule.roleArn && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Role ARN:</span>
                            <div className="mt-1 font-mono text-sm break-all">{selectedRule.roleArn}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeView === 'pattern' && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Event Pattern
                    </h3>
                    {selectedRule.eventPattern ? (
                      <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                        <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm overflow-auto">
                          <JsonView value={JSON.parse(selectedRule.eventPattern)} collapsed={1} />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        No event pattern defined. This rule is based on a schedule expression.
                      </div>
                    )}
                  </div>
                )}

                {activeView === 'targets' && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Targets ({selectedRule.targets.length})
                    </h3>
                    {selectedRule.targets.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        No targets configured for this rule
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedRule.targets.map((target) => (
                          <div
                            key={target.id}
                            className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-semibold">Target: {target.id}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{target.arn}</p>
                              </div>
                              <button
                                onClick={() => copyToClipboard(target.arn, 'Target ARN')}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Target Type:</span>
                                <div className="mt-1">
                                  {target.arn.includes('lambda') ? 'Lambda Function' :
                                   target.arn.includes('sqs') ? 'SQS Queue' :
                                   target.arn.includes('sns') ? 'SNS Topic' :
                                   target.arn.includes('step-functions') ? 'Step Functions' :
                                   target.arn.includes('ecs') ? 'ECS Task' : 'Other'}
                                </div>
                              </div>
                              {target.roleArn && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Role ARN:</span>
                                  <div className="mt-1 font-mono text-xs break-all">{target.roleArn}</div>
                                </div>
                              )}
                            </div>
                            {target.input && (
                              <div className="mb-3">
                                <div className="text-sm font-semibold mb-1">Static Input:</div>
                                <div className="bg-gray-900 text-green-400 p-2 rounded font-mono text-xs overflow-auto">
                                  <JsonView value={JSON.parse(target.input)} collapsed={1} />
                                </div>
                              </div>
                            )}
                            {target.inputPath && (
                              <div className="mb-3">
                                <div className="text-sm font-semibold mb-1">Input Path:</div>
                                <div className="font-mono text-sm">{target.inputPath}</div>
                              </div>
                            )}
                            {target.inputTransformer && (
                              <div className="mb-3">
                                <div className="text-sm font-semibold mb-1">Input Transformer:</div>
                                <div className="grid grid-cols-2 gap-2">
                                  {target.inputTransformer.inputPathsMap && (
                                    <div>
                                      <span className="text-gray-600 dark:text-gray-400">Input Paths:</span>
                                      <div className="mt-1">
                                        <JsonView value={target.inputTransformer.inputPathsMap} collapsed={2} />
                                      </div>
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Template:</span>
                                    <div className="mt-1 font-mono text-xs p-2 bg-gray-100 dark:bg-slate-700 rounded overflow-auto">
                                      {target.inputTransformer.inputTemplate}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            {target.ecsParameters && (
                              <div className="mb-3">
                                <div className="text-sm font-semibold mb-1">ECS Parameters:</div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Task Definition:</span>
                                    <div className="font-mono text-xs break-all">{target.ecsParameters.taskDefinitionArn}</div>
                                  </div>
                                  {target.ecsParameters.taskCount && (
                                    <div>
                                      <span className="text-gray-600 dark:text-gray-400">Task Count:</span>
                                      <div>{target.ecsParameters.taskCount}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeView === 'metrics' && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Rule Metrics
                    </h3>
                    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                      <div className="grid grid-cols-4 gap-4 mb-4">
                        {metrics
                          .filter(metric => metric.ruleName === selectedRule.ruleName)
                          .map((metric, idx) => (
                            <div key={idx} className="text-center">
                              <div className="text-2xl font-bold text-blue-600">{metric.matchedEvents}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Matched Events</div>
                            </div>
                          ))}
                        {metrics
                          .filter(metric => metric.ruleName === selectedRule.ruleName)
                          .map((metric, idx) => (
                            <div key={idx} className="text-center">
                              <div className="text-2xl font-bold text-green-600">{metric.triggeredEvents}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Triggered Events</div>
                            </div>
                          ))}
                        {metrics
                          .filter(metric => metric.ruleName === selectedRule.ruleName)
                          .map((metric, idx) => (
                            <div key={idx} className="text-center">
                              <div className="text-2xl font-bold text-red-600">{metric.failedInvocations}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Failed Invocations</div>
                            </div>
                          ))}
                        {metrics
                          .filter(metric => metric.ruleName === selectedRule.ruleName)
                          .map((metric, idx) => (
                            <div key={idx} className="text-center">
                              <div className="text-sm font-medium">{new Date(metric.lastMatchTime).toLocaleString()}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Last Match</div>
                            </div>
                          ))}
                      </div>
                      <div className="mt-4">
                        <div className="text-sm font-semibold mb-2">Metrics Details</div>
                        <div className="space-y-2">
                          {metrics
                            .filter(metric => metric.ruleName === selectedRule.ruleName)
                            .map((metric, idx) => (
                              <div key={idx} className="p-3 border dark:border-slate-700 rounded">
                                <div className="grid grid-cols-4 gap-3 text-sm">
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Matched:</span>
                                    <span className="ml-2 font-medium">{metric.matchedEvents}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Triggered:</span>
                                    <span className="ml-2 font-medium">{metric.triggeredEvents}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Failed:</span>
                                    <span className="ml-2 font-medium">{metric.failedInvocations}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Last Match:</span>
                                    <span className="ml-2 text-sm">{new Date(metric.lastMatchTime).toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeView === 'settings' && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Rule Settings
                    </h3>
                    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold">Rule State</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Current state: {selectedRule.state}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleRuleState(selectedRule.ruleName, 'ENABLED')}
                            disabled={selectedRule.state === 'ENABLED' || loading}
                            className={`px-3 py-1.5 text-sm rounded ${
                              selectedRule.state === 'ENABLED'
                                ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            Enable
                          </button>
                          <button
                            onClick={() => toggleRuleState(selectedRule.ruleName, 'DISABLED')}
                            disabled={selectedRule.state === 'DISABLED' || loading}
                            className={`px-3 py-1.5 text-sm rounded ${
                              selectedRule.state === 'DISABLED'
                                ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 cursor-not-allowed'
                                : 'bg-red-600 text-white hover:bg-red-700'
                            }`}
                          >
                            Disable
                          </button>
                        </div>
                      </div>

                      <div className="mt-6">
                        <h4 className="font-semibold mb-3">Rule Details</h4>
                        <div className="space-y-3">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Rule Name:</span>
                            <div className="font-mono">{selectedRule.ruleName}</div>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Rule ARN:</span>
                            <div className="font-mono text-sm break-all">{selectedRule.ruleArn}</div>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Event Buses:</span>
                            <div>{selectedRule.eventBuses.join(', ')}</div>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Created:</span>
                            <div>{new Date(selectedRule.createdAt).toLocaleString()}</div>
                          </div>
                          {selectedRule.modifiedAt && (
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Modified:</span>
                              <div>{new Date(selectedRule.modifiedAt).toLocaleString()}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a rule from the sidebar to view details
            </div>
          )}
        </div>
      </div>
    </>
  );
}