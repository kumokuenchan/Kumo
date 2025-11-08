import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Replace,
  Copy,
  AlertTriangle,
  CheckCircle,
  Info,
  Filter,
  RefreshCw,
  Download,
  Upload,
  FileText,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Zap,
  Target,
  Shield
} from 'lucide-react';

interface DataOperationsProps {
  isOpen: boolean;
  onClose: () => void;
  documents: any[];
  onUpdateDocuments: (updates: any[]) => Promise<void>;
  onDeleteDuplicates: (duplicateIds: string[]) => Promise<void>;
  collectionName: string;
  onToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface FindReplaceOperation {
  field: string;
  findValue: string;
  replaceValue: string;
  useRegex: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
}

interface DuplicateGroup {
  id: string;
  documents: any[];
  duplicateFields: string[];
  score: number;
}

export default function DataOperations({
  isOpen,
  onClose,
  documents,
  onUpdateDocuments,
  onDeleteDuplicates,
  collectionName,
  onToast
}: DataOperationsProps) {
  const [activeTab, setActiveTab] = useState<'find-replace' | 'duplicates' | 'validation' | 'cleaning'>('find-replace');
  const [findReplaceConfig, setFindReplaceConfig] = useState<FindReplaceOperation>({
    field: '',
    findValue: '',
    replaceValue: '',
    useRegex: false,
    caseSensitive: false,
    wholeWord: false
  });
  const [previewMode, setPreviewMode] = useState(false);
  const [previewResults, setPreviewResults] = useState<any[]>([]);
  const [duplicateThreshold, setDuplicateThreshold] = useState(0.8);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [selectedDuplicates, setSelectedDuplicates] = useState<Set<string>>(new Set());
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [expandedDuplicates, setExpandedDuplicates] = useState<Set<string>>(new Set());

  // Get available fields from documents
  const getAvailableFields = () => {
    if (documents.length === 0) return [];
    const allFields = new Set<string>();
    documents.forEach(doc => {
      Object.keys(doc).forEach(key => allFields.add(key));
    });
    return Array.from(allFields).sort();
  };

  // Find and Replace Preview
  const handlePreview = () => {
    if (!findReplaceConfig.field || !findReplaceConfig.findValue) {
      onToast('Please specify field and search value', 'error');
      return;
    }

    const results = documents.filter(doc => {
      const fieldValue = doc[findReplaceConfig.field];
      if (fieldValue === undefined || fieldValue === null) return false;

      let searchIn = fieldValue.toString();
      let findPattern = findReplaceConfig.findValue;

      if (findReplaceConfig.useRegex) {
        try {
          const flags = findReplaceConfig.caseSensitive ? 'g' : 'gi';
          const regex = new RegExp(findPattern, flags);
          return regex.test(searchIn);
        } catch (error) {
          onToast('Invalid regex pattern', 'error');
          return false;
        }
      } else {
        if (findReplaceConfig.wholeWord) {
          const flags = findReplaceConfig.caseSensitive ? 'g' : 'gi';
          const regex = new RegExp(`\\b${findPattern}\\b`, flags);
          return regex.test(searchIn);
        } else {
          return findReplaceConfig.caseSensitive 
            ? searchIn.includes(findPattern)
            : searchIn.toLowerCase().includes(findPattern.toLowerCase());
        }
      }
    });

    setPreviewResults(results);
    setPreviewMode(true);
    onToast(`Found ${results.length} matching documents`, 'info');
  };

  // Execute Find and Replace
  const handleFindReplace = async () => {
    if (previewResults.length === 0) {
      onToast('No documents to update. Run preview first.', 'error');
      return;
    }

    try {
      const updates = previewResults.map(doc => {
        let newValue = doc[findReplaceConfig.field];
        let searchIn = newValue.toString();
        let findPattern = findReplaceConfig.findValue;
        let replaceWith = findReplaceConfig.replaceValue;

        if (findReplaceConfig.useRegex) {
          const flags = findReplaceConfig.caseSensitive ? 'g' : 'gi';
          const regex = new RegExp(findPattern, flags);
          newValue = searchIn.replace(regex, replaceWith);
        } else {
          if (findReplaceConfig.wholeWord) {
            const flags = findReplaceConfig.caseSensitive ? 'g' : 'gi';
            const regex = new RegExp(`\\b${findPattern}\\b`, flags);
            newValue = searchIn.replace(regex, replaceWith);
          } else {
            if (findReplaceConfig.caseSensitive) {
              newValue = searchIn.replace(new RegExp(findPattern, 'g'), replaceWith);
            } else {
              newValue = searchIn.replace(new RegExp(findPattern, 'gi'), replaceWith);
            }
          }
        }

        return {
          _id: doc._id,
          [findReplaceConfig.field]: newValue
        };
      });

      await onUpdateDocuments(updates);
      setPreviewMode(false);
      setPreviewResults([]);
      onToast(`Successfully updated ${updates.length} documents`, 'success');
    } catch (error) {
      console.error('Find and replace failed:', error);
      onToast('Find and replace operation failed', 'error');
    }
  };

  // Duplicate Detection
  const handleDuplicateDetection = () => {
    if (selectedFields.length === 0) {
      onToast('Please select fields to check for duplicates', 'error');
      return;
    }

    const fieldMap = new Map<string, any[]>();
    
    documents.forEach(doc => {
      const key = selectedFields.map(field => doc[field]).join('|');
      if (!fieldMap.has(key)) {
        fieldMap.set(key, []);
      }
      fieldMap.get(key)!.push(doc);
    });

    const groups: DuplicateGroup[] = [];
    fieldMap.forEach((docs, key) => {
      if (docs.length > 1) {
        // Calculate similarity score between documents
        const avgScore = docs.reduce((sum, doc, index) => {
          let matches = 0;
          for (let i = 0; i < docs.length; i++) {
            if (i !== index) {
              matches += calculateSimilarity(doc, docs[i]);
            }
          }
          return sum + (matches / (docs.length - 1));
        }, 0) / docs.length;

        groups.push({
          id: key,
          documents: docs,
          duplicateFields: selectedFields,
          score: avgScore
        });
      }
    });

    setDuplicateGroups(groups.filter(group => group.score >= duplicateThreshold));
    onToast(`Found ${groups.length} potential duplicate groups`, 'info');
  };

  // Calculate similarity between two documents
  const calculateSimilarity = (doc1: any, doc2: any): number => {
    const fields1 = Object.keys(doc1);
    const fields2 = Object.keys(doc2);
    const commonFields = fields1.filter(field => fields2.includes(field));
    
    if (commonFields.length === 0) return 0;

    let matches = 0;
    commonFields.forEach(field => {
      if (JSON.stringify(doc1[field]) === JSON.stringify(doc2[field])) {
        matches++;
      }
    });

    return matches / commonFields.length;
  };

  // Data Validation
  const handleDataValidation = () => {
    const results: any[] = [];
    
    documents.forEach((doc, index) => {
      const issues: string[] = [];
      
      // Check for empty required fields
      const requiredFields = ['_id', ...selectedFields];
      requiredFields.forEach(field => {
        if (doc[field] === undefined || doc[field] === null || doc[field] === '') {
          issues.push(`Missing required field: ${field}`);
        }
      });

      // Check for invalid email formats
      Object.keys(doc).forEach(key => {
        if (key.toLowerCase().includes('email') && doc[key]) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(doc[key])) {
            issues.push(`Invalid email format in ${key}`);
          }
        }
      });

      // Check for invalid date formats
      Object.keys(doc).forEach(key => {
        if (key.toLowerCase().includes('date') && doc[key]) {
          const date = new Date(doc[key]);
          if (isNaN(date.getTime())) {
            issues.push(`Invalid date format in ${key}`);
          }
        }
      });

      if (issues.length > 0) {
        results.push({
          documentIndex: index,
          documentId: doc._id,
          issues
        });
      }
    });

