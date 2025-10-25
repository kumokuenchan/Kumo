import { useState } from 'react';
import { MySQLConnection } from '../../types/connection';

interface ConnectionListItemProps {
  connection: MySQLConnection;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  isConnected: boolean;
}

export default function ConnectionListItem({
  connection,
  isActive,
  onSelect,
  onEdit,
  onDelete,
  onConnect,
  onDisconnect,
  isConnected,
}: ConnectionListItemProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`px-3 py-2.5 cursor-pointer transition-colors ${
        isActive
          ? 'bg-gray-100 hover:bg-gray-200'
          : 'hover:bg-gray-100'
      }`}
      onClick={onSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-center gap-3">
        {/* Connection Status Indicator */}
        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            isActive || isConnected ? 'bg-green-500' : 'bg-gray-300'
          }`}
          title={isActive || isConnected ? 'Connected' : 'Disconnected'}
        />

        {/* Connection Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">{connection.name}</h4>
          <p className="text-xs text-gray-500 truncate">
            MySQL - {connection.host}:{connection.port}
          </p>
          {connection.lastUsed && (
            <p className="text-xs text-gray-400 mt-0.5">
              Last used: {new Date(connection.lastUsed).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onEdit}
            className={`p-1 transition-colors ${
              isActive
                ? 'text-gray-600 hover:text-gray-900'
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title="Edit connection"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className={`p-1 transition-colors ${
              isActive
                ? 'text-red-500 hover:text-red-700'
                : 'text-gray-400 hover:text-red-600'
            }`}
            title="Delete connection"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
