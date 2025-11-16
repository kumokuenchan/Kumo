import React, { createContext, useContext, useState, useEffect } from 'react';
import { GitServiceFactory, GitServiceType } from '../../services/GitServiceFactory';
import { GitService } from '../../services/GitService';

interface GitContextType {
  gitService: GitServiceType | null;
  currentDir: string;
  setCurrentDir: (dir: string) => void;
  isInitialized: boolean;
  refresh: () => void;
}

const GitContext = createContext<GitContextType | undefined>(undefined);

export const GitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentDir, setCurrentDir] = useState<string>(() => {
    return localStorage.getItem('gitCurrentDir') || '/Users/kuen/KumoDB';
  });
  const [gitService, setGitService] = useState<GitServiceType | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeGitService = async () => {
      setLoading(true);

      try {
        console.log('[GitContext] Initializing Git service for directory:', currentDir);

        // Create Git service based on environment
        let service: GitServiceType;

        if (GitServiceFactory.isElectron()) {
          console.log('[GitContext] Running in Electron mode');
          // Electron environment - use Node.js implementation
          service = await GitServiceFactory.createGitService(currentDir);
        } else {
          console.log('[GitContext] Running in Browser mode');
          // Browser environment - always use GitApiClient that talks to backend
          service = await GitServiceFactory.createGitService(currentDir);
        }

        console.log('[GitContext] Git service created:', service.constructor.name);
        setGitService(service);

        // Check if repository is initialized
        console.log('[GitContext] Checking if repository is initialized...');
        const initialized = await service.isRepository();
        console.log('[GitContext] Repository initialized:', initialized);
        setIsInitialized(initialized);
      } catch (error) {
        console.error('[GitContext] Failed to initialize Git service:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeGitService();
  }, [currentDir, refreshKey]);

  const refresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    localStorage.setItem('gitCurrentDir', currentDir);
  }, [currentDir]);

  return (
    <GitContext.Provider
      value={{
        gitService,
        currentDir,
        setCurrentDir,
        isInitialized,
        refresh
      }}
    >
      {children}
    </GitContext.Provider>
  );
};

export const useGit = (): GitContextType => {
  const context = useContext(GitContext);
  if (context === undefined) {
    throw new Error('useGit must be used within a GitProvider');
  }
  return context;
};