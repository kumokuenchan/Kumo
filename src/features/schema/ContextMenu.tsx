import { useRef, useEffect, useState } from 'react';
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
  onDumpSQL?: (database: string, table: string) => void;
  onEmptyTable?: (database: string, table: string) => void;
  onTruncateTable?: (database: string, table: string) => void;
  onRenameTable?: (database: string, table: string) => void;
  onDuplicateTable?: (database: string, table: string, includeData: boolean) => void;
  onBackupDatabase?: (database: string) => void;
  onRestoreDatabase?: (database: string) => void;
  restrictTableActions?: boolean;
  onAddToCustomGroup?: (database: string, table: string) => void;
  onRemoveFromCustomGroup?: (database: string, table: string, groupName: string) => void;
  customGroups?: Record<string, string[]>;
}

interface MenuAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  divider?: boolean;
  submenu?: MenuAction[];
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
  onGenerateQuery,
  onDumpSQL,
  onEmptyTable,
  onTruncateTable,
  onRenameTable,
  onDuplicateTable,
  onBackupDatabase,
  onRestoreDatabase,
  restrictTableActions,
  onAddToCustomGroup,
  onRemoveFromCustomGroup,
  customGroups
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleMouseEnter = (index: number) => {
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setHoveredIndex(index);
  };

  const handleMouseLeave = () => {
    // Add a small delay before hiding to allow smooth transition to submenu
    hideTimeoutRef.current = setTimeout(() => {
      setHoveredIndex(null);
    }, 100);
  };

  const handleSubmenuMouseEnter = () => {
    // Cancel hiding when entering submenu
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const handleSubmenuMouseLeave = () => {
    // Hide submenu when leaving it
    setHoveredIndex(null);
  };

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
          { label: '', onClick: () => {}, divider: true },
          {
            label: 'Backup Database',
            icon: (
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
            ),
            onClick: () => {
              onBackupDatabase?.(node.name);
              onClose();
            },
          },
          {
            label: 'Restore Database',
            icon: (
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
            ),
            onClick: () => {
              onRestoreDatabase?.(node.name);
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
            label: 'Add to Custom Group…',
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v4m-2-2h4" />
              </svg>
            ),
            onClick: () => {
              if (node.parent && onAddToCustomGroup) {
                onAddToCustomGroup(node.parent, node.name);
              }
              onClose();
            },
          },
          // Remove from Custom Group (only when present in at least one group)
          (() => {
            if (!customGroups || !node.parent) return null;
            const fq = `${node.parent}.${node.name}`;
            const memberships = Object.keys(customGroups).filter(g => (customGroups[g] || []).includes(fq));
            if (memberships.length === 0) return null;
            if (memberships.length === 1) {
              return {
                label: 'Remove from Custom Group',
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9" />
                  </svg>
                ),
                onClick: () => {
                  onRemoveFromCustomGroup?.(node.parent!, node.name, memberships[0]);
                  onClose();
                },
              } as MenuAction;
            }
            // Multiple memberships -> submenu
            return {
              label: 'Remove from Custom Group',
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9" />
                </svg>
              ),
              submenu: memberships.map((g) => ({
                label: g,
                onClick: () => {
                  onRemoveFromCustomGroup?.(node.parent!, node.name, g);
                  onClose();
                },
              }))
            } as MenuAction;
          })(),
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
            label: 'Dump SQL File',
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                />
              </svg>
            ),
            onClick: () => {
              if (node.parent) {
                onDumpSQL?.(node.parent, node.name);
              }
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
              if (node.parent) {
                onExportSchema?.(node.parent, node.name);
              }
              onClose();
            },
          },
          { label: '', onClick: () => {}, divider: true },
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
            label: 'Rename Table',
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            ),
            onClick: () => {
              if (node.parent) {
                onRenameTable?.(node.parent, node.name);
              }
              onClose();
            },
          },
          {
            label: 'Duplicate Table',
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
            submenu: [
              {
                label: 'Structure Only',
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                    />
                  </svg>
                ),
                onClick: () => {
                  if (node.parent) {
                    onDuplicateTable?.(node.parent, node.name, false);
                  }
                  onClose();
                },
              },
              {
                label: 'Structure and Data',
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                ),
                onClick: () => {
                  if (node.parent) {
                    onDuplicateTable?.(node.parent, node.name, true);
                  }
                  onClose();
                },
              },
            ],
          },
          { label: '', onClick: () => {}, divider: true },
          {
            label: 'Empty Table',
            icon: (
              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ),
            onClick: () => {
              if (node.parent) {
                onEmptyTable?.(node.parent, node.name);
              }
              onClose();
            },
          },
          {
            label: 'Truncate Table',
            icon: (
              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            ),
            onClick: () => {
              if (node.parent) {
                onTruncateTable?.(node.parent, node.name);
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

  let actions = getActions();

  // If restricted mode for tables, remove management actions and tidy dividers
  if (restrictTableActions && node.type === 'table') {
    const hidden = new Set([
      'Edit Table',
      'Rename Table',
      'Duplicate Table',
      'Empty Table',
      'Truncate Table',
      'Drop Table',
    ]);
    const filtered: MenuAction[] = actions.filter((a) => a && (!a.label || !hidden.has(a.label)));
    const cleaned: MenuAction[] = [];
    for (const item of filtered) {
      if (item.divider) {
        if (cleaned.length === 0 || cleaned[cleaned.length - 1].divider) continue;
        cleaned.push(item);
      } else {
        cleaned.push(item);
      }
    }
    if (cleaned.length > 0 && cleaned[cleaned.length - 1].divider) cleaned.pop();
    actions = cleaned;
  }

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

  const hiddenLabels = new Set([
    'Edit Table',
    'Rename Table',
    'Duplicate Table',
    'Empty Table',
    'Truncate Table',
    'Drop Table',
  ]);

  const isActionAvailable = (label?: string): boolean => {
    switch (label) {
      case 'Edit Table': return !!onEditTable;
      case 'Rename Table': return !!onRenameTable;
      case 'Duplicate Table': return !!onDuplicateTable;
      case 'Empty Table': return !!onEmptyTable;
      case 'Truncate Table': return !!onTruncateTable;
      case 'Drop Table': return !!onDropTable;
      default: return true;
    }
  };

  const renderActions = actions.filter((a) => {
    // Filter out null entries
    if (!a) return false;
    if (node.type === 'table') {
      // Hide management if restricted
      if (restrictTableActions && a.label && hiddenLabels.has(a.label)) return false;
      // Hide actions whose handlers are not provided
      if (a.label && !isActionAvailable(a.label)) return false;
    }
    return true;
  });

  return (
    <div
      ref={menuRef}
      className="fixed bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[180px] z-50"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      {renderActions.map((action, index) =>
        action.divider ? (
          <div key={index} className="my-1 border-t border-gray-200" />
        ) : (
          <div
            key={index}
            className="relative"
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
          >
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 justify-between"
              onClick={action.onClick}
            >
              <div className="flex items-center gap-2">
                {action.icon}
                <span>{action.label}</span>
              </div>
              {action.submenu && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
            {action.submenu && hoveredIndex === index && (
              <div
                className="absolute left-full top-0 ml-1 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[180px] z-50"
                onMouseEnter={handleSubmenuMouseEnter}
                onMouseLeave={handleSubmenuMouseLeave}
              >
                {action.submenu.map((subAction, subIndex) => (
                  <button
                    key={subIndex}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                    onClick={subAction.onClick}
                  >
                    {subAction.icon}
                    <span>{subAction.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
