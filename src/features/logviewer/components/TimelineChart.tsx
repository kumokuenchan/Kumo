import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { LogEntry } from '../LogViewerPage';
import { Clock } from 'lucide-react';

interface TimelineChartProps {
  logEntries: LogEntry[];
  onTimeRangeClick?: (startTime: Date, endTime: Date) => void;
}

export default function TimelineChart({ logEntries, onTimeRangeClick }: TimelineChartProps) {
  const timelineData = useMemo(() => {
    if (logEntries.length === 0) return [];

    // Group logs by time intervals (e.g., per minute)
    const groupedByTime = new Map<string, { error: number; warn: number; info: number; debug: number; timestamp: Date }>();

    logEntries.forEach((entry) => {
      if (!entry.timestamp) return;

      try {
        const time = new Date(entry.timestamp);
        // Round to nearest minute
        time.setSeconds(0, 0);
        const timeKey = time.toISOString();

        if (!groupedByTime.has(timeKey)) {
          groupedByTime.set(timeKey, {
            error: 0,
            warn: 0,
            info: 0,
            debug: 0,
            timestamp: time
          });
        }

        const group = groupedByTime.get(timeKey)!;
        const level = entry.level?.toLowerCase();

        if (level === 'error') group.error++;
        else if (level === 'warn') group.warn++;
        else if (level === 'info') group.info++;
        else if (level === 'debug') group.debug++;
      } catch (e) {
        // Skip invalid timestamps
      }
    });

    // Convert to array and sort by time
    return Array.from(groupedByTime.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map((item) => ({
        ...item,
        time: item.timestamp.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        fullTime: item.timestamp.toLocaleString()
      }));
  }, [logEntries]);

  if (timelineData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        <div className="text-center">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No timeline data available</p>
          <p className="text-xs mt-1">Logs must have timestamps</p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(
    ...timelineData.map((d) => d.error + d.warn + d.info + d.debug)
  );

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-300 mb-1">Timeline View</h3>
        <p className="text-xs text-gray-500">
          Click on the chart to filter by time range
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={timelineData}
            onClick={(data) => {
              if (data && data.activePayload && data.activePayload[0]) {
                const clickedData = data.activePayload[0].payload;
                const startTime = new Date(clickedData.timestamp);
                const endTime = new Date(startTime.getTime() + 60000); // +1 minute
                onTimeRangeClick?.(startTime, endTime);
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <defs>
              <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="warnGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="infoGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time"
              stroke="#9ca3af"
              style={{ fontSize: '10px' }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis stroke="#9ca3af" style={{ fontSize: '10px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                fontSize: '12px'
              }}
              labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
              formatter={(value: number, name: string) => {
                const colorMap: Record<string, string> = {
                  error: '#ef4444',
                  warn: '#f59e0b',
                  info: '#3b82f6',
                  debug: '#6b7280'
                };
                return [
                  <span style={{ color: colorMap[name] || '#fff' }}>
                    {value} {name.toUpperCase()}
                  </span>,
                  ''
                ];
              }}
            />
            <Area
              type="monotone"
              dataKey="error"
              stackId="1"
              stroke="#ef4444"
              fill="url(#errorGradient)"
            />
            <Area
              type="monotone"
              dataKey="warn"
              stackId="1"
              stroke="#f59e0b"
              fill="url(#warnGradient)"
            />
            <Area
              type="monotone"
              dataKey="info"
              stackId="1"
              stroke="#3b82f6"
              fill="url(#infoGradient)"
            />
            <Area
              type="monotone"
              dataKey="debug"
              stackId="1"
              stroke="#6b7280"
              fill="#6b7280"
              fillOpacity={0.2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-gray-400">Errors</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-gray-400">Warnings</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-gray-400">Info</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gray-500"></div>
          <span className="text-gray-400">Debug</span>
        </div>
      </div>
    </div>
  );
}
