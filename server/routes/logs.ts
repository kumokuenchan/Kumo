import express from 'express';
import chokidar, { FSWatcher } from 'chokidar';
import fs from 'fs/promises';
import path from 'path';
import { io } from '../index.js';

const router = express.Router();

// Store active watchers
const activeWatchers = new Map<string, FSWatcher>();

// Watch a log file for changes
router.post('/watch', async (req, res) => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    // Stop existing watcher if any
    if (activeWatchers.has(filePath)) {
      const existingWatcher = activeWatchers.get(filePath);
      await existingWatcher?.close();
      activeWatchers.delete(filePath);
    }

    // Create new watcher
    const watcher = chokidar.watch(filePath, {
      persistent: true,
      ignoreInitial: true,
      usePolling: false
    });

    watcher.on('change', async () => {
      try {
        // Read the updated file content
        const content = await fs.readFile(filePath, 'utf-8');

        // Emit the new content via Socket.IO
        io.emit('log:update', {
          filePath,
          content,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error reading log file:', error);
      }
    });

    watcher.on('error', (error: Error) => {
      console.error('Watcher error:', error);
      io.emit('log:error', {
        filePath,
        error: error.message
      });
    });

    activeWatchers.set(filePath, watcher);

    res.json({
      success: true,
      message: `Watching ${filePath} for changes`
    });
  } catch (error) {
    console.error('Error setting up watcher:', error);
    res.status(500).json({
      error: 'Failed to watch file',
      details: (error as Error).message
    });
  }
});

// Stop watching a file
router.post('/unwatch', async (req, res) => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const watcher = activeWatchers.get(filePath);
    if (watcher) {
      await watcher.close();
      activeWatchers.delete(filePath);

      res.json({
        success: true,
        message: `Stopped watching ${filePath}`
      });
    } else {
      res.status(404).json({
        error: 'No active watcher for this file'
      });
    }
  } catch (error) {
    console.error('Error stopping watcher:', error);
    res.status(500).json({
      error: 'Failed to stop watching file',
      details: error.message
    });
  }
});

// Read a log file
router.post('/read', async (req, res) => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    // Security: prevent path traversal attacks
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.includes('..')) {
      return res.status(403).json({ error: 'Invalid file path' });
    }

    const content = await fs.readFile(normalizedPath, 'utf-8');

    res.json({
      success: true,
      content,
      filePath: normalizedPath
    });
  } catch (error) {
    console.error('Error reading log file:', error);
    res.status(500).json({
      error: 'Failed to read file',
      details: error.message
    });
  }
});

// List log files in a directory
router.post('/list', async (req, res) => {
  try {
    const { directory } = req.body;

    if (!directory) {
      return res.status(400).json({ error: 'Directory is required' });
    }

    // Security: prevent path traversal attacks
    const normalizedPath = path.normalize(directory);
    if (normalizedPath.includes('..')) {
      return res.status(403).json({ error: 'Invalid directory path' });
    }

    const files = await fs.readdir(normalizedPath);

    // Filter for log files
    const logFiles = files.filter(file =>
      file.endsWith('.log') || file.endsWith('.txt')
    );

    const fileDetails = await Promise.all(
      logFiles.map(async (file) => {
        const filePath = path.join(normalizedPath, file);
        const stats = await fs.stat(filePath);

        return {
          name: file,
          path: filePath,
          size: stats.size,
          modified: stats.mtime
        };
      })
    );

    res.json({
      success: true,
      files: fileDetails.sort((a, b) => b.modified.getTime() - a.modified.getTime())
    });
  } catch (error) {
    console.error('Error listing log files:', error);
    res.status(500).json({
      error: 'Failed to list files',
      details: error.message
    });
  }
});

// Cleanup all watchers on server shutdown
export function cleanupWatchers() {
  return Promise.all(
    Array.from(activeWatchers.values()).map(watcher => watcher.close())
  );
}

export default router;
