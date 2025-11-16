import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';

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

export class GitService {
  private fs: any;
  private dir: string;
  private http: any;

  constructor(dir: string, fs: any) {
    this.fs = fs;
    this.dir = dir;
    this.http = http;
  }

  async init(): Promise<boolean> {
    try {
      await git.init({
        fs: this.fs,
        dir: this.dir,
      });
      return true;
    } catch (error) {
      console.error('Failed to initialize git repository:', error);
      return false;
    }
  }

  async isRepository(): Promise<boolean> {
    try {
      const branches = await git.branches({
        fs: this.fs,
        dir: this.dir,
      });
      return branches.length > 0;
    } catch (error) {
      return false;
    }
  }

  async getStatus(): Promise<GitStatus[]> {
    try {
      const status = await git.statusMatrix({
        fs: this.fs,
        dir: this.dir,
      });

      // Filter to show only files with actual changes
      // A file has changes if workdir status differs from stage status (unstaged changes)
      // or if index status differs from workdir status (changes since last commit)
      const changedFiles = status.filter(([filepath, index, workdir, stage]) => {
        // Show file if there are unstaged changes (workdir !== stage) 
        // or if there are changes since last commit (index !== workdir)
        return workdir !== stage || index !== workdir;
      });

      return changedFiles.map(([filepath, index, workdir, stage]) => ({
        filepath,
        index: this.getStatusString(index),
        workdir: this.getStatusString(workdir),
        stage: this.getStatusString(stage),
      }));
    } catch (error) {
      console.error('Failed to get git status:', error);
      return [];
    }
  }

  private getStatusString(statusCode: number): string {
    const statusMap: { [key: number]: string } = {
      0: 'unmodified',
      1: 'unmodified',
      2: 'modified',
      3: 'deleted',
      4: 'added',
      5: 'untracked',
      6: 'ignored',
      7: 'intentToAdd',
      8: 'renamed', // Support for renamed files
    };

    return statusMap[statusCode] || 'unknown';
  }

  async add(files: string[]): Promise<boolean> {
    try {
      for (const file of files) {
        await git.add({
          fs: this.fs,
          dir: this.dir,
          filepath: file,
        });
      }
      return true;
    } catch (error) {
      console.error('Failed to add files:', error);
      return false;
    }
  }

  async addAll(): Promise<boolean> {
    try {
      await git.add({
        fs: this.fs,
        dir: this.dir,
        filepath: '.',
      });
      return true;
    } catch (error) {
      console.error('Failed to add all files:', error);
      return false;
    }
  }

  async commit(message: string, authorName: string, authorEmail: string): Promise<boolean> {
    try {
      await git.commit({
        fs: this.fs,
        dir: this.dir,
        message,
        author: {
          name: authorName,
          email: authorEmail,
        },
      });
      return true;
    } catch (error) {
      console.error('Failed to commit:', error);
      return false;
    }
  }

  async getLog(limit: number = 10): Promise<GitCommit[]> {
    try {
      const commits = await git.log({
        fs: this.fs,
        dir: this.dir,
        depth: limit,
      });

      return commits.map(commit => ({
        oid: commit.oid,
        message: commit.commit.message,
        author: {
          name: commit.commit.author.name,
          email: commit.commit.author.email,
          timestamp: commit.commit.author.timestamp,
          timezoneOffset: commit.commit.author.timezoneOffset,
        },
        committer: {
          name: commit.commit.committer.name,
          email: commit.commit.author.email,
          timestamp: commit.commit.committer.timestamp,
          timezoneOffset: commit.commit.committer.timezoneOffset,
        },
        parent: commit.commit.parent,
        tree: commit.commit.tree,
      }));
    } catch (error) {
      console.error('Failed to get git log:', error);
      return [];
    }
  }

