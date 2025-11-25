import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Trash2, 
  RefreshCw, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  Clock,
  User,
  MapPin,
  Key,
  Shield,
  Copy
} from 'lucide-react';
import { awsCredentialsService } from '../services/AWSCredentialsService';
import { AWSCredentials } from '../services/GoogleOAuthService';

interface AWSCredentialsManagerProps {
  onCredentialsSelected?: (credentials: AWSCredentials) => void;
  className?: string;
}

const AWSCredentialsManager: React.FC<AWSCredentialsManagerProps> = ({
  onCredentialsSelected,
  className = ''
}) => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = () => {
    try {
      const allProfiles = awsCredentialsService.getAllProfiles();
      setProfiles(allProfiles);
    } catch (err) {
      setError('Failed to load credentials profiles');
    }
  };

  const handleSetDefault = async (profileId: string) => {
    try {
      awsCredentialsService.setDefaultProfile(profileId);
      loadProfiles();
      setSuccess('Default profile updated successfully');
    } catch (err) {
      setError('Failed to set default profile');
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;

    try {
      awsCredentialsService.deleteProfile(profileId);
      loadProfiles();
      setSuccess('Profile deleted successfully');
    } catch (err) {
      setError('Failed to delete profile');
    }
  };

  const handleRefreshProfile = async (profileId: string) => {
    setLoading(true);
    setError(null);

    try {
      await awsCredentialsService.refreshCredentials(profileId);
      loadProfiles();
      setSuccess('Credentials refreshed successfully');
    } catch (err) {
      setError('Failed to refresh credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = (profile: any) => {
    const credentials = {
      accessKeyId: profile.accessKeyId,
      secretAccessKey: profile.secretAccessKey,
      sessionToken: profile.sessionToken,
      region: profile.region
    };

    navigator.clipboard.writeText(JSON.stringify(credentials, null, 2));
    setSuccess('Credentials copied to clipboard');
  };

  const handleExportProfiles = () => {
    try {
      const exportData = awsCredentialsService.exportProfiles();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aws-credentials-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess('Profiles exported successfully');
    } catch (err) {
      setError('Failed to export profiles');
    }
  };

  const handleImportProfiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        await awsCredentialsService.importProfiles(content);
        loadProfiles();
        setSuccess('Profiles imported successfully');
      } catch (err) {
        setError('Failed to import profiles');
      }
    };
    reader.readAsText(file);
  };

  const isExpired = (profile: any): boolean => {
    if (!profile.expiration) return false;
    return new Date(profile.expiration) < new Date();
  };

  const getTimeUntilExpiration = (profile: any): string => {
    if (!profile.expiration) return 'No expiration';
    
    const now = new Date();
    const expiration = new Date(profile.expiration);
    const diff = expiration.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
    
    return `${hours}h ${minutes}m`;
  };

  const stats = awsCredentialsService.getProfileStats();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#161b22] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.totalProfiles}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Profiles</div>
        </div>
        <div className="bg-white dark:bg-[#161b22] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-green-600">{stats.activeProfiles}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
        </div>
        <div className="bg-white dark:bg-[#161b22] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-red-600">{stats.expiredProfiles}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Expired</div>
        </div>
        <div className="bg-white dark:bg-[#161b22] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-purple-600">{Object.keys(stats.profilesByRegion).length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Regions</div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-[#161b22] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Credential Management
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your AWS credential profiles
          </p>
        </div>
        <div className="p-6">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleExportProfiles}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Profiles
            </button>
            <button
              onClick={() => document.getElementById('import-file')?.click()}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import Profiles
            </button>
            <input
              id="import-file"
              type="file"
              accept=".json"
              onChange={handleImportProfiles}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Profiles List */}
      <div className="space-y-4">
        {profiles.length === 0 ? (
          <div className="bg-white dark:bg-[#161b22] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-8 text-center">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Credential Profiles
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Sign in with Google to create your first AWS credential profile
            </p>
          </div>
        ) : (
          profiles.map((profile) => (
            <div
              key={profile.id}
              className={`bg-white dark:bg-[#161b22] rounded-lg shadow-sm border ${
                isExpired(profile) ? 'border-red-200 bg-red-50/50 dark:border-red-800' : 'border-gray-200 dark:border-gray-800'
              } overflow-hidden`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {profile.nickname}
                      </h3>
                      {profile.isDefault && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                          Default
                        </span>
                      )}
                      {isExpired(profile) && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                          Expired
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {profile.userEmail}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {profile.region}
                      </div>
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        {profile.accessKeyId.substring(0, 8)}...
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Expires in: {getTimeUntilExpiration(profile)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Created: {new Date(profile.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        Last used: {new Date(profile.lastUsed).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1 ml-4">
                    <button
                      onClick={() => handleCopyCredentials(profile)}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      title="Copy credentials"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRefreshProfile(profile.id)}
                      disabled={loading}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Refresh credentials"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleSetDefault(profile.id)}
                      disabled={profile.isDefault}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Set as default"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProfile(profile.id)}
                      className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete profile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AWSCredentialsManager;