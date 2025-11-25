interface GoogleAuthResult {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token: string;
  refresh_token?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  expiration?: string;
  region: string;
  userId: string;
  userEmail: string;
}

class GoogleOAuthService {
  private readonly CLIENT_ID: string;
  private readonly REDIRECT_URI: string;

  constructor() {
    this.CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    this.REDIRECT_URI = `${window.location.origin}/auth/google/callback`;
  }
  private readonly SCOPES = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/cloud-platform'
  ].join(' ');

  private authWindow: Window | null = null;

  async signInWithGoogle(): Promise<GoogleAuthResult> {
    if (!this.CLIENT_ID) {
      throw new Error('Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID environment variable.');
    }

    return new Promise((resolve, reject) => {
      const authUrl = this.buildAuthUrl();
      
      this.authWindow = window.open(
        authUrl,
        'google_auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!this.authWindow) {
        reject(new Error('Failed to open authentication window'));
        return;
      }

      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          this.cleanup();
          resolve(event.data.payload);
        } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
          this.cleanup();
          reject(new Error(event.data.error));
        }
      };

      window.addEventListener('message', messageHandler);

      // Poll for window closure
      const checkClosed = setInterval(() => {
        if (this.authWindow?.closed) {
          this.cleanup();
          clearInterval(checkClosed);
          reject(new Error('Authentication window was closed'));
        }
      }, 1000);
    });
  }

  private buildAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.CLIENT_ID,
      redirect_uri: this.REDIRECT_URI,
      response_type: 'code',
      scope: this.SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state: this.generateState()
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private cleanup(): void {
    if (this.authWindow && !this.authWindow.closed) {
      this.authWindow.close();
    }
    this.authWindow = null;
    window.removeEventListener('message', () => {});
  }

  async exchangeCodeForTokens(code: string): Promise<GoogleAuthResult> {
    try {
      const response = await fetch('/api/auth/google/exchange-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error(`Failed to exchange code: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }

  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
    }
  }

  async getAWSCredentials(googleToken: string, region: string = 'us-east-1'): Promise<AWSCredentials> {
    try {
      const response = await fetch('/api/aws/get-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${googleToken}`,
        },
        body: JSON.stringify({ region }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get AWS credentials: ${response.status}`);
      }

      const credentials = await response.json();
      
      return {
        ...credentials,
        region,
        userId: credentials.userId,
        userEmail: credentials.userEmail,
      };
    } catch (error) {
      console.error('Error getting AWS credentials:', error);
      throw error;
    }
  }

  async refreshAWSCredentials(refreshToken: string, region: string = 'us-east-1'): Promise<AWSCredentials> {
    try {
      const response = await fetch('/api/aws/refresh-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken, region }),
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh AWS credentials: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error refreshing AWS credentials:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      // Clear stored tokens
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('google_refresh_token');
      localStorage.removeItem('aws_credentials');
      
      // Revoke Google token
      const token = localStorage.getItem('google_access_token');
      if (token) {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
          method: 'POST',
        });
      }
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  }

  isSignedIn(): boolean {
    return !!localStorage.getItem('google_access_token');
  }

  getStoredCredentials(): AWSCredentials | null {
    const stored = localStorage.getItem('aws_credentials');
    if (stored) {
      const credentials = JSON.parse(stored);
      
      // Check if credentials are expired
      if (credentials.expiration && new Date(credentials.expiration) < new Date()) {
        localStorage.removeItem('aws_credentials');
        return null;
      }
      
      return credentials;
    }
    return null;
  }

  storeCredentials(credentials: AWSCredentials): void {
    localStorage.setItem('aws_credentials', JSON.stringify(credentials));
  }

  async handleAuthCallback(): Promise<void> {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      window.postMessage({
        type: 'GOOGLE_AUTH_ERROR',
        error: error
      }, window.location.origin);
      return;
    }

    if (code) {
      try {
        const tokens = await this.exchangeCodeForTokens(code);
        const userInfo = await this.getUserInfo(tokens.access_token);
        
        // Store tokens
        localStorage.setItem('google_access_token', tokens.access_token);
        if (tokens.refresh_token) {
          localStorage.setItem('google_refresh_token', tokens.refresh_token);
        }
        localStorage.setItem('google_user_info', JSON.stringify(userInfo));

        window.postMessage({
          type: 'GOOGLE_AUTH_SUCCESS',
          payload: { ...tokens, userInfo }
        }, window.location.origin);

        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        window.postMessage({
          type: 'GOOGLE_AUTH_ERROR',
          error: error instanceof Error ? error.message : 'Authentication failed'
        }, window.location.origin);
      }
    }
  }
}

export const googleOAuthService = new GoogleOAuthService();