  async getFileHistory(filepath: string, limit: number = 10): Promise<GitCommit[]> {
    try {
      const commits = await git.log({
        fs: this.fs,
        dir: this.dir,
        depth: limit,
        filepath: filepath,
      });

      return commits.map(commit => ({
        oid: commit.oid,
        message: commit.commit.message,
        author: {
          name: commit.commit.author.name,
          email: commit.commit.author.email,
          timestamp: commit.commit.author.timestamp,
          timezoneOffset: commit.commit.author.timezoneOffset,
        },
        committer: {
          name: commit.commit.committer.name,
          email: commit.commit.author.email,
          timestamp: commit.commit.committer.timestamp,
          timezoneOffset: commit.commit.committer.timezoneOffset,
        },
        parent: commit.commit.parent,
        tree: commit.commit.tree,
      }));
    } catch (error) {
      console.error('Failed to get file history:', error);
      return [];
    }
  }

  async getBranches(): Promise<GitBranch[]> {
    try {
      const branches = await git.branches({
        fs: this.fs,
        dir: this.dir,
      });

      const branchDetails = [];
      for (const branch of branches) {
        const commit = await git.resolveRef({
          fs: this.fs,
          dir: this.dir,
          ref: branch,
        });

        branchDetails.push({
          name: branch,
          current: await git.currentBranch({
            fs: this.fs,
            dir: this.dir,
            fullname: false,
          }) === branch,
          commit: commit,
        });
      }

      return branchDetails;
    } catch (error) {
      console.error('Failed to get branches:', error);
      return [];
    }
  }

  async checkout(branch: string): Promise<boolean> {
    try {
      await git.checkout({
        fs: this.fs,
        dir: this.dir,
        ref: branch,
      });
      return true;
    } catch (error) {
      console.error('Failed to checkout branch:', error);
      return false;
    }
  }

  async checkoutFile(filepath: string): Promise<boolean> {
    try {
      // To discard changes, we checkout the file from HEAD
      await git.checkout({
        fs: this.fs,
        dir: this.dir,
        filepaths: [filepath],
        ref: 'HEAD',
      });
      return true;
    } catch (error) {
      console.error('Failed to checkout file:', error);
      return false;
    }
  }

  async checkoutAllFiles(): Promise<boolean> {
    try {
      // To discard all changes, we checkout all files from HEAD
      await git.checkout({
        fs: this.fs,
        dir: this.dir,
        filepaths: ['.'],
        ref: 'HEAD',
      });
      return true;
    } catch (error) {
      console.error('Failed to checkout all files:', error);
      return false;
    }
  }

  async createBranch(branch: string): Promise<boolean> {
    try {
      await git.branch({
        fs: this.fs,
        dir: this.dir,
        ref: branch,
      });
      return true;
    } catch (error) {
      console.error('Failed to create branch:', error);
      return false;
    }
  }

  async deleteBranch(branch: string): Promise<boolean> {
    try {
      await git.deleteBranch({
        fs: this.fs,
        dir: this.dir,
        ref: branch,
      });
      return true;
    } catch (error) {
      console.error('Failed to delete branch:', error);
      return false;
    }
  }

  async getRemotes(): Promise<GitRemote[]> {
    try {
      const remotes = await git.listRemotes({
        fs: this.fs,
        dir: this.dir,
      });

      return remotes.map(remote => ({
        name: remote.remote,
        url: remote.url,
      }));
    } catch (error) {
      console.error('Failed to get remotes:', error);
      return [];
    }
  }

  async addRemote(name: string, url: string): Promise<boolean> {
    try {
      await git.addRemote({
        fs: this.fs,
        dir: this.dir,
        remote: name,
        url: url,
      });
      return true;
    } catch (error) {
      console.error('Failed to add remote:', error);
      return false;
    }
  }

  async fetch(remote: string = 'origin'): Promise<boolean> {
    try {
      await git.fetch({
        fs: this.fs,
        http: this.http,
        dir: this.dir,
        remote: remote,
      });
      return true;
    } catch (error) {
      console.error('Failed to fetch:', error);
      return false;
    }
  }

  async pull(remote: string = 'origin', branch: string = 'main'): Promise<boolean> {
    try {
      await git.pull({
        fs: this.fs,
        http: this.http,
        dir: this.dir,
        remote: remote,
        ref: branch,
        author: {
          name: 'KumoDB User',
          email: 'user@kumodb.com',
        },
      });
      return true;
    } catch (error) {
      console.error('Failed to pull:', error);
      return false;
    }
  }

