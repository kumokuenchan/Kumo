import { Router } from 'express';
import { NodeGitService } from '../services/NodeGitService.js';

const router = Router();

// POST initialize repository
router.post('/init', async (req, res) => {
  try {
    const { dir } = req.body;
    
    if (!dir) {
      return res.status(400).json({ error: 'Directory path is required' });
    }

    const gitService = new NodeGitService(dir);
    const success = await gitService.init();
    
    if (success) {
      res.json({ 
        success: true,
        message: 'Git repository initialized successfully'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to initialize Git repository' 
      });
    }
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to initialize Git repository',
      message: error.message
    });
  }
});

// GET repository status
router.get('/status', async (req, res) => {
  try {
    const { dir } = req.query;
    
    if (!dir) {
      return res.status(400).json({ error: 'Directory path is required' });
    }

    const gitService = new NodeGitService(dir as string);
    const isRepo = await gitService.isRepository();
    
    if (!isRepo) {
      return res.json({ 
        isRepository: false,
        status: []
      });
    }

    const status = await gitService.getStatus();
    
    res.json({ 
      isRepository: true,
      status
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get repository status',
      message: error.message
    });
  }
});

// POST add files
router.post('/add', async (req, res) => {
  try {
    const { dir, files } = req.body;
    
    if (!dir || !files) {
      return res.status(400).json({ error: 'Directory path and files are required' });
    }

    const gitService = new NodeGitService(dir);
    const success = await gitService.add(files);
    
    if (success) {
      res.json({ 
        success: true,
        message: 'Files added to staging area'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to add files to staging area' 
      });
    }
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to add files to staging area',
      message: error.message
    });
  }
});

// POST add all files
router.post('/add-all', async (req, res) => {
  try {
    const { dir } = req.body;
    
    if (!dir) {
      return res.status(400).json({ error: 'Directory path is required' });
    }

    const gitService = new NodeGitService(dir);
    const success = await gitService.addAll();
    
    if (success) {
      res.json({ 
        success: true,
        message: 'All files added to staging area'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to add all files to staging area' 
      });
    }
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to add all files to staging area',
      message: error.message
    });
  }
});

// POST commit
router.post('/commit', async (req, res) => {
  try {
    const { dir, message, authorName, authorEmail } = req.body;

    if (!dir || !message) {
      return res.status(400).json({ error: 'Directory path and commit message are required' });
    }

    const gitService = new NodeGitService(dir);

    // If author info not provided, try to get it from git config
    let name = authorName;
    let email = authorEmail;

    if (!name || !email) {
      try {
        const authorInfo = await gitService.getAuthorInfo();
        name = name || authorInfo.name;
        email = email || authorInfo.email;
      } catch (configError: any) {
        // Return helpful error message about missing git config
        return res.status(400).json({
          error: 'Git configuration required',
          message: configError.message
        });
      }
    }

    const success = await gitService.commit(message, name, email);

    if (success) {
      res.json({
        success: true,
        message: 'Changes committed successfully'
      });
    } else {
      res.status(500).json({
        error: 'Failed to commit changes'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to commit changes',
      message: error.message
    });
  }
});

// GET commit log
router.get('/log', async (req, res) => {
  try {
    const { dir, limit } = req.query;
    
    if (!dir) {
      return res.status(400).json({ error: 'Directory path is required' });
    }

    const gitService = new NodeGitService(dir as string);
    const isRepo = await gitService.isRepository();
    
    if (!isRepo) {
      return res.json({ commits: [] });
    }

    const commits = await gitService.getLog(limit ? parseInt(limit as string) : 10);
    
    res.json({ commits });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get commit log',
      message: error.message
    });
  }
});

// GET branches
router.get('/branches', async (req, res) => {
  try {
    const { dir } = req.query;
    
    if (!dir) {
      return res.status(400).json({ error: 'Directory path is required' });
    }

    const gitService = new NodeGitService(dir as string);
    const isRepo = await gitService.isRepository();
    
    if (!isRepo) {
      return res.json({ branches: [] });
    }

    const branches = await gitService.getBranches();
    
    res.json({ branches });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get branches',
      message: error.message
    });
  }
});

// POST checkout branch
router.post('/checkout', async (req, res) => {
  try {
    const { dir, branch } = req.body;
    
    if (!dir || !branch) {
      return res.status(400).json({ error: 'Directory path and branch name are required' });
    }

    const gitService = new NodeGitService(dir);
    const success = await gitService.checkout(branch);
    
    if (success) {
      res.json({ 
        success: true,
        message: `Switched to branch ${branch}`
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to checkout branch' 
      });
    }
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to checkout branch',
      message: error.message
    });
  }
});

