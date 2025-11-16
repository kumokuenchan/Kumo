import { GitServiceType } from '../services/GitServiceFactory';

interface GitStatus {
  filepath: string;
  index: string;
  workdir: string;
  stage: string;
}

interface GitCommit {
  oid: string;
  message: string;
  author: {
    name: string;
    email: string;
    timestamp: number;
    timezoneOffset: number;
  };
  committer: {
    name: string;
    email: string;
    timestamp: number;
    timezoneOffset: number;
  };
  parent: string[];
  tree: string;
}

interface GitBranch {
  name: string;
  current: boolean;
  commit: string;
}

interface GitRemote {
  name: string;
  url: string;
}

export class GitApiClient implements GitServiceType {
  private baseUrl: string;
  private dir: string;

  constructor(dir: string, baseUrl: string = '/api/git') {
    this.dir = dir;
    this.baseUrl = baseUrl;
  }

  async init(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dir: this.dir }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Failed to initialize git repository:', error);
      return false;
    }
  }

  async isRepository(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/status?dir=${encodeURIComponent(this.dir)}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.isRepository;
    } catch (error) {
      console.error('Failed to check if directory is a git repository:', error);
      return false;
    }
  }

  async getStatus(): Promise<GitStatus[]> {
    try {
      const response = await fetch(`${this.baseUrl}/status?dir=${encodeURIComponent(this.dir)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.status || [];
    } catch (error) {
      console.error('Failed to get git status:', error);
      return [];
    }
  }

  async add(files: string[]): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dir: this.dir, files }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Failed to add files:', error);
      return false;
    }
  }

  async addAll(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/add-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dir: this.dir }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Failed to add all files:', error);
      return false;
    }
  }

  async commit(message: string, authorName: string, authorEmail: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dir: this.dir, message, authorName, authorEmail }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Failed to commit:', error);
      return false;
    }
  }

  async getLog(limit: number = 10): Promise<GitCommit[]> {
    try {
      const response = await fetch(`${this.baseUrl}/log?dir=${encodeURIComponent(this.dir)}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.commits || [];
    } catch (error) {
      console.error('Failed to get git log:', error);
      return [];
    }
  }

  async getFileHistory(filepath: string, limit: number = 10): Promise<GitCommit[]> {
    try {
      const response = await fetch(`${this.baseUrl}/file-history?dir=${encodeURIComponent(this.dir)}&filepath=${encodeURIComponent(filepath)}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.commits || [];
    } catch (error) {
      console.error('Failed to get file history:', error);
      return [];
    }
  }

  async getBranches(): Promise<GitBranch[]> {
    try {
      const response = await fetch(`${this.baseUrl}/branches?dir=${encodeURIComponent(this.dir)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.branches || [];
    } catch (error) {
      console.error('Failed to get branches:', error);
      return [];
    }
  }

  async checkout(branch: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dir: this.dir, branch }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Failed to checkout branch:', error);
      return false;
    }
  }

  async createBranch(branch: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/branch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dir: this.dir, branch }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Failed to create branch:', error);
      return false;
    }
  }

  async deleteBranch(branch: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/branch/${encodeURIComponent(branch)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dir: this.dir }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Failed to delete branch:', error);
      return false;
    }
  }

  async getRemotes(): Promise<GitRemote[]> {
    try {
      const response = await fetch(`${this.baseUrl}/remotes?dir=${encodeURIComponent(this.dir)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.remotes || [];
    } catch (error) {
      console.error('Failed to get remotes:', error);
      return [];
    }
  }

  async addRemote(name: string, url: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/remote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dir: this.dir, name, url }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Failed to add remote:', error);
      return false;
    }
  }

  async fetch(remote: string = 'origin'): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/fetch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dir: this.dir, remote }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Failed to fetch:', error);
      return false;
    }
  }

  async pull(remote: string = 'origin', branch: string = 'main'): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dir: this.dir, remote, branch }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Failed to pull:', error);
      return false;
    }
  }

  async push(remote: string = 'origin', branch: string = 'main'): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dir: this.dir, remote, branch }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Failed to push:', error);
      return false;
    }
  }

  async getDiff(filepath: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/diff?dir=${encodeURIComponent(this.dir)}&filepath=${encodeURIComponent(filepath)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.diff || '';
    } catch (error) {
      console.error('Failed to get diff:', error);
      return '';
    }
  }

  async getAuthorInfo(): Promise<{ name: string; email: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/author-info?dir=${encodeURIComponent(this.dir)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { name: data.name, email: data.email };
    } catch (error) {
      console.error('Failed to get author info:', error);
      // Fallback to default values if the API call fails
      return { name: 'KumoDB User', email: 'user@kumodb.com' };
    }
  }

  async checkoutFile(filepath: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/checkout-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dir: this.dir, filepath }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Failed to checkout file:', error);
      return false;
    }
  }

  async checkoutAllFiles(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/checkout-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dir: this.dir }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Failed to checkout all files:', error);
      return false;
    }
  }

  async undoLastCommit(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/undo-last-commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dir: this.dir }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Failed to undo last commit:', error);
      return false;
    }
  }
}