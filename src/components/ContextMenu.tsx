import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pin,
  Star,
  Trash2,
  Copy,
  Share2,
  Edit,
  Archive,
  ArchiveRestore,
  Download,
  Eye,
  MoreVertical,
  Heart,
  BookOpen
} from 'lucide-react';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  action?: () => void;
  shortcut?: string;
  separator?: boolean;
  disabled?: boolean;
  dangerous?: boolean;
}

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ isOpen, position, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (isOpen && menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let x = position.x;
      let y = position.y;

      // Adjust horizontal position
      if (x + menuRect.width > viewportWidth) {
        x = viewportWidth - menuRect.width - 10;
      }

      // Adjust vertical position
      if (y + menuRect.height > viewportHeight) {
        y = viewportHeight - menuRect.height - 10;
      }

      // Ensure minimum margins
      x = Math.max(10, x);
      y = Math.max(10, y);

      setAdjustedPosition({ x, y });
    }
  }, [isOpen, position]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0" style={{ zIndex: 9999 }}>
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          className="absolute bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 py-2 min-w-56 overflow-hidden"
          style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
        >
          {items.map((item, index) => {
            if (item.separator) {
              return (
                <div
                  key={`separator-${index}`}
                  className="h-px bg-gray-200 dark:bg-gray-700 my-1"
                />
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.action && !item.disabled) {
                    item.action();
                    onClose();
                  }
                }}
                disabled={item.disabled}
                className={`
                  w-full flex items-center px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
                  ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  ${item.dangerous ? 'hover:bg-red-50 dark:hover:bg-red-900/20' : ''}
                `}
              >
                {item.icon && (
                  <div className={`mr-3 ${item.dangerous ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {item.icon}
                  </div>
                )}
                <span className={`flex-1 ${item.dangerous ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                  {item.label}
                </span>
                {item.shortcut && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                    {item.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Utility function to create context menu items for notes
export function createNoteContextMenuItems(
  note: any,
  {
    onPin,
    onFavorite,
    onEdit,
    onDelete,
    onDuplicate,
    onArchive,
    onShare,
    onCopyLink,
    onExport
  }: {
    onPin?: () => void;
    onFavorite?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onDuplicate?: () => void;
    onArchive?: () => void;
    onShare?: () => void;
    onCopyLink?: () => void;
    onExport?: () => void;
  }
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [];

  // Pin/Unpin
  items.push({
    id: 'pin',
    label: note.isPinned ? 'Unpin' : 'Pin',
    icon: <Pin className="w-4 h-4" />,
    action: onPin,
    shortcut: 'P'
  });

  // Favorite/Unfavorite
  items.push({
    id: 'favorite',
    label: note.isFavorite ? 'Remove from favorites' : 'Add to favorites',
    icon: <Star className="w-4 h-4" />,
    action: onFavorite,
    shortcut: 'F'
  });

  items.push({ id: 'separator-1', separator: true });

  // Edit
  items.push({
    id: 'edit',
    label: 'Edit',
    icon: <Edit className="w-4 h-4" />,
    action: onEdit,
    shortcut: 'E'
  });

  // Archive/Unarchive
  items.push({
    id: 'archive',
    label: note.status === 'archived' ? 'Unarchive' : 'Archive',
    icon: note.status === 'archived' ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />,
    action: onArchive
  });

  items.push({ id: 'separator-2', separator: true });

  // Duplicate
  items.push({
    id: 'duplicate',
    label: 'Duplicate',
    icon: <Copy className="w-4 h-4" />,
    action: onDuplicate,
    shortcut: 'D'
  });

  // Share
  items.push({
    id: 'share',
    label: 'Share',
    icon: <Share2 className="w-4 h-4" />,
    action: onShare
  });

  // Copy Link
  items.push({
    id: 'copy-link',
    label: 'Copy link',
    icon: <BookOpen className="w-4 h-4" />,
    action: onCopyLink,
    shortcut: 'L'
  });

  items.push({ id: 'separator-3', separator: true });

  // Export
  items.push({
    id: 'export',
    label: 'Export',
    icon: <Download className="w-4 h-4" />,
    action: onExport
  });

  items.push({ id: 'separator-4', separator: true });

  // Delete
  items.push({
    id: 'delete',
    label: 'Delete',
    icon: <Trash2 className="w-4 h-4" />,
    action: onDelete,
    dangerous: true,
    shortcut: '⌫'
  });

  return items;
}