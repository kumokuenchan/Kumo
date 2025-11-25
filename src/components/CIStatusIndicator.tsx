import React from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { PRCheckStatus } from '../services/CICDService';

interface CIStatusIndicatorProps {
  status: PRCheckStatus | null;
  isLoading: boolean;
  compact?: boolean;
}

const CIStatusIndicator: React.FC<CIStatusIndicatorProps> = ({ 
  status, 
  isLoading, 
  compact = false 
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-1 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        {compact ? '' : <span className="text-xs">Loading...</span>}
      </div>
    );
  }

  if (!status || status.total === 0) {
    return null;
  }

  const getStatusIcon = (conclusion: string | null) => {
    switch (conclusion) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failure':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (conclusion: string | null) => {
    switch (conclusion) {
      case 'success':
        return 'All checks passed';
      case 'failure':
        return `${status.statuses.filter(s => s.state === 'failure' || s.state === 'error').length} failed`;
      case 'pending':
        return `${status.statuses.filter(s => s.state === 'pending').length} pending`;
      default:
        return 'Unknown status';
    }
  };

  const getStatusColor = (conclusion: string | null) => {
    switch (conclusion) {
      case 'success':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
      case 'failure':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {getStatusIcon(status.conclusion)}
        {!compact && (
          <span className={`text-xs font-medium ${getStatusColor(status.conclusion)}`}>
            {getStatusText(status.conclusion)}
          </span>
        )}
      </div>
      
      {!compact && status.statuses.length > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">
            {status.statuses.length}/{status.total}
          </span>
        </div>
      )}
    </div>
  );
};

interface CIStatusDetailsProps {
  status: PRCheckStatus;
}

export const CIStatusDetails: React.FC<CIStatusDetailsProps> = ({ status }) => {
  const getStatusColor = (state: string) => {
    switch (state) {
      case 'success':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
      case 'failure':
      case 'error':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'failure':
        return <XCircle className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
          CI/CD Checks ({status.statuses.length})
        </h4>
        <div className="flex items-center gap-1">
          {status.conclusion === 'success' && (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
          {status.conclusion === 'failure' && (
            <XCircle className="w-4 h-4 text-red-500" />
          )}
          {status.conclusion === 'pending' && (
            <Clock className="w-4 h-4 text-yellow-500" />
          )}
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {status.conclusion === 'success' ? 'Passed' : 
             status.conclusion === 'failure' ? 'Failed' : 'Pending'}
          </span>
        </div>
      </div>
      
      <div className="space-y-1">
        {status.statuses.map((check) => (
          <div
            key={check.id}
            className="flex items-center justify-between p-2 rounded border dark:border-gray-700"
          >
            <div className="flex items-center gap-2">
              <div className={getStatusColor(check.state)}>
                {getStatusIcon(check.state)}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {check.name}
                </div>
                {check.description && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {check.description}
                  </div>
                )}
              </div>
            </div>
            
            {check.targetUrl && (
              <a
                href={check.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                View Details
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CIStatusIndicator;