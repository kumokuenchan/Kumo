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

const getEnvironmentColor = (environment?: string) => {
  switch (environment) {
    case 'production':
      return 'bg-red-500';
    case 'staging':
      return 'bg-yellow-500';
    case 'development':
    default:
      return 'bg-green-500';
  }
};

const getEnvironmentLabel = (environment?: string) => {
  switch (environment) {
    case 'production':
      return 'PROD';
    case 'staging':
      return 'STAGE';
    case 'development':
    default:
      return 'DEV';
  }
};

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
  return (
    <div
      className={`px-3 py-2.5 cursor-pointer transition-colors ${
        isActive
          ? 'bg-gray-100 hover:bg-gray-200'
          : 'hover:bg-gray-100'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3">
        {/* Connection Status Indicator */}
        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            isActive || isConnected ? 'bg-blue-500' : 'bg-gray-300'
          }`}
          title={isActive || isConnected ? 'Connected' : 'Disconnected'}
        />

        {/* Connection Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-gray-900 truncate">{connection.name}</h4>
            {/* Environment Badge */}
            <span
              className={`px-1.5 py-0.5 text-[10px] font-bold text-white rounded ${getEnvironmentColor(connection.environment)} flex-shrink-0`}
              title={`Environment: ${connection.environment || 'development'}`}
            >
              {getEnvironmentLabel(connection.environment)}
            </span>
          </div>
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
          {/* Connect/Disconnect Button */}
          {isConnected ? (
            <button
              onClick={onDisconnect}
              className="p-1 text-orange-500 hover:text-orange-700 transition-colors"
              title="Disconnect"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onConnect}
              className="p-1 text-green-500 hover:text-green-700 transition-colors"
              title="Connect"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>
          )}
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
