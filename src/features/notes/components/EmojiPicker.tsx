import React, { useState, useRef, useEffect } from 'react';
import EmojiPickerReact, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  buttonClassName?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function EmojiPicker({
  onEmojiSelect,
  buttonClassName = '',
  position = 'bottom'
}: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setIsOpen(false);
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full mb-2 left-0';
      case 'left':
        return 'right-full mr-2 top-0';
      case 'right':
        return 'left-full ml-2 top-0';
      case 'bottom':
      default:
        return 'top-full mt-2 left-0';
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ${buttonClassName}`}
        title="Add emoji"
        type="button"
      >
        <Smile className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={pickerRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className={`absolute z-50 ${getPositionClasses()}`}
          >
            <div className="shadow-2xl rounded-lg overflow-hidden">
              <EmojiPickerReact
                onEmojiClick={handleEmojiClick}
                theme={Theme.AUTO}
                searchPlaceHolder="Search emoji..."
                width={350}
                height={400}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Simple emoji selector with common emojis (lighter weight alternative)
interface QuickEmojiSelectorProps {
  onEmojiSelect: (emoji: string) => void;
  className?: string;
}

export function QuickEmojiSelector({ onEmojiSelect, className = '' }: QuickEmojiSelectorProps) {
  const commonEmojis = [
    '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂',
    '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋',
    '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳',
    '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
    '🔥', '⭐', '✨', '💡', '💯', '✅', '❌', '⚠️', '🎯', '🎉',
    '📝', '📋', '📌', '📍', '🔖', '🏷️', '💼', '📁', '📂', '🗂️',
    '❤️', '💙', '💚', '💛', '🧡', '💜', '🖤', '🤍', '🤎', '💔',
  ];

  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        title="Add emoji"
        type="button"
      >
        <Smile className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute top-full mt-2 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 z-50 w-64"
          >
            <div className="grid grid-cols-10 gap-1 max-h-48 overflow-y-auto">
              {commonEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onEmojiSelect(emoji);
                    setIsOpen(false);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-xl"
                  type="button"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
