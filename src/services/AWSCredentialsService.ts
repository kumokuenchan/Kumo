import { AWSCredentials } from './GoogleOAuthService';

interface StoredCredentials extends AWSCredentials {
  id: string;
  createdAt: string;
  lastUsed: string;
  isDefault: boolean;
  nickname?: string;
}

interface CredentialProfile {
  id: string;
  name: string;
  region: string;
  lastUsed: string;
  credentials: AWSCredentials;
}

class AWSCredentialsService {
  private readonly STORAGE_KEY = 'aws_credentials_profiles';
  private readonly DEFAULT_PROFILE_KEY = 'aws_default_profile';

  async saveCredentials(
    credentials: AWSCredentials,
    nickname?: string,
    isDefault: boolean = false
  ): Promise<StoredCredentials> {
    const profile: StoredCredentials = {
      ...credentials,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      isDefault,
      nickname: nickname || `${credentials.userEmail} - ${credentials.region}`
    };

    const profiles = this.getAllProfiles();
    
    // If this is set as default, remove default from other profiles
    if (isDefault) {
      profiles.forEach(p => p.isDefault = false);
    }

    // Check if profile already exists for this user/region combo
    const existingIndex = profiles.findIndex(
      p => p.userId === credentials.userId && p.region === credentials.region
    );

    if (existingIndex >= 0) {
      profiles[existingIndex] = profile;
    } else {
      profiles.push(profile);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profiles));

    if (isDefault) {
      localStorage.setItem(this.DEFAULT_PROFILE_KEY, profile.id);
    }

    return profile;
  }

  getAllProfiles(): StoredCredentials[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  getProfile(id: string): StoredCredentials | null {
    const profiles = this.getAllProfiles();
    return profiles.find(p => p.id === id) || null;
  }

  getDefaultProfile(): StoredCredentials | null {
    const defaultId = localStorage.getItem(this.DEFAULT_PROFILE_KEY);
    if (defaultId) {
      return this.getProfile(defaultId);
    }
    
    // Fallback to first profile
    const profiles = this.getAllProfiles();
    return profiles.length > 0 ? profiles[0] : null;
  }

  setDefaultProfile(id: string): void {
    const profiles = this.getAllProfiles();
    profiles.forEach(p => p.isDefault = false);
    
    const profile = profiles.find(p => p.id === id);
    if (profile) {
      profile.isDefault = true;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profiles));
      localStorage.setItem(this.DEFAULT_PROFILE_KEY, id);
    }
  }

  updateProfile(id: string, updates: Partial<StoredCredentials>): void {
    const profiles = this.getAllProfiles();
    const index = profiles.findIndex(p => p.id === id);
    
    if (index >= 0) {
      profiles[index] = { ...profiles[index], ...updates };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profiles));
    }
  }

  deleteProfile(id: string): void {
    const profiles = this.getAllProfiles();
    const filtered = profiles.filter(p => p.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));

    // If deleted profile was default, clear default or set new one
    const defaultId = localStorage.getItem(this.DEFAULT_PROFILE_KEY);
    if (defaultId === id) {
      localStorage.removeItem(this.DEFAULT_PROFILE_KEY);
      
      // Set first remaining profile as default if any exist
      if (filtered.length > 0) {
        this.setDefaultProfile(filtered[0].id);
      }
    }
  }

  updateLastUsed(id: string): void {
    this.updateProfile(id, { lastUsed: new Date().toISOString() });
  }

  async refreshCredentials(id: string): Promise<StoredCredentials> {
    const profile = this.getProfile(id);
    if (!profile) {
      throw new Error('Profile not found');
    }

    try {
      const refreshToken = localStorage.getItem('google_refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch('/api/aws/refresh-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          refreshToken, 
          region: profile.region 
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh credentials: ${response.status}`);
      }

      const newCredentials = await response.json();
      
      const updatedProfile: StoredCredentials = {
        ...profile,
        ...newCredentials,
        lastUsed: new Date().toISOString()
      };

      this.updateProfile(id, updatedProfile);
      return updatedProfile;
    } catch (error) {
      console.error('Error refreshing credentials:', error);
      throw error;
    }
  }

  validateCredentials(credentials: AWSCredentials): boolean {
    // Check if credentials are expired
    if (credentials.expiration && new Date(credentials.expiration) < new Date()) {
      return false;
    }

    // Check required fields
    return !!(credentials.accessKeyId && credentials.secretAccessKey && credentials.region);
  }

  getActiveCredentials(): AWSCredentials | null {
    const defaultProfile = this.getDefaultProfile();
    if (defaultProfile && this.validateCredentials(defaultProfile)) {
      this.updateLastUsed(defaultProfile.id);
      return {
        accessKeyId: defaultProfile.accessKeyId,
        secretAccessKey: defaultProfile.secretAccessKey,
        sessionToken: defaultProfile.sessionToken,
        expiration: defaultProfile.expiration,
        region: defaultProfile.region,
        userId: defaultProfile.userId,
        userEmail: defaultProfile.userEmail,
      };
    }

    return null;
  }

  getCredentialsByUser(userId: string): StoredCredentials[] {
    const profiles = this.getAllProfiles();
    return profiles.filter(p => p.userId === userId);
  }

  getCredentialsByRegion(region: string): StoredCredentials[] {
    const profiles = this.getAllProfiles();
    return profiles.filter(p => p.region === region);
  }

  exportProfiles(): string {
    const profiles = this.getAllProfiles();
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      profiles: profiles.map(p => ({
        ...p,
        // Don't export sensitive data
        secretAccessKey: '[REDACTED]',
        sessionToken: p.sessionToken ? '[REDACTED]' : undefined,
      }))
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  async importProfiles(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.profiles || !Array.isArray(data.profiles)) {
        throw new Error('Invalid import data format');
      }

      const profiles = this.getAllProfiles();
      
      for (const importedProfile of data.profiles) {
        // Skip if profile already exists
        if (profiles.some(p => p.id === importedProfile.id)) {
          continue;
        }

        // Generate new ID and reset sensitive data
        const newProfile: StoredCredentials = {
          ...importedProfile,
          id: this.generateId(),
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
          isDefault: false,
          secretAccessKey: '', // Will need to be refreshed
          sessionToken: undefined,
        };

        profiles.push(newProfile);
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profiles));
    } catch (error) {
      console.error('Error importing profiles:', error);
      throw new Error('Failed to import profiles');
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  clearAllCredentials(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.DEFAULT_PROFILE_KEY);
  }

  getProfileStats(): {
    totalProfiles: number;
    activeProfiles: number;
    expiredProfiles: number;
    profilesByRegion: Record<string, number>;
  } {
    const profiles = this.getAllProfiles();
    const now = new Date();
    
    const stats = {
      totalProfiles: profiles.length,
      activeProfiles: 0,
      expiredProfiles: 0,
      profilesByRegion: {} as Record<string, number>
    };

    profiles.forEach(profile => {
      // Count by region
      stats.profilesByRegion[profile.region] = (stats.profilesByRegion[profile.region] || 0) + 1;
      
      // Check expiration
      if (profile.expiration && new Date(profile.expiration) < now) {
        stats.expiredProfiles++;
      } else {
        stats.activeProfiles++;
      }
    });

    return stats;
  }
}

export const awsCredentialsService = new AWSCredentialsService();