  async push(remote: string = 'origin', branch: string = 'main'): Promise<boolean> {
    try {
      await git.push({
        fs: this.fs,
        http: this.http,
        dir: this.dir,
        remote: remote,
        ref: branch,
      });
      return true;
    } catch (error) {
      console.error('Failed to push:', error);
      return false;
    }
  }

  async getDiff(filepath: string): Promise<string> {
    try {
      const diff = await git.diff({
        fs: this.fs,
        dir: this.dir,
        filepath,
      });
      return diff || '';
    } catch (error) {
      console.error('Failed to get diff:', error);
      return '';
    }
  }

  async getTree(oid: string): Promise<any> {
    try {
      const tree = await git.readTree({
        fs: this.fs,
        dir: this.dir,
        oid,
      });
      return tree;
    } catch (error) {
      console.error('Failed to read tree:', error);
      return null;
    }
  }

  async undoLastCommit(): Promise<boolean> {
    try {
      // Perform a soft reset to HEAD~1, which keeps changes in working directory
      await git.resetIndex({
        fs: this.fs,
        dir: this.dir,
        ref: 'HEAD~1',
      });
      return true;
    } catch (error) {
      console.error('Failed to undo last commit:', error);
      return false;
    }
  }

  async getHead(): Promise<string | null> {
    try {
      return await git.resolveRef({
        fs: this.fs,
        dir: this.dir,
        ref: 'HEAD',
      });
    } catch (error) {
      console.error('Failed to get HEAD:', error);
      return null;
    }
  }

  async getSyncStatus(): Promise<{ ahead: number; behind: number }> {
    try {
      // Get current branch
      const currentBranch = await git.currentBranch({
        fs: this.fs,
        dir: this.dir,
        fullname: false,
      });

      if (!currentBranch) {
        return { ahead: 0, behind: 0 };
      }

      // Get the commit hash of the current branch
      const localCommit = await git.resolveRef({
        fs: this.fs,
        dir: this.dir,
        ref: `refs/heads/${currentBranch}`,
      });

      // Get the commit hash of the remote tracking branch
      let remoteCommit = '';
      try {
        remoteCommit = await git.resolveRef({
          fs: this.fs,
          dir: this.dir,
          ref: `refs/remotes/origin/${currentBranch}`,
        });
      } catch (error) {
        // Remote branch doesn't exist yet
        return { ahead: 0, behind: 0 };
      }

      // If both commits are the same, we're up to date
      if (localCommit === remoteCommit) {
        return { ahead: 0, behind: 0 };
      }

      // Get the commits that are ahead (local but not in remote)
      let aheadCommits = 0;
      try {
        const aheadLog = await git.log({
          fs: this.fs,
          dir: this.dir,
          ref: `refs/heads/${currentBranch}`,
          since: remoteCommit,
        });
        aheadCommits = aheadLog.length;
      } catch (error) {
        // Ignore errors in log retrieval
      }

      // Get the commits that are behind (remote but not in local)
      let behindCommits = 0;
      try {
        const behindLog = await git.log({
          fs: this.fs,
          dir: this.dir,
          ref: `refs/remotes/origin/${currentBranch}`,
          since: localCommit,
        });
        behindCommits = behindLog.length;
      } catch (error) {
        // Ignore errors in log retrieval
      }

      return { ahead: aheadCommits, behind: behindCommits };
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return { ahead: 0, behind: 0 };
    }
  }

  async getAuthorInfo(): Promise<{ name: string; email: string }> {
    try {
      // Try to get from git config, fallback to default
      let name = 'KumoDB User';
      let email = 'user@kumodb.com';
      
      try {
        name = await git.getConfig({
          fs: this.fs,
          dir: this.dir,
          path: 'user.name',
        }) || name;
      } catch (e) {
        // Ignore if config not found
      }
      
      try {
        email = await git.getConfig({
          fs: this.fs,
          dir: this.dir,
          path: 'user.email',
        }) || email;
      } catch (e) {
        // Ignore if config not found
      }
      
      return { name, email };
    } catch (error) {
      console.error('Failed to get author info:', error);
      return { name: 'KumoDB User', email: 'user@kumodb.com' };
    }
  }
}