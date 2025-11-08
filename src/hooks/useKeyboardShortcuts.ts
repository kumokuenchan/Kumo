import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const { key, ctrlKey, metaKey, shiftKey, altKey, action } = shortcut;
        
        if (
          event.key.toLowerCase() === key.toLowerCase() &&
          (ctrlKey === undefined || event.ctrlKey === ctrlKey) &&
          (metaKey === undefined || event.metaKey === metaKey) &&
          (shiftKey === undefined || event.shiftKey === shiftKey) &&
          (altKey === undefined || event.altKey === altKey)
        ) {
          event.preventDefault();
          event.stopPropagation();
          action();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
}

export function useShortcutsHelp(shortcuts: KeyboardShortcut[]) {
  return shortcuts.map(shortcut => ({
    key: shortcut.key,
    ctrlKey: shortcut.ctrlKey,
    metaKey: shortcut.metaKey,
    shiftKey: shortcut.shiftKey,
    altKey: shortcut.altKey,
    description: shortcut.description
  }));
}