    setValidationResults(results);
    onToast(`Found ${results.length} documents with validation issues`, 'info');
  };

  // Data Cleaning
  const handleDataCleaning = () => {
    const cleaningTasks = [
      'Remove empty fields',
      'Trim whitespace',
      'Normalize case',
      'Convert data types',
      'Remove duplicates'
    ];

    onToast(`Data cleaning features coming soon! Available: ${cleaningTasks.join(', ')}`, 'info');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-[#161b22] rounded-lg shadow-2xl w-full max-w-6xl max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
              <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Data Operations</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Collection: <span className="font-medium">{collectionName}</span> • {documents.length} documents
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
            { id: 'find-replace', label: 'Find & Replace', icon: Search },
            { id: 'duplicates', label: 'Duplicate Detection', icon: Copy },
            { id: 'validation', label: 'Data Validation', icon: Shield },
            { id: 'cleaning', label: 'Data Cleaning', icon: RefreshCw }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400'
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
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'find-replace' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Find & Replace Configuration</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Field to Search
                    </label>
                    <select
                      value={findReplaceConfig.field}
                      onChange={(e) => setFindReplaceConfig(prev => ({ ...prev, field: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Select a field</option>
                      {getAvailableFields().map(field => (
                        <option key={field} value={field}>{field}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Find Value
                    </label>
                    <input
                      type="text"
                      value={findReplaceConfig.findValue}
                      onChange={(e) => setFindReplaceConfig(prev => ({ ...prev, findValue: e.target.value }))}
                      placeholder="Enter value to find"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Replace With
                    </label>
                    <input
                      type="text"
                      value={findReplaceConfig.replaceValue}
                      onChange={(e) => setFindReplaceConfig(prev => ({ ...prev, replaceValue: e.target.value }))}
                      placeholder="Enter replacement value"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="useRegex"
                        checked={findReplaceConfig.useRegex}
                        onChange={(e) => setFindReplaceConfig(prev => ({ ...prev, useRegex: e.target.checked }))}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                      <label htmlFor="useRegex" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Use Regular Expression
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="caseSensitive"
                        checked={findReplaceConfig.caseSensitive}
                        onChange={(e) => setFindReplaceConfig(prev => ({ ...prev, caseSensitive: e.target.checked }))}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                      <label htmlFor="caseSensitive" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Case Sensitive
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="wholeWord"
                        checked={findReplaceConfig.wholeWord}
                        onChange={(e) => setFindReplaceConfig(prev => ({ ...prev, wholeWord: e.target.checked }))}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                      <label htmlFor="wholeWord" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Match Whole Word
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handlePreview}
                      disabled={!findReplaceConfig.field || !findReplaceConfig.findValue}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition font-medium"
                    >
                      <Eye className="w-4 h-4 inline mr-2" />
                      Preview
                    </button>
                    <button
                      onClick={handleFindReplace}
                      disabled={!previewMode || previewResults.length === 0}
                      className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition font-medium"
                    >
                      <Replace className="w-4 h-4 inline mr-2" />
                      Replace All
                    </button>
                  </div>
                </div>

                {/* Results */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {previewMode ? 'Preview Results' : 'How it works'}
                    </h3>
                    {previewMode && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {previewResults.length} documents found
                      </span>
                    )}
                  </div>

                  {previewMode ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {previewResults.map((doc, index) => (
                        <div
                          key={doc._id || index}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800"
                        >
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                            Document {index + 1}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                            <strong>{findReplaceConfig.field}:</strong>{' '}
                            <span className="text-red-600 dark:text-red-400">
                              {String(doc[findReplaceConfig.field])}
                            </span>
                            {' → '}
                            <span className="text-green-600 dark:text-green-400">
                              {String(doc[findReplaceConfig.field]).replace(
                                findReplaceConfig.findValue,
                                findReplaceConfig.replaceValue
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">How Find & Replace Works</h4>
                            <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                              <li>1. Select the field to search in</li>
                              <li>2. Enter the value to find</li>
                              <li>3. Enter the replacement value</li>
                              <li>4. Preview changes before applying</li>
                              <li>5. Execute the replacement</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'duplicates' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Duplicate Detection Settings</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Fields to Check for Duplicates
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-900">
                      {getAvailableFields().map(field => (
                        <div key={field} className="flex items-center">
                          <input
                            type="checkbox"
                            id={field}
                            checked={selectedFields.includes(field)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFields(prev => [...prev, field]);
                              } else {
                                setSelectedFields(prev => prev.filter(f => f !== field));
                              }
                            }}
                            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                          />
                          <label htmlFor={field} className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            {field}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Similarity Threshold: {Math.round(duplicateThreshold * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={duplicateThreshold}
                      onChange={(e) => setDuplicateThreshold(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>Loose match</span>
                      <span>Exact match</span>
                    </div>
                  </div>

                  <button
                    onClick={handleDuplicateDetection}
                    disabled={selectedFields.length === 0}
                    className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition font-medium"
                  >
                    <Search className="w-4 h-4 inline mr-2" />
                    Detect Duplicates
                  </button>
                </div>

                {/* Results */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Duplicate Groups ({duplicateGroups.length})
                  </h3>

                  {duplicateGroups.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Copy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No duplicates found yet.</p>
                      <p className="text-sm">Select fields and run detection to find duplicates.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {duplicateGroups.map((group, groupIndex) => (
                        <div
                          key={group.id}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(expandedDuplicates);
                                  if (newExpanded.has(group.id)) {
                                    newExpanded.delete(group.id);
                                  } else {
                                    newExpanded.add(group.id);
                                  }
                                  setExpandedDuplicates(newExpanded);
                                }}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                              >
                                {expandedDuplicates.has(group.id) ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                Group {groupIndex + 1} • {group.documents.length} documents
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                ({Math.round(group.score * 100)}% match)
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={group.documents.every(doc => selectedDuplicates.has(doc._id?.toString() || ''))}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const newSelected = new Set(selectedDuplicates);
                                    group.documents.forEach(doc => {
                                      if (doc._id) newSelected.add(doc._id.toString());
                                    });
                                    setSelectedDuplicates(newSelected);
                                  } else {
                                    const newSelected = new Set(selectedDuplicates);
                                    group.documents.forEach(doc => {
                                      if (doc._id) newSelected.delete(doc._id.toString());
                                    });
                                    setSelectedDuplicates(newSelected);
                                  }
                                }}
                                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                              />
                            </div>
                          </div>

                          {expandedDuplicates.has(group.id) && (
                            <div className="space-y-2">
                              {group.documents.map((doc, docIndex) => (
                                <div
                                  key={doc._id || docIndex}
                                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={selectedDuplicates.has(doc._id?.toString() || '')}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedDuplicates(prev => new Set([...prev, doc._id?.toString() || '']));
                                        } else {
                                          setSelectedDuplicates(prev => {
                                            const newSet = new Set(prev);
                                            newSet.delete(doc._id?.toString() || '');
                                            return newSet;
                                          });
                                        }
                                      }}
                                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                    />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                      Document {docIndex + 1}: {doc._id}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {group.duplicateFields.map(field => `${field}: ${doc[field]}`).join(', ')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedDuplicates.size > 0 && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onDeleteDuplicates(Array.from(selectedDuplicates))}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
                      >
                        <Trash2 className="w-4 h-4 inline mr-2" />
                        Delete {selectedDuplicates.size} Selected
                      </button>
                      <button
                        onClick={() => setSelectedDuplicates(new Set())}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                      >
                        Clear Selection
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'validation' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Data Validation</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Check your data for common issues and validation errors.
                  </p>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Validation Checks</h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• Required field validation</li>
                      <li>• Email format validation</li>
                      <li>• Date format validation</li>
                      <li>• Data type consistency</li>
                      <li>• Null/empty value detection</li>
                    </ul>
                  </div>

                  <button
                    onClick={handleDataValidation}
                    className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition font-medium"
                  >
                    <Shield className="w-4 h-4 inline mr-2" />
                    Run Validation
                  </button>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Validation Results ({validationResults.length})
                  </h3>

                  {validationResults.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No validation results yet.</p>
                      <p className="text-sm">Click "Run Validation" to check your data.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {validationResults.map((result, index) => (
                        <div
                          key={index}
                          className="border border-red-200 dark:border-red-800 rounded-lg p-3 bg-red-50 dark:bg-red-900/20"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            <span className="text-sm font-medium text-red-800 dark:text-red-300">
                              Document {result.documentIndex + 1} (ID: {result.documentId})
                            </span>
                          </div>
                          <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                            {result.issues.map((issue: string, issueIndex: number) => (
                              <li key={issueIndex}>• {issue}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cleaning' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <RefreshCw className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Data Cleaning Tools</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Advanced data cleaning features will be available soon.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                  {[
                    { title: 'Trim Whitespace', description: 'Remove leading/trailing spaces', icon: '✂️' },
                    { title: 'Normalize Case', description: 'Convert to uppercase/lowercase', icon: '🔤' },
                    { title: 'Convert Types', description: 'Change data types safely', icon: '🔄' },
                    { title: 'Remove Empty Fields', description: 'Delete null/empty fields', icon: '🗑️' },
                    { title: 'Format Dates', description: 'Standardize date formats', icon: '📅' },
                    { title: 'Remove Duplicates', description: 'Clean up duplicate entries', icon: '🔍' }
                  ].map((tool, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
                      onClick={() => handleDataCleaning()}
                    >
                      <div className="text-2xl mb-2">{tool.icon}</div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">{tool.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{tool.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}