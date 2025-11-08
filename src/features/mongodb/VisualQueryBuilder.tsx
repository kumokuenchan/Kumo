import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Minus,
  GripVertical,
  Play,
  Save,
  RotateCcw,
  Settings,
  ChevronDown,
  ChevronRight,
  Calculator,
  Type,
  Hash,
  Calendar,
  Globe,
  CheckCircle2,
  Info,
  AlertCircle,
  Eye
} from 'lucide-react';

interface QueryCondition {
  id: string;
  field: string;
  operator: string;
  value: any;
  type: 'text' | 'number' | 'date' | 'boolean' | 'object';
  valueType: 'string' | 'number' | 'boolean' | 'date' | 'object';
  logicalOperator: 'AND' | 'OR';
}

interface QueryGroup {
  id: string;
  conditions: QueryCondition[];
  logicalOperator: 'AND' | 'OR';
  isExpanded: boolean;
}

interface VisualQueryBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteQuery: (query: any) => void;
  onSaveQuery: (name: string, query: any) => void;
  availableFields: string[];
  collectionName: string;
  onToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const OPERATORS = {
  text: [
    { value: '$eq', label: 'Equals', type: 'text' },
    { value: '$ne', label: 'Not Equals', type: 'text' },
    { value: '$regex', label: 'Contains (Regex)', type: 'text' },
    { value: '$options', label: 'Regex Options', type: 'text' },
    { value: '$exists', label: 'Exists', type: 'boolean' },
    { value: '$in', label: 'In Array', type: 'array' }
  ],
  number: [
    { value: '$eq', label: 'Equals', type: 'number' },
    { value: '$ne', label: 'Not Equals', type: 'number' },
    { value: '$gt', label: 'Greater Than', type: 'number' },
    { value: '$gte', label: 'Greater Than or Equal', type: 'number' },
    { value: '$lt', label: 'Less Than', type: 'number' },
    { value: '$lte', label: 'Less Than or Equal', type: 'number' },
    { value: '$exists', label: 'Exists', type: 'boolean' },
    { value: '$in', label: 'In Array', type: 'array' }
  ],
  date: [
    { value: '$eq', label: 'Equals', type: 'date' },
    { value: '$ne', label: 'Not Equals', type: 'date' },
    { value: '$gt', label: 'After', type: 'date' },
    { value: '$gte', label: 'After or Equal', type: 'date' },
    { value: '$lt', label: 'Before', type: 'date' },
    { value: '$lte', label: 'Before or Equal', type: 'date' },
    { value: '$exists', label: 'Exists', type: 'boolean' }
  ],
  boolean: [
    { value: '$eq', label: 'Equals', type: 'boolean' },
    { value: '$ne', label: 'Not Equals', type: 'boolean' },
    { value: '$exists', label: 'Exists', type: 'boolean' }
  ],
  object: [
    { value: '$exists', label: 'Exists', type: 'boolean' },
    { value: '$ne', label: 'Not Equals', type: 'object' },
    { value: '$size', label: 'Array Size', type: 'number' }
  ]
};