// POST create branch
router.post('/branch', async (req, res) => {
  try {
    const { dir, branch } = req.body;
    
    if (!dir || !branch) {
      return res.status(400).json({ error: 'Directory path and branch name are required' });
    }

    const gitService = new NodeGitService(dir);
    const success = await gitService.createBranch(branch);
    
    if (success) {
      res.json({ 
        success: true,
        message: `Branch ${branch} created successfully`
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to create branch' 
      });
    }
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to create branch',
      message: error.message
    });
  }
});

// DELETE branch
router.delete('/branch/:name', async (req, res) => {
  try {
    const { dir } = req.body;
    const { name } = req.params;
    
    if (!dir || !name) {
      return res.status(400).json({ error: 'Directory path and branch name are required' });
    }

    const gitService = new NodeGitService(dir);
    const success = await gitService.deleteBranch(name);
    
    if (success) {
      res.json({ 
        success: true,
        message: `Branch ${name} deleted successfully`
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to delete branch' 
      });
    }
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to delete branch',
      message: error.message
    });
  }
});

// GET remotes
router.get('/remotes', async (req, res) => {
  try {
    const { dir } = req.query;
    
    if (!dir) {
      return res.status(400).json({ error: 'Directory path is required' });
    }

    const gitService = new NodeGitService(dir as string);
    const isRepo = await gitService.isRepository();
    
    if (!isRepo) {
      return res.json({ remotes: [] });
    }

    const remotes = await gitService.getRemotes();
    
    res.json({ remotes });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get remotes',
      message: error.message
    });
  }
});

// POST add remote
router.post('/remote', async (req, res) => {
  try {
    const { dir, name, url } = req.body;
    
    if (!dir || !name || !url) {
      return res.status(400).json({ error: 'Directory path, remote name, and URL are required' });
    }

    const gitService = new NodeGitService(dir);
    const success = await gitService.addRemote(name, url);
    
    if (success) {
      res.json({ 
        success: true,
        message: `Remote ${name} added successfully`
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to add remote' 
      });
    }
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to add remote',
      message: error.message
    });
  }
});

// POST fetch
router.post('/fetch', async (req, res) => {
  try {
    const { dir, remote } = req.body;
    
    if (!dir) {
      return res.status(400).json({ error: 'Directory path is required' });
    }

    const gitService = new NodeGitService(dir);
    const success = await gitService.fetch(remote || 'origin');
    
    if (success) {
      res.json({ 
        success: true,
        message: 'Fetch completed successfully'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to fetch' 
      });
    }
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch',
      message: error.message
    });
  }
});

// POST pull
router.post('/pull', async (req, res) => {
  try {
    const { dir, remote, branch } = req.body;
    
    if (!dir) {
      return res.status(400).json({ error: 'Directory path is required' });
    }

    const gitService = new NodeGitService(dir);
    const success = await gitService.pull(remote || 'origin', branch || 'main');
    
    if (success) {
      res.json({ 
        success: true,
        message: 'Pull completed successfully'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to pull' 
      });
    }
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to pull',
      message: error.message
    });
  }
});

// POST push
router.post('/push', async (req, res) => {
  try {
    const { dir, remote, branch } = req.body;

    if (!dir) {
      return res.status(400).json({ error: 'Directory path is required' });
    }

    const gitService = new NodeGitService(dir);

    try {
      const success = await gitService.push(remote || 'origin', branch);

      if (success) {
        res.json({
          success: true,
          message: 'Push completed successfully'
        });
      } else {
        res.status(500).json({
          error: 'Failed to push',
          message: 'Push operation failed. Check server logs for more details.'
        });
      }
    } catch (pushError: any) {
      // Handle specific git errors
      let userMessage = pushError.message;

      if (pushError.message.includes('Remote') && pushError.message.includes('does not exist')) {
        userMessage = pushError.message;
      } else if (pushError.message.includes('authentication') || pushError.message.includes('credentials')) {
        userMessage = 'Authentication required. Please configure Git credentials.';
      } else if (pushError.message.includes('rejected')) {
        userMessage = 'Push rejected. Try pulling the latest changes first.';
      } else if (pushError.message.includes('timeout')) {
        userMessage = 'Connection timeout. Check your internet connection.';
      }

      res.status(500).json({
        error: 'Failed to push',
        message: userMessage
      });
    }
  } catch (error: any) {
    console.error('Push error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    res.status(500).json({
      error: 'Failed to push',
      message: error.message || 'Unknown error occurred during push operation'
    });
  }
});

