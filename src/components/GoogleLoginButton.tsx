import React, { useState, useEffect } from 'react';
import { 
  Chrome, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Clock, 
  Shield,
  User,
  MapPin,
  Key
} from 'lucide-react';
import { googleOAuthService } from '../services/GoogleOAuthService';
import { awsCredentialsService } from '../services/AWSCredentialsService';
import { AWSCredentials } from '../services/GoogleOAuthService';
import AWSCredentialsManager from './AWSCredentialsManager';

interface GoogleLoginButtonProps {
  onCredentialsReceived?: (credentials: AWSCredentials) => void;
  onError?: (error: string) => void;
  className?: string;
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onCredentialsReceived,
  onError,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<AWSCredentials | null>(null);
  const [selectedRegion, setSelectedRegion] = useState('us-east-1');
  const [profileName, setProfileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'authenticate' | 'manage'>('authenticate');
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Check if Google OAuth is configured
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    setIsConfigured(!!clientId);
  }, []);

  const AWS_REGIONS = [
    { value: 'us-east-1', label: 'US East (N. Virginia)' },
    { value: 'us-west-2', label: 'US West (Oregon)' },
    { value: 'us-west-1', label: 'US West (N. California)' },
    { value: 'eu-west-1', label: 'Europe (Ireland)' },
    { value: 'eu-west-2', label: 'Europe (London)' },
    { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
    { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
    { value: 'ap-northeast-2', label: 'Asia Pacific (Seoul)' },
    { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
    { value: 'ca-central-1', label: 'Canada (Central)' },
    { value: 'sa-east-1', label: 'South America (São Paulo)' },
  ];

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Check if Google OAuth is configured
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) {
        throw new Error('Google OAuth is not configured. Please contact administrator to set up Google Client ID.');
      }

      // Sign in with Google
      const authResult = await googleOAuthService.signInWithGoogle();
      
      // Get AWS credentials
      const awsCredentials = await googleOAuthService.getAWSCredentials(
        authResult.access_token,
        selectedRegion
      );

      // Save credentials
      const savedProfile = await awsCredentialsService.saveCredentials(
        awsCredentials,
        profileName || undefined,
        !awsCredentialsService.getDefaultProfile() // Set as default if no default exists
      );

      setCredentials(awsCredentials);
      setSuccess(`Successfully authenticated and saved AWS credentials for ${awsCredentials.userEmail}`);
      
      onCredentialsReceived?.(awsCredentials);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshCredentials = async () => {
    if (!credentials) return;

    setIsLoading(true);
    setError(null);

    try {
      const refreshToken = localStorage.getItem('google_refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available. Please sign in again.');
      }

      const refreshedCredentials = await googleOAuthService.refreshAWSCredentials(
        refreshToken,
        selectedRegion
      );

      setCredentials(refreshedCredentials);
      setSuccess('AWS credentials refreshed successfully');
      
      onCredentialsReceived?.(refreshedCredentials);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh credentials';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const isCredentialsExpired = (): boolean => {
    if (!credentials?.expiration) return false;
    return new Date(credentials.expiration) < new Date();
  };

  const getTimeUntilExpiration = (): string => {
    if (!credentials?.expiration) return 'No expiration';
    
    const now = new Date();
    const expiration = new Date(credentials.expiration);
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

  return (
    <div className={`w-full max-w-4xl ${className}`}>
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('authenticate')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'authenticate'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Authenticate
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'manage'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Manage Credentials
          </button>
        </nav>
      </div>
      
      {activeTab === 'authenticate' && (
        <div className="mt-6 bg-white dark:bg-[#161b22] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="text-center px-6 py-6 border-b border-gray-200/50 dark:border-gray-800/50">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <Chrome className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Google AWS Authentication</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Sign in with Google to get temporary AWS credentials
            </p>
          </div>

          <div className="p-6 space-y-4">
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

        {!credentials ? (
          <>
            <div className="space-y-2">
              <label htmlFor="region" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                AWS Region
              </label>
              <select
                id="region"
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select AWS region</option>
                {AWS_REGIONS.map(region => (
                  <option key={region.value} value={region.value}>
                    {region.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Profile Name (Optional)
              </label>
              <input
                id="profile-name"
                type="text"
                placeholder="My AWS Profile"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={isLoading || !isConfigured}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Chrome className="w-4 h-4" />
                  {isConfigured ? 'Sign in with Google' : 'Google OAuth Not Configured'}
                </>
              )}
            </button>

            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              {isConfigured ? (
                <>
                  <p>• This will open a Google authentication window</p>
                  <p>• You'll need cloud-platform permissions</p>
                  <p>• Credentials are temporary and will expire</p>
                </>
              ) : (
                <>
                  <p>• Google OAuth is not configured</p>
                  <p>• Please set VITE_GOOGLE_CLIENT_ID environment variable</p>
                  <p>• Contact administrator for setup instructions</p>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-700 dark:text-green-300">
                  Authenticated Successfully
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {credentials.userEmail}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {AWS_REGIONS.find(r => r.value === credentials.region)?.label || credentials.region}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Access Key ID: {credentials.accessKeyId.substring(0, 8)}...
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Expires in: {getTimeUntilExpiration()}
                  </span>
                </div>
              </div>

              {isCredentialsExpired() && (
                <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Expired
                </div>
              )}
            </div>

            <button
              onClick={handleRefreshCredentials}
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Refresh Credentials
                </>
              )}
            </button>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              <Shield className="w-3 h-3 inline mr-1" />
              Credentials are stored securely and used for AWS API calls
            </div>
          </div>
        )}
      </div>
        </div>
      )}
      
      {activeTab === 'manage' && (
        <div className="mt-6">
          <AWSCredentialsManager 
            onCredentialsSelected={(creds) => {
              setCredentials(creds);
              setSuccess(`Switched to credentials for ${creds.userEmail}`);
            }}
            onError={(err) => setError(err)}
          />
        </div>
      )}
    </div>
  );
};

export default GoogleLoginButton;