export default function VisualQueryBuilder({
  isOpen,
  onClose,
  onExecuteQuery,
  onSaveQuery,
  availableFields,
  collectionName,
  onToast
}: VisualQueryBuilderProps) {
  const [queryGroup, setQueryGroup] = useState<QueryGroup>({
    id: 'root',
    logicalOperator: 'AND',
    isExpanded: true,
    conditions: [
      {
        id: '1',
        field: '',
        operator: '$eq',
        value: '',
        type: 'text',
        logicalOperator: 'AND'
      }
    ]
  });
  const [activeTab, setActiveTab] = useState<'builder' | 'raw' | 'preview'>('builder');
  const [rawQuery, setRawQuery] = useState('{}');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveForm, setSaveForm] = useState({ name: '', description: '' });
  const [queryName, setQueryName] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const getFieldType = (field: string): 'text' | 'number' | 'date' | 'boolean' | 'object' => {
    // Heuristic to determine field type based on name
    const lowerField = field.toLowerCase();
    
    if (lowerField.includes('date') || lowerField.includes('time') || lowerField.includes('created') || lowerField.includes('updated')) {
      return 'date';
    }
    if (lowerField.includes('count') || lowerField.includes('age') || lowerField.includes('size') || lowerField.includes('id')) {
      return 'number';
    }
    if (lowerField.includes('is') || lowerField.includes('active') || lowerField.includes('enabled') || lowerField.includes('verified')) {
      return 'boolean';
    }
    if (lowerField.includes('array') || lowerField.includes('list') || lowerField.includes('tags')) {
      return 'object';
    }
    
    return 'text';
  };

  const addCondition = (groupId: string) => {
    setQueryGroup(prev => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        {
          id: Date.now().toString(),
          field: '',
          operator: '$eq',
          value: '',
          type: 'text',
          valueType: 'string',
          logicalOperator: 'AND'
        }
      ]
    }));
  };

  const removeCondition = (conditionId: string) => {
    setQueryGroup(prev => ({
      ...prev,
      conditions: prev.conditions.filter(c => c.id !== conditionId)
    }));
  };

  const updateCondition = (conditionId: string, updates: Partial<QueryCondition>) => {
    setQueryGroup(prev => ({
      ...prev,
      conditions: prev.conditions.map(c => 
        c.id === conditionId ? { ...c, ...updates } : c
      )
    }));
  };

  const updateGroupLogicalOperator = (operator: 'AND' | 'OR') => {
    setQueryGroup(prev => ({ ...prev, logicalOperator: operator }));
  };

  const buildMongoQuery = (): any => {
    const validConditions = queryGroup.conditions.filter(c => c.field && c.operator);
    
    if (validConditions.length === 0) {
      return {};
    }

    if (validConditions.length === 1) {
      const condition = validConditions[0];
      const fieldType = getFieldType(condition.field);
      
      if (condition.operator === '$exists') {
        return { [condition.field]: { $exists: condition.value === 'true' } };
      }
      
      if (['$gt', '$gte', '$lt', '$lte'].includes(condition.operator)) {
        let value = condition.value;
        // Use valueType for type conversion, fallback to fieldType
        if (condition.valueType === 'date' || (condition.valueType !== 'number' && fieldType === 'date')) {
          value = new Date(condition.value);
        } else if (condition.valueType === 'number' || fieldType === 'number') {
          value = Number(condition.value);
        }
        return { [condition.field]: { [condition.operator]: value } };
      }
      
      if (condition.operator === '$regex') {
        const options = validConditions.find(c => c.operator === '$options')?.value || 'i';
        return { [condition.field]: { $regex: condition.value, $options: options } };
      }
      
      if (condition.operator === '$size') {
        return { [condition.field]: { $size: Number(condition.value) } };
      }
      
      // Default equality - use valueType for conversion
      let value = condition.value;
      if (condition.valueType === 'number') {
        value = Number(condition.value);
      } else if (condition.valueType === 'boolean') {
        value = condition.value === 'true';
      } else if (condition.valueType === 'date') {
        value = new Date(condition.value);
      }
      return { [condition.field]: value };
    }

    // Multiple conditions
    if (queryGroup.logicalOperator === 'OR') {
      const orConditions = validConditions.map(condition => {
        const fieldType = getFieldType(condition.field);
        
        if (condition.operator === '$exists') {
          return { [condition.field]: { $exists: condition.value === 'true' } };
        }
        
        if (['$gt', '$gte', '$lt', '$lte'].includes(condition.operator)) {
          let value = condition.value;
          // Use valueType for type conversion, fallback to fieldType
          if (condition.valueType === 'date' || (condition.valueType !== 'number' && fieldType === 'date')) {
            value = new Date(condition.value);
          } else if (condition.valueType === 'number' || fieldType === 'number') {
            value = Number(condition.value);
          }
          return { [condition.field]: { [condition.operator]: value } };
        }
        
        if (condition.operator === '$regex') {
          const options = validConditions.find(c => c.operator === '$options')?.value || 'i';
          return { [condition.field]: { $regex: condition.value, $options: options } };
        }
        
        // Default equality - use valueType for conversion
        let value = condition.value;
        if (condition.valueType === 'number') {
          value = Number(condition.value);
        } else if (condition.valueType === 'boolean') {
          value = condition.value === 'true';
        } else if (condition.valueType === 'date') {
          value = new Date(condition.value);
        }
        return { [condition.field]: value };
      });
      
      return { $or: orConditions };
    } else {
      // AND conditions
      const andConditions: any = {};
      
      validConditions.forEach(condition => {
        const fieldType = getFieldType(condition.field);
        
        if (condition.operator === '$exists') {
          andConditions[condition.field] = { $exists: condition.value === 'true' };
        } else if (['$gt', '$gte', '$lt', '$lte'].includes(condition.operator)) {
          let value = condition.value;
          // Use valueType for type conversion, fallback to fieldType
          if (condition.valueType === 'date' || (condition.valueType !== 'number' && fieldType === 'date')) {
            value = new Date(condition.value);
          } else if (condition.valueType === 'number' || fieldType === 'number') {
            value = Number(condition.value);
          }
          andConditions[condition.field] = { [condition.operator]: value };
        } else if (condition.operator === '$regex') {
          const options = validConditions.find(c => c.operator === '$options')?.value || 'i';
          andConditions[condition.field] = { $regex: condition.value, $options: options };
        } else if (condition.operator === '$size') {
          andConditions[condition.field] = { $size: Number(condition.value) };
        } else {
          // Default equality - use valueType for conversion
          let value = condition.value;
          if (condition.valueType === 'number') {
            value = Number(condition.value);
          } else if (condition.valueType === 'boolean') {
            value = condition.value === 'true';
          } else if (condition.valueType === 'date') {
            value = new Date(condition.value);
          }
          andConditions[condition.field] = value;
        }
      });
      
      return andConditions;
    }
  };

  const handleExecuteQuery = () => {
    const query = activeTab === 'raw' ? (() => {
      try {
        return JSON.parse(rawQuery);
      } catch (e) {
        onToast('Invalid JSON in raw query', 'error');
        return {};
      }
    })() : buildMongoQuery();
    onExecuteQuery(query);
    onToast('Query executed successfully', 'success');
    onClose();
  };

  const handleSaveQuery = () => {
    if (!saveForm.name.trim()) return;
    
    const query = activeTab === 'raw' ? (() => {
      try {
        return JSON.parse(rawQuery);
      } catch (e) {
        onToast('Invalid JSON in raw query', 'error');
        return {};
      }
    })() : buildMongoQuery();
    onSaveQuery(saveForm.name, query);
    onToast(`Query "${saveForm.name}" saved successfully`, 'success');
    setShowSaveModal(false);
    setSaveForm({ name: '', description: '' });
  };

  const handleReset = () => {
    setQueryGroup({
      id: 'root',
      logicalOperator: 'AND',
      isExpanded: true,
      conditions: [
        {
          id: '1',
          field: '',
          operator: '$eq',
          value: '',
          type: 'text',
          valueType: 'string',
          logicalOperator: 'AND'
        }
      ]
    });
    setRawQuery('{}');
    setQueryName('');
  };

  const renderCondition = (condition: QueryCondition, index: number) => {
    const fieldType = getFieldType(condition.field);
    const availableOperators = OPERATORS[fieldType] || OPERATORS.text;
    
    return (
      <div key={condition.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <GripVertical className="w-4 h-4 text-gray-400" />
        
        {index > 0 && (
          <select
            value={condition.logicalOperator}
            onChange={(e) => updateCondition(condition.id, { logicalOperator: e.target.value as 'AND' | 'OR' })}
            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded text-gray-900 dark:text-gray-100"
          >
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </select>
        )}
        
        <select
          value={condition.field}
          onChange={(e) => updateCondition(condition.id, { 
            field: e.target.value, 
            type: getFieldType(e.target.value),
            value: '' // Reset value when field changes
          })}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded text-gray-900 dark:text-gray-100"
        >
          <option value="">Select field</option>
          {availableFields.map(field => (
            <option key={field} value={field}>{field}</option>
          ))}
        </select>
        
        <select
          value={condition.operator}
          onChange={(e) => updateCondition(condition.id, { operator: e.target.value })}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded text-gray-900 dark:text-gray-100"
        >
          {availableOperators.map(op => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>
        
        {condition.operator === '$exists' ? (
          <select
            value={condition.value.toString()}
            onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded text-gray-900 dark:text-gray-100"
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        ) : ['$isEmpty', '$isNotEmpty', '$isNull', '$isNotNull'].includes(condition.operator) ? (
          <div className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded flex items-center">
            <Info className="w-3 h-3 mr-2" />
            No value needed
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={condition.valueType || 'string'}
              onChange={(e) => updateCondition(condition.id, { valueType: e.target.value as 'string' | 'number' | 'boolean' | 'date' | 'object' })}
              className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded text-gray-900 dark:text-gray-100"
              title="Value type"
            >
              <option value="string">text</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
              <option value="date">date</option>
              <option value="object">object</option>
            </select>
            
            {condition.valueType === 'date' ? (
              <input
                type="datetime-local"
                value={condition.value}
                onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded text-gray-900 dark:text-gray-100"
              />
            ) : condition.valueType === 'number' ? (
              <input
                type="number"
                value={condition.value}
                onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded text-gray-900 dark:text-gray-100"
              />
            ) : condition.valueType === 'boolean' ? (
              <select
                value={condition.value.toString()}
                onChange={(e) => updateCondition(condition.id, { value: e.target.value === 'true' })}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded text-gray-900 dark:text-gray-100"
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <input
                type="text"
                value={condition.value}
                onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                placeholder="Enter value"
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded text-gray-900 dark:text-gray-100"
              />
            )}
          </div>
        )}
        
        <button
          onClick={() => removeCondition(condition.id)}
          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded transition"
          title="Remove condition"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>
    );
  };

  if (!isOpen) return null;

  const currentQuery = activeTab === 'raw' ? (() => {
    try {
      const parsed = JSON.parse(rawQuery);
      return parsed;
    } catch (e) {
      return {};
    }
  })() : buildMongoQuery();

  const hasValidConditions = activeTab === 'raw' ? (() => {
    try {
      const parsed = JSON.parse(rawQuery);
      return parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0;
    } catch (e) {
      return false;
    }
  })() : queryGroup.conditions.some(c => c.field && c.operator);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-[#161b22] rounded-lg shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center">
              <Calculator className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Visual Query Builder</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Collection: <span className="font-medium">{collectionName}</span>
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
            { id: 'builder', label: 'Visual Builder', icon: Settings },
            { id: 'raw', label: 'Raw JSON', icon: Type },
            { id: 'preview', label: 'Query Preview', icon: Eye }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'builder' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Group Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQueryGroup(prev => ({ ...prev, isExpanded: !prev.isExpanded }))}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    >
                      {queryGroup.isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Query Conditions
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded p-0.5">
                      <button
                        onClick={() => updateGroupLogicalOperator('AND')}
                        className={`px-3 py-1 text-sm rounded ${
                          queryGroup.logicalOperator === 'AND'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        AND
                      </button>
                      <button
                        onClick={() => updateGroupLogicalOperator('OR')}
                        className={`px-3 py-1 text-sm rounded ${
                          queryGroup.logicalOperator === 'OR'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        OR
                      </button>
                    </div>
                    
                    <button
                      onClick={() => addCondition(queryGroup.id)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-4 h-4" />
                      Add Condition
                    </button>
                  </div>
                </div>

                {/* Conditions List */}
                <AnimatePresence>
                  {queryGroup.isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      {queryGroup.conditions.map((condition, index) => renderCondition(condition, index))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Help Tip */}
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-blue-800 dark:text-blue-200 font-medium mb-1">Value Type Guide</p>
                      <p className="text-blue-700 dark:text-blue-300">
                        Use the type selector to control how values are stored: 
                        <span className="font-mono bg-blue-100 dark:bg-blue-800 px-1 rounded">1000</span> (number) vs 
                        <span className="font-mono bg-blue-100 dark:bg-blue-800 px-1 rounded">"1000"</span> (string)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Add Templates */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Quick Templates</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { name: 'All Documents', query: {} },
                      { name: 'Recent (7 days)', query: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
                      { name: 'Has Email', query: { email: { $exists: true } } },
                      { name: 'Active Status', query: { status: { $regex: 'active', $options: 'i' } } }
                    ].map((template) => (
                      <button
                        key={template.name}
                        onClick={() => {
                          // Convert template to conditions
                          setQueryGroup({
                            id: 'root',
                            logicalOperator: 'AND',
                            isExpanded: true,
                            conditions: Object.entries(template.query).map(([field, value], index) => {
                              // Determine value type based on the actual value
                              const actualValue = typeof value === 'object' && value !== null ? Object.values(value)[0] : value;
                              let valueType: 'string' | 'number' | 'boolean' | 'date' | 'object' = 'string';
                              if (actualValue !== null && actualValue !== undefined) {
                                if (actualValue instanceof Date) {
                                  valueType = 'date';
                                } else if (typeof actualValue === 'number') {
                                  valueType = 'number';
                                } else if (typeof actualValue === 'boolean') {
                                  valueType = 'boolean';
                                } else if (typeof actualValue === 'object') {
                                  valueType = 'object';
                                }
                              }
                              
                              return {
                                id: `tpl-${index}`,
                                field,
                                operator: typeof value === 'object' && value !== null ? Object.keys(value)[0] : '$eq',
                                value: actualValue,
                                type: getFieldType(field),
                                valueType,
                                logicalOperator: index === 0 ? 'AND' : 'AND'
                              };
                            })
                          });
                        }}
                        className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded transition text-left"
                      >
                        {template.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'raw' && (
            <div className="flex-1 p-6">
              <div className="max-w-4xl mx-auto h-full flex flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Raw MongoDB Query (JSON)</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Edit the query directly in JSON format. This will be used when executing the query.
                  </p>
                </div>
                <textarea
                  value={rawQuery}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setRawQuery(newValue);
                    try {
                      JSON.parse(newValue);
                      setJsonError(null);
                    } catch (e) {
                      setJsonError(e instanceof Error ? e.message : 'Invalid JSON');
                    }
                  }}
                  placeholder="Enter MongoDB query as JSON..."
                  className="flex-1 w-full p-4 border border-gray-300 dark:border-gray-700 bg-gray-900 text-gray-100 font-mono text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {jsonError && (
                  <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm">
                    JSON Error: {jsonError}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="flex-1 p-6">
              <div className="max-w-4xl mx-auto h-full flex flex-col">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Query Preview</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      This is the MongoDB query that will be executed.
                      {activeTab === 'raw' && ' Showing query from Raw JSON tab.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasValidConditions ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    )}
                    <span className={`text-sm font-medium ${hasValidConditions ? 'text-green-600' : 'text-amber-600'}`}>
                      {hasValidConditions ? 'Valid Query' : 'Incomplete Query'}
                    </span>
                  </div>
                </div>
                <div className="flex-1 bg-gray-900 text-gray-100 font-mono text-sm p-4 rounded-lg overflow-auto">
                  {activeTab === 'raw' ? (
                    <pre>{rawQuery}</pre>
                  ) : (
                    <pre>{JSON.stringify(currentQuery, null, 2)}</pre>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={() => setShowSaveModal(true)}
              disabled={!hasValidConditions}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Query
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteQuery}
              disabled={!hasValidConditions}
              className="px-6 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition flex items-center gap-2 font-medium"
            >
              <Play className="w-4 h-4" />
              Execute Query
            </button>
          </div>
        </div>

        {/* Save Query Modal */}
        <AnimatePresence>
          {showSaveModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-60 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-[#161b22] rounded-lg shadow-2xl w-full max-w-md"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Save Query</h3>
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Query Name *
                    </label>
                    <input
                      type="text"
                      value={saveForm.name}
                      onChange={(e) => setSaveForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter a name for this query"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={saveForm.description}
                      onChange={(e) => setSaveForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Query Preview:</h4>
                    <pre className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                      {activeTab === 'raw' ? rawQuery : JSON.stringify(currentQuery, null, 2)}
                    </pre>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800">
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveQuery}
                    disabled={!saveForm.name.trim()}
                    className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition flex items-center gap-2 font-medium"
                  >
                    <Save className="w-4 h-4" />
                    Save Query
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}