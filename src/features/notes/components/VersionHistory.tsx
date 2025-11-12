import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NoteVersion } from '../../../types/notes';
import { History, X, RotateCcw, Eye, User, Calendar } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface VersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  versions: NoteVersion[];
  onRestoreVersion: (versionId: string) => void;
  currentVersion: number;
}

export default function VersionHistory({
  isOpen,
  onClose,
  versions,
  onRestoreVersion,
  currentVersion
}: VersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<NoteVersion | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <History className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Version History
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {versions.length} version{versions.length > 1 ? 's' : ''} available
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex">
            {/* Versions List */}
            <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
              <div className="p-4 space-y-2">
                {sortedVersions.map((version, index) => {
                  const isCurrentVersion = version.version === currentVersion;
                  const isSelected = selectedVersion?.id === version.id;

                  return (
                    <motion.button
                      key={version.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setSelectedVersion(version)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            v{version.version}
                          </span>
                          {isCurrentVersion && (
                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <User className="w-3 h-3" />
                          <span>{version.changedByName || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>

                      {version.changes && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                          {version.changes}
                        </p>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Preview Panel */}
            <div className="flex-1 overflow-y-auto">
              {selectedVersion ? (
                <div className="p-6">
                  {/* Version Details */}
                  <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Version</span>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          v{selectedVersion.version}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Changed By</span>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {selectedVersion.changedByName || 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Date</span>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {format(new Date(selectedVersion.createdAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Time Ago</span>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatDistanceToNow(new Date(selectedVersion.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    {selectedVersion.changes && (
                      <div className="mt-4">
                        <span className="text-gray-500 dark:text-gray-400 text-sm">Changes</span>
                        <p className="text-gray-900 dark:text-gray-100 mt-1">
                          {selectedVersion.changes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      {showPreview ? 'Hide' : 'Show'} Preview
                    </button>
                    {selectedVersion.version !== currentVersion && (
                      <button
                        onClick={() => {
                          onRestoreVersion(selectedVersion.id);
                          onClose();
                        }}
                        className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Restore This Version
                      </button>
                    )}
                  </div>

                  {/* Content Preview */}
                  {showPreview && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {selectedVersion.title}
                        </h3>
                      </div>
                      <div className="p-4 bg-white dark:bg-gray-900">
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: selectedVersion.content }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Select a version to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
