import { GitService } from './GitService';
import { GitApiClient } from '../api/git';

// Type definitions
export type GitServiceType = GitService | any | GitApiClient; // Using 'any' for NodeGitService to avoid import issues in browser

export class GitServiceFactory {
  static async createGitService(dir: string, fs?: any): Promise<GitServiceType> {
    // Check if we're in an Electron environment (Node.js available)
    if (this.isElectron()) {
      // Electron environment - dynamically import Node.js implementation
      // For now, just return GitApiClient for all environments to avoid build issues
      // The NodeGitService is used server-side only in the API routes
      return new GitApiClient(dir);
    }
    
    // Browser environment - use GitApiClient that communicates with backend
    return new GitApiClient(dir);
  }
  
  static isElectron(): boolean {
    // Check if we're in Electron
    return typeof window !== 'undefined' && 
           (window as any).process && 
           (window as any).process.type && 
           (window as any).process.versions && 
           (window as any).process.versions.electron;
  }
}