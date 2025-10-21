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
      className={`p-3 rounded border cursor-pointer transition-colors ${
        isActive
          ? 'bg-blue-50 border-blue-300'
          : 'bg-white border-gray-200 hover:bg-gray-50'
      }`}
      onClick={onSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-gray-900 truncate">{connection.name}</h4>
            {isConnected && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Connected
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-1 truncate">
            {connection.username}@{connection.host}:{connection.port}
          </p>
          {connection.database && (
            <p className="text-xs text-gray-500 truncate">{connection.database}</p>
          )}
          {connection.lastUsed && (
            <p className="text-xs text-gray-400 mt-1">
              Last used: {new Date(connection.lastUsed).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Connection Status Indicator */}
        <div className="ml-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-gray-300'
            }`}
            title={isConnected ? 'Connected' : 'Disconnected'}
          />
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="mt-2 pt-2 border-t border-gray-200 flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={isConnected ? onDisconnect : onConnect}
            className={`flex-1 px-2 py-1 text-xs rounded ${
              isConnected
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {isConnected ? 'Disconnect' : 'Connect'}
          </button>
          <button
            onClick={onEdit}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