// POST checkout file (to discard changes)
router.post('/checkout-file', async (req, res) => {
  try {
    const { dir, filepath } = req.body;
    
    if (!dir || !filepath) {
      return res.status(400).json({ error: 'Directory path and filepath are required' });
    }

    const gitService = new NodeGitService(dir);
    const success = await gitService.checkoutFile(filepath);
    
    if (success) {
      res.json({ 
        success: true,
        message: 'File checked out successfully'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to checkout file' 
      });
    }
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to checkout file',
      message: error.message
    });
  }
});

// POST checkout all files (to discard all changes)
router.post('/checkout-all', async (req, res) => {
  try {
    const { dir } = req.body;
    
    if (!dir) {
      return res.status(400).json({ error: 'Directory path is required' });
    }

    const gitService = new NodeGitService(dir);
    const success = await gitService.checkoutAllFiles();
    
    if (success) {
      res.json({ 
        success: true,
        message: 'All files checked out successfully'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to checkout all files' 
      });
    }
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to checkout all files',
      message: error.message
    });
  }
});

// GET diff
router.get('/diff', async (req, res) => {
  try {
    const { dir, filepath } = req.query;
    
    if (!dir || !filepath) {
      return res.status(400).json({ error: 'Directory path and filepath are required' });
    }

    const gitService = new NodeGitService(dir as string);
    const diff = await gitService.getDiff(filepath as string);
    
    res.json({ diff });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get diff',
      message: error.message
    });
  }
});

// GET file history
router.get('/file-history', async (req, res) => {
  try {
    const { dir, filepath, limit } = req.query;
    
    if (!dir || !filepath) {
      return res.status(400).json({ error: 'Directory path and filepath are required' });
    }

    const gitService = new NodeGitService(dir as string);
    const isRepo = await gitService.isRepository();
    
    if (!isRepo) {
      return res.json({ commits: [] });
    }

    const commits = await gitService.getFileHistory(
      filepath as string, 
      limit ? parseInt(limit as string) : 10
    );
    
    res.json({ commits });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get file history',
      message: error.message
    });
  }
});

// GET author info
router.get('/author-info', async (req, res) => {
  try {
    const { dir } = req.query;
    
    if (!dir) {
      return res.status(400).json({ error: 'Directory path is required' });
    }

    const gitService = new NodeGitService(dir as string);
    const authorInfo = await gitService.getAuthorInfo();
    
    res.json(authorInfo);
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get author info',
      message: error.message
    });
  }
});

// POST undo last commit
router.post('/undo-last-commit', async (req, res) => {
  try {
    const { dir } = req.body;
    
    if (!dir) {
      return res.status(400).json({ error: 'Directory path is required' });
    }

    const gitService = new NodeGitService(dir);
    const success = await gitService.undoLastCommit();
    
    if (success) {
      res.json({ 
        success: true,
        message: 'Last commit undone successfully. Changes are now in working directory.'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to undo last commit' 
      });
    }
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to undo last commit',
      message: error.message
    });
  }
});

// GET commit changes
router.get('/commit-changes', async (req, res) => {
  try {
    const { dir, commit } = req.query;
    
    console.log('Commit changes request:', { dir, commit });
    
    if (!dir || !commit) {
      return res.status(400).json({ error: 'Directory path and commit hash are required' });
    }

    const gitService = new NodeGitService(dir as string);
    const isRepo = await gitService.isRepository();
    
    if (!isRepo) {
      console.log('Not a git repository');
      return res.json({ changes: [] });
    }

    const changes = await gitService.getCommitChanges(commit as string);
    
    console.log('Commit changes result:', changes);
    
    res.json({ changes });
  } catch (error: any) {
    console.error('Commit changes error:', error);
    res.status(500).json({
      error: 'Failed to get commit changes',
      message: error.message
    });
  }
});

// GET sync status (ahead/behind)
router.get('/sync-status', async (req, res) => {
  try {
    const { dir } = req.query;
    
    if (!dir) {
      return res.status(400).json({ error: 'Directory path is required' });
    }

    const gitService = new NodeGitService(dir as string);
    const isRepo = await gitService.isRepository();
    
    if (!isRepo) {
      return res.json({ ahead: 0, behind: 0 });
    }

    const syncStatus = await gitService.getSyncStatus();
    
    res.json(syncStatus);
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get sync status',
      message: error.message
    });
  }
});

export default router;