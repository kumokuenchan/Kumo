import { useState } from 'react';
import { Search, RefreshCw, Eye, Calendar, Filter, Download } from 'lucide-react';
import Toast, { ToastContainer, ToastType } from '../../components/Toast';
import JsonView from '@uiw/react-json-view';

interface CloudTrailEvent {
  eventId: string;
  eventName: string;
  eventSource: string;
  eventTime: string;
  username: string;
  sourceIPAddress: string;
  userAgent: string;
  awsRegion: string;
  requestParameters?: any;
  responseElements?: any;
  errorCode?: string;
  errorMessage?: string;
}

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export default function CloudTrailViewer() {
  const [region, setRegion] = useState('us-east-1');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [events, setEvents] = useState<CloudTrailEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CloudTrailEvent | null>(null);
  const [filterEventName, setFilterEventName] = useState('');
  const [filterUsername, setFilterUsername] = useState('');
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const fetchEvents = async () => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/cloudtrail/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch CloudTrail events');
      }

      const data = await response.json();
      setEvents(data.events || []);
      showToast(`Fetched ${data.events?.length || 0} events`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch CloudTrail events', 'error');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const exportEvents = () => {
    const dataStr = JSON.stringify(filteredEvents, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cloudtrail-events-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Events exported successfully', 'success');
  };

  const filteredEvents = events.filter(event => {
    const matchesEventName = !filterEventName || event.eventName.toLowerCase().includes(filterEventName.toLowerCase());
    const matchesUsername = !filterUsername || event.username.toLowerCase().includes(filterUsername.toLowerCase());
    const matchesError = !showErrorsOnly || event.errorCode;
    return matchesEventName && matchesUsername && matchesError;
  });

  const setLast24Hours = () => {
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    setStartTime(start.toISOString().slice(0, 16));
    setEndTime(end.toISOString().slice(0, 16));
  };

  const setLastHour = () => {
    const end = new Date();
    const start = new Date(end.getTime() - 60 * 60 * 1000);
    setStartTime(start.toISOString().slice(0, 16));
    setEndTime(end.toISOString().slice(0, 16));
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

      <div className="h-full flex flex-col">
        {/* Configuration Panel */}
        <div className="px-4 py-3 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
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
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Start Time</label>
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
                />
                <button onClick={setLastHour} className="px-2 py-1 text-xs rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700">
                  Last Hour
                </button>
                <button onClick={setLast24Hours} className="px-2 py-1 text-xs rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700">
                  Last 24h
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">End Time</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
              />
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={fetchEvents}
              disabled={loading}
              className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Fetch Events'}
            </button>
            <button
              onClick={exportEvents}
              disabled={filteredEvents.length === 0}
              className="px-4 py-2 text-sm rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <input
              type="text"
              value={filterEventName}
              onChange={(e) => setFilterEventName(e.target.value)}
              placeholder="Filter by event name..."
              className="flex-1 px-3 py-2 text-sm rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
            />
            <input
              type="text"
              value={filterUsername}
              onChange={(e) => setFilterUsername(e.target.value)}
              placeholder="Filter by username..."
              className="flex-1 px-3 py-2 text-sm rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showErrorsOnly}
                onChange={(e) => setShowErrorsOnly(e.target.checked)}
                className="rounded"
              />
              Errors Only
            </label>
          </div>
        </div>

        {/* Events List */}
        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/2 border-r dark:border-slate-700 overflow-auto p-4">
            {filteredEvents.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                {events.length === 0 ? 'No events loaded. Configure credentials and time range, then click "Fetch Events".' : 'No events match your filters.'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEvents.map((event) => (
                  <div
                    key={event.eventId}
                    onClick={() => setSelectedEvent(event)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedEvent?.eventId === event.eventId
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                        : event.errorCode
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:shadow-md'
                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                        {event.eventName}
                      </span>
                      {event.errorCode && (
                        <span className="px-2 py-0.5 text-xs rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                          Error
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                      <div>Source: {event.eventSource}</div>
                      <div>User: {event.username}</div>
                      <div>IP: {event.sourceIPAddress}</div>
                      <div>Time: {new Date(event.eventTime).toLocaleString()}</div>
                      {event.errorCode && (
                        <div className="text-red-600 dark:text-red-400">
                          {event.errorCode}: {event.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Event Details */}
          <div className="w-1/2 flex flex-col">
            <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
              <span className="text-sm font-medium">Event Details</span>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {selectedEvent ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Event Information</h3>
                    <div className="space-y-1 text-sm">
                      <div><span className="text-gray-600 dark:text-gray-400">Event ID:</span> <span className="font-mono">{selectedEvent.eventId}</span></div>
                      <div><span className="text-gray-600 dark:text-gray-400">Event Name:</span> {selectedEvent.eventName}</div>
                      <div><span className="text-gray-600 dark:text-gray-400">Event Source:</span> {selectedEvent.eventSource}</div>
                      <div><span className="text-gray-600 dark:text-gray-400">Time:</span> {new Date(selectedEvent.eventTime).toLocaleString()}</div>
                      <div><span className="text-gray-600 dark:text-gray-400">Region:</span> {selectedEvent.awsRegion}</div>
                      <div><span className="text-gray-600 dark:text-gray-400">Username:</span> {selectedEvent.username}</div>
                      <div><span className="text-gray-600 dark:text-gray-400">Source IP:</span> {selectedEvent.sourceIPAddress}</div>
                      <div><span className="text-gray-600 dark:text-gray-400">User Agent:</span> {selectedEvent.userAgent}</div>
                    </div>
                  </div>

                  {selectedEvent.requestParameters && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Request Parameters</h3>
                      <div className="bg-gray-50 dark:bg-slate-900 rounded p-2">
                        <JsonView value={selectedEvent.requestParameters} collapsed={1} />
                      </div>
                    </div>
                  )}

                  {selectedEvent.responseElements && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Response Elements</h3>
                      <div className="bg-gray-50 dark:bg-slate-900 rounded p-2">
                        <JsonView value={selectedEvent.responseElements} collapsed={1} />
                      </div>
                    </div>
                  )}

                  {selectedEvent.errorCode && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-red-600 dark:text-red-400">Error</h3>
                      <div className="bg-red-50 dark:bg-red-900/20 rounded p-3 text-sm">
                        <div className="font-semibold">{selectedEvent.errorCode}</div>
                        <div className="mt-1">{selectedEvent.errorMessage}</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Select an event to view details
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
