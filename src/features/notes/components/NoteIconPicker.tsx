import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Image as ImageIcon, X, Upload } from 'lucide-react';
import { QuickEmojiSelector } from './EmojiPicker';

interface NoteIconPickerProps {
  currentIcon?: string;
  currentCover?: string;
  onIconChange: (icon: string) => void;
  onCoverChange: (cover: string) => void;
  onRemoveIcon: () => void;
  onRemoveCover: () => void;
}

export default function NoteIconPicker({
  currentIcon,
  currentCover,
  onIconChange,
  onCoverChange,
  onRemoveIcon,
  onRemoveCover
}: NoteIconPickerProps) {
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showCoverOptions, setShowCoverOptions] = useState(false);

  const coverImages = [
    'https://images.unsplash.com/photo-1557683316-973673baf926?w=800',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800',
    'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800',
    'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800',
  ];

  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  ];

  const handleCoverUrl = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      onCoverChange(url);
      setShowCoverOptions(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cover Image */}
      <div className="relative group">
        {currentCover ? (
          <div className="relative h-40 rounded-t-xl overflow-hidden">
            {currentCover.startsWith('linear-gradient') ? (
              <div className="w-full h-full" style={{ background: currentCover }} />
            ) : (
              <img
                src={currentCover}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={() => setShowCoverOptions(true)}
                className="px-3 py-1 bg-white/90 hover:bg-white text-gray-900 rounded-lg text-sm font-medium transition-colors"
              >
                Change
              </button>
              <button
                onClick={onRemoveCover}
                className="px-3 py-1 bg-red-500/90 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCoverOptions(true)}
            className="w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ImageIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Add Cover Image</span>
          </button>
        )}

        {/* Cover Options Modal */}
        <AnimatePresence>
          {showCoverOptions && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 z-20"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Choose Cover</h4>
                <button
                  onClick={() => setShowCoverOptions(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Gradients */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Gradients</p>
                  <div className="grid grid-cols-6 gap-2">
                    {gradients.map((gradient, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          onCoverChange(gradient);
                          setShowCoverOptions(false);
                        }}
                        className="w-full h-12 rounded-lg border-2 border-transparent hover:border-blue-500 transition-colors"
                        style={{ background: gradient }}
                      />
                    ))}
                  </div>
                </div>

                {/* Images */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Images</p>
                  <div className="grid grid-cols-6 gap-2">
                    {coverImages.map((url, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          onCoverChange(url);
                          setShowCoverOptions(false);
                        }}
                        className="w-full h-12 rounded-lg border-2 border-transparent hover:border-blue-500 transition-colors overflow-hidden"
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom URL */}
                <button
                  onClick={handleCoverUrl}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload from URL
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Icon Selector */}
      <div className="flex items-center gap-3">
        <div className="relative">
          {currentIcon ? (
            <div className="relative group">
              <button
                onClick={() => setShowIconPicker(true)}
                className="w-16 h-16 text-4xl rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
              >
                {currentIcon}
              </button>
              <button
                onClick={onRemoveIcon}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowIconPicker(true)}
              className="w-16 h-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-gray-400 dark:hover:border-gray-500 transition-colors flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <Smile className="w-6 h-6" />
            </button>
          )}

          {showIconPicker && (
            <div className="absolute top-0 left-full ml-2 z-30">
              <QuickEmojiSelector
                onEmojiSelect={(emoji) => {
                  onIconChange(emoji);
                  setShowIconPicker(false);
                }}
                className=""
              />
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {currentIcon ? 'Note Icon' : 'Add Icon'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Choose an emoji to represent this note
          </p>
        </div>
      </div>
    </div>
  );
}
