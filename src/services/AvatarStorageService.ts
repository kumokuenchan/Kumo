export interface CustomAvatar {
  username: string;
  avatarUrl: string;
  uploadedAt: string;
}

class AvatarStorageService {
  private readonly STORAGE_KEY = 'custom_pr_avatars';

  // Get all custom avatars
  getCustomAvatars(): Record<string, CustomAvatar> {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Failed to parse custom avatars:', error);
      }
    }
    return {};
  }

  // Get avatar for a specific username
  getCustomAvatar(username: string): CustomAvatar | null {
    const avatars = this.getCustomAvatars();
    return avatars[username] || null;
  }

  // Save custom avatar for a username
  saveCustomAvatar(username: string, avatarUrl: string): void {
    const avatars = this.getCustomAvatars();
    avatars[username] = {
      username,
      avatarUrl,
      uploadedAt: new Date().toISOString(),
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(avatars));
  }

  // Remove custom avatar for a username
  removeCustomAvatar(username: string): void {
    const avatars = this.getCustomAvatars();
    delete avatars[username];
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(avatars));
  }

  // Upload image file and convert to data URL
  async uploadImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('File must be an image'));
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        reject(new Error('File size must be less than 5MB'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  // Get avatar URL for a user (custom or default)
  getAvatarUrl(username: string, defaultAvatarUrl?: string): string {
    const customAvatar = this.getCustomAvatar(username);
    return customAvatar?.avatarUrl || defaultAvatarUrl || '';
  }
}

export const avatarStorageService = new AvatarStorageService();