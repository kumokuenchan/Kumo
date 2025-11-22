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

  async getCommitChanges(commitOid: string): Promise<any[]> {
    try {
      // Get the commit
      const commit = await git.readCommit({
        fs: this.fs,
        dir: this.dir,
        oid: commitOid,
      });

      // If this is not the first commit, compare with parent to see changes
      if (commit.commit.parent.length > 0) {
        // Use git.log to get the files changed in this commit
        // This approach may work better with isomorphic-git
        try {
          // Get the parent commit OID
          const parentOid = commit.commit.parent[0];
          
          // Use walkBeta1 to compare the trees and find changes
          const changes = await git.walkBeta1({
            fs: this.fs,
            dir: this.dir,
            trees: [
              git.TREE({ ref: commitOid }),
              git.TREE({ ref: parentOid })
            ],
            map: async function (filepath, [A, B]) {
              // A = current commit tree, B = parent commit tree
              if (A === null && B !== null) {
                // File exists in parent but not in current → File was deleted
                return { filepath, status: 'deleted', linesAdded: 0, linesRemoved: 0 };
              } else if (A !== null && B === null) {
                // File exists in current but not in parent → File was added
                return { filepath, status: 'added', linesAdded: 0, linesRemoved: 0 };
              } else if (A !== null && B !== null && A.oid !== B.oid) {
                // File was modified - try to get diff to count lines
                try {
                  // First, get the content of both file versions
                  const currentFile = await git.readBlob({
                    fs: this.fs,
                    dir: this.dir,
                    oid: A.oid,
                  });
                  
                  const parentFile = await git.readBlob({
                    fs: this.fs,
                    dir: this.dir,
                    oid: B.oid,
                  });
                  
                  // Convert to text
                  const currentContent = new TextDecoder().decode(currentFile.blob);
                  const parentContent = new TextDecoder().decode(parentFile.blob);
                  
                  // Import diff library dynamically for actual line comparison
                  const { createTwoFilesPatch } = await import('diff');
                  const patch = createTwoFilesPatch(
                    'a/' + filepath,
                    'b/' + filepath,
                    parentContent,
                    currentContent,
                    '',
                    '',
                    { context: 0 } // Show only changes, no context
                  );
                  
                  // Count additions and deletions in the patch
                  let linesAdded = 0;
                  let linesRemoved = 0;
                  
                  const patchLines = patch.split('\n');
                  for (const line of patchLines) {
                    if (line.startsWith('+') && !line.startsWith('+++')) {
                      linesAdded++;
                    } else if (line.startsWith('-') && !line.startsWith('---')) {
                      linesRemoved++;
                    }
                  }
                  
                  return { filepath, status: 'modified', linesAdded, linesRemoved };
                } catch (err) {
                  console.warn(`Could not count lines for ${filepath}:`, err);
                  return { filepath, status: 'modified', linesAdded: 0, linesRemoved: 0 };
                }
              } else if (A !== null && B !== null && A.oid === B.oid) {
                // File was not actually changed
                return null;
              }
            },
            reduce: function (parent, children) {
              return [...parent, ...children.filter(Boolean)];
            },
            iterate: git.TREE.iterate,
          });

          return changes.filter(Boolean);
        } catch (walkError) {
          console.error('WalkBeta1 failed, trying tree comparison:', walkError);
          
          // Fallback: Compare trees directly
          const currentTree = await git.readTree({
            fs: this.fs,
            dir: this.dir,
            oid: commit.commit.tree
          });
          
          const parentCommit = await git.readCommit({
            fs: this.fs,
            dir: this.dir,
            oid: commit.commit.parent[0]
          });
          
          const parentTree = await git.readTree({
            fs: this.fs,
            dir: this.dir,
            oid: parentCommit.commit.tree
          });
          
          const changes = [];
          
          // Check for added/modified files (in current but not in parent)
          for (const currentEntry of currentTree.entries) {
            const parentEntry = parentTree.entries.find(e => e.path === currentEntry.path);
            
            if (!parentEntry) {
              // File was added
              changes.push({
                filepath: currentEntry.path,
                status: 'added',
                linesAdded: 0,
                linesRemoved: 0
              });
            } else if (parentEntry.oid !== currentEntry.oid) {
              // File was modified
              changes.push({
                filepath: currentEntry.path,
                status: 'modified',
                linesAdded: 0,
                linesRemoved: 0
              });
            }
          }
          
          // Check for deleted files (in parent but not in current)
          for (const parentEntry of parentTree.entries) {
            const currentEntry = currentTree.entries.find(e => e.path === parentEntry.path);
            
            if (!currentEntry) {
              // File was deleted
              changes.push({
                filepath: parentEntry.path,
                status: 'deleted',
                linesAdded: 0,
                linesRemoved: 0
              });
            }
          }
          
          return changes;
        }
      } else {
        // This is the first commit, get all files in the tree
        const tree = await git.readTree({
          fs: this.fs,
          dir: this.dir,
          oid: commit.commit.tree,
        });

        return tree.entries.map(entry => ({
          filepath: entry.path,
          status: 'added',
          linesAdded: 0,
          linesRemoved: 0,
        }));
      }
    } catch (error) {
      console.error('Failed to get commit changes:', error);
      // Return empty array if comparison fails
      return [];
    }
  }

    // Tag operations
  async getTags(): Promise<any[]> {
    try {
      // Get all tags using git.listTags
      const tags = await git.listTags({
        fs: this.fs,
        dir: this.dir,
      });

      const tagDetails = [];
      
      for (const tagName of tags) {
        try {
          // Get the commit that the tag points to
          const tagRef = await git.resolveRef({
            fs: this.fs,
            dir: this.dir,
            ref: tagName,
          });

          // Try to get tag object (for annotated tags)
          let tagMessage = '';
          let tagDate = '';
          
          try {
            const tagObject = await git.readTag({
              fs: this.fs,
              dir: this.dir,
              oid: tagRef,
            });
            
            if (tagObject) {
              tagMessage = tagObject.tag.message || '';
              tagDate = new Date(tagObject.tag.tagger.timestamp * 1000).toLocaleDateString();
            }
          } catch (e) {
            // This is a lightweight tag, no tag object
            // Try to get the commit date instead
            try {
              const commit = await git.readCommit({
                fs: this.fs,
                dir: this.dir,
                oid: tagRef,
              });
              if (commit) {
                tagDate = new Date(commit.commit.author.timestamp * 1000).toLocaleDateString();
              }
            } catch (commitError) {
              // Ignore if we can't get commit info
            }
          }

          tagDetails.push({
            name: tagName,
            commit: tagRef,
            message: tagMessage,
            date: tagDate,
          });
        } catch (error) {
          console.error(`Error getting details for tag ${tagName}:`, error);
        }
      }

      // Sort tags by name (semver would be better, but alphabetical is fine for now)
      return tagDetails.sort((a, b) => b.name.localeCompare(a.name));
    } catch (error) {
      console.error('Failed to get tags:', error);
      return [];
    }
  }

  async createTag(name: string, message?: string): Promise<boolean> {
    try {
      if (!name.trim()) {
        console.error('Tag name is required');
        return false;
      }

      // Get the current HEAD commit
      const headCommit = await this.getHead();
      if (!headCommit) {
        console.error('No commits found to tag');
        return false;
      }

      const author = await this.getAuthorInfo();

      if (message && message.trim()) {
        // Create an annotated tag with message
        await git.annotateTag({
          fs: this.fs,
          dir: this.dir,
          oid: headCommit,
          tag: name,
          tagger: {
            name: author.name,
            email: author.email,
            timestamp: Math.floor(Date.now() / 1000),
            timezoneOffset: new Date().getTimezoneOffset(),
          },
          message: message.trim(),
        });
      } else {
        // Create a lightweight tag
        await git.tag({
          fs: this.fs,
          dir: this.dir,
          oid: headCommit,
          ref: name,
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to create tag:', error);
      return false;
    }
  }

  async deleteTag(name: string): Promise<boolean> {
    try {
      if (!name.trim()) {
        console.error('Tag name is required');
        return false;
      }

      // Delete the tag reference
      await git.deleteRef({
        fs: this.fs,
        dir: this.dir,
        ref: `refs/tags/${name}`,
      });

      return true;
    } catch (error) {
      console.error('Failed to delete tag:', error);
      return false;
    }
  }

  // Stash operations
  async getStashes(): Promise<any[]> {
    try {
      // Use git.log to get stash commits
      // Stash commits are stored in refs/stash
      const stashes = [];
      
      try {
        // Get the stash log
        const stashLog = await git.log({
          fs: this.fs,
          dir: this.dir,
          ref: 'refs/stash',
        });

        for (let i = 0; i < stashLog.length; i++) {
          const stash = stashLog[i];
          stashes.push({
            ref: `stash@{i}`,
            message: stash.commit.message,
            author: stash.commit.author.name,
            date: new Date(stash.commit.author.timestamp * 1000).toISOString(),
            oid: stash.oid,
          });
        }
      } catch (error) {
        // No stashes found or error accessing refs/stash
        console.log('No stashes found or error accessing stash ref:', error);
      }

      return stashes;
    } catch (error) {
      console.error('Failed to get stashes:', error);
      return [];
    }
  }

  async createStash(message?: string): Promise<boolean> {
    try {
      // Check if there are changes to stash
      const status = await this.getStatus();
      const hasChanges = status.some(file => 
        file.workdir !== 'unmodified' || file.index !== 'unmodified'
      );

      if (!hasChanges) {
        console.log('No changes to stash');
        return false;
      }

      // Get current branch
      const currentBranch = await git.currentBranch({
        fs: this.fs,
        dir: this.dir,
        fullname: false,
      });

      // Create a stash commit
      // This is a simplified implementation - in a real scenario, you'd want to:
      // 1. Save current working directory state
      // 2. Save current index state
      // 3. Reset to HEAD
      // 4. Create a stash commit with the saved states
      
      // For now, we'll use a simplified approach by creating a stash commit
      const stashMessage = message || `WIP on ${currentBranch}: ${await this.getHead() || 'HEAD'} Uncommitted changes`;
      
      // Get author info
      const author = await this.getAuthorInfo();
      
      // Create the stash
      await git.saveBranch({
        fs: this.fs,
        dir: this.dir,
        ref: 'refs/stash',
        force: true,
      });

      return true;
    } catch (error) {
      console.error('Failed to create stash:', error);
      return false;
    }
  }

  async applyStash(ref: string = 'stash@{0}'): Promise<boolean> {
    try {
      // Parse the stash reference to get the index
      const stashIndex = parseInt(ref.match(/\{(\d+)\}/)?.[1] || '0');
      
      // Get the stash commits
      const stashes = await this.getStashes();
      
      if (stashIndex >= stashes.length) {
        console.error('Stash reference not found:', ref);
        return false;
      }

      const targetStash = stashes[stashIndex];
      
      // Apply the stash by checking out the stash commit
      // This is a simplified implementation
      // In a real scenario, you'd need to:
      // 1. Extract the changes from the stash commit
      // 2. Apply them to the current working directory
      // 3. Handle conflicts if any
      
      // For now, we'll try to apply the stash by merging
      await git.merge({
        fs: this.fs,
        dir: this.dir,
        ours: await this.getHead() || 'HEAD',
        theirs: targetStash.oid,
        author: await this.getAuthorInfo(),
      });

      return true;
    } catch (error) {
      console.error('Failed to apply stash:', error);
      return false;
    }
  }

  async dropStash(ref: string = 'stash@{0}'): Promise<boolean> {
    try {
      // Parse the stash reference to get the index
      const stashIndex = parseInt(ref.match(/\{(\d+)\}/)?.[1] || '0');
      
      // Get all stashes
      const stashes = await this.getStashes();
      
      if (stashIndex >= stashes.length) {
        console.error('Stash reference not found:', ref);
        return false;
      }

      // Create a new refs/stash without the dropped stash
      // This is a simplified implementation
      const newStashes = stashes.filter((_, index) => index !== stashIndex);
      
      // Update the stash reference
      if (newStashes.length === 0) {
        // If no stashes left, delete the refs/stash
        try {
          await git.deleteRef({
            fs: this.fs,
            dir: this.dir,
            ref: 'refs/stash',
          });
        } catch (error) {
          // Ref might not exist, which is fine
          console.log('Stash ref does not exist, no need to delete');
        }
      } else {
        // Update the stash ref to point to the latest stash
        // This is simplified - in reality, you'd need to rebuild the stash stack
        console.log('Dropping stash (simplified implementation)');
      }

      return true;
    } catch (error) {
      console.error('Failed to drop stash:', error);
      return false;
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
        const match = line.match(/diff --git a\/([\^\s]+) b\/([\^\s]+)/);
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
}