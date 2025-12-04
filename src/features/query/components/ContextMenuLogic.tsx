import { useEffect, useRef } from 'react';

interface ContextMenuLogicProps {
  contextMenu: {
    x: number;
    y: number;
    rowIndex: number;
    columnName: string | null;
    cellValue?: any;
  } | null;
  setContextMenu: (contextMenu: any) => void;
}

export function useContextMenuLogic({ contextMenu, setContextMenu }: ContextMenuLogicProps) {
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const contextMenuColumnRef = useRef<string | null>(null);
  const contextMenuCellValueRef = useRef<any>(null);

  // Adjust context menu position to prevent overflow
  useEffect(() => {
    if (contextMenu && contextMenuRef.current) {
      const menu = contextMenuRef.current;
      const menuRect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let { x, y } = contextMenu;

      // Check if menu overflows right edge
      if (x + menuRect.width > viewportWidth) {
        x = viewportWidth - menuRect.width - 10;
      }

      // Check if menu overflows bottom edge
      if (y + menuRect.height > viewportHeight) {
        y = viewportHeight - menuRect.height - 10;
      }

      // Ensure menu doesn't go off left/top edges
      x = Math.max(10, x);
      y = Math.max(10, y);

      // Update position if changed
      if (x !== contextMenu.x || y !== contextMenu.y) {
        setContextMenu((prev) => (prev ? { ...prev, x, y } : null));
      }
    }
  }, [contextMenu, setContextMenu]);

  // Close context menu when clicking outside
  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
        contextMenuColumnRef.current = null;
        contextMenuCellValueRef.current = null;
      }
    };

    // Add listener after a small delay to prevent immediate close from the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu, setContextMenu]);

  return {
    contextMenuRef,
    contextMenuColumnRef,
    contextMenuCellValueRef,
  };
}