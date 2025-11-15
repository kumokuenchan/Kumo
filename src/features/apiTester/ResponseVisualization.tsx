import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  BarChart3, 
  PieChart, 
  LineChart, 
  TrendingUp, 
  Download, 
  Filter,
  Hash,
  Activity,
  Info,
  Settings
} from 'lucide-react';
import type { ApiResponse } from '../../api/apiTester';

interface ResponseVisualizationProps {
  isOpen: boolean;
  onClose: () => void;
  response: ApiResponse;
  onToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface FieldStats {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'object' | 'array';
  count: number;
  uniqueCount: number;
  missingCount: number;
  fillRate: number;
  examples: any[];
}

interface NumericStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  mode: number;
  stdDev: number;
  quartiles: {
    q1: number;
    q2: number;
    q3: number;
  };
}

interface ChartData {
  labels: string[];
  values: number[];
  colors: string[];
}

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

export default function ResponseVisualization({
  isOpen,
  onClose,
  response,
  onToast
}: ResponseVisualizationProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'distribution' | 'correlations' | 'trends'>('overview');
  const [selectedField, setSelectedField] = useState('');
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'line'>('bar');

  // Function to extract data from response
  const extractData = useMemo(() => {
    if (!response) return [];
    
    const data = response.data;
    if (!data) return [];
    
    // If it's an array of objects, use that
    if (Array.isArray(data)) {
      return data;
    }
    
    // If it's an object with array values, use the first array
    if (typeof data === 'object' && data !== null) {
      const arrays = Object.values(data).filter(Array.isArray);
      if (arrays.length > 0) {
        return arrays[0]; // Use first array found
      }
      
      // If it's a single object, treat as single-item array
      return [data];
    }
    
    return [];
  }, [response]);

  // Calculate field statistics
  const fieldStats = useMemo(() => {
    if (!extractData || extractData.length === 0) return [];

    const stats: FieldStats[] = [];
    const allFields = new Set<string>();
    
    // Collect all fields
    extractData.forEach(doc => {
      if (typeof doc === 'object' && doc !== null) {
        Object.keys(doc).forEach(key => allFields.add(key));
      }
    });

    allFields.forEach(fieldName => {
      const values = extractData
        .map(doc => typeof doc === 'object' && doc !== null ? doc[fieldName] : undefined)
        .filter(v => v !== undefined && v !== null);
      const uniqueValues = [...new Set(values.map(v => JSON.stringify(v)))];
      const examples = uniqueValues.slice(0, 5).map(v => JSON.parse(v));
      
      // Determine field type
      let type: 'text' | 'number' | 'date' | 'boolean' | 'object' | 'array' = 'text';
      if (values.length > 0) {
        const sample = values[0];
        if (typeof sample === 'boolean') type = 'boolean';
        else if (typeof sample === 'number') type = 'number';
        else if (typeof sample === 'object' && Array.isArray(sample)) type = 'array';
        else if (typeof sample === 'object' && !Array.isArray(sample)) type = 'object';
        else if (typeof sample === 'string' && (sample.includes('-') || sample.includes('T'))) {
          if (!isNaN(Date.parse(sample))) type = 'date';
        }
      }

      stats.push({
        name: fieldName,
        type,
        count: values.length,
        uniqueCount: uniqueValues.length,
        missingCount: extractData.length - values.length,
        fillRate: (values.length / extractData.length) * 100,
        examples
      });
    });

    return stats.sort((a, b) => b.fillRate - a.fillRate);
  }, [extractData]);

  // Calculate numeric statistics
  const getNumericStats = (fieldName: string): NumericStats | null => {
    const values = extractData
      .map(doc => typeof doc === 'object' && doc !== null ? doc[fieldName] : undefined)
      .filter(v => typeof v === 'number' && !isNaN(v))
      .sort((a, b) => a - b);

    if (values.length === 0) return null;

    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const median = values.length % 2 === 0 
      ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
      : values[Math.floor(values.length / 2)];

    // Mode calculation
    const frequency: { [key: number]: number } = {};
    values.forEach(v => frequency[v] = (frequency[v] || 0) + 1);
    const maxFreq = Math.max(...Object.values(frequency));
    const modes = Object.keys(frequency)
      .filter(key => frequency[parseInt(key)] === maxFreq)
      .map(k => parseInt(k));
    const mode = modes.length > 0 ? modes[0] : values[0];

    // Standard deviation
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Quartiles
    const q1 = values[Math.floor(values.length * 0.25)];
    const q2 = median;
    const q3 = values[Math.floor(values.length * 0.75)];

    return {
      min: values[0],
      max: values[values.length - 1],
      mean,
      median,
      mode,
      stdDev,
      quartiles: { q1, q2, q3 }
    };
  };

  // Generate distribution chart data
  const getDistributionData = (fieldName: string): ChartData | null => {
    const values = extractData
      .map(doc => typeof doc === 'object' && doc !== null ? doc[fieldName] : undefined)
      .filter(v => v !== undefined && v !== null);
    
    if (values.length === 0) return null;

    const fieldStat = fieldStats.find(s => s.name === fieldName);
    if (!fieldStat) return null;

    if (fieldStat.type === 'number') {
      // Create bins for numeric data
      const numericValues = values.filter(v => typeof v === 'number');
      if (numericValues.length === 0) return null;

      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      const binCount = Math.min(10, Math.ceil(Math.sqrt(numericValues.length)));
      const binSize = (max - min) / binCount;
      
      const bins = Array(binCount).fill(0);
      const labels = [];
      
      for (let i = 0; i < binCount; i++) {
        const start = min + i * binSize;
        const end = start + binSize;
        labels.push(`${start.toFixed(1)}-${end.toFixed(1)}`);
        bins[i] = numericValues.filter(v => v >= start && v < end).length;
      }
      
      return {
        labels,
        values: bins,
        colors: COLORS.slice(0, binCount)
      };
    } else if (fieldStat.type === 'text' || fieldStat.type === 'boolean') {
      // Count occurrences for categorical data
      const frequency: { [key: string]: number } = {};
      values.forEach(v => {
        const key = v.toString();
        frequency[key] = (frequency[key] || 0) + 1;
      });

      const sortedEntries = Object.entries(frequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10); // Top 10 most frequent

      return {
        labels: sortedEntries.map(([label]) => label),
        values: sortedEntries.map(([, count]) => count),
        colors: COLORS.slice(0, sortedEntries.length)
      };
    }

    return null;
  };

  const renderBarChart = (data: ChartData) => (
    <div className="h-64 flex items-end justify-around gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      {data.values.map((value, index) => {
        const maxValue = Math.max(...data.values);
        const height = maxValue > 0 ? (value / maxValue) * 200 : 0;
        
        return (
          <div key={index} className="flex flex-col items-center flex-1">
            <div 
              className="w-full bg-blue-500 hover:bg-blue-600 rounded-t transition-colors cursor-pointer"
              style={{ height: `${height}px`, minHeight: '4px' }}
              title={`${data.labels[index]}: ${value}`}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center truncate w-full">
              {data.labels[index]}
            </span>
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
              {value}
            </span>
          </div>
        );
      })}
    </div>
  );

  const renderPieChart = (data: ChartData) => {
    const total = data.values.reduce((a, b) => a + b, 0);
    let currentAngle = 0;

    return (
      <div className="h-64 flex items-center justify-center p-4">
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {data.values.map((value, index) => {
              const percentage = (value / total) * 100;
              const angle = (value / total) * 360;
              const startAngle = currentAngle;
              const endAngle = currentAngle + angle;
              
              const x1 = 100 + 80 * Math.cos((startAngle * Math.PI) / 180);
              const y1 = 100 + 80 * Math.sin((startAngle * Math.PI) / 180);
              const x2 = 100 + 80 * Math.cos((endAngle * Math.PI) / 180);
              const y2 = 100 + 80 * Math.sin((endAngle * Math.PI) / 180);
              
              const largeArcFlag = angle > 180 ? 1 : 0;
              
              const pathData = [
                `M 100 100`,
                `L ${x1} ${y1}`,
                `A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                `Z`
              ].join(' ');

              currentAngle += angle;
              
              return (
                <path
                  key={index}
                  d={pathData}
                  fill={data.colors[index]}
                  stroke="white"
                  strokeWidth="2"
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                  title={`${data.labels[index]}: ${value} (${percentage.toFixed(1)}%)`}
                />
              );
            })}
          </svg>
        </div>
        <div className="ml-8 space-y-2">
          {data.labels.map((label, index) => {
            const percentage = ((data.values[index] / total) * 100).toFixed(1);
            return (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: data.colors[index] }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {label}: {data.values[index]} ({percentage}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderLineChart = (data: ChartData) => (
    <div className="h-64 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="relative h-full">
        <svg viewBox="0 0 400 200" className="w-full h-full">
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map(i => (
            <line
              key={i}
              x1="0"
              y1={i * 40}
              x2="400"
              y2={i * 40}
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-gray-300 dark:text-gray-600"
            />
          ))}
          
          {/* Line */}
          <polyline
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            points={data.values.map((value, index) => {
              const x = (index / (data.values.length - 1)) * 380 + 10;
              const maxValue = Math.max(...data.values);
              const y = 190 - (value / maxValue) * 180;
              return `${x},${y}`;
            }).join(' ')}
          />
          
          {/* Points */}
          {data.values.map((value, index) => {
            const x = (index / (data.values.length - 1)) * 380 + 10;
            const maxValue = Math.max(...data.values);
            const y = 190 - (value / maxValue) * 180;
            
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill="#3B82F6"
                className="cursor-pointer hover:r-4 transition-all"
                title={`${data.labels[index]}: ${value}`}
              />
            );
          })}
        </svg>
        
        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
          {data.labels.map((label, index) => (
            <span key={index} className="text-xs text-gray-600 dark:text-gray-400 transform -translate-x-1/2">
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  const selectedFieldStats = selectedField ? fieldStats.find(s => s.name === selectedField) : null;
  const numericStats = selectedField ? getNumericStats(selectedField) : null;
  const distributionData = selectedField ? getDistributionData(selectedField) : null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-[#161b22] rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Response Visualization</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Analyze numeric data in your API response
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'distribution', label: 'Distribution', icon: PieChart },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <select
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select a field to visualize</option>
                {fieldStats.filter(field => field.type === 'number').map(field => (
                  <option key={field.name} value={field.name}>
                    {field.name} ({field.type})
                  </option>
                ))}
              </select>
            </div>
            
            {activeTab === 'distribution' && selectedField && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Chart:</span>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded p-0.5">
                  {(['bar', 'pie', 'line'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setChartType(type)}
                      className={`px-3 py-1 text-xs rounded ${
                        chartType === type
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {type === 'bar' && <BarChart3 className="w-3 h-3" />}
                      {type === 'pie' && <PieChart className="w-3 h-3" />}
                      {type === 'line' && <LineChart className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Hash className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-600 dark:text-blue-400">Total Fields</p>
                      <p className="text-2xl font-semibold text-blue-700 dark:text-blue-300">{fieldStats.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <Hash className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-green-600 dark:text-green-400">Numeric Fields</p>
                      <p className="text-2xl font-semibold text-green-700 dark:text-green-300">
                        {fieldStats.filter(s => s.type === 'number').length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                      <Hash className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-600 dark:text-purple-400">Text Fields</p>
                      <p className="text-2xl font-semibold text-purple-700 dark:text-purple-300">
                        {fieldStats.filter(s => s.type === 'text').length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                      <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-orange-600 dark:text-orange-400">Data Quality</p>
                      <p className="text-2xl font-semibold text-orange-700 dark:text-orange-300">
                        {fieldStats.length > 0 ? Math.round(fieldStats.reduce((sum, s) => sum + s.fillRate, 0) / fieldStats.length) : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Field Statistics Table */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Field Statistics</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Field
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Type
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Fill Rate
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Unique Values
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Examples
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {fieldStats.map((field, index) => (
                        <tr key={field.name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {field.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              field.type === 'text' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                              field.type === 'number' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                              field.type === 'date' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                              field.type === 'boolean' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                              field.type === 'array' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                            }`}>
                              {field.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                <div 
                                  className="bg-green-500 h-2 rounded-full" 
                                  style={{ width: `${field.fillRate}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium">{Math.round(field.fillRate)}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {field.uniqueCount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex flex-wrap gap-1">
                              {field.examples.slice(0, 3).map((example, i) => (
                                <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                  {typeof example === 'string' ? example.substring(0, 20) : JSON.stringify(example).substring(0, 20)}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'distribution' && selectedField && distributionData && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Distribution: {selectedField}
                </h3>
                <button
                  onClick={() => {
                    // Export chart as SVG
                    onToast('Chart export feature coming soon!', 'info');
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center gap-1.5 transition"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>

              {/* Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                {chartType === 'bar' && renderBarChart(distributionData)}
                {chartType === 'pie' && renderPieChart(distributionData)}
                {chartType === 'line' && renderLineChart(distributionData)}
              </div>

              {/* Statistics */}
              {numericStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Min', value: numericStats.min.toFixed(2) },
                    { label: 'Max', value: numericStats.max.toFixed(2) },
                    { label: 'Mean', value: numericStats.mean.toFixed(2) },
                    { label: 'Median', value: numericStats.median.toFixed(2) },
                    { label: 'Mode', value: numericStats.mode.toFixed(2) },
                    { label: 'Std Dev', value: numericStats.stdDev.toFixed(2) },
                    { label: 'Q1', value: numericStats.quartiles.q1.toFixed(2) },
                    { label: 'Q3', value: numericStats.quartiles.q3.toFixed(2) }
                  ].map((stat) => (
                    <div key={stat.label} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400">{stat.label}</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{stat.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {(!selectedField || !distributionData) && activeTab === 'distribution' && (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Select a Numeric Field</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a numeric field from the dropdown above to see its distribution and statistics.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}