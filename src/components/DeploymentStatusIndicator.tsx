import React from 'react';
import { Rocket, AlertCircle, CheckCircle, Clock, XCircle, ExternalLink, Loader2 } from 'lucide-react';
import { DeploymentEnvironment } from '../services/DeploymentSecurityService';

interface DeploymentStatusIndicatorProps {
  deployments: DeploymentEnvironment[];
  isLoading: boolean;
  compact?: boolean;
}

const DeploymentStatusIndicator: React.FC<DeploymentStatusIndicatorProps> = ({ 
  deployments, 
  isLoading, 
  compact = false 
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-1 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        {compact ? '' : <span className="text-xs">Loading deployments...</span>}
      </div>
    );
  }

  if (deployments.length === 0) {
    return null;
  }

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failure':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'inactive':
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'success':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
      case 'failure':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'inactive':
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const overallStatus = deployments.some(d => d.state === 'failure') ? 'failure' :
                       deployments.some(d => d.state === 'pending') ? 'pending' :
                       deployments.every(d => d.state === 'success' || d.state === 'inactive') ? 'success' : 'pending';

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {getStatusIcon(overallStatus)}
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {deployments.length} env{deployments.length !== 1 ? 's' : ''}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            Deployments ({deployments.length})
          </span>
        </div>
        <div className="flex items-center gap-1">
          {getStatusIcon(overallStatus)}
          <span className={`text-xs font-medium ${getStatusColor(overallStatus)}`}>
            {overallStatus === 'success' ? 'All successful' :
             overallStatus === 'failure' ? 'Some failed' : 'In progress'}
          </span>
        </div>
      </div>
      
      <div className="space-y-1">
        {deployments.map((deployment) => (
          <div
            key={deployment.id}
            className={`flex items-center justify-between p-2 rounded-lg border dark:border-gray-700 ${
              deployment.state === 'failure' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' :
              deployment.state === 'success' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' :
              deployment.state === 'pending' ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800' :
              'bg-gray-50 dark:bg-gray-900/10'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={getStatusColor(deployment.state)}>
                {getStatusIcon(deployment.state)}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {deployment.name}
                </div>
                {deployment.description && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {deployment.description}
                  </div>
                )}
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  {new Date(deployment.updated_at).toLocaleString()}
                </div>
              </div>
            </div>
            
            {deployment.url && (
              <a
                href={deployment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeploymentStatusIndicator;