import { useRef, useEffect } from 'react';
import { TreeNodeData } from './SchemaTree';

interface ContextMenuProps {
  node: TreeNodeData;
  position: { x: number; y: number };
  onClose: () => void;
  connectionId: string;
  onViewData?: (database: string, table: string) => void;
  onCreateTable?: (database: string) => void;
  onEditTable?: (database: string, table: string) => void;
  onDropTable?: (database: string, table: string) => void;
  onExportSchema?: (database: string, table?: string) => void;
  onShowCreateTable?: (database: string, table: string) => void;
  onGenerateQuery?: (database: string, table: string) => void;
}

interface MenuAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  divider?: boolean;
}

export default function ContextMenu({
  node,
  position,
  onClose,
  connectionId,
  onViewData,
  onCreateTable,
  onEditTable,
  onDropTable,
  onExportSchema,
  onShowCreateTable,
  onGenerateQuery
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const getActions = (): MenuAction[] => {
    const actions: MenuAction[] = [];

    switch (node.type) {
      case 'database':
        actions.push(
          {
            label: 'View Tables',
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            ),
            onClick: () => {
              console.log('View tables for database:', node.name);
              onClose();
            },
          },
          {
            label: 'Create Table',
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            ),
            onClick: () => {
              onCreateTable?.(node.name);
              onClose();
            },
          },
          {
            label: 'Export Schema',
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            ),
            onClick: () => {
              onExportSchema?.(node.name);
              onClose();
            },
          },
          { label: '', onClick: () => {}, divider: true },
          {
            label: 'Refresh',
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            ),
            onClick: () => {
              console.log('Refresh database:', node.name);
              onClose();
            },
          }
        );
        break;

      case 'table':
        actions.push(
          {
            label: 'View Data',
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            ),
            onClick: () => {
              if (onViewData && node.parent) {
                onViewData(node.parent, node.name);
              }
              onClose();
            },
          },
          {
            label: 'Generate SELECT Query',
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            ),
            onClick: () => {
              if (node.parent) {
                onGenerateQuery?.(node.parent, node.name);
              }
              onClose();
            },
          },
          {
            label: 'Show CREATE TABLE',
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            ),
            onClick: () => {
              if (node.parent) {
                onShowCreateTable?.(node.parent, node.name);
              }
              onClose();
            },
          },
          { label: '', onClick: () => {}, divider: true },
          {
            label: 'Export Schema',
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            ),
            onClick: () => {
              if (node.parent) {
                onExportSchema?.(node.parent, node.name);
              }
              onClose();
            },
          },
          {
            label: 'Edit Table',
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            ),
            onClick: () => {
              if (node.parent) {
                onEditTable?.(node.parent, node.name);
              }
              onClose();
            },
          },
          {
            label: 'Drop Table',
            icon: (
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            ),
            onClick: () => {
              if (node.parent) {
                onDropTable?.(node.parent, node.name);
              }
              onClose();
            },
          }
        );
        break;

      case 'column':
        actions.push(
          {
            label: 'Copy Column Name',
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            ),
            onClick: () => {
              navigator.clipboard.writeText(node.name);
              console.log('Copied column name:', node.name);
              onClose();
            },
          },
          {
            label: 'Edit Column',
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            ),
            onClick: () => {
              console.log('Edit column:', node.name);
              onClose();
            },
          }
        );
        break;

      case 'view':
        actions.push(
          {
            label: 'View Data',
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            ),
            onClick: () => {
              if (onViewData && node.parent) {
                onViewData(node.parent, node.name);
              }
              onClose();
            },
          },
          {
            label: 'Show CREATE VIEW',
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            ),
            onClick: () => {
              console.log('Show CREATE VIEW for:', node.name);
              onClose();
            },
          }
        );
        break;

      default:
        actions.push({
          label: 'View Details',
          onClick: () => {
            console.log('View details for:', node.name);
            onClose();
          },
        });
    }

    return actions;
  };

  const actions = getActions();

  // Adjust position to keep menu within viewport
  const adjustedPosition = { ...position };
  if (menuRef.current) {
    const rect = menuRef.current.getBoundingClientRect();
    if (position.x + rect.width > window.innerWidth) {
      adjustedPosition.x = window.innerWidth - rect.width - 10;
    }
    if (position.y + rect.height > window.innerHeight) {
      adjustedPosition.y = window.innerHeight - rect.height - 10;
    }
  }

  return (
    <div
      ref={menuRef}
      className="fixed bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[180px] z-50"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      {actions.map((action, index) =>
        action.divider ? (
          <div key={index} className="my-1 border-t border-gray-200" />
        ) : (
          <button
            key={index}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            onClick={action.onClick}
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        )
      )}
    </div>
  );
}
