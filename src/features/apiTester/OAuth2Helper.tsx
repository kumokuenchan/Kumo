import { useState } from 'react';
import { X, Key, ExternalLink, Copy, Check, Save } from 'lucide-react';
import { environmentStorage } from '../../services/environmentStorage';
import { apiTesterApi } from '../../api/apiTester';

interface OAuth2HelperProps {
  onClose: () => void;
  onTokenReceived?: (token: string) => void;
}

type OAuth2FlowType = 'authorization_code' | 'client_credentials' | 'password' | 'implicit';

export default function OAuth2Helper({ onClose, onTokenReceived }: OAuth2HelperProps) {
  const [flowType, setFlowType] = useState<OAuth2FlowType>('authorization_code');
  const [authUrl, setAuthUrl] = useState('');
  const [tokenUrl, setTokenUrl] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState('http://localhost:3000/oauth/callback');
  const [scope, setScope] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<'config' | 'authorize' | 'complete'>('config');

  const generateAuthUrl = () => {
    const params = new URLSearchParams({
      response_type: flowType === 'implicit' ? 'token' : 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
    });

    if (scope) {
      params.set('scope', scope);
    }

    const fullUrl = `${authUrl}?${params.toString()}`;
    return fullUrl;
  };

  const handleOpenAuthUrl = () => {
    const url = generateAuthUrl();
    window.open(url, '_blank');
    setStep('authorize');
  };

  const handleExchangeCode = async () => {
    if (flowType === 'authorization_code' && !authCode) {
      setError('Please enter the authorization code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const body: any = {
        client_id: clientId,
      };

      if (flowType === 'authorization_code') {
        body.grant_type = 'authorization_code';
        body.code = authCode;
        body.redirect_uri = redirectUri;
        if (clientSecret) body.client_secret = clientSecret;
      } else if (flowType === 'client_credentials') {
        body.grant_type = 'client_credentials';
        if (clientSecret) body.client_secret = clientSecret;
        if (scope) body.scope = scope;
      } else if (flowType === 'password') {
        body.grant_type = 'password';
        body.username = username;
        body.password = password;
        if (clientSecret) body.client_secret = clientSecret;
        if (scope) body.scope = scope;
      }

      const response = await apiTesterApi.executeRequest({
        method: 'POST',
        url: tokenUrl,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(body).toString(),
      });

      if (response.status >= 200 && response.status < 300) {
        let tokenData: any;
        if (typeof response.data === 'string') {
          tokenData = JSON.parse(response.data);
        } else {
          tokenData = response.data;
        }

        setAccessToken(tokenData.access_token || '');
        setRefreshToken(tokenData.refresh_token || '');
        setExpiresIn(tokenData.expires_in || null);
        setStep('complete');

        if (onTokenReceived && tokenData.access_token) {
          onTokenReceived(tokenData.access_token);
        }
      } else {
        setError(`Token request failed: ${response.status} ${response.statusText}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to exchange code for token');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToEnvironment = () => {
    if (accessToken) {
      environmentStorage.setVariable('oauth_access_token', accessToken);
      if (refreshToken) {
        environmentStorage.setVariable('oauth_refresh_token', refreshToken);
      }
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1000);
    }
  };

  const copyAuthUrl = () => {
    navigator.clipboard.writeText(generateAuthUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyAccessToken = () => {
    navigator.clipboard.writeText(accessToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                OAuth 2.0 Flow Helper
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Step {step === 'config' ? '1' : step === 'authorize' ? '2' : '3'} of 3: {
                step === 'config' ? 'Configure OAuth' :
                step === 'authorize' ? 'Authorize & Get Code' :
                'Token Received'
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {step === 'config' && (
            <>
              {/* Flow Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  OAuth 2.0 Flow Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'authorization_code', label: 'Authorization Code', desc: 'Most secure, requires user consent' },
                    { value: 'client_credentials', label: 'Client Credentials', desc: 'Machine-to-machine, no user' },
                    { value: 'password', label: 'Resource Owner Password', desc: 'Direct username/password' },
                    { value: 'implicit', label: 'Implicit (Legacy)', desc: 'Browser-only, less secure' },
                  ].map((flow) => (
                    <button
                      key={flow.value}
                      onClick={() => setFlowType(flow.value as OAuth2FlowType)}
                      className={`p-3 text-left border-2 rounded-lg transition-all ${
                        flowType === flow.value
                          ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                      }`}
                    >
                      <div className="font-medium text-sm text-gray-900 dark:text-white">{flow.label}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{flow.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* OAuth Configuration */}
              {(flowType === 'authorization_code' || flowType === 'implicit') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Authorization URL *
                  </label>
                  <input
                    type="url"
                    value={authUrl}
                    onChange={(e) => setAuthUrl(e.target.value)}
                    placeholder="https://provider.com/oauth/authorize"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                  />
                </div>
              )}

              {flowType !== 'implicit' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Token URL *
                  </label>
                  <input
                    type="url"
                    value={tokenUrl}
                    onChange={(e) => setTokenUrl(e.target.value)}
                    placeholder="https://provider.com/oauth/token"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Client ID *
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="your_client_id"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Client Secret {flowType !== 'implicit' && '*'}
                  </label>
                  <input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="your_client_secret"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                  />
                </div>
              </div>

              {(flowType === 'authorization_code' || flowType === 'implicit') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Redirect URI *
                  </label>
                  <input
                    type="url"
                    value={redirectUri}
                    onChange={(e) => setRedirectUri(e.target.value)}
                    placeholder="http://localhost:3000/oauth/callback"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                  />
                </div>
              )}

              {flowType === 'password' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="password"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Scope (optional)
                </label>
                <input
                  type="text"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  placeholder="read write openid"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Space-separated list of scopes
                </p>
              </div>
            </>
          )}

          {step === 'authorize' && flowType === 'authorization_code' && (
            <>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <ExternalLink className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Authorization Window Opened</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Complete the authorization in the opened window, then paste the authorization code below.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Authorization Code *
                </label>
                <input
                  type="text"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder="Paste the authorization code here"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm font-mono"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  The code will be in the redirect URL (e.g., ?code=...)
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
                  {error}
                </div>
              )}
            </>
          )}

          {step === 'complete' && accessToken && (
            <>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-green-900 dark:text-green-100 mb-1">Token Received Successfully!</h4>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Your access token is ready to use. Save it to your environment or copy it.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Access Token
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={accessToken}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-gray-50 dark:bg-slate-900 text-sm font-mono"
                  />
                  <button
                    onClick={copyAccessToken}
                    className="px-3 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded flex items-center gap-1"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {refreshToken && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Refresh Token
                  </label>
                  <input
                    type="text"
                    value={refreshToken}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-gray-50 dark:bg-slate-900 text-sm font-mono"
                  />
                </div>
              )}

              {expiresIn && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Token expires in: {Math.floor(expiresIn / 60)} minutes
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-slate-700">
          {step === 'config' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded"
              >
                Cancel
              </button>
              {flowType === 'authorization_code' || flowType === 'implicit' ? (
                <button
                  onClick={handleOpenAuthUrl}
                  disabled={!authUrl || !clientId}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded flex items-center gap-2"
                >
                  Open Authorization URL
                  <ExternalLink className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleExchangeCode}
                  disabled={!tokenUrl || !clientId || isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded"
                >
                  {isLoading ? 'Getting Token...' : 'Get Access Token'}
                </button>
              )}
            </>
          )}

          {step === 'authorize' && (
            <>
              <button
                onClick={() => setStep('config')}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded"
              >
                Back
              </button>
              <button
                onClick={handleExchangeCode}
                disabled={!authCode || isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded"
              >
                {isLoading ? 'Exchanging Code...' : 'Exchange for Token'}
              </button>
            </>
          )}

          {step === 'complete' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded"
              >
                Close
              </button>
              <button
                onClick={handleSaveToEnvironment}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save to Environment
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
