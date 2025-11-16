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
    const success = await gitService.commit(message, authorName, authorEmail);
    
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
    const success = await gitService.push(remote || 'origin', branch || 'main');
    
    if (success) {
      res.json({ 
        success: true,
        message: 'Push completed successfully'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to push' 
      });
    }
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to push',
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

export default router;