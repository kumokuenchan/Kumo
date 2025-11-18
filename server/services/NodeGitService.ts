import git from 'isomorphic-git';
import * as nodeHttp from 'isomorphic-git/http/node';
import * as fs from 'fs';
import * as path from 'path';

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

export class NodeGitService {
  private fs: typeof fs;
  private dir: string;
  private http: any;

  constructor(dir: string) {
    this.fs = fs;
    this.dir = dir;
    this.http = nodeHttp;
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
      await git.findRoot({
        fs: this.fs,
        filepath: this.dir,
      });
      return true;
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

      // Filter out unmodified files
      // A file is "modified" if it doesn't match the pattern [filepath, 1, 1, 1]
      // Pattern explanation: [filepath, HEAD, WORKDIR, STAGE]
      // 0 = absent, 1 = present and unmodified, 2 = present and modified, 3 = added
      const changedFiles = status.filter(([filepath, head, workdir, stage]) => {
        // File has changes if any of these conditions are true:
        // - Not in HEAD but in workdir (new file): head === 0 && workdir !== 0
        // - In HEAD but not in workdir (deleted): head !== 0 && workdir === 0
        // - Modified in workdir: workdir === 2
        // - Staged changes: stage !== head
        const hasChanges = head !== workdir || workdir !== stage || head === 0 || workdir === 0 || workdir === 2;
        return hasChanges;
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
      const branches = await git.listBranches({
        fs: this.fs,
        dir: this.dir,
      });

      const branchDetails = [];
      const currentBranch = await git.currentBranch({
        fs: this.fs,
        dir: this.dir,
        fullname: false,
      });

      for (const branch of branches) {
        const commit = await git.resolveRef({
          fs: this.fs,
          dir: this.dir,
          ref: `refs/heads/${branch}`,
        });

        branchDetails.push({
          name: branch,
          current: branch === currentBranch,
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
      // First check if remote exists
      const remotes = await this.getRemotes();
      const remoteExists = remotes.some(r => r.name === remote);

      if (!remoteExists) {
        throw new Error(`Remote '${remote}' does not exist. Please add a remote first.`);
      }

      // Get current branch if not specified
      let pushBranch = branch;
      if (!branch || branch === 'main') {
        const currentBranch = await git.currentBranch({
          fs: this.fs,
          dir: this.dir,
          fullname: false
        });
        if (currentBranch) {
          pushBranch = currentBranch;
        }
      }

      console.log(`Pushing to ${remote}/${pushBranch}...`);

      const result = await git.push({
        fs: this.fs,
        http: this.http,
        dir: this.dir,
        remote: remote,
        ref: pushBranch,
        onAuth: () => {
          // For now, return undefined to use anonymous access
          // In the future, this should prompt for credentials
          return undefined;
        },
      });

      console.log('Push result:', result);

      // Check if push was successful
      if (result && result.ok) {
        return true;
      } else if (result && result.errors) {
        console.error('Push failed with errors:', result.errors);
        throw new Error(`Push failed: ${JSON.stringify(result.errors)}`);
      } else {
        return true; // Assume success if no errors are reported
      }
    } catch (error) {
      console.error('Failed to push:', error);
      console.error('Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name
      });
      throw error; // Re-throw to pass detailed error to route handler
    }
  }

  async getDiff(filepath: string): Promise<string> {
    try {
      // Get the current branch HEAD
      const head = await git.resolveRef({
        fs: this.fs,
        dir: this.dir,
        ref: 'HEAD',
      });

      // Get the file content from the HEAD commit
      let oldContent = '';
      try {
        const oldFile = await git.readBlob({
          fs: this.fs,
          dir: this.dir,
          oid: head,
          filepath,
        });
        oldContent = new TextDecoder().decode(oldFile.blob);
      } catch (e) {
        // If file doesn't exist in HEAD (it's a new file), old content is empty
        oldContent = '';
      }

      // Get the current file content from the working directory
      let newContent = '';
      try {
        const fileBuffer = await this.fs.promises.readFile(`${this.dir}/${filepath}`);
        newContent = fileBuffer.toString();
      } catch (e) {
        // If file doesn't exist in working directory (it's deleted), new content is empty
        newContent = '';
      }

      // Import diff library dynamically
      const { createPatch } = await import('diff');

      // Generate unified diff with proper @@ headers and line numbers
      const patch = createPatch(
        filepath,
        oldContent,
        newContent,
        '', // old file header
        '', // new file header
        { context: 3 } // number of context lines (like git default)
      );

      // Remove the first 4 lines (file headers) to get just the hunks
      const lines = patch.split('\n');
      const diffLines = lines.slice(4).join('\n');

      return diffLines;
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
      let name = '';
      let email = '';

      // Try to get from local git config first
      try {
        const localName = await git.getConfig({
          fs: this.fs,
          dir: this.dir,
          path: 'user.name',
        });
        if (localName) name = localName;
      } catch (e) {
        // Ignore if config not found
      }

      try {
        const localEmail = await git.getConfig({
          fs: this.fs,
          dir: this.dir,
          path: 'user.email',
        });
        if (localEmail) email = localEmail;
      } catch (e) {
        // Ignore if config not found
      }

      // If not found in local config, try global git config from system
      if (!name || !email) {
        const os = await import('os');
        const path = await import('path');

        // Try to read global .gitconfig
        const globalConfigPath = path.join(os.homedir(), '.gitconfig');

        try {
          const configContent = await this.fs.promises.readFile(globalConfigPath, 'utf8');

          if (!name) {
            const nameMatch = configContent.match(/^\s*name\s*=\s*(.+)$/m);
            if (nameMatch) name = nameMatch[1].trim();
          }

          if (!email) {
            const emailMatch = configContent.match(/^\s*email\s*=\s*(.+)$/m);
            if (emailMatch) email = emailMatch[1].trim();
          }
        } catch (e) {
          // Global config not found or not readable
          console.log('Could not read global git config:', e);
        }
      }

      // If still not found, throw error instead of using fallback
      if (!name || !email) {
        const missing = [];
        if (!name) missing.push('user.name');
        if (!email) missing.push('user.email');

        throw new Error(
          `Git user configuration not found. Please set ${missing.join(' and ')} using:\n` +
          `git config --global user.name "Your Name"\n` +
          `git config --global user.email "your.email@example.com"`
        );
      }

      console.log('Using author info:', { name, email });
      return { name, email };
    } catch (error) {
      console.error('Failed to get author info:', error);
      throw error; // Re-throw to be handled by the caller
    }
  }

  async getCommitChanges(commitOid: string): Promise<any[]> {
    try {
      console.log(`[GitService] Getting commit changes for: ${commitOid}`);
      console.log(`[GitService] Directory: ${this.dir}`);

      const { execSync } = await import('child_process');

      // Get the commit to check if it has a parent
      let parentOid: string | null = null;
      try {
        const parentOutput = execSync(
          `git rev-parse ${commitOid}^`,
          { cwd: this.dir, encoding: 'utf8' }
        ).trim();
        parentOid = parentOutput;
        console.log(`[GitService] Parent commit: ${parentOid}`);
      } catch (e) {
        console.log(`[GitService] No parent commit - this is the first commit`);
        // No parent - this is the first commit
      }

      if (!parentOid) {
        // First commit - all files are added
        const diffOutput = execSync(
          `git diff-tree --no-commit-id --name-status --root ${commitOid}`,
          { cwd: this.dir, encoding: 'utf8' }
        );

        const changes = [];
        const lines = diffOutput.trim().split('\n').filter(l => l);

        for (const line of lines) {
          const [status, filepath] = line.split('\t');

          // For added files in first commit, count the lines
          const fileContent = execSync(
            `git show ${commitOid}:${filepath}`,
            { cwd: this.dir, encoding: 'utf8' }
          );
          const lineCount = fileContent.split('\n').length;

          changes.push({
            filepath,
            status: 'added',
            linesAdded: lineCount,
            linesRemoved: 0
          });
        }

        return changes;
      }

      // Get diff with parent
      const diffOutput = execSync(
        `git diff --numstat ${parentOid} ${commitOid}`,
        { cwd: this.dir, encoding: 'utf8' }
      );
      console.log(`[GitService] Numstat output:\n${diffOutput}`);

      const statusOutput = execSync(
        `git diff --name-status ${parentOid} ${commitOid}`,
        { cwd: this.dir, encoding: 'utf8' }
      );
      console.log(`[GitService] Name-status output:\n${statusOutput}`);

      // Parse status (A=added, M=modified, D=deleted, R=renamed)
      const statusMap = new Map<string, string>();
      const statusLines = statusOutput.trim().split('\n').filter(l => l);
      console.log(`[GitService] Found ${statusLines.length} status lines`);

      for (const line of statusLines) {
        const parts = line.split('\t');
        const status = parts[0];
        const filepath = parts[1];

        let statusStr = 'modified';
        if (status === 'A') statusStr = 'added';
        else if (status === 'D') statusStr = 'deleted';
        else if (status.startsWith('R')) statusStr = 'renamed';
        else if (status === 'M') statusStr = 'modified';

        console.log(`[GitService] File ${filepath}: status=${status} (${statusStr})`);
        statusMap.set(filepath, statusStr);
      }

      // Parse numstat (lines added, lines removed, filename)
      const changes = [];
      const lines = diffOutput.trim().split('\n').filter(l => l);
      console.log(`[GitService] Found ${lines.length} numstat lines`);

      for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length < 3) {
          console.log(`[GitService] Skipping invalid line: ${line}`);
          continue;
        }

        const added = parts[0] === '-' ? 0 : parseInt(parts[0], 10);
        const removed = parts[1] === '-' ? 0 : parseInt(parts[1], 10);
        const filepath = parts[2];

        const status = statusMap.get(filepath) || 'modified';

        console.log(`[GitService] Adding change: ${filepath} (+${added} -${removed}) [${status}]`);

        changes.push({
          filepath,
          status,
          linesAdded: added,
          linesRemoved: removed
        });
      }

      console.log(`[GitService] Total changes found: ${changes.length}`);
      return changes;
    } catch (error) {
      console.error('Failed to get commit changes:', error);
      throw error;
    }
  }

  private parseDiff(diff: string): any[] {
    if (!diff) return [];
    
    const changes = [];
    const diffLines = diff.split('\n');
    let currentFile: any = null;
    let linesAdded = 0;
    let linesRemoved = 0;

    for (const line of diffLines) {
      if (line.startsWith('diff --git')) {
        // Save previous file if exists
        if (currentFile) {
          changes.push({
            ...currentFile,
            linesAdded,
            linesRemoved
          });
        }
        
        // Start new file
        // Example: diff --git a/src/file.js b/src/file.js
        const match = line.match(/diff --git a\/(.+?) b\/(.+?)(\s|$)/);
        if (match) {
          const filepath = match[2];
          currentFile = {
            filepath,
            status: 'modified' // Default, will be updated
          };
          linesAdded = 0;
          linesRemoved = 0;
        }
      } else if (line.startsWith('new file mode')) {
        if (currentFile) {
          currentFile.status = 'added';
        }
      } else if (line.startsWith('deleted file mode')) {
        if (currentFile) {
          currentFile.status = 'deleted';
        }
      } else if (line.startsWith('--- /dev/null')) {
        if (currentFile) {
          currentFile.status = 'added';
        }
      } else if (line.startsWith('+++ /dev/null')) {
        if (currentFile) {
          currentFile.status = 'deleted';
        }
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        linesAdded++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        linesRemoved++;
      }
    }

    // Don't forget the last file
    if (currentFile) {
      changes.push({
        ...currentFile,
        linesAdded,
        linesRemoved
      });
    }

    return changes;
  }

  private parseDiff(diff: string): any[] {
    if (!diff) return [];

    const changes = [];
    const diffLines = diff.split('\n');
    let currentFile: any = null;
    let linesAdded = 0;
    let linesRemoved = 0;

    for (const line of diffLines) {
      if (line.startsWith('diff --git')) {
        // Save previous file if exists
        if (currentFile) {
          changes.push({
            ...currentFile,
            linesAdded,
            linesRemoved
          });
        }

        // Start new file
        // Example: diff --git a/src/file.js b/src/file.js
        const match = line.match(/diff --git a\/(.+?) b\/(.+?)(\s|$)/);
        if (match) {
          const filepath = match[2];
          currentFile = {
            filepath,
            status: 'modified' // Default, will be updated
          };
          linesAdded = 0;
          linesRemoved = 0;
        }
      } else if (line.startsWith('new file mode')) {
        if (currentFile) {
          currentFile.status = 'added';
        }
      } else if (line.startsWith('deleted file mode')) {
        if (currentFile) {
          currentFile.status = 'deleted';
        }
      } else if (line.startsWith('--- /dev/null')) {
        if (currentFile) {
          currentFile.status = 'added';
        }
      } else if (line.startsWith('+++ /dev/null')) {
        if (currentFile) {
          currentFile.status = 'deleted';
        }
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        linesAdded++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        linesRemoved++;
      }
    }

    // Don't forget the last file
    if (currentFile) {
      changes.push({
        ...currentFile,
        linesAdded,
        linesRemoved
      });
    }

    return changes;
  }

  async getCommitFileDiff(commitOid: string, filepath: string): Promise<string> {
    try {
      console.log(`[GitService] Getting diff for file ${filepath} in commit ${commitOid}`);

      const { execSync } = await import('child_process');

      // Get the parent commit
      let parentOid: string | null = null;
      try {
        const parentOutput = execSync(
          `git rev-parse ${commitOid}^`,
          { cwd: this.dir, encoding: 'utf8' }
        ).trim();
        parentOid = parentOutput;
      } catch (e) {
        // No parent - this is the first commit
        console.log(`[GitService] No parent commit - showing full file as added`);
      }

      let diffOutput: string;

      if (!parentOid) {
        // First commit - show the full file as added
        try {
          const fileContent = execSync(
            `git show ${commitOid}:${filepath}`,
            { cwd: this.dir, encoding: 'utf8' }
          );

          // Create a diff format showing all lines as added
          const lines = fileContent.split('\n');
          const diffLines = [
            `@@ -0,0 +1,${lines.length} @@`,
            ...lines.map(line => `+${line}`)
          ];
          diffOutput = diffLines.join('\n');
        } catch (e) {
          console.error(`[GitService] Error showing file from first commit:`, e);
          return '';
        }
      } else {
        // Get diff with parent
        try {
          diffOutput = execSync(
            `git diff ${parentOid} ${commitOid} -- "${filepath}"`,
            { cwd: this.dir, encoding: 'utf8' }
          );

          // Remove the file headers to get just the hunks
          const lines = diffOutput.split('\n');
          const hunkStart = lines.findIndex(line => line.startsWith('@@'));
          if (hunkStart !== -1) {
            diffOutput = lines.slice(hunkStart).join('\n');
          }
        } catch (e) {
          console.error(`[GitService] Error getting diff:`, e);
          return '';
        }
      }

      return diffOutput;
    } catch (error) {
      console.error('Failed to get commit file diff:', error);
      return '';
    }
  }
}